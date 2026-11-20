/* Design2 IELTS visual-only guard: source of private payload/auth and progress remains EXACTLY unchanged. */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const gitSha=s=>{const b=Buffer.from(s,'utf8');return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const html=read('ielts-reading-04.html');
const base='<link rel="stylesheet" href="assets/gostudy-v1-lesson.css">';
const feed='<link rel="stylesheet" href="assets/gostudy-michael-feed.css?v=4">';
const chatCSS='<link rel="stylesheet" href="assets/gostudy-michael-chat.css?v=1">';
const loader='<script src="assets/gostudy-ielts-reading.js"></script>';
const chatJS='<script src="assets/gostudy-design2-ielts-chat.js?v=1"></script>';
const premium='<body data-premium-feed="michael-v1" data-design-system="gostudy-v1"';
for(const token of [base,feed,chatCSS,loader,chatJS,premium]){
 assert.equal(html.split(token).length,2,'Must import only one original/shared UI component: '+token);
}
assert.ok(html.indexOf(base)<html.indexOf(feed)&&html.indexOf(feed)<html.indexOf(chatCSS));
assert.ok(html.indexOf(loader)<html.indexOf(chatJS),'Shared chat MUST load after existing authorized IELTS controller');
const old=html.replace(base+feed+chatCSS,base)
 .replace(premium,'<body data-design-system="gostudy-v1"')
 .replace(loader+chatJS,loader);
assert.equal(gitSha(old),'ec7091e24b07516cf29a3213e18299c448f31047',
 'IELTS private route/config/payload/answer keys must be byte-identical to previously published production');
const helper=read('assets/gostudy-design2-ielts-chat.js');
assert.ok(helper.includes("gostudy-authorized") && helper.includes('gostudy-michael-chat.js'),
  'Shared chat enhancer must require established IELTS authenticated gate');
assert.ok(!/localStorage|sessionStorage|fetch\(|supabase|\.request\(|password|token\(|service_role/.test(helper),
  'UI enhancer MUST NOT handle auth/data/network/storage');
assert.equal(gitSha(read('assets/gostudy-ielts-reading.js')),
 '0db23d4079d5b3c3c4d006e7b4424f5e806d97a9',
 'Existing private IELTS progress/save/access controller changed without Centralization review');
assert.equal(gitSha(read('business-ai-finance-b2-02.html')),'0d4e2c78edb8fda2103fa4b7f83cff54a819c51f',
 'Michael reference unexpectedly changed');
console.log('DESIGN2 IELTS PASS: source private auth, hidden payload and answers untouched; shared Michael UI only after gate');
