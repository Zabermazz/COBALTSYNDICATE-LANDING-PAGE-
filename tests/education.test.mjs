import {test} from 'node:test';
import assert from 'node:assert/strict';
import {opaqueToken,hashToken,validToken,equalSecret,isMember,mayRead,rateKey,safeReturn} from '../lib/education/core.ts';
test('Telegram membership statuses fail closed',()=>{
  for(const status of ['creator','administrator','member'])assert.equal(isMember({status}),true);
  assert.equal(isMember({status:'restricted',is_member:true}),true);
  for(const member of [{status:'restricted'},{status:'restricted',is_member:false},{status:'left'},{status:'kicked'},{status:'unknown'},{}])assert.equal(isMember(member),false);
});
test('access levels do not confuse authentication with premium membership',()=>{
  assert.equal(mayRead('public',false,false),true);
  assert.equal(mayRead('free_member',false,false),false);
  assert.equal(mayRead('free_member',true,false),true);
  assert.equal(mayRead('premium',true,false),false);
  assert.equal(mayRead('premium',false,true),false);
  assert.equal(mayRead('premium',true,true),true);
});
test('tokens contain 256 bits, are independent, and are hashed for storage',()=>{
  const tokens=Array.from({length:1000},opaqueToken);assert.equal(new Set(tokens).size,1000);
  for(const token of tokens){assert.equal(validToken(token),true);assert.equal(Buffer.from(token,'base64url').length,32);assert.notEqual(hashToken(token),token);assert.equal(hashToken(token).length,64);}
  for(const token of ['',123,null,'a'.repeat(42),'a'.repeat(44),'<script>'])assert.equal(validToken(token),false);
});
test('secret comparison and keyed abuse identifiers',()=>{
  assert.equal(equalSecret('abc','abc'),true);assert.equal(equalSecret('abc','abcd'),false);
  assert.notEqual(rateKey('ip','secret-a'),rateKey('ip','secret-b'));
  assert.notEqual(rateKey('user:1','secret'),rateKey('user:2','secret'));
});
test('return targets cannot send users to another host',()=>{
  assert.equal(safeReturn('/learn/dashboard'),'/learn/dashboard');
  for(const target of ['https://evil.test','//evil.test','/\\evil.test','/learn\\evil.test',null])assert.equal(safeReturn(target),'/learn/dashboard');
});
