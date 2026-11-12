(() => {
const room = document.querySelector('.room');
const sheet = room.querySelector('.sheet');
const config = JSON.parse(document.getElementById('lesson-data').textContent);
const storage = window.GoStudyStorage || localStorage;
const key = config.key;
let state;
try { state = JSON.parse(storage.getItem(key)) || {}; } catch { state = {}; }
state.answers ||= {};
let index = Math.min(Math.max(Number(state.page) || 0,0),config.steps.length-1);
const esc = value => String(value).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const save = () => storage.setItem(key,JSON.stringify({...state,page:index}));
const sections = document.querySelector('.sections');
const expand = document.querySelector('.expand');
expand.onclick = () => {
  const expanded = room.classList.toggle('wide');
  expand.setAttribute('aria-expanded',expanded);
  expand.textContent = expanded ? 'Свернуть' : 'Расширить';
};
function go(next) {
  index = next;
  save();
  render();
  sheet.querySelector('h1').focus();
}
function render() {
  const step = config.steps[index];
  const answer = state.answers[index];
  const current = Array.isArray(answer) ? answer : [];
  sections.innerHTML = '<strong>Разделы</strong>'+config.steps.map((item,i) => '<button type="button" data-step="'+i+'"'+(i===index?' aria-current="step"':'')+'>'+esc(item[0])+'</button>').join('');
  sections.querySelectorAll('button').forEach(button => { button.onclick = () => go(Number(button.dataset.step)); });
  let exercise = '';
  if (step[3] === 'choice') {
    exercise = step[4].map(([question,options],i) => '<fieldset><legend>'+esc(question)+'</legend>'+options.map((option,j) => '<label><input type="radio" name="q'+i+'" value="'+j+'"'+(current[i]===j?' checked':'')+'>'+esc(option)+'</label>').join('')+'</fieldset>').join('');
  }
  if (step[3] === 'match') {
    exercise = step[4].map(([question,options],i) => '<label>'+esc(question)+'<br><select data-answer="'+i+'"><option value="">Choose…</option>'+options.map((option,j) => '<option value="'+j+'"'+(current[i]===j?' selected':'')+'>'+esc(option)+'</option>').join('')+'</select></label>').join('');
  }
  if (step[3] === 'order') {
    const order = current.length ? current : step[4].map((_,i) => i);
    exercise = '<ol class="order">'+order.map((item,i) => '<li>'+esc(step[4][item])+' <button type="button" data-move="'+i+',-1" aria-label="Move up" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-move="'+i+',1" aria-label="Move down" '+(i===order.length-1?'disabled':'')+'>↓</button></li>').join('')+'</ol>';
  }
  const source = step[2].length ? '<div class="source">'+step[2].map(p => '<p>'+esc(p)+'</p>').join('')+'</div>' : '';
  sheet.innerHTML = '<p class="label">'+esc(config.title)+' · '+(index+1)+' / '+config.steps.length+'</p><h1 tabindex="-1">'+esc(step[0])+'</h1><p>'+esc(step[1])+'</p>'+source+(exercise?'<section class="activity">'+exercise+'<button type="button" class="check">Check answers</button><p role="status" class="result"></p></section>':'')+'<div class="step-nav"><button type="button" class="back" '+(index===0?'disabled':'')+'>← Back</button>'+(index+1===config.steps.length?'<a class="cta home-link" href="'+esc(config.cabinet)+'">Back to my course</a>':'<button type="button" class="cta next">Next →</button>')+'</div>';
  sheet.querySelector('.back').onclick = () => go(index-1);
  const next = sheet.querySelector('.next');
  if (next) next.onclick = () => go(index+1);
  sheet.querySelectorAll('input,select').forEach(input => {
    input.onchange = () => {
      const i = Number(input.dataset.answer ?? input.name.slice(1));
      current[i] = input.value === '' ? null : Number(input.value);
      state.answers[index] = current;
      save();
      sheet.querySelector('.result').textContent = '';
    };
  });
  sheet.querySelectorAll('[data-move]').forEach(button => {
    button.onclick = () => {
      const [i,shift] = button.dataset.move.split(',').map(Number);
      const order = current.length ? current : step[4].map((_,j) => j);
      [order[i],order[i+shift]] = [order[i+shift],order[i]];
      state.answers[index] = order;
      save();
      render();
      const control = sheet.querySelector('[data-move="'+(i+shift)+','+shift+'"]:not(:disabled)');
      (control || sheet.querySelector('h1')).focus();
    };
  });
  const check = sheet.querySelector('.check');
  if (check) check.onclick = () => {
    const order = step[3] === 'order';
    const expected = order ? step[5] : step[4].map(item => item[2]);
    const actual = order && !current.length ? step[4].map((_,i) => i) : current;
    const score = expected.filter((value,i) => actual[i] === value).length;
    const result = sheet.querySelector('.result');
    result.className = 'result '+(score===expected.length?'good':'retry');
    result.textContent = score+' / '+expected.length+' correct. '+(score===expected.length?'Well done!':step[6]);
  };
}
render();
})();