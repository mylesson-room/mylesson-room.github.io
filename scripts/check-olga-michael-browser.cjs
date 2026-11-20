/* Actual Sweden A2 HTML/CSS/JS tested in Chromium, with synthetic browser-only data.
 * No production Supabase, passwords or real student data. Screenshots for PR review.
 */
'use strict';
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),dir=path.join(root,'artifacts','olga-michael');
const cases=[
 ['student-sweden.html','cabinet'],
 ['sweden-a2.html','lesson'],
 ['sweden-a2-01-homework.html','homework'],
 ['sweden-a2-02.html','lesson'],
 ['sweden-a2-02-homework.html','homework']
];
const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',mp3:'audio/mpeg',woff2:'font/woff2'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'}).end(bytes);}
 catch{res.writeHead(404).end();}
});
const keys={
 'gostudy-sweden-a2-v2':JSON.stringify({page:1,answers:{'test-legacy-answer':'lesson1 remains'},words:[{en:'hello',ru:'привет'}],dark:false}),
 'gostudy-sweden-a2-lesson02-v1':JSON.stringify({page:1,answers:{'test-legacy-answer':'lesson2 remains'},words:[],dark:false}),
 'gostudy-sweden-a2-homework01-v1':JSON.stringify({page:0,answers:{'test-legacy-answer':'homework1 remains'},words:[]}),
 'gostudy-sweden-a2-homework02-v1':JSON.stringify({page:0,answers:{'test-legacy-answer':'homework2 remains'},words:[]})
};
async function check(browser,base,file,kind,mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:850},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
 const label=file.replace('.html','')+'-'+(mobile?'mobile':'desktop');
 try{
  await context.addInitScript(seed=>{for(const [key,value] of Object.entries(seed))localStorage.setItem(key,value);},keys);
  await context.route('https://**/*',route=>route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base+'/'+file,{waitUntil:'domcontentloaded'});
  const panel=kind==='cabinet'?page.locator('.olga-overview'):page.locator('.olga-michael-side');
  await panel.waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('body').getAttribute('data-olga-kind'),kind,label+' kind must match');
  if(kind!=='cabinet'){
    await page.locator('#title').waitFor({state:'visible',timeout:11000});
    assert.ok((await page.locator('#content').innerText()).length>50,label+' original lesson content missing');
    const videoTiles=await page.locator('.jaas-person-tile').count() ||
      await page.locator('.olga-video-tile').count();
    if(videoTiles!==2)console.log('VIDEO DEBUG '+label+' '+(await page.locator('#lessonVideo').innerHTML()).slice(0,2100)+' errors='+errors.join(';'));
    assert.equal(videoTiles,2,label+' real Michael two participant placeholders');
    assert.equal(await page.locator('.olga-state').isVisible(),true,label+' video status clearly labelled');
    if(kind==='lesson'){
      assert.equal(await page.locator('#lessonVideo .jaas-connect').count(),1,
        label+' must display real JaaS join control with Sweden-specific token');
    }else {
      assert.equal(await page.locator('#lessonVideo .jaas-connect').count(),0,
        label+' homework must never start camera');
    }
    assert.equal(await page.locator('.olga-panel').last().locator('.olga-panels-actions').first().locator('button').first().textContent(),'Мой словарь');
    await page.locator('.olga-panel').last().locator('.olga-panels-actions').first().locator('button').first().click();
    await page.locator('#dictionary[open]').waitFor({state:'visible'});
    await page.locator('#closeDict').click();
    await page.locator('#dictionary[open]').waitFor({state:'hidden'});
    if(kind==='lesson'){
      await page.locator('#next').click({timeout:4000});
      assert.ok((await page.locator('#title').innerText()).length>0,label+' next section title');
    }
  }else assert.equal(await page.locator('.olga-overview').count(),1);
  const current=await page.evaluate(()=>Object.fromEntries(
    ['gostudy-sweden-a2-v2','gostudy-sweden-a2-lesson02-v1','gostudy-sweden-a2-homework01-v1','gostudy-sweden-a2-homework02-v1']
      .map(key=>[key,localStorage.getItem(key)])));
  for(const [key,raw] of Object.entries(keys)){
    const old=JSON.parse(raw),next=JSON.parse(current[key]);
    assert.deepEqual(next.answers['test-legacy-answer'],old.answers['test-legacy-answer'],label+' damaged saved answer for '+key);
    assert.deepEqual(next.words,old.words,label+' damaged original word state '+key);
  }
  const downloadWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'Сохранить старые ответы и слова'}).first().click();
  const download=await downloadWait;
  assert.equal(download.suggestedFilename(),'gostudy-sweden-existing-data.json',label+' export filename');
  const screenshot=path.join(dir,label+'.png');
  await page.screenshot({path:screenshot,fullPage:false,animations:'disabled'});
  const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(overflow.width<=overflow.viewport+3,label+' horizontal page overflow '+JSON.stringify(overflow));
  assert.equal(errors.length,0,label+' uncaught page JS errors '+errors.join(';'));
  console.log('OLGA BROWSER PASS '+label+' width='+overflow.width+'/'+overflow.viewport);
 }finally{await context.close();}
}
(async()=>{
 await mkdir(dir,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const [file,kind] of cases)for(const mobile of [false,true])await check(browser,base,file,kind,mobile);
  console.log('OLGA: 10/10 desktop and mobile lesson/cabinet/homework cases PASS (synthetic legacy data).');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
