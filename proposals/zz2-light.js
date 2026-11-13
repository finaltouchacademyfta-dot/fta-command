/* FTA · ZZ2 LIGHT (teammate #2, demo layer) — tooltips for the few places where an ellipsis is the right call
   (chat list previews, long dropdown options, long placeholders/values in narrow inputs, the one-line page title).
   When text is shortened with "…", the full text is put in a title tooltip so nothing is ever lost.
   Read-only: never changes app state or text; only acts while <html data-skin="midnight">. */
(function () {
  'use strict';
  var H = document.documentElement;
  var TIP = 'data-zz2-tip';
  function on() { return H.getAttribute('data-skin') === 'midnight'; }
  function setTip(el, text) {
    text = (text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (el.hasAttribute('title') && !el.hasAttribute(TIP)) return; // the app's own tooltip wins
    if (el.getAttribute('title') !== text) { el.setAttribute('title', text); el.setAttribute(TIP, '1'); }
  }
  function clearTip(el) { if (el.hasAttribute(TIP)) { el.removeAttribute('title'); el.removeAttribute(TIP); } }
  var cv = null;
  function textWidth(el, t) {
    try {
      cv = cv || document.createElement('canvas').getContext('2d');
      var c = getComputedStyle(el); cv.font = c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
      return cv.measureText(t).width;
    } catch (e) { return 0; }
  }
  function scan() {
    if (!on()) return;
    var root = document.body; if (!root) return;
    // 1 · ellipsis text
    var els = root.querySelectorAll('#ttl,#view small,#view b,#view span,#view .cx-rt *,#sheet b,#sheet span,#sheet small,#side .brand *');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.offsetParent && el.id !== 'ttl') continue;
      var cs = getComputedStyle(el);
      if (cs.textOverflow !== 'ellipsis' && !(cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) { clearTip(el); continue; }
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) setTip(el, el.textContent); else clearTip(el);
    }
    // 2 · inputs and selects whose text is wider than the box
    var fs = root.querySelectorAll('#view input,#view select,#sheet input,#sheet select');
    for (var j = 0; j < fs.length; j++) {
      var f = fs[j]; if (!f.offsetParent) continue;
      var t = f.tagName === 'SELECT' ? ((f.selectedOptions && f.selectedOptions[0]) || {}).text : (f.value || f.placeholder);
      if (!t || /^(checkbox|radio|file|hidden|range|color)$/.test(f.type)) continue;
      var c2 = getComputedStyle(f);
      var avail = f.clientWidth - parseFloat(c2.paddingLeft) - parseFloat(c2.paddingRight) - (f.tagName === 'SELECT' && c2.appearance !== 'none' ? 18 : 0);
      if (textWidth(f, t) > avail + 1) setTip(f, t); else clearTip(f);
    }
    // 3 · table edge-fade only while there is more to scroll
    var tws = root.querySelectorAll('#view .tw,#view .sc-scroll');
    for (var m = 0; m < tws.length; m++) more(tws[m]);
    // 4 · calendar chips on phones show only the time: keep the full title on hover / long-press
    var ev = root.querySelectorAll('#view .v8-ev');
    for (var k = 0; k < ev.length; k++) { if (!ev[k].title) setTip(ev[k], ev[k].textContent); }
  }
  function more(tw) { var y = tw.scrollWidth > tw.clientWidth + 2 && tw.scrollLeft + tw.clientWidth < tw.scrollWidth - 2; if (y) { if (!tw.hasAttribute('data-zz2-more')) tw.setAttribute('data-zz2-more', ''); } else if (tw.hasAttribute('data-zz2-more')) tw.removeAttribute('data-zz2-more'); }
  var q = 0;
  function queue() { if (q) return; q = setTimeout(function () { q = 0; try { scan(); } catch (e) { } }, 200); }
  function start() {
    scan();
    try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
    addEventListener('resize', queue);
    document.addEventListener('change', queue, true);
    document.addEventListener('scroll', function (e) { var t = e.target; if (t && t.classList && (t.classList.contains('tw') || t.classList.contains('sc-scroll')) && on()) more(t); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
