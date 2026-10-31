// Hero entrance, statement word reveal, floating dock menu.
document.documentElement.classList.add('js');
document.body.classList.add('js');
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

// Statement: words light up as the paragraph scrolls through the middle of the screen
const statement = document.querySelector('[data-statement]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (statement && !reduceMotion) {
  const text = statement.textContent.trim();
  statement.setAttribute('aria-label', text);
  statement.innerHTML = text.split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const words = statement.querySelectorAll('.w');
  const update = () => {
    const r = statement.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const lit = Math.round(progress * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// Dock menu
const toggle = document.querySelector('.dock-toggle');
const menu = document.getElementById('dock-menu');
const setOpen = (open) => {
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (open) menu.querySelector('a').focus();
};
toggle.addEventListener('click', () => setOpen(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
});
document.addEventListener('click', (e) => {
  if (!menu.hidden && !e.target.closest('.dock')) setOpen(false);
});
