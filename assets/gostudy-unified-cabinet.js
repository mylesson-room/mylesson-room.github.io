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
  function assignmentsFromRooms(rooms, financeRooms, userId) {
    const found = new Map();
    for (const room of rooms) {
      if (room.student_id !== userId) continue;
      const lesson = safeLessonPath(room.lesson_path);
      if (!lesson || found.has(lesson)) continue;
      found.set(lesson, {
        lesson,
        course: courseLabel(room.course),
        title: courseLabel(room.course),
        studentLabel: typeof room.student_label === 'string' ? room.student_label.trim().slice(0, 60) : ''
      });
    }
    if (financeRooms.some(room => room.student_id === userId)) {
      const lesson = 'business-ai-finance-b2-02.html'; // Bridge to an existing historic course only.
      if (!found.has(lesson)) found.set(lesson, {
        lesson, course: 'AI in Finance · B2', title: 'AI in Finance — Lesson 2', studentLabel: ''
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


  async function render(data, published) {
    // A user with multiple legacy rooms needs an explicit teacher-selected CURRENT assignment.
    // Never guess from table order or expose historical lessons on the dashboard.
    const primary = data.length === 1 ? data[0] : null;
    const rawLabel = String(primary?.studentLabel || '').trim();
    // A legacy student_label may contain an email; an email is NOT the student's name.
    // The future profile.display_name field will replace this compatibility fallback.
    const displayName = rawLabel && !rawLabel.includes('@') ? rawLabel : 'Ученик';
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

    if (!primary) {
      const lessonLink = document.querySelector('.lesson-card-link');
      if (lessonLink) {
        lessonLink.removeAttribute('href');
        lessonLink.setAttribute('aria-disabled','true');
        lessonLink.setAttribute('aria-label','Текущий урок не назначен');
      }
    }
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
    if (data.length > 1) updateStatus('Найдено несколько учебных комнат. Преподавателю необходимо подтвердить один актуальный урок.');
    else if (!primary) updateStatus('Пока у вашего аккаунта нет назначенных уроков. Обратитесь к преподавателю.');
    else updateStatus('');
    const loading = document.querySelector('.classroom-access');
    if (loading) loading.hidden = true;
    document.body.classList.add('unified-ready');
  }

  async function start() {
    if (started || !auth.userId()) return;
    started = true;
    updateStatus('Загружаем ваши занятия…');
    try {
      const id = encodeURIComponent(auth.userId());
      const [classrooms, finance, published] = await Promise.all([
        readRows('/rest/v1/gostudy_classroom_rooms?select=student_id,course,lesson_path,student_label&student_id=eq.' + id),
        readRows('/rest/v1/gostudy_finance_room?select=student_id&student_id=eq.' + id),
        readRows('/rest/v1/gostudy_homework_published?select=lesson_path,published_at&student_id=eq.' + id)
      ]);
      await render(assignmentsFromRooms(classrooms, finance, auth.userId()), published);
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
