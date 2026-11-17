/* Browser smoke tests for the future single-cabinet route.
   Uses synthetic sessions, mocked Supabase responses and NO real student data. */
'use strict';
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const mime={html:'text/html',js:'application/javascript',css:'text/css'};
const root=path.resolve(__dirname,'..');
const server=createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    if (pathname.includes('..') || !/^\/(?:student\.html|assets\/gostudy-[a-z0-9.-]+(?:\.css|\.js))$/.test(pathname)) {
      res.writeHead(404).end();return;
    }
    const filename=path.join(root,pathname.replace(/^\//,''));
    const bytes=await readFile(filename);
    res.setHeader('Content-Type',mime[path.extname(filename).slice(1)]||'application/octet-stream');
    res.end(bytes);
  } catch {res.writeHead(404).end();}
});

async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const browser=await chromium.launch({headless:true});
  try {
    const student='11111111-1111-4111-8111-111111111111';
    const other='22222222-2222-4222-8222-222222222222';

    async function scenario({rooms=[],finance=[],published=[],expected,expectEmpty=false}){
      const page=await browser.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(id => {
        sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
          access_token:'synthetic-test-token',refresh_token:'synthetic-refresh',
          expires_at:Date.now()+3600000,user:{id}
        }));
      },student);

      await page.route('https://kawfqlohguwvmmplvrny.supabase.co/**',async route=>{
        const u=new URL(route.request().url());
        const method=route.request().method();
        const headers={
          'access-control-allow-origin':'*',
          'access-control-allow-methods':'GET, POST, OPTIONS',
          'access-control-allow-headers':'authorization, apikey, content-type'
        };
        if(method==='OPTIONS'){await route.fulfill({status:204,headers});return;}
        let response;
        if(u.pathname==='/auth/v1/user') response={id:student,email:'synthetic@example.invalid',user_metadata:{full_name:'Тестовый ученик'}};
        else if(u.pathname==='/rest/v1/gostudy_classroom_rooms') response=rooms;
        else if(u.pathname==='/rest/v1/gostudy_finance_room') response=finance;
        else if(u.pathname==='/rest/v1/gostudy_homework_published') response=published;
        else {await route.fulfill({status:404,headers,body:'{}'});return;}
        if(u.pathname.startsWith('/rest/v1/')){
          assert.equal(u.searchParams.get('student_id'),'eq.'+student,'Every query must be student-scoped');
        }
        await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(response)});
      });

      await page.goto('http://127.0.0.1:'+port+'/student.html',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('body.unified-ready',{timeout:15000});
      assert.deepEqual(errors,[],'No frontend runtime errors');
      assert.equal(await page.locator('header.top').count(),1,'Same canonical shared header is used once');
      assert.equal(await page.locator('#assignment').isVisible(),false,'Never expose unpublished homework');
      assert.equal(await page.locator('#openWords').isDisabled(),true,'Unmigrated local vocabulary must not leak into shared dashboard');
      if(expectEmpty){
        assert.equal(await page.locator('.cards').isVisible(),false);
        assert.match(await page.locator('#unified-status').textContent(),/нет назначенных уроков/);
      } else {
        assert.equal(await page.locator('a.lesson-card-link').first().getAttribute('href'),expected);
      }
      await page.close();
    }

    await scenario({
      rooms:[{student_id:student,course:'english-placement',lesson_path:'english-placement.html',student_label:'Тестовый ученик'}],
      expected:'english-placement.html'
    });
    await scenario({
      finance:[{student_id:student}],
      expected:'business-ai-finance-b2-02.html'
    });
    await scenario({
      rooms:[{student_id:other,course:'english-placement',lesson_path:'english-placement.html'}],
      finance:[{student_id:other}],
      expectEmpty:true
    });
    console.log('Unified cabinet browser smoke: placement, finance and foreign-user isolation PASS');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
