const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, writeFile } = require('node:fs/promises');
const { runInNewContext } = require('node:vm');
const { chromium } = require('playwright');

const mime = { html: 'text/html', js: 'application/javascript', css: 'text/css', mp3: 'audio/mpeg' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const data = await readFile('.' + path);
    res.setHeader('Content-Type', mime[path.split('.').pop()] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});

async function checkVictoriaB2Methodology() {
  const source = await readFile('./general-english-b2-01.html','utf8');
  const readConfig = html => JSON.parse(html.split('<script type="application/json" id="lesson-data">')[1]?.split('</script>')[0] || '{}');
  const lesson = readConfig(source);
  const student = await readFile('./student-general-english-b2.html','utf8');
  const teacher = await readFile('./assets/gostudy-sync.js','utf8');
  assert.equal(lesson.title,'The Hidden Cost of Convenience');
  assert.equal(lesson.cabinet,'student-general-english-b2.html');
  assert.equal(lesson.key,'gostudy-general-english-b2-01-v2');
  assert.equal(lesson.answerNamespace,'general-b2-v2:');
  assert.equal(lesson.labels.length,8);
  assert.equal(lesson.pages.length,8);
  assert.equal(lesson.labels.slice(0,7).reduce((sum,part)=>sum+part.minutes,0),50);
  assert.equal(lesson.labels[7].minutes,15);
  assert.equal(lesson.vocab.length,8);
  assert.ok(lesson.vocab.every(word=>word.length===3),'Every expression has meaning and translation');
  assert.equal(lesson.reading.length,4);
  assert.equal(lesson.gaps.length,5);
  assert.ok(/(?:get|got) into the habit of/.test(lesson.pages[2]) && lesson.pages[2].includes('In the long run') && lesson.pages[2].includes('worth the effort'),'Target expressions must appear in reading');
  assert.ok(lesson.pages[5].includes('Real-life discussion') && !lesson.pages[5].includes('Resident A'),'Speaking must be an authentic discussion');
  assert.ok(lesson.pages[6].includes('Wrap-up') && lesson.pages[6].includes('trade-off'),'Check lesson outcomes');
  for (const selector of ['id="vocab"','id="reading"','id="gaps"','id="decision"','id="homework"','id="roleNotes"']) assert.ok(lesson.pages.some(page=>page.includes(selector)),selector);
  assert.ok(student.includes('"lesson":"general-english-b2-01.html"'),'Student URL unchanged');
  assert.ok(student.includes('"homework":"general-english-b2-01.html#homework"'),'Homework URL unchanged');
  assert.ok(teacher.includes("lesson:'general-english-b2-01.html'"),'Teacher URL unchanged');
  assert.ok(teacher.includes('gostudy-general-english-b2-01-v2'),'Revision tracked');
  console.log('Victoria General English B2: revised 50-min lesson, 15-min homework and stable classroom routes verified');
}

function cabinethasOldHomeworkHistory(html) { return html.includes('country-house-a2-04.html') && html.includes('country-house-a2-04-homework.html'); }

async function checkThreeProgressMeLessons() {
  const specs = [
    {course:'country-house',slug:'country-house-a2-04',title:'A Sunday Picnic Plan',level:'A2',words:6,stages:7},
    {course:'art-b1',slug:'art-b1-03',title:'The Gallery Makeover',level:'B1',words:6,stages:7},
    {course:'business-ai',slug:'business-ai-b2c1-03',title:'The Price of a Bad Decision: AI and Business Choices',level:'B2',words:8,stages:8},
  ];
  const sync=await readFile('./assets/gostudy-sync.js','utf8');
  for (const spec of specs) {
    const path='./'+spec.slug+'.html';
    const source=await readFile(path,'utf8');
    const homework=await readFile('./'+spec.slug+'-homework.html','utf8');
    const cabinet=await readFile('./student-'+(spec.course==='country-house'?'country-house':spec.course==='art-b1'?'art-b1':'business-ai')+'.html','utf8');
    const readConfig = html => JSON.parse(html.split('<script type="application/json" id="lesson-data">')[1]?.split('</script>')[0]||'{}');
    const lesson=readConfig(source),practice=readConfig(homework);
    assert.equal(lesson.title,spec.title);
    assert.equal(lesson.course,spec.course);
    assert.equal(lesson.durationMinutes,50);
    assert.equal(lesson.steps.length,spec.stages);
    assert.equal(lesson.steps.reduce((sum,step)=>sum+step.minutes,0),50);
    assert.equal(lesson.steps.filter(step=>step.type==='match')[0].items.length,spec.words);
    assert.ok(lesson.steps.some(step=>step.title.includes('01 ·')),'Lead-in present');
    assert.ok(lesson.steps.some(step=>/SPEAK|ROLE|NEGOTIAT|INDEPENDENT|DISCUSSION/i.test(step.instruction)),'Production phase required');
    assert.ok(lesson.steps.at(-1).instruction.includes('WRAP-UP'));
    assert.ok(lesson.steps.every(step=>!!step.teacherNotes));
    assert.equal(practice.key,lesson.key.replace(/-v(\d+)$/, '-homework-v$1'));
    assert.ok(practice.steps.some(step=>step.type==='write'));
    if (spec.course === 'business-ai') {
      assert.equal(lesson.key,'gostudy-business-ai-b2c1-03-v3');
      assert.equal(practice.key,'gostudy-business-ai-b2c1-03-homework-v3');
      assert.equal(lesson.steps[3].type,'write','Critical thinking requires original explanations');
      assert.equal(lesson.steps.filter(x=>x.type==='choice').reduce((n,x)=>n+x.items.length,0),6,'Reduce guessable multiple choice');
      const keys=lesson.steps[1].items.map(item=>item[2]);
      assert.deepEqual(new Set(keys),new Set([0,1,2]),'Avoid predictable matching answer position');
      assert.ok(lesson.steps[1].items.some(item=>item[0]==='forecast range'));
      assert.ok(!lesson.steps.some(step => /role.play|board pitch|defend your plan/i.test(step.instruction)));
    }
    if (spec.course === 'country-house') {
      assert.ok(cabinet.includes('"lesson":"country-house-travel-a2-05.html"'),'Irina now opens the new A2+ lesson');
      assert.ok(cabinet.includes('"homework":"country-house-travel-a2-05-homework.html"'),'Irina has the new 14-min homework');
      assert.ok(cabinet.includes('A Sunday Picnic Plan') && cabinethasOldHomeworkHistory(cabinet),
        'Previous lesson and historical homework URL must remain preserved');
    } else {
      assert.ok(cabinet.includes('"lesson":"'+spec.slug+'.html"'));
      assert.ok(cabinet.includes('"homework":"'+spec.slug+'-homework.html"'));
    }
    assert.ok(sync.includes(spec.slug+'.html') && sync.includes(spec.slug+'-homework.html'));
    for (const config of [lesson,practice]) for (const step of config.steps) {
      if (['choice','gap','match'].includes(step.type)) {
        for (const q of step.items) assert.ok(Number.isInteger(q[2]) && q[2]>=0 && q[2]<q[1].length,
          'Invalid answer key: '+spec.slug+' '+step.title);
      }
      if (step.type==='order') assert.deepEqual(step.order.slice().sort((a,b)=>a-b),Array.from({length:step.items.length},(_,i)=>i));
    }
  }
  console.log('Three 50-minute ProgressMe-structured follow-up lessons and homework validated');
}

async function checkTravelB2LessonMethodology() {
  const lessonHtml = await readFile('./travel-b2-04.html','utf8');
  const homeworkHtml = await readFile('./travel-b2-04-practice.html','utf8');
  const readConfig = html => JSON.parse(html.split('<script type="application/json" id="lesson-data">')[1]?.split('</script>')[0] || '{}');
  const lesson = readConfig(lessonHtml);
  const homework = readConfig(homeworkHtml);
  assert.equal(lesson.durationMinutes,50,'Travel B2 lesson must fit a 50-minute class');
  assert.deepEqual(lesson.steps.map(step=>step.type),[null,'choice','match','choice','gap','order',null,'write']);
  assert.deepEqual(lesson.steps.map(step=>step.id),Array.from({length:8},(_,i)=>'original-'+i),'Keep previous progress keys stable');
  assert.ok(lesson.steps.every(step=>step.teacherNotes),'Each stage needs teacher guidance');
  assert.equal(lesson.steps[2].items.length,6,'Six active vocabulary units');
  assert.equal(lesson.steps[1].items.length+lesson.steps[3].items.length,6,'Avoid excessive multiple choice questions');
  assert.equal(lesson.steps[6].source.some(x=>x.includes('ROUND 2')),true,'Two-round communicative task');
  for (const step of lesson.steps.filter(step=>step.type==='choice'||step.type==='match'||step.type==='gap')) {
    for (const item of step.items) assert.ok(item[2]>=0&&item[2]<item[1].length,'Every answer must have a valid key');
  }
  for (const step of lesson.steps.filter(step=>step.type==='order')) {
    assert.deepEqual(step.order.slice().sort((a,b)=>a-b),Array.from({length:step.items.length},(_,i)=>i));
  }
  assert.equal(homework.steps.length,4);
  assert.ok(homework.steps.some(step=>step.type==='write' && step.instruction.includes('100')));
  const sync=await readFile('./assets/gostudy-sync.js','utf8');
  assert.ok(sync.includes('travel-b2-04-practice.html'),'Current student and teacher lesson must link aligned homework');
  console.log('Travel B2 lesson methodology, answer keys and linked homework validated');
}

async function checkGeneralB2Room(browser, origin) {
  const studentId = '33333333-3333-4333-8333-333333333333';
  const teacherId = '44444444-4444-4444-8444-444444444444';
  const roomId = '55555555-5555-4555-8555-555555555555';
  const lessonUrl = origin + '/general-english-b2-01.html';
  const events = [];
  const student = await browser.newContext();
  const teacher = await browser.newContext();
  try {
    for (const [context,id,role] of [[student,studentId,'student'],[teacher,teacherId,'teacher']]) {
      await context.addInitScript(({id,role}) => {
        const session = JSON.stringify({user:{id},access_token:'test-'+role,expires_at:Date.now()+3600000});
        localStorage.setItem('gostudy-'+role+'-session-v1',session);
        sessionStorage.setItem('gostudy-cloud-session-v1',session);
      },{id,role});
      await context.route('https://*.supabase.co/**',route => {
        const request = route.request();
        const url = new URL(request.url());
        assert.equal(request.headers().authorization,'Bearer test-'+role);
        if (url.pathname.endsWith('/gostudy_classroom_rooms')) {
          // The teacher-wide Art assignment selector has its own role tests.
          // This fixture supplies only the room under test, not Anastasia's roster.
          if (url.searchParams.get('course') === 'eq.art-b1' &&
              url.searchParams.get('select') === 'student_id,teacher_id')
            return route.fulfill({json:[]});
          if (url.searchParams.get('course') === 'eq.english-placement') return route.fulfill({json:[]});
          assert.equal(url.searchParams.get('course'),'eq.general-english-b2');
          return route.fulfill({json:[{id:roomId,teacher_id:teacherId,student_id:studentId,student_label:'Виктория'}]});
        }
        if (url.pathname.endsWith('/gostudy_classroom_events')) {
          assert.equal(url.searchParams.get('room_id'),'eq.'+roomId);
          const cursor = Number(url.searchParams.get('seq').slice(3));
          return route.fulfill({json:events.filter(event=>event.seq>cursor)});
        }
        if (url.pathname.endsWith('/gostudy_classroom_send')) {
          const event = request.postDataJSON();
          assert.equal(event.p_room,roomId);
          events.push({actor:id,seq:events.length+1,kind:event.p_kind,payload:event.p_payload});
          return route.fulfill({json:true});
        }
        return route.fulfill({json:[]});
      });
    }
    const sp = await student.newPage();
    const tp = await teacher.newPage();
    await Promise.all([sp.goto(origin+'/student-general-english-b2.html'),tp.goto(origin+'/gostudy-teacher.html')]);
    await sp.getByRole('heading',{name:/Виктория/}).waitFor();
    await Promise.all([
      sp.getByRole('link',{name:'Открыть урок 1 General English B2'}).click(),
      tp.locator('.teacher-student-row').filter({hasText:'Виктория'}).getByRole('link',{name:/Войти в класс/}).click(),
    ]);
    await tp.waitForURL(lessonUrl+'?classStudent='+studentId);
    for (const page of [sp,tp]) {
      await page.getByRole('heading',{name:'The Hidden Cost of Convenience'}).waitFor();
      await page.getByRole('button',{name:'Continue',exact:true}).click();
    }
    const choice = sp.locator('.definition-picker').first();
    await choice.locator('summary').click();
    await choice.getByRole('button',{name:/gaining one benefit/}).click();
    await tp.locator('.definition-picker summary').first().filter({hasText:'gaining one benefit'}).waitFor();
    await tp.getByRole('button',{name:'Сбросить ответы',exact:true}).click();
    await choice.locator('summary').filter({hasText:'Choose a definition'}).waitFor();
    await tp.getByRole('button',{name:/Save word/}).first().click();
    await sp.locator('#finance-toast').filter({hasText:'trade-off'}).waitFor();
    const classroom = await student.newPage();
    await classroom.goto(origin+'/student-general-english-b2.html');
    await classroom.locator('#vocabCount').filter({hasText:'1 слово'}).waitFor();
    await classroom.locator('#practiceCard').click();
    await classroom.locator('#practiceQuestion').filter({hasText:'trade-off'}).waitFor();
    await sp.getByRole('textbox',{name:'Сообщение'}).fill('Ready to begin');
    await sp.getByRole('button',{name:'Отправить'}).click();
    await tp.getByText('Ready to begin',{exact:true}).waitFor();
  } finally {
    await student.close();
    await teacher.close();
  }
}


