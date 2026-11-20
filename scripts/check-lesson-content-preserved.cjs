// Migration safety contract: zero edits to historical lesson/homework and
// other account content. Works locally with no network or credentials.
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const inventory=JSON.parse(fs.readFileSync('docs/michael-unification-content-lock.json','utf8'));
const failures=[];
for(const {path,sha} of inventory.files){
  if(!fs.existsSync(path)){failures.push(path+' disappeared');continue;}
  const bytes=fs.readFileSync(path);
  const hash=crypto.createHash('sha1').update('blob '+bytes.byteLength+'\0').update(bytes).digest('hex');
  if(hash!==sha)failures.push(path+' modified (lessons/homework cannot change during UI migration)');
}
const targets={
  'student-general-english-b1.html':{course:'general-english-b1',lesson:'general-english-b1-01.html',homework:''},
  'student-tiktok-a2.html':{course:'tiktok-a2',lesson:'tiktok-a2.html',homework:'tiktok-a2-homework.html'},
  'student-travel-b2.html':{course:'travel-b2',lesson:'travel-b2-04.html',homework:'travel-b2-04-practice.html'}
};
for(const [path,expected] of Object.entries(targets)){
  const html=fs.readFileSync(path,'utf8');
  const raw=html.match(/<script type="application\/json" id="cabinet-settings">([^<]+)<\/script>/)?.[1];
  assert.ok(raw,path+' must use the same cabinet settings schema as Michael');
  const config=JSON.parse(raw);
  assert.equal(config.lesson,expected.lesson,path+' must preserve its assigned lesson');
  assert.equal(config.homework,expected.homework,path+' must preserve the homework link');
  assert.ok(html.includes('data-unified-legacy-cabinet'),path+' must preserve the protected access gate');
  assert.ok(html.includes('gostudy-v1-cabinet.css'),path+' must use Michael shared CSS');
  assert.ok(html.includes('gostudy-sync.js'),path+' must use protected RLS course access');
  assert.ok(!html.includes('service_role'),path+' must not contain a service key');
  assert.equal(html.match(/<body\b/g)?.length,1);
}
const auth=fs.readFileSync('assets/gostudy-sync.js','utf8');
assert.ok(auth.includes("document.body.hasAttribute('data-unified-legacy-cabinet')"));
assert.ok(auth.indexOf("if (document.body.hasAttribute('data-unified-legacy-cabinet'))") >
  auth.indexOf("if (!response.data.some(row => row.course === course))"),
  'Approved cabinet must mount only after existing protected course gate');
for(const key of ['gostudy-v1-cabinet.js','gostudy-v1-vocabulary.js'])assert.ok(auth.includes(key));
if(failures.length)throw Error(failures.slice(0,15).join('\n')+(failures.length>15?'\n...':''));
console.log('MICHAEL UNIFICATION: '+inventory.files.length+' original HTML routes unchanged; 3 legacy protected cabinets use the shared Michael UI and preserved lesson/homework links.');
