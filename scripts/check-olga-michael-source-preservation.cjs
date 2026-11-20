/* Source lock for Olga Sweden A2 migration (5 legacy routes).
 * No education/content changes or browser-local data-key transformations allowed.
 */
'use strict';
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const read=f=>readFileSync(f,'utf8');
const blob=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const originals={
 'student-sweden.html':'6fe82b8e3482edc1ab483331d39fb235fa6cdd87',
 'sweden-a2.html':'edd099c80c681f4cdf8a55885d3a797e4da0285f',
 'sweden-a2-01-homework.html':'c67fd2e3c4b2bc89feb27274af67f05820bef687',
 'sweden-a2-02.html':'40aa2e65f12860202955864e6a0a757fa3c300ed',
 'sweden-a2-02-homework.html':'bcc02aa8f4b006b5ddb087b6e42e27ce9779a22a'
};
const css='<link rel="stylesheet" href="assets/gostudy-olga-michael.css?v=1">';
const js='<script src="assets/gostudy-olga-michael-shell.js?v=1"></script>';
const videoCSS='<link rel="stylesheet" href="assets/gostudy-jaas-video.css?v=two-tiles-20261119-1">';
const videoJS='<script src="assets/gostudy-sync.js?v=olga-v1"></script><script src="assets/gostudy-olga-jaas-video.js?v=1"></script>';

for(const [file,sha] of Object.entries(originals)){
 const source=read(file);
 const kind=file==='student-sweden.html'?'cabinet':file.includes('homework')?'homework':'lesson';
 const attr='data-olga-michael data-olga-kind="'+kind+'" '+(kind==='homework'?'data-olga-homework ':'');
 assert.equal(source.split(css).length,2,file+' must import exactly one CSS bridge');
 assert.equal(source.split(js).length,2,file+' must import exactly one UI script');
 assert.ok(source.includes('<body '+attr),file+' body must opt in exactly once');
 const live=kind==='lesson';
 if(live){
  assert.equal(source.split(videoCSS).length,2,file+' exact shared Michael JaaS CSS');
  assert.equal(source.split(videoJS).length,2,file+' dedicated Sweden JaaS scripts');
  assert.ok(source.includes('data-jaas-scope="sweden-a2"'),file+' Sweden-only video room');
 }
 const prev=source
   .replace(css+(live?videoCSS:'')+'</head>','</head>')
   .replace('<body '+(live?'data-olga-michael data-olga-kind="lesson" data-finance-live data-olga-jaas-video data-jaas-scope="sweden-a2" ':attr),'<body')
   .replace(js+(live?videoJS:'')+'</body>','</body>');
 assert.equal(blob(prev),sha,file+' original inline lesson material/state/javascript must be bit-exact');
}
const shell=read('assets/gostudy-olga-michael-shell.js');
const cssText=read('assets/gostudy-olga-michael.css');
assert.ok(shell.includes('gostudy-sweden-a2-v2')&&shell.includes('gostudy-sweden-a2-lesson02-v1'));
assert.ok(shell.includes('gostudy-sweden-a2-homework01-v1')&&shell.includes('gostudy-sweden-a2-homework02-v1'));
assert.ok(!/localStorage\.setItem|localStorage\.removeItem|fetch\(|supabase|service_role|GoStudyFinanceAuth/.test(shell),
 'UI adapter may export local values but must never overwrite data, access account storage, or impersonate auth');
assert.ok(cssText.includes('body[data-olga-michael]'), 'CSS must be route scoped');
assert.equal(blob(read('business-ai-finance-b2-02.html')),'0d4e2c78edb8fda2103fa4b7f83cff54a819c51f',
 'Michael reference must not change');
const video=read('assets/gostudy-olga-jaas-video.js');
const server=read('supabase/functions/gostudy-jaas-sweden-token/index.ts');
assert.ok(video.includes('/functions/v1/gostudy-jaas-sweden-token') &&
  video.includes('data-olga-jaas-video') && video.includes('auth.classroomStudent || null'),
 'Olga video must use Sweden-only signed token and authenticated teacher/student identities');
assert.ok(!video.includes("'/functions/v1/gostudy-jaas-token'"),
 'Do not copy Michael finance endpoint into Olga');
assert.ok(server.includes('gostudy_legacy_teacher_view') &&
  server.includes("p_course:'sweden_a2'") && server.includes("row?.course === 'sweden-a2'"),
 'Video issuer must validate teacher roster and student enrollment for Sweden A2');
assert.ok(!server.includes('service_role')&&!server.includes('INSERT INTO')&&!server.includes('SUPABASE_SERVICE_ROLE_KEY'),
 'Video token must not bypass RLS or mutate data');
console.log('OLGA SOURCE GUARD PASS: 5 legacy source blobs unchanged, old keys preserved, JaaS token scoped to Sweden');
