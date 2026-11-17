(async () => {
const config = window.GoStudyLesson;
const {vocab:VOCAB=[], reading:READING=[], gaps:GAPS=[], advice={}, key:STORAGE, wordsKey:WORDS_KEY} = config;
const LESSONS = config.labels || config.steps;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const workbook = config.steps ? window.GoStudyExercises.render(config,esc) : null;
const student = window.GoStudyFinanceAuth.classroomStudent;
const answerNamespace = typeof config.answerNamespace === 'string' ? config.answerNamespace : '';
const stores = window.GoStudyStorage || localStorage;
let cached = {};
let state={page:0,values:{}};
if (config.preserve === 'cloud') await window.GoStudyV1Progress?.ready;
try {
  if (workbook && student && config.preserve === 'cloud') cached = {answers:await window.GoStudyTravelAnswers.read()};
  else if (workbook && !student) cached = JSON.parse(stores.getItem(STORAGE)||'{}') || {};
  else if (!document.body.dataset.classroomCourse) cached = JSON.parse(localStorage.getItem(STORAGE)||'{}') || {};
} catch {}
state.page = Math.max(0,Math.min(LESSONS.length-1,Number(cached.page)||0));
state.values = workbook ? workbook.fromSaved(cached.answers) : cached.values || {};
let replaying = true;
function save(){
  if (replaying || student) return;
  if (workbook) {
    const record = {...cached,page:state.page,answers:workbook.toSaved(state.values,cached.answers)};
    if (config.preserve === 'cloud') record.version = 2;
    try { stores.setItem(STORAGE,JSON.stringify(record)); cached = record; } catch {}
  } else if (!document.body.dataset.classroomCourse && !window.FinanceLive?.connected()) {
    try { localStorage.setItem(STORAGE,JSON.stringify(state)); } catch {}
  }
}
function setValue(k,v){state.values[k]=v;save();sendAnswer(k,v)}
function getValue(k){return state.values[k]??""}
function go(n){
  state.page=Math.max(0,Math.min(n,LESSONS.length-1));
  document.querySelectorAll(".page").forEach((page,index)=>page.classList.toggle("active",index===state.page));
  document.querySelectorAll('#lessonSections button').forEach((button,index) => {
    if (index === state.page) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  for (const audio of document.querySelectorAll('.page:not(.active) audio')) if (!audio.paused) audio.pause();
  $("#next").textContent=state.page===LESSONS.length-1?"Finish lesson":"Continue";
  setLessonNavigationAccess();
  updateMoveStudentButton();
  $(".lesson-content").scrollTop=0;
  if(window.matchMedia("(max-width: 800px)").matches){
    const content=$(".lesson-content");
    const headerHeight=$("header").getBoundingClientRect().height;
    window.scrollTo({top:Math.max(0,window.scrollY+content.getBoundingClientRect().top-headerHeight),behavior:"instant"});
  }
  save();
}
let latestStudentPage=null;
let restoredPage=null;
function updateMoveStudentButton(){
  const button=$("#moveStudent");
  button.hidden=!(window.FinanceLive?.connected() && window.FinanceLive.teacher()
    && latestStudentPage!==null && latestStudentPage!==state.page);
}
function sendPagePresence(){
  if(window.FinanceLive?.connected()) window.FinanceLive.send("page",{action:"presence",page:state.page});
}
function navigateFromControls(nextPage){
  // Each participant moves locally. Position reports do not navigate the other participant.
  go(nextPage);
  sendPagePresence();
}
function setLessonNavigationAccess(){
  $("#back").disabled=state.page===0;
  $("#next").disabled=false;
  $("#back").removeAttribute("title");
  $("#next").removeAttribute("title");
}
$("#back").onclick=()=>navigateFromControls(state.page-1);
$("#next").onclick=()=>navigateFromControls(state.page===LESSONS.length-1?0:state.page+1);
$("#moveStudent").onclick=()=>{
  if(!window.FinanceLive?.connected() || !window.FinanceLive.teacher() || latestStudentPage===state.page)return;
  window.FinanceLive.send("page",{action:"move",page:state.page});
};
const defs = [5,2,0,7,4,1,6,3].flatMap(index => VOCAB[index] ? [VOCAB[index][1]] : []);

const definitionPickers = [];
const optionPicker = window.GoStudyOptionPicker;
if ($("#vocab")) {
  $("#vocab").innerHTML = VOCAB.map((word,index) => `
    <div class="term">
      <div class="vocab-term" id="term${index}">${index+1}. ${esc(word[0])}
        <button type="button" onclick="addWord(${index})" title="Save to vocabulary">＋ Save word</button>
      </div>
      ${optionPicker.markup(defs.map((label,value)=>({label,value})),"Choose a definition…",word[0])}
      <span id="vf${index}" class="feedback"></span>
    </div>`).join("");
  definitionPickers.push(...$("#vocab").querySelectorAll(".definition-picker"));
  definitionPickers.forEach((picker,index) => {
    const key = "v"+index;
    optionPicker.show(picker,getValue(key));
    optionPicker.bind(picker,value => {
      setValue(key,value);
      gradeSection("v",true);
    });
  });
}

if ($("#reading")) $("#reading").innerHTML=READING.map((x,i)=>'<div class="question-item"><strong>'+(i+1)+'. '+esc(x[0])+'</strong>'+x[1].map((s,j)=>'<label><input type="radio" name="read'+i+'" value="'+j+'">'+esc(s)+'</label>').join("")+'<span class="result" id="rf'+i+'"></span></div>').join("");
document.querySelectorAll("#reading input").forEach(x=>{x.checked=getValue(x.name)===x.value;x.onchange=()=>{setValue(x.name,x.value);gradeSection("read", true)}});
if ($("#gaps")) $("#gaps").innerHTML=GAPS.map((x,i)=>'<div class="gap-item"><label for="gap'+i+'">'+(i+1)+'. '+esc(x[0])+'</label><input id="gap'+i+'" autocomplete="off" data-key="gap'+i+'" placeholder="Type the missing expression"><small class="feedback" id="gf'+i+'"></small></div>').join("");
document.querySelectorAll("#gaps input").forEach((x,i)=>{x.value=getValue("gap"+i);x.oninput=()=>{setValue("gap"+i,x.value);if(x.value.trim().toLowerCase().replace(/\s+/g," ")===GAPS[i][1])gradeSection("gap",true)};x.onblur=()=>gradeSection("gap",true);x.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();gradeSection("gap",true)}}});
document.querySelectorAll("#decision input").forEach(x=>{x.checked=getValue("decision")===x.value;x.onchange=()=>{setValue("decision",x.value);$("#decisionAdvice").textContent=advice[x.value]}});
if(advice[getValue("decision")])$("#decisionAdvice").textContent=advice[getValue("decision")];
document.querySelectorAll("[data-save]").forEach(x=>{x.value=getValue(x.dataset.save);x.oninput=()=>{setValue(x.dataset.save,x.value);if(x.id==="homework")updateWords()}});
function updateWords(){
  const homework = $("#homework");
  if (!homework) return;
  const n = homework.value.trim().split(/\s+/).filter(Boolean).length;
  $("#wordCount").textContent=n+" words · Target: 140–180";
}
updateWords();
window.copyHomework=()=>navigator.clipboard.writeText($("#homework").value).then(()=>alert("Email copied")).catch(()=>alert("Copy unavailable in this browser"));
function readWords(){
  if (config.preserve) {
    const words = new Map();
    for (const key of student ? [] : [...(config.legacyWords || []),WORDS_KEY]) for (const store of new Set([localStorage,stores])) {
      try {
        const record = JSON.parse(store.getItem(key)||'{}');
        for (const word of record.words || []) {
          if (typeof word.en === 'string' && word.en.trim()) words.set(word.en.trim().toLowerCase(),word);
        }
        for (const removed of record.removed || []) words.delete(removed);
      } catch {}
    }
    for (const word of window.FinanceLive?.words() || []) words.set(word.en.trim().toLowerCase(),word);
    return [...words.values()];
  }
  if(window.FinanceLive?.connected())return FinanceLive.words();
  if(document.body.dataset.classroomCourse)return [];
  try{
    const v=JSON.parse(localStorage.getItem(WORDS_KEY)||"{}");
    return Array.isArray(v.words)?v.words:[];
  } catch { return []; }
}
$("#openLessonDictionary").addEventListener("click",()=>{drawWords();$("#lessonDictionary").showModal()});
function drawWords(){let w=readWords();$("#wordCountSidebar").textContent=w.length;$("#myWords").innerHTML=w.slice().reverse().map(x=>'<small><b>'+esc(x.en)+'</b> — '+esc(x.ru)+'</small>').join("")||'<small>No words saved yet.</small>'}
window.addWord=i=>{let words=readWords(),w=VOCAB[i];if(window.FinanceLive?.send("word",{en:w[0],ru:w[2]})||document.body.dataset.classroomCourse)return;if(!words.some(x=>x.en.toLowerCase()===w[0].toLowerCase())){words.push({en:w[0],ru:w[2]});try{let obj=JSON.parse(localStorage.getItem(WORDS_KEY)||"{}");obj.words=words;localStorage.setItem(WORDS_KEY,JSON.stringify(obj))}catch(e){alert("Vocabulary saving unavailable")}}drawWords()};


function makeWord(source,translation){
 const a=String(source||"").trim(),b=String(translation||"").trim();
 if(!a||!b)return null;
 return /[А-Яа-яЁё]/.test(a)?{en:b,ru:a}:{en:a,ru:b};
}
function saveVocabulary(word){
 if(!word)return false;
 if(window.FinanceLive?.send("word",word))return true;
 if(document.body.dataset.classroomCourse)return false;
 try{
  const data=JSON.parse(localStorage.getItem(WORDS_KEY)||"{}");
  data.words=Array.isArray(data.words)?data.words:[];
  const i=data.words.findIndex(w=>String(w.en||"").toLowerCase()===word.en.toLowerCase());
  if(i<0)data.words.push(word);else data.words[i]=word;
  localStorage.setItem(WORDS_KEY,JSON.stringify(data));drawWords();return true;
 }catch(e){console.warn("Word save failed",e);return false}
}
async function translateVocabulary(source,signal){
 const from=/[А-Яа-яЁё]/.test(source)?"ru":"en",to=from==="ru"?"en":"ru";
 const response=await fetch("https://api.mymemory.translated.net/get?"+new URLSearchParams({q:source,langpair:from+"|"+to}),{signal});
 if(!response.ok)throw Error("Translation unavailable");
 const data=await response.json(),value=String(data?.responseData?.translatedText||"").trim();
 if(!value||Number(data?.responseStatus||0)>=400||/QUERY LENGTH LIMIT|MYMEMORY WARNING/i.test(value))throw Error("Translation unavailable");
 return value;
}
{
 const source=$("#dictionarySource"),translation=$("#dictionaryTranslation");
 let seq=0,timer=0,controller=null,edited=false;
 translation.addEventListener("input",()=>{edited=true});
 source.addEventListener("input",()=>{
  clearTimeout(timer);controller?.abort();
  const text=source.value.trim(),n=++seq;edited=false;translation.value="";
  if(!text)return;
  timer=setTimeout(async()=>{
   controller=new AbortController();
   try{const result=await translateVocabulary(text,controller.signal);if(n===seq&&!edited)translation.value=result;}
   catch(e){if(e.name!=="AbortError")console.warn("Dictionary translation unavailable")}
  },350);
 });
 $("#dictionaryAddForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!saveVocabulary(makeWord(source.value,translation.value)))return;
  source.value="";translation.value="";edited=false;seq++;controller?.abort();clearTimeout(timer);source.focus();
 });
}
const lessonDivider = $("#lessonDivider");
const layout = $(".layout");
function changeVideoWidth(percent) {
  const width = Math.max(22, Math.min(55, percent));
  layout.style.setProperty("--video-width", width + "%");
  lessonDivider.setAttribute("aria-valuenow", String(Math.round(width)));
}
lessonDivider.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  lessonDivider.setPointerCapture(event.pointerId);
  layout.classList.add("is-resizing");
});
lessonDivider.addEventListener("pointermove", event => {
  if (!lessonDivider.hasPointerCapture(event.pointerId)) return;
  const area = layout.getBoundingClientRect();
  changeVideoWidth((event.clientX - area.left) / area.width * 100);
});
lessonDivider.addEventListener("lostpointercapture", () => layout.classList.remove("is-resizing"));
lessonDivider.addEventListener("keydown", event => {
  const step = {ArrowLeft: -2, ArrowRight: 2}[event.key];
  if (!step) return;
  event.preventDefault();
  changeVideoWidth(Number(lessonDivider.getAttribute("aria-valuenow")) + step);
});
const checks = {
  v: {answers:VOCAB.map(word => String(defs.indexOf(word[1]))),feedback:"vf",score:"vocabScore"},
  read: {answers:READING.map(row => String(row[2])),feedback:"rf",score:"readingScore"},
  gap: {answers:GAPS.map(row => row[1]),feedback:"gf",score:"gapsScore"}
};
const completed = new Set();
let celebrationTimer;
function celebrate(){
  const panel = $("#finance-celebrate");
  panel.hidden = true;
  clearTimeout(celebrationTimer);
  requestAnimationFrame(() => {
    panel.hidden = false;
    celebrationTimer = setTimeout(() => { panel.hidden = true; }, 3000);
  });
}
function gradeSection(key, animate = false){
  const {answers,feedback,score} = checks[key];
  let count = 0, attempted = 0;
  answers.forEach((answer,index) => {
    const value = String(getValue(key + index)).trim().toLowerCase().replace(/\s+/g," ");
    const correct = value === answer;
    attempted += Number(Boolean(value));
    count += Number(correct);
    const result = $("#" + feedback + index);
    result.textContent = value ? (correct ? "✓ Correct" : "Try again") : "";
    result.classList.toggle("good",correct);
    result.classList.toggle("bad",Boolean(value) && !correct);
    result.closest(".term,.question-item,.gap-item")?.classList.toggle("finance-correct",correct);
  });
  const label = $("#" + score);
  if (label) label.textContent = attempted ? count + " / " + answers.length + " correct" : "";
  if(count === answers.length){
    if(animate && !completed.has(key)) celebrate();
    completed.add(key);
  }else completed.delete(key);
}
const sections = (workbook?.sections || [
  [], checks.v.answers.map((_,i) => "v"+i), checks.read.answers.map((_,i) => "read"+i),
  checks.gap.answers.map((_,i) => "gap"+i), ["decision","decisionNotes"], ["roleNotes"], ["finalOpinion"], ["homework"]
]).slice(0,LESSONS.length);
const sectionGrades = workbook ? [] : [null,"v","read","gap"];
const allowedKeys = new Set(sections.flat());
const pending = new Map();
function sendAnswer(key,value){
  if (!window.FinanceLive?.connected()) return;
  clearTimeout(pending.get(key)?.timer);
  const field = workbook?.fields.get(key);
  const wireKey = answerNamespace + key;
  const payload = field ? {page:field.page,key:wireKey,value} : {key:wireKey,value};
  const typing = field ? workbook.controls.get(key)?.[0]?.tagName === 'TEXTAREA' :
    /^(gap\d+|decisionNotes|roleNotes|finalOpinion|homework)$/.test(key);
  if (!typing) {
    FinanceLive.send("answer",payload);
    return;
  }
  const timer=setTimeout(() => flushAnswer(key),250);
  pending.set(key,{timer,payload});
}
function flushAnswer(key) {
  const item = pending.get(key);
  if (!item) return;
  clearTimeout(item.timer);
  pending.delete(key);
  FinanceLive.send("answer",item.payload);
}
window.addEventListener("pagehide",() => [...pending.keys()].forEach(flushAnswer));
function redrawAnswer(key){
  if (workbook) return workbook.redraw(key,getValue(key),setExerciseValue);
  if(/^v\d+$/.test(key)){
    const picker = definitionPickers[Number(key.slice(1))];
    if (picker) optionPicker.show(picker,getValue(key));
    return;
  }
  document.querySelectorAll("input,textarea").forEach(input => {
    if (input.type === "radio" && input.name === key) input.checked = input.value === getValue(key);
    if (input.dataset.save === key || input.id === key) input.value = getValue(key);
  });
  if(key==="decision") $("#decisionAdvice").textContent=advice[getValue(key)]||"";
  if(key==="homework") updateWords();
}
function clearSection(page){
  sections[page]?.forEach(key=>{
    clearTimeout(pending.get(key)?.timer);
    pending.delete(key);
    delete state.values[key];
    redrawAnswer(key);
  });
  if(workbook) workbook.grade(page,getValue,false);
  if(sectionGrades[page]) gradeSection(sectionGrades[page]);
  save();
}
sections.forEach((keys,page)=>{
  if(!keys.length)return;
  const button=document.createElement("button");
  button.type="button";
  button.className="finance-reset";
  button.textContent="×";
  button.title="Сбросить ответы";
  button.setAttribute("aria-label",button.title);
  button.addEventListener("click",()=>{
    clearSection(page);
    window.FinanceLive?.send("reset",{page,namespace:answerNamespace});
  });
  $("#page-"+page+" .activity-head").append(button);
});
if (!workbook) Object.keys(checks).forEach(key=>gradeSection(key));
function setExerciseValue(key,value,animate = true) {
  if (!workbook.valid(key,value)) return;
  setValue(key,value);
  if (workbook.controls.get(key)?.[0]?.hasAttribute('data-order')) redrawAnswer(key);
  if (workbook.grade(workbook.fields.get(key).page,getValue,animate)) celebrate();
}
if (workbook) {
  for (const [key,controls] of workbook.controls) {
    redrawAnswer(key);
    for (const control of controls) {
      if (control.hasAttribute('data-order')) continue;
      if (control.classList.contains('definition-picker')) {
        optionPicker.bind(control,value=>setExerciseValue(key,value));
        continue;
      }
      const type = control.tagName === 'TEXTAREA' ? 'input' : 'change';
      control.addEventListener(type,()=>setExerciseValue(key,control.value));
    }
  }
  sections.forEach((_,page)=>workbook.grade(page,getValue,false));
}
document.querySelectorAll('[data-lesson-word]').forEach(button => button.addEventListener('click', () => {
  saveVocabulary(config.lessonWords?.[Number(button.dataset.lessonWord)]);
}));
const sectionMenu = document.querySelector('#lessonSections');
LESSONS.forEach((part,page) => {
  const button = document.createElement('button');
  button.type='button';
  button.className='outline';
  button.textContent=part.label || part.title;
  button.onclick=()=>navigateFromControls(page);
  sectionMenu.append(button);
});
let toastTimer;
function showWord(word){
  const toast=$("#finance-toast");
  toast.replaceChildren();
  const title=document.createElement("strong");
  title.textContent=word.en;
  const meaning=document.createElement("span");
  meaning.textContent=word.ru;
  toast.append(title,meaning);
  toast.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{toast.hidden=true},5000);
}
document.addEventListener("finance-word",event=>{
  drawWords();
  if(event.detail.notify)showWord(event.detail.word);
});
document.addEventListener("finance-connect",()=>{
  replaying = true;
  if (!workbook) sections.forEach((keys,page)=>{if(keys.length)clearSection(page)});
});
document.addEventListener("finance-ready",()=>{
  if(FinanceLive.teacher()) {
    for (const back of document.querySelectorAll('.lesson-brand,.lesson-home-link')) back.href="gostudy-teacher.html";
  }
  if (restoredPage !== null && location.hash !== "#homework") go(restoredPage);
  replaying = false;
  setLessonNavigationAccess();
  sendPagePresence();
  updateMoveStudentButton();
  drawWords();
  document.querySelectorAll("#finance-chat-form input,#finance-chat-form button").forEach(control=>{control.disabled=false});
  $(".finance-login").hidden=true;
});
document.addEventListener("finance-event",event=>{
  const {kind,payload,initial,own,teacher}=event.detail;
  const role=teacher?"Преподаватель":"Ученик";
  const rawKey = typeof payload?.key === "string" ? payload.key : "";
  const key = answerNamespace && rawKey.startsWith(answerNamespace) ? rawKey.slice(answerNamespace.length) : answerNamespace ? "" : rawKey;
  if(kind==="answer" && allowedKeys.has(key) && (workbook ? workbook.valid(key,payload.value) : typeof payload.value==="string")){
    if(!pending.has(key)){
      state.values[key]=payload.value;
      redrawAnswer(key);
      const type=Object.keys(checks).find(name=>key.startsWith(name) && /^\d+$/.test(key.slice(name.length)));
      if(workbook && workbook.grade(workbook.fields.get(key).page,getValue,!initial && !own)) celebrate();
      if(type) gradeSection(type,!initial && !own);
      save();
    }
    if(!initial && !own) $("#finance-activity").textContent=role+" изменил ответ";
  }
  if(kind==="reset" && (payload.namespace || "") === answerNamespace && Number.isInteger(payload.page) && sections[payload.page]){
    clearSection(payload.page);
    if(!initial && !own) $("#finance-activity").textContent=role+" сбросил задание";
  }
  if(kind==="page" && Number.isInteger(payload.page) && LESSONS[payload.page]){
    if (own && initial && (payload.action === "presence" || !payload.action)) restoredPage = payload.page;
    if (workbook && !own && !initial && !teacher && FinanceLive.teacher() && payload.action !== 'move') go(payload.page);
    if (payload.moveStudent && teacher && !own && !initial && !FinanceLive.teacher()) go(payload.page);
    if(payload.action==="presence" && !teacher && FinanceLive.teacher()){
      latestStudentPage=payload.page;
      updateMoveStudentButton();
    }
    if(payload.action==="move" && teacher && !own && !initial && !FinanceLive.teacher()){
      go(payload.page);
      sendPagePresence();
    }
  }
  if(kind==="chat" && typeof payload.text==="string"){
    const message=document.createElement("li");
    if(own)message.classList.add("chat-own");
    const body=document.createElement("span");
    body.textContent=payload.text;
    const time=document.createElement("time");
    time.className="chat-time";
    const stamp=event.detail.created_at || payload.sentAt;
    if(stamp && !Number.isNaN(Date.parse(stamp))){
      time.dateTime=stamp;
      time.textContent=new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(stamp));
    }
    message.append(body,time);
    const list=$("#finance-messages");
    list.append(message);
    list.scrollTop=list.scrollHeight;
  }
});
$("#finance-chat-form").addEventListener("submit",event=>{
  event.preventDefault();
  const input=event.currentTarget.querySelector("input");
  const value=input.value.trim();
  if(value && window.FinanceLive?.send("chat",{text:value,sentAt:new Date().toISOString()}))input.value="";
});

