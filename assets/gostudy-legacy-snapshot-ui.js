/* Explicit, on-device-only rescue UI. The snapshot never leaves this browser. */
(() => {
  'use strict';
  const api=window.GoStudyLegacySnapshot;
  const $=id=>document.getElementById(id);
  const status=$('status');
  const action=$('restore');
  let checkedText='';
  function announce(message){status.textContent=message;}
  function renderPreview(result){
    const parts=Object.entries(result).map(([name,rows])=>{
      const found=rows.filter(row=>row.present);
      return (name==='sweden'?'Швеция':'Турция')+': '+found.length+' из '+rows.length+' разделов';
    });
    announce(parts.join('. ')+'. Это данные только текущего браузера.');
  }
  $('inspect').addEventListener('click',()=>{
    try{renderPreview(api.inspect(localStorage));}
    catch(e){announce(e.message);}
  });
  $('export').addEventListener('click',()=>{
    if(!$('consent').checked){announce('Сначала подтвердите, что используете личное устройство.');return;}
    try{
      const raw=api.exportData(localStorage);
      const url=URL.createObjectURL(new Blob([raw],{type:'application/json;charset=utf-8'}));
      const link=document.createElement('a');
      link.href=url;
      link.download='gostudy-legacy-local-'+new Date().toISOString().slice(0,10)+'.json';
      link.hidden=true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      announce('Копия создана на этом устройстве. Сохраните файл в безопасном месте.');
    }catch(e){announce(e.message);}
  });
  $('file').addEventListener('change',async()=>{
    checkedText='';action.disabled=true;
    const file=$('file').files&&$('file').files[0];
    if(!file){announce('Выберите файл резервной копии.');return;}
    if(file.size>20*1024*1024){announce('Файл слишком большой.');return;}
    try{
      const text=await file.text();
      const p=api.previewRestore(localStorage,text);
      checkedText=text;
      action.disabled=false;
      announce('В файле: отсутствуют в этом браузере '+p.missing.length+
        ', уже совпадают '+p.identical.length+
        ', отличаются '+p.conflicts.length+'. Отличающиеся записи НЕ заменяются.');
    }catch(e){announce(e.message);}
  });
  action.addEventListener('click',()=>{
    if(!checkedText){announce('Сначала проверьте выбранный файл.');return;}
    if(!$('consent').checked){announce('Сначала подтвердите использование личного устройства.');return;}
    try{
      const p=api.restoreMissing(localStorage,checkedText);
      announce('Восстановлено отсутствующих разделов: '+p.imported.length+
        '. Без изменений: '+p.identical.length+
        '. Конфликтов (не перезаписаны): '+p.conflicts.length+
        '. Ошибок записи: '+p.failed.length+
        '. Это НЕ перенос в облако GoStudy.');
      checkedText='';action.disabled=true;
    }catch(e){announce(e.message);}
  });
})();
