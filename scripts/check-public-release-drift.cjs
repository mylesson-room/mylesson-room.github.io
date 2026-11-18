/* Read-only release/inventory reconciliation: observed static routes are NOT authorization or verified assignments. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const inventory = JSON.parse(fs.readFileSync('docs/legacy-cabinet-inventory.json','utf8'));
assert.equal(inventory.entries.length,18);
const observations = [];
for (const entry of inventory.entries) {
  const html = fs.readFileSync(entry.legacyCabinet,'utf8');
  const match = html.match(/<script\s+type="application\/json"\s+id="cabinet-settings">([^<]+)<\/script>/);
  if (!match) continue; // Legacy inline cabinets have no shared settings yet.
  const settings = JSON.parse(match[1]);
  assert.equal(settings.cabinet,entry.legacyCabinet,'Cabinet identity drift: '+entry.legacyCabinet);
  if (settings.lesson !== entry.candidateCurrentLesson) {
    observations.push({cabinet:entry.legacyCabinet,inventoryCandidate:entry.candidateCurrentLesson,publiclyLinkedLesson:settings.lesson});
  }
  if (settings.lesson) assert.ok(fs.existsSync(settings.lesson),'Published HTML points to missing lesson file: '+entry.legacyCabinet);
  // A lesson link is not teacher assignment; historical homework filenames must not publish homework.
  assert.equal(entry.teacherConfirmed,false,'Public HTML must not promote candidate assignments into confirmed records');
}
const travel = inventory.entries.find(x=>x.legacyCabinet==='student-travel-a2.html');
assert.ok(travel,'Travel A2 legacy compatibility mapping missing');
const html = fs.readFileSync('student-travel-a2.html','utf8');
const settings = JSON.parse(html.match(/<script\s+type="application\/json"\s+id="cabinet-settings">([^<]+)<\/script>/)[1]);
assert.equal(settings.lesson,'positive-thinking-a2.html','Positive Thinking release must remain linked in Travel A2 cabinet');
assert.equal(settings.homework,'','Homework must remain unpublished after Positive Thinking release');
assert.ok(fs.existsSync('positive-thinking-a2.html'));
assert.equal(travel.teacherConfirmed,false,'Do not confuse public release with teacher-confirmed canonical assignment');
console.log('Static cabinet drift observations (NOT confirmed student assignments):');
for(const row of observations) console.log(JSON.stringify(row));
console.log('Travel A2 Positive Thinking linked; unpublished homework unchanged; legacy mapping preserved.');
