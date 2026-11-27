'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {build,sourcePath,lessonPath,namespace}=require('./michael-classroom-config.cjs');
const read=p=>fs.readFileSync(p,'utf8');
const original=JSON.parse(read(sourcePath).match(/id="lesson-data">([\s\S]*?)<\/script>/)[1]);
const config=build();
for(const field of ['pages','labels','vocab','reading','gaps','advice','warmupQuestions','homeworkPrompt','wordsKey','cabinet'])assert.deepEqual(config[field],original[field],field+' changed');
assert.equal(config.pages.length,7);assert.equal(config.vocab.length,8);assert.equal(config.reading.length,4);assert.equal(config.gaps.length,6);
assert.notEqual(config.key,original.key);assert.equal(config.answerNamespace,namespace);
const flatten=x=>Array.isArray(x)?x.flatMap(flatten):x&&typeof x==='object'?Object.values(x).flatMap(flatten):[x];
const ids=flatten(config.exerciseIds),oldIds=new Set(flatten(original.exerciseIds));
assert.equal(new Set(ids).size,ids.length);assert.ok(ids.every(x=>x.startsWith(namespace)&&!oldIds.has(x)));
for(const file of [lessonPath,'business-ai-finance-b2-02-new-homework.html']){
 const source=read(file);assert.ok(source.includes('gostudy-private-access.js'));assert.ok(source.includes('gostudy-michael-classroom.js'));
 assert.ok(!source.includes('id="lesson-data"'));assert.ok(!source.includes('Northbridge'));assert.ok(!source.includes('€65,000'));
}
const catalog=read('assets/gostudy-finance-assignment.js');assert.ok(catalog.includes("initial:'business-ai-finance-b2-02.html'"));
assert.ok(catalog.includes("'business-ai-finance-b2-02-new.html':{title:'NEW — AI in Finance — Lesson 2'"));
// Execute the existing workbook's event handler to verify namespace replay isolation.
const workbook=read('assets/gostudy-v1-workbook.js');
const handler=workbook.slice(workbook.indexOf('document.addEventListener("finance-event",'),workbook.indexOf('window.GoStudyLessonControls.bindChat();'));
function replay(ns,key){
 let callback;const received=[];
 const context={document:{addEventListener:(_,fn)=>{callback=fn;}},answerNamespace:ns,allowedKeys:new Set(['gap0']),workbook:null,pending:new Map(),localEdits:new Map(),writingFields:new Map(),applyAnswer:(...v)=>received.push(v),$:()=>({}),sections:[],LESSONS:[],FinanceLive:{teacher:()=>false}};
 vm.runInNewContext(handler,context);callback({detail:{kind:'answer',payload:{key,value:'stress test'},initial:true}});return received;
}
assert.equal(replay(namespace,'gap0').length,0);assert.equal(replay(namespace,namespace+'gap0').length,1);assert.equal(replay('',namespace+'gap0').length,0);
// No schema changes, assignments or saved state are performed by the config builder.
assert.ok(!read('scripts/michael-classroom-config.cjs').includes('localStorage'));
console.log('PASS: exact 7-page content, isolated IDs, bidirectional answer replay isolation, shared dictionary, private shells, unchanged default lesson.');
// Theme changes only attributes and account-scoped preferences; no video or event API.
const controller=read('assets/gostudy-michael-classroom.js');
const themeFunction=controller.slice(controller.indexOf('  function mountTheme()'),controller.indexOf('  function compose()'));
const preferences=new Map();
function themeFor(user){
 const root={dataset:{}},meta={},buttons=[];
 const context={auth:{userId:()=>user},localStorage:{getItem:k=>preferences.get(k),setItem:(k,v)=>preferences.set(k,v)},document:{documentElement:root,createElement:()=>({setAttribute(){},addEventListener(_,fn){this.click=fn;}}),querySelector:s=>s==='.header-right'?{append:b=>buttons.push(b)}:meta}};
 vm.runInNewContext(themeFunction+';mountTheme();',context);
 return {root,button:buttons[0]};
}
const a=themeFor('teacher'),b=themeFor('student');assert.equal(a.root.dataset.classroomTheme,'light');a.button.click();assert.equal(a.root.dataset.classroomTheme,'dark');assert.equal(b.root.dataset.classroomTheme,'light');assert.equal(themeFor('teacher').root.dataset.classroomTheme,'dark');
console.log('PASS: independent theme preferences and reload restoration.');
(async()=>{
 async function denied(uid,row,search=''){
  const status={textContent:''};let requests=0,redirect=null;
  const context={window:{GoStudyPrivateAccess:{userId:()=>uid,ready:Promise.resolve(),request:async()=>{requests++;return {ok:true,data:row?[row]:[]}}}},document:{addEventListener(){},querySelector:()=>status},location:{search,href:'https://fluenvia.ru/business-ai-finance-b2-02-new.html'+search,replace:u=>redirect=u},URL,URLSearchParams,Error,Promise};
  vm.runInNewContext(controller,context);await new Promise(resolve=>setImmediate(resolve));return {status:status.textContent,requests,redirect};
 }
 const row={student_id:'student',teacher_id:'teacher',lesson_payload:config};
 assert.equal((await denied(null,row)).requests,0);
 assert.match((await denied('other',row)).status,/нет доступа/);
 assert.match((await denied('student',row,'?classStudent=student')).status,/Неверно/);
 assert.match((await denied('teacher',row,'?classStudent=other')).status,/Неверно/);
 assert.match((await denied('teacher',row)).redirect,/classStudent=student/);
 assert.match((await denied('student',null)).status,/нет доступа/);
 console.log('PASS: signed-out, wrong-account and wrong-student rejection; canonical teacher preview redirect.');
})().catch(error=>{console.error(error);process.exitCode=1;});
