(() => {
  'use strict';

  const project = 'https://kawfqlohguwvmmplvrny.supabase.co';
  const publicKey = 'sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
  const authKey = 'gostudy-cloud-session-v1';
  const travelB2Keys = [
    'gostudy-travel-disruptions-b2-v1',
    'gostudy-travel-disruptions-b2-homework-v1',
    'gostudy-travel-b2-02-v1',
    'gostudy-travel-b2-02-homework-v1',
    'gostudy-travel-b2-profile-v1',
  ];
  const travelA2Keys = [
    "gostudy-travel-a2plus-v1",
    "gostudy-travel-a2plus-profile-v1",
    "gostudy-travel-a2plus-homework-v1",
    "gostudy-travel-a2plus-02-v1",
    "gostudy-travel-a2plus-02-homework-v1",
    "gostudy-travel-a2plus-03-v1",
    "gostudy-travel-a2plus-03-homework-v1",
    "gostudy-travel-a2plus-04-v1",
    "gostudy-travel-a2plus-04-homework-v1"
  ];
  const travelA2Pages = new Set([
    "student-travel-a2.html",
    "travel-weekend-a2.html",
    "travel-a2-homework.html",
    "travel-a2-02.html",
    "travel-a2-02-homework.html",
    "travel-a2-03.html",
    "travel-a2-03-homework.html",
    "travel-a2-04.html",
    "travel-a2-04-homework.html"
  ]);
  const travelA2 = travelA2Pages.has(location.pathname.split('/').pop()) ||
    new URLSearchParams(location.search).get('course') === 'travel-a2';
  const financePages = new Set(['student-finance-b1.html','finance-b1.html','finance-b1-homework.html','finance-b1-02.html','finance-b1-02-homework.html']);
  const financeB1 = financePages.has(location.pathname.split('/').pop()) ||
    new URLSearchParams(location.search).get('course') === 'finance-b1';
  const financeKeys = ['gostudy-finance-b1-v1','gostudy-finance-b1-profile-v1','gostudy-finance-b1-homework-v1','gostudy-finance-b1-02-v1','gostudy-finance-b1-02-homework-v1'];
  const keys = new Set(financeB1 ? financeKeys : travelA2 ? travelA2Keys : travelB2Keys);
  const courseName = financeB1 ? 'Finance B1' : travelA2 ? 'Travel A2+' : 'Travel B2';
  const accountPage = 'gostudy-account.html' + (financeB1 ? '?course=finance-b1' : travelA2 ? '?course=travel-a2' : '');
  const cabinetPage = financeB1 ? 'student-finance-b1.html' : travelA2 ? 'student-travel-a2.html' : 'student-travel-b2.html';
  const table = '/rest/v1/gostudy_progress';
  const json = (value, fallback = null) => {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  };
  function readSession() {
    try {
      const value = json(sessionStorage.getItem(authKey));
      return value?.user?.id && value.access_token ? value : null;
    } catch { return null; }
  }
  let session = readSession();
  let queue = Promise.resolve();
  let timer;
  const conflicts = new Set();

  function recordKey(key) {
    return 'gostudy-cloud:' + session.user.id + ':' + key;
  }
  function readRecord(key) {
    return json(localStorage.getItem(recordKey(key)), {revision: 0, value: null, dirty: false});
  }
  function writeRecord(key, record) {
    localStorage.setItem(recordKey(key), JSON.stringify(record));
  }
  function notify(message) {
    document.querySelectorAll('[data-cloud-status]').forEach(element => {
      element.textContent = message;
    });
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => synchronize({reload: true}).catch(report), 250);
  }
  function report(error) {
    notify(error.message || 'Не удалось связаться с Supabase. Изменения сохранены в этом браузере.');
  }

  window.GoStudyStorage = {
    getItem(key) {
      return session && keys.has(key) ? readRecord(key).value : localStorage.getItem(key);
    },
    setItem(key, value) {
      if (!session || !keys.has(key)) {
        localStorage.setItem(key, value);
        return;
      }
      const previous = readRecord(key);
      const encoded = String(value);
      if (previous.value === encoded) return;
      writeRecord(key, {...previous, value: encoded, dirty: true});
      schedule();
    },
  };

  async function request(path, options = {}, accessToken = '') {
    const response = await fetch(project + path, {
      method: options.method || 'GET',
      signal: AbortSignal.timeout(12000),
      headers: {
        apikey: publicKey,
        ...(accessToken ? {Authorization: 'Bearer ' + accessToken} : {}),
        ...(options.body ? {'Content-Type': 'application/json'} : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    return {ok: response.ok, status: response.status, data};
  }
  function saveSession(data) {
    session = {...data, expires_at: Date.now() + data.expires_in * 1000};
    sessionStorage.setItem(authKey, JSON.stringify(session));
  }
  let refreshInFlight;
  async function token() {
    if (!session) throw new Error('Войдите в аккаунт GoStudy.');
    if (session.expires_at > Date.now() + 30000) return session.access_token;
    refreshInFlight ??= (async () => {
      const response = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: {refresh_token: session.refresh_token},
      });
      if (!response.ok) throw new Error('Срок входа истёк. Войдите снова.');
      saveSession(response.data);
      return session.access_token;
    })().finally(() => { refreshInFlight = null; });
    return refreshInFlight;
  }

  async function push(key, accessToken) {
    const current = readRecord(key);
    if (!current.dirty || conflicts.has(key)) return;
    const revision = current.revision + 1;
    const body = {state: JSON.parse(current.value), revision};
    const response = current.revision
      ? await request(table + '?lesson_key=eq.' + encodeURIComponent(key) + '&revision=eq.' + current.revision,
        {method: 'PATCH', headers: {Prefer: 'return=representation'}, body}, accessToken)
      : await request(table, {method: 'POST', headers: {Prefer: 'return=representation'}, body: {...body, lesson_key: key}}, accessToken);
    if (response.status === 409 || (response.ok && !response.data?.length)) {
      conflicts.add(key);
      return;
    }
    if (!response.ok) throw new Error('Не удалось отправить прогресс. Копия сохранена в этом браузере.');
    const latest = readRecord(key);
    if (latest.revision === current.revision) {
      writeRecord(key, {...latest, revision, dirty: latest.value !== current.value});
    }
  }

  async function pull(accessToken, replace = false) {
    const response = await request(table + '?select=lesson_key,state,revision', {}, accessToken);
    if (!response.ok || !Array.isArray(response.data)) throw new Error('Не удалось загрузить прогресс из Supabase.');
    let changed = false;
    for (const row of response.data) {
      if (!keys.has(row.lesson_key)) continue;
      const local = readRecord(row.lesson_key);
      if (local.dirty && !replace) {
        if (row.revision !== local.revision) conflicts.add(row.lesson_key);
        continue;
      }
      const value = JSON.stringify(row.state);
      if (replace || row.revision > local.revision) {
        changed ||= value !== local.value;
        writeRecord(row.lesson_key, {revision: row.revision, value, dirty: false});
        conflicts.delete(row.lesson_key);
      }
    }
    return changed;
  }

  function synchronize({reload = false, replace = false} = {}) {
    const run = async () => {
      if (!session) return;
      const accessToken = await token();
      if (!replace) for (const key of keys) await push(key, accessToken);
      const changed = await pull(accessToken, replace);
      if (conflicts.size) {
        notify('Есть другая версия прогресса. Откройте настройки синхронизации.');
      } else if (Array.from(keys).some(key => readRecord(key).dirty)) {
        notify('Сохраняем изменения…');
        schedule();
      } else {
        notify('Синхронизировано');
      }
      if (reload && changed && !conflicts.size) location.reload();
    };
    const pending = queue.then(run, run);
    queue = pending.catch(() => {});
    return pending;
  }

  async function signIn(email, password, importLocal) {
    const response = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', body: {email, password},
    });
    if (!response.ok) throw new Error('Не удалось войти. Проверьте почту и пароль.');
    saveSession(response.data);
    await pull(session.access_token);
    if (importLocal) {
      for (const key of keys) {
        const local = json(localStorage.getItem(key));
        if (!readRecord(key).value && local && typeof local === 'object' && !Array.isArray(local)) {
          writeRecord(key, {revision: 0, value: JSON.stringify(local), dirty: true});
        }
      }
      await synchronize();
    }
  }

  function mountAccount() {
    const form = document.getElementById('cloud-login');
    const cabinetLink = document.getElementById('cloud-cabinet');
    if (cabinetLink) {
      cabinetLink.href = cabinetPage;
      cabinetLink.textContent = '← Кабинет ' + courseName;
    }
    const intro = document.getElementById('cloud-intro');
    if (intro) intro.textContent = 'Войдите, чтобы сохранять ответы, открытые разделы и слова ' + courseName + ' между устройствами.';
    document.title = 'Аккаунт GoStudy · ' + courseName;
    const settings = document.getElementById('cloud-settings');
    const status = document.getElementById('cloud-message');
    const render = () => {
      form.hidden = !!session;
      settings.hidden = !session;
      document.getElementById('cloud-email').textContent = session?.user?.email || '';
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button');
      const password = form.elements.password.value;
      form.elements.password.value = '';
      button.disabled = true;
      status.textContent = 'Входим…';
      try {
        await signIn(form.elements.email.value.trim(), password, form.elements.importLocal.checked);
        location.assign(cabinetPage);
      } catch (error) {
        render();
        status.textContent = error.message;
      } finally { button.disabled = false; }
    });
    document.getElementById('cloud-sync').onclick = () => synchronize().catch(report);
    document.getElementById('cloud-restore').onclick = () => synchronize({replace: true}).catch(report);
    document.getElementById('cloud-signout').onclick = () => {
      clearTimeout(timer);
      sessionStorage.removeItem(authKey);
      location.assign(cabinetPage);
    };
    render();
    if (session) synchronize().catch(report);
  }

  function mountLesson() {
    const link = document.createElement('a');
    link.href = accountPage;
    link.textContent = session ? 'Аккаунт GoStudy' : 'Войти для синхронизации';
    link.className = 'gostudy-cloud-link';
    const status = document.createElement('span');
    status.dataset.cloudStatus = '';
    status.setAttribute('role', 'status');
    if (session) status.textContent = 'Синхронизация…';
    const box = document.createElement('aside');
    box.className = 'gostudy-cloud-bar';
    box.append(link, status);
    (document.querySelector('header') || document.body).after(box);
    if (!session) return;
    synchronize({reload: true}).catch(report);
    window.addEventListener('online', () => synchronize({reload: true}).catch(report));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) synchronize({reload: true}).catch(report);
    });
  }

  function mountTeacherWords() {
    if ((!travelA2 && !financeB1) || !session) return;
    const targets = [document.getElementById('dictionary'), document.getElementById('words')].filter(Boolean);
    const panels = targets.map(target => {
      const section = document.createElement('section');
      section.className = 'gostudy-teacher-words';
      const title = document.createElement('h3');
      title.textContent = 'Слова от преподавателя';
      const list = document.createElement('ul');
      section.append(title, list);
      section.hidden = true;
      target.append(section);
      return {section, list};
    });
    if (!panels.length) return;
    let last = '';
    const refresh = async () => {
      try {
        if (document.hidden) return;
        const result = await request('/rest/v1/rpc/' + (financeB1 ? 'gostudy_finance_b1_my_words' : 'gostudy_travel_a2_my_words'), {method:'POST',body:{}}, await token());
        if (!result.ok || !Array.isArray(result.data)) return;
        const signature = JSON.stringify(result.data);
        if (signature === last) return;
        last = signature;
        for (const {section,list} of panels) {
          section.hidden = result.data.length === 0;
          list.replaceChildren(...result.data.map(word => {
            const row = document.createElement('li');
            row.textContent = word.en + ' — ' + word.ru;
            if ('speechSynthesis' in window) {
              const play = document.createElement('button');
              play.type = 'button';
              play.className = 'gostudy-word-play';
              play.textContent = '🔊';
              play.setAttribute('aria-label', 'Прослушать ' + word.en);
              play.onclick = () => {
                speechSynthesis.cancel();
                const voice = new SpeechSynthesisUtterance(word.en);
                voice.lang = 'en-GB';
                speechSynthesis.speak(voice);
              };
              row.append(' ',play);
            }
            return row;
          }));
        }
      } catch {
        // The existing list stays visible during a network interruption.
      } finally { setTimeout(refresh, 5000); }
    };
    refresh();
  }

  function mountTeacher() {
    const login = document.getElementById('teacher-login');
    const dashboard = document.getElementById('teacher-dashboard');
    const message = document.getElementById('teacher-status');
    const studentPicker = document.getElementById('teacher-student');
    const wordForm = document.getElementById('teacher-word');
    const answerList = document.getElementById('teacher-answers');
    const studentWords = document.getElementById('teacher-student-words');
    const assignedWords = document.getElementById('teacher-assigned-words');
    const lessonLabels = new Map([
      ['gostudy-travel-a2plus-v1','Урок 1 · A weekend away'],
      ['gostudy-travel-a2plus-homework-v1','Домашка 1'],
      ['gostudy-travel-a2plus-02-v1','Урок 2 · A day out in York'],
      ['gostudy-travel-a2plus-02-homework-v1','Домашка 2'],
      ['gostudy-travel-a2plus-03-v1','Урок 3 · A day by the sea'],
      ['gostudy-travel-a2plus-03-homework-v1','Домашка 3'],
      ['gostudy-travel-a2plus-04-v1','Урок 4 · The train is late'],
      ['gostudy-travel-a2plus-04-homework-v1','Домашка 4'],
      ['gostudy-finance-b1-v1','Урок 1 · Money moves'],
      ['gostudy-finance-b1-homework-v1','Домашка 1 · Finance B1'],
      ['gostudy-finance-b1-02-v1','Урок 2 · Where did my money go?'],
      ['gostudy-finance-b1-02-homework-v1','Домашка 2 · Finance B1'],
    ]);
    const lesson4Labels = {
      hwRead1:'Что делала Элла?', hwRead2:'Проблема с поездом в 10:45', hwRead3:'Почему решили подождать?',
      hwListen1:'Новое время отправления', hwListen2:'Номер платформы', hwListen3:'Место встречи',
      hwG1:'I … on the platform', hwG2:'The assistant … us', hwG3:'They … for the platform',
    };
    const finance2Labels = {hwRead1:'Какой платёж проверила Миа?',hwRead2:'Где она нашла название приложения?',hwRead3:'Зачем Миа связалась с поддержкой?',hwListen1:'Сумма списания',hwListen2:'Когда закончился пробный период?',hwListen3:'Что Сэм уже сделал?',hwG1:'I … the statement yesterday',hwG2:'They … yet',hwG3:'She … it last Friday',hwG4:'We … support'};
    const courses = new Map([['travel_a2','Travel A2+'],['finance_b1','Finance B1']]);
    const rosterByCourse = new Map();
    let students = [];
    let signature = '';
    let busy = false;
    let pollTimer;
    function listWords(target, words) {
      const entries = Array.isArray(words) ? words.filter(word => word && typeof word.en === 'string' && typeof word.ru === 'string') : [];
      target.replaceChildren(...entries.map(word => {
        const item = document.createElement('li');
        item.textContent = word.en + ' — ' + word.ru;
        return item;
      }));
      if (!entries.length) {
        const item = document.createElement('li');
        item.textContent = 'Пока пусто.';
        target.append(item);
      }
    }
    function renderStudent() {
      const student = students.find(row => row.selection === studentPicker.value);
      wordForm.hidden = !student;
      listWords(studentWords, student?.words);
      listWords(assignedWords, student?.assigned);
      answerList.replaceChildren();
      for (const [key,label] of lessonLabels) {
        const progress = student?.progress?.find(row => row.key === key);
        if (!progress) continue;
        const answers = Object.entries(progress.answers || {}).filter(([,value]) => value !== '' && value !== null);
        if (!answers.length) continue;
        const group = document.createElement('details');
        group.open = true;
        const title = document.createElement('summary');
        title.textContent = label + ' · ' + answers.length;
        const list = document.createElement('dl');
        for (const [id,value] of answers) {
          const question = document.createElement('dt');
          const answer = document.createElement('dd');
          question.textContent = (key==='gostudy-travel-a2plus-04-v1' && lesson4Labels[id]) || (key==='gostudy-finance-b1-02-v1' && finance2Labels[id]) || id;
          answer.textContent = Array.isArray(value) ? value.join(' → ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
          list.append(question,answer);
        }
        group.append(title,list);
        answerList.append(group);
      }
      if (!answerList.childElementCount) answerList.textContent = 'Ответы появятся, когда ученица войдёт и синхронизирует урок.';
    }
    function setSignedIn() {
      login.hidden = !!session;
      dashboard.hidden = !session;
    }
    async function refresh() {
      if (!session || busy || document.hidden) return;
      busy = true;
      try {
        const access = await token();
        const results = await Promise.allSettled(Array.from(courses, async ([course,label]) => {
          const response = await request('/rest/v1/rpc/gostudy_' + course + '_teacher_view', {method:'POST',body:{}}, access);
          if (!response.ok || !Array.isArray(response.data)) throw new Error(label);
          rosterByCourse.set(course, response.data.map(row => ({...row,course,selection:course+':'+row.id})));
        }));
        const roster = Array.from(courses.keys()).flatMap(course => rosterByCourse.get(course) || []);
        const next = JSON.stringify(roster);
        if (signature !== next) {
          const selected = studentPicker.value;
          signature = next;
          students = roster;
          studentPicker.replaceChildren(...students.map(student => {
            const option = document.createElement('option');
            option.value = student.selection;
            option.textContent = student.label;
            return option;
          }));
          if (students.some(student => student.selection === selected)) studentPicker.value = selected;
          renderStudent();
        }
        message.textContent = results.some(result => result.status === 'rejected') ? 'Часть данных пока недоступна.' : students.length ? 'Ответы обновляются автоматически.' : 'К этому аккаунту пока не привязаны ученики.';
      } catch(error) { message.textContent = error.message; }
      finally { busy = false; }
    }
    function startPolling() {
      clearInterval(pollTimer);
      refresh();
      pollTimer = setInterval(refresh, 3500);
    }
    login.addEventListener('submit', async event => {
      event.preventDefault();
      const button = login.querySelector('button');
      const password = login.elements.password.value;
      login.elements.password.value = '';
      button.disabled = true;
      message.textContent = 'Входим…';
      try {
        const result = await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:login.elements.email.value.trim(),password}});
        if (!result.ok) throw new Error('Не удалось войти. Проверьте почту и пароль.');
        saveSession(result.data);
        setSignedIn();
        startPolling();
      } catch(error) { message.textContent = error.message; }
      finally { button.disabled = false; }
    });
    studentPicker.onchange = renderStudent;
    wordForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = wordForm.querySelector('button');
      const status = document.getElementById('teacher-word-status');
      button.disabled = true;
      try {
        const student = students.find(row => row.selection === studentPicker.value);
        if (!student || !courses.has(student.course)) throw new Error('Выберите ученика.');
        const result = await request('/rest/v1/rpc/gostudy_' + student.course + '_assign_word',{method:'POST',body:{
          p_student:student.id,p_en:wordForm.elements.en.value.trim(),p_ru:wordForm.elements.ru.value.trim(),
        }},await token());
        if (!result.ok || result.data !== true) throw new Error('Не удалось добавить слово. Проверьте доступ и поля.');
        wordForm.reset();
        status.textContent = 'Слово добавлено.';
        refresh();
      } catch(error) { status.textContent = error.message; }
      finally { button.disabled = false; }
    });
    document.getElementById('teacher-signout').onclick = () => {
      sessionStorage.removeItem(authKey);
      location.reload();
    };
    setSignedIn();
    if (session) startPolling();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('teacher-login')) mountTeacher();
    else if (document.getElementById('cloud-login')) mountAccount();
    else { mountLesson(); mountTeacherWords(); }
  });
})();
