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
 const byId = id => document.getElementById(id);
 const pop=byId('selectionTranslate'),target=byId('selectionTarget'),saveBtn=byId('selectionSave'),google=byId('selectionGoogle');
 if(!pop||!target||!saveBtn)return;
 const clean=t=>String(t||'').replace(/\s+/g,' ').trim().slice(0,1000);
 const normalized=s=>clean(s).toLowerCase();
 const cache=new Map();
 const lessonWords=new Map((config.vocab||[]).map(row=>[normalized(row[0]),String(row[2]||'')]));
 const dictionary={
  statement:{bank:'выписка, заявление, утверждение',default:'заявление, утверждение, выписка'},
  bank:{river:'берег, банк',default:'банк, берег'},
  charge:{delivery:'плата, заряд, обвинение',default:'плата, заряд, обвинение'},
  forecast:{default:'прогноз, предсказание'},
  cash:{default:'наличные, денежные средства'},
  outlier:{default:'аномальное значение, выброс'},
  risk:{default:'риск, опасность'}
 };
 const top=document.createElement('div');top.className='context-translate-top';
 const direction=document.createElement('button');direction.type='button';direction.className='context-direction';direction.textContent='EN → RU';
 const retry=document.createElement('button');retry.type='button';retry.textContent='Повторить';retry.hidden=true;
 const status=document.createElement('span');status.className='context-translate-status';status.setAttribute('role','status');
 top.append(direction,status,retry);pop.prepend(top);
 const contextLine=document.createElement('p');contextLine.className='context-translate-sentence';
 const baseLabel=document.createElement('label');baseLabel.className='context-translate-base';baseLabel.textContent='Форма для словаря';
 const baseInput=document.createElement('input');baseInput.type='text';baseInput.autocomplete='off';baseInput.maxLength=150;baseLabel.append(baseInput);
 const meaningsLabel=document.createElement('label');meaningsLabel.className='context-translate-meaning';meaningsLabel.textContent='Значения (можно исправить)';
 const meaningsInput=document.createElement('textarea');meaningsInput.rows=2;meaningsInput.maxLength=400;meaningsLabel.append(meaningsInput);
 target.after(contextLine,baseLabel,meaningsLabel);
 const style=document.createElement('style');style.textContent=`
 .context-translate-top{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
 .context-direction,.context-translate-top button{border:1px solid #bdd4ee;background:#eff6ff;border-radius:9px;padding:5px 8px;font-size:12px;color:#1c5493;cursor:pointer}
 .context-translate-status{font-size:12px;color:#537496;flex:1}
 .context-translate-sentence{font-size:12px;line-height:1.35;margin:6px 0;color:#55677a;max-height:55px;overflow:auto}
 .context-translate-base,.context-translate-meaning{font-size:12px;color:#354c63;display:block;margin-top:7px}
 .context-translate-base input,.context-translate-meaning textarea{display:block;box-sizing:border-box;width:100%;margin-top:4px;border:1px solid #c5d6e9;border-radius:8px;padding:7px;font:inherit}
 `;document.head.append(style);
 let range=null,phrase='',sentence='',translation='',from='en',to='ru',controller=null,seq=0,timer=0,lastSelection='',manual=false;
 const isEligible=n=>{const el=n?.nodeType===1?n:n?.parentElement;return !!el?.closest('.lesson')&&!el.closest('textarea,input,select,button,a,.selection-translate')};
 const capPreserving=value=>{
   const text=clean(value);
   if(!text||/[A-Z]{2,}/.test(text.slice(1)))return text;
   if(text===text.toUpperCase()&&text.length>3)return text.charAt(0)+text.slice(1).toLowerCase();
   return text;
 };
 const lemma=value=>{
   const words=clean(value);if(!/^[a-z]+$/i.test(words))return words;
   const v=words.toLowerCase();
   for(const [key] of lessonWords)if(key===v)return key;
   if(v.endsWith('ies')&&v.length>5)return v.slice(0,-3)+'y';
   if(v.endsWith('ing')&&v.length>6)return v.slice(0,-3).replace(/(.)\1$/, '$1');
   if(v.endsWith('ed')&&v.length>4)return v.slice(0,-2);
   if(v.endsWith('s')&&!v.endsWith('ss')&&v.length>4)return v.slice(0,-1);
   return v;
 };
 function hide(){pop.classList.remove('is-visible');range=null;controller?.abort();seq++;}
 function locate(){
   if(!range||!pop.classList.contains('is-visible'))return;
   const rect=range.getBoundingClientRect(),width=pop.offsetWidth,margin=10,gap=8;
   const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0;
   const pagerTop=document.querySelector('.pager')?.getBoundingClientRect().top||innerHeight;
   const topLimit=Math.max(margin,headerBottom+margin),bottomLimit=Math.min(innerHeight-margin,pagerTop-margin);
   const left=Math.max(margin,Math.min(innerWidth-width-margin,rect.left+(rect.width-width)/2));
   const below=bottomLimit-rect.bottom-gap,above=rect.top-gap-topLimit;
   const height=pop.offsetHeight,placeBelow=below>=height||below>=above,available=placeBelow?below:above;
   if(available<50){hide();return;}
   pop.style.maxHeight=Math.floor(available)+'px';
   pop.style.left=Math.round(left)+'px';
   pop.style.top=Math.round(placeBelow?rect.bottom+gap:rect.top-gap-pop.offsetHeight)+'px';
 }
 const nearbySentence=sel=>{
   const anchor=sel.anchorNode?.parentElement?.closest('p,li,h2,h3,legend,label,.gap-prompt,.lead,.article');
   if(!anchor)return phrase;
   const text=clean(anchor.textContent);
   const sentences=text.match(/[^.!?]+[.!?]?/g)||[text];
   return clean(sentences.find(s=>normalized(s).includes(normalized(phrase)))||text).slice(0,400);
 };
 function cachedFallback(t,ctx){
   const v=normalized(t),direct=lessonWords.get(v);
   if(from==='en'&&to==='ru'&&direct)return direct;
   if(from==='ru'&&to==='en'){for(const [term,value]of lessonWords)if(normalized(value).split(',').some(x=>x.trim()===v))return term;}
   const entry=dictionary[v]||dictionary[lemma(v)];
   if(!entry||from!=='en')return '';
   const special=Object.keys(entry).find(k=>k!=='default'&&normalized(ctx).includes(k));
   return entry[special||'default']||'';
 }
 const key=()=>JSON.stringify([from,to,normalized(phrase),normalized(sentence)]);
 function paint(value,origin){
   const text=capPreserving(value);
   if(!manual){target.value=text;meaningsInput.value=text;translation=text;saveBtn.disabled=!text;}
   status.textContent=origin;retry.hidden=true;locate();
 }
 async function requestTranslate(){
   if(!phrase)return;controller?.abort();const n=++seq,cacheKey=key();
   manual=false;target.value='';meaningsInput.value='';translation='';saveBtn.disabled=true;
   direction.textContent=from.toUpperCase()+' → '+to.toUpperCase();
   google.href='https://translate.google.com/?'+new URLSearchParams({sl:from,tl:to,text:phrase,op:'translate'});google.hidden=false;
   status.textContent='Переводим…';retry.hidden=true;
   const result=cache.get(cacheKey)||cachedFallback(phrase,sentence);
   if(result){cache.set(cacheKey,result);paint(result,'Перевод по контексту · сохранён');return;}
   controller=new AbortController();
   const id=setTimeout(()=>controller.abort(),6500);
   try{
     const resp=await fetch('https://api.mymemory.translated.net/get?'+new URLSearchParams({q:phrase.slice(0,400),langpair:from+'|'+to}),{signal:controller.signal});
     if(!resp.ok)throw Error('HTTP '+resp.status);
     const data=await resp.json();
     if(n!==seq)return;
     const v=clean(data?.responseData?.translatedText);
     if(!v||Number(data?.responseStatus||0)>=400||/QUERY LENGTH LIMIT|MYMEMORY WARNING/i.test(v))throw Error('Не удалось перевести');
     cache.set(cacheKey,v);paint(v,'Перевод выделения · проверьте контекст');
   }catch(err){
     if(n!==seq)return;status.textContent='Нет связи. Можно ввести перевод вручную.';retry.hidden=false;saveBtn.disabled=!meaningsInput.value.trim();
   }finally{clearTimeout(id);locate();}
 }
 function open(){
   const selection=window.getSelection();
   if(!selection||selection.isCollapsed||!selection.rangeCount||!isEligible(selection.anchorNode)||!isEligible(selection.focusNode))return;
   const txt=clean(selection.toString());if(!txt)return;
   const selected=selection.getRangeAt(0);
   if(range&&txt===lastSelection&&range.compareBoundaryPoints(Range.START_TO_START,selected)===0&&range.compareBoundaryPoints(Range.END_TO_END,selected)===0)return;
   range=selected.cloneRange();lastSelection=phrase=txt;sentence=nearbySentence(selection);
   from=/[А-Яа-яЁё]/.test(txt)?'ru':'en';to=from==='en'?'ru':'en';
   baseInput.value=txt.includes(' ')?txt:lemma(txt);
   contextLine.textContent=sentence&&sentence!==phrase?'В предложении: '+sentence:'Выделение: '+phrase;
   saveBtn.textContent='+';saveBtn.disabled=true;pop.classList.add('is-visible');
   locate();requestTranslate();
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(open,90);}
 direction.onclick=()=>{[from,to]=[to,from];requestTranslate();};
 retry.onclick=()=>requestTranslate();
 target.oninput=()=>{manual=true;translation=target.value.trim();meaningsInput.value=translation;saveBtn.disabled=!translation;};
 meaningsInput.oninput=()=>{manual=true;saveBtn.disabled=!meaningsInput.value.trim();};
 saveBtn.onclick=()=>{
   const source=clean(baseInput.value)||phrase;
   const value=clean(meaningsInput.value||target.value);
   if(!value)return;
   const word=from==='en'?{en:source,ru:value}: {en:value,ru:source};
   if(saveVocabulary(word)){saveBtn.textContent='✓';saveBtn.disabled=true;}
 };
 document.addEventListener('mouseup',e=>{if(!pop.contains(e.target))schedule();});
 document.addEventListener('touchend',e=>{if(!pop.contains(e.target))setTimeout(open,250);},{passive:true});
 document.addEventListener('keyup',e=>{if(e.key==='Shift'||e.key.startsWith('Arrow'))schedule();});
 document.addEventListener('scroll',locate,true);window.addEventListener('resize',locate);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('pointerdown',e=>{if(pop.classList.contains('is-visible')&&!pop.contains(e.target))hide();});
 document.querySelectorAll('#back,#next').forEach(el=>el.addEventListener('click',hide));
})();

const liveScript = document.createElement('script');
liveScript.src = document.body.dataset.liveScript;
document.head.append(liveScript);
})();
