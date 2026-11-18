/* Boot a teacher/student-locked A2 lesson or homework through the existing GoStudy v1 components. */
(() => {
  'use strict';
  const auth = window.GoStudyPrivateAccess;
  const body = document.body;
  const loadScript = src => new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=reject;
    document.head.append(script);
  });
  let booted=false;
  async function boot() {
    if(booted)return;
    const room=auth.room();
    if(!room)return;
    booted=true;
    const message=document.getElementById('vietnam-loading');
    if(message){message.hidden=false;message.textContent='Открываем материалы…';}
    try {
      const raw=document.getElementById('vietnam-content');
      const payload=JSON.parse(raw.textContent);
      const isTeacher=auth.userId()===room.teacher;
      const config=document.createElement('script');
      config.id='lesson-data';config.type='application/json';
      config.textContent=JSON.stringify({
        ...payload,
        privateRoom:room,
        cabinet:isTeacher?'gostudy-teacher.html?selected=english_placement%3A'+room.student:'student-english-placement.html',
        wordsKey:'gostudy-english-placement-vocabulary'
      });
      body.append(config);
      await loadScript(body.dataset.lessonScript);
      const signout=document.getElementById('gostudyAccessSignout');
      if(signout)document.querySelector('.header-right')?.append(signout);
      await loadScript(body.dataset.exercisesScript);
      const pages=document.getElementById('lessonPages');
      if(pages)pages.inert=true;
      document.addEventListener('finance-ready',()=>{if(pages)pages.inert=false;},{once:true});
      await loadScript(body.dataset.workbookScript);
      if(message)message.hidden=true;
      document.querySelector('.classroom-access')?.setAttribute('hidden','');
    }catch(error){
      console.error('Vietnam A2 lesson loading failed',error);
      if(message)message.textContent='Не удалось открыть урок. Обновите страницу или войдите через GoStudy.';
    }
  }
  document.addEventListener('gostudy-private-authorized',boot,{once:true});
  document.addEventListener('gostudy-private-signed-out',()=>location.assign('login.html'));
  auth.ready.then(ok=>{if(ok)boot();});
})();