async function checkMigratedRooms(browser, origin) {
  const studentId = '33333333-3333-4333-8333-333333333333';
  const teacherId = '44444444-4444-4444-8444-444444444444';
  const roomId = '55555555-5555-4555-8555-555555555555';
  for (const lesson of [
  {
    "course": "country-house",
    "path": "country-house-travel-a2-05.html",
    "cab": "student-country-house.html",
    "student": "Ирина",
    "title": "The Little Joys of Travelling"
  },
  {
    "course": "art-b1",
    "path": "art-b1-03.html",
    "cab": "student-art-b1.html",
    "student": "Анастасия",
    "title": "The Gallery Makeover"
  },
  {
    "course": "business-ai",
    "path": "business-ai-b2c1-03.html",
    "cab": "student-business-ai.html",
    "student": "Влад",
    "title": "The Price of a Bad Decision: AI and Business Choices"
  }
]) {
    const events = [];
    const student = await browser.newContext();
    const teacher = await browser.newContext();
    try {
      for (const [context,id,role] of [[student,studentId,'student'],[teacher,teacherId,'teacher']]) {
        await context.addInitScript(({id,role}) => {
          const session = JSON.stringify({user:{id},access_token:'test-'+role,expires_at:Date.now()+3600000});
          localStorage.setItem('gostudy-'+role+'-session-v1',session);
          sessionStorage.setItem('gostudy-cloud-session-v1',session);
          if (role === 'student') localStorage.setItem('gostudy-art-b1-v1',JSON.stringify({words:[{en:'old word',ru:'старое слово'}]}));
        },{id,role});
        await context.route('https://*.supabase.co/**',route => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.pathname.endsWith('/gostudy_classroom_rooms')) {
          // The teacher-wide Art assignment selector has its own role tests.
          // This fixture supplies only the room under test, not Anastasia's roster.
          if (url.searchParams.get('course') === 'eq.art-b1' &&
              url.searchParams.get('select') === 'student_id,teacher_id')
            return route.fulfill({json:[]});
            if (!url.searchParams.has('lesson_path')) return route.fulfill({json:[]});
            assert.equal(url.searchParams.get('course'),'eq.'+lesson.course);
            assert.equal(url.searchParams.get('student_id'),'eq.'+studentId);
            return route.fulfill({json:[{id:roomId,teacher_id:teacherId,student_id:studentId,student_label:lesson.student}]});
          }
          if (url.pathname.endsWith('/gostudy_classroom_events')) {
            assert.equal(url.searchParams.get('room_id'),'eq.'+roomId);
            const cursor = Number(url.searchParams.get('seq').slice(3));
            return route.fulfill({json:events.filter(event=>event.seq>cursor)});
          }
          if (url.pathname.endsWith('/gostudy_classroom_send')) {
            const event = request.postDataJSON();
            assert.equal(event.p_room,roomId);
            events.push({actor:id,seq:events.length+1,kind:event.p_kind,payload:event.p_payload});
            return route.fulfill({json:true});
          }
          const action = url.pathname.split('/').at(-1);
          if (role === 'teacher' && (action === 'gostudy_'+lesson.course.replaceAll('-','_')+'_teacher_view' ||
            (action === 'gostudy_legacy_teacher_view' && lesson.course === 'art-b1' && request.postDataJSON().p_course === 'art_b1'))) {
            return route.fulfill({json:[{id:studentId,label:lesson.student,words:[],assigned:[],progress:[]}]});
          }
          return route.fulfill({json:[]});
        });
      }
      const sp = await student.newPage();
      const tp = await teacher.newPage();
      const cabinet = await student.newPage();
      const errors = [];
      for (const [page,label] of [[sp,'student'],[tp,'teacher']]) page.on('pageerror',error=>errors.push(label+': '+error.message));
      await Promise.all([sp.goto(origin+'/'+lesson.cab),tp.goto(origin+'/gostudy-teacher.html')]);
      const card = sp.locator('.lesson-card');
      await card.getByRole('heading',{name:lesson.title}).waitFor();
      assert.equal(await card.getAttribute('href'),lesson.path);
      await Promise.all([
        card.click(),
        tp.locator('.teacher-student-row').filter({hasText:lesson.student}).getByRole('link',{name:/Войти в класс/}).click(),
      ]);
      await tp.waitForURL(url => url.pathname === '/'+lesson.path && url.searchParams.get('classStudent') === studentId);
      for (const page of [sp,tp]) {
        if (lesson.course === 'country-house') {
          // The new A2+ lesson uses Michael's compact collapsed chat, so its
          // status lives in a hidden <details> until the user opens it.
          await page.waitForFunction(()=>document.querySelector('#finance-live-status')?.textContent === 'Онлайн · общая комната');
          const chat=page.locator('.lesson-chat-dropdown');
          await chat.waitFor({state:'visible'});
          await chat.locator('summary').click();
          await chat.locator('#finance-live-status').getByText('Онлайн · общая комната').waitFor();
        } else {
          await page.getByText('Онлайн · общая комната',{exact:true}).waitFor();
        }
        const tools = await page.locator('.video-workspace').boundingBox();
        const content = await page.locator('.lesson').boundingBox();
        assert.ok(tools.x+tools.width <= content.x+1,'video and chat should be to the left of the lesson');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),'horizontal overflow');
      }
      await sp.getByRole('button',{name:'Continue',exact:true}).click();
      // Student navigation must never move the teacher automatically.
      await tp.locator('.page.active').first().waitFor();
      assert.equal(await tp.locator('.page.active').first().evaluate(el=>[...el.parentElement.querySelectorAll('.page')].indexOf(el)),0,'teacher must remain on original page');
      await tp.getByRole('button',{name:'Continue',exact:true}).click();
      if (lesson.course === 'art-b1') {
        const studentPicker = sp.locator('.page.active .definition-picker').first();
        const teacherPicker = tp.locator('.page.active .definition-picker').first();
        await studentPicker.waitFor();
        await teacherPicker.waitFor();
        await studentPicker.locator('summary').click();
        await studentPicker.getByRole('button',{name:'show a painting or object publicly',exact:true}).click();
        await teacherPicker.locator('summary').filter({hasText:'show a painting or object publicly'}).waitFor();
        await tp.getByRole('button',{name:'Сбросить ответы'}).click();
        await studentPicker.locator('summary').filter({hasText:/Choose|Выберите/}).waitFor();
        await teacherPicker.locator('summary').click();
        await teacherPicker.getByRole('button',{name:'show a painting or object publicly',exact:true}).click();
        await studentPicker.locator('summary').filter({hasText:'show a painting or object publicly'}).waitFor();
        await tp.getByRole('button',{name:'Dictionary'}).click();
        await tp.locator('#dictionarySource').fill('shared entry');
        await tp.locator('#dictionaryTranslation').fill('общее слово');
        await tp.locator('#dictionaryAddForm button[type=submit]').click();
      } else {
        const step = await sp.locator('#lesson-data').evaluate(node => JSON.parse(node.textContent).steps.findIndex(step => step.type === 'choice'));
        assert.ok(step >= 1);
        for (let i=1;i<step;i++) {
          await sp.getByRole('button',{name:'Continue',exact:true}).click();
          await tp.getByRole('button',{name:'Continue',exact:true}).click();
        }
        await tp.locator('.page.active fieldset .options label').first().waitFor();
        await sp.locator('.page.active fieldset .options label').first().click();
        await tp.locator('.page.active fieldset input[type=radio]:checked').first().waitFor();
        await tp.getByRole('button',{name:'Сбросить ответы'}).click();
        await sp.waitForFunction(() => !document.querySelector('.page.active fieldset input[type=radio]:checked'));
        await tp.locator('.page.active fieldset .options label').first().click();
        await sp.locator('.page.active fieldset input[type=radio]:checked').first().waitFor();
        await tp.evaluate(() => window.FinanceLive.send('word',{en:'shared entry',ru:'общее слово'}));
      }
      await sp.locator('#finance-toast').filter({hasText:'shared entry'}).waitFor();
      await cabinet.goto(origin+'/'+lesson.cab);
      await cabinet.getByRole('button',{name:/Тренировки слов/}).click();
      const expectedWord = lesson.course === 'art-b1' ? 'old word' : 'shared entry';
      await cabinet.locator('#practiceQuestion').filter({hasText:expectedWord}).waitFor();
      await sp.getByRole('textbox',{name:'Сообщение'}).fill('Classroom check');
      await sp.getByRole('button',{name:'Отправить'}).click();
      await tp.getByRole('log').getByText(/Classroom check/).waitFor();
      if (lesson.course === 'business-ai') {
        const gap = await sp.locator('#lesson-data').evaluate(node => {
          const lesson = JSON.parse(node.textContent);
          return lesson.steps.findIndex(step => step.type === 'gap' && step.items.some(item => item[1].includes('suggests')));
        });
        assert.ok(gap >= 0);
        await sp.locator('.lesson-section-menu summary').click();
        await sp.locator('#lessonSections button').nth(gap).click();
        // Teacher remains on their own page until explicitly navigating there.
        await tp.locator('.lesson-section-menu summary').click();
        await tp.locator('#lessonSections button').nth(gap).click();
        const active = '.page.active';
        const picker = sp.locator(active+' .definition-picker').first();
        await picker.locator('summary').click();
        await picker.getByRole('button',{name:'suggests',exact:true}).click();
        await tp.locator(active+' .definition-picker summary').first().filter({hasText:'suggests'}).waitFor();
        assert.equal(await sp.locator(active+' select').count(),0);
        await sp.setViewportSize({width:390,height:844});
        await picker.locator('summary').click();
        await picker.getByRole('button',{name:'suggests',exact:true}).waitFor();
        await picker.locator('summary').press('Escape');
        assert.equal(await picker.getAttribute('open'),null);
      }
      await sp.setViewportSize({width:390,height:844});
      const pager = sp.locator('.pager');
      await pager.waitFor();
      const mobile = await pager.evaluate(node => {
        const box = node.getBoundingClientRect();
        return {position:getComputedStyle(node).position, bottom:box.bottom, width:box.width, viewport:innerHeight, screenWidth:innerWidth, contentWidth:document.documentElement.scrollWidth};
      });
      assert.equal(mobile.position,'fixed','navigation should stay visible on an iPhone-width screen');
      assert.ok(Math.abs(mobile.bottom-mobile.viewport) <= 1 && Math.abs(mobile.width-mobile.screenWidth) <= 1,'navigation fills the bottom edge on mobile');
      assert.ok(mobile.contentWidth <= mobile.screenWidth+1,lesson.course+': mobile lesson overflows '+JSON.stringify(mobile));
      assert.deepEqual(errors,[]);
      console.log(lesson.course + ': v1 cabinet, answers, reset, vocabulary, chat and mobile layout verified');
    } finally {
      await student.close();
      await teacher.close();
    }
  }
}

