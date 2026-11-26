'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {webkit,chromium}=require('playwright');
const root=process.cwd();
const student='11111111-1111-4111-8111-111111111111',teacher='22222222-2222-4222-8222-222222222222',room='33333333-3333-4333-8333-333333333333';
const mime={html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file).slice(1)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
 for(const engine of [webkit,chromium]){
 const browser=await engine.launch();
 try{
 for(const html of ['my-trip-to-vietnam-a2.html','my-trip-to-vietnam-a2-homework.html']){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
 await context.addInitScript(id=>{
 Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true});
 const s=JSON.stringify({user:{id},access_token:'synthetic',expires_at:Date.now()+3600000});
 sessionStorage.setItem('gostudy-cloud-session-v1',s);
 localStorage.setItem('gostudy-student-session-v1',s);
 },student);
 let blocked=true;
 await context.route('https://**/*',async route=>{
 const u=new URL(route.request().url());
 if(!u.hostname.endsWith('.supabase.co'))return route.abort();
 const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 if(u.pathname.endsWith('/auth/v1/user'))return route.fulfill({headers,json:{id:student}});
 if(u.pathname.includes('/gostudy_classroom_rooms'))return route.fulfill({headers,json:[{id:room,teacher_id:teacher,student_id:student}]});
 if(u.pathname.includes('/gostudy_classroom_events')&&blocked)return route.fulfill({status:503,headers,json:{}});
 if(u.pathname.endsWith('/rpc/gostudy_classroom_send'))return route.fulfill({headers,json:true});
 return route.fulfill({headers,json:[]});
 });
 const page=await context.newPage();
 await page.goto(origin+'/'+html,{waitUntil:'domcontentloaded'});
 await page.locator('#lessonPages').waitFor({state:'attached',timeout:15000});
 await page.getByRole('button',{name:'Повторить загрузку'}).waitFor({state:'visible',timeout:30000});
 assert.equal(await page.locator('#lessonPages').evaluate(e=>e.hidden&&e.inert),true,'answers must stay locked during failure');
 blocked=false;
 await page.locator('#lessonPages .page.active').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('#lessonPages').evaluate(e=>e.hidden||e.inert),false);
 console.log(engine.name(),html,'PASS');
 }finally{await context.close();}
 }
 }finally{await browser.close();}
 }
 }finally{server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
