/* Design 2: verify Michael/Alla use one approved lesson feed without modifying any lesson material. */
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const originalBlobSha=raw=>{
  const bytes=Buffer.from(raw,'utf8');
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
const michael=read('business-ai-finance-b2-02.html');
const alla=read('my-trip-to-vietnam-a2.html');
const feedCss=read('assets/gostudy-michael-feed.css');
const baseCss=read('assets/gostudy-v1-lesson.css');
const feedLink='<link rel="stylesheet" href="assets/gostudy-michael-feed.css?v=4">';
const baseLink='<link rel="stylesheet" href="assets/gostudy-v1-lesson.css">';
assert.equal(originalBlobSha(michael),'0d4e2c78edb8fda2103fa4b7f83cff54a819c51f',
  'Michael reference changed unexpectedly; stop before spreading styles.');
for(const [name,source] of [['Michael',michael],['Alla',alla]]){
  assert.equal(source.split(feedLink).length,2,name+' must load the SAME Michael feed exactly once');
  assert.ok(source.includes('data-premium-feed="michael-v1"'),name+' must opt into the SAME selector');
  assert.ok(source.indexOf(baseLink)<source.indexOf(feedLink),name+' must load base CSS first');
  assert.ok(source.includes('data-translate-engine="google-web-pilot"'),name+' translation pilot must remain');
}
assert.ok(alla.includes('assets/gostudy-private-access.js'),'Alla private access must remain');
assert.ok(alla.includes('id="private-access-config"'),'Alla private lesson scope must remain');
assert.ok(!alla.includes('assets/gostudy-jaas-video.js'),
  'No video/auth upgrade without approval and real two-role test');
assert.ok(!alla.includes('assets/gostudy-michael-chat.js'),
  'No chat backend adaptation without Centralization approval');
const reverted=alla.replace(feedLink,'')
  .replace('<body data-premium-feed="michael-v1" data-finance-live data-vietnam-lesson',
           '<body data-finance-live data-vietnam-lesson');
assert.equal(originalBlobSha(reverted),'959c12631aa9bd780e140ab4b5862978e95e6071',
  'Unexpected change to Alla lesson HTML/content, answers, homework or routing');
assert.ok(feedCss.includes('body[data-premium-feed="michael-v1"] .lesson-content'),
  'Canonical paper layout selector missing');
assert.ok(feedCss.includes('@media (max-width: 800px)'),
  'Approved responsive layout missing');
assert.ok(baseCss.includes('.lesson-content'),'Common engine CSS missing');
console.log('Design2: Michael baseline locked, Alla content untouched, both share approved responsive feed');
