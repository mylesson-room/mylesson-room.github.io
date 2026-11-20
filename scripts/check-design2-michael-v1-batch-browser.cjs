/* Design 2 — five active lessons rendered in Chrome on desktop+touch mobile.
 * Synthetic sessions and entirely mocked Supabase API; NO personal data / production calls.
 */
'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const student='11111111-1111-4111-8111-111111111111';
const teacher='22222222-2222-4222-8222-222222222222';
const room='33333333-3333-4333-8333-333333333333';
const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',woff2:'font/woff2'};
const lessons=[
  ['art-b1-03.html','art-b1'],
  ['business-ai-b2c1-03.html','business-ai'],
  ['first-sales-c1-03.html','first-sales'],
  ['general-english-b2-01.html','general-english-b2'],
  ['pharma-ai-evidence-c1-20261118.html','pharma-c1']
];
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const filepath=path.resolve(root,'.'+pathname);
  if(!filepath.startsWith(root+path.sep))return res.writeHead(403).end();
  try{
    const bytes=await readFile(filepath);
    res.writeHead(200,{'Content-Type':mime[path.extname(filepath).slice(1)]||'application/octet-stream'});
    res.end(bytes);
  }catch{res.writeHead(404).end();}
});
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
async function run(browser,base,lesson,course,mobile){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
  const tag=lesson.replace('.html','')+'-'+(mobile?'mobile':'desktop');
  try{
    await context.addInitScript(({id})=>{
      const session=JSON.stringify({user:{id,email:'synthetic@example.invalid'},access_token:'synthetic-no-real-access',refresh_token:'synthetic',expires_at:Date.now()+3600000});
      sessionStorage.setItem('gostudy-cloud-session-v1',session);
      localStorage.setItem('gostudy-student-session-v1',session);
    },{id:student});
    await context.route('https://**/*',route=>{
      const url=new URL(route.request().url());
      if(!url.hostname.endsWith('.supabase.co'))return route.abort();
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
      let answer=[];
      if(url.pathname.endsWith('/auth/v1/user'))answer={id:student};
      if(url.pathname.endsWith('/rpc/gostudy_my_destinations'))answer=[{course:course.replaceAll('-','_')}];
      if(url.pathname.endsWith('/gostudy_classroom_rooms'))answer=[{id:room,teacher_id:teacher,student_id:student,course,lesson_path:lesson,student_label:'Test student'}];
      if(url.pathname.endsWith('/rpc/gostudy_classroom_send'))answer=true;
      return route.fulfill({status:200,headers:cors,json:answer});
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/'+lesson,{waitUntil:'domcontentloaded'});
    await page.locator('#lessonPages .page.active').waitFor({state:'visible',timeout:16000});
    const stats=await page.evaluate(()=>{
      const paper=document.querySelector('.lesson-content');
      const heading=document.querySelector('#lessonPages .page.active .activity-head');
      const chat=document.querySelector('#lessonVideo .lesson-chat-dropdown');
      const html=document.documentElement;
      return {
        width:html.scrollWidth,viewport:innerWidth,
        paperBg:getComputedStyle(paper).backgroundColor,
        padding:getComputedStyle(paper).paddingLeft,
        headingBg:getComputedStyle(heading).backgroundImage,
        chatFound:!!chat,chatOpen:chat?.open??null,
        translator:!!document.getElementById('selectionTranslate'),
        dictionary:!!document.getElementById('openLessonDictionary'),
        pages:document.querySelectorAll('#lessonPages .page').length,
        activePage:document.querySelector('#lessonPages .page.active')?.id
      };
    });
    assert.ok(stats.width<=stats.viewport+2,tag+' horizontal overflow: '+JSON.stringify(stats));
    assert.equal(stats.paperBg,'rgb(255, 255, 255)',tag+' requires approved Michael white lesson paper');
    assert.equal(stats.padding,mobile?'15px':'40.95px',tag+' requires Michael responsive padding');
    assert.ok(stats.headingBg.startsWith('linear-gradient(110deg'),tag+' requires approved heading gradient');
    assert.equal(stats.chatFound,true,tag+' shared Michael chat missing');
    assert.equal(stats.chatOpen,!mobile,tag+' desktop chat should start open, mobile compact');
    assert.equal(stats.translator,true,tag+' shared contextual selection translator missing');
    assert.equal(stats.dictionary,true,tag+' shared dictionary missing');
    assert.ok(stats.pages>=2,tag+' lesson sections missing');
    await page.locator('#openLessonDictionary').click();
    await page.locator('#lessonDictionary[open]').waitFor({state:'visible',timeout:5500});
    await page.locator('#lessonDictionary form[method="dialog"] button').click();
    await page.locator('#lessonDictionary[open]').waitFor({state:'hidden'});
    if(mobile){
      await page.locator('#lessonVideo .lesson-chat-toggle').click();
      await page.waitForFunction(()=>document.querySelector('#lessonVideo .lesson-chat-dropdown')?.open);
      assert.equal(await page.locator('#finance-chat-form').isVisible(),true,tag+' mobile chat form must be usable');
      await page.locator('#lessonVideo .lesson-chat-toggle').click();
    }else{
      assert.equal(await page.locator('#finance-chat-form').isVisible(),true,tag+' desktop chat input must be visible');
    }
    await page.locator('#next').click();
    await page.locator('#page-1.active').waitFor({state:'visible'});
    const serious=errors.filter(e=>/gostudy-v1-lesson|gostudy-v1-workbook|gostudy-finance-live/.test(e));
    assert.deepEqual(serious,[],tag+' JS rendering/workbook errors');
    await page.screenshot({path:path.join(root,'artifacts','design2-batch',tag+'.png'),fullPage:false,animations:'disabled'});
    console.log('DESIGN2 PASS '+tag+' '+JSON.stringify(stats));
  }finally{await context.close();}
}
(async()=>{
  await mkdir(path.join(root,'artifacts','design2-batch'),{recursive:true});
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
  try{
    const base='http://127.0.0.1:'+server.address().port;
    for(const [lesson,course] of lessons)for(const mobile of [false,true])await run(browser,base,lesson,course,mobile);
    console.log('Design2 batch Chromium: 10/10 student desktop+mobile lessons PASS (mock auth), Michael layout/chat/dictionary/navigation.');
  }finally{await browser.close();server.close();}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
