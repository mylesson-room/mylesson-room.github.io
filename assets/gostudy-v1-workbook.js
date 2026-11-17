(async () => {
const config = window.GoStudyLesson;
const {vocab:VOCAB=[], reading:READING=[], gaps:GAPS=[], advice={}, key:STORAGE, wordsKey:WORDS_KEY} = config;
const LESSONS = config.labels || config.steps;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const workbook = config.steps ? window.GoStudyExercises.render(config,esc) : null;
const student = config.privateRoom
  ? window.GoStudyPrivateAccess.userId() === config.privateRoom.teacher ? config.privateRoom.student : null
  : window.GoStudyFinanceAuth.classroomStudent;
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
  if(config.privateRoom || document.body.dataset.classroomCourse)return [];
  try{
    const v=JSON.parse(localStorage.getItem(WORDS_KEY)||"{}");
    return Array.isArray(v.words)?v.words:[];
  } catch { return []; }
}
$("#openLessonDictionary").addEventListener("click",()=>{drawWords();$("#lessonDictionary").showModal()});
function drawWords(){let w=readWords();$("#wordCountSidebar").textContent=w.length;$("#myWords").innerHTML=w.slice().reverse().map(x=>'<small><b>'+esc(x.en)+'</b> — '+esc(x.ru)+'</small>').join("")||'<small>No words saved yet.</small>'}
window.addWord=i=>{let words=readWords(),w=VOCAB[i];if(window.FinanceLive?.send("word",{en:w[0],ru:w[2]})||document.body.dataset.classroomCourse)return;if(!words.some(x=>x.en.toLowerCase()===w[0].toLowerCase())){words.push({en:w[0],ru:w[2]});try{let obj=JSON.parse(localStorage.getItem(WORDS_KEY)||"{}");obj.words=words;localStorage.setItem(WORDS_KEY,JSON.stringify(obj))}catch(e){alert("Vocabulary saving unavailable")}}drawWords()};


const {makeWord} = window.GoStudyLessonControls;
function saveVocabulary(word){
 if(!word)return false;
 if(window.FinanceLive?.send("word",word))return true;
 if(config.privateRoom || document.body.dataset.classroomCourse)return false;
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
window.GoStudyLessonControls.bindDivider();
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
});
window.GoStudyLessonControls.bindChat();

drawWords();go(location.hash === "#homework" ? LESSONS.length - 1 : state.page);
if (!config.course || workbook) replaying = false;


window.GoStudyLessonControls.bindTranslation(config,saveVocabulary);

const liveScript = document.createElement('script');
liveScript.src = document.body.dataset.liveScript;
document.head.append(liveScript);
})();
