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
const events=[],records=new Map(),googleRequests=[];
const fakeJitsi=`window.JitsiMeetExternalAPI=class {
 constructor(domain,options) {
  window.__savvaCallStarts=(window.__savvaCallStarts||0)+1;
  window.__savvaCallRoom=options.roomName;
  this.events={};
  this.iframe=document.createElement('iframe');
  this.iframe.src='about:blank';
  options.parentNode.appendChild(this.iframe);
  setTimeout(()=>this.events.videoConferenceJoined?.(),35);
 }
 addEventListener(name,handler){this.events[name]=handler}
 executeCommand(){}
 dispose(){window.__savvaCallDisposed=(window.__savvaCallDisposed||0)+1;this.iframe.remove()}
};`;

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
 assert.equal(lessonData.title,"Inside the World's Football Academies");
 assert.ok(lessonData.steps.flatMap(step=>step.source||[]).join(' ').includes('Ajax'));
 assert.ok(lessonData.steps.flatMap(step=>step.source||[]).join(' ').includes('Right to Dream'));
 assert.equal(new Set(lessonData.steps.map(s=>s.photo?.src)).size,8,'each page must have a different real photo');
 for(const data of [lessonData,hwData]){
   for(const step of data.steps){
     assert.match(step.photo?.src||'',/^https:\/\//,'every page needs a real photo URL');
     assert.match(step.photo?.source||'',/^https:\/\//,'attribution links required');
     assert.ok(step.photo?.alt && step.photo?.credit,'accessible attribution required');
   }
 }

 assert.equal(hwData.steps.length,2);
 assert.equal(hwData.steps.reduce((total,s)=>total+s.minutes,0),20);
 assert.equal(lessonData.key,'gostudy-sports-b2-football-academies-04-v1');
 assert.equal(hwData.key,'gostudy-sports-b2-football-academies-04-homework-v1');
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
async function verifyPhotoLoading(page, expected, label) {
 const results=await page.locator('.gostudy-real-photo img').evaluateAll(async images=>{
   return Promise.all(images.map(img=>new Promise(resolve=>{
     const done=(status)=>resolve({src:img.getAttribute('src'),status,width:img.naturalWidth});
     if(img.complete)return done(img.naturalWidth>0?'ok':'broken');
     const timer=setTimeout(()=>done('timeout'),12000);
     img.addEventListener('load',()=>{clearTimeout(timer);done('ok')},{once:true});
     img.addEventListener('error',()=>{clearTimeout(timer);done('broken')},{once:true});
     img.loading='eager';
   })));
 });
 assert.equal(results.length,expected,label+' must have a real photograph on every page');
 const bad=results.filter(r=>r.status!=='ok'||r.width<100);
 if(bad.length)console.error(label+' FAILED PHOTO SOURCES:',bad);
 assert.deepEqual(bad,[],label+' contains broken photographs');
 console.log(label+' images loaded: '+results.length);
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
  if(name.endsWith('/functions/v1/gostudy-jaas-classroom-token')) {
   assert.equal(body.course,course);
   assert.equal(body.lessonPath,lesson);
   if(id===student)assert.equal(body.studentId,null);
   else assert.equal(body.studentId,student);
   return route.fulfill({json:{appId:'vpaas-magic-cookie-synthetic',room:'gostudy-classroom-sports-b2-'+student.replace(/-/g,''),jwt:'signed-test-token'}});
  }
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
 await context.route('https://translate.googleapis.com/**',route=>{
   const u=new URL(route.request().url());
   googleRequests.push({q:u.searchParams.get('q'),sl:u.searchParams.get('sl'),tl:u.searchParams.get('tl')});
   return route.fulfill({status:200,json:[[["тренировка","training"]]]});
 });
 await context.route('https://8x8.vc/**',route=>route.request().url().endsWith('/external_api.js')
  ?route.fulfill({status:200,contentType:'application/javascript',body:fakeJitsi}):route.abort());
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
   assert.equal(await page.locator('.gostudy-real-photo img').count(),8,'real photography on each lesson page');

   assert.equal(await page.locator('a[href*="telemost"]').count(),0);
   assert.equal(await page.locator('#selectionTranslate').count(),1);
   assert.equal(await page.locator('.lesson-chat-dropdown').count(),1);
  }
  // Actual text selection, Google RU translation and '+' saved-word control,
  // not just the presence of an empty translator component.
  await sp.evaluate(()=>{
    const p=document.querySelector('#page-0 .article p');
    if(!p?.firstChild)throw Error('Opening paragraph missing');
    const node=p.firstChild,index=node.textContent.indexOf('coaching');
    if(index<0)throw Error('Missing coaching phrase');
    const r=document.createRange();
    r.setStart(node,index);r.setEnd(node,index+'coaching'.length);
    const selection=window.getSelection();
    selection.removeAllRanges();selection.addRange(r);
    document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  });
  await sp.locator('#selectionTranslate.is-visible').waitFor({timeout:9000});
  await sp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value.includes('тренировка'),{timeout:9000});
  assert.ok(googleRequests.some(r=>r.q?.includes('coaching')&&r.sl==='en'&&r.tl==='ru'),'Michael translator must call Google EN→RU');
  await sp.locator('#selectionSave').click();
  await sp.waitForFunction(()=>document.querySelector('#selectionSave')?.textContent==='✓',{timeout:9000});
  await sp.locator('#openLessonDictionary').click();
  await sp.locator('#myWords').getByText(/coaching/).waitFor({timeout:9000});
  await sp.locator('#lessonDictionary form[method="dialog"] button').click();
  await sp.keyboard.press('Escape');
  // Both teacher and student enter the same signed video room; the iframe
  // must persist while the teacher moves the student between lesson pages.
  for(const p of [sp,tp]){
   await p.locator('#lessonVideo .jaas-connect').click();
   await p.locator('#lessonVideo .jaas-frame iframe').waitFor({state:'attached',timeout:9000});
   assert.equal(await p.evaluate(()=>window.__savvaCallRoom),'vpaas-magic-cookie-synthetic/gostudy-classroom-sports-b2-'+student.replace(/-/g,''));
   await p.evaluate(()=>window.__savvaVideoIframe=document.querySelector('#lessonVideo .jaas-frame iframe'));
  }
  await verifyPhotoLoading(sp,8,'Savva main lesson');
  await sp.locator('#next').click();await sp.locator('#next').click();
  await sp.locator('input[name="academy-04-real-world:0"][value="0"]').check();
  await tp.locator('#next').click();await tp.locator('#next').click();
  await tp.waitForFunction(()=>document.querySelector('input[name="academy-04-real-world:0"][value="0"]')?.checked===true);
  // The teacher controls student navigation only when their pages differ.
  await tp.locator('#back').click();
  await tp.locator('#moveStudent').waitFor({state:'visible',timeout:12000});
  await tp.locator('#moveStudent').click();
  await sp.locator('#page-1.active').waitFor();
  for(const p of [sp,tp]){
   assert.equal(await p.evaluate(()=>window.__savvaVideoIframe===document.querySelector('#lessonVideo .jaas-frame iframe')),true,'Video iframe cannot be remounted when teacher moves student');
   assert.equal(await p.evaluate(()=>window.__savvaCallStarts),1,'Video session cannot reconnect on page change');
  }

  assert.equal(await sp.locator('input[name="academy-04-real-world:0"][value="0"]').isChecked(),true);
  const chat=sp.locator('.lesson-chat-dropdown');await chat.locator('summary').click();
  await sp.locator('#finance-chat-form input').fill('Football academy: protect education');
  await sp.locator('#finance-chat-form button').click();
  const tcChat=tp.locator('.lesson-chat-dropdown');await tcChat.locator('summary').click();
  await tp.locator('#finance-messages li').filter({hasText:'Football academy: protect education'}).waitFor({timeout:12000});
  await sp.locator('#openLessonDictionary').click();
  await sp.locator('#dictionarySource').fill('talent pathway');
  await sp.locator('#dictionaryTranslation').fill('путь развития таланта');
  await sp.locator('#dictionaryAddForm button').click();
  await sp.locator('#myWords').getByText(/talent pathway/).waitFor();
  await sp.locator('#lessonDictionary form[method="dialog"] button').click();
  await sp.goto(base+'/'+homework);
  await sp.waitForFunction(()=>window.FinanceLive?.connected()===true,{timeout:12000});
  assert.equal(await sp.locator('#lessonPages>.page').count(),2);
  assert.equal(await sp.locator('.gostudy-real-photo img').count(),2,'real photography on both homework pages');
  await verifyPhotoLoading(sp,2,'Savva homework');

  await sp.locator('#next').click();
  await sp.locator('[data-exercise-field="academy-04-hw-pitch"]').fill("Our academy would borrow Ajax's talent pathway and Right to Dream's approach to holistic development.");
  const stored=await sp.evaluate(()=>JSON.parse(window.GoStudyStorage.getItem('gostudy-sports-b2-football-academies-04-homework-v1')||'{}'));
  assert.ok(JSON.stringify(stored.answers).includes('Our academy'));
  assert.deepEqual(errors.filter(s=>/gostudy-v1|gostudy-finance-live|gostudy-jaas-video/.test(s)),[]);
  console.log('Football Academies B2: eight pages, 50 minutes, shared video, live answers, teacher page control, chat, vocabulary, homework and cloud keys PASS');
 }finally{await sc?.close();await tc?.close();await browser.close();serve.close()}
})().catch(e=>{console.error(e);serve.close();process.exitCode=1});
