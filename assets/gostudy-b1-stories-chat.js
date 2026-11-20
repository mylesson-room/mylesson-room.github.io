/* Private B1 Stories mini-chat. Authenticated teacher/student only. */
(() => {
  'use strict';
  const auth=window.GoStudyB1VideoAuth;
  const sidebar=document.querySelector('body[data-dud-b1-premium] .room > .side');
  if(!sidebar || !auth?.token || sidebar.querySelector('.b1-chat-dropdown'))return;
  const base='https://kawfqlohguwvmmplvrny.supabase.co';
  const apiKey='sb_publishable_aAZxKwYpLcIXAjCiN5lBSg_qdFxvYwL';
  const endpoint=base+'/functions/v1/gostudy-b1-stories-chat';
  const chat=document.createElement('details');
  chat.className='b1-chat-dropdown';
  chat.innerHTML=`
    <summary class="b1-chat-toggle">
      <span class="b1-chat-icon" aria-hidden="true">💬</span>
      <span>Чат урока</span><span class="b1-chat-spacer"></span>
      <span class="b1-chat-unread" hidden></span>
      <svg class="b1-chat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="b1-chat-content">
      <div class="b1-chat-messages" role="log" aria-label="Сообщения урока" aria-live="polite"></div>
      <p class="b1-chat-status" role="status" aria-live="polite"></p>
      <form class="b1-chat-form">
        <input type="text" name="message" aria-label="Сообщение" placeholder="Сообщение" maxlength="1000" autocomplete="off" required>
        <button type="submit" aria-label="Отправить сообщение">➤</button>
      </form>
    </div>`;
  const video=sidebar.querySelector('#lessonVideo') || sidebar.querySelector('.panel');
  if(video)video.after(chat);else sidebar.prepend(chat);
  const messages=chat.querySelector('.b1-chat-messages');
  const status=chat.querySelector('.b1-chat-status');
  const form=chat.querySelector('.b1-chat-form');
  const input=form.querySelector('input');
  const submit=form.querySelector('button');
  const badge=chat.querySelector('.b1-chat-unread');
  const known=new Set();
  let primed=false,fetching=false,sending=false,unread=0;
  const updateBadge=()=>{
    badge.hidden=unread===0;
    badge.textContent=unread>99?'99+':String(unread);
    badge.setAttribute('aria-label','Новых сообщений: '+unread);
  };
  async function api(action,text){
    const token=await auth.token();
    const response=await fetch(endpoint,{
      method:'POST',cache:'no-store',
      headers:{apikey:apiKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({action,studentId:auth.classroomStudent||null,...(text?{text}:{})}),
      signal:AbortSignal.timeout(12000)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Сообщение не отправлено.');
    return data;
  }
  const formatTime=at=>{
    const time=new Date(at);
    return Number.isNaN(time.getTime())?'':new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(time);
  };
  function render(entries){
    const wasNearEnd=messages.scrollHeight-messages.scrollTop-messages.clientHeight<85;
    messages.replaceChildren();
    for(const item of entries){
      if(typeof item?.text!=='string')continue;
      const bubble=document.createElement('div');
      bubble.className='b1-chat-bubble'+(item.actor===auth.userId()?' b1-chat-own':'');
      const text=document.createElement('span');text.textContent=item.text;
      const timestamp=document.createElement('time');
      timestamp.textContent=formatTime(item.at);
      if(item.at)timestamp.dateTime=item.at;
      bubble.append(text,timestamp);messages.append(bubble);
    }
    if(chat.open&&(wasNearEnd||!primed))messages.scrollTop=messages.scrollHeight;
  }
  async function poll(){
    if(fetching || document.hidden)return;
    fetching=true;
    try{
      const data=await api('list');
      const entries=Array.isArray(data.messages)?data.messages:[];
      for(const item of entries){
        if(!item?.id || known.has(item.id))continue;
        if(primed && !chat.open && item.actor!==auth.userId())unread++;
        known.add(item.id);
      }
      primed=true;
      chat.dataset.loaded='true';
      if(chat.open){unread=0;updateBadge();}
      else updateBadge();
      render(entries);
      status.textContent='';
    }catch(error){status.textContent=error.message||'Нет связи с чатом.';}
    finally{fetching=false;}
  }
  chat.addEventListener('toggle',()=>{
    if(chat.open){unread=0;updateBadge();poll();}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(sending)return;
    const value=input.value.trim();
    if(!value)return;
    sending=true;submit.disabled=true;status.textContent='Отправляем…';
    try{
      await api('send',value);
      input.value='';
      status.textContent='';
      await poll();
      input.focus();
    }catch(error){status.textContent=error.message||'Не удалось отправить сообщение.';}
    finally{sending=false;submit.disabled=false;}
  });
  const timer=setInterval(poll,3000);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
  poll();
})();
