/* Two real Chromium contexts. Uses real Michael shared JS, synthetic isolated
 * Supabase event API. Tests student answer -> teacher, teacher moves student
 * through pages, chat, teacher-assigned word -> student cloud vocabulary.
 * NOT a real-account video test. No production network access.
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
const lesson='sweden-a2-02-michael.html';
const events=[],words=new Map(),cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const server=createServer(async(req,res)=>{
  const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.writeHead(200).end(await readFile(f));}catch{res.writeHead(404).end();}
});
function mocked(role,route){
  const req=route.request(),url=new URL(req.url()),p=url.pathname;
  if(!url.hostname.endsWith('.supabase.co'))return route.abort();
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  let data=[],status=200;
  if(p.endsWith('/auth/v1/user'))data={id:role,email:'synthetic@example.invalid'};
  else if(p.includes('gostudy_my_destinations'))data=[{course:role===teacher?'teacher':'sweden-a2'}];
  else if(p.includes('gostudy_legacy_teacher_view'))data=role===teacher?[{id:student,label:'Ольга'}]:[];
  else if(p.includes('gostudy_classroom_rooms'))
    data=[{id:room,teacher_id:teacher,student_id:student,course:'sweden-a2',lesson_path:lesson,student_label:'Synthetic learner'}];
  else if(p.includes('gostudy_classroom_events')){
    const cursor=Number((url.searchParams.get('seq')||'gt.0').split('.')[1])||0;
    data=events.filter(x=>x.seq>cursor);
  }
  else if(p.includes('/rpc/gostudy_classroom_send')){
    const b=JSON.parse(req.postData()||'{}');
    if(!['page','chat','answer','reset','word','word_mastered'].includes(b.p_kind)||b.p_room!==room){
      status=403;data={error:'Unexpected event'};
    }else{
      events.push({seq:events.length+1,actor:role,kind:b.p_kind,payload:b.p_payload});
      data=true;
    }
  }
  else if(p.includes('/rpc/gostudy_sweden_save_teacher_word')){
    const b=JSON.parse(req.postData()||'{}');
    if(role!==teacher||b.p_student!==student){status=403;data={message:'Not assigned teacher'};}
    else{
      const key=b.p_en.trim().toLowerCase();
      words.set(key,{word_key:key,en:b.p_en,ru:b.p_ru});
      data=[{word_key:key,en:b.p_en,ru:b.p_ru}];
    }
  }
  else if(p.includes('/rpc/gostudy_sweden_save_word')){
    const b=JSON.parse(req.postData()||'{}');
    if(role!==student){status=403;data={message:'Not student'};}
    else{
      const key=b.p_en.trim().toLowerCase();
      words.set(key,{word_key:key,en:b.p_en,ru:b.p_ru});
      data=[{word_key:key,en:b.p_en,ru:b.p_ru}];
    }
  }
  else if(p.includes('/gostudy_sweden_words'))data=Array.from(words.values());
  else if(p.includes('/gostudy_progress'))data=[];
  else if(p.includes('/functions/v1/gostudy-jaas-sweden-token')){
    status=403;data={error:'No actual media token in synthetic test'};
  }
  return route.fulfill({status,headers:cors,json:data});
}
async function create(browser,base,id,mobile){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(({id})=>{
   const session=JSON.stringify({user:{id,email:'synthetic@example.invalid'},access_token:'fake-'+id,refresh_token:'fake',expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',session);
   localStorage.setItem('gostudy-student-session-v1',session);
   localStorage.setItem('gostudy-teacher-session-v1',session);
 },{id});
 await ctx.route('https://**/*',r=>mocked(id,r));
 const page=await ctx.newPage();
 await page.goto(base+'/'+lesson+(id===teacher?'?classStudent='+student:''),{waitUntil:'domcontentloaded'});
 await page.locator('#lessonPages .page.active').waitFor({state:'visible',timeout:16000});
 await page.waitForFunction(()=>window.FinanceLive?.connected(),null,{timeout:18000});
 return {ctx,page};
}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const learner=await create(browser,base,student,true);
  const tutor=await create(browser,base,teacher,false);
  try{
    assert.equal(await tutor.page.evaluate(()=>window.FinanceLive.teacher()),true,'Teacher role must be recognized by room');
    assert.equal(await learner.page.evaluate(()=>window.FinanceLive.teacher()),false,'Learner role must be recognized by room');
    for(let i=0;i<2;i++)await learner.page.locator('#next').click();
    await learner.page.locator('#page-2.active').waitFor();
    const radio=learner.page.locator('input[type=radio][name="sweden-02-v1-2:0"][value="1"]');
    await radio.check();
    await tutor.page.waitForFunction(()=>document.querySelector('input[type=radio][name="sweden-02-v1-2:0"][value="1"]')?.checked===true,null,{timeout:15000});
    console.log('OLGA TWO ROLES PASS: real exercise click arrives in teacher workbook');
    const chatToggle=learner.page.locator('#lessonVideo .lesson-chat-toggle');
    if(await chatToggle.count())await chatToggle.click();
    const input=learner.page.locator('#finance-chat-form input');
    await input.fill('Hello from synthetic Olga');
    await learner.page.locator('#finance-chat-form button').click();
    await tutor.page.waitForFunction(()=>document.querySelector('#finance-messages')?.textContent.includes('Hello from synthetic Olga'),null,{timeout:15000});
    console.log('OLGA TWO ROLES PASS: typed chat arrives at teacher');
    // Michael normally auto-follows the student's page presence. Derive
    // the actual teacher page first instead of assuming it is still page 0.
    const at=Number((await tutor.page.locator('#lessonPages .page.active').getAttribute('id')).slice(5));
    for(let i=at;i<3;i++)await tutor.page.locator('#next').click();
    for(let i=at;i>3;i--)await tutor.page.locator('#back').click();
    await tutor.page.locator('#page-3.active').waitFor({state:'visible',timeout:12000});
    await tutor.page.locator('#moveStudent:not([hidden])').waitFor({state:'visible',timeout:15000});
    await tutor.page.locator('#moveStudent').click();
    await learner.page.locator('#page-3.active').waitFor({state:'visible',timeout:15000});
    console.log('OLGA TWO ROLES PASS: teacher remote-moves learner to page 4');
    await tutor.page.locator('#openLessonDictionary').click();
    await tutor.page.locator('#dictionaryAddForm #dictionarySource').fill('entrance');
    await tutor.page.locator('#dictionaryAddForm #dictionaryTranslation').fill('вход');
    await tutor.page.locator('#dictionaryAddForm button').click();
    await tutor.page.waitForFunction(()=>window.GoStudySwedenCloudWords?.words().some(w=>w.en==='entrance'),null,{timeout:10000});
    await learner.page.evaluate(()=>window.GoStudySwedenCloudWords.refresh());
    assert.ok((await learner.page.evaluate(()=>window.GoStudySwedenCloudWords.words())).some(w=>w.en==='entrance'),'Teacher assigned word must appear in learner vocabulary');
    console.log('OLGA TWO ROLES PASS: course-scoped teacher cloud-word write arrives on student');
    console.log('OLGA TWO ROLES COMPLETE: answer, chat, teacher move, teacher word, two distinct sessions; simulated network only');
  }finally{await learner.ctx.close();await tutor.ctx.close();}
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
