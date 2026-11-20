'use strict';
// Static readiness gate. Does NOT replace two-account real device testing.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const michael=read('business-ai-finance-b2-02.html');
const olga=read('sweden-a2-03.html');
const video=read('assets/gostudy-jaas-video.js');
const cabinet=read('student-sweden.html');
const legacy=read('sweden-cabinet-legacy.html');
const studentAssignment=read('assets/gostudy-sweden-assignment-student.js');
const teacherAssignment=read('assets/gostudy-sweden-assignment-teacher.js');
const conditions=[
 ['Michael lesson has a real JaaS video adapter',michael.includes('gostudy-jaas-video.js')&&michael.includes('data-jaas-video-pilot')],
 ['Olga has the identical approved video adapter and CSS',olga.includes('gostudy-jaas-video.js')&&olga.includes('gostudy-jaas-video.css')&&olga.includes('data-jaas-video-pilot')],
 ['JaaS adapter supports a Sweden-specific token scope',video.includes("jaasScope === 'sweden-a2'")&&video.includes('gostudy-jaas-sweden-token')],
 ['Olga JaaS scope is Sweden A2, never finance',olga.includes('data-jaas-scope="sweden-a2"')],
 ['Same approved feed layout',olga.includes('gostudy-michael-feed.css')&&olga.includes('data-premium-feed="michael-v1"')],
 ['Same translator engine flag',olga.includes('data-translate-engine="google-web-pilot"')&&michael.includes('data-translate-engine="google-web-pilot"')],
 ['Same shared lesson dictionary UI engine',olga.includes('gostudy-v1-lesson.js')&&michael.includes('gostudy-v1-lesson.js')],
 ['Same chat transport',olga.includes('gostudy-michael-chat.js')&&michael.includes('gostudy-michael-chat.js')],
 ['Same live room transport',olga.includes('gostudy-finance-live.js')&&michael.includes('gostudy-finance-live.js')],
 ['Original Olga cabinet HTML is preserved',legacy.includes('sweden-a2')&&legacy.length>15000],
 ['Teacher assignment uses authenticated request',teacherAssignment.includes('auth.token()')&&teacherAssignment.includes('gostudy_legacy_teacher_view')],
 ['Student assignment is read-only',studentAssignment.includes('lesson_path')&&!studentAssignment.includes("method:'PATCH'")],
 ['Old lesson 2 remains default',cabinet.includes('"lesson":"sweden-a2-02.html"')],
];
const missing=conditions.filter(([,ok])=>!ok).map(([name])=>name);
for(const [name,ok] of conditions)console.log((ok?'PASS':'BLOCK')+' '+name);
if(missing.length){
 console.error('NOT RELEASE READY: '+missing.length+' static Michael-parity blockers. Real-device acceptance still mandatory.');
 process.exitCode=1;
}else console.log('Static parity passes; still requires manual authenticated desktop/mobile and data recovery QA.');
