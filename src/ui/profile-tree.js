/* =====================================================================
   FTA · PROFILE TREE (live app)
   An org-chart view of one person: root card → branch cards → child cards.
   Mentor:  Contact & info · Specialties · Note / Bio · Availability · Mentorship slots (→ one card per student)
   Student: Contact & guardian · About me · Subjects (→ one card per programme) · Attendance · Payments
   Where:   Mentors page "View tree" (modal) · Profiles (cx-people) · My Profile (tp-profile / sp-profile)
   Edits write straight into the record (MENTORS / STUDENTS / ENROL), then log() + toast(); the app syncs.
   A mentor / student changes only their own row; the server keeps only the fields they may change
   (fta-policy.js SELF). A mentor's own new slot is a 'slotreq' record the office approves or declines.
   Public:  window.FTA_TREE = { mount(host, pid, opts), open(pid, opts), close() }
   ===================================================================== */
(function () {
  'use strict';
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = t => G(() => toast(t));
  const cash = n => n == null || n === '' ? '—' : (G(() => money(n)) || ('BDT ' + Number(n).toLocaleString('en-IN')));
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ym = () => new Date().toISOString().slice(0, 7);
  const mon = d => { const x = new Date(String(d || '').slice(0, 10)); return isNaN(x) ? (d || '') : x.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); };
  const dshort = d => { const x = new Date(String(d || '').slice(0, 10)); return isNaN(x) ? (d || '') : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const reduced = () => G(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------------------------------------------------------------- icons (hairline, 24 grid) */
  const I = {
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.2a11 11 0 0 0 6.3 6.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/>',
    quill: '<path d="M20 4c-6 0-11 4-13 11l-2 5"/><path d="M7 15c4 0 8-2 10-6"/><path d="M5 20h6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.3c2.3.2 4 1.8 4.8 4.7"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11" rx="2"/><path d="M16 13.5h2"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-3.8 3.8-6 7-6s6 2.2 7 6"/>',
    chev: '<path d="M7 10l5 5 5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    fit: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    cam: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.2"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    tree: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M5 17v-2.5h14V17M12 12v5"/>',
    fold: '<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>'
  };
  const ico = (k, c) => '<svg class="pt-i' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (I[k] || '') + '</svg>';

  /* ---------------------------------------------------------------- data from the app */
  const isM = pid => /^MEN-/.test(pid || '');
  const rec = pid => isM(pid) ? G(() => MENTORS.find(x => x.id === pid)) : G(() => STUDENTS.find(x => x.id === pid));
  const pname = pid => (rec(pid) || {}).name || pid || '—';
  const GROUPS = () => G(() => SCH.GROUPS) || [];
  const prog = id => G(() => PROGS.find(p => p.id === id));
  const firstName = n => String(n || '').split(/\s+/)[0];
  function whenOf(gid) {
    if (!gid) return '';
    const R = G(() => SCH.ROUT) || {}, D = G(() => SCH.DAYS) || ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'], P = G(() => SCH.PER) || [];
    const by = {};
    Object.keys(R).forEach(k => { if ((R[k] || []).includes(gid)) { const [d, p] = k.split('|'); (by[d] = by[d] || []).push(p); } });
    return D.filter(d => by[d]).map(d => d + ' ' + by[d].sort((a, b) => P.findIndex(x => x[0] === a) - P.findIndex(x => x[0] === b)).map(p => (P.find(x => x[0] === p) || [p, p])[1]).join(' & ')).join(' · ');
  }
  function feeOf(e, p) {
    const now = ym(), f = ((e && e.fees) || []).filter(x => !x.from || x.from <= now).sort((a, b) => String(a.from).localeCompare(String(b.from))).pop();
    return f ? f.fee : p ? p.fee : null;
  }
  const subjOf = (p, g) => p ? (p.subject || p.name) : g ? g.name : '—';
  const dead = s => /ended|cancel|inactive|left|dropped/i.test(s || '');
  function kidsOfMentor(id) {
    const out = new Map();
    GROUPS().filter(g => g.mentor === id && !dead(g.status)).forEach(g => (g.stu || []).forEach(s => out.set(s + '|' + g.prog, { k: s + '|' + g.prog, stu: s, prog: g.prog, g })));
    (G(() => ENROL) || []).filter(e => e.mentor === id).forEach(e => {
      const k = e.stu + '|' + e.prog, o = out.get(k) || { k, stu: e.stu, prog: e.prog };
      if (!out.has(k) && dead(e.status)) return;
      o.e = e; if (!o.g) o.g = GROUPS().find(g => g.mentor === id && g.prog === e.prog && (g.stu || []).includes(e.stu));
      out.set(k, o);
    });
    const list = [...out.values()].map(o => {
      const p = prog(o.prog), s = rec(o.stu) || {}, src = o.e || o.g || {};
      return { k: o.k, pid: o.stu, title: s.name || o.stu, status: (o.e && o.e.status) || s.status || 'Active', subject: subjOf(p, o.g), grade: s.cls || '—', when: src.whenNote || whenOf(o.g && o.g.id) || '', medium: src.medium || 'In person', type: (o.e && o.e.type) || (p && p.type) || '', src };
    });
    const r = rec(id) || {};
    (r.slotsPlan || []).forEach(x => { const s = rec(x.stu) || {}, p = prog(x.prog); list.push({ k: 'plan:' + x.id, plan: x, pid: x.stu, title: x.stu ? (s.name || x.stu) : 'Open slot', open: !x.stu, status: x.stu ? 'Planned' : 'Open', subject: subjOf(p), grade: x.stu ? (s.cls || '—') : (x.grade || 'Any grade'), when: x.when || '', medium: x.medium || 'In person', note: x.note || '', by: x.by || '', src: x }); });
    /* slots the mentor added themselves: waiting for the office to approve */
    (overlay(id).slotsReq || []).forEach(x => { const s = rec(x.stu) || {}, p = prog(x.prog); list.push({ k: 'req:' + x.id, plan: x, req: true, pid: x.stu, title: x.stu ? (s.name || x.stu) : 'Open slot', open: !x.stu, status: 'Requested', subject: subjOf(p), grade: x.stu ? (s.cls || '—') : (x.grade || 'Any grade'), when: x.when || '', medium: x.medium || 'In person', note: x.note || '', by: 'mentor', src: x }); });
    return list.sort((a, b) => (a.plan ? 1 : 0) - (b.plan ? 1 : 0) || (dead(a.status) ? 1 : 0) - (dead(b.status) ? 1 : 0) || a.title.localeCompare(b.title));
  }
  function kidsOfStudent(id) {
    const out = [];
    (G(() => ENROL) || []).filter(e => e.stu === id && !dead(e.status)).forEach(e => {
      const p = prog(e.prog), g = GROUPS().find(x => x.prog === e.prog && x.mentor === e.mentor && (x.stu || []).includes(id));
      out.push({ k: e.id || (e.prog + '|' + e.mentor), pid: e.mentor, title: p ? p.name : e.prog, status: e.status || 'Active', mentor: e.mentor, fee: feeOf(e, p), when: e.whenNote || whenOf(g && g.id), medium: e.medium || 'In person', type: e.type || (p && p.type) || '', src: e, gid: g && g.id });
    });
    GROUPS().filter(g => (g.stu || []).includes(id) && !dead(g.status) && !out.some(o => o.gid === g.id)).forEach(g => { const p = prog(g.prog); out.push({ k: 'g:' + g.id, pid: g.mentor, title: g.name, status: 'Active', mentor: g.mentor, fee: p ? p.fee : null, when: g.whenNote || whenOf(g.id), medium: g.medium || 'In person', type: p && p.type || 'Class', src: g, gid: g.id }); });
    return out;
  }
  function attOf(pid) {
    const o = { P: 0, A: 0, L: 0, held: 0, recent: [] };
    Object.entries(G(() => SCH.ATT) || {}).forEach(([k, v]) => {
      const [gid, d] = k.split('|'), g = GROUPS().find(x => x.id === gid);
      if (isM(pid)) { if (g && g.mentor === pid) o.held++; return; }
      const s = v && v.marks && v.marks[pid]; if (!s) return; o[s] = (o[s] || 0) + 1; o.recent.push([d, g ? g.name : gid, s]);
    });
    o.recent.sort((a, b) => b[0].localeCompare(a[0]));
    const n = o.P + o.A + o.L; o.pct = n ? Math.round((o.P + o.L) / n * 100) : null;
    return o;
  }
  function payOf(pid) {
    const L = (G(() => PAYMENTS.filter(p => p.stu === pid)) || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const yr = String(new Date().getFullYear());
    return { due: G(() => studentDue(pid)), last: L[0], year: L.filter(p => String(p.date).startsWith(yr) && !/reject|void/i.test(p.status || '')).reduce((t, p) => t + (+p.amt || 0), 0), n: L.length, pending: L.filter(p => /pending|review/i.test(p.status || '')).length };
  }
  const MODEL = { pct_fee: '% of agreed fee', per_student: 'Fixed per student', per_class: 'Per class', pct_coll: '% of actual collection', pct_collection: '% of actual collection', batch: 'Batch-based', fixed: 'Fixed monthly', monthly: 'Fixed monthly' };
  const contract = r => { const m = String(r.model || ''); if (!m) return '—'; const pct = /^pct/.test(m); return (pct ? (r.rate != null ? r.rate + '%' : '') + ' ' + (MODEL[m] || m).replace(/^%\s*/, '') : (MODEL[m] || m) + (r.rate ? ' · ' + cash(r.rate) : '')).trim(); };

  /* ---------------------------------------------------------------- what each branch holds and who may change it
     w: 'S' the person themselves + office · 'O' office only · 'X' office only and hidden from others · 'R' read-only here */
  const F = (k, l, t, w, ph) => ({ k, l, t, w, ph: ph || '' });
  const MENTOR = [
    { b: 'contact', title: 'Contact & info', icon: 'phone', fields: [F('name', 'Full name', 'text', 'X'), F('phone', 'Phone · WhatsApp', 'tel', 'S', '01XXX-XXXXXX'), F('gmail', 'Email · Google sign-in', 'email', 'O', 'name@gmail.com'), F('address', 'Address', 'text', 'S', 'House, road, area'), F('emergency', 'Emergency contact', 'text', 'O', 'Name · phone'), F('pay', 'Salary account', 'text', 'S', 'bKash / bank account')] },
    { b: 'spec', title: 'Specialties', icon: 'gem', fields: [F('subjects', 'Subjects taught', 'text', 'O'), F('specialties', 'Specialties', 'chips', 'S', 'Add and press Enter'), F('qual', 'Qualifications', 'area', 'S', 'Degrees, certificates…'), F('exp', 'Experience', 'text', 'O', 'e.g. 6 years')] },
    { b: 'note', title: 'Note · Bio', icon: 'quill', fields: [F('bio', 'About', 'area', 'S', 'Education, experience, teaching style…'), F('notes', 'Office note', 'area', 'X', 'Only the office sees this')] },
    { b: 'avail', title: 'Availability', icon: 'clock', fields: [F('availability', 'When free', 'area', 'S', 'e.g. Free after 4 pm on Friday and Saturday…')], extra: 'routine' },
    { b: 'slots', title: 'Mentorship slots', icon: 'users', fields: [F('slotsPreferred', 'Preferred students', 'number', 'S', 'e.g. 5')], extra: 'slots', kids: true }
  ];
  const STUDENT = [
    { b: 'contact', title: 'Contact & guardian', icon: 'phone', fields: [F('name', 'Full name', 'text', 'X'), F('phone', 'Phone', 'tel', 'O'), F('gmail', 'Email · Google sign-in', 'email', 'O'), F('guardian', 'Guardian', 'text', 'O'), F('gphone', 'Guardian phone', 'tel', 'O'), F('address', 'Address', 'text', 'S', 'House, road, area')] },
    { b: 'about', title: 'About me', icon: 'quill', fields: [F('bio', 'About me', 'area', 'S', 'Hobbies, goals, what helps me learn…'), F('school', 'School', 'text', 'O'), F('cls', 'Class · level', 'text', 'O'), F('board', 'Board', 'text', 'O')] },
    { b: 'subj', title: 'Subjects', icon: 'book', fields: [], extra: 'subjects', kids: true },
    { b: 'att', title: 'Attendance', icon: 'cal', fields: [], extra: 'attendance' },
    { b: 'pay', title: 'Payments', icon: 'wallet', fields: [], extra: 'payments' }
  ];
  const schema = pid => isM(pid) ? MENTOR : STUDENT;
  const shown = (f, mode) => f.w !== 'X' || mode === 'office';
  const editable = (f, mode) => mode !== 'view' && f.w !== 'R' && (mode === 'office' || f.w === 'S');

  /* ---------------------------------------------------------------- per-person view state (kept across redraws) */
  const ST = {};
  const stOf = pid => ST[pid] || (ST[pid] = { closed: {}, drafts: {}, kedit: null, kdraft: {}, adding: false, add: {} });
  const INST = new Set();
  /* slot requests a mentor sent and the office has not answered yet (synced collection 'slotreq') */
  const SLOTS = () => (window.FTA && Array.isArray(window.FTA.SLOTREQ)) ? window.FTA.SLOTREQ : [];
  const overlay = pid => /^MEN-/.test(pid) ? { slotsReq: SLOTS().filter(x => x && x.mentor === pid && (x.status || 'Pending') === 'Pending') } : {};
  /* kept for the public API: a change goes straight onto the real record (the server keeps only what this person may change) */
  function remember(pid, obj) { const r = rec(pid); if (!r || !obj) return; Object.keys(obj).forEach(k => { if (k !== 'slotsReq') r[k] = obj[k]; }); }
  const sync = () => G(() => window.FTA && window.FTA.sync && window.FTA.sync());
  let SEQ = 0;

  /* ---------------------------------------------------------------- HTML */
  function fieldHtml(inst, b, f) {
    const r = inst.r, st = inst.st, d = (st.drafts[b] || {}), has = Object.prototype.hasOwnProperty.call(d, f.k);
    const v = has ? d[f.k] : (r[f.k] == null ? '' : r[f.k]), id = 'ptf-' + inst.uid + '-' + f.k, ed = editable(f, inst.mode);
    const hint = !ed && inst.mode !== 'view' ? (f.w === 'R' ? 'change on Mentors page' : 'set by the office') : '';
    let ctl;
    if (!ed) {
      if (f.t === 'chips') ctl = chips(v, false, inst, f);
      else ctl = '<div class="pt-val' + (v === '' ? ' is-empty' : '') + (f.t === 'area' ? ' is-area' : '') + '" id="' + id + '">' + (v === '' ? 'Not added yet' : h(v)) + '</div>';
    } else if (f.t === 'area') ctl = '<textarea id="' + id + '" data-f="' + f.k + '" data-b="' + b + '" rows="3" placeholder="' + h(f.ph) + '">' + h(v) + '</textarea>';
    else if (f.t === 'chips') ctl = chips(v, true, inst, f, id, b);
    else ctl = '<input id="' + id + '" data-f="' + f.k + '" data-b="' + b + '" type="' + (f.t === 'number' ? 'number' : f.t === 'email' ? 'email' : f.t === 'tel' ? 'tel' : 'text') + '"' + (f.t === 'number' ? ' min="0" inputmode="numeric"' : '') + ' value="' + h(v) + '" placeholder="' + h(f.ph) + '" autocomplete="off">';
    return '<div class="pt-f' + (ed ? ' is-ed' : ' is-ro') + '"><label class="pt-l" for="' + id + '">' + h(f.l) + (hint ? '<span class="pt-lock" title="' + (f.w === 'R' ? 'Change this on the Mentors page' : 'Set by the office') + '">' + ico('lock') + '<span class="pt-sr">' + hint + '</span></span>' : '') + '</label>' + ctl + '</div>';
  }
  function chips(v, ed, inst, f, id, b) {
    const L = String(v || '').split(/\s*,\s*/).filter(Boolean);
    return '<div class="pt-chips' + (ed ? ' is-ed' : '') + '">' + L.map((c, i) => '<span class="pt-chip">' + h(c) + (ed ? '<button type="button" data-act="chipx" data-b="' + b + '" data-f="' + f.k + '" data-i="' + i + '" aria-label="Remove ' + h(c) + '">' + ico('x') + '</button>' : '') + '</span>').join('') + (!L.length && !ed ? '<span class="pt-val is-empty">Nothing added yet</span>' : '') +
      (ed ? '<input id="' + id + '" class="pt-chipin" data-chip="' + f.k + '" data-b="' + b + '" type="text" placeholder="' + h(f.ph) + '" autocomplete="off">' : '') + '</div>';
  }
  const badge = s => '<span class="pt-st ' + (/^active$/i.test(s) ? 'ok' : /planned|^open$/i.test(s) ? 'plan' : /pause|hold|pending|request/i.test(s) ? 'warn' : 'off') + '"><i></i>' + h(s || '—') + '</span>';

  function rootHtml(inst) {
    const r = inst.r, m = isM(inst.pid), mode = inst.mode;
    const canPhoto = mode !== 'view';
    const av = '<div class="pt-av">' + (r.photo ? '<img src="' + h(r.photo) + '" alt="">' : '<span>' + h(initials(r.name)) + '</span>') +
      (canPhoto ? '<button type="button" class="pt-avb" data-act="photo" aria-label="Change photo" title="Change photo">' + ico('cam') + '</button><input type="file" accept="image/*" class="pt-file" hidden>' : '') + '</div>';
    let stats, sub, chipsRow, extra = '';
    if (m) {
      const kids = inst.kids, act = new Set(kids.filter(k => !k.plan && /^active$/i.test(k.status)).map(k => k.pid)).size;
      stats = [[act, 'Active students'], [kids.length, 'Slots'], [r.slotsPreferred || '—', 'Preferred']];
      sub = h(r.id) + (r.join ? ' · Mentor since ' + h(mon(r.join)) : '');
      chipsRow = badge(r.status) + String(r.subjects || '').split(/\s*[,/]\s*/).filter(Boolean).map(s => '<span class="pt-chip">' + h(s) + '</span>').join('');
      extra = '<div class="pt-contract">' + ico('lock') + '<span><b>Contract</b> ' + h(contract(r)) + '</span>' + (mode === 'view' ? '' : '<small>' + (mode === 'office' ? 'change on Mentors page' : 'set by the office') + '</small>') + '</div>';
    } else {
      const a = attOf(inst.pid), p = payOf(inst.pid);
      stats = [[inst.kids.length, 'Classes'], [a.pct == null ? '—' : a.pct + '%', 'Attendance'], [p.due == null ? '—' : cash(p.due), 'Due']];
      sub = h(r.id) + (r.joined ? ' · Since ' + h(mon(r.joined)) : '');
      chipsRow = badge(r.status) + (r.cls ? '<span class="pt-chip">' + h(r.cls) + '</span>' : '') + (r.board ? '<span class="pt-chip">' + h(r.board) + '</span>' : '');
    }
    return '<article class="pt-card pt-root" aria-label="' + h(r.name) + '">' + av + '<div class="pt-rinfo"><p class="pt-eyebrow">' + (m ? 'Mentor' : 'Student') + '</p><div class="pt-name" role="heading" aria-level="3">' + h(r.name) + '</div><p class="pt-id">' + sub + '</p><div class="pt-badges">' + chipsRow + '</div></div>' +
      '<div class="pt-stats">' + stats.map(s => '<div><b>' + h(s[0]) + '</b><span>' + h(s[1]) + '</span></div>').join('') + '</div>' + extra + '</article>';
  }

  function extraHtml(inst, br) {
    const r = inst.r, pid = inst.pid;
    if (br.extra === 'routine') {
      const gs = GROUPS().filter(g => g.mentor === pid && !dead(g.status)), a = attOf(pid);
      const rows = gs.map(g => [g.name, whenOf(g.id)]).filter(x => x[1]);
      return '<div class="pt-sec"><p class="pt-l">On the routine</p>' + (rows.length ? '<ul class="pt-rows pt-when">' + rows.map(x => '<li><span>' + h(x[0]) + '</span><em>' + x[1].split(' · ').map(d => '<i>' + h(d) + '</i>').join('') + '</em></li>').join('') + '</ul>' : '<p class="pt-val is-empty">No routine slots yet</p>') + '<p class="pt-foot">' + a.held + ' classes marked so far</p></div>';
    }
    if (br.extra === 'slots') {
      const gs = GROUPS().filter(g => g.mentor === pid && !dead(g.status)), real = inst.kids.filter(k => !k.plan).length, req = inst.kids.filter(k => k.req).length, plan = inst.kids.length - real - req;
      return '<div class="pt-big"><b>' + inst.kids.length + '</b><span>' + real + ' student' + (real === 1 ? '' : 's') + (plan ? ' · ' + plan + ' planned' : '') + (req ? ' · ' + req + ' waiting for approval' : '') + '<br>' + gs.length + ' class' + (gs.length === 1 ? '' : 'es') + '</span></div>' + (gs.length ? '<div class="pt-chips">' + gs.map(g => '<span class="pt-chip">' + h(g.name) + ' · ' + (g.stu || []).length + '</span>').join('') + '</div>' : '');
    }
    if (br.extra === 'subjects') {
      const tot = inst.kids.reduce((t, k) => t + (+k.fee || 0), 0);
      return '<div class="pt-big"><b>' + inst.kids.length + '</b><span>programme' + (inst.kids.length === 1 ? '' : 's') + '<br>' + (tot ? cash(tot) + ' a month' : inst.mode === 'self' ? 'fees on your invoices' : 'no fee set') + '</span></div>';
    }
    if (br.extra === 'attendance') {
      const a = attOf(pid), p = a.pct == null ? 0 : a.pct, C = 2 * Math.PI * 22;
      return '<div class="pt-att"><svg viewBox="0 0 56 56" class="pt-ring" role="img" aria-label="Attendance ' + (a.pct == null ? 'not recorded' : a.pct + ' percent') + '"><circle cx="28" cy="28" r="22" class="pt-ring-t"/><circle cx="28" cy="28" r="22" class="pt-ring-v" stroke-dasharray="' + (C * p / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 28 28)"/><text x="28" y="32" text-anchor="middle">' + (a.pct == null ? '—' : a.pct + '%') + '</text></svg>' +
        '<dl class="pt-mini"><div><dt>Present</dt><dd>' + a.P + '</dd></div><div><dt>Late</dt><dd>' + a.L + '</dd></div><div><dt>Absent</dt><dd>' + a.A + '</dd></div></dl></div>' +
        (a.recent.length ? '<ul class="pt-rows">' + a.recent.slice(0, 3).map(x => '<li><span>' + h(dshort(x[0])) + ' · ' + h(x[1]) + '</span><b class="pt-m-' + x[2] + '">' + ({ P: 'Present', A: 'Absent', L: 'Late' }[x[2]] || h(x[2])) + '</b></li>').join('') + '</ul>' : '<p class="pt-val is-empty">No classes marked yet</p>');
    }
    if (br.extra === 'payments') {
      const p = payOf(pid);
      return '<div class="pt-big' + ((+p.due || 0) > 0 ? ' is-due' : '') + '"><b>' + h(cash(p.due)) + '</b><span>due now</span></div><ul class="pt-rows">' +
        '<li><span>Last payment</span><b>' + (p.last ? h(dshort(p.last.date)) + ' · ' + h(cash(p.last.amt)) : '—') + '</b></li>' +
        (p.last && p.last.method ? '<li><span>Method</span><b>' + h(p.last.method) + (p.last.status ? ' · ' + h(p.last.status) : '') + '</b></li>' : '') +
        '<li><span>Paid this year</span><b>' + h(cash(p.year)) + '</b></li><li><span>Receipts</span><b>' + p.n + (p.pending ? ' · ' + p.pending + ' to verify' : '') + '</b></li></ul>';
    }
    return '';
  }

  function kidHtml(inst, k) {
    const mode = inst.mode, st = inst.st, m = isM(inst.pid), editing = st.kedit === k.k && mode === 'office';
    const rows = m ? [['Subject', k.subject + (k.type ? ' · ' + k.type : '')], ['Grade', k.grade], ['When', k.when || 'Not on the routine yet'], ['Medium', k.medium]].concat(k.note ? [['Note', k.note]] : []).concat(k.req ? [['Added by', 'The mentor · waiting for the office']] : k.by === 'mentor' ? [['Added by', 'The mentor · approved']] : [])
      : [['Mentor', pname(k.mentor)], ['Fee', k.fee == null ? '—' : cash(k.fee) + ' / month'], ['When', k.when || 'Not on the routine yet'], ['Medium', k.medium]];
    let body;
    if (editing) {
      const d = st.kdraft, id = 'ptk-' + inst.uid;
      body = '<div class="pt-kform"><div class="pt-f is-ed"><label class="pt-l" for="' + id + '-m">Medium</label><select id="' + id + '-m" data-kf="medium">' + ['In person', 'Online', 'Hybrid'].map(o => '<option' + ((d.medium || k.medium) === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
        '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-w">When</label><textarea id="' + id + '-w" data-kf="when" rows="2" placeholder="e.g. Sun, Mon & Wed · 10–11 am">' + h(d.when != null ? d.when : k.when) + '</textarea></div>' +
        '<div class="pt-kacts"><button type="button" class="pt-btn" data-act="kcancel">Cancel</button><button type="button" class="pt-btn is-gold" data-act="ksave" data-kid="' + h(k.k) + '">' + ico('check') + 'Save</button></div></div>';
    } else {
      body = '<dl class="pt-kv">' + rows.map(x => '<div><dt>' + x[0] + '</dt><dd>' + (x[0] === 'When' ? h(x[1]).split(' · ').join('<br>') : h(x[1])) + '</dd></div>').join('') + '</dl>' +
        (k.req && mode === 'office' ? '<div class="pt-kacts"><button type="button" class="pt-btn" data-act="rdel" data-kid="' + h(k.k) + '">' + ico('trash') + 'Decline</button><button type="button" class="pt-btn is-gold" data-act="rok" data-kid="' + h(k.k) + '">' + ico('check') + 'Approve</button></div>' : '') +
        (k.req && mode === 'self' ? '<div class="pt-kacts"><button type="button" class="pt-btn" data-act="rdel" data-kid="' + h(k.k) + '">' + ico('trash') + 'Cancel request</button></div>' : '') +
        (mode === 'office' && !k.req ? '<div class="pt-kacts">' + (k.plan ? '<button type="button" class="pt-btn" data-act="kdel" data-kid="' + h(k.k) + '">' + ico('trash') + 'Remove</button>' : '<button type="button" class="pt-btn" data-act="kedit" data-kid="' + h(k.k) + '">' + ico('pen') + 'Edit</button>') + '<button type="button" class="pt-btn is-ghost" data-act="ktree" data-pid="' + h(k.pid) + '" aria-label="Open the profile tree of ' + h(m ? k.title : pname(k.mentor)) + '">' + ico('tree') + (m ? 'Tree' : 'Mentor') + '</button></div>' : '');
    }
    return '<div class="pt-kid pt-vitem"><i class="pt-tick" aria-hidden="true"></i><article class="pt-card pt-ch' + (k.plan ? ' is-plan' : '') + (editing ? ' is-editing' : '') + '"><header><span class="pt-kn">' + h(k.title) + '</span>' + badge(k.status) + '</header>' + body + '</article></div>';
  }
  function addHtml(inst) {
    const st = inst.st, id = 'pta-' + inst.uid;
    if (!st.adding) return '<div class="pt-kid pt-vitem"><i class="pt-tick" aria-hidden="true"></i><button type="button" class="pt-card pt-add" data-act="add">' + ico('plus') + '<span>Add new slot</span></button></div>';
    const a = st.add, have = new Set(inst.kids.map(k => k.pid)), self = inst.mode === 'self';
    /* a mentor only sees their own students here (privacy); the office sees everyone */
    const mine = new Set(inst.kids.filter(k => !k.plan).map(k => k.pid));
    const S = (G(() => STUDENTS.filter(s => s.status === 'Active' && (!self || mine.has(s.id)))) || []).slice().sort((x, y) => x.name.localeCompare(y.name));
    const P = (G(() => PROGS.filter(p => !dead(p.status))) || []);
    const subj = String(inst.r.subjects || '').toLowerCase();
    P.sort((x, y) => (String(y.subject || y.name).toLowerCase().includes(subj.split(/[ ,]/)[0]) ? 1 : 0) - (String(x.subject || x.name).toLowerCase().includes(subj.split(/[ ,]/)[0]) ? 1 : 0));
    return '<div class="pt-kid pt-vitem"><i class="pt-tick" aria-hidden="true"></i><article class="pt-card pt-ch is-plan is-editing"><header><span class="pt-kn">New slot</span>' + badge(self ? 'Requested' : 'Planned') + '</header><div class="pt-kform">' +
      '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-s">Student</label><select id="' + id + '-s" data-af="stu"><option value="">' + (self ? 'Open slot · any new student' : 'Choose… (or leave for an open slot)') + '</option>' + S.map(s => '<option value="' + s.id + '"' + (a.stu === s.id ? ' selected' : '') + '>' + h(s.name) + (have.has(s.id) ? ' (already here)' : '') + ' · ' + h(s.cls || '') + '</option>').join('') + '</select></div>' +
      '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-p">Programme</label><select id="' + id + '-p" data-af="prog">' + P.map(p => '<option value="' + p.id + '"' + (a.prog === p.id ? ' selected' : '') + '>' + h(p.name) + '</option>').join('') + '</select></div>' +
      '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-w">When</label><input id="' + id + '-w" data-af="when" value="' + h(a.when || '') + '" placeholder="e.g. Sun & Tue · 5 pm"></div>' +
      '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-m">Medium</label><select id="' + id + '-m" data-af="medium">' + ['In person', 'Online', 'Hybrid'].map(o => '<option' + (a.medium === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
      (a.stu ? '' : '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-g">Grade / level</label><input id="' + id + '-g" data-af="grade" value="' + h(a.grade || '') + '" placeholder="e.g. Grade 8–10 or O Level"></div>') +
      '<div class="pt-f is-ed"><label class="pt-l" for="' + id + '-n">Note</label><input id="' + id + '-n" data-af="note" maxlength="140" value="' + h(a.note || '') + '" placeholder="Optional, e.g. 60 min, up to 3 students"></div>' +
      '<p class="pt-foot">' + (self ? 'Your slot goes to the office for approval. It is not billed and does not change the routine until the office confirms it.' : 'A planned slot is not billed. Enrol the student from Programmes &amp; Enrolments to start fees.') + '</p>' +
      '<div class="pt-kacts"><button type="button" class="pt-btn" data-act="addcancel">Cancel</button><button type="button" class="pt-btn is-gold" data-act="addsave">' + ico('check') + (self ? 'Send for approval' : 'Add slot') + '</button></div></div></article></div>';
  }

  /* the office adds planned slots; the mentor adds their own (sent for approval) */
  const canAddSlot = inst => isM(inst.pid) && (inst.mode === 'office' || (inst.mode === 'self' && role() === 'Mentor'));
  function branchHtml(inst, br) {
    const st = inst.st, closed = !!st.closed[br.b], fs = br.fields.filter(f => shown(f, inst.mode)), hid = 'pth-' + inst.uid + '-' + br.b;
    const count = br.kids ? inst.kids.length : br.b === 'spec' ? String(inst.r.specialties || '').split(',').filter(x => x.trim()).length || '' : '';
    const kidList = br.kids ? inst.kids.map(k => kidHtml(inst, k)).join('') + (canAddSlot(inst) ? addHtml(inst) : '') + (!inst.kids.length && !canAddSlot(inst) ? '<div class="pt-kid pt-vitem"><i class="pt-tick" aria-hidden="true"></i><div class="pt-card pt-ch is-empty"><p class="pt-val is-empty">' + (isM(inst.pid) ? 'No students yet' : 'No programmes yet') + '</p></div></div>' : '') : '';
    return '<div class="pt-col pt-vitem' + (closed ? ' is-closed' : '') + (br.kids ? ' has-kids' : '') + '" data-col="' + br.b + '"><i class="pt-tick" aria-hidden="true"></i>' +
      '<section class="pt-card pt-br' + (dirty(inst, br.b) ? ' is-dirty' : '') + '" data-br="' + br.b + '" aria-labelledby="' + hid + '">' +
      '<button type="button" class="pt-bh" id="' + hid + '" data-act="fold" data-b="' + br.b + '" aria-expanded="' + !closed + '"><span class="pt-bi">' + ico(br.icon) + '</span><span class="pt-bt">' + h(br.title) + '</span>' + (count !== '' ? '<em class="pt-bn">' + count + '</em>' : '') + ico('chev', 'pt-chev') + '</button>' +
      '<div class="pt-fold"><div class="pt-fold-in"><div class="pt-bb">' + fs.map(f => fieldHtml(inst, br.b, f)).join('') + extraHtml(inst, br) + '</div>' +
      (fs.some(f => editable(f, inst.mode)) ? '<div class="pt-bf" aria-live="polite"><span>Unsaved changes</span><button type="button" class="pt-btn" data-act="revert" data-b="' + br.b + '">Revert</button><button type="button" class="pt-btn is-gold pt-save" data-act="save" data-b="' + br.b + '">' + ico('check') + 'Save</button></div>' : '') +
      '</div></div></section>' + (br.kids ? '<div class="pt-kids pt-vlist" aria-label="' + h(br.title) + '">' + kidList + '</div>' : '') + '</div>';
  }

  function noteText(inst) {
    const m = isM(inst.pid);
    if (inst.mode === 'office') return m ? '<b>Office view.</b> Edit any field in place, then press Save on that card. The contract (rate and pay model) changes on the Mentors page.' : '<b>Office view.</b> Edit any field in place, then press Save on that card. Fees and enrolments change on Programmes &amp; Enrolments.';
    if (inst.mode === 'self') return m ? '<b>Your profile tree.</b> Fields with a gold edge are yours to change: phone, address, bio, qualifications, specialties, availability, preferred students, salary account and photo. You can also add your own slots under Mentorship slots; the office approves them. The office keeps the rest.' : '<b>Your profile tree.</b> You can change your photo, address and About me. The office keeps the rest up to date.';
    return '<b>View only.</b>';
  }

  function html(inst) {
    const vert = inst.vertical;
    return '<div class="pt-note">' + ico('tree') + '<p>' + noteText(inst) + '</p></div>' +
      '<div class="pt-bar"><ul class="pt-legend" aria-label="Legend"><li><i class="lg-root"></i>Person</li><li><i class="lg-br"></i>Branch</li><li><i class="lg-kid"></i>' + (isM(inst.pid) ? 'Student' : 'Programme') + '</li>' + (inst.mode !== 'view' ? '<li><i class="lg-ed"></i>Editable</li>' : '') + (isM(inst.pid) && inst.mode === 'office' ? '<li><i class="lg-plan"></i>Planned</li>' : '') + '</ul>' +
      '<div class="pt-ctl" role="toolbar" aria-label="Tree view"><button type="button" class="pt-btn is-ghost" data-act="all">' + ico('fold') + '<span>' + (Object.values(inst.st.closed).some(Boolean) ? 'Expand all' : 'Collapse all') + '</span></button>' +
      (vert ? '' : '<span class="pt-zoom"><button type="button" data-act="zout" aria-label="Zoom out">' + ico('minus') + '</button><output aria-live="polite">' + Math.round(inst.scale * 100) + '%</output><button type="button" data-act="zin" aria-label="Zoom in">' + ico('plus') + '</button></span><button type="button" class="pt-btn is-ghost" data-act="fit">' + ico('fit') + '<span>Fit to screen</span></button>') +
      (inst.opts.full ? '<button type="button" class="pt-btn is-ghost" data-act="full">' + ico('expand') + '<span>Full view</span></button>' : '') + '</div></div>' +
      '<div class="pt-vp" tabindex="0" role="group" aria-label="' + h(inst.r.name) + ' profile tree' + (vert ? '' : '. Drag to move, plus and minus keys to zoom, 0 to fit') + '"><div class="pt-sz"><div class="pt-cv">' +
      (vert ? '' : '<svg class="pt-wires" aria-hidden="true"><defs><linearGradient id="ptg-' + inst.uid + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0"><stop offset="0" class="pt-ga"/><stop offset=".5" class="pt-gb"/><stop offset="1" class="pt-ga"/></linearGradient></defs><g class="pt-wg"></g></svg>') +
      '<div class="pt-tier1">' + rootHtml(inst) + '</div><div class="pt-tier2 pt-vlist">' + schema(inst.pid).map(br => branchHtml(inst, br)).join('') + '</div></div></div></div>';
  }

  /* ---------------------------------------------------------------- drafts */
  function dirty(inst, b) {
    const d = inst.st.drafts[b]; if (!d) return false;
    return Object.keys(d).some(k => String(d[k]).trim() !== String(inst.r[k] == null ? '' : inst.r[k]).trim());
  }
  function setDraft(inst, b, k, v) { (inst.st.drafts[b] = inst.st.drafts[b] || {})[k] = v; const c = inst.el.querySelector('.pt-br[data-br="' + b + '"]'); if (c) c.classList.toggle('is-dirty', dirty(inst, b)); }
  function curVal(inst, b, k) { const d = inst.st.drafts[b] || {}; return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : (inst.r[k] == null ? '' : inst.r[k]); }
  function save(inst, b) {
    const r = inst.r, br = schema(inst.pid).find(x => x.b === b), d = inst.st.drafts[b] || {}, changed = [], put = {};
    (br ? br.fields : []).forEach(f => {
      if (!Object.prototype.hasOwnProperty.call(d, f.k) || !editable(f, inst.mode) || !shown(f, inst.mode)) return;
      let v = String(d[f.k]).trim(); if (f.t === 'number') v = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0);
      if (f.t === 'chips') v = String(v).split(/\s*,\s*/).filter(Boolean).join(', ');
      if (String(r[f.k] == null ? '' : r[f.k]) !== String(v)) { put[f.k] = v; changed.push(f.l); }
    });
    Object.assign(inst.real, put);
    delete inst.st.drafts[b];
    if (changed.length) { G(() => log('Profile updated', r.id + ' · ' + r.name, changed.join(', ') + (inst.mode === 'self' ? ' (by themselves)' : ''))); say('Saved'); sync(); G(() => inst.opts.onSave && inst.opts.onSave(changed)); }
    else say('Nothing changed');
    refreshAll(inst.pid);
  }

  /* ---------------------------------------------------------------- layout: positions, connectors, zoom */
  const PADX = 28, PADY = 28, GAP1 = 64, GAPK = 76;
  function rel(el, cv) { let x = 0, y = 0, e = el; while (e && e !== cv) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; }
  function elbow(px, py, by, cx, cy, r) {
    if (Math.abs(cx - px) < 1) return 'M' + px + ' ' + py + 'V' + cy;
    const s = cx > px ? 1 : -1, rr = Math.min(r, Math.abs(cx - px) / 2, (cy - by) / 2);
    return 'M' + px + ' ' + by + 'H' + (cx - s * rr) + 'Q' + cx + ' ' + by + ' ' + cx + ' ' + (by + rr) + 'V' + cy;
  }
  function layout(inst) {
    if (inst.vertical || !inst.el.isConnected) return;
    const cv = inst.el.querySelector('.pt-cv'), sz = inst.el.querySelector('.pt-sz'), vp = inst.el.querySelector('.pt-vp'); if (!cv) return;
    const t1 = cv.querySelector('.pt-tier1'), t2 = cv.querySelector('.pt-tier2'), root = t1.firstElementChild;
    const kcol = cv.querySelector('.pt-col.has-kids'), kids = kcol && kcol.querySelector('.pt-kids'), kOpen = kcol && !kcol.classList.contains('is-closed');
    cv.style.width = ''; t2.style.marginTop = GAP1 + 'px';
    const natural = cv.offsetWidth, Wk = kids ? kids.offsetWidth : 0;
    const Wc = Math.max(natural, Wk + 2 * PADX); cv.style.width = Wc + 'px';
    const t2b = t2.offsetTop + t2.offsetHeight;
    let H = t2b + PADY;
    const paths = [], dots = [];
    const R = rel(root, cv), rx = Math.round(R.x + R.w / 2), ry = R.y + R.h;
    const cols = [...t2.children].map(c => rel(c.querySelector('.pt-br'), cv));
    const by = t2.offsetTop - Math.round(GAP1 / 2);
    paths.push('M' + rx + ' ' + ry + 'V' + by);
    cols.forEach(c => { const cx = Math.round(c.x + c.w / 2); paths.push(elbow(rx, ry, by, cx, c.y, 12)); dots.push([cx, c.y, 'e']); });
    dots.push([rx, by, 'j'], [rx, ry, 'e']);
    if (kids) {
      if (kOpen) {
        const top = t2b + GAPK, sc = rel(kcol.querySelector('.pt-br'), cv), sx = Math.round(sc.x + sc.w / 2), sy = sc.y + sc.h;
        const left = clamp(Math.round(sx - Wk / 2), PADX, Math.max(PADX, Wc - PADX - Wk));
        kids.style.left = left + 'px'; kids.style.top = top + 'px';
        const kb = top - Math.round(GAPK / 2.4);
        paths.push('M' + sx + ' ' + sy + 'V' + kb);
        [...kids.children].forEach(k => { const c = rel(k.querySelector('.pt-card'), cv), cx = Math.round(c.x + c.w / 2); paths.push(elbow(sx, sy, kb, cx, c.y, 10)); dots.push([cx, c.y, 'e']); });
        dots.push([sx, kb, 'j'], [sx, sy, 'e']);
        H = Math.max(H, top + kids.offsetHeight + PADY + 6);
      } else { kids.style.left = PADX + 'px'; kids.style.top = (t2b + GAPK) + 'px'; }
    }
    cv.style.height = H + 'px';
    const svg = cv.querySelector('.pt-wires');
    if (svg) {
      svg.setAttribute('width', Wc); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + Wc + ' ' + H);
      const lg = svg.querySelector('linearGradient'); lg.setAttribute('x2', Wc);
      const g = svg.querySelector('.pt-wg'), d = paths.join(' ');
      g.innerHTML = '<path class="pt-wire-glow" d="' + d + '"/><path class="pt-wire" d="' + d + '" stroke="url(#ptg-' + inst.uid + ')"/>' + dots.map(p => p[2] === 'j' ? '<circle class="pt-node" cx="' + p[0] + '" cy="' + p[1] + '" r="4"/><circle class="pt-node-in" cx="' + p[0] + '" cy="' + p[1] + '" r="1.6"/>' : '<circle class="pt-end" cx="' + p[0] + '" cy="' + p[1] + '" r="2.4"/>').join('');
    }
    inst.W = Wc; inst.H = H;
    if (inst.autoFit) inst.scale = fitScale(inst, vp);
    applyScale(inst);
  }
  function fitScale(inst, vp) { const w = (vp || inst.el.querySelector('.pt-vp')).clientWidth - 4; return clamp(w / (inst.W || 1), 0.45, 1); }
  function applyScale(inst) {
    const cv = inst.el.querySelector('.pt-cv'), sz = inst.el.querySelector('.pt-sz'), o = inst.el.querySelector('.pt-zoom output'); if (!cv) return;
    cv.style.transform = 'scale(' + inst.scale + ')';
    sz.style.width = Math.ceil(inst.W * inst.scale) + 'px'; sz.style.height = Math.ceil(inst.H * inst.scale) + 'px';
    if (o) o.textContent = Math.round(inst.scale * 100) + '%';
  }
  function zoomTo(inst, s) {
    const vp = inst.el.querySelector('.pt-vp'), old = inst.scale; s = clamp(Math.round(s * 100) / 100, 0.4, 1.6); if (s === old) return;
    const cx = (vp.scrollLeft + vp.clientWidth / 2) / old, cy = (vp.scrollTop + vp.clientHeight / 2) / old;
    inst.autoFit = false; inst.scale = s; applyScale(inst);
    vp.scrollLeft = cx * s - vp.clientWidth / 2; vp.scrollTop = cy * s - vp.clientHeight / 2;
  }

  /* ---------------------------------------------------------------- mount / redraw */
  function decide(inst) {
    const w = inst.el.clientWidth || inst.host.clientWidth || 0;
    if (w < 700) return true;
    if (inst.natW) return w < inst.natW * 0.62;
    return false;
  }
  function draw(inst, keepFocus) {
    const r = rec(inst.pid); if (!r) { inst.el.innerHTML = '<div class="pt-empty">This person is not in the records any more.</div>'; return; }
    inst.real = r; inst.r = Object.assign({}, r, overlay(inst.pid)); inst.st = stOf(inst.pid); inst.kids = isM(inst.pid) ? kidsOfMentor(inst.pid) : kidsOfStudent(inst.pid);
    const vp0 = inst.el.querySelector('.pt-vp'), sl = vp0 ? vp0.scrollLeft : 0, stp = vp0 ? vp0.scrollTop : 0;
    const a = document.activeElement, focus = keepFocus && a && inst.el.contains(a) ? (a.id || (a.dataset.act ? '[data-act="' + a.dataset.act + '"]' + (a.dataset.b ? '[data-b="' + a.dataset.b + '"]' : '') + (a.dataset.kid ? '[data-kid="' + a.dataset.kid + '"]' : '') : '')) : '';
    const sel = a && 'selectionStart' in a ? G(() => [a.selectionStart, a.selectionEnd]) : null;
    inst.el.classList.toggle('pt--v', !!inst.vertical); inst.el.classList.toggle('pt--h', !inst.vertical);
    inst.el.innerHTML = html(inst);
    if (!inst.vertical) {
      layout(inst);
      if (!inst.natW) { inst.natW = inst.W; if (decide(inst)) { inst.vertical = true; return draw(inst, keepFocus); } }
      const vp = inst.el.querySelector('.pt-vp'); vp.scrollLeft = sl; vp.scrollTop = stp;
      if (!inst.centered) { inst.centered = true; vp.scrollLeft = Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2); }
      observe(inst);
    }
    if (focus) { const f = focus.startsWith('[') ? inst.el.querySelector(focus) : document.getElementById(focus); if (f) { G(() => f.focus({ preventScroll: true })); if (sel && 'setSelectionRange' in f) G(() => f.setSelectionRange(sel[0], sel[1])); } }
  }
  function observe(inst) {
    if (inst.cro) inst.cro.disconnect();
    if (typeof ResizeObserver !== 'function') return;
    let raf = 0;
    inst.cro = new ResizeObserver(() => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (!inst.el.isConnected) { inst.cro.disconnect(); return; } layout(inst); }); });
    inst.el.querySelectorAll('.pt-card').forEach(c => inst.cro.observe(c));
    const k = inst.el.querySelector('.pt-kids'); if (k) inst.cro.observe(k);
  }
  function refreshAll() { INST.forEach(i => { if (!i.el.isConnected) { INST.delete(i); return; } draw(i, true); }); }

  function mount(host, pid, opts) {
    opts = opts || {};
    if (host.__pt) { const o = host.__pt; INST.delete(o); o.cro && o.cro.disconnect(); o.hro && o.hro.disconnect(); }
    const el = document.createElement('div'); el.className = 'pt' + (opts.modal ? ' pt--modal' : ' pt--embed'); el.setAttribute('data-notx', ''); el.setAttribute('data-noedit', '');
    host.innerHTML = ''; host.appendChild(el);
    const inst = { uid: ++SEQ, host, el, pid, mode: opts.mode || 'view', opts, scale: 1, autoFit: true, vertical: false, natW: 0 };
    host.__pt = inst; INST.add(inst);
    inst.vertical = (host.clientWidth || 9999) < 700;
    draw(inst);
    bind(inst);
    if (typeof ResizeObserver === 'function') {
      let lastW = el.clientWidth;
      inst.hro = new ResizeObserver(() => {
        if (!el.isConnected) { inst.hro.disconnect(); inst.cro && inst.cro.disconnect(); INST.delete(inst); return; }
        const w = el.clientWidth; if (Math.abs(w - lastW) < 2) return; lastW = w;
        const v = decide(inst); if (v !== inst.vertical) { inst.vertical = v; draw(inst, true); } else if (!v) layout(inst);
      });
      inst.hro.observe(el);
    }
    return { refresh: () => draw(inst, true), el, inst };
  }

  /* ---------------------------------------------------------------- events */
  function bind(inst) {
    const el = inst.el;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return;
      const act = b.dataset.act, st = inst.st;
      if (act === 'fold') { st.closed[b.dataset.b] = !st.closed[b.dataset.b]; const col = b.closest('.pt-col'); col.classList.toggle('is-closed', st.closed[b.dataset.b]); b.setAttribute('aria-expanded', !st.closed[b.dataset.b]); syncAllLabel(inst); if (!inst.vertical) { layout(inst); setTimeout(() => layout(inst), 220); } }
      else if (act === 'all') { const any = Object.values(st.closed).some(Boolean); schema(inst.pid).forEach(br => { st.closed[br.b] = !any; }); draw(inst, true); }
      else if (act === 'zin') zoomTo(inst, inst.scale + 0.1);
      else if (act === 'zout') zoomTo(inst, inst.scale - 0.1);
      else if (act === 'fit') { inst.autoFit = true; layout(inst); const vp = el.querySelector('.pt-vp'); vp.scrollTo({ left: Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2), top: 0, behavior: reduced() ? 'auto' : 'smooth' }); }
      else if (act === 'full') open(inst.pid, { mode: inst.mode, opener: b, onSave: inst.opts.onSave });
      else if (act === 'save') save(inst, b.dataset.b);
      else if (act === 'revert') { delete st.drafts[b.dataset.b]; draw(inst, false); }
      else if (act === 'chipx') { const L = String(curVal(inst, b.dataset.b, b.dataset.f)).split(/\s*,\s*/).filter(Boolean); L.splice(+b.dataset.i, 1); setDraft(inst, b.dataset.b, b.dataset.f, L.join(', ')); draw(inst, false); const ci = el.querySelector('[data-chip="' + b.dataset.f + '"]'); ci && ci.focus(); }
      else if (act === 'photo') { const f = el.querySelector('.pt-file'); f && f.click(); }
      else if (act === 'kedit') { st.kedit = b.dataset.kid; st.kdraft = {}; draw(inst, false); const f = el.querySelector('[data-kf="medium"]'); f && f.focus(); }
      else if (act === 'kcancel') { st.kedit = null; st.kdraft = {}; draw(inst, false); }
      else if (act === 'ksave') saveKid(inst, b.dataset.kid);
      else if (act === 'kdel') { if (inst.mode !== 'office') return; const id = b.dataset.kid.slice(5), r = inst.real; r.slotsPlan = (r.slotsPlan || []).filter(x => x.id !== id); G(() => log('Profile updated', r.id + ' · ' + r.name, 'Planned slot removed')); say('Saved'); sync(); refreshAll(inst.pid); }
      else if (act === 'rok' || act === 'rdel') {
        const id = b.dataset.kid.slice(4), r = inst.real, L = SLOTS(), x = L.find(q => q.id === id); if (!x) return;
        if (act === 'rok' && inst.mode !== 'office') return;
        if (inst.mode !== 'office' && !(inst.mode === 'self' && role() === 'Mentor')) return;
        if (b.disabled) return; b.disabled = true;
        const what = (x.stu ? pname(x.stu) : 'Open slot') + (x.when ? ' · ' + x.when : ''), day = new Date().toISOString().slice(0, 10), who = G(() => ME().name) || role();
        if (act === 'rok') {
          /* approved: it becomes a planned slot on the mentor's record; the request keeps its answer */
          r.slotsPlan = (r.slotsPlan || []).concat([{ id: x.id, stu: x.stu || '', prog: x.prog || '', when: x.when || '', medium: x.medium || 'In person', grade: x.grade || '', note: x.note || '', at: x.at || day, by: 'mentor', ok: day }]);
          Object.assign(x, { status: 'Approved', answeredBy: who, answeredAt: day });
          G(() => log('Slot approved', r.id + ' · ' + r.name, what)); say('Slot approved');
        } else if (inst.mode === 'office') {
          Object.assign(x, { status: 'Declined', answeredBy: who, answeredAt: day });
          G(() => log('Slot declined', r.id + ' · ' + r.name, what)); say('Slot declined');
        } else {
          const i = L.indexOf(x); if (i > -1) L.splice(i, 1);
          G(() => log('Slot request cancelled', r.id + ' · ' + r.name, what)); say('Request cancelled');
        }
        sync(); refreshAll(inst.pid);
      }
      else if (act === 'ktree') { if (inst.opts.modal) open(b.dataset.pid, { mode: inst.mode, back: inst.pid, opener: MODAL && MODAL.opener }); else open(b.dataset.pid, { mode: inst.mode, opener: b }); }
      else if (act === 'add') { st.adding = true; st.add = { medium: 'In person' }; draw(inst, false); const f = el.querySelector('[data-af="stu"]'); f && f.focus(); }
      else if (act === 'addcancel') { st.adding = false; draw(inst, false); }
      else if (act === 'addsave') {
        const a = st.add, r = inst.real, p = a.prog || (el.querySelector('[data-af="prog"]') || {}).value;
        if (!canAddSlot(inst)) { say('You cannot add slots here'); return; }
        if (!a.stu && !(a.when || '').trim()) { say('Write when the slot is (day and time)'); const f = el.querySelector('[data-af="when"]'); f && f.focus(); return; }
        const b2 = el.querySelector('[data-act="addsave"]'); if (b2) { if (b2.disabled) return; b2.disabled = true; }
        const slot = { id: 'PS' + Date.now().toString(36), stu: a.stu || '', prog: p, when: (a.when || '').trim().slice(0, 120), medium: a.medium || 'In person', grade: a.stu ? '' : (a.grade || '').trim().slice(0, 60), note: (a.note || '').trim().slice(0, 140), at: new Date().toISOString().slice(0, 10) };
        const what = (a.stu ? pname(a.stu) : 'Open slot') + ' · ' + ((prog(p) || {}).name || p) + (slot.when ? ' · ' + slot.when : '');
        if (inst.mode === 'self') {
          /* a 'slotreq' record: a mentor may add / cancel only their own (checked again on the server); the office answers */
          SLOTS().push(Object.assign(slot, { id: 'SR' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), mentor: inst.pid, by: 'mentor', status: 'Pending' }));
          G(() => log('Slot requested', r.id + ' · ' + r.name, what)); G(() => SCH.log && SCH.log('Slot requested', r.name + ' · ' + what, 'info'));
          say('Sent to the office for approval');
        } else {
          r.slotsPlan = (r.slotsPlan || []).concat([slot]);
          G(() => log('Profile updated', r.id + ' · ' + r.name, 'Planned slot: ' + what));
          say('Saved');
        }
        st.adding = false; st.add = {}; sync(); refreshAll(inst.pid);
      }
    });
    el.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.f && t.dataset.b) setDraft(inst, t.dataset.b, t.dataset.f, t.value);
      else if (t.dataset.kf) inst.st.kdraft[t.dataset.kf] = t.value;
      else if (t.dataset.af) inst.st.add[t.dataset.af] = t.value;
    });
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.kf) inst.st.kdraft[t.dataset.kf] = t.value;
      else if (t.dataset.af) { inst.st.add[t.dataset.af] = t.value; if (t.dataset.af === 'stu') { draw(inst, false); const f = el.querySelector('[data-af="stu"]'); f && f.focus(); } }
      else if (t.classList.contains('pt-file')) photo(inst, t);
    });
    el.addEventListener('keydown', e => {
      const t = e.target;
      if (t.dataset && t.dataset.chip) {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = t.value.trim().replace(/,$/, ''); if (!v) return; const L = String(curVal(inst, t.dataset.b, t.dataset.chip)).split(/\s*,\s*/).filter(Boolean); if (!L.includes(v)) L.push(v); setDraft(inst, t.dataset.b, t.dataset.chip, L.join(', ')); draw(inst, true); }
        else if (e.key === 'Backspace' && !t.value) { const L = String(curVal(inst, t.dataset.b, t.dataset.chip)).split(/\s*,\s*/).filter(Boolean); if (L.length) { L.pop(); setDraft(inst, t.dataset.b, t.dataset.chip, L.join(', ')); draw(inst, true); } }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && t.dataset && t.dataset.b) { e.preventDefault(); save(inst, t.dataset.b); return; }
      if (t.classList && t.classList.contains('pt-vp') && !inst.vertical) {
        const vp = t, step = 80;
        if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(inst, inst.scale + 0.1); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(inst, inst.scale - 0.1); }
        else if (e.key === '0') { e.preventDefault(); inst.autoFit = true; layout(inst); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); vp.scrollLeft -= step; }
        else if (e.key === 'ArrowRight') { e.preventDefault(); vp.scrollLeft += step; }
        else if (e.key === 'ArrowUp' && inst.opts.modal) { e.preventDefault(); vp.scrollTop -= step; }
        else if (e.key === 'ArrowDown' && inst.opts.modal) { e.preventDefault(); vp.scrollTop += step; }
      }
    });
    /* drag the empty canvas (or a card's quiet area) to move around */
    let pan = null;
    el.addEventListener('pointerdown', e => {
      if (inst.vertical || e.button !== 0) return;
      const vp = e.target.closest('.pt-vp'); if (!vp || e.target.closest('input,textarea,select,button,a,label,.pt-val,.pt-kv,.pt-rows,.pt-name,.pt-id')) return;
      pan = { x: e.clientX, y: e.clientY, l: vp.scrollLeft, t: vp.scrollTop, vp, on: false, id: e.pointerId };
    });
    el.addEventListener('pointermove', e => {
      if (!pan) return; const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.on && Math.hypot(dx, dy) < 4) return;
      if (!pan.on) { pan.on = true; pan.vp.classList.add('is-panning'); G(() => pan.vp.setPointerCapture(pan.id)); }
      pan.vp.scrollLeft = pan.l - dx; pan.vp.scrollTop = pan.t - dy;
    });
    const end = () => { if (pan) { pan.vp.classList.remove('is-panning'); G(() => pan.vp.releasePointerCapture(pan.id)); } pan = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { if (inst.vertical || !(e.ctrlKey || e.metaKey) || !e.target.closest('.pt-vp')) return; e.preventDefault(); zoomTo(inst, inst.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
  }
  function syncAllLabel(inst) { const s = inst.el.querySelector('[data-act="all"] span'); if (s) s.textContent = Object.values(inst.st.closed).some(Boolean) ? 'Expand all' : 'Collapse all'; }
  function saveKid(inst, k) {
    const kid = inst.kids.find(x => x.k === k), d = inst.st.kdraft; if (!kid) return;
    const src = kid.src, changed = [];
    if (d.medium != null && d.medium !== (src.medium || 'In person')) { src.medium = d.medium; changed.push('Medium'); }
    if (d.when != null && d.when.trim() !== (kid.when || '')) { src.whenNote = d.when.trim(); changed.push('When'); }
    inst.st.kedit = null; inst.st.kdraft = {};
    if (changed.length) { const who = rec(isM(inst.pid) ? kid.pid : inst.pid) || {}; G(() => log('Profile updated', who.id + ' · ' + who.name, changed.join(', ') + ' · ' + (isM(inst.pid) ? kid.subject + ' with ' + inst.r.name : kid.title))); say('Saved'); }
    else say('Nothing changed');
    refreshAll(inst.pid);
  }
  function photo(inst, input) {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader(), img = new Image();
    rd.onload = () => { img.onload = () => { const c = document.createElement('canvas'), s = 200, k = Math.max(s / img.width, s / img.height); c.width = c.height = s; c.getContext('2d').drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k); const ph = c.toDataURL('image/jpeg', .84); inst.real.photo = ph; G(() => log('Profile updated', inst.r.id + ' · ' + inst.r.name, 'Photo')); say('Saved'); sync(); G(() => inst.opts.onSave && inst.opts.onSave(['Photo'])); refreshAll(inst.pid); }; img.src = rd.result; };
    rd.readAsDataURL(f);
  }

  /* ---------------------------------------------------------------- the large modal */
  let MODAL = null;
  const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function open(pid, opts) {
    opts = opts || {};
    const r = rec(pid); if (!r) { say('Not found'); return; }
    const opener = opts.opener || (MODAL && MODAL.opener) || document.activeElement;
    if (!MODAL) {
      const back = document.createElement('div'); back.className = 'pt-back';
      back.setAttribute('data-notx', ''); back.setAttribute('data-noedit', ''); back.innerHTML = '<div class="pt-modal" role="dialog" aria-modal="true" aria-labelledby="pt-mt"><header class="pt-mh"><div class="pt-mht"></div><button type="button" class="pt-x" data-close>' + ico('x') + '<span>Close</span></button></header><div class="pt-mb"></div></div>';
      document.body.appendChild(back); document.documentElement.classList.add('pt-lock');
      MODAL = { back, opener, stack: [] };
      back.addEventListener('mousedown', e => { if (e.target === back) close(); });
      back.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); else if (e.target.closest('[data-mback]')) { const p = MODAL.stack.pop(); if (p) show(p.pid, p.mode, true); } });
      back.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (e.key !== 'Tab') return;
        const L = [...back.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null || x === document.activeElement); if (!L.length) return;
        const a = L[0], z = L[L.length - 1];
        if (e.shiftKey && (document.activeElement === a || !back.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && (document.activeElement === z || !back.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
      });
      requestAnimationFrame(() => back.classList.add('is-in'));
    } else if (opts.back) MODAL.stack.push({ pid: opts.back, mode: MODAL.mode });
    MODAL.onSave = opts.onSave;
    show(pid, opts.mode || 'office', false);
  }
  function show(pid, mode, isBack) {
    const r = rec(pid), back = MODAL.back; MODAL.mode = mode; MODAL.pid = pid;
    const prev = MODAL.stack[MODAL.stack.length - 1];
    back.querySelector('.pt-mht').innerHTML = (prev ? '<button type="button" class="pt-btn is-ghost pt-mback" data-mback>' + ico('back') + '<span>' + h(firstName(pname(prev.pid))) + '</span></button>' : '') + '<div><p class="pt-eyebrow">' + (isM(pid) ? 'Mentor · ' + h(r.subjects || '') : 'Student · ' + h(r.cls || '')) + '</p><h2 id="pt-mt">' + h(r.name) + ' <span>— Profile Tree</span></h2></div>';
    mount(back.querySelector('.pt-mb'), pid, { mode, modal: true, onSave: MODAL.onSave });
    const x = back.querySelector('.pt-x'); G(() => x.focus({ preventScroll: true }));
  }
  function close() {
    if (!MODAL) return; const m = MODAL; MODAL = null;
    const host = m.back.querySelector('.pt-mb'); if (host.__pt) { INST.delete(host.__pt); host.__pt.cro && host.__pt.cro.disconnect(); host.__pt.hro && host.__pt.hro.disconnect(); }
    m.back.classList.remove('is-in'); document.documentElement.classList.remove('pt-lock');
    setTimeout(() => m.back.remove(), reduced() ? 0 : 180);
    if (m.opener && m.opener.isConnected) G(() => m.opener.focus({ preventScroll: true }));
    INST.forEach(i => { if (i.el.isConnected) draw(i, false); });
  }

  /* ---------------------------------------------------------------- Mentors page: a "View tree" button per mentor */
  const OFFICE = ['Owner', 'Admin', 'Junior Admin'];
  const role = () => (G(() => FTA.member && FTA.member.role) || G(() => window.ST && window.ST.role) || '');
  function inject() {
    const v = document.getElementById('view'); if (!v || OFFICE.indexOf(role()) < 0) return;
    v.querySelectorAll('button.btn[onclick^="menView"]').forEach(b => {
      if (b.previousElementSibling && b.previousElementSibling.classList.contains('pt-open')) return;
      const m = /menView\((?:&quot;|["'])?([A-Z]+-[\w-]+)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      const t = document.createElement('button'); t.type = 'button'; t.className = 'btn s pt-open'; t.dataset.pt = m[1];
      t.setAttribute('aria-label', 'View profile tree of ' + pname(m[1]));
      t.innerHTML = ico('tree') + '<span>View tree</span>';
      b.parentNode.insertBefore(t, b);
    });
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.pt-open'); if (!b) return; e.preventDefault(); e.stopPropagation(); open(b.dataset.pt, { mode: 'office', opener: b }); }, true);
  let qt = 0;
  const kick = () => { if (qt) return; qt = setTimeout(() => { qt = 0; G(inject); }, 60); };
  const start = () => { const v = document.getElementById('view'); if (v) new MutationObserver(kick).observe(v, { childList: true, subtree: true }); else setTimeout(start, 300); kick(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.FTA_TREE = { mount, open, close, isOpen: () => !!MODAL, kidsOfMentor, kidsOfStudent, overlay, remember, view: pid => Object.assign({}, rec(pid) || {}, overlay(pid)) };
})();
