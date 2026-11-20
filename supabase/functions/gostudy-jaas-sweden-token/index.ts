// GoStudy Sweden A2 JaaS: signed video for an existing protected Sweden enrollment.
// No database mutations. Access verified by the existing course-destinations and teacher-view RPCs.
const ORIGIN = 'https://mylesson-room.github.io';
const headers = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
};
const respond = (status, data) => Response.json(data, { status, headers });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APP_ID = /^vpaas-magic-cookie-[A-Za-z0-9-]+$/;
const concat = (...parts) => {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
const lengthBytes = (value) => {
  if (value < 128) return Uint8Array.of(value);
  const bytes = [];
  while (value > 0) { bytes.unshift(value & 255); value >>>= 8; }
  return Uint8Array.of(128 + bytes.length, ...bytes);
};
const der = (tag, value) => concat(Uint8Array.of(tag), lengthBytes(value.length), value);
const toBytes = (pem) => {
  const base64 = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, '');
  return Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
};
const toBase64Url = (bytes) => {
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const encodeJson = (value) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
function toPkcs8(pem) {
  const key = toBytes(pem);
  if (/-----BEGIN PRIVATE KEY-----/.test(pem)) return key;
  if (!/-----BEGIN RSA PRIVATE KEY-----/.test(pem)) throw Error('Unsupported JaaS key format');
  // Wrap PEM PKCS#1 RSA private key in PKCS#8 PrivateKeyInfo for WebCrypto.
  const rsaAlgorithm = Uint8Array.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  return der(0x30, concat(Uint8Array.of(0x02, 0x01, 0x00), rsaAlgorithm, der(0x04, key)));
}
async function signJwt(claims, keyId, privatePem) {
  const key = await crypto.subtle.importKey(
    'pkcs8', toPkcs8(privatePem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const unsigned = encodeJson({ alg: 'RS256', typ: 'JWT', kid: keyId }) + '.' + encodeJson(claims);
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  return unsigned + '.' + toBase64Url(signature);
}
Deno.serve(async (request) => {
  if (request.headers.get('origin') && request.headers.get('origin') !== ORIGIN)
    return respond(403, { error: 'Недопустимый сайт.' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond(405, { error: 'Недопустимый запрос.' });
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer \S+$/.test(authorization)) return respond(401, { error: 'Войдите в GoStudy.' });
  const supabase = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  // Public JaaS identifiers for the pilot. Optional env vars override these.
  // The RSA PRIVATE key is the only required secret; never commit it.
  const appId = Deno.env.get('JAAS_APP_ID') || 'vpaas-magic-cookie-d7a5780b9ae54dacb95d85d7d4f4191f';
  const keyId = Deno.env.get('JAAS_KEY_ID') || 'vpaas-magic-cookie-d7a5780b9ae54dacb95d85d7d4f4191f/a34acd';
  const privatePem = (Deno.env.get('JAAS_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  if (!supabase || !key || !APP_ID.test(appId) || !keyId.startsWith(appId + '/') || !privatePem)
    return respond(503, { error: 'Видео ещё не настроено администратором.' });
  const input = await request.json().catch(() => null);
  const studentId = input?.studentId;
  if (studentId !== null && studentId !== undefined && (typeof studentId !== 'string' || !UUID.test(studentId)))
    return respond(400, { error: 'Неверная комната.' });
  const authHeaders = { apikey: key, Authorization: authorization };
  const lookup = async (path) => fetch(supabase + path, { headers: authHeaders, signal: AbortSignal.timeout(9000) });
  try {
    const auth = await lookup('/auth/v1/user');
    if (!auth.ok) return respond(401, { error: 'Сессия истекла. Войдите заново.' });
    const me = (await auth.json()).id;
    if (!UUID.test(me)) return respond(401, { error: 'Войдите в GoStudy.' });
    const target = studentId || me;
    // Both RPCs use auth.uid() to validate the caller. Student sessions
    // may enter only their own Sweden A2 course; a teacher supplying a
    // student UUID must appear in the authorized, course-scoped teacher view.
    const access = await fetch(supabase + (studentId
       ? '/rest/v1/rpc/gostudy_legacy_teacher_view'
       : '/rest/v1/rpc/gostudy_my_destinations'), {
      method:'POST',
      headers:{ ...authHeaders, 'Content-Type':'application/json' },
      body:studentId ? JSON.stringify({p_course:'sweden_a2'}) : '{}',
      signal:AbortSignal.timeout(9000),
    });
    if (!access.ok) return respond(403, { error:'Нет доступа к этому уроку.' });
    const rows = await access.json().catch(() => null);
    const permitted = Array.isArray(rows) && (studentId
      ? rows.some(row => row?.id === target)
      : rows.some(row => row?.course === 'sweden-a2'));
    if (!permitted) return respond(403, { error:'Видеокомната не назначена этому аккаунту.' });
    const role = studentId ? 'teacher' : 'student';
    const name = role === 'teacher' ? 'Преподаватель' : 'Ученик';
    // A stable, single course-scoped room is signed for exactly two participants.
    const roomName = 'gostudy-sweden-a2-' + target.replace(/-/g, '').toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({
      aud: 'jitsi', iss: 'chat', sub: appId, room: roomName, nbf: now - 15,
      exp: now + 2 * 60 * 60,
      context: {
        user: { id: me, name, moderator: role === 'teacher' ? 'true' : 'false' },
        features: { recording: false, livestreaming: false, transcription: false, 'outbound-call': false },
        room: { regex: false },
      },
    }, keyId, privatePem);
    return respond(200, { appId, room: roomName, jwt });
  } catch {
    return respond(503, { error: 'Не удалось запустить видео. Повторите попытку.' });
  }
});
