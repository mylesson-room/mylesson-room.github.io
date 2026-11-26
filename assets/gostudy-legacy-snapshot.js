/* Read-only local legacy data capture + explicit non-overwriting restore.
   No network requests, automatic migration, authentication tokens or database writes.
   This is NOT a Supabase backup. Keep exact raw localStorage bytes. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.GoStudyLegacySnapshot=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const FORMAT='gostudy-legacy-local-v1';
  const GROUPS=Object.freeze({
    sweden:Object.freeze([
      'gostudy-sweden-a2-v2',
      'gostudy-sweden-a2-lesson02-v1',
      'gostudy-sweden-a2-homework01-v1',
      'gostudy-sweden-a2-homework02-v1',
      'gostudy-student-profile-v1'
    ]),
    turkey:Object.freeze([
      'gostudy-turkey-b1-v1',
      'gostudy-turkey-profile-v1'
    ])
  });
  const ALLOWED=new Set(Object.values(GROUPS).flat());
  const MAX_KEY_BYTES=2*1024*1024;
  function requiredStorage(store){
    if(!store || typeof store.getItem!=='function' ||
        typeof store.setItem!=='function')throw Error('Локальное хранилище недоступно.');
  }
  function inspect(store){
    requiredStorage(store);
    return Object.fromEntries(Object.entries(GROUPS).map(([group,keys])=>[
      group,keys.map(key=>{
        const raw=store.getItem(key);
        return {key,present:raw!==null,bytes:raw===null?0:raw.length};
      })
    ]));
  }
  function exportData(store,createdAt){
    requiredStorage(store);
    const keys=Object.create(null);
    for(const key of ALLOWED){
      const raw=store.getItem(key);
      if(raw===null)continue;
      if(raw.length>MAX_KEY_BYTES)throw Error('Слишком большой раздел: '+key);
      keys[key]=raw; // Exact original string; never parse or normalize student answers.
    }
    if(!Object.keys(keys).length)throw Error('Нет старых локальных данных для сохранения.');
    return JSON.stringify({
      format:FORMAT, version:1,
      created_at:createdAt||new Date().toISOString(),keys
    },null,2);
  }
  function parseBackup(input){
    if(typeof input!=='string' || input.length>20*1024*1024)
      throw Error('Некорректный размер резервного файла.');
    let payload;
    try{payload=JSON.parse(input);}catch{throw Error('Неверный JSON файла.');}
    if(!payload || payload.format!==FORMAT || payload.version!==1 ||
       !payload.keys || Array.isArray(payload.keys) ||
       typeof payload.keys!=='object')
      throw Error('Файл не является резервной копией GoStudy.');
    const keys=Object.keys(payload.keys);
    if(!keys.length)throw Error('В копии нет данных.');
    for(const key of keys){
      if(!ALLOWED.has(key))throw Error('В файле есть неизвестный раздел.');
      if(typeof payload.keys[key]!=='string' || payload.keys[key].length>MAX_KEY_BYTES)
        throw Error('Повреждён раздел: '+key);
    }
    return payload;
  }
  function previewRestore(store,input){
    requiredStorage(store);
    const data=parseBackup(input),missing=[],identical=[],conflicts=[];
    for(const [key,raw] of Object.entries(data.keys)){
      const existing=store.getItem(key);
      if(existing===null)missing.push(key);
      else if(existing===raw)identical.push(key);
      else conflicts.push(key);
    }
    return {missing,identical,conflicts};
  }
  function restoreMissing(store,input){
    requiredStorage(store);
    const data=parseBackup(input);
    const result={imported:[],identical:[],conflicts:[],failed:[]};
    // Never overwrite, remove, parse, merge or mutate an existing key.
    for(const [key,raw] of Object.entries(data.keys)){
      let existing;
      try{existing=store.getItem(key);}catch{result.failed.push(key);continue;}
      if(existing!==null){
        result[existing===raw?'identical':'conflicts'].push(key);
        continue;
      }
      try{
        store.setItem(key,raw);
        if(store.getItem(key)!==raw)throw Error('Read-back mismatch');
        result.imported.push(key);
      }catch{result.failed.push(key);}
    }
    return result;
  }
  return Object.freeze({GROUPS,inspect,exportData,parseBackup,previewRestore,restoreMissing});
});