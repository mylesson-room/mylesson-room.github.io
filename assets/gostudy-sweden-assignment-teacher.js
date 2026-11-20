/* Teacher-only Olga lesson selector. No ownership is trusted from browser input:
 * authorized roster RPC + RLS PATCH both must approve this teacher.
 */
(async () => {
  'use strict';
  const auth=window.GoStudyFinanceAuth;
  const form=document.querySelector('#sweden-assignment-form');
  const field=document.querySelector('#sweden-lesson');
  const save=form?.querySelector('button[type=submit]');
  const status=document.querySelector('#sweden-assignment-status');
  if(!form||!field||!save||!status)return;
  const allowed=new Set(['sweden-a2-02.html','sweden-a2-03.html']);
  let studentId=null,busy=false;
  const report=text=>{status.textContent=text;};
  async function api(path,options={}){
    const token=await auth.token();
    const response=await auth.request(path,options,token);
    if(!response.ok)throw Error('Сервер отклонил запрос ('+response.status+').');
    return response.data;
  }
  if(!auth?.userId()){
    report('Войдите в GoStudy как преподаватель, затем откройте эту страницу заново.');
    return;
  }
  try{
    const users=await api('/rest/v1/rpc/gostudy_legacy_teacher_view',{
      method:'POST',body:{p_course:'sweden_a2'}
    });
    if(!Array.isArray(users)||users.length!==1||!users[0]?.id)
      throw Error('Не удалось однозначно подтвердить, что Вы преподаватель Ольги.');
    studentId=users[0].id;
    const query='/rest/v1/gostudy_sweden_lesson_selection?'+new URLSearchParams({
      select:'student_id,teacher_id,lesson_path',student_id:'eq.'+studentId
    });
    const rows=await api(query);
    if(!Array.isArray(rows)||rows.length!==1)
      throw Error('Защищённая таблица назначений ещё не настроена. У ученицы остаётся урок 2.');
    const row=rows[0];
    if(row.teacher_id!==auth.userId() || row.student_id!==studentId)
      throw Error('Нет права изменять назначение.');
    if(!allowed.has(row.lesson_path))throw Error('В базе указан неизвестный урок.');
    field.value=row.lesson_path;
    field.disabled=false;
    save.disabled=false;
    report('Текущее назначение загружено. Выбор сохраняется в защищённой базе и виден с любого устройства.');
  }catch(error){report(error.message);}
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!studentId||!allowed.has(field.value))return;
    busy=true;save.disabled=true;field.disabled=true;
    try{
      const response=await api('/rest/v1/gostudy_sweden_lesson_selection?student_id=eq.'+encodeURIComponent(studentId),{
        method:'PATCH',headers:{Prefer:'return=representation'},body:{lesson_path:field.value}
      });
      if(!Array.isArray(response)||response.length!==1||response[0]?.lesson_path!==field.value)
        throw Error('Назначение не подтвердилось — обновите страницу.');
      report('Сохранено: '+field.selectedOptions[0].textContent+'. Новый выбор появится у Ольги после обновления кабинета.');
    }catch(error){report('Ошибка сохранения: '+error.message);}
    finally{busy=false;save.disabled=false;field.disabled=false;}
  });
})();
