/* GoStudy: reusable private-page authentication and Supabase REST access.
   Uses the same GoStudy session keys as the existing shared authentication. */
(() => {
'use strict';
const project='https://kawfqlohguwvmmplvrny.supabase.co';
const publishableKey='sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
const sessionKey='gostudy-cloud-session-v1';
const studentKey='gostudy-student-session-v1';
const teacherKey='gostudy-teacher-session-v1';
const configNode=document.getElementById('private-access-config');
const config=configNode?JSON.parse(configNode.textContent):{};
const allowed=new Set(Array.isArray(config.allowedUserIds)?config.allowedUserIds:[]);
const gate=document.getElementById('gostudyAccessGate');
const form=document.getElementById('gostudyAccessForm');
const message=document.getElementById('gostudyAccessMessage');
const logout=document.getElementById('gostudyAccessSignout');
let session=null,user=null,rememberedKey=null,refreshInFlight=null;
let readyResolve;
const ready=new Promise(resolve=>{readyResolve=resolve;});
const text=s=>{if(message)message.textContent=s;};
const show=ok=>{
 document.body.classList.toggle('gostudy-authorized',!!ok);
 if(gate)gate.hidden=!!ok;
 if(logout)logout.hidden=!ok;
};
function json(raw){try{return JSON.parse(raw||'null');}catch{return null;}}
function getStored(){
 const list=[
  ['session',json(sessionStorage.getItem(sessionKey))],
  [studentKey,json(localStorage.getItem(studentKey))],
  [teacherKey,json(localStorage.getItem(teacherKey))]
 ];
 for(const [key,value] of list)if(value?.access_token&&value?.user?.id){rememberedKey=key==='session'?null:key;return value;}
 return null;
}
function remember(data,persist=false){
 session={...data,expires_at:typeof data.expires_at==='number'&&data.expires_at>1e12?data.expires_at:Date.now()+(data.expires_in||3600)*1000};
 sessionStorage.setItem(sessionKey,JSON.stringify(session));
 if(persist)localStorage.setItem(rememberedKey||studentKey,JSON.stringify(session));
}
function clearSession(){
 const uid=session?.user?.id;
 session=null;user=null;sessionStorage.removeItem(sessionKey);
 for(const k of [studentKey,teacherKey]){const v=json(localStorage.getItem(k));if(v?.user?.id===uid)localStorage.removeItem(k);}
}
async function raw(path,opts={},bearer){
 const headers={apikey:publishableKey,...(bearer?{Authorization:'Bearer '+bearer}:{}),...(opts.body!==undefined?{'Content-Type':'application/json'}:{}),...(opts.headers||{})};
 const response=await fetch(project+path,{method:opts.method||'GET',headers,body:opts.body!==undefined?JSON.stringify(opts.body):undefined,signal:AbortSignal.timeout(14000)});
 const data=response.status===204?null:await response.json().catch(()=>null);
 return {ok:response.ok,status:response.status,data};
}
async function token(){
 if(!session)throw Error('Войдите в GoStudy.');
 if(Number(session.expires_at)>Date.now()+40000)return session.access_token;
 if(refreshInFlight)return refreshInFlight;
 refreshInFlight=(async()=>{
  const r=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
  if(!r.ok||!r.data?.access_token){clearSession();throw Error('Войдите заново.');}
  remember(r.data,!!rememberedKey);return session.access_token;
 })().finally(()=>{refreshInFlight=null;});
 return refreshInFlight;
}
async function request(path,options={}){
 const access=await token();
 return raw(path,options,access);
}
async function verify(){
 try{
  const r=await request('/auth/v1/user');
  const u=r.ok?r.data:null;
  if(!u?.id){user=null;show(false);text('Войдите по email и паролю.');return false;}
  if(allowed.size&&!allowed.has(u.id)){user=null;show(false);text('У этого аккаунта нет доступа к данному кабинету.');return false;}
  user=u;show(true);text('');
  document.dispatchEvent(new CustomEvent('gostudy-private-authorized',{detail:{userId:u.id}}));
  return true;
 }catch(error){user=null;show(false);text('Войдите по email и паролю.');return false;}
}
const api=window.GoStudyPrivateAccess={
 ready,userId:()=>user?.id||null,token,request,getUser:()=>user
};
form?.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('[type=submit]');button.disabled=true;text('Проверяем данные…');
 try{
  const result=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email:form.elements.email.value.trim(),password:form.elements.password.value}});
  if(!result.ok||!result.data?.access_token){show(false);text('Неверный email или пароль.');return;}
  remember(result.data,false);
  if(await verify())form.reset();
 }catch(e){text('Не удалось подключиться к системе входа.');}
 finally{button.disabled=false;}
});
logout?.addEventListener('click',async()=>{
 logout.disabled=true;
 try{await request('/auth/v1/logout',{method:'POST'}).catch(()=>{});}
 finally{clearSession();show(false);text('Вы вышли из кабинета.');logout.disabled=false;}
});
show(false);
session=getStored();
verify().then(value=>readyResolve(value)).catch(()=>readyResolve(false));
})();