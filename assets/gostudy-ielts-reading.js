/* IELTS Academic Reading: content and answers delivered only after server-authorized access. */
(() => {
'use strict';
const SLUG='ielts-reading-04',LOCAL='gostudy-ielts-reading-04-v1',WORD_KEY='gostudy-ielts-reading-01-v1';
const auth=window.GoStudyPrivateAccess;
let booted=false,payload=null,state={page:0,answers:{},prediction:'',reflection:'',checked:false},revision=0,timer=null,writing=false,dirty=false,retries=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s??'').toLowerCase().trim().replace(/\s+/g,' ');
const $=s=>document.querySelector(s);
const fail=s=>{const n=$('#gostudyLessonLoad');if(n)n.textContent=s;};
const getLocal=()=>{try{return JSON.parse(localStorage.getItem(LOCAL)||'{}')||{};}catch{return {};}};
const pages=[
 {label:'Warm-up',minutes:5},
 {label:'Reading',minutes:13},
 {label:'Matching information',minutes:9},
 {label:'Yes / No / Not Given',minutes:9},
 {label:'Summary completion',minutes:9},
 {label:'Review & reflection',minutes:5},
 {label:'Vocabulary',minutes:0}
];
function save(){
  state.updatedAt=Date.now();
  dirty=true;retries=0;
  try{localStorage.setItem(LOCAL,JSON.stringify(state));}catch(e){console.warn('Local save failed');}
  const status=$('#gostudyLessonSaved');if(status){status.hidden=false;status.textContent='Сохранено в браузере';}
  clearTimeout(timer);timer=setTimeout(saveCloud,700);
}
async function saveCloud(){
  if(!auth?.userId()||writing)return;
  writing=true;
  dirty=false;
  const current={page:state.page,answers:{...state.answers},prediction:state.prediction,reflection:state.reflection,checked:state.checked,updatedAt:state.updatedAt};
  const status=$('#gostudyLessonSaved');
  try{
    const result=await auth.request('/rest/v1/gostudy_progress?on_conflict=user_id,lesson_key',{
      method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:{user_id:auth.userId(),lesson_key:SLUG,state:current,revision:revision+1}
    });
    if(!result.ok)throw Error('Не удалось синхронизировать прогресс ('+result.status+').');
    revision++;retries=0;
    if(status)status.textContent='Сохранено в аккаунте ✓';
  }catch(e){dirty=true;retries++;if(status)status.textContent='Локально сохранено · облако недоступно';}
  finally{writing=false;if(dirty&&retries<3){clearTimeout(timer);timer=setTimeout(saveCloud,2000*Math.pow(2,retries));}}
}
function panel(title,body,subtitle=''){
 return '<section class="page panel"><div class="eyebrow">IELTS Academic Reading · '+esc(title)+'</div><h2>'+esc(title)+'</h2>'+(subtitle?'<p class="lead">'+esc(subtitle)+'</p>':'')+body+'</section>';
}
function questionsOf(type){
 return payload.questions.filter(q=>q[1]===type).map(([id,,question])=>{
  const input=type==='completion'
   ?'<input type="text" autocomplete="off" aria-label="Question '+esc(id)+'" placeholder="Answer">'
   :'<select aria-label="Question '+esc(id)+'"><option value="">Choose…</option>'+(type==='claims'?['YES','NO','NOT GIVEN']:['A','B','C','D','E','F']).map(v=>'<option value="'+v+'">'+v+'</option>').join('')+'</select>';
  return '<div class="gostudy-ielts-question" data-question="'+esc(id)+'"><label for="reading-answer-'+id+'"><b>'+id+'.</b> '+esc(question)+'</label>'+input+'<p class="gostudy-ielts-feedback" role="status"></p></div>';
 }).join('');
}
function makePages(){
 const p=payload;
 return [
 panel('Investigate','<p>'+esc(p.mission)+'</p><div class="gostudy-ielts-evidence"><span>🚶 Pedestrians: safety</span><span>🕊️ Birds: migration</span><span>🏙️ Council: cost</span></div><label for="reading-hypothesis">What evidence would you need before making a decision?</label><textarea id="reading-hypothesis" rows="4" placeholder="I would compare... because..."></textarea>','Make a prediction before you read.'),
 panel('Academic text','<div class="gostudy-ielts-passage" lang="en">'+p.reading+'</div>','When the Night Became a Public Resource · Read for the main argument and supporting evidence.'),
 panel('Matching information','<p>Which paragraph A–F contains each piece of information? A letter may be used more than once.</p>'+questionsOf('features'),'Questions 1–4 · Use evidence from the text, not just matching keywords.'),
 panel('Yes / No / Not Given','<p><b>YES</b>: agrees with the writer. <b>NO</b>: contradicts the writer. <b>NOT GIVEN</b>: not stated.</p>'+questionsOf('claims'),'Questions 5–8 · Is the claim supported, contradicted, or absent?'),
 panel('Summary completion','<p>Complete with <b>NO MORE THAN TWO WORDS</b> from the reading passage.</p><div class="tip">'+esc(p.summary)+'</div>'+questionsOf('completion'),'Questions 9–12 · Use words from the passage.'),
 panel('Review & reflection','<p>Locate the exact evidence before checking. Incorrect answers show the relevant paragraph.</p><div class="gostudy-ielts-actions"><button id="reading-check" class="primary" type="button">Проверить ответы</button><button id="reading-clear" type="button">Очистить ответы</button></div><p id="reading-score" role="status" aria-live="polite"></p><details id="reading-keys"><summary>Ответы и объяснения</summary><div id="reading-key-list"></div></details><label for="reading-reflection">Why is a change in bird counts not proof that lighting caused it?</label><textarea id="reading-reflection" rows="4" placeholder="The difference is..."></textarea>','Make your evidence explicit.'),
 panel('Vocabulary','<p>Choose useful academic words for your personal dictionary and training.</p><div id="reading-words" class="gostudy-ielts-words"></div>','Your words are shown in the GoStudy cabinet.')
 ];
}
function drawNav(){
 const n=$('#lessonSections');if(!n)return;
 n.innerHTML=pages.map((p,i)=>'<button data-page="'+i+'" type="button"><span class="num">'+String(i+1).padStart(2,'0')+'</span>'+esc(p.label)+'</button>').join('');
 n.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)go(Number(b.dataset.page));});
 $('#back').addEventListener('click',()=>go(state.page-1));
 $('#next').addEventListener('click',()=>go(state.page+1));
}
function go(index,scroll=true){
 state.page=Math.max(0,Math.min(pages.length-1,index));
 document.querySelectorAll('#lessonPages>.page').forEach((element,i)=>element.classList.toggle('active',i===state.page));
 document.querySelectorAll('#lessonSections [data-page]').forEach((element,i)=>element.classList.toggle('active',i===state.page));
 const b=$('#back'),n=$('#next');b.disabled=state.page===0;n.disabled=state.page===pages.length-1;n.textContent=state.page===pages.length-2?'Словарь →':'Продолжить →';
 const menu=$('.lesson-section-menu');if(menu)menu.open=false;
 if(scroll)window.scrollTo({top:0,behavior:'auto'});
 save();
}
function renderFeedback(){
 let score=0;
 const keyList=$('#reading-key-list');keyList.replaceChildren();
 for(const [id,type,prompt,expected,evidence] of payload.questions){
  const element=$('[data-question="'+id+'"]');
  const answer=normalize(state.answers[id]),ok=answer===normalize(expected);
  if(ok)score++;
  element.classList.toggle('gostudy-ielts-correct',ok);
  element.classList.toggle('gostudy-ielts-incorrect',!ok);
  element.querySelector('.gostudy-ielts-feedback').textContent=(ok?'Верно. ':'Ответ: '+expected+'. ')+evidence;
  const line=document.createElement('p');line.textContent=id+'. '+expected+' — '+evidence;keyList.append(line);
 }
 $('#reading-score').textContent=score+' / '+payload.questions.length+' · '+(score===payload.questions.length?'Отлично!':'Проверьте доказательства и исправьте ошибки.');
}
function clearFeedback(){
 document.querySelectorAll('.gostudy-ielts-question').forEach(el=>{
  el.classList.remove('gostudy-ielts-correct','gostudy-ielts-incorrect');
  el.querySelector('.gostudy-ielts-feedback').textContent='';
 });
 $('#reading-score').textContent='';
}
function savedWords(){
 try{const p=JSON.parse(localStorage.getItem(WORD_KEY)||'{}')||{};return Array.isArray(p.words)?p.words:[];}catch{return [];}
}
function addWord(en,ru){
 try{
  const p=JSON.parse(localStorage.getItem(WORD_KEY)||'{}')||{};const list=Array.isArray(p.words)?p.words:[];
  if(!list.some(w=>normalize(w.en)===normalize(en)))list.push({en,ru});
  p.words=list;localStorage.setItem(WORD_KEY,JSON.stringify(p));
  renderWords();document.dispatchEvent(new Event('gostudy-vocabulary-updated'));return true;
 }catch{return false;}
}
function renderWords(){
 const list=savedWords(), container=$('#reading-words'),dict=$('#myWords');
 if(container){
  container.replaceChildren();
  for(const [en,ru] of payload.words){
   const div=document.createElement('div');div.className='term';
   const b=document.createElement('strong');b.textContent=en;const info=document.createElement('p');info.textContent=ru;
   const button=document.createElement('button');button.type='button';
   const added=list.some(w=>normalize(w.en)===normalize(en));
   button.textContent=added?'✓ Добавлено':'+ В словарь';button.disabled=added;button.onclick=()=>addWord(en,ru);
   div.append(b,info,button);container.append(div);
  }
 }
 if(dict){dict.replaceChildren();for(const word of list){const row=document.createElement('div');row.className='term';const strong=document.createElement('strong');strong.textContent=word.en;const p=document.createElement('p');p.textContent=word.ru;row.append(strong,p);dict.append(row);}}
 const counter=$('#wordCountSidebar');if(counter)counter.textContent=String(list.length);
}
function bind(){
 drawNav();
 for(const [id] of payload.questions){
  const element=$('[data-question="'+id+'"]');
  const input=element.querySelector('select,input');
  input.id='reading-answer-'+id;
  input.value=state.answers[id]||'';
  input.addEventListener('input',()=>{state.answers[id]=input.value;state.checked=false;clearFeedback();save();});
 }
 const hypothesis=$('#reading-hypothesis'), reflection=$('#reading-reflection');
 hypothesis.value=state.prediction||'';
 reflection.value=state.reflection||'';
 hypothesis.addEventListener('input',()=>{state.prediction=hypothesis.value;save();});
 reflection.addEventListener('input',()=>{state.reflection=reflection.value;save();});
 $('#reading-check').addEventListener('click',()=>{state.checked=true;renderFeedback();save();});
 $('#reading-clear').addEventListener('click',()=>{if(!confirm('Очистить ответы только IELTS Reading 04?'))return;state.answers={};state.checked=false;for(const node of document.querySelectorAll('.gostudy-ielts-question select,.gostudy-ielts-question input'))node.value='';clearFeedback();save();});
 const dictBtn=$('#openLessonDictionary'), dialog=$('#lessonDictionary');
 if(dictBtn&&dialog)dictBtn.addEventListener('click',()=>{renderWords();dialog.showModal();});
 const form=$('#dictionaryAddForm');
 if(form)form.addEventListener('submit',e=>{e.preventDefault();const source=$('#dictionarySource').value.trim(),translation=$('#dictionaryTranslation').value.trim();if(source&&translation&&addWord(source,translation))form.reset();});
 const chat=$('.finance-chat');if(chat){chat.querySelector('#finance-live-status').textContent='Чат этого курса пока не подключён';chat.querySelector('.finance-login')?.remove();}
 // The shared lesson shell is reused; keep unsupported controls non-interactive.
 const translate=$('#selectionTranslate');if(translate)translate.hidden=true;
 go(Number.isInteger(state.page)?state.page:0,false);
 if(state.checked)renderFeedback();
 renderWords();
 document.addEventListener('gostudy-vocabulary-sync',renderWords);
}
async function fetchCloud(){
 const local=getLocal(),userId=auth.userId();
 let saved=local;
 try{
  const result=await auth.request('/rest/v1/gostudy_progress?select=state,revision&user_id=eq.'+encodeURIComponent(userId)+'&lesson_key=eq.'+encodeURIComponent(SLUG));
  if(!result.ok)throw Error('Не удалось получить прогресс ('+result.status+').');
  const data=Array.isArray(result.data)?result.data[0]:null;
  if(data?.state){
    const isLocalNewer=Number(local.updatedAt||0)>Number(data.state.updatedAt||0);
    saved=isLocalNewer?{...data.state,...local,answers:{...(data.state.answers||{}),...(local.answers||{})}}:{...local,...data.state,answers:{...(local.answers||{}),...(data.state.answers||{})}};
    revision=data.revision||0;
  }
 }catch(error){console.warn('Cloud progress unavailable:',error.message);}
 state={page:0,answers:{},prediction:'',reflection:'',checked:false,...saved};
 if(!state.answers||typeof state.answers!=='object')state.answers={};
}
function loadScript(src){
 return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Failed to load '+src));document.body.append(script);});
}
async function start(){
 if(booted||!auth.userId())return;booted=true;
 fail('Загружаем Ваш урок…');
 try{
  const result=await auth.request('/rest/v1/gostudy_private_lessons?select=lesson_payload&slug=eq.'+encodeURIComponent(SLUG));
  if(!result.ok)throw Error('Ошибка доступа к материалам ('+result.status+').');
  const data=Array.isArray(result.data)?result.data[0]:null;
  if(!data?.lesson_payload)throw Error('Нет доступа к материалам урока.');
  payload=data.lesson_payload;
  if(!Array.isArray(payload.questions)||!Array.isArray(payload.words))throw Error('Некорректный формат урока.');
  await fetchCloud();
  const cfg={title:payload.title,hero:payload.title,cabinet:'student-ielts-reading.html',footer:'GoStudy · Original IELTS-style reading practice',pages:makePages()};
  const script=document.createElement('script');script.type='application/json';script.id='lesson-data';script.textContent=JSON.stringify(cfg);document.body.append(script);
  await loadScript('assets/gostudy-v1-lesson.js');
  const bar=$('.hero');if(bar)bar.insertAdjacentHTML('beforeend','<p>'+esc(payload.subtitle||'IELTS Reading')+'</p><div class="hero-chips"><span>IELTS Academic</span><span>50 минут</span><span>12 вопросов</span></div>');
  const section=$('#gostudyLessonLoad');if(section)section.hidden=true;
  const accessLine=$('.classroom-access');if(accessLine)accessLine.hidden=true;
  bind();
 }catch(e){booted=false;fail('Не удалось открыть урок: '+e.message+' Проверьте вход и соединение.');}
}
window.addEventListener('online',()=>{if(dirty&&auth.userId()){retries=0;saveCloud();}});
document.addEventListener('gostudy-private-authorized',start);
auth.ready.then(ok=>{if(ok)start();});
})();