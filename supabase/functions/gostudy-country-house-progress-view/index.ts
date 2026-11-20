// Protected, read-only view of newly assigned A2+ progress for the teacher.
// Existing course access RPC is the authorization source; no SQL migrations.
const ORIGIN='https://mylesson-room.github.io';
const headers={
  'Access-Control-Allow-Origin':ORIGIN,
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type',
  'Cache-Control':'no-store','Vary':'Origin'
};
const response=(status,value)=>Response.json(value,{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowed=new Set(['gostudy-country-house-travel-a2-05-v1','gostudy-country-house-travel-a2-05-homework-v1']);
Deno.serve(async request=>{
 if(request.headers.get('origin') && request.headers.get('origin')!==ORIGIN)
   return response(403,{error:'Недопустимый сайт.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return response(405,{error:'Недопустимый запрос.'});
 const authorization=request.headers.get('authorization')||'';
 if(!/^Bearer \S+$/.test(authorization))return response(401,{error:'Войдите в GoStudy.'});
 if(Number(request.headers.get('content-length')||0)>2048)return response(413,{error:'Некорректный запрос.'});
 const input=await request.json().catch(()=>null);
 const studentId=input?.studentId,lessonKey=input?.lessonKey;
 if(typeof studentId!=='string'||!uuid.test(studentId)||!allowed.has(lessonKey))
   return response(400,{error:'Неверный ученик или урок.'});
 const base=Deno.env.get('SUPABASE_URL');
 const anon=Deno.env.get('SUPABASE_ANON_KEY');
 const admin=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!anon||!admin)return response(503,{error:'История ответов временно недоступна.'});
 const authHeaders={apikey:anon,Authorization:authorization};
 try {
   const me=await fetch(base+'/auth/v1/user',{headers:authHeaders,signal:AbortSignal.timeout(9000)});
   if(!me.ok)return response(401,{error:'Сессия истекла.'});
   const user=await me.json();
   if(!uuid.test(user.id))return response(401,{error:'Войдите в GoStudy.'});
   // The RPC checks auth.uid() = the teacher assigned to this specific course.
   const view=await fetch(base+'/rest/v1/rpc/gostudy_country_house_teacher_view',{
     method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},
     body:'{}',signal:AbortSignal.timeout(9000)
   });
   if(!view.ok)return response(403,{error:'Нет доступа к ответам ученика.'});
   const roster=await view.json().catch(()=>[]);
   if(!Array.isArray(roster)||!roster.some(row=>row?.id===studentId))
     return response(403,{error:'Ученик не назначен этому преподавателю.'});
   const filter=new URLSearchParams({select:'state,revision',user_id:'eq.'+studentId,lesson_key:'eq.'+lessonKey});
   const progress=await fetch(base+'/rest/v1/gostudy_progress?'+filter,{
     headers:{apikey:admin,Authorization:'Bearer '+admin},
     signal:AbortSignal.timeout(9000)
   });
   if(!progress.ok)return response(503,{error:'Не удалось получить ответы.'});
   const rows=await progress.json();
   const record=Array.isArray(rows)?rows[0]:null;
   const answers=record?.state?.answers;
   return response(200,{answers:answers && typeof answers==='object' && !Array.isArray(answers) ? answers : {},revision:record?.revision||0});
 }catch{return response(503,{error:'Не удалось связаться с историей ответов.'});}
});
