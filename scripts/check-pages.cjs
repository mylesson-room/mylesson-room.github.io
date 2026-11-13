const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { runInNewContext } = require('node:vm');
const { chromium } = require('playwright');

const mime = { html: 'text/html', js: 'application/javascript', css: 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const data = await readFile('.' + path);
    res.setHeader('Content-Type', mime[path.split('.').pop()] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.GOSTUDY_CHROME ? {executablePath: process.env.GOSTUDY_CHROME} : {});
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    const source = await readFile('assets/gostudy-sync.js', 'utf8');
    const catalog = runInNewContext('('+source.match(/const classroomCatalog = ([^\n]+);/)[1]+')');
    const studentId = '11111111-1111-4111-8111-111111111111';
    for (const [course, entry] of Object.entries(catalog)) {
      const current = entry.lessons.at(-1);
      const expected = new URL(current.lesson, origin).pathname;
      const student = await browser.newContext();
      const teacher = await browser.newContext();
      const assigned = [];
      try {
        for (const [context, role] of [[student, 'student'], [teacher, 'teacher']]) {
          await context.addInitScript(({ id }) => {
            const value = JSON.stringify({ user: { id }, access_token: 'test', refresh_token: 'test', expires_at: Date.now() + 3600000 });
            sessionStorage.setItem('gostudy-cloud-session-v1', value);
          }, {id: role === 'student' ? studentId : 'teacher'});
          await context.route('https://*.supabase.co/**', route => {
            const url = route.request().url();
            const action = url.split('/').at(-1);
            const data = route.request().postDataJSON() || {};
            if (action.endsWith('_assign_word') || action.endsWith('_workbook_assign')) {
              assert.equal(role, 'teacher');
              assert.equal(data.p_student, studentId);
              assigned.push({en:data.p_en,ru:data.p_ru});
              return route.fulfill({json:true});
            }
            if (action.endsWith('_my_words') || action.endsWith('_workbook_read')) {
              return route.fulfill({json:assigned});
            }
            const rows = url.endsWith('gostudy_' + course + '_teacher_view')
              ? [{ id: studentId, label: 'Test student', words: [], assigned, progress: [] }]
              : url.endsWith('gostudy_my_destinations')
                ? [{ course: role === 'teacher' ? 'teacher' : course.replaceAll('_', '-') }]
                : [];
            return route.fulfill({ json: rows });
          });
        }
        const sp = await student.newPage();
        const tp = await teacher.newPage();
        await sp.goto(origin + (course === 'pharma_c1' ? '/student-pharma.html' : '/student-' + course.replaceAll('_', '-') + '.html'));
        await tp.goto(origin + '/gostudy-teacher.html');
        const studentLink = sp.locator('.home-open-lesson');
        const teacherLink = tp.locator('.teacher-enter-class');
        await studentLink.waitFor();
        await teacherLink.waitFor();
        for (const [page, link] of [[sp, studentLink], [tp, teacherLink]]) {
          await link.click();
          await page.waitForURL(url => url.pathname === expected);
          await page.locator('header.gostudy-lesson-topbar:visible').waitFor();
          assert.equal(await page.locator('header.gostudy-lesson-topbar:visible').count(), 1);
          assert.equal(await page.locator('.gostudy-cabinet-back:visible').count(), 1);
          const dictionary = page.locator('.glass-lesson-tools button[aria-label="Открыть словарь"]');
          await dictionary.click();
          await page.locator('.glass-words[open]').waitFor();
          assert.equal(await page.locator('.glass-words[open]').count(), 1);
        }
        assert.equal(new URL(tp.url()).searchParams.get('classStudent'), studentId);
        assert.equal(new URL(sp.url()).searchParams.has('classStudent'), false);
        await tp.locator('.glass-form input[name=term]').fill('release check');
        await tp.locator('.glass-form input[name=meaning]').fill('проверка выпуска');
        await tp.locator('.glass-form button[type=submit]').click();
        await sp.locator('.glass-list').getByText('release check', {exact:true}).waitFor({timeout:7000});
        for (const page of [sp,tp]) {
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow');
        }
        console.log(course + ': both cabinets open the current lesson and shared dictionary');
      } catch (error) { throw new Error(course + ': ' + error.message, {cause: error}); }
      finally { await student.close(); await teacher.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
