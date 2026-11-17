/* Read-only inventory guard: all existing cabinet routes must have an explicit migration mapping.
   A candidate current lesson is NOT a published assignment or a teacher confirmation. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const inventory=JSON.parse(fs.readFileSync('docs/legacy-cabinet-inventory.json','utf8'));
const baseline=JSON.parse(fs.readFileSync('scripts/student-cabinet-baseline.json','utf8'));
assert.equal(inventory.entries.length,baseline.pages.length,'Every legacy cabinet needs a migration entry');
const names=inventory.entries.map(x=>x.legacyCabinet).sort();
assert.deepEqual(names,[...baseline.pages].sort(),'Legacy migration inventory must match frozen routes exactly');
assert.equal(new Set(inventory.entries.map(x=>x.legacyCourse)).size,inventory.entries.length,'Every legacy course must have exactly one entry');
// Reject unnoticed new one-off student cabinets. New pupils must use student.html;
// historical routes may only be added with an explicit inventory review.
const discovered=fs.readdirSync('.').filter(name=>/^student-[a-z0-9-]+\\.html$/.test(name)).sort();
assert.deepEqual(discovered,names,'Uninventoried student cabinet detected; use shared student.html for new profiles');
assert.ok(fs.existsSync('student.html'),'The canonical student dashboard must remain available');
for(const entry of inventory.entries){
  assert.equal(entry.teacherConfirmed,false,'Never write inferred assignments as confirmed');
  assert.ok(/^[a-z][a-z0-9-]*\.html$/.test(entry.candidateCurrentLesson),'Invalid lesson path: '+entry.legacyCabinet);
  assert.ok(fs.existsSync(entry.candidateCurrentLesson),'Missing candidate lesson file: '+entry.candidateCurrentLesson);
  if(entry.legacyHomework){
    assert.ok(/^[a-z][a-z0-9-]*\.html$/.test(entry.legacyHomework),'Invalid homework path: '+entry.legacyCabinet);
    assert.ok(fs.existsSync(entry.legacyHomework),'Missing legacy homework file: '+entry.legacyHomework);
  }
  assert.ok(fs.existsSync(entry.legacyCabinet),'Missing legacy cabinet: '+entry.legacyCabinet);
}
assert.ok(!/\\b[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}\\b/i.test(JSON.stringify(inventory)),'Do not commit student emails or PII to inventory');
console.log('GoStudy migration inventory: all '+names.length+' legacy HTML routes mapped to existing candidate lessons; confirmation still required.');
