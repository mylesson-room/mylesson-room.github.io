/* Olga Sweden A2 new lesson, homework and role-scoped assignment UI.
 * Actual Chromium rendering with synthetic sessions. Never uses live accounts.
 * Do not present mock API results as validation of production RLS or JaaS.
 */
'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),shots=path.join(root,'artifacts','olga-sweden03');
const student='11111111-1111-4111-8111-111111111111',teacher='22222222-2222-4222-8222-222222222222',room='33333333-3333-4333-8333-333333333333';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',woff2:'font/woff2'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'}).end(await readFile(file));}
 catch{res.writeHead(404).end();}
});
async function pageFor(browser,base,{file,mobile=false,role='student',assigned='sweden-a2-02.html'}){
 const id=role==='teacher'?teacher:student;
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 let selected=assigned,postCount=0,tokenCount=0,wordWrites=0;
 const cloudWords=[];
 await context.addInitScript(({id})=>{
  const session=JSON.stringify({user:{id,email:'preview@example.invalid'},access_token:'synthetic-token-not-valid',refresh_token:'preview',expires_at:Date.now()+3600000});
  sessionStorage.setItem('gostudy-cloud-session-v1',session);
  localStorage.setItem('gostudy-student-session-v1',session);
  localStorage.setItem('gostudy-teacher-session-v1',session);
 },{id});
 await context.route('https://**/*',async route=>{
  const url=new URL(route.request().url()),p=url.pathname;
  if(!url.hostname.endsWith('.supabase.co'))return route.abort();
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  let status=200,answer=[];
  if(p.endsWith('/auth/v1/user'))answer={id};
  if(p.includes('/rpc/gostudy_my_destinations'))answer=[{course:role==='teacher'?'teacher':'sweden-a2'}];
  if(p.includes('/rpc/gostudy_legacy_teacher_view')){if(role==='teacher')answer=[{id:student,label:'Ольга'}];else status=403;}
  if(p.includes('/gostudy_sweden_lesson_selection')){
    answer=[{student_id:student,teacher_id:teacher,lesson_path:selected}];
    if(role!=='teacher' && p.includes('/rpc/'))status=403;
  }
  if(p.includes('/rpc/gostudy_sweden_set_lesson')){
    if(role==='teacher'){const body=JSON.parse(route.request().postData()||'{}');selected=body.p_lesson_path;postCount++;answer=[{student_id:student,lesson_path:selected}];}
    else status=403;
  }
  if(p.includes('/gostudy_classroom_rooms'))answer=[{id:room,teacher_id:teacher,student_id:student,course:'sweden-a2',lesson_path:'sweden-a2-03.html',student_label:'Ольга'}];
  if(p.includes('/gostudy_sweden_words'))answer=cloudWords;
  if(p.includes('/rpc/gostudy_sweden_save_word')){
    if(role==='student'){
      const values=JSON.parse(route.request().postData()||'{}');
      const word={en:values.p_en,ru:values.p_ru,word_key:String(values.p_en||'').toLowerCase(),updated_at:new Date().toISOString()};
      const existing=cloudWords.findIndex(x=>x.word_key===word.word_key);
      if(existing<0)cloudWords.push(word);else cloudWords[existing]=word;
      wordWrites++;answer=[word];
    }else{status=403;answer={error:'Only student may save own words'};}
  }
  if(p.includes('/gostudy_classroom_events')||p.includes('/gostudy_progress')||p.includes('/gostudy_vocabulary_items'))answer=[];
  if(p.includes('/rpc/gostudy_classroom_send'))answer=true;
  if(p.includes('/functions/v1/gostudy-jaas-sweden-token')){status=403;answer={error:'Mock denies JaaS: token endpoint is not deployed in this test.'};tokenCount++;}
  return route.fulfill({status,headers:cors,json:answer});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto(base+'/'+file+(role==='teacher'&&file==='sweden-a2-03.html'?'?classStudent='+student:''),{waitUntil:'domcontentloaded',timeout:20000});
 const name=file.replace('.html','')+'-'+role+'-'+(mobile?'mobile':'desktop');
 return {context,page,name,errors,getMock:()=>({selected,postCount,tokenCount,wordWrites,cloudWords})};
}
(async()=>{
 await mkdir(shots,{recursive:true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const file of ['sweden-a2-03.html','sweden-a2-03-homework.html']){
   for(const mobile of [false,true]){
    const item=await pageFor(browser,base,{file,mobile});
    try{
     const {page,name}=item;
     await page.locator('#lessonPages .page.active').waitFor({state:'visible',timeout:15000});
     const stats=await page.evaluate(()=>{
      const panel=document.querySelector('.lesson-content'),heading=document.querySelector('#lessonPages .page.active .activity-head');
      return {width:document.documentElement.scrollWidth,viewport:innerWidth,background:getComputedStyle(panel).backgroundColor,
       heading:getComputedStyle(heading).backgroundImage,chat:!!document.querySelector('#lessonVideo .lesson-chat-dropdown'),
       translator:!!document.querySelector('#selectionTranslate'),dictionary:!!document.querySelector('#openLessonDictionary')};
     });
     assert.ok(stats.width<=stats.viewport+2,name+' horizontal overflow');
     assert.equal(stats.background,'rgb(255, 255, 255)',name+' Michael white sheet');
     assert.ok(stats.heading.startsWith('linear-gradient(110deg'),name+' Michael gradient');
     assert.ok(stats.chat&&stats.translator&&stats.dictionary,name+' chat/dictionary/translator markup');
     await page.locator('#openLessonDictionary').click();
     await page.locator('#lessonDictionary[open]').waitFor({state:'visible',timeout:4000});
     await page.waitForFunction(()=>window.GoStudySwedenCloudWords?.isReady(),{timeout:5000});
     // This is the REAL dictionary form inside the shared Michael lesson,
     // not a synthetic hand-built vocabulary fixture.
     await page.locator('#dictionarySource').fill('platform');
     await page.locator('#dictionaryTranslation').fill('платформа');
     await page.locator('#dictionaryAddForm button').click();
     await page.waitForFunction(()=>document.querySelector('#myWords')?.textContent.includes('platform'),{timeout:5000});
     assert.equal(item.getMock().wordWrites,1,name+' word must persist through real authenticated save RPC');
     assert.equal(await page.locator('#wordCountSidebar').innerText(),'1',name+' dictionary updates only after server ACK');
     await page.locator('#lessonDictionary form[method="dialog"] button').click();
     await page.locator('#next').click();
     await page.locator('#page-1.active').waitFor({state:'visible',timeout:4000});
     if(file==='sweden-a2-03.html'){
      const button=page.locator('#lessonVideo .jaas-connect');
      await button.waitFor({state:'visible',timeout:4000});
      assert.equal(await page.locator('#lessonVideo .jaas-person-tile').count(),2,'Michael two participant video tiles');
      assert.equal(await page.locator('#lessonVideo .video-actions .jaas-mic').count(),1,'Michael audio controls');
      await button.click();
      await page.waitForFunction(()=>document.querySelector('#lessonVideo .jaas-message')?.textContent.includes('Mock denies JaaS'),{timeout:10000});
      assert.equal(item.getMock().tokenCount,1,'video must request scoped signed token, not open arbitrary room');
      await page.evaluate(()=>document.querySelector('#lessonSections button:nth-child(3)')?.click());
      await page.locator('#page-2.active').waitFor({state:'visible',timeout:4000});
      await page.locator('#page-2 .sweden-listening').waitFor({state:'visible',timeout:4000});
      assert.equal(await page.locator('#page-2 details summary').first().textContent(),'Transcript','listening transcript missing');
     } else {
      assert.equal(await page.locator('#lessonVideo .video-workspace').isVisible(),false,'homework must not display fake video');
     }
     assert.deepEqual(item.errors.filter(e=>/gostudy-v1-|gostudy-sweden/.test(e)),[],name+' runtime errors');
     await page.screenshot({path:path.join(shots,name+'.png'),fullPage:false,animations:'disabled'});
     console.log('OLGA BROWSER PASS '+name);
    }finally{await item.context.close();}
   }
  }
  for(const assigned of ['sweden-a2-02.html','sweden-a2-02-michael.html','sweden-a2-03.html']){
   const item=await pageFor(browser,base,{file:'student-sweden.html',assigned});
   try{
    await item.page.locator('a.lesson-card-link').waitFor({state:'visible',timeout:6000});
    await item.page.waitForFunction(path=>document.querySelector('a.lesson-card-link')?.getAttribute('href')===path,assigned,{timeout:6000});
    assert.equal(await item.page.locator('a.lesson-card-link').getAttribute('href'),assigned);
    assert.equal(await item.page.locator('a.homework-link').getAttribute('href'),assigned.replace('.html','-homework.html'));
    assert.equal(await item.page.locator('a.sweden-legacy-details,details.sweden-legacy-details a').count(),1,'preserved legacy access');
    console.log('OLGA CABINET PASS current lesson='+assigned);
   }finally{await item.context.close();}
  }
  for(const role of ['teacher','student']){
   const item=await pageFor(browser,base,{file:'teacher-sweden-assignment.html',role});
   try{
    await item.page.locator('#sweden-assignment-status').waitFor({state:'visible'});
    if(role==='teacher'){
     await item.page.locator('#sweden-lesson:not([disabled])').waitFor({state:'visible',timeout:7000});
     await item.page.locator('#sweden-lesson').selectOption('sweden-a2-03.html');
     await item.page.locator('#sweden-assignment-form button').click();
     await item.page.waitForFunction(()=>document.querySelector('#sweden-assignment-status')?.textContent.includes('Сохранено'),{timeout:7000});
     assert.equal(item.getMock().postCount,1,'teacher-only RPC called once');
     const join=item.page.locator('#sweden-teacher-join');
     await join.waitFor({state:'visible',timeout:7000});
     assert.ok((await join.getAttribute('href')).includes('?classStudent='+student),
       'Teacher join must carry the exact authorized student room');
    }else{
     assert.equal(await item.page.locator('#sweden-lesson').isDisabled(),true,'student must never enable teacher assignment');
     assert.equal(item.getMock().postCount,0,'student must not send teacher-only mutation');
     assert.equal(await item.page.locator('#sweden-teacher-join').isVisible(),false,
       'Unauthorized student must never see teacher join control');
    }
    console.log('OLGA SELECTOR PASS '+role);
   }finally{await item.context.close();}
  }
  console.log('OLGA SYNTHETIC BROWSER PASS: 8 role/layout/default/lesson scenarios; real token, realtime, RLS and media still require live acceptance.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
