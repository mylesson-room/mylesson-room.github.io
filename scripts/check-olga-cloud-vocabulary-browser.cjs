/* Two-device cloud vocabulary smoke. Synthetic auth, isolated mock server.
 * Test cannot certify real production RLS; separately verify deployed table/RPC.
 */
'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {chromium}=require('playwright');
const path=require('node:path');
const root=process.cwd();
const words=new Map();
let serverWrites=0;
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/assets/gostudy-sweden-cloud-words.js'){
  res.setHeader('Content-Type','text/javascript');
  return res.end(await readFile(path.join(root,'assets/gostudy-sweden-cloud-words.js')));
 }
 if(url.pathname==='/fixture'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.end('<!doctype html><html><body data-cloud-vocabulary="sweden-a2">'+
    '<script>window.GoStudyFinanceAuth={userId:()=>new URLSearchParams(location.search).get("user"),token:async()=>("fake"),request:async(path,options)=>{'+
    'const response=await fetch("/__mock?path="+encodeURIComponent(path),{method:options?.method||"GET",headers:{"Content-Type":"application/json","x-test-user":new URLSearchParams(location.search).get("user")},body:options?.body?JSON.stringify(options.body):undefined});'+
    'return {ok:response.ok,status:response.status,data:await response.json()};}};</script>'+
    '<script src="/assets/gostudy-sweden-cloud-words.js"></script></body></html>');
 }
 if(url.pathname==='/__mock'){
  const user=req.headers['x-test-user'];
  if(user!=='olga') {res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({message:'forbidden'}));}
  const p=url.searchParams.get('path')||'';
  res.setHeader('Content-Type','application/json');
  if(p.startsWith('/rest/v1/gostudy_sweden_words?')){
   return res.end(JSON.stringify([...words.values()]));
  }
  if(p==='/rest/v1/rpc/gostudy_sweden_save_word'&&req.method==='POST'){
   let raw='';
   for await(const c of req)raw+=c;
   const b=JSON.parse(raw||'{}');
   if(!b.p_en||!b.p_ru){res.writeHead(400);return res.end('{}');}
   const word={en:b.p_en,ru:b.p_ru,word_key:b.p_en.toLowerCase(),updated_at:new Date().toISOString()};
   words.set(word.word_key,word);serverWrites++;
   return res.end(JSON.stringify([word]));
  }
  res.writeHead(404);return res.end('{}');
 }
 res.writeHead(404);res.end();
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const a=await browser.newContext(),b=await browser.newContext(),outsider=await browser.newContext();
  const pa=await a.newPage(),pb=await b.newPage(),pc=await outsider.newPage();
  const errors=[];
  for(const p of [pa,pb,pc])p.on('pageerror',e=>errors.push(e.message));
  // Old-local words are intentionally NOT imported.
  await pa.addInitScript(()=>localStorage.setItem('gostudy-sweden-a2-v2',JSON.stringify({words:[{en:'old word',ru:'старое'}]})));
  await pa.goto(base+'/fixture?user=olga');
  await pb.goto(base+'/fixture?user=olga');
  await pc.goto(base+'/fixture?user=outsider');
  await pa.waitForFunction(()=>window.GoStudySwedenCloudWords?.isReady());
  await pb.waitForFunction(()=>window.GoStudySwedenCloudWords?.isReady());
  assert.deepEqual(await pa.evaluate(()=>window.GoStudySwedenCloudWords.words()),[],'must not import legacy browser words');
  assert.equal(await pc.evaluate(()=>window.GoStudySwedenCloudWords.isReady()),false,'outsider cannot read');
  await pb.evaluate(()=>{
    window.__newCloudWords=[];
    document.addEventListener('finance-word',event=>{
      if(event.detail.notify)window.__newCloudWords.push(event.detail.word.en);
    });
  });
  const saved=await pa.evaluate(()=>window.GoStudySwedenCloudWords.save({en:'platform',ru:'платформа'}));
  assert.equal(saved.en,'platform');
  assert.equal(serverWrites,1,'exactly one write confirmed by server');
  assert.equal((await pa.evaluate(()=>window.GoStudySwedenCloudWords.words())).length,1,'device A displays saved word');
  assert.equal((await pb.evaluate(()=>window.GoStudySwedenCloudWords.words())).length,0,'device B initially stale');
  await pb.evaluate(()=>window.GoStudySwedenCloudWords.refresh());
  assert.deepEqual(await pb.evaluate(()=>window.GoStudySwedenCloudWords.words().map(x=>x.en)),['platform'],'device B sees same cloud word');
  assert.deepEqual(await pb.evaluate(()=>window.__newCloudWords),['platform'],
    'cross-device addition must pop up as a Michael +word notification');
  const pbreloaded=await b.newPage();await pbreloaded.goto(base+'/fixture?user=olga');
  await pbreloaded.waitForFunction(()=>window.GoStudySwedenCloudWords?.isReady());
  assert.deepEqual(await pbreloaded.evaluate(()=>window.GoStudySwedenCloudWords.words().map(x=>x.en)),['platform'],'new tab has cloud word');
  await assert.rejects(pc.evaluate(()=>window.GoStudySwedenCloudWords.save({en:'x',ru:'y'})),/Error|Server|403/i,'outsider cannot write');
  assert.equal(serverWrites,1,'no outsider write');
  assert.deepEqual(errors,[],'unexpected JS errors');
  await a.close();await b.close();await outsider.close();
  console.log('OLGA CLOUD WORDS 7/7 PASS: authenticated write, cross-device retrieval, refresh, reload, legacy exclusion, outsider denial, no optimistic writes. SYNTHETIC mock only.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
