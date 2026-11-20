/* Design2 IELTS: attach Michael's existing chat dropdown ONLY AFTER private access.
 * Observe DOM creation; never read or mutate auth, progress or classroom messages.
 */
(() => {
  'use strict';
  let started=false;
  const start=()=>{
    if(started || !document.body.classList.contains('gostudy-authorized'))return;
    const chat=document.querySelector('#lessonVideo .finance-chat');
    if(!chat || !document.querySelector('#lessonPages .page'))return;
    started=true;
    watcher.disconnect();
    const script=document.createElement('script');
    script.src='assets/gostudy-michael-chat.js?v=1';
    script.onload=()=>{
      // Ensure the legacy IELTS two-role chat is still visible to desktop teachers.
      const dropdown=document.querySelector('#lessonVideo .lesson-chat-dropdown');
      if(dropdown && window.matchMedia('(min-width: 801px)').matches)dropdown.open=true;
    };
    script.onerror=()=>console.warn('Optional shared chat presentation did not load; original IELTS chat remains available.');
    document.body.append(script);
  };
  const watcher=new MutationObserver(start);
  watcher.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  start();
})();
