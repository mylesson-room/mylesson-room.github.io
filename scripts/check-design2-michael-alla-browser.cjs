// Design 2 browser visual regression. Real lesson render, synthetic session and mocked APIs.
// NO production authentication, private Supabase data, or real answer writes.
'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {mkdir,readFile}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const student='11111111-1111-4111-8111-111111111111';
const teacher='22222222-2222-4222-8222-222222222222';
const room='33333333-3333-4333-8333-333333333333';
const imageDir=path.join(root,'artifacts','design2-visual');
const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',woff2:'font/woff2',mp3:'audio/mpeg'};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try {
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'});
    res.end(bytes);
  }catch {res.writeHead(404).end();}
});
const fakeCORS={
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'*',
  'access-control-allow-methods':'GET,POST,PATCH,OPTIONS'
};
const mockResponse=(route,json)=>route.fulfill({status:200,headers:fakeCORS,json});
async function sample(browser,origin,{name,html,mobile,role='student'}){
  const id=role==='teacher'?teacher:student;
  const context=await browser.newContext({
    viewport:mobile?{width:390,height:844}:{width:1365,height:850},
    isMobile:mobile,hasTouch:mobile
  });
  try {
    await context.addInitScript(({id,role})=>{
      const s=JSON.stringify({user:{id},access_token:'design2-synthetic-token',expires_at:Date.now()+3600000});
      sessionStorage.setItem('gostudy-cloud-session-v1',s);
      localStorage.setItem(role==='teacher'?'gostudy-teacher-session-v1':'gostudy-student-session-v1',s);
    },{id,role});
    await context.route('https://**/*',route=>{
      const u=new URL(route.request().url());
      if(!u.hostname.endsWith('.supabase.co'))return route.abort();
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:fakeCORS});
      if(u.pathname.endsWith('/auth/v1/user'))return mockResponse(route,{id});
      if(u.pathname.includes('/gostudy_classroom_rooms'))return mockResponse(route,[{
        id:room,teacher_id:teacher,student_id:student,student_label:'Synthetic Student',
        course:html.includes('homework')?'vietnam-a2-homework':'vietnam-a2',lesson_path:html
      }]);
      if(u.pathname.includes('/gostudy_finance_room'))return mockResponse(route,[{teacher_id:teacher,student_id:student}]);
      if(u.pathname.includes('/gostudy_classroom_events')||u.pathname.includes('/gostudy_finance_events')||u.pathname.includes('/gostudy_progress'))return mockResponse(route,[]);
      if(u.pathname.endsWith('/rpc/gostudy_classroom_send'))return mockResponse(route,true);
      if(u.pathname.endsWith('/rpc/gostudy_my_destinations'))return mockResponse(route,[{course:role==='teacher'?'teacher':'english-placement'}]);
      return mockResponse(route,[]);
    });
    const page=await context.newPage();
    const failures=[];
    page.on('pageerror',error=>failures.push(error.message));
    await page.goto(origin+'/'+html+(role==='teacher'?'?classStudent='+student:''),{waitUntil:'domcontentloaded'});
    await page.locator('#lessonPages .page.active').waitFor({state:'visible',timeout:14000});
    if(name.startsWith('alla'))await page.waitForFunction(()=>document.querySelector('.classroom-access')?.hidden===true,{timeout:12000});
    const measure=await page.evaluate(()=>{
      const rect=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,width:r.width,height:r.height};};
      const style=(selector)=>{const c=getComputedStyle(document.querySelector(selector));return {
        background:c.backgroundColor,backgroundImage:c.backgroundImage,paddingLeft:c.paddingLeft,
        borderBottomLeftRadius:c.borderBottomLeftRadius
      };};
      return {
        page:document.querySelector('#lessonPages .page.active')?.id,
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:window.innerWidth,
        sidebar:rect('.sidebar'),
        lesson:rect('.lesson-content'),
        pager:rect('.pager'),
        body:style('body'),
        paper:style('.lesson-content'),
        heading:style('#lessonPages .page.active .activity-head'),
        videoTiles:document.querySelectorAll('#lessonVideo .jaas-person-tile').length,
        videoConnect:!!document.querySelector('#lessonVideo .jaas-connect'),
        telemostLink:!!document.querySelector('#lessonVideo a[href*="telemost.yandex.ru"]'),
        translator:!!document.querySelector('#selectionTranslate')
      };
    });
    assert.ok(measure.documentWidth<=measure.viewportWidth+2, name+' horizontal page overflow: '+JSON.stringify(measure));
    assert.equal(measure.paper.background,'rgb(255, 255, 255)',name+' lesson paper should be white');
    assert.equal(measure.translator,true,name+' must render the shared translation selection UI');
    if(mobile){
      assert.ok(measure.pager.top>=0&&measure.pager.top<=844,name+' mobile lesson pager must be visible');
    }else if(name.includes('homework')){
      assert.ok(measure.lesson.width>500,name+' desktop homework needs readable exercises');
    }else{
      assert.ok(measure.sidebar.width>250&&measure.lesson.width>500,name+' desktop needs left video / right exercises');
      assert.ok(measure.sidebar.right<=measure.lesson.left+20,name+' sidebar must precede the exercise sheet');
    }
    if(name.startsWith('alla')){
      // The same Michael chat UI must wrap (not replace) the real chat handlers.
      const dropdown=page.locator('#lessonVideo .lesson-chat-dropdown');
      await dropdown.waitFor({state:'attached',timeout:6000});
      assert.equal(await dropdown.locator('#finance-chat-form').count(),1,name+' chat form lost');
      if(await dropdown.getAttribute('open') !== null){
        await dropdown.locator('summary.lesson-chat-toggle').click({timeout:6000});
        await page.waitForFunction(()=>!document.querySelector('#lessonVideo .lesson-chat-dropdown')?.open);
      }
      await page.evaluate(()=>document.dispatchEvent(new CustomEvent('finance-event',{
        detail:{kind:'chat',own:false,initial:false}
      })));
      assert.equal(await dropdown.locator('.lesson-chat-unread').textContent(),'1',name+' unread notification missing');
      await dropdown.locator('summary.lesson-chat-toggle').click({timeout:6000});
      await page.waitForFunction(()=>document.querySelector('#lessonVideo .lesson-chat-dropdown')?.open &&
        document.querySelector('#lessonVideo .lesson-chat-unread')?.hidden===true);
      assert.equal(await dropdown.getAttribute('open'),'',
        name+' chat must open without dropping existing DOM/form');
      assert.equal(await dropdown.locator('.lesson-chat-unread').isVisible(),false,
        name+' unread badge should reset after opening');
      await dropdown.locator('summary.lesson-chat-toggle').click({timeout:6000});
      if(name.includes('homework')){
        assert.equal(await page.locator('#lessonVideo .video-workspace').isVisible(),false,
          name+' homework should not show video call');
      }else{
        const tiles=page.locator('#lessonVideo .jaas-person-tile');
        await tiles.nth(1).waitFor({state:'visible',timeout:6000});
        assert.equal(await tiles.count(),2,name+' must visually match Michael two participant tiles');
        assert.deepEqual(await page.locator('#lessonVideo .jaas-person-label').allTextContents(),
          ['Преподаватель','Ученик'],name+' participant captions');
        assert.equal(await page.locator('#lessonVideo .jaas-connect').count(),1,
          name+' approved scoped JaaS control must exist');
        assert.equal(await page.locator('#lessonVideo a.telemost-fallback-link').count(),0,
          name+' must not regress to legacy fallback');
      }
    }
    // A shared word notification must be visible for incoming classroom vocabulary events.
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('finance-word',{
      detail:{word:{en:'design2-test',ru:'тест'},notify:true}
    })));
    assert.equal(await page.locator('#finance-toast').isVisible(),true,name+' word added toast not visible');
    await page.screenshot({path:path.join(imageDir,name+'.png'),fullPage:true,animations:'disabled'});

    // Both lessons must open the same dictionary panel, not merely render its button.
    await page.locator('#openLessonDictionary').click({timeout:6000});
    await page.locator('#lessonDictionary[open]').waitFor({state:'visible',timeout:5000});
    await page.locator('#lessonDictionary form[method="dialog"] button').click();
    await page.locator('#lessonDictionary[open]').waitFor({state:'hidden',timeout:5000});

    // Test selection/translation popup without calling the actual Google service.
    const selected=await page.evaluate(()=>{
      const scope=document.querySelector('#lessonPages .page.active .lead') ||
        document.querySelector('#lessonPages .page.active .panel');
      const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
      let node;
      while(node=walker.nextNode()){
        if(node.textContent.trim().length<8)continue;
        const start=node.textContent.search(/\S/);
        if(start<0)continue;
        const r=document.createRange();
        r.setStart(node,start);
        r.setEnd(node,Math.min(start+7,node.textContent.length));
        const sel=getSelection();sel.removeAllRanges();sel.addRange(r);
        document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
        return sel.toString();
      }
      return null;
    });
    assert.ok(selected?.trim().length>0,name+' must contain selectable lesson text');
    await page.locator('#selectionTranslate.is-visible').waitFor({state:'visible',timeout:5000});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#selectionTranslate.is-visible').count(),0,
      name+' translation popup must close on Escape');
    await page.locator('#next').click({timeout:6000});
    await page.locator('#page-1.active').waitFor({state:'visible',timeout:6000});
    assert.deepEqual(failures.filter(msg=>/gostudy-vietnam-a2|gostudy-v1-lesson|gostudy-v1-workbook|gostudy-finance-live/.test(msg)),[],name+' workbook/render error');
    console.log(name+': '+JSON.stringify(measure));
    return measure;
  } finally {await context.close();}
}
(async()=>{
  await mkdir(imageDir,{recursive:true});
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const browser=await chromium.launch(process.env.GOSTUDY_CHROME
    ? {executablePath:process.env.GOSTUDY_CHROME} : {});
  try {
    const origin='http://127.0.0.1:'+server.address().port;
    const refDesktop=await sample(browser,origin,{name:'michael-desktop',html:'business-ai-finance-b2-02.html',mobile:false});
    const allaDesktop=await sample(browser,origin,{name:'alla-desktop',html:'my-trip-to-vietnam-a2.html',mobile:false});
    const refMobile=await sample(browser,origin,{name:'michael-mobile',html:'business-ai-finance-b2-02.html',mobile:true});
    const allaMobile=await sample(browser,origin,{name:'alla-mobile',html:'my-trip-to-vietnam-a2.html',mobile:true});
    await sample(browser,origin,{name:'alla-teacher-mobile',html:'my-trip-to-vietnam-a2.html',mobile:true,role:'teacher'});
    await sample(browser,origin,{name:'alla-homework-desktop',html:'my-trip-to-vietnam-a2-homework.html',mobile:false});
    await sample(browser,origin,{name:'alla-homework-mobile',html:'my-trip-to-vietnam-a2-homework.html',mobile:true});
    for(const [name,ref,actual] of [
      ['desktop',refDesktop,allaDesktop],['mobile',refMobile,allaMobile]
    ]){
      assert.equal(actual.paper.paddingLeft,ref.paper.paddingLeft,name+' content padding differs from Michael');
      assert.equal(actual.paper.background,ref.paper.background,name+' paper color differs from Michael');
      assert.equal(actual.paper.borderBottomLeftRadius,ref.paper.borderBottomLeftRadius,name+' paper lower edge differs');
      assert.equal(actual.heading.backgroundImage,ref.heading.backgroundImage,name+' heading background differs from Michael');
    }
    assert.equal(refDesktop.videoConnect,true,'Michael reference video integration unexpectedly missing');
    console.log('Design2 Michael/Alla lesson+homework PASS (synthetic student/teacher in real browser); real video remains blocked by token authorization.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
