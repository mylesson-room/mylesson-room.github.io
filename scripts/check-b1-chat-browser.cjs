// B1 private-chat browser test: real lesson HTML + mocked Supabase identity,
// old protected lesson RPC and isolated B1 chat transport. No real user data.
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const studentId='11111111-1111-4111-8111-111111111111';
const teacherId='22222222-2222-4222-8222-222222222222';
const messages=[];
const assignedWords=[];
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{
    const data=await fs.readFile(file);
    const suffix=path.extname(file);
    const type=suffix==='.html'?'text/html':suffix==='.js'?'application/javascript':suffix==='.json'?'application/json':suffix==='.css'?'text/css':'application/octet-stream';
    res.writeHead(200,{'Content-Type':type}).end(data);
  }catch{res.writeHead(404).end();}
});
async function setContext(browser,id,student){
  const context=await browser.newContext({viewport:student?{width:390,height:844}:{width:1350,height:820}});
  await context.addInitScript(({id})=>{
    sessionStorage.setItem('gostudy-cloud-session-v1',JSON.stringify({
      user:{id},access_token:'test-'+id,expires_at:Date.now()+3600000
    }));
  },{id});
  await context.route('https://*.supabase.co/**',route=>{
    const url=new URL(route.request().url()),pathname=url.pathname,body=route.request().method()==='GET'?{}:route.request().postDataJSON();
    if(pathname.endsWith('/functions/v1/gostudy-b1-stories-chat')){
      assert.equal(body.studentId,student?null:studentId);
      assert.ok(['list','send'].includes(body.action));
      if(body.action==='send'){
        assert.ok(body.text.length>0);
        const entry={id:'msg-'+(messages.length+1),actor:id,text:body.text,at:new Date().toISOString()};
        messages.push(entry);
        return route.fulfill({json:{message:entry}});
      }
      return route.fulfill({json:{messages:[...messages],revision:messages.length}});
    }
    if(pathname.endsWith('/rpc/course_workbook_read')){
      assert.equal(body.p_course,'general-english-b1-stories');
      return route.fulfill({json:assignedWords.slice()});
    }
    if(pathname.endsWith('/rpc/course_workbook_assign')){
      assert.equal(student,false,'Only a teacher may assign a word');
      assert.equal(body.p_course,'general-english-b1-stories');
      assert.equal(body.p_student,studentId);
      assert.ok(body.p_en && body.p_ru);
      const index=assignedWords.findIndex(w=>w.en.toLowerCase()===body.p_en.toLowerCase());
      if(index>=0)assignedWords.splice(index,1);
      assignedWords.push({en:body.p_en,ru:body.p_ru});
      return route.fulfill({json:true});
    }
    if(pathname.endsWith('/rpc/gostudy_b1_stories_content')){
      assert.equal(body.p_student,student?null:studentId);
      return route.fulfill({json:{
        key:'gostudy-general-english-b1-stories-01-v1',level:'B1',
        title:'Old protected lesson',cabinet:'student-general-english-b1-stories.html',
        steps:[{id:'old',title:'Old',instruction:'Protected course'}]
      }});
    }
    if(pathname.endsWith('/rpc/gostudy_general_english_b1_stories_teacher_view'))
      return route.fulfill({json:[{id:studentId,progress:[],words:[],assigned:[]}]});
    if(pathname.endsWith('/rpc/gostudy_my_destinations'))return route.fulfill({json:[{course:student?'general-english-b1-stories':'teacher'}]});
    if(pathname.endsWith('/gostudy_progress'))return route.fulfill({json:[]});
    return route.fulfill({json:[]});
  });
  await context.route('https://translate.googleapis.com/**',route=>{
    const selected=new URL(route.request().url()).searchParams.get('q')||'';
    const translated=/apartment/i.test(selected)?'квартира':'компания';
    return route.fulfill({json:[[[translated,selected]]]});
  });
  await context.route('https://8x8.vc/**',route=>route.abort());
  return context;
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
  let sc,tc;
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    sc=await setContext(browser,studentId,true);tc=await setContext(browser,teacherId,false);
    const sp=await sc.newPage(),tp=await tc.newPage(),errors=[];
    for(const page of [sp,tp])page.on('pageerror',e=>errors.push(e.message));
    await Promise.all([sp.goto(origin+'/general-english-b1-stories-01.html'),tp.goto(origin+'/general-english-b1-stories-01.html?classStudent='+studentId)]);
    const studentChat=sp.locator('.b1-chat-dropdown');
    const teacherChat=tp.locator('.b1-chat-dropdown');
    await Promise.all([studentChat,teacherChat].map(x=>x.waitFor({state:'visible'})));
    await Promise.all([sp,tp].map(page=>page.waitForFunction(()=>document.querySelector('.b1-chat-dropdown')?.dataset.loaded==='true')));
    assert.equal(await studentChat.getAttribute('open'),null);
    assert.equal(await teacherChat.getAttribute('open'),null);
    await studentChat.locator('summary').click();
    await sp.locator('.b1-chat-form input').fill('Hello from the student');
    await sp.locator('.b1-chat-form button').click();
    await sp.locator('.b1-chat-bubble').filter({hasText:'Hello from the student'}).waitFor();
    await teacherChat.locator('.b1-chat-unread:not([hidden])').waitFor({timeout:8000});
    await teacherChat.locator('summary').click();
    await tp.locator('.b1-chat-bubble').filter({hasText:'Hello from the student'}).waitFor();
    await tp.locator('.b1-chat-form input').fill('Hello from the teacher');
    await tp.locator('.b1-chat-form button').click();
    await tp.locator('.b1-chat-bubble').filter({hasText:'Hello from the teacher'}).waitFor();
    await sp.locator('.b1-chat-bubble').filter({hasText:'Hello from the teacher'}).waitFor({timeout:8000});
    assert.equal(await sp.locator('.b1-chat-bubble.b1-chat-own').count(),1);
    assert.equal(await tp.locator('.b1-chat-bubble.b1-chat-own').count(),1);
    await sp.reload();
    const rebuilt=sp.locator('.b1-chat-dropdown');
    await rebuilt.waitFor({state:'visible'});
    await rebuilt.locator('summary').click();
    await sp.locator('.b1-chat-bubble').filter({hasText:'Hello from the teacher'}).waitFor({timeout:8000});
    assert.equal(messages.length,2,'Chat persists across reload; no duplicated sends');
    // Regression: a saved term and its translation must be visible immediately,
    // and a word assigned by the teacher must reach the student's lesson even
    // when the dictionary is closed.
    const highlightWord=async(page,term)=>{
      const found=await page.evaluate(text=>{
        const root=document.querySelector('.sheet .lesson-content');
        if(!root)return false;
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        let node;
        while((node=walker.nextNode())){
          const at=node.textContent.toLowerCase().indexOf(text.toLowerCase());
          if(at<0)continue;
          const range=document.createRange();
          range.setStart(node,at);range.setEnd(node,at+text.length);
          const selection=window.getSelection();
          selection.removeAllRanges();selection.addRange(range);
          document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
          return true;
        }
        return false;
      },term);
      assert.equal(found,true,'The new B1 lesson must contain selected term: '+term);
      await page.locator('#selectionTranslate.is-visible').waitFor({timeout:10000});
    };
    await Promise.all([sp,tp].map(page=>page.waitForFunction(()=>!!window.GoStudyB1Glossary)));
    await highlightWord(sp,'company');
    await sp.locator('#selectionTarget').fill('компания');
    await sp.locator('#selectionSave:not([disabled])').click();
    const studentToast=sp.locator('#b1WordAddedNotice:not([hidden])');
    await studentToast.getByText('company',{exact:true}).waitFor();
    await studentToast.getByText('компания',{exact:true}).waitFor();
    await sp.locator('#selectionStatus').getByText(/company — компания/).waitFor();
    await studentToast.getByRole('button',{name:'Словарь'}).click();
    await sp.locator('.glass-words[open] .glass-list li').filter({hasText:'company'}).waitFor();
    await sp.locator('.glass-words .glass-close').click();
    // This should NOT require the student's dictionary to remain open.
    await highlightWord(tp,'apartment');
    await tp.locator('#selectionTarget').fill('квартира');
    await tp.locator('#selectionSave:not([disabled])').click();
    const teacherToast=tp.locator('#b1WordAddedNotice:not([hidden])');
    await teacherToast.getByText('apartment',{exact:true}).waitFor();
    await teacherToast.getByText('квартира',{exact:true}).waitFor();
    await sp.bringToFront();
    const assignedToast=sp.locator('#b1WordAddedNotice:not([hidden])');
    await assignedToast.getByText('Преподаватель добавил слово',{exact:true}).waitFor({timeout:16000});
    await assignedToast.getByText('apartment',{exact:true}).waitFor();
    await assignedToast.getByText('квартира',{exact:true}).waitFor();
    await assignedToast.getByRole('button',{name:'Словарь'}).click();
    await sp.locator('.glass-words[open] .glass-list li').filter({hasText:'apartment'}).waitFor();
    await sp.locator('.glass-words .glass-close').click();
    await sp.reload();
    await sp.waitForFunction(()=>!!window.GoStudyB1Glossary);
    await sp.waitForTimeout(600);
    assert.equal(await sp.locator('#b1WordAddedNotice:not([hidden])').count(),0,
      'Existing assigned words should not trigger new notifications on reload');
    assert.deepEqual(errors.filter(e=>/gostudy-b1-stories-chat/.test(e)),[]);
    console.log('B1 chat + translator: two-way messages, saved word toast, teacher-assigned notice, dictionary and reload PASS');
  }finally{
    await sc?.close();await tc?.close();await browser.close();server.close();
  }
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
