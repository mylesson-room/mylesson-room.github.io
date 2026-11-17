/* GoStudy unified cabinet: READ-ONLY adapter for current Supabase classroom memberships.
   No migration, no legacy localStorage access, no teacher or student data writes. */
(() => {
  'use strict';

  const auth = window.GoStudyPrivateAccess;
  const status = document.getElementById('unified-status');
  const logout = document.getElementById('gostudyAccessSignout');
  const courseNames = Object.freeze({
    'english-placement': 'English Placement Test',
    'general_english_b1': 'General English · B1',
    'general_english_b2': 'General English · B2',
    'business-ai-finance': 'AI in Finance · B2',
    'ielts-reading': 'IELTS Reading'
  });
  let started = false;

  function safeLessonPath(value) {
    const path = String(value || '').trim();
    return /^[a-z][a-z0-9_-]*\.html$/i.test(path) ? path : null;
  }

  function courseLabel(value) {
    const course = String(value || '').trim();
    return courseNames[course] || course.replace(/[_-]+/g, ' ').trim() || 'Урок английского';
  }

  // The source list is derived from authenticated room membership, never an HTML-stored student ID.
  function assignmentsFromRooms(rooms, financeRooms) {
    const found = new Map();
    for (const room of rooms) {
      const lesson = safeLessonPath(room.lesson_path);
      if (!lesson || found.has(lesson)) continue;
      found.set(lesson, {
        lesson,
        course: courseLabel(room.course),
        title: courseLabel(room.course),
        studentLabel: typeof room.student_label === 'string' ? room.student_label.trim().slice(0, 60) : ''
      });
    }
    if (financeRooms.length) {
      const lesson = 'business-ai-finance-b2-02.html'; // Bridge to an existing historic course only.
      if (!found.has(lesson)) found.set(lesson, {
        lesson, course: 'AI in Finance · B2', title: 'AI in Finance — Lesson 2', studentLabel: 'Михаил'
      });
    }
    return [...found.values()];
  }

  function updateStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  async function readRows(endpoint) {
    const result = await auth.request(endpoint);
    if (!result.ok || !Array.isArray(result.data)) {
      throw new Error('Не удалось загрузить назначения. Код ответа: ' + result.status);
    }
    return result.data;
  }

  function appendOtherLessons(items) {
    if (!items.length) return;
    const main = document.querySelector('main');
    const section = document.createElement('section');
    section.className = 'unified-lessons';
    section.setAttribute('aria-labelledby', 'unifiedLessonsTitle');
    const title = document.createElement('h2');
    title.id = 'unifiedLessonsTitle';
    title.textContent = 'Другие назначенные уроки';
    const cards = document.createElement('div');
    cards.className = 'unified-lesson-grid';

    for (const item of items) {
      const link = document.createElement('a');
      link.className = 'card lesson-card lesson-card-link';
      link.href = item.lesson; // Whitelisted same-origin path, never an external URL.
      const small = document.createElement('small');
      small.textContent = item.course;
      const h3 = document.createElement('h3');
      h3.textContent = item.title;
      const info = document.createElement('p');
      info.className = 'unified-hint';
      info.textContent = 'Перейти к занятию';
      link.append(small, h3, info);
      cards.append(link);
    }
    section.append(title, cards);
    main.append(section);
  }

  async function render(data, published) {
    const primary = data[0];
    const email = String(auth.getUser()?.email || '');
    // Display-only name. Never used for authorisation.
    const displayName = primary?.studentLabel || String(auth.getUser()?.user_metadata?.full_name || '').trim().slice(0, 60) || (email ? email.split('@')[0] : 'Ученик');
    const homework = primary && published.some(row => row.lesson_path === primary.lesson && row.published_at)
      && primary.lesson === 'business-ai-finance-b2-02.html'
      ? 'business-ai-finance-b2-02-homework.html'
      : '';

    const config = document.createElement('script');
    config.type = 'application/json';
    config.id = 'cabinet-settings';
    config.textContent = JSON.stringify({
      cabinet: 'student.html',
      course: primary?.course || 'GoStudy',
      title: primary?.title || 'Назначенных уроков пока нет',
      lesson: primary?.lesson || 'student.html',
      homework,
      student: displayName,
      schedule: 'Ваше занятие',
      lessonLabel: 'Открыть назначенный урок',
      importWords: false
    });
    document.body.append(config);
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/gostudy-v1-cabinet.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Не удалось загрузить общий интерфейс GoStudy.'));
      document.body.append(script);
    });

    const home = document.getElementById('assignment');
    if (!homework && home) home.hidden = true;
    const cards = document.querySelector('.cards');
    if (!primary && cards) cards.hidden = true;
    appendOtherLessons(data.slice(1));
    const account = document.querySelector('.account');
    if (account && logout) {
      account.append(logout);
      logout.hidden = false;
    }

    // Legacy vocabulary uses a course-local browser key. Never mount it on a shared route:
    // doing so risks showing another student's words on a shared computer.
    const openWords = document.getElementById('openWords');
    const practiceCard = document.getElementById('practiceCard');
    const practiceFromWords = document.getElementById('practiceFromWords');
    if (openWords) openWords.disabled = true;
    if (practiceCard) practiceCard.disabled = true;
    if (practiceFromWords) practiceFromWords.disabled = true;
    const count = document.getElementById('vocabCount');
    if (count) count.textContent = 'Словарь пока доступен внутри урока';
    const empty = document.getElementById('wordsEmpty');
    if (empty) empty.textContent = 'Общий словарь будет подключён после безопасной миграции сохранённых слов.';
    if (!primary) updateStatus('Пока у вашего аккаунта нет назначенных уроков. Обратитесь к преподавателю.');
    else updateStatus('');
    document.body.classList.add('unified-ready');
  }

  async function start() {
    if (started || !auth.userId()) return;
    started = true;
    updateStatus('Загружаем ваши занятия…');
    try {
      const id = encodeURIComponent(auth.userId());
      const [classrooms, finance, published] = await Promise.all([
        readRows('/rest/v1/gostudy_classroom_rooms?select=course,lesson_path,student_label&student_id=eq.' + id),
        readRows('/rest/v1/gostudy_finance_room?select=student_id&student_id=eq.' + id),
        readRows('/rest/v1/gostudy_homework_published?select=lesson_path,published_at&student_id=eq.' + id)
      ]);
      await render(assignmentsFromRooms(classrooms, finance), published);
    } catch (error) {
      started = false;
      updateStatus(error?.message || 'Не удалось загрузить кабинет. Попробуйте войти ещё раз.');
    }
  }

  if (auth) {
    document.addEventListener('gostudy-private-authorized', start);
    auth.ready.then(ok => { if (ok) start(); });
  } else updateStatus('Не удалось загрузить систему входа.');
})();
