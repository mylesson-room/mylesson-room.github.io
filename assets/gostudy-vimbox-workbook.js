(() => {
  const config = JSON.parse(document.getElementById('lesson-data').textContent);
  const ui = window.GoStudyClassroomUI;
  const room = ui.createRoom(document.querySelector('.room'), config.level);
  const sheet = room.querySelector('.sheet');
  const frame = ui.createStep(sheet);
  const navigation = document.createElement('div');
  navigation.className = 'step-nav';
  sheet.append(navigation);
  const storage = window.GoStudyStorage || localStorage;
  let state;
  try { state = JSON.parse(storage.getItem(config.key)) || {}; } catch { state = {}; }
  if (state.version !== 2) {
    const previous = state.answers || {};
    const page = config.steps.findIndex(step => step.id === 'original-' + (Number(state.page) || 0));
    state = {version: 2, page: Math.max(0,page), answers: Object.fromEntries(config.steps.filter(step => step.id.startsWith('original-') && Object.hasOwn(previous,step.id.slice(9))).map(step => [step.id,previous[step.id.slice(9)]]))};
  }
  let index = Math.min(Math.max(Number(state.page) || 0,0),config.steps.length-1);
  const escape = value => String(value).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const save = () => storage.setItem(config.key,JSON.stringify({...state,page:index}));
  const sections = document.querySelector('.sections');
  const live = window.GoStudyTravelAnswers;
  let studentAnswers = {};
  let liveStatus;
  if (live?.viewing) {
    liveStatus = document.createElement('p');
    liveStatus.className = 'travel-live-status';
    liveStatus.setAttribute('role','status');
    liveStatus.textContent = 'Загружаем ответы ученицы…';
    room.querySelector('.side .panel').after(liveStatus);
  }

  function showStudentAnswers() {
    if (!live?.viewing) return;
    const step = config.steps[index];
    const choices = studentAnswers[step.id] ?? studentAnswers[index];
    const draft = sheet.querySelector('.writing');
    if (draft) {
      const savedDraft = typeof choices === 'string' ? choices : '';
      const note = sheet.querySelector('.gostudy-live-draft');
      if (note && note.textContent !== savedDraft) {
        note.textContent = savedDraft;
        note.hidden = !savedDraft;
      }
    }
    for (const row of sheet.querySelectorAll('[data-question]')) {
      const i = Number(row.dataset.question);
      const answer = Array.isArray(choices) ? choices[i] : null;
      const label = Number.isInteger(answer) ? step.items?.[i]?.[1]?.[answer] : null;
      const options = row.querySelectorAll('input[type=radio]');
      options.forEach((option,j) => option.closest('label').classList.toggle('travel-student-picked', label != null && j===answer));
      let badge = row.querySelector('.travel-student-answer');
      if (!label) { badge?.remove(); continue; }
      if (!badge) {
        badge = document.createElement('p');
        badge.className = 'travel-student-answer';
        row.append(badge);
      }
      const message = 'Ученица выбрала: '+label;
      if (badge.textContent !== message) badge.textContent = message;
    }
  }

  async function pollStudentAnswers() {
    try {
      if (!document.hidden) {
        studentAnswers = await live.read();
        showStudentAnswers();
        liveStatus.textContent = '';
      }
    } catch (error) {
      liveStatus.textContent = error.message;
    } finally {
      setTimeout(pollStudentAnswers,1600);
    }
  }
  function go(next) {
    index = next;
    save();
    render();
    sheet.scrollIntoView({block:'start'});
    sheet.querySelector('h1').focus({preventScroll:true});
  }
  document.addEventListener('click', event => {
    const inside = event.target.closest('.word-menu');
    sheet.querySelectorAll('.word-menu[open]').forEach(menu => { if (menu !== inside) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = event.target.closest('.word-menu[open]');
    if (menu) { menu.open = false; menu.querySelector('summary').focus(); }
  });
  function renderVisual(visual) {
    if (!visual) return '';
    if (visual.kind === 'route') return '<div class="travel-route" aria-label="'+escape(visual.label)+'">'+visual.stops.map(([icon,title,detail])=>'<div><span aria-hidden="true">'+escape(icon)+'</span><strong>'+escape(title)+'</strong><small>'+escape(detail)+'</small></div>').join('')+'</div>';
    if (visual.kind === 'cards') return '<div class="travel-cards">'+visual.cards.map(([icon,title,value,detail])=>'<div><span aria-hidden="true">'+escape(icon)+'</span><strong>'+escape(title)+'</strong><b>'+escape(value)+'</b><small>'+escape(detail)+'</small></div>').join('')+'</div>';
    return '<div class="travel-alert"><span aria-hidden="true">'+escape(visual.icon)+'</span><div><strong>'+escape(visual.title)+'</strong><small>'+escape(visual.detail)+'</small></div></div>';
  }
  function render() {
    const step = config.steps[index];
    const answer = state.answers[step.id];
    const current = Array.isArray(answer) ? answer : [];
    ui.renderSections(sections, config.steps.map(item => item.title), index, go);
    frame.update(config.level,index,config.steps.length);
    let exercise = '';
    if (step.type === 'choice') {
      exercise = step.items.map(([question,options],i) => '<fieldset data-question="'+i+'"><legend><span class="item-number">'+(i+1)+'</span>'+escape(question)+'</legend><div class="options">'+options.map((option,j) => '<label><input type="radio" name="q'+i+'" value="'+j+'"'+(current[i]===j?' checked':'')+'><span>'+escape(option)+'</span></label>').join('')+'</div><p class="feedback" aria-live="polite"></p></fieldset>').join('');
    }
    if (step.type === 'match' || step.type === 'gap') {
      exercise = step.items.map(([question,options],i) => {
        const [before,after] = question.split('___');
        const chosen = current[i];
        const select = '<details class="word-menu" data-answer="'+i+'"><summary aria-label="Answer '+(i+1)+'">'+escape(options[chosen] ?? 'Choose')+'</summary><div class="word-options">'+options.map((option,j) => '<button type="button" data-option="'+j+'" aria-pressed="'+(chosen===j)+'">'+escape(option)+'</button>').join('')+'</div></details>';
        return '<div class="gap-row" data-question="'+i+'"><span class="item-number">'+(i+1)+'</span><div>'+escape(before)+(step.type==='match'?' <span aria-hidden="true">→</span> ':' ')+select+escape(after || '')+'<p class="feedback" aria-live="polite"></p></div></div>';
      }).join('');
    }
    if (step.type === 'order') {
      const order = current.length ? current : step.items.map((_,i) => i);
      exercise = '<ol class="order">'+order.map((item,i) => '<li><span>'+escape(step.items[item])+'</span><div><button type="button" data-move="'+i+',-1" aria-label="Move item '+(i+1)+' up" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-move="'+i+',1" aria-label="Move item '+(i+1)+' down" '+(i===order.length-1?'disabled':'')+'>↓</button></div></li>').join('')+'</ol>';
    }
    const sourceStyle = step.style || ({'original-1':'memo','original-4':'conversation','prepare-a-board-update':'writing-brief','original-5':'role-brief'})[step.id] || '';
    const metrics = step.metrics ? '<dl class="metrics">'+step.metrics.map(([value,label])=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd></div>').join('')+'</dl>' : '';
    const source = metrics + (step.source?.length ? '<div class="source '+sourceStyle+'">'+step.source.map(p => '<p>'+escape(p)+'</p>').join('')+'</div>' : '');
    const writing = step.type === 'write' ? '<label class="writing">Ваш ответ<textarea rows="6">'+escape(typeof answer==='string'?answer:'')+'</textarea></label><p class="draft-status" role="status"></p>' : '';
    const cover = step.id === 'original-0' && config.cover ? '<img class="lesson-cover" src="'+escape(config.cover)+'" alt="'+escape(config.coverAlt || '')+'">' : '';
    const teacherNotes = live?.viewing && step.teacherNotes
      ? '<details class="source"><summary>Карточка преподавателя</summary><p>'+escape(step.teacherNotes)+'</p></details>' : '';
    const studentDraft = live?.viewing && step.type === 'write'
      ? '<blockquote class="gostudy-live-draft source" aria-label="Ответ ученика" hidden></blockquote>' : '';
    frame.content.innerHTML = '<p class="label">'+escape(config.title)+'</p><h1 tabindex="-1">'+escape(step.title)+'</h1><p class="instruction">'+escape(step.instruction)+'</p>'+cover+renderVisual(step.visual)+source+(exercise?'<section class="activity">'+exercise+'<button type="button" class="check cta">Проверить ответы</button><p role="status" class="result"></p></section>':'')+writing+studentDraft+teacherNotes;
    navigation.innerHTML = '<button type="button" class="back" '+(index===0?'disabled':'')+'>← Назад</button>'+(index+1===config.steps.length?'<a class="cta home-link" href="'+escape(config.cabinet)+'">В личный кабинет</a>':'<button type="button" class="cta next">Далее →</button>');
    showStudentAnswers();
    sheet.querySelector('.back').onclick = () => go(index-1);
    const next = sheet.querySelector('.next');
    if (next) next.onclick = () => go(index+1);
    const draft = sheet.querySelector('textarea');
    if (draft) draft.oninput = () => {
      state.answers[step.id] = draft.value;
      save();
      sheet.querySelector('.draft-status').textContent = 'Ответ сохранён';
    };
    sheet.querySelectorAll('input,select').forEach(input => {
      input.onchange = () => {
        const i = Number(input.dataset.answer ?? input.name.slice(1));
        current[i] = input.value === '' ? null : Number(input.value);
        state.answers[step.id] = current;
        save();
        const row = input.closest('[data-question]');
        row.removeAttribute('data-result');
        row.querySelector('.feedback').textContent = '';
        sheet.querySelector('.result').textContent = '';
      };
    });
    sheet.querySelectorAll('.word-menu').forEach(menu => {
      menu.querySelectorAll('[data-option]').forEach(button => {
        button.onclick = () => {
          const i = Number(menu.dataset.answer);
          current[i] = Number(button.dataset.option);
          state.answers[step.id] = current;
          save();
          menu.querySelectorAll('[data-option]').forEach(option => option.setAttribute('aria-pressed',option === button));
          const summary = menu.querySelector('summary');
          summary.textContent = button.textContent;
          menu.open = false;
          summary.focus();
          const row = menu.closest('[data-question]');
          row.removeAttribute('data-result');
          row.querySelector('.feedback').textContent = '';
          sheet.querySelector('.result').textContent = '';
        };
      });
    });
    sheet.querySelectorAll('[data-move]').forEach(button => {
      button.onclick = () => {
        const [i,shift] = button.dataset.move.split(',').map(Number);
        const order = current.length ? current : step.items.map((_,j) => j);
        [order[i],order[i+shift]] = [order[i+shift],order[i]];
        state.answers[step.id] = order;
        save();
        render();
        (sheet.querySelector('[data-move="'+(i+shift)+','+shift+'"]:not(:disabled)') || sheet.querySelector('h1')).focus();
      };
    });
    const check = sheet.querySelector('.check');
    if (check) check.onclick = () => {
      const order = step.type === 'order';
      const expected = order ? step.order : step.items.map(item => item[2]);
      const actual = order && !current.length ? step.items.map((_,i) => i) : current;
      const score = expected.filter((value,i) => {
        const correct = actual[i] === value;
        if (!order) {
          const row = sheet.querySelector('[data-question="'+i+'"]');
          row.dataset.result = correct?'correct':'retry';
          row.querySelector('.feedback').textContent = correct ? '✓ '+(step.items[i][3] || 'Correct') : actual[i] == null ? 'Choose an answer.' : 'Try again.';
        }
        return correct;
      }).length;
      const result = sheet.querySelector('.result');
      result.textContent = score+' / '+expected.length+' correct. '+(score===expected.length?'Well done!':step.hint || '');
    };
  }
  render();
  if (live?.viewing) pollStudentAnswers();
})();