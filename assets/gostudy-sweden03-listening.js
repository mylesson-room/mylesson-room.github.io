/* Original A2 listening dialogue for Sweden lesson 3.
 * Uses built-in speech synthesis after a user gesture; transcript is always available.
 * No audio recording or third-party service. Harmless if speech synthesis is absent.
 */
(() => {
  'use strict';
  if (!document.body.matches('[data-classroom-course="sweden-a2"][data-classroom-lesson="sweden-a2-03.html"]')) return;
  const panel=document.querySelector('#page-2 .panel');
  if(!panel || panel.querySelector('.sweden-listening'))return;
  const text=[
    "Passenger: Excuse me. Is the ten twenty train to Lindby on time?",
    "Assistant: I'm sorry. It is delayed by twenty-five minutes.",
    "Passenger: Oh. What time does it leave now?",
    "Assistant: At ten forty-five, from platform four.",
    "Passenger: Do I have to change trains?",
    "Assistant: No, it is a direct train. You can wait here.",
    "Passenger: Thank you. I have an e-ticket. Do I have to print it?",
    "Assistant: No, you don't have to. You can show it on your phone."
  ];
  const box=document.createElement('section');
  box.className='sweden-listening tip';
  const heading=document.createElement('h3');heading.textContent='🎧 Listen at the station';
  const desc=document.createElement('p');desc.textContent='First listen without reading. What changed? Then check the transcript and repeat two useful questions.';
  const play=document.createElement('button');play.className='primary';play.type='button';play.textContent='▶ Listen';
  const stop=document.createElement('button');stop.type='button';stop.className='outline';stop.textContent='Stop';stop.hidden=true;
  const status=document.createElement('p');status.setAttribute('role','status');
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Transcript';
  const script=document.createElement('p');script.style.whiteSpace='pre-line';script.textContent=text.join('\n');
  details.append(summary,script);box.append(heading,desc,play,stop,status,details);
  panel.querySelector('.lead')?.after(box);
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){
    play.disabled=true;status.textContent='Audio playback is not available in this browser. Use the transcript with your teacher.';
    return;
  }
  let running=false,index=0;
  const end=()=>{running=false;stop.hidden=true;play.disabled=false;play.textContent='▶ Listen';};
  const say=()=>{
    if(!running||index>=text.length){end();return;}
    const utterance=new SpeechSynthesisUtterance(text[index++]);
    utterance.lang='en-GB';utterance.rate=0.83;utterance.pitch=index%2===0?0.96:1.06;
    utterance.onend=say;utterance.onerror=()=>{status.textContent='Audio is unavailable. Open the transcript instead.';end();};
    speechSynthesis.speak(utterance);
  };
  play.addEventListener('click',()=>{
    speechSynthesis.cancel();running=true;index=0;play.disabled=true;stop.hidden=false;status.textContent='Playing the original dialogue…';say();
  });
  stop.addEventListener('click',()=>{running=false;speechSynthesis.cancel();end();status.textContent='Stopped.';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;speechSynthesis.cancel();end();}});
  window.addEventListener('pagehide',()=>{running=false;speechSynthesis.cancel();},{once:true});
})();
