/* Exact-content and role separation guard for pending Olga full migration.
   Browser-only historical progress is never erased or silently imported.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const sha=s=>{const bytes=Buffer.from(s,'utf8');return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
const original={
 'sweden-a2.html':'edd099c80c681f4cdf8a55885d3a797e4da0285f',
 'sweden-a2-01-homework.html':'c67fd2e3c4b2bc89feb27274af67f05820bef687',
 'sweden-a2-02.html':'40aa2e65f12860202955864e6a0a757fa3c300ed',
 'sweden-a2-02-homework.html':'bcc02aa8f4b006b5ddb087b6e42e27ce9779a22a',
 'sweden-cabinet-legacy.html':'6fe82b8e3482edc1ab483331d39fb235fa6cdd87'
};
for(const [file,old] of Object.entries(original))
 assert.equal(sha(read(file)),old,file+': historical content, answer keys and localStorage must remain byte-identical');
assert.equal(sha(read('business-ai-finance-b2-02.html')),'0d4e2c78edb8fda2103fa4b7f83cff54a819c51f',
 'Michael lesson reference changed unexpectedly');
const cabinet=read('student-sweden.html');
assert.ok(cabinet.includes('assets/gostudy-v1-cabinet.js') &&
 cabinet.includes('assets/gostudy-michael-experiments.js') &&
 cabinet.includes('"student":"Ольга"') &&
 cabinet.includes('assets/gostudy-sweden-assignment-student.js'),
 'Olga student cabinet must reuse Michael UI and cloud assignment resolver');
const student=read('assets/gostudy-sweden-assignment-student.js');
assert.ok(student.includes("show('sweden-a2-02.html')"),'Previous lesson 2 MUST remain default');
assert.ok(student.includes("details")||student.includes('sweden-cabinet-legacy.html'),'Historic cabinet link missing');
assert.ok(!/method:\s*'PATCH'|method:\s*'DELETE'|gostudy_sweden_set_lesson/.test(student),
 'student UI must never mutate assignment');
const teacher=read('assets/gostudy-sweden-assignment-teacher.js');
assert.ok(teacher.includes('gostudy_legacy_teacher_view') &&
 teacher.includes('gostudy_sweden_set_lesson') &&
 teacher.includes('p_course:\'sweden_a2\''),
 'teacher page must verify course and use atomic authorized RPC');
assert.ok(!teacher.includes('method:\'PATCH\''),'No insecure browser-side direct table update');
const sql=read('docs/sql/olga-sweden-selection-review-only.sql');
for(const token of ['REVIEW ONLY','gostudy_sweden_set_lesson','SECURITY DEFINER','gostudy_classroom_rooms',
 'sweden-a2-02.html','sweden-a2-03.html','gostudy_classroom_member','GRANT SELECT',
 'REVOKE ALL'])assert.ok(sql.includes(token),'Pending RLS migration missing '+token);
assert.ok(!/GRANT\s+INSERT|GRANT\s+DELETE|GRANT\s+UPDATE/i.test(sql),
 'Students must not be able to write lesson assignments directly');
const lesson=read('sweden-a2-03.html');
const homework=read('sweden-a2-03-homework.html');
assert.ok(lesson.includes('data-jaas-video-pilot') &&
 lesson.includes('data-jaas-scope="sweden-a2"')&&lesson.includes('gostudy-jaas-video.js'),
 'New Sweden lesson must use the identical approved Michael video controls, Sweden-only token scope');
assert.ok(lesson.includes('gostudy-jaas-video.css'),'Approved Michael video controls CSS missing');
assert.ok(homework.includes('data-design2-homework')&&!homework.includes('data-sweden-jaas-v1'),
 'Homework must not present fake camera/mic buttons');
const video=read('assets/gostudy-jaas-video.js');
assert.ok(video.includes("jaasScope === 'sweden-a2'")&&
 video.includes('gostudy-jaas-sweden-token')&&
 video.includes('^gostudy-sweden-a2-')&&
 video.includes('if (b1Stories || countryHouse || swedenA2) return auth.classroomStudent || null;')&&
 video.includes('videoConferenceJoined'), 'Approved shared Michael video must route only Sweden course tokens for Olga');
assert.ok(video.includes('gostudy_finance_room'),
 'Existing Michael finance room must remain unchanged in shared video adapter');
const listening=read('assets/gostudy-sweden03-listening.js');
assert.ok(listening.includes('MutationObserver')&&listening.includes('Transcript'),
 'Transcript/listening must survive asynchronous workbook loading');
console.log('OLGA CONTRACT PASS: old Sweden files unchanged; Michael shell; video controls; teacher-only course RPC; old lesson 2 default; distinct lesson 3 and homework.');
