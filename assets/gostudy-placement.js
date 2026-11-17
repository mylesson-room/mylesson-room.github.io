(() => {
  const auth = window.GoStudyPrivateAccess;
  const body = document.body;
  const $ = selector => document.querySelector(selector);
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });

  function addTimer(panel, step, key) {
    const tools = document.createElement('div');
    tools.className = 'placement-tools';
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'outline';
    start.textContent = 'Start ' + step.minutes + '-minute timer';
    const clock = document.createElement('span');
    clock.setAttribute('role', 'timer');
    tools.append(start, clock);
    panel.querySelector('.lead').after(tools);
    let deadline = Number(sessionStorage.getItem(key));
    let interval;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      clock.textContent = remaining ? Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0') : 'Time is up';
      if (!remaining) clearInterval(interval);
    };
    const run = () => {
      start.disabled = true;
      interval = setInterval(update, 250);
      update();
    };
    start.onclick = () => {
      deadline = Date.now() + step.minutes * 60000;
      sessionStorage.setItem(key, String(deadline));
      run();
    };
    if (deadline) run();
  }

  function addRecorder(panel, seconds) {
    const tools = document.createElement('div');
    tools.className = 'placement-tools';
    const record = document.createElement('button');
    record.type = 'button';
    record.className = 'outline';
    record.textContent = 'Record locally';
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    const playback = document.createElement('audio');
    playback.controls = true;
    playback.hidden = true;
    tools.append(record, status, playback);
    panel.querySelector('.lead').after(tools);
    let recorder, timeout, playbackURL;
    record.onclick = async () => {
      if (recorder?.state === 'recording') {
        recorder.stop();
        return;
      }
      record.disabled = true;
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({audio:true});
        recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = event => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.onstop = () => {
          clearTimeout(timeout);
          stream.getTracks().forEach(track => track.stop());
          if (playbackURL) URL.revokeObjectURL(playbackURL);
          playbackURL = URL.createObjectURL(new Blob(chunks, {type:recorder.mimeType}));
          playback.src = playbackURL;
          playback.hidden = false;
          record.textContent = 'Record again';
          status.textContent = 'Available in this tab until you reload.';
        };
        recorder.start();
        record.textContent = 'Stop';
        status.textContent = 'Recording · up to ' + seconds + ' seconds';
        timeout = setTimeout(() => recorder.stop(), seconds * 1000);
      } catch {
        stream?.getTracks().forEach(track => track.stop());
        status.textContent = 'Microphone unavailable. You can speak live or use the notes below.';
      } finally {
        record.disabled = false;
      }
    };
    window.addEventListener('pagehide', () => {
      if (recorder?.state === 'recording') recorder.stop();
      if (playbackURL) URL.revokeObjectURL(playbackURL);
    });
  }

  function addScores(panel, steps) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'outline';
    button.textContent = 'Calculate objective scores';
    const score = document.createElement('ul');
    score.setAttribute('aria-live', 'polite');
    button.onclick = () => {
      const scores = new Map();
      let total = 0;
      let count = 0;
      for (const step of steps.filter(step => step.type === 'choice')) {
        const group = scores.get(step.skill) || {points:0, count:0};
        step.items.forEach(([, , answer], index) => {
          const selected = document.querySelector('input[name="' + CSS.escape(step.id + ':' + index) + '"]:checked');
          if (selected?.value === String(answer)) group.points++;
        });
        group.count += step.items.length;
        scores.set(step.skill, group);
      }
      const rows = [...scores].map(([skill, group]) => {
        total += group.points;
        count += group.count;
        return skill + ' · ' + group.points + ' / ' + group.count;
      });
      rows.push('Objective total · ' + total + ' / ' + count);
      score.replaceChildren(...rows.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    };
    panel.append(button, score);
  }

  let started = false;
  async function start() {
    if (started) return;
    started = true;
    const privateRoom = auth.room();
    if (body.hasAttribute('data-placement-cabinet')) {
      window.GoStudyLesson = {privateRoom};
      const refresh = () => {
        updateVocabularyCount();
        if (wordsDialog.open) openVocabulary();
      };
      document.addEventListener('finance-ready', refresh);
      document.addEventListener('finance-word', refresh);
      await loadScript('assets/gostudy-finance-live.js');
      return;
    }

    const loading = $('#placement-loading');
    loading.hidden = false;
    loading.textContent = 'Загружаем урок…';
    try {
      const query = new URLSearchParams({
        select:'lesson_payload',
        slug:'eq.english-placement',
        student_id:'eq.'+privateRoom.student
      });
      const result = await auth.request('/rest/v1/gostudy_private_lessons?' + query);
      const content = result.ok && result.data?.[0]?.lesson_payload;
      if (!content?.steps?.length) throw new Error('Урок пока недоступен.');
      const teacher = privateRoom.teacher === auth.userId();
      const cabinet = teacher ? 'gostudy-teacher.html?selected=english_placement%3A' + privateRoom.student : 'student-english-placement.html';
      const config = document.createElement('script');
      config.type = 'application/json';
      config.id = 'lesson-data';
      config.textContent = JSON.stringify({
        ...content, cabinet, privateRoom, deferGrading:true,
        key:'gostudy-english-placement:' + privateRoom.student,
        wordsKey:'gostudy-english-placement-vocabulary'
      });
      body.append(config);
      await loadScript(body.dataset.lessonScript);
      await loadScript(body.dataset.exercisesScript);
      const pages = $('#lessonPages');
      pages.inert = true;
      document.addEventListener('finance-ready', () => { pages.inert = false; }, {once:true});
      await loadScript(body.dataset.workbookScript);

      for (const [index, step] of content.steps.entries()) {
        const panel = pages.children[index].querySelector('.panel');
        if (step.minutes) addTimer(panel, step, 'placement-timer:' + auth.userId() + ':' + step.id);
        if (step.speaking && !teacher) addRecorder(panel, step.speaking);
        if (step.id === 'marking') addScores(panel, content.steps);
      }
      loading.hidden = true;
      $('.classroom-access').hidden = true;
    } catch {
      loading.textContent = 'Не удалось открыть урок. Обновите страницу или войдите через GoStudy.';
    }
  }

  document.addEventListener('gostudy-private-signed-out', () => location.assign('login.html'));
  document.addEventListener('gostudy-private-authorized', start, {once:true});
  auth.ready.then(ok => { if (ok) start(); });
})();
