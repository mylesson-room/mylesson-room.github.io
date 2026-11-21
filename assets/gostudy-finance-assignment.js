/* Michael pilot: persistent teacher assignment; the initial lesson stays selected until a teacher saves. */
(() => {
'use strict';
const OLD='business-ai-finance-b2-02.html',NEXT='business-ai-finance-b2-03.html';
const catalog={
 [OLD]:{title:'Can AI predict a financial crisis before it happens?',homework:'business-ai-finance-b2-02-homework.html',label:'Текущий урок · прогнозирование финансовых рисков'},
 [NEXT]:{title:'AI has flagged the payment. What would you do?',homework:'business-ai-finance-b2-03-homework.html',label:'Следующий урок · When AI Flags a Payment'}
};
const teacherPage=location.pathname.endsWith('/gostudy-teacher.html');
const studentPage=location.pathname.endsWith('/student-business-ai-finance.html');
if(!teacherPage&&!studentPage)return;
let busy=false,room=null,current=OLD,form=null,status=null,ready=false;
const auth=()=>teacherPage?window.GoStudyTeacherAuth:window.GoStudyFinanceAuth;
async function api(path,options={}){
 const a=auth();if(!a?.userId())throw Error('Войдите в GoStudy.');
 const response=await a.request(path,options,await a.token());
 if(!response.ok)throw Error('Не удалось сохранить или загрузить назначение ('+response.status+').');
 return response.data;
}
const link=path=>path+'?classStudent='+encodeURIComponent(room.student_id);
function reflect(){
 const item=catalog[current];if(!item||!room)return;
 if(studentPage){
  const card=document.querySelector('.lesson-card-link'),hw=document.querySelector('.homework-link');
  if(card){card.href=current;card.querySelector('h2').textContent=item.title;card.setAttribute('aria-label','Открыть урок: '+item.title);const note=card.querySelector('.lesson-date');if(note)note.textContent=item.label;}
  if(hw){hw.href=item.homework;const text=hw.querySelector('.homework-subject');if(text)text.textContent=item.title;}
  return;
 }
 const list=document.querySelector('#teacher-student-list');
 for(const enter of list?.querySelectorAll('.teacher-enter-class')||[]){
  if(enter.getAttribute('href')?.includes('classStudent='+room.student_id))enter.href=link(current);
 }
 if(form){
  const active=form.querySelector('[data-current]');
  const description='Сейчас у Михаила: '+item.title;
  if(active.textContent!==description)active.textContent=description;
  const enter=form.querySelector('[data-enter-current]');
  if(enter.getAttribute('href')!==link(current))enter.href=link(current);
  const pick=form.elements.lesson;
  if(!busy && document.activeElement!==pick && !form.dataset.dirty)pick.value=current;
  form.querySelector('button[type=submit]').disabled=busy||pick.value===current;
 }
 const picker=document.querySelector('#teacher-student');
 if(picker?.value==='business_ai_finance:'+room.student_id){
  const panel=document.querySelector('#teacher-current-lesson');
  if(panel && panel.querySelector('h3')?.textContent!==item.title){
   const title=panel.querySelector('h3');if(title)title.textContent=item.title;
   const actions=panel.querySelectorAll('a');
   for(const action of actions)action.href=link(action.textContent.includes('Домашнее')?item.homework:current);
  }
 }
}
function mount(){
 if(!teacherPage || form || !room)return;
 const dashboard=document.querySelector('#teacher-dashboard');if(!dashboard)return;
 const section=document.createElement('section');section.className='teacher-panel';
 section.id='michael-lesson-assignment';
 section.innerHTML='<h2>Михаил · назначение урока</h2><p data-current></p><form><label for="michael-next-lesson">Урок на главной ученика</label><select id="michael-next-lesson" name="lesson"></select><div class="home-actions" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px"><button type="submit">Назначить Михаилу</button><a data-preview>Предпросмотр выбранного урока</a><a data-enter-current>Войти в текущий урок</a></div><p role="status" aria-live="polite"></p></form>';
 dashboard.prepend(section);form=section.querySelector('form');
 // Current title lives outside the form; expose it to the render path.
 const line=section.querySelector('[data-current]');form.prepend(line);
 for(const [path,item] of Object.entries(catalog)){const o=document.createElement('option');o.value=path;o.textContent=item.title;form.elements.lesson.append(o);}
 status=form.querySelector('[role=status]');
 const preview=()=>{form.querySelector('[data-preview]').href=link(form.elements.lesson.value);};
 form.elements.lesson.addEventListener('change',()=>{form.dataset.dirty='true';preview();reflect();status.textContent='Выбор ещё не назначен. У Михаила остаётся текущий урок.';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const chosen=form.elements.lesson.value;
  if(busy||!Object.hasOwn(catalog,chosen)||chosen===current)return;
  busy=true;form.elements.lesson.disabled=true;reflect();status.textContent='Сохраняем назначение…';
  try{
   const rows=await api('/rest/v1/gostudy_finance_lesson_selection?'+new URLSearchParams({student_id:'eq.'+room.student_id,teacher_id:'eq.'+room.teacher_id}),{
    method:'PATCH',headers:{Prefer:'return=representation'},body:{lesson_path:chosen,updated_at:new Date().toISOString()}
   });
   if(!Array.isArray(rows)||rows.length!==1||rows[0].lesson_path!==chosen)throw Error('Сервер не подтвердил назначение.');
   current=chosen;delete form.dataset.dirty;
   status.textContent='Назначено: '+catalog[current].title+'. Главная Михаила обновится автоматически в течение 5 секунд.';
  }catch(error){status.textContent=error.message+' Обновите страницу, чтобы проверить текущее назначение.';}
  finally{busy=false;form.elements.lesson.disabled=false;reflect();preview();}
 });
 reflect();preview();
}
async function refresh(){
 if(busy||document.hidden)return;
 const a=auth();if(!a?.userId())return;
 try{
  if(!room){
   const rows=await api('/rest/v1/gostudy_finance_room?select=student_id,teacher_id');
   room=rows?.find(r=>teacherPage?r.teacher_id===a.userId():r.student_id===a.userId());
   if(!room)return;
  }
  const rows=await api('/rest/v1/gostudy_finance_lesson_selection?'+new URLSearchParams({select:'lesson_path',student_id:'eq.'+room.student_id}));
  if(rows?.length!==1||!Object.hasOwn(catalog,rows[0].lesson_path))throw Error('Назначение не найдено.');
  current=rows[0].lesson_path;ready=true;mount();reflect();
 }catch(error){if(status)status.textContent=error.message;else console.warn('Lesson selection:',error.message);}
}
const start=()=>{
 refresh();const timer=setInterval(refresh,5000);
 window.addEventListener('pageshow',refresh);window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',refresh);
 if(teacherPage){
  const list=document.querySelector('#teacher-student-list'),panel=document.querySelector('#teacher-current-lesson');
  const observer=new MutationObserver(()=>{if(ready)reflect();});
  for(const node of [list,panel])if(node)observer.observe(node,{childList:true,subtree:true});
 }
 window.addEventListener('pagehide',e=>{if(!e.persisted)clearInterval(timer);});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();