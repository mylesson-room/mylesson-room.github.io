/* CI gate: new lesson pages must use the shared step-based renderer. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const child=require('node:child_process');
const baseline=new Set(require('./lesson-html-baseline.json').html);
const types=new Set(['choice','match','gap','order','write']);
const files=child.execFileSync('git',['ls-files','-z','--','*.html'],{encoding:'utf8'}).split('\0').filter(Boolean);
let newLessons=0,modern=0,legacy=0;
const errors=[];
for(const path of files){
 const src=fs.readFileSync(path,'utf8');
 const match=src.match(/<script\s+type="application\/json"\s+id="lesson-data">([\s\S]*?)<\/script>/);
 if(!match)continue;
 let config;
 try{config=JSON.parse(match[1]);}catch(e){errors.push(path+': invalid lesson-data JSON');continue;}
 const hasSteps=Array.isArray(config.steps);
 const hasPages=Array.isArray(config.pages);
 if(!hasSteps&&!hasPages){errors.push(path+': lesson-data without pages or steps');continue;}
 if(hasSteps&&hasPages){errors.push(path+': mixed modern and legacy renderers');continue;}
 if(hasPages){
   legacy++;
   if(!baseline.has(path))errors.push(path+': new lesson on obsolete lesson.pages template');
   continue;
 }
 modern++;
 if(!baseline.has(path))newLessons++;
 const seen=new Set();
 for(let i=0;i<config.steps.length;i++){
  const step=config.steps[i];
  if(!step||typeof step!=='object'){errors.push(path+': step '+i+' is not an object');continue;}
  if(!step.id||seen.has(step.id))errors.push(path+': missing or duplicate stable step id '+i);
  seen.add(step.id);
  if(step.type&&!types.has(step.type))errors.push(path+': unsupported exercise type '+step.type);
  if(['choice','match','gap'].includes(step.type)){
    if(!Array.isArray(step.items)||!step.items.length)errors.push(path+': empty interactive items in '+step.id);
    for(const item of step.items||[])if(!Array.isArray(item[1])||!Number.isInteger(item[2])||item[2]<0||item[2]>=item[1].length)errors.push(path+': invalid answer index '+step.id);
  }
  if(step.type==='order'&&(!Array.isArray(step.order)||!Array.isArray(step.items)))errors.push(path+': invalid ordering exercise '+step.id);
 }
}
console.log('GoStudy template contract: '+modern+' shared-step lessons, '+legacy+' existing legacy pages, '+newLessons+' newly added modern lessons');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
