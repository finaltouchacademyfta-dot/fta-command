/* v9u · phone: one menu button ("More") opens the side menu; no duplicate button in the top bar */
(function () {
  'use strict';
  var B = document.body, narrow = function () { return window.matchMedia('(max-width:899px)').matches; };
  function langRow() {
    var side = document.getElementById('side'); if (!side || document.getElementById('v9u-lang')) return;
    var d = document.createElement('div'); d.id = 'v9u-lang';
    var cur = (typeof LANG !== 'undefined' && LANG) || 'en';
    d.innerHTML = '<span>Language</span><div>' + [['en', 'EN'], ['bn', 'বাং']].map(function (x) {
      return '<button type="button" data-noedit data-notx data-l="' + x[0] + '" class="' + (cur === x[0] ? 'on' : '') + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    d.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-l]'); if (!b) return;
      if (typeof setLang === 'function') setLang(b.getAttribute('data-l'));
      d.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    side.appendChild(d);
  }
  var prev = window.moreMenu;
  window.moreMenu = function () {
    if (narrow() && document.getElementById('side')) {
      if (typeof closeSheet === 'function') { try { closeSheet(); } catch (e) {} }
      langRow(); B.classList.add('fta-drawer'); return;
    }
    return typeof prev === 'function' ? prev.apply(this, arguments) : undefined;
  };
  /* the old top-left menu button is not needed any more */
  function drop() { var h = document.getElementById('fta-hamb'); if (h) h.remove(); }
  new MutationObserver(function () { if (document.getElementById('fta-hamb')) drop(); }).observe(B, { childList: true, subtree: true });
  drop();
})();
