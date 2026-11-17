/* GoStudy private access: shared authentication layer for protected classroom pages. */
(() => {
'use strict';
const endpoint='https://kawfqlohguwvmmplvrny.supabase.co';
const key='sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
const settingsEl=document.getElementById('private-access-config');
const login=document.getElementById('gostudyAccessForm');
const gate=document.getElementById('gostudyAccessGate');
const message=document.getElementById('gostudyAccessMessage');
const signout=document.getElementById('gostudyAccessSignout');
const config=settingsEl?JSON.parse(settingsEl.textContent):{};
const allowed=new Set(Array.isArray(config.allowedUserIds)?config.allowedUserIds:[]);
let client=null,user=null;
const status=t=>{if(message)message.textContent=t;};
const show=ok=>{
  document.body.classList.toggle('gostudy-authorized',ok);
  if(gate)gate.hidden=ok;
  if(signout)signout.hidden=!ok;
};
let resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve;});
window.GoStudyPrivateAccess={
  ready, client:()=>client, userId:()=>user?.id||null,
  getUser:()=>user,
  token:async()=>{const result=await client?.auth.getSession();return result?.data?.session?.access_token||null;}
};
async function verify(){
  if(!client)return false;
  try{
    const {data,error}=await client.auth.getUser();
    const current=data?.user;
    if(error||!current){
      user=null;show(false);status('Войдите по email и паролю.');
      return false;
    }
    if(allowed.size && !allowed.has(current.id)){
      user=null;show(false);status('У этого аккаунта нет доступа к данному кабинету.');
      return false;
    }
    user=current;show(true);status('');
    document.dispatchEvent(new CustomEvent('gostudy-private-authorized',{detail:{userId:user.id}}));
    return true;
  }catch(error){
    user=null;show(false);status('Ошибка проверки доступа. Проверьте подключение.');
    return false;
  }
}
async function init(){
  try{
    if(!window.supabase?.createClient)throw Error('SDK missing');
    client=window.supabase.createClient(endpoint,key,{
      auth:{storageKey:'gostudy-private-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });
    await verify();
  }catch(error){
    show(false);status('Авторизация временно недоступна. Обновите страницу.');
  }
  resolveReady(Boolean(user));
}
if(login)login.addEventListener('submit',async e=>{
  e.preventDefault();const button=login.querySelector('[type=submit]');
  if(!client)return;
  button.disabled=true;status('Проверяем email и пароль…');
  try{
    const {error}=await client.auth.signInWithPassword({email:login.elements.email.value.trim(),password:login.elements.password.value});
    if(error){show(false);status('Email или пароль указаны неверно.');return;}
    if(await verify())login.reset();
  }catch(err){status('Ошибка соединения. Попробуйте ещё раз.');}
  finally{button.disabled=false;}
});
if(signout)signout.addEventListener('click',async()=>{
  signout.disabled=true;
  try{await client?.auth.signOut();user=null;show(false);status('Вы вышли из кабинета.');}
  finally{signout.disabled=false;}
});
show(false);init();
})();