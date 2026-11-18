/* GoStudy shared video adapter. Opt-in pilot: the finance lesson only.
   Existing vocabulary, chat, answers and homework remain untouched. */
(() => {
  'use strict';
  if (!document.body.hasAttribute('data-jaas-video-pilot')) return;
  const workspace = document.querySelector('#lessonVideo .video-workspace');
  const placeholder = workspace?.querySelector('.video-preview');
  const actions = workspace?.querySelector('.video-actions');
  const state = workspace?.querySelector('.video-state');
  if (!workspace || !placeholder || !actions || !state) return;
  const BASE = 'https://kawfqlohguwvmmplvrny.supabase.co';
  const ANON_KEY = 'sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
  const endpoint = BASE + '/functions/v1/gostudy-jaas-token';
  const appIdFormat = /^vpaas-magic-cookie-[A-Za-z0-9-]+$/;
  const roomFormat = /^gostudy-finance-[0-9a-f]{32}$/;
  const connect = document.createElement('button');
  connect.type = 'button';
  connect.className = 'call-btn jaas-connect';
  connect.textContent = 'Включить видео';
  connect.disabled = true;
  const leaveButton = document.createElement('button');
  leaveButton.type = 'button';
  leaveButton.className = 'jaas-leave';
  leaveButton.textContent = 'Завершить звонок';
  leaveButton.hidden = true;
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'jaas-expand';
  expand.textContent = 'Развернуть';
  expand.hidden = true;
  const message = document.createElement('p');
  message.className = 'jaas-message';
  message.setAttribute('role', 'status');
  message.textContent = 'Видеосвязь доступна после входа в урок.';
  actions.prepend(connect, leaveButton, expand);
  workspace.append(message);
  let api = null;
  let frame = null;
  let busy = false;
  let meeting = false;
  let scriptPromise = null;
  const getAuth = () => window.GoStudyFinanceAuth;
  const authorized = () => Boolean(getAuth()?.userId() && window.FinanceLive?.connected());
  const status = (text) => { state.textContent = text; message.textContent = text; };
  function sync() {
    connect.disabled = busy || Boolean(api) || !authorized();
    connect.hidden = Boolean(api);
    leaveButton.hidden = !api;
    expand.hidden = !api;
  }
  function end() {
    const previous = api;
    api = null;
    meeting = false;
    try { previous?.dispose(); } catch {}
    frame?.remove();
    frame = null;
    placeholder.hidden = false;
    workspace.classList.remove('jaas-on-call');
    status('Видео отключено');
    busy = false;
    sync();
  }
  function loadLibrary(appId) {
    if (!scriptPromise) {
      scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://8x8.vc/' + appId + '/external_api.js';
        script.async = true;
        script.onload = () => window.JitsiMeetExternalAPI ? resolve() : reject(Error('Jitsi не загрузился.'));
        script.onerror = () => reject(Error('Сервис видеосвязи недоступен.'));
        document.head.append(script);
      }).catch(error => { scriptPromise = null; throw error; });
    }
    return scriptPromise;
  }
  async function join() {
    if (busy || api || !authorized()) return;
    busy = true;
    sync();
    status('Подготавливаем видеосвязь…');
    try {
      const auth = getAuth();
      const token = await auth.token();
      const response = await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          apikey: ANON_KEY,
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId: auth.classroomStudent || null }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error || 'Нет доступа к видеокомнате.');
      if (!appIdFormat.test(data.appId) || !roomFormat.test(data.room) || typeof data.jwt !== 'string')
        throw Error('Неверный ответ сервиса видео.');
      await loadLibrary(data.appId);
      if (!authorized()) throw Error('Сессия урока завершена.');
      frame = document.createElement('div');
      frame.className = 'jaas-frame';
      frame.setAttribute('aria-label', 'Видеозвонок GoStudy');
      placeholder.hidden = true;
      placeholder.after(frame);
      api = new window.JitsiMeetExternalAPI('8x8.vc', {
        roomName: data.appId + '/' + data.room,
        parentNode: frame,
        width: '100%',
        height: '100%',
        jwt: data.jwt,
        lang: 'ru',
        configOverwrite: { startWithAudioMuted: true, prejoinPageEnabled: true },
      });
      workspace.classList.add('jaas-on-call');
      api.addEventListener('videoConferenceJoined', () => {
        meeting = true;
        status('Вы в видеозвонке');
      });
      api.addEventListener('videoConferenceLeft', end);
      api.addEventListener('readyToClose', end);
      status('Подключаемся к комнате…');
    } catch (error) {
      end();
      status(error instanceof Error ? error.message : 'Не удалось подключить видео.');
    } finally {
      busy = false;
      sync();
    }
  }
  connect.addEventListener('click', join);
  leaveButton.addEventListener('click', end);
  expand.addEventListener('click', async () => {
    if (!frame) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.requestFullscreen) await frame.requestFullscreen();
    } catch { status('Полноэкранный режим не поддерживается.'); }
  });
  document.addEventListener('finance-ready', () => { status('Можно включить видео'); sync(); });
  document.addEventListener('finance-connect', sync);
  document.addEventListener('gostudy-private-signed-out', end);
  window.addEventListener('pagehide', end);
  sync();
})();
