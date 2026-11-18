// Synthetic integration tests for the JaaS token issuer. No Supabase data is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto, generateKeyPairSync, verify } = require('node:crypto');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const teacher = '11111111-1111-4111-8111-111111111111';
const student = '22222222-2222-4222-8222-222222222222';
const stranger = '33333333-3333-4333-8333-333333333333';
const appId = 'vpaas-magic-cookie-test';
const secret = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'public-test-key',
  JAAS_APP_ID: appId,
  JAAS_KEY_ID: appId + '/test',
  JAAS_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }),
};
const code = fs.readFileSync('supabase/functions/gostudy-jaas-token/index.ts', 'utf8');
const members = { 'user-teacher': teacher, 'user-student': student, 'user-stranger': stranger };
function handlerFor(env = secret) {
  let handler;
  const fetchMock = async (rawUrl, options) => {
    const url = new URL(rawUrl);
    const access = options.headers.Authorization.replace(/^Bearer /, '');
    const user = members[access];
    if (url.pathname.endsWith('/auth/v1/user')) {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      return Response.json({ id: user });
    }
    if (url.pathname.endsWith('/rest/v1/gostudy_finance_room')) {
      const target = url.searchParams.get('student_id')?.replace(/^eq\./, '');
      const visible = target === student && (user === student || user === teacher);
      return Response.json(visible ? [{ teacher_id: teacher, student_id: student }] : []);
    }
    throw Error('Unexpected external request: ' + url.pathname);
  };
  vm.runInNewContext(code, {
    Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
    crypto: webcrypto, TextEncoder, Uint8Array, Response, URLSearchParams,
    AbortSignal, atob, btoa, Date, fetch: fetchMock,
  }, { filename: 'gostudy-jaas-token/index.ts' });
  return handler;
}
function requestFor(user, body = { studentId: null }, origin = 'https://mylesson-room.github.io') {
  return new Request('https://example.supabase.co/functions/v1/gostudy-jaas-token', {
    method: 'POST',
    headers: { Origin: origin, ...(user ? { Authorization: 'Bearer ' + user } : {}) },
    body: JSON.stringify(body),
  });
}
const unpack = token => {
  const [header, payload, signature] = token.split('.');
  const message = header + '.' + payload;
  assert.equal(verify('sha256', Buffer.from(message), publicKey, Buffer.from(signature, 'base64url')), true);
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    claims: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
  };
};
(async () => {
  const handler = handlerFor();
  let response = await handler(requestFor(null));
  assert.equal(response.status, 401);
  response = await handler(requestFor('user-teacher', { studentId: student }, 'https://evil.invalid'));
  assert.equal(response.status, 403);
  response = await handler(requestFor('user-stranger', { studentId: student }));
  assert.equal(response.status, 403);
  response = await handler(requestFor('user-teacher', { studentId: stranger }));
  assert.equal(response.status, 403);
  response = await handler(requestFor('user-student', { studentId: stranger }));
  assert.equal(response.status, 403);
  response = await handler(requestFor('user-teacher', { studentId: 'not-a-uuid' }));
  assert.equal(response.status, 400);
  response = await handler(requestFor('user-teacher', { studentId: null }));
  assert.equal(response.status, 403); // teacher must select the student
  const tResponse = await handler(requestFor('user-teacher', { studentId: student }));
  assert.equal(tResponse.status, 200);
  const t = await tResponse.json();
  const tokenTeacher = unpack(t.jwt);
  assert.equal(t.appId, appId);
  assert.equal(tokenTeacher.header.kid, appId + '/test');
  assert.equal(tokenTeacher.claims.room, t.room);
  assert.equal(tokenTeacher.claims.context.user.moderator, 'true');
  assert.equal(tokenTeacher.claims.context.features.recording, false);
  assert.equal(tokenTeacher.claims.exp - tokenTeacher.claims.nbf <= 7215, true);
  const sResponse = await handler(requestFor('user-student'));
  assert.equal(sResponse.status, 200);
  const s = await sResponse.json();
  assert.equal(s.room, t.room);
  assert.equal(unpack(s.jwt).claims.context.user.moderator, 'false');
  // JaaS-generated legacy PEM format is PKCS#1; signing must work with it too.
  const rsaHandler = handlerFor({ ...secret,
    JAAS_PRIVATE_KEY: privateKey.export({ type: 'pkcs1', format: 'pem' }) });
  assert.equal((await rsaHandler(requestFor('user-student'))).status, 200);
  assert.equal((await handlerFor({ ...secret, JAAS_PRIVATE_KEY: '' })(requestFor('user-student'))).status, 503);
  const html = fs.readFileSync('business-ai-finance-b2-02.html', 'utf8');
  assert.match(html, /data-jaas-video-pilot/);
  assert.match(html, /gostudy-jaas-video\.js/);
  assert.doesNotMatch(html, /JAAS_PRIVATE_KEY|-----BEGIN PRIVATE KEY-----/);
  const front = fs.readFileSync('assets/gostudy-jaas-video.js', 'utf8');
  assert.match(front, /FinanceLive\?\.connected\(\)/);
  assert.doesNotMatch(front, /JAAS_PRIVATE_KEY|service_role/);
  console.log('JaaS pilot: authorized teacher/student share room; denial, RS256, PKCS1/PKCS8, UI guards PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
