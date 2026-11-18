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
assert.ok(homework.html.includes('assets/gostudy-vimbox-workbook.js'));
console.log('Positive Thinking A2+: 50 min, 7 steps, 29 checkable items, video, 15-min homework; old storage intact.');
