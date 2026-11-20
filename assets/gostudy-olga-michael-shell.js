/* Scoped Olga Sweden A2 cosmetic adapter: never mutates original lesson state.
 * Original browser-only answers/words and all page navigation still run unmodified.
 * Real JaaS must only be enabled AFTER course-specific room membership + signed token.
 */
(()=>{
 'use strict';
 const body=document.body;
 if(!body.hasAttribute('data-olga-michael'))return;
 const isCabinet=body.dataset.olgaKind==='cabinet';
 const originalKeys=['gostudy-sweden-a2-v2','gostudy-sweden-a2-lesson02-v1',
   'gostudy-sweden-a2-homework01-v1','gostudy-sweden-a2-homework02-v1',
   'gostudy-student-profile-v1'];
 function exportSnapshot(){
   // Exact raw values; no normalization, no auth sessions or secrets.
   const values={};
   for(const key of originalKeys){
     const raw=localStorage.getItem(key);
     if(raw!==null)values[key]=raw;
   }
   const json=JSON.stringify({format:'gostudy-olga-sweden-raw-v1',
     exportedAt:new Date().toISOString(),origin:location.origin,values},null,2);
   const blob=new Blob([json],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.download='gostudy-sweden-existing-data.json';a.href=url;
   document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
 }
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2c0-4 3-7 8-7s8 3 8 7v2"/></svg>';
 const button=(text,action)=>{
   const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;
 };
 function makeExport(where){
   const bar=document.createElement('div');bar.className='olga-panels-actions';
   bar.append(button('Сохранить старые ответы и слова',exportSnapshot));
   where.append(bar);
 }
 if(isCabinet){
   const target=document.querySelector('main')||document.querySelector('.content-grid');
   if(!target)return;
   const intro=document.createElement('section');intro.className='olga-overview';
   const h=document.createElement('strong');h.textContent='Ваш кабинет · Sweden A2';
   const p=document.createElement('p');
   p.textContent='Два урока и две домашние работы сохранены. Перед переходом на новую систему сохраните существующие ответы и слова с этого устройства.';
   intro.append(h,p);makeExport(intro);
   target.prepend(intro);
   return;
 }
 const shell=document.querySelector('.shell'),main=shell?.querySelector(':scope > main');
 if(!shell||!main)return;
 const aside=document.createElement('aside');aside.className='olga-michael-side';
 aside.setAttribute('aria-label','Инструменты урока');
 const video=document.createElement('section');video.className='olga-panel';
 video.innerHTML='<div class="olga-panel-title">ВИДЕО УРОКА</div>'+
   '<div class="olga-video-tiles">'+
     '<div class="olga-video-tile">'+icon+'<span>Преподаватель</span></div>'+
     '<div class="olga-video-tile">'+icon+'<span>Ольга</span></div>'+
   '</div>';
 const status=document.createElement('p');status.className='olga-state';
 status.textContent='Встроенная видеосвязь пока не активирована: защищённая комната Ольги не создана.';
 video.append(status);
 aside.append(video);
 const tools=document.createElement('section');tools.className='olga-panel';
 const heading=document.createElement('div');heading.className='olga-panel-title';heading.textContent='ИНСТРУМЕНТЫ УРОКА';
 const content=document.createElement('div');content.className='olga-panel-copy';
 content.textContent='Словарь, перевод выделенного текста и исходные ответы сохранены в уроке. Навигация по заданиям остаётся доступна.';
 tools.append(heading,content);
 const actions=document.createElement('div');actions.className='olga-panels-actions';
 actions.append(button('Мой словарь',()=>document.getElementById('dictBtn')?.click()));
 if(!body.hasAttribute('data-olga-homework')){
   actions.append(button('Разделы урока',()=>document.getElementById('menuBtn')?.click()));
 }
 tools.append(actions);makeExport(tools);aside.append(tools);
 shell.insertBefore(aside,main);
 // Navigation, responses, audio, translation and the existing dictionary
 // remain owned by the original Sweden lesson code. This is UI only.
})();
