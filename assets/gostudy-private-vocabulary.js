/* Shared GoStudy vocabulary bridge: merges legacy local words and student-owned Supabase words. */
(() => {
'use strict';
const auth=window.GoStudyPrivateAccess;
const key=document.body.dataset.vocabularyKey||'gostudy-ielts-reading-01-v1';
const owner=document.body.dataset.vocabularyOwner;
if(!auth||!owner)return;
let initialized=false,busy=false,refreshing=false,uploadTimer=null;
const liveVocabulary=document.body.hasAttribute('data-vocabulary-live');
const norm=s=>String(s||'').trim().toLocaleLowerCase('en');
const read=()=>{try{const record=JSON.parse(localStorage.getItem(key)||'{}')||{};return record;}catch{return {};}};
const list=()=>{const record=read();return Array.isArray(record.words)?record.words.filter(w=>w&&typeof w.en==='string'&&w.en.trim()):[];};
const clean=word=>({en:String(word?.en||'').trim().slice(0,150),ru:String(word?.ru||'').trim().slice(0,500)});
const notify=()=>{
 document.dispatchEvent(new Event('gostudy-vocabulary-sync'));
 if(document.body.hasAttribute('data-vocabulary-live'))document.dispatchEvent(new Event('b1-vocabulary-updated'));
 try{if(typeof updateVocabularyCount==='function')updateVocabularyCount();}catch(e){}
};
function merge(remote){
 const local=list(),combined=new Map();
 for(const item of remote||[]){const w=clean({en:item.english,ru:item.russian});if(w.en)combined.set(norm(w.en),w);}
 for(const value of local){const w=clean(value),id=norm(w.en);if(!id)continue;
 const existing=combined.get(id);
 if(!existing||(!liveVocabulary&&w.ru.length>=existing.ru.length))combined.set(id,w);}
 const next=[...combined.values()],old=local.map(clean);
 const changed=JSON.stringify(next)!==JSON.stringify(old);
 if(changed){
  const record=read();record.words=next;
  try{localStorage.setItem(key,JSON.stringify(record));}catch(error){}
  notify();
 }
 return next;
}
async function push(){
 if(busy||auth.userId()!==owner)return;
 busy=true;
 try{
  const words=list().map(clean).filter(w=>w.en).map(w=>({user_id:owner,word_key:norm(w.en),english:w.en,russian:w.ru}));
  if(!words.length)return;
  const result=await auth.request('/rest/v1/gostudy_vocabulary_items?on_conflict=user_id,word_key',{
   method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:words
  });
  if(!result.ok)throw Error('Vocabulary sync '+result.status);
 }catch(error){console.warn('GoStudy vocabulary stored locally; cloud retry on next login:',error.message);}
 finally{busy=false;}
}
function schedule(){
 clearTimeout(uploadTimer);
 uploadTimer=setTimeout(push,700);
}
async function refresh(){
 if(!auth.userId()||refreshing||busy)return;
 refreshing=true;
 try{
  const result=await auth.request('/rest/v1/gostudy_vocabulary_items?select=word_key,english,russian&user_id=eq.'+encodeURIComponent(owner)+'&order=updated_at.desc');
  if(result.ok)merge(result.data||[]);
 }finally{refreshing=false;}
}
async function open(){
 if(initialized||!auth.userId())return;initialized=true;
 try{
  const query='/rest/v1/gostudy_vocabulary_items?select=word_key,english,russian&user_id=eq.'+encodeURIComponent(owner)+'&order=updated_at.desc';
  const result=await auth.request(query);
  if(!result.ok)throw Error('Vocabulary read '+result.status);
  merge(result.data||[]);
  if(auth.userId()===owner)schedule();
 }catch(error){console.warn('Vocabulary cloud unavailable, retaining local data:',error.message);}
}
window.GoStudyPrivateVocabulary = {
 async remove(word) {
  if (auth.userId()!==owner) throw Error('Откройте свой словарь, чтобы удалить слово.');
  window.GoStudyWordActions.hide(word,key,localStorage);
  notify();
 }
};
document.addEventListener('gostudy-private-authorized',open);
document.addEventListener('gostudy-vocabulary-updated',()=>{notify();schedule();});
window.addEventListener('storage',event=>{if(event.key===key)notify();});
auth.ready.then(ok=>{if(ok)open();});
if(document.body.hasAttribute('data-vocabulary-live')){
 setInterval(()=>{if(initialized&&!document.hidden)refresh().catch(()=>{});},4000);
 window.addEventListener('online',()=>refresh().catch(()=>{}));
}
})();