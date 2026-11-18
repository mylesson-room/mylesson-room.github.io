/* Freeze per-student HTML pages while migrating to a single data-driven cabinet.
   Run from repository root: node scripts/check-unified-cabinet.cjs
   Must be enforced on pull requests before merging into main. */
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const baseline = JSON.parse(fs.readFileSync('scripts/student-cabinet-baseline.json', 'utf8'));
const tracked = execFileSync('git', ['ls-files', '-z', '--', 'student-*.html'], {encoding:'utf8'})
  .split('\0').filter(Boolean).sort();
const allowed = [...baseline.pages].sort();
const added = tracked.filter(path => !allowed.includes(path));
const removed = allowed.filter(path => !tracked.includes(path));
assert.deepEqual(added, [], 'New per-student HTML cabinets are forbidden. Create an assignment for the shared cabinet instead.');
assert.deepEqual(removed, [], 'Legacy student URLs must remain supported until an approved migration.');
for (const path of ['student-business-ai-finance.html', 'student-english-placement.html']) {
  const html = fs.readFileSync(path,'utf8');
  assert.match(html, /assets\/gostudy-v1-cabinet\.js/, path+' must use the canonical cabinet renderer');
  assert.match(html, /assets\/gostudy-v1-cabinet\.css/, path+' must use the canonical cabinet stylesheet');
  const settings = html.match(/<script\s+type="application\/json"\s+id="cabinet-settings">([\s\S]*?)<\/script>/);
  assert.ok(settings, path+' needs data-only cabinet settings');
  const config=JSON.parse(settings[1]);
  assert.equal(config.cabinet,path);
  assert.ok(config.lesson && config.title, path+' needs a lesson assignment and title');
  assert.ok(!/<header\b[^>]*class="top"/i.test(html),path+' must not copy the shared header');
}
const stylesheet=fs.readFileSync('assets/gostudy-v1-cabinet.css','utf8');
assert.match(stylesheet, /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope/, 'Canonical Manrope typography must live in shared CSS');
for (const path of ['student-business-ai-finance.html', 'student-english-placement.html']) {
  assert.ok(!fs.readFileSync(path, 'utf8').includes('fonts.googleapis.com'), path+' must not define its own font loading');
}
const renderer=fs.readFileSync('assets/gostudy-v1-cabinet.js','utf8');
for(const name of ['id="openWords"','id="practiceCard"','id="assignment"']) {
  assert.ok(renderer.includes(name),'Missing shared element: '+name);
}

// Every historical route must consume the same visual action tokens.
// This checks shared styling, NOT full page/lesson functional parity.
const tokenCss = fs.readFileSync('assets/gostudy-shared-visual.css','utf8');
assert.match(tokenCss, /--gostudy-action-bg\s*:/, 'One primary-action color token is required');
assert.match(stylesheet, /gostudy-shared-visual\.css/, 'Michael must consume the shared tokens');
for (const path of tracked) {
  const html = fs.readFileSync(path,'utf8');
  if (html.includes('assets/gostudy-v1-cabinet.css')) continue;
  assert.match(html, /assets\/gostudy-shared-visual\.css/, path+' must load shared action tokens');
  assert.match(html, /data-gostudy-legacy-visual/, path+' must scope legacy visual normalization');
}

console.log('Unified cabinet guard: '+tracked.length+' frozen legacy routes; Michael = canonical UI; Placement = second test scenario.');
