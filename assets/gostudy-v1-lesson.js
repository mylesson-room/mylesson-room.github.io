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

</div>
<section class="finance-chat" aria-label="Чат урока"><h2>Чат урока</h2><p id="finance-live-status" role="status">Подключаемся…</p><a href="login.html" class="finance-login">Войти в GoStudy</a><p id="finance-activity" role="status"></p><ol id="finance-messages" role="log" aria-live="polite"></ol><form id="finance-chat-form"><input aria-label="Сообщение" maxlength="1000" placeholder="Сообщение" required disabled><button type="submit" disabled>Отправить</button></form></section>
<details class="lesson-section-menu"><summary>Разделы урока</summary><nav id="lessonSections" aria-label="Разделы урока"></nav></details>
</aside>
<div class="lesson-divider" id="lessonDivider" role="separator" tabindex="0" aria-label="Resize video and exercises" aria-orientation="vertical" aria-valuemin="22" aria-valuemax="55" aria-valuenow="33" aria-controls="lessonVideo"></div>
<main class="lesson"><div class="lesson-content"><section class="hero"><h1></h1></section>
<div id="lessonPages"></div>
<div class="footer"></div></div></main></div><nav class="pager" aria-label="Lesson navigation"><button type="button" class="outline" id="back">← Back</button><button type="button" class="outline move-student-button" id="moveStudent" hidden>Переместить ученика</button><button type="button" class="primary" id="next">Continue</button></nav>

<div class="selection-translate" id="selectionTranslate" role="region" aria-label="Перевод выделенного текста">
  <textarea class="selection-target" id="selectionTarget" rows="2" maxlength="300" aria-label="Перевод" placeholder="Перевод…"></textarea>
  <p id="selectionStatus" role="status" hidden></p>
  <button id="selectionRetry" type="button" hidden>Повторить перевод</button>
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