async function checkFinanceRoom(browser, origin) {
  const studentId = '11111111-1111-4111-8111-111111111111';
  const teacherId = '22222222-2222-4222-8222-222222222222';
  const student = await browser.newContext();
  const teacher = await browser.newContext();
  const events = [];
  const lessonUrl = origin + '/business-ai-finance-b2-02.html';
  const status = 'Онлайн · общая комната';
  try {
    for (const [context, id, role] of [[student, studentId, 'student'], [teacher, teacherId, 'teacher']]) {
      await context.addInitScript(({id, role}) => {
        const session = JSON.stringify({user:{id}, access_token:'test-' + role, expires_at:Date.now() + 3600000});
        sessionStorage.setItem('gostudy-cloud-session-v1',session);
        localStorage.setItem('gostudy-' + role + '-session-v1',session);
        if(role === 'student') localStorage.setItem('gostudy-business-ai-shared-v1', JSON.stringify({words:[{en:'stress test',ru:'стресс-тест'}]}));
      }, {id,role});
      await context.route('https://*.supabase.co/**', route => {
        const request = route.request();
        const url = new URL(request.url());
        assert.equal(request.headers().authorization, 'Bearer test-' + role);
        if (url.pathname.endsWith('/gostudy_finance_room')) {
          return route.fulfill({json:[{teacher_id:teacherId, student_id:studentId}]});
        }
        if (url.pathname.endsWith('/gostudy_finance_events')) {
          if (request.method() === 'POST') {
            const event = request.postDataJSON();
            events.push({...event,seq:events.length + 1,actor:id});
            return route.fulfill({status:201});
          }
          const cursor = Number(url.searchParams.get('seq').slice(3));
          return route.fulfill({json:events.filter(event=>event.seq > cursor)});
        }
        return route.fulfill({json:[]});
      });
      await context.route('https://api.mymemory.translated.net/**', route => route.fulfill({
        json:{responseStatus:200,responseData:{translatedText:'прогнозируемый'}}
      }));
    }
    const sp = await student.newPage();
    const tp = await teacher.newPage();
    const cabinet = await student.newPage();
    await Promise.all([sp.goto(lessonUrl),tp.goto(origin+'/gostudy-teacher.html'),cabinet.goto(origin+'/student-business-ai-finance.html')]);
    const pupilRow = tp.locator('.teacher-student-row').filter({hasText:'Михаил'});
    await pupilRow.getByRole('link',{name:/Войти в класс/}).click();
    await tp.waitForURL(lessonUrl + '?classStudent=' + studentId);
    await Promise.all([sp,tp].map(page => page.waitForFunction(expected => document.querySelector('#finance-live-status')?.textContent === expected,status)));

    // Michael-only visual contract: very light workspace and a continuous
    // white lesson sheet without bottom-rounded corners above the pager.
    for(const page of [sp,tp]){
      const visual=await page.evaluate(()=>{
        const read=sel=>getComputedStyle(document.querySelector(sel));
        return {
          workspace:read('.layout').backgroundColor,
          lesson:read('.lesson').backgroundColor,
          bottomLeft:read('.lesson-content').borderBottomLeftRadius,
          bottomRight:read('.lesson-content').borderBottomRightRadius,
          bottomBorder:read('.lesson-content').borderBottomWidth,
          sheetBottom:document.querySelector('.lesson-content').getBoundingClientRect().bottom,
          pagerTop:document.querySelector('.pager').getBoundingClientRect().top
        };
      });
      assert.equal(visual.workspace,'rgb(247, 249, 252)','Michael workspace must match #F7F9FC reference');
      assert.equal(visual.lesson,'rgb(247, 249, 252)','Michael lesson surround must match reference');
      assert.equal(visual.bottomLeft,'0px','Lesson paper must not round at the bottom left');
      assert.equal(visual.bottomRight,'0px','Lesson paper must not round at the bottom right');
      assert.equal(visual.bottomBorder,'0px','Lesson paper bottom border must be hidden');
      assert.ok(Math.abs(visual.sheetBottom-visual.pagerTop)<=2,'Paper must meet lesson navigation without a gap: '+JSON.stringify(visual));
    }

    await cabinet.locator('#vocabCount').filter({hasText:'1 слово'}).waitFor();
    await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await sp.getByRole('dialog').getByText('stress test',{exact:true}).waitFor();
    await sp.getByRole('button',{name:'Close dictionary'}).click();
    assert.equal(events.filter(event => event.kind === 'word').length,0,'Opening a classroom must not import local words implicitly');
    await cabinet.locator('#openWords').click();
    await cabinet.locator('#importFinanceWords').click();
    await cabinet.locator('#financeImportStatus').filter({hasText:'доступны на других устройствах'}).waitFor();
    await cabinet.locator('#words').getByRole('button',{name:'Закрыть'}).click();
    await tp.locator('#finance-toast').filter({hasText:'стресс-тест'}).waitFor();
    assert.equal(events.find(event => event.kind === 'word')?.payload.en,'stress test');

    const word = tp.getByText('Forecasted cash balance',{exact:true});
    await word.evaluate(element => {
      const node = element.firstChild;
      const range = document.createRange();
      range.setStart(node,0);
      range.setEnd(node,'Forecasted'.length);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    });
    // Allow asynchronous automatic translation to settle before manually editing.
    await tp.waitForFunction(() => document.querySelector('#selectionStatus')?.textContent !== 'Переводим…');
    const target=tp.locator('#selectionTarget');
    await target.fill('уточнённый прогноз');
    assert.equal(await target.inputValue(),'уточнённый прогноз','Manual translation input must be exact before saving');
    await tp.locator('#selectionSave').click();
    try {
      await tp.waitForFunction(() => window.FinanceLive.words().some(word => word.ru === 'уточнённый прогноз'),undefined,{timeout:4000});
    } catch (error) {
      const state = await tp.evaluate(() => ({
        text:document.querySelector('#selectionTarget').value,
        selection:window.getSelection()?.toString(),
        button:document.querySelector('#selectionSave').textContent,
        status:document.querySelector('#finance-live-status').textContent,
        words:window.FinanceLive.words()
      }));
      throw new Error('Edited translation was not saved: '+JSON.stringify({events,state}),{cause:error});
    }
    for(const page of [sp,tp]){
      await page.locator('#finance-toast').filter({hasText:'уточнённый прогноз'}).waitFor();
      await page.getByRole('button',{name:'Dictionary',exact:true}).click();
      await page.getByRole('dialog').getByText('уточнённый прогноз',{exact:false}).waitFor();
      await page.getByRole('button',{name:'Close dictionary'}).click();
    }
    await cabinet.locator('#vocabCount').filter({hasText:'2 слова'}).waitFor();
    await cabinet.locator('#practiceCard').click();
    await cabinet.locator('#words').waitFor({state:'visible'});
    await cabinet.locator('#practiceFromWords').click();
    await cabinet.locator('#practiceQuestion').filter({hasText:/forecasted|прогнозируемый|stress test|стресс-тест/i}).waitFor();

    // Both participants browse independently; only an explicit teacher command moves the student.
    const move = tp.locator('#moveStudent');
    assert.equal(await sp.locator('#moveStudent').isVisible(),false,'Only teacher can see the move action');
    await sp.getByRole('button',{name:'Continue',exact:true}).click();
    await sp.locator('#page-1.active').waitFor();
    await sp.getByRole('button',{name:'Continue',exact:true}).click();
    await sp.locator('#page-2.active').waitFor();
    assert.equal(await tp.locator('#page-0.active').count(),1,'Student browsing must not move the teacher');
    await move.waitFor({state:'visible'});
    await tp.getByRole('button',{name:'Continue',exact:true}).click();
    await tp.locator('#page-1.active').waitFor();
    assert.equal(await sp.locator('#page-2.active').count(),1,'Teacher browsing must not move the student');
    await move.click();
    await sp.locator('#page-1.active').waitFor();
    await move.waitFor({state:'hidden'});
    await sp.getByRole('button',{name:'Back',exact:false}).click();
    await sp.locator('#page-0.active').waitFor();
    await move.waitFor({state:'visible'});
    await move.click();
    await sp.locator('#page-1.active').waitFor();
    await move.waitFor({state:'hidden'});
    assert.equal(await sp.locator('#finance-activity').isVisible(),false,'Technical navigation notices must remain hidden');
    assert.equal(events.filter(event=>event.kind==='page' && event.payload?.action==='move' && event.actor===teacherId).length,2,'Only explicit teacher actions should move the student');
    const pick = async (page,index,choice) => {
      const picker = page.locator('.definition-picker').nth(index);
      await picker.locator('summary').click();
      await picker.locator('button[data-choice="'+choice+'"]').click();
    };
    await pick(sp,0,2);
    await tp.locator('#vf0').filter({hasText:'Correct'}).waitFor();
    await pick(tp,0,1);
    await sp.locator('#vf0').filter({hasText:'Try again'}).waitFor();
    const reset = page => page.locator('.page.active .finance-reset');
    await reset(tp).click();
    await sp.locator('.definition-picker summary').first().filter({hasText:'Choose a definition'}).waitFor();
    await pick(tp,0,2);
    await sp.locator('#vf0').filter({hasText:'Correct'}).waitFor();
    await reset(sp).click();
    await tp.locator('.definition-picker summary').first().filter({hasText:'Choose a definition'}).waitFor();

    for(const [index,choice] of [2,5,1,7,4,0,6,3].entries()) await pick(sp,index,choice);
    const celebration = sp.locator('#finance-celebrate');
    await celebration.waitFor();
    assert.equal(await celebration.locator('.finance-salute').count(),2);
    await tp.locator('#finance-celebrate').waitFor();
    await celebration.waitFor({state:'hidden',timeout:4500});
    assert.equal(await sp.getByRole('button',{name:'Check answers'}).count(),0);

    await sp.setViewportSize({width:390,height:844});
    // Michael pilot: the lesson chat starts collapsed. Expand it before the
    // existing live-message checks; closing the drawer must not remove messages.
    const openMichaelChat=async page=>{
      const chat=page.locator('.lesson-chat-dropdown');
      await chat.waitFor({state:'visible'});
      assert.equal(await chat.getAttribute('open'),null,'Pilot lesson chat should start collapsed');
      await chat.locator('summary.lesson-chat-toggle').click();
      await page.getByRole('textbox',{name:'Сообщение'}).waitFor({state:'visible'});
    };
    await Promise.all([sp,tp].map(openMichaelChat));
    for(const [sender,receiver,note] of [[sp,tp,'Сообщение ученика'],[tp,sp,'Сообщение преподавателя']]){
      await sender.getByRole('textbox',{name:'Сообщение'}).fill(note);
      await sender.getByRole('button',{name:'Отправить'}).click();
      await receiver.locator('#finance-messages').getByText(note,{exact:true}).waitFor();
    }
    await Promise.all([sp.reload(),tp.reload()]);
    await Promise.all([sp,tp].map(page=>page.waitForFunction(expected=>document.querySelector('#finance-live-status')?.textContent===expected,status)));
    await Promise.all([sp,tp].map(openMichaelChat));
    for(const page of [sp,tp]){
      await page.locator('#finance-messages').getByText('Сообщение ученика',{exact:true}).waitFor();
      await page.locator('#finance-messages').getByText('Сообщение преподавателя',{exact:true}).waitFor();
      assert.equal(await page.locator('#finance-messages .chat-own').count(),1,'Own messages must appear on the right');
    }
    // Pilot scope: Michael uses Google's web engine, other students stay unchanged.
    assert.equal(await tp.locator('body').getAttribute('data-translate-engine'),'google-web-pilot');
    await tp.route('https://translate.googleapis.com/**',route=>route.abort());
    const selectPhrase=async (sentence,word)=>{
      await tp.evaluate(({sentence,word})=>{
        const element=document.createElement('p');element.textContent=sentence;
        document.querySelector('.lesson').append(element);
        const node=element.firstChild,start=node.textContent.indexOf(word),range=document.createRange();
        range.setStart(node,start);range.setEnd(node,start+word.length);
        window.getSelection().removeAllRanges();window.getSelection().addRange(range);
        document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
      },{sentence,word});
    };
    await selectPhrase('We should analyze financial crisis patterns.','financial crisis');
    await tp.locator('#selectionRetry').waitFor({state:'visible',timeout:12000});
    await tp.unroute('https://translate.googleapis.com/**');
    const requests=[];
    await tp.route('https://translate.googleapis.com/**',route=>{
      const params=new URL(route.request().url()).searchParams;
      const query=params.get('q');
      requests.push(query);
      assert.equal(params.get('client'),'gtx');
      assert.equal(params.get('sl'),'en');
      assert.equal(params.get('tl'),'ru');
      const results={'financial crisis':'финансовый кризис','creative':'творческий'};
      return route.fulfill({json:[[[results[query]||'перевод',query]],null,'en']});
    });
    assert.equal(await tp.locator('.video-help').count(),0);
    assert.equal(await tp.locator('#selectionSource').count(),0);
    assert.equal(await tp.locator('#selectionContext').count(),0);
    await tp.locator('#selectionRetry').click();
    await tp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value==='финансовый кризис');
    await tp.keyboard.press('Escape');
    await selectPhrase('We should analyze financial crisis patterns.','financial crisis');
    await tp.waitForFunction(()=>document.querySelector('#selectionTranslate')?.classList.contains('is-visible') && document.querySelector('#selectionTarget')?.value==='финансовый кризис');
    await tp.locator('#selectionSave').click();
    await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await sp.locator('#myWords').getByText('financial crisis',{exact:false}).waitFor();
    await sp.getByRole('button',{name:'Close dictionary'}).click();
    await selectPhrase('Our company director approved the report.','director');
    await tp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value.startsWith('директор, руководитель'));
    await selectPhrase('I recommend concrete actions.','concrete');
    await tp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value.startsWith('конкретные'));
    await tp.locator('#selectionSave').click();
    await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await sp.locator('#myWords').getByText('конкретные',{exact:false}).waitFor();
    await sp.getByRole('button',{name:'Close dictionary'}).click();
    await selectPhrase('Builders poured concrete into the wall.','concrete');
    await tp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value.startsWith('бетон'));
    await selectPhrase('We need to reach the target.','reach');
    await tp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value.startsWith('достичь'));
    await selectPhrase('A creative solution can work.','creative');
    await tp.waitForFunction(()=>document.querySelector('#selectionTarget')?.value==='творческий');
    assert.ok(requests.includes('creative'),'Google pilot must translate an unknown selected word, not the whole sentence');
    assert.ok(!requests.includes('We need to reach the target.'),'Google pilot must not translate whole sentences and attempt word diffs');
    // Manual bilingual entry also works after automatic translation is edited.
    await tp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await tp.locator('#dictionarySource').fill('cash flow');
    await tp.locator('#dictionaryTranslation').fill('денежный поток');
    await tp.locator('#dictionaryAddForm button[type=submit]').click();
    await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await sp.locator('#myWords').getByText('cash flow',{exact:false}).waitFor();
    await sp.getByRole('button',{name:'Close dictionary'}).click();
    await tp.getByRole('button',{name:'Close dictionary'}).click();
    console.log('business-ai-finance: teacher roster, local word recovery, vocabulary, training, chat, navigation, answers, shared reset and celebration verified in two contexts');
  } finally {
    await student.close();
    await teacher.close();
  }
}


async function checkSharedComponentReversible(browser,origin){
  const file='assets/gostudy-v1-lesson.css';
  const before=await readFile(file,'utf8');
  const probe=String.fromCharCode(10)+':root{--gostudy-shared-probe:GOSTUDY-SHARED-PROBE;}'+String.fromCharCode(10);
  const context=await browser.newContext();
  try {
    await writeFile(file,before+probe);
    for(const pageName of ['business-ai-finance-b2-02.html','general-english-b2-01.html']){
      const page=await context.newPage();
      await page.goto(origin+'/'+pageName);
      await page.locator('.hero').waitFor({state:'attached'});
      const value=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gostudy-shared-probe'));
      assert.ok(value.includes('GOSTUDY-SHARED-PROBE'),pageName+' did not receive shared component update');
      await page.close();
    }
  } finally {
    await writeFile(file,before);
    await context.close();
  }
  console.log('Shared style probe: Michael + Victoria received one reversible shared-component change; original CSS restored');
}


