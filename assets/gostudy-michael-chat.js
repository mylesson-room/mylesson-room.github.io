/* Collapsible chat, Michael pilot only. Existing chat DOM and event handlers are preserved. */
(() => {
  'use strict';
  if (document.body.dataset.premiumFeed !== 'michael-v1') return;

  const chat = document.querySelector('#lessonVideo .finance-chat');
  if (!chat || chat.closest('.lesson-chat-dropdown')) return;

  const dropdown = document.createElement('details');
  dropdown.className = 'lesson-chat-dropdown';
  const summary = document.createElement('summary');
  summary.className = 'lesson-chat-toggle';
  summary.innerHTML = `
    <span class="lesson-chat-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 11.5a8 8 0 0 1-8 8c-1.4 0-2.8-.37-4-1.03L3 20l1.53-4.86A8 8 0 1 1 20 11.5Z"/>
        <path d="M8 11.5h8"/>
      </svg>
    </span>
    <span>Чат урока</span>
    <span class="lesson-chat-spacer"></span>
    <span class="lesson-chat-unread" hidden aria-live="polite"></span>
    <svg class="lesson-chat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  `;

  // Move, don't recreate: preserving chat form handlers, current messages and realtime subscription.
  chat.before(dropdown);
  dropdown.append(summary, chat);

  let unread = 0;
  const badge = summary.querySelector('.lesson-chat-unread');
  const renderUnread = () => {
    badge.hidden = unread === 0;
    badge.textContent = unread ? String(Math.min(99, unread)) + (unread > 99 ? '+' : '') : '';
    badge.setAttribute('aria-label', unread ? 'Новых сообщений: ' + unread : 'Нет новых сообщений');
  };

  dropdown.addEventListener('toggle', () => {
    if (dropdown.open) {
      unread = 0;
      renderUnread();
      const messages = chat.querySelector('#finance-messages');
      if (messages) messages.scrollTop = messages.scrollHeight;
    }
  });

  // Only genuinely new messages from the other participant count as unread.
  // Historical events replayed during initial connection do not count.
  document.addEventListener('finance-event', event => {
    const {kind, own, initial} = event.detail || {};
    if (kind !== 'chat' || own || initial || dropdown.open) return;
    unread += 1;
    renderUnread();
  });
})();
