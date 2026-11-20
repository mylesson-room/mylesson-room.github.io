/* Sweden A2 cloud vocabulary — persistent per authorized student across devices.
 * Zero legacy import, no localStorage. Supabase is the source of truth.
 * Uses existing GoStudy authentication and a server-verified, student-only save RPC.
 */
(() => {
  'use strict';
  if (document.body.dataset.cloudVocabulary !== 'sweden-a2') return;
  const auth = () => window.GoStudyFinanceAuth;
  const records = new Map();
  let ready = false, loading = null, lastError = '', version=0;
  const normalize = word => ({
    en: String(word?.en || '').trim().replace(/\s+/g,' ').slice(0,150),
    ru: String(word?.ru || '').trim().replace(/\s+/g,' ').slice(0,300)
  });
  function notify(added=false,word=null) {
    document.dispatchEvent(new CustomEvent('finance-word',{
      detail:{word:word||{en:'',ru:''},notify:added}
    }));
    document.dispatchEvent(new CustomEvent('sweden-cloud-word-state',{
      detail:{ready,error:lastError,count:records.size}
    }));
  }
  async function request(path,options={}){
    const a=auth();
    if(!a?.userId())throw Error('Войдите в GoStudy, чтобы сохранять слова.');
    const token=await a.token();
    const result=await a.request(path,options,token);
    if(!result.ok)throw Error('Сервер не подтвердил сохранение слов ('+result.status+').');
    return result.data;
  }
  async function refresh(){
    if(loading)return loading;
    loading=(async()=>{
      try{
        const observedVersion=version;
        const rows=await request('/rest/v1/gostudy_sweden_words?select=en,ru,word_key,updated_at&order=updated_at.asc');
        if(!Array.isArray(rows))throw Error('Некорректный ответ словаря.');
        // Do not overwrite a newly ACKed save with a stale GET from before it.
        if(observedVersion!==version)return;
        records.clear();
        for(const row of rows){
          const word=normalize(row);
          if(word.en&&word.ru)records.set(word.en.toLocaleLowerCase('en'),word);
        }
        lastError='';ready=true;notify();
      }catch(error){lastError=error.message;ready=false;notify();throw error;}
    })().finally(()=>{loading=null;});
    return loading;
  }
  async function save(item){
    const word=normalize(item);
    if(!word.en||!word.ru)throw Error('Укажите слово и перевод.');
    // The teacher can add a word for Olga only through a separately
    // membership-verified RPC. Students always save to their own account.
    const targetStudent=auth()?.classroomStudent || null;
    const endpoint=targetStudent
      ? '/rest/v1/rpc/gostudy_sweden_save_teacher_word'
      : '/rest/v1/rpc/gostudy_sweden_save_word';
    const payload=targetStudent
      ? {p_student:targetStudent,p_en:word.en,p_ru:word.ru}
      : {p_en:word.en,p_ru:word.ru};
    const rows=await request(endpoint,{method:'POST',body:payload});
    if(!Array.isArray(rows)||rows.length!==1||
        String(rows[0].en)!==word.en||String(rows[0].ru)!==word.ru)
      throw Error('Сервер не подтвердил добавление слова.');
    const key=word.en.toLocaleLowerCase('en');
    const added=!records.has(key);
    version++;
    records.set(key,word);ready=true;lastError='';
    notify(added,word);return word;
  }
  window.GoStudySwedenCloudWords={
    words:()=>Array.from(records.values()),
    save,refresh,isReady:()=>ready,lastError:()=>lastError
  };
  if(auth()?.userId()){
    refresh().catch(error=>console.warn('Sweden cloud vocabulary:',error.message));
    // Cross-device updates appear when the user revisits or while the tab is open.
    setInterval(()=>{
      if(!document.hidden)refresh().catch(()=>{});
    },8000);
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)refresh().catch(()=>{});
    });
  }
})();
