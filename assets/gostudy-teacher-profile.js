/* GoStudy teacher profile: one editor for every course/student.
   Requires approved RLS-enabled gostudy_profiles and teacher/student memberships.
   Does NOT create profiles or infer names from email/legacy labels. */
(() => {
  'use strict';
  const form = document.getElementById('teacher-profile-name-form');
  const input = document.getElementById('teacher-profile-name');
  const status = document.getElementById('teacher-profile-name-status');
  const placeholder = document.getElementById('teacher-profile-name-placeholder');
  if (!form || !input || !status || !placeholder) return;

  const auth = window.GoStudyAuth;
  let selected = null, version = 0, pendingSave = false;
  const saveButton = form.querySelector('button[type="submit"]');
  const validId = value => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(value || ''));
  function message(text) { status.textContent = text; }

  async function api(path, options = {}) {
    if (!auth) throw Error('Не удалось загрузить общую авторизацию GoStudy.');
    const jwt = await auth.token();
    const result = await auth.request(path,options,jwt);
    if (!result.ok) {
      if (result.status === 404) throw Error('Единая база профилей ещё не подключена.');
      if (result.status === 403) throw Error('Нет прав на изменение профиля этого ученика.');
      throw Error('Не удалось получить профиль. Код: ' + result.status);
    }
    return result.data;
  }

  async function chooseStudent(id) {
    selected = validId(id) ? id : null;
    const current = ++version;
    form.hidden = true;
    if (saveButton) saveButton.disabled = pendingSave;
    input.value = '';
    placeholder.hidden = !selected;
    placeholder.textContent = selected ? 'Загружаем профиль ученика…' : 'Выберите ученика, чтобы изменить его имя.';
    if (!selected) return;
    try {
      const rows = await api('/rest/v1/gostudy_profiles?select=user_id,display_name&user_id=eq.' + encodeURIComponent(selected));
      if (current !== version || selected !== id) return;
      if (!Array.isArray(rows) || rows.length !== 1) throw Error('Для этого ученика пока не создан единый профиль.');
      input.value = rows[0].display_name === 'Ученик' ? '' : String(rows[0].display_name || '').slice(0,60);
      form.hidden = false;
      if (saveButton) saveButton.disabled = pendingSave;
      placeholder.hidden = true;
      message('Имя редактирует преподаватель. Если имя неизвестно, в кабинете указано «Ученик».');
    } catch(error) {
      if (current !== version) return;
      placeholder.hidden = false;
      placeholder.textContent = error?.message || 'Не удалось открыть профиль.';
    }
  }

  document.addEventListener('gostudy-teacher-student-selected', event => {
    chooseStudent(event.detail?.studentId || null);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pendingSave) return;
    const studentId = selected;
    const submissionVersion = version;
    if (!studentId || !validId(studentId)) return;
    const displayName = input.value.trim().replace(/\s+/g,' ');
    if (!displayName || displayName.length > 60 || /[<>@]/.test(displayName)) {
      message('Введите имя от 1 до 60 символов без email и HTML.');
      return;
    }
    pendingSave = true;
    if (saveButton) saveButton.disabled = true;
    message('Сохраняем имя…');
    try {
      const updated = await api('/rest/v1/gostudy_profiles?user_id=eq.' + encodeURIComponent(studentId)+'&select=user_id,display_name',{
        method:'PATCH',
        headers:{Prefer:'return=representation'},
        body:{display_name:displayName}
      });
      if (!Array.isArray(updated) || updated.length !== 1 || updated[0].user_id !== studentId) {
        throw Error('Имя не сохранено. Проверьте права преподавателя и наличие профиля.');
      }
      // Always update the roster entry for the student whose server write succeeded.
      // The form, however, may now belong to a different selected student.
      document.dispatchEvent(new CustomEvent('gostudy-profile-updated',{
        detail:{studentId, displayName:updated[0].display_name}
      }));
      if (selected !== studentId || version !== submissionVersion) return;
      input.value = updated[0].display_name;
      message('Имя сохранено в GoStudy. Оно будет показано ученику после обновления кабинета.');
    } catch(error) {
      if (selected === studentId && version === submissionVersion)
        message(error?.message || 'Не удалось сохранить имя.');
    } finally {
      pendingSave = false;
      if (saveButton) saveButton.disabled = false;
    }
  });
})();
