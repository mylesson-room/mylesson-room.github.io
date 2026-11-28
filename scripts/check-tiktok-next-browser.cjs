/* Real Chromium, synthetic student/teacher sessions, isolated API responses.
   No production writes. Run from repository root with Playwright available. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('playwright');
const root=process.cwd();
const student='11111111-1111-4111-8111-111111111111',teacher='22222222-2222-4222-8222-222222222222';
const room='33333333-3333-4333-8333-333333333333';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const server=createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':({'html':'text/html','js':'text/javascript','css':'text/css','svg':'image/svg+xml'})[path.extname(file).slice(1)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
async function run(browser,base,mobile,role){
 const id=role==='teacher'?teacher:student;
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 const errors=[];
 await context.addInitScript(({id})=>{
  if(window.top!==window)return;
  if(!sessionStorage.getItem('gostudy-cloud-session-v1')){
   const session=JSON.stringify({user:{id,email:'qa@example.invalid'},access_token:'synthetic-only',refresh_token:'synthetic',expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',session);localStorage.setItem('gostudy-student-session-v1',session);
  }
 },{id});
 await context.route('https://**/*',route=>{
  const u=new URL(route.request().url());if(!u.hostname.endsWith('.supabase.co'))return route.abort();
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  let answer=[];
  if(u.pathname.endsWith('/auth/v1/user'))answer={id};
  if(u.pathname.endsWith('/rpc/gostudy_my_destinations'))answer=[{course:'tiktok_a2'}];
  if(u.pathname.endsWith('/gostudy_classroom_rooms'))answer=[{id:room,teacher_id:teacher,student_id:student,course:'tiktok-a2',lesson_path:'tiktok-a2.html',student_label:'QA'}];
  if(u.pathname.endsWith('/rpc/gostudy_classroom_send'))answer=true;
  return route.fulfill({status:200,headers:cors,json:answer});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const url=base+'/tiktok-a2.html'+(role==='teacher'?'?classStudent='+student:'');
 await page.goto(url);await page.locator('#lessonPages .page.active').waitFor();
 assert.equal(await page.locator('#lessonPages .page').count(),7);
 await page.locator('#openLessonDictionary').click();await page.locator('#lessonDictionary[open]').waitFor();
 await page.getByRole('button',{name:'Close dictionary',exact:true}).click();
 assert.equal(await page.locator('#selectionTranslate').count(),1);
 assert.equal(await page.locator('#lessonVideo .lesson-chat-dropdown').count(),1);
 assert.equal(await page.locator('.video-workspace').count(),1);
 for(let i=0;i<5;i++)await page.locator('#next').click();
 await page.locator('#page-5.active').waitFor();
 const fields=await page.locator('#page-5 select').all();assert.equal(fields.length,12);
 await fields[0].selectOption('sauce');assert.equal(await page.locator('#tt6-word-pan-feedback').innerText(),'Try again');
 for(const field of fields){await field.selectOption(await field.getAttribute('data-expected'));}
 assert.equal(await page.locator('#page-5 [data-grade]').allTextContents().then(x=>x.filter(s=>s==='✓ Correct').length),12);
 assert.match(await page.locator('#page-5 iframe').getAttribute('src'),/start=144&end=210/);
 const fallback=page.locator('#page-5 a[href*="youtube.com/watch"]');
 assert.equal(await fallback.evaluate(a=>a.closest('figure')),null,'Fallback must sit outside the clipped video figure');
 await fallback.scrollIntoViewIfNeeded();
 assert.equal(await fallback.isVisible(),true);
 await page.locator('#page-5 h3').first().scrollIntoViewIfNeeded();
 assert.equal(await page.locator('#page-5 iframe').getAttribute('title'),'Feel Good Foodie: TikTok pasta, fragment 2:24–3:30');
 const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(width.scroll<=width.viewport+2,'horizontal overflow: '+JSON.stringify(width));
 fs.mkdirSync('artifacts/tiktok-next',{recursive:true});
 await page.screenshot({path:`artifacts/tiktok-next/${role}-${mobile?'mobile':'desktop'}-watch.png`});
 await page.locator('#next').click();await page.locator('#page-6.active').waitFor();
 assert.equal(await page.locator('#page-6 textarea').count(),5);
 await page.locator('#tt7-recommend').fill('I would try it because I like fresh tomatoes. I would add less garlic.');
 await page.locator('#back').click();await page.locator('#page-5.active').waitFor();
 assert.equal(await fields[0].inputValue(),'pan');
 await page.locator('#next').click();assert.match(await page.locator('#tt7-recommend').inputValue(),/fresh tomatoes/);
 await page.screenshot({path:`artifacts/tiktok-next/${role}-${mobile?'mobile':'desktop'}-discuss.png`});
 // The student has local/cloud-cache persistence; teacher cloud reads are mocked empty.
 if(role==='student'){
  await page.reload();await page.locator('#lessonPages .page.active').waitFor();
  assert.match(await page.locator('#tt7-recommend').inputValue(),/fresh tomatoes/);
  assert.equal(await page.locator('#tt6-word-pan').inputValue(),'pan');
 }
 assert.deepEqual(errors,[],role+' browser JavaScript errors');
 console.log('PASS '+role+' '+(mobile?'mobile':'desktop')+': 7 pages, 12 correct/wrong grades, discussion, navigation, shared tools'+(role==='student'?', reload persistence':''));
 await context.close();
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{for(const role of ['student','teacher'])for(const mobile of [false,true])await run(browser,'http://127.0.0.1:'+server.address().port,mobile,role);}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
