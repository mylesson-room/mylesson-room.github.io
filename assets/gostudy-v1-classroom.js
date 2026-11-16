(() => {
  function mount({sidebar, header, currentPage, openPage, applyAnswer, clearAnswers}) {
    const video = document.createElement('section');
    video.className = 'v1-room-video';
    video.setAttribute('aria-label', 'Видеосвязь');
    video.innerHTML = '<strong>Видеосвязь</strong><a href="https://telemost.yandex.ru/" target="_blank" rel="noopener noreferrer">Открыть Телемост ↗</a>';
    const chat = document.createElement('section');
    chat.className = 'finance-chat';
    chat.innerHTML = '<h2>Чат урока</h2><p id="finance-live-status" role="status">Подключаемся…</p><div class="v1-room-messages" role="log" aria-label="Сообщения"></div><form id="finance-chat-form"><input aria-label="Сообщение" maxlength="1000" required><button>Отправить</button></form>';
    sidebar.prepend(video, chat);
    const dictionary = header.querySelector('#dictBtn');
    if (dictionary) dictionary.setAttribute('aria-label','Dictionary');
    const profile = document.querySelector('[data-room-back]');
    const student = window.GoStudyFinanceAuth.classroomStudent;
    if (student && profile) {
      profile.href = 'gostudy-teacher.html?selected='+encodeURIComponent(document.body.dataset.classroomCourse.replaceAll('-','_')+':'+student);
    }
    const toast = document.createElement('aside');
    toast.className = 'v1-room-word';
    toast.setAttribute('role','status');
    toast.hidden = true;
    document.body.append(toast);
    let hideToast;
    document.addEventListener('finance-word', ({detail}) => {
      if (!detail.notify) return;
      toast.textContent = detail.word.en+' — '+detail.word.ru;
      toast.hidden = false;
      clearTimeout(hideToast);
      hideToast = setTimeout(() => { toast.hidden = true; }, 3600);
    });

    const send = (kind, payload) => window.FinanceLive?.send(kind, payload);
    const messages = chat.querySelector('[role=log]');
    const message = chat.querySelector('input');
    const submit = chat.querySelector('button');
    submit.disabled = true;
    chat.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const text = message.value.trim();
      if (text && send('chat',{text})) message.value = '';
    };
    document.addEventListener('finance-ready', () => { submit.disabled = false; });

    const pending = new Map();
    function flush() {
      for (const [key, entry] of pending) {
        clearTimeout(entry.timer);
        send('answer',{page:entry.page,key,value:entry.value});
      }
      pending.clear();
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('finance-event', ({detail}) => {
      const {kind,payload,initial,own,teacher} = detail;
      if (kind === 'chat' && typeof payload.text === 'string') {
        const row = document.createElement('p');
        const author = document.createElement('b');
        author.textContent = (own ? 'Вы' : teacher ? 'Преподаватель' : 'Ученик')+' · ';
        row.append(author, document.createTextNode(payload.text));
        messages.append(row);
        if (messages.childElementCount > 100) messages.firstElementChild.remove();
        messages.scrollTop = messages.scrollHeight;
      }
      if (kind === 'answer' && typeof payload.key === 'string' && (initial || !own)) {
        if (!pending.has(payload.key)) applyAnswer(payload,initial);
      }
      if (kind === 'reset' && Number.isInteger(payload.page) && (initial || !own)) {
        for (const [key,entry] of pending) if (entry.page === payload.page) {
          clearTimeout(entry.timer);
          pending.delete(key);
        }
        clearAnswers(payload.page,initial);
      }
      if (kind === 'page' && !own && !initial && Number.isInteger(payload.page) && (!teacher || payload.moveStudent)) {
        const page = payload.page;
        if (page !== currentPage()) openPage(page);
      }
    });
    if (student) {
      const follow = document.createElement('button');
      follow.type = 'button';
      follow.className = 'v1-room-move';
      follow.textContent = 'Перевести ученика сюда';
      follow.onclick = () => send('page',{page:currentPage(),moveStudent:true});
      header.append(follow);
    }
    const transport = document.createElement('script');
    transport.src = 'assets/gostudy-finance-live.js?v=classroom-1';
    transport.onerror = () => { chat.querySelector('[role=status]').textContent = 'Не удалось подключиться. Обновите страницу.'; };
    document.head.append(transport);
    return {
      answer(page,key,value,typing=false) {
        if (!typing) { send('answer',{page,key,value}); return; }
        clearTimeout(pending.get(key)?.timer);
        const timer = setTimeout(() => {
          pending.delete(key);
          send('answer',{page,key,value});
        },350);
        pending.set(key,{page,value,timer});
      },
      page(page) { flush(); send('page',{page}); },
      reset(page) {
        for (const [key,entry] of pending) if (entry.page === page) {
          clearTimeout(entry.timer);
          pending.delete(key);
        }
        clearAnswers(page,false);
        send('reset',{page});
      },
      word(en,ru) { return send('word',{en,ru}); },
    };
  }

  function resetButton(reset) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v1-room-reset';
    button.textContent = '×';
    button.setAttribute('aria-label','Сбросить ответы');
    button.title = 'Сбросить ответы';
    button.onclick = reset;
    return button;
  }

  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('.v1-room-salute')) return;
    const salute = document.createElement('div');
    salute.className = 'v1-room-salute';
    salute.setAttribute('aria-hidden','true');
    const colors = ['#38bdf8','#714ff7','#f6b644','#f16fa1','#50ce9d'];
    for (const side of ['left','right']) for (let i=0;i<42;i++) {
      const piece = document.createElement('i');
      piece.className = side;
      const angle = Math.PI*(.1+Math.random()*.8);
      const distance = 80+Math.random()*470;
      piece.style.setProperty('--x', (side === 'left' ? 1 : -1)*Math.sin(angle)*distance+'px');
      piece.style.setProperty('--y', -Math.cos(angle)*distance+'px');
      piece.style.setProperty('--delay', Math.random()*.2+'s');
      piece.style.background = colors[i%colors.length];
      salute.append(piece);
    }
    document.body.append(salute);
    setTimeout(() => salute.remove(),3000);
  }
  window.GoStudyV1Classroom = {mount,resetButton,celebrate};
})();