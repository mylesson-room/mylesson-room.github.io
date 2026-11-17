(() => {
  function render(lesson, escape) {
    const fields = new Map();
    const groups = [];
    const sections = [];
    const optionPicker = window.GoStudyOptionPicker;
    const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');
    const register = (key, page, expected, step, slot) => {
      fields.set(key,{page,expected,step,slot});
      sections[page].push(key);
      if (expected !== undefined) groups[page].push(key);
    };
    function visual(data) {
      if (!data) return '';
      const cards = (rows,className) => '<div class="'+className+'">'+rows.map(row =>
        '<section class="material-card"><strong>'+escape(row[0])+' '+escape(row[1])+'</strong><p>'+row.slice(2).map(escape).join('<br>')+'</p></section>'
      ).join('')+'</div>';
      if (data.kind === 'cards') return cards(data.cards,'case-column');
      if (data.kind === 'route') return cards(data.stops,'case-column');
      return '<div class="tip"><strong>'+escape(data.icon)+' '+escape(data.title)+'</strong><p>'+escape(data.detail)+'</p></div>';
    }
    function exercise(step, page) {
      if (step.type === 'choice' || step.type === 'match' || step.type === 'gap') {
        return step.items.map(([prompt,options,correct],slot) => {
          const key = step.id+':'+slot;
          register(key,page,correct,step.id,slot);
          if (step.type === 'choice') {
            return '<fieldset class="question-item unified-question" data-answer-row><legend>'+escape(prompt)+'</legend><div class="options">'+options.map((item,i) =>
              '<label><input type="radio" name="'+escape(key)+'" data-exercise-field="'+escape(key)+'" value="'+i+'"> '+escape(item)+'</label>'
            ).join('')+'</div><p class="result" data-grade></p></fieldset>';
          }
          const [before,after] = prompt.split('___');
          const picker = optionPicker.markup(options.map((label,value)=>({label,value})),'Choose…',prompt)
            .replace('<details ', '<details data-exercise-field="'+escape(key)+'" ');
          return '<div class="gap-item unified-gap" data-answer-row><div class="gap-prompt">'+escape(before)+
            ' '+picker+' '+escape(after ?? '')+'</div><small class="feedback" data-grade></small></div>';
        }).join('');
      }
      if (step.type === 'order') {
        register(step.id,page,step.order,step.id);
        return '<div class="unified-order" data-answer-row><ol data-order="'+escape(step.id)+'"></ol><p class="feedback" data-grade></p></div>';
      }
      if (step.type === 'write') {
        register(step.id,page,undefined,step.id);
        return '<label class="field-label">Your answer<textarea rows="5" data-exercise-field="'+escape(step.id)+'"></textarea></label>';
      }
      return '';
    }
    const panels = lesson.steps.map((step,page) => {
      sections.push([]);
      groups.push([]);
      let content = step.html || '';
      if (!step.html) {
        if (page === 0 && lesson.cover) content += '<img class="unified-cover" src="'+escape(lesson.cover)+'" alt="'+escape(lesson.coverAlt || '')+'">';
        content += visual(step.visual);
        if (step.source?.length) content += '<article class="article">'+step.source.map(paragraph=>'<p>'+escape(paragraph)+'</p>').join('')+'</article>';
        if (step.audio) {
          const {src,title,transcript} = step.audio;
          content += '<section class="tip"><strong>'+escape(title || 'Listening')+'</strong><audio controls preload="metadata" src="'+escape(src)+'"></audio>'+
            (transcript ? '<details><summary>Transcript</summary><p>'+escape(Array.isArray(transcript) ? transcript.join('\n') : transcript)+'</p></details>' : '')+'</section>';
        }
        content += exercise(step,page);
      }
      return '<section id="page-'+page+'" class="page"><div class="panel">'+
        '<div class="activity-head"><div class="activity-titles"><h2>'+escape(step.title)+'</h2></div></div>'+
        (step.instruction ? '<p class="lead">'+escape(step.instruction)+'</p>' : '')+content+'</div></section>';
    });
    const pages = document.getElementById('lessonPages');
    pages.innerHTML = panels.join('');
    for (const field of pages.querySelectorAll('select[data-gap]')) {
      const page = Number(field.closest('.page').id.slice(5));
      register(field.id,page,field.dataset.gap,field.id);
      const choices = [...field.options].filter(option=>option.value !== '')
        .map(option=>({label:option.textContent,value:option.value}));
      const template = document.createElement('template');
      template.innerHTML = optionPicker.markup(choices,field.options[0]?.textContent || 'Choose…',field.getAttribute('aria-label') || '');
      const picker = template.content.firstElementChild;
      picker.id = field.id;
      picker.dataset.exerciseField = field.id;
      field.parentElement.setAttribute('data-answer-row','');
      field.nextElementSibling?.setAttribute('data-grade','');
      field.replaceWith(picker);
    }
    const controls = new Map();
    for (const field of pages.querySelectorAll('[data-exercise-field],[data-order]')) {
      const key = field.dataset.exerciseField || field.dataset.order;
      if (!controls.has(key)) controls.set(key,[]);
      controls.get(key).push(field);
    }
    const orderSteps = new Map(lesson.steps.filter(step=>step.type==='order').map(step=>[step.id,step]));
    const completion = new Set();
    function drawOrder(key, field, value, set) {
      const step = orderSteps.get(key);
      const order = Array.isArray(value) ? value : step.items.map((_,i)=>i);
      field.replaceChildren(...order.map((item,i)=>{
        const row = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = step.items[item];
        row.append(label);
        for (const [delta,title,icon] of [[-1,'Move up','↑'],[1,'Move down','↓']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'outline';
          button.textContent = icon;
          button.setAttribute('aria-label',title+': '+label.textContent);
          button.disabled = i+delta<0 || i+delta>=order.length;
          button.onclick = () => {
            const next = order.slice();
            [next[i],next[i+delta]] = [next[i+delta],next[i]];
            set(key,next,true);
            field.children[i+delta]?.querySelector(delta<0?'button:first-of-type':'button:last-of-type')?.focus();
          };
          row.append(button);
        }
        return row;
      }));
    }
    function valid(key,value) {
      const field = fields.get(key);
      if (!field) return false;
      const order = orderSteps.get(key);
      if (order) return Array.isArray(value) && value.length === order.items.length &&
        new Set(value).size === value.length && value.every(item=>Number.isInteger(item) && item>=0 && item<value.length);
      if (field.slot !== undefined && value !== null && value !== '') {
        const index = Number(value);
        return Number.isInteger(index) && index >= 0 &&
          index < lesson.steps[field.page].items[field.slot][1].length;
      }
      return value === null || typeof value === 'string';
    }
    function redraw(key,value,set) {
      for (const control of controls.get(key) || []) {
        if (control.dataset.order) drawOrder(key,control,value,set);
        else if (control.classList.contains('definition-picker')) optionPicker.show(control,value);
        else if (control.type === 'radio') control.checked = value !== '' && control.value === String(value);
        else if (control.value !== String(value ?? '')) control.value = value ?? '';
      }
    }
    function grade(page,get,animate) {
      if (lesson.deferGrading) return false;
      const keys = groups[page];
      if (!keys?.length) return false;
      let allCorrect = true;
      for (const key of keys) {
        const value = get(key);
        const expected = fields.get(key).expected;
        const attempted = value !== '' && value != null;
        const correct = attempted && (Array.isArray(expected) ?
          JSON.stringify(expected) === JSON.stringify(value) : normalize(value) === normalize(expected));
        allCorrect &&= correct;
        const control = controls.get(key)?.[0];
        const row = control?.closest('[data-answer-row]');
        const result = row?.querySelector('[data-grade]');
        if (result) {
          result.textContent = !attempted ? '' : correct ? '✓ Correct' : 'Try again';
          result.classList.toggle('good',correct);
          result.classList.toggle('bad',attempted && !correct);
        }
        row?.classList.toggle('finance-correct',correct);
        if (control?.matches('.definition-picker')) control.classList.toggle('correct',correct);
      }
      const celebrate = animate && allCorrect && !completion.has(page);
      if (allCorrect) completion.add(page); else completion.delete(page);
      return celebrate;
    }
    function fromSaved(saved) {
      const values = {};
      if (!saved || typeof saved!=='object') return values;
      for (const [key,{step,slot}] of fields) {
        const answer = saved[step] ?? (/^original-\d+$/.test(step) ? saved[step.slice(9)] : undefined);
        const value = slot === undefined ? answer : answer?.[slot];
        if (value != null && valid(key,value)) values[key] = value;
      }
      return values;
    }
    function toSaved(values,previous={}) {
      const answers = {...previous};
      for (const step of new Set([...fields.values()].map(field=>field.step))) {
        delete answers[step];
        if (/^original-\d+$/.test(step)) delete answers[step.slice(9)];
      }
      for (const [key,{step,slot}] of fields) {
        const value = values[key];
        if (value === undefined || value === '' || value === null) continue;
        if (slot === undefined) answers[step] = value;
        else (answers[step] ||= [])[slot] = Number(value);
      }
      return answers;
    }
    return {fields,sections,valid,redraw,grade,fromSaved,toSaved,controls};
  }
  window.GoStudyExercises = {render};
})();
