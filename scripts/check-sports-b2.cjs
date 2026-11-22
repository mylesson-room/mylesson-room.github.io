// Sports B2: methodology and two-person Michael shared-classroom regression.
// All users, API responses and events are synthetic. No real password or account data.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('node:http'),{chromium}=require('playwright');
const root=process.cwd();
const lesson='barcelona-appeal-b2-04.html',homework='barcelona-appeal-b2-04-homework.html';
const cabinet='student-sports-b2.html',course='sports-b2';
const student='11111111-1111-4111-8111-111111111111',teacher='22222222-2222-4222-8222-222222222222';
const roomId='33333333-3333-4333-8333-333333333333';
const events=[],records=new Map();
const mime={html:'text/html',css:'text/css',js:'application/javascript',svg:'image/svg+xml',json:'application/json'};
const serve=createServer(async(req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),filename=path.resolve(root,'.'+name);
 if(!filename.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':mime[path.extname(filename).slice(1)]||'application/octet-stream'})
  .end(await fs.readFile(filename))}
 catch{res.writeHead(404).end()}
});
function getLesson(html){const match=html.match(/<script type="application\/json" id="lesson-data">([\s\S]*?)<\/script>/);assert.ok(match,'missing lesson JSON');return JSON.parse(match[1]);}
function verifyStatic(){
 const lessonData=getLesson(require('node:fs').readFileSync(lesson,'utf8'));
 const hwData=getLesson(require('node:fs').readFileSync(homework,'utf8'));
 assert.equal(lessonData.steps.length,8);
 assert.equal(lessonData.steps.reduce((total,s)=>total+s.minutes,0),50);
 assert.equal(lessonData.lessonWords.length,8);
 assert.equal(hwData.steps.length,2);
 assert.equal(hwData.steps.reduce((total,s)=>total+s.minutes,0),20);
 assert.equal(lessonData.key,'gostudy-sports-b2-barcelona-04-v1');
 assert.equal(hwData.key,'gostudy-sports-b2-barcelona-04-homework-v1');
 for(const data of [lessonData,hwData]){
  const seen=new Set();
  for(const step of data.steps){assert.ok(step.id);assert.ok(!seen.has(step.id));seen.add(step.id);
   for(const item of step.items||[])assert.ok(Number.isInteger(item[2])&&item[2]>=0&&item[2]<item[1].length);
  }
 }
 for(const file of [lesson,homework,cabinet]){
  const source=require('node:fs').readFileSync(file,'utf8');
  assert.match(source,/gostudy-v1-(?:workbook|cabinet)\.js/);
  assert.doesNotMatch(source,/gostudy-vimbox-workbook|gostudy-glass-vocabulary/);
 }
 assert.match(require('node:fs').readFileSync(lesson,'utf8'),/data-jaas-scope="classroom"/);
 assert.match(require('node:fs').readFileSync(homework,'utf8'),/data-page-scope="homework"/);
 const shared=require('node:fs').readFileSync('assets/gostudy-sync.js','utf8');
 assert.match(shared,/sportsB2Keys/);assert.match(shared,/sports_b2/);
 return lessonData;
}
async function createContext(browser,id){
 const context=await browser.newContext({viewport:id===student?{width:390,height:844}:{width:1280,height:800}});
 await context.addInitScript(({id})=>{
  sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
   user:{id},access_token:'synthetic-jwt',expires_at:Date.now()+60*60*1000,expires_in:3600
  }));
 },{id});
 await context.route('https://*.supabase.co/**',route=>{
  const url=new URL(route.request().url()),name=url.pathname,verb=route.request().method();
  const body=verb==='GET'?{}:(route.request().postDataJSON()||{});
  if(name.endsWith('/gostudy_classroom_rooms')){
   return route.fulfill({json:[{id:roomId,teacher_id:teacher,student_id:student,student_label:'Савва',course,lesson_path:lesson}]});
  }
  if(name.endsWith('/gostudy_classroom_events')){
   const seq=Number((url.searchParams.get('seq')||'gt.0').slice(3));
   return route.fulfill({json:events.filter(x=>x.seq>seq)});
  }
  if(name.endsWith('/rpc/gostudy_classroom_send')){
   assert.equal(body.p_room,roomId);
   events.push({seq:events.length+1,actor:id,kind:body.p_kind,payload:body.p_payload});
   return route.fulfill({json:true});
  }
  if(name.endsWith('/gostudy_progress')){
   if(verb==='GET')return route.fulfill({json:[...records.entries()].map(([lesson_key,state])=>({lesson_key,revision:1,state}))});
   if(body.lesson_key)records.set(body.lesson_key,body.state);
   return route.fulfill({json:[]});
  }
  if(name.endsWith('/rpc/gostudy_my_destinations'))return route.fulfill({json:[{course:id===student?course:'teacher'}]});
  return route.fulfill({json:[]});
 });
 await context.route('https://translate.googleapis.com/**',route=>route.fulfill({json:[[["апелляция","appeal"]]]}));
 await context.route('https://8x8.vc/**',route=>route.abort());
 return context;
}
(async()=>{
 verifyStatic();
 await new Promise(resolve=>serve.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 let sc,tc;try {
  const base='http://127.0.0.1:'+serve.address().port;
  sc=await createContext(browser,student);tc=await createContext(browser,teacher);
  const sp=await sc.newPage(),tp=await tc.newPage();
  const errors=[];for(const page of [sp,tp])page.on('pageerror',error=>errors.push(error.message));
  await Promise.all([sp.goto(base+'/'+lesson),tp.goto(base+'/'+lesson+'?classStudent='+student)]);
  for(const page of [sp,tp]){
   await page.waitForFunction(()=>window.FinanceLive?.connected()===true,{timeout:15000});
   assert.equal(await page.locator('#lessonPages > .page').count(),8);
   assert.equal(await page.locator('#lessonVideo .jaas-person-tile').count(),2);
   assert.equal(await page.locator('a[href*="telemost"]').count(),0);
   assert.equal(await page.locator('#selectionTranslate').count(),1);
   assert.equal(await page.locator('.lesson-chat-dropdown').count(),1);
  }
  await sp.locator('#next').click();await sp.locator('#next').click();
  await sp.locator('input[name="appeal-04-reading:0"][value="1"]').check();
  await tp.locator('#next').click();await tp.locator('#next').click();
  await tp.waitForFunction(()=>document.querySelector('input[name="appeal-04-reading:0"][value="1"]')?.checked===true);
  await tp.locator('#moveStudent').waitFor({state:'visible',timeout:10000});
  await tp.locator('#moveStudent').click();
  await sp.locator('#page-2.active').waitFor();
  // Navigate elsewhere, then move student back.
  await tp.locator('#back').click();
  await tp.locator('#moveStudent').waitFor({state:'visible'});
  await tp.locator('#moveStudent').click();
  await sp.locator('#page-1.active').waitFor();
  assert.equal(await sp.locator('input[name="appeal-04-reading:0"][value="1"]').isChecked(),true);
  const chat=sp.locator('.lesson-chat-dropdown');await chat.locator('summary').click();
  await sp.locator('#finance-chat-form input').fill('Barcelona appeal: we need evidence');
  await sp.locator('#finance-chat-form button').click();
  const tcChat=tp.locator('.lesson-chat-dropdown');await tcChat.locator('summary').click();
  await tp.locator('#finance-messages li').filter({hasText:'Barcelona appeal: we need evidence'}).waitFor({timeout:12000});
  await sp.locator('#openLessonDictionary').click();
  await sp.locator('#dictionarySource').fill('file an appeal');
  await sp.locator('#dictionaryTranslation').fill('подать апелляцию');
  await sp.locator('#dictionaryAddForm button').click();
  await sp.locator('#myWords').getByText(/file an appeal/).waitFor();
  await sp.locator('#lessonDictionary form[method="dialog"] button').click();
  await sp.goto(base+'/'+homework);
  await sp.waitForFunction(()=>window.FinanceLive?.connected()===true,{timeout:12000});
  assert.equal(await sp.locator('#lessonPages>.page').count(),2);
  await sp.locator('#next').click();
  await sp.locator('[data-exercise-field="appeal-04-hw-email"]').fill('Dear Clara, I appreciate your correction, but the public notice should have explained the mistake.');
  const stored=await sp.evaluate(()=>JSON.parse(window.GoStudyStorage.getItem('gostudy-sports-b2-barcelona-04-homework-v1')||'{}'));
  assert.ok(JSON.stringify(stored.answers).includes('Dear Clara'));
  assert.deepEqual(errors.filter(s=>/gostudy-v1|gostudy-finance-live|gostudy-jaas-video/.test(s)),[]);
  console.log('Sport B2: eight pages, 50 minutes, shared video, live answers, teacher page control, chat, vocabulary, homework and cloud keys PASS');
 }finally{await sc?.close();await tc?.close();await browser.close();serve.close()}
})().catch(e=>{console.error(e);serve.close();process.exitCode=1});
