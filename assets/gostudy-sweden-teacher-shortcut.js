/* Olga-only teacher controls. Never show Michael's experimental features. */
(() => {
  'use strict';
  const picker=document.querySelector('#teacher-student');
  const profile=document.querySelector('#teacher-classroom');
  const title=document.querySelector('#teacher-classroom-title');
  const current=document.querySelector('#teacher-current-lesson');
  const roster=document.querySelector('#teacher-student-list');
  if(!picker||!profile||!current||!roster)return;
  const settings='teacher-sweden-assignment.html';
  const courseSelected=()=>picker.value.startsWith('sweden_a2:');
  function refreshProfile(){
    let link=profile.querySelector('#sweden-teacher-assign-link');
    if(!courseSelected()){link?.remove();return;}
    if(!link){
      link=document.createElement('a');
      link.id='sweden-teacher-assign-link';
      link.href=settings;
      link.textContent='Переключить урок Ольги (2 / 3)';
      link.className='teacher-enter-class';
      link.style.cssText='display:inline-flex;margin:14px 0;padding:10px 14px;';
      current.after(link);
    }
  }
  function refreshRoster(){
    for(const row of roster.querySelectorAll('.teacher-student-row')){
      const info=row.textContent.toLowerCase();
      const enter=row.querySelector('a.teacher-enter-class');
      if(!enter)continue;
      const isSweden=/sweden-a2(?:-02(?:-michael)?)?\.html/i.test(enter.getAttribute('href')||'') || /sweden\s*[·-]\s*a2/i.test(info);
      if(!isSweden)continue;
      if(!row.querySelector('.sweden-switch-link')){
        const link=document.createElement('a');
        link.href=settings;
        link.className='teacher-enter-class sweden-switch-link';
        link.textContent='Уроки 2 / 3';
        row.insertBefore(link,row.querySelector('button.teacher-student-profile'));
      }
    }
  }
  // Roster is re-rendered asynchronously; observe it, not the entire document.
  new MutationObserver(refreshRoster).observe(roster,{childList:true});
  new MutationObserver(refreshProfile).observe(current,{childList:true});
  if(title)new MutationObserver(refreshProfile).observe(title,{childList:true,characterData:true,subtree:true});
  picker.addEventListener('change',refreshProfile);
  refreshRoster();
  refreshProfile();
})();