// B1 Stories uses Michael's shared classroom video and the normal signed JaaS token.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('node:http'),{chromium}=require('playwright');
const root=process.cwd();
const studentId='11111111-1111-4111-8111-111111111111';
const teacherId='22222222-2222-4222-8222-222222222222';
const roomId='33333333-3333-4333-8333-333333333333';
const appId='vpaas-magic-cookie-synthetic';
const course='general-english-b1-stories',lesson='general-english-b1-stories-01.html';
const roomName='gostudy-classroom-'+course+'-'+studentId.replace(/-/g,'');
const mime={html:'text/html',js:'application/javascript',json:'application/json',css:'text/css',svg:'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'}).end(body)}
 catch{res.writeHead(404).end()}
});
const fakeJitsi=`window.JitsiMeetExternalAPI=class{
 constructor(domain,options){window.__b1Starts=(window.__b1Starts||0)+1;window.__b1Room=options.roomName;
 this.events={};this.iframe=document.createElement('iframe');this.iframe.src='about:blank';options.parentNode.append(this.iframe);
 setTimeout(()=>this.events.videoConferenceJoined?.(),40)}
 addEventListener(name,fn){this.events[name]=fn}
 executeCommand(){}
 dispose(){window.__b1Disposed=(window.__b1Disposed||0)+1;this.iframe.remove()}
};`;
async function exercise(browser,origin,mobile,fail){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 try{
  await context.addInitScript(({id})=>sessionStorage.setItem('gostudy-cloud-session-v1',
    JSON.stringify({user:{id},access_token:'synthetic-session',expires_at:Date.now()+3600000})),{id:studentId});
  let calls=0;
  await context.route('https://*.supabase.co/**',route=>{
   const url=new URL(route.request().url()),pathname=url.pathname;
   if(pathname.endsWith('/functions/v1/gostudy-jaas-classroom-token')){
    calls++;const request=route.request().postDataJSON();
    assert.equal(request.studentId,null,'Student joins own room without sending a target student ID');assert.equal(request.course,course);assert.equal(request.lessonPath,lesson);
    return fail?route.fulfill({status:403,json:{error:'Нет доступа к этому уроку (тест)'}}):
      route.fulfill({json:{appId,room:roomName,jwt:'synthetic-video-jwt'}});
   }
   if(pathname.endsWith('/gostudy_classroom_rooms'))
    return route.fulfill({json:[{id:roomId,student_id:studentId,teacher_id:teacherId,student_label:'Test student',course,lesson_path:lesson}]});
   if(pathname.endsWith('/gostudy_classroom_events')||pathname.endsWith('/gostudy_progress'))
    return route.fulfill({json:[]});
   if(pathname.endsWith('/rpc/gostudy_classroom_send'))return route.fulfill({json:true});
   if(pathname.endsWith('/rpc/course_workbook_read'))return route.fulfill({json:[]});
   if(pathname.endsWith('/rpc/gostudy_my_destinations'))return route.fulfill({json:[{course}]});
   return route.fulfill({json:[]});
  });
  await context.route('https://8x8.vc/**',route=>
   route.request().url().endsWith('/external_api.js')?
    route.fulfill({status:200,contentType:'application/javascript',body:fakeJitsi}):route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/'+lesson);
  const btn=page.locator('#lessonVideo .jaas-connect');
  await btn.waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#lessonVideo .jaas-person-tile').count(),2);
  assert.equal(await page.locator('#lessonVideo a[href*="telemost"]').count(),0);
  if(mobile)await page.locator('#lessonVideo .video-preview').tap();else await btn.click();
  if(fail){
    await page.locator('#lessonVideo .jaas-message').getByText(/Нет доступа/).waitFor();
    assert.equal(await btn.isEnabled(),true);
  }else{
    await page.locator('#lessonVideo .jaas-frame iframe').waitFor({state:'attached'});
    await page.waitForFunction(()=>window.__b1Starts===1);
    assert.equal(await page.evaluate(()=>window.__b1Room),appId+'/'+roomName);
    await page.evaluate(()=>{window.__oldVideo=document.querySelector('#lessonVideo .jaas-frame iframe')});
    await page.locator('#next').click();
    await page.locator('#page-1.active h2').getByText(/The Friday Table/).waitFor();
    assert.equal(await page.evaluate(()=>window.__oldVideo===document.querySelector('#lessonVideo .jaas-frame iframe')),true);
    assert.equal(await page.evaluate(()=>window.__b1Starts),1);
    if(mobile){
      await page.locator('#lessonVideo .jaas-compact').waitFor({state:'attached'});
      if (await page.locator('body[data-jaas-mobile-panel]').count())
        await page.getByRole('button',{name:'Показать обоих участников'}).click();
      else await page.locator('#lessonVideo .jaas-size').click();
      assert.equal(await page.locator('#lessonVideo .jaas-compact').count(),0);
    }
    await page.locator('#lessonVideo .jaas-leave').click();
    assert.equal(await page.locator('#lessonVideo .jaas-frame').count(),0);
  }
  assert.equal(calls,1);
  assert.deepEqual(errors.filter(e=>/gostudy-jaas-video/.test(e)),[]);
 }finally{await context.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  await exercise(browser,origin,false,false);await exercise(browser,origin,true,false);await exercise(browser,origin,false,true);
  console.log('B1 Stories Michael video: room authorization, two tiles, click/touch, persistent iframe, denied token PASS');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
