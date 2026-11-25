(() => {
  const speaker = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/></svg>';
  function button(label, content, action, className) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'word-action ' + className;
    control.setAttribute('aria-label', label);
    control.title = label;
    control.innerHTML = content;
    control.addEventListener('click', action);
    return control;
  }
  function pronounce(text, language = 'en-GB') {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.87;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }
  function audio(text, language = () => 'en-GB') {
    const getText = typeof text === 'function' ? text : () => text;
    return button('Прослушать' + (typeof text === 'string' ? ': ' + text : ''),
      speaker, () => pronounce(getText(), language()), 'word-action-audio');
  }
  const wordKey = en => en.trim().toLowerCase();
  function record(key, store) {
    try {
      const value = JSON.parse(store.getItem(key) || '{}') || {};
      return Array.isArray(value) ? {words:value} : value;
    } catch { return {}; }
  }
  function hidden(word, key, store = window.GoStudyStorage || localStorage) {
    return Boolean(window.FinanceLive?.hasRemovedWord?.(word.en)) ||
      Boolean(key && record(key, store).removed?.includes(wordKey(word.en)));
  }
  function hide(word, key, store = window.GoStudyStorage || localStorage) {
    const before = record(key, store);
    store.setItem(key, JSON.stringify({...before, removed:[...new Set([...(before.removed || []), wordKey(word.en)])]}));
  }
  function restore(word, key, store = window.GoStudyStorage || localStorage) {
    const before = record(key, store);
    if (before.removed?.includes(wordKey(word.en))) {
      store.setItem(key, JSON.stringify({...before, removed:before.removed.filter(key => key !== wordKey(word.en))}));
    }
  }
  function remove(word, status, onRemove) {
    const control = button('Удалить из словаря: ' + word.en, '×', async () => {
      control.disabled = true;
      try {
        status.textContent = '';
        if (onRemove) await onRemove(word);
        else {
          if (!window.FinanceLive?.removeWord) throw Error('Словарь ещё подключается.');
          await FinanceLive.removeWord(word);
        }
      } catch (error) {
        status.textContent = error.message;
        control.disabled = false;
      }
    }, 'word-action-remove');
    return control;
  }
  function buildRow(word, text, status, onRemove) {
    const row = document.createElement('span');
    row.className = 'word-action-row';
    row.append(audio(word.en), text, remove(word, status, onRemove));
    return row;
  }
  let privateCabinetRoom;
  function connectCabinet(course, lesson) {
    const body = document.body;
    if (body.hasAttribute('data-word-actions-room')) return;
    if (window.GoStudyFinanceAuth) {
      body.dataset.liveCourse = course;
      body.dataset.classroomLesson = lesson;
    } else {
      const room = window.GoStudyPrivateAccess?.room();
      const student = room?.student || body.dataset.vocabularyOwner;
      if (!student) return;
      privateCabinetRoom = {...room,student,course,lesson};
    }
    body.setAttribute('data-word-actions-room','');
    const transport = document.createElement('script');
    transport.src = 'assets/gostudy-finance-live.js';
    document.head.append(transport);
  }
  document.addEventListener('gostudy-private-authorized', () => {
    const body = document.body;
    if (!document.getElementById('cabinet-settings')) return;
    if (body.hasAttribute('data-placement-cabinet')) connectCabinet('vietnam-a2','my-trip-to-vietnam-a2.html');
    if (body.hasAttribute('data-ielts-reading')) connectCabinet('ielts-reading','ielts-reading-04.html');
  });
  window.GoStudyWordActions = {
    audio, buildRow, hidden, hide, restore, connectCabinet, cabinetRoom: () => privateCabinetRoom,
  };
})();