(() => {
  function makeWord(source,translation) {
     const a=String(source||"").trim(),b=String(translation||"").trim();
     if(!a||!b)return null;
     return /[А-Яа-яЁё]/.test(a)?{en:b,ru:a}:{en:a,ru:b};
  }

  function bindDivider() {
    const lessonDivider = document.querySelector('#lessonDivider');
    const layout = document.querySelector('.layout');
    function changeVideoWidth(percent) {
      const width = Math.max(22, Math.min(55, percent));
      layout.style.setProperty("--video-width", width + "%");
      lessonDivider.setAttribute("aria-valuenow", String(Math.round(width)));
    }
    lessonDivider.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      lessonDivider.setPointerCapture(event.pointerId);
      layout.classList.add("is-resizing");
    });
    lessonDivider.addEventListener("pointermove", event => {
      if (!lessonDivider.hasPointerCapture(event.pointerId)) return;
      const area = layout.getBoundingClientRect();
      changeVideoWidth((event.clientX - area.left) / area.width * 100);
    });
    lessonDivider.addEventListener("lostpointercapture", () => layout.classList.remove("is-resizing"));
    lessonDivider.addEventListener("keydown", event => {
      const step = {ArrowLeft: -2, ArrowRight: 2}[event.key];
      if (!step) return;
      event.preventDefault();
      changeVideoWidth(Number(lessonDivider.getAttribute("aria-valuenow")) + step);
    });
  }

  function bindChat() {
    const $ = selector => document.querySelector(selector);
    document.addEventListener("finance-ready",()=>{
      document.querySelectorAll("#finance-chat-form input,#finance-chat-form button").forEach(control=>{control.disabled=false});
      $(".finance-login").hidden=true;
    });
    document.addEventListener("finance-event",event=>{
      const {kind,payload,own}=event.detail;
      if(kind==="chat" && typeof payload?.text==="string"){
        const message=document.createElement("li");
        if(own)message.classList.add("chat-own");
        const body=document.createElement("span");
        body.textContent=payload.text;
        const time=document.createElement("time");
        time.className="chat-time";
        const stamp=event.detail.created_at || payload.sentAt;
        if(stamp && !Number.isNaN(Date.parse(stamp))){
          time.dateTime=stamp;
          time.textContent=new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(stamp));
        }
        message.append(body,time);
        const list=$("#finance-messages");
        list.append(message);
        list.scrollTop=list.scrollHeight;
      }
    });
    $("#finance-chat-form").addEventListener("submit",event=>{
      event.preventDefault();
      const input=event.currentTarget.querySelector("input");
      const value=input.value.trim();
      if(value && window.FinanceLive?.send("chat",{text:value,sentAt:new Date().toISOString()}))input.value="";
    });
  }

  function bindTranslation(config,saveVocabulary) {
     const byId=id=>document.getElementById(id);
     const pop=byId('selectionTranslate'),target=byId('selectionTarget');
     const status=byId('selectionStatus');
     const retry=byId('selectionRetry'),google=byId('selectionGoogle'),saveBtn=byId('selectionSave');
     let range=null,phrase='',sentence='',from='en',to='ru',controller=null,seq=0,timer=0,edited=false;
     saveBtn.hidden=!saveVocabulary;
     const canSave=()=>Boolean(saveVocabulary && target.value.trim() && lemma(phrase));
     // Explicit pilot flag: no changes to other students' translation provider.
     const googlePilot=document.body.dataset.translateEngine==='google-web-pilot';
     const cacheKey=googlePilot?'gostudy-google-web-pilot-v1':'gostudy-context-translations-v3';
     let cache={};try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}')}catch{}
     const clean=x=>String(x||'').replace(/\s+/g,' ').trim().slice(0,1000);
     const cacheId=()=>[from,to,phrase.toLowerCase(),sentence.toLowerCase().slice(0,250)].join('|');
     const known=new Map((config.vocab||[]).map(x=>[x[0].toLowerCase(),x[2]]));
     for(const x of config.lessonWords||[])if(x?.en&&x?.ru)known.set(x.en.toLowerCase(),x.ru);
     const acronym=new Set(['AI','CEO','CFO','EU','UK','USA','ROI','GDP','API','IELTS','B2']);
     const natural=x=>{
      const t=clean(x);if(!t)return t;
      if(t===t.toUpperCase() && /[A-ZА-ЯЁ]/.test(t) && !acronym.has(t) && t.length>4)return t.toLocaleLowerCase();
      return t;
     };
     const lemma=x=>{
      const w=natural(x);
      if(/\s/.test(w))return w;
      const exceptions={forecasted:'forecast',statements:'statement',forecasts:'forecast',payments:'payment',risks:'risk',predictions:'prediction',companies:'company',went:'go',made:'make',took:'take'};
      return exceptions[w.toLowerCase()]||w;
     };
     const isEligible=n=>{const e=n?.nodeType===1?n:n?.parentElement;return !!e?.closest('.lesson')&&!e.closest('textarea,input,select,button,a,.selection-translate')};
     function contextFor(r){
      const e=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
      const container=e?.closest('p,li,article,.term,.question-item,.gap-item,.activity-body')||e?.parentElement;
      const text=clean(container?.textContent||'');
      const at=text.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
      if(at<0)return '';
      const before=text.slice(0,at),after=text.slice(at+phrase.length);
      const stop=/[.!?](?=\s|$)/g;
      let boundary,lastBoundary=0;
      while((boundary=stop.exec(before)))lastBoundary=boundary.index+1;
      const next=after.match(/[.!?](?=\s|$)/);
      const right=next?at+phrase.length+next.index+1:text.length;
      const full=clean(text.slice(lastBoundary,right));
      return full.length<=440?full:clean(text.slice(Math.max(0,at-120),at+phrase.length+200));
     }
     function locate(){
      if(!range||!pop.classList.contains('is-visible'))return;
      const rect=range.getBoundingClientRect(),margin=10;
      const header=document.querySelector('header')?.getBoundingClientRect().bottom||0;
      const pager=document.querySelector('.pager')?.getBoundingClientRect().top||innerHeight;
      const width=pop.offsetWidth;
      pop.style.left=Math.round(Math.max(margin,Math.min(innerWidth-width-margin,rect.left)))+'px';
      pop.style.maxHeight=Math.max(150,pager-header-25)+'px';
      const below=pager-rect.bottom-8,above=rect.top-header-8;
      pop.style.top=Math.round(below>pop.offsetHeight||below>=above?rect.bottom+8:Math.max(header+8,rect.top-pop.offsetHeight-8))+'px';
     }
     function showStatus(t){status.textContent=t;status.hidden=!t;}
     function hide(){pop.classList.remove('is-visible');range=null;controller?.abort();seq++;}
     const fetchTranslation=async(q,signal)=>{
      if(googlePilot){
       // Undocumented Google Translate web endpoint: experimental pilot only.
       // It may reject traffic (429), change its payload or fail CORS.
       const params=new URLSearchParams({client:'gtx',sl:from,tl:to,dt:'t',q});
       const response=await fetch('https://translate.googleapis.com/translate_a/single?'+params,{signal});
       if(!response.ok)throw Error('Google HTTP '+response.status);
       const data=await response.json();
       if(!Array.isArray(data?.[0]))throw Error('Invalid Google translation');
       const output=data[0].map(part=>Array.isArray(part)?part[0]:'').filter(x=>typeof x==='string').join('');
       const result=natural(output);
       if(!result)throw Error('Empty Google translation');
       return result;
      }
      const response=await fetch('https://api.mymemory.translated.net/get?'+new URLSearchParams({q,langpair:from+'|'+to}),{signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json(),result=natural(data?.responseData?.translatedText);
      if(!result||Number(data?.responseStatus||0)>=400||/QUERY LENGTH LIMIT|MYMEMORY WARNING/i.test(result))throw Error('Translation unavailable');
      return result;
     };
     // Determine the contextual translation by comparing a full sentence with
     // the same sentence minus the selected expression. If the model rephrases
     // too much for safe alignment, translate the neighboring collocation.
     const words=x=>String(x||'').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[];
     const comparable=x=>String(x||'').toLocaleLowerCase().replace(/ё/g,'е');
     function contextualMeaning(complete,without){
      const original=words(complete),removed=words(without);
      let left=0,right=0;
      while(left<original.length&&left<removed.length&&comparable(original[left])===comparable(removed[left]))left++;
      while(right<original.length-left&&right<removed.length-left &&
            comparable(original[original.length-1-right])===comparable(removed[removed.length-1-right]))right++;
      const inserted=original.slice(left,original.length-right);
      const deleted=removed.slice(left,removed.length-right);
      if(left+right<1||!inserted.length||inserted.length>5||deleted.length)return null;
      return inserted.join(' ');
     }
     function contextualSentenceWithout(){
      if(!sentence||sentence.toLocaleLowerCase()===phrase.toLocaleLowerCase())return '';
      const at=sentence.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
      if(at<0)return '';
      const reduced=clean(sentence.slice(0,at)+' '+sentence.slice(at+phrase.length));
      return reduced.length>=3&&reduced!==sentence?reduced:'';
     }
     function contextualCollocation(){
      if(!sentence||sentence.toLocaleLowerCase()===phrase.toLocaleLowerCase())return phrase;
      const at=sentence.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
      if(at<0)return phrase;
      const following=sentence.slice(at+phrase.length).match(/^\s+([\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)?)/u);
      if(following)return phrase+' '+following[1];
      const preceding=sentence.slice(0,at).match(/([\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)?)\s+$/u);
      return preceding?preceding[1]+' '+phrase:phrase;
     }
     async function contextualTranslate(signal){
      const without=contextualSentenceWithout();
      if(!without)return null;
      const [full,shorter]=await Promise.allSettled([
        fetchTranslation(sentence,signal),fetchTranslation(without,signal)
      ]);
      if(signal.aborted)throw Error('Translation cancelled');
      if(full.status==='fulfilled'&&shorter.status==='fulfilled'){
        const selected=contextualMeaning(full.value,shorter.value);
        if(selected)return {value:selected,confidence:'aligned'};
      }
      const expression=contextualCollocation();
      if(expression!==phrase){
        const value=await fetchTranslation(expression,signal);
        return {value,confidence:'phrase'};
      }
      return null;
     }
     async function translate(){
      controller?.abort();const id=++seq;controller=new AbortController();
      const active=controller,signal=active.signal,timeout=setTimeout(()=>active.abort(),8000);
      google.href='https://translate.google.com/?'+new URLSearchParams({sl:from,tl:to,text:googlePilot && sentence?sentence:phrase,op:'translate'});
      google.hidden=true;retry.hidden=true;
      const key=cacheId(),cached=cache[key];
      if(cached){if(!edited)target.value=cached.value;saveBtn.disabled=!canSave();showStatus('');clearTimeout(timeout);return;}
      const dictionary=from==='en'?known.get(phrase.toLowerCase()):null;
      const polysemy={
        statement:[[/\b(bank|account|monthly|sent)\b/i,'выписка, заявление, утверждение'],[/.*/,'заявление, утверждение, выписка']],
        bank:[[/\briver\b/i,'берег, банк'],[/.*/,'банк, берег']],
        charge:[[/\b(delivery|fee|pay|cost|service)\b/i,'плата, заряд, обвинение'],[/.*/,'заряд, плата, обвинение']],
        interest:[[/\b(rate|loan|credit|bank)\b/i,'процент, интерес, заинтересованность'],[/.*/,'интерес, процент, заинтересованность']],
        balance:[[/\b(cash|account|bank|payment)\b/i,'остаток, баланс, равновесие'],[/.*/,'баланс, равновесие, остаток']],
        capital:[[/\b(investment|financial|raise|business|finance|funds|venture)\b/i,'капитал, столица, заглавная буква'],[/.*/,'столица, капитал, заглавная буква']],
        director:[[/\b(film|movie|cinema|theatre|scene|screenplay)\b/i,'режиссёр, директор, руководитель'],[/\b(company|board|chief|management|executive|finance|business|sales|department|report|appointed|CEO)\b/i,'директор, руководитель, режиссёр'],[/.*/,'директор, режиссёр, руководитель']],
        margin:[[/\b(profit|revenue|gross|sales|income|finance|business|cost)\b/i,'маржа, прибыльность, разница'],[/.*/,'поле, край, маржа']],
        return:[[/\b(investment|profit|ROI|fund|capital|annual|stock)\b/i,'доходность, возврат, возвращение'],[/.*/,'возвращение, возврат, доходность']],
        board:[[/\b(directors|meeting|chair|company|executive|finance)\b/i,'совет директоров, правление, доска'],[/.*/,'доска, совет директоров, правление']],
        concrete:[[/\b(actions?|steps?|plans?|examples?|recommendations?|measures?|details?|proposals?|results?|goals?|evidence|solutions?)\b/i,'конкретный, определённый, предметный'],[/\b(cement|pour|poured|building|construction|wall|floor|mix|material)\b/i,'бетон, бетонный, конкретный'],[/.*/,'конкретный, определённый, бетон']]
      };
      const pilotSense=googlePilot && from==='en' && /^reach$/i.test(phrase) && /\b(target|goal|objective|milestone|agreement|level|decision|conclusion)\b/i.test(sentence)
       ? 'достичь, достигать, добиваться' : null;
      const special=pilotSense || (from==='en' ? polysemy[phrase.toLowerCase()]?.find(([pattern])=>pattern.test(sentence))?.[1] : null);
      showStatus('Переводим…');
      try{
       // Google pilot translates the highlighted expression itself; never
       // align two translated sentences or display a neighboring phrase.
       let result=googlePilot
        ? (special||dictionary ? {value:special||dictionary,confidence:'curated'} : {value:await fetchTranslation(phrase,signal),confidence:'google'})
        : (special && phrase.toLowerCase()!=='concrete' ? {value:special,confidence:'curated'} : await contextualTranslate(signal));
       if(id!==seq)return;
       if(!result){
        const value=special||dictionary||await fetchTranslation(phrase,signal);
        result={value,confidence:sentence&&sentence!==phrase?'fallback':'isolated'};
       }
       if(!edited)target.value=result.value;
       saveBtn.disabled=!canSave();
       showStatus(result.confidence==='fallback'?'Проверьте перевод по предложению':'');
       cache[key]={value:result.value,confidence:result.confidence};
       const entries=Object.entries(cache).slice(-80);cache=Object.fromEntries(entries);
       try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch{}
      }catch(e){
       if(id!==seq)return;
       showStatus(googlePilot?'Google Translate недоступен. Можно исправить перевод вручную или открыть предложение в Google.':'Нет ответа от переводчика. Можно ввести перевод вручную.');
       retry.hidden=false;google.hidden=false;
      }finally{clearTimeout(timeout);locate();}
     }
     function selectionOpen(){
      const sel=window.getSelection();
      if(!sel||sel.isCollapsed||!sel.rangeCount||!isEligible(sel.anchorNode)||!isEligible(sel.focusNode))return;
      const selected=clean(sel.toString());if(!selected)return;
      const r=sel.getRangeAt(0);
      if(range&&phrase===selected&&range.compareBoundaryPoints(Range.START_TO_START,r)===0&&range.compareBoundaryPoints(Range.END_TO_END,r)===0)return;
      range=r.cloneRange();phrase=selected;sentence=contextFor(r);
      from=/[А-Яа-яЁё]/.test(phrase)?'ru':'en';to=from==='en'?'ru':'en';
      saveBtn.textContent='+';target.value='';edited=false;saveBtn.disabled=true;
      showStatus('Переводим…');retry.hidden=true;google.hidden=true;
      pop.classList.add('is-visible');locate();translate();
     }
     target.addEventListener('input',()=>{edited=true;saveBtn.disabled=!canSave();});
     retry.addEventListener('click',()=>{edited=false;translate();});
     const schedule=()=>{clearTimeout(timer);timer=setTimeout(selectionOpen,90);};
     document.addEventListener('mouseup',e=>{if(!pop.contains(e.target))schedule()});
     document.addEventListener('touchend',e=>{if(!pop.contains(e.target))setTimeout(selectionOpen,230)},{passive:true});
     document.addEventListener('keyup',e=>{if(e.key==='Shift'||e.key.startsWith('Arrow'))schedule()});
     document.addEventListener('scroll',locate,true);window.addEventListener('resize',locate);
     document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
     document.addEventListener('pointerdown',e=>{if(pop.classList.contains('is-visible')&&!pop.contains(e.target))hide()});
     document.querySelectorAll('#back,#next').forEach(el=>el.addEventListener('click',hide));
     saveBtn.addEventListener('click',()=>{
      const word=makeWord(lemma(phrase),target.value.trim());
      if(word && saveVocabulary?.(word)){saveBtn.textContent='✓';saveBtn.disabled=true;}
     });
  }

  window.GoStudyLessonControls = {makeWord,bindDivider,bindChat,bindTranslation};
})();
