const fs=require('node:fs'),path=require('node:path');
const legacy=new Set(["art-b1-02.html","art-b1-03.html","art-mosaics-b1.html","business-ai-b2c1-02.html","business-ai-b2c1-03.html","business-ai-b2c1.html","business-ai-finance-b2.html","business-ai-finance-b2-02.html","country-house-a2-02.html","country-house-a2-03.html","country-house-a2-04.html","country-house-a2.html","feed-b2-02.html","feed-b2-03.html","feed-b2-04.html","feed-choice-b2.html","finance-b1-02.html","finance-b1.html","first-sales-c1-02.html","first-sales-c1.html","general-english-b1-01.html","general-english-b1-stories-01.html","general-english-b2-01.html","general-english-b2-m01-l01.html","ielts-reading-01.html","ielts-reading-02.html","ielts-reading-03.html","international-sports-trip-b1.html","pharma-c1-02.html","pharma-c1-03.html","pharma-c1.html","sweden-a2-02.html","sweden-a2.html","tiktok-a2.html","travel-a2-02.html","travel-a2-03.html","travel-a2-04.html","travel-b1-02.html","travel-b1-03.html","travel-b2-02.html","travel-b2-03.html","travel-b2-04.html","travel-disruptions-b2.html","travel-weekend-a2.html","turkey-b1.html"]);
const supported=new Set(['choice','match','gap','order','write']);
const ignored=/^(student-|gostudy-|login|index|design-lab)|(?:homework|practice)\.html$/;
let checked=0,old=0;
for(const name of fs.readdirSync('.').filter(n=>n.endsWith('.html')&&!ignored.test(n))){
 const html=fs.readFileSync(name,'utf8');
 const hasShared=html.includes('assets/gostudy-v1-lesson.js');
 const match=html.match(/<script type="application\/json" id="lesson-data">([\s\S]*?)<\/script>/);
 if(!legacy.has(name)){
  if(!hasShared||!match)throw Error(name+': new lesson must use the shared GoStudy lesson component and data');
  const data=JSON.parse(match[1]);
  if(!Array.isArray(data.steps)||!data.steps.length||data.pages)throw Error(name+': new lesson must use data-driven steps, not embedded page HTML');
 }
 if(!hasShared){old++;continue;}
 if(!match)throw Error(name+': lesson-data missing');
 const data=JSON.parse(match[1]);
 if(data.steps){
  const ids=new Set();
  for(const step of data.steps){
   if(!step.id||ids.has(step.id))throw Error(name+': missing or duplicate step ID');
   ids.add(step.id);
   if(step.type&&!supported.has(step.type))throw Error(name+': unsupported exercise type '+step.type);
  }
 }
 checked++;
}
console.log('Shared lesson template validation passed. Shared: '+checked+'; known legacy pages requiring migration: '+old);
