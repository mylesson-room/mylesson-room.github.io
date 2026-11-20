/* Reusable tools for the approved GoStudy lesson shell.
   Classroom chat requires the existing authenticated, RLS-protected room.
   Never infer a student identity or create a room from a public lesson URL. */
(() => {
  'use strict';
  if (!document.body.hasAttribute('data-gostudy-approved-lesson')) return;
  const sidebar = document.querySelector('.room > .side');
  if (!sidebar) return;
  const call = sidebar.querySelector('.call');
  if (call) {
    const actions = document.createElement('div');
    actions.className = 'gostudy-approved-call-actions';
    const link = document.createElement('a');
    link.href = 'https://telemost.yandex.ru/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Открыть Телемост ↗';
    link.setAttribute('aria-label','Открыть видеосвязь в Яндекс Телемосте');
    actions.append(link);
    call.after(actions);
  }
  const section = document.createElement('section');
  section.className = 'panel gostudy-approved-chat';
  section.setAttribute('aria-label','Чат урока');
  const title = document.createElement('h2');
  title.textContent = 'Чат урока';
  const status = document.createElement('p');
  status.id = 'finance-live-status';
  status.setAttribute('role','status');
  status.textContent = 'Проверяем доступ к чату…';
  const messages = document.createElement('ol');
  messages.id = 'finance-messages';
  messages.setAttribute('role','log');
  messages.setAttribute('aria-live','polite');
  const form = document.createElement('form');
  form.id = 'finance-chat-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 1000;
  input.required = true;
  input.disabled = true;
  input.placeholder = 'Сообщение';
  input.setAttribute('aria-label','Сообщение');
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Отправить';
  submit.disabled = true;
  form.append(input,submit);
  section.append(title,status,messages,form);
  const videoPanel = call?.closest('.panel');
  if (videoPanel) videoPanel.after(section);
  else sidebar.prepend(section);
  const seen = new Set();
  let ready = false;
  document.addEventListener('finance-ready', () => {
    ready = true;
    input.disabled = false;
    submit.disabled = false;
  });
  document.addEventListener('finance-event', event => {
    const item = event.detail;
    if (item?.kind !== 'chat' || typeof item.payload?.text !== 'string') return;
    const id = item.seq ?? item.id;
    if (id != null && seen.has(id)) return;
    if (id != null) seen.add(id);
    const li = document.createElement('li');
    if (item.own) li.classList.add('chat-own');
    const message = document.createElement('span');
    message.textContent = item.payload.text.slice(0,1000);
    li.append(message);
    if (item.payload.sentAt && !Number.isNaN(Date.parse(item.payload.sentAt))) {
      const time = document.createElement('time');
      time.dateTime = item.payload.sentAt;
      time.textContent = new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(item.payload.sentAt));
      li.append(time);
    }
    messages.append(li);
    messages.scrollTop = messages.scrollHeight;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!ready || !window.FinanceLive?.connected()) {
      status.textContent = 'Чат недоступен: нет подтверждённой общей комнаты.';
      return;
    }
    const value = input.value.trim();
    if (!value) return;
    if (window.FinanceLive.send('chat',{text:value,sentAt:new Date().toISOString()})) input.value = '';
  });
})();
