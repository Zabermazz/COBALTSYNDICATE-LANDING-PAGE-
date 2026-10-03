// HTTP authorization tests against the actual production Next.js build.
// A local fake Supabase transport supplies fixture rows. SQL semantics are tested separately.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {hashToken} from '../lib/education/core.ts';
const root='http://localhost:3188',origin='https://localhost:3188';
const premiumBody='PRIVATE_LESSON_SENTINEL_48329',privatePath='private/never-public.mp4';
const tokens={active:'a'.repeat(43),inactive:'b'.repeat(43),stale:'c'.repeat(43)};
const sessions=Object.entries(tokens).map(([kind,raw],i)=>({token_hash:hashToken(raw),user_id:i+1,kind}));
const allCourses=[{id:'fixture',title:'Fixture course',summary:'Public description',level:'advanced',access:'premium',published:true,position:1}];
const lessons=[{id:'private',course_id:'fixture',section_id:'section',slug:'private',title:'Private lesson',summary:'Public summary',access:null,published:true,position:1,duration_seconds:60},{id:'public',course_id:'fixture',section_id:'section',slug:'public',title:'Public lesson',summary:'Public reading',access:'public',published:true,position:2,duration_seconds:0}];
let api,app,appOutput='',progressWrites=0;
before(async()=>{
  api=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost'),table=url.pathname.split('/').at(-1);let result=[];
    if(table==='edu_courses')result=allCourses;
    else if(table==='edu_sections')result=[{id:'section',course_id:'fixture',title:'Section',position:1}];
    else if(table==='edu_lessons')result=lessons;
    else if(table==='edu_lesson_content')result=[{body:url.searchParams.get('lesson_id')==='eq.private'?premiumBody:'Public body',video_path:url.searchParams.get('lesson_id')==='eq.private'?privatePath:null,download_path:null}];
    else if(table==='edu_sessions'){
      const hash=url.searchParams.get('token_hash')?.slice(3),index=sessions.findIndex(s=>s.token_hash===hash);
      result=index>=0?[sessions[index]]:[];if(req.method==='DELETE'&&index>=0)sessions.splice(index,1);
    }else if(table==='edu_users'){const id=Number(url.searchParams.get('telegram_id')?.slice(3));result=[{telegram_id:id,first_name:'Test member',username:'new_username'}];}
    else if(table==='edu_memberships'){const id=Number(url.searchParams.get('user_id')?.slice(3));result=[{user_id:id,active:id!==2,checked_at:new Date(Date.now()-(id===3?3600000:0)).toISOString(),version:0}];}
    else if(table==='edu_rate_limit')result=true;
    else if(table==='edu_save_progress'){let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw);assert.equal(data.p_user,1);progressWrites++;result=null;}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
  });api.listen(3189,'127.0.0.1');await once(api,'listening');
  app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3188'],{env:{...process.env,APP_URL:origin,SUPABASE_URL:'http://127.0.0.1:3189',SUPABASE_SERVICE_ROLE_KEY:'test-only-key',AUTH_SECRET:'test-only-secret-'.repeat(3),TELEGRAM_BOT_TOKEN:'',TELEGRAM_PREMIUM_CHAT_IDS:'-100123',TELEGRAM_WEBHOOK_SECRET:'test-only-webhook',GIVEAWAY_ADMIN_TOKEN:'test-only-admin-'.repeat(3)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  app.stdout.on('data',c=>appOutput+=c);app.stderr.on('data',c=>appOutput+=c);
  for(let i=0;i<100;i++){try{const r=await fetch(root+'/login');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}
  throw Error('Test server failed to start: '+appOutput);
});
after(async()=>{app?.kill();await new Promise(resolve=>api?.close(resolve));});
function headers(kind){return {Origin:origin,'Content-Type':'application/json',...(kind?{Cookie:`__Host-cobalt-session=${tokens[kind]}`}:{})};}
test('public catalogue metadata never includes private body or paths',async()=>{
  const r=await fetch(root+'/course/fixture');assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('Private lesson'));assert.ok(!html.includes(premiumBody));assert.ok(!html.includes(privatePath));
});
test('direct premium URLs do not leak content to anonymous, inactive or stale users',async()=>{
  for(const kind of [undefined,'inactive','stale']){const r=await fetch(root+'/learn/course/fixture/lesson/private',{headers:headers(kind)});assert.equal(r.status,200);const html=await r.text();assert.ok(!html.includes(premiumBody));assert.ok(!html.includes(privatePath));assert.match(r.headers.get('cache-control'),/no-store/);}
});
test('verified session opens private body but not its storage path',async()=>{
  const r=await fetch(root+'/learn/course/fixture/lesson/private',{headers:headers('active')});const html=await r.text();assert.ok(html.includes(premiumBody));assert.ok(!html.includes(privatePath));assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
});
test('public lessons remain readable when signed out',async()=>{
  const r=await fetch(root+'/learn/course/fixture/lesson/public');assert.equal(r.status,200);assert.ok((await r.text()).includes('Public body'));
});
test('progress and asset endpoints independently enforce access and CSRF',async()=>{
  const body=JSON.stringify({course:'fixture',lesson:'private',kind:'video',seconds:20,complete:true,user_id:999});
  for(const action of ['progress','asset'])for(const kind of [undefined,'inactive','stale'])assert.equal((await fetch(root+'/api/learn/'+action,{method:'POST',headers:headers(kind),body})).status,403);
  assert.equal((await fetch(root+'/api/learn/progress',{method:'POST',headers:{...headers('active'),Origin:'https://evil.test'},body})).status,403);
  assert.equal((await fetch(root+'/api/learn/progress',{method:'POST',headers:headers('active'),body})).status,200);assert.equal(progressWrites,1);
});
test('forged webhooks and unauthorized editor requests fail',async()=>{
  assert.equal((await fetch(root+'/api/telegram/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"update_id":1}'})).status,401);
  assert.equal((await fetch(root+'/api/admin/courses')).status,401);
});
test('logout revokes the session and clears the cookie',async()=>{
  const r=await fetch(root+'/api/auth/logout',{method:'POST',headers:headers('active')});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
  const html=await (await fetch(root+'/learn/course/fixture/lesson/private',{headers:headers('active')})).text();assert.ok(!html.includes(premiumBody));
});
test('existing website routes still render',async()=>{
  for(const path of ['/','/firms','/compare','/offers','/guides','/agency','/agency/apply','/agency/brief','/contact','/giveaways','/privacy','/terms','/tools/consistency'])assert.equal((await fetch(root+path)).status,200,path);
});
