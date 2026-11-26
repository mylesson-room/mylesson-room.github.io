/* Real GoStudy Chromium preview screenshots, using synthetic test sessions.
 * Never connect to production auth/data and never use student credentials.
 */
'use strict';
const {createServer}=require('node:http');
const {readFile,writeFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),dir=path.join(root,'artifacts','latest-16-screens');
const student='11111111-1111-4111-8111-111111111111',teacher='22222222-2222-4222-8222-222222222222',room='33333333-3333-4333-8333-333333333333';
const students=[
[1,'Дмитрий','Finance B1','finance-b1-ai-20261118.html','v1'],
[2,'Анастасия','Art B1','art-b1-03.html','v1'],
[3,'Дарья','IELTS Reading','ielts-reading-04.html','ielts'],
[4,'Жанна','General English B1 Stories','general-english-b1-stories-01.html','stories'],
[5,'Эмилия','Feed B2','korean-wave-b2-20261118.html','v1'],
[6,'Михаил','AI in Finance B2','business-ai-finance-b2-02.html','v1'],
[7,'Регина','General English B1','general-english-b1-01.html','legacy'],
[7,'Регина','General English B2','general-english-b2-01.html','v1'],
[8,'Ирина','Country House A2','country-house-travel-a2-05.html','v1'],
[9,'Ксения','Pharma C1','pharma-ai-evidence-c1-20261118.html','v1'],
[10,'Светлана','TikTok A2','tiktok-a2.html','tiktok'],
[11,'Алла','Travel Vietnam A2','my-trip-to-vietnam-a2.html','alla'],
[12,'Екатерина','Travel A2 Positive Thinking','positive-thinking-a2.html','legacy'],
[13,'Ольга','Sweden A2','sweden-a2.html','sweden'],
[14,'Олег','First Sales C1','first-sales-c1-03.html','v1'],
[15,'Виктория','General English B2','general-english-b2-01.html','v1'],
[16,'Влад','Business AI B2-C1','business-ai-b2c1-03.html','v1']
];
const mime={html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',woff2:'font/woff2',json:'application/json',mp3:'audio/mpeg',webp:'image/webp'};
const server=createServer(async(req,res)=>{
 const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!filename.startsWith(root+path.sep))return res.writeHead(403).end();
 try{const bytes=await readFile(filename);res.writeHead(200,{'Content-Type':mime[path.extname(filename).slice(1)]||'application/octet-stream'}).end(bytes);}
 catch{res.writeHead(404).end();}
});
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const answer=(route,data,status=200)=>route.fulfill({status,headers:cors,json:data});
const fakeIELTS={
 title:'After Dark: Who Owns the Night?',duration:50,subtitle:'Synthetic preview of protected IELTS reading',
 mission:'Which evidence should a city consider when changing lighting?',
 reading:'<p><b>A.</b> This is synthetic preview text about artificial lighting and wildlife. The real passage is accessible only with course authorization.</p>',
 summary:'Street Three dimmed lamps after (9).',
 questions:[['1','features','Which paragraph contains the example?','A','Paragraph A'],['5','claims','The writer says all lamps must be removed.','NO','No such claim'],['9','completion','Lamps were dimmed after ______.','midnight','Test answer']],
 words:[['migration','миграция'],['glare','блики']]
};
function mock(route,info,uid){
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
 if(p==='/auth/v1/user')return answer(route,{id:uid,email:'preview@example.invalid'});
 if(p.includes('gostudy_my_destinations'))return answer(route,[{course:'general_english_b1_stories'},{course:'english-placement'}]);
 if(p.includes('gostudy_private_lessons'))return answer(route,[{lesson_payload:fakeIELTS}]);
 if(p.includes('gostudy_classroom_rooms'))return answer(route,[{id:room,student_id:uid,teacher_id:teacher,student_label:'Synthetic student',course:info[4]==='alla'?'vietnam-a2':'ielts-reading',lesson_path:info[3]}]);
 if(p.includes('gostudy_finance_room'))return answer(route,[{teacher_id:teacher,student_id:uid}]);
 if(p.includes('gostudy_b1_stories_content'))return answer(route,{key:'gostudy-general-english-b1-stories-01-v1',steps:[{title:'Synthetic preview'}]});
 if(p.includes('teacher_view'))return answer(route,[{id:uid,label:'Synthetic student',progress:[]}]);
 if(p.includes('gostudy_classroom_send'))return answer(route,true);
 if(p.includes('/functions/v1/'))return answer(route,{ok:true,events:[],messages:[],items:[]});
 if(p.includes('gostudy_classroom_events')||p.includes('gostudy_finance_events')||p.includes('gostudy_progress')||p.includes('gostudy_vocabulary_items'))return answer(route,[]);
 if(p.includes('/auth/v1/'))return answer(route,{id:uid,email:'preview@example.invalid'});
 return answer(route,[]);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function capture(browser,base,info,index){
 const [num,name,course,file,mode]=info;
 let uid=student;
 if(mode==='ielts'){
  const html=await readFile(path.join(root,file),'utf8');
  uid=JSON.parse(html.match(/id="private-access-config">([\s\S]*?)<\/script>/)[1]).allowedUserIds[0];
 }
 const context=await browser.newContext({viewport:{width:1365,height:850},deviceScaleFactor:1,reducedMotion:'reduce'});
 const filename=String(index+1).padStart(2,'0')+'-'+file.replace('.html','')+'.jpg';
 const result={num,name,course,file,mode,screenshot:filename,rendered:false,heading:'',errors:[]};
 try{
  await context.addInitScript(arg=>{
   const session=JSON.stringify({user:{id:arg.uid,email:'preview@example.invalid'},access_token:'synthetic-preview-token',refresh_token:'synthetic',expires_at:Date.now()+3600000});
   sessionStorage.setItem('gostudy-cloud-session-v1',session);
   localStorage.setItem('gostudy-student-session-v1',session);
  },{uid});
  await context.route('https://**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname.endsWith('.supabase.co'))return mock(route,info,uid);
   if(u.hostname==='api.mymemory.translated.net')return answer(route,{responseStatus:200,responseData:{translatedText:'тестовый перевод'}});
   return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(e.message.slice(0,100)));
  await page.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:26000});
  const selector=(mode==='v1'||mode==='alla'||mode==='ielts')?'#lessonPages .page.active':(mode==='stories'||mode==='legacy')?'.room .sheet':mode==='tiktok'?'main.shell .card':'.shell';
  try{await page.locator(selector).first().waitFor({state:'visible',timeout:17000});result.rendered=true;}
  catch{}
  await page.waitForTimeout(550);
  result.heading=(await page.locator('h1:visible').first().textContent().catch(()=>'')||'').trim().slice(0,120);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(dir,filename),type:'jpeg',quality:80,fullPage:false,animations:'disabled',timeout:17000});
  console.log('CAPTURE '+String(index+1).padStart(2,'0')+' '+name+' '+file+' rendered='+result.rendered+' heading='+result.heading+' jsErrors='+result.errors.length);
 }catch(e){result.error=e.message.slice(0,200);console.log('CAPTURE FAILED '+file+' '+result.error);}
 finally{await context.close();}
 return result;
}
function gallery(results){
 const cards=results.map(r=>'<article class="card"><img src="'+esc(r.screenshot)+'" alt="'+esc(r.name)+'"><h2>'+r.num+'. '+esc(r.name)+'</h2><p>'+esc(r.course)+'</p><p class="'+(r.rendered?'ok':'warn')+'">'+(r.rendered?'Открыт интерфейс урока':'Полная загрузка не подтверждена')+'</p></article>').join('');
 return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>GoStudy: 16 учеников</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f3f6fb;color:#18334f;padding:28px;margin:0}h1{font-size:29px;margin:0 0 8px}.intro{font-size:14px;color:#596b82;line-height:1.5;margin:0 0 25px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:17px}.card{padding:10px;border:1px solid #dfe7f2;background:#fff;border-radius:14px;overflow:hidden}img{display:block;width:100%;aspect-ratio:1365/850;object-fit:cover;object-position:top left;border:1px solid #e5ecf4;border-radius:8px}h2{font-size:16px;margin:10px 3px 4px}p{font-size:12px;color:#5d7186;margin:0 3px 8px}.ok{color:#31546d}.warn{color:#b44838}</style></head><body><h1>GoStudy · Последние уроки 16 учеников</h1><p class="intro">17 изображений: у Регины два курса. Настоящие страницы GoStudy в Chromium, но ТЕСТОВЫЕ сессии и ответы сервера. Это не скриншоты реальных аккаунтов и не подтверждение видеозвонков. В IELTS использован тестовый текст, внешние изображения/видео могут отсутствовать.</p><div class="grid">'+cards+'</div></body></html>';
}
(async()=>{
 await mkdir(dir,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch(process.env.GOSTUDY_CHROME?{executablePath:process.env.GOSTUDY_CHROME}:{});
 try{
  const base='http://127.0.0.1:'+server.address().port,results=[];
  for(let i=0;i<students.length;i++)results.push(await capture(browser,base,students[i],i));
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({kind:'synthetic-preview',studentCount:16,screenshotCount:17,results},null,2));
  await writeFile(path.join(dir,'overview.html'),gallery(results));
  const page=await browser.newPage({viewport:{width:1820,height:1100}});
  await page.goto(base+'/artifacts/latest-16-screens/overview.html',{waitUntil:'load'});
  await page.screenshot({path:path.join(dir,'overview.jpg'),fullPage:true,type:'jpeg',quality:85});
  await page.close();
  console.log('GALLERY DONE '+results.filter(r=>r.rendered).length+'/17 rendered lesson interfaces');
  if(results.filter(r=>r.rendered).length<13)process.exitCode=1;
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