async function checkFinanceHomework(browser,origin){
 const studentId='11111111-1111-4111-8111-111111111111',teacherId='22222222-2222-4222-8222-222222222222';
 const lesson='business-ai-finance-b2-02.html',homework='business-ai-finance-b2-02-homework.html';
 // Existing draft proves that hiding the exercise menus does not delete homework.
 let draft={exercise_ids:['finance2-vocab-02'],published_at:null},published=null;const answers=new Map();
 const contexts=[];
 const makeContext=async(id,role,mobile=false)=>{
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  contexts.push(context);
  await context.addInitScript(({id,role})=>{
   const session=JSON.stringify({user:{id},access_token:'test-'+role,expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',session);
  },{id,role});
  await context.route('https://*.supabase.co/**',route=>{
   const request=route.request(),url=new URL(request.url()),method=request.method();
   const body=method==='GET'?{}:request.postDataJSON();
   const isTeacher=id===teacherId;
   const ok=json=>route.fulfill({status:200,json});
   if(url.pathname.endsWith('/gostudy_finance_room'))return ok([{teacher_id:teacherId,student_id:studentId}]);
   if(url.pathname.endsWith('/gostudy_finance_events'))return ok([]);
   if(url.pathname.endsWith('/gostudy_homework_assignments')){
    if(method==='GET')return ok(isTeacher&&draft?[draft]:[]);
    if(!isTeacher)return ok([]);
    if(method==='POST')draft={...body};
    if(method==='PATCH')draft={...draft,...body};
    return ok([draft]);
   }
   if(url.pathname.endsWith('/gostudy_homework_published')){
    if(method==='GET')return ok(published?[published]:[]);
    if(!isTeacher)return ok([]);
    if(method==='POST')published={...body};
    if(method==='PATCH')published={...published,...body};
    return ok([published]);
   }
   if(url.pathname.endsWith('/gostudy_homework_answers')){
    if(method==='GET')return ok([...answers.entries()].map(([exercise_id,answer])=>({exercise_id,answer})));
    if(!isTeacher&&method==='POST'){answers.set(body.exercise_id,body.answer);return ok([body]);}
    return ok([]);
   }
   return ok([]);
  });
  return context;
 };
 try{
  const tc=await makeContext(teacherId,'teacher'),sc=await makeContext(studentId,'student',true);
  const teacher=await tc.newPage(),student=await sc.newPage();
  await Promise.all([teacher.goto(origin+'/'+lesson+'?classStudent='+studentId),student.goto(origin+'/'+homework)]);
  await student.locator('#homework-status').filter({hasText:'не опубликовано'}).waitFor();
  await teacher.locator('.homework-teacher-actions').waitFor();
  await teacher.getByRole('button',{name:'Continue',exact:true}).click();
  await teacher.locator('#vocab .term').nth(1).waitFor();
  // Regression: hiding by CSS is insufficient; no menu can exist in the DOM
  // for the Michael pilot. Other lessons still retain the original feature.
  assert.equal(await teacher.locator('.homework-exercise-menu').count(),0,'Michael must not inject exercise-to-homework menus');
  assert.equal(await teacher.getByText('⋯ Упражнение',{exact:false}).count(),0,'No exercise-to-homework labels in Michael lesson');
  await teacher.locator('.homework-draft-status').filter({hasText:'В черновике: 1'}).waitFor();
  assert.deepEqual(draft.exercise_ids,['finance2-vocab-02'],'Existing draft survives removal of the buttons');
  await student.reload();
  await student.locator('#homework-status').filter({hasText:'не опубликовано'}).waitFor();
  await teacher.locator('.homework-publish').click();
  await teacher.locator('.homework-draft-status').filter({hasText:'опубликовано'}).waitFor();
  assert.deepEqual(published.exercise_ids,['finance2-vocab-02'],'Publishing must copy the draft');
  await student.reload();
  await student.locator('.homework-task').waitFor();
  assert.equal(await student.locator('.homework-task').count(),1,'Student sees exactly one assigned exercise');
  await student.locator('.homework-task select').selectOption({index:1});
  await student.locator('.homework-task small').filter({hasText:'Сохранено'}).waitFor();
  assert.ok(answers.has('finance2-vocab-02'),'Mobile homework answer persisted');
  await student.reload();
  assert.equal(await student.locator('.homework-task select').inputValue(),answers.get('finance2-vocab-02').value);
  console.log('Finance homework: Michael exercise menus absent from DOM, existing draft preserved, student blocked -> publish -> mobile save/reload verified');
 }finally{for(const context of contexts)await context.close();}
}


async function checkDariaPrivateRoom(browser,origin) {
  const studentId='6af5764c-487a-448f-a21e-8744dc5a2322';
  const teacherId='acf2f6a1-f38b-45ef-836d-6cc9a9a5a832';
  const roomId='44444444-4444-4444-8444-444444444444';
  const users={
    student:{id:studentId,email:'daria@example.invalid'},
    teacher:{id:teacherId,email:'teacher@example.invalid'},
    outsider:{id:'55555555-5555-4555-8555-555555555555',email:'outsider@example.invalid'}
  };
  const roleFor=token=>Object.keys(users).find(role=>token==='Bearer test-'+role);
  const fixture={
    title:'After Dark: Who Owns the Night?',duration:50,subtitle:'An IELTS academic reading.',
    mission:'Which evidence should a city consider?',
    reading:'<p><b>A.</b> A test passage about artificial lighting and wildlife.</p>',
    summary:'Street Three dimmed lamps after (9).',
    questions:[
      ['1','features','Which paragraph contains the example?','A','Paragraph A gives the example.'],
      ['5','claims','The writer says all lamps must be removed.','NO','The passage does not propose removing lamps.'],
      ['9','completion','Lamps were dimmed after ______.','midnight','The description specifies midnight.']
    ],
    words:[['migration','миграция'],['glare','блики']]
  };
  const saved=new Map();
  const words=new Map();
  const events=[{seq:1,actor:teacherId,kind:'chat',payload:{text:'Ранее сохранённое сообщение'}}];
  const translationRequests=[];
  const context=await browser.newContext({viewport:{width:1360,height:900}});
  const teacher=await browser.newContext();
  const outsider=await browser.newContext();
  let contentFetches=0,logins=0;
  const api=route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
    const token=req.headers()['authorization'];
    const respond=(status,json)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(json)});
    if(path==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
      const values=req.postDataJSON();assert.equal(values.password,'test-password');
      logins++;
      const role=Object.keys(users).find(role=>users[role].email===values.email);
      assert.ok(role,'Unexpected login');
      return respond(200,{user:users[role],access_token:'test-'+role,refresh_token:'refresh-test',expires_in:3600});
    }
    const role=roleFor(token),user=users[role];
    if(!user)return respond(401,{message:'invalid'});
    if(path==='/auth/v1/user')return respond(200,user);
    if(path.endsWith('/gostudy_my_destinations'))return respond(200,role==='teacher'?[{course:'teacher'}]:[]);
    if(path.endsWith('/gostudy_legacy_teacher_view') && req.postDataJSON().p_course==='ielts_reading'){
      return respond(200,role==='teacher'?[{id:studentId,label:'Дарья'}]:[]);
    }
    if(path.endsWith('/gostudy_private_lessons')){
      contentFetches++;
      return respond(200,role==='outsider'?[]:[{lesson_payload:fixture}]);
    }
    if(path.endsWith('/gostudy_classroom_rooms')&&url.searchParams.get('course')==='eq.ielts-reading'){
      assert.equal(url.searchParams.get('student_id'),'eq.'+studentId);
      assert.equal(url.searchParams.get('lesson_path'),'eq.ielts-reading-04.html');
      return respond(200,role==='outsider'?[]:[{id:roomId,student_id:studentId,teacher_id:teacherId}]);
    }
    if(path.endsWith('/gostudy_classroom_events')){
      assert.equal(url.searchParams.get('room_id'),'eq.'+roomId);
      const cursor=Number(url.searchParams.get('seq').slice(3));
      return respond(200,role==='outsider'?[]:events.filter(event=>event.seq>cursor));
    }
    if(path.endsWith('/gostudy_classroom_send')){
      const {p_room,p_kind,p_payload}=req.postDataJSON();
      assert.equal(p_room,roomId);
      assert.ok(['chat','page','word'].includes(p_kind));
      if(p_kind==='page'){
        assert.ok(['presence','move'].includes(p_payload.action));
        assert.ok(Number.isInteger(p_payload.page)&&p_payload.page>=0&&p_payload.page<7);
        if(p_payload.action==='move')assert.equal(role,'teacher');
      }
      if(role==='outsider')return respond(200,false);
      events.push({seq:events.length+1,actor:user.id,kind:p_kind,payload:p_payload});
      if(p_kind==='word')words.set(p_payload.en.toLowerCase(),{user_id:studentId,word_key:p_payload.en.toLowerCase(),english:p_payload.en,russian:p_payload.ru});
      return respond(200,true);
    }
    if(path.endsWith('/gostudy_progress')){
      if(method==='GET')return respond(200,[saved.get(user.id)].filter(Boolean));
      const record=req.postDataJSON();
      assert.equal(record.user_id,user.id);
      assert.equal(record.lesson_key,'ielts-reading-04');
      saved.set(user.id,record);
      return respond(201,[]);
    }
    if(path.endsWith('/gostudy_vocabulary_items')){
      if(method==='GET')return respond(200,[...words.values()]);
      assert.equal(role,'student','Only the student should save words');
      for(const item of req.postDataJSON())words.set(item.word_key,item);
      return respond(201,[]);
    }
    return respond(200,[]);
  };
  try{
    for(const session of [context,teacher,outsider]){
      await session.route('https://kawfqlohguwvmmplvrny.supabase.co/**',api);
      await session.route('https://translate.googleapis.com/**',route=>{
        const request=new URL(route.request().url());
        translationRequests.push(request.searchParams.get('q'));
        assert.equal(request.searchParams.get('sl'),'en');
        assert.equal(request.searchParams.get('tl'),'ru');
        return route.fulfill({json:[[['искусственное освещение',request.searchParams.get('q'),null,null]]]});
      });
    }
    const page=await context.newPage();
    await page.goto(origin+'/student-ielts-reading.html');
    await page.locator('#gostudyAccessGate:visible').waitFor();
    assert.equal(await page.locator('main:visible').count(),0,'Private dashboard visible before authentication');
    assert.ok(await page.locator('.top .brand>a svg').count()>=1,'Shared GoStudy cabinet emblem missing');
    await page.locator('#gsEmail').fill('daria@example.invalid');
    await page.locator('#gsPassword').fill('test-password');
    await page.locator('#gostudyAccessForm button').click();
    await page.locator('main:visible .lesson-card').waitFor();
    assert.ok(await page.locator('.vocab-feature--practice').isVisible(),'Shared vocabulary practice missing');
    await page.locator('.lesson-card').click();
    await page.waitForURL(/ielts-reading-04.html/);
    await page.locator('#lessonPages>.page.active').waitFor();
    assert.ok(await page.locator('.video-workspace').isVisible(),'Shared lesson video shell missing');
    assert.ok(await page.locator('.lesson-brand').isVisible(),'Shared lesson header missing');
    assert.equal(await page.locator('.gostudy-ielts-passage').count(),1,'RLS-sourced passage missing');
    assert.equal(contentFetches,1,'Private content should be requested once after login');
    const teacherPage=await teacher.newPage();
    await teacherPage.goto(origin+'/gostudy-teacher.html');
    await teacherPage.locator('#teacher-email').fill(users.teacher.email);
    await teacherPage.locator('#teacher-password').fill('test-password');
    await teacherPage.locator('#teacher-login button').click();
    const classroom=teacherPage.locator('.teacher-student-row').filter({hasText:'Дарья'}).getByRole('link',{name:/Войти в класс/});
    await teacherPage.addInitScript(student=>{
      if(location.pathname!=='/ielts-reading-04.html')return;
      sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
        user:student,access_token:'test-student',expires_at:Date.now()+3600000
      }));
    },users.student);
    await classroom.click();
    await teacherPage.waitForURL(origin+'/ielts-reading-04.html?classStudent='+studentId);
    for(const participant of [page,teacherPage]){
      await participant.locator('#finance-live-status').getByText('Онлайн · общая комната').waitFor();
      await participant.locator('#finance-messages').getByText('Ранее сохранённое сообщение').waitFor();
    }
    assert.equal(await teacherPage.locator('.lesson-brand').getAttribute('href'),
      'gostudy-teacher.html?selected='+encodeURIComponent('ielts_reading:'+studentId));

    async function sendMessage(participant,other,message){
      const form=participant.locator('#finance-chat-form');
      await form.getByRole('textbox').fill(message);
      await form.getByRole('button').click();
      await participant.locator('#finance-messages .chat-own').getByText(message,{exact:true}).waitFor();
      await other.locator('#finance-messages li:not(.chat-own)').getByText(message,{exact:true}).waitFor();
    }
    await sendMessage(page,teacherPage,'Сообщение ученицы');
    await sendMessage(teacherPage,page,'Ответ преподавателя');
    assert.deepEqual(events.slice(1).filter(event=>event.kind==='chat').map(event=>event.actor),[studentId,teacherId]);

    const divider=page.locator('#lessonDivider');
    const box=await divider.boundingBox();
    const originalWidth=(await page.locator('#lessonVideo').boundingBox()).width;
    await page.mouse.move(box.x+box.width/2,box.y+100);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+130,box.y+100,{steps:5});
    await page.mouse.up();
    assert.ok((await page.locator('#lessonVideo').boundingBox()).width>originalWidth+80,'Dragging should resize the video');
    const dragged=Number(await divider.getAttribute('aria-valuenow'));
    await divider.press('ArrowLeft');
    assert.equal(Number(await divider.getAttribute('aria-valuenow')),dragged-2);

    async function selectPhrase(participant,touch=false){
      await participant.locator('.lesson-section-menu summary').click();
      await participant.locator('#lessonSections [data-page="1"]').click();
      const passage=participant.locator('.gostudy-ielts-passage p');
      await passage.scrollIntoViewIfNeeded();
      await passage.evaluate((element,touch)=>{
        const node=element.lastChild;
        const phrase='artificial lighting';
        const start=node.textContent.indexOf(phrase);
        const range=document.createRange();
        range.setStart(node,start);
        range.setEnd(node,start+phrase.length);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        element.dispatchEvent(new Event(touch?'touchend':'mouseup',{bubbles:true}));
      },touch);
      await participant.locator('#selectionTranslate').waitFor();
      await participant.waitForFunction(()=>document.querySelector('#selectionTarget').value==='искусственное освещение');
    }
    await selectPhrase(page);
    assert.ok(translationRequests.includes('artificial lighting'),'Google must translate the selected expression itself');
    await page.locator('#selectionSave').click();
    await page.locator('#selectionSave').getByText('✓').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#selectionTranslate').waitFor({state:'hidden'});
    await teacherPage.setViewportSize({width:390,height:844});
    assert.equal(await teacherPage.locator('#lessonDivider').isVisible(),false);
    await selectPhrase(teacherPage,true);
    assert.equal(await teacherPage.locator('#selectionSave').isVisible(),true,'Teacher can save translated words for Daria');
    await teacherPage.locator('#selectionSave').click();
    await teacherPage.locator('#selectionSave').getByText('✓').waitFor();
    await teacherPage.keyboard.press('Escape');

    await page.locator('.lesson-section-menu summary').click();
    await page.locator('#lessonSections [data-page="2"]').click();
    await page.locator('#reading-answer-1').selectOption('A');
    await page.waitForTimeout(1600);
    assert.equal(saved.get(studentId)?.state.answers['1'],'A','Cloud answer was not persisted');
    await page.locator('.lesson-section-menu summary').click();
    await page.locator('#lessonSections [data-page="6"]').click();
    await page.locator('#reading-words .term button').first().click();
    await page.waitForTimeout(1700);
    assert.ok(words.has('migration'),'Vocabulary did not synchronize to private cloud');
    assert.equal(words.get('artificial lighting')?.russian,'искусственное освещение');
    await page.reload();
    await page.locator('#lessonPages>.page.active').waitFor();
    await page.locator('.lesson-section-menu summary').click();
    await page.locator('#lessonSections [data-page="2"]').click();
    assert.equal(await page.locator('#reading-answer-1').inputValue(),'A','Saved answer was not restored');
    await page.locator('#finance-messages').getByText('Ответ преподавателя',{exact:true}).waitFor();
    await page.locator('#gostudyAccessSignout').click();
    await page.locator('#gostudyAccessGate:visible').waitFor();
    assert.equal(await page.locator('#finance-messages').count(),0,'Signing out should remove chat history from the page');

    const unrelated=await outsider.newPage();
    await unrelated.goto(origin+'/ielts-reading-04.html');
    await unrelated.locator('#gsEmail').fill(users.outsider.email);
    await unrelated.locator('#gsPassword').fill('test-password');
    await unrelated.locator('#gostudyAccessForm button').click();
    await unrelated.getByText('У этого аккаунта нет доступа к данному кабинету.').waitFor();
    assert.equal(await unrelated.locator('.layout').count(),0);
    assert.equal(logins,3);
    const guest=await browser.newContext();
    try{
      await guest.route('https://kawfqlohguwvmmplvrny.supabase.co/**',route=>route.fulfill({status:401,contentType:'application/json',body:'{"message":"unauthorized"}'}));
      const pp=await guest.newPage();
      await pp.goto(origin+'/ielts-reading-04.html');
      await pp.locator('#gostudyAccessGate:visible').waitFor();
      await pp.waitForTimeout(150);
      assert.equal(await pp.locator('.gostudy-ielts-passage').count(),0,'Private passage exposed to guest');
      assert.equal(await pp.locator('.layout:visible').count(),0,'Private classroom exposed before login');
    }finally{await guest.close();}
    console.log('Daria IELTS: both roles, shared chat, split pane, shared Google selection, teacher word saving, cloud answers and vocabulary verified in browser mocks');
  }finally{await Promise.all([context.close(),teacher.close(),outsider.close()]);}
}

async function checkStudentWithoutCourse(browser, origin) {
  const teacher = {id:'11111111-1111-4111-8111-111111111111',email:'teacher@example.invalid'};
  const pupilId = '22222222-2222-4222-8222-222222222222';
  const pupilEmail = 'new-student@example.invalid';
  const password = 'test-password';
  const project = 'https://kawfqlohguwvmmplvrny.supabase.co';
  const createPath = '/functions/v1/gostudy-add-student';
  let student, assignedCourse, handler;
  const fakeAuth = async (url, options) => {
    const path = new URL(url).pathname;
    const data = options.body ? JSON.parse(options.body) : null;
    if (path === '/auth/v1/user') {
      return Response.json(options.headers.authorization === 'Bearer teacher-token' ? teacher : student);
    }
    if (path.endsWith('/gostudy_my_destinations')) {
      return Response.json(options.headers.authorization === 'Bearer teacher-token' ? [{course:'teacher'}] : []);
    }
    assert.equal(options.headers.authorization,'Bearer test-service-key');
    if (path.endsWith('/gostudy_provision_student')) {
      assert.equal(data.p_teacher,teacher.id);
      assert.equal(data.p_email,pupilEmail);
      if (data.p_enroll) {
        assert.ok(data.p_course,'An empty course must never call enrollment');
        assignedCourse = data.p_course;
      }
      return Response.json(student?.id || null);
    }
    if (path === '/auth/v1/admin/users') {
      assert.equal(data.email,pupilEmail);
      assert.equal(data.password,password);
      student = {id:pupilId,email:data.email,app_metadata:data.app_metadata};
      return Response.json(student,{status:201});
    }
    if (path === '/auth/v1/admin/users/'+pupilId) return Response.json(student);
    throw new Error('Unexpected endpoint '+path);
  };
  const source = await readFile('supabase/functions/gostudy-add-student/index.ts','utf8');
  runInNewContext(source,{
    Deno:{serve:callback=>{handler=callback;},env:{get:key=>({
      SUPABASE_URL:project,SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',
    })[key]}},
    fetch:fakeAuth,Response,AbortSignal,TextEncoder,
  });

  const teacherContext = await browser.newContext();
  const studentContext = await browser.newContext({viewport:{width:390,height:844}});
  const request = async route => {
    const input = route.request();
    const path = new URL(input.url()).pathname;
    const isTeacher = input.headers().authorization === 'Bearer teacher-token';
    const payload = () => input.postDataJSON();
    if (path === createPath) {
      const result = await handler(new Request(input.url(),{
        method:'POST',headers:{authorization:input.headers().authorization},body:input.postData(),
      }));
      return route.fulfill({status:result.status,json:await result.json()});
    }
    if (path === '/auth/v1/token') {
      const {email,password:submitted} = payload();
      assert.equal(submitted,password);
      const user = email === teacher.email ? teacher : student;
      assert.equal(user?.email,email);
      return route.fulfill({json:{user,access_token:user === teacher?'teacher-token':'student-token',refresh_token:'test-refresh',expires_in:3600}});
    }
    if (path.endsWith('/gostudy_my_destinations')) {
      return route.fulfill({json:isTeacher ? [{course:'teacher'}] : assignedCourse ? [{course:assignedCourse.replaceAll('_','-')}] : []});
    }
    if (path.endsWith('/gostudy_students_without_course')) {
      assert.ok(isTeacher);
      return route.fulfill({json:student ? [{id:student.id,email:student.email}] : []});
    }
    if (path.endsWith('/gostudy_travel_a2_teacher_view')) {
      const enrolled = [{id:'33333333-3333-4333-8333-333333333333',label:'Existing student'}];
      if (assignedCourse) enrolled.push({id:student.id,label:student.email});
      return route.fulfill({json:enrolled});
    }
    return route.fulfill({json:[]});
  };
  try {
    await Promise.all([teacherContext,studentContext].map(context=>context.route(project+'/**',request)));
    const tp=await teacherContext.newPage();
    await tp.goto(origin+'/gostudy-teacher.html');
    await tp.locator('#teacher-email').fill(teacher.email);
    await tp.locator('#teacher-password').fill(password);
    await tp.locator('#teacher-login button').click();
    const form=tp.locator('#teacher-add-student');
    await form.locator('summary').click();
    const course=form.locator('select');
    assert.equal(await course.inputValue(),'');
    assert.equal(await course.locator('option').first().textContent(),'— Без курса');
    async function create() {
      await form.locator('input[type=email]').fill(pupilEmail);
      await form.locator('input[type=password]').fill(password);
      await form.getByRole('button',{name:/Создать аккаунт/}).click();
    }
    await create();
    await form.getByRole('status').getByText(/Личный кабинет создан/).waitFor();
    const roster=tp.locator('.teacher-student-row').filter({hasText:pupilEmail});
    await roster.getByText('Без курса',{exact:true}).waitFor();
    assert.equal(await roster.getByRole('link',{name:/Войти в класс/}).count(),0);
    assert.equal(assignedCourse,undefined);
    const retry=await handler(new Request(project+createPath,{method:'POST',
      headers:{authorization:'Bearer teacher-token'},body:JSON.stringify({email:pupilEmail,password,course:null}),
    }));
    assert.equal(retry.status,200);
    const denied=await handler(new Request(project+createPath,{method:'POST',
      headers:{authorization:'Bearer student-token'},body:JSON.stringify({email:pupilEmail,password,course:null}),
    }));
    assert.equal(denied.status,403);

    const sp=await studentContext.newPage();
    await sp.goto(origin+'/login.html');
    await sp.locator('#unified-login-email').fill(pupilEmail);
    await sp.locator('#unified-password').fill(password);
    await sp.locator('#unified-login button[type=submit]').click();
    await sp.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();
    await sp.getByText('Преподаватель пока не назначил курс.').waitFor();
    assert.equal(await sp.locator('#unified-destinations button').count(),0);
    await sp.reload();
    await sp.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();

    await course.selectOption('travel_a2');
    await create();
    await form.getByRole('status').getByText(/Курс назначен/).waitFor();
    await roster.getByRole('link',{name:/Войти в класс/}).waitFor();
    assert.equal(await roster.count(),1);
    await sp.reload();
    await sp.waitForURL('**/student-travel-a2.html');
    console.log('No-course onboarding: teacher creation, retry, authorization, mobile empty cabinet, reload and later enrollment verified');
  } finally {
    await Promise.all([teacherContext.close(),studentContext.close()]);
  }
}


