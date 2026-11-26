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
assert.equal(gitSha(ref),'cfad4c96d5082aa2733b99c12310cba358257a8b','Michael reference must not change');
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
assert.ok(alla.includes('data-jaas-video-pilot') && alla.includes('data-jaas-scope="classroom"'),'Alla uses scoped JaaS');
assert.ok(alla.includes(linkVideo) && alla.includes(linkChat),'Alla video and chat styles retained');
assert.ok(alla.includes('data-video-preview-script="assets/gostudy-jaas-video.js?v=call-controls-20261126"'),'Approved JaaS loader retained');
assert.ok(!homework.includes('data-jaas-video-pilot')&&!homework.includes('data-video-preview-script'),'Homework remains without video');
assert.ok(!homework.includes(linkVideo),'Homework remains without video');
assert.ok(chat.includes('finance-event')&&chat.includes('chat.before(dropdown)'),'Reuse Michael chat without rewriting message handlers');
assert.ok(chatCSS.includes('lesson-chat-dropdown'),'Approved chat presentation exists');
assert.ok(feed.includes('body[data-premium-feed="michael-v1"] .lesson-content'));
assert.ok(baseCSS.includes('.lesson-content'));

// Pin the complete published pages; only the two reviewed cache suffixes may differ.
const stripCache=source=>source.replace(/(assets\/gostudy-(?:private-access|vietnam-a2)\.js)\?v=telegram-20261127/g,'$1');
assert.equal(gitSha(stripCache(alla)),'eb0654fa94444857605092a959b55645ebb1cb5b','Alla lesson content and routing unchanged from main');
assert.equal(gitSha(stripCache(homework)),'8d62ea431e0165a938e91b613b7ceed40412c0d1','Alla homework content and routing unchanged from main');
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
assert.ok(boot.includes('if(!room)return;') && boot.includes("gostudy-private-authorized"),'Private authorization retained');
assert.ok(boot.includes('pages.inert=true;pages.hidden=true') && boot.includes("document.addEventListener('finance-ready'"),'Keep exercises locked until synchronization');
assert.ok(boot.includes('pages.inert=false;pages.hidden=false'),'Unlock exercises after synchronization');
console.log('Design2 guard PASS: current published Michael and Alla content preserved, private authorization and JaaS retained');
