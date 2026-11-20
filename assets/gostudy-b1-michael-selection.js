/* B1 Stories: use the same selection translation algorithm as the Michael
   reference. Isolated B1 adapter; never loads Michael's finance lesson DOM. */
(() => {
 'use strict';
 if(!document.body.hasAttribute('data-dud-b1-premium'))return;
 if(!document.querySelector('.sheet .lesson-content') || document.getElementById('selectionTranslate'))return;
 const glossary=window.GoStudyB1Glossary;
 if(!glossary?.add)return;
 const mark=document.createElement('div');
 mark.className='selection-translate';
 mark.id='selectionTranslate';
 mark.setAttribute('role','region');
 mark.setAttribute('aria-label','Перевод выделенного текста');
 mark.innerHTML=`
  <textarea class="selection-target" id="selectionTarget" rows="2" maxlength="300" aria-label="Перевод" placeholder="Перевод…"></textarea>
  <p id="selectionStatus" role="status" hidden></p>
  <button id="selectionRetry" type="button" hidden>Повторить перевод</button>
  <div class="selection-tools">
    <button id="selectionSave" type="button" aria-label="Добавить в словарь" title="Добавить в словарь" disabled>+</button>
  </div>
  <a id="selectionGoogle" target="_blank" rel="noopener noreferrer" hidden>Открыть в Google Translate</a>`;
 document.body.append(mark);
 const makeWord=(a,b)=>{
   const source=String(a||'').trim(),translation=String(b||'').trim();
   if(!source||!translation)return null;
   return /[А-Яа-яЁё]/.test(source)?{en:translation,ru:source}:{en:source,ru:translation};
 };
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
     const isEligible=n=>{const e=n?.nodeType===1?n:n?.parentElement;return !!e?.closest('.sheet .lesson-content')&&!e.closest('textarea,input,select,button,a,.selection-translate,.glass-words')};
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
      const footer=document.querySelector('.step-nav')?.getBoundingClientRect().top||innerHeight;
      const safeTop=Math.max(10,Math.min(innerHeight-180,header+8));
      const safeBottom=Math.min(innerHeight-10,Math.max(safeTop+160,footer-8));
      const width=Math.min(pop.offsetWidth,innerWidth-margin*2);
      pop.style.left=Math.round(Math.max(margin,Math.min(innerWidth-width-margin,rect.left)))+'px';
      pop.style.maxHeight=Math.max(145,Math.min(450,safeBottom-safeTop))+'px';
      const height=pop.offsetHeight;
      // Clamp inside the visible lesson viewport, including when the selected
      // text is close to the navigation bar or partially off screen.
      const proposed=rect.bottom+8+height<=safeBottom ? rect.bottom+8
        : rect.top-height-8>=safeTop ? rect.top-height-8
        : Math.max(safeTop,Math.min(rect.bottom+8,safeBottom-height));
      pop.style.top=Math.round(Math.max(safeTop,Math.min(safeBottom-height,proposed)))+'px';
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
        concrete:[[/\b(actions?|steps?|plans?|examples?|recommendations?|measures?|details?|proposals?|results?|goals?|evidence|solutions?)\b/i,'конкретные, определённые, предметные'],[/\b(cement|pour|poured|building|construction|wall|floor|mix|material)\b/i,'бетон, бетонный, конкретный'],[/.*/,'конкретный, определённый, бетон']]
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
     document.querySelectorAll('.sheet .step-nav button,.room>.side .sections button').forEach(el=>el.addEventListener('click',hide));
     saveBtn.addEventListener('click',async()=>{
      const word=makeWord(lemma(phrase),target.value.trim());
      if(!word || !saveVocabulary)return;
      saveBtn.disabled=true;
      try { const saved=await saveVocabulary(word); if(saved===false)throw Error('Не удалось сохранить');
        // The shared B1 glossary shows a separate word-specific toast for
        // both roles. Keep the same compact translator, but confirm exactly
        // which term and meaning were saved instead of a generic ✓.
        saveBtn.textContent='✓';
        const isTeacher=new URLSearchParams(location.search).has('classStudent');
        showStatus((isTeacher?'Добавлено ученице: ':'Добавлено в словарь: ')+word.en+' — '+word.ru);
      } catch(error) { saveBtn.disabled=false;showStatus(error?.message||'Не удалось добавить слово'); }
     });
  }

 const contents=document.querySelector('#lesson-data')?.textContent;
 let config={vocab:[]};
 try {
  const lesson=JSON.parse(contents||'{}');
  config={vocab:Array.isArray(lesson.vocabulary)?lesson.vocabulary:[],lessonWords:[]};
 } catch {}
 bindTranslation(config,word=>glossary.add(word.en,word.ru));
})();
