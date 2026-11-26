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
  // Video must remain clickable even if classroom chat/live polling is delayed.
  assert.doesNotMatch(front, /FinanceLive\\?\\.connected\\(\\)/);
  assert.doesNotMatch(front, /JAAS_PRIVATE_KEY|service_role/);
  // Regression: formerly a delayed/missing chat handshake disabled the video
  // button forever. Test actual browser-adapter callbacks with synthetic DOM.
  async function simulateVideo({ user, selected = null, rooms = [], includeAuth = true, mobile = false }) {
    const events = {};
    const controls = [];
    const calls = [];
    let joined;
    let starts = 0;
    let disposed = 0;
    const styleClasses = () => { const values = new Set(); return {
      add(...names) { names.forEach(name => values.add(name)); },
      remove(...names) { names.forEach(name => values.delete(name)); },
      toggle(name, enabled) { if (enabled) values.add(name); else values.delete(name); },
      contains(name) { return values.has(name); },
    }; };
    const element = () => ({ 
      textContent: '', disabled: false, hidden: false, classList: styleClasses(), setAttribute() {}, remove() {}, 
      addEventListener(name, callback) { this.listeners ??= {}; this.listeners[name] = callback; },
      after() {}, append(...children) { controls.push(...children); }, replaceChildren(...children) { controls.push(...children); }, prepend(...children) { controls.push(...children); },
    });
    const workspace = element();
    const placeholder = element();
    const actions = element();
    const state = element();
    workspace.querySelector = selector => ({
      '.video-preview': placeholder,
      '.video-actions': actions,
      '.video-state': state,
    }[selector] || null);
    const documentStub = {
      body: { hasAttribute: name => name === 'data-jaas-video-pilot', classList: styleClasses() },
      head: { append(script) { script.onload(); } },
      querySelector: selector => ({
        '#lessonVideo .video-workspace': workspace,
        '#lessonVideo .video-preview': placeholder,
        '#lessonVideo .video-actions': actions,
        '#lessonVideo .video-state': state,
      }[selector] || null),
      createElement: () => element(),
      addEventListener(name, callback) { events[name] = callback; },
    };
    const auth = includeAuth ? {
      userId: () => user,
      classroomStudent: selected,
      token: async () => 'synthetic-user-token',
      request: async path => {
        calls.push({ kind: 'rooms', path });
        return { ok: true, data: rooms };
      },
    } : undefined;
    const w = {
      GoStudyFinanceAuth: auth,
      addEventListener() {},
      matchMedia: () => ({ matches: mobile }),
      JitsiMeetExternalAPI: class {
        constructor(domain, options) { starts++; joined = { domain, options }; }
        addEventListener() {}
        dispose() { disposed++; }
      },
    };
    const fetchMock = async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push({ kind: 'token', url, body });
      return Response.json({ appId, room: 'gostudy-finance-' + student.replace(/-/g, ''), jwt: 'synthetic-jwt' });
    };
    vm.runInNewContext(front, {
      document: documentStub, window: w, fetch: fetchMock, Response, AbortSignal,
      URLSearchParams, Error,
    }, { filename: 'gostudy-jaas-video.js' });
    const connect = controls.find(el => el.className === 'call-btn jaas-connect');
    assert.ok(connect, 'Connect button must be rendered');
    assert.equal(connect.disabled, false, 'Connect must be usable without FinanceLive');
    await connect.listeners.click();
    if (joined) {
      assert.equal(joined.options.configOverwrite.toolbarButtons.length, 0,
        'Jitsi controls must stay off the video in both layouts');
    }
    if (joined && mobile) {
      assert.equal(workspace.classList.contains('jaas-compact'), true, 'Mobile starts in persistent mini-player');
      assert.equal(documentStub.body.classList.contains('jaas-video-active'), true, 'Mobile dock stays on screen');
      // Simulate exercise navigation: this must not remount the iframe.
      events['finance-ready']?.();
      const size = controls.find(el => el.className === 'jaas-size');
      assert.ok(size, 'Mobile video must have resize control');
      size.listeners.click();
      assert.equal(workspace.classList.contains('jaas-compact'), false, 'Can expand video without reconnecting');
      size.listeners.click();
      assert.equal(workspace.classList.contains('jaas-compact'), true, 'Can minimize video without reconnecting');
      assert.equal(starts, 1, 'One Jitsi iframe per call throughout lesson navigation');
      assert.equal(disposed, 0, 'Lesson navigation never disposes video');
    }
    return { calls, joined, status: state.textContent };
  }
  const teacherVideo = await simulateVideo({
    user: teacher, rooms: [{ teacher_id: teacher, student_id: student }],
  });
  assert.deepEqual(teacherVideo.calls.map(x => x.kind), ['rooms', 'token']);
  assert.equal(teacherVideo.calls[1].body.studentId, student);
  assert.equal(teacherVideo.joined.domain, '8x8.vc');
  assert.equal(teacherVideo.joined.options.roomName, appId + '/gostudy-finance-' + student.replace(/-/g, ''));
  const studentVideo = await simulateVideo({
    user: student, rooms: [{ teacher_id: teacher, student_id: student }], mobile: true,
  });
  assert.equal(studentVideo.calls[1].body.studentId, null);
  const selectedTeacher = await simulateVideo({ user: teacher, selected: student, mobile: true });
  assert.equal(selectedTeacher.calls.length, 1);
  assert.equal(selectedTeacher.calls[0].body.studentId, student);
  const noSession = await simulateVideo({ includeAuth: false });
  assert.equal(noSession.calls.length, 0);
  assert.match(noSession.status, /Войдите в аккаунт/);
  const multipleRooms = await simulateVideo({
    user: teacher, rooms: [
      { teacher_id: teacher, student_id: student },
      { teacher_id: teacher, student_id: stranger },
    ],
  });
  assert.equal(multipleRooms.calls.length, 1);
  assert.match(multipleRooms.status, /выбрав ученика/);
  const css = fs.readFileSync('assets/gostudy-jaas-video.css', 'utf8');
  assert.match(css, /position:fixed!important/, 'Mobile video must float while scrolling through lessons');
  assert.match(css, /jaas-video-active/, 'Floating only while call is active');
  assert.match(css, /z-index:40/, 'Floating video must stay above lesson navigation');
  const workbookSource = fs.readFileSync('assets/gostudy-v1-workbook.js', 'utf8');
  assert.match(workbookSource, /function go\(n\)/);
  assert.match(workbookSource, /navigateFromControls\(nextPage\)/);
  assert.doesNotMatch(workbookSource, /function go\(n\)\s*\{[\s\S]{0,500}(location\.href|location\.assign)/);
  console.log('JaaS: secure JWT, active mobile mini-player, stable iframe on section navigation PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
