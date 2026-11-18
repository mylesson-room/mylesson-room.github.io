const WORDS_STORAGE_KEY = document.body.dataset.vocabularyKey || 'gostudy-business-ai-shared-v1';
const wordsDialog = document.querySelector('#words');
const wordsList = document.querySelector('#wordsList');
const practiceDialog = document.querySelector('#practiceDialog');
let practiceWords = [], practiceIndex = 0;
const masteryEnabled = document.body.hasAttribute('data-word-mastery');
const mastery = new Map();
const masteryKey = word => String(word?.en || '').trim().toLocaleLowerCase('en');
const isLearned = word => masteryEnabled && (Boolean(word?.learned) || !!mastery.get(masteryKey(word))?.studied_at);
const activeWords = () => loadSavedWords().filter(word => !isLearned(word));
async function masteryRequest(path,options={}) {
  const auth=window.GoStudyFinanceAuth;
  if(!auth?.userId())return null;
  const response=await auth.request(path,options,await auth.token());
  if(!response.ok)throw Error('Не удалось синхронизировать статус слов ('+response.status+').');
  return response.data;
}
async function loadMastery() {
  if(!masteryEnabled)return;
  try {
    const auth=window.GoStudyFinanceAuth;
    if(!auth?.userId())return;
    const url='/rest/v1/gostudy_finance_word_progress?select=word_key,successful_count,studied_at&student_id=eq.'+encodeURIComponent(auth.userId());
    const records=await masteryRequest(url);
    mastery.clear();
    for(const record of records||[])mastery.set(record.word_key,record);
    updateVocabularyCount();
    if(wordsDialog?.open)openVocabulary();
  } catch(e){console.warn('Word mastery sync:',e.message);}
}
const solvedThisPractice=new Set();
async function markLearned(word) {
  if(!masteryEnabled || !word?.en || isLearned(word))return;
  const key=masteryKey(word);
  const auth=window.GoStudyFinanceAuth;
  if(!auth?.userId())return;
  const row={student_id:auth.userId(),word_key:key,successful_count:Math.max(1,(mastery.get(key)?.successful_count||0)+1),studied_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  try {
    await masteryRequest('/rest/v1/gostudy_finance_word_progress?on_conflict=student_id,word_key',{
      method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:row
    });
    mastery.set(key,row);
    window.FinanceLive?.send('word_mastered',{en:word.en});
    updateVocabularyCount();
    if(wordsDialog?.open)openVocabulary();
  }catch(e){
    const result=document.querySelector('#practiceProgress');
    if(result)result.textContent='Ответ верный, но статус слова не сохранился: '+e.message;
  }
}


function loadSavedWords() {
  // Authenticated Finance lessons keep their original real-time source.
  const legacy = document.body.dataset.vocabularySources;
  const storageKey = document.body.dataset.vocabularyKey || WORDS_STORAGE_KEY;
  if (legacy && window.FinanceLive?.connected()) {
    const combined = new Map();
    const read = (store,key) => {
      try {
        const saved = JSON.parse(store.getItem(key) || '{}');
        for (const word of Array.isArray(saved) ? saved : saved.words || []) {
          if (typeof word?.en === 'string' && word.en.trim()) combined.set(word.en.trim().toLowerCase(),word);
        }
      } catch {}
    };
    for (const key of [...legacy.split(' '), storageKey]) {
      read(localStorage,key);
      if (window.GoStudyStorage) read(window.GoStudyStorage,key);
    }
    for (const word of FinanceLive.words()) combined.set(word.en.trim().toLowerCase(),word);
    return [...combined.values()].map(word => ({en:word.en.trim(),ru:String(word.ru || '').trim()}));
  }
  if (window.FinanceLive?.connected()) return FinanceLive.words();
  if (document.body.dataset.classroomCourse) return [];
  // For historic course dashboards, the same canonical vocabulary UI reads
  // all previously used lesson keys without changing or deleting their data.
  const keys = [...new Set([...(legacy ? legacy.split(/\s+/).filter(Boolean) : []), storageKey])];
  const combined = new Map();
  for (const key of keys) {
    for (const store of [localStorage, window.GoStudyStorage].filter(Boolean)) {
      try {
        const saved=JSON.parse(store.getItem(key)||'{}');
        const words=Array.isArray(saved) ? saved : saved.words||[];
        for (const word of words) {
          if (typeof word?.en !== 'string' || !word.en.trim()) continue;
          const en=word.en.trim(),ru=String(word.ru||'').trim();
          combined.set(en.toLowerCase(),{en,ru});
        }
      }catch{}
    }
  }
  return [...combined.values()];
}
function updateVocabularyCount() {
  const count = masteryEnabled ? activeWords().length : loadSavedWords().length;
  document.querySelector('#vocabCount').textContent = count ? count + ' ' + (count % 10 === 1 && count % 100 !== 11 ? 'слово' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'слова' : 'слов') + ' сохранено' : 'Добавляйте слова из урока';
}
function openVocabulary() {
  const words = masteryEnabled ? loadSavedWords().filter(word=>wordTab==='learned' ? isLearned(word) : !isLearned(word)) : loadSavedWords();
  if(masteryEnabled)document.querySelectorAll('[data-word-tab]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.wordTab===wordTab));button.style.background=button.dataset.wordTab===wordTab?'#dbeaff':'#f4f8fe';});
  wordsList.replaceChildren();
  for (const word of words.slice().reverse()) {
    const item = document.createElement('li');
    const en = document.createElement('strong');
    en.textContent = word.en;
    const ru = document.createElement('span');
    ru.textContent = ' — ' + (word.ru || 'перевод не указан');
    item.append(en,ru);wordsList.append(item);
  }
  document.querySelector('#wordsEmpty').hidden = words.length !== 0;
  document.querySelector('#wordsTotal').textContent = masteryEnabled ? 'На изучении: '+activeWords().length+' · Изучено: '+loadSavedWords().filter(isLearned).length : 'Сохранено: ' + words.length;
  document.querySelector('#practiceFromWords').disabled = masteryEnabled ? activeWords().length===0 : words.length===0;
  if (!wordsDialog.open) wordsDialog.showModal();
}
let wordTab='learning';
if(masteryEnabled && wordsDialog){
  const tabs=document.createElement('div');tabs.className='vocabulary-status-tabs';
  tabs.style.cssText='display:flex;gap:8px;margin:12px 0;';
  for(const [id,name] of [['learning','На изучении'],['learned','Изучено']]){
    const button=document.createElement('button');button.type='button';button.dataset.wordTab=id;button.textContent=name;
    button.style.cssText='padding:9px 16px;border:1px solid #c9d9ed;border-radius:12px;background:#f4f8fe;cursor:pointer;font:inherit;';
    button.onclick=()=>{wordTab=id;openVocabulary();};
    tabs.append(button);
  }
  wordsList.before(tabs);
}
const practiceModes = ['cards','choice','type','listen'];
let practiceMode = 'cards';
const practiceEl = selector => document.querySelector(selector);
const normalized = text => String(text).trim().toLowerCase().replace(/\s+/g,' ').replace(/[.!?,;:]+$/,'');
function speakPracticeWord() {
  if (!window.speechSynthesis || !practiceWords[practiceIndex]) return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(practiceWords[practiceIndex].en);
  utterance.lang='en-GB';utterance.rate=.87;window.speechSynthesis.speak(utterance);
}
function showFeedback(text,correct=false) {
  const feedback=practiceEl('#practiceAnswer');
  feedback.textContent=text;feedback.hidden=false;
  feedback.dataset.correct=correct?'true':'false';
  if (correct) {practiceEl('#revealWord').hidden=true;practiceEl('#nextWord').hidden=false;}
}
function drawPractice() {
  const isEmpty=practiceWords.length===0, finished=!isEmpty && practiceIndex>=practiceWords.length;
  for (const control of practiceEl('#practiceModes').querySelectorAll('button'))control.setAttribute('aria-pressed',String(control.dataset.mode===practiceMode));
  practiceEl('#practiceFlashcard').hidden=isEmpty||finished;
  practiceEl('#practiceEmpty').hidden=!isEmpty;
  practiceEl('#revealWord').hidden=isEmpty||finished;
  practiceEl('#nextWord').hidden=true;
  practiceEl('#restartPractice').hidden=!finished;
  practiceEl('#practiceAnswer').hidden=true;
  practiceEl('#practiceTypeForm').hidden=true;
  practiceEl('#practiceOptions').hidden=true;
  practiceEl('#speakWord').hidden=isEmpty||finished||practiceMode==='type';
  practiceEl('#practiceQuestion').hidden=isEmpty||finished||practiceMode==='listen';
  const progress=finished?practiceWords.length:practiceIndex;
  practiceEl('#practiceMeter').style.width=(isEmpty?0:100*progress/practiceWords.length)+'%';
  practiceEl('#practiceProgress').textContent=isEmpty?'Сохранённых слов пока нет':finished?'Все слова повторены — '+practiceWords.length+' из '+practiceWords.length:(practiceIndex+1)+' из '+practiceWords.length;
  if(isEmpty||finished)return;
  const word=practiceWords[practiceIndex];
  const labels={cards:'Вспомните русский перевод',choice:'Выберите правильный перевод',type:'Напишите слово по-английски',listen:'Прослушайте и выберите перевод'};
  practiceEl('#practicePrompt').textContent=labels[practiceMode];
  practiceEl('#practiceQuestion').textContent=practiceMode==='type'?word.ru:word.en;
  if (practiceMode==='type') {
    practiceEl('#practiceTypeForm').hidden=false;
    practiceEl('#practiceInput').value='';
  }
  if (practiceMode==='choice'||practiceMode==='listen') {
    const container=practiceEl('#practiceOptions');container.replaceChildren();container.hidden=false;
    const other=[...new Set(practiceWords.filter(w=>normalized(w.ru)!==normalized(word.ru)).map(w=>w.ru))];
    const options=other.slice(Math.max(0,(practiceIndex*3)%Math.max(1,other.length)),Math.max(0,(practiceIndex*3)%Math.max(1,other.length))+3);
    for (const fallback of other)if(options.length<3&&!options.includes(fallback))options.push(fallback);
    options.splice(practiceIndex%(options.length+1),0,word.ru);
    if(options.length===1){const help=document.createElement('p');help.textContent='Для вариантов ответа добавьте ещё несколько слов. Пока можно открыть перевод.';container.append(help);}
    for(const option of options){
      const btn=document.createElement('button');btn.type='button';btn.textContent=option;
      btn.addEventListener('click',()=>{if(normalized(option)===normalized(word.ru)){showFeedback('Верно! '+word.en+' — '+word.ru,true);container.querySelectorAll('button').forEach(b=>b.disabled=true);if(!solvedThisPractice.has(practiceIndex)){solvedThisPractice.add(practiceIndex);markLearned(word);}}else showFeedback('Попробуйте ещё раз.');});
      container.append(btn);
    }
  }
}
function setPracticeMode(mode) {
  if(!practiceModes.includes(mode))return;
  practiceMode=mode;practiceIndex=0;drawPractice();
}
function openPractice() {
  practiceWords=(masteryEnabled?activeWords():loadSavedWords()).filter(w=>w.ru);
  solvedThisPractice.clear();
  practiceIndex=0;practiceMode='cards';drawPractice();
  if(wordsDialog.open)wordsDialog.close();
  if(!practiceDialog.open)practiceDialog.showModal();
}
document.querySelector('#openWords').addEventListener('click',openVocabulary);

document.querySelector('#practiceCard').addEventListener('click',masteryEnabled?()=>{wordTab='learning';openVocabulary();}:openPractice);
document.querySelector('#practiceFromWords').addEventListener('click',openPractice);
practiceEl('#practiceModes').addEventListener('click',event=>{const mode=event.target.closest('button')?.dataset.mode;if(mode)setPracticeMode(mode);});
practiceEl('#speakWord').addEventListener('click',speakPracticeWord);
practiceEl('#practiceTypeForm').addEventListener('submit',event=>{event.preventDefault();const word=practiceWords[practiceIndex];if(normalized(practiceEl('#practiceInput').value)===normalized(word.en)){showFeedback('Верно! '+word.en+' — '+word.ru,true);if(!solvedThisPractice.has(practiceIndex)){solvedThisPractice.add(practiceIndex);markLearned(word);}}else showFeedback('Попробуйте ещё раз.');});
practiceEl('#revealWord').addEventListener('click',()=>{const word=practiceWords[practiceIndex];showFeedback(word.en+' — '+word.ru,true);});
practiceEl('#nextWord').addEventListener('click',()=>{practiceIndex++;drawPractice();});
practiceEl('#restartPractice').addEventListener('click',()=>{practiceIndex=0;drawPractice();});
window.addEventListener('pageshow',()=>{updateVocabularyCount();loadMastery();});
document.addEventListener('finance-ready',loadMastery);
document.addEventListener('finance-word',()=>{updateVocabularyCount();if(wordsDialog.open)openVocabulary();});
window.addEventListener('storage',event => {if(event.key === WORDS_STORAGE_KEY)updateVocabularyCount();});
updateVocabularyCount();