/* Olga Sweden A2: display only the current teacher-assigned lesson.
 * Defaults to new-design Lesson 02; preserves every historical localStorage key.
 */
(() => {
  'use strict';
  const lessons=Object.freeze({
    'sweden-a2-02.html':{
      title:'Your first day in Sweden',homework:'sweden-a2-02-homework.html',
      label:'Урок 2 · выбран по умолчанию'
    },
    'sweden-a2-02-michael.html':{
      title:'Your First Full Day in Stockholm',homework:'sweden-a2-02-michael-homework.html',
      label:'Урок 2 · дизайн и функции Михаила'
    },
    'sweden-a2-03.html':{
      title:'A Day Trip from Stockholm',homework:'sweden-a2-03-homework.html',
      label:'Урок 3 · назначен преподавателем'
    }
  });
  const card=document.querySelector('a.lesson-card-link');
  const homework=document.querySelector('a.homework-link');
  if(!card || !homework)return;
  const status=document.createElement('p');
  status.className='sweden-assignment-status';
  status.setAttribute('role','status');
  status.textContent='По умолчанию открыт урок 2. Проверяем назначение…';
  card.after(status);
  const detail=document.createElement('details');
  detail.className='sweden-legacy-details';
  const summary=document.createElement('summary');
  summary.textContent='Сохранённые материалы из старого кабинета';
  const message=document.createElement('p');
  message.textContent='Старые слова и ответы не удалены. Открывайте этот раздел с того же устройства, на котором Вы занимались раньше.';
  const old=document.createElement('a');old.href='sweden-cabinet-legacy.html';old.textContent='Открыть старый кабинет для проверки сохранённых ответов';
  detail.append(summary,message,old);status.after(detail);
  let liveLoaded=false;
  function loadLive(){
    if(liveLoaded || !window.GoStudyFinanceAuth?.userId())return;
    liveLoaded=true;
    const script=document.createElement('script');
    script.src='assets/gostudy-finance-live.js?v=classroom-sweden-1';
    script.onerror=()=>{
      liveLoaded=false;
      status.textContent='Словарь и чат временно не синхронизируются. Проверьте интернет.';
    };
    document.head.append(script);
  }
  function show(path){
    const key=path==='sweden-a2-03.html' ? path : 'sweden-a2-02-michael.html';
    const selected=lessons[key];
    if(document.body.dataset.classroomLesson!==key && liveLoaded){
      // Existing room subscription is tied to the previous assignment.
      // Refresh first; never silently connect to the wrong lesson's event stream.
      location.reload();
      return;
    }
    document.body.dataset.liveCourse='sweden-a2';
    document.body.dataset.classroomLesson=key;
    card.href=key;
    card.querySelector('h2').textContent=selected.title;
    const sub=card.querySelector('.lesson-date');if(sub)sub.textContent=selected.label;
    card.setAttribute('aria-label','Открыть '+selected.title);
    homework.href=selected.homework;
    const title=homework.querySelector('.homework-subject');
    if(title)title.textContent='Домашнее задание · '+selected.title;
    status.textContent='Текущий урок: '+selected.title;
  }
  show('sweden-a2-02-michael.html');
  async function refresh(){
    const auth=window.GoStudyFinanceAuth;
    if(!auth?.userId()){
      status.textContent='Для проверки назначения войдите в свой аккаунт GoStudy. Пока доступен урок 2 в новом дизайне.';
      return;
    }
    try{
      const token=await auth.token();
      const query='/rest/v1/gostudy_sweden_lesson_selection?'+new URLSearchParams({
        select:'lesson_path',student_id:'eq.'+auth.userId()
      });
      const response=await auth.request(query,{},token);
      if(!response.ok || !Array.isArray(response.data))throw Error('Не удалось прочитать назначение.');
      const row=response.data[0];
      if(!row){status.textContent='Пока назначен урок 2 в новом дизайне.';return;}
      if(!Object.hasOwn(lessons,row.lesson_path))throw Error('Неизвестный урок в назначении.');
      show(row.lesson_path);
    }catch(error){
      status.textContent='Нет связи с назначениями: пока доступен урок 2 в новом дизайне. Обновите страницу позже.';
      console.warn('Sweden assignment read:',error.message);
    }finally{
      // A single course-scoped real-time subscription provides the same shared
      // vocabulary/chat events as Michael, only after authenticated selection.
      loadLive();
    }
  }
  refresh();
  window.addEventListener('pageshow',refresh);
})();
