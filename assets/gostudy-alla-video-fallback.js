/* Design 2: preserve REAL Telemost action while matching Michael's pre-call visual.
 * Only for the authenticated Vietnam A2 lesson; no fake media or JaaS token calls.
 * This file never touches lesson responses, dictionary, chat, or room membership.
 */
(() => {
  'use strict';
  const body = document.body;
  if (!body.hasAttribute('data-alla-video-fallback') || body.hasAttribute('data-vietnam-homework')) return;
  if (!body.classList.contains('gostudy-authorized')) return;
  const workspace = document.querySelector('#lessonVideo .video-workspace');
  const preview = workspace?.querySelector('.video-preview');
  const actions = workspace?.querySelector('.video-actions');
  const link = actions?.querySelector('a[href^="https://telemost.yandex.ru/"]');
  if (!workspace || !preview || !actions || !link || preview.querySelector('.jaas-person-tile')) return;
  // Pre-call tiles are decorations, NOT a preview of remote camera streams.
  const avatarSvg = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="10.5" r="5.1"/><path d="M6 27v-3c0-5 4.2-9 10-9s10 4 10 9v3"/></svg>';
  const tile = (role,label) => {
    const node=document.createElement('div');
    node.className='jaas-person-tile jaas-person-'+role;
    const icon=document.createElement('span');
    icon.className='jaas-person-icon';
    icon.innerHTML=avatarSvg;
    const name=document.createElement('span');
    name.className='jaas-person-label';
    name.textContent=label;
    node.append(icon,name);
    return node;
  };
  preview.replaceChildren(tile('teacher','Преподаватель'),tile('student','Ученик'));
  preview.setAttribute('role','group');
  preview.setAttribute('aria-label','Преподаватель и ученик — изображение до подключения');
  preview.removeAttribute('tabindex');
  preview.removeAttribute('title');
  const state=workspace.querySelector('.video-state');
  if(state)state.textContent='Не подключено';
  const top=workspace.querySelector('.video-top span:nth-child(2)');
  if(top)top.textContent='ВИДЕО УРОКА';
  link.classList.add('telemost-fallback-link');
  link.textContent='Открыть видео';
  link.setAttribute('aria-label','Открыть видеосвязь через Яндекс Телемост в новой вкладке');
  link.title='Телемост откроется в новой вкладке';
  link.setAttribute('rel','noopener noreferrer');
  link.setAttribute('target','_blank');
  const note=actions.querySelector(':scope > span');
  if(note)note.textContent='В новой вкладке — Телемост';
  actions.classList.add('jaas-control-bar','telemost-fallback-controls');
  workspace.classList.add('gostudy-video-fallback');
})();
