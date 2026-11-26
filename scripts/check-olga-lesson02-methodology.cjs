/* Methodology and functional integrity guard for Olga Sweden A2 Lesson 02.
 * Grading is a documented editorial rubric, not a proof of student outcomes.
 * Preserve all previous answer IDs / storage and integrated audio while improving A2 teaching.
 */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const lesson=fs.readFileSync('sweden-a2-02.html','utf8');
const homework=fs.readFileSync('sweden-a2-02-homework.html','utf8');
const scripts=(html)=>[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(match=>match[1]).filter(Boolean);
for(const [label,html] of [['lesson',lesson],['homework',homework]]){
 const inline=scripts(html);
 assert.ok(inline.length>0,label+' has no inline script');
 inline.forEach((source,index)=>assert.doesNotThrow(
  ()=>new vm.Script(source,{filename:label+'-inline-'+index+'.js'}),
  label+' inline script '+index+' must compile'));
 assert.ok(html.includes('gostudy-sweden-a2-'),label+' original storage namespace retained');
}
const wordIndex=lesson.indexOf('const words=');
assert.ok(wordIndex>0);
const wordsList=lesson.slice(wordIndex,wordIndex+1500);
const expected=['eat in','take away','a receipt','an entrance','around the corner','a forecast'];
for(const word of expected)assert.ok(wordsList.includes('"'+word+'"'),'original word index/translation missing: '+word);
const targetFunction=lesson.slice(lesson.indexOf('function feedWords()'),lesson.indexOf('function feedReading()'));
assert.ok(targetFunction.includes('active=[0,1,3,4,5,7]'),'six active vocabulary targets must be in lesson');
assert.ok(targetFunction.includes('Optional extra vocabulary'),'secondary words must be optional');
assert.ok(targetFunction.includes('word1')&&targetFunction.includes('word2')&&
 targetFunction.includes('word3')&&targetFunction.includes('word4'),'controlled choice keys retained/expanded');
const pages=lesson.match(/const pages=(\[\[.*?\]\]);\s*function area/);
assert.ok(pages,'eight lesson pages and time budget missing');
const steps=JSON.parse(pages[1]);
assert.equal(steps.length,8,'lesson has exactly 8 sections');
const times=steps.map(x=>x[2]);assert.deepEqual(times,[5,7,6,7,6,10,6,3]);
assert.equal(times.reduce((a,b)=>a+b,0),50,'lesson must fit into 50 minutes');
for(const id of ['word1','word2','read1','read2','read3','listen1','listen2','listen3','gram1','gram2','gram3','gram4'])
 assert.ok(lesson.includes('"'+id+'"'),'previous saved lesson answer key missing: '+id);
for(const id of ['word3','word4','listenGist','readPersonal','gramPastPersonal','gramFuturePersonal',
                  'cafeRoleplayNotes','planSunshine','planRain'])
 assert.ok(lesson.includes("'"+id+"'")||lesson.includes('"'+id+'"'),'new lesson task missing: '+id);
for(const id of ['hw1','hw2','hw3','hw4','hw5','hw6','hw7','hw8','hw9','hw10','hw11','hw12'])
 assert.ok(homework.includes('"'+id+'"'),'old saved homework answer key must remain: '+id);
for(let i=1;i<=8;i++)assert.ok(homework.includes('"review'+i+'"'),'new homework review question '+i+' missing');
assert.ok(homework.includes("homeworkTravelMessage"),'free production homework task missing');
assert.ok(homework.includes('Optional extra practice'),'old homeworks retained in optional section');
for(const word of expected)assert.ok(homework.includes(word),'homework must reuse expression '+word);
assert.ok(lesson.includes('data:audio/mpeg;base64,'),'original listening audio must remain');
const m=lesson.match(/data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)/);
assert.ok(m,'lesson audio base64 missing');
const audio=Buffer.from(m[1],'base64');
assert.ok(audio.length>90000,'audio lost or truncated: '+audio.length);
assert.ok(audio.subarray(0,3).toString()==='ID3' ||
  audio[0]===0xff,'lesson audio has a recognizable MP3 header');
assert.ok(lesson.includes('Yesterday was my first full day in Stockholm.'),
 'actual listening transcript must remain');
assert.ok(lesson.includes('What was the main story about?'),
 'listening gist task missing');
assert.ok(lesson.includes('Round 2 (4 min)')&&lesson.includes('feedback'),
 'café has two authentic speaking rounds plus feedback');
assert.ok(lesson.includes('four of today\'s six expressions'),
 'exit task must explicitly assess six-phrase outcomes');
assert.ok(lesson.includes('gostudy-sweden-a2-lesson02-v1'),
 'existing lesson storage key may not change');
assert.ok(homework.includes('gostudy-sweden-a2-homework02-v1'),
 'existing homework storage key may not change');
console.log('OLGA METHOD CONTRACT PASS: 50 min/6 active phrases/8 phases/audio/old answer IDs/homework continuation');
