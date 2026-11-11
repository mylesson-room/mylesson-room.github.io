(() => {
  'use strict';

  const project = 'https://kawfqlohguwvmmplvrny.supabase.co';
  const publicKey = 'sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
  const authKey = 'gostudy-cloud-session-v1';
  const lessonKeys = [
    'gostudy-travel-disruptions-b2-v1',
    'gostudy-travel-disruptions-b2-homework-v1',
    'gostudy-travel-b2-02-v1',
    'gostudy-travel-b2-02-homework-v1',
    'gostudy-travel-b2-profile-v1',
  ];
  const keys = new Set(lessonKeys);
  const accountPage = 'gostudy-account.html';
  const cabinetPage = 'student-travel-b2.html';
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
  async function token() {
    if (!session) throw new Error('Войдите в аккаунт GoStudy.');
    if (session.expires_at > Date.now() + 30000) return session.access_token;
    const response = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: {refresh_token: session.refresh_token},
    });
    if (!response.ok) throw new Error('Срок входа истёк. Откройте аккаунт и войдите снова.');
    saveSession(response.data);
    return session.access_token;
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
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cloud-login')) mountAccount();
    else mountLesson();
  });
})();
