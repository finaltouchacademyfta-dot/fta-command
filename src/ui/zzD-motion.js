/* FTA · motion layer: spring page transitions, press feedback, modal pop.
   Pure JS (no library, no network). Colours and layout are untouched: it only
   animates opacity / translate / scale. Skipped when the person prefers less motion. */
(function () {
  'use strict';
  if (window.__ftaMotion) return; window.__ftaMotion = 1;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = 300, C = 25, M = 1;                       // spring: stiffness 300, damping 25

  /* tiny spring solver (semi-implicit Euler, 1/240 s steps) */
  function spring(from, to, onTick, onDone, v0) {
    let x = from, v = v0 || 0, last = performance.now(), raf = 0, dead = false;
    function step(now) {
      if (dead) return;
      let dt = Math.min(.032, (now - last) / 1000); last = now;
      while (dt > 0) { const h = Math.min(dt, 1 / 240); v += (-K * (x - to) - C * v) / M * h; x += v * h; dt -= h; }
      onTick(x);
      if (Math.abs(x - to) < .0008 && Math.abs(v) < .004) { onTick(to); onDone && onDone(); return; }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return { stop() { dead = true; cancelAnimationFrame(raf); }, get x() { return x; }, get v() { return v; } };
  }
  const clear = (el, ...props) => props.forEach(p => el.style.removeProperty(p));

  /* ---- 1 · page switch: old view fades out (opacity 0, y 10) while new cards spring in one by one ---- */
  function pageIn(view) {
    let t = [...view.children].filter(e => e.nodeType === 1);
    if (t.length < 4) t = t.flatMap(e => e.children.length > 1 && e.children.length < 14 ? [...e.children] : [e]);
    t = t.slice(0, 14);
    t.forEach((el, i) => {
      el.style.opacity = '0'; el.style.translate = '0 16px';
      setTimeout(() => spring(0, 1, p => { el.style.opacity = String(Math.min(1, p)); el.style.translate = '0 ' + (16 * (1 - p)).toFixed(2) + 'px'; },
        () => clear(el, 'opacity', 'translate')), i * 50);   // staggerChildren .05
    });
  }
  function ghostOut(view) {
    if (!view.firstElementChild) return;
    const r = view.getBoundingClientRect(), g = document.createElement('div');
    g.setAttribute('aria-hidden', 'true'); g.setAttribute('inert', '');
    g.innerHTML = view.innerHTML; g.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    Object.assign(g.style, { position: 'absolute', left: r.left + scrollX + 'px', top: r.top + scrollY + 'px', width: r.width + 'px', height: Math.min(r.height, innerHeight * 1.5) + 'px', overflow: 'hidden', pointerEvents: 'none', zIndex: '5', margin: '0' });
    document.body.appendChild(g);
    const a = g.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 150, easing: 'ease-out', fill: 'forwards' });
    a.onfinish = a.oncancel = () => g.remove(); setTimeout(() => g.remove(), 400);
  }
  function wrapGo() {
    if (typeof window.go !== 'function' || window.go.__m) return;
    const _go = window.go;
    window.go = function (p) {
      const view = document.getElementById('view');
      if (!view || reduce() || document.hidden) return _go.apply(this, arguments);
      const same = view.dataset.mp === String(p);
      if (!same) ghostOut(view);
      const out = _go.apply(this, arguments);
      view.dataset.mp = String(p);
      if (!same) pageIn(view);
      return out;
    };
    window.go.__m = 1;
  }

  /* ---- 2 · press feedback on buttons and cards (scale .96, spring back) ---- */
  const PRESS = 'button,.btn,.card,.kpi,[role="button"],a.card,.cck,.nav,.chip,.pill[onclick],.qc';
  const live = new WeakMap();
  function pressTo(el, to) {
    const old = live.get(el); const from = old ? old.x : parseFloat(el.style.scale) || 1, v = old ? old.v : 0; old && old.stop();
    live.set(el, spring(from, to, s => { el.style.scale = s.toFixed(4); }, () => { if (to === 1) { clear(el, 'scale'); live.delete(el); } }, v));
  }
  let cur = null;
  function up() { if (cur) { pressTo(cur, 1); cur = null; } }
  document.addEventListener('pointerdown', e => {
    if (reduce() || e.button > 0) return;
    const el = e.target.closest && e.target.closest(PRESS);
    if (!el || el.disabled || el.matches('input,select,textarea') || el.closest('#login input')) return;
    cur = el; pressTo(el, .96);
  }, { passive: true, capture: true });
  ['pointerup', 'pointercancel', 'dragstart', 'scroll'].forEach(t => addEventListener(t, up, { passive: true, capture: true }));

  /* ---- 3 · modal: background dims + blurs (CSS), card pops from .9 to 1 with spring physics ---- */
  function watchModal() {
    const ov = document.getElementById('ov'), sheet = document.getElementById('sheet');
    if (!ov || !sheet || ov.__m) return; ov.__m = 1;
    new MutationObserver(() => {
      if (ov.hidden || reduce()) { clear(sheet, 'scale', 'opacity'); return; }
      ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      sheet.style.scale = '.9'; sheet.style.opacity = '0';
      spring(.9, 1, s => { sheet.style.scale = s.toFixed(4); sheet.style.opacity = String(Math.min(1, (s - .9) * 10)); }, () => clear(sheet, 'scale', 'opacity'));
    }).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
  }

  function boot() { wrapGo(); watchModal(); }
  boot(); document.addEventListener('DOMContentLoaded', boot); addEventListener('load', boot);
})();

