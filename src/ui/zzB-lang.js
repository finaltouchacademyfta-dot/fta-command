/* zzB · exactly two interface languages: English (default) and Bangla.
   - the old "Mixed" mode is gone; a device that had saved it falls back to English
   - everything else (dictionary overlay, translator, documents' own language) is untouched */
(function () {
  'use strict';
  if (typeof LANG === 'undefined' || typeof setLang !== 'function') return;
  const ok = l => (l === 'bn' ? 'bn' : 'en');

  // 1 · migrate a saved "mix" (or anything unknown) to English, silently, before the first paint of the picker
  try { const s = localStorage.getItem('fta-lang'); if (s && s !== 'en' && s !== 'bn') localStorage.setItem('fta-lang', 'en'); } catch (e) { }
  if (LANG !== 'en' && LANG !== 'bn') {
    LANG = 'en';
    document.documentElement.lang = 'en'; document.documentElement.dataset.lang = 'en';
  }

  // 2 · setLang can only ever receive English or Bangla
  const _set = setLang;
  setLang = function (l) { return _set.call(this, ok(l)); };

  // 3 · header switch: two buttons (labels follow the active language, so English mode shows no Bangla)
  drawLang = function () {
    const lab = { bn: LANG === 'en' ? 'Bangla' : 'বাংলা', en: 'EN' };
    const h = ['bn', 'en'].map(k => `<button type="button" data-noedit data-notx class="${LANG === k ? 'on' : ''}" aria-pressed="${LANG === k}" onclick="setLang('${k}')">${lab[k]}</button>`).join('');
    const e = document.querySelector('#langsw'); if (e) e.innerHTML = h;
    return h;
  };
  try { drawLang(); } catch (e) { }


  /* ------------------------------------------------------------------ Bangla interface text (post-translation pass)
     The existing translator turns app text into Bangla where it can. This layer then replaces whatever is still
     English (or half English) with natural Bangla from the dictionaries in zzB-bn-*.js.
     Keys are the text as the existing translator leaves it, with numbers written # and month names @M.
     Values may use #  and @M  (taken in order) or {1}{2} for the parts a {1}-style key captured.
     English mode never goes through this. */
  const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর', 'জানু', 'ফেব্রু', 'এপ্রি', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const MRX = new RegExp('(?<![\\u0980-\\u09FF])(' + MONTHS.join('|') + ')(?![\\u0980-\\u09FF])', 'g');
  const NRX = /\d[\d,]*(?:\.\d+)?/g;
  const exact = new Map(), tpl = [];
  const cleanKey = k => k.replace(/\s+/g, ' ').trim().toLowerCase();
  const BNX = window.FTA_BNX = {
    add(map) {
      Object.keys(map).forEach(k => {
        const v = map[k]; if (v == null || v === '') return;
        if (/\{\d+\}/.test(k)) {
          const toks = k.split(/(\{\d+\}|@M|#)/).filter(x => x !== ''), kinds = []; let re = '^';
          toks.forEach(x => {
            if (/^\{\d+\}$/.test(x)) { re += '(.+?)'; kinds.push(['w', +x.slice(1, -1)]); }
            else if (x === '#') { re += '(\\d[\\d,]*(?:\\.\\d+)?)'; kinds.push(['n']); }
            else if (x === '@M') { re += '(' + MONTHS.join('|') + ')'; kinds.push(['m']); }
            else re += x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          });
          tpl.push({ re: new RegExp(re + '$', 'i'), kinds, out: v, n: k.length });
          tpl.sort((a, b) => b.n - a.n);
        } else exact.set(cleanKey(k), v);
      });
    },
    size: () => exact.size + tpl.length,
    has: t => exact.has(cleanKey(t))
  };
  const fill = (v, nums, mons) => { let ni = 0, mi = 0; return v.replace(/#(\d)?|@M/g, (m, d) => m === '@M' ? (mons[mi++] || '') : (d ? nums[+d - 1] : nums[ni++]) || ''); };
  const SEPS = [' · ', ' | ', ' → '];
  function fix(o, depth) {
    if (!o) return o;
    const nums = [], mons = [];
    const key = o.replace(MRX, m => { mons.push(m); return '@M'; }).replace(NRX, m => { nums.push(m); return '#'; });
    const hit = exact.get(cleanKey(key));
    if (hit != null) return fill(hit, nums, mons);
    if (!depth || depth < 2) for (const t of tpl) {
      const m = o.match(t.re); if (!m) continue;
      const n2 = [], m2 = [], w = {};
      t.kinds.forEach((kd, i) => { const g = m[i + 1] || ''; if (kd[0] === 'n') n2.push(g); else if (kd[0] === 'm') m2.push(g); else w[kd[1]] = g; });
      return fill(t.out.replace(/\{(\d+)\}/g, (x, i) => fix(w[i] || '', (depth || 0) + 1)), n2, m2);
    }
    for (const sep of SEPS) {
      if (!o.includes(sep)) continue;
      const parts = o.split(sep), out = parts.map(x => x.trim() ? fix(x.trim(), (depth || 0) + 1) : x);
      if (out.some((x, i) => x !== parts[i].trim())) return out.join(sep);
    }
    return o;
  }
  BNX.fix = fix;
  const WD_BN = { Saturday: 'শনিবার', Sunday: 'রবিবার', Monday: 'সোমবার', Tuesday: 'মঙ্গলবার', Wednesday: 'বুধবার', Thursday: 'বৃহস্পতিবার', Friday: 'শুক্রবার' };
  const WDS_BN = { Sat: 'শনি', Sun: 'রবি', Mon: 'সোম', Tue: 'মঙ্গল', Wed: 'বুধ', Thu: 'বৃহ', Fri: 'শুক্র' };
  const MN_BN = { January: 'জানুয়ারি', February: 'ফেব্রুয়ারি', March: 'মার্চ', April: 'এপ্রিল', May: 'মে', June: 'জুন', July: 'জুলাই', August: 'আগস্ট', September: 'সেপ্টেম্বর', October: 'অক্টোবর', November: 'নভেম্বর', December: 'ডিসেম্বর', Jan: 'জানু', Feb: 'ফেব্রু', Mar: 'মার্চ', Apr: 'এপ্রি', Jun: 'জুন', Jul: 'জুলা', Aug: 'আগ', Sep: 'সেপ্টে', Oct: 'অক্টো', Nov: 'নভে', Dec: 'ডিসে' };
  /* small things every screen shares: the taka sign and 12-hour times in plain Bangla */
  const dayPart = (h, pm) => { const H = pm ? (h % 12) + 12 : h % 12; return H < 4 ? 'রাত' : H < 6 ? 'ভোর' : H < 12 ? 'সকাল' : H < 15 ? 'দুপুর' : H < 18 ? 'বিকাল' : H < 20 ? 'সন্ধ্যা' : 'রাত'; };
  function post(t) {
    if (typeof t !== 'string') return t;
    if (t.indexOf('BDT') >= 0) t = t.replace(/\bBDT\s?(?=[\d−-])/g, '৳ ').replace(/\bBDT\b/g, '৳');
    if (/\d\s?[ap]m\b/i.test(t)) t = t.replace(/\b(\d{1,2})(?::(\d{2}))?\s?([ap])m\b/gi, (m, h, mm, ap) => dayPart(+h, ap.toLowerCase() === 'p') + ' ' + h + ':' + (mm || '00'));
    if (/[A-Za-z]{3}/.test(t)) {
      t = t.replace(/\b(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)\b/g, (m) => WD_BN[m])
           .replace(/\b(Sat|Sun|Mon|Tue|Wed|Thu|Fri)\b/g, (m) => WDS_BN[m])
           .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (m) => MN_BN[m])
           .replace(/(\d\s)(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m, a, b) => a + MN_BN[b])
           .replace(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?=\s\d)/g, (m) => MN_BN[m]);
    }
    return t;
  }
  const cache = new Map();
  let nest = 0;
  if (typeof tr === 'function') {
    const _tr = tr;
    tr = function (t) {
      nest++;
      let o; try { o = _tr.apply(this, arguments); } finally { nest--; }
      if (nest > 0 || LANG !== 'bn' || typeof o !== 'string' || typeof t !== 'string') return o;   /* only the outermost call: the whole text is seen at once */
      try { if (OVR && OVR.t && Object.prototype.hasOwnProperty.call(OVR.t, t)) return o; } catch (e) { }
      const ck = t + '\u0001' + o;
      let r = cache.get(ck); if (r !== undefined) return r;
      const f = fix(t.trim(), 0);                              /* the text as the app wrote it … */
      r = post(f !== t.trim() ? f : fix(o, 0));                /* … else what the existing translator made of it */
      if (cache.size > 8000) cache.clear(); cache.set(ck, r); return r;
    };
  }

  /* titles, aria-labels and placeholders (also on the root containers, which the main pass skips) */
  const ATTRS = ['title', 'aria-label', 'placeholder'];
  const touched = new Set();
  /* back to English: put every attribute we translated back to its original text */
  function restoreAttrs() {
    touched.forEach(el => {
      for (const a of ATTRS) { const r = el['__bx_' + a]; if (r && el.getAttribute(a) === r.out) el.setAttribute(a, r.o); }
      if (el.__phO != null && el.getAttribute('placeholder') !== el.__phO) el.setAttribute('placeholder', el.__phO);
    });
    touched.clear();
  }
  function fixAttrs() {
    document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => {
      if (el.closest('[data-notx]')) return;
      for (const a of ATTRS) {
        const v = el.getAttribute(a); if (!v || !/[A-Za-z]{2,}/.test(v)) continue;
        const K = '__bx_' + a, rec = el[K];
        const orig = rec && rec.out === v ? rec.o : v;
        const out = tr(orig);
        if (out !== v) el.setAttribute(a, out);
        el[K] = { o: orig, out }; touched.add(el);
      }
    });
  }

  /* ------------------------------------------------------------------ the AI assistant panel
     The English layer leaves #fa-panel alone so that what people typed is never rewritten. In Bangla
     its fixed labels, suggestions and buttons still need translating, so do that here and skip the person's own messages. */
  if (typeof txAll === 'function' && typeof applyTx === 'function') {
    const _txAll2 = txAll;
    txAll = function () {
      const r = _txAll2.apply(this, arguments);
      if (LANG !== 'bn') { try { restoreAttrs(); } catch (e) { } return r; }
      if (TX_BUSY) return r;
      try { MO.disconnect(); fixAttrs(); } catch (e) { } finally { try { MO.observe(document.body, { childList: true, subtree: true }); } catch (e) { } }
      const panel = document.getElementById('fa-panel') || document.body;
      const mine = [...document.querySelectorAll('#fa-panel .ag-u')];
      try {
        MO.disconnect();
        mine.forEach(e => e.setAttribute('data-notx', ''));
        applyTx(document.body);
        panel.querySelectorAll('[placeholder]').forEach(el => { const v = el.getAttribute('placeholder'); if (el.__phO == null) el.__phO = v; touched.add(el); const o = tr(el.__phO); if (o !== v) el.setAttribute('placeholder', o); });
      } catch (e) { }
      finally { mine.forEach(e => e.removeAttribute('data-notx')); try { MO.observe(document.body, { childList: true, subtree: true }); } catch (e) { } }
      return r;
    };
  }


  /* attributes set by script after a node exists do not trigger the text observer: watch them too */
  let aq = 0;
  try {
    new MutationObserver(() => { if (LANG !== 'bn' || aq) return; aq = requestAnimationFrame(() => { aq = 0; try { fixAttrs(); } catch (e) { } }); })
      .observe(document.body, { attributes: true, subtree: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
  } catch (e) { }

  // 4 · Language page: drop the Mixed tile, two-column grid
  function tidy(root) {
    (root || document).querySelectorAll('[onclick^="setLang("]').forEach(b => {
      const m = (b.getAttribute('onclick') || '').match(/setLang\('(\w+)'\)/);
      if (m && m[1] !== 'en' && m[1] !== 'bn') { const g = b.parentElement; b.remove(); if (g && g.classList.contains('sc-grid')) g.classList.add('fta-two'); }
      else if (b.parentElement && b.parentElement.classList.contains('sc-grid') && b.parentElement.querySelectorAll('[onclick^="setLang("]').length === 2) b.parentElement.classList.add('fta-two');
      if (m && m[1] === 'bn') {
        const h3 = b.querySelector('h3'), sm = b.querySelector('small');
        if (h3 && LANG === 'en' && h3.textContent !== 'Bangla') { h3.textContent = 'Bangla'; if (sm) sm.textContent = 'Everything in Bangla'; }
        if (h3 && LANG === 'bn') { h3.textContent = 'বাংলা'; if (sm) sm.textContent = 'সবকিছু বাংলায়'; }
      }
    });
  }
  let q = 0;
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; tidy(); }); }).observe(document.body, { childList: true, subtree: true });
  tidy();
})();
