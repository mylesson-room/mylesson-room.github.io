/* Actual Chromium A2 lesson and homework QA with synthetic local storage only. */
'use strict';
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),dir=path.join(root,'artifacts','olga-method');
const paths=['sweden-a2-02.html','sweden-a2-02-homework.html'];
const seedLesson={page:0,answers:{word1:'eat in',read1:'It was raining',gram1:'found'},words:[{en:'an entrance',ru:'вход'}],dark:false};
const seedHomework={page:0,answers:{hw1:'bakery',hw9:'am going to meet'},words:[],dark:false};
const serve=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const absolute=path.resolve(root,'.'+pathname);
 if(!absolute.startsWith(root+path.sep))return res.writeHead(403).end();
 try{
  const buf=await readFile(absolute);
  res.writeHead(200,{'Content-Type':path.extname(absolute)==='.html'?'text/html;charset=utf-8':path.extname(absolute)==='.js'?'text/javascript':'application/octet-stream'}).end(buf);
 }catch{res.writeHead(404).end();}
});
async function run(browser,base,file,mobile){
 const lesson=file==='sweden-a2-02.html';
 const label=(lesson?'lesson':'homework')+'-'+(mobile?'mobile':'desktop');
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile});
 try{
  await context.addInitScript(({lessonState,homeworkState})=>{
   localStorage.setItem('gostudy-sweden-a2-lesson02-v1',JSON.stringify(lessonState));
   localStorage.setItem('gostudy-sweden-a2-homework02-v1',JSON.stringify(homeworkState));
  },{lessonState:seedLesson,homeworkState:seedHomework});
  await context.route('https://**/*',route=>route.abort()); // isolated, no network
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:22000});
  await page.locator('#title').waitFor({state:'visible',timeout:12000});
  await page.locator('#content').waitFor({state:'visible',timeout:12000});
  if(lesson){
   const pageTexts=[];
   for(let i=0;i<8;i++){
    const actual=await page.locator('#counter').textContent();
    assert.equal(actual,(i+1)+' / 8',label+' page counter at '+i);
    pageTexts.push((await page.locator('#content').innerText()).slice(0,600));
    if(i===1){
      assert.equal(await page.locator('#content .word button[data-add]').count(),12,label+' six main plus six optional lexical cards');
      assert.equal(await page.locator('#content details .word button[data-add]').count(),6,label+' optional six words hidden in details');
      const select=page.locator('#word1');
      assert.equal(await select.inputValue(),'eat in',label+' old answer must be restored');
      await page.locator('#word3').selectOption({label:'a receipt'});
      assert.equal(await page.locator('#word3').getAttribute('data-gap'),'a receipt');
      await page.locator('[data-add="1"]').first().click();
      const added=await page.evaluate(()=>JSON.parse(localStorage.getItem('gostudy-sweden-a2-lesson02-v1')||'{}').words);
      assert.ok(added.some(w=>w.en==='take away'),label+' new word not saved');
      assert.ok(added.some(w=>w.en==='an entrance'),label+' old word lost');
    }
    if(i===2){
      assert.equal(await page.locator('#read1').inputValue(),'It was raining',label+' original reading answer');
      await page.locator('[data-answer="readPersonal"]').fill('I would visit a museum because it is dry.');
    }
    if(i===3){
      assert.equal(await page.locator('audio#lessonAudio').count(),1,label+' embedded audio missing');
      const audioValid=await page.locator('audio#lessonAudio').evaluate(el=>el.canPlayType('audio/mpeg')!=='' && el.src.startsWith('data:audio/mpeg;base64,'));
      assert.equal(audioValid,true,label+' audio source/codec invalid');
      assert.equal(await page.locator('#listenGist').count(),1,label+' gist item missing');
      await page.locator('[data-answer="listeningRetell"]').fill('She ate in a café. Tomorrow she is going to walk by the water.');
    }
    if(i===4){
      assert.equal(await page.locator('#gram1').inputValue(),'found',label+' previous grammar answer');
      await page.locator('[data-answer="gramPastPersonal"]').fill('Yesterday, I visited a museum.');
      await page.locator('[data-answer="gramFuturePersonal"]').fill("Tomorrow, I'm going to eat in a café.");
    }
    if(i===5){
      assert.ok((await page.locator('#content').innerText()).includes('Round 2'),label+' second roleplay missing');
      await page.locator('[data-answer="cafeRoleplayNotes"]').fill('Could I have a receipt, please?');
    }
    if(i===6){
      await page.locator('[data-answer="planSunshine"]').fill("We're going to walk by the water.");
      await page.locator('[data-answer="planRain"]').fill("It's raining so we're going to visit a museum.");
    }
    if(i===7){
      assert.ok((await page.locator('#content').innerText()).includes('four of'),label+' exit assessment missing');
      assert.ok((await page.locator('#content').innerText()).includes('домашнем задании'),label+' homework link missing');
    }
    if(i<7)await page.locator('#next').click();
   }
   await page.locator('#menuBtn').click();
   await page.locator('#nav [data-page="2"]').click();
   assert.equal(await page.locator('[data-answer="readPersonal"]').inputValue(),'I would visit a museum because it is dry.',label+' authored reading answer disappeared');
   await page.locator('#menuBtn').click();
   await page.locator('#nav [data-page="6"]').click();
   assert.equal(await page.locator('[data-answer="planRain"]').inputValue(),"It's raining so we're going to visit a museum.",label+' original written task was not saved');
   await page.screenshot({path:path.join(dir,label+'.png'),fullPage:false,animations:'disabled'});
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('gostudy-sweden-a2-lesson02-v1')));
   assert.equal(state.answers.word1,'eat in');
   assert.equal(state.answers.read1,'It was raining');
   assert.equal(state.answers.gram1,'found');
   assert.equal(state.answers.planSunshine,"We're going to walk by the water.");
  }else{
   const text=await page.locator('#content').innerText();
   assert.ok(text.includes('Six expressions')&&text.includes('Yesterday and tomorrow'),label+' new recap absent');
   for(let i=1;i<=8;i++)assert.equal(await page.locator('#review'+i).count(),1,label+' homework choice '+i+' missing');
   await page.locator('#review1').selectOption({label:'eat in'});
   await page.locator('[data-answer="homeworkTravelMessage"]').fill("Yesterday I went to a café. Tomorrow I'm going to visit a museum.");
   const legacy=page.locator('#content details:has-text("Optional extra practice")');
   await legacy.locator('summary').click();
   assert.equal(await page.locator('#hw1').inputValue(),'bakery',label+' preexisting homework answer lost');
   assert.equal(await page.locator('#hw9').inputValue(),'am going to meet',label+' preexisting future answer lost');
   await page.screenshot({path:path.join(dir,label+'.png'),fullPage:false,animations:'disabled'});
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('gostudy-sweden-a2-homework02-v1')));
   assert.equal(state.answers.hw1,'bakery');
   assert.equal(state.answers.hw9,'am going to meet');
   assert.equal(state.answers.review1,'eat in');
   assert.ok(state.answers.homeworkTravelMessage.startsWith('Yesterday I went'));
  }
  const geom=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(geom.width<=geom.viewport+3,label+' horizontal overflow: '+JSON.stringify(geom));
  assert.deepEqual(errors,[],label+' uncaught script errors');
  console.log('OLGA METHOD BROWSER PASS '+label+' '+JSON.stringify(geom));
 }finally{await context.close();}
}
(async()=>{
 await mkdir(dir,{recursive:true});
 await new Promise(resolve=>serve.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+serve.address().port;
  for(const file of paths)for(const mobile of [false,true])await run(browser,base,file,mobile);
  console.log('OLGA METHOD BROWSER: 4/4 real Chrome desktop+mobile lesson/homework simulations PASSED.');
 }finally{await browser.close();serve.close();}
})().catch(error=>{console.error(error);serve.close();process.exitCode=1;});
