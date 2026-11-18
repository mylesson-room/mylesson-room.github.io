/* GoStudy canonical assignment editor. Works for all courses, no per-student code.
   The only mutation is one authenticated RPC, which must be deployed after reviewed SQL/RLS.
   This module deliberately does not infer active lessons from the static cabinet catalog. */
(() => {
  'use strict';
  const form=document.getElementById('teacher-assign-lesson');
  const selection=document.getElementById('teacher-lesson-select');
  const current=document.getElementById('teacher-active-assignment');
  const status=document.getElementById('teacher-assignment-status');
  if(!form||!selection||!current||!status)return;
  let studentId=null,version=0,catalog=[],pendingMutation=false;
  const button=form.querySelector('button[type=submit]');
  const uuid=v=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(v||''));
  function say(message){status.textContent=message;}
  async function api(path,options={}){
    const auth=window.GoStudyAuth;
    if(!auth)throw Error('Единая авторизация ещё не загружена.');
    const jwt=await auth.token();
    const result=await auth.request(path,options,jwt);
    if(!result.ok){
      if(result.status===404)throw Error('Централизованная система назначений пока не включена.');
      if(result.status===401||result.status===403)throw Error('Нет доступа к назначению уроков для этого ученика.');
      throw Error('Не удалось выполнить действие. Код: '+result.status);
    }
    return result.data;
  }
  async function choose(id){
    studentId=uuid(id)?id:null;
    const requestId=++version;
    // Invalidate selections immediately so a previously loaded student's lesson
    // cannot be submitted while the new student's permissions are loading.
    catalog=[];
    form.hidden=true;
    if(button)button.disabled=pendingMutation;
    selection.replaceChildren();
    current.textContent=studentId?'Загружаем актуальный урок…':'Выберите ученика.';
    say('');
    if(!studentId)return;
    try{
      const [lessons,rows]=await Promise.all([
        api('/rest/v1/gostudy_lesson_catalog?select=lesson_id,course_id,title&order=course_id.asc,title.asc'),
        api('/rest/v1/gostudy_lesson_assignments?select=lesson_id,status,published_at&student_id=eq.'+encodeURIComponent(studentId)+'&status=eq.active')
      ]);
      if(requestId!==version)return;
      if(!Array.isArray(lessons)||!Array.isArray(rows))throw Error('Некорректные данные назначений.');
      if(rows.length>1)throw Error('Найдено более одного активного урока — исправьте данные перед следующим назначением.');
      catalog=lessons.filter(x=>typeof x.lesson_id==='string'&&typeof x.title==='string');
      if(!catalog.length){current.textContent='В каталоге пока нет уроков.';return;}
      for(const lesson of catalog){
        const option=document.createElement('option');
        option.value=lesson.lesson_id;
        option.textContent=lesson.title+' · '+String(lesson.course_id||'Курс');
        selection.append(option);
      }
      if(rows.length){
        const selectedLesson=catalog.find(x=>x.lesson_id===rows[0].lesson_id);
        current.textContent='Назначен: '+(selectedLesson?.title||'Урок');
        selection.value=rows[0].lesson_id;
      }else current.textContent='Актуальный урок ещё не назначен.';
      form.hidden=false;
      if(button)button.disabled=pendingMutation;
    }catch(error){
      if(requestId!==version)return;
      current.textContent=error.message||'Не удалось загрузить назначения.';
    }
  }
  document.addEventListener('gostudy-teacher-student-selected',event=>choose(event.detail?.studentId));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const target=studentId,chosen=selection.value;
    if(pendingMutation)return;
    if(!uuid(target)||!catalog.some(x=>x.lesson_id===chosen)){say('Выберите ученика и урок.');return;}
    const submissionVersion=version;
    pendingMutation=true;
    if(button)button.disabled=true;
    say('Назначаем урок…');
    try{
      // A single invoker RPC archives the old assignment and publishes the new one
      // in one transaction, with a per-student lock. Never use two independent REST writes.
      await api('/rest/v1/rpc/gostudy_activate_student_lesson',{
        method:'POST',body:{p_student_id:target,p_lesson_id:chosen}
      });
      if(studentId!==target || version!==submissionVersion)return;
      await choose(target);
      if(studentId===target && version===submissionVersion+1)
        say('Урок назначен. Он появится в кабинете ученика.');
    }catch(error){
      // A late failure belongs to the ORIGINAL student, not the newly selected one.
      if(studentId===target && version===submissionVersion)
        say(error.message||'Не удалось назначить урок.');
    }finally{
      pendingMutation=false;
      if(button)button.disabled=false;
    }
  });
})();