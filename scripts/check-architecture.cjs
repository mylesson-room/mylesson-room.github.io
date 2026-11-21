/* GoStudy architecture contract: run with node scripts/check-architecture.cjs
   Every active student page must consume the canonical shared UI.
   New student cabinets must be added to this contract rather than copy-pasting HTML. */
'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const must=(src,needle,reason)=>assert.ok(src.includes(needle),reason+' — missing '+needle);
const pages=[
 {cabinet:'student-business-ai-finance.html',lesson:'business-ai-finance-b2-02.html'},
 {cabinet:'student-finance-b1.html',lesson:'finance-b1-ai-20261118.html'},
 {cabinet:'student-feed-b2.html',lesson:'korean-wave-b2-20261118.html'},
 {cabinet:'student-pharma.html',lesson:'pharma-ai-evidence-c1-20261118.html'},
 {cabinet:'student-first-sales.html',lesson:'first-sales-c1-03.html'},
 {cabinet:'student-english-placement.html',lesson:'english-placement.html',private:true,client:'assets/gostudy-placement.js',workbook:true},
 {cabinet:'student-ielts-reading.html',lesson:'ielts-reading-04.html',private:true,client:'assets/gostudy-ielts-reading.js'}
];
for(const p of pages){
 const cabinet=read(p.cabinet),lesson=read(p.lesson);
 must(cabinet,'assets/gostudy-v1-cabinet.css',p.cabinet);
 must(cabinet,'assets/gostudy-v1-cabinet.js',p.cabinet);
 must(cabinet,'id="cabinet-settings"',p.cabinet);
 must(lesson,'assets/gostudy-v1-lesson.css',p.lesson);
 if(p.client){
  const client=read(p.client);
  must(lesson,p.client,p.lesson);
  must(lesson,'data-lesson-script="assets/gostudy-v1-lesson.js',p.lesson);
  must(lesson,'data-live-script="assets/gostudy-finance-live.js',p.lesson);
  if(p.workbook){
   must(lesson,'data-workbook-script="assets/gostudy-v1-workbook.js',p.lesson);
   must(lesson,'data-exercises-script="assets/gostudy-v1-exercises.js',p.lesson);
   must(client,'await loadScript(body.dataset.lessonScript)',p.client);
   must(client,'await loadScript(body.dataset.workbookScript)',p.client);
  }else{
   must(client,'loadScript(document.body.dataset.lessonScript)',p.client);
   must(client,'loadScript(document.body.dataset.liveScript)',p.client);
  }
 }else{
  must(lesson,'assets/gostudy-v1-lesson.js',p.lesson);
 }
 if(p.private){
  must(cabinet,'assets/gostudy-private-access.js',p.cabinet);
  must(lesson,'assets/gostudy-private-access.js',p.lesson);
  must(read(p.client),'gostudy_private_lessons',p.client);
  assert.ok(!lesson.includes('For generations, city lighting'), 'IELTS passage leaked into public HTML.');
  assert.ok(!lesson.includes('const qs='), 'IELTS answer keys leaked into public HTML.');
 }
}
// The student's existing English Placement cabinet now publishes a new A2 lesson and its homework
// through the same private, role-gated canonical shell. The diagnostic page stays intact.
const vietnamCabinet=read('student-english-placement.html');
must(vietnamCabinet,'my-trip-to-vietnam-a2.html','Vietnam A2 current lesson');
must(vietnamCabinet,'my-trip-to-vietnam-a2-homework.html','Vietnam A2 assigned homework');
must(vietnamCabinet,'gostudy-v1-cabinet.css','Vietnam A2 shared cabinet');
for(const path of ['my-trip-to-vietnam-a2.html','my-trip-to-vietnam-a2-homework.html']){
 const html=read(path);
 for(const dependency of ['assets/gostudy-v1-lesson.css','assets/gostudy-private-access.js','assets/gostudy-vietnam-a2.js','data-lesson-script="assets/gostudy-v1-lesson.js','data-exercises-script="assets/gostudy-v1-exercises.js','data-workbook-script="assets/gostudy-v1-workbook.js'])
  must(html,dependency,path);
}
cp.execFileSync(process.execPath,['--check','assets/gostudy-vietnam-a2.js'],{stdio:'pipe'});
const vietnam=JSON.parse(read('my-trip-to-vietnam-a2.html').split('id="vietnam-content">')[1].split('</script>')[0]);
const vietnamHomework=JSON.parse(read('my-trip-to-vietnam-a2-homework.html').split('id="vietnam-content">')[1].split('</script>')[0]);
assert.equal(vietnam.steps.length,7);
assert.equal(vietnam.steps.reduce((a,v)=>a+v.minutes,0),60);
assert.equal(vietnamHomework.steps.length,3);
assert.notEqual(vietnam.key,vietnamHomework.key);
assert.equal(vietnam.wordsKey,vietnamHomework.wordsKey);
assert.equal(vietnam.cabinet,'student-english-placement.html');
assert.ok(read('english-placement.html').includes('gostudy-placement.js'),'Old diagnostic lesson must remain');
for(const file of ['assets/gostudy-private-access.js','assets/gostudy-ielts-reading.js','assets/gostudy-placement.js']){
 cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 const source=read(file);
 assert.ok(!/\bpassword\s*:\s*(['"])[^'"]+\1/.test(source),'Hard-coded password found in '+file);
 assert.ok(!source.includes('sb_secret_'),'Supabase secret key found in '+file);
}
const changes=process.env.GOSTUDY_CHANGED_FILES?.split('\n').filter(Boolean)||[];
for(const path of changes){
 if(/^student-[^/]+\.html$/.test(path)&&!pages.some(p=>p.cabinet===path)){
  throw Error('New student cabinet '+path+' is not registered in GoStudy shared architecture contract. Register it and use the canonical components.');
 }
}
console.log('GoStudy architecture guard passed for '+pages.length+' active reference classrooms.');

/* Anastasia's next lesson reuses the private shared loader and existing classroom. */
for(const file of ['art-b1-04.html','art-b1-04-homework.html']){
 const html=read(file);
 for(const dependency of ['assets/gostudy-v1-lesson.css','assets/gostudy-private-access.js','assets/gostudy-finance-private-lesson.js','data-lesson-script="assets/gostudy-v1-lesson.js','data-exercises-script="assets/gostudy-v1-exercises.js','data-workbook-script="assets/gostudy-v1-workbook.js'])
  must(html,dependency,file);
 assert.ok(!html.includes('Artist Mira Lane'),'Private Art text leaked into a public shell');
 assert.ok(html.includes('data-classroom-lesson="art-b1-03.html"'),'Existing Art room must retain vocabulary/chat');
}
for(const file of ['assets/gostudy-finance-assignment.js','assets/gostudy-finance-private-lesson.js'])
 cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
must(read('student-art-b1.html'),'id="lesson-assignment-settings"','Anastasia shared assignment settings');
console.log('Anastasia private shared lesson and assignment guard passed.');

/* Daria uses the approved shared video adapter after private lesson authorization. */
const dariaPage=read('ielts-reading-04.html');
for(const token of ['assets/gostudy-jaas-video.css','data-jaas-video-pilot','data-jaas-scope="ielts-reading"','data-video-script="assets/gostudy-jaas-video.js'])
 must(dariaPage,token,'Daria shared video');
must(read('assets/gostudy-ielts-reading.js'),'await loadScript(document.body.dataset.videoScript)','IELTS private video bootstrap');
must(read('assets/gostudy-jaas-video.js'),'gostudy-jaas-ielts-token','IELTS protected token route');
cp.execFileSync(process.execPath,['--check','assets/gostudy-jaas-video.js'],{stdio:'pipe'});
console.log('Daria shared video architecture guard passed.');
