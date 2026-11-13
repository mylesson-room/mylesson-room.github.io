(() => {
  const course = document.body.dataset.vocabCourse;
  const legacy = {
    'business-ai':['gostudy-business-ai-shared-v1','gostudy-business-ai-b2c1-v1'],
    'country-house':['gostudy-country-house-homework-a2-v1','gostudy-country-house-lesson-a2-v1','gostudy-country-house-lesson-02-a2-v1'],
    'travel-b2':['gostudy-travel-disruptions-b2-v1','gostudy-travel-b2-02-v1']
  }[course] || [];
  if (!course) return;
  legacy.push(...(window.GoStudyCurrentCourses?.[course] || []));
  const key = 'gostudy-vocabulary-'+course+'-v1';
  const storage = window.GoStudyStorage || localStorage;
  const shared = window.GoStudyWorkbookWords || window.GoStudyTravelWords;
  const classMode = new URLSearchParams(location.search).has('classStudent');
  let needsClass = !classMode && shared?.teacherWithoutStudent;
  let assigned = [];
  const norm = text => String(text).trim().toLowerCase().replace(/\s+/g,' ').replace(/[.!?,;:]+$/,'');
  const russian = /[а-яё]/i;
  const lesson = document.querySelector('.sheet,#content');
  const compactToolbar = document.body.matches('.travel-workbook,.color-workbook');
  const by = (root,selector) => root.querySelector(selector);
  const button = (label,action,cls='') => Object.assign(document.createElement('button'),{type:'button',textContent:label,onclick:action,className:cls});
  const dictionary = document.createElement('dialog');
  dictionary.className = 'glass-words';
  dictionary.setAttribute('aria-labelledby','glass-vocab-title');
  dictionary.innerHTML = '<div class="glass-title"><h2 id="glass-vocab-title">Мой словарь</h2><button type="button" class="glass-close" aria-label="Закрыть">×</button></div><nav class="glass-tabs" aria-label="Словарь и тренировка"></nav><section class="glass-library"><form class="glass-form"><label>Слово или фраза<input required maxlength="200" autocomplete="off" name="term"></label><label>Перевод<input required maxlength="300" autocomplete="off" name="meaning"></label><button type="submit" class="glass-primary">Добавить в словарь</button></form><p class="glass-status" role="status"></p><ul class="glass-list"></ul></section><section class="glass-practice" hidden></section>';
  document.body.append(dictionary);
  const library = by(dictionary,'.glass-library');
  const practice = by(dictionary,'.glass-practice');
  const form = by(dictionary,'form');
  const term = form.elements.term, meaning = form.elements.meaning;
  const status = by(dictionary,'.glass-status');
  if (compactToolbar) {
    const pronounce=button('Озвучить',()=>speak(term.value.trim()),'glass-pronounce');
    pronounce.disabled=true;
    term.addEventListener('input',()=>{pronounce.disabled=!term.value.trim();});
    form.addEventListener('reset',()=>{pronounce.disabled=true;});
    form.append(pronounce);
  }
  const tabs = by(dictionary,'.glass-tabs');
  const cache = new Map();
  const glossary = {
    'roll out':'внедрять', 'rollout':'внедрение', 'pilot':'пилотный проект', 'outweigh':'перевешивать', 'sign off on':'официально одобрить', 'attributed to':'объясняется', 'case mix':'состав обращений', 'routine billing':'стандартные вопросы по оплате', 'caveat':'оговорка', 'trade-off':'компромисс', 'draft':'черновик', 'reviewer':'проверяющий',
    'shed':'сарай', 'porch':'крыльцо', 'kettle':'чайник', 'washing line':'бельевая верёвка', 'set the table':'накрыть на стол', 'bring in':'занести внутрь', 'watering can':'лейка', 'washing':'бельё', 'guests':'гости', 'at the moment':'в данный момент',
    'reroute':'направить другим маршрутом', 'reimburse':'возмещать', 'reimbursed':'возмещён', 'step-free access':'доступ без ступеней', 'out-of-pocket expense':'расход из собственного кармана', 'advance approval':'предварительное согласование', 'miss a connection':'пропустить пересадку', 'replacement coach':'автобус на замену', 'receipt':'чек', 'lift':'лифт', 'fare':'стоимость проезда', 'reimbursement cap':'лимит возмещения'
  };
  const courseGlossary = {
    'travel-b2': {
      'shared taxi':'такси на нескольких пассажиров',
      'approve a shared taxi':'одобрить поездку на такси на нескольких пассажиров',
      'before departure':'до отправления',
      'operator':'перевозчик',
      'staff':'сотрудники станции',
      'coach':'междугородний автобус',
      'connection':'стыковочный поезд',
      'per vehicle':'за всю машину',
      'on presentation of receipts':'при предъявлении чеков',
      'keep this message and all receipts':'сохраните это сообщение и все чеки',
      'the first train tomorrow leaves at 06:40':'первый поезд завтра отправляется в 06:40',
      'alternatively, staff can approve a shared taxi before departure':'как вариант, сотрудники станции могут заранее одобрить поездку на такси на нескольких пассажиров',
      'the operator will reimburse up to £60 per vehicle on presentation of receipts':'перевозчик вернёт до 60 фунтов за всю машину при предъявлении чеков',
      'front desk':'стойка регистрации',
      'lift':'подъёмник',
      'the coach lift':'подъёмник в автобусе',
      'coach lift':'подъёмник в автобусе',
      'out of service':'не работает',
      'out of pocket':'из своего кармана',
      'written approval':'письменное разрешение'
    },
    'country-house': {
      'the guests are coming at one':'гости придут в час', 'coming':'придут', 'are coming':'придут', 'guests are coming at one':'гости придут в час', 'rain is coming':'скоро пойдёт дождь',
      'chairs':'стулья', 'chair':'стул', 'shed key':'ключ от сарая', 'the shed':'сарай', 'the porch':'крыльцо', 'take four chairs out of the shed':'вынеси четыре стула из сарая', 'there’s washing on the line':'на верёвке сушится бельё', 'if it rains':'если пойдёт дождь', 'set the table':'накрыть на стол', 'bus stop':'автобусная остановка', 'line':'бельевая верёвка', 'on the line':'на бельевой верёвке',
      'it’s still drying':'оно ещё сохнет', 'it\'s still drying':'оно ещё сохнет',
      'bring it in':'занеси это в дом', 'by the kettle':'рядом с чайником',
      'wet shoes':'мокрая обувь', 'the back door':'задняя дверь', 'pick some mint':'сорвать немного мяты',
      'set the table on the porch':'накрыть на стол на крыльце'
    },
    'business-ai': {
      'pilot':'пробное внедрение', 'case mix':'соотношение разных типов обращений',
      'handling time':'время обработки обращения', 'sign-off':'окончательное одобрение',
      'escalations':'обращения, переданные на более высокий уровень',
      'survey response rate':'доля ответивших на опрос',
      'staffed shifts':'смены, в которых есть сотрудники для проверки',
      'customer-facing':'дошедший до клиента',
      'gross time savings':'экономия времени до вычета затрат на проверку',
      'net time savings':'экономия времени с учётом затрат на проверку',
      'provided that':'при условии, что'
    }
  }[course] || {};
  const lexicon = {...glossary,...courseGlossary};

  function read(store,name) {
    try { const value = JSON.parse(store.getItem(name)); return Array.isArray(value) ? value : Array.isArray(value?.words) ? value.words : []; }
    catch { return []; }
  }
  function hiddenWords(){try{return JSON.parse(storage.getItem(key))?.removed || [];}catch{return [];}}
  function words() {
    const all = new Map();
    for (const name of classMode ? [] : legacy) {
      for (const store of [localStorage,storage]) for (const word of read(store,name)) {
        if (word?.en && word?.ru) all.set(norm(word.en),word);
      }
    }
    for (const store of classMode ? [] : [localStorage,storage]) for (const word of read(store,key)) {
      if (word?.en && word?.ru) all.set(norm(word.en),word);
    }
    for (const word of assigned) if (!all.has(norm(word.en))) all.set(norm(word.en),word);
    const removed = new Set(hiddenWords());
    return [...all.values()].filter(word=>!removed.has(norm(word.en)));
  }
  async function add(a,b) {
    a=a.trim(); b=b.trim();
    if (needsClass) throw Error('Выбери ученицу в кабинете преподавателя и нажми «Войти в класс».');
    if (!a || !b) return false;
    const [en,ru] = russian.test(a) && !russian.test(b) ? [b,a] : [a,b];
    if (classMode) {
      if (!shared?.signedIn) throw Error('Войди в кабинет преподавателя и открой урок через «Войти в класс».');
      await shared.add(en,ru);
      assigned = [...assigned.filter(word=>norm(word.en)!==norm(en)),{en,ru}];
      return true;
    }
    const list = words().filter(word => norm(word.en)!==norm(en));
    const record = JSON.stringify({words:[...list,{en,ru}],removed:hiddenWords().filter(value=>value!==norm(en))});
    try { storage.setItem(key,record); } catch { return false; }
    return true;
  }
  async function removeWord(word) {
    const id=norm(word.en);
    if(classMode){
      await shared.remove(word.en);
      assigned=assigned.filter(item=>norm(item.en)!==id);
    }else{
      storage.setItem(key,JSON.stringify({
        words:read(storage,key).filter(item=>norm(item.en)!==id),
        removed:[...new Set([...hiddenWords(),id])]
      }));
    }
  }
  async function translate(text) {
    const normalized=norm(text);
    const own=words().find(word=>norm(word.en)===normalized || norm(word.ru)===normalized);
    if (own) return norm(own.en)===normalized ? own.ru : own.en;
    if (Object.hasOwn(lexicon,normalized)) return lexicon[normalized];
    const reverse=Object.keys(lexicon).find(en=>norm(lexicon[en])===normalized);
    if (reverse) return reverse;
    if (cache.has(normalized)) return cache.get(normalized);
    if (new TextEncoder().encode(text).length>450) throw Error('Выделите более короткую фразу.');
    const sourceLanguage=russian.test(text)?'ru':'en';
    const targetLanguage=sourceLanguage==='ru'?'en':'ru';
    const url='https://translate.googleapis.com/translate_a/t?'+new URLSearchParams({client:'dict-chrome-ex',sl:sourceLanguage,tl:targetLanguage,q:text});
    let result;
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(4500),credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok) throw Error();
      const data=await response.json();
      result=Array.isArray(data)&&typeof data[0]==='string'?data[0].trim():'';
      if(!result) throw Error();
    } catch {
      if (globalThis.Translator) {
        try {
          const pair={sourceLanguage,targetLanguage};
          if(await Translator.availability(pair)==='available'){
            const translator=await Translator.create({...pair,signal:AbortSignal.timeout(4500)});
            try { result=(await translator.translate(text,{signal:AbortSignal.timeout(4500)})).trim(); }
            finally { translator.destroy(); }
          }
        } catch {}
      }
      if(!result) throw Error('Перевод сейчас недоступен. Можно ввести его вручную.');
    }
    cache.set(normalized,result);
    return result;
  }
  function speak(text) {
    if (!window.speechSynthesis) return;
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang=russian.test(text)?'ru-RU':'en-GB';
    speechSynthesis.cancel(); speechSynthesis.speak(utterance);
  }
  function renderWords() {
    const list=by(dictionary,'.glass-list');
    list.replaceChildren();
    const saved=words();
    if (!saved.length) { const empty=document.createElement('li'); empty.textContent='Пока пусто. Добавьте слово или выделите его в уроке.'; list.append(empty); }
    for(const word of saved) {
      const row=document.createElement('li');
      const content=document.createElement('div');
      const strong=document.createElement('strong');
      const translation=document.createElement('span');
      strong.textContent=word.en; translation.textContent=word.ru;
      content.append(strong,translation);
      const actions=document.createElement('div');
      actions.className='glass-word-actions';
      const remove=button('×',async()=>{
        remove.disabled=true;
        try {
          await removeWord(word);
          renderWords();
          status.textContent='Слово удалено.';
        } catch(error) {
          status.textContent=error.message || 'Не удалось удалить слово.';
          remove.disabled=false;
        }
      },'glass-word-remove');
      remove.setAttribute('aria-label','Удалить '+word.en);
      remove.title='Удалить';
      actions.append(button('Озвучить',()=>speak(word.en)));
      if (!classMode || shared?.canRemoveAssigned !== false) actions.append(remove);
      row.append(content,actions);
      list.append(row);
    }
  }
  let generation=0, timer;
  term.addEventListener('input',()=>{
    clearTimeout(timer);
    const run=++generation;
    const text=term.value.trim();
    meaning.value=''; status.textContent='';
    if (!text) return;
    timer=setTimeout(async()=>{
      status.textContent='Переводим…';
      try { const result=await translate(text); if(run===generation){meaning.value=result;status.textContent='';} }
      catch(error){if(run===generation)status.textContent=error.message;}
    },320);
  });
  meaning.addEventListener('input',()=>{++generation;clearTimeout(timer);status.textContent='';});
  form.onsubmit=async event=>{
    event.preventDefault();
    const submit=form.querySelector('[type=submit]');
    submit.disabled=true;
    try { if (!await add(term.value,meaning.value)) throw Error('Не удалось сохранить слово.'); }
    catch(error){status.textContent=error.message;return;}
    finally{submit.disabled=false;}
    ++generation; clearTimeout(timer); form.reset(); renderWords(); status.textContent=classMode?'Слово добавлено ученице.':'Слово добавлено.';
  };
  const modes={'cards':'Карточки','choice':'Выбрать перевод','type':'Ввести слово'};
  let tab='words', index=0;
  function show(mode,reset=true) {
    if (reset || tab!==mode) index=0;
    tab=mode;
    library.hidden=tab!=='words';
    practice.hidden=tab==='words';
    tabs.replaceChildren(...Object.entries({words:'Словарь',...modes}).map(([id,title])=>{
      const control=button(title,()=>show(id));
      control.setAttribute('aria-pressed',id===tab);
      return control;
    }));
    if(tab==='words'){renderWords();return;}
    const saved=words();
    practice.replaceChildren();
    if(!saved.length){practice.textContent='Сначала добавьте слова в словарь.';return;}
    const word=saved[index%saved.length];
    const counter=document.createElement('p');counter.className='glass-status';counter.textContent=(index%saved.length+1)+' / '+saved.length;
    const prompt=document.createElement('h3');prompt.textContent=tab==='type'?word.ru:word.en;
    const feedback=document.createElement('p');feedback.setAttribute('role','status');
    const next=button('Следующее слово',()=>{index++;show(tab,false);},'glass-primary');
    practice.append(counter,prompt);
    if(tab==='cards') practice.append(button('Показать перевод',()=>{feedback.textContent=word.ru;}),button('Озвучить',()=>speak(word.en)));
    if(tab==='choice'){
      const distractors=[...new Set(saved.map(item=>item.ru))].filter(ru=>norm(ru)!==norm(word.ru)).slice(0,3);
      if(!distractors.length) practice.append(document.createTextNode('Для выбора перевода нужны хотя бы два разных перевода.'));
      else{
        const options=[...distractors]; options.splice(index%(options.length+1),0,word.ru);
        const choices=document.createElement('div');choices.className='glass-choices';
        for(const value of options)choices.append(button(value,()=>{feedback.textContent=value===word.ru?'Верно!':'Попробуйте ещё раз.';}));
        practice.append(choices);
      }
    }
    if(tab==='type'){
      const checkForm=document.createElement('form');checkForm.className='glass-form';
      const field=document.createElement('input');field.required=true;field.autocomplete='off';field.setAttribute('aria-label','Ответ на английском');
      const check=button('Проверить',null);check.type='submit';
      checkForm.append(field,check);
      checkForm.onsubmit=event=>{event.preventDefault();feedback.textContent=norm(field.value)===norm(word.en)?'Верно!':'Попробуйте ещё раз.';};
      practice.append(checkForm,button('Показать ответ',()=>{feedback.textContent=word.en;}));
    }
    practice.append(feedback,next);
  }
  let loading=false;
  async function refreshAssigned() {
    if (!shared || loading || !dictionary.open || document.hidden) return;
    loading=true;
    try {
      const next=await shared.read();
      if(JSON.stringify(next)!==JSON.stringify(assigned)){
        assigned=next;
        if(dictionary.open && tab==='words')renderWords();
        else if(dictionary.open && !practice.querySelector('h3'))show(tab,false);
      }
    } catch(error){if(dictionary.open && tab==='words')status.textContent=error.message;}
    finally{loading=false;}
  }
  if(shared)setInterval(refreshAssigned,3000);
  if(classMode)form.querySelector('[type=submit]').textContent='Добавить ученице';
  function open(mode) {
    closeTranslation();
    show(mode);
    if (shared && !shared.signedIn && !classMode && mode==='words') {
      const link=document.createElement('a');
      link.href='login.html'; link.textContent='Войти в GoStudy';
      status.replaceChildren('Чтобы увидеть слова преподавателя, ',link,'.');
    }
    if(classMode && !shared?.signedIn)status.textContent='Войди в кабинет преподавателя и открой урок через «Войти в класс».';
    if(!dictionary.open)dictionary.showModal();
    refreshAssigned();
  }
  by(dictionary,'.glass-close').onclick=()=>dictionary.close();
  dictionary.addEventListener('click',event=>{
    if(event.target!==dictionary)return;
    const r=dictionary.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dictionary.close();
  });
  document.addEventListener('click',event=>{
    const target=event.target.closest('.home-top-nav a,.home-top-nav button,.home-tools .home-tile,#dictBtn,a[href$="#vocabulary"],a[href$="#training"]');
    if(!target)return;
    const name=target.textContent.trim();
    if(!target.hash && target.id!=='dictBtn'&&!name.startsWith('Словарь')&&!/^(Практика|Тренировки)/.test(name))return;
    event.preventDefault();event.stopImmediatePropagation();open(target.hash==='#vocabulary'||target.id==='dictBtn'||name.startsWith('Словарь')?'words':'cards');
  },true);
  let translation, selected='', translationRun=0;
  function closeTranslation(){if(translation)translation.hidden=true;selected='';++translationRun;}
  if(!lesson)return;
  const side=document.querySelector('.side');
  const oldButton = document.getElementById('dictBtn');
  const toolbar=document.createElement('div');toolbar.className='glass-lesson-tools';
  if (!oldButton && compactToolbar) {
    const icon = button('📖',()=>open('words'),'glass-primary glass-icon');
    icon.setAttribute('aria-label','Открыть словарь');
    icon.title='Словарь';
    toolbar.append(icon);
  } else if (!oldButton) {
    toolbar.append(button('Словарь',()=>open('words'),'glass-primary'),button('Тренировать слова',()=>open('cards')));
  }
  (side?.querySelector('.panel') || document.querySelector('header') || lesson).after(toolbar);
  translation=document.createElement('section');translation.className='glass-translation';translation.hidden=true;
  translation.setAttribute('aria-label','Перевод выделенного текста');
  translation.innerHTML='<div class="glass-title"><strong></strong><button type="button" aria-label="Закрыть перевод">×</button></div><label>Перевод<textarea rows="2"></textarea></label><p role="status"></p><div class="glass-actions"></div>';
  toolbar.after(translation);
  function showClassLink() {
    if (toolbar.querySelector('a') || !(needsClass || (classMode && !shared?.signedIn))) return;
    const signIn=document.createElement('a');
    signIn.href='gostudy-teacher.html';
    signIn.textContent=needsClass?'Выбрать ученицу':'Войти как преподаватель';
    toolbar.append(signIn);
  }
  showClassLink();
  document.addEventListener('gostudy-teacher-confirmed',()=>{
    if(classMode)return;
    needsClass=true;
    showClassLink();
    by(translation,'.glass-primary').textContent='Добавить ученице';
    form.querySelector('[type=submit]').textContent='Добавить ученице';
  });
  const translated=by(translation,'textarea'), translationStatus=by(translation,'p');
  by(translation,'.glass-title button').onclick=closeTranslation;
  by(translation,'.glass-actions').append(button('Озвучить',()=>speak(selected)),button(classMode || needsClass?'Добавить ученице':'В словарь',async event=>{
    const control=event.currentTarget, run=translationRun;
    control.disabled=true;
    try { if(!await add(selected,translated.value)) throw Error('Добавьте перевод, чтобы сохранить слово.'); if(run===translationRun)translationStatus.textContent=classMode?'Слово добавлено ученице.':'Добавлено в словарь.'; }
    catch(error){if(run===translationRun)translationStatus.textContent=error.message;}
    finally{control.disabled=false;}
  },'glass-primary'));
  translated.oninput=()=>{++translationRun;translationStatus.textContent='';};
  let selecting=false, selectionTimer;
  function readSelection(){
    if(selecting||dictionary.open)return;
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed||!lesson.contains(selection.anchorNode)||!lesson.contains(selection.focusNode))return;
    const text=selection.toString().trim().replace(/\s+/g,' ');
    if(!/[a-zа-яё]/i.test(text)||text===selected)return;
    selected=text;translation.hidden=false;by(translation,'strong').textContent=text;
    translated.value='';translationStatus.textContent='Переводим…';
    const run=++translationRun;
    const context = selection.anchorNode.parentElement?.closest('p,b,strong')?.textContent || '';
    const resultPromise = course==='country-house' && /^(?:is )?coming$/i.test(text) && /rain is coming/i.test(context)
      ? Promise.resolve('скоро пойдёт') : translate(text);
    resultPromise.then(result=>{if(run===translationRun){translated.value=result;translationStatus.textContent='';}}).catch(error=>{if(run===translationRun)translationStatus.textContent=error.message;});
  }
  document.addEventListener('pointerdown',event=>{
    if(translation.contains(event.target))return;
    selecting=lesson.contains(event.target);
    if(!translation.hidden)closeTranslation();
  });
  document.addEventListener('pointerup',()=>{selecting=false;setTimeout(readSelection,0);});
  document.addEventListener('pointercancel',()=>{selecting=false;});
  document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(readSelection,220);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dictionary.open)closeTranslation();});
})();