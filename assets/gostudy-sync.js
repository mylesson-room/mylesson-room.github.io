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
  const feedPages = new Set(['student-feed-b2.html','feed-choice-b2.html','feed-b2-02.html','feed-b2-02-homework.html','feed-b2-03.html','feed-b2-03-homework.html','feed-b2-04.html','feed-b2-04-homework.html']);
  const feedB2 = feedPages.has(location.pathname.split('/').pop()) ||
    new URLSearchParams(location.search).get('course') === 'feed-b2';
  const feedKeys = ['gostudy-feed-b2-v1','gostudy-feed-b2-profile-v1','gostudy-feed-b2-02-v1','gostudy-feed-b2-02-homework-v1','gostudy-feed-b2-03-v1','gostudy-feed-b2-03-homework-v1','gostudy-feed-b2-04-v1','gostudy-feed-b2-04-homework-v1'];
  const salesPages = new Set(['student-first-sales.html','first-sales-c1.html','first-sales-c1-homework.html','first-sales-c1-02.html','first-sales-c1-02-homework.html']);
  const firstSales = salesPages.has(location.pathname.split('/').pop()) ||
    new URLSearchParams(location.search).get('course') === 'first-sales';
  const salesKeys = ['gostudy-first-sales-shared-v1','gostudy-first-sales-profile-v1','gostudy-first-sales-c1-v1','gostudy-first-sales-c1-homework-v1','gostudy-first-sales-c1-02-v1','gostudy-first-sales-c1-02-homework-v1'];
  const pharmaPages = new Set(['student-pharma.html','pharma-c1.html','pharma-c1-02.html','pharma-c1-02-homework.html','pharma-c1-03.html','pharma-c1-03-homework.html']);
  const pharmaC1 = pharmaPages.has(location.pathname.split('/').pop()) ||
    new URLSearchParams(location.search).get('course') === 'pharma-c1';
  const pharmaKeys = ['gostudy-pharma-c1-v1','gostudy-pharma-profile-v1','gostudy-pharma-c1-02-v1','gostudy-pharma-c1-02-homework-v1','gostudy-pharma-c1-03-v1','gostudy-pharma-c1-03-homework-v1'];
  const tiktokPages = new Set(['student-tiktok-a2.html', 'tiktok-a2.html', 'tiktok-a2-homework.html']);
  const tiktokA2 = tiktokPages.has(location.pathname.split('/').pop()) ||
    new URLSearchParams(location.search).get('course') === 'tiktok-a2';
  const tiktokKeys = ['gostudy-tiktok-a2-v1', 'gostudy-tiktok-a2-homework-v1', 'gostudy-tiktok-a2-words-v1'];
  const keys = new Set(tiktokA2 ? tiktokKeys : pharmaC1 ? pharmaKeys : firstSales ? salesKeys : feedB2 ? feedKeys : financeB1 ? financeKeys : travelA2 ? travelA2Keys : travelB2Keys);
  const courseName = tiktokA2 ? 'TikTok A2' : pharmaC1 ? 'Pharma C1' : firstSales ? 'First Sales C1' : feedB2 ? 'Feed B2' : financeB1 ? 'Finance B1' : travelA2 ? 'Travel A2+' : 'Travel B2';
  const accountPage = 'gostudy-account.html' + (tiktokA2 ? '?course=tiktok-a2' : pharmaC1 ? '?course=pharma-c1' : firstSales ? '?course=first-sales' : feedB2 ? '?course=feed-b2' : financeB1 ? '?course=finance-b1' : travelA2 ? '?course=travel-a2' : '');
  const cabinetPage = tiktokA2 ? 'student-tiktok-a2.html' : pharmaC1 ? 'student-pharma.html' : firstSales ? 'student-first-sales.html' : feedB2 ? 'student-feed-b2.html' : financeB1 ? 'student-finance-b1.html' : travelA2 ? 'student-travel-a2.html' : 'student-travel-b2.html';
  const table = '/rest/v1/gostudy_progress';
  const classroomCatalog = {tiktok_a2: {"name": "TikTok A2", "lessons": [{"title": "One More Video?", "lesson": "tiktok-a2.html", "homework": "tiktok-a2-homework.html", "lessonKey": "gostudy-tiktok-a2-v1", "homeworkKey": "gostudy-tiktok-a2-homework-v1"}]},"travel_a2":{"name":"Travel A2+","lessons":[{"title":"A weekend away","lesson":"travel-weekend-a2.html","homework":"travel-a2-homework.html","lessonKey":"gostudy-travel-a2plus-v1","homeworkKey":"gostudy-travel-a2plus-homework-v1"},{"title":"A day out in York","lesson":"travel-a2-02.html","homework":"travel-a2-02-homework.html","lessonKey":"gostudy-travel-a2plus-02-v1","homeworkKey":"gostudy-travel-a2plus-02-homework-v1"},{"title":"A day by the sea","lesson":"travel-a2-03.html","homework":"travel-a2-03-homework.html","lessonKey":"gostudy-travel-a2plus-03-v1","homeworkKey":"gostudy-travel-a2plus-03-homework-v1"},{"title":"The train is late","lesson":"travel-a2-04.html","homework":"travel-a2-04-homework.html","lessonKey":"gostudy-travel-a2plus-04-v1","homeworkKey":"gostudy-travel-a2plus-04-homework-v1"}]},"finance_b1":{"name":"Finance B1","lessons":[{"title":"Money moves","lesson":"finance-b1.html","homework":"finance-b1-homework.html","lessonKey":"gostudy-finance-b1-v1","homeworkKey":"gostudy-finance-b1-homework-v1"},{"title":"Where did my money go?","lesson":"finance-b1-02.html","homework":"finance-b1-02-homework.html","lessonKey":"gostudy-finance-b1-02-v1","homeworkKey":"gostudy-finance-b1-02-homework-v1"}]},"feed_b2":{"name":"Feed B2","lessons":[{"title":"Your feed, your choice?","lesson":"feed-choice-b2.html","homework":"feed-choice-b2.html#homework","lessonKey":"gostudy-feed-b2-v1","homeworkKey":"gostudy-feed-b2-v1"},{"title":"Before you share","lesson":"feed-b2-02.html","homework":"feed-b2-02-homework.html","lessonKey":"gostudy-feed-b2-02-v1","homeworkKey":"gostudy-feed-b2-02-homework-v1"},{"title":"Who’s selling what?","lesson":"feed-b2-03.html","homework":"feed-b2-03-homework.html","lessonKey":"gostudy-feed-b2-03-v1","homeworkKey":"gostudy-feed-b2-03-homework-v1"},{"title":"A real photo, a false story","lesson":"feed-b2-04.html","homework":"feed-b2-04-homework.html","lessonKey":"gostudy-feed-b2-04-v1","homeworkKey":"gostudy-feed-b2-04-homework-v1"}]},"first_sales":{"name":"First Sales C1","lessons":[{"title":"Your First Sales Interview","lesson":"first-sales-c1.html","homework":"first-sales-c1-homework.html","lessonKey":"gostudy-first-sales-c1-v1","homeworkKey":"gostudy-first-sales-c1-homework-v1"},{"title":"Your First Discovery Call","lesson":"first-sales-c1-02.html","homework":"first-sales-c1-02-homework.html","lessonKey":"gostudy-first-sales-c1-02-v1","homeworkKey":"gostudy-first-sales-c1-02-homework-v1"}]},"pharma_c1":{"name":"Pharma C1","lessons":[{"title":"Pharma marketing: beyond the launch","lesson":"pharma-c1.html","homework":"pharma-c1.html#homework","lessonKey":"gostudy-pharma-c1-v1","homeworkKey":"gostudy-pharma-c1-v1"},{"title":"From feedback to strategy","lesson":"pharma-c1-02.html","homework":"pharma-c1-02-homework.html","lessonKey":"gostudy-pharma-c1-02-v1","homeworkKey":"gostudy-pharma-c1-02-homework-v1"},{"title":"Can AI Help Doctors Spot Cancer?","lesson":"pharma-c1-03.html","homework":"pharma-c1-03-homework.html","lessonKey":"gostudy-pharma-c1-03-v1","homeworkKey":"gostudy-pharma-c1-03-homework-v1"}]}};
  const classroomStudent = new URLSearchParams(location.search).get('classStudent');
  const previewRecords = classroomStudent === null ? null : new Map();
  const classroomPages = new Map(Object.entries(classroomCatalog).flatMap(([course, spec]) =>
    spec.lessons.flatMap(lesson => [[lesson.lesson, {course, key:lesson.lessonKey}], [lesson.homework.split('#')[0], {course, key:lesson.homeworkKey}]])));
  function classroomLink(path, student) {
    const url = new URL(path, location.href);
    url.searchParams.set('classStudent', student);
    return url.pathname.split('/').pop() + url.search + url.hash;
  }
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
      if (previewRecords && keys.has(key)) return previewRecords.get(key) ?? null;
      return session && keys.has(key) ? readRecord(key).value : localStorage.getItem(key);
    },
    setItem(key, value) {
      if (previewRecords && keys.has(key)) {
        previewRecords.set(key, String(value));
        return;
      }
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

  async function authenticate(email, password) {
    const response = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', body: {email, password},
    });
    if (!response.ok) throw new Error('Не удалось войти. Проверьте почту и пароль.');
    saveSession(response.data);
  }

  function mergeLegacyFinanceWords() {
    const legacyKey = 'gostudy-finance-b1-homework-v1';
    const baseKey = 'gostudy-finance-b1-v1';
    const marker = 'gostudy-finance-homework-words-merged';
    try {
      if (localStorage.getItem(marker)) return;
      const old = json(localStorage.getItem(legacyKey));
      if (!Array.isArray(old?.words) || !old.words.length) return;
      const base = json(localStorage.getItem(baseKey),{});
      if (!base || typeof base !== 'object' || Array.isArray(base)) return;
      const words = new Map();
      for (const word of [...old.words,...(Array.isArray(base.words) ? base.words : [])]) {
        if (typeof word?.en === 'string' && typeof word.ru === 'string') words.set(word.en.trim().toLowerCase(),word);
      }
      localStorage.setItem(baseKey,JSON.stringify({...base,words:[...words.values()]}));
      localStorage.setItem(marker,'1');
    } catch {}
  }
  if (financeB1 && !session && !previewRecords) mergeLegacyFinanceWords();

  async function importLocalProgress() {
    if (keys.has('gostudy-finance-b1-v1')) mergeLegacyFinanceWords();
    for (const key of keys) {
      const local = json(localStorage.getItem(key));
      if (!readRecord(key).value && local && typeof local === 'object' && !Array.isArray(local)) {
        writeRecord(key, {revision: 0, value: JSON.stringify(local), dirty: true});
      }
    }
    await synchronize();
  }

  async function signIn(email, password, importLocal) {
    await authenticate(email, password);
    await pull(session.access_token);
    if (importLocal) await importLocalProgress();
  }

  function mountUnifiedAccount() {
    const destinations = new Map([
      ['travel-a2', {name: 'Travel A2+', path: 'student-travel-a2.html', keys: travelA2Keys}],
      ['finance-b1', {name: 'Finance B1', path: 'student-finance-b1.html', keys: financeKeys}],
      ['tiktok-a2', {name: 'TikTok A2', path: 'student-tiktok-a2.html', keys: tiktokKeys}],
      ['feed-b2', {name: 'Feed B2', path: 'student-feed-b2.html', keys: feedKeys}],
      ['first-sales', {name: 'First Sales C1', path: 'student-first-sales.html', keys: salesKeys}],
      ['pharma-c1', {name: 'Pharma C1', path: 'student-pharma.html', keys: pharmaKeys}],
      ['teacher', {name: 'Кабинет преподавателя', path: 'gostudy-teacher.html'}],
    ]);
    const form = document.getElementById('unified-login');
    const dashboard = document.getElementById('unified-dashboard');
    const email = document.getElementById('unified-email');
    const list = document.getElementById('unified-destinations');
    const status = document.getElementById('unified-status');
    const retry = document.getElementById('unified-retry');
    const signout = document.getElementById('unified-signout');
    const submit = form.querySelector('button');
    let importLocal = false;
    let busy = false;

    function renderSession() {
      form.hidden = !!session;
      dashboard.hidden = !session;
      email.textContent = session?.user?.email || '';
    }

    async function open(destination) {
      if (destination.keys) {
        keys.clear();
        for (const key of destination.keys) keys.add(key);
        await pull(await token());
        if (importLocal) await importLocalProgress();
      }
      location.assign(destination.path);
    }

    async function run(action) {
      if (busy) return;
      busy = true;
      submit.disabled = retry.disabled = signout.disabled = true;
      list.querySelectorAll('button').forEach(button => { button.disabled = true; });
      retry.hidden = true;
      status.textContent = 'Загружаем кабинет…';
      try {
        await action();
      } catch (error) {
        if (error.message === 'Срок входа истёк. Войдите снова.') {
          sessionStorage.removeItem(authKey);
          session = null;
        }
        renderSession();
        status.textContent = error instanceof TypeError ? 'Не удалось подключиться. Попробуйте ещё раз.' : error.message;
        retry.hidden = !session;
      } finally {
        busy = false;
        submit.disabled = retry.disabled = signout.disabled = false;
        list.querySelectorAll('button').forEach(button => { button.disabled = false; });
      }
    }

    async function loadDestinations() {
      const response = await request('/rest/v1/rpc/gostudy_my_destinations', {method: 'POST', body: {}}, await token());
      if (response.status === 401) throw new Error('Срок входа истёк. Войдите снова.');
      if (!response.ok || !Array.isArray(response.data)) throw new Error('Не удалось загрузить назначенные курсы. Попробуйте ещё раз.');
      const options = [...new Set(response.data.map(row => row.course))]
        .map(course => destinations.get(course)).filter(Boolean);
      if (options.length === 1) {
        await open(options[0]);
        return;
      }
      list.replaceChildren(...options.map(destination => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = destination.name;
        button.addEventListener('click', () => run(() => open(destination)));
        return button;
      }));
      status.textContent = options.length ? 'Выберите кабинет.' : 'К этому аккаунту пока не привязаны уроки. Обратитесь к преподавателю.';
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const password = form.elements.password.value;
      form.elements.password.value = '';
      importLocal = form.elements.importLocal.checked;
      run(async () => {
        await authenticate(form.elements.email.value.trim(), password);
        renderSession();
        await loadDestinations();
      });
    });
    retry.addEventListener('click', () => run(loadDestinations));
    signout.addEventListener('click', () => {
      sessionStorage.removeItem(authKey);
      location.reload();
    });
    renderSession();
    if (session) run(loadDestinations);
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

  function mountStudentHome() {
    const home = document.getElementById('student-home');
    if (!home) return;
    const course = tiktokA2 ? 'tiktok_a2' : pharmaC1 ? 'pharma_c1' : firstSales ? 'first_sales' : feedB2 ? 'feed_b2' : financeB1 ? 'finance_b1' : 'travel_a2';
    const lesson = classroomCatalog[course].lessons.at(-1);
    const started = json(GoStudyStorage.getItem(lesson.lessonKey),{});
    home.innerHTML = '<article class="home-current"><p>Текущий урок</p><h2></h2><div class="home-actions"><a class="home-primary"></a><a>Домашнее задание</a></div></article><div class="home-tools"><a class="home-tile"><strong>Словарь</strong><small>Мои слова</small></a><button type="button" class="home-tile"><strong>Тренировки</strong><small>Повторить слова</small></button></div><dialog class="home-training"><h2>Тренировка слов</h2><p role="status"></p><strong class="home-prompt"></strong><p class="home-meaning" hidden></p><div class="home-actions"><button type="button" class="home-reveal">Показать перевод</button><button type="button" class="home-next">Следующее слово</button><button type="button" class="home-close">Закрыть</button></div></dialog>';
    home.querySelector('h2').textContent = lesson.title;
    const [open, homework, dictionary] = home.querySelectorAll('a');
    open.href = lesson.lesson;
    open.textContent = started.page > 0 || Object.keys(started.answers || {}).length ? 'Продолжить урок' : 'Открыть урок';
    homework.href = lesson.homework;
    dictionary.href = tiktokA2 ? '#words' : lesson.lesson+'#vocabulary';
    if (tiktokA2) dictionary.onclick = event => { event.preventDefault(); document.getElementById('dictBtn')?.click(); };
    const wordKey = {tiktok_a2:'gostudy-tiktok-a2-words-v1',first_sales:'gostudy-first-sales-shared-v1'}[course] || classroomCatalog[course].lessons[0].lessonKey;
    const dialog = home.querySelector('dialog');
    const status = dialog.querySelector('[role="status"]');
    const prompt = dialog.querySelector('.home-prompt');
    const meaning = dialog.querySelector('.home-meaning');
    const reveal = dialog.querySelector('.home-reveal');
    const next = dialog.querySelector('.home-next');
    let words = [], index = 0, generation = 0;
    function showWord() {
      const word = words[index];
      status.textContent = word ? (index+1)+' / '+words.length : 'В словаре пока нет слов.';
      prompt.textContent = word?.en || '';
      meaning.textContent = word?.ru || '';
      meaning.hidden = true;
      reveal.hidden = next.hidden = !word;
    }
    home.querySelector('button.home-tile').onclick = async () => {
      const run = ++generation;
      const saved = json(GoStudyStorage.getItem(wordKey),{});
      const own = Array.isArray(saved) ? saved : Array.isArray(saved.words) ? saved.words : [];
      words = own.filter(w => typeof w?.en === 'string' && typeof w.ru === 'string');
      index = 0;
      showWord();
      dialog.showModal();
      if (!session) return;
      try {
        const result = await request('/rest/v1/rpc/gostudy_'+course+'_my_words',{method:'POST',body:{}},await token());
        if (!dialog.open || run !== generation || !result.ok || !Array.isArray(result.data)) return;
        const combined = new Map(words.map(w => [w.en.trim().toLowerCase(),w]));
        for (const w of result.data) if (typeof w?.en === 'string' && typeof w.ru === 'string') {
          const key = w.en.trim().toLowerCase();
          if (!combined.has(key)) combined.set(key,w);
        }
        words = [...combined.values()];
        showWord();
      } catch {}
    };
    reveal.onclick = () => { meaning.hidden = false; };
    next.onclick = () => { if (words.length) index = (index+1)%words.length; showWord(); };
    dialog.querySelector('.home-close').onclick = () => dialog.close();
    document.body.classList.add('gostudy-student-home');
  }

  async function mountTiktokCabinet(content) {
    const status = document.getElementById('cabinet-status');
    if (!session) {
      location.replace('login.html');
      return;
    }
    try {
      const response = await request('/rest/v1/rpc/gostudy_my_destinations', {method:'POST', body:{}}, await token());
      if (response.status === 401) throw new Error('Срок входа истёк. Войдите снова.');
      if (!response.ok || !Array.isArray(response.data)) throw new Error('Не удалось открыть кабинет. Обновите страницу.');
      if (!response.data.some(row => row.course === 'tiktok-a2')) {
        throw new Error('Урок TikTok A2 не назначен этому аккаунту.');
      }
      status.hidden = true;
      content.hidden = false;
      mountStudentHome();
      mountLesson();
      mountTeacherWords();
    } catch (error) {
      if (error.message === 'Срок входа истёк. Войдите снова.') sessionStorage.removeItem(authKey);
      status.querySelector('span').textContent = error.message;
    }
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
    if ((!travelA2 && !financeB1 && !feedB2 && !firstSales && !pharmaC1 && !tiktokA2) || !session) return;
    const course = tiktokA2 ? 'tiktok_a2' : pharmaC1 ? 'pharma_c1' : firstSales ? 'first_sales' : feedB2 ? 'feed_b2' : financeB1 ? 'finance_b1' : 'travel_a2';
    const dictionary = document.getElementById('dictionary');
    const dictionaryButton = document.getElementById('dictBtn');
    const targets = [dictionary, document.getElementById('words')].filter(Boolean);
    const panels = targets.map(target => {
      const section = document.createElement('section');
      section.className = 'gostudy-teacher-words';
      const title = document.createElement('h3');
      title.textContent = 'Слова от преподавателя';
      const list = document.createElement('ul');
      section.append(title, list);
      section.hidden = true;
      if (target === dictionary) {
        const form = target.querySelector('#wordForm');
        if (form) form.before(section);
        else target.prepend(section);
      } else {
        target.prepend(section);
      }
      return {section, list};
    });
    if (!panels.length) return;
    const shortcut = document.createElement('button');
    shortcut.type = 'button';
    shortcut.className = 'gostudy-cloud-link';
    shortcut.hidden = true;
    shortcut.onclick = () => {
      if (dictionary && !dictionary.open) {
        if (dictionaryButton) dictionaryButton.click();
        else dictionary.showModal();
      }
      panels[0].section.scrollIntoView({block:'nearest'});
    };
    document.querySelector('.gostudy-cloud-bar')?.append(shortcut);
    let last = '';
    const refresh = async () => {
      try {
        if (document.hidden) return;
        const result = await request('/rest/v1/rpc/' + 'gostudy_' + course + '_my_words', {method:'POST',body:{}}, await token());
        if (!result.ok || !Array.isArray(result.data)) return;
        const signature = JSON.stringify(result.data);
        if (signature === last) return;
        last = signature;
        shortcut.hidden = !result.data.length;
        shortcut.textContent = 'Слова от преподавателя · ' + result.data.length;
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

  function wordItems(target, words, pronounce = false) {
    const entries = Array.isArray(words) ? words.filter(word => word && typeof word.en === 'string' && typeof word.ru === 'string') : [];
    target.replaceChildren(...entries.map(word => {
      const item = document.createElement('li');
      item.textContent = word.en + ' — ' + word.ru;
      if (pronounce && 'speechSynthesis' in window) {
        const play = document.createElement('button');
        play.className = 'gostudy-word-play';
        play.type = 'button';
        play.textContent = '🔊';
        play.setAttribute('aria-label','Прослушать '+word.en);
        play.onclick = () => {
          speechSynthesis.cancel();
          const voice = new SpeechSynthesisUtterance(word.en);
          voice.lang = 'en-GB';
          speechSynthesis.speak(voice);
        };
        item.append(' ',play);
      }
      return item;
    }));
    if (!entries.length) {
      const item = document.createElement('li');
      item.textContent = 'Пока пусто.';
      target.append(item);
    }
    return entries.length;
  }

  function answerText(value) {
    return Array.isArray(value) ? value.join(' → ') :
      typeof value === 'object' ? JSON.stringify(value) :
      typeof value === 'boolean' ? (value ? 'Отмечено' : 'Снято') : String(value);
  }

  async function assignClassroomWord(course, student, en, ru) {
    const response = await request('/rest/v1/rpc/gostudy_' + course + '_assign_word', {
      method:'POST',body:{p_student:student,p_en:en,p_ru:ru},
    },await token());
    if (!response.ok || response.data !== true) throw new Error('Не удалось добавить слово. Проверьте доступ и поля.');
  }

  function mountClassroom() {
    const page = classroomPages.get(location.pathname.split('/').pop());
    const content = document.getElementById('content');
    if (!page || !content) return;
    const root = document.createElement('aside');
    root.className = 'gostudy-classroom';
    root.innerHTML = '<a class="gostudy-classroom-back" href="gostudy-teacher.html">← К ученикам</a><details><summary>Ученик</summary><div class="gostudy-classroom-panel"><p role="status"></p><h3>Ответы в этом разделе</h3><dl></dl><h3>Слова ученика</h3><ul></ul><h3>Назначенные слова</h3><ul></ul></div></details>';
    document.body.append(root);
    root.querySelector('a').href = 'gostudy-teacher.html?selected='+encodeURIComponent(page.course+':'+classroomStudent);
    const summary = root.querySelector('summary');
    const panelStatus = root.querySelector('[role="status"]');
    const answers = root.querySelector('dl');
    const [studentWords,assignedWords] = root.querySelectorAll('ul');
    const dictionary = document.getElementById('dictionary');
    const wordForm = dictionary?.querySelector('#wordForm');
    const dictionaryStatus = dictionary?.querySelector('#dictStatus');
    let dictionaryLists;
    let dictionaryCount;
    const originalCount = document.getElementById('wordCount');
    if (originalCount) {
      originalCount.hidden = true;
      dictionaryCount = document.createElement('span');
      originalCount.after(dictionaryCount);
    }
    if (dictionary) {
      dictionary.classList.add('gostudy-classroom-dictionary');
      dictionary.querySelector('.menu-top h2').textContent = 'Словарь ученика';
      const oldList = dictionary.querySelector('#wordList');
      if (oldList) oldList.hidden = true;
      const training = dictionary.querySelector('#trainWords');
      if (training) training.hidden = true;
      const exportWords = dictionary.querySelector('#exportWords');
      if (exportWords) exportWords.hidden = true;
      if (wordForm) {
        const submit = wordForm.querySelector('button[type="submit"]');
        if (submit) submit.textContent = 'Добавить ученику';
      }
      const sections = document.createElement('div');
      sections.className = 'gostudy-classroom-dictionary-lists';
      for (const title of ['Сохранил ученик','Слова от преподавателя']) {
        const section = document.createElement('section');
        section.className = 'gostudy-teacher-words';
        const heading = document.createElement('h3');
        heading.textContent = title;
        section.append(heading,document.createElement('ul'));
        sections.append(section);
      }
      dictionary.append(sections);
      dictionaryLists = sections.querySelectorAll('ul');
    }
    const sourceButton = document.getElementById('saveSelected');
    const popup = document.getElementById('translationPop');
    const send = document.createElement('button');
    send.className = 'gostudy-classroom-send';
    send.type = 'button';
    send.textContent = 'Добавить ученику';
    const sendStatus = document.createElement('p');
    sendStatus.className = 'gostudy-classroom-send-status';
    sendStatus.setAttribute('role','status');
    if (popup && sourceButton) {
      popup.classList.add('gostudy-classroom-translation');
      sourceButton.style.setProperty('display','none','important');
      const entry = sourceButton.closest('.translation-entry');
      if (entry) entry.style.setProperty('display','block','important');
      const translation = document.getElementById('selectedMeaning');
      if (translation) {
        translation.style.setProperty('width','100%','important');
        translation.style.setProperty('writing-mode','horizontal-tb','important');
      }
      popup.append(send,sendStatus);
    }
    let student;
    let signature = '';
    let busy = false;
    let sending = false;

    function inlineAnswers() {
      content.querySelectorAll('.gostudy-student-answer').forEach(node => node.remove());
      const progress = student?.progress?.find(row => row.key === page.key);
      const values = progress?.answers || {};
      const groups = new Map();
      const controls = content.querySelectorAll('[data-q],[data-answer],[data-can],.gap-options input[type="radio"]');
      for (const control of controls) {
        const group = control.closest('.question,.gap-options');
        const key = control.dataset.q ? 'q'+control.dataset.q.replace(':','-') : control.dataset.answer || control.dataset.can || (group?.classList.contains('gap-options') ? group.id : '');
        if (!key || !Object.hasOwn(values,key)) continue;
        const value = values[key];
        if (value === '' || value === null || value === undefined) continue;
        const saved = groups.get(key);
        const chosen = control.type === 'radio' && (String(value)===control.value || String(value)===control.closest('.option')?.querySelector('.option-text,span')?.textContent?.trim());
        if (saved && !chosen) continue;
        const optionText = chosen ? control.closest('.option')?.querySelector('.option-text,span')?.textContent?.trim() : '';
        groups.set(key,{anchor:group || control,label:group?.querySelector('p')?.textContent?.trim() || control.getAttribute('aria-label') || control.placeholder || 'Задание '+(groups.size+1), value:optionText || answerText(value)});
      }
      answers.replaceChildren();
      if (!groups.size) {
        const empty = document.createElement('dd');
        empty.textContent = 'В этом разделе пока нет ответов.';
        answers.append(empty);
      }
      for (const {anchor,label,value} of groups.values()) {
        const note = document.createElement('span');
        note.className = 'gostudy-student-answer';
        note.textContent = 'Ответ ученика: '+value;
        anchor.after(note);
        const name = document.createElement('dt');
        const result = document.createElement('dd');
        name.textContent = label;
        result.textContent = value;
        answers.append(name,result);
      }
    }

    function render() {
      const count = wordItems(studentWords,student?.words);
      const assigned = wordItems(assignedWords,student?.assigned);
      if (dictionaryLists) {
        wordItems(dictionaryLists[0],student?.words,true);
        wordItems(dictionaryLists[1],student?.assigned,true);
      }
      if (dictionaryCount) dictionaryCount.textContent = count+assigned;
      summary.textContent = student ? (student.label || 'Ученик') + ' · Слова: '+count : 'Ученик';
      inlineAnswers();
    }

    async function refresh() {
      if (busy || document.hidden) return;
      if (!session) {
        panelStatus.textContent = 'Войдите в кабинет преподавателя, чтобы открыть данные ученика.';
        return;
      }
      busy = true;
      try {
        const response = await request('/rest/v1/rpc/gostudy_' + page.course + '_teacher_view',{method:'POST',body:{}},await token());
        if (!response.ok || !Array.isArray(response.data)) throw new Error('Данные ученика временно недоступны.');
        const selected = response.data.find(row => row.id===classroomStudent);
        const next = JSON.stringify(selected ?? null);
        student = selected;
        if (signature !== next) {
          signature = next;
          render();
        }
        panelStatus.textContent = student ? 'Ответы и слова обновляются автоматически.' : 'Этот ученик не привязан к вашему аккаунту для этого курса.';
      } catch (error) {
        panelStatus.textContent = error.message;
      } finally { busy = false; }
    }

    async function sendWord(en,ru,status) {
      if (sending || !status) return false;
      if (!session) {
        const login = document.createElement('a');
        login.href = root.querySelector('a').href;
        login.textContent = 'Войти в кабинет преподавателя';
        status.replaceChildren('Для отправки слова войдите в GoStudy. ',login);
        return false;
      }
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(classroomStudent)) {
        status.textContent = 'Откройте урок через список уроков выбранного ученика.';
        return false;
      }
      if (/[а-яё]/i.test(en) && /[a-z]/i.test(ru) && !/[а-яё]/i.test(ru)) [en,ru] = [ru,en];
      if (!en || !ru) {
        status.textContent = 'Введите слово и перевод.';
        return false;
      }
      sending = true;
      send.disabled = true;
      status.textContent = 'Добавляем…';
      try {
        await assignClassroomWord(page.course,classroomStudent,en,ru);
        status.textContent = 'Слово добавлено ученику.';
        refresh();
        return true;
      } catch (error) {
        status.textContent = error.message;
        return false;
      } finally {
        sending = false;
        send.disabled = false;
      }
    }
    send.addEventListener('click',() => {
      const en = document.getElementById('selectedWord')?.textContent.trim() || '';
      const ru = document.getElementById('selectedMeaning')?.value.trim() || '';
      sendWord(en,ru,sendStatus);
    });
    if (wordForm) wordForm.onsubmit = async event => {
      event.preventDefault();
      const en = wordForm.querySelector('#newWord')?.value.trim() || '';
      const ru = wordForm.querySelector('#newMeaning')?.value.trim() || '';
      if (await sendWord(en,ru,dictionaryStatus)) {
        wordForm.reset();
        dictionaryStatus.textContent = 'Слово добавлено ученику.';
      }
    };

    function retainClassroomLinks(rootElement) {
      for (const link of rootElement.querySelectorAll('a[href]')) {
        const url = new URL(link.href,location.href);
        if (url.origin !== location.origin) continue;
        const filename = url.pathname.split('/').pop();
        if (classroomPages.get(filename)?.course === page.course) {
          link.href = classroomLink(filename+url.hash,classroomStudent);
        } else if (filename === cabinetPage) {
          link.href = root.querySelector('a').href;
          link.textContent = '← К урокам ученика';
        }
      }
    }
    retainClassroomLinks(document);
    new MutationObserver(() => {
      retainClassroomLinks(content);
      inlineAnswers();
    }).observe(content,{childList:true});
    render();
    refresh();
    if (session) {
      const poll = setInterval(refresh,3500);
      window.addEventListener('pagehide',event => { if (!event.persisted) clearInterval(poll); });
      document.addEventListener('visibilitychange',refresh);
    }
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
      ['gostudy-tiktok-a2-v1','Урок · One More Video?'],
      ['gostudy-tiktok-a2-homework-v1','Домашнее задание · TikTok A2'],
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
      ['gostudy-feed-b2-v1','Урок 1 · Feed B2'],
      ['gostudy-feed-b2-02-v1','Урок 2 · Feed B2'],
      ['gostudy-feed-b2-02-homework-v1','Домашка 2 · Feed B2'],
      ['gostudy-feed-b2-03-v1','Урок 3 · Feed B2'],
      ['gostudy-feed-b2-03-homework-v1','Домашка 3 · Feed B2'],
      ['gostudy-feed-b2-04-v1','Урок 4 · A real photo, a false story'],
      ['gostudy-feed-b2-04-homework-v1','Домашка 4 · Feed B2'],
      ['gostudy-first-sales-c1-v1','Урок 1 · Your First Sales Interview'],
      ['gostudy-first-sales-c1-homework-v1','Домашка 1 · First Sales C1'],
      ['gostudy-first-sales-c1-02-v1','Урок 2 · Your First Discovery Call'],
      ['gostudy-first-sales-c1-02-homework-v1','Домашка 2 · First Sales C1'],
      ['gostudy-pharma-c1-v1','Урок 1 · Beyond the launch'],
      ['gostudy-pharma-c1-02-v1','Урок 2 · From feedback to strategy'],
      ['gostudy-pharma-c1-02-homework-v1','Домашка 2 · Pharma C1'],
      ['gostudy-pharma-c1-03-v1','Урок 3 · Can AI Help Doctors Spot Cancer?'],
      ['gostudy-pharma-c1-03-homework-v1','Домашка 3 · Pharma C1'],
    ]);
    const lesson4Labels = {
      hwRead1:'Что делала Элла?', hwRead2:'Проблема с поездом в 10:45', hwRead3:'Почему решили подождать?',
      hwListen1:'Новое время отправления', hwListen2:'Номер платформы', hwListen3:'Место встречи',
      hwG1:'I … on the platform', hwG2:'The assistant … us', hwG3:'They … for the platform',
    };
    const finance2Labels = {hwRead1:'Какой платёж проверила Миа?',hwRead2:'Где она нашла название приложения?',hwRead3:'Зачем Миа связалась с поддержкой?',hwListen1:'Сумма списания',hwListen2:'Когда закончился пробный период?',hwListen3:'Что Сэм уже сделал?',hwG1:'I … the statement yesterday',hwG2:'They … yet',hwG3:'She … it last Friday',hwG4:'We … support'};
    const discoveryLabels = {
      'q1-0':'Вопрос о процессе напоминаний','q1-1':'Вопрос о масштабе проблемы','q1-2':'Кто принимает решение',
      'q2-0':'Что уже известно','q2-1':'Что уточнить про интеграцию','q0-0':'Аудио · первоначальная гипотеза',
      'q0-1':'Аудио · ежедневная проблема','q0-2':'Аудио · почему без прогноза','q0-3':'Аудио · следующий шаг',
      'q3-0':'Возражение · у нас уже есть календарь','q3-1':'Возражение · нет времени на демо',
      salesQuestion:'Вопрос для Джордана',salesObjection:'Ответ на возражение',salesCallNotes:'Заметки со звонка',salesDebrief:'Ответ на собеседовании',
    };
    const discoveryHomeworkLabels = {
      'q0-0':'Масштаб проблемы','q0-1':'Возражение о календаре','q0-2':'Следующий шаг',
      'q1-0':'Итог разговора','q1-1':'Конкретная договорённость',salesFollowUp:'Письмо после звонка',salesIntegration:'Что проверить перед интеграцией',
    };
    const pharmaThreeLabels = {"q0-0":"What does the speaker suggest before a wider launch?","q0-1":"Why might the Swedish results differ at this hospital?","q0-2":"Which outcomes does the speaker want to track?","q1-0":"What changed in the AI-supported group?","q1-1":"What does the 44% figure describe?","q1-2":"What could a hospital reasonably ask next?","q2-0":"What does 6.4 versus 5.0 per 1,000 show?","q2-1":"Which headline best fits the evidence?","pharmaPilot":"Решение о пробном запуске","pharmaHeadline":"Заголовок о результатах"};
    const pharmaThreeHomeworkLabels = {"q0-0":"What is the role of AI in the Swedish trial?","q0-1":"What can we say about 44%?","q0-2":"What would a sensible local pilot track?","q1-0":"Which line is suitable for a report?","q1-1":"A patient asks who reviews the scan. Which reply is clearest?"};
    const courses = new Map(Object.entries(classroomCatalog).map(([id,course]) => [id,course.name]));
    const addStudent = document.getElementById('teacher-add-student');
    const addStudentForm = addStudent?.querySelector('form');
    const addStudentStatus = document.getElementById('teacher-add-student-status');
    if (addStudentForm) {
      for (const [id,name] of courses) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        addStudentForm.elements.course.append(option);
      }
      addStudentForm.addEventListener('submit',async event => {
        event.preventDefault();
        const button = addStudentForm.querySelector('button[type="submit"]');
        const email = addStudentForm.elements.email.value.trim();
        const password = addStudentForm.elements.password.value;
        const course = addStudentForm.elements.course.value;
        button.disabled = true;
        addStudentStatus.textContent = 'Создаём аккаунт и назначаем курс…';
        try {
          const result = await request('/functions/v1/gostudy-add-student',{method:'POST',body:{email,password,course}},await token());
          if (!result.ok || result.data?.ok !== true) throw new Error(result.data?.error || 'Не удалось добавить ученика.');
          addStudentForm.reset();
          addStudentStatus.textContent = 'Курс назначен. Ученику можно отправить общую ссылку на вход.';
          refresh();
        } catch(error) {
          addStudentStatus.textContent = error.message;
        } finally { button.disabled = false; }
      });
    }
    const rosterByCourse = new Map();
    let students = [];
    let studentEmails = new Map();
    let signature = '';
    let busy = false;
    let pollTimer;
    const studentSearch = document.getElementById('teacher-student-search');
    const studentList = document.getElementById('teacher-student-list');
    function renderStudentList() {
      if (!studentList) return;
      const query = studentSearch.value.trim().toLowerCase();
      studentList.replaceChildren();
      for (const student of students) {
        const label = student.email || student.label;
        const course = classroomCatalog[student.course]?.name || '';
        if (!(label+' '+(student.label || '')+' '+course).toLowerCase().includes(query)) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-pressed',String(studentPicker.value===student.selection));
        const name = document.createElement('strong');
        name.textContent = label;
        const subtitle = document.createElement('small');
        subtitle.textContent = course;
        button.append(name,subtitle);
        button.onclick = () => { studentPicker.value = student.selection; renderStudent(); };
        studentList.append(button);
      }
      if (!studentList.childElementCount) studentList.textContent = query ? 'Никого не нашли.' : 'Список пока пуст.';
    }
    if (studentSearch) studentSearch.oninput = renderStudentList;

    function renderStudent() {
      renderStudentList();
      const student = students.find(row => row.selection === studentPicker.value);
      wordForm.hidden = !student;
      wordItems(studentWords, student?.words);
      wordItems(assignedWords, student?.assigned);
      const classroom = document.getElementById('teacher-classroom');
      const catalog = student && classroomCatalog[student.course];
      classroom.hidden = !catalog;
      const heading = document.getElementById('teacher-classroom-title');
      const lessonList = document.getElementById('teacher-classroom-lessons');
      heading.textContent = catalog ? 'Класс · '+catalog.name : '';
      lessonList.replaceChildren(...(catalog?.lessons || []).map((lesson,index) => {
        const row = document.createElement('li');
        const link = document.createElement('a');
        link.href = classroomLink(lesson.lesson,student.id);
        link.textContent = 'Урок '+(index+1)+' · '+lesson.title;
        const homework = document.createElement('a');
        homework.href = classroomLink(lesson.homework,student.id);
        homework.textContent = 'Домашнее задание';
        row.append(link,homework);
        return row;
      }));
      const current = document.getElementById('teacher-current-lesson');
      if (current) {
        current.replaceChildren();
        const active = catalog?.lessons.at(-1);
        if (active) {
          const label = document.createElement('p');
          label.textContent = 'Текущий урок';
          const title = document.createElement('h3');
          title.textContent = active.title;
          const actions = document.createElement('div');
          actions.className = 'home-actions';
          for (const [path,name] of [[active.lesson,'Войти в урок'],[active.homework,'Домашнее задание']]) {
            const link = document.createElement('a');
            link.href = classroomLink(path,student.id);
            link.textContent = name;
            if (path === active.lesson) link.className = 'home-primary';
            actions.append(link);
          }
          current.append(label,title,actions);
        }
      }
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
          question.textContent = (key==='gostudy-travel-a2plus-04-v1' && lesson4Labels[id]) || (key==='gostudy-finance-b1-02-v1' && finance2Labels[id]) || (key==='gostudy-first-sales-c1-02-v1' && discoveryLabels[id]) || (key==='gostudy-first-sales-c1-02-homework-v1' && discoveryHomeworkLabels[id]) || (key==='gostudy-pharma-c1-03-v1' && pharmaThreeLabels[id]) || (key==='gostudy-pharma-c1-03-homework-v1' && pharmaThreeHomeworkLabels[id]) || id;
          answer.textContent = answerText(value);
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
        const lookup = async () => {
          if (studentEmails.size && students.every(student => studentEmails.has(student.id))) return;
          const response = await request('/rest/v1/rpc/gostudy_teacher_student_emails',{method:'POST',body:{}},access);
          if (!response.ok || !Array.isArray(response.data)) throw new Error('Не удалось загрузить почту учеников.');
          studentEmails = new Map(response.data.map(row => [row.id,row.email]));
        };
        const results = await Promise.allSettled([lookup(),...Array.from(courses, async ([course,label]) => {
          const response = await request('/rest/v1/rpc/gostudy_' + course + '_teacher_view', {method:'POST',body:{}}, access);
          if (!response.ok || !Array.isArray(response.data)) throw new Error(label);
          rosterByCourse.set(course, response.data.map(row => ({...row,course,selection:course+':'+row.id})));
        })]);
        const roster = Array.from(courses.keys()).flatMap(course => (rosterByCourse.get(course) || []).map(row => ({...row,email:studentEmails.get(row.id)})));
        const next = JSON.stringify(roster);
        if (signature !== next) {
          const selected = studentPicker.value || new URLSearchParams(location.search).get('selected');
          signature = next;
          students = roster;
          if (addStudent) addStudent.hidden = !students.length;
          studentPicker.replaceChildren(...students.map(student => {
            const option = document.createElement('option');
            option.value = student.selection;
            option.textContent = student.email ? student.email+' · '+courses.get(student.course) : student.label;
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
        await assignClassroomWord(student.course,student.id,wordForm.elements.en.value.trim(),wordForm.elements.ru.value.trim());
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
    if (document.getElementById('dictionary') || document.getElementById('translationPop')) {
      const vocabularyStyles = document.createElement('link');
      vocabularyStyles.rel = 'stylesheet';
      vocabularyStyles.href = 'assets/gostudy-classroom.css?v=4';
      document.head.append(vocabularyStyles);
    }
    if (document.getElementById('teacher-login')) mountTeacher();
    else if (document.getElementById('unified-login')) mountUnifiedAccount();
    else if (document.getElementById('cloud-login')) mountAccount();
    else if (document.getElementById('tiktok-cabinet')) mountTiktokCabinet(document.getElementById('tiktok-cabinet'));
    else if (classroomStudent !== null) mountClassroom();
    else { mountStudentHome(); mountLesson(); mountTeacherWords(); }
  });
})();
