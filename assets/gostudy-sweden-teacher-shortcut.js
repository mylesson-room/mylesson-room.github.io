/* An isolated Olga-only teacher action inside the existing teacher profile.
 * The dedicated assignment page re-verifies teacher identity through course RPC.
 * Never override central roster, selected student or authorizations.
 */
(() => {
 'use strict';
 const profile=document.querySelector('#teacher-classroom');
 const title=document.querySelector('#teacher-classroom-title');
 const current=document.querySelector('#teacher-current-lesson');
 const picker=document.querySelector('#teacher-student');
 if(!profile||!title||!current||!picker)return;
 const sync=()=>{
   const isOlga=picker.value.startsWith('sweden_a2:') && title.textContent.includes('Sweden');
   let link=profile.querySelector('#sweden-teacher-assign-link');
   if(!isOlga){link?.remove();return;}
   if(!link){
     link=document.createElement('a');
     link.id='sweden-teacher-assign-link';
     link.href='teacher-sweden-assignment.html';
     link.textContent='Выбрать урок Ольги';
     link.className='teacher-enter-class';
     link.style.display='inline-flex';
     link.style.margin='14px 0';
     current.after(link);
   }
 };
 const observer=new MutationObserver(sync);
 observer.observe(title,{childList:true,characterData:true,subtree:true});
 picker.addEventListener('change',sync);
 sync();
})();
