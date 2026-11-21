/* Anastasia Art B1 video UI: desktop/mobile, teacher/student browser contexts,
 * signed token endpoint request and persistent panel. Synthetic network only. */
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
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const server=createServer(async(req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200).end(await readFile(file));}catch{res.writeHead(404).end();}
});
async function scenario(browser,base,lesson,role,mobile){
 const id=role==='teacher'?teacher:student;
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 let videoRequests=0,requestStudent=null;
 try{
  await ctx.addInitScript(({id})=>{
   const session=JSON.stringify({user:{id,email:'qa@example.invalid'},access_token:'synthetic',refresh_token:'synthetic',expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',session);
   localStorage.setItem('gostudy-'+(id==='22222222-2222-4222-8222-222222222222'?'teacher':'student')+'-session-v1',session);
  },{id});
  await ctx.route('https://**/*',route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname;
   if(!url.hostname.endsWith('.supabase.co'))return route.abort();
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
   if(p.endsWith('/functions/v1/gostudy-jaas-art-b1-token')){
    videoRequests++;
    requestStudent=JSON.parse(req.postData()||'{}').studentId;
    return route.fulfill({status:403,headers:cors,json:{error:'Synthetic protected room: denied'}});
   }
   let data=[];
   if(p.endsWith('/auth/v1/user'))data={id};
   else if(p.includes('gostudy_my_destinations'))data=[{course:role==='teacher'?'teacher':'art-b1'}];
   else if(p.includes('gostudy_legacy_teacher_view'))data=role==='teacher'?[{id:student,label:'Анастасия'}]:[];
   else if(p.includes('gostudy_classroom_rooms'))data=[{id:room,student_id:student,teacher_id:teacher,course:'art-b1',lesson_path:lesson,student_label:'Анастасия'}];
   else if(p.includes('gostudy_classroom_send'))data=true;
   return route.fulfill({status:200,headers:cors,json:data});
  });
  const page=await ctx.newPage();
  await page.goto(base+'/'+lesson+(role==='teacher'?'?classStudent='+student:''),{waitUntil:'domcontentloaded'});
  await page.locator('#lessonPages .page.active').waitFor({state:'visible',timeout:16000});
  const video=page.locator('#lessonVideo .video-workspace');
  await video.locator('.jaas-connect').waitFor({state:'visible',timeout:7000});
  assert.equal(await video.locator('.jaas-person-tile').count(),2,'Two approved video placeholders');
  assert.equal(await video.getByText('Open Telemost').count(),0,'No legacy Telemost link');
  await video.locator('.jaas-connect').click();
  await page.waitForFunction(()=>document.querySelector('#lessonVideo .jaas-message')?.textContent.includes('Synthetic protected room: denied'),null,{timeout:12000});
  assert.equal(videoRequests,1,'Must call protected Art B1 video token endpoint');
  assert.equal(requestStudent,role==='teacher'?student:null,'Teacher selects Anastasia; student uses own account');
  const panel=await video.evaluate(el=>el);
  await page.locator('#next').click();
  await page.locator('#page-1.active').waitFor();
  assert.ok(await video.isVisible(),'Persistent video panel after page navigation');
  assert.equal(await video.locator('.jaas-connect').count(),1);
  console.log('ANASTASIA VIDEO PASS '+lesson+' '+role+' '+(mobile?'mobile':'desktop'));
 }finally{await ctx.close();}
}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const lesson of ['art-b1-03.html','art-b1-02.html'])
   for(const role of ['student','teacher'])
    for(const mobile of [false,true])
     await scenario(browser,base,lesson,role,mobile);
  console.log('ANASTASIA VIDEO COMPLETE 8/8 synthetic browser scenarios');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
