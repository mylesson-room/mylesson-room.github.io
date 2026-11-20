'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../assets/gostudy-legacy-snapshot.js');
class MemoryStorage{
  constructor(items={}){this.map=new Map(Object.entries(items));this.writes=[];}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.writes.push(key);this.map.set(key,String(value));}
}
const sw='gostudy-sweden-a2-v2', tr='gostudy-turkey-b1-v1';
const originalSw='{"words":[{"en":"take off","ru":"взлетать"}],"answers":{"q1":"A"}}';
const originalTr='{"words":[{"en":"get away","ru":"уехать"}],"answers":{"homework":"My trip"}}';
const original=new MemoryStorage({[sw]:originalSw,[tr]:originalTr,'sb-gostudy-token':'DO_NOT_EXPORT'});
const listing=core.inspect(original);
assert.equal(listing.sweden.filter(x=>x.present).length,1);
assert.equal(listing.turkey.filter(x=>x.present).length,1);
assert.equal(original.writes.length,0,'Inspection may not write');
const exported=core.exportData(original,'2026-11-20T00:00:00Z');
assert.equal(original.writes.length,0,'Export may not write');
assert.ok(!exported.includes('DO_NOT_EXPORT'),'Never export credentials');
assert.deepEqual(Object.keys(core.parseBackup(exported).keys).sort(),[sw,tr].sort());
assert.equal(core.parseBackup(exported).keys[sw],originalSw,'Preserve exact raw bytes');
const destination=new MemoryStorage({[sw]:'{"words":[{"en":"existing","ru":"не трогать"}]}'});
const before=destination.getItem(sw);
const preview=core.previewRestore(destination,exported);
assert.deepEqual(preview.conflicts,[sw]);
assert.deepEqual(preview.missing,[tr]);
assert.equal(destination.writes.length,0,'Preview may not write');
const result=core.restoreMissing(destination,exported);
assert.deepEqual(result.conflicts,[sw]);
assert.deepEqual(result.imported,[tr]);
assert.equal(destination.getItem(sw),before,'Never overwrite existing progress');
assert.equal(destination.getItem(tr),originalTr,'Import missing exact raw value');
assert.deepEqual(destination.writes,[tr]);
const repeated=core.restoreMissing(destination,exported);
assert.deepEqual(repeated.identical,[tr],'Repeated import must be safe');
assert.equal(destination.writes.length,1,'Repeated import must not write');
assert.throws(()=>core.parseBackup('not json'));
assert.throws(()=>core.parseBackup('{"format":"gostudy-legacy-local-v1","version":1,"keys":{"sb-auth-token":"x"}}'));
assert.throws(()=>core.parseBackup(JSON.stringify({format:'other',version:1,keys:{[sw]:'x'}})));
const ui=fs.readFileSync('legacy-data-safety.html','utf8');
assert.ok(ui.includes('assets/gostudy-legacy-snapshot.js'));
assert.ok(ui.includes('connect-src \'none\''),'Page must not connect to an external service');
for(const f of ['assets/gostudy-legacy-snapshot.js','assets/gostudy-legacy-snapshot-ui.js']){
  require('node:child_process').execFileSync(process.execPath,['--check',f]);
}
console.log('Legacy snapshot: export/restore byte-safe, no overwrites, no auth tokens, offline-only');
