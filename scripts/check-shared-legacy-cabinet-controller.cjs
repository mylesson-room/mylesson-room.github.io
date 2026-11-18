/* Assert repeated legacy controllers were replaced by one shared implementation.
   No PII; old storage keys must never change as part of this refactor. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const files=[
  {
    "path": "student-feed-b2.html",
    "lessonStorageKey": "gostudy-feed-b2-v1",
    "profileStorageKey": "gostudy-feed-b2-profile-v1"
  },
  {
    "path": "student-finance-b1.html",
    "lessonStorageKey": "gostudy-finance-b1-v1",
    "profileStorageKey": "gostudy-finance-b1-profile-v1"
  },
  {
    "path": "student-first-sales.html",
    "lessonStorageKey": "gostudy-first-sales-shared-v1",
    "profileStorageKey": "gostudy-first-sales-profile-v1"
  },
  {
    "path": "student-pharma.html",
    "lessonStorageKey": "gostudy-pharma-c1-v1",
    "profileStorageKey": "gostudy-pharma-profile-v1"
  },
  {
    "path": "student-travel-a2.html",
    "lessonStorageKey": "gostudy-travel-a2plus-v1",
    "profileStorageKey": "gostudy-travel-a2plus-profile-v1"
  }
];
const shared=fs.readFileSync('assets/gostudy-legacy-cabinet-controller.js','utf8');
assert.match(shared,/addEventListener\('storage',render\)/);
assert.match(shared,/read\(config\.lessonStorageKey\)/);
assert.match(shared,/read\(config\.profileStorageKey\)/);
for(const entry of files){
 const html=fs.readFileSync(entry.path,'utf8');
 assert.match(html,/assets\/gostudy-legacy-cabinet-controller\.js/,entry.path);
 const match=html.match(/<script type="application\/json" id="legacy-cabinet-settings">([^<]+)<\/script>/);
 assert.ok(match,entry.path+' needs its data-only configuration');
 const config=JSON.parse(match[1]);
 assert.equal(config.lessonStorageKey,entry.lessonStorageKey);
 assert.equal(config.profileStorageKey,entry.profileStorageKey);
 assert.ok(!html.includes("const key='"+entry.lessonStorageKey+"'"),entry.path+' must no longer duplicate controller JS');
}
console.log('Historical controllers: 5 cabinets now share one state/render module; original browser storage keys unchanged.');
