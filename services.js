// Services & Pricing panel. Builds the panel from services.json; the open/close of the panel itself
// is handled by asbo.js like Work, About and Contact. One package (and one FAQ answer) opens at a time.
(() => {
  const panel = document.querySelector('[data-panel="services"]');
  const sheet = panel && panel.querySelector('.sheet');
  const body = panel && panel.querySelector('[data-services]');
  if (!body) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const usd = (n) => '$' + Number(n).toLocaleString('en-US');
  const list = (items) => '<ul>' + items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>';
  const plus = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12"/></svg>';

  function pkgRow(p, i, cal) {
    const label = p.billing === 'month' ? 'monthly' : p.from ? 'starting at' : 'one-time';
    return `<div class="svc-pkg" data-svc-item>
      <button class="svc-head" type="button" aria-expanded="false" aria-controls="svc-${p.id}">
        <span class="svc-row">
          <span class="svc-num">0${i + 1}</span>
          <span class="svc-main">
            <span class="svc-tier mono">${esc(p.tier)}</span>
            <span class="svc-name">${esc(p.name)}</span>
            <span class="svc-short">${esc(p.short)}</span>
          </span>
          ${p.quote
            ? `<span class="svc-price svc-quote"><span class="mono">${label}</span>Custom quote</span>`
            : `<span class="svc-price"><span class="mono">${label}</span>${usd(p.price)}${p.billing === 'month' ? '<span class="svc-per">/mo</span>' : ''}</span>`}
          <span class="svc-hint">${plus}</span>
        </span>
      </button>
      <div class="svc-body" id="svc-${p.id}" role="region" aria-label="${esc(p.tier)} details">
        <div class="svc-inner"><div>
          ${p.best && !p.bestDraft ? `<p class="svc-best">Best for: ${esc(p.best)}</p>` : ''}
          <div class="svc-cols">
            <div class="svc-in"><h4 class="mono">${esc(p.includedTitle || "What's included")}</h4>${list(p.included)}</div>
            ${p.excluded ? `<div class="svc-out"><h4 class="mono">${esc(p.excludedTitle || 'Not included')}</h4>${list(p.excluded)}</div>` : ''}
            <div><h4 class="mono">Good to know</h4><p class="svc-limits">${esc(p.limits)}</p>
              <a class="btn" href="${esc(cal)}" target="_blank" rel="noopener">Book a Free Consultation</a></div>
          </div>
        </div></div>
      </div>
    </div>`;
  }

  function faqRow(f, i) {
    return `<div class="svc-q" data-svc-item data-faq>
      <button class="svc-head" type="button" aria-expanded="false" aria-controls="svc-faq-${i}">
        <span class="svc-qrow"><span>${esc(f.q)}</span><span class="svc-hint">${plus}</span></span>
      </button>
      <div class="svc-body" id="svc-faq-${i}" role="region"><div class="svc-inner"><div><p>${esc(f.a)}</p></div></div></div>
    </div>`;
  }

  function render(d) {
    body.innerHTML = `
      <p class="sheet-lede">${esc(d.intro)}</p>
      <section class="svc-group" aria-labelledby="svc-web">
        <div class="svc-label"><h3 id="svc-web">${esc(d.websites.title)}</h3><span class="mono">${esc(d.websites.note)}</span></div>
        ${d.websites.packages.map((p, i) => pkgRow(p, i, d.calendly)).join('')}
      </section>
      ${d.additional ? `<section class="svc-group" aria-labelledby="svc-extra">
        <div class="svc-label"><h3 id="svc-extra">${esc(d.additional.title)}</h3><span class="mono">${esc(d.additional.note)}</span></div>
        <p class="svc-note">${esc(d.additional.eligibility)}</p>
        ${d.additional.packages.map((p, i) => pkgRow(p, i, d.calendly)).join('')}
      </section>` : ''}
      <section class="svc-group svc-care" aria-labelledby="svc-care">
        <div class="svc-label"><h3 id="svc-care">${esc(d.care.title)}</h3><span class="mono">${esc(d.care.note)}</span></div>
        ${d.care.eligibility ? `<p class="svc-note">${esc(d.care.eligibility)}</p>` : ''}
        ${d.care.packages.map((p, i) => pkgRow(p, i, d.calendly)).join('')}
      </section>
      <section class="svc-statement" aria-label="Clear pricing. No surprises.">
        <p class="mono">Clear pricing. No surprises.</p>
        <p class="svc-big">${esc(d.statement[0])} <em>${esc(d.statement[1])}</em></p>
        <ul class="svc-principles">${d.principles.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>
      <section class="svc-faq" aria-labelledby="svc-faq-h"><h3 id="svc-faq-h">Questions</h3>${d.faq.map(faqRow).join('')}</section>
      <div class="svc-end"><a class="btn" href="${esc(d.calendly)}" target="_blank" rel="noopener">Book a Free Consultation</a>
        <button type="button" class="svc-ask">or ask ASBO which package fits</button></div>`;
  }

  function setOpen(item, on) {
    item.classList.toggle('open', on);
    item.querySelector('.svc-head').setAttribute('aria-expanded', String(on));
  }

  // One open per group (packages, FAQ).
  // Opening a package: any open package ABOVE it folds away instantly, with the scroll compensated so the
  // tapped row doesn't move; then the new package opens and glides on one timed curve to just below the
  // top of the panel's own scroll area. An open package below folds with the normal animation.
  // FAQ answers keep the tapped row steady and don't move to the top.
  const TOP_GAP = 16;
  const gapToTop = (item) => item.getBoundingClientRect().top - sheet.getBoundingClientRect().top - TOP_GAP;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  let glide = 0;

  function collapseInstantly(o) {
    o.classList.add('svc-instant-item');
    setOpen(o, false);
    void o.offsetHeight; // apply the collapsed height now
    requestAnimationFrame(() => requestAnimationFrame(() => o.classList.remove('svc-instant-item')));
  }

  function toggle(item) {
    const opening = !item.classList.contains('open');
    const faq = item.hasAttribute('data-faq');
    const before = item.getBoundingClientRect().top;
    cancelAnimationFrame(glide);
    body.querySelectorAll('[data-svc-item].open').forEach((o) => {
      if (o === item || o.hasAttribute('data-faq') !== faq) return;
      const above = o.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING;
      if (opening && !faq && above) collapseInstantly(o); else setOpen(o, false);
    });
    // keep the tapped row exactly where it was
    sheet.scrollTop += item.getBoundingClientRect().top - before;
    setOpen(item, opening);

    if (opening && !faq) {
      const from = sheet.scrollTop;
      const dist = gapToTop(item);
      if (Math.abs(dist) < 8) return; // already in place
      if (reduce) { sheet.scrollTop = from + dist; return; }
      const start = performance.now();
      const DURATION = 520;
      glide = requestAnimationFrame(function step(now) {
        if (panel.hidden) return;
        const k = Math.min(1, (now - start) / DURATION);
        sheet.scrollTop = from + dist * ease(k);
        if (k < 1) glide = requestAnimationFrame(step);
      });
      return;
    }
    if (reduce) return;
    // FAQ, or collapsing: hold the tapped row steady while content above animates
    const start = performance.now();
    glide = requestAnimationFrame(function hold(now) {
      if (panel.hidden) return;
      const drift = item.getBoundingClientRect().top - before;
      if (Math.abs(drift) > 0.5) sheet.scrollTop += drift;
      if (now - start < 650) glide = requestAnimationFrame(hold);
    });
  }

  // Leaving Services by any route (×, Escape, a click outside, another panel opening) hides the panel.
  // Collapse everything then, out of sight and without animation, so Services always reopens clean.
  function reset() {
    sheet.classList.add('svc-instant');
    body.querySelectorAll('[data-svc-item].open').forEach((o) => setOpen(o, false));
    sheet.scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove('svc-instant')));
  }
  new MutationObserver(() => { if (panel.hidden) reset(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });

  body.addEventListener('click', (e) => {
    const head = e.target.closest('.svc-head');
    if (head) toggle(head.closest('[data-svc-item]'));
  });

  // Escape closes an open package first; a second Escape closes the panel (handled by asbo.js).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panel.hidden) return;
    const open = body.querySelector('[data-svc-item].open');
    if (!open) return;
    e.stopImmediatePropagation();
    setOpen(open, false);
    open.querySelector('.svc-head').focus();
  }, true);

  // "Ask ASBO" closes this panel and opens the terminal through asbo.js's own handler.
  body.addEventListener('click', (e) => {
    if (!e.target.closest('.svc-ask')) return;
    const term = document.querySelector('.pillnav [data-open="terminal"]');
    if (term) term.click();
  });

  fetch('services.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(() => {
      body.innerHTML = '<p class="sheet-lede">Prices couldn\'t load just now. Please book a free consultation, or email <a href="mailto:asboagent@gmail.com">asboagent@gmail.com</a>.</p>';
    });
})();
