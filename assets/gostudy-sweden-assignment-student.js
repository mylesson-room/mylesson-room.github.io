/* Olga Sweden A2: display only the current teacher-assigned lesson.
 * Fails closed to existing Lesson 02; preserves every historical localStorage key.
 */
(() => {
  'use strict';
  const lessons=Object.freeze({
    'sweden-a2-02.html':{
      title:'Your first day in Sweden',homework:'sweden-a2-02-homework.html',
      label:'Урок 2 · выбран по умолчанию'
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
  const old=document.createElement('a');old.href='student-sweden-legacy.html';old.textContent='Открыть старый кабинет для проверки сохранённых ответов';
  detail.append(summary,message,old);status.after(detail);
  function show(path){
    const selected=lessons[path] || lessons['sweden-a2-02.html'];
    const key=lessons[path]?path:'sweden-a2-02.html';
    card.href=key;
    card.querySelector('h2').textContent=selected.title;
    const sub=card.querySelector('.lesson-date');if(sub)sub.textContent=selected.label;
    card.setAttribute('aria-label','Открыть '+selected.title);
    homework.href=selected.homework;
    const title=homework.querySelector('.homework-subject');
    if(title)title.textContent='Домашнее задание · '+selected.title;
    status.textContent='Текущий урок: '+selected.title;
  }
  show('sweden-a2-02.html');
  async function refresh(){
    const auth=window.GoStudyFinanceAuth;
    if(!auth?.userId()){
      status.textContent='Для проверки назначения войдите в свой аккаунт GoStudy. Пока доступен урок 2.';
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
      if(!row){status.textContent='Пока назначен урок 2.';return;}
      if(!Object.hasOwn(lessons,row.lesson_path))throw Error('Неизвестный урок в назначении.');
      show(row.lesson_path);
    }catch(error){
      status.textContent='Нет связи с назначениями: пока доступен урок 2. Обновите страницу позже.';
      console.warn('Sweden assignment read:',error.message);
    }
  }
  refresh();
  window.addEventListener('pageshow',refresh);
})();
