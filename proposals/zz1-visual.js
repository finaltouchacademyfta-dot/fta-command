/* FTA · ZZ1 VISUAL (teammate #1, demo layer) — runtime helpers for zz1-visual.css
   1 notification sheet: tags #sheet, groups items into Urgent / To do / For your information
   3 icons: clean sparkle glyph for AI + "spark", top-bar AI key redrawn as a crisp line icon
   5 charts: shared SVG <defs> (sheen, ring light, dial) + per-chart depth overlays after each draw
   Only acts while <html data-skin="midnight">. Values, scales and click handlers are never changed. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var isM = function () { return document.documentElement.dataset.skin === 'midnight'; };

  /* ---------- 3 · icons ---------- */
  var SPARK = 'M10.5 4.5c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7z M18.5 3v4 M16.5 5h4';
  var sparkSvg = '<svg class="ph2" viewBox="0 0 24 24"><path d="' + SPARK + '"/></svg>';
  function fixIcons() {
    try {
      if (typeof SCH !== 'undefined' && SCH.PH) {
        SCH.PH.spark = sparkSvg;
        if (typeof P !== 'undefined' && SCH.NEW && SCH.NEW()) P.spark = sparkSvg;
      }
    } catch (e) { }
  }
  function fixAiKey() {
    var b = document.getElementById('fa-btn'); if (!b) return;
    var s = b.querySelector('svg'); if (!s) return;
    if (!isM()) { if (b.dataset.zz && b._zz0) { s.outerHTML = b._zz0; delete b.dataset.zz; } return; }
    if (b.dataset.zz) return; b._zz0 = s.outerHTML;
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.75'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = '<path d="' + SPARK + '"/>'; b.dataset.zz = '1';
  }

  /* ---------- 1 · notifications ---------- */
  var GROUPS = [['bad', 'Urgent'], ['warn', 'To do'], ['other', 'For your information']];
  function toneOf(btn) {
    var ic = btn.querySelector('.ic'), st = ic ? ic.getAttribute('style') || '' : '';
    var m = st.match(/var\(--(bad|warn|info|ok)\)/); return m ? (m[1] === 'bad' || m[1] === 'warn' ? m[1] : 'other') : 'other';
  }
  function doSheet() {
    var sh = document.getElementById('sheet'); if (!sh) return;
    var lab = sh.querySelector('.sh small'), isN = !!lab && /NOTIFICATIONS/i.test(lab.textContent || '');
    sh.classList.toggle('zz-notif', isN && isM());
    if (!isN || !isM() || sh.dataset.zzn === '1') return;
    var items = [].slice.call(sh.querySelectorAll(':scope > .alert.v8-al'));
    if (!items.length) { sh.dataset.zzn = '1'; return; }
    var by = { bad: [], warn: [], other: [] }; items.forEach(function (b) { by[toneOf(b)].push(b); });
    var anchor = items[0], parent = anchor.parentNode, frag = document.createDocumentFragment(), mark = document.createComment('zz');
    parent.insertBefore(mark, anchor);
    GROUPS.forEach(function (g) {
      var L = by[g[0]]; if (!L.length) return;
      var h = document.createElement('div'); h.className = 'zz-nh'; h.setAttribute('role', 'heading'); h.setAttribute('aria-level', '3');
      h.innerHTML = g[1] + ' <i>' + L.length + '</i>'; frag.appendChild(h); L.forEach(function (b) { frag.appendChild(b); });
    });
    parent.insertBefore(frag, mark); parent.removeChild(mark);
    sh.dataset.zzn = '1';
  }
  function watchSheet() {
    var sh = document.getElementById('sheet'); if (!sh || sh.dataset.zzw) return; sh.dataset.zzw = '1';
    new MutationObserver(function (ms) {
      // a new sheet body (different heading or rebuilt list) → regroup
      if (ms.some(function (m) { return [].some.call(m.addedNodes, function (n) { return n.nodeType === 1 && n.classList.contains('sh'); }); })) sh.dataset.zzn = '';
      doSheet();
    }).observe(sh, { childList: true });
    doSheet();
  }

  /* ---------- 5 · charts ---------- */
  function defs() {
    if (document.getElementById('zz-defs')) return;
    var d = document.createElementNS(NS, 'svg'); d.id = 'zz-defs'; d.setAttribute('aria-hidden', 'true');
    d.setAttribute('width', '0'); d.setAttribute('height', '0'); d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<defs>' +
      // cylindrical sheen across a bar: light from the upper-left, soft fall-off to the right edge
      '<linearGradient id="zz-sheen" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".02"/><stop offset=".22" stop-color="#fff" stop-opacity=".30"/>' +
      '<stop offset=".48" stop-color="#fff" stop-opacity=".06"/><stop offset=".78" stop-color="#000" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
      // ring lighting for donuts: top lit, bottom in shade
      '<linearGradient id="zz-ring" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" style="stop-color:var(--z-ring-hi)"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" style="stop-color:var(--z-ring-lo)"/></linearGradient>' +
      // raised centre dial
      '<radialGradient id="zz-dial" cx=".5" cy=".28" r=".85">' +
      '<stop offset="0" style="stop-color:var(--z-dial-a)"/><stop offset="1" style="stop-color:var(--z-dial-b)"/></radialGradient>' +
      '</defs>';
    document.body.appendChild(d);
  }
  function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function bars(svg) {
    svg.querySelectorAll('path.xb').forEach(function (p) {
      var f = p.getAttribute('style') || ''; if (/h\d+\)/.test(f)) return; // hatched (forecast) bars stay flat
      var s = el('path', { d: p.getAttribute('d'), class: 'zz-sheen', fill: 'url(#zz-sheen)', 'aria-hidden': 'true' });
      var del = (f.match(/animation-delay:\s*([\d.]+)ms/) || [])[1];
      if (p.classList.contains('in')) s.style.animation = 'zz-fade .45s ' + ((+del || 0) + 650) + 'ms both';
      p.parentNode.insertBefore(s, p.nextSibling);
    });
  }
  function area(svg) {
    svg.querySelectorAll('circle.xd.last').forEach(function (c) {
      var h = el('circle', { cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), r: '11', class: 'zz-halo', 'aria-hidden': 'true' });
      h.setAttribute('style', c.getAttribute('style') || ''); c.parentNode.insertBefore(h, c);
    });
  }
  var RU = 0;
  function ring(svg, isGauge) {
    var t = svg.querySelector('.xtrack'); if (!t) return;
    var cx = +t.getAttribute('cx'), cy = +t.getAttribute('cy'), r = +t.getAttribute('r');
    var sw = parseFloat((t.getAttribute('style') || '').replace(/.*stroke-width:\s*([\d.]+).*/, '$1')) || 20;
    // raised dial under everything
    var dial = el('circle', { cx: cx, cy: cy, r: Math.max(8, r - sw / 2 - 5).toFixed(1), class: 'zz-dial', fill: 'url(#zz-dial)', style: 'stroke:var(--z-dial-line);stroke-width:1' });
    svg.insertBefore(dial, svg.firstChild);
    if (!isGauge) {
      // bevel light over each coloured segment (same dash → the gaps stay clean) — ring light is in screen space, top lit
      var g = el('g', { class: 'zz-ring', 'aria-hidden': 'true' }), n = 0, gid = 'zz-ru' + (++RU);
      svg.querySelectorAll('.xseg').forEach(function (s) {
        var c = el('circle', { cx: cx, cy: cy, r: r, fill: 'none', transform: 'rotate(-90 ' + cx + ' ' + cy + ')' });
        var st = (s.getAttribute('style') || '').replace(/stroke:[^;]*;?/, '').replace(/animation-delay:[^;]*;?/, '');
        c.setAttribute('style', st + ';stroke:url(#' + gid + ')'); g.appendChild(c); n++;
      });
      if (n) {
        {
          /* the clones are rotated −90°, so local +x points up on screen: run the light along x */
          var d = el('defs', {}); d.innerHTML = '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" y1="' + cy + '" y2="' + cy + '" x1="' + (cx + r + sw / 2) + '" x2="' + (cx - r - sw / 2) + '">' +
            '<stop offset="0" style="stop-color:var(--z-ring-hi)"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" style="stop-color:var(--z-ring-lo)"/></linearGradient>';
          svg.insertBefore(d, svg.firstChild);
        }
        if (svg.querySelector('.xseg.in')) g.style.animation = 'zz-fade .5s .85s both';
        svg.appendChild(g);
      }
    }
    svg.appendChild(el('circle', { cx: cx, cy: cy, r: (r - sw / 2 + .6).toFixed(1), class: 'zz-in', fill: 'none', style: 'stroke:var(--z-ring-lo);stroke-width:1.2' }));
  }
  function charts() {
    if (!isM()) return; defs();
    document.querySelectorAll('.xc svg:not([data-zz]),.xdn-r svg:not([data-zz]),.xg-g svg:not([data-zz])').forEach(function (svg) {
      svg.setAttribute('data-zz', '1');
      try {
        var box = svg.parentNode;
        if (box.classList.contains('xc-bars')) bars(svg);
        else if (box.classList.contains('xc')) { bars(svg); area(svg); }
        else if (box.classList.contains('xdn-r')) ring(svg, false);
        else if (box.classList.contains('xg-g')) ring(svg, true);
      } catch (e) { }
    });
  }

  /* ---------- wiring ---------- */
  var st = document.createElement('style'); st.textContent = '@keyframes zz-fade{from{opacity:0}to{opacity:1}}'; document.head.appendChild(st);
  var queued = false;
  function tick() { queued = false; charts(); fixAiKey(); watchSheet(); }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(tick); } }
  function boot() {
    fixIcons();
    try { if (typeof SCH !== 'undefined' && SCH.useIcons && SCH.NEW) SCH.useIcons(SCH.NEW()); if (typeof render === 'function') render(); } catch (e) { }
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(function () { fixIcons(); queue(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'data-theme'] });
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
