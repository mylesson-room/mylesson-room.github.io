(() => {
  const lesson = JSON.parse(document.querySelector('#lesson-data').textContent);
  const template = `
<p class="classroom-access" role="status">Открываем урок… <a href="login.html">Войти в GoStudy</a></p>
<header><a class="brand lesson-brand" href="%%CABINET%%" aria-label="My classroom"><img src="assets/gostudy-emblem.svg" alt=""></a><div class="header-right"><button type="button" class="lesson-dictionary-button" id="openLessonDictionary" aria-haspopup="dialog" aria-controls="lessonDictionary"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v13"/></svg>Dictionary</button><a class="lesson-home-link" href="%%CABINET%%" aria-label="Student dashboard"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v11h14V9m-9 11v-6h4v6"/></svg></a></div></header>
<dialog class="lesson-dictionary" id="lessonDictionary" aria-labelledby="lessonDictionaryTitle">
  <div class="lesson-dictionary-heading"><h2 id="lessonDictionaryTitle">My vocabulary <span id="wordCountSidebar">0</span></h2>
  <form method="dialog"><button type="submit" aria-label="Close dictionary" autofocus>×</button></form></div>
  <form id="dictionaryAddForm" class="dictionary-add-form" autocomplete="off"><input id="dictionarySource" maxlength="150" aria-label="Слово или фраза" placeholder="Слово или фраза" required><div class="dictionary-translation-row"><input id="dictionaryTranslation" maxlength="300" aria-label="Перевод" placeholder="Перевод" required><button type="submit" aria-label="Добавить в словарь">+</button></div></form><div id="myWords"></div>
</dialog>
<div class="layout"><aside class="sidebar" id="lessonVideo">
<div class="video-workspace">
<div class="video-top"><span class="live-dot"></span><span>LESSON VIDEO</span><span class="video-state">Not connected</span></div>
<div class="video-preview" role="group" aria-label="Video classroom, not connected">
<div class="video-avatar"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg></div>
<strong>Ready for your class?</strong><span>Your lesson video will appear here</span>
</div>
<div class="video-actions"><a class="call-btn" href="https://telemost.yandex.ru/" target="_blank" rel="noopener noreferrer">↗ Open Telemost</a><span>Откроется отдельно</span></div>
<p class="video-help">Место для видео преподавателя и ученика. Живой звонок внутри страницы появится после подключения видеосервиса.</p>
</div>
<section class="finance-chat" aria-label="Чат урока"><h2>Чат урока</h2><p id="finance-live-status" role="status">Подключаемся…</p><a href="login.html" class="finance-login">Войти в GoStudy</a><p id="finance-activity" role="status"></p><ol id="finance-messages" role="log" aria-live="polite"></ol><form id="finance-chat-form"><input aria-label="Сообщение" maxlength="1000" placeholder="Сообщение" required disabled><button type="submit" disabled>Отправить</button></form></section>
<details class="lesson-section-menu"><summary>Разделы урока</summary><nav id="lessonSections" aria-label="Разделы урока"></nav></details>
</aside>
<div class="lesson-divider" id="lessonDivider" role="separator" tabindex="0" aria-label="Resize video and exercises" aria-orientation="vertical" aria-valuemin="22" aria-valuemax="55" aria-valuenow="33" aria-controls="lessonVideo"></div>
<main class="lesson"><div class="lesson-content"><section class="hero"><h1></h1></section>
<div id="lessonPages"></div>
<div class="footer"></div></div></main></div><nav class="pager" aria-label="Lesson navigation"><button type="button" class="outline" id="back">← Back</button><button type="button" class="outline move-student-button" id="moveStudent" hidden>Переместить ученика</button><button type="button" class="primary" id="next">Continue</button></nav>

<div class="selection-translate" id="selectionTranslate" role="region" aria-label="Перевод выделенного текста">
  <textarea class="selection-target" id="selectionTarget" rows="2" maxlength="300" aria-label="Перевод"></textarea>
  <div class="selection-tools">
    <button id="selectionSave" type="button" aria-label="Добавить в словарь" title="Добавить в словарь" disabled>+</button>

  </div>
  <a id="selectionGoogle" target="_blank" rel="noopener noreferrer" hidden>Открыть в Google Translate</a>
</div>
<div id="finance-toast" hidden role="status"></div><div id="finance-celebrate" hidden aria-hidden="true"><span class="finance-salute left"><i></i><i></i><i></i></span><span class="finance-salute right"><i></i><i></i><i></i></span></div>

`;
  document.body.insertAdjacentHTML('afterbegin',template.replaceAll('%%CABINET%%',lesson.cabinet));
  document.querySelector('.hero h1').textContent = lesson.hero || lesson.title;
  document.querySelector('.footer').textContent = lesson.footer || '';
  const pages = document.querySelector('#lessonPages');
  if (lesson.pages) {
    pages.innerHTML = lesson.pages.join('\n');
  }
  window.GoStudyLesson = lesson;
})();

(() => {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  })[char]);
  const number = index => String.fromCharCode(65 + index);
  function markup(choices, placeholder, description = '') {
    const options = choices.map(({label,value},index) =>
      '<button type="button" data-choice="'+escape(value)+'" aria-pressed="false"><strong aria-hidden="true">'+number(index)+'</strong><span>'+escape(label)+'</span></button>'
    ).join('');
    const hint = description ? ' aria-description="'+escape(description)+'"' : '';
    return '<details class="definition-picker" data-placeholder="'+escape(placeholder)+'"><summary'+hint+'>'+escape(placeholder)+'</summary><div class="definition-options">'+options+'</div></details>';
  }
  function show(picker,value) {
    const options = [...picker.querySelectorAll('[data-choice]')];
    const selected = options.find(option => option.dataset.choice === String(value));
    options.forEach(option => option.setAttribute('aria-pressed',String(option === selected)));
    picker.querySelector('summary').textContent = selected
      ? number(options.indexOf(selected)) + '. ' + selected.querySelector('span').textContent
      : picker.dataset.placeholder;
  }
  function bind(picker,onChoice) {
    const summary = picker.querySelector('summary');
    picker.addEventListener('click',event => {
      const option = event.target.closest('[data-choice]');
      if (!option) return;
      onChoice(option.dataset.choice);
      show(picker,option.dataset.choice);
      picker.open = false;
      summary.focus();
    });
    picker.addEventListener('keydown',event => {
      if (event.key !== 'Escape' || !picker.open) return;
      event.preventDefault();
      picker.open = false;
      summary.focus();
    });
  }
  document.addEventListener('pointerdown',event => {
    document.querySelectorAll('.definition-picker[open]').forEach(picker => {
      if (!picker.contains(event.target)) picker.open = false;
    });
  });
  window.GoStudyOptionPicker = {markup,show,bind};
})();
