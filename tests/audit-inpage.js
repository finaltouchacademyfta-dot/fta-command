/* In-page audit helpers, injected with page.addInitScript(fs.readFileSync(this file)).
   window.__bnScan(where)  → every visible Bangla text / placeholder / title / aria-label / option
   window.__ovfScan(where) → every piece of text or box that escapes its card, is clipped,
                             or pushes past the screen edge                                    */
(function () {
  const BN = /[ঀ-৲৴-৿]/, TAKA = /৳/;
  const srOnly = el => { for (let a = el; a && a !== document.body; a = a.parentElement) { const r = a.getBoundingClientRect(), cs = getComputedStyle(a); if ((r.width <= 2 || r.height <= 2) && cs.overflow !== 'visible' || (cs.clip !== 'auto' && cs.clip !== '') || /inset\(50%\)|inset\(100%\)/.test(cs.clipPath)) return true; } return false; };
  const SKIP = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|TEXTAREA)$/;
  const vis = el => { try { return !!el && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && el.getClientRects().length > 0; } catch (e) { return false; } };
  const path = el => { const o = []; for (let a = el; a && a !== document.body && o.length < 5; a = a.parentElement) o.unshift(a.nodeName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList.length ? '.' + [...a.classList].slice(0, 2).join('.') : '')); return o.join('>'); };
  const isUser = t => { try { return typeof i18nIsUser === 'function' && i18nIsUser(t); } catch (e) { return false; } };

  window.__bnScan = function (where) {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && SKIP.test(n.parentNode.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) {
      const n = w.currentNode, t = n.nodeValue.trim();
      if (!t || !(BN.test(t) || TAKA.test(t))) continue;
      const p = n.parentElement; if (!vis(p) || srOnly(p)) continue;
      if (!BN.test(t)) { out.push({ where, kind: 'taka', text: t.slice(0, 120), at: path(p) }); continue; }
      if (p.closest('#fta-agent-log .ag-u')) continue;       /* what the Owner typed to the AI */
      out.push({ where, kind: 'text', text: t.slice(0, 300), at: path(p), user: isUser(t) });
    }
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      if (!vis(el)) return;
      ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && BN.test(v)) out.push({ where, kind: a, text: v.slice(0, 300), at: path(el) }); });
    });
    document.querySelectorAll('select').forEach(s => { if (!vis(s)) return; [...s.options].forEach(o => { if (BN.test(o.textContent)) out.push({ where, kind: 'option', text: o.textContent.trim().slice(0, 300), at: path(s), user: isUser(o.textContent.trim()) }); }); });
    if (BN.test(document.title)) out.push({ where, kind: 'doc-title', text: document.title, at: 'title' });
    return out;
  };


  /* Bangla mode: visible Latin words that are not names / ids / units (collected by the crawler, filtered there) */
  window.__enScan = function (where) {
    const out = [], LATA = /[A-Za-z]{2,}/;
    /* proper names, brands, exam boards and technical identifiers may stay in Latin letters */
    const OK = /\b(IGCSE|GCSE|IELTS|SAT|Cambridge|Edexcel|Oxford|AQA|IB|bKash|Nagad|Rocket|Gmail|Google|PDF|CSV|XLSX|WhatsApp|Zoom|Meet|SMS|QR|FTA|QIT|AI|ID|AM|PM|BDT|A4|A5|PNG|JPG|STU|PRG|MEN|PAY|RC|INV|ENR|EXP|ACC|BAT|GRP|RT|USD|UI|OTP|PIN|URL|WiFi|Wi-Fi|Ayaan|Rafi|Nusrat|Tanvir|Rahman|Hasan|Jahan|Ahmed|Shakil|Rumana|Begum|Tania|Sultana|Junior|One|Admin|Sadia|Imran|Karim|Farhan|Ayesha|Tamim|Maliha|Nabila|DESCO|Landlord|Mon|Tue|Wed|Thu|Fri|Sat|Sun|gmail|com|name|owner|app|ok|HW|Lv|AR|RH|NJ|TA|AO|SA|RB|JO|SH|MA|English|Maths|Chemistry|Biology|Physics|Mathematics)\b/gi;
    const LAT = { test: t => LATA.test(t.replace(OK, ' ').replace(/[a-z]+@[a-z.]+/gi, ' ').replace(/[A-Z]{2,5}-\d+/g, ' ')) };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && SKIP.test(n.parentNode.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) {
      const n = w.currentNode, t = n.nodeValue.trim(); if (!t || !LAT.test(t)) continue;
      const p = n.parentElement; if (!vis(p) || srOnly(p)) continue;
      if (p.closest('[data-notx],[data-user],#fta-agent-log .ag-u')) continue;
      out.push({ where, kind: 'text', text: t.slice(0, 200), at: path(p), user: isUser(t) });
    }
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      if (!vis(el)) return;
      ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && LAT.test(v)) out.push({ where, kind: a, text: v.slice(0, 200), at: path(el) }); });
    });
    return out;
  };

  /* ---------------------------------------------------------------- layout */
  const alpha = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
  const boxy = cs => alpha(cs.backgroundColor) > 0.04 || parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0 || parseFloat(cs.borderTopWidth) > 0 || cs.overflowX !== 'visible' || (cs.backgroundImage && cs.backgroundImage !== 'none');
  const scroller = cs => /auto|scroll/.test(cs.overflowX);
  const floating = cs => cs.position === 'absolute' || cs.position === 'fixed' || cs.position === 'sticky' && false;
  const TOL = 1.5;

  /* nearest "card-like" ancestor that should contain el; null when a scroll box or a floating layer is in between */
  function container(el) {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (scroller(cs)) return null;
      if (cs.display === 'contents' || /^inline($|-flex|-grid)?$/.test(cs.display) && cs.display === 'inline') continue;
      if (a === document.body) return { el: a, cs, r: { left: 0, right: innerWidth, top: -1e9, bottom: 1e9 } };
      if (boxy(cs)) return { el: a, cs, r: a.getBoundingClientRect() };
      if (floating(cs)) return null;
    }
    return null;
  }
  function inScroller(el) { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowX)) return true; } return false; }
  function chainFloats(el, stop) { for (let a = el; a && a !== stop; a = a.parentElement) { const cs = getComputedStyle(a); if (floating(cs)) return true; } return false; }

  window.__ovfScan = function (where) {
    const out = [], W = innerWidth, seen = new Set();
    const de = document.documentElement;
    if (de.scrollWidth > W + 1) out.push({ where, kind: 'page-hscroll', text: 'page is ' + de.scrollWidth + 'px wide on a ' + W + 'px screen', at: 'html' });
    const add = (kind, el, text, extra) => { const k = kind + '|' + path(el) + '|' + text; if (seen.has(k)) return; seen.add(k); out.push(Object.assign({ where, kind, text: (text || '').slice(0, 120), at: path(el) }, extra || {})); };
    const rg = document.createRange();
    /* 1 · text that runs out of its box or is cut */
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && SKIP.test(n.parentNode.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) {
      const n = w.currentNode, t = n.nodeValue.trim(); if (!t) continue;
      const p = n.parentElement; if (!vis(p) || p.closest('svg,[data-ovf-ok],.fta-tip,#fta-boot') || srOnly(p)) continue;
      rg.selectNodeContents(n); const rects = [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5); if (!rects.length) continue;
      const c = container(p); if (!c) continue;
      if (chainFloats(p, c.el) && c.el !== document.body) { /* floating label inside its card: still must stay inside */ }
      const R = c.r; let bad = null;
      for (const r of rects) {
        if (r.right > R.right + TOL || r.left < R.left - TOL) { bad = 'x'; break; }
        if (c.el !== document.body && (r.bottom > R.bottom + TOL || r.top < R.top - TOL) && /hidden|clip/.test(getComputedStyle(c.el).overflowY)) { bad = 'y'; break; }
      }
      if (bad) add(c.cs.overflowX !== 'visible' || c.cs.overflowY !== 'visible' ? 'text-clipped' : 'text-escapes', p, t, { box: path(c.el), dir: bad });
      if (!inScroller(p)) for (const r of rects) if (r.right > W + TOL || r.left < -TOL) { add('text-offscreen', p, t); break; }
      const ps = getComputedStyle(p);
      if (ps.textOverflow === 'ellipsis' && p.scrollWidth > p.clientWidth + 1) add('text-ellipsis', p, t);
    }
    /* 2 · boxes (pills, buttons, inputs) sticking out of their card */
    document.querySelectorAll('body *').forEach(el => {
      if (SKIP.test(el.nodeName) || el.closest('svg,[data-ovf-ok],#fta-boot') || !vis(el)) return;
      const cs = getComputedStyle(el); if (!boxy(cs) || floating(cs) || cs.display === 'inline') return;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      const c = container(el); if (!c) return;
      if (chainFloats(el.parentElement, c.el)) return;
      const R = c.r;
      if (r.right > R.right + TOL || r.left < R.left - TOL) add('box-escapes', el, (el.innerText || el.getAttribute('aria-label') || el.nodeName).trim().split('\n')[0], { box: path(c.el), by: Math.round(Math.max(r.right - R.right, R.left - r.left)) });
      else if (r.right > W + TOL && !inScroller(el)) add('box-offscreen', el, (el.innerText || '').trim().split('\n')[0]);
    });
    /* 3 · placeholders that do not fit their input */
    const cv = document.createElement('canvas').getContext('2d');
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(i => {
      if (!vis(i) || !i.placeholder || i.value) return;
      const cs = getComputedStyle(i), ps = getComputedStyle(i, '::placeholder'); cv.font = ps.fontStyle + ' ' + ps.fontWeight + ' ' + ps.fontSize + ' ' + ps.fontFamily;
      const room = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (i.nodeName === 'INPUT' && cv.measureText(i.placeholder).width > room + 1) add('placeholder-cut', i, i.placeholder, { room: Math.round(room) });
    });
    return out;
  };
})();
