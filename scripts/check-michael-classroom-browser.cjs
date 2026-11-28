/* Actual NEW lesson UI with synthetic auth, event transport and Jitsi; never production data. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {server,events}=require('./preview-michael-classroom.cjs');
const student='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6';
const labels=['Warm-up','Vocabulary','Reading','Language practice','Decision lab','Role-play','Final discussion'];
function contrast(foreground,background){
 const luminance=color=>{
  const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
 };
 const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
async function exercise(browser,origin,mobile){
 events.length=0;
 const size=mobile?{width:390,height:844}:{width:1440,height:900};
 const sc=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile});
 const tc=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile});
 try{
  const sp=await sc.newPage(),tp=await tc.newPage(),errors=[];
  for(const page of [sp,tp])page.on('pageerror',e=>errors.push(e.message));
  await sp.goto(origin+'/__qa/student?video=fixture');
  await tp.goto(origin+'/__qa/teacher?video=fixture&classStudent='+student);
  for(const page of [sp,tp]){
   await page.locator('#classroomTheme').waitFor();
   await page.waitForFunction(()=>window.FinanceLive?.connected());
   assert.equal(await page.locator('#lessonSections button').count(),7);
   assert.equal(await page.locator('.classroom-translate,#classroomHomework').count(),0,'Invented header controls returned');
   assert.equal(await page.locator('.homework-exercise-menu').count(),0,'Michael exercise menus should stay hidden');
   await page.locator('.jaas-connect').click();
   await page.waitForFunction(()=>document.querySelector('.video-state')?.textContent==='Вы в видеозвонке');
  }
  const frame=await sp.locator('.jaas-frame iframe').elementHandle();
  await tp.locator('#classroomTheme').click();
  assert.equal(await sp.locator('html').getAttribute('data-classroom-theme'),'light');
  assert.equal(await tp.locator('html').getAttribute('data-classroom-theme'),'dark');
  for(const theme of ['light','dark']){
   if(await sp.locator('html').getAttribute('data-classroom-theme')!==theme)await sp.locator('#classroomTheme').click();
   for(let i=0;i<labels.length;i++){
    await sp.getByRole('button',{name:labels[i],exact:true}).click();
    await sp.locator('#page-'+i+'.active').waitFor();
    assert.equal(await sp.locator('.jaas-frame iframe').evaluate((node,reference)=>node===reference,frame),true,'Theme/navigation replaced the iframe');
    assert.equal(await sp.locator('body').getAttribute('data-fixture-jitsi-starts'),'1');
    assert.equal(await sp.locator('body').getAttribute('data-fixture-jitsi-disposals'),null);
    assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
    if(i===2){
     const colors=await sp.locator('.article').evaluate(article=>({foreground:getComputedStyle(article.querySelector('h3')).color,background:getComputedStyle(article).backgroundColor}));
     assert.ok(contrast(colors.foreground,colors.background)>=4.5,'Reading heading contrast below 4.5:1');
     assert.ok(await sp.locator('.article p').first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16),'Reading body text below 16px');
    }
    await sp.screenshot({path:`artifacts/michael-classroom/${mobile?'mobile':'desktop'}-${theme}-${i+1}.jpg`});
    if(i===2||i===4){
     await sp.locator(i===2?'#reading':'#decision').scrollIntoViewIfNeeded();
     await sp.screenshot({path:`artifacts/michael-classroom/${mobile?'mobile':'desktop'}-${theme}-${i+1}-scroll.jpg`});
    }
   }
  }
  // Independent movement, plus explicit teacher "move student" control.
  await sp.getByRole('button',{name:'Warm-up',exact:true}).click();
  await tp.getByRole('button',{name:'Reading',exact:true}).click();
  assert.equal(await sp.locator('#page-0').isVisible(),true);
  await tp.locator('#moveStudent').waitFor({state:'visible'});
  await tp.locator('#moveStudent').click();
  await sp.locator('#page-2.active').waitFor();
  // Answers in both directions, automatic Enter and blur grading.
  for(const p of [sp,tp])await p.getByRole('button',{name:'Language practice',exact:true}).click();
  await sp.locator('#gap0').fill('stress test');await sp.locator('#gap0').press('Enter');
  await tp.waitForFunction(()=>document.querySelector('#gap0')?.value==='stress test');
  assert.equal(await sp.locator('#gf0').innerText(),'✓ Correct');
  await tp.locator('#gap1').fill('early warning sign');await tp.locator('#gap1').press('Tab');
  await sp.waitForFunction(()=>document.querySelector('#gap1')?.value==='early warning sign');
  assert.equal(await tp.locator('#gf1').innerText(),'✓ Correct');
  assert.ok(events.filter(e=>e.kind==='answer').every(e=>e.payload.key.startsWith('michael-finance2-new-v1:')));
  assert.ok(events.filter(e=>e.kind==='page').every(e=>e.payload.lessonScope==='michael-finance2-new-v1'));
  // Existing chat transport and dictionary component, with local synthetic events only.
  for(const p of [sp,tp])await p.locator('.lesson-chat-toggle').click();
  await sp.locator('#finance-chat-form input').fill('QA local message');
  await sp.locator('#finance-chat-form button').click();
  await tp.locator('#finance-messages').getByText('QA local message',{exact:true}).waitFor();
  for(const p of [sp,tp])await p.locator('.lesson-chat-toggle').click();
  await sp.locator('#openLessonDictionary').click();
  await sp.locator('#dictionarySource').fill('test cash forecast');
  await sp.locator('#dictionaryTranslation').fill('тестовый прогноз');
  await sp.locator('#dictionaryAddForm button').click();
  await sp.keyboard.press('Escape');
  await tp.locator('#openLessonDictionary').click();
  await tp.locator('#myWords').getByText('test cash forecast',{exact:true}).waitFor();
  await tp.keyboard.press('Escape');
  assert.equal(await sp.locator('.jaas-frame iframe').evaluate((node,reference)=>node===reference,frame),true);
  await sp.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await sp.evaluate(()=>getComputedStyle(document.body,'::before').animationName),'none');
  // Reload intentionally ends the synthetic call, but must restore the new lesson's data/theme.
  await sp.reload();await sp.locator('#classroomTheme').waitFor();
  await sp.getByRole('button',{name:'Language practice',exact:true}).click();
  await sp.waitForFunction(()=>document.querySelector('#gap1')?.value==='early warning sign');
  assert.equal(await sp.locator('#gapsScore').innerText(),'2 / 6 correct');
  assert.equal(await sp.locator('html').getAttribute('data-classroom-theme'),'dark');
  assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile':'Desktop'} PASS: 7 pages, 2 themes, stable simulated active Jitsi iframe, independent roles, move-student, answers Enter/blur/reload, chat, dictionary, reduced motion.`);
 }finally{await sc.close();await tc.close();}
}
(async()=>{
 await fs.mkdir('artifacts/michael-classroom',{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.GOSTUDY_CHROME||undefined});
 try{await exercise(browser,origin,false);await exercise(browser,origin,true);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
