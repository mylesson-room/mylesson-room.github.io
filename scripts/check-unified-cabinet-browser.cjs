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

    async function scenario({rooms=[],finance=[],published=[],profiles=[],canonical=null,expected,expectedName='Ученик',expectEmpty=false,expectAmbiguous=false,expectHomework=false,expectedHomework='business-ai-finance-b2-02-homework.html'}){
      const page=await browser.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(id => {
        sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
          access_token:'synthetic-test-token',refresh_token:'synthetic-refresh',
          expires_at:Date.now()+3600000,user:{id}
        }));
      },student);

      await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
      await page.route('https://fonts.gstatic.com/**',route=>route.abort());
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
        else if(u.pathname==='/rest/v1/gostudy_profiles') response=profiles;
        else if(u.pathname==='/rest/v1/gostudy_lesson_assignments') {
          if(canonical===null){await route.fulfill({status:404,headers,contentType:'application/json',body:JSON.stringify({code:'PGRST205',message:'Table not found in schema cache'})});return;}
          response=canonical;
        }
        else {await route.fulfill({status:404,headers,body:'{}'});return;}
        if(u.pathname.startsWith('/rest/v1/')){
          const ownerField=u.pathname==='/rest/v1/gostudy_profiles'?'user_id':'student_id';
          assert.equal(u.searchParams.get(ownerField),'eq.'+student,'Every query must be scoped to the authenticated user');
        }
        await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(response)});
      });

      await page.goto('http://127.0.0.1:'+port+'/student.html',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('body.unified-ready',{timeout:15000});
      assert.deepEqual(errors,[],'No frontend runtime errors');
      assert.equal(await page.locator('header.top').count(),1,'Same canonical shared header is used once');
      assert.equal(await page.locator('.account .profile span').first().textContent(),expectedName,'Name must come from protected profile');
      assert.equal(await page.locator('#assignment').isVisible(),true,'Homework tile must always be visible');
      assert.equal(await page.locator('#assignment').getAttribute('aria-disabled'),expectHomework?null:'true');
      assert.equal(await page.locator('#assignment').getAttribute('href'),expectHomework?expectedHomework:null);
      assert.equal(await page.locator('.v1-previous').count(),0,'Student home must not show previous lessons');
      assert.equal(await page.locator('#openWords').isDisabled(),true,'Unmigrated local vocabulary must not leak into shared dashboard');
      if(expectEmpty || expectAmbiguous) {
        assert.equal(await page.locator('.lesson-card-link').getAttribute('href'),null);
        assert.equal(await page.locator('.lesson-card-link').getAttribute('aria-disabled'),'true');
        assert.match(await page.locator('#unified-status').textContent(),expectAmbiguous?/несколько учебных комнат/:/нет назначенных уроков/);
      } else {
        assert.equal(await page.locator('a.lesson-card-link').first().getAttribute('href'),expected);
      }
      await page.close();
    }

    await scenario({
      rooms:[{student_id:student,course:'english-placement',lesson_path:'english-placement.html',student_label:'Old label must not be displayed'}],
      profiles:[{display_name:'Алла'}],expectedName:'Алла',
      expected:'english-placement.html'
    });
    await scenario({
      finance:[{student_id:student}],
      expected:'business-ai-finance-b2-02.html'
    });
    await scenario({
      finance:[{student_id:student}],
      published:[{student_id:student,lesson_path:'business-ai-finance-b2-02.html',published_at:'2026-11-18T00:00:00Z'}],
      expected:'business-ai-finance-b2-02.html',expectHomework:true
    });
    await scenario({
      rooms:[
        {student_id:student,course:'english-placement',lesson_path:'english-placement.html'},
        {student_id:student,course:'ielts-reading',lesson_path:'ielts-reading-04.html'}
      ],expectAmbiguous:true
    });
    await scenario({
      canonical:[{
        student_id:student,status:'active',published_at:'2026-11-18T00:00:00Z',
        lesson:{lesson_id:'finance-b1-02',course_id:'finance_b1',title:'Where did my money go?',
          lesson_path:'finance-b1-02.html',homework_path:'finance-b1-02-homework.html'}
      }],
      rooms:[{student_id:student,course:'english-placement',lesson_path:'english-placement.html'}],
      published:[{student_id:student,lesson_path:'finance-b1-02.html',published_at:'2026-11-18T00:00:00Z'}],
      expected:'finance-b1-02.html',expectHomework:true,
      expectedHomework:'finance-b1-02-homework.html',
      profiles:[{display_name:'Ирина'}],expectedName:'Ирина'
    });
    // Published homework for another account must NEVER activate the current student's card,
    // even if a course reuses exactly the same lesson path.
    await scenario({
      canonical:[{
        student_id:student,status:'active',published_at:'2026-11-18T00:00:00Z',
        lesson:{lesson_id:'finance-b1-02',course_id:'finance_b1',title:'Finance B1 — 02',
          lesson_path:'finance-b1-02.html',homework_path:'finance-b1-02-homework.html'}
      }],
      published:[{student_id:other,lesson_path:'finance-b1-02.html',published_at:'2026-11-18T00:00:00Z'}],
      expected:'finance-b1-02.html',expectHomework:false
    });
    // The canonical dashboard itself is NOT a lesson and cannot recursively link to itself.
    await scenario({
      canonical:[{student_id:student,status:'active',published_at:'2026-11-18T00:00:00Z',
        lesson:{lesson_id:'malicious',course_id:'finance_b1',title:'Bad route',lesson_path:'student.html',homework_path:null}}],
      expectEmpty:true
    });
    await scenario({
      canonical:[],rooms:[{student_id:student,course:'english-placement',lesson_path:'english-placement.html'}],
      expectEmpty:true
    });
    await scenario({
      rooms:[{student_id:other,course:'english-placement',lesson_path:'english-placement.html'}],
      finance:[{student_id:other}],
      expectEmpty:true
    });

    // Every legacy cabinet must be representable by the SAME canonical dashboard.
    // Legacy inventory is a migration candidate list, not real student assignments.
    const inventory = JSON.parse(await readFile(path.join(root,'docs/legacy-cabinet-inventory.json'),'utf8'));
    assert.equal(inventory.entries.length,18,'Regression coverage must include all legacy cabinets');
    for (const entry of inventory.entries) {
      const lesson = {
        lesson_id: entry.legacyCourse,
        course_id: entry.legacyCourse,
        title:'Synthetic lesson for '+entry.legacyCourse,
        lesson_path:entry.candidateCurrentLesson,
        homework_path:entry.legacyHomework,
      };
      await scenario({
        canonical:[{student_id:student,status:'active',published_at:'2026-11-18T00:00:00Z',lesson}],
        published:entry.legacyHomework
          ? [{student_id:student,lesson_path:entry.candidateCurrentLesson,published_at:'2026-11-18T00:00:00Z'}]
          : [],
        expected:entry.candidateCurrentLesson,
        expectHomework:!!entry.legacyHomework,
        expectedHomework:entry.legacyHomework || undefined,
        profiles:[{display_name:'Ученик'}],
      });
    }
    console.log('Universal dashboard: '+inventory.entries.length+' legacy route candidates render through the canonical assignment component');

    // If a canonical assignment API is reachable but returns an unexpected 404,
    // do NOT bypass it by reading old room memberships.
    async function checkUnknownCanonicalErrorFailsClosed(){
      const page=await browser.newPage();
      const sid='11111111-1111-4111-8111-111111111111';
      await page.addInitScript(id=>sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
        access_token:'synthetic-test-token',refresh_token:'synthetic-refresh',
        expires_at:Date.now()+3600000,user:{id}
      })),sid);
      await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
      await page.route('https://fonts.gstatic.com/**',route=>route.abort());
      let fallbackRequests=0;
      await page.route('https://kawfqlohguwvmmplvrny.supabase.co/**',async route=>{
        const u=new URL(route.request().url());
        const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type'};
        if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
        if(u.pathname==='/rest/v1/gostudy_classroom_rooms' || u.pathname==='/rest/v1/gostudy_finance_room')fallbackRequests++;
        if(u.pathname==='/auth/v1/user'){await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({id:sid,email:'synthetic@example.invalid'})});return;}
        if(u.pathname==='/rest/v1/gostudy_lesson_assignments'){
          await route.fulfill({status:404,headers,contentType:'application/json',body:JSON.stringify({code:'UNEXPECTED_ROUTING_FAILURE'})});return;
        }
        await route.fulfill({status:200,headers,contentType:'application/json',body:'[]'});
      });
      await page.goto('http://127.0.0.1:'+port+'/student.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('unified-status')?.textContent.includes('Код: 404'),{timeout:12000});
      assert.equal(fallbackRequests,0,'Unexpected canonical failure must not trigger legacy fallback');
      assert.equal(await page.locator('a.lesson-card-link').count(),0,'No lesson should appear after a canonical API error');
      await page.close();
    }
    await checkUnknownCanonicalErrorFailsClosed();

    // Teacher name editor is shared across courses and writes only via authenticated RLS API.
    async function checkTeacherProfileEditor(){
      const page=await browser.newPage();
      const studentId='11111111-1111-4111-8111-111111111111';
      await page.setContent('<form id="teacher-profile-name-form" hidden><input id="teacher-profile-name"><button type="submit">Сохранить</button><p id="teacher-profile-name-status"></p></form><p id="teacher-profile-name-placeholder"></p>');
      await page.evaluate(id=>{
        window.__profilePatches=[];
        window.GoStudyAuth={
          token:async()=> 'synthetic-teacher-token',
          request:async(url,options,jwt)=>{
            if(jwt!=='synthetic-teacher-token')return {ok:false,status:401};
            if(options?.method==='PATCH'){
              window.__profilePatches.push({url,body:options.body});
              return {ok:true,status:200,data:[{user_id:id,display_name:options.body.display_name}]};
            }
            return {ok:true,status:200,data:[{user_id:id,display_name:'Ученик'}]};
          }
        };
      },studentId);
      await page.addScriptTag({path:path.join(root,'assets/gostudy-teacher-profile.js')});
      await page.evaluate(id=>document.dispatchEvent(new CustomEvent('gostudy-teacher-student-selected',{detail:{studentId:id}})),studentId);
      await page.waitForFunction(()=>!document.getElementById('teacher-profile-name-form').hidden);
      assert.equal(await page.locator('#teacher-profile-name').inputValue(),'','Unknown name should be empty input');
      await page.locator('#teacher-profile-name').fill('Алла');
      await page.locator('#teacher-profile-name-form button').click();
      await page.waitForFunction(()=>document.getElementById('teacher-profile-name-status').textContent.includes('Имя сохранено'));
      const patches=await page.evaluate(()=>window.__profilePatches);
      assert.equal(patches.length,1,'Exactly one name update');
      assert.equal(patches[0].body.display_name,'Алла','New name reaches protected profile API');
      assert.match(patches[0].url,/gostudy_profiles\?user_id=eq\./,'Update uses student-id filter');
      await page.close();
    }
    await checkTeacherProfileEditor();

    // One teacher action -> ONE atomic RPC. No split update/insert from the browser.
    async function checkTeacherLessonAssignmentEditor(){
      const page=await browser.newPage();
      const sid='11111111-1111-4111-8111-111111111111';
      await page.setContent('<form id="teacher-assign-lesson" hidden><select id="teacher-lesson-select"></select><button type="submit">Назначить урок</button></form><p id="teacher-active-assignment"></p><p id="teacher-assignment-status"></p>');
      await page.evaluate(()=>{
        window.__assignmentMutations=[];
        window.GoStudyAuth={
          token:async()=> 'synthetic-teacher-token',
          request:async(url,options,jwt)=>{
            if(jwt!=='synthetic-teacher-token')return {ok:false,status:401};
            if(url.includes('gostudy_lesson_catalog'))return {ok:true,status:200,data:[
              {lesson_id:'placement',course_id:'english-placement',title:'English Placement'},
              {lesson_id:'finance-02',course_id:'finance_b1',title:'Finance B1 — 02'}
            ]};
            if(url.includes('gostudy_lesson_assignments'))return {ok:true,status:200,data:[
              {lesson_id:'placement',status:'active',published_at:'2026-11-18T00:00:00Z'}
            ]};
            if(url.includes('/rpc/gostudy_activate_student_lesson')){
              window.__assignmentMutations.push({url,body:options.body,method:options.method});
              return {ok:true,status:200,data:'00000000-0000-4000-8000-000000000000'};
            }
            return {ok:false,status:404};
          }
        };
      });
      await page.addScriptTag({path:path.join(root,'assets/gostudy-teacher-assignments.js')});
      await page.evaluate(id=>document.dispatchEvent(new CustomEvent('gostudy-teacher-student-selected',{detail:{studentId:id}})),sid);
      await page.waitForFunction(()=>!document.getElementById('teacher-assign-lesson').hidden);
      assert.match(await page.locator('#teacher-active-assignment').textContent(),/English Placement/);
      await page.locator('#teacher-lesson-select').selectOption('finance-02');
      await page.locator('#teacher-assign-lesson button').click();
      await page.waitForFunction(()=>document.getElementById('teacher-assignment-status').textContent.includes('Урок назначен'));
      const mutations=await page.evaluate(()=>window.__assignmentMutations);
      assert.equal(mutations.length,1,'Only one atomic mutation is sent');
      assert.equal(mutations[0].method,'POST');
      assert.equal(mutations[0].body.p_student_id,sid);
      assert.equal(mutations[0].body.p_lesson_id,'finance-02');
      assert.match(mutations[0].url,/\/rpc\/gostudy_activate_student_lesson$/);
      await page.close();
    }
    await checkTeacherLessonAssignmentEditor();


    console.log('Unified cabinet browser smoke: placement, finance, disabled/published homework, ambiguous assignments, canonical assignment priority, foreign-user isolation, 18 candidate routes, teacher name editor, atomic lesson assignment UI and canonical fail-closed behavior PASS');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
