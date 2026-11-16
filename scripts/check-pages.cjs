const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
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
    "path": "country-house-a2-03.html",
    "cab": "student-country-house.html",
    "student": "Ирина",
    "title": "Before the Rain Comes"
  },
  {
    "course": "art-b1",
    "path": "art-b1-02.html",
    "cab": "student-art-b1.html",
    "student": "Анастасия",
    "title": "Every picture has a story"
  },
  {
    "course": "business-ai",
    "path": "business-ai-b2c1-02.html",
    "cab": "student-business-ai.html",
    "student": "Влад",
    "title": "From AI Pilot to Rollout"
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
          return route.fulfill({json:[]});
        });
      }
      const sp = await student.newPage();
      const tp = await teacher.newPage();
      const cabinet = await student.newPage();
      const errors = [];
      for (const [page,label] of [[sp,'student'],[tp,'teacher']]) page.on('pageerror',error=>errors.push(label+': '+error.message));
      await Promise.all([sp.goto(origin+'/'+lesson.cab),tp.goto(origin+'/'+lesson.path+'?classStudent='+studentId)]);
      const card = sp.locator('.lesson-card');
      await card.getByRole('heading',{name:lesson.title}).waitFor();
      assert.equal(await card.getAttribute('href'),lesson.path);
      await card.click();
      for (const page of [sp,tp]) await page.getByText('Онлайн · общая комната',{exact:true}).waitFor();
      await sp.getByRole('button',{name:/Далее|Next/}).first().click();
      if (lesson.course === 'art-b1') {
        try {
          await sp.locator('#v1').waitFor({timeout:8000});
          await tp.locator('#v1').waitFor({timeout:8000});
        } catch (error) {
          throw new Error('Art navigation: '+JSON.stringify({errors,events,student:await sp.locator('#title').textContent(),teacher:await tp.locator('#title').textContent()}),{cause:error});
        }
        await sp.locator('#v1').selectOption('the focal point');
        await tp.locator('#v1.correct').waitFor();
        await tp.getByRole('button',{name:'Сбросить ответы'}).click();
        await sp.waitForFunction(() => document.querySelector('#v1')?.value === '');
        await tp.getByRole('button',{name:'Dictionary'}).click();
        await tp.locator('#newWord').fill('shared entry');
        await tp.locator('#newMeaning').fill('общее слово');
        await tp.getByRole('button',{name:/Save word/}).click();
      } else {
        const step = await sp.locator('#lesson-data').evaluate(node => JSON.parse(node.textContent).steps.findIndex(step => step.type === 'choice'));
        assert.ok(step >= 1);
        for (let i=1;i<step;i++) await sp.getByRole('button',{name:/Далее/}).first().click();
        await tp.locator('fieldset .options label').first().waitFor();
        await sp.locator('fieldset .options label').first().click();
        await tp.locator('fieldset input[type=radio]:checked').first().waitFor();
        await tp.getByRole('button',{name:'Сбросить ответы'}).click();
        await sp.waitForFunction(() => !document.querySelector('fieldset input[type=radio]:checked'));
        await tp.evaluate(() => window.FinanceLive.send('word',{en:'shared entry',ru:'общее слово'}));
      }
      await sp.locator('.v1-room-word').filter({hasText:'shared entry — общее слово'}).waitFor();
      await cabinet.goto(origin+'/'+lesson.cab);
      await cabinet.getByRole('button',{name:/Тренировки слов/}).click();
      const expectedWord = lesson.course === 'art-b1' ? 'old word' : 'shared entry';
      await cabinet.locator('#practiceQuestion').filter({hasText:expectedWord}).waitFor();
      await sp.getByRole('textbox',{name:'Сообщение'}).fill('Classroom check');
      await sp.getByRole('button',{name:'Отправить'}).click();
      await tp.getByRole('log').getByText(/Classroom check/).waitFor();
      console.log(lesson.course + ': v1 cabinet, answers, reset, vocabulary and chat verified');
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
    const box = await word.boundingBox();
    await tp.mouse.dblclick(box.x+22,box.y+box.height/2);
    await tp.locator('#selectionTarget').fill('уточнённый прогноз');
    await tp.getByRole('button',{name:'Добавить в словарь',exact:true}).click();
    for(const page of [sp,tp]){
      await page.locator('#finance-toast').filter({hasText:'уточнённый прогноз'}).waitFor();
      await page.getByRole('button',{name:'Dictionary',exact:true}).click();
      await page.getByRole('dialog').getByText('уточнённый прогноз',{exact:false}).waitFor();
      await page.getByRole('button',{name:'Close dictionary'}).click();
    }
    await cabinet.locator('#vocabCount').filter({hasText:'2 слова'}).waitFor();
    await cabinet.locator('#practiceCard').click();
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

    for(const [sender,receiver,note] of [[sp,tp,'Сообщение ученика'],[tp,sp,'Сообщение преподавателя']]){
      await sender.getByRole('textbox',{name:'Сообщение'}).fill(note);
      await sender.getByRole('button',{name:'Отправить'}).click();
      await receiver.locator('#finance-messages').getByText(note,{exact:true}).waitFor();
    }
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

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.GOSTUDY_CHROME ? {executablePath: process.env.GOSTUDY_CHROME} : {});
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    await checkFinanceRoom(browser, origin);
    await checkGeneralB2Room(browser, origin);
    await checkMigratedRooms(browser, origin);
    const source = await readFile('assets/gostudy-sync.js', 'utf8');
    const catalog = runInNewContext('('+source.match(/const classroomCatalog = ([^\n]+);/)[1]+')');
    const studentId = '11111111-1111-4111-8111-111111111111';
    for (const [course, entry] of Object.entries(catalog)) {
      const current = entry.lessons.at(-1);
      const expected = new URL(current.lesson, origin).pathname;
      const student = await browser.newContext();
      const teacher = await browser.newContext();
      const assigned = [];
      const progress = new Map();
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
        const studentLink = sp.locator('.home-open-lesson');
        const teacherLink = tp.locator('.teacher-enter-class');
        await studentLink.waitFor();
        const cabinetHeading = sp.locator('#student-home .home-lesson h2');
        await sp.evaluate(() => document.documentElement.style.setProperty('--gostudy-ui-heading-size','29px'));
        assert.equal(await cabinetHeading.evaluate(node => getComputedStyle(node).fontSize),'29px');
        await sp.evaluate(() => document.documentElement.style.removeProperty('--gostudy-ui-heading-size'));
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
          const dictionary = page.locator('.glass-lesson-tools button[aria-label="Открыть словарь"]');
          const sidebar = page.locator('.room > .side, .gostudy-shared-room > .gostudy-room-sidebar');
          await sidebar.getByRole('button', {name:'Открыть словарь'}).waitFor();
          assert.equal(await page.locator('.gostudy-classroom-back:visible').count(), 0);
          await sidebar.getByText('Видеосвязь', {exact:true}).waitFor();
          await page.locator('.sheet .lesson-meta').waitFor();
          await page.locator('[data-shared-classroom]').waitFor();
          const heading = page.locator('.sheet h1').first();
          const originalFont = await heading.evaluate(node => getComputedStyle(node).fontSize);
          await page.evaluate(() => document.documentElement.style.setProperty('--gostudy-ui-heading-size','29px'));
          assert.equal(await heading.evaluate(node => getComputedStyle(node).fontSize),'29px');
          await page.evaluate(() => document.documentElement.style.removeProperty('--gostudy-ui-heading-size'));
          assert.equal(await heading.evaluate(node => getComputedStyle(node).fontSize),originalFont);
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
          assert.ok(sidebarBox.x >= sheetBox.x + sheetBox.width - 1, 'desktop tools must sit to the right of the lesson');
          await dictionary.click();
          await page.locator('.glass-words[open]').waitFor();
          assert.equal(await page.locator('.glass-words[open]').count(), 1);
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
        await sp.getByRole('button',{name:'Словарь',exact:true}).click();
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
            await overview.getByRole('button',{name:'What happened? (1)',exact:true}).click();
            await tp.locator('.travel-student-answer').filter({hasText:'Changed dinner plans'}).waitFor();
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
          await sp.goto(origin + '/' + current.homework);
          await sp.getByRole('heading',{name:'Homework',exact:true}).waitFor();
        }
        console.log(course + ': both cabinets open the current lesson and shared dictionary');
      } catch (error) { throw new Error(course + ': ' + error.message, {cause: error}); }
      finally { await student.close(); await teacher.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
