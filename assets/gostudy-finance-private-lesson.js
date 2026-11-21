/* Private Michael lesson: content fetched through the existing JWT/RLS client. */
(() => {
'use strict';
const auth=window.GoStudyPrivateAccess;
let booted=false;
const report=text=>{const n=document.querySelector('#gostudyLessonLoad');if(n)n.textContent=text;};
const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Не удалось загрузить компоненты урока. Обновите страницу.'));document.head.append(s);});
async function boot(){
 if(booted||!auth.userId())return;
 booted=true;
 try{
  const slug=document.body.dataset.lessonSlug;
  const result=await auth.request('/rest/v1/gostudy_private_lessons?'+new URLSearchParams({select:'lesson_payload,student_id,teacher_id',slug:'eq.'+slug,published:'eq.true'}));
  if(!result.ok||result.data?.length!==1)throw Error('У этого аккаунта нет доступа к уроку.');
  const row=result.data[0];
  if(auth.userId()!==row.student_id && auth.userId()!==row.teacher_id)throw Error('Нет доступа к материалам.');
  const selected=new URLSearchParams(location.search).get('classStudent');
  if(selected && (auth.userId()!==row.teacher_id||selected!==row.student_id))throw Error('Неверно выбран ученик.');
  if(auth.userId()===row.teacher_id && !selected){const url=new URL(location.href);url.searchParams.set('classStudent',row.student_id);location.replace(url.href);return;}
  const config=row.lesson_payload;
  const node=document.createElement('script');node.type='application/json';node.id='lesson-data';node.textContent=JSON.stringify(config);document.body.append(node);
  await loadScript('assets/gostudy-v1-lesson.js');
  await loadScript('assets/gostudy-sync.js?v=michael-assignment-20261121');
  await loadScript('assets/gostudy-v1-exercises.js');
  if(document.body.hasAttribute('data-homework-only')){
   const aside=document.querySelector('#lessonVideo'),divider=document.querySelector('#lessonDivider');
   // Keep the shared workbook's controls mounted while hiding the entire video area.
   if(aside)aside.style.display='none';if(divider)divider.style.display='none';
   document.querySelector('.layout').style.display='block';
  }else{
   await loadScript('assets/gostudy-jaas-video.js?v=two-tiles-20261119-1');
   await loadScript('assets/gostudy-michael-chat.js?v=1');
  }
  await loadScript('assets/gostudy-v1-workbook.js?v=page-authority-20261121-1');
  document.querySelector('#gostudyLessonLoad')?.remove();
 }catch(error){booted=false;report(error.message);}
}
document.addEventListener('gostudy-private-authorized',boot);
auth.ready.then(boot);
document.addEventListener('gostudy-private-signed-out',()=>location.reload());
})();