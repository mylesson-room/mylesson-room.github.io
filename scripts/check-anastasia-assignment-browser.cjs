/* New Anastasia assignment/private lesson contract. Synthetic network; no production credentials or writes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const STUDENT='d4f4980a-e17b-4bf6-9541-425c48fc2c0e',TEACHER='acf2f6a1-f38b-45ef-836d-6cc9a9a5a832',OUTSIDER='3bc8903b-29c0-474d-9d09-c89f896510bc';
const OLD='art-b1-03.html',NEXT='art-b1-04.html';
const fixture={title:'Mosaic conversation fixture',hero:'Mosaic conversation fixture',cabinet:'student-art-b1.html',key:'art4-fixture',wordsKey:'gostudy-business-ai-shared-v1',course:null,answerNamespace:'art4:',lessonWords:[{en:'pattern',ru:'узор'}],steps:[
 {id:'review',title:'Review evidence',minutes:25,html:'<svg role="img" aria-label="Mosaic study" viewBox="0 0 300 80"><rect width="300" height="80" fill="#234"/></svg><label>Recommendation<textarea data-exercise-field="art4-note"></textarea></label><button type="button" data-lesson-word="0">Save pattern</button>'},
 {id:'check',title:'Check the facts',minutes:25,type:'choice',items:[['Does an alert prove fraud?',['Yes','No'],1]]}
]};
const homeFixture={...fixture,key:'art4hw-fixture',answerNamespace:'art4hw:'};
let selected=OLD,seq=0,events=[];
const server=http.createServer((req,res)=>{
 let rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';
 const file=path.resolve(rel);
 if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
 try{const data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);}catch{res.writeHead(404).end();}
});
const waitFor=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+label);};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.GOSTUDY_CHROME||undefined,headless:true,args:['--no-sandbox']});
 const errors=[];
 async function context(user,mobile=false){
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:1000}});
  await ctx.addInitScript(({user,TEACHER})=>{
   if(user){const session={access_token:user,refresh_token:'synthetic',expires_at:Date.now()+3600000,user:{id:user,email:user===TEACHER?'teacher@example.test':'student@example.test'}};
    localStorage.setItem(user===TEACHER?'gostudy-teacher-session-v1':'gostudy-student-session-v1',JSON.stringify(session));
    sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify(session));
    if(user===TEACHER){const other={...session,access_token:'d4f4980a-e17b-4bf6-9541-425c48fc2c0e',user:{id:'d4f4980a-e17b-4bf6-9541-425c48fc2c0e'}};localStorage.setItem('gostudy-student-session-v1',JSON.stringify(other));sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify(other));}}
   localStorage.setItem('qa-preserve','keep existing data');
  },{user,TEACHER});
  await ctx.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===base)return route.continue();
   if(!url.hostname.endsWith('.supabase.co'))return route.abort();
   const req=route.request(),actor=(req.headers().authorization||'').replace('Bearer ','');
   const json=(body,status=200)=>route.fulfill({status,json:body});
   if(url.pathname==='/auth/v1/user')return json(actor?{id:actor,email:'fixture@example.test'}:{},actor?200:401);
   if(url.pathname.endsWith('/gostudy_finance_room'))return json([]);
   if(url.pathname.endsWith('/gostudy_classroom_rooms')){
    const course=url.searchParams.get('course');
    return json([TEACHER,STUDENT].includes(actor)&&course==='eq.art-b1'?[{id:'0591193c-22e4-43db-b8a7-e8eaf4c682bd',student_id:STUDENT,teacher_id:TEACHER,student_label:'Анастасия'}]:[]);
   }
   if(url.pathname.endsWith('/gostudy_art_lesson_selection')){
    if(![TEACHER,STUDENT].includes(actor))return json([]);
    if(req.method()==='PATCH'){
     if(actor!==TEACHER)return json([],403);
     const body=req.postDataJSON();assert.ok([OLD,NEXT].includes(body.lesson_path));selected=body.lesson_path;
    }
    return json([{student_id:STUDENT,teacher_id:TEACHER,lesson_path:selected}]);
   }
   if(url.pathname.endsWith('/gostudy_private_lessons')){
    if(![TEACHER,STUDENT].includes(actor))return json([]);
    return json([{student_id:STUDENT,teacher_id:TEACHER,lesson_payload:url.searchParams.get('slug')?.includes('homework')?homeFixture:fixture}]);
   }
   if(url.pathname.endsWith('/gostudy_classroom_events')){
    const cursor=Number((url.searchParams.get('seq')||'gt.0').slice(3));
    return json(events.filter(e=>e.seq>cursor).slice(0,500));
   }
   if(url.pathname.endsWith('/rpc/gostudy_classroom_send')){
    const body=req.postDataJSON();events.push({id:body.p_id,room_id:body.p_room,kind:body.p_kind,payload:body.p_payload,actor,seq:++seq});return json(true);
   }
   if(url.pathname.endsWith('/rpc/gostudy_legacy_teacher_view')&&req.postDataJSON().p_course==='art_b1')
    return json(actor===TEACHER?[{id:STUDENT,label:'Анастасия',words:[],assigned:[],progress:[]}]:[]);
   if(url.pathname.endsWith('/gostudy_teacher_student_emails'))return json([{id:STUDENT,email:'student@example.test'}]);
   if(url.pathname.includes('/rpc/'))return json([]);
   return json([]);
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  return {ctx,page};
 }
 try{
  const teacher=await context(TEACHER),student=await context(STUDENT);
  await student.page.goto(base+'/student-art-b1.html');
  await waitFor(()=>student.page.locator('.lesson-card-link').getAttribute('href').then(v=>v===OLD),'old lesson unchanged');
  await teacher.page.goto(base+'/gostudy-teacher.html');
  const form=teacher.page.locator('#anastasia-lesson-assignment form');
  await form.waitFor();
  await form.locator('select').selectOption(NEXT);
  assert.equal(selected,OLD,'Selecting without clicking must not assign');
  assert.ok((await form.locator('[data-preview]').getAttribute('href')).startsWith(NEXT+'?classStudent='));
  await form.getByRole('button',{name:'Назначить Анастасии'}).click();
  await form.getByRole('status').getByText(/Назначено/).waitFor();
  await waitFor(()=>student.page.locator('.lesson-card-link').getAttribute('href').then(v=>v===NEXT),'student home auto update');
  assert.equal(await student.page.locator('.homework-link').getAttribute('href'),'art-b1-04-homework.html');
  await teacher.page.reload();await teacher.page.locator('#anastasia-next-lesson').waitFor();
  await waitFor(()=>teacher.page.locator('#anastasia-next-lesson').inputValue().then(v=>v===NEXT),'assignment survives reload');
  assert.equal(await student.page.evaluate(()=>localStorage.getItem('qa-preserve')),'keep existing data');
  assert.equal(await student.page.locator('#lesson-assignment-settings').count(),1,'Anastasia uses the shared configurable assignment component');

  await teacher.page.goto(base+'/'+NEXT+'?classStudent='+STUDENT);
  await student.page.goto(base+'/'+NEXT);
  await teacher.page.locator('#page-0 textarea').waitFor();await student.page.locator('#page-0 textarea').waitFor();
  await waitFor(()=>teacher.page.locator('#finance-live-status').textContent().then(t=>t.includes('Онлайн')),'teacher connected');
  await waitFor(()=>student.page.locator('#finance-live-status').textContent().then(t=>t.includes('Онлайн')),'student connected');
  await teacher.page.evaluate(()=>document.dispatchEvent(new Event('keyup')));
  assert.equal(await teacher.page.locator('.jaas-connect').count(),1,'shared video control exists');
  await student.page.locator('#page-0 textarea').fill('Describe the glass and ceramic tiles.');
  await waitFor(()=>teacher.page.locator('#page-0 textarea').inputValue().then(v=>v==='Describe the glass and ceramic tiles.'),'student answer visible to teacher');
  await teacher.page.locator('#page-0 textarea').fill('Explain the artist’s inspiration.');
  await waitFor(()=>student.page.locator('#page-0 textarea').inputValue().then(v=>v==='Explain the artist’s inspiration.'),'teacher answer visible to student');
  await student.page.reload();await student.page.locator('#page-0 textarea').waitFor();
  await waitFor(()=>student.page.locator('#page-0 textarea').inputValue().then(v=>v==='Explain the artist’s inspiration.'),'answer restored after reload');
  await teacher.page.locator('#next').click();
  await waitFor(()=>teacher.page.locator('#moveStudent').isVisible(),'move student available');
  assert.ok(await student.page.locator('#page-0').isVisible(),'teacher navigation alone must not move student');
  await teacher.page.locator('#moveStudent').click();
  await waitFor(()=>student.page.locator('#page-1').isVisible(),'explicit move synchronises page');
  await student.page.locator('#page-1 input[value="1"]').check();
  await waitFor(()=>teacher.page.locator('#page-1 input[value="1"]').isChecked(),'choice synchronised');
  await teacher.page.locator('#back').click();
  await teacher.page.getByRole('button',{name:'Save pattern',exact:true}).click();
  await student.page.locator('#openLessonDictionary').click();
  await waitFor(()=>student.page.locator('#myWords').textContent().then(t=>t.includes('pattern')),'shared word visible');
  await student.page.locator('#lessonDictionary form[method=dialog] button').click();
  if(!await teacher.page.locator('#finance-chat-form input').isVisible())await teacher.page.locator('.lesson-chat-toggle').click();
  if(!await student.page.locator('#finance-chat-form input').isVisible())await student.page.locator('.lesson-chat-toggle').click();
  await teacher.page.locator('#finance-chat-form input').fill('Please describe the pattern.');
  await teacher.page.locator('#finance-chat-form button').click();
  await waitFor(()=>student.page.locator('#finance-messages').textContent().then(t=>t.includes('Please describe the pattern.')),'shared chat');
  // A legacy page event must not navigate a scoped lesson.
  events.push({id:'legacy-page',seq:++seq,actor:TEACHER,kind:'page',payload:{action:'move',page:0}});
  await new Promise(r=>setTimeout(r,1300));assert.ok(await student.page.locator('#page-1').isVisible(),'legacy navigation cannot cross lesson scope');
  const mobile=await context(STUDENT,true);
  await mobile.page.goto(base+'/'+NEXT);
  await mobile.page.locator('#lessonPages').waitFor();
  assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile viewport has no horizontal overflow');
  await mobile.page.goto(base+'/art-b1-04-homework.html');
  await mobile.page.locator('#lessonPages').waitFor();
  assert.equal(await mobile.page.locator('#lessonVideo').isVisible(),false,'homework has no video area');
  const stranger=await context(OUTSIDER);
  await stranger.page.goto(base+'/'+NEXT);
  await stranger.page.locator('#gostudyAccessGate').waitFor();
  assert.equal(await stranger.page.locator('#lessonPages').count(),0,'outsider receives no lesson UI');
  const anon=await context(null);
  await anon.page.goto(base+'/'+NEXT);await anon.page.locator('#gostudyAccessGate').waitFor();
  assert.equal(await anon.page.locator('#lessonPages').count(),0,'anonymous receives no lesson UI');
  assert.deepEqual(errors,[],'no page exceptions');
  console.log('Anastasia: assignment, uncommitted choice, preview, auto update, reload, two-role answers, explicit page movement, vocabulary, chat, scope isolation, mobile, homework, outsider and anonymous gates passed.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
