(() => {
  'use strict';

  const lessonKey = document.body.dataset.lessonKey;
  const wordsKey = 'gostudy-tiktok-a2-words-v1';
  const get = id => document.getElementById(id);
  const normalize = text => text.trim().toLowerCase().replace(/\s+/g, ' ');
  const glossary = new Map([
    ['feed', 'лента'], ['scroll', 'листать'], ['skip', 'пропустить'],
    ['follow', 'подписаться'], ['save', 'сохранить'], ['share', 'поделиться'],
    ['useful', 'полезный'], ['try it', 'попробовать это'],
    ['just one video', 'всего один ролик'], ['in a hurry', 'в спешке'],
    ['for a few minutes', 'на несколько минут'], ['recipe', 'рецепт'],
    ['often', 'часто'], ['usually', 'обычно'], ['never', 'никогда'],
  ]);

  function read(key) {
    try {
      return JSON.parse(GoStudyStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  if (lessonKey) {
    const controls = document.querySelectorAll('[data-answer]');
    const answers = read(lessonKey).answers || {};
    for (const control of controls) {
      const key = control.dataset.answer;
      control.value = answers[key] || '';
      function mark() {
        const correct = normalize(control.value) === control.dataset.correct;
        control.classList.toggle('is-correct', correct);
        if (control.dataset.correct) {
          get(control.id + '-feedback').textContent = correct ? '✓' : '';
        }
      }
      function save() {
        answers[key] = control.value;
        GoStudyStorage.setItem(lessonKey, JSON.stringify({answers}));
      }
      control.addEventListener('input', () => {
        save();
        if (control.tagName === 'SELECT') mark();
        else {
          control.classList.remove('is-correct');
          const feedback = get(control.id + '-feedback');
          if (feedback) feedback.textContent = '';
        }
      });
      control.addEventListener('blur', mark);
      control.addEventListener('keydown', event => {
        if (event.key === 'Enter' && control.tagName === 'INPUT') control.blur();
      });
      mark();
    }
  }

  const dictionary = get('dictionary');
  const popup = get('translationPop');
  let lookup = 0;

  function words() {
    return read(wordsKey).words || [];
  }

  function setWords(items) {
    GoStudyStorage.setItem(wordsKey, JSON.stringify({words:items}));
    renderWords();
  }

  function addWord(en, ru) {
    if (!en || !ru) return;
    const items = words().filter(word => normalize(word.en) !== normalize(en));
    setWords([...items, {en, ru}]);
  }

  function renderWords() {
    const items = words();
    get('wordList').replaceChildren(...items.map(word => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = word.en + ' — ' + word.ru;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Удалить';
      remove.setAttribute('aria-label', 'Удалить ' + word.en);
      remove.onclick = () => setWords(words().filter(item => item.en !== word.en));
      row.append(label, remove);
      return row;
    }));
    get('wordCount').textContent = items.length;
  }

  function hidePopup() {
    lookup++;
    popup.hidden = true;
  }

  get('dictBtn').onclick = () => {
    hidePopup();
    renderWords();
    dictionary.showModal();
  };
  get('closeDict').onclick = () => dictionary.close();
  get('wordForm').addEventListener('submit', event => {
    event.preventDefault();
    if (new URLSearchParams(location.search).has('classStudent')) return;
    addWord(get('newWord').value.trim(), get('newMeaning').value.trim());
    event.currentTarget.reset();
    get('dictStatus').textContent = 'Слово сохранено.';
  });

  get('closePop').onclick = hidePopup;
  get('saveSelected').onclick = () => {
    const meaning = get('selectedMeaning').value.trim();
    if (!meaning) return get('selectedMeaning').focus();
    const text = get('selectedWord').textContent;
    const pair = /[а-яё]/i.test(text) ? [meaning, text] : [text, meaning];
    addWord(...pair);
    get('translateStatus').textContent = 'Слово сохранено.';
  };

  let selectionTimer;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(showTranslation, 180);
  });
  document.addEventListener('pointerdown', event => {
    if (!popup.contains(event.target)) hidePopup();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hidePopup();
  });

  async function showTranslation() {
    const selection = window.getSelection();
    if (dictionary.open || !selection || selection.isCollapsed || !selection.rangeCount) return;
    const area = get('content');
    if (!area.contains(selection.anchorNode) || !area.contains(selection.focusNode)) return;
    const text = selection.toString().trim();
    if (!text || text.length > 180 || !/[a-zа-яё]/i.test(text)) return;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const version = ++lookup;
    get('selectedWord').textContent = text;
    const field = get('selectedMeaning');
    const status = get('translateStatus');
    const russian = /[а-яё]/i.test(text);
    const term = normalize(text).replace(/[.,!?]+$/, '');
    const known = russian
      ? [...glossary].find(([, ru]) => ru === term)?.[0]
      : glossary.get(term);
    const saved = words().find(word => normalize(russian ? word.ru : word.en) === term);
    field.value = known || (russian ? saved?.en : saved?.ru) || '';
    popup.hidden = false;
    popup.style.left = Math.max(12, Math.min(rect.left, innerWidth - popup.offsetWidth - 12)) + 'px';
    popup.style.top = Math.max(12, Math.min(rect.bottom + 10, innerHeight - popup.offsetHeight - 12)) + 'px';
    status.textContent = field.value ? '' : 'Переводим…';
    if (field.value) return;
    try {
      const pair = russian ? 'ru|en' : 'en|ru';
      const response = await fetch('https://api.mymemory.translated.net/get?' + new URLSearchParams({q:text, langpair:pair}));
      const result = await response.json();
      if (result.responseStatus !== 200 || !result.responseData?.translatedText) throw new Error();
      if (version !== lookup) return;
      field.value = result.responseData.translatedText;
      status.textContent = '';
    } catch {
      if (version === lookup) status.textContent = 'Введите перевод вручную.';
    }
  }
  get('selectedMeaning').addEventListener('input', () => {
    lookup++;
    get('translateStatus').textContent = '';
  });
  renderWords();
})();
