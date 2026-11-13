(() => {
  function createRoom(before, label) {
    const room = document.createElement('main');
    room.className = 'room';
    room.dataset.sharedClassroom = '';
    room.innerHTML = '<article class="sheet"></article><aside class="side gostudy-room-sidebar" aria-label="Инструменты урока"><section class="panel"><div class="call-head"><strong>Видеосвязь</strong><button type="button" class="expand" aria-expanded="false" aria-controls="gostudy-call">Расширить</button></div><div class="call" id="gostudy-call">Звонок здесь пока недоступен</div></section><nav class="panel sections" aria-label="Разделы"></nav></aside>';
    const sheet = room.querySelector('.sheet');
    sheet.setAttribute('aria-label', label);
    const expand = room.querySelector('.expand');
    expand.onclick = () => {
      const expanded = room.classList.toggle('wide');
      expand.setAttribute('aria-expanded', expanded);
      expand.textContent = expanded ? 'Свернуть' : 'Расширить';
    };
    before.replaceWith(room);
    document.body.classList.add('color-workbook');
    return room;
  }

  function createStep(sheet) {
    sheet.innerHTML = '<div class="lesson-meta"><span></span><span></span></div><progress aria-label="Прогресс урока"></progress><div class="lesson-content"></div>';
    const [label, count] = sheet.querySelectorAll('.lesson-meta span');
    const progress = sheet.querySelector('progress');
    return {
      content: sheet.querySelector('.lesson-content'),
      update(course, index, total) {
        label.textContent = course;
        count.textContent = 'Step '+(index+1)+' of '+total;
        progress.max = Math.max(1,total);
        progress.value = index+1;
        progress.hidden = total === 0;
      }
    };
  }

  function renderSections(nav, titles, current, select) {
    const heading = document.createElement('strong');
    heading.textContent = 'Разделы';
    nav.replaceChildren(heading, ...titles.map((title,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.dataset.step = index;
      if (index === current) button.setAttribute('aria-current','step');
      button.onclick = () => select(index);
      return button;
    }));
  }

  window.GoStudyClassroomUI = {createRoom,createStep,renderSections};
})();
