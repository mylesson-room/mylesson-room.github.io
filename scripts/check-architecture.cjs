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
