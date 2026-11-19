// Playwright regression: real pointer/touch click on Michael's embedded JaaS button.
// Serves the actual lesson HTML/JS locally; stubs external Supabase/Jitsi services.
// No real account or private key used.
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = process.cwd();
const mime = { html:'text/html', js:'application/javascript', css:'text/css', svg:'image/svg+xml', png:'image/png' };
const studentId = '11111111-1111-4111-8111-111111111111';
const teacherId = '22222222-2222-4222-8222-222222222222';
const appId = 'vpaas-magic-cookie-synthetic';
const roomName = 'gostudy-finance-' + studentId.replace(/-/g,'');
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const resolved = path.resolve(root, '.' + pathname);
  if (!resolved.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    const data = await fs.readFile(resolved);
    res.writeHead(200, { 'Content-Type': mime[path.extname(resolved).slice(1)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
const fakeExternalApi = `
  window.JitsiMeetExternalAPI = class {
    constructor(domain, options) {
      window.__jitsiStarts = (window.__jitsiStarts || 0) + 1;
      window.__lastJitsiRoom = options.roomName;
      window.__lastJitsiOptions = { interfaceConfigOverwrite: options.interfaceConfigOverwrite, configOverwrite: options.configOverwrite };
      window.__jitsiCommands = [];
      this.audioMuted = true;
      this.videoMuted = false;
      this.events = {};
      this.iframe = document.createElement('iframe');
      this.iframe.src = 'about:blank';
      options.parentNode.append(this.iframe);
      setTimeout(() => this.events.videoConferenceJoined?.(), 50);
    }
    addEventListener(event, handler) { this.events[event] = handler; }
    executeCommand(command) {
      window.__jitsiCommands.push(command);
      if (command === 'toggleAudio') {
        this.audioMuted = !this.audioMuted;
        this.events.audioMuteStatusChanged?.({muted:this.audioMuted});
      }
      if (command === 'toggleVideo') {
        this.videoMuted = !this.videoMuted;
        this.events.videoMuteStatusChanged?.({muted:this.videoMuted});
      }
    }
    dispose() { window.__jitsiDisposed = (window.__jitsiDisposed || 0) + 1; this.iframe.remove(); }
  };
`;
async function exercise(browser, origin, opts) {
  const { mobile, fail } = opts;
  const context = await browser.newContext({
    viewport: mobile ? { width:390, height:844 } : { width:1365, height:850 },
    isMobile:mobile, hasTouch:mobile
  });
  try {
    await context.addInitScript(({id}) => {
      const s = JSON.stringify({user:{id},access_token:'synthetic-jwt',expires_at:Date.now()+3600000});
      sessionStorage.setItem('gostudy-cloud-session-v1',s);
      localStorage.setItem('gostudy-student-session-v1',s);
    }, {id:studentId});
    await context.route('https://*.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/functions/v1/gostudy-jaas-token'))
        return fail
          ? route.fulfill({status:403,json:{error:'Проверка доступа не пройдена (тест)'}})
          : route.fulfill({status:200,json:{appId,room:roomName,jwt:'synthetic-video-jwt'}});
      if (url.pathname.endsWith('/gostudy_finance_room'))
        return route.fulfill({json:[{teacher_id:teacherId,student_id:studentId}]});
      if (url.pathname.endsWith('/gostudy_finance_events'))
        return route.fulfill({json:[]});
      if (url.pathname.endsWith('/auth/v1/user'))
        return route.fulfill({json:{id:studentId}});
      return route.fulfill({json:[]});
    });
    await context.route('https://8x8.vc/**', route =>
      route.request().url().endsWith('/external_api.js')
        ? route.fulfill({status:200,contentType:'application/javascript',body:fakeExternalApi})
        : route.abort()
    );
    await context.route('https://translate.googleapis.com/**', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto(origin+'/business-ai-finance-b2-02.html');
    const button = page.locator('#lessonVideo .jaas-connect');
    await button.waitFor({state:'visible'});
    assert.equal(await button.isEnabled(),true,'Button disabled before clicking');
    assert.equal(await page.locator('#lessonVideo a[href*="telemost.yandex.ru"]').count(),0,'Michael video UI still contains Telemost');
    const panel = page.locator('#lessonVideo .video-preview');
    const cards = panel.locator('.jaas-person-tile');
    assert.equal(await cards.count(),2,'Reference video panel must show exactly two stacked cards');
    assert.deepEqual(await cards.locator('.jaas-person-label').allTextContents(),['Преподаватель','Ученик']);
    assert.equal(await panel.evaluate(el=>getComputedStyle(el).flexDirection),'column','Teacher and student must stack vertically');
    assert.equal(await cards.nth(0).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(36, 54, 76)','Teacher tile color incorrect');
    assert.equal(await cards.nth(1).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(48, 79, 106)','Student tile color incorrect');
    const dock = page.locator('#lessonVideo .jaas-control-bar');
    assert.equal(await dock.isVisible(),true,'Minimal controls must be visible before connecting');
    assert.equal(await dock.evaluate(el=>getComputedStyle(el).flexDirection),'row');
    assert.equal(await page.locator('#lessonVideo .jaas-mic').isVisible(),true);
    assert.equal(await page.locator('#lessonVideo .jaas-connect').isVisible(),true);
    assert.equal(await page.locator('#lessonVideo .jaas-camera').isVisible(),false);
    assert.equal(await page.locator('#lessonVideo .jaas-leave').isVisible(),true);
    if (mobile) await panel.tap({timeout:6500});
    else await button.click({timeout:6500});
    if (fail) {
      await page.locator('.jaas-message').getByText(/Проверка доступа не пройдена/).waitFor({timeout:5000});
      assert.equal(await button.isEnabled(),true,'Button must recover from errors');
      assert.equal(await page.locator('.jaas-frame').count(),0);
    } else {
      await page.locator('.jaas-frame iframe').waitFor({state:'attached',timeout:6500});
      await page.waitForFunction(() => document.querySelector('.video-state')?.textContent === 'Вы в видеозвонке',{timeout:6500});
      assert.equal(await page.evaluate(() => window.__lastJitsiRoom),appId+'/'+roomName);
      assert.equal(await page.evaluate(() => window.__lastJitsiOptions.interfaceConfigOverwrite.TILE_VIEW_MAX_COLUMNS),1,'Participants must stack vertically in Jitsi tile view');
      await page.waitForFunction(() => window.__jitsiCommands.includes('toggleTileView'));
      const microphone = page.locator('#lessonVideo .jaas-mic');
      const camera = page.locator('#lessonVideo .jaas-camera');
      const endCall = page.locator('#lessonVideo .jaas-leave');
      assert.equal(await microphone.isEnabled(),true);
      assert.equal(await camera.isEnabled(),true);
      await microphone.click();
      assert.equal(await microphone.getAttribute('aria-pressed'),'true','Microphone UI must follow real mute event');
      await camera.click();
      assert.equal(await camera.getAttribute('aria-pressed'),'false','Camera UI must follow real mute event');
      const commands = await page.evaluate(() => window.__jitsiCommands);
      assert.ok(commands.includes('toggleAudio') && commands.includes('toggleVideo'),'UI controls must use real Jitsi commands');
      assert.equal(await endCall.isVisible(),true);
      const before = await page.evaluate(() => {
        window.__savedJitsiIframe = document.querySelector('.jaas-frame iframe');
        return window.__jitsiStarts;
      });
      await page.locator('#next').click();
      await page.locator('#page-1.active').waitFor({timeout:5000});
      assert.equal(await page.evaluate(() => window.__savedJitsiIframe === document.querySelector('.jaas-frame iframe')),true,'Video iframe replaced when moving to next exercise');
      assert.equal(await page.evaluate(() => window.__jitsiStarts),before,'Video call restarted on page change');
      assert.equal(await page.evaluate(() => window.__jitsiDisposed || 0),0,'Video disposed on exercise navigation');
      if (mobile) {
        assert.equal(await page.locator('.jaas-compact').count(),1,'Mobile floating player not compact');
        assert.equal(await page.locator('.jaas-frame').isVisible(),true,'Video hidden on mobile');
        await page.locator('#lessonVideo .jaas-size').click();
        assert.equal(await page.locator('.jaas-compact').count(),0,'Mobile should be able to expand without reconnecting');
        await page.locator('#lessonVideo .jaas-size').click();
        assert.equal(await page.locator('.jaas-compact').count(),1,'Mobile should be able to collapse without reconnecting');
      }
      await endCall.click();
      assert.equal(await page.locator('.jaas-frame').count(),0,'Hangup must dispose media iframe');
      assert.equal(await button.isEnabled(),true,'Should be able to restart after hangup');
      assert.equal(await page.locator('.jaas-person-tile').count(),2,'Pre-call tiles must return after hanging up');
    }
    assert.deepEqual(errors.filter(x=>x.includes('gostudy-jaas-video.js')),[],'JavaScript video adapter error');
    await page.close();
  } finally { await context.close(); }
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch(process.env.GOSTUDY_CHROME
    ? {executablePath:process.env.GOSTUDY_CHROME}
    : {});
  try {
    const origin='http://127.0.0.1:'+server.address().port;
    await exercise(browser,origin,{mobile:false,fail:false});
    await exercise(browser,origin,{mobile:true,fail:false});
    await exercise(browser,origin,{mobile:false,fail:true});
    console.log('JaaS design: two reference tiles, exact colors, three icon dock, desktop click/mobile tap, real Jitsi controls, persisted iframe PASS');
  } finally { await browser.close();server.close(); }
})().catch(error => {console.error(error);server.close();process.exitCode=1;});