async function checkVietnamA2PrivateClassroom(browser,origin){
  // Synthetic sessions only. Live Supabase authorization is verified separately under authenticated JWTs.
  const studentId='b0a90cf8-3144-421f-8cc8-5ed893c28350';
  const teacherId='acf2f6a1-f38b-45ef-836d-6cc9a9a5a832';
  const roomId='77777777-7777-4777-8777-777777777777';
  const rooms={
    'my-trip-to-vietnam-a2.html':roomId,
    'my-trip-to-vietnam-a2-homework.html':'88888888-8888-4888-8888-888888888888',
    'english-placement.html':'99999999-9999-4999-8999-999999999999',
  };
  const ids={student:studentId,teacher:teacherId,outsider:'00000000-0000-4000-8000-000000000001'};
  const events=new Map(Object.values(rooms).map(id=>[id,[]]));
  const saved=new Map(),mastery=[];
  const courseData=await readFile('assets/gostudy-sync.js','utf8');
  assert.ok(courseData.includes("lesson:'my-trip-to-vietnam-a2.html'"),'Teacher course must point at the new lesson');
  const configs=[
    ['my-trip-to-vietnam-a2.html',7,60,'gostudy-vietnam-a2-20261118-v1'],
    ['my-trip-to-vietnam-a2-homework.html',3,0,'gostudy-vietnam-a2-homework-20261118-v1'],
  ];
  for(const [path,pages,mins,key] of configs){
    const html=await readFile(path,'utf8');
    const config=JSON.parse(html.split('id="vietnam-content">')[1].split('</script>')[0]);
    assert.equal(config.steps.length,pages);
    assert.equal(config.steps.reduce((n,s)=>n+s.minutes,0),mins);
    assert.equal(config.key,key);
    assert.equal(config.wordsKey,'gostudy-english-placement-vocabulary');
  }
  const student=await browser.newContext({viewport:{width:1360,height:900}});
  const teacher=await browser.newContext({viewport:{width:1360,height:900}});
  const outsider=await browser.newContext();
  const route=async(r)=>{
    const request=r.request(),url=new URL(request.url()),method=request.method();
    const actor=(request.headers().authorization||'').replace('Bearer test-','');
    const target=ids[actor];
    const answer=(status,data)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/auth/v1/user')return answer(target?200:401,target?{id:target,email:actor+'@example.invalid'}:{});
    if(url.pathname==='/auth/v1/token'){
      const email=request.postDataJSON()?.email||'';
      const who=email.startsWith('teacher')?'teacher':'student';
      return answer(200,{user:{id:ids[who],email},access_token:'test-'+who,refresh_token:'test',expires_in:3600});
    }
    if(!target)return answer(401,{});
    if(url.pathname.endsWith('/gostudy_my_destinations'))return answer(200,actor==='teacher'?[{course:'teacher'}]:[{course:'english-placement'}]);
    if(url.pathname.endsWith('/gostudy_legacy_teacher_view')){
      if(actor==='teacher')return answer(200,[{id:studentId,label:'Vietnam A2 student',email:'student@example.invalid'}]);
      return answer(200,[]);
    }
    if(url.pathname.endsWith('/gostudy_classroom_rooms')){
      const lesson=(url.searchParams.get('lesson_path')||'').slice(3);
      const student=(url.searchParams.get('student_id')||'').slice(3);
      const found=rooms[lesson]&&student===studentId&&actor!=='outsider';
      return answer(200,found?[{id:rooms[lesson],student_id:studentId,teacher_id:teacherId,student_label:'Vietnam A2 student'}]:[]);
    }
    if(url.pathname.endsWith('/gostudy_classroom_events')){
      const room=(url.searchParams.get('room_id')||'').slice(3);
      const seq=Number((url.searchParams.get('seq')||'gt.0').slice(3));
      return answer(200,(events.get(room)||[]).filter(v=>v.seq>seq));
    }
    if(url.pathname.endsWith('/gostudy_classroom_send')){
      const body=request.postDataJSON();
      const list=events.get(body.p_room)||[];
      list.push({seq:list.length+1,actor:target,kind:body.p_kind,payload:body.p_payload});
      events.set(body.p_room,list);return answer(200,true);
    }
    if(url.pathname.endsWith('/gostudy_finance_word_progress')){
      if(method==='POST')mastery.push(request.postDataJSON());
      return answer(200,mastery);
    }
    if(url.pathname.endsWith('/gostudy_progress')){
      if(method==='GET')return answer(200,[...saved.values()]);
      const data=request.postDataJSON();saved.set(data.lesson_key,data);return answer(201,[data]);
    }
    if(url.pathname.endsWith('/gostudy_vocabulary_items'))return answer(200,[]);
    return answer(200,[]);
  };
  try{
    for(const [context,role] of [[student,'student'],[teacher,'teacher'],[outsider,'outsider']]){
      await context.addInitScript(({id,role})=>{
        sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
          user:{id,email:role+'@example.invalid'},access_token:'test-'+role,refresh_token:'test',expires_at:Date.now()+3600000
        }));
      },{id:ids[role],role});
      await context.route('https://*.supabase.co/**',route);
    }
    const sp=await student.newPage();
    await sp.goto(origin+'/student-english-placement.html');
    await sp.locator('.lesson-card-link').waitFor();
    assert.equal(await sp.locator('.lesson-card-link').getAttribute('href'),'my-trip-to-vietnam-a2.html');
    assert.equal(await sp.locator('#assignment').getAttribute('href'),'my-trip-to-vietnam-a2-homework.html','Homework must open the assigned PDF tasks');
    await sp.locator('#assignment').waitFor({state:'visible'});
    assert.ok(await sp.locator('#assignment').isVisible(),'Assigned homework must actually be visible, not merely linked in the DOM');
    assert.ok((await sp.locator('#assignment').boundingBox())?.width>150,'Homework tile must occupy visible desktop space');
    const guest=await outsider.newPage();
    await guest.goto(origin+'/student-english-placement.html');
    await guest.locator('#gostudyAccessMessage').getByText('У этого аккаунта нет доступа к данному кабинету.').waitFor();
    assert.equal(await guest.locator('main:visible').count(),0,'Outsider should not see student dashboard');
    await sp.locator('.lesson-card-link').click();
    await sp.waitForURL(/my-trip-to-vietnam-a2.html/);
    await sp.locator('#lessonPages>.page.active').waitFor();
    await sp.waitForFunction(()=>document.querySelector('#finance-live-status')?.textContent?.trim()==='Онлайн · общая комната');
    assert.equal(await sp.locator('#lessonPages>.page').count(),7);
    const desktopListeningText=await sp.locator('#page-3').textContent();
    assert.ok(!/Your teacher reads the conversation twice|No audio file is included in the original PDF/.test(desktopListeningText),'Desktop Vietnam lesson must not render the removed Important notice');
    assert.equal(await sp.locator('#page-3').getByText('Important',{exact:true}).count(),0,'Desktop listening page must have no Important banner');
    assert.equal(await sp.locator('a.call-btn').getAttribute('href'),'https://telemost.yandex.ru/');
    assert.equal(await sp.locator('#selectionTranslate').count(),1);
    await sp.locator('[data-exercise-field="vnm-welcome-note"]').fill('I prefer travelling with family.');
    await sp.locator('#next').click();
    await sp.locator('#next').click();
    await sp.locator('#page-2.active').waitFor();
    await sp.locator('#page-2 [data-exercise-field="vnm-g1-0"]').fill('get up');
    await sp.getByRole('button',{name:'Check answers'}).click();
    await sp.locator('#page-2 .feedback.good').first().waitFor();
    await sp.reload();
    await sp.locator('#page-2.active [data-exercise-field="vnm-g1-0"]').waitFor();
    assert.equal(await sp.locator('[data-exercise-field="vnm-g1-0"]').inputValue(),'get up');
    const tp=await teacher.newPage();
    await tp.goto(origin+'/my-trip-to-vietnam-a2.html?classStudent='+studentId);
    await tp.waitForFunction(()=>document.querySelector('#finance-live-status')?.textContent?.trim()==='Онлайн · общая комната');
    await tp.locator('#moveStudent').waitFor();
    await tp.locator('#moveStudent').click();
    await sp.locator('#page-0.active').waitFor();
    await sp.locator('#finance-chat-form input').fill('Test Vietnam A2 class message');
    await sp.locator('#finance-chat-form button').click();
    await tp.locator('#finance-messages').getByText('Test Vietnam A2 class message',{exact:true}).waitFor();
    await tp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await tp.locator('#dictionarySource').fill('travel');
    await tp.locator('#dictionaryTranslation').fill('путешествовать');
    await tp.locator('#dictionaryAddForm button').click();
    await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
    await sp.locator('#myWords').getByText('путешествовать',{exact:false}).waitFor();
    await sp.getByRole('button',{name:'Close dictionary'}).click();
    await sp.locator('#next').click();
    await sp.locator('#page-1.active .vocab article b').first().waitFor();
    await sp.locator('#page-1 .vocab article b').first().evaluate(node=>{
      const selection=window.getSelection(),range=document.createRange();
      range.selectNodeContents(node);selection.removeAllRanges();selection.addRange(range);
      document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    });
    await sp.locator('#selectionTranslate.is-visible').waitFor();
    await tp.getByRole('button',{name:'Close dictionary'}).click();
    // Reset the actual opening section, not whichever reset button happens to be visible
    // after the teacher/student navigation events. Preserve the real-time reset assertion.
    await tp.locator('.lesson-section-menu summary').click();
    await tp.locator('#lessonSections button').first().click();
    await tp.locator('#page-0.active').waitFor();
    // Programmatically dispatch a click on the explicit section reset.
    // Realtime presence can independently navigate the teacher between visibility checks.
    await tp.locator('#page-0 .finance-reset').evaluate(button=>button.click());
    await sp.waitForFunction(()=>document.querySelector('[data-exercise-field="vnm-welcome-note"]')?.value==='');
    await sp.reload();
    await sp.locator('#page-1.active').waitFor();
    await sp.locator('#back').click();
    await sp.locator('#page-0.active [data-exercise-field="vnm-welcome-note"]').waitFor();
    assert.equal(await sp.locator('[data-exercise-field="vnm-welcome-note"]').inputValue(),'','Teacher reset must clear the opening answer');
    await sp.goto(origin+'/student-english-placement.html');
    await sp.locator('#openWords').click();
    await sp.locator('#words').getByText('travel',{exact:true}).waitFor();
    await sp.locator('#practiceFromWords').click();
    await sp.locator('[data-mode="type"]').click();
    await sp.locator('#practiceInput').fill('travel');
    await sp.locator('#practiceTypeForm button').click();
    await sp.locator('#practiceAnswer[data-correct="true"]').waitFor();
    await sp.waitForFunction(()=>window.FinanceLive?.words().some(word=>word.en==='travel' && word.learned));
    assert.equal(mastery[0]?.word_key,'travel','Training should persist studied status in the private classroom');
    const homework=await student.newPage();
    await homework.goto(origin+'/my-trip-to-vietnam-a2-homework.html');
    await homework.locator('#lessonPages>.page.active').waitFor();
    assert.equal(await homework.locator('#lessonPages>.page').count(),3);
    await homework.locator('[data-exercise-field="vnm-hw-writing"]').fill('I usually wake up early. I like travelling.');
    await homework.reload();
    await homework.locator('#lessonPages>.page.active').waitFor();
    assert.equal(await homework.locator('[data-exercise-field="vnm-hw-writing"]').inputValue(),'I usually wake up early. I like travelling.');
    const mobile=await student.newPage();
    await mobile.setViewportSize({width:390,height:844});
    await mobile.goto(origin+'/student-english-placement.html');
    await mobile.locator('.lesson-card-link').waitFor();
    await mobile.locator('#assignment').waitFor({state:'visible'});
    assert.equal(await mobile.locator('#assignment').getAttribute('href'),'my-trip-to-vietnam-a2-homework.html');
    assert.ok((await mobile.locator('#assignment').boundingBox())?.width>150,'Homework must occupy mobile layout space');
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Vietnam cabinet mobile overflow');
    await mobile.locator('.lesson-card-link').click();
    await mobile.locator('#lessonPages>.page.active').waitFor();
    for(let i=0;i<3;i++)await mobile.locator('#next').click();
    await mobile.locator('#page-3.active').waitFor();
    const mobileListeningText=await mobile.locator('#page-3.active').innerText();
    assert.ok(!/Your teacher reads the conversation twice|No audio file is included in the original PDF/.test(mobileListeningText),'Mobile Vietnam listening page must not show the removed Important notice');
    assert.equal(await mobile.locator('#page-3.active').getByText('Important',{exact:true}).count(),0,'Mobile listening page must have no Important banner');
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Vietnam lesson mobile overflow');
    await mobile.close();
    console.log('VIETNAM A2: private cabinet, lesson & homework, auto-grading, answer restore, teacher sync, chat, dictionary, move student, outsider and mobile verified');
  }finally{
    await Promise.all([student.close(),teacher.close(),outsider.close()]);
  }
}

