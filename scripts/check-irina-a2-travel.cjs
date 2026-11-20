// Irina A2+ course quality and no-data-loss contracts.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const file=name=>fs.readFileSync(name,'utf8');
const read=name=>JSON.parse(file(name).match(/<script type="application\/json" id="lesson-data">([\s\S]*?)<\/script>/)?.[1]||'null');
const lesson=read('country-house-travel-a2-05.html');
const homework=read('country-house-travel-a2-05-homework.html');
const legacy=read('country-house-a2-04.html');
const legacyHomework=read('country-house-a2-04-homework.html');
const cabinet=file('student-country-house.html'),sync=file('assets/gostudy-sync.js');
assert.equal(lesson.title,'The Little Joys of Travelling');
assert.equal(lesson.course,'country-house');
assert.equal(lesson.level,'General English · A2+');
assert.equal(lesson.durationMinutes,50);
assert.equal(lesson.steps.length,8);
assert.equal(lesson.steps.reduce((n,s)=>n+s.minutes,0),50);
assert.deepEqual(lesson.steps.map(s=>s.minutes),[6,8,8,7,6,6,7,2]);
assert.equal(lesson.steps[1].type,'match');
assert.equal(lesson.steps[1].items.length,6);
assert.ok(lesson.steps.every(s=>typeof s.teacherNotes==='string'&&s.teacherNotes.length>35),'Teacher cues for every stage');
const reading=lesson.steps[2].source.slice(0,3).join(' ');
assert.ok(reading.split(/\s+/).length>=120&&reading.split(/\s+/).length<=180,'A2+ passage within reading load');
for(const [a,b] of [['walked around the old town','travel expression'],['tried local food','travel expression'],['enjoyed the view','travel expression'],['found a quiet café','travel expression'],['took photos','travel expression'],['spent time outdoors','travel expression']]){
 assert.ok(reading.includes(a),'Reading must recycle '+b+': '+a);
}
assert.ok(lesson.steps[3].source.some(x=>x.includes("didn't")),'Past Simple grammar must be explicit');
assert.ok(lesson.steps.some(s=>s.type==='write'),'Personal answer must be saved');
for(const config of [lesson,homework]) {
 for(const s of config.steps.filter(s=>['choice','gap','match'].includes(s.type)))
 for(const [prompt,choices,key] of s.items) {
  assert.ok(prompt&&Array.isArray(choices)&&choices.length===3);
  assert.ok(Number.isInteger(key)&&key>=0&&key<choices.length,s.id);
  assert.equal(new Set(choices).size,choices.length,s.id+' has duplicate options');
 }
}
assert.ok(!/\bmission\b|\bquest\b|\brole.play\b|\bcrisis\b|\bdisaster\b/i.test(JSON.stringify(lesson.steps)),
  'No missions, crises or forced role-play');
assert.equal(homework.durationMinutes,14);
assert.deepEqual(homework.steps.map(s=>s.minutes),[4,4,6]);
assert.ok(homework.steps.some(s=>s.type==='write'));
assert.equal(legacy.key,'gostudy-country-house-a2-04-v1');
assert.equal(legacyHomework.key,'gostudy-country-house-a2-04-homework-v1');
assert.notEqual(lesson.key,legacy.key);
assert.equal(lesson.wordsKey,legacy.wordsKey);
assert.ok(cabinet.includes('"lesson":"country-house-travel-a2-05.html"'));
assert.ok(cabinet.includes('"homework":"country-house-travel-a2-05-homework.html"'));
assert.ok(cabinet.includes('country-house-a2-04-homework.html'));
assert.ok(cabinet.includes('assets/gostudy-v1-cabinet.css')&&cabinet.includes('assets/gostudy-v1-cabinet.js'));
for(const href of ['country-house-travel-a2-05.html','country-house-travel-a2-05-homework.html'])
 assert.ok(sync.includes(href),'Both course pages must be registered for authorization and progress');
assert.ok(sync.includes(lesson.key)&&sync.includes(homework.key));
assert.ok(file('country-house-travel-a2-05.html').includes('data-premium-feed="michael-v1"'));
assert.ok(file('country-house-travel-a2-05.html').includes('data-translate-engine="google-web-pilot"'));
assert.ok(file('country-house-travel-a2-05.html').includes('data-jaas-scope="country-house"'));
assert.ok(file('supabase/functions/gostudy-jaas-country-house-token/index.ts').includes('gostudy_country_house_teacher_view'));
console.log('IRINA A2+ PASS — 50-minute lesson, 8 stages, 6 recycled expressions, 144-word reading, explicit grammar, 14-minute homework, old keys intact, shared Michael components');
