(() => {
  const room = document.querySelector('.room');
  const sheet = room.querySelector('.sheet');
  const config = JSON.parse(document.getElementById('lesson-data').textContent);
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
  const expand = document.querySelector('.expand');
  expand.onclick = () => {
    const expanded = room.classList.toggle('wide');
    expand.setAttribute('aria-expanded',expanded);
    expand.textContent = expanded ? 'Свернуть' : 'Расширить';
  };
  function go(next) {
    index = next;
    save();
    render();
    sheet.scrollIntoView({block:'start'});
    sheet.querySelector('h1').focus({preventScroll:true});
  }
  function render() {
    const step = config.steps[index];
    const answer = state.answers[step.id];
    const current = Array.isArray(answer) ? answer : [];
    sections.innerHTML = '<strong>Разделы</strong>'+config.steps.map((item,i) => '<button type="button" data-step="'+i+'"'+(i===index?' aria-current="step"':'')+'>'+escape(item.title)+'</button>').join('');
    sections.querySelectorAll('button').forEach(button => { button.onclick = () => go(Number(button.dataset.step)); });
    let exercise = '';
    if (step.type === 'choice') {
      exercise = step.items.map(([question,options],i) => '<fieldset data-question="'+i+'"><legend><span class="item-number">'+(i+1)+'</span>'+escape(question)+'</legend><div class="options">'+options.map((option,j) => '<label><input type="radio" name="q'+i+'" value="'+j+'"'+(current[i]===j?' checked':'')+'><span>'+escape(option)+'</span></label>').join('')+'</div><p class="feedback" aria-live="polite"></p></fieldset>').join('');
    }
    if (step.type === 'match' || step.type === 'gap') {
      exercise = step.items.map(([question,options],i) => {
        const [before,after] = question.split('___');
        const select = '<select aria-label="Answer '+(i+1)+'" data-answer="'+i+'"><option value="">Choose…</option>'+options.map((option,j) => '<option value="'+j+'"'+(current[i]===j?' selected':'')+'>'+escape(option)+'</option>').join('')+'</select>';
        return '<div class="gap-row" data-question="'+i+'"><span class="item-number">'+(i+1)+'</span><div>'+escape(before)+(step.type==='match'?' <span aria-hidden="true">→</span> ':' ')+select+escape(after || '')+'<p class="feedback" aria-live="polite"></p></div></div>';
      }).join('');
    }
    if (step.type === 'order') {
      const order = current.length ? current : step.items.map((_,i) => i);
      exercise = '<ol class="order">'+order.map((item,i) => '<li><span>'+escape(step.items[item])+'</span><div><button type="button" data-move="'+i+',-1" aria-label="Move item '+(i+1)+' up" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-move="'+i+',1" aria-label="Move item '+(i+1)+' down" '+(i===order.length-1?'disabled':'')+'>↓</button></div></li>').join('')+'</ol>';
    }
    const source = step.source?.length ? '<div class="source">'+step.source.map(p => '<p>'+escape(p)+'</p>').join('')+'</div>' : '';
    const writing = step.type === 'write' ? '<label class="writing">Your draft<textarea rows="6">'+escape(typeof answer==='string'?answer:'')+'</textarea></label><p class="draft-status" role="status"></p>' : '';
    const cover = '<img class="lesson-cover" src="'+escape(config.cover)+'" alt="">';
    sheet.innerHTML = '<div class="lesson-meta"><span>'+escape(config.level)+'</span><span>Step '+(index+1)+' of '+config.steps.length+'</span></div><progress max="'+config.steps.length+'" value="'+(index+1)+'" aria-label="Lesson progress"></progress><div class="lesson-content"><p class="label">'+escape(config.title)+'</p><h1 tabindex="-1">'+escape(step.title)+'</h1><p class="instruction">'+escape(step.instruction)+'</p>'+cover+source+(exercise?'<section class="activity">'+exercise+'<button type="button" class="check cta">Check answers</button><p role="status" class="result"></p></section>':'')+writing+'</div><div class="step-nav"><button type="button" class="back" '+(index===0?'disabled':'')+'>← Back</button>'+(index+1===config.steps.length?'<a class="cta home-link" href="'+escape(config.cabinet)+'">Back to my course</a>':'<button type="button" class="cta next">Next →</button>')+'</div>';
    sheet.querySelector('.back').onclick = () => go(index-1);
    const next = sheet.querySelector('.next');
    if (next) next.onclick = () => go(index+1);
    const draft = sheet.querySelector('textarea');
    if (draft) draft.oninput = () => {
      state.answers[step.id] = draft.value;
      save();
      sheet.querySelector('.draft-status').textContent = 'Draft saved';
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
})();