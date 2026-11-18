/* Browser regression for five shared historical cabinet controllers.
   Synthetic state only; no production data, network auth or database writes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const paths=['student-feed-b2.html','student-finance-b1.html',
  'student-first-sales.html','student-pharma.html'];
const server=http.createServer((_request,response)=>{
  response.setHeader('content-type','text/html;charset=utf-8');
  response.end('<!doctype html><title>Isolated GoStudy regression</title>');
});
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    for(const route of paths){
      const html=fs.readFileSync(path.join(root,route),'utf8');
      const settings=html.match(/<script type="application\/json" id="legacy-cabinet-settings">([^<]+)<\/script>/);
      assert.ok(settings,route+' must have data-only config');
      const config=JSON.parse(settings[1]);
      const page=await browser.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:'+server.address().port+'/');
      const historic={page:2,answers:{speaking:'SYNTHETIC_ANSWER'},words:[{en:'restore',ru:'восстановить'}],dark:false,
        customSavedField:'MUST_SURVIVE',hwDoneAt:null};
      const historicalProfile={name:'Мария',customProfileField:'KEEP_THIS'};
      await page.evaluate(({config,historic,historicalProfile})=>{
        localStorage.clear();
        localStorage.setItem(config.lessonStorageKey,JSON.stringify(historic));
        localStorage.setItem(config.profileStorageKey,JSON.stringify(historicalProfile));
        if(config.latestProgressKey)localStorage.setItem(config.latestProgressKey,JSON.stringify({page:1,answers:{x:'sample'}}));
        for(const item of config.travelProgress||[])
          localStorage.setItem(item.key,JSON.stringify({page:item.number===4?1:0,answers:{}}));
      },{config,historic,historicalProfile});
      await page.setContent('<!doctype html><html><body>'
        +'<script type="application/json" id="legacy-cabinet-settings">'+JSON.stringify(config)+'</'+'script>'
        +'<h1 id="greeting"></h1>'
        +'<details open><summary>Профиль</summary><form id="nameForm"><input id="name"><button type="submit">Save</button></form></details>'
        +'<button id="theme">Theme</button>'
        +'<div id="assignmentCard"></div><div id="filterEmpty" hidden></div>'
        +'<p id="assignmentStatus"></p><p id="lastPage"></p><p id="wordsCount"></p>'
        +'<div id="wordsList"></div><a id="openAssignment" href="#"></a>'
        +'<p id="storageNote" hidden></p></body></html>');
      await page.addScriptTag({path:path.join(root,'assets/gostudy-legacy-cabinet-controller.js')});
      assert.deepEqual(errors,[],route+' must have no browser errors');
      assert.equal(await page.locator('#greeting').textContent(),'Hello, Мария!',route+' must read original name');
      assert.equal(await page.locator('#wordsCount').textContent(),'1',route+' must read existing words');
      assert.equal(await page.locator('#wordsList .word strong').textContent(),'restore');
      assert.equal(await page.locator('#wordsList .word span').textContent(),'восстановить');
      const previous=await page.locator('#openAssignment').textContent();
      assert.match(previous,/Продолжить урок/);
      if(config.travelProgress)assert.equal(await page.locator('#openAssignment').getAttribute('href'),'travel-a2-04.html');
      await page.locator('#theme').click();
      assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('dark')),true);
      await page.locator('#name').fill('Александр');
      await page.locator('#nameForm button').click();
      const result=await page.evaluate(c=>({
        lesson:JSON.parse(localStorage.getItem(c.lessonStorageKey)),
        profile:JSON.parse(localStorage.getItem(c.profileStorageKey))
      }),config);
      assert.equal(result.lesson.dark,true,route+' dark mode must be saved to original key');
      assert.equal(result.lesson.words[0].en,'restore',route+' vocabulary must be preserved');
      assert.equal(result.lesson.answers.speaking,'SYNTHETIC_ANSWER',route+' answers must be preserved');
      assert.equal(result.lesson.customSavedField,'MUST_SURVIVE',route+' arbitrary progress must survive');
      assert.equal(result.profile.name,'Александр');
      assert.equal(result.profile.customProfileField,'KEEP_THIS',route+' unrelated profile fields must survive');
      assert.deepEqual(errors,[],route+' must have no asynchronous browser errors');
      await page.close();
    }
    console.log('Shared legacy cabinet browser regression: 4 synthetic routes, vocabulary, answers, theme, course link, profile preservation PASS');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;server.close();});
