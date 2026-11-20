/* Design2 five-lesson UI batch: exact source preservation and Michael component parity.
 * This script deliberately does NOT change student identity, enrollment or database rows.
 */
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const blobSha=text=>{
  const bytes=Buffer.from(text,'utf8');
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
const read=path=>fs.readFileSync(path,'utf8');
const pages={
  'art-b1-03.html':{sha:'efba21a6d99806652c6424e29827a531439dbd50',wasGoogle:false},
  'business-ai-b2c1-03.html':{sha:'7450802badf1d4fdd13a1576a5cb3e1ab817cbf0',wasGoogle:false},
  'first-sales-c1-03.html':{sha:'4987d4053512ae780e27aeab181842a148088c7e',wasGoogle:true},
  'general-english-b2-01.html':{sha:'4f86f139e5f420c5e39967510454c4897988aa45',wasGoogle:false},
  'pharma-ai-evidence-c1-20261118.html':{sha:'adf0dc354d8ab29066e6c37b380dc4efc6d8b30b',wasGoogle:true}
};
const baseCss='<link rel="stylesheet" href="assets/gostudy-v1-lesson.css">';
const feed='<link rel="stylesheet" href="assets/gostudy-michael-feed.css?v=4">';
const chatCSS='<link rel="stylesheet" href="assets/gostudy-michael-chat.css?v=1">';
const engine='<script src="assets/gostudy-v1-lesson.js"></script>';
const chatJS='<script src="assets/gostudy-michael-chat.js?v=1"></script>';
const defaultJS='<script src="assets/gostudy-design2-chat-desktop.js?v=1"></script>';
const reference=read('business-ai-finance-b2-02.html');
assert.equal(blobSha(reference),'0d4e2c78edb8fda2103fa4b7f83cff54a819c51f',
  'Michael HTML changed; audit visual parity before proceeding');
const helper=read('assets/gostudy-design2-chat-desktop.js');
assert.ok(helper.includes("dropdown.open = true")&&!/fetch\(|localStorage|supabase|studentId|service_role/.test(helper),
  'Only presentation may be changed in Design2 chat default');
for(const [path,{sha,wasGoogle}] of Object.entries(pages)){
  const html=read(path);
  const bodyPrefix='<body data-premium-feed="michael-v1" '+(wasGoogle?'':'data-translate-engine="google-web-pilot" ');
  for(const token of [baseCss,feed,chatCSS,engine,chatJS,defaultJS,bodyPrefix]){
    assert.equal(html.split(token).length,2,path+' requires EXACTLY one '+token);
  }
  assert.ok(html.indexOf(baseCss)<html.indexOf(feed)&&html.indexOf(feed)<html.indexOf(chatCSS),
    path+' must load approved CSS after original engine styles');
  assert.ok(html.indexOf(engine)<html.indexOf(chatJS)&&html.indexOf(chatJS)<html.indexOf(defaultJS),
    path+' shared chat must initialize after actual existing lesson shell');
  assert.ok(html.includes('data-translate-engine="google-web-pilot"'),
    path+' must use the same Google-pilot UX as Michael');
  assert.ok(!html.includes('data-jaas-video-pilot'),'Do not copy finance-only JaaS auth to '+path);
  const reverted=html
    .replace(baseCss+feed+chatCSS,baseCss)
    .replace(bodyPrefix,'<body ')
    .replace(engine+chatJS+defaultJS,engine);
  assert.equal(blobSha(reverted),sha,
    path+' original lesson body, answers, IDs, routes, words and homework must be byte-for-byte identical');
}
console.log('DESIGN2 BATCH GUARD PASS: five exact original lesson blobs preserved; Michael unchanged; shared feed/chat/translation UX');
