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
    assert.deepEqual(errors.filter(e=>/gostudy-b1-stories-chat/.test(e)),[]);
    console.log('B1 private chat: teacher/student messaging, unread badge, history after reload, mobile layout PASS');
  }finally{
    await sc?.close();await tc?.close();await browser.close();server.close();
  }
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
