(() => {
'use strict';
const path='business-ai-finance-b2-02.html', homeworkPath='business-ai-finance-b2-02-homework.html';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=html=>{const el=document.createElement('div');el.innerHTML=html;return el.textContent.trim().replace(/\s+/g,' ').slice(0,450)};
const api=async (url,options={})=>{
 const auth=window.GoStudyFinanceAuth;
 if(!auth?.userId())throw Error('Войдите в GoStudy.');
 const res=await auth.request(url,options,await auth.token());
 if(!res.ok)throw Error('Не удалось сохранить или загрузить данные ('+res.status+').');
 return res.data;
};
const assignmentUrl=(student)=>'/rest/v1/gostudy_homework_assignments?'+new URLSearchParams({select:'*',student_id:'eq.'+student,lesson_path:'eq.'+path});
const publishedUrl=(student)=>'/rest/v1/gostudy_homework_published?'+new URLSearchParams({select:'*',student_id:'eq.'+student,lesson_path:'eq.'+path});
const answersUrl=(student)=>'/rest/v1/gostudy_homework_answers?'+new URLSearchParams({select:'exercise_id,answer,updated_at',student_id:'eq.'+student,lesson_path:'eq.'+path});
const assignmentEditUrl=(student)=>'/rest/v1/gostudy_homework_assignments?'+new URLSearchParams({student_id:'eq.'+student,lesson_path:'eq.'+path});
const answerEditUrl=(student,id)=>'/rest/v1/gostudy_homework_answers?'+new URLSearchParams({student_id:'eq.'+student,lesson_path:'eq.'+path,exercise_id:'eq.'+id});
async function member(){
 const user=window.GoStudyFinanceAuth?.userId(), selected=window.GoStudyFinanceAuth?.classroomStudent;
 if(!user)throw Error('Войдите в GoStudy.');
 const rooms=await api('/rest/v1/gostudy_finance_room?select=teacher_id,student_id');
 const room=rooms.find(r=>selected?r.student_id===selected&&r.teacher_id===user:(r.student_id===user||r.teacher_id===user));
 if(!room)throw Error('Нет доступа к комнате Михаила.');
 return {...room,teacher:room.teacher_id===user};
}
function definitions(config){
 const ids=config.exerciseIds || {};
 const result=[];
 const push=(id,page,kind,prompt,options,answer,element)=>{
   if(!id || result.some(x=>x.id===id))throw Error('Exercise ID missing or duplicate');
   result.push({id,number:result.length+1,page,kind,prompt,options,answer,element});
 };
 (config.warmupQuestions||[]).forEach((question,i)=>push(ids.warmup?.[i],0,'write',question,[],null,document.querySelectorAll('#page-0 .questions li')[i]));
 (config.vocab||[]).forEach((v,i)=>push(ids.vocab?.[i],1,'choice','Подберите значение: '+v[0],(config.vocab||[]).map(w=>w[1]),v[1],document.querySelector('#term'+i)?.closest('.term')));
 (config.reading||[]).forEach((v,i)=>push(ids.reading?.[i],2,'choice',v[0],v[1],String(v[2]),document.querySelectorAll('#reading .question-item')[i]));
 (config.gaps||[]).forEach((v,i)=>push(ids.gaps?.[i],3,'gap',v[0],[],v[1],document.querySelectorAll('#gaps .gap-item')[i]));
 const extra=[
  ['decision',4,'choice','Выберите подход к финансовому сценарию',Object.keys(config.advice||{}),null,document.querySelector('#decision')],
  ['decisionNotes',4,'write','Объясните финансовое решение',[],null,document.querySelector('#decisionNotes')],
  ['roleNotes',5,'write','Обсудите кейс: ваши заметки',[],null,document.querySelector('#roleNotes')],
  ['finalOpinion',6,'write','Сформулируйте аргументированное мнение',[],null,document.querySelector('[data-save="finalOpinion"]')],
  ['writing',7,'write',config.homeworkPrompt||'Письменное задание',[],null,document.querySelector('#lessonSections')]
 ];
 for(const [name,page,kind,prompt,options,answer,element] of extra)push(ids[name],page,kind,prompt,options,answer,element);
 return result;
}
async function getAssignment(student){const rows=await api(assignmentUrl(student));return rows[0]||null;}
async function getPublished(student){const rows=await api(publishedUrl(student));return rows[0]||null;}
async function saveAssignment(room,record){
 const base={student_id:room.student_id,teacher_id:room.teacher_id,lesson_path:path};
 if(record.exists) return api(assignmentEditUrl(room.student_id),{method:'PATCH',body:{exercise_ids:record.ids,published_at:record.publishedAt,updated_at:new Date().toISOString()}});
 return api('/rest/v1/gostudy_homework_assignments',{method:'POST',body:{...base,exercise_ids:record.ids,published_at:record.publishedAt}});
}
function renderLesson(config){
 const defs=definitions(config);
 let room=null,record=null, busy=false;
 const nav=document.querySelector('#lessonSections');
 const status=document.createElement('p');status.className='homework-draft-status';status.setAttribute('role','status');
 const link=document.createElement('a');link.className='homework-nav-link';link.textContent='Домашнее задание (черновик)';
 link.href=homeworkPath;
 const publish=document.createElement('button');publish.type='button';publish.textContent='Опубликовать домашнее задание';publish.className='homework-publish';
 const container=document.createElement('div');container.className='homework-teacher-actions';container.append(link,publish,status);
 const update=()=>{if(!record)return;link.textContent=record.published_at?'Домашнее задание (опубликовано)':'Домашнее задание (черновик)';status.textContent='В черновике: '+record.exercise_ids.length+' упражнений'+(record.published_at?' · опубликовано':'');publish.disabled=busy||!record.exercise_ids.length;publish.textContent=record.published_at?'Обновить опубликованное задание':'Опубликовать домашнее задание';};
 async function refresh(){
  room=await member();if(!room.teacher)return;
  record=await getAssignment(room.student_id)||{exercise_ids:[],published_at:null};
  const query=new URLSearchParams({classStudent:room.student_id});link.href=homeworkPath+'?'+query;
  update();
  const allowExerciseMenus=document.body.dataset.premiumFeed!=='michael-v1';
  for(const d of defs){
   if(!d.element)continue;
   d.element.dataset.exerciseId=d.id;
   // Michael's visual pilot hides this whole feature, so don't insert the
   // menu into the DOM at all; saved assignments and homework remain intact.
   if(!allowExerciseMenus)continue;
   const control=document.createElement('details');control.className='homework-exercise-menu';
   const summary=document.createElement('summary');summary.textContent='⋯ Упражнение '+d.number;summary.setAttribute('aria-label','Меню упражнения '+d.number);
   const button=document.createElement('button');button.type='button';button.textContent='Добавить в домашнее задание';
   button.addEventListener('click',async()=>{
    if(busy)return;busy=true;button.disabled=true;
    try{
     const latest=await getAssignment(room.student_id);
     const ids=[...new Set([...(latest?.exercise_ids||[]),d.id])];
     await saveAssignment(room,{exists:!!latest,ids,publishedAt:latest?.published_at||null});
     record={exercise_ids:ids,published_at:latest?.published_at||null};
     button.textContent='Добавлено ✓';update();
    }catch(e){status.textContent=e.message;}finally{busy=false;button.disabled=false;update();}
   });
   control.append(summary,button);
   const target=d.element.closest('.term,.question-item,.gap-item')||d.element;
   target.insertAdjacentElement('afterbegin',control);
  }
  (nav?.closest('details')||nav)?.after(container); // visible only to the authenticated teacher
  publish.addEventListener('click',async()=>{
   if(busy)return;busy=true;update();
   try{
    const latest=await getAssignment(room.student_id);
    if(!latest?.exercise_ids?.length)throw Error('Сначала добавьте хотя бы одно упражнение.');
    const at=new Date().toISOString();
    const previous=await getPublished(room.student_id);
    const body={student_id:room.student_id,teacher_id:room.teacher_id,lesson_path:path,exercise_ids:latest.exercise_ids,published_at:at};
    if(previous) await api('/rest/v1/gostudy_homework_published?'+new URLSearchParams({student_id:'eq.'+room.student_id,lesson_path:'eq.'+path}),{method:'PATCH',body:{exercise_ids:latest.exercise_ids,published_at:at}});
    else await api('/rest/v1/gostudy_homework_published',{method:'POST',body});
    await saveAssignment(room,{exists:true,ids:latest.exercise_ids,publishedAt:at});
    record={...latest,published_at:at};status.textContent='Опубликовано для Михаила.';
   }catch(e){status.textContent=e.message;}finally{busy=false;update();}
  });
 }
 document.addEventListener('finance-ready',()=>{refresh().catch(e=>{status.textContent=e.message;});},{once:true});
}
async function renderHomework(){
 const root=document.querySelector('#homework-root'),status=document.querySelector('#homework-status');
 try{
  const room=await member();
  const assignment=room.teacher?(await getAssignment(room.student_id)||await getPublished(room.student_id)):await getPublished(room.student_id);
  if(!assignment){
   if(!room.teacher){status.textContent='Домашнее задание пока не опубликовано. Доступ появится после публикации преподавателем.';return;}
   status.textContent='Черновик пуст. Назначьте упражнения из урока.';return;
  }
  const source=await fetch(path,{cache:'no-store'});
  if(!source.ok)throw Error('Не удалось загрузить задания урока.');
  const html=await source.text(),dom=new DOMParser().parseFromString(html,'text/html');
  const config=JSON.parse(dom.querySelector('#lesson-data').textContent);
  const defs=definitions(config),byId=new Map(defs.map(d=>[d.id,d]));
  const stored=await api(answersUrl(room.student_id)),answers=new Map(stored.map(x=>[x.exercise_id,x.answer?.value||'']));
  status.textContent=room.teacher?(assignment.published_at?'Опубликовано · просмотр преподавателя':'Черновик · виден только преподавателю'):'Опубликовано · ваши ответы сохраняются автоматически';
  root.replaceChildren();
  for(const [index,id] of assignment.exercise_ids.entries()){
   const d=byId.get(id);if(!d)continue;
   const article=document.createElement('article');article.className='homework-task';
   const title=document.createElement('h2');title.textContent='Упражнение '+d.number+' · '+d.prompt;article.append(title);
   let input;
   if(d.kind==='choice'){
    input=document.createElement('select');input.setAttribute('aria-label',d.prompt);
    input.add(new Option('Выберите ответ',''));
    for(const option of d.options||[])input.add(new Option(option,option));
   }else if(d.kind==='gap'){
    input=document.createElement('input');input.placeholder='Введите ответ';input.setAttribute('aria-label',d.prompt);
   }else{
    input=document.createElement('textarea');input.rows=5;input.placeholder='Ваш ответ';input.setAttribute('aria-label',d.prompt);
   }
   input.value=answers.get(id)||'';input.disabled=room.teacher;
   const note=document.createElement('small');note.setAttribute('role','status');
   let timer;
   input.addEventListener('input',()=>{
    clearTimeout(timer);note.textContent='Сохранение…';
    timer=setTimeout(async()=>{
     try{
      const body={student_id:room.student_id,teacher_id:room.teacher_id,lesson_path:path,exercise_id:id,answer:{value:input.value},updated_at:new Date().toISOString()};
      await api('/rest/v1/gostudy_homework_answers?on_conflict=student_id,lesson_path,exercise_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body});
      note.textContent='Сохранено';
     }catch(e){note.textContent='Не сохранено: '+e.message;}
    },500);
   });
   article.append(input,note);root.append(article);
  }
  if(!root.children.length)status.textContent='Нет поддерживаемых упражнений в этом задании.';
 }catch(e){status.textContent=e.message;}
}
window.GoStudyHomework={definitions,renderLesson,renderHomework};
})();
