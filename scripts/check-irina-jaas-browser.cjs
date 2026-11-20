// Irina A2+ JaaS: live-button, touch, protected student/teacher endpoint, and
// single persistent Jitsi iframe across lesson sections. Network calls mocked.
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const studentId='33333333-3333-4333-8333-333333333333';
const teacherId='44444444-4444-4444-8444-444444444444';
const roomId='55555555-5555-4555-8555-555555555555';
const appId='vpaas-magic-cookie-synthetic';
const room='gostudy-country-house-'+studentId.replace(/-/g,'');
const mime={html:'text/html',css:'text/css',js:'application/javascript',svg:'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{
  const b=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'}).end(b);
 }catch{res.writeHead(404).end();}
});
const jitsi=`window.JitsiMeetExternalAPI=class{
 constructor(domain,opts){
  window.__starts=(window.__starts||0)+1;window.__room=opts.roomName;
  this.events={};this.iframe=document.createElement('iframe');this.iframe.src='about:blank';
  opts.parentNode.append(this.iframe);
  setTimeout(()=>this.events.videoConferenceJoined?.(),40);
 }
 addEventListener(name,handler){this.events[name]=handler;}
 executeCommand(){}
 dispose(){this.iframe.remove();}
};`;
async function exercise(browser,origin,role,mobile,deny){
 const id=role==='teacher'?teacherId:studentId;
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1320,height:820},isMobile:mobile,hasTouch:mobile});
 try{
  await context.addInitScript(({id})=>{
   const value=JSON.stringify({user:{id},access_token:'test-token',expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',value);
  },{id});
  let requested=0;
  await context.route('https://*.supabase.co/**',route=>{
    const url=new URL(route.request().url()),suffix=url.pathname.split('/').at(-1);
    if(suffix==='gostudy-jaas-country-house-token'){
      requested++;
      assert.equal(route.request().postDataJSON().studentId,role==='teacher'?studentId:null);
      return deny?route.fulfill({status:403,json:{error:'Нет доступа к этому уроку'}}):
        route.fulfill({json:{appId,room,jwt:'test-jwt'}});
    }
    if(suffix==='gostudy_classroom_rooms')return route.fulfill({json:[{id:roomId,teacher_id:teacherId,student_id:studentId,student_label:'Student'}]});
    if(suffix==='gostudy_classroom_events'||suffix==='gostudy_progress')return route.fulfill({json:[]});
    if(suffix==='gostudy_my_destinations')return route.fulfill({json:[{course:role==='student'?'country-house':'teacher'}]});
    if(suffix==='gostudy_country_house_teacher_view')return route.fulfill({json:[{id:studentId,progress:[]}]});
    if(suffix==='gostudy-country-house-progress-view')return route.fulfill({json:{answers:{},revision:0}});
    if(suffix==='gostudy_classroom_send')return route.fulfill({json:true});
    return route.fulfill({json:[]});
  });
  await context.route('https://8x8.vc/**',route=>route.request().url().endsWith('/external_api.js')?
      route.fulfill({contentType:'application/javascript',body:jitsi}):route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/country-house-travel-a2-05.html'+(role==='teacher'?'?classStudent='+studentId:''));
  const button=page.locator('#lessonVideo .jaas-connect');
  await button.waitFor({state:'visible'});
  assert.equal(await page.locator('#lessonVideo .jaas-person-tile').count(),2);
  assert.equal(await page.locator('#lessonVideo a[href*="telemost"]').count(),0);
  if(mobile)await page.locator('#lessonVideo .video-preview').tap();
  else await button.click();
  if(deny){
    await page.locator('#lessonVideo .jaas-message').getByText(/Нет доступа/).waitFor();
  }else{
    await page.locator('#lessonVideo .jaas-frame iframe').waitFor({state:'attached'});
    await page.waitForFunction(()=>window.__starts===1);
    assert.equal(await page.evaluate(()=>window.__room),appId+'/'+room);
    await page.evaluate(()=>window.__frame=document.querySelector('#lessonVideo .jaas-frame iframe'));
    await page.locator('#next').click();
    await page.locator('#page-1.active').waitFor();
    assert.equal(await page.evaluate(()=>window.__frame===document.querySelector('#lessonVideo .jaas-frame iframe')),true);
    assert.equal(await page.evaluate(()=>window.__starts),1);
    await page.locator('#lessonVideo .jaas-leave').click();
    assert.equal(await page.locator('#lessonVideo .jaas-frame').count(),0);
  }
  assert.equal(requested,1);
  assert.deepEqual(errors.filter(e=>/jaas|v1-workbook|gostudy-sync/i.test(e)),[]);
 }finally{await context.close();}
}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  await exercise(browser,origin,'student',false,false);
  await exercise(browser,origin,'student',true,false);
  await exercise(browser,origin,'teacher',false,false);
  await exercise(browser,origin,'student',false,true);
  console.log('Irina JaaS PASS — student and teacher protected room, desktop/touch, no Telemost, persistent iframe, deny path');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
