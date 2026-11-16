const WORDS_STORAGE_KEY = document.body.dataset.vocabularyKey || 'gostudy-business-ai-shared-v1';
const wordsDialog = document.querySelector('#words');
const wordsList = document.querySelector('#wordsList');
const practiceDialog = document.querySelector('#practiceDialog');
let practiceWords = [], practiceIndex = 0;

function loadSavedWords() {
  if (window.FinanceLive?.connected()) return FinanceLive.words();
  if (document.body.dataset.classroomCourse) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(WORDS_STORAGE_KEY) || '{}');
    if (!Array.isArray(saved.words)) return [];
    return saved.words.filter(w => w && typeof w.en === 'string' && w.en.trim())
      .map(w => ({en:w.en.trim(),ru:String(w.ru || '').trim()}));
  } catch (error) { console.warn('Vocabulary could not be loaded:', error); return []; }
}
function updateVocabularyCount() {
  const count = loadSavedWords().length;
  document.querySelector('#vocabCount').textContent = count ? count + ' ' + (count % 10 === 1 && count % 100 !== 11 ? 'слово' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'слова' : 'слов') + ' сохранено' : 'Добавляйте слова из урока';
}
function openVocabulary() {
  const words = loadSavedWords();
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
  document.querySelector('#wordsTotal').textContent = 'Сохранено: ' + words.length;
  document.querySelector('#practiceFromWords').disabled = words.length === 0;
  if (!wordsDialog.open) wordsDialog.showModal();
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
      btn.addEventListener('click',()=>{if(normalized(option)===normalized(word.ru)){showFeedback('Верно! '+word.en+' — '+word.ru,true);container.querySelectorAll('button').forEach(b=>b.disabled=true);}else showFeedback('Попробуйте ещё раз.');});
      container.append(btn);
    }
  }
}
function setPracticeMode(mode) {
  if(!practiceModes.includes(mode))return;
  practiceMode=mode;practiceIndex=0;drawPractice();
}
function openPractice() {
  practiceWords=loadSavedWords().filter(w=>w.ru);
  practiceIndex=0;practiceMode='cards';drawPractice();
  if(wordsDialog.open)wordsDialog.close();
  if(!practiceDialog.open)practiceDialog.showModal();
}
document.querySelector('#openWords').addEventListener('click',openVocabulary);

document.querySelector('#practiceCard').addEventListener('click',openPractice);
document.querySelector('#practiceFromWords').addEventListener('click',openPractice);
practiceEl('#practiceModes').addEventListener('click',event=>{const mode=event.target.closest('button')?.dataset.mode;if(mode)setPracticeMode(mode);});
practiceEl('#speakWord').addEventListener('click',speakPracticeWord);
practiceEl('#practiceTypeForm').addEventListener('submit',event=>{event.preventDefault();const word=practiceWords[practiceIndex];if(normalized(practiceEl('#practiceInput').value)===normalized(word.en))showFeedback('Верно! '+word.en+' — '+word.ru,true);else showFeedback('Попробуйте ещё раз.');});
practiceEl('#revealWord').addEventListener('click',()=>{const word=practiceWords[practiceIndex];showFeedback(word.en+' — '+word.ru,true);});
practiceEl('#nextWord').addEventListener('click',()=>{practiceIndex++;drawPractice();});
practiceEl('#restartPractice').addEventListener('click',()=>{practiceIndex=0;drawPractice();});
window.addEventListener('pageshow',updateVocabularyCount);
window.addEventListener('storage',event => {if(event.key === WORDS_STORAGE_KEY)updateVocabularyCount();});
updateVocabularyCount();