async function main() {
  await checkVictoriaB2Methodology();
  await checkThreeProgressMeLessons();
  await checkTravelB2LessonMethodology();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.GOSTUDY_CHROME ? {executablePath: process.env.GOSTUDY_CHROME} : {});
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    await checkSharedComponentReversible(browser,origin);
    await checkStudentWithoutCourse(browser,origin);
    await checkDariaPrivateRoom(browser,origin);
    await checkVietnamA2PrivateClassroom(browser,origin);
    await checkFinanceRoom(browser, origin);
    await checkFinanceHomework(browser,origin);
    await checkGeneralB2Room(browser, origin);
    await checkMigratedRooms(browser, origin);
    const source = await readFile('assets/gostudy-sync.js', 'utf8');
    const catalog = runInNewContext('('+source.match(/const classroomCatalog = ([^\n]+);/)[1]+')');
    const studentId = '11111111-1111-4111-8111-111111111111';
    // Run the changed B1 parity case first, then all other regressions.
    const parityFirstCourses=Object.entries(catalog).sort(([a],[b])=>Number(b==='general_english_b1_stories')-Number(a==='general_english_b1_stories'));
    for (const [course, entry] of parityFirstCourses) {
      if (['business_ai','country_house','art_b1'].includes(course)) continue; // Covered by the v1 classroom and methodology suites above.
      const current = entry.lessons.at(-1);
      const expected = new URL(current.lesson, origin).pathname;
      const student = await browser.newContext();
      const teacher = await browser.newContext();
      const assigned = [];
      const progress = new Map();
      const roomEvents = [];
      const mastery = [];
      try {
        for (const [context, role] of [[student, 'student'], [teacher, 'teacher']]) {
          await context.addInitScript(({ id }) => {
            const value = JSON.stringify({ user: { id }, access_token: 'test', refresh_token: 'test', expires_at: Date.now() + 3600000 });
            sessionStorage.setItem('gostudy-cloud-session-v1', value);
          }, {id: role === 'student' ? studentId : 'teacher'});
          await context.route('https://*.supabase.co/**', route => {
            const url = route.request().url();
            const requestUrl = new URL(url);
            const action = requestUrl.pathname.split('/').at(-1);
            const data = route.request().postDataJSON() || {};
            if (course === 'finance_b1' || course === 'feed_b2' || course === 'pharma_c1' || course === 'first_sales') {
              const actor = role === 'teacher' ? 'teacher' : studentId;
              if (action === 'gostudy_classroom_rooms' && requestUrl.searchParams.get('course') === 'eq.'+(course === 'feed_b2' ? 'feed-b2' : course === 'pharma_c1' ? 'pharma-c1' : course === 'first_sales' ? 'first-sales' : 'finance-b1')) {
                return route.fulfill({json:[{id:course+'-room',student_id:studentId,teacher_id:'teacher'}]});
              }
              if (action === 'gostudy_classroom_events') {
                const cursor = Number(requestUrl.searchParams.get('seq').slice(3));
                return route.fulfill({json:roomEvents.filter(event => event.seq > cursor)});
              }
              if (action === 'gostudy_classroom_send') {
                assert.equal(data.p_room,course+'-room');
                roomEvents.push({seq:roomEvents.length+1,actor,kind:data.p_kind,payload:data.p_payload});
                return route.fulfill({json:true});
              }
              if (action === 'gostudy_finance_word_progress') {
                if (route.request().method() === 'POST') mastery.push(data);
                return route.fulfill({json:mastery});
              }
            }
            if (action === 'gostudy_progress') {
              if (route.request().method() === 'GET') return route.fulfill({json:[...progress.values()]});
              assert.equal(role, 'student');
              const key = data.lesson_key ?? requestUrl.searchParams.get('lesson_key')?.slice(3);
              const row = {...data, lesson_key:key};
              progress.set(key, row);
              return route.fulfill({json:[row]});
            }
            if (action.endsWith('_assign_word') || action.endsWith('_workbook_assign')) {
              assert.equal(role, 'teacher');
              assert.equal(data.p_student, studentId);
              assigned.push({en:data.p_en,ru:data.p_ru});
              return route.fulfill({json:true});
            }
            if (action.endsWith('_my_words') || action.endsWith('_workbook_read')) {
              return route.fulfill({json:assigned});
            }
            if (action === 'gostudy_b1_stories_content') {
              assert.equal(course, 'general_english_b1_stories');
              assert.equal(data.p_student, role === 'teacher' ? studentId : null);
              const key = data.p_homework ? current.homeworkKey : current.lessonKey;
              return route.fulfill({json:{
                key, title:current.title, level:'B1', cabinet:'student-general-english-b1-stories.html',
                steps:[{id:'test-choice',title:data.p_homework ? 'Homework' : 'What happened?',instruction:'Choose a reply.',type:'choice',items:[['What did they do?',['Changed dinner plans','Went home alone'],0]]}],
              }});
            }
            const rows = url.endsWith('gostudy_' + course + '_teacher_view')
              ? [{ id: studentId, label: 'Test student', words: [], assigned, progress: [...progress.values()].map(row => ({key:row.lesson_key, answers:row.state.answers})) }]
              : url.endsWith('gostudy_my_destinations')
                ? [{ course: role === 'teacher' ? 'teacher' : course.replaceAll('_', '-') }]
                : [];
            return route.fulfill({ json: rows });
          });
        }
        const sp = await student.newPage();
        const tp = await teacher.newPage();
        if (course === 'general_english_b1_stories') {
          await sp.goto(origin + '/student-travel-b2.html');
          await sp.waitForURL(url => url.pathname === '/student-general-english-b1-stories.html');
        } else await sp.goto(origin + (course === 'pharma_c1' ? '/student-pharma.html' : '/student-' + course.replaceAll('_', '-') + '.html'));
        await tp.goto(origin + '/gostudy-teacher.html');
        if (course === 'first_sales') {
          await sp.locator('#assignment[aria-disabled="true"]').waitFor();
          assert.equal(await sp.locator('.lesson-card-link').getAttribute('href'),'first-sales-c1-03.html');
          assert.equal(await sp.getByText('Пока не назначено',{exact:true}).count(),1);
          const guest=await browser.newPage();
          try{
            await guest.goto(origin+'/first-sales-c1-03.html');
            await guest.locator('.classroom-access').getByRole('link',{name:'Войти в GoStudy'}).waitFor();
            assert.equal(await guest.locator('#lessonPages').isVisible(),false);
          }finally{await guest.close();}
          await sp.locator('.lesson-card-link').click();
          await tp.locator('.teacher-student-row').filter({hasText:'Test student'}).getByRole('link',{name:/Войти в класс/}).click();
          for(const page of [sp,tp]){
            await page.waitForURL(url=>url.pathname===expected);
            await page.locator('#finance-live-status').getByText('Онлайн · общая комната',{exact:true}).waitFor();
            await page.getByRole('heading',{name:'From Discovery to Value: The Follow-Up That Wins Trust'}).first().waitFor();
            await page.getByRole('button',{name:'Dictionary',exact:true}).waitFor();
          }
          assert.equal(await sp.locator('#lessonPages>.page').count(),8);
          assert.equal(await sp.locator('a.call-btn').getAttribute('href'),'https://telemost.yandex.ru/');
          assert.equal(await sp.locator('#selectionTranslate').count(),1);
          const lesson=await sp.locator('#lesson-data').evaluate(node=>JSON.parse(node.textContent));
          assert.equal(lesson.cabinet,'student-first-sales.html');
          assert.equal(lesson.key,'gostudy-first-sales-c1-03-v1');
          assert.equal(lesson.wordsKey,'gostudy-first-sales-shared-v1');
          assert.equal(lesson.durationMinutes,50);
          assert.equal(lesson.steps.reduce((sum,step)=>sum+step.minutes,0),50);
          assert.equal(lesson.lessonWords.length,8);
          assert.equal(lesson.steps[1].html.includes('Jordan'),true);
          assert.equal(lesson.steps[4].html.includes('250 minutes'),true);
          assert.equal(lesson.steps[6].html.includes('fs3-email'),true);
          assert.equal(lesson.steps.some(step=>/homework/i.test(step.id)),false);
          const outsider=await browser.newContext();
          try{
            await outsider.addInitScript(()=>sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({user:{id:'outsider'},access_token:'test-outsider',refresh_token:'test',expires_at:Date.now()+3600000})));
            await outsider.route('https://*.supabase.co/**',route=>route.fulfill({json:[]}));
            const outsiderPage=await outsider.newPage();
            await outsiderPage.goto(origin+'/first-sales-c1-03.html');
            await outsiderPage.locator('.classroom-access').getByText('Для этого аккаунта нет доступа к комнате.').waitFor();
            assert.equal(await outsiderPage.locator('#lessonPages').isVisible(),false);
          }finally{await outsider.close();}
          await sp.locator('[data-exercise-field="fs3-recap-note"]').fill('We know they send reminders manually.');
          await tp.waitForFunction(()=>document.querySelector('[data-exercise-field="fs3-recap-note"]')?.value==='We know they send reminders manually.');
          await sp.locator('#next').click();
          await tp.locator('#moveStudent').waitFor();
          await tp.locator('#moveStudent').click();
          await sp.locator('#page-0.active').waitFor();
          await sp.locator('#next').click();
          await sp.locator('#next').click();
          await sp.locator('#page-2.active [data-lesson-word="0"]').click();
          await tp.locator('#finance-toast').filter({hasText:'qualification criteria'}).waitFor();
          await sp.locator('#page-2 .vocab article b').first().evaluate(node=>{
            const r=document.createRange();r.selectNodeContents(node);
            const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);
            document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
          });
          await sp.locator('#selectionTranslate.is-visible').waitFor();
          await sp.locator('#page-2 #fs3-match-1 summary').click();
          await sp.locator('#page-2 #fs3-match-1 button[data-choice="D"]').click();
          await sp.locator('#page-2 .feedback.good').first().filter({hasText:'Correct'}).waitFor();
          await sp.locator('#finance-chat-form input').fill('First Sales C1 continuation test');
          await sp.locator('#finance-chat-form button').click();
          await tp.locator('#finance-messages').getByText('First Sales C1 continuation test',{exact:true}).waitFor();
          await tp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await tp.locator('#dictionarySource').fill('value proposition');
          await tp.locator('#dictionaryTranslation').fill('ценностное предложение');
          await tp.locator('#dictionaryAddForm button').click();
          await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await sp.locator('#myWords').getByText('ценностное предложение',{exact:false}).waitFor();
          await tp.getByRole('button',{name:'Close dictionary'}).click();
          await tp.getByRole('button',{name:'Сбросить ответы'}).first().click();
          await sp.reload();
          await sp.locator('#page-2.active').waitFor();
          await sp.locator('#page-2 #fs3-match-1 summary').filter({hasText:'D'}).waitFor();
          assert.equal(await sp.locator('#page-2 .feedback.good').filter({hasText:'Correct'}).count(),1,'Other section answer should survive reset and reload');
          await sp.locator('#back').click();
          await sp.locator('#back').click();
          await sp.locator('#page-0.active [data-exercise-field="fs3-recap-note"]').waitFor();
          assert.equal(await sp.locator('[data-exercise-field="fs3-recap-note"]').inputValue(),'','Teacher reset must propagate to learner');
          await sp.goto(origin+'/student-first-sales.html');
          await sp.locator('#openWords').click();
          await sp.locator('#words').getByText('qualification criteria',{exact:true}).waitFor();
          await sp.locator('#practiceFromWords').click();
          await sp.locator('[data-mode="type"]').click();
          await sp.locator('#practiceInput').fill('qualification criteria');
          await sp.locator('#practiceTypeForm button').click();
          await sp.locator('#practiceAnswer[data-correct="true"]').waitFor();
          assert.equal(mastery[0]?.word_key,'qualification criteria');
          const mobile=await student.newPage();
          await mobile.setViewportSize({width:390,height:844});
          await mobile.goto(origin+'/student-first-sales.html');
          await mobile.locator('.lesson-card-link').waitFor();
          assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'First Sales mobile cabinet overflow');
          await mobile.locator('.lesson-card-link').click();
          await mobile.locator('#lessonPages>.page.active').waitFor();
          assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'First Sales mobile lesson overflow');
          await mobile.close();
          console.log('first_sales: canonical lesson 3, 50 minutes, no homework, teacher and student shared room, outsider gate, synchronized answers, grading, chat, dictionary, translation, reload, reset, word mastery, mobile verified');
          continue;
        }
        if (course === 'pharma_c1') {
          await sp.locator('#assignment[aria-disabled="true"]').waitFor();
          assert.equal(await sp.locator('.lesson-card-link').getAttribute('href'),'pharma-ai-evidence-c1-20261118.html');
          assert.equal(await sp.getByText('Пока не назначено',{exact:true}).count(),1);
          const guest=await browser.newPage();
          try {
            await guest.goto(origin+'/pharma-ai-evidence-c1-20261118.html');
            await guest.locator('.classroom-access').getByRole('link',{name:'Войти в GoStudy'}).waitFor();
            assert.equal(await guest.locator('#lessonPages').isVisible(),false);
          } finally {await guest.close();}
          await sp.locator('.lesson-card-link').click();
          await tp.locator('.teacher-student-row').filter({hasText:'Test student'}).getByRole('link',{name:/Войти в класс/}).click();
          for (const page of [sp,tp]) {
            await page.waitForURL(url=>url.pathname===expected);
            await page.locator('#finance-live-status').getByText('Онлайн · общая комната',{exact:true}).waitFor();
            await page.getByRole('heading',{name:'Can AI Really Invent New Medicines?'}).first().waitFor();
          }
          assert.equal(await sp.locator('#lessonPages>.page').count(),8);
          assert.equal(await sp.locator('a.call-btn').getAttribute('href'),'https://telemost.yandex.ru/');
          assert.equal(await sp.locator('#selectionTranslate').count(),1);
          const lesson=await sp.locator('#lesson-data').evaluate(node=>JSON.parse(node.textContent));
          assert.equal(lesson.durationMinutes,50);
          assert.equal(lesson.steps.reduce((sum,step)=>sum+step.minutes,0),50);
          assert.equal(lesson.lessonWords.length,18, '10 new words plus 8 legacy entries must remain');
          assert.equal(lesson.lessonWords[0].en,'clinical validation','legacy words must remain');
          assert.equal(lesson.lessonWords[8].en,'placebo-controlled');
          assert.deepEqual(lesson.steps.map(step=>step.minutes),[4,8,5,7,2,12,6,6]);
          assert.ok(lesson.steps[5].html.includes('XIbIu8cWSgw'),'PBS video embed must be present');
          assert.ok(lesson.steps[1].html.includes('Medical_Laboratory_Scientist_US_NIH.jpg'),'NIH public domain photo is required');
          assert.ok(lesson.steps[2].html.includes('Biology_Lab_Equipment'),'second public domain research image is required');
          assert.ok(lesson.steps[7].html.includes('aiClaim2'),'marketing rewrite must be present');
          assert.equal(lesson.steps.some(step=>/pitch|presentation/i.test(step.id)),false,'no separate ninth pitch task');
          const outsider=await browser.newContext();
          try {
            await outsider.addInitScript(()=>sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({user:{id:'outsider'},access_token:'test-outsider',refresh_token:'test',expires_at:Date.now()+3600000})));
            await outsider.route('https://*.supabase.co/**',route=>route.fulfill({json:[]}));
            const outsiderPage=await outsider.newPage();
            await outsiderPage.goto(origin+'/pharma-ai-evidence-c1-20261118.html');
            await outsiderPage.locator('.classroom-access').getByText('Для этого аккаунта нет доступа к комнате.').waitFor();
            assert.equal(await outsiderPage.locator('#lessonPages').isVisible(),false);
          } finally {await outsider.close();}
          await sp.locator('[data-exercise-field="aiLeadReason"]').fill('Clinical benefits have not yet been proven.');
          await tp.waitForFunction(()=>document.querySelector('[data-exercise-field="aiLeadReason"]')?.value==='Clinical benefits have not yet been proven.');
          await sp.locator('#next').click();
          await tp.locator('#moveStudent').waitFor();
          await tp.locator('#moveStudent').click();
          await sp.locator('#page-0.active').waitFor();
          await sp.locator('#next').click();
          await sp.locator('#next').click();
          await sp.locator('#next').click();
          await sp.locator('#page-3.active').waitFor();
          await sp.locator('#page-3 [data-lesson-word="8"]').click();
          await tp.locator('#finance-toast').filter({hasText:'placebo-controlled'}).waitFor();
          await sp.locator('#page-3 .vocab article b').first().evaluate(node=>{
            const r=document.createRange();r.selectNodeContents(node);
            const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);
            document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
          });
          await sp.locator('#selectionTranslate.is-visible').waitFor();
          await sp.locator('#page-3 #aiMatch1 summary').click();
          await sp.locator('#page-3 #aiMatch1 button[data-choice="C"]').click();
          await sp.locator('#page-3 .feedback.good').first().filter({hasText:'Correct'}).waitFor();
          await sp.locator('#next').click();
          await sp.locator('#next').click();
          await sp.locator('#page-5.active iframe[src*="XIbIu8cWSgw"]').waitFor();
          await sp.locator('#back').click();
          await sp.locator('#back').click();
          await sp.locator('#page-3.active').waitFor();
          await sp.locator('#finance-chat-form input').fill('Pharma C1 evidence review test');
          await sp.locator('#finance-chat-form button').click();
          await tp.locator('#finance-messages').getByText('Pharma C1 evidence review test',{exact:true}).waitFor();
          await tp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await tp.locator('#dictionarySource').fill('post-market surveillance');
          await tp.locator('#dictionaryTranslation').fill('пострегистрационный мониторинг');
          await tp.locator('#dictionaryAddForm button').click();
          await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await sp.locator('#myWords').getByText('пострегистрационный мониторинг',{exact:false}).waitFor();
          await tp.getByRole('button',{name:'Close dictionary'}).click();
          await tp.getByRole('button',{name:'Сбросить ответы'}).first().click();
          await sp.reload();
          await sp.locator('#page-3.active').waitFor();
          await sp.locator('#page-3 #aiMatch1 summary').filter({hasText:'C'}).waitFor();
          assert.equal(await sp.locator('#page-3 .feedback.good').filter({hasText:'Correct'}).count(),1,'Vocabulary answer should survive reset on another page and reload');
          await sp.locator('#back').click();
          await sp.locator('#back').click();
          await sp.locator('#back').click();
          await sp.locator('#page-0.active [data-exercise-field="aiLeadReason"]').waitFor();
          assert.equal(await sp.locator('[data-exercise-field="aiLeadReason"]').inputValue(),'','Teacher reset must propagate to learner');
          await sp.goto(origin+'/student-pharma.html');
          await sp.locator('#openWords').click();
          await sp.locator('#words').getByText('placebo-controlled',{exact:true}).waitFor();
          await sp.locator('#practiceFromWords').click();
          await sp.locator('[data-mode="type"]').click();
          await sp.locator('#practiceInput').fill('placebo-controlled');
          await sp.locator('#practiceTypeForm button').click();
          await sp.locator('#practiceAnswer[data-correct="true"]').waitFor();
          assert.equal(mastery[0]?.word_key,'placebo-controlled');
          const mobile=await student.newPage();
          await mobile.setViewportSize({width:390,height:844});
          await mobile.goto(origin+'/student-pharma.html');
          await mobile.locator('.lesson-card-link').waitFor();
          assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Pharma mobile cabinet overflow');
          await mobile.locator('.lesson-card-link').click();
          await mobile.locator('#lessonPages>.page.active').waitFor();
          assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Pharma mobile lesson overflow');
          await mobile.close();
          console.log('pharma_c1: new C1 science lesson, photos and video embed, 8 stages, no homework, teacher/learner sync, vocabulary and legacy preservation, grading, chat, reset, persistence, outsider and mobile verified');
          continue;
        }
        if (course === 'feed_b2') {
          await sp.locator('#assignment[aria-disabled="true"]').waitFor();
          assert.equal(await sp.locator('.lesson-card-link').getAttribute('href'),'korean-wave-b2-20261118.html');
          await sp.locator('.lesson-card-link').click();
          await tp.locator('.teacher-enter-class').click();
          for (const page of [sp,tp]) {
            await page.waitForURL(url => url.pathname === expected);
            await page.locator('#finance-live-status').getByText('Онлайн · общая комната',{exact:true}).waitFor();
            await page.getByRole('heading',{name:'Korean Wave: Who Influences Whom?'}).first().waitFor();
          }
          assert.equal(await sp.locator('#lessonPages>.page').count(),8);
          assert.equal(await sp.locator('#lessonPages audio').count(),0);
          for (const page of [sp,tp]) {
            await page.waitForFunction(() => {
              const photos = [...document.querySelectorAll('#page-0 .kw-photos img')];
              return photos.length === 2 && photos.every(photo => photo.complete && photo.naturalWidth > 0);
            });
            assert.match(await page.locator('#page-1 iframe').getAttribute('src'), /UTAKCFPYdOo\?end=180$/);
          }
          assert.equal(await sp.locator('a.call-btn').getAttribute('href'),'https://telemost.yandex.ru/');
          await sp.locator('#selectionTranslate').waitFor({state:'attached'});
          const outsider = await browser.newContext();
          try {
            await outsider.addInitScript(() => {
              sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({user:{id:'outsider'},access_token:'test-outsider',refresh_token:'test',expires_at:Date.now()+3600000}));
            });
            await outsider.route('https://*.supabase.co/**',route=>route.fulfill({json:[]}));
            const outsiderPage=await outsider.newPage();
            await outsiderPage.goto(origin+'/korean-wave-b2-20261118.html');
            await outsiderPage.locator('.classroom-access').getByText('Для этого аккаунта нет доступа к комнате.').waitFor();
            assert.equal(await outsiderPage.locator('#lessonPages').isVisible(),false,'Unrelated user must not see classroom data');
          } finally { await outsider.close(); }
          await sp.locator('[data-exercise-field="warm1"]').fill('Music crosses language barriers.');
          await tp.waitForFunction(() => document.querySelector('[data-exercise-field="warm1"]')?.value === 'Music crosses language barriers.');
          await sp.locator('#next').click();
          await tp.locator('#moveStudent').waitFor();
          await tp.locator('#moveStudent').click();
          await sp.locator('#page-0.active').waitFor();
          await sp.locator('#next').click();
          const videoOpinion = '[data-exercise-field="video-opinion"]';
          await sp.locator(videoOpinion).fill('I would keep the Korean folklore.');
          await tp.waitForFunction(selector => document.querySelector(selector)?.value === 'I would keep the Korean folklore.', videoOpinion);
          await sp.locator('#next').click();
          const choice=sp.locator('#page-2 .definition-picker').first();
          await choice.locator('summary').click();
          await choice.getByRole('button',{name:/break into the mainstream/}).click();
          await sp.locator('#page-2 .feedback').first().filter({hasText:'Correct'}).waitFor();
          await sp.locator('#finance-chat-form input').fill('Korean Wave classroom test');
          await sp.locator('#finance-chat-form button').click();
          await tp.locator('#finance-messages').getByText('Korean Wave classroom test',{exact:true}).waitFor();
          await tp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await tp.locator('#dictionarySource').fill('cultural exchange');
          await tp.locator('#dictionaryTranslation').fill('культурный обмен');
          await tp.locator('#dictionaryAddForm button').click();
          await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await sp.locator('#myWords').getByText('культурный обмен',{exact:false}).waitFor();
          await sp.reload();
          await sp.locator('#page-2.active .definition-picker').first().waitFor();
          assert.match(await sp.locator('#page-2 .definition-picker summary').first().innerText(),/break into the mainstream/);
          assert.equal(await sp.locator(videoOpinion).inputValue(),'I would keep the Korean folklore.');
          await sp.locator('#next').click();
          const match = sp.locator('#match-folklore');
          await match.locator('summary').click();
          await match.getByRole('button',{name:'folklore',exact:true}).click();
          await match.locator('..').getByText('✓ Correct',{exact:true}).waitFor();
          await sp.locator('#next').click();
          await sp.locator('#next').click();
          await sp.locator('#next').click();
          const decision = '[data-exercise-field="filmtradeoff"]';
          await sp.locator(decision).fill('I would keep the scene and add a short introduction.');
          await tp.waitForFunction(selector => document.querySelector(selector)?.value === 'I would keep the scene and add a short introduction.', decision);
          await sp.reload();
          await sp.locator('#page-6.active').waitFor();
          assert.equal(await sp.locator(decision).inputValue(),'I would keep the scene and add a short introduction.');
          await sp.locator('#next').click();
          await sp.locator('#page-7.active').waitFor();
          await sp.getByRole('heading',{name:'From Seoul to Russia: K-pop beyond the music'}).first().waitFor();
          assert.equal(await sp.locator('#page-7 .definition-picker').count(),6,'Six K-pop Russia vocabulary selectors must render');
          assert.equal(await sp.locator('#page-7 textarea[data-exercise-field]').count(),6,'Five reading questions and one speaking prompt must render');
          await sp.goto(origin+'/student-feed-b2.html');
          await sp.locator('#openWords').click();
          await sp.locator('#words').getByText('cultural exchange',{exact:true}).waitFor();
          await sp.locator('#practiceFromWords').click();
          await sp.locator('[data-mode="type"]').click();
          await sp.locator('#practiceInput').fill('cultural exchange');
          await sp.locator('#practiceTypeForm button').click();
          await sp.locator('#practiceAnswer[data-correct="true"]').waitFor();
          assert.equal(mastery[0]?.word_key,'cultural exchange');
          const mobile = await student.newPage();
          await mobile.setViewportSize({width:390,height:844});
          await mobile.goto(origin+'/student-feed-b2.html');
          assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),'Feed B2 mobile cabinet overflow');
          await mobile.locator('.lesson-card-link').click();
          await mobile.locator('#lessonPages>.page.active').waitFor();
          assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),'Feed B2 mobile lesson overflow');
          await mobile.locator('.lesson-section-menu summary').click();
          await mobile.locator('#lessonSections button').nth(0).click();
          await mobile.locator('#page-0.active .kw-photos').waitFor();
          assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),'Feed B2 mobile photo overflow');
          await mobile.locator('#next').click();
          await mobile.locator('#page-1.active .kw-video').waitFor();
          assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),'Feed B2 mobile video overflow');
          await mobile.close();
          console.log('feed_b2: photos, video discussion, matching, saved choices and writing, shared room, chat, words, mastery, reload and mobile verified');
          continue;
        }
        if (course === 'finance_b1') {
          const guest = await browser.newPage();
          try {
            await guest.goto(origin+'/student-finance-b1.html');
            await guest.getByRole('link',{name:'Открыть урок',exact:true}).click();
            await guest.locator('.classroom-access').getByRole('link',{name:'Войти в GoStudy'}).waitFor();
            assert.equal(await guest.locator('#lessonPages').isVisible(),false);
          } finally {
            await guest.close();
          }
          await sp.locator('#assignment[aria-disabled="true"]').waitFor();
          await sp.locator('.lesson-card-link').click();
          await tp.locator('.teacher-enter-class').click();
          for (const page of [sp,tp]) {
            await page.waitForURL(url => url.pathname === expected);
            await page.locator('header .lesson-brand').waitFor();
            await page.locator('#finance-live-status').getByText('Онлайн · общая комната',{exact:true}).waitFor();
          }
          assert.equal(await sp.locator('#lessonPages>.page').count(),6);
          await sp.locator('[data-exercise-field="warm1"]').fill('I check my balance.');
          await sp.locator('[data-exercise-field="warm2a"]').check();
          await tp.waitForFunction(() => document.querySelector('[data-exercise-field="warm1"]')?.value === 'I check my balance.'
            && document.querySelector('[data-exercise-field="warm2a"]')?.checked);
          await sp.locator('#next').click();
          await tp.locator('#moveStudent').waitFor();
          await tp.locator('#moveStudent').click();
          await sp.locator('#page-0.active').waitFor();
          await sp.locator('#next').click();
          await sp.locator('[data-exercise-field="gap0"]').fill('fraud');
          await sp.getByRole('button',{name:'Check answers'}).click();
          await sp.getByText('1 / 6 correct',{exact:true}).waitFor();
          await sp.locator('#finance-chat-form input').fill('Finance B1 test chat');
          await sp.locator('#finance-chat-form button').click();
          await tp.locator('#finance-messages').getByText('Finance B1 test chat',{exact:true}).waitFor();
          await tp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await tp.locator('#dictionarySource').fill('fraud');
          await tp.locator('#dictionaryTranslation').fill('мошенничество');
          await tp.locator('#dictionaryAddForm button').click();
          await sp.getByRole('button',{name:'Dictionary',exact:true}).click();
          await sp.locator('#myWords').getByText('мошенничество',{exact:false}).waitFor();
          await sp.reload();
          await sp.locator('#page-1.active [data-exercise-field="gap0"]').waitFor();
          assert.equal(await sp.locator('[data-exercise-field="gap0"]').inputValue(),'fraud');
          await sp.goto(origin+'/student-finance-b1.html');
          await sp.locator('#openWords').click();
          await sp.locator('#words').getByText('fraud',{exact:true}).waitFor();
          await sp.locator('#practiceFromWords').click();
          await sp.locator('[data-mode="type"]').click();
          await sp.locator('#practiceInput').fill('fraud');
          await sp.locator('#practiceTypeForm button').click();
          await sp.locator('#practiceAnswer[data-correct="true"]').waitFor();
          await sp.waitForFunction(() => window.FinanceLive.words().some(word => word.en === 'fraud' && word.learned));
          assert.equal(mastery[0]?.word_key,'fraud');
          console.log('finance_b1: canonical cabinets, lesson tools, answers, chat, reload and vocabulary mastery verified');
          continue;
        }
        const canonicalCabinet = course === 'travel_a2' || course === 'general_english_b1_stories';
        const studentLink = canonicalCabinet ? sp.locator('.lesson-card-link') : sp.locator('.home-open-lesson');
        const teacherLink = tp.locator('.teacher-enter-class');
        await studentLink.waitFor();
        if (canonicalCabinet) {
          if (course === 'travel_a2') {
            assert.equal(await studentLink.getAttribute('href'),'positive-thinking-a2.html');
            await sp.getByRole('button',{name:'Словарь',exact:true}).waitFor();
            await sp.getByText('Positive Thinking').first().waitFor();
          } else {
            // B1 Stories reuses Michael's actual cabinet JS/CSS after the
            // protected destination RPC, not its old standalone dashboard.
            assert.equal(await studentLink.getAttribute('href'),'general-english-b1-stories-01.html');
            assert.equal(await sp.locator('.homework-link').getAttribute('href'),'general-english-b1-stories-01-homework.html');
            await sp.getByText('A Postcard From a New Home',{exact:true}).waitFor();
            await sp.locator('.vocab-feature--practice').waitFor({state:'visible'});
            await sp.getByRole('button',{name:/Словарь/}).first().click();
            await sp.locator('#words[open]').waitFor();
            await sp.locator('#practiceFromWords').waitFor({state:'visible'});
            await sp.locator('#words form[method=dialog] button').click();
            await sp.locator('#practiceCard').click();
            await sp.locator('#practiceModes [data-mode="listen"]').waitFor();
            await sp.locator('#practiceDialog form[method=dialog] button').click();
            assert.equal(await sp.locator('#student-home').count(),0,'Old B1 cabinet renderer must be gone');
            assert.equal(await sp.locator('.gostudy-cloud-bar:visible').count(),0,'Shared cabinet must not show legacy cloud bar');
          }
        } else {
          const cabinetHeading = sp.locator('#student-home .home-lesson h2');
          await sp.evaluate(() => document.documentElement.style.setProperty('--gostudy-ui-heading-size','29px'));
          assert.equal(await cabinetHeading.evaluate(node => getComputedStyle(node).fontSize),'29px');
          await sp.evaluate(() => document.documentElement.style.removeProperty('--gostudy-ui-heading-size'));
        }
        await teacherLink.waitFor();
        if (course === 'general_english_b1') {
          assert.equal(await sp.locator('.home-homework-link').count(),0);
        }
        for (const [page, link] of [[sp, studentLink], [tp, teacherLink]]) {
          await link.click();
          await page.waitForURL(url => url.pathname === expected);
          await page.locator('header.gostudy-lesson-topbar:visible').waitFor();
          assert.equal(await page.locator('header.gostudy-lesson-topbar:visible').count(), 1);
          assert.equal(await page.locator('.gostudy-cabinet-back:visible').count(), 1);
          const dictionary = course === 'general_english_b1_stories' ? page.locator('#b1LessonDictionary') : page.locator('.glass-lesson-tools button[aria-label="Открыть словарь"]');
          const sidebar = page.locator('.room > .side, .gostudy-shared-room > .gostudy-room-sidebar');
          if (course === 'general_english_b1_stories') {
            await page.locator('#b1LessonDictionary:visible').waitFor();
            assert.equal(await sidebar.getByRole('button',{name:'Открыть словарь'}).count(),0,
              'B1 should not keep the obsolete floating dictionary');
          } else {
            await sidebar.getByRole('button', {name:'Открыть словарь'}).waitFor();
          }
          assert.equal(await page.locator('.gostudy-classroom-back:visible').count(), 0);
          if (course === 'general_english_b1_stories') {
            await sidebar.locator('#lessonVideo .jaas-connect').waitFor({state:'visible'});
            assert.equal(await sidebar.locator('#lessonVideo .jaas-person-tile').count(),2,
              'The approved two-person video tiles should replace the old static video label');
          } else {
            await sidebar.getByText('Видеосвязь', {exact:true}).waitFor();
          }
          await page.locator('.sheet .lesson-meta').waitFor();
          await page.locator('[data-shared-classroom]').waitFor();
          const heading = page.locator('.sheet h1').first();
          const originalFont = await heading.evaluate(node => getComputedStyle(node).fontSize);
          await page.evaluate(() => document.documentElement.style.setProperty('--gostudy-ui-heading-size','29px'));
          assert.equal(await heading.evaluate(node => getComputedStyle(node).fontSize),'29px');
          await page.evaluate(() => document.documentElement.style.removeProperty('--gostudy-ui-heading-size'));
          assert.equal(await heading.evaluate(node => getComputedStyle(node).fontSize),originalFont);
          if (course === 'general_english_b1_stories') {
            const b1HeaderButton=page.locator('#b1LessonDictionary');
            const headerDebug=await b1HeaderButton.evaluate(element=>{
              const chain=[];let current=element;
              while(current && chain.length<6) {
                const style=getComputedStyle(current),box=current.getBoundingClientRect();
                chain.push({tag:current.tagName,class:current.className,id:current.id,
                  display:style.display,visibility:style.visibility,opacity:style.opacity,
                  width:Math.round(box.width),height:Math.round(box.height),hidden:current.hidden});
                current=current.parentElement;
              }
              return chain;
            });
            console.log('B1 header dictionary computed layout:',JSON.stringify(headerDebug));
            await b1HeaderButton.waitFor({state:'visible'});
            await page.locator('#b1LessonDictionary').click();
            await page.locator('.glass-words[open]').waitFor();
            await page.locator('.glass-words[open]').evaluate(dialog=>dialog.close());
            // Michael parity: the dictionary is top-right ONLY, not a
            // floating round book button, and selection uses his compact popup.
            assert.equal(await page.locator('.glass-lesson-tools:visible').count(),0,'Legacy floating dictionary must be removed in B1');
            assert.equal(await page.locator('.glass-translation:visible').count(),0,'Old sidebar translator must be gone');
            await page.locator('#selectionTranslate').waitFor({state:'attached'});
            const videoStyle=await page.locator('#lessonVideo .video-preview').evaluate(el=>{
              const style=getComputedStyle(el);
              return {minimum:style.minHeight,background:style.backgroundColor,display:style.display};
            });
            // Michael's *final* two-person preview CSS overrides his older
            // decorative 355px rule with min-height:0 and #f7f8fa.
            assert.equal(videoStyle.minimum,'0px','B1 must inherit Michael final two-tile preview layout');
            assert.equal(videoStyle.background,'rgb(247, 248, 250)','B1 must use Michael final two-tile background');
            assert.equal(videoStyle.display,'flex','Shared video layout must remain flex');
            await page.evaluate(()=>{
              const root=document.querySelector('.sheet .lesson-content');
              const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
              let node;
              while((node=walker.nextNode())){
                const pos=node.textContent.toLowerCase().indexOf('company');
                if(pos<0)continue;
                const range=document.createRange();range.setStart(node,pos);range.setEnd(node,pos+7);
                const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
                document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
                break;
              }
            });
            const popup=page.locator('#selectionTranslate');
            await popup.waitFor({state:'visible'});
            assert.ok(await popup.evaluate(el=>el.getBoundingClientRect().width)<=340,'Michael translator must be compact');
            assert.ok(await popup.evaluate(el=>getComputedStyle(el).position)==='fixed','Translator should float next to selection');
            await page.keyboard.press('Escape');
            await popup.waitFor({state:'hidden'});
            const sectionsMenu=sidebar.locator('.b1-sections-menu');
            await sectionsMenu.waitFor({state:'visible'});
            assert.equal(await sectionsMenu.getAttribute('open'),null,'B1 sections default to Michael-style collapsed view');
            await sectionsMenu.locator('summary').click();
            await sectionsMenu.locator('.sections button').nth(1).click();
            await page.locator('.sheet h1').filter({hasText:'The Friday Table'}).waitFor();
            await sectionsMenu.locator('.sections button').first().click();
            await page.locator('.sheet h1').filter({hasText:'Three places. One new life'}).waitFor();
            await sectionsMenu.locator('summary').click();
            const divider=page.locator('.b1-lesson-divider');
            await divider.waitFor({state:'visible'});
            const oldWidth=Number(await divider.getAttribute('aria-valuenow'));
            await divider.focus();
            await divider.press('ArrowRight');
            assert.ok(Number(await divider.getAttribute('aria-valuenow'))>oldWidth,'B1 split divider must be keyboard adjustable');
          }
          if (await page.locator('.gostudy-shared-room').count()) {
            const first = sidebar.locator('.sections button').first();
            await first.waitFor();
            if (await page.locator('#lessonMenu #nav').count()) {
              await sidebar.locator('.sections button').nth(1).click();
              await page.locator('.lesson-meta').getByText(/^Step 2 of /).waitFor();
              await first.click();
            }
          }
          const sidebarBox = await sidebar.boundingBox();
          const sheetBox = await page.locator('.room > .sheet').boundingBox();
          if (course === 'travel_a2' || course === 'general_english_b1_stories') {
            assert.ok(sidebarBox.x + sidebarBox.width <= sheetBox.x + 1, 'Approved layout: video and tools on the left');
          } else {
            assert.ok(sidebarBox.x >= sheetBox.x + sheetBox.width - 1, 'desktop tools must sit to the right of the lesson');
          }
          await dictionary.click();
          await page.locator('.glass-words[open]').waitFor();
          assert.equal(await page.locator('.glass-words[open]').count(), 1);
        }
        // B1 travel lesson: student city decisions were previously stored only
        // as a local UI preference and were invisible in the teacher dashboard.
        if (course === 'general_english_b1_stories') {
          // The preceding vocabulary checks leave two modal dictionaries open.
          // Close them to test the actual lesson surface, then reopen them for
          // the remaining dictionary synchronization assertions below.
          await Promise.all([sp,tp].map(page=>page.locator('.glass-words[open]').evaluate(dialog=>dialog.close())));
          const studentChoice=sp.locator('.b1-travel-radio input[value="Da Nang"]');
          await studentChoice.check();
          const teacherOverview=tp.getByRole('navigation',{name:'Ответы ученицы по заданиям'});
          await teacherOverview.getByRole('button',{name:'01 · Three places. One new life (1)',exact:true}).waitFor({timeout:12000});
          await tp.locator('.b1-live-city-choice').getByText('Ученица выбрала: Da Nang',{exact:true}).waitFor();
          assert.equal(await sp.locator('.b1-travel-radio input[value="Da Nang"]').isChecked(),true);
          await sp.locator('#b1LessonDictionary').click();
          await tp.locator('#b1LessonDictionary').click();
          await Promise.all([sp,tp].map(page=>page.locator('.glass-words[open]').waitFor()));
        }
        assert.equal(new URL(tp.url()).searchParams.get('classStudent'), studentId);
        assert.equal(new URL(sp.url()).searchParams.has('classStudent'), false);
        if (course === 'general_english_b1_stories') {
          const key = 'gostudy-vocabulary-general-english-b1-stories-v1';
          progress.set(key,{lesson_key:key,revision:1,state:{words:[{en:'restored phrase',ru:'восстановленная фраза'}]}});
          await sp.locator('.glass-words[open]').evaluate(() => window.dispatchEvent(new Event('online')));
          await sp.locator('.glass-list').getByText('restored phrase',{exact:true}).waitFor();
          assert.equal(await sp.locator('.glass-words[open]').count(),1);
        }
        await tp.locator('.glass-form input[name=term]').fill('release check');
        await tp.locator('.glass-form input[name=meaning]').fill('проверка выпуска');
        await tp.locator('.glass-form button[type=submit]').click();
        await sp.locator('.glass-list').getByText('release check', {exact:true}).waitFor({timeout:7000});
        await sp.getByRole('button',{name:'На слух',exact:true}).click();
        await sp.getByRole('button',{name:'Прослушать слово',exact:true}).waitFor();
        await sp.locator('.glass-words .glass-tabs').getByRole('button',{name:'Словарь',exact:true}).click();
        for (const page of [sp,tp]) {
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow');
        }
        if (await sp.locator('#lesson-data').count()) {
          const step = await sp.locator('#lesson-data').evaluate(node => JSON.parse(node.textContent).steps.findIndex(step => step.type === 'choice'));
          assert.ok(step >= 0, 'expected a multiple-choice section');
          for (const page of [sp,tp]) {
            await page.locator('.glass-words[open]').evaluate(dialog => dialog.close());
            for (let i = 0; i < step; i++) await page.locator('.sheet .next').click();
          }
          if (course === 'general_english_b1') {
            await sp.locator('audio').evaluate(audio => new Promise((resolve,reject) => {
              if (audio.readyState >= 1) return resolve();
              audio.addEventListener('loadedmetadata',resolve,{once:true});
              audio.addEventListener('error',reject,{once:true});
            }));
            assert.ok(await sp.locator('audio').evaluate(audio => audio.duration > 35 && audio.duration < 90));
          }
          if (course === 'general_english_b1_stories') {
            const overview = tp.getByRole('navigation',{name:'Ответы ученицы по заданиям'});
            await sp.locator('.sheet [data-question] label').first().click();
            await overview.getByRole('button',{name:'02 · The Friday Table (1)',exact:true}).click();
            await tp.locator('.travel-student-answer').filter({hasText:'She found a better-paid job.'}).waitFor();
          }
          const option = sp.locator('.sheet [data-question] label').first();
          const label = (await option.innerText()).trim();
          await option.click();
          await tp.locator('.travel-student-answer').filter({hasText:label}).waitFor({timeout:10000});
        }
        if (course === 'general_english_b1') {
          await sp.locator('.sections button').last().click();
          await tp.locator('.sections button').last().click();
          assert.equal(await sp.getByText('Карточка преподавателя').count(),0);
          await tp.getByText('Карточка преподавателя').waitFor();
          await sp.locator('.writing textarea').fill('See you on Saturday at eleven at Riverside Café!');
          await tp.locator('.gostudy-live-draft').filter({hasText:'Riverside Café'}).waitFor({timeout:10000});
        }
        if (course === 'general_english_b1_stories') {
          // A second independent city choice is retained and visible in the
          // teacher's answer panel. It must not overwrite the warm-up choice.
          await sp.locator('.b1-sections-menu summary').click();
          await sp.locator('.sections button').nth(6).click();
          await sp.locator('.b1-travel-radio input[value="Kyoto"]').check();
          const overview=tp.getByRole('navigation',{name:'Ответы ученицы по заданиям'});
          await overview.getByRole('button',{name:'07 · The relocation game (1)',exact:true}).click();
          await tp.locator('.b1-live-city-choice').getByText('Ученица выбрала: Kyoto',{exact:true}).waitFor();
          await overview.getByRole('button',{name:'01 · Three places. One new life (1)',exact:true}).click();
          await tp.locator('.b1-live-city-choice').getByText('Ученица выбрала: Da Nang',{exact:true}).waitFor();
          const studentConfig = await tp.locator('#lesson-data').evaluate(node => JSON.parse(node.textContent));
          assert.equal(studentConfig.contentVersion,'would-you-live-here-b1-20261120-v1');
          assert.equal(studentConfig.steps.length,8,'B1 lesson needs eight ProgressMe-style sections');
          assert.equal(studentConfig.steps.reduce((sum,step)=>sum+step.minutes,0),50,'B1 duration must remain 50 minutes');
          assert.equal(studentConfig.steps[0].title,'01 · Three places. One new life');
          assert.equal(studentConfig.steps.at(-1).title,'08 · What feels like home?');
          assert.equal(studentConfig.key,current.lessonKey,'Existing progress key must remain stable');
          assert.equal(studentConfig.vocabulary.length,6,'B1 active vocabulary cap');
          assert.equal(await tp.locator('body').getAttribute('data-dud-b1-premium'),'','Premium styling must activate for both roles');
          await sp.goto(origin + '/' + current.homework);
          await sp.getByRole('heading',{name:'01 · A quick memory check',exact:true}).waitFor();
          assert.equal(await sp.locator('body').getAttribute('data-dud-b1-premium'),null,'Old homework design stays untouched');
          const homeworkConfig = await sp.locator('#lesson-data').evaluate(node=>JSON.parse(node.textContent));
          assert.equal(homeworkConfig.key,current.homeworkKey,'The protected homework progress key must remain stable');
          assert.equal(homeworkConfig.contentVersion,'would-you-live-here-homework-20261120-v1');
          assert.equal(homeworkConfig.steps.length,2,'New homework must contain two activities');
        }
        console.log(course + ': both cabinets open the current lesson and shared dictionary');
      } catch (error) { throw new Error(course + ': ' + error.message, {cause: error}); }
      finally { await student.close(); await teacher.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
