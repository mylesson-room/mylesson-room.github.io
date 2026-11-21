/* Art B1 JaaS JWT auth, signing and room isolation. Synthetic no production data.
 * Independent of Michael's financial room. Uses ephemeral RSA key.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto,generateKeyPairSync,verify}=require('node:crypto');
const keyPair=generateKeyPairSync('rsa',{modulusLength:2048});
const teacher='11111111-1111-4111-8111-111111111111';
const anastasia='22222222-2222-4222-8222-222222222222';
const outsider='33333333-3333-4333-8333-333333333333';
const appId='vpaas-magic-cookie-gostudy-art-b1-test';
const vars={
 SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'synthetic-anon',
 JAAS_APP_ID:appId,JAAS_KEY_ID:appId+'/qa',
 JAAS_PRIVATE_KEY:keyPair.privateKey.export({type:'pkcs8',format:'pem'})
};
const script=fs.readFileSync('supabase/functions/gostudy-jaas-art-b1-token/index.ts','utf8');
assert.ok(!script.includes('service_role')&&!script.includes('SUPABASE_SERVICE_ROLE_KEY'),
 'JaaS must not bypass course RLS with service-role credentials');
const users={t:teacher,s:anastasia,o:outsider};
function handler(overrides={}){
 let serve;
 const fetchMock=async(raw,options={})=>{
  const u=new URL(raw),actor=users[options.headers?.Authorization?.replace(/^Bearer /,'')];
  if(u.pathname.endsWith('/auth/v1/user')){
   return actor?Response.json({id:actor}):Response.json({error:'unauthorized'},{status:401});
  }
  if(u.pathname.endsWith('/rest/v1/rpc/gostudy_my_destinations')){
   const rows=actor===anastasia?[{course:'art-b1'}]:actor===teacher?[{course:'teacher'}]:[{course:'none'}];
   return Response.json(rows);
  }
  if(u.pathname.endsWith('/rest/v1/rpc/gostudy_legacy_teacher_view')){
   assert.equal(JSON.parse(options.body).p_course,'art_b1','Must check correct course');
   return Response.json(actor===teacher?[{id:anastasia}]:[]);
  }
  throw Error('Unexpected external request: '+u.pathname);
 };
 vm.runInNewContext(script,{
  Deno:{env:{get:k=>({...vars,...overrides})[k]},serve:f=>{serve=f}},
  crypto:webcrypto,TextEncoder,Uint8Array,Response,URLSearchParams,
  AbortSignal,atob,btoa,Date,fetch:fetchMock,
 },{filename:'gostudy-jaas-art-b1-token/index.ts'});
 return serve;
}
const request=(who,body={studentId:null},origin='https://mylesson-room.github.io')=>
 new Request('https://example.supabase.co/functions/v1/gostudy-jaas-art-b1-token',{
  method:'POST',
  headers:{Origin:origin,...(who?{Authorization:'Bearer '+who}:{})},
  body:JSON.stringify(body)
 });
function decode(token){
 const [head,payload,signature]=token.split('.');
 assert.ok(verify('sha256',Buffer.from(head+'.'+payload),
  keyPair.publicKey,Buffer.from(signature,'base64url')),'JWT must verify against public key');
 return {
  header:JSON.parse(Buffer.from(head,'base64url').toString('utf8')),
  claims:JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))
 };
}
(async()=>{
 const fn=handler(),cases=[
  ['no authentication',request(null),401],
  ['wrong origin',request('t',{studentId:anastasia},'https://evil.example'),403],
  ['non enrolled student',request('o'),403],
  ['outsider trying teacher path',request('o',{studentId:anastasia}),403],
  ['teacher wrong student',request('t',{studentId:outsider}),403],
  ['learner trying to impersonate teacher',request('s',{studentId:anastasia}),403],
  ['teacher must choose learner',request('t'),403],
  ['invalid ID',request('t',{studentId:'not-a-uuid'}),400]
 ];
 for(const [name,input,status] of cases){
  const result=await fn(input);
  assert.equal(result.status,status,name);
  console.log('ART B1 VIDEO ACCESS PASS '+name+' -> '+status);
 }
 const t=await fn(request('t',{studentId:anastasia}));
 const s=await fn(request('s'));
 assert.equal(t.status,200,'Teacher receives signed room');
 assert.equal(s.status,200,'Anastasia receives signed room');
 const teacherToken=await t.json(),studentToken=await s.json();
 assert.equal(teacherToken.room,studentToken.room,'Two participants must join SAME room');
 assert.equal(teacherToken.room,'gostudy-art-b1-'+anastasia.replace(/-/g,''),'Room isolated to Art B1');
 const tc=decode(teacherToken.jwt),sc=decode(studentToken.jwt);
 assert.equal(tc.claims.room,sc.claims.room,'JWT room identical');
 assert.equal(tc.claims.context.user.moderator,'true');
 assert.equal(sc.claims.context.user.moderator,'false');
 assert.equal(tc.header.kid,appId+'/qa');
 for(const claims of [tc.claims,sc.claims]){
  assert.equal(claims.context.features.recording,false);
  assert.equal(claims.context.features.livestreaming,false);
  assert.ok(claims.exp-claims.nbf<=7215);
  assert.ok(claims.room.startsWith('gostudy-art-b1-'));
 }
 const noKey=await handler({JAAS_PRIVATE_KEY:''})(request('s'));
 assert.equal(noKey.status,503,'Missing signing key must NOT admit');
 const pkcs1=handler({JAAS_PRIVATE_KEY:keyPair.privateKey.export({type:'pkcs1',format:'pem'})});
 assert.equal((await pkcs1(request('s'))).status,200,'JaaS legacy RSA PEM supported');
 console.log('ART B1 JAAS TOKEN ALL PASS: signed RS256, 2 roles same room, outsider denied, no keys in client.');
})().catch(e=>{console.error(e);process.exitCode=1;});
