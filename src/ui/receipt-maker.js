/* =====================================================================
   FTA · Receipt Maker v2 (live app)
   Built on the owner's own "FTA Receipt & Salary Generator" (Apps Script),
   kept familiar and made stronger:
   - The receipt IS the form: type straight onto the paper. Every label,
     heading and policy line can be retyped (Reset texts brings them back).
   - Two documents: Payment receipt (student, guardian, mentor or anyone)
     and Salary slip (fixed package or per-student shares, certification,
     Accounts Head signature).
   - 16 currencies with the right words (Taka/Paisa, lakh/crore for BDT,
     INR, PKR; 3-decimal Dinar/Rial), single or multiple subjects,
     months × rate, package split, discounts and charges (fixed or %),
     part payment and advance, billing month range, Bangladesh time stamp.
   - Connected to the app: pick a student/mentor and fill from their real
     enrolments, fees, assigned students and dues.
   - Issued receipts are numbered (FTA-2026-0001 / FTA-SAL-2026-0001, same
     as the old generator; the next number can be set to continue it), kept
     for reprint, duplicate, and VOID with a reason (never deleted: audit).
   - Permission checked inside every action: "rcm" receipts, "rcs" salary
     slips (Access → Roles). Mentors and students never see it. The server
     checks again (fta-policy.js writeReceipt): who may issue, never edited
     after issue, VOID stamped by the server, never deleted, and a number
     already taken by someone else is refused (so no two receipts share one).
   - Saved for everyone: issued receipts 'rcpt', salary slips 'rcsal' (id =
     the printed number) and the shared settings 'rcset' / 'main' (numbering
     floor, look, texts, signature, templates).
   - It produces documents only: it never changes Accounts or invoices.
   The paper lives in a Shadow DOM so the app's themes cannot change it,
   and print / PDF / PNG use the very same markup and styles.
   ===================================================================== */
