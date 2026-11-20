/* Original A2 listening dialogue for Sweden lesson 2.
 * Uses built-in speech synthesis after a user gesture; transcript is always available.
 * No audio recording or third-party service. Harmless if speech synthesis is absent.
 */
(() => {
  'use strict';
  if (!document.body.matches('[data-classroom-course="sweden-a2"][data-classroom-lesson="sweden-a2-02-michael.html"]')) return;
  const findPanel=()=>document.querySelector('#page-4 .panel');
  if(findPanel()?.querySelector('.sweden-listening'))return;
  const text=[
    "Traveller: Good morning. Can we eat in, please?",
    "Assistant: Of course. There is a free table near the window.",
    "Traveller: Great. I'd like a sandwich and a cup of tea, please.",
    "Assistant: Certainly. That's ninety-five kronor.",
    "Traveller: Can I have a receipt, please?",
    "Assistant: Yes, here you are.",
    "Traveller: Excuse me, where is the museum entrance?",
    "Assistant: It's around the corner, next to the bookshop.",
    "Traveller: Thanks for your help!",
    "Assistant: You're welcome. Enjoy your day."
  ];
  const box=document.createElement('section');
  box.className='sweden-listening tip';
  const heading=document.createElement('h3');heading.textContent='🎧 Listen at the café';
  const desc=document.createElement('p');desc.textContent='First listen without reading. What does the traveller order? Then check the transcript and repeat two useful questions.';
  const play=document.createElement('button');play.className='primary';play.type='button';play.textContent='▶ Listen';
  const stop=document.createElement('button');stop.type='button';stop.className='outline';stop.textContent='Stop';stop.hidden=true;
  const status=document.createElement('p');status.setAttribute('role','status');
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Transcript';
  const script=document.createElement('p');script.style.whiteSpace='pre-line';script.textContent=text.join('\n');
  details.append(summary,script);box.append(heading,desc,play,stop,status,details);
  const attach=()=>{
    const panel=findPanel();
    if(!panel || panel.querySelector('.sweden-listening'))return false;
    const introduction=panel.querySelector('.lead');
    if(introduction)introduction.after(box);else panel.prepend(box);
    return true;
  };
  if(!attach()){
    const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});
    observer.observe(document.body,{subtree:true,childList:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
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
    speechSynthesis.cancel();running=true;index=0;play.disabled=true;stop.hidden=false;status.textContent='Playing the café dialogue…';say();
  });
  stop.addEventListener('click',()=>{running=false;speechSynthesis.cancel();end();status.textContent='Stopped.';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;speechSynthesis.cancel();end();}});
  window.addEventListener('pagehide',()=>{running=false;speechSynthesis.cancel();},{once:true});
})();
