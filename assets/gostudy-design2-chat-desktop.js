/* UI-only default for Michael's shared collapsible chat on legacy v1 lessons.
   Keep the existing chat DOM, events, answer/word sync and course authorization.
   Desktop chat starts open for teaching; mobile stays compact.
 */
(() => {
  'use strict';
  if (document.body.dataset.premiumFeed !== 'michael-v1') return;
  if (!window.matchMedia('(min-width: 801px)').matches) return;
  const dropdown = document.querySelector('#lessonVideo .lesson-chat-dropdown');
  if (dropdown) dropdown.open = true;
})();
