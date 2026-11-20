/* Design 2: protect Michael's exact reference and Alla's full lesson/homework payloads.
   All changes must be reversible UI-only imports/attributes, not educational content.
 */
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const gitSha=source=>{
  const bytes=Buffer.from(source,'utf8');
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
const ref=read('business-ai-finance-b2-02.html');
const alla=read('my-trip-to-vietnam-a2.html');
const homework=read('my-trip-to-vietnam-a2-homework.html');
const boot=read('assets/gostudy-vietnam-a2.js');
const videoUI=read('assets/gostudy-alla-video-fallback.js');
const videoCSS=read('assets/gostudy-alla-video-fallback.css');
const feed=read('assets/gostudy-michael-feed.css');
const chat=read('assets/gostudy-michael-chat.js');
const chatCSS=read('assets/gostudy-michael-chat.css');
const baseCSS=read('assets/gostudy-v1-lesson.css');
const linkFeed='<link rel="stylesheet" href="assets/gostudy-michael-feed.css?v=4">';
const linkChat='<link rel="stylesheet" href="assets/gostudy-michael-chat.css?v=1">';
const linkVideo='<link rel="stylesheet" href="assets/gostudy-jaas-video.css?v=two-tiles-20261119-1">';
const linkFallback='<link rel="stylesheet" href="assets/gostudy-alla-video-fallback.css?v=1">';
const baseLink='<link rel="stylesheet" href="assets/gostudy-v1-lesson.css">';
assert.equal(gitSha(ref),'0d4e2c78edb8fda2103fa4b7f83cff54a819c51f','Michael reference must not change');
for(const [name,source] of [['Michael',ref],['Alla lesson',alla],['Alla homework',homework]]){
  assert.equal(source.split(linkFeed).length,2,name+': exactly one shared Michael feed');
  assert.ok(source.includes('data-premium-feed="michael-v1"'),name+': same presentation scope');
  assert.ok(source.indexOf(baseLink)<source.indexOf(linkFeed),name+': base CSS before premium');
  assert.ok(source.includes('data-translate-engine="google-web-pilot"'),name+': existing translation flag preserved');
}
for(const [name,source] of [['Alla lesson',alla],['Alla homework',homework]]){
  assert.equal(source.split(linkChat).length,2,name+': exactly one Michael chat CSS');
  assert.ok(source.includes('data-premium-chat-script="assets/gostudy-michael-chat.js?v=1"'),name+': use existing shared chat JS');
  assert.ok(source.includes('id="private-access-config"'),name+': private access gate preserved');
  assert.ok(source.includes('assets/gostudy-private-access.js'),name+': protected route not bypassed');
  assert.ok(source.includes('id="vietnam-content"'),name+': original lesson content remains');
}
assert.ok(alla.includes('data-alla-video-fallback'),'Alla lesson must have explicit visual-only fallback');
assert.ok(alla.includes(linkVideo+linkFallback+linkChat),'Video + chat styles must be imported after Michael feed');
assert.ok(!alla.includes('data-jaas-video-pilot'),'Never enable finance JaaS endpoint for Alla');
assert.ok(!homework.includes('data-alla-video-fallback'),'No video call on homework');
assert.ok(!homework.includes(linkVideo),'Homework remains without video');
assert.ok(videoUI.includes('telemost.yandex.ru'),'Keep a real external video link');
assert.ok(videoUI.includes('data-vietnam-homework'),'Never show video on homework');
assert.ok(videoUI.includes('gostudy-authorized'),'Only change UI after authorized access');
assert.ok(!videoUI.includes('/functions/v1/')&&!videoUI.includes('service_role'),'No video token or database handling in UI adapter');
assert.ok(videoCSS.includes('telemost-fallback-link'),'Clickable fallback must remain styled');
assert.ok(chat.includes('finance-event')&&chat.includes('chat.before(dropdown)'),'Reuse Michael chat without rewriting message handlers');
assert.ok(chatCSS.includes('lesson-chat-dropdown'),'Approved chat presentation exists');
assert.ok(feed.includes('body[data-premium-feed="michael-v1"] .lesson-content'));
assert.ok(baseCSS.includes('.lesson-content'));

const lessonBefore=alla
 .replace(linkFeed+linkVideo+linkFallback+linkChat,'')
 .replace(
 '<body data-premium-feed="michael-v1" data-alla-video-fallback data-premium-chat-script="assets/gostudy-michael-chat.js?v=1" data-video-preview-script="assets/gostudy-alla-video-fallback.js" data-finance-live data-vietnam-lesson',
 '<body data-finance-live data-vietnam-lesson'
 );
assert.equal(gitSha(lessonBefore),'959c12631aa9bd780e140ab4b5862978e95e6071',
 'Alla lesson content, exercise IDs, dictionary keys and routing must remain EXACTLY unchanged');
const homeworkBefore=homework
 .replace(linkFeed+linkChat,'')
 .replace('<body data-premium-feed="michael-v1" data-premium-chat-script="assets/gostudy-michael-chat.js?v=1" data-finance-live data-vietnam-homework',
 '<body data-finance-live data-vietnam-homework');
assert.equal(gitSha(homeworkBefore),'246bdaebde1eeb43c81460ec12f90367b3e43e95',
 'Alla homework contents, answer keys and routing must remain EXACTLY unchanged');
const onlyUiBoot=`      // UI-only enhancements load after the authorized lesson shell exists.
      // Optional scripts must never prevent private lessons/homework from opening.
      for(const source of [body.dataset.premiumChatScript,body.dataset.videoPreviewScript].filter(Boolean)){
        try { await loadScript(source); }
        catch(error){ console.warn('Optional classroom visual unavailable:',source,error); }
      }
`;
assert.ok(boot.includes(onlyUiBoot),'Private lesson loader contains unexpected changes');
const desktopChat=`      // Desktop live class keeps chat ready for teacher/student typing; phones
      // start collapsed to preserve exercise space, with unread indicators.
      if(body.dataset.premiumChatScript && !body.hasAttribute('data-vietnam-homework') &&
         window.matchMedia('(min-width: 801px)').matches){
        const chat=document.querySelector('#lessonVideo .lesson-chat-dropdown');
        if(chat)chat.open=true;
      }
`;
assert.ok(boot.includes(desktopChat),'Required desktop-only chat preference missing');
assert.equal(gitSha(boot.replace(onlyUiBoot,'').replace(desktopChat,'')),'e6934d11c8432ddb8a02c3cfd7f20350d683cc93',
 'Existing auth, boot, answers and lesson state must remain exactly unchanged');
console.log('Design2 guard PASS: Michael unchanged; Alla lesson/homework original blobs reconstruct exactly; UI-only assets');
