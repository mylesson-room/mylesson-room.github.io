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
  const b1Stories = document.body?.dataset?.jaasScope === 'b1-stories';
  const countryHouse = document.body?.dataset?.jaasScope === 'country-house';
  const swedenA2 = document.body?.dataset?.jaasScope === 'sweden-a2';
  const artB1 = document.body?.dataset?.jaasScope === 'art-b1';
  const ieltsReading = document.body?.dataset?.jaasScope === 'ielts-reading';
  const classroom = document.body?.dataset?.jaasScope === 'classroom';
  const endpoint = BASE + (classroom ? '/functions/v1/gostudy-jaas-classroom-token' :
    b1Stories ? '/functions/v1/gostudy-jaas-b1-token' :
    countryHouse ? '/functions/v1/gostudy-jaas-country-house-token' :
    swedenA2 ? '/functions/v1/gostudy-jaas-sweden-token' :
    artB1 ? '/functions/v1/gostudy-jaas-art-b1-token' :
    ieltsReading ? '/functions/v1/gostudy-jaas-ielts-token' : '/functions/v1/gostudy-jaas-token');
  const appIdFormat = /^vpaas-magic-cookie-[A-Za-z0-9-]+$/;
  const roomFormat = classroom ? /^gostudy-classroom-[a-z][a-z0-9-]{1,48}-[0-9a-f]{32}$/ :
    b1Stories ? /^gostudy-b1-stories-[0-9a-f]{32}$/ :
    countryHouse ? /^gostudy-country-house-[0-9a-f]{32}$/ :
    swedenA2 ? /^gostudy-sweden-a2-[0-9a-f]{32}$/ :
    artB1 ? /^gostudy-art-b1-[0-9a-f]{32}$/ :
    ieltsReading ? /^gostudy-ielts-reading-[0-9a-f]{32}$/ : /^gostudy-finance-[0-9a-f]{32}$/;
  const connect = document.createElement('button');
  connect.type = 'button';
  connect.className = 'call-btn jaas-connect';
  connect.setAttribute('aria-label', 'Включить видео');
  connect.title = 'Включить видеосвязь';
  // A click must always produce a visible response, even before login.
  connect.disabled = false;
  const leaveButton = document.createElement('button');
  leaveButton.type = 'button';
  leaveButton.className = 'jaas-leave';
  leaveButton.setAttribute('aria-label', 'Завершить звонок');
  leaveButton.title = 'Завершить звонок';
  leaveButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M3 3l18 18"/><path d="M8.8 5.2h-2A2 2 0 0 0 4.8 7c.1 6.2 5.1 11.2 11.2 11.2a2 2 0 0 0 1.8-2v-2"/><path d="M14.7 12.8c.7.4 1.5.8 2.4 1l1.6-1.6a1.5 1.5 0 0 1 1.6-.3l1.8.8"/></svg>';
  leaveButton.hidden = true;
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'jaas-expand';
  expand.textContent = 'Развернуть';
  expand.hidden = true;
  // Keep the original iframe mounted for the entire lesson. Moving/replacing it
  // when the section changes can interrupt an active WebRTC call on iOS Safari.
  const sizeButton = document.createElement('button');
  sizeButton.type = 'button';
  sizeButton.className = 'jaas-size';
  sizeButton.textContent = 'Увеличить';
  sizeButton.setAttribute('aria-label', 'Увеличить видео');
  sizeButton.setAttribute('aria-pressed', 'false');
  sizeButton.hidden = true;
  const message = document.createElement('p');
  message.className = 'jaas-message';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.textContent = 'Видеосвязь доступна после входа в урок.';
  // Reference design: two vertical video tiles, visually matching the approved
  // teacher/student panel. These are pre-join placeholders, not fake media streams.
  // Real participant video continues to render only inside the live Jitsi iframe.
  for (const legacy of actions.querySelectorAll?.(':scope > a, :scope > span') || []) legacy.remove();
  const personIcon = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="10.5" r="5.1"/><path d="M6 27v-3c0-5 4.2-9 10-9s10 4 10 9v3"/></svg>';
  function makeTile(role, label) {
    const tile = document.createElement('div');
    tile.className = 'jaas-person-tile jaas-person-' + role;
    const avatar = document.createElement('div');
    avatar.className = 'jaas-person-icon';
    avatar.innerHTML = personIcon;
    const caption = document.createElement('span');
    caption.className = 'jaas-person-label';
    caption.textContent = label;
    tile.append(avatar, caption);
    return tile;
  }
  placeholder.replaceChildren(makeTile('teacher', 'Преподаватель'), makeTile('student', 'Ученик'));
  placeholder.setAttribute('role','button');
  placeholder.setAttribute('tabindex','0');
  placeholder.setAttribute('aria-label','Включить видеосвязь между преподавателем и учеником');
  placeholder.title = 'Нажмите для подключения видеосвязи';
  const micButton = document.createElement('button');
  micButton.type = 'button';
  micButton.className = 'jaas-mic';
  micButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 10.5a7 7 0 0 0 14 0M12 17.5V21m-4 0h8"/></svg>';
  const cameraButton = document.createElement('button');
  cameraButton.type = 'button';
  cameraButton.className = 'jaas-camera';
  cameraButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="2.5" y="5.5" width="13.5" height="13" rx="3"/><path d="m16 9 5.5-3v12L16 15z"/></svg>';
  connect.innerHTML = cameraButton.innerHTML;
  connect.innerHTML += '<span class="jaas-visually-hidden">Включить видео</span>';
  actions.prepend(micButton, connect, cameraButton, leaveButton);
  actions.classList.add('jaas-control-bar');
  workspace.append(sizeButton, expand);
  workspace.append(message);
  let api = null;
  let frame = null;
  let busy = false;
  let meeting = false;
  let scriptPromise = null;
  let compact = true;
  let audioMuted = true; // mirrors startWithAudioMuted until Jitsi emits actual status
  let videoMuted = false;
  function setMediaButton(button, muted, media) {
    const enabled = !muted;
    button.classList.toggle('is-muted', muted);
    button.setAttribute('aria-pressed', String(enabled));
    const label = media === 'audio' ? 'микрофон' : 'камеру';
    const title = (enabled ? 'Выключить ' : 'Включить ') + label;
    button.setAttribute('aria-label', title);
    button.title = title;
  }
  function updateMedia() {
    setMediaButton(micButton, audioMuted, 'audio');
    setMediaButton(cameraButton, videoMuted, 'video');
    micButton.disabled = !api || !meeting;
    cameraButton.disabled = !api || !meeting;
  }
  const mobile = () => window.matchMedia?.('(max-width: 800px)').matches ?? false;
  function setCompact(next) {
    compact = Boolean(next);
    workspace.classList.toggle('jaas-compact', compact);
    sizeButton.textContent = compact ? 'Увеличить' : 'Свернуть';
    sizeButton.setAttribute('aria-label', compact ? 'Увеличить видео' : 'Свернуть видео');
    sizeButton.setAttribute('aria-pressed', String(!compact));
  }
  const getAuth = () => {
    if (ieltsReading) {
      const auth = window.GoStudyPrivateAccess;
      if (!auth) return null;
      const owner = document.body.dataset.vocabularyOwner;
      return {
        userId: auth.userId, token: auth.token, request: auth.request,
        classroomStudent: auth.userId() === owner ? null : owner
      };
    }
    return b1Stories ? window.GoStudyB1VideoAuth : window.GoStudyFinanceAuth;
  };
  // Video authorization lives in the Supabase token endpoint, not in the
  // independent live-chat transport. Never silently disable the button.
  const hasSession = () => Boolean(getAuth()?.userId());
  const status = (text) => {
    state.textContent = text;
    message.textContent = text;
    // Keep the reference layout clean, but never hide an authentication,
    // camera or network error from the user.
    workspace.classList.toggle('jaas-status-alert',
      /ошиб|не удалось|нет доступа|не назначена|войдите|истекла|неверн|недоступен|не поддерживается|проверьте|не пройдена/i.test(text));
  };
  function sync() {
    connect.disabled = busy || Boolean(api);
    connect.title = busy ? 'Подключаемся…' : 'Включить видеосвязь';
    connect.setAttribute('aria-label', busy ? 'Подключаемся…' : 'Включить видео');
    connect.setAttribute('aria-busy', String(busy));
    connect.hidden = Boolean(api);
    actions.hidden = false;
    micButton.hidden = false;
    cameraButton.hidden = !api;
    leaveButton.hidden = false;
    leaveButton.disabled = !api;
    expand.hidden = !api;
    sizeButton.hidden = !api;
    workspace.classList.toggle('jaas-joining', busy);
    updateMedia();
  }
  function end() {
    const previous = api;
    api = null;
    meeting = false;
    audioMuted = true;
    videoMuted = false;
    try { previous?.dispose(); } catch {}
    frame?.remove();
    frame = null;
    placeholder.hidden = false;
    workspace.classList.remove('jaas-on-call', 'jaas-compact');
    document.body.classList.remove('jaas-video-active');
    status('Видео отключено');
    busy = false;
    sync();
  }
  function loadLibrary(appId) {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (!scriptPromise) {
      scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        let finished = false;
        const timer = setTimeout(() => finish(Error('Jitsi не ответил за 15 секунд. Проверьте доступ к 8x8.vc и попробуйте ещё раз.')), 15000);
        function finish(error) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          script.onload = null;
          script.onerror = null;
          if (error) {
            script.remove();
            reject(error);
          } else resolve();
        }
        script.src = 'https://8x8.vc/' + appId + '/external_api.js';
        script.async = true;
        script.onload = () => finish(window.JitsiMeetExternalAPI ? null : Error('Видеоплеер Jitsi не загрузился.'));
        script.onerror = () => finish(Error('Сервис Jitsi недоступен в этой сети. Проверьте доступ к 8x8.vc.'));
        document.head.append(script);
      }).catch(error => { scriptPromise = null; throw error; });
    }
    return scriptPromise;
  }
  async function resolveStudentId(auth, accessToken) {
    if (classroom) {
      if (auth.classroomStudent) return auth.classroomStudent;
      const course = document.body.dataset.classroomCourse;
      const lessonPath = document.body.dataset.classroomLesson;
      if (!course || !lessonPath) throw Error('Для видео не указан текущий урок.');
      const query = new URLSearchParams({
        select: 'student_id,teacher_id,course,lesson_path',
        course: 'eq.' + course,
        lesson_path: 'eq.' + lessonPath,
      });
      const result = await auth.request('/rest/v1/gostudy_classroom_rooms?' + query, {}, accessToken);
      if (!result.ok || !Array.isArray(result.data))
        throw Error('Не удалось проверить доступ к видеокомнате.');
      const me = auth.userId();
      const rooms = result.data.filter(room =>
        room.course === course && room.lesson_path === lessonPath &&
        (room.student_id === me || room.teacher_id === me)
      );
      if (rooms.length !== 1)
        throw Error(rooms.length
          ? 'Откройте урок через кабинет преподавателя, выбрав ученика.'
          : 'Видеокомната не назначена этому аккаунту.');
      return rooms[0].student_id === me ? null : rooms[0].student_id;
    }
    // The B1 token endpoint validates the existing restricted B1 course RPC.
    // Do not look at the unrelated finance-room table for this lesson.
    if (b1Stories || countryHouse || swedenA2 || artB1 || ieltsReading) return auth.classroomStudent || null;
    // Teacher links normally include classStudent, but direct lesson URLs do not.
    // Find the single finance room the signed-in user can access via RLS.
    // Do not guess a room if the teacher has more than one.
    if (auth.classroomStudent) return auth.classroomStudent;
    const response = await auth.request(
      '/rest/v1/gostudy_finance_room?select=teacher_id,student_id',
      {}, accessToken
    );
    if (!response.ok || !Array.isArray(response.data))
      throw Error('Не удалось проверить доступ к видеокомнате.');
    const userId = auth.userId();
    const rooms = response.data.filter(room =>
      room?.student_id === userId || room?.teacher_id === userId
    );
    if (rooms.length !== 1)
      throw Error(rooms.length === 0
        ? 'Видеокомната не назначена этому аккаунту.'
        : 'Откройте урок через кабинет преподавателя, выбрав ученика.');
    const room = rooms[0];
    return room.student_id === userId ? null : room.student_id;
  }
  async function join() {
    if (busy || api) return;
    busy = true;
    sync();
    status('Проверяем доступ к видеокомнате…');
    try {
      const auth = getAuth();
      if (!hasSession() || !auth?.token || !auth?.request)
        throw Error('Войдите в аккаунт GoStudy для видеозвонка.');
      const token = await auth.token();
      const studentId = await resolveStudentId(auth, token);
      const response = await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          apikey: ANON_KEY,
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classroom ? {
          studentId,
          course: document.body.dataset.classroomCourse,
          lessonPath: document.body.dataset.classroomLesson,
        } : { studentId }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error || 'Нет доступа к видеокомнате.');
      if (!appIdFormat.test(data.appId) || !roomFormat.test(data.room) || typeof data.jwt !== 'string')
        throw Error('Неверный ответ сервиса видео.');
      status('Загружаем видеоплеер Jitsi…');
      await loadLibrary(data.appId);
      if (!hasSession()) throw Error('Сессия GoStudy завершена. Войдите заново.');
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
        configOverwrite: {
          startWithAudioMuted: true,
          prejoinPageEnabled: true,
          toolbarButtons: ['settings'],
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TILE_VIEW_MAX_COLUMNS: 1,
          SHOW_JITSI_WATERMARK: false,
        },
      });
      workspace.classList.add('jaas-on-call');
      document.body.classList.add('jaas-video-active');
      setCompact(mobile());
      api.addEventListener('videoConferenceJoined', () => {
        meeting = true;
        status('Вы в видеозвонке');
        updateMedia();
        // Ask Jitsi to show local + remote participants as a single-column gallery.
        // Jitsi owns the actual video rendering inside its secure iframe.
        try { api?.executeCommand?.('toggleTileView'); } catch {}
      });
      api.addEventListener('audioMuteStatusChanged', event => {
        if (typeof event?.muted === 'boolean') audioMuted = event.muted;
        updateMedia();
      });
      api.addEventListener('videoMuteStatusChanged', event => {
        if (typeof event?.muted === 'boolean') videoMuted = event.muted;
        updateMedia();
      });
      api.addEventListener('errorOccurred', () => status('Jitsi сообщает об ошибке видеозвонка. Попробуйте переподключиться.'));
      api.addEventListener('videoConferenceLeft', end);
      api.addEventListener('readyToClose', end);
      status('Открываем видеокомнату…');
    } catch (error) {
      end();
      status(error instanceof Error ? error.message : 'Не удалось подключить видео.');
    } finally {
      busy = false;
      sync();
    }
  }
  connect.addEventListener('click', join);
  placeholder.addEventListener('click', () => { if (!api && !busy) join(); });
  placeholder.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!api && !busy) join();
    }
  });
  micButton.addEventListener('click', () => {
    if (!api || !meeting) return;
    try { api.executeCommand('toggleAudio'); }
    catch { status('Не получилось переключить микрофон. Проверьте разрешения браузера.'); }
  });
  cameraButton.addEventListener('click', () => {
    if (!api || !meeting) return;
    try { api.executeCommand('toggleVideo'); }
    catch { status('Не получилось переключить камеру. Проверьте разрешения браузера.'); }
  });
  sizeButton.addEventListener('click', () => setCompact(!compact));
  leaveButton.addEventListener('click', end);
  expand.addEventListener('click', async () => {
    if (!frame) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.requestFullscreen) await frame.requestFullscreen();
    } catch { status('Полноэкранный режим не поддерживается.'); }
  });
  document.addEventListener('finance-ready', () => { if (!api && !busy) status('Можно включить видео'); sync(); });
  document.addEventListener('finance-connect', sync);
  document.addEventListener('gostudy-private-signed-out', end);
  window.addEventListener('pagehide', end);
  updateMedia();
  sync();
})();
