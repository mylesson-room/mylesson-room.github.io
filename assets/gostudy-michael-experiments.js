/* Михаил: экспериментальный пункт профиля, не часть общего меню других учеников. */
(() => {
  'use strict';
  const account = document.querySelector('.top .account');
  const avatar = account?.querySelector('.avatar');
  const profile = account?.querySelector('.profile');
  const chevron = account?.querySelector('.profile-chevron');
  if (!account || !avatar || !profile || !chevron) return;

  const disclosure = document.createElement('div');
  disclosure.className = 'michael-experiments';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'michael-experiments__trigger';
  trigger.id = 'michael-experiments-trigger';
  trigger.setAttribute('aria-controls', 'michael-experiments-panel');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'Михаил, Английский — открыть тестовые уроки');
  trigger.append(avatar, profile, chevron);

  const panel = document.createElement('nav');
  panel.id = 'michael-experiments-panel';
  panel.className = 'michael-experiments__panel';
  panel.setAttribute('aria-label', 'Экспериментальные уроки');
  panel.hidden = true;

  const heading = document.createElement('span');
  heading.className = 'michael-experiments__eyebrow';
  heading.textContent = 'Лаборатория GoStudy';

  const link = document.createElement('a');
  link.className = 'michael-experiments__link';
  link.href = 'michael-travel-animation-lab.html';
  const title = document.createElement('span');
  title.className = 'michael-experiments__link-title';
  title.textContent = 'Тест';
  const subtitle = document.createElement('small');
  subtitle.textContent = 'Путешествия';
  const arrow = document.createElement('span');
  arrow.className = 'michael-experiments__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  link.append(title, subtitle, arrow);
  panel.append(heading, link);
  disclosure.append(trigger, panel);
  account.append(disclosure);

  const setOpen = (open) => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    disclosure.classList.toggle('is-open', open);
  };
  trigger.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('pointerdown', event => {
    if (!disclosure.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });
})();
