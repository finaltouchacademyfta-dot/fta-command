/* =====================================================================
   FTA · English means English (12 Nov 2026)
   When English is selected, no Bangla may appear anywhere — not in a
   page, popup, picker, toast, tooltip, placeholder or panel. Bangla shows
   only when the user picks বাংলা or Mixed.
   · EN    — English for every Bangla string the app builds that the older
             dictionaries did not cover (found by tests/n-audit.js and
             tests/n-static-bn.js over every page, popup and role).
   · roots — the translator now also covers panels opened outside the main
             screen (pop-overs, pickers, notification and profile menus).
   · Language picker labels read "Bangla / Mixed" while English is on.
   Nothing here changes data, business rules or the Bangla / Mixed modes.
   ===================================================================== */
(function () {
  'use strict';
  if (typeof tr !== 'function' || typeof I18N === 'undefined' || !window.FTA || !FTA.i18nAdd) return;

  /* ------------------------------------------------------------ 1 · translations */
  const EN = {
    'আগের মাসে ছিল ৳ 0': 'Was BDT 0 last month',
    'আগের মাসে ছিল BDT 0': 'Was BDT 0 last month',
    'বাংলা': 'Bangla',
    'বাং': 'Bangla',
    'Theme ও style': 'Theme and style',
    'মিশ্র': 'Mixed',
    'যতটা সম্ভব বাংলায়': 'As much as possible in Bangla'
    ,
    /* office screens */
    'এই student এর আগে থেকে {1} advance জমা আছে। Invoice এ লাগাতে চাইলে Finance Manager "Apply advance" করবেন; সেটা নতুন collection নয়।': 'This student already has {1} advance held. To apply it to an invoice, the Finance Manager uses "Apply advance"; that is not new collection.',
    'Bank থেকে cash এ {1} আনলে bank কমবে, cash বাড়বে, মোট টাকা একই থাকবে।': 'Moving {1} from bank to cash lowers the bank, raises cash, and the total stays the same.',
    'নাম বদলানো হয়েছে': 'Name changed',
    'কারণ লিখুন': 'Write a reason',
    '{1} আবার খোলা হয়েছে': '{1} reopened',
    'আসল লেখা ফিরে এসেছে': 'Original text restored',
    'Message copy হয়েছে': 'Message copied',
    'লেখা copy হয়েছে': 'Text copied',
    'CSV copy হয়েছে, Excel এ paste করুন': 'CSV copied — paste it into Excel',
    'নম্বর লিখুন': 'Enter a number',
    'এই item / button টা লুকিয়ে ফেলুন (delete)': 'Hide this item / button (delete)',
    'ফাঁকা রাখলে আসল লেখা ফিরে আসবে': 'Leave empty to bring back the original text',
    'প্রতি student {1}': 'Per student {1}',
    '{1} ও {2} একসাথে': '{1} and {2} together',
    'ভুল করে {1} বেশি পাঠিয়েছে': 'Sent {1} extra by mistake',
    'অনুমোদন: {1}': 'Approved by {1}',
    'cancel করেছেন {1}': 'Cancelled by {1}',
    'Student pause করেছে ({1})': 'Student paused ({1})',
    'policy অনুযায়ী {1} কম': '{1} less as per policy',
    '{1} থেকে bank এ জমা': 'Deposit from {1} to bank',
    /* sample (demo) records */
    'QIT fund (ধার)': 'QIT fund (loan)',
    'Crash batch এর জন্য আলাদা batch-based চুক্তি।': 'Separate batch-based agreement for the crash batch.',
    'Student যতটুকু দেয় তার 50%। চুক্তি অনুযায়ী।': '50% of what the student pays, as agreed.',
    'September থেকে On Hold.': 'On Hold since September.',
    'Zoom Pro (এই batch এর জন্য)': 'Zoom Pro (for this batch)',
    'Guardian বলেছেন ব্যবসায় সমস্যা চলছে। কিস্তিতে দিতে চান।': 'Guardian says business is slow and wants to pay in instalments.',
    'Merit scholarship {1} / মাস। অনুমোদন: Mahmud Alam। শেষ: Dec 2026।': 'Merit scholarship {1} / month. Approved by Mahmud Alam. Ends Dec 2026.',
    'Guardian screenshot পাঠিয়েছেন': 'Guardian sent a screenshot',
    'Collection staff আবার entry দিয়েছেন': 'Collection staff entered it again',
    'bKash statement এ এই transaction নেই': 'This transaction is not in the bKash statement',
    'Recording laptop (asset, operating খরচ নয়)': 'Recording laptop (asset, not an operating expense)',
    'Bank এ যাওয়া-আসা': 'Travel to and from the bank',
    'Refundable security deposit (খরচ নয়)': 'Refundable security deposit (not an expense)',
    'অফিস খরচের জন্য cash তোলা': 'Cash withdrawn for office expenses',
    'কিস্তি ১': 'Instalment 1',
    '২টি class হয়নি (approved)': '2 classes not held (approved)',
    'Demo: আসল app এ sign out হবে': 'Demo: the real app signs out here',
    'Demo: user যোগের form আসল app এ থাকবে': 'Demo: the real app opens the add-user form here',
    'Demo: আসল app এ Excel file download হবে': 'Demo: the real app downloads an Excel file here',
    'Demo: আসল app এ FTA branding সহ PDF হবে': 'Demo: the real app makes a branded PDF here',
    'Demo: নতুন loan / owner fund entry form আসল app এ থাকবে': 'Demo: the real app opens the loan / owner fund form here',
    'Demo: আসল app এ PDF download ও print হবে': 'Demo: the real app downloads and prints the PDF here',
    /* found by the second review (flows, toasts, settings) */
    'উপরে': 'Move up',
    'নিচে': 'Move down',
    'Reminder copy হয়েছে': 'Reminder copied',
    'Menu আগের ক্রমে ফিরেছে': 'Menu order restored',
    'মুছে ফেলা হয়েছে; পুরোনো record বদলায়নি': 'Deleted; older records are unchanged',
    'সব আসল লেখা ফিরে এসেছে': 'All original text restored',
    'নতুন fee শুধু নতুন ভর্তিতে লাগবে': 'The new fee applies to new enrolments only',
    'কী কথা হলো লিখুন': 'Write what was discussed',
    'Amount ও তারিখ দিন': 'Enter the amount and date',
    'Print তৈরি হচ্ছে…': 'Preparing print…',
    'প্রতি student এর fee আলাদা হতে পারে: {1}': 'Fees can differ per student: {1}',
    'প্রতি student এর fee আলাদা হতে পারে:': 'Fees can differ per student:',
    'Save হচ্ছে…': 'Saving…'
    /*@@EN@@*/
  };
  /* never replace a translation the app already has (approved wording stays) */
  const NEW = {}; Object.keys(EN).forEach(k => { try { if (/\{\d+\}/.test(k) || !I18N.en.exact.has(I18N.norm(k))) NEW[k] = EN[k]; } catch (e) { NEW[k] = EN[k]; } });
  FTA.i18nAdd('en', NEW);
  try { I18N_CACHE.clear(); } catch (e) { }

  /* ------------------------------------------------------------ 1b · money sign: English screens say BDT (as the KPI cards already do) */
  const CHART_W = { 'মোট': 'Total', 'দেরি করছে': 'Late', 'আদায়': 'Collected', 'বাকি': 'Due', 'অগ্রিম': 'Advance' };
  const CHART_N = {}; Object.keys(CHART_W).forEach(k => { CHART_N[k.normalize('NFC')] = CHART_W[k]; });
  const CHART_RX = new RegExp('^(' + Object.keys(CHART_N).join('|') + ') ([\\u2212\\-]?[\\d.,]+[kL]?)$');
  const _tr = tr;
  tr = function (t) {
    const o = _tr.apply(this, arguments);
    if (LANG !== 'en' || typeof o !== 'string') return o;
    if (/^[•·\-–] /.test(o) && /[ঀ-৲৴-৿]/.test(o)) {    /* "• a sentence": translate the sentence, keep the bullet */
      const b = o.slice(0, 2), rest = tr(o.slice(2)); if (rest !== o.slice(2)) return b + rest;
    }
    const m = CHART_RX.exec(o.normalize('NFC'));                                /* chart labels for screen readers: "মোট 25", "আদায় 1.1L" */
    if (m) return CHART_N[m[1]] + ' ' + m[2];
    if (o.indexOf('৳') < 0) return o;
    return o.replace(/\s*\(৳\)/g, /BDT/.test(o) ? '' : ' (BDT)').replace(/৳\s?(?=[\d\u2212\-])/g, 'BDT ').replace(/৳\s?/g, 'BDT');
  };

  /* ------------------------------------------------------------ 1c · WhatsApp texts follow the app language
     In English mode a reminder opens in English. The reminder window keeps its own Bangla tab,
     so a Bangla message is still possible — but only when someone picks it there. */
  let pickedBn = false;
  if (typeof reminderText === 'function') {
    const _rt = reminderText;
    reminderText = function (id, lang) { if (LANG === 'en' && lang !== 'en' && !pickedBn) lang = 'en'; return _rt.call(this, id, lang); };
  }
  if (typeof reminderView === 'function') {
    const _rv = reminderView;
    reminderView = function (id, lang) {
      pickedBn = lang === 'bn';
      try { return _rv.call(this, id, lang || (LANG === 'en' ? 'en' : 'bn')); } finally { pickedBn = false; }
    };
  }

  /* ------------------------------------------------------------ 2 · language picker labels */
  const LBL = { bn: ['Bangla', 'As much as possible in Bangla'], mix: ['Mixed', 'English terms with Bangla explanations'] };
  function fixPickers(root) {
    if (LANG !== 'en') return;
    (root || document).querySelectorAll('[onclick^="setLang("]').forEach(b => {
      const m = (b.getAttribute('onclick') || '').match(/setLang\('(\w+)'\)/); if (!m || !LBL[m[1]]) return;
      const h3 = b.querySelector('h3'), sm = b.querySelector('small');
      if (h3) { if (h3.textContent !== LBL[m[1]][0]) h3.textContent = LBL[m[1]][0]; if (sm && sm.textContent !== LBL[m[1]][1]) sm.textContent = LBL[m[1]][1]; }
      else if (b.textContent !== LBL[m[1]][0]) b.textContent = LBL[m[1]][0];
    });
  }

  /* ------------------------------------------------------------ 2b · search hints that do not fit a phone-width box get their short form
     (the full hint stays as the tooltip; wider screens keep the full hint) */
  const SHORT = {
    'Name, phone, guardian, receipt, ref, amount, month…': 'Search payments…',
    'Search teachers by name, subject, phone or pay model': 'Search teachers…',
    'Search this payroll by teacher, student or amount': 'Search payroll…',
    'Student, guardian, phone, invoice, month or amount (e.g. >5000)': 'Search dues…',
    'Another number (WhatsApp, guardian, home…)': 'Another number',
    'Field name, e.g. Syllabus code': 'Field name',
    'Field name': 'Name',
    'e.g. Cambridge 0580 · June 2024 · Paper 42 · Q7': 'e.g. 0580 · Jun 2024 · P42',
    'e.g. IGCSE Mathematics · Algebra Quiz': 'e.g. Algebra Quiz',
    'e.g. trial class done, guardian prefers evening': 'e.g. trial class done',
    'e.g. Guardian asked for extra Maths support': 'e.g. extra Maths support',
    'Statement balance': 'Balance',
    'Looking for a page or task? e.g. payment, slip, reminder': 'Search pages or tasks…',
    'Search pages or tasks…': 'Search…',
    'Search anything…': 'Search…',
    'Search or start a new chat': 'Search chats…',
    'Meet / Zoom link (optional)': 'Meet / Zoom link',
    'Search programmes, batches and enrolments': 'Search programmes…',
    'Search salaries by teacher, month or amount': 'Search salaries…'
  };
  const OUR_TIPS = new Set(Object.keys(SHORT));
  let cv = null;
  const fits = (i, text) => {
    try {
      cv = cv || document.createElement('canvas').getContext('2d');
      const cs = getComputedStyle(i); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      return cv.measureText(text).width <= i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1;
    } catch (e) { return true; }
  };
  function fitHints() {
    document.querySelectorAll('input[placeholder]').forEach(i => {
      if (!i.clientWidth) return;
      if (i.__phFull != null && (LANG !== 'en' || fits(i, tr(i.__phFull)))) {      /* room again (or another language): back to the full hint */
        i.__ph = i.__phFull; i.placeholder = tr(i.__phFull); if (i.__phTitle) i.removeAttribute('title'); i.__phFull = null; i.__phTitle = false; return;
      }
      if (LANG !== 'en' && i.title && OUR_TIPS.has(i.title) && i.placeholder !== i.title) i.removeAttribute('title');
      let cur = i.placeholder, guard = 0;
      const shortOf = t => SHORT[t] || (/^Search \S/.test(t) && /( by |, | for )/.test(t) ? t.split(/ by |, | for /)[0].replace(/[….]+$/, '') + '…' : /^e\.g\. .*( · |, )/.test(t) ? t.split(/ · |, /)[0] : null);
      while (LANG === 'en' && shortOf(cur) && shortOf(cur) !== cur && !fits(i, cur) && guard++ < 3) {
        if (i.__phFull == null) { i.__phFull = i.__ph != null ? i.__ph : cur; if (!i.title) { i.title = cur; i.__phTitle = true; OUR_TIPS.add(cur); } }
        cur = shortOf(cur); i.__ph = cur; i.placeholder = cur;
      }
      /* still too long for this box: the hint (only the hint, not typed text) is drawn a little smaller */
      i.style.removeProperty('--ph-fs'); i.removeAttribute('data-ph-fit');
      if (!fits(i, i.placeholder)) {
        try {
          const cs = getComputedStyle(i); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
          const room = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), need = cv.measureText(i.placeholder).width;
          if (room > 20) { i.style.setProperty('--ph-fs', Math.max(10, parseFloat(cs.fontSize) * room / need * 0.96).toFixed(2) + 'px'); i.setAttribute('data-ph-fit', ''); }
        } catch (e) { }
      }
    });
  }
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { try { fitHints(); } catch (e) { } }, 150); });

  /* ------------------------------------------------------------ 3 · every root, not only the main screen */
  const MAIN = new Set(['login', 'side', 'top', 'view', 'sheet', 'bnav', 'toast', 'main', 'app', 'shell']);
  const HAS_MAIN = el => !!el.querySelector && !!el.querySelector('#view,#top,#side');   /* a wrapper around the main screen: already translated */
  const SKIP_ID = /^(fa-panel|fta-boot|ov)$/;              /* the AI chat keeps what people typed; #ov holds #sheet (done already) */
  const _txAll = txAll;
  txAll = function () {
    if (TX_BUSY) return _txAll.apply(this, arguments);       /* a nested call: the outer pass does the work */
    const r = _txAll.apply(this, arguments);
    if (LANG !== 'en' && LANG !== 'bn') { try { fitHints(); fixLinksAndFields(); } catch (e) { } return r; }
    try {
      MO.disconnect();
      for (const el of document.body.children) {
        if (MAIN.has(el.id) || SKIP_ID.test(el.id || '') || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK)$/.test(el.nodeName) || el.hasAttribute('data-notx') || HAS_MAIN(el)) continue;
        applyTx(el);
      }
      if (LANG === 'en') fixPickers();
      fitHints();
      fixLinksAndFields();
    } catch (e) { }
    finally { try { MO.observe(document.body, { childList: true, subtree: true }); } catch (e) { } }
    return r;
  };
  /* ------------------------------------------------------------ 4 · documents & report papers (shadow DOM preview + print frame)
     The translator never reaches inside a paper, so an English paper is translated once while it is built.
     A paper set to Bangla (or both languages) in Settings › Documents keeps that choice. */
  const BN_RX = /[ঀ-৲৴-৿৳]/;
  const paperEn = () => { if (LANG !== 'en') return false; try { const l = DS().style.lang; return !l || l === 'en'; } catch (e) { return true; } };
  function enHtml(html) {
    if (typeof html !== 'string' || !BN_RX.test(html)) return html;
    const t = document.createElement('template'); t.innerHTML = html;
    const w = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && /^(STYLE|SCRIPT)$/.test(n.parentNode.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(n => { const raw = n.nodeValue, s = raw.trim(); if (!s || !BN_RX.test(s)) return; const o = tr(s); if (o !== s) n.nodeValue = raw.replace(s, o); });
    t.content.querySelectorAll('[title],[aria-label],[alt]').forEach(el => ['title', 'aria-label', 'alt'].forEach(a => { const v = el.getAttribute(a); if (v && BN_RX.test(v)) el.setAttribute(a, tr(v)); }));
    return t.innerHTML;
  }
  if (typeof mountPaper === 'function') {
    const _mp = mountPaper;
    mountPaper = function (host, html) { return _mp.call(this, host, paperEn() ? enHtml(html) : html); };
  }
  if (typeof docPrint === 'function') {
    const _dp = docPrint;
    docPrint = function (paperHTML) { const a = [...arguments]; if (paperEn()) { a[0] = enHtml(paperHTML); for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string' && BN_RX.test(a[i])) a[i] = tr(a[i]); } return _dp.apply(this, a); };   /* the title also names the PDF file */
  }

  /* ------------------------------------------------------------ 5 · global search: translate a result before the match is highlighted
     (the <mark> split a sentence into pieces the translator could not recognise) */
  if (window.V8 && typeof V8.mark === 'function') {
    const _mark = V8.mark;
    V8.mark = function (txt, Q) { return _mark.call(this, (LANG === 'en' || LANG === 'bn') && typeof txt === 'string' ? tr(txt) : txt, Q); };
  }

  /* ------------------------------------------------------------ 6 · toasts are translated before they are shown (no Bangla flash) */
  if (typeof toast === 'function') {
    const _toast = toast;
    toast = function (t) { if (typeof t === 'string' && LANG === 'en' && BN_RX.test(t) && !/^Demo: /.test(t)) { try { t = tr(t); } catch (e) { } } return _toast.apply(this, [t].concat([].slice.call(arguments, 1))); };
  }
  /* a small change (a button saying "Saving…", a message line) is translated before the screen paints,
     instead of waiting for the next frame; big re-renders still go through the normal pass */
  try {
    const MO2 = new MutationObserver(list => {
      if (LANG !== 'en' || TX_BUSY || list.length > 40) return;
      const set = new Set();
      for (const m of list) { const el = m.type === 'characterData' ? m.target.parentElement : m.target; if (el && el.nodeType === 1 && el !== document.body) set.add(el); }
      if (!set.size || set.size > 12) return;
      const hit = [...set].filter(el => BN_RX.test(el.textContent || '') && !el.closest('[data-notx],#fa-panel'));
      if (!hit.length) return;
      MO2.disconnect(); MO.disconnect();
      try { hit.forEach(el => applyTx(el)); } catch (e) { }
      MO.observe(document.body, { childList: true, subtree: true });
      MO2.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    MO2.observe(document.body, { childList: true, subtree: true, characterData: true });
  } catch (e) { }

  /* ------------------------------------------------------------ 7 · WhatsApp links and default field values
     · the phone-number links carried a Bangla greeting; in English mode it is English
     · a link with no number (teachers never get guardian numbers) opens WhatsApp's own contact picker
       instead of a broken "wa.me/880" address
     · settings fields still showing a built-in Bangla default (e.g. "প্রতি মাসের ১০ তারিখ") show the
       English default; anything a person typed stays exactly as typed */
  const WA_EN = { 'আসসালামু আলাইকুম, Final Touch Academy থেকে বলছি।': 'Assalamu Alaikum, this is Final Touch Academy.' };
  let DEFAULTS = null;
  function fixLinksAndFields() {
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
      let u; try { u = new URL(a.href); } catch (e) { return; }
      let ch = false;
      if (u.pathname === '/880' || u.pathname === '/88') { u.pathname = '/'; ch = true; }
      if (LANG === 'en') { const tx = u.searchParams.get('text'); if (tx && WA_EN[tx]) { u.searchParams.set('text', WA_EN[tx]); ch = true; } }
      if (ch) a.href = u.toString();
    });
    if (LANG !== 'en') return;
    /* only the app's own built-in Bangla defaults are shown in English — never anything saved or typed */
    if (!DEFAULTS) { DEFAULTS = new Set(['BDT (৳)', 'প্রতি মাসের ১০ তারিখ']); try { QUOTES.forEach(q => q[1] && DEFAULTS.add(q[1])); } catch (e) { } }
    document.querySelectorAll('#view input:not([type]), #view input[type="text"], #view textarea').forEach(i => {
      if (i === document.activeElement || !i.value || !DEFAULTS.has(i.value)) return;
      if (i.value !== (i.nodeName === 'TEXTAREA' ? i.defaultValue : i.getAttribute('value'))) return;
      const o = tr(i.value); if (o && o !== i.value && !BN_RX.test(o)) { i.value = o; if (i.nodeName !== 'TEXTAREA') i.setAttribute('value', o); else i.defaultValue = o; }
    });
  }

  window.FTA_EN = { EN, fixPickers, enHtml };
})();
