(async () => {
  const classroom = window.GoStudyV1Classroom;
  if (classroom) await window.GoStudyV1Progress.ready;
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
  // Changing the subject of the current B1 lesson must not discard earlier
  // responses. Keep all answer IDs, but start the newly authored content at
  // Lesson information rather than an old section number.
  if (config.contentVersion && state.contentVersion !== config.contentVersion) {
    state = {...state,contentVersion:config.contentVersion,page:0};
  }
  let index = Math.min(Math.max(Number(state.page) || 0,0),config.steps.length-1);
  const escape = value => String(value).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const save = () => storage.setItem(config.key,JSON.stringify({...state,page:index}));
  const sections = document.querySelector('.sections');
  const live = window.GoStudyTravelAnswers;
  let roomSync;
  const deferredDrafts = new Map();
  if (classroom) {
    if (live?.viewing) {
      try { state.answers = await live.read(); } catch { /* The current room still opens when historical progress is unavailable. */ }
    }
    roomSync = classroom.mount({
      sidebar: room.querySelector('.side'),
      header: document.querySelector('.header-right'),
      currentPage: () => index,
      openPage: page => { if (config.steps[page]) go(page,false); },
      applyAnswer({page,key,value},initial) {
        const step = config.steps[page];
        if (!step) return;
        if (key === step.id && ((step.type === 'write' && typeof value === 'string') ||
          (step.type === 'order' && Array.isArray(value) && value.length === step.items.length &&
            value.every(item => Number.isInteger(item) && item >= 0 && item < value.length) && new Set(value).size === value.length))) {
          const draft = index === page && sheet.querySelector('textarea');
          if (draft && typeof value === 'string' && draft === document.activeElement) {
            deferredDrafts.set(step.id,value);
            return;
          }
          state.answers[step.id] = value;
          if (index === page && !initial) {
            if (draft && typeof value === 'string') {
              if (draft.value !== value) draft.value = value;
            } else render();
          }
        } else if (key.startsWith(step.id+':') && ['choice','match','gap'].includes(step.type)) {
          const slot = Number(key.slice(step.id.length+1));
          if (!Number.isInteger(slot) || !step.items[slot] || (value !== null &&
            (!Number.isInteger(value) || !step.items[slot][1][value]))) return;
          const answers = state.answers[step.id] || [];
          answers[slot] = value;
          state.answers[step.id] = answers;
          if (index === page && !initial) render();
        } else return;
        if (!initial) save();
      },
      clearAnswers(page,initial) {
        const step = config.steps[page];
        if (!step) return;
        delete state.answers[step.id];
        if (index === page && !initial) render();
        if (!initial) save();
      }
    });
    document.addEventListener('finance-ready',render);
  }
  let studentAnswers = {};
  let liveStatus, liveOverview, overviewKey;
  if (live?.viewing && !classroom) {
    liveStatus = document.createElement('p');
    liveStatus.className = 'travel-live-status';
    liveStatus.setAttribute('role','status');
    liveStatus.textContent = 'Загружаем ответы ученицы…';
    room.querySelector('.side .panel').after(liveStatus);
    if (config.key.startsWith('gostudy-general-english-b1-stories-')) {
      liveOverview = document.createElement('nav');
      liveOverview.setAttribute('aria-label','Ответы ученицы по заданиям');
      liveOverview.hidden = true;
      liveStatus.after(liveOverview);
    }
  }

  function showAnsweredSections() {
    if (!liveOverview) return;
    const answered = config.steps.flatMap((step,i) => {
      const value = studentAnswers[step.id] ?? studentAnswers[i];
      const count = Array.isArray(value) ? value.filter(Number.isInteger).length : typeof value === 'string' && value.trim() ? 1 : 0;
      return count ? [{index:i,label:step.title + ' (' + (step.type === 'order' ? 1 : count) + ')'}] : [];
    });
    const key = JSON.stringify(answered);
    if (key === overviewKey) return;
    overviewKey = key;
    // Keep the teacher's answers panel visible even before the first reply.
    // Previously it looked as if the live feed had never connected.
    liveOverview.hidden = false;
    const heading = document.createElement('strong');
    heading.textContent = 'Ответы ученицы';
    const list = document.createElement('ul');
    for (const entry of answered) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'back';
      button.textContent = entry.label;
      button.onclick = () => go(entry.index);
      item.append(button);
      list.append(item);
    }
    if (!answered.length) {
      const empty = document.createElement('p');
      empty.className='b1-live-empty';
      empty.textContent='Пока нет ответов в этом уроке. Выбор города и ответы на задания появятся здесь автоматически.';
      liveOverview.replaceChildren(heading,empty);
    } else liveOverview.replaceChildren(heading,list);
  }

  function showStudentAnswers() {
    if (!live?.viewing || classroom) return;
    const step = config.steps[index];
    const choices = studentAnswers[step.id] ?? studentAnswers[index];
    // Two interactive city decisions are now first-class student responses.
    // Show the selected city in the teacher's current section, not just
    // an invisible preference stored in the student's local state.
    let cityBadge = sheet.querySelector('.b1-live-city-choice');
    const isCityStep = step.id === 'newhome-warmup' || step.id === 'newhome-relocation';
    const city = typeof choices === 'string' ? choices.trim() : '';
    if (isCityStep && ['Porto','Da Nang','Kyoto'].includes(city)) {
      if (!cityBadge) {
        cityBadge = document.createElement('p');
        cityBadge.className = 'b1-live-city-choice';
        cityBadge.setAttribute('role','status');
        const widget=sheet.querySelector('.b1-travel-widget');
        if(widget) widget.after(cityBadge);
        else sheet.querySelector('.lesson-content').append(cityBadge);
      }
      cityBadge.textContent='Ученица выбрала: '+city;
    } else cityBadge?.remove();
    const orderNote = sheet.querySelector('.gostudy-live-order');
    if (orderNote) {
      const order = Array.isArray(choices) ? choices.map(i=>step.items[i]).filter(Boolean) : [];
      orderNote.hidden = order.length === 0;
      if (order.length && orderNote.dataset.order !== JSON.stringify(order)) {
        orderNote.dataset.order = JSON.stringify(order);
        const list = document.createElement('ol');
        for (const text of order) {
          const item = document.createElement('li');
          item.textContent = text;
          list.append(item);
        }
        orderNote.replaceChildren('Порядок ученицы',list);
      }
    }
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
        showAnsweredSections();
        showStudentAnswers();
        liveStatus.textContent = '';
      }
    } catch (error) {
      liveStatus.textContent = error.message;
    } finally {
      setTimeout(pollStudentAnswers,1600);
    }
  }
  function go(next,sync = true) {
    index = next;
    save();
    if (sync) roomSync?.page(index);
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
    const audio = step.audio ? '<div class="source"><audio controls preload="metadata" aria-label="Голосовое сообщение" style="width:100%" src="'+escape(step.audio.src)+'"></audio><details><summary>Расшифровка</summary><p>'+escape(step.audio.transcript)+'</p></details></div>' : '';
    const video = step.video && /^[A-Za-z0-9_-]{11}$/.test(step.video.youtubeId)
      ? '<div class="source"><div style="position:relative;width:100%;aspect-ratio:16/9;background:#10212b;border-radius:12px;overflow:hidden"><iframe title="'+escape(step.video.title||'Lesson video')+'" src="https://www.youtube-nocookie.com/embed/'+step.video.youtubeId+'?cc_load_policy=1" style="width:100%;height:100%;border:0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe></div><p><a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v='+step.video.youtubeId+'">Open video on YouTube if the player is unavailable</a></p></div>'
      : '';
    // Licensed-source video link: do not copy the British Council media.
    // The official page is attempted as an inline embed, with an always-visible
    // fallback link because external sites may prevent framing.
    const britishCouncilUrl = 'https://learnenglish.britishcouncil.org/free-resources/general/video-series/wots/flathunting/flathunting-scene-1';
    const officialVideo = document.body.hasAttribute('data-dud-b1-premium') && step.video?.siteUrl === britishCouncilUrl
      ? '<div class="source b1-source-video"><div class="b1-source-video-header"><strong>🎬 '+escape(step.video.title || 'British Council video')+'</strong><span>Official video + transcript · B1</span></div>'+
        '<div class="b1-source-video-frame"><iframe src="'+britishCouncilUrl+'" title="British Council Flathunting Scene 1" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen;picture-in-picture;autoplay" allowfullscreen></iframe></div>'+
        '<p class="b1-source-video-open"><a href="'+britishCouncilUrl+'" target="_blank" rel="noopener noreferrer">▶ Open video on British Council (if the embedded player is blocked)</a></p>'+
        '<p class="b1-source-video-note">Source: British Council LearnEnglish · Word on the Street. The original page includes the full video and transcript.</p></div>'
      : '';
    const isNewHomeB1 = document.body.hasAttribute('data-dud-b1-premium') && config.contentVersion === 'would-you-live-here-b1-20261120-v1';
    const travelChoices = [['Porto','Porto · neighbourhood cafés'],['Da Nang','Da Nang · beach and sunshine'],['Kyoto','Kyoto · culture and traditions']];
    const selectedTravelCity = typeof state.answers[step.id] === 'string' && travelChoices.some(c=>c[0]===state.answers[step.id]) ? state.answers[step.id] : '';
    const travelExtra = !isNewHomeB1 ? '' : step.id === 'newhome-warmup'
      ? '<div class="b1-travel-widget"><h3>🌍 Choose your city</h3><p>Where would you spend a month working remotely?</p><div class="b1-travel-radio">'+travelChoices.map(([id,label])=>'<label><input type="radio" name="b1TravelCity" value="'+escape(id)+'"'+(selectedTravelCity===id?' checked':'')+'><span>'+escape(label)+'</span></label>').join('')+'</div><p class="b1-travel-next" role="status"></p></div>'
      : step.id === 'newhome-relocation'
      ? '<div class="b1-travel-widget"><h3>🏡 Choose Clara’s new home</h3><p>Select the city, explain your reasons, then reveal one new detail.</p><div class="b1-travel-radio">'+travelChoices.map(([id,label])=>'<label><input type="radio" name="b1TravelCity" value="'+escape(id)+'"'+(selectedTravelCity===id?' checked':'')+'><span>'+escape(label)+'</span></label>').join('')+'</div><button type="button" class="b1-travel-reveal cta" aria-expanded="'+(state.travelTwist?'true':'false')+'">'+(state.travelTwist?'Hide the new detail':'Reveal a new detail!')+'</button><div class="b1-travel-twist"'+(state.travelTwist?'':' hidden')+' role="status"><strong>✨ New information</strong><p>Clara’s closest friend has accepted a job in Kyoto and would love to live nearby. Clara’s budget is still €900/month. Would you change your recommendation?</p></div></div>'
      : '';
    const writing = step.type === 'write' ? '<label class="writing">Ваш ответ<textarea rows="6">'+escape(typeof answer==='string'?answer:'')+'</textarea></label><p class="draft-status" role="status"></p>' : '';
    const cover = (step.id === 'original-0' || (index === 0 && document.body.hasAttribute('data-dud-b1-premium'))) && config.cover ? '<img class="lesson-cover" src="'+escape(config.cover)+'" alt="'+escape(config.coverAlt || '')+'">' : '';
    const teacherNotes = (live?.viewing || window.GoStudyFinanceAuth?.classroomStudent) && step.teacherNotes
      ? '<details class="source"><summary>Карточка преподавателя</summary><p>'+escape(step.teacherNotes)+'</p></details>' : '';
    const studentDraft = !classroom && live?.viewing && step.type === 'write'
      ? '<blockquote class="gostudy-live-draft source" aria-label="Ответ ученика" hidden></blockquote>' : '';
    // The B1 premium lesson uses the same elevated section-header pattern as
    // Michael. Exercise data and its cloud identifiers remain unchanged.
    const heading = document.body.hasAttribute('data-dud-b1-premium')
      ? '<div class="b1-activity-head"><span class="b1-activity-icon" aria-hidden="true">'+
          ['✦','💬','Aa','✎','▤','◎','◇','★'][index%8]+
          '</span><div class="b1-activity-titles"><h1 tabindex="-1">'+escape(step.title)+'</h1><span class="b1-activity-time">'+escape(step.minutes||'')+' мин</span></div></div>'
      : '<h1 tabindex="-1">'+escape(step.title)+'</h1>';
    frame.content.innerHTML = '<p class="label">'+escape(config.title)+'</p>'+heading+'<p class="instruction">'+escape(step.instruction)+'</p>'+cover+renderVisual(step.visual)+travelExtra+officialVideo+source+audio+video+(exercise?'<section class="activity">'+exercise+'<button type="button" class="check cta">Проверить ответы</button><p role="status" class="result"></p></section>':'')+writing+studentDraft+(liveOverview && step.type === 'order' ? '<div class="source gostudy-live-order" hidden></div>' : '')+teacherNotes;
    if (isNewHomeB1 && (step.id === 'newhome-warmup' || step.id === 'newhome-relocation')) {
      const widget = frame.content.querySelector('.b1-travel-widget');
      const prompt = widget?.querySelector('.b1-travel-next');
      const reminders = {
        'Porto': 'Explain why cafés and new friendships might make Porto feel like home.',
        'Da Nang': 'Describe a normal working day near the beach. How is it different from a holiday?',
        'Kyoto': 'What might be exciting in Kyoto, and what would take time to learn?'
      };
      if (prompt) prompt.textContent = reminders[selectedTravelCity] || 'Выберите город, затем объясните свой выбор.';
      widget?.querySelectorAll('input[name="b1TravelCity"]').forEach(input => {
        input.addEventListener('change', () => {
          state.travelCity = input.value; // Preserve old local preference without deletion.
          state.answers[step.id] = input.value; // Visible through authenticated teacher progress.
          save();
          if (prompt) prompt.textContent = reminders[input.value] || '';
        });
      });
      const button = widget?.querySelector('.b1-travel-reveal');
      if (button) {
        button.addEventListener('click', () => {
          state.travelTwist = !state.travelTwist;
          save();
          const twist = widget.querySelector('.b1-travel-twist');
          twist.hidden = !state.travelTwist;
          button.textContent = state.travelTwist ? 'Hide the new detail' : 'Reveal a new detail!';
          button.setAttribute('aria-expanded', String(!!state.travelTwist));
        });
      }
    }
    navigation.innerHTML = '<button type="button" class="back" '+(index===0?'disabled':'')+'>← Назад</button>'+(index+1===config.steps.length?'<a class="cta home-link" href="'+escape(config.cabinet)+'">В личный кабинет</a>':'<button type="button" class="cta next">Далее →</button>');
    if (classroom && (exercise || writing)) {
      const controls = document.createElement('div');
      controls.className = 'v1-room-activity';
      const page = index;
      controls.append(classroom.resetButton(() => roomSync.reset(page)));
      frame.content.prepend(controls);
    }
    showStudentAnswers();
    sheet.querySelector('.back').onclick = () => go(index-1);
    const next = sheet.querySelector('.next');
    if (next) next.onclick = () => go(index+1);
    const draft = sheet.querySelector('textarea');
    if (draft) {
      draft.oninput = () => {
        deferredDrafts.delete(step.id);
        state.answers[step.id] = draft.value;
        save();
        roomSync?.answer(index,step.id,draft.value,true);
        sheet.querySelector('.draft-status').textContent = 'Ответ сохранён';
      };
      draft.onblur = () => {
        if (!deferredDrafts.has(step.id)) return;
        const value = deferredDrafts.get(step.id);
        deferredDrafts.delete(step.id);
        if (draft.value !== value) draft.value = value;
        state.answers[step.id] = value;
        save();
      };
    }
    // Only exercise fields should be processed as numbered answers.
    // B1 city selector radios are separate speaking choices, not MCQ inputs.
    sheet.querySelectorAll('[data-question] input,[data-question] select').forEach(input => {
      input.onchange = () => {
        const i = Number(input.dataset.answer ?? input.name.slice(1));
        current[i] = input.value === '' ? null : Number(input.value);
        state.answers[step.id] = current;
        save();
        const row = input.closest('[data-question]');
        row.removeAttribute('data-result');
        row.querySelector('.feedback').textContent = '';
        sheet.querySelector('.result').textContent = '';
        roomSync?.answer(index,step.id+':'+i,current[i]);
        if (classroom) grade(true);
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
          roomSync?.answer(index,step.id+':'+i,current[i]);
          if (classroom) grade(true);
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
        roomSync?.answer(index,step.id,order);
        render();
        if (classroom && order.every((value,j) => value === step.order[j])) classroom.celebrate();
        (sheet.querySelector('[data-move="'+(i+shift)+','+shift+'"]:not(:disabled)') || sheet.querySelector('h1')).focus();
      };
    });
    const check = sheet.querySelector('.check');
    function grade(animate = false) {
      const order = step.type === 'order';
      const expected = order ? step.order : step.items.map(item => item[2]);
      const actual = order && !current.length ? step.items.map((_,i) => i) : current;
      const score = expected.filter((value,i) => {
        const correct = actual[i] === value;
        if (!order) {
          const row = sheet.querySelector('[data-question="'+i+'"]');
          if (classroom && actual[i] == null) {
            row.removeAttribute('data-result');
            row.querySelector('.feedback').textContent = '';
          } else {
            row.dataset.result = correct?'correct':'retry';
            row.querySelector('.feedback').textContent = correct ? '✓ '+(step.items[i][3] || 'Correct') : actual[i] == null ? 'Choose an answer.' : 'Try again.';
          }
        }
        return correct;
      }).length;
      const result = sheet.querySelector('.result');
      const started = actual.some(value => value != null) && (!order || current.length);
      result.textContent = !classroom || started ? score+' / '+expected.length+' correct. '+(score===expected.length?'Well done!':step.hint || '') : '';
      if (animate && score === expected.length) classroom.celebrate();
    }
    if (check) {
      if (classroom) { check.hidden = true; grade(); }
      else check.onclick = () => grade();
    }
  }
  render();
  if (live?.viewing && !classroom) pollStudentAnswers();
  if (classroom) {
    const vocabulary = document.createElement('script');
    vocabulary.src = document.querySelector('[data-room-vocabulary]').dataset.roomVocabulary;
    document.head.append(vocabulary);
  }
})();