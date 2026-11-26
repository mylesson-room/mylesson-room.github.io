/* Protected General English B1 classroom: reuse the shared, real JaaS adapter. */
(() => {
  'use strict';
  if (!document.body.hasAttribute('data-dud-b1-premium') || !window.GoStudyB1VideoAuth) return;
  const sidebar = document.querySelector('.room > .side');
  const oldPanel = sidebar?.querySelector('.panel:has(.call-head)');
  if (!oldPanel) return;
  oldPanel.id = 'lessonVideo';
  oldPanel.setAttribute('aria-label', 'Видеосвязь с преподавателем');
  oldPanel.innerHTML = `
    <div class="video-workspace">
      <div class="video-top"><span class="live-dot"></span><span>LESSON VIDEO</span><span class="video-state">Not connected</span></div>
      <div class="video-preview" role="group" aria-label="Видеосвязь не подключена">
        <strong>Видеосвязь</strong><span>Подключитесь к своему уроку</span>
      </div>
      <div class="video-actions"></div>
    </div>`;
  document.body.setAttribute('data-jaas-video-pilot', '');
  document.body.dataset.jaasScope = 'b1-stories';
  const script = document.createElement('script');
  script.src = 'assets/gostudy-jaas-video.js?v=mobile-toolbar-1';
  script.onerror = () => {
    const state = oldPanel.querySelector('.video-state');
    if (state) state.textContent = 'Видео не загрузилось. Обновите страницу.';
  };
  document.body.append(script);
})();
