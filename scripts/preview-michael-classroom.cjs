/* Local fixture only: no real accounts, no production writes, no real video.
   Run from the repository root; open http://127.0.0.1:8765/__qa/student */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {build}=require('./michael-classroom-config.cjs');
const root=process.cwd(),events=[];
const student='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6',teacher='acf2f6a1-f38b-45ef-836d-6cc9a9a5a832';
const room={student_id:student,teacher_id:teacher};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:8765');
 if(url.pathname==='/__qa/jitsi.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/michael-classroom-video-fixture.js','utf8'));return;}
 if(url.pathname==='/__qa/student'||url.pathname==='/__qa/teacher'){
  const role=url.pathname.split('/').pop(),uid=role==='teacher'?teacher:student;
  const setup=`<script>window.GoStudyPrivateAccess={ready:Promise.resolve(),userId:()=>${JSON.stringify(uid)},token:async()=>'local-fixture',request:async(path,options={})=>{const response=await fetch('/__qa/api?role=${role}&path='+encodeURIComponent(path),{method:options.method||'GET',headers:{'Content-Type':'application/json'},body:options.body?JSON.stringify(options.body):undefined});return {ok:response.ok,status:response.status,data:await response.json()}}};</script>`;
  let html=fs.readFileSync('business-ai-finance-b2-02-new.html','utf8').replace('src="assets/','src="/assets/').replaceAll('href="assets/','href="/assets/');
  html=html.replace('<script src="assets/gostudy-private-access.js"></script>',setup).replace('<script src="/assets/gostudy-private-access.js"></script>',setup);
  // The component URLs are relative to the page, as they are in production.
  html=html.replace('<head>','<head><base href="/">');
  if(url.searchParams.get('video')==='fixture')html=html.replace('</head>','<script src="/__qa/jitsi.js"></script></head>');
  html=html.replace('<body ','<body class="gostudy-authorized" ').replace('<section id="gostudyAccessGate"','<section hidden id="gostudyAccessGate"');
  res.setHeader('Content-Type','text/html');res.end(html);return;
 }
 if(url.pathname==='/__qa/api'){
  const api=new URL(url.searchParams.get('path'),'http://local');let data=[];
  if(api.pathname.endsWith('gostudy_private_lessons'))data=[{...room,lesson_payload:build()}];
  else if(api.pathname.endsWith('gostudy_finance_room'))data=[room];
  else if(api.pathname.endsWith('gostudy_finance_events')){
   if(req.method==='POST'){
    let raw='';for await(const chunk of req)raw+=chunk;
    events.push({...JSON.parse(raw),seq:events.length+1,actor:url.searchParams.get('role')==='teacher'?teacher:student});
   }
   const cursor=Number((api.searchParams.get('seq')||'gt.0').slice(3));data=events.filter(e=>e.seq>cursor);
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{
  const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[ext]||'text/plain');
  res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
module.exports={server,events};
if(require.main===module){const port=Number(process.env.FLUENVIA_PREVIEW_PORT)||8765;server.listen(port,'127.0.0.1',()=>console.log('Fixture preview: http://127.0.0.1:'+port+'/__qa/student (simulated accounts, no real call)'));}
