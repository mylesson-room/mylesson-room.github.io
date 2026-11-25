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
  function remove(word, status) {
    const control = button('Удалить из словаря: ' + word.en, '×', async () => {
      control.disabled = true;
      try {
        if (!window.FinanceLive?.removeWord) throw Error('Словарь ещё подключается.');
        await FinanceLive.removeWord(word);
      } catch (error) {
        status.textContent = error.message;
        control.disabled = false;
      }
    }, 'word-action-remove');
    return control;
  }
  function buildRow(word, text, status) {
    const row = document.createElement('span');
    row.className = 'word-action-row';
    row.append(audio(word.en), text, remove(word, status));
    return row;
  }
  window.GoStudyWordActions = { audio, buildRow };
})();
