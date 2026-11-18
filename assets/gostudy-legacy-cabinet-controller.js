/* Shared read-only cabinet controller for historical layouts.
   Existing local storage keys are kept unchanged; no data is migrated/deleted.
   Only configurations differ between courses. Future shared renderer replaces
   historical markup once owner mapping and backup/restore are accepted. */
(()=>{
'use strict';
const config=JSON.parse(document.getElementById('legacy-cabinet-settings').textContent);
const $=selector=>document.querySelector(selector);
const $$=selector=>Array.from(document.querySelectorAll(selector));
const sections=['Начало','Лексика','Чтение','Аудио','Лаборатория ленты','Дебаты','Мой проект','Итог'];
const storage=window.GoStudyStorage||localStorage;
const read=key=>{try{return JSON.parse(storage.getItem(key)||'{}')||{};}catch{return {};}};
const write=(key,value)=>{try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
let saved={},profile={},filter='all';
function inProgress(state,checkAnswers=false){
  return !!state.page || (checkAnswers&&Object.keys(state.answers||{}).length>0);
}
function displayNextLesson(){
  const button=$('#openAssignment');if(!button)return;
  if(config.travelProgress){
    const next=config.travelProgress.find(entry=>inProgress(read(entry.key),true));
    button.href=next?.lesson||config.defaultLesson;
    button.textContent=next?'Продолжить урок '+next.number+' →':
      inProgress(saved,true)?'Продолжить урок 1 →':'Начать урок 1 →';
    return;
  }
  const progress=read(config.latestProgressKey);
  const active=inProgress(progress,config.latestChecksAnswers);
  button.textContent=active?'Продолжить урок '+config.latestLessonNumber+' →':
    (config.newLabel||'Начать урок '+config.latestLessonNumber+' →');
}
function applyFilter(){
  const done=!!saved.hwDoneAt,show=filter==='all'||(filter==='done'?done:!done);
  if($('#assignmentCard'))$('#assignmentCard').hidden=!show;
  if($('#filterEmpty'))$('#filterEmpty').hidden=show;
  $$('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
}
function render(){
  saved=read(config.lessonStorageKey);profile=read(config.profileStorageKey);
  const name=typeof profile.name==='string'?profile.name:'';
  if($('#name'))$('#name').value=name;
  if($('#greeting'))$('#greeting').textContent=name?'Hello, '+name+'!':'Hello! Let’s learn.';
  document.body.classList.toggle('dark',!!saved.dark);
  const progress=config.latestChecksAnswers?read(config.latestProgressKey):saved;
  const done=!!saved.hwDoneAt,started=inProgress(progress,true);
  if($('#assignmentStatus'))$('#assignmentStatus').textContent=done?'✓ Отмечено как готовое':started?'В работе':'Можно начать';
  displayNextLesson();
  const page=Number.isInteger(saved.page)&&saved.page>=0&&saved.page<sections.length?saved.page:null;
  if($('#lastPage'))$('#lastPage').textContent=page===null?'':'Последний открытый раздел: '+sections[page];
  applyFilter();
  const words=Array.isArray(saved.words)?saved.words.filter(word=>word&&typeof word.en==='string'&&typeof word.ru==='string'):[];
  if($('#wordsCount'))$('#wordsCount').textContent=String(words.length);
  const list=$('#wordsList');
  if(list){
    list.replaceChildren();
    for(const word of words){
      const row=document.createElement('div');row.className='word';
      const en=document.createElement('strong');en.textContent=word.en;
      const ru=document.createElement('span');ru.textContent=word.ru;
      row.append(en,ru);list.append(row);
    }
  }
}
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;applyFilter();}));
$('#nameForm')?.addEventListener('submit',event=>{
  event.preventDefault();
  const next={...profile,name:$('#name').value.trim()};
  if(write(config.profileStorageKey,next)){
    profile=next;$('#nameForm').closest('details').open=false;render();
  }else if($('#storageNote')){
    $('#storageNote').hidden=false;$('#storageNote').textContent='Не удалось сохранить имя в браузере.';
  }
});
$('#theme')?.addEventListener('click',()=>{
  saved={...saved,dark:!saved.dark};
  if(!write(config.lessonStorageKey,saved)&&$('#storageNote')){
    $('#storageNote').hidden=false;$('#storageNote').textContent='Сохранение в этом браузере недоступно.';
  }
  render();
});
window.addEventListener('pageshow',render);
window.addEventListener('storage',render);
render();
})();