// JaaS B1 pilot: verify the protected lesson loads the correct signed-room
// endpoint, keeps one real iframe across page changes, and supports mobile.
// All external calls are mocked; no credentials, database writes or students.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('playwright');
const root=process.cwd();
const studentId='11111111-1111-4111-8111-111111111111';
const appId='vpaas-magic-cookie-synthetic';
const roomName='gostudy-b1-stories-'+studentId.replace(/-/g,'');
const mime={html:'text/html',js:'application/javascript',json:'application/json',css:'text/css',svg:'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const resolved=path.resolve(root,'.'+pathname);
  if(!resolved.startsWith(root+path.sep))return res.writeHead(403).end();
  try{
    const content=await fs.readFile(resolved);
    res.writeHead(200,{'Content-Type':mime[path.extname(resolved).slice(1)]||'application/octet-stream'}).end(content);
  }catch{res.writeHead(404).end();}
});
const fakeJitsi=`
window.JitsiMeetExternalAPI=class{
  constructor(domain,opts){
    window.__b1Starts=(window.__b1Starts||0)+1;
    window.__b1Room=opts.roomName;
    window.__b1Commands=[];
    this.events={};
    this.iframe=document.createElement('iframe');
    this.iframe.src='about:blank';opts.parentNode.append(this.iframe);
    setTimeout(()=>this.events.videoConferenceJoined?.(),40);
  }
  addEventListener(name,handler){this.events[name]=handler;}
  executeCommand(name){window.__b1Commands.push(name);}
  dispose(){window.__b1Disposed=(window.__b1Disposed||0)+1;this.iframe.remove();}
};
`;
async function exercise(browser,origin,mobile,fail){
  const context=await browser.newContext({
    viewport:mobile?{width:390,height:844}:{width:1365,height:850},
    isMobile:mobile,hasTouch:mobile
  });
  try{
    await context.addInitScript(({id})=>{
      sessionStorage.setItem('gostudy-cloud-session-v1',
        JSON.stringify({user:{id},access_token:'synthetic-session',expires_at:Date.now()+3600000}));
    },{id:studentId});
    const requested=[];
    await context.route('https://*.supabase.co/**',route=>{
      const url=new URL(route.request().url()),pathname=url.pathname;
      if(pathname.endsWith('/functions/v1/gostudy-jaas-b1-token')){
        requested.push(pathname);
        const request=route.request().postDataJSON();
        assert.equal(request.studentId,null,'Student must join own protected room');
        return fail?route.fulfill({status:403,json:{error:'Нет доступа к этому уроку (тест)'}}):
          route.fulfill({json:{appId,room:roomName,jwt:'synthetic-video-jwt'}});
      }
      if(pathname.endsWith('/rpc/gostudy_b1_stories_content')){
        return route.fulfill({json:{key:'gostudy-general-english-b1-stories-01-v1',title:'Old protected lesson',
          cabinet:'student-general-english-b1-stories.html',level:'B1',
          steps:[{id:'original',title:'Original',instruction:'Protected',source:['Text']}]}});
      }
      if(pathname.endsWith('/gostudy_progress'))return route.fulfill({json:[]});
      if(pathname.endsWith('/rpc/gostudy_my_destinations'))
        return route.fulfill({json:[{course:'general-english-b1-stories'}]});
      return route.fulfill({json:[]});
    });
    await context.route('https://8x8.vc/**',route=>
      route.request().url().endsWith('/external_api.js')?
        route.fulfill({status:200,contentType:'application/javascript',body:fakeJitsi}):route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/general-english-b1-stories-01.html');
    const button=page.locator('#lessonVideo .jaas-connect');
    await button.waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('#lessonVideo .jaas-person-tile').count(),2);
    assert.equal(await button.isEnabled(),true);
    assert.equal(await page.locator('#lessonVideo a[href*="telemost"]').count(),0);
    if(mobile)await page.locator('#lessonVideo .video-preview').tap();
    else await button.click();
    if(fail){
      await page.locator('#lessonVideo .jaas-message').getByText(/Нет доступа/).waitFor();
      assert.equal(await button.isEnabled(),true);
    }else{
      await page.locator('#lessonVideo .jaas-frame iframe').waitFor({state:'attached'});
      await page.waitForFunction(()=>window.__b1Starts===1);
      assert.equal(await page.evaluate(()=>window.__b1Room),appId+'/'+roomName);
      const original=await page.evaluate(()=>{
        window.__oldB1Video=document.querySelector('#lessonVideo .jaas-frame iframe');
        return window.__b1Starts;
      });
      await page.locator('.sheet .next').click();
      await page.locator('.sheet h1').filter({hasText:'The Friday Table'}).waitFor();
      assert.equal(await page.evaluate(()=>window.__oldB1Video===document.querySelector('#lessonVideo .jaas-frame iframe')),true,'Video iframe restarted on section change');
      assert.equal(await page.evaluate(()=>window.__b1Starts),original);
      if(mobile){
        assert.equal(await page.locator('#lessonVideo .jaas-compact').count(),1);
        await page.locator('#lessonVideo .jaas-size').click();
        assert.equal(await page.locator('#lessonVideo .jaas-compact').count(),0);
      }
      await page.locator('#lessonVideo .jaas-leave').click();
      assert.equal(await page.locator('#lessonVideo .jaas-frame').count(),0);
    }
    assert.equal(requested.length,1,'B1 must use its own token endpoint');
    assert.deepEqual(errors.filter(e=>/gostudy-b1-stories-video|gostudy-jaas-video/.test(e)),[]);
  }finally{await context.close();}
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    await exercise(browser,origin,false,false);
    await exercise(browser,origin,true,false);
    await exercise(browser,origin,false,true);
    console.log('B1 Stories JaaS: authenticated route, two tiles, click/touch, single iframe across sections, mobile dock, denied token handling PASS');
  }finally{await browser.close();server.close();}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
