/* zzE · phone/tablet: a menu button at the top-left opens the side menu (same menu as the laptop sidebar). */
(function () {
  'use strict';
  var B = document.body, narrow = function () { return window.matchMedia('(max-width:899px)').matches; };
  var HAMB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
  var open = function () { B.classList.add('fta-drawer'); }, close = function () { B.classList.remove('fta-drawer'); };
  function install() {
    if (!narrow()) { close(); return; }
    var top = document.querySelector('#top .top-r') || document.getElementById('top'), side = document.getElementById('side');
    if (top && !document.getElementById('fta-hamb')) {
      var b = document.createElement('button'); b.id = 'fta-hamb'; b.type = 'button'; b.setAttribute('aria-label', 'Menu'); b.innerHTML = HAMB;
      b.addEventListener('click', function (e) { e.stopPropagation(); B.classList.toggle('fta-drawer'); });
      top.insertBefore(b, top.firstChild);
    }
    if (side && !document.getElementById('fta-drawer-x')) {
      var x = document.createElement('button'); x.id = 'fta-drawer-x'; x.type = 'button'; x.setAttribute('aria-label', 'Close menu'); x.textContent = '×';
      x.addEventListener('click', close); side.appendChild(x);
    }
  }
  var raf = 0, mo = new MutationObserver(function () {
    if (document.getElementById('fta-hamb') && document.getElementById('fta-drawer-x')) return;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(install);
  });
  mo.observe(B, { childList: true, subtree: true });
  /* tap outside the menu closes it; so does choosing a page, Escape, or growing past the phone breakpoint */
  document.addEventListener('click', function (e) {
    if (!B.classList.contains('fta-drawer')) return;
    var side = document.getElementById('side'); if (!side) return;
    if (e.target.closest('#fta-hamb')) return;
    if (!side.contains(e.target)) { close(); return; }
    if (e.target.closest('#sidenav a, #sidenav button, #sidenav .nav')) setTimeout(close, 90);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', function () { if (!narrow()) close(); else install(); });
  install();
})();
