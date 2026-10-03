import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../.test-tools/node_modules/@electric-sql/pglite/dist/index.js';
let db;
before(async()=>{
  db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean);');
  const sql=await readFile(new URL('../supabase-education.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
  const seed=await readFile(new URL('../supabase-education-seed.sql',import.meta.url),'utf8');await db.exec(seed);await db.exec(seed);
  assert.equal((await db.query('select count(*)::int as n from edu_courses')).rows[0].n,3);
  await db.exec("insert into edu_users(telegram_id,first_name) values(123,'Member'); select edu_set_membership(123,true,0);");
});
after(async()=>db?.close());
test('login redemption is atomic: a shared link works only for the first claimant',async()=>{
  await db.exec("insert into edu_login_tokens(token_hash,user_id,expires_at) values('token',123,now()+interval '5 minutes');");
  const results=await Promise.all(['session-a','session-b'].map(s=>db.query('select edu_redeem_login($1,$2) as ok',['token',s])));
  assert.deepEqual(results.map(r=>r.rows[0].ok).sort(),[false,true]);
  assert.equal((await db.query('select count(*)::int as n from edu_sessions')).rows[0].n,1);
});
test('expired and unknown tokens never create sessions',async()=>{
  await db.exec("insert into edu_login_tokens(token_hash,user_id,expires_at) values('old',123,now()-interval '1 minute');");
  for(const token of ['old','unknown'])assert.equal((await db.query('select edu_redeem_login($1,$2) as ok',[token,'no-session'])).rows[0].ok,false);
});
test('membership events invalidate the cache and reject an in-flight stale result',async()=>{
  await db.exec('select edu_invalidate_membership(123)');
  assert.equal((await db.query('select edu_set_membership(123,true,0) as ok')).rows[0].ok,false);
  assert.equal((await db.query('select active from edu_memberships where user_id=123')).rows[0].active,false);
  await db.exec("insert into edu_login_tokens(token_hash,user_id,expires_at) values('revoked',123,now()+interval '5 minutes');");
  await assert.rejects(db.query("select edu_redeem_login('revoked','blocked-session')"));
  assert.equal((await db.query("select used_at from edu_login_tokens where token_hash='revoked'")).rows[0].used_at,null);
  assert.equal((await db.query('select edu_set_membership(123,true,1) as ok')).rows[0].ok,true);
});
test('rate limits persist across calls and reset only after expiry',async()=>{
  for(let i=0;i<3;i++)assert.equal((await db.query("select edu_rate_limit('test',3,60) as ok")).rows[0].ok,true);
  assert.equal((await db.query("select edu_rate_limit('test',3,60) as ok")).rows[0].ok,false);
  await db.exec("update edu_rate_limits set reset_at=now()-interval '1 second' where key='test'");
  assert.equal((await db.query("select edu_rate_limit('test',3,60) as ok")).rows[0].ok,true);
});
test('duplicate webhook processing is leased and completed updates cannot replay',async()=>{
  assert.equal((await db.query('select edu_claim_update(1) as state')).rows[0].state,'claimed');
  assert.equal((await db.query('select edu_claim_update(1) as state')).rows[0].state,'busy');
  await db.exec("update edu_webhook_updates set lease_until=now()-interval '1 second' where id=1");
  assert.equal((await db.query('select edu_claim_update(1) as state')).rows[0].state,'claimed');
  await db.exec('update edu_webhook_updates set completed=true where id=1');
  assert.equal((await db.query('select edu_claim_update(1) as state')).rows[0].state,'done');
});
test('anonymous and authenticated browser roles cannot read private data or redeem tokens',async()=>{
  for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from edu_lesson_content'));
    await assert.rejects(db.query('select * from edu_sessions'));
    await assert.rejects(db.query("select edu_redeem_login('token','session')"));
    await db.exec('reset role');
  }
});
test('course publication and lesson progress survive edits without duplicate rows',async()=>{
  const course={id:'test-course',title:'Test',summary:'Test',level:'beginner',access:'premium',published:true,position:1,sections:[{id:'test-section',title:'Test section',position:1,lessons:[{id:'test-lesson',slug:'test',title:'Test lesson',summary:'',access:null,published:true,position:1,duration_seconds:100,body:'Protected test body',video_path:null,download_path:null}]}]};
  await db.query('select edu_save_course($1)',[JSON.stringify(course)]);
  await db.exec("select edu_save_progress(123,'test-lesson',60,true); select edu_save_progress(123,'test-lesson',10,false);");
  course.title='Updated';await db.query('select edu_save_course($1)',[JSON.stringify(course)]);
  const rows=(await db.query('select * from edu_progress')).rows;assert.equal(rows.length,1);assert.equal(rows[0].watched_seconds,60);assert.ok(rows[0].completed_at);
  await db.exec('delete from edu_users where telegram_id=123');assert.equal((await db.query('select * from edu_progress')).rows.length,0);
});