(function () {
  'use strict';
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const $id = id => document.getElementById(id);
  const FTA = window.FTA = window.FTA || {};
  ['RCPT', 'RCSAL', 'RCSET'].forEach(k => { if (!Array.isArray(FTA[k])) FTA[k] = []; });
  const PAGE = 'rc-maker', M_RC = 'rcm', M_SL = 'rcs';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = n => G(() => ic(n)) || '';
  const say = t => G(() => toast(t));
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const meNow = () => G(() => ME()) || { name: 'Office', role: 'Owner' };
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const prettyDate = iso => { if (!iso) return ''; const p = iso.split('-'); return +p[2] + ' ' + MON[+p[1] - 1].slice(0, 3) + ' ' + p[0]; };
  const ym = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const ymLabel = v => { if (!v) return ''; const p = v.split('-'); return MON[+p[1] - 1] + ' ' + p[0]; };
  const monthsBetween = (a, b) => { if (!a || !b) return 1; const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1); };
  /* "4.05 PM, 9th November, 2026" in Bangladesh time, as in the old generator */
  function bdNow() {
    const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    const d = +p.day, suf = d % 100 >= 11 && d % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][d % 10] || 'th');
    return p.hour + '.' + p.minute + ' ' + p.dayPeriod + ', ' + d + suf + ' ' + p.month + ', ' + p.year;
  }

  /* ---------------------------------------------------------------- permissions */
  const GRANT_RC = { Owner: 'vaed', Admin: 'vaed', 'Junior Admin': 'vae', 'Finance Manager': 'vaed', 'Collection Staff': 'va', Viewer: 'v' };
  const can = (mod, a) => G(() => SCH.can(mod, a)) === true;
  const modOf = doc => doc === 'salary' ? M_SL : M_RC;
  function guard(doc, a, what) { if (can(modOf(doc), a)) return true; say('You do not have permission to ' + what + '.'); return false; }

  /* ---------------------------------------------------------------- currencies (code, country, words name, minor-unit name, decimals) */
  const CUR = [['BDT', 'Bangladesh', 'Taka', 'Paisa', 2], ['USD', 'United States', 'US Dollars', 'Cents', 2], ['GBP', 'United Kingdom', 'Pounds', 'Pence', 2], ['EUR', 'Europe', 'Euros', 'Cents', 2], ['CAD', 'Canada', 'Canadian Dollars', 'Cents', 2], ['AUD', 'Australia', 'Australian Dollars', 'Cents', 2], ['SAR', 'Saudi Arabia', 'Riyals', 'Halalas', 2], ['AED', 'United Arab Emirates', 'Dirhams', 'Fils', 2], ['QAR', 'Qatar', 'Riyals', 'Dirhams', 2], ['KWD', 'Kuwait', 'Dinars', 'Fils', 3], ['OMR', 'Oman', 'Rials', 'Baisa', 3], ['BHD', 'Bahrain', 'Dinars', 'Fils', 3], ['MYR', 'Malaysia', 'Ringgit', 'Sen', 2], ['SGD', 'Singapore', 'Singapore Dollars', 'Cents', 2], ['INR', 'India', 'Rupees', 'Paise', 2], ['PKR', 'Pakistan', 'Rupees', 'Paisa', 2]];
  const LAKH = { BDT: 1, INR: 1, PKR: 1 };
  const curOf = c => CUR.find(x => x[0] === c) || CUR[0];
  const dec = c => curOf(c)[4], unit = c => Math.pow(10, dec(c));
  /* money is kept in minor units (integers), so totals never drift */
  const toMinor = (v, c) => { const n = Number(String(v == null ? '' : v).replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * unit(c)) : 0; };
  const plain = (m, c) => { const u = unit(c), neg = m < 0; m = Math.abs(Math.round(m)); const w = Math.floor(m / u), f = m % u; return (neg ? '−' : '') + w.toLocaleString(LAKH[c] ? 'en-IN' : 'en-US') + (f ? '.' + String(f).padStart(dec(c), '0').replace(/0+$/, '') : ''); };
  const money = (m, c) => plain(m, c) + ' ' + c;
  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  const three = n => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');
  function lakhWords(n) { if (!n) return 'Zero'; const o = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3; if (cr) o.push(lakhWords(cr) + ' Crore'); if (lk) o.push(two(lk) + ' Lakh'); if (th) o.push(two(th) + ' Thousand'); if (n) o.push(three(n)); return o.join(' '); }
  function intlWords(n) { if (!n) return 'Zero'; const U = ['', ' Thousand', ' Million', ' Billion', ' Trillion'], o = []; let u = 0; while (n > 0) { if (n % 1000) o.unshift(three(n % 1000) + U[u]); n = Math.floor(n / 1000); u++; } return o.join(' '); }
  function words(m, c) {
    m = Math.max(0, Math.round(m)); const u = unit(c), w = Math.floor(m / u), f = m % u, C = curOf(c);
    const main = (LAKH[c] ? lakhWords(w) : intlWords(w)) + ' ' + C[2];
    const frac = f ? (dec(c) === 2 ? ' and ' + two(f) + ' ' + C[3] : ' and ' + f + '/' + u) : '';
    return main + frac + ' Only';
  }

  /* ---------------------------------------------------------------- storage (demo: this browser · live: Supabase "receipts" table with RLS) */
  const LOOK0 = () => ({ theme: 'onyx', paper: 'A4', showLogo: true, showTerms: true, showSig: true, prefix: { receipt: 'FTA', salary: 'FTA-SAL' } });
  let DB = { seq: {}, list: [], tpls: [], look: null, texts: { receipt: {}, salary: {} }, sig: '' };
  const SETREC = () => FTA.RCSET.find(x => x && x.id === 'main') || null;
  const listOf = doc => doc === 'salary' ? FTA.RCSAL : FTA.RCPT;
  const canSet = () => can(M_RC, 'e') || can(M_SL, 'e');
  /* everything shown comes from the synced records; edits to the settings go back into the one 'main' record */
  function load() {
    const v = SETREC() || {};
    DB.seq = Object.assign({}, v.seq || {}); DB.tpls = Array.isArray(v.tpls) ? v.tpls.slice() : []; DB.sig = v.sig || '';
    DB.look = Object.assign(LOOK0(), JSON.parse(JSON.stringify(v.look || {}))); DB.look.prefix = Object.assign(LOOK0().prefix, DB.look.prefix || {});
    DB.texts = Object.assign({ receipt: {}, salary: {} }, JSON.parse(JSON.stringify(v.texts || {})));
    DB.list = FTA.RCPT.concat(FTA.RCSAL).filter(r => r && r.no && r.d).sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  }
  function save() {
    if (!canSet()) { say('Only the office can change the Receipt Maker settings.'); return false; }
    let v = SETREC(); if (!v) { v = { id: 'main' }; FTA.RCSET.push(v); }
    v.seq = JSON.parse(JSON.stringify(DB.seq)); v.tpls = JSON.parse(JSON.stringify(DB.tpls)); v.look = JSON.parse(JSON.stringify(DB.look)); v.texts = JSON.parse(JSON.stringify(DB.texts)); v.sig = DB.sig || '';
    if (JSON.stringify(v).length > 1200000) { say('The signature or templates are too large. Use a smaller signature image.'); return false; }
    G(() => FTA.sync && FTA.sync()); return true;
  }
  load();

  /* ---------------------------------------------------------------- drafts */
  const METHODS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Card', 'Cheque'];
  const KINDS = [['student', 'Student'], ['guardian', 'Guardian'], ['mentor', 'Mentor'], ['other', 'Anyone else']];
  const newReceipt = () => ({ doc: 'receipt', cur: 'BDT', mode: 'single', kind: 'student', pid: '', date: todayISO(), pFrom: ym(new Date()), pTo: '', name: '', grade: '', idno: '', guardian: '', phone: '', method: 'Cash', txn: '', receivedBy: meNow().name, single: { desc: '', amt: '' }, items: [{ desc: '', qty: '1', rate: '' }], adj: [], paid: '', note: 'Payment received with thanks. Please keep this receipt for your records.' });
  const newSalary = () => ({ doc: 'salary', cur: 'BDT', mode: 'fixed', kind: 'mentor', pid: '', date: todayISO(), pFrom: ym(new Date()), pTo: '', name: '', idno: '', designation: '', subjects: '', phone: '', method: 'bKash', txn: '', account: '', pkg: { name: '', desc: '', amt: '' }, students: [{ name: '', grade: '', subject: '', share: '' }], adj: [], paid: '', note: 'Salary paid with thanks for your dedication to our students.', sigOn: true });
  const RM = { tab: 'new', doc: 'receipt', d: { receipt: newReceipt(), salary: newSalary() }, view: null, err: {}, busy: false, q: '', show: 'all', msg: '', msgErr: false, pack: '' };
  const D = () => RM.d[RM.doc];

  /* ---------------------------------------------------------------- calculation */
  function calc(d) {
    const c = d.cur, num = v => Number(String(v == null ? '' : v).replace(/,/g, '')) || 0;
    let lines;
    if (d.doc === 'salary') {
      lines = d.mode === 'fixed' ? [{ desc: d.pkg.name || 'Monthly Fixed Salary Package', detail: d.pkg.desc, amount: Math.max(0, toMinor(d.pkg.amt, c)) }]
        : d.students.filter(s => s.name || num(s.share)).map(s => ({ name: s.name || 'Student', grade: s.grade, subject: s.subject, amount: Math.max(0, toMinor(s.share, c)) }));
    } else {
      lines = d.mode === 'single' ? [{ desc: d.single.desc || 'Tuition fee', amount: Math.max(0, toMinor(d.single.amt, c)) }]
        : d.items.filter(i => i.desc || num(i.qty) || num(i.rate)).map(i => ({ desc: i.desc || 'Tuition fee', qty: Math.max(0, num(i.qty)), rate: Math.max(0, toMinor(i.rate, c)), amount: Math.round(Math.max(0, num(i.qty)) * Math.max(0, toMinor(i.rate, c))) }));
    }
    const sub = lines.reduce((a, l) => a + l.amount, 0);
    const minus = d.doc === 'salary' ? 'deduct' : 'discount';
    const adj = d.adj.map(a => { const v = Math.max(0, num(a.value)); const amt = a.kind === 'percent' ? Math.round(sub * Math.min(v, 100) / 100) : toMinor(v, c); const lab = (a.label || (a.type === minus ? (d.doc === 'salary' ? 'Deduction' : 'Discount') : (d.doc === 'salary' ? 'Bonus / allowance' : 'Additional charge'))) + (a.kind === 'percent' && v ? ' (' + v + '%)' : ''); return { label: lab, signed: a.type === minus ? -amt : amt, m: a.type === minus, on: v > 0 }; });
    const rawTotal = sub + adj.filter(a => a.on).reduce((s, a) => s + a.signed, 0);
    const total = Math.max(0, rawTotal);
    const paid = d.paid === '' || d.paid == null ? total : Math.max(0, toMinor(d.paid, c));
    return { lines, sub, adj, total, paid, due: total - paid, negative: rawTotal < 0 };
  }

  /* ---------------------------------------------------------------- numbering: PREFIX-YEAR-0001, never reused */
  const seqKey = (doc, y) => (DB.look.prefix[doc] || (doc === 'salary' ? 'FTA-SAL' : 'FTA')) + '|' + y;
  const fmtNo = (doc, y, n) => (DB.look.prefix[doc] || (doc === 'salary' ? 'FTA-SAL' : 'FTA')) + '-' + y + '-' + String(n).padStart(4, '0');
  function usedMax(doc, y) { const pre = fmtNo(doc, y, 0).replace(/0+$/, ''); let mx = 0; DB.list.forEach(r => { if (r.no && r.no.indexOf(pre) === 0) { const n = parseInt(r.no.slice(pre.length), 10); if (n > mx) mx = n; } }); return mx; }
  function peekNo(doc, date) { const y = (date || todayISO()).slice(0, 4); let n = Math.max(DB.seq[seqKey(doc, y)] || 0, usedMax(doc, y)) + 1; while (DB.list.some(r => r.no === fmtNo(doc, y, n))) n++; return fmtNo(doc, y, n); }
  const takeNo = (doc, date) => peekNo(doc, date);
  function code(r) { const s = r.no + '|' + r.calc.total + '|' + r.d.date + '|' + r.d.name; let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).toUpperCase().slice(0, 6).padStart(6, '0'); }

  /* ---------------------------------------------------------------- editable texts (owner's idea): defaults per document */
  const TX = {
    receipt: { title: 'PAYMENT RECEIPT', l_no: 'Receipt No', l_date: 'Date', h_info: 'Student Information', h_pay: 'Payment Details', l_grade: 'Grade / Class', l_guardian: 'Guardian', l_phone: 'Phone', l_id: 'ID', l_period: 'Billing month', l_time: 'Billing time', l_method: 'Method', l_txn: 'Transaction ID', l_by: 'Received by', th_sl: 'SL', th_desc: 'Course Description / Subjects', th_months: 'Months', th_rate: 'Rate', th_amt: 'Amount', l_sub: 'Subtotal', l_total: 'Total payable', l_paid: 'AMOUNT PAID', l_due: 'BALANCE DUE', l_adv: 'ADVANCE', l_words: 'In words:', h_notes: 'Notes', h_terms: 'Terms & Conditions', t1: 'Fees are due in advance by the 7th of each month.', t2: 'Sessions may pause if fees are unpaid after the 7th.', t3: 'Paid fees are non-refundable and non-transferable.', t4: 'Sessions cancelled with notice are rescheduled within the month.', t5: 'Please join on time; sessions end as scheduled.', t6: 'Keep this receipt as proof of payment.', thanks: 'Thank you for learning with us', sig_title: 'Authorised Signature', sig_org: 'Final Touch Academy' },
    salary: { title: 'SALARY RECEIPT', l_no: 'Slip No', l_date: 'Date', h_info: 'Teacher Information', h_pay: 'Payment Details', l_id: 'Teacher ID', l_desig: 'Designation', l_subj: 'Subject(s)', l_phone: 'Phone', l_period: 'Salary month', l_time: 'Payment time', l_method: 'Method', l_txn: 'Transaction ID', l_acct: 'Account / Wallet', h_pkg: 'Fixed Salary Package', l_pkgamt: 'Monthly Package Amount', th_sl: 'SL', th_stu: 'Student', th_grade: 'Grade', th_subj: 'Subject', th_share: 'Amount', l_gross: 'Gross salary', l_total: 'Net payable', l_paid: 'AMOUNT PAID', l_due: 'BALANCE DUE', l_adv: 'ADVANCE', l_words: 'In words:', h_cert: 'Certification', h_notes: 'Notes', h_terms: 'Remarks', t1: 'This is a computer-generated salary document of Final Touch Academy.', t2: 'Salary details are confidential between the academy and the teacher.', t3: 'Please report any discrepancy within 7 days of receiving this slip.', t4: '', t5: '', t6: '', thanks: '', sig_title: 'Accounts Head', sig_org: 'Final Touch Academy' }
  };
  const tx = (doc, k, texts) => { const T = texts || DB.texts[doc] || {}; return T[k] != null ? T[k] : (TX[doc][k] != null ? TX[doc][k] : ''); };

  /* ---------------------------------------------------------------- looks */
  const THEMES = {
    onyx: ['Onyx & Gold', '#1F1D1C', '#2B2724', '#B8892E', '#ECC978', '#8A6420', '#FAF5E9', '#EADFC4'],
    ivory: ['Ivory & Gold', '#FFFDF8', '#FFF9EB', '#B8892E', '#D9A94A', '#8A6420', '#FBF5E4', '#E9D8A6'],
    navy: ['Royal Navy', '#0F1F3D', '#1C3463', '#B8892E', '#F1D79B', '#1C3463', '#EEF2F9', '#D6DEEC'],
    emerald: ['Emerald', '#0E3B2E', '#175A45', '#B8892E', '#F1D79B', '#0F5E3B', '#EDF5F1', '#CFE3D9'],
    mono: ['Print (black & white)', '#FFFFFF', '#FFFFFF', '#111111', '#111111', '#111111', '#F3F3F3', '#DDDDDD']
  };

  /* ---------------------------------------------------------------- the paper (one markup for screen, print and PNG) */
  const PAPER_CSS = `
:host{all:initial;display:block}
*{box-sizing:border-box}
.paper{--band:#1F1D1C;--band2:#2B2724;--gold:#B8892E;--gold-hi:#ECC978;--gold-deep:#8A6420;--soft:#FAF5E9;--soft-line:#EADFC4;--ink:#1C1712;--muted:#6F675B;--line:#E9E4D9;--ok:#1F6B45;--ok-soft:#E8F3EC;--warn:#A8442A;--warn-soft:#FBEEEA;
  position:relative;width:100%;max-width:828px;margin:0 auto;background:#FFFEFB;color:var(--ink);font:400 13px/1.45 Inter,"Segoe UI",system-ui,Arial,sans-serif;border:1px solid var(--line);border-radius:8px;overflow:hidden;box-shadow:0 22px 48px -24px rgba(30,20,5,.45),0 2px 0 rgba(0,0,0,.04)}
.paper.navy{--band:#0F1F3D;--band2:#1C3463;--gold-hi:#F1D79B;--gold-deep:#1C3463;--soft:#EEF2F9;--soft-line:#D6DEEC}
.paper.emerald{--band:#0E3B2E;--band2:#175A45;--gold-hi:#F1D79B;--gold-deep:#0F5E3B;--soft:#EDF5F1;--soft-line:#CFE3D9}
.paper.mono{--band:#111111;--band2:#111111;--gold:#111111;--gold-hi:#111111;--gold-deep:#111111;--soft:#F3F3F3;--soft-line:#DDDDDD}
.serif{font-family:Cinzel,"Times New Roman",Georgia,serif}
/* letterhead */
.top{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:center;padding:24px 34px 22px;background:radial-gradient(60% 120% at 50% 40%,var(--band2),var(--band) 70%);color:#D8D0C0;border-bottom:7px solid var(--gold)}
.paper.mono .top{background:#fff;color:#333;border-bottom:3px solid #111}
.co .cname{font-family:Cinzel,Georgia,serif;font-size:19px;font-weight:700;color:var(--gold-hi);letter-spacing:.03em;line-height:1.2}
.co .ctag{font-family:Cinzel,Georgia,serif;font-size:10px;font-weight:600;color:var(--gold);letter-spacing:.18em;margin:3px 0 9px;text-transform:uppercase}
.co .addr{border-left:3px solid var(--gold);padding-left:10px;font-size:11.5px;line-height:1.6;white-space:pre-line}
.logo img{display:block;height:150px;max-width:220px;object-fit:contain}
.logo.mask img{-webkit-mask-image:radial-gradient(ellipse 72% 72% at 50% 50%,#000 62%,transparent 100%);mask-image:radial-gradient(ellipse 72% 72% at 50% 50%,#000 62%,transparent 100%)}
.meta{text-align:right;font-size:12px}
.meta .rt{font-size:17px;font-weight:700;letter-spacing:.12em;color:var(--gold-hi);margin-bottom:8px}
.meta .kv{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:2px 0}
.meta .kv small{color:#B9B0A0;font-size:11.5px}
.paper.mono .meta .kv small{color:#555}
.meta .kv b{color:#fff;font-weight:700;white-space:nowrap}
.paper.mono .meta .kv b{color:#111}
.meta .kv i{font-style:normal;font-size:10.5px;color:#A39A8A}
.meta .web{margin-top:10px;font-size:11px;line-height:1.55;color:#D8D0C0}
.paper.mono .meta .web{color:#444}
.body{padding:24px 34px 22px}
/* information cards */
.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{border-radius:10px;overflow:hidden;border:1.5px solid var(--gold);background:linear-gradient(160deg,#F6E9C9 0%,#FBF3DF 45%,#F3E3BD 100%);box-shadow:0 10px 24px -14px rgba(138,100,32,.45);padding:0 18px 14px}
.paper.navy .card{background:linear-gradient(160deg,#E8EEF8,#F5F8FD 45%,#E2E9F5)}
.paper.emerald .card{background:linear-gradient(160deg,#E3F0EA,#F3F9F6 45%,#DCEBE3)}
.paper.mono .card{background:#fff;border-color:#111;box-shadow:none}
.card h3{margin:0 -18px 12px;padding:10px 18px;font-family:Cinzel,Georgia,serif;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--gold-hi);background:linear-gradient(90deg,var(--band) 0%,var(--band2) 50%,var(--band) 100%);border-bottom:3px solid var(--gold)}
.paper.mono .card h3{background:#111;color:#fff;border-bottom:0}
.big{font-size:17px;font-weight:700;color:var(--gold-deep);margin-bottom:6px;min-height:24px}
.f{display:grid;grid-template-columns:118px 10px minmax(0,1fr);align-items:center;font-size:12.5px;margin-top:5px;min-height:22px}
.f > .lb{font-weight:600;color:#6B6253}
.f > .cl{color:#6B6253}
.f > .v{min-width:0;font-weight:500;word-break:break-word}
.soon{color:var(--muted);font-style:italic}
/* items */
table{width:100%;border-collapse:collapse;margin-top:20px}
thead th{background:var(--band);color:#fff;font-size:11.5px;font-weight:600;text-align:left;padding:10px 12px;letter-spacing:.02em}
.paper.mono thead th{background:#111}
thead th:first-child{border-radius:7px 0 0 0}thead th:last-child{border-radius:0 7px 0 0}
th.r,td.r{text-align:right}
tbody td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
td.sl{width:38px;color:var(--muted)}
td.amt{width:150px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
td.qty{width:80px}td.rate{width:120px}
.pkg{display:grid;grid-template-columns:minmax(0,1fr) 230px;margin-top:20px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,var(--band2),var(--band));color:#EDE4D0;box-shadow:0 12px 26px -16px rgba(0,0,0,.6)}
.paper.mono .pkg{background:#fff;color:#111;border:1.5px solid #111;box-shadow:none}
.pkg .l{padding:18px 20px}.pkg .r{padding:18px 20px;border-left:1px solid rgba(255,255,255,.12);text-align:center;display:grid;align-content:center;gap:8px}
.pkg .tag{display:inline-block;background:var(--gold);color:#1C1712;font-family:Cinzel,Georgia,serif;font-size:10.5px;font-weight:700;letter-spacing:.16em;padding:4px 12px;border-radius:999px;text-transform:uppercase}
.pkg .pn{font-family:Cinzel,Georgia,serif;font-size:18px;margin-top:10px;color:#fff}
.paper.mono .pkg .pn{color:#111}
.pkg .pd{font-size:12px;opacity:.85;margin-top:4px}
.pkg .r small{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-hi)}
.pkg .r b{font-size:24px;color:#fff}
.paper.mono .pkg .r b{color:#111}
/* totals */
.sum{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:18px;margin-top:14px;align-items:start}
.t{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 12px;font-size:13px}
.t b{font-variant-numeric:tabular-nums;white-space:nowrap}
.t.adj.minus b{color:var(--warn)}
.t.total{border-top:2px solid var(--ink);font-weight:700;margin-top:4px;padding-top:10px}
.t.paid{background:var(--band);color:#fff;font-weight:700;font-size:15px;border-radius:7px 7px 0 0;padding:11px 12px;margin-top:6px}
.paper.mono .t.paid{background:#111}
.t.paid.solo{border-radius:7px}
.t.paid .val{color:var(--gold-hi);display:flex;align-items:center;gap:6px}
.paper.mono .t.paid .val{color:#fff}
.t.due{background:var(--warn);color:#fff;font-weight:700;border-radius:0 0 7px 7px;padding:9px 12px}
.t.due.adv{background:var(--ok)}
.words{background:var(--soft);border:1px solid var(--soft-line);border-radius:8px;padding:9px 14px;font-size:12.5px;margin-top:12px}
.words b{color:var(--gold-deep)}
.cert{margin-top:12px;border:1px solid var(--soft-line);border-left:4px solid var(--gold);border-radius:8px;padding:12px 16px;background:#FFFDF8}
.cert h3,.notes h3,.pol h3{margin:0 0 5px;font-family:Cinzel,Georgia,serif;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep)}
.cert p{margin:0;font-size:13px;line-height:1.6}
.status{margin-top:8px;border-radius:8px;padding:9px 14px;font-weight:700;font-size:12.5px;letter-spacing:.03em;background:var(--ok-soft);color:var(--ok);border:1px solid #B9DCC7}
.status.partial{background:var(--warn-soft);color:var(--warn);border-color:#ECC7BC}
.status.draft{background:#F3F1EC;color:var(--muted);border-color:var(--line)}
.notes{margin-top:10px}
.notes .nt{font-size:12.5px;color:#55504A;white-space:pre-line}
.bottom{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-top:14px;padding-top:12px;border-top:1px dashed #D5CDBB;break-inside:avoid}
.pol{flex:1;min-width:0;border-left:3px solid var(--gold);padding-left:12px}
.pol ul{margin:0;padding-left:15px;font-size:10.5px;line-height:1.65;color:#5D564B}
.pol li::marker{color:var(--gold)}
.sign{flex:none;width:240px;text-align:center}
.sign .si{height:70px;display:flex;align-items:flex-end;justify-content:center}
.sign .si img{max-height:68px;max-width:220px;object-fit:contain}
.sign .ln{border-top:1.2px solid #333;margin:4px 0 6px}
.sign b{display:block;font-family:Cinzel,Georgia,serif;color:var(--gold-deep);font-size:13px}
.sign span{display:block;font-size:11px;color:var(--muted)}
.thanks{flex:none;text-align:right;max-width:42%}
.thanks b{font-family:Cinzel,Georgia,serif;color:var(--gold-deep);font-size:14px}
.thanks div{font-size:11px;color:var(--muted);margin-top:4px}
.foot{display:flex;justify-content:space-between;gap:12px;padding:10px 34px;border-top:3px solid var(--gold);font-size:10.5px;color:#7A7266;background:#FCFAF4}
.wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;overflow:hidden}
.wm span{transform:rotate(-24deg);font:900 130px/1 Inter,Arial,sans-serif;letter-spacing:.06em;color:rgba(168,68,42,.10)}
.wm.draft span{color:rgba(120,110,95,.08)}
/* editing on screen */
.ed input,.ed select,.ed textarea{font:inherit;color:inherit;background:rgba(255,255,255,.55);border:1px dashed #CFC6B2;border-radius:5px;padding:3px 6px;width:100%;outline:none;min-width:0}
.ed .top input,.ed .top select{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.3);color:#fff;color-scheme:dark}
.ed.mono .top input{background:#fff;border-color:#bbb;color:#111;color-scheme:light}
.ed .pkg input{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.3);color:#fff}
.ed.mono .pkg input{background:#fff;color:#111;border-color:#bbb}
.ed input:hover,.ed select:hover,.ed textarea:hover{border-color:var(--gold)}
.ed input:focus,.ed select:focus,.ed textarea:focus{border:1px solid var(--gold);background:#fff;color:var(--ink);box-shadow:0 0 0 3px rgba(184,137,46,.18)}
.ed .t.paid input{width:120px;text-align:right;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.4);color:var(--gold-hi);font-weight:700}
.ed input[type=number]{text-align:right;-moz-appearance:textfield}
.ed input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
.ed .big input{font-size:17px;font-weight:700;color:var(--gold-deep)}
.ed textarea{resize:vertical;min-height:38px;line-height:1.5}
.ed tbody td input{background:#FBF1D8;border:1px solid #DCC58A;border-radius:6px;padding:6px 8px;font-weight:600;font-size:13px}
.ed .sum{grid-template-columns:minmax(0,1fr)}
.ed .sum > .totals{justify-self:end;width:min(370px,100%)}
.ed .period{flex-wrap:wrap}
.ed .period select{min-width:118px}
.ed.navy tbody td input{background:#EEF2F9;border-color:#C3CFE3}
.ed.emerald tbody td input{background:#EDF5F1;border-color:#BFD9CB}
.ed.mono tbody td input{background:#fff;border-color:#bbb}
.ed [data-t]{outline:none;border-radius:3px;cursor:text}
.ed [data-t]:hover{box-shadow:0 0 0 1px rgba(184,137,46,.55)}
.ed [data-t]:focus{background:rgba(236,201,120,.22);box-shadow:0 0 0 1px var(--gold)}
.ed .pol li[data-t]:empty::before{content:"(empty line: hidden on print)";color:#B9B1A1;font-style:italic}
.x{width:24px;height:24px;border-radius:50%;border:0;background:#E5533D;color:#fff;font-size:14px;line-height:1;cursor:pointer;flex:none}
.x:hover{background:#C33A26}.x:disabled{opacity:.3;cursor:not-allowed}
.adds{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding:10px 0 2px}
.chip{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--gold);background:#fff;color:var(--gold-deep);font:inherit;font-size:12px;font-weight:700;padding:7px 13px;border-radius:999px;cursor:pointer}
.chip:hover{background:var(--soft)}
.chip.dark{background:var(--band);border-color:var(--band);color:var(--gold-hi)}
.ar{display:grid;grid-template-columns:minmax(0,1fr) 84px 64px auto 24px;gap:6px;align-items:center;padding:4px 12px;font-size:13px}
.ar b{white-space:nowrap;text-align:right;min-width:90px}
.ar.minus b{color:var(--warn)}
.err{outline:2px solid #B42318!important;outline-offset:1px}
.rm{width:30px}
.period{display:flex;gap:4px;align-items:center}
.period select{flex:1}
.hide-print{}
@media (max-width:700px){.top{grid-template-columns:1fr;text-align:left;padding:20px 18px}.logo{order:-1}.logo img{height:96px}.meta{text-align:left}.meta .kv{justify-content:flex-start}.body{padding:18px 16px}.cards{grid-template-columns:1fr}.sum{grid-template-columns:1fr}.pkg{grid-template-columns:1fr}.pkg .r{border-left:0;border-top:1px solid rgba(255,255,255,.12)}.bottom{flex-direction:column;align-items:stretch}.sign,.thanks{width:auto;max-width:none;text-align:left}.foot{padding:10px 16px;flex-direction:column}.f{grid-template-columns:100px 10px minmax(0,1fr)}td.amt{width:auto}.ar{grid-template-columns:minmax(0,1fr) 70px 58px 24px}.ar b{grid-column:1/-1;text-align:right}.wm span{font-size:70px}}

/* hide ivory-only decorative elements on other themes */
.paper:not(.ivory) > .body > .wm,
.paper:not(.ivory) > .body > .ribbon{display:none}

/* =====================================================================
   IVORY & GOLD — premium white certificate style with gold filigree
   Sample inspiration: formal payment-receipt card, cream background,
   gold ornate corners, centered logo, gold ribbon receipt banner,
   gold-bordered cards, gold table header, gold amount-paid highlight,
   soft gold watermark. No dark bands anywhere.
   ===================================================================== */
.paper.ivory{
  --band:#FFFDF8;--band2:#FFF9EB;--gold:#B8892E;--gold-hi:#D9A94A;--gold-deep:#8A6420;
  --soft:#FBF5E4;--soft-line:#E9D8A6;--ink:#2B2008;
  background:#FFFDF8;
  border:2px solid var(--gold);
  box-shadow:0 22px 48px -24px rgba(138,100,32,.35),inset 0 0 0 1px rgba(217,169,74,.35),inset 0 0 0 10px #FFFDF8,inset 0 0 0 11px var(--gold);
  padding:14px;
  border-radius:12px;
}
/* ornate gold corners — SVG filigree, one per corner */
.paper.ivory::before,.paper.ivory::after{
  content:"";position:absolute;width:68px;height:68px;background-repeat:no-repeat;background-size:contain;pointer-events:none;z-index:2;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='none' stroke='%23B8892E' stroke-width='1.6' stroke-linecap='round'><path d='M4 20V6h14'/><path d='M4 12h8'/><path d='M12 4v8'/><circle cx='6' cy='6' r='1.4' fill='%23B8892E'/><path d='M20 6c3 0 6 0 9 2' opacity='.6'/><path d='M6 20c0 3 0 6 2 9' opacity='.6'/></g></svg>");
}
.paper.ivory::before{top:16px;left:16px}
.paper.ivory::after{top:16px;right:16px;transform:scaleX(-1)}
/* add bottom corners via extra wrappers (use body for one, bottom for another) */
.paper.ivory .body::before,.paper.ivory .body::after{
  content:"";position:absolute;width:68px;height:68px;background-repeat:no-repeat;background-size:contain;pointer-events:none;z-index:2;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='none' stroke='%23B8892E' stroke-width='1.6' stroke-linecap='round'><path d='M4 20V6h14'/><path d='M4 12h8'/><path d='M12 4v8'/><circle cx='6' cy='6' r='1.4' fill='%23B8892E'/><path d='M20 6c3 0 6 0 9 2' opacity='.6'/><path d='M6 20c0 3 0 6 2 9' opacity='.6'/></g></svg>");
}
.paper.ivory .body{position:relative}
.paper.ivory .body::before{bottom:-14px;left:-14px;transform:scaleY(-1)}
.paper.ivory .body::after{bottom:-14px;right:-14px;transform:scale(-1,-1)}

/* top header: white/ivory, centered layout, gold text, no dark gradient */
.paper.ivory .top{
  background:#FFFDF8 !important;
  color:var(--ink) !important;
  grid-template-columns:1fr !important;
  text-align:center !important;
  padding:34px 34px 10px !important;
  border-bottom:0 !important;
  gap:4px !important;
}
.paper.ivory .logo{display:flex;justify-content:center}
.paper.ivory .logo img{height:92px !important;max-width:200px !important;-webkit-mask-image:none !important;mask-image:none !important}
.paper.ivory .co{order:2;text-align:center}
.paper.ivory .co .cname{font-family:Cinzel,Georgia,serif;font-size:28px;font-weight:700;letter-spacing:.12em;color:var(--gold-deep) !important;line-height:1.1;margin-top:6px}
.paper.ivory .co .ctag{color:var(--gold-deep) !important;font-size:12px;letter-spacing:.14em;font-style:italic;text-transform:none;margin:4px 0 0;font-family:"Cormorant Garamond","Times New Roman",serif;font-weight:500}
.paper.ivory .co .addr{display:none}
/* meta (receipt no/date) moves to inside body as a two-column row */
.paper.ivory .meta{order:3;text-align:center;margin-top:10px}
.paper.ivory .meta .rt{display:none}
.paper.ivory .meta .kv{justify-content:center !important;gap:12px}
.paper.ivory .meta .kv small{color:var(--gold-deep) !important;font-style:italic;font-family:"Cormorant Garamond",Georgia,serif;font-size:13px}
.paper.ivory .meta .kv b{color:var(--ink) !important;font-weight:600}
.paper.ivory .meta .web{display:none}
/* horizontal rule under "Education is an Amanah" */
.paper.ivory .co::after{
  content:"";display:block;width:60%;margin:8px auto 0;height:1px;
  background:linear-gradient(90deg,transparent,var(--gold) 20%,var(--gold) 80%,transparent);
}

/* PAYMENT RECEIPT ribbon banner — gold outline hexagon-ish shape */
.paper.ivory .body{padding:10px 48px 32px !important}
.paper.ivory .body::before,.paper.ivory .body::after{z-index:3}
.paper.ivory .body > .ribbon{
  display:flex;justify-content:center;margin:14px 0 20px;position:relative;
}
.paper.ivory .body > .ribbon::before,
.paper.ivory .body > .ribbon::after{
  content:"";position:absolute;top:50%;width:calc(50% - 170px);height:1px;background:linear-gradient(90deg,transparent,var(--gold));
}
.paper.ivory .body > .ribbon::before{left:0}
.paper.ivory .body > .ribbon::after{right:0;background:linear-gradient(90deg,var(--gold),transparent)}
.paper.ivory .body > .ribbon > .tag{
  font-family:Cinzel,Georgia,serif;font-size:18px;font-weight:700;letter-spacing:.32em;
  color:var(--gold-deep);padding:10px 36px;
  background:#FFFDF8;border:2px solid var(--gold);
  clip-path:polygon(20px 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,20px 100%,0 50%);
  position:relative;
}

/* Watermark FTA mark in the background */
.paper.ivory .body{background:#FFFDF8;position:relative}
.paper.ivory .body > .wm{
  position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:0;opacity:.06;
}
.paper.ivory .body > .wm img{width:320px;height:auto}
.paper.ivory .body > *{position:relative;z-index:1}

/* info cards: no gold gradient, just white with gold trim and gold section header */
.paper.ivory .cards{gap:14px}
.paper.ivory .card{
  background:#FFFDF8 !important;border:1px solid var(--soft-line) !important;
  border-radius:8px !important;box-shadow:none !important;padding:0 !important;
}
.paper.ivory .card h3{
  background:transparent !important;color:var(--gold-deep) !important;
  border-bottom:1px solid var(--gold) !important;margin:0 !important;
  padding:10px 16px !important;font-size:11px !important;letter-spacing:.24em;
}
.paper.ivory .card > :not(h3){padding:10px 16px 14px}
.paper.ivory .big{color:var(--ink) !important;font-family:Cinzel,Georgia,serif;font-size:16px}
.paper.ivory .f > .lb,.paper.ivory .f > .cl{color:var(--gold-deep) !important;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:14px;font-weight:600}
.paper.ivory .f > .v{color:var(--ink) !important;font-weight:600;font-size:13.5px}

/* items table: gold header, gold-tinted row rules */
.paper.ivory table{margin-top:18px}
.paper.ivory thead th{
  background:#FBF5E4 !important;color:var(--gold-deep) !important;
  font-family:Cinzel,Georgia,serif;font-size:11.5px;letter-spacing:.18em;
  text-transform:uppercase;font-weight:700;
  border-top:1.5px solid var(--gold) !important;border-bottom:1.5px solid var(--gold) !important;
  padding:11px 14px !important;
}
.paper.ivory thead th:first-child,.paper.ivory thead th:last-child{border-radius:0 !important}
.paper.ivory tbody td{border-bottom:1px solid var(--soft-line) !important;color:var(--ink);font-size:13.5px}
.paper.ivory tbody td.amt{color:var(--ink) !important}

/* pkg: white box with gold border and gold text */
.paper.ivory .pkg{
  background:#FFFDF8 !important;color:var(--ink) !important;
  border:1.5px solid var(--gold) !important;box-shadow:none !important;
  margin-top:18px;
}
.paper.ivory .pkg .r{border-left:1px solid var(--soft-line) !important;text-align:center}
.paper.ivory .pkg .tag{background:var(--gold) !important;color:#FFFDF8 !important}
.paper.ivory .pkg .pn{color:var(--gold-deep) !important}
.paper.ivory .pkg .r small{color:var(--gold-deep) !important}
.paper.ivory .pkg .r b{color:var(--ink) !important}

/* totals: amount paid becomes gold-bordered highlight box (not dark fill) */
.paper.ivory .sum{margin-top:18px}
.paper.ivory .t{color:var(--ink);font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:15px}
.paper.ivory .t b{font-family:Inter,"Segoe UI",sans-serif;font-style:normal}
.paper.ivory .t.total{border-top:1px solid var(--soft-line) !important;color:var(--gold-deep);font-weight:700}
.paper.ivory .t.paid{
  background:transparent !important;color:var(--gold-deep) !important;
  border:1.5px solid var(--gold) !important;border-radius:8px !important;
  padding:12px 14px !important;font-weight:700;font-size:16px;margin-top:8px;
}
.paper.ivory .t.paid.solo{border-radius:8px !important}
.paper.ivory .t.paid .val{color:var(--gold-deep) !important;font-weight:700}
.paper.ivory .t.due{
  background:transparent !important;color:var(--gold-deep) !important;
  border:0 !important;border-top:1px dashed var(--soft-line) !important;border-radius:0 !important;
  padding:8px 14px !important;font-weight:600;
}
.paper.ivory .t.due.adv{color:#0F5E3B !important}

/* amount-in-words: soft ivory bar */
.paper.ivory .words{background:var(--soft) !important;border:1px solid var(--soft-line) !important;color:var(--ink);font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:14px}
.paper.ivory .words b{color:var(--gold-deep) !important;font-family:Inter,sans-serif;font-style:normal}

/* status badges */
.paper.ivory .status{background:var(--soft) !important;color:var(--gold-deep) !important;border-color:var(--gold) !important}

/* notes, cert, policy */
.paper.ivory .cert{background:#FFFDF8 !important;border:1px solid var(--soft-line) !important;border-left:4px solid var(--gold) !important}
.paper.ivory .cert h3,.paper.ivory .notes h3,.paper.ivory .pol h3{color:var(--gold-deep) !important}
.paper.ivory .pol{border-left:2px solid var(--gold) !important}
.paper.ivory .pol li::marker{color:var(--gold)}

/* bottom + signature */
.paper.ivory .bottom{border-top:1px dashed var(--soft-line) !important}
.paper.ivory .thanks{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;color:var(--gold-deep)}
.paper.ivory .sign{text-align:center}
.paper.ivory .sign .ln{border-top:1px solid var(--gold) !important;margin-top:32px;padding-top:6px;color:var(--gold-deep);font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:13px}

/* footer: location + website in small gold strip */
.paper.ivory .foot{background:transparent !important;border-top:1px solid var(--soft-line) !important;color:var(--gold-deep) !important;padding:10px 34px !important;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:12.5px}
.paper.ivory .foot a,.paper.ivory .foot *{color:var(--gold-deep) !important}

/* edit-mode: keep ivory inputs gentle */
.ed.ivory tbody td input{background:#FFFDF8;border:1px solid var(--soft-line);color:var(--ink)}
.ed.ivory .t.paid input{background:#FFFDF8;border-color:var(--gold);color:var(--gold-deep)}
.ed.ivory input:focus,.ed.ivory select:focus,.ed.ivory textarea:focus{background:#FFFDF8;color:var(--ink);box-shadow:0 0 0 3px rgba(217,169,74,.25)}
`;
  const opts = (list, v) => list.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${E(val)}"${String(val) === String(v) ? ' selected="selected"' : ''}>${E(lab)}</option>`; }).join('');
  function periodOptions(v, allowEmpty) { const now = new Date(), out = allowEmpty ? [['', '—']] : []; for (let i = -18; i <= 18; i++) { const x = ym(new Date(now.getFullYear(), now.getMonth() + i, 1)); out.push([x, ymLabel(x)]); } if (v && !out.some(o => o[0] === v)) out.push([v, ymLabel(v)]); return opts(out, v); }
  const periodText = d => ymLabel(d.pFrom) + (d.pTo && d.pTo !== d.pFrom ? ' – ' + ymLabel(d.pTo) : '');

  /* record → paper HTML. ed = editable (screen), else static (print/PNG/view). Static output is XHTML-safe for the PNG. */
  function paperHTML(rec, ed) {
    const d = rec.d, c = d.cur, k = calc(d), doc = d.doc, L = rec.look || DB.look, texts = rec.texts || DB.texts[doc], th = THEMES[L.theme] || THEMES.onyx;
    const T = (key, tag, cls, ml) => { const v = tx(doc, key, texts); tag = tag || 'span'; return ed ? `<${tag} data-t="${key}"${ml ? ' data-ml="1"' : ''} contenteditable="true" spellcheck="false"${cls ? ` class="${cls}"` : ''}>${E(v)}</${tag}>` : `<${tag}${cls ? ` class="${cls}"` : ''}>${E(v)}</${tag}>`; };
    const V = (path, val, o) => { o = o || {}; if (!ed) return `<span class="v${o.cls ? ' ' + o.cls : ''}">${E(o.show != null ? o.show : val) || (o.dash ? '—' : '')}</span>`; return `<input data-f="${path}" value="${E(val)}"${o.type ? ` type="${o.type}"` : ''}${o.ph ? ` placeholder="${E(o.ph)}"` : ''}${o.type === 'number' ? ' min="0" step="any" inputmode="decimal"' : ''}${o.list ? ` list="${o.list}"` : ''}${RM.err[path] ? ' class="err"' : ''} aria-label="${E(o.al || path)}"/>`; };
    const F = (lk, path, val, o) => (!ed && !String(val || '').trim()) ? '' : `<div class="f">${T(lk, 'span', 'lb')}<span class="cl">:</span>${V(path, val, o)}</div>`;
    const ORGV = G(() => ORG) || {};
    const status = rec.void ? 'void' : rec.no ? 'issued' : 'draft';
    const no = rec.no || peekNo(doc, d.date);
    const logo = L.showLogo && G(() => LOGO_FULL || LOGO_EM);
    /* letterhead */
    let h = `<div class="paper ${E(L.theme)}${ed ? ' ed' : ''}" data-status="${status}">
<div class="top"><div class="co">${T('c_name', 'div', 'cname') === '' ? '' : (ed ? `<div class="cname" data-t="c_name" contenteditable="true" spellcheck="false">${E(tx(doc, 'c_name', texts) || ORGV.name || 'Final Touch Academy')}</div><div class="ctag" data-t="c_tag" contenteditable="true" spellcheck="false">${E(tx(doc, 'c_tag', texts) || ORGV.tag || 'Learning Made Easy')}</div><div class="addr" data-t="c_addr" data-ml="1" contenteditable="true" spellcheck="false">${E(tx(doc, 'c_addr', texts) || ((ORGV.address || '') + '\n' + String(ORGV.phone || '').split(',').map(s => s.trim()).join('\n')))}</div>`
      : `<div class="cname">${E(tx(doc, 'c_name', texts) || ORGV.name || 'Final Touch Academy')}</div><div class="ctag">${E(tx(doc, 'c_tag', texts) || ORGV.tag || 'Learning Made Easy')}</div><div class="addr">${E(tx(doc, 'c_addr', texts) || ((ORGV.address || '') + '\n' + String(ORGV.phone || '').split(',').map(s => s.trim()).join('\n')))}</div>`)}</div>
<div class="logo${L.theme === 'mono' ? '' : ' mask'}">${logo ? `<img src="${logo}" alt="logo"/>` : ''}</div>
<div class="meta">${T('title', 'div', 'rt')}<div class="kv">${T('l_no', 'small')}<b>${E(no)}</b>${status === 'draft' ? '<i>(draft)</i>' : ''}</div>
<div class="kv">${T('l_date', 'small')}${ed ? `<input data-f="date" type="date" value="${E(d.date)}" style="width:150px" aria-label="Date"/>` : `<b>${E(prettyDate(d.date))}</b>`}</div>
<div class="web">${E(ORGV.email || 'finaltouchacademyfta@gmail.com')}<br/>${E(ORGV.web || 'finaltouch.academy')}</div></div></div>
<div class="body"><div class="wm" aria-hidden="true">${logo ? `<img src="${logo}" alt=""/>` : ''}</div><div class="ribbon"><span class="tag">${E((doc === 'salary' ? 'SALARY SLIP' : (T('title', 'span', 'rt').replace(/<[^>]+>/g, '').trim() || 'PAYMENT RECEIPT')).toUpperCase())}</span></div><div class="cards"><div class="card">${T('h_info', 'h3')}`;
    /* who */
    h += `<div class="big">${ed ? V('name', d.name, { ph: doc === 'salary' ? 'Teacher name' : (d.kind === 'guardian' ? 'Guardian name' : d.kind === 'other' ? 'Name / organisation' : 'Student name'), al: 'Name' }) : E(d.name)}</div>`;
    if (doc === 'salary') h += F('l_id', 'idno', d.idno, { ph: 'Optional' }) + F('l_desig', 'designation', d.designation, { ph: 'e.g. Subject Teacher' }) + F('l_subj', 'subjects', d.subjects, { ph: 'Optional' }) + F('l_phone', 'phone', d.phone, { ph: 'Optional', al: 'Phone' });
    else h += F('l_grade', 'grade', d.grade, { ph: d.kind === 'mentor' ? 'Subjects' : 'e.g. Grade 7' }) + (d.kind === 'other' ? '' : F('l_id', 'idno', d.idno, { ph: 'Optional' })) + (d.kind === 'mentor' || d.kind === 'other' ? '' : F('l_guardian', 'guardian', d.guardian, { ph: d.kind === 'guardian' ? 'Student name' : 'Optional' })) + F('l_phone', 'phone', d.phone, { ph: 'Optional', al: 'Phone' });
    h += `</div><div class="card">${T('h_pay', 'h3')}`;
    h += `<div class="f">${T('l_period', 'span', 'lb')}<span class="cl">:</span>${ed ? `<span class="period"><select data-f="pFrom" aria-label="From month">${periodOptions(d.pFrom)}</select><span>to</span><select data-f="pTo" aria-label="To month">${periodOptions(d.pTo, true)}</select></span>` : `<span class="v">${E(periodText(d))}</span>`}</div>`;
    h += `<div class="f">${T('l_time', 'span', 'lb')}<span class="cl">:</span><span class="v${rec.time ? '' : ' soon'}">${E(rec.time || 'Added automatically when you save')}</span></div>`;
    h += `<div class="f">${T('l_method', 'span', 'lb')}<span class="cl">:</span>${ed ? `<select data-f="method" aria-label="Method">${opts(METHODS, d.method)}</select>` : `<span class="v">${E(d.method)}</span>`}</div>`;
    h += F('l_txn', 'txn', d.txn, { ph: 'Optional' }) + (doc === 'salary' ? F('l_acct', 'account', d.account, { ph: 'Optional' }) : F('l_by', 'receivedBy', d.receivedBy, { ph: 'Optional' }));
    h += `</div></div>`;
    /* lines */
    if (doc === 'salary' && d.mode === 'fixed') {
      h += `<div class="pkg"><div class="l">${T('h_pkg', 'span', 'tag')}<div class="pn">${ed ? V('pkg.name', d.pkg.name, { ph: 'Package name, e.g. Senior Teacher Monthly Package' }) : E(d.pkg.name || 'Monthly Fixed Salary Package')}</div><div class="pd">${ed ? V('pkg.desc', d.pkg.desc, { ph: 'What it covers, e.g. all assigned one-to-one sessions' }) : E(d.pkg.desc)}</div></div><div class="r">${T('l_pkgamt', 'small')}<b>${ed ? V('pkg.amt', d.pkg.amt, { type: 'number', ph: '0', al: 'Package amount' }) : E(plain(k.sub, c))} <span style="font-size:13px">${E(c)}</span></b></div></div>`;
    } else if (doc === 'salary') {
      h += `<table><thead><tr><th>${T('th_sl')}</th><th>${T('th_stu')}</th><th>${T('th_grade')}</th><th>${T('th_subj')}</th><th class="r">${T('th_share')} (${E(c)})</th>${ed ? '<th class="rm"></th>' : ''}</tr></thead><tbody>`;
      const rows = ed ? d.students : d.students.filter(s => s.name || Number(s.share));
      rows.forEach((s, i) => { h += `<tr><td class="sl">${i + 1}</td><td>${ed ? V(`students.${i}.name`, s.name, { ph: 'Student name', al: 'Student ' + (i + 1) }) : E(s.name)}</td><td>${ed ? V(`students.${i}.grade`, s.grade, { ph: 'Grade' }) : E(s.grade)}</td><td>${ed ? V(`students.${i}.subject`, s.subject, { ph: 'Subject' }) : E(s.subject)}</td><td class="r amt">${ed ? V(`students.${i}.share`, s.share, { type: 'number', ph: '0', al: 'Share ' + (i + 1) }) : E(plain(toMinor(s.share, c), c))}</td>${ed ? `<td class="rm"><button type="button" class="x" data-act="rmStu" data-i="${i}" title="Remove"${d.students.length < 2 ? ' disabled="disabled"' : ''}>×</button></td>` : ''}</tr>`; });
      h += `</tbody></table>${ed ? `<div class="adds" style="justify-content:flex-start"><button type="button" class="chip" data-act="addStu">+ Add student</button></div>` : ''}`;
    } else if (d.mode === 'single') {
      h += `<table><thead><tr><th>${T('th_desc')}</th><th class="r">${T('th_amt')} (${E(c)})</th></tr></thead><tbody><tr><td>${ed ? V('single.desc', d.single.desc, { ph: 'e.g. Maths, Science, English', al: 'Description' }) : E(d.single.desc || 'Tuition fee')}</td><td class="r amt">${ed ? V('single.amt', d.single.amt, { type: 'number', ph: '0', al: 'Amount' }) : E(plain(k.sub, c))}</td></tr></tbody></table>`;
    } else {
      h += `<table><thead><tr><th>${T('th_sl')}</th><th>${T('th_desc')}</th><th class="r">${T('th_months')}</th><th class="r">${T('th_rate')}</th><th class="r">${T('th_amt')} (${E(c)})</th>${ed ? '<th class="rm"></th>' : ''}</tr></thead><tbody>`;
      const rows = ed ? d.items : d.items.filter(i => i.desc || Number(i.qty) || Number(i.rate));
      rows.forEach((it, i) => { const amt = Math.round(Math.max(0, Number(it.qty) || 0) * Math.max(0, toMinor(it.rate, c))); h += `<tr><td class="sl">${i + 1}</td><td>${ed ? V(`items.${i}.desc`, it.desc, { ph: 'Subject, e.g. Mathematics', al: 'Subject ' + (i + 1) }) : E(it.desc || 'Tuition fee')}</td><td class="r qty">${ed ? V(`items.${i}.qty`, it.qty, { type: 'number', ph: '0', al: 'Months ' + (i + 1) }) : E(it.qty)}</td><td class="r rate">${ed ? V(`items.${i}.rate`, it.rate, { type: 'number', ph: '0', al: 'Rate ' + (i + 1) }) : E(plain(toMinor(it.rate, c), c))}</td><td class="r amt" data-o="row${i}">${E(money(amt, c))}</td>${ed ? `<td class="rm"><button type="button" class="x" data-act="rmItem" data-i="${i}" title="Remove"${d.items.length < 2 ? ' disabled="disabled"' : ''}>×</button></td>` : ''}</tr>`; });
      h += `</tbody></table>${ed ? `<div class="adds" style="justify-content:flex-start"><button type="button" class="chip" data-act="addItem">+ Add subject</button><button type="button" class="chip" data-act="pack">Convert to package</button></div>` : ''}`;
    }
    /* totals */
    const minus = doc === 'salary' ? 'deduct' : 'discount';
    h += `<div class="sum"><div>`;
    if (ed) h += d.adj.map((a, i) => `<div class="ar${a.type === minus ? ' minus' : ''}"><input data-f="adj.${i}.label" value="${E(a.label)}" placeholder="${E(a.type === minus ? (doc === 'salary' ? 'Deduction' : 'Discount') : (doc === 'salary' ? 'Bonus / allowance' : 'Additional charge'))}" aria-label="Adjustment ${i + 1} label"/><input data-f="adj.${i}.value" type="number" min="0" step="any" inputmode="decimal" value="${E(a.value)}" placeholder="0" aria-label="Adjustment ${i + 1} amount"/><select data-f="adj.${i}.kind" aria-label="Adjustment ${i + 1} kind">${opts([['fixed', c], ['percent', '%']], a.kind)}</select><b data-o="adj${i}"></b><button type="button" class="x" data-act="rmAdj" data-i="${i}" title="Remove">×</button></div>`).join('') + `<div class="adds" style="justify-content:flex-start"><button type="button" class="chip dark" data-act="addAdj" data-k="${minus}">+ Add ${doc === 'salary' ? 'deduction' : 'discount'}</button><button type="button" class="chip" data-act="addAdj" data-k="${doc === 'salary' ? 'bonus' : 'charge'}">+ Add ${doc === 'salary' ? 'bonus / allowance' : 'charge'}</button></div>`;
    h += `</div><div class="totals">`;
    const showSub = k.adj.some(a => a.on) || k.lines.length > 1 || doc === 'salary';
    h += `<div class="t" data-o="subRow"${showSub ? '' : ' style="display:none"'}>${T(doc === 'salary' ? 'l_gross' : 'l_sub')}<b data-o="sub">${E(money(k.sub, c))}</b></div>`;
    h += `<div data-o="adjList">${k.adj.filter(a => a.on).map(a => `<div class="t adj${a.signed < 0 ? ' minus' : ''}"><span>${E(a.label)}</span><b>${a.signed < 0 ? '− ' : '+ '}${E(money(Math.abs(a.signed), c))}</b></div>`).join('')}</div>`;
    h += `<div class="t total">${T('l_total')}<b data-o="total">${E(money(k.total, c))}</b></div>`;
    h += `<div class="t paid${k.due === 0 ? ' solo' : ''}" data-o="paidRow">${T('l_paid')}<span class="val">${ed ? `<input data-f="paid" type="number" min="0" step="any" inputmode="decimal" value="${E(d.paid)}" placeholder="${E(plain(k.total, c))}" aria-label="Amount paid"/>` : `<b>${E(plain(k.paid, c))}</b>`} ${E(c)}</span></div>`;
    h += `<div class="t due${k.due < 0 ? ' adv' : ''}" data-o="dueRow"${k.due === 0 ? ' style="display:none"' : ''}><span data-o="dueLab">${E(tx(doc, k.due < 0 ? 'l_adv' : 'l_due', texts))}</span><b data-o="due">${E(money(Math.abs(k.due), c))}</b></div>`;
    h += `</div></div>`;
    h += `<div class="words">${T('l_words', 'b')} <span data-o="words">${E(words(k.paid, c))}</span></div>`;
    if (doc === 'salary') h += `<div class="cert">${T('h_cert', 'h3')}<p data-o="cert">${certText(d, k)}</p></div>`;
    const st = statusOf(k, c, doc);
    h += `<div class="status ${st[0]}" data-o="status">${E(st[1])}</div>`;
    if (ed || (d.note || '').trim()) h += `<div class="notes">${T('h_notes', 'h3')}${ed ? `<textarea data-f="note" rows="2" aria-label="Notes" placeholder="Optional note">${E(d.note)}</textarea>` : `<div class="nt">${E(d.note)}</div>`}</div>`;
    /* bottom: terms + signature/thanks */
    const terms = ['t1', 't2', 't3', 't4', 't5', 't6'].filter(t => ed ? (doc === 'receipt' || tx(doc, t, texts) !== '' || t === 't4') : tx(doc, t, texts).trim());
    const sig = (doc === 'salary' ? d.sigOn : L.showSig) && DB.sig;
    const showSignBlock = doc === 'salary' || L.showSig;
    h += `<div class="bottom">${L.showTerms ? `<div class="pol">${T('h_terms', 'h3')}<ul>${terms.map(t => ed ? `<li data-t="${t}" contenteditable="true" spellcheck="false">${E(tx(doc, t, texts))}</li>` : `<li>${E(tx(doc, t, texts))}</li>`).join('')}</ul></div>` : '<div></div>'}`;
    if (showSignBlock) h += `<div class="sign"><div class="si">${sig ? `<img src="${sig}" alt="signature"/>` : ''}</div><div class="ln"></div>${T('sig_title', 'b')}${T('sig_org', 'span')}</div>`;
    else h += `<div class="thanks">${T('thanks', 'b')}<div>${E((ORGV.name || 'Final Touch Academy') + ' · ' + (ORGV.tag || 'Learning Made Easy'))}</div></div>`;
    h += `</div></div><div class="foot"><span>${status === 'draft' ? 'Draft · not issued yet' : 'Check code ' + E(code(rec)) + ' · issued by ' + E(rec.by || '') + (rec.time ? ' · ' + E(rec.time) : '')}</span><span>FTA Command Centre · ${E(ORGV.web || 'finaltouch.academy')}</span></div>`;
    if (status !== 'issued') h += `<div class="wm ${status}"><span>${status === 'void' ? 'VOID' : ed ? '' : 'DRAFT'}</span></div>`;
    h += `</div>`;
    return h;
  }
  function statusOf(k, c, doc) {
    if (k.total <= 0) return ['draft', doc === 'salary' ? 'Enter the salary amount to begin' : 'Enter an amount to begin'];
    if (k.due > 0) return ['partial', '● PARTIALLY PAID — Balance due ' + money(k.due, c)];
    return ['', '✓ FULLY PAID' + (k.due < 0 ? ' — Advance ' + money(-k.due, c) : '')];
  }
  function certText(d, k) {
    const org = E(tx('salary', 'sig_org') || 'Final Touch Academy');
    const who = d.name ? `<b>${E(d.name)}</b>` : '__________';
    const what = d.mode === 'fixed' ? 'as fixed monthly salary' : `as salary for ${k.lines.length} student${k.lines.length === 1 ? '' : 's'}`;
    return `This is to certify that ${who}${d.designation ? ', ' + E(d.designation) + ',' : ''} has received <b>${E(money(k.paid, d.cur))}</b> ${what} for the month of <b>${E(periodText(d))}</b> from ${org}.`;
  }

  /* ---------------------------------------------------------------- validation */
  function validate(d) {
    const e = {}, k = calc(d), num = v => Number(String(v == null ? '' : v).replace(/,/g, ''));
    if (!(d.name || '').trim()) e.name = 'Write ' + (d.doc === 'salary' ? 'the teacher\'s name' : 'who this receipt is for');
    if (!d.date) e.date = 'Choose a date';
    if (d.pTo && d.pTo < d.pFrom) e.pTo = '"To" month is before "from" month';
    if (k.total <= 0) e.amount = d.doc === 'salary' ? 'Enter the salary amount' : 'Enter an amount';
    if (k.negative) e.amount = 'Discounts/deductions are more than the subtotal';
    (d.items || []).forEach((it, i) => { if ((num(it.rate) || num(it.qty)) && !(it.desc || '').trim() && d.doc === 'receipt' && d.mode === 'multi') e['items.' + i + '.desc'] = 'Name this line'; if (num(it.rate) < 0 || num(it.qty) < 0) e['items.' + i + '.rate'] = 'Cannot be negative'; });
    d.adj.forEach((a, i) => { if (a.kind === 'percent' && num(a.value) > 100) e['adj.' + i + '.value'] = 'Max 100%'; });
    if (d.phone && !/^[+0-9\-\s()]{6,20}$/.test(d.phone)) e.phone = 'Phone number looks wrong';
    return e;
  }

  /* ---------------------------------------------------------------- app data helpers (connected) */
  function people(kind) {
    if (kind === 'student' || kind === 'guardian') return (G(() => STUDENTS) || []).map(s => ({ id: s.id, name: s.name, grade: [s.cls, s.board].filter(Boolean).join(' · '), guardian: s.guardian, phone: s.phone, st: s.status }));
    if (kind === 'mentor') return (G(() => MENTORS) || []).map(m => ({ id: m.id, name: m.name, grade: m.subjects, phone: m.phone, st: m.status, pay: m.pay }));
    return [];
  }
  const progOf = id => (G(() => PROGS) || []).find(p => p.id === id) || {};
  function feeFor(e, month) { const f = (e.fees || []).filter(x => x.from <= month).sort((a, b) => a.from < b.from ? 1 : -1)[0] || (e.fees || [])[0]; return f ? f.fee : 0; }
  function enrolLines(stuId, month) { return (G(() => ENROL) || []).filter(e => e.stu === stuId && e.status === 'Active' && !e.batch).map(e => { const p = progOf(e.prog), fee = feeFor(e, month), disc = Number(e.disc) || 0; return { desc: p.name || p.subject || e.prog, rate: Math.max(0, Math.round(fee * (1 - disc / 100))) }; }); }
  function mentorStudents(mid, month) {
    const m = (G(() => MENTORS) || []).find(x => x.id === mid) || {};
    const out = (G(() => ENROL) || []).filter(e => e.mentor === mid && e.status === 'Active' && !e.batch).map(e => { const s = (G(() => STUDENTS) || []).find(x => x.id === e.stu) || {}, p = progOf(e.prog), fee = feeFor(e, month); const share = m.model === 'pct_fee' ? Math.round(fee * (Number(m.rate) || 0) / 100) : m.model === 'per_student' ? Number(m.rate) || 0 : ''; return { name: s.name || e.stu, grade: s.cls || '', subject: p.subject || p.name || '', share: share === '' ? '' : String(share) }; });
    (G(() => BATCHES) || []).filter(b => b.mentor === mid && b.status === 'Active').forEach(b => out.push({ name: 'Batch: ' + b.name, grade: '', subject: progOf(b.prog).subject || '', share: String(b.mentorPay || '') }));
    return out;
  }

  /* ---------------------------------------------------------------- page */
  let FORCE = true, rq = 0, root = null;
  const redraw = () => { FORCE = true; if (rq) return; rq = setTimeout(() => { rq = 0; render(true); }, 0); };
  const msg = (t, err) => { RM.msg = t || ''; RM.msgErr = !!err; const m = $id('rm-msg'); if (m) { m.textContent = RM.msg; m.className = 'rm-msg' + (err ? ' err' : ''); } };
  function sideHTML() {
    const d = D(), doc = RM.doc, list = people(d.kind), canA = can(modOf(doc), 'a'), canE = can(modOf(doc), 'e'), L = DB.look;
    const due = d.pid && doc === 'receipt' && d.kind !== 'mentor' ? G(() => studentDue(d.pid)) : null;
    const stu = d.kind === 'mentor' ? 'mentor' : 'student';
    return `<aside class="rm-side">
      <section class="card rm-box"><h4>${doc === 'salary' ? 'Teacher' : 'Receipt for'}</h4>
        ${doc === 'receipt' ? `<div class="rm-seg" role="tablist">${KINDS.map(k => `<button type="button" role="tab" aria-selected="${d.kind === k[0]}" class="${d.kind === k[0] ? 'on' : ''}" onclick="FTA_RECEIPT.kind('${k[0]}')">${k[1]}</button>`).join('')}</div>` : ''}
        ${list.length ? `<label class="rm-l">Find ${stu}<input list="rm-people" placeholder="Name or ID…" value="${E(d.pid ? d.pid + ' · ' + ((list.find(p => p.id === d.pid) || {}).name || '') : '')}" onchange="FTA_RECEIPT.pick(this.value)"><datalist id="rm-people">${list.map(p => `<option value="${E(p.id + ' · ' + p.name)}">${E((p.grade || '') + (p.st && p.st !== 'Active' ? ' · ' + p.st : ''))}</option>`).join('')}</datalist></label>` : `<p class="rm-hint">Type the name and details straight on the receipt.</p>`}
        ${d.pid && doc === 'receipt' && d.kind !== 'mentor' ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.fillEnrol()">${icon('programmes')}Fill subjects &amp; fees from enrolments</button>${due != null ? `<p class="rm-hint">Current due in the app: <b>${E(money(Math.round(due * 100), 'BDT'))}</b></p>` : ''}` : ''}
        ${d.pid && doc === 'salary' ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.fillMentor()">${icon('students')}Fill assigned students &amp; shares</button>` : ''}
      </section>
      <section class="card rm-box"><h4>Layout</h4>
        <div class="rm-seg">${(doc === 'salary' ? [['fixed', 'Fixed salary'], ['per', 'Per student']] : [['single', 'Single subject'], ['multi', 'Multiple subjects']]).map(m => `<button type="button" class="${d.mode === m[0] ? 'on' : ''}" onclick="FTA_RECEIPT.mode('${m[0]}')">${m[1]}</button>`).join('')}</div>
        <label class="rm-l">Currency<select onchange="FTA_RECEIPT.cur(this.value)">${CUR.map(x => `<option value="${x[0]}"${d.cur === x[0] ? ' selected' : ''}>${x[0]} — ${x[1]}</option>`).join('')}</select></label>
        ${RM.pack !== '' ? `<div class="rm-pack"><label class="rm-l">Package price per month<input type="number" min="0" step="any" id="rm-packv" value="${E(RM.pack)}"></label><div class="rm-row"><button type="button" class="btn s p" onclick="FTA_RECEIPT.packApply()">Share equally</button><button type="button" class="btn s" onclick="FTA_RECEIPT.packCancel()">Cancel</button></div></div>` : ''}
      </section>
      <section class="card rm-box"><h4>Look ${canE ? '' : '<small>(view only)</small>'}</h4>
        <fieldset ${canE ? '' : 'disabled'}>
        <div class="rm-themes">${Object.entries(THEMES).map(([k, v]) => `<button type="button" class="${L.theme === k ? 'on' : ''}" aria-pressed="${L.theme === k}" onclick="FTA_RECEIPT.look('theme','${k}')"><i style="background:linear-gradient(135deg,${v[2]},${v[1]});border-color:${v[3]}"></i>${v[0]}</button>`).join('')}</div>
        <div class="rm-2"><label class="rm-l">Paper<select onchange="FTA_RECEIPT.look('paper',this.value)">${['A4', 'A5'].map(p => `<option${L.paper === p ? ' selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="rm-l">Next number<input value="${E(peekNo(doc, d.date))}" onchange="FTA_RECEIPT.setNext(this.value)" aria-describedby="rm-nh"></label></div>
        <p class="rm-hint" id="rm-nh">To continue your old generator, type its next number here (e.g. ${E(fmtNo(doc, (d.date || todayISO()).slice(0, 4), 25))}).</p>
        <div class="rm-tg">${[['showLogo', 'Logo'], ['showTerms', doc === 'salary' ? 'Remarks' : 'Terms'], ['showSig', 'Signature on receipts']].map(([k, l]) => `<label><input type="checkbox" ${L[k] ? 'checked' : ''} onchange="FTA_RECEIPT.look('${k}',this.checked)">${l}</label>`).join('')}${doc === 'salary' ? `<label><input type="checkbox" ${d.sigOn ? 'checked' : ''} onchange="FTA_RECEIPT.sigOn(this.checked)">Signature on this slip</label>` : ''}</div>
        <div class="rm-row"><label class="btn s rm-file">${icon('upload')}${DB.sig ? 'Change signature' : 'Upload signature'}<input type="file" accept="image/*" hidden onchange="FTA_RECEIPT.sig(this.files[0])"></label>${DB.sig ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.sigRemove()">Remove</button>` : ''}<button type="button" class="btn s" onclick="FTA_RECEIPT.resetTexts()">Reset texts</button></div>
        </fieldset>
        <p class="rm-hint">Tip: click any heading, label or policy line on the receipt to retype it.</p>
      </section>
      <section class="card rm-box rm-acts"><h4>${RM.view ? 'Issued · ' + E(RM.view) : 'Save'}</h4>
        ${RM.view ? `<button type="button" class="btn p" onclick="FTA_RECEIPT.print()">${icon('print')}Print again</button><button type="button" class="btn" onclick="FTA_RECEIPT.png()">${icon('download')}PNG</button>${waBtn()}<div class="rm-row"><button type="button" class="btn s" onclick="FTA_RECEIPT.dup('${E(RM.view)}')">${icon('copy')}Duplicate</button>${can(modOf(doc), 'd') && !(viewRec() || {}).void ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.voidAsk('${E(RM.view)}')">Void</button>` : ''}<button type="button" class="btn s" onclick="FTA_RECEIPT.fresh()">${icon('plus')}New</button></div>`
        : canA ? `<button type="button" class="btn p" id="rm-issue" onclick="FTA_RECEIPT.issue(true)" ${RM.busy ? 'disabled' : ''}>${icon('print')}${RM.busy ? 'Saving…' : 'Save &amp; print'}</button><button type="button" class="btn" onclick="FTA_RECEIPT.issue(false)" ${RM.busy ? 'disabled' : ''}>${icon('check')}Save only</button><div class="rm-row"><button type="button" class="btn s" onclick="FTA_RECEIPT.print()">Print draft</button><button type="button" class="btn s" onclick="FTA_RECEIPT.png()">PNG</button><button type="button" class="btn s" onclick="FTA_RECEIPT.fresh()">New</button></div>`
          : `<p class="rm-hint">View only: you cannot issue ${doc === 'salary' ? 'salary slips' : 'receipts'}.</p>`}
        <p id="rm-msg" class="rm-msg${RM.msgErr ? ' err' : ''}" role="status" aria-live="polite">${E(RM.msg)}</p>
        <p class="rm-legal">Documents only: nothing here changes Accounts, invoices or payroll. Fees are still collected in <a href="#" onclick="go('payments');return false">Payments</a>${doc === 'salary' ? ', salaries in <a href="#" onclick="go(\'payroll\');return false">Payroll</a>' : ''}.</p>
      </section>
    </aside>`;
  }
  const viewRec = () => RM.view && DB.list.find(r => r.no === RM.view);
  function waText(r) { const k = r.calc, c = r.d.cur; const en = G(() => LANG) === 'en';   /* the message follows the app language: English mode never sends Bangla */
    const txt = en
      ? (r.d.doc === 'salary' ? `Assalamu Alaikum, ${r.d.name}. Your salary for ${periodText(r.d)}, ${money(k.paid, c)}, has been paid. Slip ${r.no}. Thank you, Final Touch Academy.` : `Assalamu Alaikum. We have received ${money(k.paid, c)} for ${r.d.name} (${periodText(r.d)})${k.due > 0 ? '; still due ' + money(k.due, c) : ''}. Receipt ${r.no}. Thank you, Final Touch Academy.`)
      : (r.d.doc === 'salary' ? `আসসালামু আলাইকুম। ${r.d.name}, ${periodText(r.d)} মাসের salary ${money(k.paid, c)} পাঠানো হয়েছে। Slip ${r.no}। ধন্যবাদ, Final Touch Academy।` : `আসসালামু আলাইকুম। ${r.d.name} এর ${periodText(r.d)} বাবদ ${money(k.paid, c)} পেয়েছি${k.due > 0 ? ', বাকি ' + money(k.due, c) : ''}। Receipt ${r.no}। ধন্যবাদ, Final Touch Academy।`); return G(() => waLink(r.d.phone, txt)) || ('https://wa.me/?text=' + encodeURIComponent(txt)); }
  /* the message is written again at the moment of the tap, so it is always in the language in use now */
  function waBtn() { const r = viewRec(); if (!r || !r.d.phone) return ''; return `<a class="btn wa" data-rm-wa target="_blank" rel="noopener" href="${E(waText(r))}">${icon('wa')}WhatsApp</a>`; }
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[data-rm-wa]'); if (!a) return; const r = viewRec(); if (r && r.d.phone) a.href = waText(r); }, true);
  function historyHTML() {
    const q = RM.q.trim().toLowerCase();
    let L = DB.list.filter(r => can(modOf(r.d.doc), 'v')).slice().reverse();
    if (RM.show === 'receipt' || RM.show === 'salary') L = L.filter(r => r.d.doc === RM.show && !r.void); if (RM.show === 'void') L = L.filter(r => r.void);
    if (q) L = L.filter(r => [r.no, r.d.name, r.d.idno, r.d.phone, periodText(r.d)].join(' ').toLowerCase().includes(q));
    const live = DB.list.filter(r => !r.void && can(modOf(r.d.doc), 'v')), mon = todayISO().slice(0, 7);
    const bdt = live.filter(r => r.d.doc === 'receipt' && r.d.cur === 'BDT').reduce((a, r) => a + r.calc.paid, 0);
    const k = (l, ic2, v) => G(() => kpi({ sm: 1, label: l, icon: ic2, value: v })) || '';
    return `<div class="kpis">${k('Receipts issued', 'receipt', String(live.filter(r => r.d.doc === 'receipt').length))}${can(M_SL, 'v') ? k('Salary slips', 'payroll', String(live.filter(r => r.d.doc === 'salary').length)) : ''}${k('This month', 'calendar', String(live.filter(r => r.d.date.slice(0, 7) === mon).length))}${k('Received (BDT)', 'payments', money(bdt, 'BDT'))}</div>
    <div class="card rm-hist"><div class="rm-tools"><input type="search" placeholder="Search number, name, ID, phone or month…" value="${E(RM.q)}" oninput="FTA_RECEIPT.search(this.value)" aria-label="Search">
    <div class="chips">${[['all', 'All'], ['receipt', 'Receipts'], ...(can(M_SL, 'v') ? [['salary', 'Salary slips']] : []), ['void', 'Void']].map(([k2, l]) => `<button type="button" class="${RM.show === k2 ? 'on' : ''}" onclick="FTA_RECEIPT.filter('${k2}')">${l}</button>`).join('')}</div></div>
    ${L.length ? `<div class="tw"><table class="rm-tab"><thead><tr><th>No.</th><th>Date</th><th>Name</th><th>For</th><th style="text-align:right">Paid</th><th>Status</th><th></th></tr></thead><tbody>${L.map(r => `<tr class="${r.void ? 'is-void' : ''}"><td><b>${E(r.no)}</b><br><small class="sub">${r.d.doc === 'salary' ? 'Salary slip' : 'Receipt'}</small></td><td>${E(prettyDate(r.d.date))}</td><td>${E(r.d.name)}${r.d.idno ? `<br><small class="sub">${E(r.d.idno)}</small>` : ''}</td><td>${E(periodText(r.d))}</td><td style="text-align:right"><b>${E(money(r.calc.paid, r.d.cur))}</b>${r.calc.due > 0 ? `<br><small class="rm-bad">Due ${E(money(r.calc.due, r.d.cur))}</small>` : r.calc.due < 0 ? `<br><small class="rm-ok">Advance ${E(money(-r.calc.due, r.d.cur))}</small>` : ''}</td><td>${r.void ? `<span class="pill p-bad" title="${E(r.voidReason || '')}">Void</span>` : r.calc.due > 0 ? '<span class="pill p-warn">Partly paid</span>' : '<span class="pill p-ok">Paid</span>'}</td><td class="rm-ra"><button type="button" class="btn s" onclick="FTA_RECEIPT.open('${E(r.no)}')">${icon('eye')}Open</button>${can(modOf(r.d.doc), 'a') ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.dup('${E(r.no)}')">Duplicate</button>` : ''}${can(modOf(r.d.doc), 'd') && !r.void ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.voidAsk('${E(r.no)}')">Void</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="rm-empty">${icon('receipt')}<b>${DB.list.length ? 'Nothing matches' : 'Nothing issued yet'}</b><p>${DB.list.length ? 'Try another name, number or filter.' : 'Issued receipts and salary slips appear here for reprint, duplicate and void.'}</p></div>`}</div>`;
  }
  function tplHTML() {
    const mine = DB.tpls.filter(t => can(modOf(t.doc), 'v'));
    return `<div class="card rm-tpl"><header><div><h3>Templates</h3><p>Save the current layout, lines, look and texts, then start from it in one click.</p></div>${can(modOf(RM.doc), 'e') ? `<button type="button" class="btn p" onclick="FTA_RECEIPT.tplSave()">${icon('plus')}Save current as template</button>` : ''}</header>
    ${mine.length ? `<div class="rm-tgrid">${mine.map(t => { const i = DB.tpls.indexOf(t), th = THEMES[t.look.theme] || THEMES.onyx; return `<article><i style="background:linear-gradient(135deg,${th[2]},${th[1]});border-color:${th[3]}"></i><div><b>${E(t.name)}</b><small>${t.doc === 'salary' ? 'Salary slip' : 'Receipt'} · ${E(th[0])} · ${E(t.d.cur)}</small></div><div class="rm-ra"><button type="button" class="btn s" onclick="FTA_RECEIPT.tplUse(${i})">Use</button>${can(modOf(t.doc), 'e') ? `<button type="button" class="btn s" onclick="FTA_RECEIPT.tplDel(${i})">Delete</button>` : ''}</div></article>`; }).join('')}</div>`
      : `<div class="rm-empty">${icon('doc')}<b>No templates yet</b><p>Example: "Admission · 3 subjects" or "Senior teacher package".</p></div>`}</div>`;
  }
  function pageHTML() {
    const n = DB.list.filter(r => can(modOf(r.d.doc), 'v')).length;
    const docs = [['receipt', 'Student receipt', M_RC], ['salary', 'Salary slip', M_SL]].filter(x => can(x[2], 'v'));
    return `<div id="rm-root">
      <div class="rm-topbar"><div class="chips" role="tablist">${[['new', RM.view ? 'Open receipt' : 'Make'], ['hist', 'Issued' + (n ? ' (' + n + ')' : '')], ['tpl', 'Templates']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${RM.tab === k}" class="${RM.tab === k ? 'on' : ''}" onclick="FTA_RECEIPT.tab('${k}')">${l}</button>`).join('')}</div>
      ${RM.tab === 'new' && !RM.view && docs.length > 1 ? `<div class="chips rm-doc">${docs.map(x => `<button type="button" class="${RM.doc === x[0] ? 'on' : ''}" onclick="FTA_RECEIPT.doc('${x[0]}')">${x[1]}</button>`).join('')}</div>` : ''}</div>
      ${RM.tab === 'new' ? `<div class="rm-grid"><div class="rm-stage"><div id="rm-paper-host"></div>${Object.keys(RM.err).length && !RM.view ? `<p class="rm-errs">${E([...new Set(Object.values(RM.err))].join(' · '))}</p>` : ''}</div>${sideHTML()}</div>` : RM.tab === 'hist' ? historyHTML() : tplHTML()}
    </div>`;
  }
  function render(force) {
    if (G(() => ST.page) !== PAGE) return;
    if (!can(M_RC, 'v') && !can(M_SL, 'v')) { G(() => SCH.page('', '', '<div class="card rm-empty"><b>No access</b><p>Ask the Owner to give you "Receipt Maker" in Access → Roles.</p></div>')); return; }
    if (!can(modOf(RM.doc), 'v')) RM.doc = can(M_RC, 'v') ? 'receipt' : 'salary';
    if (!force && !FORCE && $id('rm-root')) return;
    FORCE = false;
    SCH.page('', '', pageHTML());
    const ey = document.querySelector('#view .bn-eye'); if (ey) ey.textContent = (meNow().role + ' Portal').toUpperCase() + ' · RECEIPT MAKER';
    if (RM.tab === 'new') mountPaper();
  }
  /* ---------------------------------------------------------------- shadow paper + live updates */
  function curRec() { const v = viewRec(); if (v) return v; return { d: D(), no: '', look: DB.look, texts: DB.texts[RM.doc], time: '', by: meNow().name }; }
  function mountPaper() {
    const host = $id('rm-paper-host'); if (!host) return;
    root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const v = viewRec();
    root.innerHTML = `<style>${PAPER_CSS}</style>` + paperHTML(curRec(), !v);
    if (!v) { live(); wireShadow(); }
  }
  function live() {
    if (!root || viewRec()) return; const d = D(), k = calc(d), c = d.cur, doc = d.doc, q = s => root.querySelector('[data-o="' + s + '"]');
    if (doc === 'receipt' && d.mode === 'multi') d.items.forEach((it, i) => { const o = q('row' + i); if (o) o.textContent = money(Math.round(Math.max(0, Number(it.qty) || 0) * Math.max(0, toMinor(it.rate, c))), c); });
    d.adj.forEach((a, i) => { const o = q('adj' + i); if (o) { const x = k.adj[i]; o.textContent = (x.m ? '− ' : '+ ') + money(Math.abs(x.signed), c); } });
    const sr = q('subRow'); if (sr) sr.style.display = (k.adj.some(a => a.on) || k.lines.length > 1 || doc === 'salary') ? '' : 'none';
    const set = (s, t) => { const o = q(s); if (o) o.textContent = t; };
    set('sub', money(k.sub, c)); set('total', money(k.total, c)); set('words', words(k.paid, c));
    const al = q('adjList'); if (al) al.innerHTML = k.adj.filter(a => a.on).map(a => `<div class="t adj${a.signed < 0 ? ' minus' : ''}"><span>${E(a.label)}</span><b>${a.signed < 0 ? '− ' : '+ '}${E(money(Math.abs(a.signed), c))}</b></div>`).join('');
    const pi = root.querySelector('[data-f="paid"]'); if (pi) pi.placeholder = plain(k.total, c);
    const pr = q('paidRow'); if (pr) pr.classList.toggle('solo', k.due === 0);
    const dr = q('dueRow'); if (dr) { dr.style.display = k.due === 0 ? 'none' : ''; dr.classList.toggle('adv', k.due < 0); }
    set('dueLab', tx(doc, k.due < 0 ? 'l_adv' : 'l_due')); set('due', money(Math.abs(k.due), c));
    const st = statusOf(k, c, doc), so = q('status'); if (so) { so.className = 'status ' + st[0]; so.textContent = st[1]; }
    const ce = q('cert'); if (ce) ce.innerHTML = certText(d, k);
  }
  function setPath(o, path, v) { const p = path.split('.'); let x = o; for (let i = 0; i < p.length - 1; i++) { x = x[p[i]]; if (x == null) return; } x[p[p.length - 1]] = v; }
  function wireShadow() {
    if (root._wired) return; root._wired = true;
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset && t.dataset.f) { const d = D(), f = t.dataset.f; const old = d.pFrom && d.pTo ? monthsBetween(d.pFrom, d.pTo) : 1; setPath(d, f, t.value); if (RM.err[f]) { delete RM.err[f]; t.classList.remove('err'); } if (f === 'name' || /amt|share|rate|qty|paid|value/.test(f)) delete RM.err.amount;
        if ((f === 'pFrom' || f === 'pTo') && d.doc === 'receipt') { const n = d.pTo ? monthsBetween(d.pFrom, d.pTo) : 1; d.items.forEach(it => { if (!it.qty || Number(it.qty) === old) it.qty = String(n); }); if (d.mode === 'multi') { mountPaperSoon(); return; } }
        if (f === 'date' || /^adj\.\d+\.kind$/.test(f) || f === 'method' || f === 'pFrom' || f === 'pTo') { mountPaperSoon(); return; }
        live(); return; }
      if (t.dataset && t.dataset.t) { let v = t.innerText.replace(/\n+$/, ''); if (!t.dataset.ml) v = v.replace(/\s*\n\s*/g, ' '); DB.texts[RM.doc] = DB.texts[RM.doc] || {}; DB.texts[RM.doc][t.dataset.t] = v; saveSoon(); if (/^l_(adv|due)$/.test(t.dataset.t)) live(); }
    });
    root.addEventListener('change', e => { const t = e.target; if (t.tagName === 'SELECT' && t.dataset.f) { setPath(D(), t.dataset.f, t.value); mountPaperSoon(); } });
    root.addEventListener('keydown', e => { const t = e.target; if (e.key === 'Enter' && t.dataset && t.dataset.t && !t.dataset.ml) { e.preventDefault(); t.blur(); } });
    root.addEventListener('paste', e => { const t = e.target.closest && e.target.closest('[data-t]'); if (!t) return; e.preventDefault(); const s = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, t.dataset.ml ? s : s.replace(/\s*\n\s*/g, ' ')); });
    root.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-act]'); if (!b) return; const d = D(), i = +b.dataset.i;
      ({ addItem: () => { if (d.items.length < 20) d.items.push({ desc: '', qty: String(d.pTo ? monthsBetween(d.pFrom, d.pTo) : 1), rate: '' }); focusLast('items'); },
        rmItem: () => { if (d.items.length > 1) d.items.splice(i, 1); },
        addStu: () => { if (d.students.length < 40) d.students.push({ name: '', grade: '', subject: '', share: '' }); focusLast('students'); },
        rmStu: () => { if (d.students.length > 1) d.students.splice(i, 1); },
        addAdj: () => { if (d.adj.length < 8) d.adj.push({ type: b.dataset.k, label: '', value: '', kind: 'fixed' }); },
        rmAdj: () => { d.adj.splice(i, 1); },
        pack: () => { const sum = d.items.reduce((s, it) => s + (Number(it.rate) || 0), 0); RM.pack = String(sum || ''); redraw(); }
      }[b.dataset.act] || (() => { }))();
      if (b.dataset.act !== 'pack') mountPaper();
    });
  }
  let mT = 0, sT = 0;
  const mountPaperSoon = () => { clearTimeout(mT); mT = setTimeout(() => { const a = root && root.activeElement, f = a && a.dataset && a.dataset.f; mountPaper(); if (f) { const n = root.querySelector('[data-f="' + f + '"]'); if (n) n.focus(); } }, 0); };
  /* label / text edits on the paper: shared for everyone when this role may change the settings, otherwise only on this document */
  const saveSoon = () => { clearTimeout(sT); sT = setTimeout(() => { if (canSet()) save(); }, 600); };
  const focusLast = kind => setTimeout(() => { const all = root && root.querySelectorAll('[data-f^="' + kind + '."][data-f$="' + (kind === 'items' ? '.desc' : '.name') + '"]'); if (all && all.length) all[all.length - 1].focus(); }, 30);

  /* ---------------------------------------------------------------- print, PNG */
  const staticHTML = rec => paperHTML(rec, false);
  function printRec(rec) {
    const size = (rec.look || DB.look).paper === 'A5' ? 'A5' : 'A4';
    const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    const doc = f.contentDocument; doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${E(rec.no || 'Draft')}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cinzel:wght@600;700&display=swap"><style>${PAPER_CSS.replace(':host{all:initial;display:block}', '')}@page{size:${size} portrait;margin:7mm}html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.paper{max-width:none;border:0;border-radius:0;box-shadow:none}${size === 'A5' ? '.paper{zoom:.72}' : ''}</style></head><body>${staticHTML(rec)}</body></html>`);
    doc.close();
    const go2 = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { say('Could not open print. Download the PNG instead.'); } setTimeout(() => f.remove(), 3000); };
    const ready = () => (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(() => setTimeout(go2, 120));
    setTimeout(() => { const imgs = [...doc.images]; Promise.all(imgs.map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; }))).then(ready); }, 60);
  }
  function pngRec(rec, cb) {
    const W = 828, box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + W + 'px';
    document.body.appendChild(box); const sr = box.attachShadow({ mode: 'open' }); sr.innerHTML = `<style>${PAPER_CSS}</style>` + staticHTML(rec);
    setTimeout(() => {
      const H = Math.ceil(sr.querySelector('.paper').getBoundingClientRect().height) + 2; box.remove();
      const css = PAPER_CSS.replace(':host{all:initial;display:block}', '').replace(/@media \(max-width:700px\)\{[\s\S]*\}\s*$/, '');
      const xhtml = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px"><style>${css}</style>${staticHTML(rec).replace(/&nbsp;/g, '&#160;')}</div>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xhtml}</foreignObject></svg>`;
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'), s = 2; c.width = W * s; c.height = H * s; const x = c.getContext('2d'); x.scale(s, s); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0); try { c.toBlob(b => cb(b), 'image/png'); } catch (e) { cb(null); } };
      img.onerror = () => cb(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }, 80);
  }

  /* ---------------------------------------------------------------- actions */
  const API = {
    tab(t) { RM.tab = t; if (t !== 'new') RM.view = null; redraw(); },
    doc(x) { if (!can(modOf(x), 'v')) return; RM.doc = x; RM.view = null; RM.err = {}; RM.pack = ''; msg(''); redraw(); },
    kind(k) { const d = D(); d.kind = k; d.pid = ''; if (k === 'other') { d.idno = ''; d.guardian = ''; } redraw(); },
    mode(m) { D().mode = m; RM.pack = ''; redraw(); },
    cur(c) { if (!CUR.some(x => x[0] === c)) return; D().cur = c; redraw(); },
    pick(v) {
      const d = D(), kind = d.doc === 'salary' ? 'mentor' : d.kind, id = String(v || '').split(' · ')[0].trim();
      const p = people(kind).find(x => x.id === id || x.name.toLowerCase() === String(v).trim().toLowerCase());
      if (!p) { msg('Not found in the list. Type the name on the receipt instead.', true); return; }
      d.pid = p.id; d.idno = p.id; d.phone = p.phone || '';
      if (d.doc === 'salary') { d.name = p.name; d.subjects = p.grade || ''; d.designation = d.designation || 'Mentor'; d.account = p.pay || d.account; }
      else if (kind === 'guardian') { d.name = p.guardian || ''; d.guardian = p.name; d.grade = p.grade || ''; }
      else { d.name = p.name; d.guardian = p.guardian || ''; d.grade = p.grade || ''; }
      delete RM.err.name; msg('Filled from ' + p.id + '. You can still edit everything on the receipt.'); redraw();
    },
    fillEnrol() {
      const d = D(); if (!d.pid) return; const lines = enrolLines(d.pid, d.pFrom); if (!lines.length) { msg('No active enrolments found for this student.', true); return; }
      const n = d.pTo ? monthsBetween(d.pFrom, d.pTo) : 1;
      if (lines.length === 1 && n === 1) { d.mode = 'single'; d.single = { desc: lines[0].desc, amt: String(lines[0].rate) }; }
      else { d.mode = 'multi'; d.items = lines.map(l => ({ desc: l.desc, qty: String(n), rate: String(l.rate) })); }
      msg('Filled ' + lines.length + ' subject' + (lines.length > 1 ? 's' : '') + ' with the fee for ' + ymLabel(d.pFrom) + '.'); redraw();
    },
    fillMentor() {
      const d = D(); if (!d.pid) return; const rows = mentorStudents(d.pid, d.pFrom); if (!rows.length) { msg('No assigned students found for this mentor.', true); return; }
      d.mode = 'per'; d.students = rows; msg('Filled ' + rows.length + ' line' + (rows.length > 1 ? 's' : '') + '. Check each share before saving.'); redraw();
    },
    packApply() { const d = D(), v = $id('rm-packv'), c = d.cur, total = toMinor(v ? v.value : '', c), n = d.items.length; if (total <= 0) { msg('Enter the package price per month.', true); return; } const share = Math.floor(total / n); d.items.forEach((it, i) => { const m = i === n - 1 ? total - share * (n - 1) : share; it.rate = String(m / unit(c)); if (!Number(it.qty)) it.qty = '1'; }); RM.pack = ''; msg('Package applied: ' + money(total, c) + ' per month shared across ' + n + ' line' + (n > 1 ? 's' : '') + '.'); redraw(); },
    packCancel() { RM.pack = ''; redraw(); },
    look(k, v) { if (!guard(RM.doc, 'e', 'change the look')) return; DB.look[k] = v; save(); redraw(); },
    sigOn(v) { D().sigOn = !!v; redraw(); },
    setNext(v) {
      if (!guard(RM.doc, 'e', 'change numbering')) return; const doc = RM.doc, y = (D().date || todayISO()).slice(0, 4), m = String(v).trim().toUpperCase().match(/^([A-Z0-9-]+?)-(\d{4})-(\d{1,6})$/);
      if (!m) { msg('Use the format ' + fmtNo(doc, y, 1) + '.', true); redraw(); return; }
      const [, pre, yr, n] = m; if (yr !== y) { msg('The year must be ' + y + ' (the receipt date).', true); redraw(); return; }
      const oldPre = DB.look.prefix[doc]; DB.look.prefix[doc] = pre; const want = +n - 1, used = Math.max(DB.seq[seqKey(doc, y)] || 0, usedMax(doc, y));
      if (want < used && pre === oldPre) { msg('Numbers up to ' + fmtNo(doc, y, used) + ' are already used. Choose a higher number.', true); DB.look.prefix[doc] = oldPre; redraw(); return; }
      DB.seq[seqKey(doc, y)] = want; save(); msg('Next number set to ' + peekNo(doc, D().date) + '.'); redraw();
    },
    sig(file) {
      if (!guard('salary', 'e', 'change the signature') && !guard('receipt', 'e', 'change the signature')) return; if (!file) return;
      if (!/^image\//.test(file.type)) { msg('Choose an image file.', true); return; } if (file.size > 3e6) { msg('Image is too large (max 3 MB).', true); return; }
      const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 600 / im.width, 200 / im.height), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); DB.sig = c.toDataURL('image/png'); save(); G(() => log('Signature changed', 'Receipt Maker', 'New signature image')); msg('Signature saved. It appears on every document for all staff.'); redraw(); }; im.onerror = () => msg('Could not read that image.', true); im.src = r.result; }; r.readAsDataURL(file);
    },
    sigRemove() { if (!guard(RM.doc, 'e', 'change the signature')) return; DB.sig = ''; save(); msg('Signature removed.'); redraw(); },
    resetTexts() { if (!guard(RM.doc, 'e', 'reset texts')) return; DB.texts[RM.doc] = {}; save(); msg('All labels and texts are back to the original wording.'); redraw(); },
    search(q) { RM.q = q; clearTimeout(API._s); API._s = setTimeout(() => { const pos = document.activeElement && document.activeElement.selectionStart; redraw(); setTimeout(() => { const s = document.querySelector('.rm-tools input'); if (s) { s.focus(); try { s.setSelectionRange(pos, pos); } catch (e) { } } }, 10); }, 220); },
    filter(k) { RM.show = k; redraw(); },
    fresh() { RM.d[RM.doc] = RM.doc === 'salary' ? newSalary() : newReceipt(); RM.view = null; RM.err = {}; RM.tab = 'new'; RM.pack = ''; msg(''); redraw(); },
    open(no) { const r = DB.list.find(x => x.no === no); if (!r || !guard(r.d.doc, 'v', 'open it')) return; RM.view = no; RM.doc = r.d.doc; RM.tab = 'new'; msg(r.void ? 'This document was voided: ' + (r.voidReason || '') : 'Opened ' + no + ' for reprinting. Click New to start a fresh one.', !!r.void); redraw(); },
    issue(andPrint) {
      if (RM.busy) return; const doc = RM.doc; if (!guard(doc, 'a', 'issue ' + (doc === 'salary' ? 'salary slips' : 'receipts'))) return;
      const d = D(), e = validate(d); RM.err = e;
      if (Object.keys(e).length) { msg('Please fix: ' + [...new Set(Object.values(e))].join(' · '), true); redraw(); setTimeout(() => { const f = root && root.querySelector('.err'); if (f) f.focus(); }, 40); return; }
      if (navigator.onLine === false) { msg('No internet. A receipt number is given by the server, so issuing needs the internet. Your draft is kept.', true); return; }
      RM.busy = true; const b = $id('rm-issue'); if (b) { b.disabled = true; b.textContent = 'Saving…'; }
      (async () => {
        let rec = null, arr = null;
        try {
          /* the latest numbers from everyone first */
          if (FTA.pull) { try { await Promise.race([FTA.pull(), new Promise(r => setTimeout(r, 6000))]); } catch (x) { } }
          load();
          const snap = JSON.parse(JSON.stringify(d));
          if (snap.doc === 'receipt') snap.items = snap.items.filter(i => i.desc || Number(i.qty) || Number(i.rate)); else snap.students = snap.students.filter(s => s.name || Number(s.share));
          snap.adj = snap.adj.filter(a => Number(a.value) > 0);
          const no = takeNo(doc, snap.date), tok = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          rec = { id: no, no, tok, d: snap, calc: calc(snap), look: JSON.parse(JSON.stringify(DB.look)), texts: JSON.parse(JSON.stringify(DB.texts[doc] || {})), time: bdNow(), by: meNow().name, byRole: meNow().role, at: new Date().toISOString(), void: false };
          if (snap.doc === 'salary' && !snap.sigOn) rec.look.showSig = false;
          arr = listOf(doc); arr.push(rec); MINE.set(no, tok);
          if (FTA.sync) await FTA.sync();
          const back = arr.find(x => x && x.id === no);
          if (!back || back.tok !== tok) {
            /* someone else took this number a moment earlier: the server refused ours, the draft is kept */
            MINE.delete(no); load();
            msg('This receipt number was just used by someone else. Press Save again to take the next number.', true); say('Not saved: number already used');
            return;
          }
          const pending = G(() => FTA.pending && FTA.pending()) || 0, st = G(() => FTA.status && FTA.status());
          load();
          G(() => log(doc === 'salary' ? 'Salary slip issued' : 'Receipt issued', no, snap.name + ' · ' + money(rec.calc.paid, snap.cur)));
          G(() => SCH.log(doc === 'salary' ? 'Salary slip issued' : 'Receipt issued', no + ' · ' + snap.name + ' · ' + money(rec.calc.paid, snap.cur), 'ok'));
          RM.view = no; RM.err = {}; RM.d[doc] = doc === 'salary' ? newSalary() : newReceipt();
          if (pending || (st && st !== 'saved')) { msg('Saved as ' + no + ' on this device. It is sent as soon as the internet is back — print after the status shows Saved.', true); say((doc === 'salary' ? 'Salary slip ' : 'Receipt ') + no + ' waiting for the internet'); return; }
          msg('Saved as ' + no + '.' + (andPrint ? ' Opening print…' : '')); say((doc === 'salary' ? 'Salary slip ' : 'Receipt ') + no + ' issued');
          if (andPrint) setTimeout(() => printRec(rec), 150);
        } catch (x) {
          console.error(x); msg('Could not save: ' + (x && x.message || x), true);
        } finally { RM.busy = false; redraw(); }
      })();
    },
    print() { const r = curRec(); printRec(r); },
    png() { const r = curRec(); pngRec(r, b => { if (!b) { say('This browser could not make the image. Use Print → Save as PDF.'); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (r.no || 'draft-' + (r.d.doc === 'salary' ? 'salary' : 'receipt')) + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }); },
    dup(no) { const r = DB.list.find(x => x.no === no); if (!r || !guard(r.d.doc, 'a', 'make documents')) return; const d = JSON.parse(JSON.stringify(r.d)); d.date = todayISO(); d.paid = ''; d.txn = ''; if (d.doc === 'receipt') d.receivedBy = meNow().name; RM.doc = d.doc; RM.d[d.doc] = d; RM.view = null; RM.err = {}; RM.tab = 'new'; msg('Copied ' + no + ' into a new draft. Check the month and amounts, then save.'); redraw(); },
    voidAsk(no) {
      const r = DB.list.find(x => x.no === no); if (!r || r.void || !guard(r.d.doc, 'd', 'void documents')) return;
      G(() => sheet('VOID', E(no), `<p>The document stays in the list marked <b>VOID</b> (it is never deleted, so the record is safe). Write why.</p><label class="rm-l">Reason<textarea id="rm-vr" rows="3" maxlength="240" placeholder="e.g. Wrong amount, re-issued as a new receipt"></textarea></label><div class="acts"><button type="button" class="btn" onclick="closeSheet()">Cancel</button><button type="button" class="btn p" id="rm-vb" onclick="FTA_RECEIPT.voidDo('${E(no)}')">Void ${E(no)}</button></div>`));
      setTimeout(() => { const t = $id('rm-vr'); if (t) t.focus(); }, 60);
    },
    voidDo(no) {
      const r = DB.list.find(x => x.no === no), why = (($id('rm-vr') || {}).value || '').trim(); if (!r || r.void || !guard(r.d.doc, 'd', 'void documents')) return;
      if (why.length < 3) { say('Write a reason'); const t = $id('rm-vr'); if (t) t.focus(); return; }
      const b = $id('rm-vb'); if (b) { if (b.disabled) return; b.disabled = true; }
      const live = listOf(r.d.doc).find(x => x && x.id === no); if (!live) { say('This document is not on the server yet'); return; }
      /* the server stamps who voided it and when; nothing else of an issued document can change */
      live.void = true; live.voidReason = why; live.voidBy = meNow().name; live.voidAt = new Date().toISOString();
      G(() => closeSheet()); msg('Voiding ' + no + '…');
      (async () => {
        if (FTA.sync) { try { await FTA.sync(); } catch (x) { } }
        const back = listOf(r.d.doc).find(x => x && x.id === no); load();
        if (back && back.void) { G(() => log('Document voided', no, why)); G(() => SCH.log('Document voided', no + ' · ' + why, 'warn')); say(no + ' voided'); msg(no + ' is now VOID.'); }
        else { say('Not voided'); msg('The server did not void ' + no + '. Check your permission and the internet.', true); }
        redraw();
      })();
    },
    tplSave() {
      if (!guard(RM.doc, 'e', 'save templates')) return; const d = D();
      const name = (prompt('Template name', (RM.doc === 'salary' ? (d.mode === 'fixed' ? 'Fixed salary' : 'Per student salary') : (d.mode === 'single' ? 'Single subject' : d.items.length + ' subjects')) + ' · ' + d.cur) || '').trim();
      if (!name) return; if (DB.tpls.length >= 40) { say('You can keep up to 40 templates'); return; }
      const keep = JSON.parse(JSON.stringify(d)); ['pid', 'name', 'idno', 'guardian', 'phone', 'txn', 'paid'].forEach(k => { keep[k] = ''; }); if (keep.doc === 'salary') { keep.students = keep.students.map(s => ({ name: '', grade: s.grade, subject: s.subject, share: s.share })); }
      DB.tpls.push({ name: name.slice(0, 60), doc: RM.doc, d: keep, look: JSON.parse(JSON.stringify(DB.look)), texts: JSON.parse(JSON.stringify(DB.texts[RM.doc] || {})) }); save(); say('Template saved'); redraw();
    },
    tplUse(i) { const t = DB.tpls[i]; if (!t || !guard(t.doc, 'a', 'make documents')) return; const d = JSON.parse(JSON.stringify(t.d)); d.date = todayISO(); d.pFrom = ym(new Date()); d.pTo = ''; if (d.doc === 'receipt') d.receivedBy = meNow().name; RM.doc = t.doc; RM.d[t.doc] = d; if (can(modOf(t.doc), 'e')) { DB.look = Object.assign(LOOK0(), t.look); DB.texts[t.doc] = JSON.parse(JSON.stringify(t.texts || {})); save(); } RM.view = null; RM.tab = 'new'; msg('Template "' + t.name + '" ready. Fill in the name and amounts.'); redraw(); },
    tplDel(i) { const t = DB.tpls[i]; if (!t || !guard(t.doc, 'e', 'delete templates')) return; DB.tpls.splice(i, 1); save(); say('Template deleted'); redraw(); },
    /* for tests */
    _db: () => DB, _rm: () => RM, _calc: calc, _words: words, _money: money, _paper: (r, ed) => paperHTML(r || curRec(), !!ed), _png: pngRec
  };
  window.FTA_RECEIPT = API;

  /* ---------------------------------------------------------------- registration into the app (from outside) */
  let registered = false;
  /* default access until the Owner saves the Permissions table (portal.js FTA_MODS); salary slips follow the role's own Payroll permission */
  function grant() {
    const M = window.FTA_MODS; if (!M) return false;
    if (G(() => SCH.MODS.some(m => m[0] === M_RC)) && G(() => SCH.MODS.some(m => m[0] === M_SL))) return false;
    M.add(M_RC, 'Receipt Maker · receipts', [PAGE], 'vaed', 'b', GRANT_RC);
    M.add(M_SL, 'Receipt Maker · salary slips', [PAGE], 'vaed', 'b', (r, P0) => SCH.kindOf(r) !== 'o' ? '' : r === 'Owner' ? 'vaed' : String(P0.payroll || '').replace(/[^vaed]/g, ''));
    M.refresh();
    return true;
  }
  function register() {
    if (registered || typeof NAV === 'undefined' || typeof PAGES === 'undefined' || !G(() => SCH.MODS) || !G(() => SCH.PERM) || !window.FTA_MODS) return;
    const IC = typeof P === 'object' && P && P.receipt ? 'receipt' : 'doc';
    PAGE_ICON[PAGE] = IC;
    if (!FLAT.some(f => f[0] === PAGE)) FLAT.push([PAGE, 'Receipt Maker', IC]);
    SUBS[PAGE] = 'Payment receipts and salary slips for anyone, any time';
    const g = NAV.find(x => x[0] === 'Students'), it = [PAGE, 'Receipt Maker', IC];
    if (g) { if (!g[1].some(x => x[0] === PAGE)) { const at = g[1].findIndex(x => x[0] === 'payments'); g[1].splice(at < 0 ? g[1].length : at + 1, 0, it); } } else NAV.push(['Office', [it]]);
    PAGES[PAGE] = () => render(false);
    grant();
    registered = true;
    if (G(() => ST.page) === PAGE) FORCE = true;
    if (!$id('cx-root')) G(() => window.render());
  }
  /* documents issued here that the server has not confirmed yet: if another device took the number first, say so */
  const MINE = new Map();
  let SIG = '';
  function tick() {
    register(); if (registered && grant() && G(() => ST.page) !== PAGE && !$id('cx-root')) G(() => window.render());
    MINE.forEach((tok, no) => { const r = FTA.RCPT.concat(FTA.RCSAL).find(x => x && x.id === no); if (r && r.tok === tok && !(G(() => FTA.pending && FTA.pending()) || 0)) MINE.delete(no); else if (!r || r.tok !== tok) { MINE.delete(no); say('Receipt ' + no + ' was not accepted: another device used that number first. Open Receipt Maker and issue it again.'); } });
    /* new or voided documents from other people: refresh the open list (never while typing on the paper) */
    const sig = FTA.RCPT.length + '|' + FTA.RCSAL.length + '|' + FTA.RCPT.concat(FTA.RCSAL).filter(r => r && r.void).length + '|' + G(() => JSON.stringify(SETREC() || {}).length);
    if (sig !== SIG) { SIG = sig; load(); const typing = root && root.activeElement; if (G(() => ST.page) === PAGE && !RM.busy && (RM.tab !== 'new' || !typing)) redraw(); }
  }
  const _go = window.go;
  if (typeof _go === 'function') window.go = function (p) { if (p === PAGE) FORCE = true; return _go.apply(this, arguments); };
  window.addEventListener('fta:started', () => register());
  window.addEventListener('fta:started', () => { SIG = ''; load(); });
  setTimeout(tick, 400); setInterval(tick, 2000);
})();
