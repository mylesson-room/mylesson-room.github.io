/* Olga Sweden A2 cloud vocabulary integration, TWO browser sessions/devices.
 * Tests REAL GoStudy UI, but a fully synthetic auth/API backend. No real student data.
 */
'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const student='11111111-1111-4111-8111-111111111111';
const teacher='22222222-2222-4222-8222-222222222222';
const room='33333333-3333-4333-8333-333333333333';
const words=new Map();
let rejectSaves=false, saves=0;
const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',woff2:'font/woff2',jpg:'image/jpeg'};
const server=createServer(async(req,res)=>{
 const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(!filename.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':mime[path.extname(filename).slice(1)]||'application/octet-stream'}).end(await readFile(filename));}
 catch{res.writeHead(404).end();}
});
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
function makeHandler(route){
 const req=route.request(),u=new URL(req.url()),p=u.pathname,method=req.method();
 if(!u.hostname.endsWith('.supabase.co'))return route.abort();
 if(method==='OPTIONS')return route.fulfill({status:204,headers:cors});
 let result=[],status=200;
 if(p==='/auth/v1/user')result={id:student,email:'preview@example.invalid'};
 else if(p.includes('gostudy_my_destinations'))result=[{course:'sweden-a2'}];
 else if(p.includes('gostudy_classroom_rooms'))result=[{id:room,teacher_id:teacher,student_id:student,student_label:'Test learner',course:'sweden-a2',lesson_path:'sweden-a2-03.html'}];
 else if(p.includes('gostudy_classroom_events'))result=[];
 else if(p.includes('gostudy_sweden_lesson_selection'))result=[{student_id:student,teacher_id:teacher,lesson_path:'sweden-a2-03.html'}];
 else if(p.includes('gostudy_sweden_save_word')){
   if(rejectSaves){status=403;result={code:'42501',message:'Synthetic permission denied'};}
   else{
     const body=JSON.parse(req.postData()||'{}');
     const en=String(body.p_en||''),ru=String(body.p_ru||'');
     const key=en.trim().toLowerCase();
     if(!key||!ru){status=400;result={message:'Empty word'};}
     else{words.set(key,{en,ru,word_key:key,updated_at:new Date().toISOString()});result=[{en,ru,word_key:key}];saves++;}
   }
 }
 else if(p.includes('gostudy_sweden_words'))result=Array.from(words.values());
 else if(p.includes('gostudy_progress'))result=[];
 else if(p.includes('gostudy_classroom_send'))result=true;
 else if(p.includes('gostudy_legacy_teacher_view'))result=[];
 return route.fulfill({status,headers:cors,json:result});
}
async function browserContext(browser,base,file,mobile){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(({id})=>{
  const session=JSON.stringify({user:{id,email:'preview@example.invalid'},access_token:'synthetic-no-real-access',refresh_token:'synthetic',expires_at:Date.now()+3600000});
  localStorage.setItem('gostudy-student-session-v1',session);
  sessionStorage.setItem('gostudy-cloud-session-v1',session);
 },{id:student});
 await ctx.route('https://**/*',makeHandler);
 const page=await ctx.newPage();
 page.on('pageerror',e=>{if(/gostudy-sweden-cloud-words|gostudy-v1-workbook/i.test(e.message))console.error('PAGE ERROR '+e.message);});
 await page.goto(base+'/'+file,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.GoStudySwedenCloudWords?.isReady(),{timeout:12000});
 return {ctx,page};
}
async function run(browser,base,mobile){
 const first=await browserContext(browser,base,'sweden-a2-03.html',mobile);
 const second=await browserContext(browser,base,'student-sweden.html',!mobile);
 try{
  await first.page.locator('#lessonPages .page.active').waitFor();
  await first.page.locator('#openLessonDictionary').click();
  const form=first.page.locator('#dictionaryAddForm');
  await form.locator('#dictionarySource').fill(mobile?'platform':'departure');
  // Explicit translation given: no third-party translation network in this test.
  await form.locator('#dictionaryTranslation').fill(mobile?'платформа':'отправление');
  await form.locator('button').click();
  await first.page.waitForFunction(en=>window.GoStudySwedenCloudWords.words().some(w=>w.en===en),mobile?'platform':'departure');
  assert.equal(saves, mobile?1:2, 'one acknowledged cloud API request per manual addition');
  await second.page.evaluate(()=>window.GoStudySwedenCloudWords.refresh());
  await second.page.locator('#wordsButton, #openWords, #vocabButton, #vocabularyButton').first().waitFor({state:'attached',timeout:1000}).catch(()=>{});
  const expected=mobile?'platform':'departure';
  const mirrored=await second.page.evaluate(()=>window.GoStudySwedenCloudWords.words());
  assert.ok(mirrored.some(w=>w.en===expected),'other device must see server ACKed word');
  await second.page.reload({waitUntil:'domcontentloaded'});
  await second.page.waitForFunction(()=>window.GoStudySwedenCloudWords?.isReady(),{timeout:10000});
  assert.ok((await second.page.evaluate(()=>window.GoStudySwedenCloudWords.words())).some(w=>w.en===expected),
    'refresh on other device must preserve word');
  rejectSaves=true;
  await form.locator('#dictionarySource').fill('not-saved');
  await form.locator('#dictionaryTranslation').fill('не сохранять');
  await form.locator('button').click();
  await first.page.waitForTimeout(500);
  assert.ok(!await first.page.evaluate(()=>window.GoStudySwedenCloudWords.words().some(w=>w.en==='not-saved')),
    'a server-denied word must never appear as saved');
  assert.ok(!words.has('not-saved'),'server must not contain denied word');
  rejectSaves=false;
  console.log('OLGA CLOUD PASS '+(mobile?'iPhone':'desktop')+': server ACK, two-device mirror, reload persist, failure rejected');
 }finally{rejectSaves=false;await first.ctx.close();await second.ctx.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  await run(browser,base,true);
  await run(browser,base,false);
  assert.equal(words.size,2,'exactly two cloud words created; no local legacy imports');
  console.log('OLGA CLOUD TWO-DEVICE / BOTH VIEWPORTS PASS (mock network; real Supabase verified separately)');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
