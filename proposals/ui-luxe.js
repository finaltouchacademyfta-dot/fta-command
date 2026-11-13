/* FTA · UI LUXE — tiny helper for things CSS cannot do (demo proposal, teammate #3)
   1. html[data-lx-page] = current page key, so the premium CSS can keep the figure strip on home pages only (P1-04)
   2. html[data-lx-role]  = signed-in role, so Quick Add is hidden for Mentor / Student (P2-23)
   3. #fta-sync fades out 2.6 s after it last changed, and never blocks clicks (P1-03 / PH-05)
   Read-only: never changes app state, never touches lux / qit (the CSS is scoped to skin "midnight"). */
(function () {
  'use strict';
  var H = document.documentElement;
  function st() { try { return (typeof ST !== 'undefined' && ST) || window.ST || null; } catch (e) { return null; } }
  function flag() {
    var s = st(); if (!s) return;
    var pg = s.page || '', role = s.role || '';
    if (H.getAttribute('data-lx-page') !== pg) H.setAttribute('data-lx-page', pg);
    if (H.getAttribute('data-lx-role') !== role) H.setAttribute('data-lx-role', role);
  }
  var syncT = 0, syncObs = null, syncEl = null, syncKey = '';
  function armSync(el) {
    if (!el || el === syncEl) return;
    syncEl = el; syncKey = '';
    // the app rewrites the chip (class, data-s, text) every few seconds, so the flag is an attribute it never touches
    var check = function () {
      var ds = el.getAttribute('data-s') || '', key = ds + '|' + (el.textContent || '').trim();
      if (key === syncKey) return; // same state re-rendered: keep it hidden
      syncKey = key; clearTimeout(syncT); el.removeAttribute('data-lx-hide');
      if (ds === 'error' || ds === 'offline' || ds === 'saving') return; // problems and work in progress stay visible
      syncT = setTimeout(function () { el.setAttribute('data-lx-hide', '1'); }, 2600);
    };
    check();
    if (syncObs) syncObs.disconnect();
    syncObs = new MutationObserver(check);
    syncObs.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-s'] });
  }
  var queued = false;
  function tick() {
    queued = false; flag();
    var s = document.getElementById('fta-sync'); if (s) armSync(s);
  }
  function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(tick); } }
  function start() {
    tick();
    try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: false }); } catch (e) {}
    var v = document.getElementById('view');
    if (v) try { new MutationObserver(queue).observe(v, { childList: true }); } catch (e) {}
    setInterval(tick, 1500); // cheap safety net for role switches and late-mounted chips
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
