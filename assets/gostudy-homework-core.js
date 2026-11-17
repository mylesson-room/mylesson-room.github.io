/* GoStudy shared exercise assignment component. Source exercises remain in the lesson. */
(() => {
  'use strict';
  const homeworkPage = 'business-ai-finance-b2-02-homework.html';
  const lessonPage = 'business-ai-finance-b2-02.html';
  const table = '/rest/v1/gostudy_finance_assignments';
  const answersTable = '/rest/v1/gostudy_finance_homework_answers';
  const financeRoom = '/rest/v1/gostudy_finance_room?select=teacher_id,student_id';
  const auth = () => window.GoStudyFinanceAuth;
  let current;
  let draft = [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const create = (tag,cls,text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  async function request(url, options={}) {
    const a=auth();
    if (!a?.userId()) throw new Error('Войдите в GoStudy.');
    const response=await a.request(url,options,await a.token());
    if (!response.ok) throw new Error(response.status===403?'Нет доступа к домашнему заданию.':'Ошибка сохранения или соединения ('+response.status+').');
    return response.data;
  }
  async function identify() {
    const user = auth()?.userId();
    if (!user) throw new Error('Войдите в GoStudy.');
    const rows = await request(financeRoom);
    const room = rows?.find(r => r.student_id===user || r.teacher_id===user);
    if (!room) throw new Error('Для этого аккаунта нет доступа к комнате.');
    return {student:room.student_id,teacher:room.teacher_id,isTeacher:room.teacher_id===user};
  }
  async function readAssignment(ctx) {
    const rows=await request(table+'?select=student_id,teacher_id,lesson_path,exercise_ids,published_ids,published_at&student_id=eq.'+encodeURIComponent(ctx.student));
    return rows?.[0]||null;
  }
  async function ensureDraft(ctx) {
    let row=await readAssignment(ctx);
    if(row) return row;
    if(!ctx.isTeacher) return null;
    await request(table,{method:'POST',headers:{Prefer:'return=minimal'},body:{
      student_id:ctx.student,teacher_id:ctx.teacher,lesson_path:lessonPage,exercise_ids:[],published_ids:[]
    }});
    return readAssignment(ctx);
  }
  async function updateDraft(ctx,ids) {
    if(!ctx.isTeacher) throw new Error('Только преподаватель может менять черновик.');
    await ensureDraft(ctx);
    await request(table+'?student_id=eq.'+encodeURIComponent(ctx.student),{
      method:'PATCH',headers:{Prefer:'return=minimal'},body:{exercise_ids:[...new Set(ids)],updated_at:new Date().toISOString()}
    });
    return readAssignment(ctx);
  }
  async function publish(ctx) {
    if(!ctx.isTeacher) throw new Error('Недостаточно прав для публикации.');
    const row=await ensureDraft(ctx);
    if(!row.exercise_ids?.length) throw new Error('Сначала добавьте хотя бы одно упражнение.');
    const ids=[...new Set(row.exercise_ids)];
    await request(table+'?student_id=eq.'+encodeURIComponent(ctx.student),{
      method:'PATCH',headers:{Prefer:'return=minimal'},body:{published_ids:ids,published_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    });
    return readAssignment(ctx);
  }
  function manifest(config) {
    return Array.isArray(config.exerciseManifest)?config.exerciseManifest:[];
  }
  function locate(item) {
    const type=item.type;
    let row;
    if(type==='warmup') row=document.querySelectorAll('#page-0 .questions li')[item.slot];
    if(type==='vocab') row=document.querySelectorAll('#vocab .term')[item.slot];
    if(type==='reading') row=document.querySelectorAll('#reading .question-item')[item.slot];
    if(type==='gap') row=document.querySelectorAll('#gaps .gap-item')[item.slot];
    if(type==='decision') row=document.querySelector('#decision')?.closest('.panel');
    if(type==='discussion') row=document.querySelector('#page-5 .panel');
    if(type==='opinion') row=document.querySelector('#page-6 .panel');
    if(type==='writing') row=document.querySelector('#page-7 .panel');
    return row;
  }
  function style() {
    if(document.getElementById('gostudy-assignment-styles'))return;
    const css=create('style');css.id='gostudy-assignment-styles';
    css.textContent=`
      .assignment-menu{display:inline-block;margin:8px 0 8px 10px;position:relative;font:inherit}
      .assignment-menu>summary{list-style:none;border:1px solid #d5e1f0;border-radius:10px;background:#fff;
      color:#335275;padding:5px 12px;cursor:pointer;font-size:13px;font-weight:700}
      .assignment-menu>summary::-webkit-details-marker{display:none}
      .assignment-menu button{display:block;padding:10px 12px;margin:5px 0;border:0;border-radius:8px;background:#e7f2ff;
      font:inherit;cursor:pointer;color:#184679}
      #homeworkTeacherDraft{border:1px solid #cadef3;border-radius:16px;padding:18px;margin-top:20px;background:#f8fbff}
      #homeworkTeacherDraft button{padding:10px 14px;margin:7px 7px 7px 0;border-radius:10px;cursor:pointer}
      #homeworkTeacherDraft li{margin:6px 0}
      .assignment-message{font-size:13px;color:#355371;margin-top:8px}
      body.gostudy-homework-student #page-7, body.gostudy-homework-student #lessonSections button:last-child{display:none!important}
      .homework-body{font-family:Manrope,system-ui,sans-serif;margin:0;background:#f4f7fc;color:#172c49;min-height:100vh}
      .homework-shell{max-width:940px;margin:0 auto;padding:20px 16px 80px}
      .homework-shell header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;margin-bottom:20px}
      .homework-shell header a{color:#2268b6;font-weight:700;text-decoration:none}
      .homework-item{background:#fff;border:1px solid #e3eaf5;border-radius:18px;padding:20px;margin:16px 0;box-shadow:0 6px 20px #14315b08}
      .homework-item h3{margin:0 0 12px;font-size:18px}
      .homework-item label{display:block;margin:9px 0;line-height:1.5}
      .homework-item input[type=text],.homework-item textarea{display:block;width:100%;box-sizing:border-box;border:1px solid #bbcbdf;
      border-radius:10px;padding:10px;font:inherit;margin-top:8px}
      .homework-item textarea{min-height:105px}
      .homework-item small{display:block;margin-top:7px;color:#55708f}
      .homework-item .correct{color:#087c52}.homework-item .incorrect{color:#ab3939}
      .homework-shell h1{font-size:clamp(24px,4vw,36px);margin:0 0 8px}
      .homework-shell .homework-subtitle{color:#60718a}
      @media(max-width:600px){.homework-shell{padding:12px 12px 60px}.homework-item{padding:15px}.homework-shell header{flex-wrap:wrap}}
    `;
    document.head.append(css);
  }
  async function initLesson(config){
    if(location.pathname.split('/').pop()!==lessonPage || !config?.exerciseManifest)return;
    style();
    let ctx;
    try{ctx=await identify();}catch(e){return;}
    current=ctx;
    if(!ctx.isTeacher){
      document.body.classList.add('gostudy-homework-student');
      document.querySelector('#next')?.addEventListener('click',event=>{
        if(document.querySelector('.page.active')?.id==='page-6'){
          event.preventDefault();event.stopImmediatePropagation();location.href=config.cabinet;
        }
      },true);
      return;
    }
    const ids=manifest(config);
    const panel=document.querySelector('#page-7 .panel');
    const draftPanel=create('section');draftPanel.id='homeworkTeacherDraft';
    const heading=create('h3',null,'Черновик домашнего задания');
    const status=create('p','assignment-message','Загружаем назначения…');
    const list=create('ol');
    const publishButton=create('button',null,'Опубликовать домашнее задание');
    const preview=create('a',null,'Открыть черновик домашнего задания');
    preview.href=homeworkPage+'?classStudent='+encodeURIComponent(ctx.student);
    preview.style.display='inline-block';preview.style.margin='8px';
    draftPanel.append(heading,list,publishButton,preview,status);
    panel?.prepend(draftPanel);
    const selected=new Set();
    const setStatus = t => {status.textContent=t;};
    let saved=await ensureDraft(ctx);
    draft=(saved?.exercise_ids||[]).slice();
    draft.forEach(id=>selected.add(id));
    function render(){
      list.replaceChildren(...draft.map(id=>{const item=ids.find(row=>row.id===id);return create('li',null,item?.title||id);}));
      if(!draft.length)list.append(create('li',null,'Пока нет упражнений.'));
      setStatus(saved?.published_at ? 'Опубликованная версия доступна ученику. Изменения в черновике появятся только после повторной публикации.' : 'Черновик доступен только преподавателю.');
      for(const element of document.querySelectorAll('[data-homework-id]')){
        const id=element.dataset.homeworkId;
        element.textContent=selected.has(id)?'✓ Добавлено в черновик':'Добавить в домашнее задание';
      }
    }
    for(const item of ids) {
      const row=locate(item);if(!row)continue;
      const menu=create('details','assignment-menu');
      const summary=create('summary',null,'⋯ Задание '+item.number);
      const button=create('button',null,'Добавить в домашнее задание');
      button.type='button';button.dataset.homeworkId=item.id;
      button.onclick=async()=>{
        menu.open=false;
        if(selected.has(item.id)){setStatus('Упражнение уже находится в черновике.');return;}
        button.disabled=true;setStatus('Сохраняем черновик…');
        try{saved=await updateDraft(ctx,[...draft,item.id]);draft=saved.exercise_ids.slice();selected.add(item.id);render();}
        catch(e){setStatus(e.message);}finally{button.disabled=false;}
      };
      menu.append(summary,button);row.append(menu);
    }
    publishButton.onclick=async()=>{
      publishButton.disabled=true;setStatus('Публикуем домашнее задание…');
      try{saved=await publish(ctx);render();setStatus('Опубликовано: '+new Date(saved.published_at).toLocaleString('ru-RU')+'. Ученик теперь видит домашнее задание.');}
      catch(e){setStatus(e.message);}finally{publishButton.disabled=false;}
    };
    render();
  }
  function makeExercise(item,config,answer,onChange,readonly){
    const box=create('section','homework-item');
    box.dataset.exerciseId=item.id;
    box.append(create('h3',null,'Задание '+item.number+' · '+item.title));
    const body=create('p',null,item.prompt||'');
    box.append(body);
    const note=create('small',null,'Ответ сохраняется отдельно от ответов в уроке.');
    const types=['reading','decision','vocab'];
    if(types.includes(item.type)){
      let options,correct;
      if(item.type==='reading'){const row=config.reading[item.slot];options=row[1];correct=row[2];}
      else if(item.type==='vocab'){options=config.vocab.map(x=>x[1]);correct=item.slot;}
      else {options=['Только пункт выдачи','Гибкий вариант','Только доставка до двери'];correct=null;}
      const value=answer==null?'':String(answer);
      const group='hw-'+item.id;
      options.forEach((opt,index)=>{
        const label=create('label');
        const radio=create('input');radio.type='radio';radio.name=group;radio.value=String(index);radio.checked=value===String(index);radio.disabled=readonly;
        radio.onchange=()=>{onChange(String(index));const msg=correct===null?'Ответ сохранён.':index===correct?'Верно.':'Попробуйте ещё раз.';note.textContent=msg;note.className=correct===null?'':index===correct?'correct':'incorrect';};
        label.append(radio,document.createTextNode(' '+opt));box.append(label);
      });
    } else if(item.type==='gap'){
      const row=config.gaps[item.slot];const input=create('input');input.type='text';input.value=answer==null?'':String(answer);input.disabled=readonly;
      input.onchange=()=>{onChange(input.value);const correct=input.value.trim().toLowerCase().replace(/\\s+/g,' ')===row[1].toLowerCase();note.textContent=correct?'Верно.':'Ответ сохранён. Проверьте форму выражения.';note.className=correct?'correct':'';};box.append(input);
    } else {
      const input=create('textarea');input.value=answer==null?'':String(answer);input.disabled=readonly;
      input.addEventListener('change',()=>onChange(input.value));box.append(input);
    }
    box.append(note);return box;
  }
  async function initHomeworkPage(){
    if(!document.body.hasAttribute('data-gostudy-homework-page'))return;
    style();
    const root=document.getElementById('homeworkRoot');
    const status=document.getElementById('homeworkStatus');
    const note=message=>{status.textContent=message;};
    try{
      const ctx=await identify();
      let assignment=await readAssignment(ctx);
      if(ctx.isTeacher && !assignment)assignment=await ensureDraft(ctx);
      if(!assignment){note('Домашнее задание пока не опубликовано. Вернитесь в кабинет.');return;}
      if(!ctx.isTeacher && !assignment.published_at){note('Домашнее задание ещё не назначено.');return;}
      const response=await fetch(lessonPage,{cache:'no-store'});
      if(!response.ok)throw new Error('Не удалось загрузить материал урока.');
      const html=await response.text();
      const doc=new DOMParser().parseFromString(html,'text/html');
      const cfg=JSON.parse(doc.querySelector('#lesson-data').textContent);
      const units=manifest(cfg);
      const active=ctx.isTeacher?assignment.exercise_ids:assignment.published_ids;
      if(!active.length){note(ctx.isTeacher?'Черновик пуст. Добавьте упражнения из урока.':'В опубликованной домашней работе пока нет упражнений.');return;}
      const answers=await request(answersTable+'?select=exercise_id,answer&student_id=eq.'+encodeURIComponent(ctx.student));
      const answerMap=new Map((answers||[]).map(x=>[x.exercise_id,x.answer]));
      root.replaceChildren();
      for(const id of active){
        const item=units.find(x=>x.id===id);if(!item)continue;
        const save=async(value)=>{
          try{
            await request(answersTable+'?on_conflict=student_id,exercise_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:{student_id:ctx.student,exercise_id:id,answer:value,updated_at:new Date().toISOString()}});
            note('Ответ сохранён.');
          }catch(e){note('Не удалось сохранить ответ: '+e.message);}
        };
        root.append(makeExercise(item,cfg,answerMap.get(id),save,ctx.isTeacher));
      }
      note(ctx.isTeacher?'Предпросмотр черновика: только преподаватель. Опубликованные задания могут отличаться.':'Домашнее задание опубликовано. Ответы сохраняются автоматически.');
    }catch(e){note(e.message);root.replaceChildren();}
  }
  window.GoStudyHomework={initLesson,initHomeworkPage,identify,readAssignment,manifest};
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body.hasAttribute('data-gostudy-homework-page'))initHomeworkPage();
    else if(document.querySelector('#lesson-data')){
      document.addEventListener('finance-ready',()=>initLesson(window.GoStudyLesson),{once:true});
    }
  });
})();