drawWords();go(location.hash === "#homework" ? LESSONS.length - 1 : state.page);
if (!config.course || workbook) replaying = false;


(function(){
 const byId=id=>document.getElementById(id);
 const pop=byId('selectionTranslate'),target=byId('selectionTarget'),source=byId('selectionSource');
 const status=byId('selectionStatus'),contextEl=byId('selectionContext'),directionEl=byId('selectionDirection');
 const swap=byId('selectionSwap'),retry=byId('selectionRetry'),google=byId('selectionGoogle'),saveBtn=byId('selectionSave');
 let range=null,phrase='',sentence='',from='en',to='ru',controller=null,seq=0,timer=0,edited=false;
 const cacheKey='gostudy-context-translations-v1';
 let cache={};try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}')}catch{}
 const clean=x=>String(x||'').replace(/\s+/g,' ').trim().slice(0,1000);
 const cacheId=()=>[from,to,phrase.toLowerCase(),sentence.toLowerCase().slice(0,250)].join('|');
 const known=new Map((config.vocab||[]).map(x=>[x[0].toLowerCase(),x[2]]));
 for(const x of config.lessonWords||[])if(x?.en&&x?.ru)known.set(x.en.toLowerCase(),x.ru);
 const acronym=new Set(['AI','CEO','CFO','EU','UK','USA','ROI','GDP','API','IELTS','B2']);
 const natural=x=>{
  const t=clean(x);if(!t)return t;
  if(t===t.toUpperCase() && /[A-ZА-ЯЁ]/.test(t) && !acronym.has(t) && t.length>4)return t.toLocaleLowerCase();
  return t;
 };
 const lemma=x=>{
  const w=natural(x);
  if(/\s/.test(w))return w;
  const exceptions={forecasted:'forecast',statements:'statement',forecasts:'forecast',payments:'payment',risks:'risk',predictions:'prediction',companies:'company',went:'go',made:'make',took:'take'};
  return exceptions[w.toLowerCase()]||w;
 };
 const isEligible=n=>{const e=n?.nodeType===1?n:n?.parentElement;return !!e?.closest('.lesson')&&!e.closest('textarea,input,select,button,a,.selection-translate')};
 function contextFor(r){
  const e=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
  const t=clean(e?.closest('p,li,article,.term,.question-item,.gap-item')?.textContent||e?.parentElement?.textContent||'');
  if(t.length<280)return t;
  const at=t.toLowerCase().indexOf(phrase.toLowerCase());
  return t.slice(Math.max(0,at-100),Math.max(0,at-100)+260);
 }
 function locate(){
  if(!range||!pop.classList.contains('is-visible'))return;
  const rect=range.getBoundingClientRect(),margin=10;
  const header=document.querySelector('header')?.getBoundingClientRect().bottom||0;
  const pager=document.querySelector('.pager')?.getBoundingClientRect().top||innerHeight;
  const width=pop.offsetWidth;
  pop.style.left=Math.round(Math.max(margin,Math.min(innerWidth-width-margin,rect.left)))+'px';
  pop.style.maxHeight=Math.max(150,pager-header-25)+'px';
  const below=pager-rect.bottom-8,above=rect.top-header-8;
  pop.style.top=Math.round(below>pop.offsetHeight||below>=above?rect.bottom+8:Math.max(header+8,rect.top-pop.offsetHeight-8))+'px';
 }
 function showStatus(t){status.textContent=t;}
 function hide(){pop.classList.remove('is-visible');range=null;controller?.abort();seq++;}
 const fetchTranslation=async(q,signal)=>{
  const response=await fetch('https://api.mymemory.translated.net/get?'+new URLSearchParams({q,langpair:from+'|'+to}),{signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json(),result=natural(data?.responseData?.translatedText);
  if(!result||Number(data?.responseStatus||0)>=400||/QUERY LENGTH LIMIT|MYMEMORY WARNING/i.test(result))throw Error('Translation unavailable');
  return result;
 };
 async function translate(){
  controller?.abort();const id=++seq;controller=new AbortController();
  const signal=controller.signal,timeout=setTimeout(()=>controller.abort(),8000);
  directionEl.textContent=from.toUpperCase()+' → '+to.toUpperCase();
  google.href='https://translate.google.com/?'+new URLSearchParams({sl:from,tl:to,text:phrase,op:'translate'});
  google.hidden=true;retry.hidden=true;
  const key=cacheId(),cached=cache[key];
  if(cached){if(!edited)target.value=cached.value;contextEl.textContent=cached.context||'';saveBtn.disabled=!target.value.trim();showStatus('Перевод из кеша');clearTimeout(timeout);return;}
  const dictionary=from==='en'?known.get(phrase.toLowerCase()):null;
  const polysemy={
    statement:[[/\b(bank|account|monthly|sent)\b/i,'выписка, заявление, утверждение'],[/.*/,'заявление, утверждение, выписка']],
    bank:[[/\briver\b/i,'берег, банк'],[/.*/,'банк, берег']],
    charge:[[/\b(delivery|fee|pay|cost|service)\b/i,'плата, заряд, обвинение'],[/.*/,'заряд, плата, обвинение']],
    interest:[[/\b(rate|loan|credit|bank)\b/i,'процент, интерес, заинтересованность'],[/.*/,'интерес, процент, заинтересованность']],
    balance:[[/\b(cash|account|bank|payment)\b/i,'остаток, баланс, равновесие'],[/.*/,'баланс, равновесие, остаток']],
    capital:[[/\b(investment|financial|raise|business)\b/i,'капитал, столица, заглавная буква'],[/.*/,'столица, капитал, заглавная буква']]
  };
  const special=from==='en' ? polysemy[phrase.toLowerCase()]?.find(([pattern])=>pattern.test(sentence))?.[1] : null;
  if(dictionary||special){
   const value=special||dictionary;
   if(!edited)target.value=value;
   saveBtn.disabled=!target.value.trim();
   showStatus('Перевод из словаря урока · учитываем контекст');
   cache[key]={value,context:''};try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch{}
   clearTimeout(timeout);return;
  }
  showStatus('Переводим…');contextEl.textContent='';
  try{
   const [word,whole]=await Promise.allSettled([fetchTranslation(phrase,signal),sentence&&sentence!==phrase?fetchTranslation(sentence.slice(0,450),signal):Promise.resolve('')]);
   if(id!==seq)return;
   if(word.status!=='fulfilled')throw word.reason;
   if(!edited)target.value=word.value;
   const translatedContext=whole.status==='fulfilled'&&whole.value?'Контекст: '+whole.value:'';
   contextEl.textContent=translatedContext;
   saveBtn.disabled=!target.value.trim();
   showStatus('Перевод выделения · проверьте значение в контексте');
   cache[key]={value:word.value,context:translatedContext};
   const entries=Object.entries(cache).slice(-80);cache=Object.fromEntries(entries);
   try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch{}
  }catch(e){
   if(id!==seq)return;
   showStatus('Нет ответа от переводчика. Можно ввести перевод вручную.');
   retry.hidden=false;google.hidden=false;
  }finally{clearTimeout(timeout);locate();}
 }
 function selectionOpen(){
  const sel=window.getSelection();
  if(!sel||sel.isCollapsed||!sel.rangeCount||!isEligible(sel.anchorNode)||!isEligible(sel.focusNode))return;
  const selected=clean(sel.toString());if(!selected)return;
  const r=sel.getRangeAt(0);
  if(range&&phrase===selected&&range.compareBoundaryPoints(Range.START_TO_START,r)===0&&range.compareBoundaryPoints(Range.END_TO_END,r)===0)return;
  range=r.cloneRange();phrase=selected;sentence=contextFor(r);
  from=/[А-Яа-яЁё]/.test(phrase)?'ru':'en';to=from==='en'?'ru':'en';
  source.value=lemma(phrase);target.value='';edited=false;saveBtn.disabled=true;
  contextEl.textContent='';showStatus('Переводим…');retry.hidden=true;google.hidden=true;
  pop.classList.add('is-visible');locate();translate();
 }
 target.addEventListener('input',()=>{edited=true;saveBtn.disabled=!target.value.trim();});
 source.addEventListener('input',()=>{saveBtn.disabled=!target.value.trim()||!source.value.trim();});
 swap.addEventListener('click',()=>{[from,to]=[to,from];edited=false;target.value='';translate();});
 retry.addEventListener('click',()=>{edited=false;translate();});
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(selectionOpen,90);};
 document.addEventListener('mouseup',e=>{if(!pop.contains(e.target))schedule()});
 document.addEventListener('touchend',e=>{if(!pop.contains(e.target))setTimeout(selectionOpen,230)},{passive:true});
 document.addEventListener('keyup',e=>{if(e.key==='Shift'||e.key.startsWith('Arrow'))schedule()});
 document.addEventListener('scroll',locate,true);window.addEventListener('resize',locate);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 document.addEventListener('pointerdown',e=>{if(pop.classList.contains('is-visible')&&!pop.contains(e.target))hide()});
 document.querySelectorAll('#back,#next').forEach(el=>el.addEventListener('click',hide));
 saveBtn.addEventListener('click',()=>{
  const word=makeWord(source.value,target.value.trim());
  if(saveVocabulary(word)){saveBtn.textContent='✓';saveBtn.disabled=true;}
 });
})();

const liveScript = document.createElement('script');
liveScript.src = document.body.dataset.liveScript;
document.head.append(liveScript);
})();
