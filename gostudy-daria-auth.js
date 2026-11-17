/* GoStudy · Дарья: login UI only. Never place passwords or secret keys in public code. */
(function(){
  'use strict';
  const PROJECT_URL='https://kawfqlohguwvmmplvrny.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
  const DARIA_USER_ID='6af5764c-487a-448f-a21e-8744dc5a2322';
  const gate=document.getElementById('dariaAuthGate');
  const form=document.getElementById('dariaLogin');
  const status=document.getElementById('dariaAuthStatus');
  const logout=document.getElementById('dariaLogout');
  if(!gate||!form||!status){return;}
  const submit=form.querySelector('[type="submit"]');
  let client=null;
  function message(value){status.textContent=value;}
  function authorized(yes){
    document.body.classList.toggle('daria-authorized',yes);
    gate.hidden=!!yes;
    if(logout)logout.hidden=!yes;
  }
  try{
    if(!window.supabase || typeof window.supabase.createClient!=='function')throw Error('Library unavailable');
    client=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{
      auth:{storageKey:'gostudy-daria-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });
  }catch(error){
    message('Не удалось загрузить систему входа. Проверьте соединение с интернетом и обновите страницу.');
    submit.disabled=true;
    return;
  }
  async function check(){
    let result;
    try{result=await client.auth.getUser();}
    catch(error){authorized(false);message('Не удалось проверить вход. Проверьте интернет и повторите попытку.');return false;}
    const user=result && result.data && result.data.user;
    if(result.error||!user){authorized(false);message('Войдите, используя email и пароль Дарьи.');return false;}
    if(user.id!==DARIA_USER_ID){authorized(false);message('Эта учётная запись не имеет доступа к кабинету Дарьи.');return false;}
    authorized(true);
    message('');
    return true;
  }
  form.addEventListener('submit',async function(event){
    event.preventDefault();
    if(!client)return;
    const email=form.elements.email.value.trim(),password=form.elements.password.value;
    if(!email||!password){message('Укажите email и пароль.');return;}
    submit.disabled=true;message('Проверяем данные…');
    try{
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error){message('Неверный email или пароль.');authorized(false);}
      else {const ok=await check();if(ok)form.reset();}
    }catch(error){message('Ошибка соединения. Попробуйте ещё раз.');}
    finally{submit.disabled=false;}
  });
  if(logout){
    logout.addEventListener('click',async function(){
      logout.disabled=true;
      try{await client.auth.signOut();}
      finally{authorized(false);logout.disabled=false;message('Вы вышли из кабинета.');}
    });
  }
  authorized(false);
  message('Проверяем сессию…');
  check();
})();