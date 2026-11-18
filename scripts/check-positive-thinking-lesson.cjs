/* Verify the new A2+ lesson without auth tokens or live student data. */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
function read(path){
 const html=fs.readFileSync(path,'utf8');
 assert.ok(html.includes('id="lesson-data">'),path+' has lesson JSON');
 return {html,data:JSON.parse(html.split('id="lesson-data">')[1].split('</script>')[0])};
}
const {html,data}=read('positive-thinking-a2.html');
const homework=read('positive-thinking-a2-homework.html');
assert.equal(data.title,'Positive Thinking');
assert.equal(data.level,'General English A2+ · Adults');
assert.equal(data.steps.length,7);
assert.deepEqual(data.steps.map(s=>s.type||'discussion'),['discussion','match','gap','choice','match','choice','write']);
const minutes=data.steps.reduce((total,s)=>total+Number(s.title.split('· ').at(-1).split(' min')[0]),0);
assert.equal(minutes,50);
assert.deepEqual(data.steps.filter(s=>Array.isArray(s.items)).map(s=>s.items.length),[6,6,5,6,6]);
assert.ok(!data.steps.some(s=>['lets talk','let’s talk','cool down'].some(x=>s.title.toLowerCase().includes(x))));
assert.equal(data.steps.find(s=>s.video)?.video.youtubeId,'Un1Weap2e60');
assert.ok(data.steps.find(s=>s.video).source.join(' ').includes('negative reinforcement is NOT the same as punishment'));
assert.equal(homework.data.overview.duration,15);
assert.deepEqual(homework.data.steps.map(s=>s.type),['choice','write']);
const cabinet=fs.readFileSync('student-travel-a2.html','utf8');
const settings=JSON.parse(cabinet.split('id="cabinet-settings">')[1].split('</script>')[0]);
assert.equal(settings.lesson,'positive-thinking-a2.html');
assert.equal(settings.homework,'');
assert.ok(cabinet.includes('assets/gostudy-v1-cabinet.js'));
assert.ok(!cabinet.includes('"student":"Ная"'));
const sync=fs.readFileSync('assets/gostudy-sync.js','utf8');
assert.ok(sync.includes('positive-thinking-a2.html'));
assert.ok(sync.includes('gostudy-positive-thinking-a2-v1'));
assert.ok(sync.includes('gostudy-positive-thinking-a2-homework-v1'));
const renderer=fs.readFileSync('assets/gostudy-vimbox-workbook.js','utf8');
assert.ok(renderer.includes('youtube-nocookie.com/embed'));
assert.ok(renderer.includes('allowfullscreen'));
assert.ok(html.includes('assets/gostudy-vimbox-workbook.js'));
assert.ok(html.includes('data-gostudy-approved-lesson'),'Positive Thinking must opt into approved shared design');
assert.ok(html.includes('assets/gostudy-approved-lesson-layout.css'),'Approved design stylesheet must load');
const approved=fs.readFileSync('assets/gostudy-approved-lesson-layout.css','utf8');
for(const required of ['grid-template-columns:minmax(265px,32%) minmax(0,1fr)','grid-column:1;grid-row:1','grid-column:2;grid-row:1','@media(max-width:800px)']) assert.ok(approved.includes(required),'Missing approved two-column/responsive layout contract: '+required);
assert.ok(html.includes('assets/gostudy-sync.js'),'Realtime sync script must not be removed');
assert.ok(html.includes('assets/gostudy-glass-vocabulary.js'),'Original vocabulary integration must remain');
assert.ok(html.includes('assets/gostudy-classroom-ui.js'),'Original classroom rendering must remain');
assert.ok(html.includes('data-finance-live') && html.includes('data-preserve-workbook-progress'),'Shared room must preserve existing cloud progress');
assert.ok(html.includes('data-classroom-course="travel_a2"'),'Shared room must use explicit course scope');
assert.ok(html.includes('data-classroom-lesson="positive-thinking-a2.html"'),'Shared room must use explicit lesson scope');
assert.ok(html.includes('assets/gostudy-approved-lesson-tools.js'),'Chat and Telemost shared tools must load');
assert.ok(html.includes('assets/gostudy-finance-live.js'),'Existing RLS-guarded room transport must load');
const tools=fs.readFileSync('assets/gostudy-approved-lesson-tools.js','utf8');
for(const required of ['finance-ready','finance-event','FinanceLive.send','FinanceLive?.connected()','telemost.yandex.ru/']) assert.ok(tools.includes(required),'Shared tools missing '+required);
assert.ok(!tools.includes('localStorage.setItem'),'Shared tools must not overwrite progress or vocabulary');


assert.ok(homework.html.includes('assets/gostudy-vimbox-workbook.js'));
console.log('Positive Thinking A2+: 50 min, 7 steps, 29 checkable items, video, 15-min homework; old storage intact.');
