(() => {
  const settings = JSON.parse(document.querySelector('#cabinet-settings').textContent);
  const markup = `
<p class="classroom-access" role="status">Открываем кабинет… <a href="login.html">Войти в GoStudy</a></p>
<header class="top">
<div class="brand"><a href="%%CABINET%%"><svg viewBox="350 140 835 650" width="55" height="43" aria-hidden="true" focusable="false"><defs><linearGradient id="crownGold" x1="0" y1="1" x2=".72" y2="0" gradientUnits="objectBoundingBox"><stop stop-color="#3a2815"/><stop offset=".36" stop-color="#765019"/><stop offset=".68" stop-color="#e9ad50"/><stop offset=".83" stop-color="#9c621a"/><stop offset="1" stop-color="#d89b3e"/></linearGradient></defs><g fill="url(#crownGold)"><path d="M770 150Q786 246 865 257Q786 269 770 365Q754 269 675 257Q754 246 770 150Z"/><path d="M574 301Q580 341 614 346Q580 352 574 392Q568 352 533 346Q568 341 574 301ZM968 301Q974 341 1008 346Q974 352 968 392Q962 352 928 346Q962 341 968 301Z"/><path d="M360 379C535 516 710 570 770 327C830 570 1005 516 1176 381C1109 478 1065 557 1046 623L1041 619C1046 569 1060 523 1084 474C931 576 806 534 770 365C734 534 609 576 454 474C478 523 492 569 496 619L491 623C472 558 427 478 360 379Z"/><path d="M430 679C571 571 690 599 767 702C679 614 568 614 430 679ZM1108 679C967 571 850 599 773 702C861 614 970 614 1108 679Z"/><path d="M367 747C521 631 663 645 770 738C877 645 1018 631 1171 747C1009 674 868 669 770 782C672 669 530 674 367 747Z"/></g></svg><span>GoStudy</span></a><button type="button" class="round" aria-label="Добавить" disabled><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>
<nav class="nav" aria-label="Разделы кабинета"><a href="#main" aria-current="page">Главная</a><a href="#assignment">Домашка</a><button id="openWords" type="button" aria-haspopup="dialog">Словарь</button><button type="button" disabled>Практика <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><button type="button" disabled>История <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></nav>
<div class="account"><button class="round" type="button" aria-label="Чат" disabled><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path fill="currentColor" stroke="none" d="M11 3a8 8 0 0 0-6.6 12.5L3 19l4-1.4a8 8 0 1 0 4-14.6Zm8.2 5.2a9 9 0 0 1-4.4 11l4.3 1.8-.7-3A6.5 6.5 0 0 0 19.2 8.2Z"/></svg></button><button class="balance" type="button" aria-label="Баланс" disabled><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="17" height="14" rx="3" fill="currentColor" stroke="none"/><path d="M17 12h1" stroke="white"/></svg><span>—</span></button><span class="avatar" aria-hidden="true">У</span><div class="profile"><span>Ученик</span><strong>Английский</strong></div><span class="profile-chevron"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></div>
</header>
<main id="main">

<div class="hello"><h1>Хев а найс дей!</h1></div>
<div class="cards">
<a id="assignment" class="card homework homework-link" href="%%HOMEWORK%%" aria-label="Открыть домашнее задание"><h2>Домашнее задание</h2><p class="homework-subject">%%TITLE%%</p>%%HOMEWORK_DURATION%%<span class="tile-arrow" aria-hidden="true">›</span></a>
<a class="card lesson-card lesson-card-link" href="%%LESSON%%" aria-label="%%LESSON_LABEL%%"><small>Текущий урок · %%COURSE%%</small><h2>%%TITLE%%</h2><span class="lesson-date">%%LESSON_NOTE%%</span><span class="tile-arrow" aria-hidden="true">›</span></a>
</div>

<section class="vocabulary-home" aria-label="Тренировки и искусственный интеллект">
  <button class="vocab-feature vocab-feature--practice vocab-feature--action vocab-feature--whole" id="practiceCard" type="button" aria-haspopup="dialog" aria-controls="practiceDialog" aria-label="Тренировки слов — открыть тренировку">
    <span class="vocab-feature__icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="17" stroke="#287DEF" stroke-width="5"/><circle cx="24" cy="24" r="10" stroke="#80B5FF" stroke-width="4"/><circle cx="24" cy="24" r="4" fill="#287DEF"/><path d="M24 24 39 9m0 0h-9m9 0v9" stroke="#154CA7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="vocab-feature__copy"><strong>Тренировки слов</strong><span>Закрепляйте лексику из урока<br>в разных форматах</span><span class="vocab-feature__meta" id="vocabCount">Проверяем словарь…</span></span>
    <span class="vocab-feature__art vocab-feature__art--cards" aria-hidden="true"><span class="flashcard flashcard--back"></span><span class="flashcard flashcard--front">trade-off <svg viewBox="0 0 24 24" fill="none" stroke="#238bea" stroke-width="2.2" stroke-linecap="round"><path d="M5 9H2v6h3l5 4V5L5 9Z"/><path d="M14 8a6 6 0 0 1 0 8M17 5a10 10 0 0 1 0 14"/></svg></span></span>
    <span class="tile-arrow" aria-hidden="true">›</span>
  </button>
  <button class="vocab-feature vocab-feature--ai vocab-feature--action vocab-feature--whole" type="button" disabled aria-label="Поговорить с ИИ — в разработке">
    <span class="vocab-feature__icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="m23 5 4.5 12L40 22l-12.5 4.5L23 39l-4.5-12.5L6 22l12.5-5Z" fill="#3F86E6"/><path d="m38 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#8FBCFF"/></svg></span>
    <span class="vocab-feature__copy"><strong>Поговорить с ИИ</strong><span>Практикуйте английский<br>в диалоге с умным ассистентом</span><span class="vocab-feature__meta">Голосовой собеседник</span></span>
    <span class="vocab-feature__art vocab-feature__art--robot" aria-hidden="true"><svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="robotMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#9bbdf4"/></linearGradient><linearGradient id="robotFace" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1a3675"/><stop offset="1" stop-color="#081e4c"/></linearGradient></defs><ellipse cx="92" cy="155" rx="49" ry="12" fill="#9bb8ea" opacity=".3"/><rect x="57" y="104" width="73" height="55" rx="24" fill="url(#robotMetal)" stroke="#a2b9e3"/><circle cx="68" cy="134" r="9" fill="#c3d8fb"/><circle cx="116" cy="134" r="9" fill="#c3d8fb"/><path d="M84 134q9-9 18 0" fill="none" stroke="#d5a23c" stroke-width="4" stroke-linecap="round"/><rect x="36" y="28" width="116" height="98" rx="42" fill="url(#robotMetal)" stroke="#9fbde8" stroke-width="4"/><rect x="44" y="39" width="100" height="75" rx="33" fill="url(#robotFace)"/><path d="M66 75q8-14 16 0M105 75q8-14 16 0" stroke="#6cdbff" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="36" cy="82" r="12" fill="#7ca8ec" stroke="white" stroke-width="4"/><circle cx="152" cy="82" r="12" fill="#7ca8ec" stroke="white" stroke-width="4"/><path d="m69 10-3 9m61-13 6 9" stroke="#429af3" stroke-width="6" stroke-linecap="round"/></svg></span>
    <span class="ai-development-status" aria-hidden="true">В разработке</span>
  </button>
</section>
%%PREVIOUS%%
</main>

<dialog id="words" class="vocab-dialog" aria-labelledby="wordsTitle">
  <div class="dialog-top"><h2 id="wordsTitle">Мой словарь</h2><form method="dialog"><button aria-label="Закрыть">×</button></form></div>
  <p class="dialog-description">Слова, добавленные во время занятий %%TITLE%%.</p>
%%IMPORT_WORDS%%
  <p id="wordsTotal" class="dialog-description" aria-live="polite"></p>
  <ul id="wordsList"></ul>
  <p id="wordsEmpty" hidden>Слов пока нет. Добавьте слова в уроке — они появятся здесь.</p>
  <div class="dialog-actions"><button type="button" class="primary" id="practiceFromWords">Тренировать слова</button></div>
</dialog>
<dialog id="practiceDialog" class="vocab-dialog practice-dialog" aria-labelledby="practiceTitle">
<div class="dialog-top"><div><h2 id="practiceTitle">Тренировки слов</h2><p class="dialog-description">%%TITLE%% · повторение лексики</p></div><form method="dialog"><button aria-label="Закрыть">×</button></form></div>
<div id="practiceModes" class="practice-modes" role="group" aria-label="Режим тренировки">
<button type="button" data-mode="cards" aria-pressed="true">Карточки</button><button type="button" data-mode="choice" aria-pressed="false">Выбрать перевод</button><button type="button" data-mode="type" aria-pressed="false">Ввести слово</button><button type="button" data-mode="listen" aria-pressed="false">На слух</button>
</div>
<p id="practiceProgress" class="dialog-description" role="status"></p><div class="practice-meter" aria-hidden="true"><span id="practiceMeter"></span></div>
<div class="practice-flashcard" id="practiceFlashcard"><span class="practice-flashcard__label" id="practicePrompt">Переведите слово</span><strong id="practiceQuestion"></strong><button type="button" id="speakWord" class="practice-speak" aria-label="Прослушать слово">🔊 Озвучить</button><div id="practiceOptions" class="practice-options" hidden></div><form id="practiceTypeForm" hidden><label for="practiceInput">Ваш ответ на английском</label><input id="practiceInput" autocomplete="off" spellcheck="false" required><button type="submit" class="primary">Проверить</button></form><span class="practice-flashcard__answer" id="practiceAnswer" role="status" hidden></span></div>
<p id="practiceEmpty" class="dialog-description" hidden>Для тренировки нужны слова с переводами. Добавьте их в словарь на уроке %%TITLE%%.</p>
<div class="dialog-actions"><button class="primary" id="revealWord" type="button">Показать перевод</button><button class="primary" id="nextWord" type="button" hidden>Следующее слово →</button><button class="secondary" id="restartPractice" type="button" hidden>Начать заново</button></div>
</dialog>
`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const previous = settings.previous?.length
    ? '<details class="v1-previous"><summary>Предыдущие уроки</summary><ul>'+settings.previous.map(([path,title])=>'<li><a href="'+escape(path)+'">'+escape(title)+'</a></li>').join('')+'</ul></details>'
    : '';
  const values = {
    LESSON_LABEL:escape(settings.lessonLabel || "Открыть урок "+settings.course), CABINET:escape(settings.cabinet), COURSE:escape(settings.course), TITLE:escape(settings.title),
    HOMEWORK:escape(settings.homework), LESSON:escape(settings.lesson), STUDENT:escape(settings.student),
    LESSON_NOTE:escape(settings.schedule || 'Открыть урок'),
    IMPORT_WORDS:settings.importWords ? '<button type="button" id="importFinanceWords" class="secondary" hidden>Перенести старые слова из этого браузера</button><p id="financeImportStatus" role="status"></p>' : '',
    HOMEWORK_DURATION:settings.duration ? '<small>'+escape(settings.duration)+'</small>' : '', PREVIOUS:previous,
  };
  document.body.insertAdjacentHTML('afterbegin', markup.replace(/%%([A-Z_]+)%%/g, (_,key) => values[key]));
  if(document.body.hasAttribute('data-word-mastery')){
    const navWords=document.querySelector('#openWords');
    if(navWords)navWords.textContent='Словарь и тренировка слов';
    const title=document.querySelector('.vocab-feature--practice .vocab-feature__copy strong');
    if(title)title.textContent='Словарь и тренировка слов';
    const dialogTitle=document.getElementById('wordsTitle');
    if(dialogTitle)dialogTitle.textContent='Словарь и тренировка слов';
    const start=document.getElementById('practiceFromWords');
    if(start)start.textContent='Тренировать';
    const card=document.querySelector('#practiceCard');
    if(card)card.setAttribute('aria-label','Словарь и тренировка слов — открыть список слов');
  }
  const avatar = document.querySelector('.avatar');
  if (settings.student) avatar.textContent = settings.student[0];
})();