/* fixed size like a native app: block pinch-zoom (iOS Safari ignores user-scalable); double-tap zoom is off via touch-action */
(function () {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();

/* phone top bar: the first visible action button takes the free space on its left, so menu + logo sit left
   and every action sits on the right edge (whatever the title or the AI button does). */
(function () {
  let q = 0;
  function fix() {
    q = 0;
    const bar = document.querySelector('#top .top-r'); if (!bar) return;
    const acts = ['fa-btn', 'nb', 'skinb', 'thb', 'whob'].map(id => document.getElementById(id)).filter(Boolean);
    let want = null;
    if (innerWidth <= 820) want = acts.find(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0) || null;
    acts.forEach(e => { if (e !== want && e.dataset.pmAuto) { e.style.removeProperty('margin-left'); delete e.dataset.pmAuto; } });
    if (want && !want.dataset.pmAuto) { want.style.setProperty('margin-left', 'auto', 'important'); want.dataset.pmAuto = '1'; }
  }
  const sched = () => { if (!q) q = requestAnimationFrame(fix); };
  function boot() {
    const bar = document.getElementById('top'); if (!bar || bar.__pm) return; bar.__pm = 1;
    new MutationObserver(sched).observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden', 'class'] });
    sched();
  }
  addEventListener('resize', sched); addEventListener('orientationchange', sched);
  boot(); document.addEventListener('DOMContentLoaded', boot); addEventListener('load', () => { boot(); sched(); });
  setInterval(() => { boot(); sched(); }, 1500);
})();

/* bottom menu (phone): a highlight pill glides under the active tab with spring physics, and the icon pops */
(function () {
  let pill = null, cx = null, cw = null, sx = null, sw = null, lastKey = '', tx = 0, tw = 0;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function spring1(from, to, tick, K, C) {
    let x = from, v = 0, last = performance.now(), dead = false;
    (function step(now) {
      if (dead) return; let dt = Math.min(.032, (now - last) / 1000); last = now;
      while (dt > 0) { const h = Math.min(dt, 1 / 240); v += (-K * (x - to) - C * v) * h; x += v * h; dt -= h; }
      tick(x); if (Math.abs(x - to) < .15 && Math.abs(v) < .6) { tick(to); return; } requestAnimationFrame(step);
    })(last);
    return { stop() { dead = true; }, get x() { return x; } };
  }
  function ensure(bar) {
    if (!pill) { pill = document.createElement('i'); pill.className = 'pm-pill'; pill.setAttribute('aria-hidden', 'true'); }
    if (pill.parentNode !== bar) bar.insertBefore(pill, bar.firstChild);
  }
  function paint() { pill.style.width = cw + 'px'; pill.style.transform = 'translateX(' + cx + 'px)'; }
  function glide(b, x, w, key) {
    lastKey = key; tx = x; tw = w; sx && sx.stop(); sw && sw.stop();
    /* stretch like a drop of liquid: the edge in the direction of travel races ahead, the other edge follows */
    let L = cx, R = cx + cw; const L2 = x, R2 = x + w, right = L2 >= L;
    const KL = right ? 230 : 560, CL = right ? 22 : 33, KR = right ? 560 : 230, CR = right ? 33 : 22;
    const apply = () => { cx = L; cw = Math.max(18, R - L); paint(); };
    sx = spring1(L, L2, v => { L = v; apply(); }, KL, CL);
    sw = spring1(R, R2, v => { R = v; apply(); }, KR, CR);
    const ic = b.querySelector('svg.i');
    if (ic) { const t0 = performance.now(); (function s(now) { const t = Math.min(1, (now - t0) / 420); const k = 1 + .22 * Math.exp(-5 * t) * Math.cos(t * 11); ic.style.scale = t < 1 ? k.toFixed(3) : ''; ic.style.translate = t < 1 ? '0 ' + (-3 * Math.exp(-5 * t) * Math.cos(t * 11)).toFixed(2) + 'px' : ''; if (t < 1) requestAnimationFrame(s); })(t0); }
  }
  function sync() {
    const bar = document.getElementById('bnav'); if (!bar) return;
    const b = bar.querySelector('button.on:not(.mn-qa)');
    ensure(bar);
    if (!b || !bar.getClientRects().length) { pill.style.opacity = '0'; return; }
    const br = bar.getBoundingClientRect(), r = b.getBoundingClientRect(); if (!r.width) return;
    const x = r.left - br.left + 4, w = r.width - 8, key = b.getAttribute('data-go') || b.textContent;
    pill.style.opacity = '1';
    if (cx === null || reduce()) { cx = x; cw = w; tx = x; tw = w; paint(); lastKey = key; return; }
    if (key === lastKey) { if (Math.abs(x - tx) > .5 || Math.abs(w - tw) > .5) { sx && sx.stop(); sw && sw.stop(); cx = x; cw = w; tx = x; tw = w; paint(); } return; }
    glide(b, x, w, key);
  }
  /* start gliding the instant the finger lifts, before the page behind has finished rebuilding */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#bnav > button:not(.mn-qa)'); if (!b || reduce() || cx === null) return;
    const bar = document.getElementById('bnav'), br = bar.getBoundingClientRect(), r = b.getBoundingClientRect(), key = b.getAttribute('data-go') || b.textContent;
    if (!r.width || key === lastKey) return; ensure(bar); pill.style.opacity = '1';
    glide(b, r.left - br.left + 4, r.width - 8, key);
  }, true);
  let q = 0; const sched = () => { if (!q) q = requestAnimationFrame(() => { q = 0; sync(); }); };
  function boot() {
    const bar = document.getElementById('bnav'); if (!bar || bar.__pmp) return; bar.__pmp = 1;
    new MutationObserver(sched).observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    sched();
  }
  addEventListener('resize', () => { cx = null; sched(); }); addEventListener('orientationchange', () => { cx = null; sched(); });
  boot(); document.addEventListener('DOMContentLoaded', boot); addEventListener('load', () => { boot(); sched(); });
  setInterval(() => { boot(); if (pill && pill.parentNode && !document.getElementById('bnav').contains(pill)) sched(); }, 1200);
})();
