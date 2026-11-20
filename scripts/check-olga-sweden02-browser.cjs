/* Real Chromium checks for separately staged Michael-style Sweden Lesson 02.
 * Synthetic auth/Supabase responses only; no real account/camera claims.
 */
'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'artifacts','olga-sweden02');
const student='11111111-1111-4111-8111-111111111111';
const teacher='22222222-2222-4222-8222-222222222222';
const room='33333333-3333-4333-8333-333333333333';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const server=createServer(async(req,res)=>{
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 try{const bytes=await readFile(f);res.writeHead(200).end(bytes);}catch{res.writeHead(404).end();}
});
async function run(browser,base,file,mobile){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 const isHomework=file.includes('homework'),tag=file.replace('.html','')+(mobile?'-mobile':'-desktop');
 try{
  await ctx.addInitScript(()=>{
   const session=JSON.stringify({user:{id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid'},access_token:'test-token',refresh_token:'test',expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',session);localStorage.setItem('gostudy-student-session-v1',session);
  });
  await ctx.route('https://**/*',route=>{
   const url=new URL(route.request().url());
   if(!url.hostname.endsWith('.supabase.co'))return route.abort();
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
   let val=[];
   if(url.pathname.endsWith('/auth/v1/user'))val={id:student};
   else if(url.pathname.includes('gostudy_my_destinations'))val=[{course:'sweden-a2'}];
   else if(url.pathname.includes('gostudy_classroom_rooms'))val=[{id:room,teacher_id:teacher,student_id:student,course:'sweden-a2',lesson_path:'sweden-a2-02-michael.html'}];
   else if(url.pathname.includes('gostudy_sweden_words'))val=[];
   else if(url.pathname.includes('gostudy_classroom_send'))val=true;
   else if(url.pathname.includes('/functions/v1/gostudy-jaas-sweden-token'))return route.fulfill({status:403,headers:cors,json:{error:'Synthetic token denied'}});
   return route.fulfill({status:200,headers:cors,json:val});
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:20000});
  await page.locator('#lessonPages .page.active').first().waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#lessonPages .page').count(),isHomework?4:8,tag+' steps');
  await page.locator('#openLessonDictionary').click();
  await page.locator('#lessonDictionary[open]').waitFor({state:'visible'});
  await page.locator('#lessonDictionary form[method=dialog] button').click();
  if(!isHomework){
   assert.equal(await page.locator('#lessonVideo .jaas-connect').count(),1,'Exact Michael JaaS join button');
   assert.equal(await page.locator('#lessonVideo .jaas-person-tile').count(),2,'Michael 2 tiles');
   await page.locator('#lessonVideo .jaas-connect').click();
   await page.waitForFunction(()=>document.querySelector('#lessonVideo .jaas-message')?.textContent.includes('Synthetic token denied'),null,{timeout:10000});
   // Section sidebar is intentionally collapsed on touch devices, so use
   // the same visible Back/Next navigation that a student uses.
   for(let step=1;step<=4;step++){
    await page.locator('#next').click();
    await page.locator('#page-'+step+'.active').waitFor({state:'visible'});
   }
   await page.locator('#page-4 .sweden-listening details summary').waitFor({state:'visible'});
  }else assert.equal(await page.locator('#lessonVideo .video-workspace').isVisible(),false);
  const viewport=await page.evaluate(()=>({width:document.documentElement.scrollWidth,limit:innerWidth}));
  assert.ok(viewport.width<=viewport.limit+2,tag+' horizontal overflow '+JSON.stringify(viewport));
  const serious=errors.filter(e=>/gostudy-v1-|gostudy-sweden/.test(e));
  assert.deepEqual(serious,[],tag+' uncaught app errors');
  await page.screenshot({path:path.join(out,tag+'.png'),fullPage:false,animations:'disabled'});
  console.log('OLGA LESSON02 CHROME PASS '+tag);
 }finally{await ctx.close();}
}
(async()=>{
 await mkdir(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const file of ['sweden-a2-02-michael.html','sweden-a2-02-michael-homework.html'])for(const mobile of [false,true])await run(browser,base,file,mobile);
  console.log('OLGA LESSON02 COMPLETE 4/4 browser checks PASS on synthetic auth');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
