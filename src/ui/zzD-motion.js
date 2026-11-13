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
