/* Load the canonical lesson's data once; NEW is a visual variant, not a separate workbook. */
(async()=>{
 const loading=document.querySelector('#lightLessonLoading');
 const load=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Component failed to load'));document.body.append(script);});
 try{
  const response=await fetch('business-ai-finance-b2-02.html',{credentials:'same-origin'});
  if(!response.ok)throw new Error('Lesson unavailable');
  const source=new DOMParser().parseFromString(await response.text(),'text/html');
  const raw=source.querySelector('#lesson-data');
  if(!raw)throw new Error('Lesson data unavailable');
  const config=JSON.parse(raw.textContent);
  if(config.key!=='gostudy-business-ai-finance-b2-02-v1'||!Array.isArray(config.pages))throw new Error('Unexpected lesson format');
  const node=document.createElement('script');node.type='application/json';node.id='lesson-data';node.textContent=JSON.stringify(config);document.body.append(node);
  loading.remove();
  for(const src of ['assets/gostudy-word-actions.js?v=1','assets/gostudy-v1-lesson.js?v=lesson-loading-preview-1','assets/gostudy-michael-chat.js?v=1','assets/gostudy-sync.js','assets/gostudy-jaas-video.js?v=call-controls-20261126','assets/gostudy-v1-workbook.js?v=michael-controls-1','assets/gostudy-homework.js?v=finance-hw-hide-menu-20261120','assets/fluenvia-michael-light.js?v=1'])await load(src);
  window.GoStudyHomework.renderLesson(window.GoStudyLesson);
 }catch(error){
  const status=document.querySelector('.classroom-access')||loading;
  status.textContent='Не удалось загрузить урок. ';
  const retry=document.createElement('a');retry.href=location.href;retry.textContent='Попробовать снова';status.append(retry);
  if(!status.isConnected)document.body.prepend(status);
  console.error('Light Edition:',error);
 }
})();