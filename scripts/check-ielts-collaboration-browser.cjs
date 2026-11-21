'use strict';
// Isolated browser accounts and synthetic network. Hosted DB permissions are tested separately in a rolled-back transaction.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const student='6af5764c-487a-448f-a21e-8744dc5a2322',teacher='acf2f6a1-f38b-45ef-836d-6cc9a9a5a832',room='0973bfd3-5594-4237-983e-42fb6eb632e3';
const fixture={title:'Synthetic IELTS QA',mission:'Compare evidence.',reading:'<p>Bright lamps guide birds after midnight.</p>',summary:'The change happened after (9).',questions:[['1','features','Which paragraph?','A','Paragraph A.'],['5','claims','All lamps were removed.','NO','They were changed.'],['9','completion','The change happened after ___.','midnight','After midnight.']],words:[['glare','блики']]};
const server=http.createServer(async(req,res)=>{const p=path.resolve('.'+new URL(req.url,'http://local').pathname);if(!p.startsWith(process.cwd()+path.sep))return res.writeHead(403).end();try{const data=await fs.readFile(p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);}catch{res.writeHead(404).end();}});
const wait=async(fn,label)=>{for(let n=0;n<150;n++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+label);};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.GOSTUDY_CHROME||undefined,headless:true,args:['--no-sandbox']});
 try{for(const mobile of [false,true]){
  const events=[],words=new Map(),progress=new Map(),translations=[],errors=[];let seq=0;
  async function context(id){
   const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
   await ctx.addInitScript(({id,student})=>{const session=JSON.stringify({user:{id},access_token:'qa-'+id,expires_at:Date.now()+3600000});sessionStorage.setItem('gostudy-cloud-session-v1',session);localStorage.setItem(id===student?'gostudy-student-session-v1':'gostudy-teacher-session-v1',session);},{id,student});
   await ctx.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),p=u.pathname;
    if(u.origin===base)return route.continue();
    if(u.hostname==='translate.googleapis.com'){const q=u.searchParams.get('q');translations.push(q);return route.fulfill({json:[[[q==='lamps'?'лампы':q==='birds'?'птицы':'полезное слово',q,null,null]]]});}
    if(!u.hostname.endsWith('.supabase.co'))return route.abort();
    const headers={'access-control-allow-origin':base,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    const json=(data,status=200)=>route.fulfill({status,json:data,headers});
    assert.equal(req.headers().authorization,'Bearer qa-'+id);
    if(p==='/auth/v1/user')return json({id});
    if(p.endsWith('/gostudy_private_lessons'))return json([{lesson_payload:fixture}]);
    if(p.endsWith('/gostudy_classroom_rooms'))return json([{id:room,student_id:student,teacher_id:teacher}]);
    if(p.endsWith('/gostudy_classroom_events'))return json(events.filter(e=>e.seq>Number((u.searchParams.get('seq')||'gt.0').slice(3))));
    if(p.endsWith('/rpc/gostudy_classroom_send')){
     const b=req.postDataJSON();assert.equal(b.p_room,room);
     events.push({seq:++seq,actor:id,kind:b.p_kind,payload:b.p_payload});
     if(b.p_kind==='word'){const w=b.p_payload;words.set(w.en.toLowerCase(),{word_key:w.en.toLowerCase(),english:w.en,russian:w.ru});}
     return json(true);
    }
    if(p.endsWith('/gostudy_vocabulary_items')){
     if(req.method()==='POST'){assert.equal(id,student,'Teacher never bypasses owner-only vocabulary RLS');for(const w of req.postDataJSON())words.set(w.word_key,w);return route.fulfill({status:204,headers});}
     return json([...words.values()]);
    }
    if(p.endsWith('/gostudy_progress')){
     if(req.method()==='POST'){const b=req.postDataJSON();assert.equal(b.user_id,id,'Do not overwrite another user progress');progress.set(id,b);return route.fulfill({status:204,headers});}
     return json(progress.has(id)?[progress.get(id)]:[]);
    }
    if(p.includes('gostudy_finance_room'))throw Error('Wrong room lookup');
    return json([]);
   });
   return ctx;
  }
  const tc=await context(teacher),sc=await context(student);
  try{
   const tp=await tc.newPage(),sp=await sc.newPage();for(const p of [tp,sp])p.on('pageerror',e=>errors.push(e.message));
   await tp.goto(base+'/ielts-reading-04.html?classStudent='+student);await sp.goto(base+'/ielts-reading-04.html');
   for(const p of [tp,sp])await p.locator('#finance-live-status').getByText('Онлайн · общая комната',{exact:true}).waitFor();
   await wait(()=>Promise.resolve(events.some(e=>e.actor===student&&e.payload.action==='presence')),'student presence');
   await sp.locator('#reading-hypothesis').fill('Preserve my existing answer');
   await tp.locator('#openLessonDictionary').click();await tp.locator('#dictionaryAddForm').waitFor();
   await tp.locator('#dictionarySource').fill('signal');await tp.locator('#dictionaryTranslation').fill('сигнал');
   await tp.locator('#dictionaryAddForm').locator('button[type=submit]').click();
   await wait(()=>Promise.resolve(words.has('signal')),'teacher cloud word');
   await sp.locator('#finance-toast').getByText('signal',{exact:true}).waitFor();
   await tp.locator('#myWords').getByText('signal',{exact:true}).waitFor();
   await tp.locator('#lessonDictionary form[method=dialog] button').click();
   await tp.locator('#next').click();await tp.locator('#lessonPages .page').nth(1).waitFor({state:'visible'});
   assert.ok(await sp.locator('#reading-hypothesis').isVisible(),'Teacher browsing alone does not move the learner');
   await tp.locator('#moveStudent').click();await sp.locator('#lessonPages .page').nth(1).waitFor({state:'visible'});
   await tp.locator('#moveStudent').waitFor({state:'hidden'});
   await sp.locator('#back').click();await sp.locator('#reading-hypothesis').waitFor({state:'visible'});
   assert.equal(await sp.locator('#reading-hypothesis').inputValue(),'Preserve my existing answer');
   assert.ok(await tp.locator('#lessonPages .page').nth(1).isVisible(),'Learner browsing does not move teacher');
   await tp.locator('#moveStudent').waitFor({state:'visible'});
   // Select actual reading text; the shared Michael popup must translate the selection itself.
   await tp.locator('.gostudy-ielts-passage p').click();
   await tp.locator('.gostudy-ielts-passage p').evaluate(node=>{const text=node.firstChild,at=text.textContent.indexOf('lamps'),range=document.createRange();range.setStart(text,at);range.setEnd(text,at+5);const s=getSelection();s.removeAllRanges();s.addRange(range);node.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
   await wait(()=>tp.locator('#selectionTarget').inputValue().then(v=>v==='лампы'),'Google selection translation');
   assert.ok(translations.includes('lamps'),'Google receives the exact selected word');
   assert.ok(!translations.some(q=>q.includes('Bright lamps')),'No old sentence-difference translation');
   await tp.locator('#selectionSave').click();await sp.locator('#finance-toast').getByText('lamps',{exact:true}).waitFor();
   await wait(()=>Promise.resolve(words.has('lamps')),'selected word persists');
   assert.equal(await tp.locator('#selectionSave').textContent(),'✓');
   await tp.keyboard.press('Escape');
   // A second device has no classroom event history/local vocabulary and must still get cloud words in the cabinet.
   const fresh=await context(student);try{const fp=await fresh.newPage();await fp.goto(base+'/student-ielts-reading.html');await fp.locator('#openWords').click();await fp.locator('#wordsList').getByText('lamps',{exact:true}).waitFor();await fp.locator('#wordsList').getByText('signal',{exact:true}).waitFor();}finally{await fresh.close();}
   for(const p of [tp,sp])assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
   assert.deepEqual(errors,[]);console.log('DARIA COLLABORATION PASS '+(mobile?'mobile':'desktop')+': teacher manual/selection words, Google exact selection, cloud on new device, toast, presence/move and preserved learner answers');
  }finally{await tc.close();await sc.close();}
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
