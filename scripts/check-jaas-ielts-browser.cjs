/* Daria IELTS video: private auth, two roles, desktop/mobile and persistent shared SDK controls.
 * Network and media SDK are synthetic; production media is checked separately in the browser. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const student='6af5764c-487a-448f-a21e-8744dc5a2322',teacher='acf2f6a1-f38b-45ef-836d-6cc9a9a5a832',outsider='33333333-3333-4333-8333-333333333333';
const room='0973bfd3-5594-4237-983e-42fb6eb632e3',videoRoom='gostudy-ielts-reading-'+student.replaceAll('-',''),appId='vpaas-magic-cookie-ielts-test';
const fixture={title:'IELTS synthetic passage',subtitle:'QA only',mission:'Compare evidence.',reading:'<p><b>A.</b> A short synthetic passage about lighting.</p>',summary:'Lamps changed after (9).',questions:[['1','features','Which paragraph?','A','Paragraph A.'],['5','claims','All lamps were removed.','NO','They were changed.'],['9','completion','The change happened after ___.','midnight','After midnight.']],words:[['glare','блики']]};
const server=http.createServer(async(req,res)=>{
 const p=path.resolve('.'+new URL(req.url,'http://local').pathname);
 if(!p.startsWith(process.cwd()+path.sep))return res.writeHead(403).end();
 try{const data=await fs.readFile(p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(data);}catch{res.writeHead(404).end();}
});
const sdk=`window.JitsiMeetExternalAPI=class {
 constructor(domain,opts){this.opts=opts;this.listeners={};this.audio=true;this.video=false;this.commands=[];this.frame=document.createElement('iframe');this.frame.id='qa-jitsi-frame';this.frame.title='Synthetic video';this.frame.srcdoc='<p>Synthetic video frame</p>';opts.parentNode.append(this.frame);window.qaJitsi=this;setTimeout(()=>this.emit('videoConferenceJoined',{}),20);}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 emit(name,value){for(const fn of this.listeners[name]||[])fn(value);}
 executeCommand(name){this.commands.push(name);if(name==='toggleAudio'){this.audio=!this.audio;this.emit('audioMuteStatusChanged',{muted:this.audio});}if(name==='toggleVideo'){this.video=!this.video;this.emit('videoMuteStatusChanged',{muted:this.video});}}
 dispose(){this.disposed=true;this.frame.remove();}
};`;
const wait=async(fn,label)=>{const until=Date.now()+12000;while(Date.now()<until){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out '+label);};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.GOSTUDY_CHROME||undefined,headless:true,args:['--no-sandbox']});
 async function scenario(role,mobile,denied=false){
  const id=role==='teacher'?teacher:role==='student'?student:outsider;
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[];let calls=0,target,financeCalls=0;
  try{
   if(role!=='anonymous')await ctx.addInitScript(({id,role})=>{const s=JSON.stringify({user:{id,email:'qa@example.invalid'},access_token:'test-'+role,refresh_token:'test',expires_at:Date.now()+3600000});sessionStorage.setItem('gostudy-cloud-session-v1',s);localStorage.setItem(role==='teacher'?'gostudy-teacher-session-v1':'gostudy-student-session-v1',s);localStorage.setItem('ielts-video-qa-preserve','unchanged');},{id,role});
   await ctx.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),p=u.pathname;
    if(u.origin===base)return route.continue();
    if(u.hostname==='8x8.vc'&&p.endsWith('/external_api.js'))return route.fulfill({contentType:'text/javascript',body:sdk});
    if(!u.hostname.endsWith('.supabase.co'))return route.abort();
    if(p.includes('gostudy_finance_room')){financeCalls++;return route.fulfill({status:403,json:[]});}
    const cors={'access-control-allow-origin':base,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const json=(data,status=200)=>route.fulfill({status,json:data,headers:cors});
    if(p.endsWith('/gostudy-jaas-ielts-token')){
     calls++;target=req.postDataJSON().studentId;
     assert.equal(req.headers().authorization,'Bearer test-'+role,'Video uses the existing private user session');
     return denied?json({error:'Нет доступа к комнате: QA'},403):json({appId,room:videoRoom,jwt:'synthetic-jwt'});
    }
    if(p==='/auth/v1/user')return json({id});
    if(p.endsWith('/gostudy_private_lessons'))return json(role==='outsider'?[]:[{lesson_payload:fixture}]);
    if(p.endsWith('/gostudy_classroom_rooms'))return json([teacher,student].includes(id)?[{id:room,student_id:student,teacher_id:teacher}]:[]);
    if(p.endsWith('/gostudy_classroom_send'))return json(true);
    return json([]);
   });
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/ielts-reading-04.html'+(role==='teacher'?'?classStudent='+student:''));
   if(role==='outsider'||role==='anonymous'){
    await page.locator('#gostudyAccessGate').waitFor();
    assert.equal(await page.locator('#lessonPages').count(),0);
    assert.equal(calls,0);return;
   }
   await page.locator('#lessonPages .page.active').waitFor();
   const panel=page.locator('#lessonVideo .video-workspace');
   await panel.locator('.jaas-connect').waitFor();
   assert.equal(await panel.locator('.jaas-person-tile').count(),2);
   assert.equal(await panel.getByText('Open Telemost').count(),0);
   const colours=await panel.locator('.jaas-person-tile').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor));
   assert.deepEqual(colours,['rgb(36, 54, 76)','rgb(48, 79, 106)'],'Exact approved Michael tile colours');
   if(mobile)await panel.locator('.jaas-connect').tap();else await panel.locator('.jaas-connect').click();
   await wait(()=>Promise.resolve(calls===1),'protected endpoint request');
   assert.equal(target,role==='teacher'?student:null,'Both roles resolve Daria, never Michael');
   assert.equal(financeCalls,0);
   if(denied){
    await panel.locator('.jaas-message').getByText('Нет доступа к комнате: QA',{exact:true}).waitFor();
    assert.equal(await panel.locator('iframe').count(),0);
    assert.ok(await panel.locator('.jaas-connect').isEnabled(),'Can retry after denied response');
   }else{
    await panel.locator('.jaas-message').getByText('Вы в видеозвонке',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>qaJitsi.opts.roomName),appId+'/'+videoRoom);
    assert.ok(await panel.locator('.jaas-mic').isEnabled());
    await panel.locator('.jaas-mic').click();
    assert.equal(await panel.locator('.jaas-mic').getAttribute('aria-label'),'Выключить микрофон');
    await panel.locator('.jaas-mic').click();
    assert.equal(await panel.locator('.jaas-mic').getAttribute('aria-label'),'Включить микрофон');
    await panel.locator('.jaas-camera').click();
    assert.equal(await panel.locator('.jaas-camera').getAttribute('aria-label'),'Включить камеру');
    await page.evaluate(()=>{window.qaPreservedFrame=document.querySelector('#qa-jitsi-frame');});
    await page.locator('#next').click();await page.locator('#page-1.active').waitFor();
    assert.equal(await page.evaluate(()=>document.querySelector('#qa-jitsi-frame')===qaPreservedFrame),true,'Page changes preserve active video frame');
    assert.equal(calls,1);
    await panel.locator('.jaas-size').click();
    assert.equal(await panel.locator('iframe').count(),1);
    await panel.locator('.jaas-leave').click();
    assert.equal(await panel.locator('iframe').count(),0);
    assert.equal(await page.evaluate(()=>qaJitsi.disposed),true);
    assert.equal(await panel.locator('.jaas-person-tile').count(),2);
    assert.equal(await page.evaluate(()=>localStorage.getItem('ielts-video-qa-preserve')),'unchanged');
   }
   if(mobile)assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile viewport does not overflow');
   assert.deepEqual(errors,[]);
   console.log('DARIA VIDEO PASS '+role+' '+(mobile?'mobile':'desktop')+(denied?' access denied':''));
  }finally{await ctx.close();}
 }
 try{
  for(const role of ['teacher','student'])for(const mobile of [false,true])await scenario(role,mobile);
  for(const role of ['teacher','student'])await scenario(role,false,true);
  await scenario('outsider',false);await scenario('anonymous',true);
  console.log('DARIA VIDEO COMPLETE: shared Michael UI, protected private auth, both roles same room, click/touch, mic/camera, persistent iframe, leave/retry and outsider/anonymous denial.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
