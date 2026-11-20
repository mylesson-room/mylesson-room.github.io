// Zero-PII migration census: discover every active HTML page and the actual
// engine powering its interface. This is not permission to guess assignments.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const names=fs.readdirSync('.').filter(x=>x.endsWith('.html')).sort();
const cabinets=names.filter(x=>x.startsWith('student-')&&!x.startsWith('student-english-lesson'));
const system=new Set(['index.html','login.html','gostudy.html','gostudy-teacher.html','gostudy-account.html','gostudy-ui-kit.html','design-lab.html']);
const engineOf=(file,html)=>{
  if(file.startsWith('student-')){
    if(html.includes('data-unified-legacy-cabinet'))return 'michael-gated-new';
    if(html.includes('data-unified-b1-cabinet'))return 'michael-gated-existing';
    if(html.includes('gostudy-v1-cabinet.js'))return 'michael-shared';
    return 'independent-legacy';
  }
  if(html.includes('gostudy-v1-lesson.js'))return 'michael-v1-lesson';
  if(html.includes('gostudy-vimbox-workbook.js'))return 'legacy-vimbox';
  if(html.includes('gostudy-lesson-room.js') || html.includes('gostudy-lesson-room.css'))return 'legacy-room';
  if(html.includes('data-ielts-private-lesson'))return 'private-ielts';
  if(html.includes('gostudy-glass-vocabulary.js'))return 'legacy-glass';
  return 'inline-or-other';
};
const rows=names.map(file=>{
 const html=fs.readFileSync(file,'utf8');
 return {
   file,kind:file.startsWith('student-')?'cabinet':system.has(file)?'system':'lesson-or-homework',
   engine:engineOf(file,html),
   hasDictionary:html.includes('gostudy-v1-vocabulary.js')||html.includes('gostudy-glass-vocabulary.js'),
   hasSharedVideo:html.includes('gostudy-jaas-video.js'),
   hasSharedChat:html.includes('gostudy-michael-chat.js'),
   oldLegacy:!html.includes('gostudy-v1-lesson.js')&&!html.includes('gostudy-v1-cabinet.js')
 });
});
const totals={};
for(const row of rows){
 const key=row.kind+'/'+row.engine;
 totals[key]=(totals[key]||0)+1;
}
assert.equal(cabinets.length,18,'Inventory must include every one of the 18 historical student cabinets');
for(const filename of cabinets)assert.ok(rows.some(row=>row.file===filename&&row.kind==='cabinet'));
const key='--json';
if(process.argv.includes(key))process.stdout.write(JSON.stringify({totals,rows},null,2)+'\n');
else console.log('COVERAGE '+names.length+' HTML routes, '+cabinets.length+' dashboards; '+Object.entries(totals).map(([key,n])=>key+'='+n).join('; '));
