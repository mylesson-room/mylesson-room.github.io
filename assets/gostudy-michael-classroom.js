/* Opt-in classroom shell. Uses the canonical lesson, workbook, live room and Jitsi. */
(() => {
  'use strict';
  const auth = window.GoStudyPrivateAccess;
  const slug = 'michael-ai-finance-lesson-2-new';
  const namespace = 'michael-finance2-new-v1:';
  let booted = false;
  const load = src => new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve;
    script.onerror = () => reject(Error('Не удалось загрузить компоненты урока. Обновите страницу.'));
    document.head.append(script);
  });
  function mountTheme() {
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'classroomTheme';
    const key = 'fluenvia-classroom-theme:' + auth.userId();
    let theme = 'light';
    try { const stored = localStorage.getItem(key); if (['light','dark'].includes(stored)) theme = stored; } catch {}
    const apply = () => {
      document.documentElement.dataset.classroomTheme = theme;
      button.textContent = theme === 'light' ? 'Dark' : 'Light';
      button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#ede3d3' : '#20221f';
    };
    button.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      apply();
      try { localStorage.setItem(key,theme); } catch {}
    });
    document.querySelector('.header-right').append(button);
    apply();
  }
  function compose() {
    const header = document.querySelector('header');
    const brand = header.querySelector('.brand');
    brand.textContent = 'FluenVia';
    const course = document.createElement('span');
    course.className = 'classroom-course'; course.textContent = 'Business English B2 / AI in Finance';
    brand.after(course);
    const navigation = document.querySelector('#lessonSections');
    document.querySelector('.pager').insertBefore(navigation,document.querySelector('#next'));
    const chat = document.querySelector('.lesson-chat-dropdown');
    if (chat) {
      header.querySelector('.header-right').prepend(chat);
      chat.querySelector('summary > span:nth-child(2)').textContent = 'Chat';
    }
    document.querySelectorAll('.page').forEach((page,index) => {
      const label = document.createElement('p'); label.className = 'classroom-section-label';
      label.textContent = String(index+1).padStart(2,'0')+' / '+window.GoStudyLesson.labels[index].label;
      page.prepend(label);
    });
    const useful = document.querySelector('#page-0 .tip p');
    if (useful) {
      const lines = [...useful.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      useful.replaceChildren(...lines.map(line => { const span=document.createElement('span'); span.textContent=line.textContent; return span; }));
    }
    mountTheme();
  }
  async function boot() {
    if (booted || !auth.userId()) return;
    booted = true;
    try {
      const query = new URLSearchParams({select:'lesson_payload,student_id,teacher_id',slug:'eq.'+slug,published:'eq.true'});
      const response = await auth.request('/rest/v1/gostudy_private_lessons?'+query);
      const row = response.ok && response.data?.length === 1 ? response.data[0] : null;
      if (!row || ![row.student_id,row.teacher_id].includes(auth.userId())) throw Error('У этого аккаунта нет доступа к новому уроку.');
      const teacher = auth.userId() === row.teacher_id;
      const selected = new URLSearchParams(location.search).get('classStudent');
      if (selected && (!teacher || selected !== row.student_id)) throw Error('Неверно выбран ученик.');
      if (teacher && !selected) {
        const url = new URL(location.href); url.searchParams.set('classStudent',row.student_id); location.replace(url.href); return;
      }
      const config = row.lesson_payload;
      if (config.key !== 'gostudy-michael-finance2-new-v1' || config.answerNamespace !== namespace || config.pages?.length !== 7)
        throw Error('Конфигурация нового урока не прошла проверку.');
      // Reuse the exact authenticated session and Michael's existing video/event room.
      window.GoStudyFinanceAuth = {userId:auth.userId,token:auth.token,request:auth.request,classroomStudent:teacher?row.student_id:null};
      const node = document.createElement('script'); node.type = 'application/json'; node.id = 'lesson-data';
      node.textContent = JSON.stringify(config); document.body.append(node);
      if (document.body.hasAttribute('data-homework-only')) {
        window.GoStudyLesson = config;
        await load('assets/gostudy-homework.js?v=michael-classroom-1');
        await window.GoStudyHomework.renderHomework();
      } else {
        await load('assets/gostudy-v1-lesson.js?v=michael-controls-1');
        await load('assets/gostudy-jaas-video.js?v=michael-controls-1');
        await load('assets/gostudy-michael-chat.js?v=1');
        await load('assets/gostudy-v1-workbook.js?v=michael-controls-1');
        compose();
        await load('assets/gostudy-homework.js?v=michael-classroom-1');
        window.GoStudyHomework.renderLesson(config);
      }
      document.querySelector('#gostudyLessonLoad')?.remove();
    } catch (error) {
      document.querySelector('#gostudyLessonLoad').textContent = error.message;
    }
  }
  document.addEventListener('gostudy-private-authorized',boot);
  document.addEventListener('gostudy-private-signed-out',() => location.reload());
  auth.ready.then(boot);
})();
