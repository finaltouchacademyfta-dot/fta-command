/* =====================================================================
   PROD FIX (worker A) — real clock, empty start, data registry, demo leftovers
   ---------------------------------------------------------------------
   The demo build (window.FTA_MODE === 'demo') is left exactly as it was:
   every block below either returns early in the demo or gives the same
   result there. In every other mode (prod, mock, test-empty):

   CLOCK (src/patches.py)
   - TODAY / CUR come from the real clock in Asia/Dhaka (UTC+6); START is
     the first month that has data; MONTHS is the same array object, grown
     in place by FTA.syncMonths() (called after the data arrives and before
     every render). window.FTA_TODAY = 'YYYY-MM-DD' overrides the date (tests).
   - A new day while the app is open → FTA.onNewDay() (default: reload).

   DATE LITERAL AUDIT (184 literals in the app; seed/sample data left as is)
   Logic that assumed "today is 17 Oct 2026" and now follows the clock:
    1. periodRange 'lm' / 'lm2' (Sep / Aug 2026)  → previous two months of CUR
    2. periodRange 'ty' (from 2026-01-01, Year 2026) → CUR's year
    3. periodRange 'custom' and ST.cf default (2026-08-01) → CUR − 2 months
    4. dashboard approvals "November 2026" + ST.invM='2026-11' → month of the
       oldest draft invoices (else next month)
    5. invoice month picker [...MONTHS, '2026-11'] → next month of CUR
    6. notification "September closing" / CLOSE['2026-09'] (crashed when that
       month did not exist) → previous month, only if it is in closing
    7. "নতুন ভর্তি (Sep–Oct)" joined in '2026-09' → previous month + CUR
    8. document month chips (2026-11, 2026-12, dg(2026)) → next two months
    9. recurring expense card "November 2026" → next month; recurApprove()
       now really adds next month's recurring entries (was a demo toast)
   10. payrollLines: fixed salary only until 2026-08 (demo story) → every
       month while the teacher is not Inactive
   11. 'Year-to-Date Summary · 2026' → CUR's year
   12. receipt numbers 'RCP-2026-…' (4 places) → 'RCP-' + TODAY's year
   13. classesFor(): demo formula (8 or 7) → classes actually held for the
       student in that month (attendance register, not-held days excluded)
   14. V8.CLOCK (demo clock offset) → 0
   15. notice numbers: V8.ntSeq = 18 (demo) → highest number this year
   Ids built from list.length (17 generators: PAY, PRG, BAT, MEN, FTA-T,
   TRF, PRP, RFD, OX, Q, OTH, N, G, U, C, EX, RT, SR, STU, ENR, HW) now use
   FTA.n() = next number above every existing id, recycle bin included, so
   a delete can never make two records share an id. paySeq / invSeq /
   expSeq are raised to the highest id in the data (FTA.syncSeq).

   EMPTY-STATE fixes (tests/a-empty.js): dashboard/academic slides and
   insights that read OTHERS[0], SCH.EXAMS[1], EX[0], 'EX1', MENTORS[0],
   STUDENTS[0] or the top-due student; forms that need a student /
   teacher / programme first (payment, follow-up, enrolment, batch,
   receipt) now say what to add first; exams page and teacher pages show
   an empty state; one-month charts no longer draw NaN; "see as" a role
   uses a real teacher / student and removes users made only for it.
   Last line of defence: any page / slide that still throws shows
   "Nothing here yet" and records the error in FTA.errors.
   ADDED: teacher pay rule (model + rate) on the teacher form for the
   Owner / Admin — teachers created in the app had no way to get one.

   EMPTY START: FTA.resetData() runs once here in production, before the
   backend layer loads the real records. FTA.collections is the registry
   of every persisted container (see FTA.collections below).
   ===================================================================== */
