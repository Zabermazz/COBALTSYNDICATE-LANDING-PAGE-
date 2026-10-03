import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const firms=JSON.parse(await readFile(new URL('../lib/firm-data.json',import.meta.url),'utf8'));
const partners=JSON.parse(await readFile(new URL('../lib/partner-links.json',import.meta.url),'utf8'));
const root='http://localhost:3186';let app;
before(async()=>{app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3186'],{stdio:'ignore',windowsHide:true});for(let n=0;n<100;n++){try{if((await fetch(root+'/offers')).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Test server did not start');});
after(()=>app?.kill());
test('all main firm redirects go to the configured affiliate or official site',async()=>{
  for(const firm of firms){const response=await fetch(`${root}/go/${firm.id}`,{redirect:'manual'});assert.equal(response.status,302,firm.id);const expected=firm.partner&&partners[firm.id]?.affiliateURL||firm.officialURL;assert.equal(response.headers.get('location'),new URL(expected).href,firm.id);assert.ok(!/propfirm(match|map)\.com/.test(response.headers.get('location')));}
  assert.equal((await fetch(root+'/go/not-a-firm',{redirect:'manual'})).status,404);
});
test('public research surfaces do not contain clickable directory destinations',async()=>{
  for(const path of ['/','/firms','/research-index','/offers','/updates','/firms/brightfunded','/firms/texaris','/compare']){const html=await(await fetch(root+path)).text();const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);assert.ok(!hrefs.some(h=>/^https?:\/\/[^/]*propfirm(match|map)\.com/.test(h)),path);}
});
test('every partnered profile and offer displays its copyable creator code',async()=>{
  for(const firm of firms.filter(f=>f.partner)){const html=await(await fetch(root+'/firms/'+firm.id)).text();assert.ok(html.includes(`Copy ${partners[firm.id].promoCode} promo code`),firm.id);}
  const offers=await(await fetch(root+'/offers')).text();for(const firm of firms.filter(f=>f.partner))assert.ok(offers.includes(`Copy ${partners[firm.id].promoCode} promo code`));
});

test('broker redirects preserve exact owner supplied URLs and stay outside prop categories',async()=>{const brokers=JSON.parse(await readFile(new URL('../lib/brokers.json',import.meta.url),'utf8'));for(const b of brokers){const r=await fetch(root+'/go/broker/'+b.id,{redirect:'manual'});assert.equal(r.headers.get('location'),b.affiliateURL);assert.ok(!firms.some(f=>f.id===b.id));assert.equal((await fetch(root+b.logo)).status,200);}assert.equal((await fetch(root+'/brokers')).status,200);assert.equal((await fetch(root+'/go/broker/unknown')).status,404);});
