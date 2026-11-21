// B1 Stories regression on Michael's shared video/chat/answers/dictionary UI.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('node:http'),{chromium}=require('playwright');
const root=process.cwd(),studentId='11111111-1111-4111-8111-111111111111',teacherId='22222222-2222-4222-8222-222222222222';
const roomId='33333333-3333-4333-8333-333333333333',course='general-english-b1-stories',lesson='general-english-b1-stories-01.html';
const messages=[],events=[],assignedWords=[],progress=new Map();
const mime={html:'text/html',js:'application/javascript',json:'application/json',css:'text/css',svg:'image/svg+xml'};
const server=createServer(async(req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{const d=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'}).end(d)}
 catch{res.writeHead(404).end()}
});
async function contextFor(browser,id,isStudent){
 const context=await browser.newContext({viewport:isStudent?{width:390,height:844}:{width:1350,height:820}});
 await context.addInitScript(({id})=>sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({user:{id},access_token:'test-'+id,expires_at:Date.now()+3600000})),{id});
 await context.route('https://*.supabase.co/**',route=>{
  const url=new URL(route.request().url()),name=url.pathname,method=route.request().method(),body=method==='GET'?{}:(route.request().postDataJSON()||{});
  if(name.endsWith('/gostudy_classroom_rooms'))return route.fulfill({json:[{id:roomId,student_id:studentId,teacher_id:teacherId,student_label:'Test student',course,lesson_path:lesson}]});
  if(name.endsWith('/gostudy_classroom_events')){
   const after=Number(url.searchParams.get('seq')?.replace('gt.','')||0);
   return route.fulfill({json:events.filter(e=>e.seq>after)});
  }
  if(name.endsWith('/rpc/gostudy_classroom_send')){
   events.push({seq:events.length+1,actor:id,kind:body.p_kind,payload:body.p_payload});
   return route.fulfill({json:true});
  }
  if(name.endsWith('/rpc/course_workbook_read'))return route.fulfill({json:assignedWords.slice()});
  if(name.endsWith('/rpc/course_workbook_assign')){
   assert.equal(isStudent,false,'Only teacher may assign');
   assert.equal(body.p_course,course);assert.equal(body.p_student,studentId);
   assignedWords.push({en:body.p_en,ru:body.p_ru});return route.fulfill({json:true});
  }
  if(name.endsWith('/rpc/gostudy_my_destinations'))return route.fulfill({json:[{course:isStudent?course:'teacher'}]});
  if(name.endsWith('/gostudy_progress')){
   if(method==='GET')return route.fulfill({json:[...progress.entries()].filter(([k])=>k.includes('general-english-b1-stories')).map(([lesson_key,state])=>({lesson_key,state,revision:1}))});
   if(body?.lesson_key)progress.set(body.lesson_key,body.state);
   return route.fulfill({json:[]});
  }
  return route.fulfill({json:[]});
 });
 await context.route('https://translate.googleapis.com/**',route=>route.fulfill({json:[[["квартира","apartment"]]]}));
 return context;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 let sc,tc;try{
  const origin='http://127.0.0.1:'+server.address().port;
  sc=await contextFor(browser,studentId,true);tc=await contextFor(browser,teacherId,false);
  const sp=await sc.newPage(),tp=await tc.newPage(),errors=[];
  for(const p of [sp,tp])p.on('pageerror',e=>errors.push(e.message));
  await Promise.all([sp.goto(origin+'/'+lesson),tp.goto(origin+'/'+lesson+'?classStudent='+studentId)]);
  const studentChat=sp.locator('.lesson-chat-dropdown'),teacherChat=tp.locator('.lesson-chat-dropdown');
  await Promise.all([studentChat.waitFor(),teacherChat.waitFor()]);
  await Promise.all([sp,tp].map(p=>p.waitForFunction(()=>document.querySelector('#finance-live-status')?.textContent?.trim()==='Онлайн · общая комната' && window.FinanceLive?.connected()===true)));
  await studentChat.locator('summary').click();
  await sp.locator('#finance-chat-form input').fill('Hello from the student');
  await sp.locator('#finance-chat-form button').click();
  await sp.locator('#finance-messages li').filter({hasText:'Hello from the student'}).waitFor({timeout:12000});
  await teacherChat.locator('.lesson-chat-unread:not([hidden])').waitFor({timeout:12000});
  await teacherChat.locator('summary').click();
  await tp.locator('#finance-messages li').filter({hasText:'Hello from the student'}).waitFor({timeout:12000});
  await tp.locator('#finance-chat-form input').fill('Hello from the teacher');
  await tp.locator('#finance-chat-form button').click();
  await sp.locator('#finance-messages li').filter({hasText:'Hello from the teacher'}).waitFor({timeout:12000});
  // The original answer ID remains unchanged and is seen by the teacher.
  await sp.locator('#next').click();
  await sp.locator('input[name="newhome-nora:0"][value="1"]').check();
  await tp.locator('#next').click();
  await tp.locator('input[name="newhome-nora:0"][value="1"]').waitFor();
  await tp.waitForFunction(()=>document.querySelector('input[name="newhome-nora:0"][value="1"]')?.checked===true,{timeout:12000});
  // Student word remains in the course's original synchronized progress key.
  await sp.locator('#openLessonDictionary').click();
  await sp.locator('#dictionarySource').fill('apartment');
  await sp.locator('#dictionaryTranslation').fill('квартира');
  await sp.locator('#dictionaryAddForm button').click();
  await sp.locator('#myWords').getByText(/apartment/).waitFor({timeout:10000});
  assert.ok((await sp.evaluate(()=>localStorage.getItem('gostudy-vocabulary-general-english-b1-stories-v1')||'')).includes('apartment'));
  await tp.locator('#openLessonDictionary').click();
  await tp.locator('#dictionarySource').fill('settle in');
  await tp.locator('#dictionaryTranslation').fill('освоиться');
  await tp.locator('#dictionaryAddForm button').click();
  await tp.locator('#myWords').getByText(/settle in/).waitFor({timeout:10000});
  await sp.locator('#myWords').getByText(/settle in/).waitFor({timeout:12000});
  await sp.reload();
  await sp.locator('#openLessonDictionary').click();
  await sp.locator('#myWords').getByText(/apartment/).waitFor({timeout:12000});
  assert.deepEqual(errors.filter(e=>/gostudy-v1-workbook|gostudy-finance-live/.test(e)),[]);
  console.log('B1 Stories Michael chat, two-way answers, synced student words, teacher-assigned words, reload PASS');
 }finally{await sc?.close();await tc?.close();await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