(function () {
  const F = window.FTA = window.FTA || {};
  const isDemo = F.demo = window.FTA_MODE === 'demo';
  const has = n => { try { return typeof eval(n) !== 'undefined'; } catch (e) { return false; } };
  const get = n => { try { return eval(n); } catch (e) { return undefined; } };

  /* ------------------------------------------------------------ i18n for the new / dynamic strings */
  F.i18nAdd = (lang, map) => {
    if (typeof I18N === 'undefined' || !I18N[lang]) return;
    const T = I18N[lang];
    Object.keys(map).forEach(k => {
      const v = map[k], nk = I18N.norm(k); if (v == null || v === '') return;
      if (!/\{\d+\}/.test(nk)) { T.exact.set(nk, v); return; }
      const parts = nk.split(/\{(\d+)\}/), order = []; let re = '^', lit = '';
      parts.forEach((p, i) => { if (i % 2) { re += '(.*?)'; order.push(+p); } else { re += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if (p.trim().length > lit.length) lit = p.trim(); } });
      if (!lit) return;
      T.tpl = T.tpl.filter(t => t.key !== nk);
      T.tpl.push({ re: new RegExp(re + '$'), order, out: v, lit, n: nk.length, dot: nk.includes('·'), key: nk });
    });
    T.tpl.sort((a, b) => b.n - a.n);
  };
  F.i18nAdd('en', {
    '{1} closing বাকি': '{1} closing pending',
    'নতুন ভর্তি ({1}–{2})': 'New enrolments ({1}–{2})',
    'Recurring খরচের draft · {1}': 'Recurring expense draft · {1}',
    'শেষ sync: {1}': 'Last sync: {1}'
  });
  F.i18nAdd('bn', {
    '{1} closing বাকি': '{1} ক্লোজিং বাকি',
    'Recurring খরচের draft · {1}': 'নিয়মিত খরচের খসড়া · {1}',
    'শেষ sync: {1}': 'শেষ সিঙ্ক: {1}',
    'Live · cloud sync': 'লাইভ · ক্লাউড সিঙ্ক',
    'Year-to-Date Summary · {1}': 'বছরের শুরু থেকে সারাংশ · {1}',
    '{1} recurring expenses added for {2} (waiting for approval)': '{2} এর {1} টি নিয়মিত খরচ যোগ হয়েছে (অনুমোদনের অপেক্ষায়)',
    '{1} recurring expenses added for {2}': '{2} এর {1} টি নিয়মিত খরচ যোগ হয়েছে',
    'Nothing new to add — next month already has these': 'নতুন কিছু নেই — পরের মাসে এগুলো আগেই আছে',
    'CSV file downloaded (opens in Excel)': 'CSV ফাইল ডাউনলোড হয়েছে (Excel এ খোলে)',
    'Signed in account': 'সাইন ইন করা অ্যাকাউন্ট',
    'Sign out': 'সাইন আউট'
  });

  /* ------------------------------------------------------------ demo buttons → real actions */
  const DEMO_T = { signOut: 'Demo: আসল app এ sign out হবে', userAdd: 'Demo: user যোগের form আসল app এ থাকবে', xls: 'Demo: আসল app এ Excel file download হবে', pdf: 'Demo: আসল app এ FTA branding সহ PDF হবে' };
  F.download = (name, text, type) => {
    const b = new Blob([text], { type: type || 'text/plain' }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 1000);
  };
  F.ACT = F.ACT || {};
  Object.assign(F.ACT, {
    signOut: () => { if (isDemo) return toast(DEMO_T.signOut); return (F.onSignOut || (F.signOut !== F.ACT.signOut && F.signOut) || SCH.signOut)(); },
    userAdd: () => { if (isDemo) return toast(DEMO_T.userAdd); if (F.onUserAdd) return F.onUserAdd(); if (SCH.staffForm) return SCH.staffForm(); go('settings'); },
    xls: (k, arg) => { if (isDemo) return toast(DEMO_T.xls); const R = buildReport(k, arg); F.download(((R && R.title) || 'FTA report').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '-' + TODAY + '.csv', '﻿' + repCSV(k, arg), 'text/csv;charset=utf-8'); toast('CSV file downloaded (opens in Excel)'); },
    pdf: (k, arg) => { if (isDemo) return toast(DEMO_T.pdf); repPrint(k, arg); }
  });
  if (isDemo) return;                                   /* ===== everything below: not in the demo ===== */

  /* demo-only toasts that are still reachable from older screens */
  const DEMO_TOAST = {
    'Demo: নতুন loan / owner fund entry form আসল app এ থাকবে': () => { if (window.MZ && MZ.othNew) MZ.othNew(); },
    'Demo: আসল app এ PDF download ও print হবে': () => window.print(),
    'Demo: আসল app এ sign out হবে': () => F.ACT.signOut()
  };
  const _toast = toast;
  toast = function (t) {
    if (typeof t === 'string') {
      if (DEMO_TOAST[t]) return DEMO_TOAST[t]();
      if (/^Demo: /.test(t)) t = t.slice(6);
    }
    return _toast.call(this, t);
  };
  try {                                                 /* translations for the messages without "Demo: " */
    const en = {}, bn = {};
    Object.keys(I18N_DATA.en || {}).forEach(k => { if (/^Demo: /.test(k)) en[k.slice(6)] = String(I18N_DATA.en[k]).replace(/^Demo: (.)/, (m, c) => c.toUpperCase()); });
    Object.keys(I18N_DATA.bn || {}).forEach(k => { if (/^Demo: /.test(k)) bn[k.slice(6)] = String(I18N_DATA.bn[k]).replace(/^ডেমো: /, ''); });
    F.i18nAdd('en', en); F.i18nAdd('bn', bn);
  } catch (e) { }

  /* demo sign-in shortcuts and the demo role switcher are not offered */
  const st = document.createElement('style'); st.id = 'fta-prodfix';
  st.textContent = '.lg-demo{display:none!important}';
  document.head.appendChild(st);
  if (window.V8) V8.CLOCK = 0;
  F.accountSheet = () => {
    const u = ME() || {};
    sheet('ACCOUNT', esc(u.name || ''), `<p class="sub">Signed in account</p><div class="li"><div class="m"><b>${esc(u.name || '')}</b><small>${esc(u.email || '')}</small></div><div class="v">${esc(ST.role || '')}</div></div>
      <div class="row" style="margin-top:14px;gap:8px"><button class="btn" type="button" onclick="closeSheet();themeSheet()">${ic('palette')}Theme</button><button class="btn d" type="button" onclick="closeSheet();FTA.act('signOut')">${ic('logout')}Sign out</button></div>`);
  };
  const whob = document.getElementById('whob');
  if (whob) whob.addEventListener('click', e => { e.stopImmediatePropagation(); e.preventDefault(); F.accountSheet(); }, true);
  if (SCH.ensureUser) { const _eu = SCH.ensureUser; SCH.ensureUser = r => { _eu(r); USERS.forEach(u => { if (u.role === r && / \(sample\)$/.test(u.name)) { u.name = r; u.email = ''; } }); }; }

  /* ------------------------------------------------------------ data registry */
  /* kinds: list = array of records with a unique key · map = object of records by key
     object = one settings object · values = array of plain values (an editable list) */
  const C = {};
  const add = (name, kind, key, extra) => { if (!has(name)) return; const box = get(name); if (box == null || typeof box !== 'object') return; C[name] = Object.assign({ name, kind, key: key || null, get: () => get(name) }, extra || {}); };
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ensureIds = (name, prefix) => () => { const a = get(name) || []; a.forEach(x => { if (x && typeof x === 'object' && !x.id) x.id = uid(prefix); }); return a; };
  ['STUDENTS', 'ENROL', 'PROGS', 'BATCHES', 'MENTORS', 'INVOICES', 'PAYMENTS', 'ADVAPP', 'REFUNDS', 'EXPENSES', 'TRANSFERS', 'OTHERS', 'PRPAY', 'ACCOUNTS', 'USERS', 'NOTES',
    'SCH.CLASSES', 'SCH.GROUPS', 'SCH.HW', 'SCH.EXAMS', 'SCH.RT', 'SCH.LEAVE', 'SCH.PEND', 'SCH.CNOTES',
    'V8.CIRCLES', 'V8.NOTICES', 'V8.REQ', 'V8.EV', 'V8.QB', 'V8.OX', 'V8.SREQ'].forEach(n => add(n, 'list', 'id'));
  add('FOLLOW', 'list', 'id', { ensureIds: ensureIds('FOLLOW', 'FU') });
  add('AUDIT', 'list', 'id', { ensureIds: ensureIds('AUDIT', 'AU') });
  add('SCH.LOG', 'list', 'id', { ensureIds: ensureIds('SCH.LOG', 'LG') });
  add('SCH.NOTICES', 'list', 'id', { ensureIds: ensureIds('SCH.NOTICES', 'TN') });
  add('SCH.STAFF', 'list', 'uid'); add('SCH.LOGINS', 'list', 'tid'); add('SCH.SPORT', 'list', 'stu');
  add('V8.STATUSES', 'list', 'k'); add('V9L.ST', 'list', 'n');
  const netGetter = F.netGetter = it => {
    if (!it || typeof it !== 'object') return it;
    const d = Object.getOwnPropertyDescriptor(it, 'net'); if (d && d.get) return it;
    delete it.net;
    Object.defineProperty(it, 'net', { get() { return this.gross + this.bonus - this.deduct; }, enumerable: true, configurable: true });
    return it;
  };
  add('PAYROLL', 'map', null, { restore: r => { if (r && Array.isArray(r.items)) r.items.forEach(netGetter); return r; } });
  ['CLOSE', 'RECON', 'BONUS', 'DEDUCT', 'ADV', 'METHOD', 'SCH.ATT', 'SCH.ATTX', 'SCH.MARKS', 'SCH.ROUT', 'V8.ATT', 'V8.PRR', 'V9L.MST', 'V9S.SH'].forEach(n => add(n, 'map'));
  ['ORG', 'BUDGET', 'SCH.PERM', 'SCH.TOPICS'].forEach(n => add(n, 'object'));
  add('V8.SUBF', 'map');
  /* settings kept in a variable that the app replaces as a whole (null = built-in defaults) */
  [['DOCSET', v => { DOCSET = v; }], ['MSGSET', v => { MSGSET = v; }], ['UISET', v => { UISET = v; }]].forEach(([n, set]) => { if (has(n)) C[n] = { name: n, kind: 'setting', key: null, get: () => get(n), set }; });
  ['EXP_CATS', 'PAY_METHODS', 'CHECKS', 'CLASSES', 'LISTS2', 'V8.BOARDS', 'V8.LEVELS', 'V9H.BOARDS'].forEach(n => add(n, 'values'));
  /* recycle bin: entries point at the live array they came from → stored by collection name */
  const listName = arr => Object.keys(C).find(k => C[k].get() === arr) || null;
  const plain = v => JSON.parse(JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x));
  add('SCH.BIN', 'list', 'id', {
    ensureIds: ensureIds('SCH.BIN', 'BIN'),
    serialize: b => { const o = plain(Object.assign({}, b, { list: undefined })); o.listName = b.list ? listName(b.list) : null; return o; },
    deserialize: o => { const b = Object.assign({}, o); b.list = o.listName && C[o.listName] ? C[o.listName].get() : undefined; delete b.listName; return b; }
  });
  Object.values(C).forEach(c => { if (c.kind === 'list' && !c.ensureIds) c.ensureIds = () => c.get(); });
  F.collections = C;
  /* browser-only keys the demo used as its "server" (org-wide in the real app → backend decides) */
  F.localKeys = ['fta-demo-docs', 'fta-demo-msg', 'fta-demo-ui', 'fta-ovr', 'v8-*'];

  /* ------------------------------------------------------------ months, payroll, counters */
  let syncing = false;
  F.syncSeq = () => {
    const top = (arr, re, f) => (arr || []).reduce((a, x) => { const m = re.exec(String((f ? f(x) : x && x.id) || '')); return m ? Math.max(a, +m[1]) : a; }, 0);
    const bin = (SCH.BIN || []).map(b => b && b.item).filter(Boolean);
    paySeq = Math.max(paySeq, top(PAYMENTS.concat(bin), /^PAY-(\d+)$/), top(PAYMENTS.concat(bin), /^RCP-\d{4}-(\d+)/, x => x && x.rcpt));
    invSeq = Math.max(invSeq, top(INVOICES.concat(bin), /^INV-\d{4}-(\d+)$/));
    expSeq = Math.max(expSeq, top(EXPENSES.concat(bin), /^EXP-(\d+)$/));
    if (window.V8 && V8.NOTICES) V8.ntSeq = top(V8.NOTICES, new RegExp('^FTA/NTC/' + CUR.slice(0, 4) + '/(\\d+)$'), x => x && x.no);
  };
  /* only people who may prepare payroll rebuild its draft lines; everyone else just reads */
  const canPay = () => { try { const r = R_(); return !!(r && r.edit && r.money !== false && !SCH.preview && ST.role !== 'Mentor' && ST.role !== 'Student'); } catch (e) { return false; } };
  F.ensurePayroll = () => {
    MONTHS.forEach(m => {
      let r = PAYROLL[m];
      if (!r) r = PAYROLL[m] = { month: m, status: 'Draft', items: [], preparedBy: '', reviewedBy: '', approvedBy: '' };
      if (!Array.isArray(r.items)) r.items = [];
      r.items.forEach(netGetter);
      if (r.status !== 'Draft' || locked(m) || !canPay()) return;
      MENTORS.forEach(men => {
        let lines; try { lines = payrollLines(men.id, m); } catch (e) { return; }
        let it = r.items.find(x => x.mentor === men.id);
        if (!it) { if (!lines.length) return; it = netGetter({ mentor: men.id, lines: [], gross: 0, bonus: 0, bonusNote: '', deduct: 0, deductNote: '' }); r.items.push(it); }
        if (JSON.stringify(it.lines) !== JSON.stringify(lines)) it.lines = lines;
        const g = sum(lines, l => l.amt); if (it.gross !== g) it.gross = g;
      });
      for (let i = r.items.length - 1; i >= 0; i--) { const it = r.items[i]; if (!MENTORS.some(x => x.id === it.mentor) || (!it.lines.length && !it.bonus && !it.deduct)) r.items.splice(i, 1); }
    });
  };
  F.syncMonths = () => {
    if (syncing) return; syncing = true;
    try {
      let first = CUR; const later = new Set();
      const see = d => { if (typeof d !== 'string' || !/^\d{4}-\d{2}/.test(d)) return; const m = d.slice(0, 7); if (m < first && m >= '2000-01') first = m; if (m > CUR && m < '2100-01') later.add(m); };
      INVOICES.forEach(i => see(i.month)); PAYMENTS.forEach(p => see(p.date)); EXPENSES.forEach(e => { see(e.month); see(e.date); });
      ENROL.forEach(e => see(e.start)); PRPAY.forEach(p => { see(p.month); see(p.date); }); STUDENTS.forEach(s => see(s.joined));
      TRANSFERS.forEach(t => see(t.date)); REFUNDS.forEach(r => see(r.date)); ADVAPP.forEach(a => see(a.date));
      OTHERS.forEach(o => { see(o.date); (o.txns || []).forEach(t => see(t.date)); });
      Object.keys(PAYROLL).forEach(see); Object.keys(CLOSE).forEach(see);
      const want = []; for (let m = first; m <= CUR; m = FTA.nextM(m)) want.push(m);
      if (want.join() !== MONTHS.join()) MONTHS.splice(0, MONTHS.length, ...want);
      START = MONTHS[0] + '-01';
      MONTHS.concat([FTA.nextM(CUR)], [...later]).forEach(m => { if (!CLOSE[m]) CLOSE[m] = { status: 'Open' }; });
      F.syncSeq(); F.ensurePayroll();
      try { if (typeof movements === 'function') MOVES = movements(); } catch (e) { F.errors && F.errors.push('movements: ' + e.message); console.warn('[FTA] movements', e); }
    } finally { syncing = false; }
  };

  /* classes really held for this student (paid per class) */
  classesFor = function (en, m) {
    const ids = new Set(SCH.GROUPS.filter(g => g.prog === en.prog && g.mentor === en.mentor && (g.batch || '') === (en.batch || '')).map(g => g.id));
    const held = new Set();
    Object.keys(SCH.ATT).forEach(k => {
      const [gid, d] = k.split('|'); if (!ids.has(gid) || !d || !d.startsWith(m)) return;
      const x = SCH.ATTX && SCH.ATTX[k]; if (x && x.held && x.held !== 'Held') return;
      const r = SCH.ATT[k]; if (r && r.marks && r.marks[en.stu]) held.add(k);
    });
    return held.size;
  };

  /* recurring expenses: "approve all" adds next month's entries for real */
  recurApprove = function () {
    if (!guard('edit')) return;
    const nm = FTA.nextM(CUR), last = +FTA.mEnd(nm).slice(8), appr = !!(R_() && R_().approve);
    const src = EXPENSES.filter(e => e.recurring && e.month === CUR && e.status !== 'Rejected'); let n = 0;
    uniq(src.map(e => e.cat + '|' + e.payee + '|' + e.amt)).forEach(k => {
      const e = src.find(x => x.cat + '|' + x.payee + '|' + x.amt === k);
      if (EXPENSES.some(x => x.recurring && x.month === nm && x.cat === e.cat && x.payee === e.payee)) return;
      const day = String(Math.min(+(e.date || '').slice(8, 10) || 1, last)).padStart(2, '0');
      addExp({ date: nm + '-' + day, month: nm, cat: e.cat, payee: e.payee, desc: e.desc, amt: e.amt, acct: e.acct, cls: e.cls || 'Operating', recurring: true, batch: e.batch || '', status: appr ? 'Approved' : 'Pending', paid: 0, by: (ME() || {}).name || '' });
      n++;
    });
    log('Recurring drafts approved', FTA.mName(nm), n + ' entries');
    if (typeof movements === 'function') MOVES = movements();
    render();
    toast(n ? n + ' recurring expenses added for ' + FTA.mName(nm) + (appr ? '' : ' (waiting for approval)') : 'Nothing new to add — next month already has these');
  };

  /* ------------------------------------------------------------ empty start: forms that need other records first */
  const need = (what, ok) => { if (ok) return false; toast(what); return true; };
  const wrap = (host, k, f) => { const o = host[k]; if (typeof o !== 'function') return; host[k] = function () { return f.call(this, o, [...arguments]); }; };
  const W = window;
  wrap(W, 'payForm', function (o, a) { if (need('Add a student first', STUDENTS.length)) return; if (!a[0] || !stuOf(a[0])) a[0] = (STUDENTS.find(s => studentDue(s.id) > 0) || STUDENTS[0]).id; return o.apply(this, a); });
  wrap(W, 'followForm', function (o, a) { if (need('Add a student first', STUDENTS.length)) return; if (!a[0] || !stuOf(a[0])) a[0] = STUDENTS[0].id; return o.apply(this, a); });
  wrap(W, 'docOpen', function (o, a) { const d = a[0] || {}; if (['rcpt', 'stmt'].includes(d.kind) && !d.stu && !d.pay && STUDENTS.length) d.stu = STUDENTS[0].id; if (['rcpt', 'inv', 'stmt'].includes(d.kind) && !d.stu && !d.pay && !d.inv && !STUDENTS.length) { toast('Add a student first'); return Promise.resolve(); } if (d.kind === 'sal' && !MENTORS.length) { toast('Add a teacher first'); return Promise.resolve(); } return o.apply(this, a); });
  if (window.V8) {
    wrap(V8, 'enrForm', function (o, a) { if (!a[0] && need('Add a programme, a teacher and a student first', STUDENTS.length && PROGS.length && MENTORS.length)) return; return o.apply(this, a); });
    wrap(V8, 'batchForm', function (o, a) { if (!a[0] && need('Add a programme and a teacher first', PROGS.length && MENTORS.length)) return; return o.apply(this, a); });
  }
  /* a student added from any skin also gets the next months' draft invoices (as an enrolment does) */
  wrap(W, 'saveStudent', function (o, a) { const before = new Set(STUDENTS.map(x => x.id)); const r = o.apply(this, a); const add = STUDENTS.filter(x => !before.has(x.id)).map(x => x.id); if (add.length && window.V8 && V8.sync) { try { V8.sync(add); } catch (e) { console.warn('[FTA] sync', e); } } return r; });
  /* teacher pay rule: teachers made in the app start as "fixed · ৳0"; the Owner / Admin sets the rule on the teacher form */
  if (SCH.menForm && SCH.menSave) {
    const canRule = () => ['Owner', 'Admin'].includes(ST.role) && !SCH.preview;
    wrap(SCH, 'menForm', function (o, a) {
      const r = o.apply(this, a); if (!canRule()) return r;
      const m = a[0] ? MENTORS.find(x => x.id === a[0]) : null, st = document.getElementById('mf-st'), box = st && st.closest('.fld');
      if (!box || document.getElementById('mf-model')) return r;
      box.insertAdjacentHTML('afterend', fld('Pay rule', `<select id="mf-model">${opts(Object.keys(MODELS).filter(k => k !== 'hybrid').map(k => [k, MODELS[k]]), m ? m.model : 'fixed')}</select>`) + fld('Rate (৳, or % for a share rule)', `<input id="mf-rate" type="number" min="0" step="1" value="${m ? +m.rate || 0 : 0}">`));
      return r;
    });
    wrap(SCH, 'menSave', function (o, a) {
      const md = document.getElementById('mf-model'), rt = document.getElementById('mf-rate'), name = (SCH.val('mf-n') || '').toLowerCase();
      const v = md && rt ? { model: md.value, rate: Math.max(0, +rt.value || 0) } : null, before = MENTORS.length;
      const r = o.apply(this, a);
      const m = a[0] ? MENTORS.find(x => x.id === a[0]) : (MENTORS.length > before ? MENTORS.find(x => x.name.toLowerCase() === name) : null);
      if (v && m && canRule() && (m.model !== v.model || +m.rate !== v.rate)) {
        const old = MODELS[m.model] + ' ' + m.rate; m.model = v.model; m.rate = v.rate; m.eff = TODAY;
        if (m.notes === 'Pay rule to be set by the Owner') m.notes = '';
        log('Teacher pay rule changed', m.name, old + ' → ' + MODELS[m.model] + ' ' + m.rate); F.ensurePayroll(); render();
      }
      return r;
    });
    F.i18nAdd('bn', { 'Pay rule': 'পারিশ্রমিকের নিয়ম', 'Rate (৳, or % for a share rule)': 'হার (৳, অথবা ভাগের নিয়মে %)' });
  }
  /* stand-in exam: reading marks for it never creates a record */
  if (SCH.mk) { const _mk = SCH.mk; SCH.mk = (ex, gid) => ex === '__none' || !ex || !gid ? { status: 'Not started', by: '', at: '', note: '', m: {} } : _mk(ex, gid); }
  /* teacher pages when the teacher has no class yet */
  const noClass = () => { $('#view').innerHTML = `<div class="page">${SCH.empty('No class is linked to you yet. The office adds students to your subjects; then they appear here.')}</div>`; };
  ['tp-att', 'tp-marks', 'tp-hw'].forEach(k => { const f = PAGES[k]; if (!f) return; PAGES[k] = function () { if (ST.role === 'Mentor') { const G = SCH.myGroups(); if (!G.length) return noClass(); if (!G.some(g => g.id === SCH.TS.gid)) SCH.TS.gid = G[0].id; } return f.apply(this, arguments); }; });
  if (SCH.attPage) wrap(SCH, 'attPage', function (o, a) { if (!SCH.grp(SCH.TS.gid)) { const G = ST.role === 'Mentor' ? SCH.myGroups() : SCH.GROUPS.filter(g => g.status === 'Active'); if (!G.length) return noClass(); SCH.TS.gid = G[0].id; } return o.apply(this, a); });
  F.i18nAdd('bn', { 'No class is linked to you yet. The office adds students to your subjects; then they appear here.': 'এখনো আপনার সাথে কোনো class যুক্ত হয়নি। Office আপনার subject এ student যোগ করলে এখানে দেখা যাবে।', 'No exam yet': 'এখনো কোনো exam নেই' });
  /* "see as" a teacher / student uses a real teacher or student; users made only for a preview are removed afterwards */
  const markNew = (f) => function () { const before = new Set(USERS); const r = f.apply(this, arguments); USERS.forEach(u => { if (!before.has(u)) u._preview = true; }); return r; };
  if (SCH.previewAs) {
    const _pa = SCH.previewAs;
    SCH.previewAs = markNew(function (r) {
      if (r === 'Mentor') { if (!MENTORS.length) return toast('Add a teacher first'); return SCH.previewTeacher((MENTORS.find(m => m.status === 'Active') || MENTORS[0]).id); }
      if (r === 'Student') { if (!STUDENTS.length) return toast('Add a student first'); return SCH.openStudent((STUDENTS.find(s => s.status === 'Active') || STUDENTS[0]).id); }
      return _pa.apply(this, arguments);
    });
  }
  ['previewTeacher', 'openStudent'].forEach(k => { if (SCH[k]) SCH[k] = markNew(SCH[k]); });
  if (SCH.endPreview) wrap(SCH, 'endPreview', function (o, a) { if (!SCH.preview) return; const r = o.apply(this, a); for (let i = USERS.length - 1; i >= 0; i--) if (USERS[i]._preview && USERS[i] !== ME()) USERS.splice(i, 1); return r; });
  /* exams page with no exam yet */
  const _exams = PAGES['ac-exams'];
  if (_exams) PAGES['ac-exams'] = function () {
    if (SCH.EXAMS.length) return _exams.apply(this, arguments);
    $('#view').innerHTML = `<div class="page">${head('', 'Exams, marks entry and results')}${SCH.empty('No exams yet. Create the first exam to start entering marks.', SCH.can('exam', 'a') ? `<button class="btn p" type="button" onclick="SCH.exForm()">${ic('plus')}New exam</button>` : '')}</div>`;
  };
  F.i18nAdd('bn', { 'Add a student first': 'আগে একজন student যোগ করুন', 'Add a teacher first': 'আগে একজন teacher যোগ করুন', 'Add a programme, a teacher and a student first': 'আগে একটি programme, একজন teacher ও একজন student যোগ করুন', 'Add a programme and a teacher first': 'আগে একটি programme ও একজন teacher যোগ করুন', 'No exams yet. Create the first exam to start entering marks.': 'এখনো কোনো exam নেই। marks দিতে প্রথম exam তৈরি করুন।', 'Exams, marks entry and results': 'Exam, marks entry ও result', 'New exam': 'নতুন exam' });
  F.i18nAdd('en', { '{1} draft': '{1} draft' });
  F.i18nAdd('bn', { '{1} draft': '{1} এর খসড়া' });

  /* last line of defence: a page or a slide that still trips on missing records shows an empty state, never a broken screen */
  F.errors = [];
  const guardPage = k => { const f = PAGES[k]; if (typeof f !== 'function' || f.__ftaSafe) return; const g = PAGES[k] = function () { try { return f.apply(this, arguments); } catch (e) { F.errors.push(k + ': ' + e.message + ' @' + String(e.stack || '').split('\n')[1]); console.warn('[FTA] page', k, e); const v = document.getElementById('view'); if (v) v.innerHTML = `<div class="page">${SCH.empty ? SCH.empty('Nothing here yet.') : '<p class="sub">Nothing here yet.</p>'}</div>`; } }; g.__ftaSafe = 1; };
  Object.keys(PAGES).forEach(guardPage);
  const _slides = slidesFor;
  slidesFor = function (p) { try { return _slides.apply(this, arguments); } catch (e) { F.errors.push('slides ' + p + ': ' + e.message + ' @' + String(e.stack || '').split('\n')[1]); console.warn('[FTA] slides', p, e); return []; } };
  F.i18nAdd('bn', { 'Nothing here yet.': 'এখানে এখনো কিছু নেই।' });

  /* every render first brings the months / payroll up to date */
  const _render = render;
  render = function () { F.syncMonths(); return _render.apply(this, arguments); };

  /* a new day while the app is open */
  F.onNewDay = F.onNewDay || (() => location.reload());
  const sheetOpen = () => { const o = document.getElementById('ov'); return o && !o.hidden; };
  const dayCheck = force => { if (F.today() === TODAY) return; if (force || document.hidden || !sheetOpen()) F.onNewDay(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dayCheck(true); });
  setInterval(() => dayCheck(false), 60000);

  /* ------------------------------------------------------------ empty start */
  F.resetData = opts => {
    opts = opts || {};
    const keepAuto = c => c && c.kind === 'auto';
    Object.values(C).forEach(c => {
      const box = c.get(); if (!box) return;
      if (['ORG', 'SCH.PERM', 'SCH.TOPICS', 'V8.STATUSES', 'V9L.ST', 'METHOD', 'ACCOUNTS', 'USERS', 'SCH.STAFF', 'V8.CIRCLES', 'SCH.ROUT'].includes(c.name) || c.kind === 'values' || c.kind === 'setting') return;
      if (Array.isArray(box)) box.splice(0, box.length);
      else Object.keys(box).forEach(k => delete box[k]);
    });
    /* automatic circles (Teachers / Students / Guardians) stay; their members are worked out live */
    if (window.V8 && V8.CIRCLES) { const a = V8.CIRCLES.filter(keepAuto); V8.CIRCLES.splice(0, V8.CIRCLES.length, ...a); }
    if (SCH.ROUT) Object.keys(SCH.ROUT).forEach(k => { SCH.ROUT[k] = []; });
    /* the four standard money accounts stay (opening balance 0, names neutral): older screens refer to them by id */
    ACCOUNTS.splice(0, ACCOUNTS.length, { id: 'ACC-CASH', name: 'Cash in Hand', type: 'Cash', open: 0 }, { id: 'ACC-BANK', name: 'Bank account', type: 'Bank', open: 0 },
      { id: 'ACC-BKASH', name: 'bKash', type: 'Mobile banking', open: 0 }, { id: 'ACC-NAGAD', name: 'Nagad', type: 'Mobile banking', open: 0 });
    Object.keys(METHOD).forEach(k => delete METHOD[k]); Object.assign(METHOD, { 'ACC-CASH': 'Cash', 'ACC-BANK': 'Bank transfer', 'ACC-BKASH': 'bKash', 'ACC-NAGAD': 'Nagad' });
    const u = Object.assign({ id: 'U1', name: (opts.user && opts.user.name) || 'Owner', email: ORG.email || '', role: 'Owner' }, opts.user || {});
    USERS.splice(0, USERS.length, u);
    if (SCH.STAFF) SCH.STAFF.splice(0, SCH.STAFF.length, { uid: u.id, status: 'Active', last: '', twoStep: false });
    if (opts.org) Object.assign(ORG, opts.org);
    paySeq = 0; invSeq = 0; expSeq = 0; if (window.V8) V8.ntSeq = 0;
    if (SCH.TS) { SCH.TS.draft = {}; SCH.TS.ax = null; }
    MONTHS.splice(0, MONTHS.length, CUR); START = CUR + '-01';
    ST.role = u.role; ST.page = 'dashboard';
    F.syncMonths();
    if (typeof movements === 'function') MOVES = movements();
    return C;
  };
  /* the backend layer calls this after records arrive or change */
  if (!F.afterHydrate) F.afterHydrate = () => F.syncMonths();
  F.resetData();
  try { if (document.getElementById('view') && ME()) _render(); } catch (e) { console.warn('[FTA] first render after reset', e); }
})();
