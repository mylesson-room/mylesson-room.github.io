// Isolated B1 Stories course chat pilot: no new tables, no mutations to
// lesson answers/homework. Access is verified by the existing protected RPC.
// Messages use a dedicated progress namespace with optimistic concurrency.
const ORIGIN = 'https://mylesson-room.github.io';
const KEY = 'gostudy-b1-stories-chat-v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers':'authorization,apikey,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
  'Vary':'Origin',
};
const respond = (status, data) => Response.json(data,{status,headers});
Deno.serve(async request => {
  if (request.headers.get('origin') && request.headers.get('origin') !== ORIGIN)
    return respond(403,{error:'Недопустимый сайт.'});
  if (request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if (request.method!=='POST')return respond(405,{error:'Недопустимый запрос.'});
  const bearer=request.headers.get('authorization')||'';
  if(!/^Bearer \S+$/.test(bearer))return respond(401,{error:'Войдите в GoStudy.'});
  if(Number(request.headers.get('content-length')||0)>8192)
    return respond(413,{error:'Сообщение слишком длинное.'});
  const base=Deno.env.get('SUPABASE_URL');
  const anon=Deno.env.get('SUPABASE_ANON_KEY');
  const admin=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!anon||!admin)return respond(503,{error:'Чат временно недоступен.'});
  const input=await request.json().catch(()=>null);
  const action=input?.action, studentId=input?.studentId??null;
  if(!['list','send'].includes(action) ||
     (studentId!==null && (typeof studentId!=='string'||!UUID.test(studentId))))
    return respond(400,{error:'Некорректный запрос.'});
  const text=typeof input?.text==='string'?input.text.trim():'';
  if(action==='send'&&(!text||text.length>1000))return respond(400,{error:'Сообщение должно содержать от 1 до 1000 символов.'});
  const personal={apikey:anon,Authorization:bearer};
  const privileged={apikey:admin,Authorization:'Bearer '+admin,'Content-Type':'application/json'};
  try{
    const auth=await fetch(base+'/auth/v1/user',{headers:personal,signal:AbortSignal.timeout(9000)});
    if(!auth.ok)return respond(401,{error:'Сессия истекла. Войдите заново.'});
    const me=(await auth.json()).id;
    if(!UUID.test(me))return respond(401,{error:'Войдите в GoStudy.'});
    const target=studentId||me;
    const membership=await fetch(base+'/rest/v1/rpc/gostudy_b1_stories_content',{
      method:'POST',headers:{...personal,'Content-Type':'application/json'},
      body:JSON.stringify({p_homework:false,p_student:studentId}),
      signal:AbortSignal.timeout(9000),
    });
    if(!membership.ok)return respond(403,{error:'Нет доступа к этому уроку.'});
    const lesson=await membership.json().catch(()=>null);
    if(!lesson||lesson.key!=='gostudy-general-english-b1-stories-01-v1')
      return respond(403,{error:'Чат не назначен этому аккаунту.'});
    const filter=new URLSearchParams({
      user_id:'eq.'+target,lesson_key:'eq.'+KEY
    }).toString();
    const url=base+'/rest/v1/gostudy_progress?'+filter;
    const read=async()=>{
      const res=await fetch(url+'&select=state,revision',{headers:privileged,signal:AbortSignal.timeout(9000)});
      if(!res.ok)throw Error('read');
      const rows=await res.json();
      return Array.isArray(rows)?(rows[0]||null):null;
    };
    if(action==='list'){
      const row=await read();
      const messages=Array.isArray(row?.state?.messages)?row.state.messages:[];
      return respond(200,{messages:messages.slice(-140),revision:row?.revision||0});
    }
    // Retry compare-and-swap, so simultaneous teacher/student messages
    // cannot overwrite each other or any unrelated progress record.
    const entry={id:crypto.randomUUID(),actor:me,text,at:new Date().toISOString()};
    for(let attempt=0;attempt<6;attempt++){
      const row=await read();
      const before=Array.isArray(row?.state?.messages)?row.state.messages:[];
      const state={messages:[...before,entry].slice(-140)};
      const revision=Number(row?.revision||0);
      let res;
      if(!row){
        res=await fetch(base+'/rest/v1/gostudy_progress',{
          method:'POST',
          headers:{...privileged,Prefer:'return=representation'},
          body:JSON.stringify({user_id:target,lesson_key:KEY,revision:1,state}),
          signal:AbortSignal.timeout(9000),
        });
      }else{
        const lock=new URLSearchParams({
          user_id:'eq.'+target,lesson_key:'eq.'+KEY,revision:'eq.'+revision
        });
        res=await fetch(base+'/rest/v1/gostudy_progress?'+lock,{
          method:'PATCH',
          headers:{...privileged,Prefer:'return=representation'},
          body:JSON.stringify({revision:revision+1,state}),
          signal:AbortSignal.timeout(9000),
        });
      }
      if(res.ok){
        const rows=await res.json().catch(()=>[]);
        if(Array.isArray(rows)&&rows.length){
          return respond(200,{message:entry,revision:revision+1});
        }
      }else if(![409,412].includes(res.status)){
        throw Error('write');
      }
    }
    return respond(409,{error:'Сообщение не сохранилось. Повторите отправку.'});
  }catch{
    return respond(503,{error:'Не удалось связаться с чатом. Попробуйте ещё раз.'});
  }
});
