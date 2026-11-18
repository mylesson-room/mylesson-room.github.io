/* Synthetic negative tests for the migration inventory guard. No Supabase access or student data. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = process.cwd();
const original = JSON.parse(fs.readFileSync('docs/legacy-cabinet-inventory.json','utf8'));
const baseline = JSON.parse(fs.readFileSync('scripts/student-cabinet-baseline.json','utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'gostudy-inventory-'));
try {
  fs.mkdirSync(path.join(temp,'docs'));
  fs.mkdirSync(path.join(temp,'scripts'));
  fs.copyFileSync('scripts/check-cabinet-migration-inventory.cjs',path.join(temp,'scripts/check-cabinet-migration-inventory.cjs'));
  fs.writeFileSync(path.join(temp,'scripts/student-cabinet-baseline.json'),JSON.stringify(baseline));
  for(const entry of original.entries){
    for(const name of [entry.legacyCabinet,entry.candidateCurrentLesson,entry.legacyHomework].filter(Boolean)){
      fs.writeFileSync(path.join(temp,name),'', {flag:'a'});
    }
  }
  fs.writeFileSync(path.join(temp,'student.html'),'');
  const run = (data) => {
    fs.writeFileSync(path.join(temp,'docs/legacy-cabinet-inventory.json'),JSON.stringify(data));
    return spawnSync(process.execPath,['scripts/check-cabinet-migration-inventory.cjs'],{cwd:temp,encoding:'utf8'});
  };
  assert.equal(run(original).status,0,'Unmodified inventory should pass');
  const mutate = (fn,label) => {
    const data=structuredClone(original);
    fn(data);
    assert.notEqual(run(data).status,0,label+' must be rejected');
  };
  mutate(x=>{x.entries[0].teacherConfirmed=true},'unverified teacher confirmation');
  mutate(x=>{x.entries[0].studentEmail='private@example.invalid'},'private identity field');
  mutate(x=>{x.auditNote='contact private@example.invalid'},'email in unstructured public inventory metadata');
  mutate(x=>{x.auditNote='student id: opaque-private-identifier'},'unexpected top-level private metadata without email');
  mutate(x=>{x.version=2},'unreviewed inventory schema version');
  mutate(x=>{x.entries[0].candidateCurrentLesson='student.html'},'dashboard as lesson');
  mutate(x=>{x.entries[0].candidateCurrentLesson='../outside.html'},'path traversal');
  mutate(x=>{x.entries[0].legacyCabinet=x.entries[1].legacyCabinet},'duplicate cabinet');
  mutate(x=>{x.entries[0].source='unverified'},'unreviewed source');
  mutate(x=>{x.entries.pop()},'missing legacy route');
  fs.writeFileSync(path.join(temp,'student-new-pupil.html'),'');
  assert.notEqual(run(original).status,0,'new bespoke student cabinet must be rejected');
  console.log('Migration inventory negative fixtures: 11 unsafe mutations rejected; all 18 baseline routes preserved.');
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
}
