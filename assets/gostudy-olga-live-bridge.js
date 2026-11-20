/* Olga Sweden A2: isolated live classroom UI adapter.
 * NEVER overwrite original browser-only answers, words or local storage.
 * Course-specific room membership must be enforced by Supabase RLS/RPC first.
 * This adapter only sends live events if FinanceLive already confirmed its room.
 */
(()=>{
'use strict';
if(!document.body.hasAttribute('data-olga-michael') ||
   !document.body.hasAttribute('data-olga-jaas-video'))return;
const auth=()=>window.GoStudyFinanceAuth;
const live=()=>window.FinanceLive;
const studentMode=()=>Boolean(auth()?.userId()&&live()?.connected()&&!live()?.teacher());
const teacherMode=()=>Boolean(auth()?.userId()&&live()?.connected()&&live()?.teacher());
const stateKey=location.pathname.endsWith('sweden-a2-02.html')
  ? 'gostudy-sweden-a2-lesson02-v1' : 'gostudy-sweden-a2-v2';
const read=()=>{try{
 const state=JSON.parse(localStorage.getItem(stateKey)||'{}');
 return state&&typeof state==='object'?state:{};
}catch{return {};}};
const form=document.querySelector('#finance-chat-form');
const messages=document.querySelector('#finance-messages');
const status=document.querySelector('#finance-live-status');
let lastState=null,ready=false,remotePage=false;
let snapshot={answers:new Map(),words:new Map()};
const escapeKey=x=>String(x||'').slice(0,160);
function send(kind,payload){
 return live()?.connected()&&live()?.send(kind,payload);
}
function authorEvent(e){
 const detail=e.detail||{},payload=detail.payload||{};
 if(detail.kind==='chat' && typeof payload.text==='string'){
   const item=document.createElement('li');
   if(detail.own)item.className='chat-own';
   const span=document.createElement('span');span.textContent=payload.text;
   item.append(span);messages.append(item);messages.scrollTop=messages.scrollHeight;
 }
 if(detail.kind==='answer' && teacherMode() && typeof payload.key==='string'){
   snapshot.answers.set(escapeKey(payload.key),JSON.stringify(payload.value??''));
   renderTeacher();
 }
 if(detail.kind==='word' && teacherMode() && typeof payload.en==='string'){
   snapshot.words.set(payload.en.slice(0,100),String(payload.ru||'').slice(0,250));
   renderTeacher();
 }
 if(detail.kind==='page' && studentMode() && detail.teacher && Number.isInteger(payload.index)){
   const nav=document.querySelector('#nav [data-page="'+payload.index+'"]');
   if(nav){
     remotePage=true;
     nav.click();
     remotePage=false;
   }
 }
}
function renderTeacher(){
 let target=document.querySelector('#olga-live-answers');
 if(!target && teacherMode()){
   target=document.createElement('section');
   target.id='olga-live-answers';target.className='olga-panel';
   const title=document.createElement('h2');title.textContent='Ответы Ольги';
   target.append(title);
   const note=document.createElement('p');note.className='olga-panel-copy';
   note.textContent='Ответы и слова, полученные из защищённой комнаты урока';target.append(note);
   target.append(document.createElement('ol'));
   document.querySelector('.olga-michael-side')?.append(target);
 }
 const list=target?.querySelector('ol');if(!list)return;
 list.replaceChildren();
 for(const [key,value] of snapshot.answers){
   const li=document.createElement('li'),b=document.createElement('strong');
   b.textContent=key+': ';li.append(b,document.createTextNode(value.slice(0,500)));list.append(li);
 }
 for(const [en,ru] of snapshot.words){
   const li=document.createElement('li');li.textContent='+'+en+' — '+ru;list.append(li);
 }
}
function snapshotLive(){
 if(!studentMode())return;
 const state=read();
 if(!lastState)lastState={page:null,answers:{},words:[]};
 if(Number.isInteger(state.page) && state.page!==lastState.page){
   if(!remotePage)send('page',{index:state.page});
 }
 const current=state.answers&&typeof state.answers==='object'?state.answers:{};
 for(const [key,value] of Object.entries(current)){
   if(!Object.hasOwn(lastState.answers,key) ||
       JSON.stringify(lastState.answers[key])!==JSON.stringify(value)){
     send('answer',{key:escapeKey(key),value,page:Number.isInteger(state.page)?state.page:0});
   }
 }
 const oldWords=new Set((lastState.words||[]).map(w=>String(w?.en||'').trim().toLowerCase()));
 for(const word of Array.isArray(state.words)?state.words:[]){
   if(typeof word?.en==='string'&&typeof word.ru==='string'&&word.en.trim()&&word.ru.trim()
       &&!oldWords.has(word.en.trim().toLowerCase())){
     send('word',{en:word.en.trim().slice(0,150),ru:word.ru.trim().slice(0,300)});
   }
 }
 lastState={page:state.page,answers:JSON.parse(JSON.stringify(current)),
   words:Array.isArray(state.words)?state.words.map(w=>({...w})):[]};
}
document.addEventListener('finance-event',authorEvent);
document.addEventListener('finance-ready',()=>{
 ready=true;
 if(form)for(const control of form.querySelectorAll('input,button'))control.disabled=false;
 const login=document.querySelector('.finance-login');if(login)login.hidden=true;
 if(teacherMode())renderTeacher();else snapshotLive();
});
form?.addEventListener('submit',event=>{
 event.preventDefault();if(!ready||!live()?.connected())return;
 const input=form.querySelector('input');
 const text=input?.value.trim();if(!text)return;
 if(send('chat',{text,sentAt:new Date().toISOString()}))input.value='';
});
document.querySelector('#lessonMenu')?.addEventListener('click',event=>{
 const nav=event.target.closest('[data-page]');if(!nav||!teacherMode())return;
 const index=Number(nav.dataset.page);
 if(Number.isInteger(index))send('page',{index});
});
window.addEventListener('pagehide',()=>{ready=false;});
setInterval(()=>{if(ready && studentMode())snapshotLive();},1100);
})();
