/* Design 2 exact-content guard for old B1/TikTok lesson renderers.
 * Preserves the live legacy answer/progress systems byte-for-byte.
 */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const sha=s=>{let b=Buffer.from(s,'utf8');return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const css='<link rel="stylesheet" href="assets/gostudy-approved-lesson-layout.css?v=design2-20261120"><link rel="stylesheet" href="assets/gostudy-design2-legacy-michael.css?v=1">';
const attrs=' data-gostudy-approved-lesson data-design2-legacy-michael';
const expected={
 'general-english-b1-01.html':'59cf612f9252aaf5bd70d4bf4a732e395cb72517',
 'tiktok-a2.html':'5951c6ef83fcf97c6d404246a0b633a8d3b1d43f'
};
for(const [page,original] of Object.entries(expected)){
 const s=read(page);
 assert.equal(s.split(css).length,2,page+' must import exactly one approved common visual layer');
 assert.equal(s.split('<body'+attrs).length,2,page+' must opt in exactly once');
 const reverted=s.replace(css+'</head>','</head>').replace('<body'+attrs,'<body');
 assert.equal(sha(reverted),original,page+' course, content, lesson IDs, answers and progress must be exactly unchanged');
}
const bridge=read('assets/gostudy-design2-legacy-michael.css');
assert.ok(bridge.includes('body[data-design2-legacy-michael]'));
assert.ok(!/fetch\(|supabase|localStorage|service_role|@import|url\(/.test(bridge),
 'Legacy bridge must be scoped presentation only: no data writes/imports/assets');
console.log('DESIGN2 LEGACY PASS: B1 and TikTok original HTML blobs, answer engines, word keys and teacher links unchanged');
