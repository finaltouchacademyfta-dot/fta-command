/* =====================================================================
   FTA · every screen fits — the measuring half (12 Nov 2026)
   CSS alone cannot know how long a name, an amount or a translated label
   will be. This measures what is actually on the screen and fixes only
   what does not fit:
   · big figures (KPI values, banner amounts, profile stats) stay on one
     line and shrink just enough to fit their card — never split mid-number
   · short labels (KPI titles, bottom-menu words, header title) shrink just
     enough that no word is broken in the middle
   · text cut with "…" (or clamped to 2 lines) is shown in full
   · a row of buttons/tabs wider than its card wraps onto two lines
   · a table wider than its card scrolls inside the card
   · Box size is capped on tiny phones so the screen keeps 320 px of room
   Cost control: the figure/label pass runs right after the translator's
   pass (before paint, no flash) only when something other than the banner
   slider / toast changed; the slower "…"/row/table pass runs when the
   browser is idle and only looks at elements that actually overflow.
   Nothing here touches data or business rules; every style it sets is
   marked and undone when the screen size or Box size changes.
   ===================================================================== */
(function () {
  'use strict';
  const ROOTS = '#view, #sheet, #bnav, #top, .v8-pop, .v9h-pop, #fa-panel';
  const LINE = ['b.num', '.kpi .kv', '.rs-fig', '.pt-stats b', '.xsum b', '.qbx b', '.cck .v', '.cck .num', '.bn-fig'];
  const WORDS = ['.kpi .kh', '.cck .lb', '.pt-stats span', '.rs-cap b', '.xsum small', '.qbx small'];
  const QUIET = '.rs, .rs-stage, #toast, #fta-sync, .fta-clock, [data-fit-skip]';   /* changes here never need a re-fit */
  const MARKS = ['data-fit', 'data-fit-un', 'data-fit-wrap', 'data-fit-btn', 'data-fit-scroll'];
  const PROPS = ['font-size', 'display', 'white-space', 'overflow', 'overflow-x', 'text-overflow', 'overflow-wrap', 'max-width', 'flex-wrap', '-webkit-line-clamp', 'height', 'min-width'];
  const cv = document.createElement('canvas').getContext('2d');
  const vis = el => el.isConnected && el.getClientRects().length > 0;
  const own = el => { const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' ').trim(); return t || (el.children.length ? '' : el.textContent.trim()); };

  /* ---- measuring at the element's own (unfitted) size, so a fitted element is not reset on every pass */
  function baseSize(el) { const b = parseFloat(el.getAttribute('data-fit-base')); return b > 0 ? b : parseFloat(getComputedStyle(el).fontSize); }
  function measurer(el, size) {
    const cs = getComputedStyle(el);
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    const ls = parseFloat(cs.letterSpacing) || 0, up = cs.textTransform === 'uppercase', k = parseFloat(cs.fontSize) ? size / parseFloat(cs.fontSize) : 1;
    return w => cv.measureText(up ? w.toUpperCase() : w).width + ls * k * w.length;
  }
  /* room for el's own text: its content width minus its side-by-side children (skip = the child being fitted) */
  function room(el, skip) {
    const cs = getComputedStyle(el);
    let r = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection) && cs.flexWrap === 'nowrap') {
      const gap = parseFloat(cs.columnGap) || 0;
      [...el.children].forEach(c => { if (c === skip) return; const s = getComputedStyle(c); if (s.display !== 'none' && s.position !== 'absolute') r -= c.getBoundingClientRect().width + gap; });
    }
    return r;
  }
  function applySize(el, base, want) {
    const cur = el.hasAttribute('data-fit') ? parseFloat(el.style.getPropertyValue('font-size')) : base;
    if (want == null) { if (el.hasAttribute('data-fit')) { el.style.removeProperty('font-size'); el.removeAttribute('data-fit'); el.removeAttribute('data-fit-base'); } return; }
    if (Math.abs(cur - want) < 0.25) return;                         /* no change: no style write */
    if (!el.hasAttribute('data-fit-base')) el.setAttribute('data-fit-base', String(base));
    el.style.setProperty('font-size', want.toFixed(2) + 'px', 'important'); el.setAttribute('data-fit', '1');
  }
  /* one-line figures: the whole figure must fit */
  function fitLine(el) {
    if (!vis(el)) return;
    const text = el.textContent.trim(); if (!text) return;
    const base = baseSize(el), avail = Math.min(el.clientWidth || 1e9, room(el.parentElement, el) || 1e9);
    const need = measurer(el, base)(text);
    applySize(el, base, need > avail + 0.5 && avail > 20 ? Math.max(11, base * avail / need * 0.97) : null);
  }
  /* labels: the longest word must fit on its line */
  function fitWords(el, min) {
    if (!vis(el)) return;
    const text = own(el); if (!text) return;
    const base = baseSize(el), avail = room(el);
    const widest = Math.max.apply(null, text.split(/\s+/).map(measurer(el, base)));
    applySize(el, base, widest > avail + 0.5 && avail > 8 ? Math.max(min || 9, base * avail / widest * 0.96) : null);
  }
  /* page title in the top bar: a little smaller; hidden on the narrowest phones (the page banner shows the name) */
  function fitTitle() {
    const h = document.querySelector('#top h1'); if (!h) return;
    const was = h.style.getPropertyValue('display');
    if (was) h.style.removeProperty('display');
    fitWords(h, 12);
    if (!vis(h)) return;
    const base = baseSize(h), size = h.hasAttribute('data-fit') ? parseFloat(h.style.getPropertyValue('font-size')) : base;
    const full = measurer(h, size)(own(h));                          /* the title is one line: all of it must fit */
    const bar = h.parentElement, over = bar && bar.scrollWidth > bar.clientWidth + 1;
    if (full > h.clientWidth + 1 || over) h.style.setProperty('display', 'none', 'important');
  }
  const fitNav = () => document.querySelectorAll('#bnav button').forEach(b => fitWords(b, 9));

  /* ---- slower pass: only elements that really overflow are looked at closely */
  const SKIPN = /^(INPUT|SELECT|TEXTAREA|OPTION|svg|SVG|path|IMG|CANVAS|H1|TABLE|TBODY|THEAD|TR|TD|TH)$/;
  const setS = (el, props, mark) => { Object.keys(props).forEach(p => el.style.setProperty(p, props[p], 'important')); el.setAttribute(mark, '1'); };
  function slowPass(root) {
    const all = root.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (SKIPN.test(el.nodeName)) continue;
      const sw = el.scrollWidth, cw = el.clientWidth, sh = el.scrollHeight, ch = el.clientHeight;
      const wideX = cw > 0 && sw > cw + 1, tallY = ch > 0 && sh > ch + 1;
      if (!wideX && !tallY && el.nodeName !== 'BUTTON' && !el.classList.contains('btn')) continue;
      if (el.closest('#top,#bnav,.fd,[data-fit-keep]')) continue;
      const cs = getComputedStyle(el);
      if (tallY && cs.webkitLineClamp && cs.webkitLineClamp !== 'none') { setS(el, { '-webkit-line-clamp': 'unset', display: 'block', overflow: 'visible' }, 'data-fit-un'); continue; }
      if (wideX && cs.textOverflow === 'ellipsis') { setS(el, { 'white-space': 'normal', overflow: 'visible', 'text-overflow': 'clip', 'overflow-wrap': 'break-word' }, 'data-fit-un'); continue; }
      if (wideX && /flex/.test(cs.display) && cs.flexWrap === 'nowrap' && !/column/.test(cs.flexDirection) && !/auto|scroll|hidden|clip/.test(cs.overflowX) && el.children.length > 1) { setS(el, { 'flex-wrap': 'wrap' }, 'data-fit-wrap'); continue; }
      if (el.nodeName === 'BUTTON' || el.classList.contains('btn')) {
        const p = el.parentElement; if (!p || !vis(el)) continue;
        const pr = p.getBoundingClientRect(), r = el.getBoundingClientRect();
        if (r.right > pr.right + 1 || r.width > pr.width + 1) setS(el, { 'white-space': 'normal', 'max-width': '100%', height: 'auto', 'min-width': '0' }, 'data-fit-btn');
      }
    }
    root.querySelectorAll('table').forEach(t => {
      if (!vis(t) || t.closest('.fd')) return;
      const p = t.parentElement; if (!p) return;
      for (let a = p; a && a !== document.body; a = a.parentElement) { if (/auto|scroll/.test(getComputedStyle(a).overflowX)) return; if (a.matches('#view,#sheet')) break; }
      if (t.getBoundingClientRect().width > p.clientWidth + 1) setS(p, { 'overflow-x': 'auto', 'max-width': '100%' }, 'data-fit-scroll');
    });
  }

  /* ---- Box size: honoured while the screen keeps at least 320 px of room at that size */
  function capZoom() {
    const want = (typeof BOXZ !== 'undefined' && BOXZ) ? BOXZ / 100 : 1;
    if (want <= 1) return;
    const w = document.documentElement.clientWidth || innerWidth, z = Math.max(1, Math.min(want, w / 320));
    const cur = parseFloat(document.body.style.zoom || '1') || 1;
    if (Math.abs(cur - z) > 0.001) document.body.style.zoom = z === 1 ? '' : String(Math.round(z * 1000) / 1000);
  }

  /* ---- undo everything (screen size / Box size changed), then fit again */
  function undoAll() {
    document.querySelectorAll(MARKS.map(m => '[' + m + ']').join(',')).forEach(el => { PROPS.forEach(p => el.style.removeProperty(p)); MARKS.concat('data-fit-base').forEach(m => el.removeAttribute(m)); });
    const h = document.querySelector('#top h1'); if (h) h.style.removeProperty('display');
  }

  let dirty = true, busy = false, last = 0, timer = 0, idle = 0;
  function fast() {
    if (busy) return; busy = true;
    try {
      document.querySelectorAll(ROOTS).forEach(r => {
        if (!vis(r)) return;
        r.querySelectorAll(LINE.join(',')).forEach(fitLine);
        r.querySelectorAll(WORDS.join(',')).forEach(el => fitWords(el, 9));
      });
      fitNav(); fitTitle();
    } catch (e) { }
    busy = false; last = Date.now(); dirty = false;
    slowSoon();
  }
  function slowSoon() {
    const ric = window.requestIdleCallback || (f => setTimeout(f, 120));
    if (idle) return;
    idle = ric(() => { idle = 0; try { document.querySelectorAll(ROOTS).forEach(r => { if (r.id !== 'top' && r.id !== 'bnav' && vis(r)) slowPass(r); }); } catch (e) { } }, { timeout: 400 });
  }
  function soon() { clearTimeout(timer); timer = setTimeout(() => requestAnimationFrame(() => { if (dirty) fast(); }), Date.now() - last > 250 ? 30 : 250); }

  /* the translator's pass runs just before the screen paints: fit right after it, so nothing is seen overflowing first */
  if (typeof txAll === 'function') { const _t = txAll; txAll = function () { const r = _t.apply(this, arguments); if (dirty && !TX_BUSY) { if (Date.now() - last > 120) { clearTimeout(timer); fast(); } else soon(); } return r; }; }
  if (typeof applyUI === 'function') { const _a = applyUI; applyUI = function () { const r = _a.apply(this, arguments); try { capZoom(); undoAll(); dirty = true; soon(); } catch (e) { } return r; }; }
  new MutationObserver(list => {
    for (const m of list) { const t = m.target; if (t.nodeType === 1 && !t.closest(QUIET)) { dirty = true; break; } }
    if (dirty) soon();
  }).observe(document.body, { childList: true, subtree: true });
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { try { capZoom(); undoAll(); } catch (e) { } dirty = true; soon(); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; soon(); });
  try { capZoom(); } catch (e) { }
  window.FTA_FIT = { run: () => { dirty = true; fast(); try { document.querySelectorAll(ROOTS).forEach(r => { if (r.id !== 'top' && r.id !== 'bnav' && vis(r)) slowPass(r); }); } catch (e) { } }, undo: undoAll };
  soon();
})();
