const origin = 'https://mylesson-room.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const courses = new Set(['travel_a2','finance_b1','feed_b2','first_sales','pharma_c1','tiktok_a2']);
const respond = (status, body) => Response.json(body,{status,headers:cors});
Deno.serve(async req => {
  if (req.headers.get('origin') && req.headers.get('origin') !== origin) return respond(403,{error:'Недопустимый сайт.'});
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  if (req.method !== 'POST') return respond(405,{error:'Недопустимый запрос.'});
  const jwt = req.headers.get('authorization');
  if (!jwt?.startsWith('Bearer ')) return respond(401,{error:'Войдите в GoStudy.'});
  const url = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publicKey || !serviceKey) return respond(503,{error:'Создание аккаунтов временно недоступно.'});
  const call = (path, key, authorization, data) => fetch(url+path,{
    method:data===undefined?'GET':'POST',signal:AbortSignal.timeout(8000),
    headers:{apikey:key,authorization,'Content-Type':'application/json'},
    body:data===undefined?undefined:JSON.stringify(data)
  });
  try {
    const auth = await call('/auth/v1/user',publicKey,jwt);
    if (!auth.ok) return respond(401,{error:'Войдите в GoStudy снова.'});
    const teacher = (await auth.json()).id;
    const permission = await call('/rest/v1/rpc/gostudy_my_destinations',publicKey,jwt,{});
    if (!permission.ok) return respond(503,{error:'Не удалось проверить доступ преподавателя.'});
    const routes = await permission.json();
    if (!Array.isArray(routes) || !routes.some(row=>row.course==='teacher')) return respond(403,{error:'Действие доступно преподавателю.'});
    const body = await req.json().catch(()=>null);
    const email = typeof body?.email==='string'?body.email.trim().toLowerCase():'';
    const password = body?.password;
    const course = body?.course;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||
        typeof password!=='string'||password.length<10||new TextEncoder().encode(password).length>72||
        !courses.has(course)) return respond(400,{error:'Проверьте почту, курс и пароль (от 10 символов, до 72 байт).'});
    const serviceAuth = 'Bearer '+serviceKey;
    const provision = async enroll => {
      const r = await call('/rest/v1/rpc/gostudy_provision_student',serviceKey,serviceAuth,
        {p_teacher:teacher,p_email:email,p_course:course,p_enroll:enroll});
      if (!r.ok) throw new Error('Enrollment unavailable');
      return r.json();
    };
    if (!(await provision(false))) {
      const create = await call('/auth/v1/admin/users',serviceKey,serviceAuth,
        {email,password,email_confirm:true,app_metadata:{gostudy_created_by:teacher}});
      if (!create.ok && !(await provision(false))) {
        const data = await create.json().catch(()=>({}));
        const code = data.error_code || data.code;
        if (code==='email_exists'||code==='user_already_exists') return respond(409,{error:'Аккаунт с этой почтой уже существует.'});
        if (code==='weak_password') return respond(400,{error:'Выберите более надёжный пароль.'});
        return respond(503,{error:'Не удалось создать аккаунт. Попробуйте ещё раз.'});
      }
    }
    if (!(await provision(true))) return respond(503,{error:'Не удалось назначить курс. Повторите запрос с той же почтой.'});
    return respond(200,{ok:true});
  } catch {
    return respond(503,{error:'Не удалось завершить операцию. Повторите запрос с той же почтой.'});
  }
});