(() => {
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-speak-word]');
    if (!button) return;
    if (!supported) {
      button.textContent = 'Озвучка недоступна';
      button.disabled = true;
      return;
    }
    const term = button.closest('.word, .dictrow')?.querySelector('strong')?.textContent.trim();
    if (!term) return;
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.lang = /[а-яё]/i.test(term) ? 'ru-RU' : 'en-GB';
    utterance.rate = 0.88;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
})();