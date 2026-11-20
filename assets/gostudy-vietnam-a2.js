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
      // UI-only enhancements load after the authorized lesson shell exists.
      // Optional scripts must never prevent private lessons/homework from opening.
      for(const source of [body.dataset.premiumChatScript,body.dataset.videoPreviewScript].filter(Boolean)){
        try { await loadScript(source); }
        catch(error){ console.warn('Optional classroom visual unavailable:',source,error); }
      }
      // Desktop live class keeps chat ready for teacher/student typing; phones
      // start collapsed to preserve exercise space, with unread indicators.
      if(body.dataset.premiumChatScript && !body.hasAttribute('data-vietnam-homework') &&
         window.matchMedia('(min-width: 801px)').matches){
        const chat=document.querySelector('#lessonVideo .lesson-chat-dropdown');
        if(chat)chat.open=true;
      }
      const signout=document.getElementById('gostudyAccessSignout');
      if(signout)document.querySelector('.header-right')?.append(signout);
      await loadScript(body.dataset.exercisesScript);
      const pages=document.getElementById('lessonPages');
      // A private workbook must not accept edits until its remote answer history
      // has been read. The shared workbook intentionally suppresses writes while
      // synchronizing; displaying its fields early would silently lose edits.
      if(pages){pages.inert=true;pages.hidden=true;pages.setAttribute('aria-busy','true');}
      document.addEventListener('finance-ready',()=>{
        if(pages){pages.inert=false;pages.hidden=false;pages.removeAttribute('aria-busy');}
        if(message)message.hidden=true;
      },{once:true});
      await loadScript(body.dataset.workbookScript);
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
