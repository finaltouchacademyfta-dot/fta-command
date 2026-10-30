/* =====================================================================
   FTA Command Centre · access policy (one copy, used in two places)
   · the server (Netlify Function netlify/functions/api.mjs) — authoritative
   · the in-browser mock backend used by the tests (FTA_CONFIG.mock)
   Every read is filtered and redacted here; every write is checked here.
   Unknown collections are office-only (safe default).
   ===================================================================== */
(function (root, factory) { const P = factory(); if (typeof module === 'object' && module.exports) module.exports = P; else root.FTAPolicy = P; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ROLES = ['Owner', 'Admin', 'Junior Admin', 'Finance Manager', 'Collection Staff', 'Viewer', 'Mentor', 'Student'];
  const OFFICE = ['Owner', 'Admin', 'Junior Admin', 'Finance Manager', 'Collection Staff', 'Viewer'];
  /* collection classes */
  const MONEY = ['invoices', 'payments', 'expenses', 'payroll', 'prpay', 'accounts', 'others', 'transfers', 'advapp', 'refunds', 'bonus', 'deduct', 'close', 'budget', 'recon', 'follow', 'shares', 'mst', 'mstatus', 'expcats', 'checks', 'methods'];
  const MONEY_SECRET = ['payroll', 'prpay', 'accounts', 'others', 'transfers', 'budget', 'recon', 'bonus', 'deduct', 'shares', 'expenses', 'advapp', 'refunds', 'checks'];
  const PEOPLE = ['students', 'enrol', 'mentors', 'progs', 'batches', 'sport', 'pend'];
  const TEACH = ['groups', 'rt', 'rout', 'prr', 'att', 'attx', 'hw', 'exams', 'marks', 'cnotes', 'leave', 'events', 'sreq', 'ox', 'qb', 'oxatt', 'topics', 'classes', 'snotices', 'subf'];
  const COMMS = ['notices', 'circles', 'req'];
  const SETTINGS = ['org', 'perm', 'docset', 'msgs', 'ui', 'boards', 'boards8', 'levels', 'classlist', 'statuses', 'paymethods', 'lists', 'settings', 'themes'];
  const OFFICE_ONLY = ['logins', 'staff', 'users', 'bin', 'notes', 'audit'];
  const APPEND = ['log', 'audit'];
  const OWNER_ONLY_WRITE = ['perm', 'staff', 'logins', 'users', 'org', 'docset', 'msgs', 'ui', 'themes', 'settings'];
  /* collections teachers and students may read (always filtered by tags and redacted) */
  const MENTOR_READ = ['students', 'enrol', 'mentors', 'progs', 'batches', 'sport', 'pend', 'payroll', 'prpay', 'shares'].concat(SETTINGS, TEACH, COMMS);
  const MENTOR_WRITE = ['att', 'attx', 'hw', 'cnotes', 'leave', 'events', 'pend', 'sreq', 'rt', 'marks', 'sport', 'req', 'notices', 'circles', 'oxatt', 'ox', 'qb', 'prr', 'log'];
  const STUDENT_READ = ['students', 'enrol', 'mentors', 'progs', 'groups', 'rt', 'att', 'attx', 'hw', 'exams', 'marks', 'cnotes', 'events', 'ox', 'qb', 'oxatt', 'notices', 'circles', 'req', 'topics', 'classes', 'prr'].concat(SETTINGS);
  const STUDENT_WRITE = ['oxatt', 'req', 'notices', 'circles', 'log'];
  const has = (a, x) => a.indexOf(x) > -1;
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
  const omit = (o, keys) => { if (!o || typeof o !== 'object') return o; const r = Object.assign({}, o); keys.forEach(k => delete r[k]); return r; };
  const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
  const uniq = a => Array.from(new Set(a.filter(Boolean)));

  /* ---------- tags: which teachers and students a record belongs to (computed on the server, never trusted from the client) ---------- */
  function tags(c, id, data, ctx) {
    const txt = (id || '') + ' ' + JSON.stringify(data || {});
    const st = uniq((txt.match(/STU-\d+/g) || [])), mn = uniq((txt.match(/MEN-\d+/g) || []));
    const gids = uniq([].concat((data && data.gid) || [], (data && data.gids) || [], (c === 'att' || c === 'attx') ? String(id).split('|')[0] : [], c === 'marks' ? String(id).split('|')[1] : [], c === 'groups' ? id : []));
    gids.forEach(g => { const G = ctx && ctx.get('groups', g); if (G) { if (G.mentor) mn.push(G.mentor); (G.stu || []).forEach(s => st.push(s)); } });
    if (c === 'ox' && data && data.examiners) Object.values(data.examiners).forEach(m => mn.push(m));
    if (c === 'oxatt') { const ox = ctx && ctx.get('ox', String(id).split('|')[0]); if (ox) (ox.gids || []).forEach(g => { const G = ctx.get('groups', g); if (G && G.mentor) mn.push(G.mentor); }); }
    /* a student's own record and portal are seen by every teacher who teaches that student */
    if ((c === 'students' || c === 'sport' || c === 'prr') && ctx) { const own = c === 'students' ? [id] : st; ctx.all('groups').forEach(G => { if (G.status !== 'Closed' && (G.stu || []).some(s => own.indexOf(s) > -1) && G.mentor) mn.push(G.mentor); }); ctx.all('enrol').forEach(E => { if (own.indexOf(E.stu) > -1 && E.mentor && E.status !== 'Completed') mn.push(E.mentor); }); }
    return { mentor_ids: uniq(mn), student_ids: uniq(st) };
  }

  /* ---------- redaction for teachers and students ---------- */
  const KEY_FIELDS = ['key', 'ans', 'answer', 'answers', 'model', 'modelAnswer', 'marking', 'scheme', 'explain', 'explanation', 'rubric', 'accept'];
  function redact(me, c, id, data, tg) {
    const R = me.role, mine = R === 'Mentor' ? me.mentor_id : me.student_id;
    const tagged = R === 'Mentor' ? has(tg.mentor_ids, mine) : has(tg.student_ids, mine);
    const d = clone(data);
    switch (c) {
      case 'students': if (!tagged) return null; return omit(d, ['notes', 'fees', 'disc']);
      case 'enrol': if (!tagged) return null; return omit(d, ['fees', 'disc', 'discEnd', 'discBy']);
      case 'progs': return omit(d, ['fee', 'fees', 'price']);
      case 'batches': if (R === 'Student') return null; return omit(d, ['mentorPay', 'direct', 'directNote', 'fee']);
      case 'mentors': if (R === 'Mentor' && id === mine) return omit(d, ['notes']); return pick(d, ['id', 'name', 'subjects', 'status']);
      case 'sport': case 'pend': return tagged ? (R === 'Student' ? omit(d, ['by', 'role']) : d) : null;
      case 'payroll': { if (R !== 'Mentor') return null; const items = (d.items || []).filter(i => i.mentor === mine).map(i => Object.assign(omit(i, []), { lines: (i.lines || []).map(l => pick(l, ['who', 'method', 'amt'])) })); return items.length ? Object.assign(pick(d, ['month', 'status']), { items }) : null; }
      case 'prpay': return R === 'Mentor' && d.mentor === mine ? d : null;
      case 'shares': return R === 'Mentor' && String(id).split('|')[0] === mine ? pick(d, ['pct', 'from']) : null;
      case 'groups': if (!tagged) return null; if (R === 'Student') d.stu = (d.stu || []).filter(s => s === mine); return d;
      case 'rt': if (d.gid && !tagged && !(R === 'Mentor' && d.mentor === mine)) return null; if (!d.gid && !(R === 'Mentor' && d.mentor === mine)) return null; if (R === 'Student' && d.stu && !has(d.stu, mine)) return null; return d;
      case 'att': if (!tagged) return null; if (R === 'Student') d.marks = pick(d.marks || {}, [mine]); return d;
      case 'attx': if (!tagged) return null; if (R === 'Student') d.why = pick(d.why || {}, [mine]); return d;
      case 'hw': if (!tagged) return null; if (R === 'Student' && d.stu && !has(d.stu, mine)) return null; return d;
      case 'marks': if (!tagged) return null; if (R === 'Student') { if (['Approved', 'Published'].indexOf(d.status) < 0) return null; d.m = pick(d.m || {}, [mine]); return omit(d, ['note']); } return d;
      case 'cnotes': if (!tagged) return null; if (R === 'Student' && d.stu !== mine && d.stu !== '*') return null; return d;
      case 'leave': return R === 'Mentor' && d.mentor === mine ? d : null;
      case 'events': if (R === 'Mentor') return d.mentor === mine || has(tg.mentor_ids, mine) ? d : null; return has(d.stu || [], mine) ? d : null;
      case 'sreq': return R === 'Mentor' && (d.by === mine || tagged) ? d : null;
      case 'rout': return d;
      case 'prr': if (!tagged) return null; if (R === 'Student' && d.status && ['Sent', 'Published', 'Approved'].indexOf(d.status) < 0) return null; return d;
      case 'exams': case 'topics': case 'classes': case 'snotices': case 'subf': return R === 'Student' && c === 'snotices' ? null : d;
      case 'ox': { if (!tagged && R === 'Mentor') return null; if (R === 'Student') { const inIt = has(tg.student_ids, mine) || (d.stu && has(d.stu, mine)); if (!inIt && !tagged) return null; return omit(d, ['log', 'examiners', 'extra']); } return d; }
      case 'qb': return R === 'Student' ? omit(d, KEY_FIELDS) : d;
      case 'oxatt': { const [ox, sid] = String(id).split('|'); if (R === 'Student') return sid === mine ? d : null; return tagged ? d : null; }
      case 'notices': if (d.status !== 'Published') return null; { const k = R === 'Mentor' ? 'men:' + mine : 'stu:' + mine; d.seen = pick(d.seen || {}, [k]); d.acks = pick(d.acks || {}, [k]); return omit(d, ['readers']); }
      case 'circles': { const k = R === 'Mentor' ? 'men:' + mine : 'stu:' + mine; d.members = (d.members || []).filter(x => x === k || (R === 'Student' && x === 'grd:' + mine)); d.extra = (d.extra || []).filter(x => x === k); return d; }
      case 'req': { const k = R === 'Mentor' ? 'men:' + mine : 'stu:' + mine; return d.from === k ? d : null; }
      default: return has(SETTINGS, c) ? d : null;
    }
  }

  /* ---------- reads ---------- */
  function canSee(me, c) {
    if (!me || !me.active) return false; const R = me.role;
    if (R === 'Owner' || R === 'Admin' || R === 'Finance Manager' || R === 'Viewer') return c !== 'audit' || R === 'Owner' || R === 'Admin';
    if (R === 'Junior Admin') return !has(MONEY_SECRET, c) && c !== 'audit' && c !== 'staff' && c !== 'logins' && c !== 'users';
    if (R === 'Collection Staff') return has(['students', 'enrol', 'progs', 'mentors', 'batches', 'invoices', 'payments', 'advapp', 'accounts', 'follow', 'notes', 'notices', 'circles', 'close', 'mst', 'mstatus', 'methods', 'expcats', 'log'], c) || has(SETTINGS, c);
    if (R === 'Mentor') return has(MENTOR_READ, c);
    if (R === 'Student') return has(STUDENT_READ, c);
    return false;
  }
  function read(me, rec) {
    if (!canSee(me, rec.collection) || rec.deleted) return null;
    const R = me.role;
    if (R === 'Mentor' || R === 'Student') return redact(me, rec.collection, rec.id, rec.data, rec);
    if (R === 'Collection Staff') { if (rec.collection === 'mentors') return pick(rec.data, ['id', 'name', 'subjects', 'status', 'phone']); if (rec.collection === 'accounts') return pick(rec.data, ['id', 'name', 'type']); if (rec.collection === 'batches') return omit(rec.data, ['mentorPay', 'direct', 'directNote']); }
    return rec.data;
  }

  /* ---------- writes ---------- */
  /* the minimum a money / people record needs, so a broken record can never reach the books */
  const DATE = /^\d{4}-\d{2}-\d{2}$/, MON = /^\d{4}-\d{2}$/, NUM = v => typeof v === 'number' && isFinite(v);
  const SHAPE = {
    payments: d => !d.stu ? 'Payment needs a student' : !DATE.test(d.date || '') ? 'Payment needs a date' : !NUM(d.amt) || d.amt < 0 ? 'Payment needs an amount' : !Array.isArray(d.alloc) ? 'Payment needs its months' : null,
    invoices: d => !d.stu ? 'Invoice needs a student' : !MON.test(d.month || '') ? 'Invoice needs a month' : !Array.isArray(d.items) ? 'Invoice needs its lines' : null,
    expenses: d => !DATE.test(d.date || '') ? 'Expense needs a date' : !MON.test(d.month || '') ? 'Expense needs a month' : !NUM(d.amt) || d.amt < 0 ? 'Expense needs an amount' : null,
    transfers: d => !DATE.test(d.date || '') || !d.from || !d.to || !NUM(d.amt) ? 'Transfer needs date, accounts and amount' : null,
    prpay: d => !MON.test(d.month || '') || !d.mentor || !NUM(d.amt) || !DATE.test(d.date || '') ? 'Teacher payment needs month, teacher, date and amount' : null,
    students: d => !d.name ? 'Student needs a name' : null,
    mentors: d => !d.name ? 'Teacher needs a name' : null,
    enrol: d => !d.stu || !d.prog || !DATE.test(d.start || '') || !Array.isArray(d.fees) ? 'Subject enrolment needs student, subject, start and fee' : null,
    accounts: d => !d.name ? 'Account needs a name' : null
  };
  function shape(c, d) { if (d === null || typeof d !== 'object') return 'Bad record'; const f = SHAPE[c]; return f ? f(d) : null; }
  const NO = reason => ({ ok: false, reason });
  const YES = data => ({ ok: true, data });
  const IGNORE = { ok: true, ignore: true };
  function write(me, c, id, data, old, ctx, now) {
    if (!me || !me.active) return NO('Not signed in');
    const R = me.role, del = data == null, prev = old && !old.deleted ? old.data : null;
    if (!id || String(id).length > 200 || !/^[a-z][a-z0-9_]{1,30}$/.test(c)) return NO('Bad record');
    if (!del && JSON.stringify(data).length > 1500000) return NO('Too large');
    if (!del) { const bad = shape(c, data); if (bad) return NO(bad); }
    if (has(APPEND, c)) { if (del || prev) return R === 'Owner' ? YES(data) : IGNORE; return YES(data); }
    if (R === 'Viewer') return NO('Viewers cannot change anything');
    if (R === 'Owner') return YES(data);
    if (has(OWNER_ONLY_WRITE, c)) return NO('Only the Owner can change this');
    if (R === 'Admin') return YES(data);
    if (R === 'Finance Manager') return has(MONEY, c) || has(PEOPLE, c) || c === 'notes' || c === 'bin' ? YES(data) : NO('Finance Managers cannot change this');
    if (R === 'Junior Admin') {
      if (has(MONEY, c)) {
        if (c === 'payments' && !del && !prev && data.status === 'Pending') return YES(data);
        if (c === 'follow') return YES(data);
        return NO('Junior Admins cannot change money records');
      }
      if (c === 'enrol' && prev && !del && (JSON.stringify(prev.fees) !== JSON.stringify(data.fees) || (prev.disc || 0) !== (data.disc || 0))) return NO('Only the Owner, Admin or Finance can change fees');
      if (del && c !== 'bin' && c !== 'notes') return NO('Junior Admins cannot delete');
      return has(PEOPLE, c) || has(TEACH, c) || has(COMMS, c) || c === 'notes' || c === 'bin' ? YES(data) : NO('Junior Admins cannot change this');
    }
    if (R === 'Collection Staff') {
      if (c === 'payments') { if (del) return NO('Collection Staff cannot delete payments'); if (prev && prev.status !== 'Pending') return NO('A verified payment can be changed only by Finance'); if (data.status !== 'Pending') return NO('Collection Staff save payments as Pending; Finance verifies them'); return YES(data); }
      return has(['follow', 'notes'], c) ? YES(data) : NO('Collection Staff cannot change this');
    }
    if (R === 'Mentor') return writeMentor(me, c, id, data, prev, ctx, now);
    if (R === 'Student') return writeStudent(me, c, id, data, prev, ctx, now);
    return NO('Not allowed');
  }
  function mineTag(me, c, id, data, ctx) { return has(tags(c, id, data, ctx).mentor_ids, me.mentor_id); }
  function writeMentor(me, c, id, data, prev, ctx) {
    const m = me.mentor_id, del = data == null;
    if (!has(MENTOR_WRITE, c)) return NO('Teachers cannot change this');
    const chk = d => d && mineTag(me, c, id, d, ctx);
    if (c === 'notices' || c === 'circles') return selfOnly(me, c, data, prev, 'men:' + m);
    if (c === 'req') { const k = 'men:' + m; if (prev && prev.from !== k) return IGNORE; if (data && data.from !== k) return NO('Not your request'); return YES(data); }
    if (c === 'ox' || c === 'qb') { if (prev && !chk(prev)) return IGNORE; if (data && !chk(data) && c === 'ox') return IGNORE; return YES(data); }
    if (c === 'leave') { if ((prev && prev.mentor !== m) || (data && data.mentor !== m)) return NO('Not your leave report'); if (prev && prev.status && prev.status !== 'Pending' && data && data.status !== prev.status) return NO('The office already answered this report'); return YES(data); }
    if (c === 'events') { if ((prev && prev.mentor !== m) || (data && data.mentor !== m)) return NO('Not your event'); return YES(data); }
    if (c === 'pend' || c === 'sreq') { if ((prev && prev.by !== m) || (data && data.by !== m)) return NO('Not your request'); if (prev && prev.status && prev.status !== 'Pending' && !del) return NO('The office already answered this'); return YES(data); }
    if (c === 'sport') { if (prev && prev.status !== 'Pending') return NO('Only the office can change an open portal'); if (data && data.status !== 'Pending') data = Object.assign({}, data, { status: 'Pending' }); if (data && !chk(data)) return NO('Not your student'); return YES(data); }
    if (c === 'marks' && prev && ['Approved', 'Published'].indexOf(prev.status) > -1) return NO('These marks are approved; ask the office to reopen them');
    if (c === 'marks' && data && ['Approved', 'Published'].indexOf(data.status) > -1 && (!prev || prev.status !== data.status)) return NO('Only the office approves marks');
    if (prev && !chk(prev)) return NO('This belongs to another teacher');
    if (data && !chk(data)) return NO('This belongs to another teacher');
    return YES(data);
  }
  function selfOnly(me, c, data, prev, k) {
    /* teachers and students may only add or remove themselves (seen / acks / join / leave); everything else stays as it was */
    if (!prev || data == null) return IGNORE;
    const out = clone(prev);
    if (c === 'notices') { ['seen', 'acks'].forEach(f => { out[f] = out[f] || {}; if (data[f] && data[f][k] !== undefined) out[f][k] = data[f][k]; }); }
    if (c === 'circles') {
      const open = out.kind === 'manual' && out.open !== false && (out.open || out.policy === 'On request');
      const want = (data.members || []).indexOf(k) > -1, was = (out.members || []).indexOf(k) > -1;
      if (want !== was) { if (!open) return NO('This circle cannot be joined or left from the portal'); out.members = (out.members || []).filter(x => x !== k); if (want) out.members.push(k); }
    }
    return { ok: true, data: out, merged: true };
  }
  function writeStudent(me, c, id, data, prev, ctx, now) {
    const s = me.student_id;
    if (!has(STUDENT_WRITE, c)) return NO('Students cannot change this');
    if (c === 'notices' || c === 'circles') return selfOnly(me, c, data, prev, 'stu:' + s);
    if (c === 'req') { const k = 'stu:' + s; if (prev && prev.from !== k) return IGNORE; if (data && data.from !== k) return NO('Not your request'); if (prev && data) { const out = clone(prev); out.thread = data.thread; out.msg = data.msg; return { ok: true, data: out, merged: true }; } return data ? YES(Object.assign({}, data, { status: 'New' })) : NO('Only the office can delete requests'); }
    if (c === 'oxatt') {
      const [oxId, sid] = String(id).split('|'); if (sid !== s) return NO('Not your exam');
      if (data == null) return NO('Exam attempts cannot be deleted');
      const ox = ctx && ctx.get('ox', oxId); if (!ox) return NO('Exam not found');
      const t = now || Date.now();
      if (prev && ['Submitted', 'Auto-submitted'].indexOf(prev.status) > -1) return NO('Already submitted');
      const out = Object.assign({}, prev || {}, pick(data, ['ans', 'files', 'flags', 'status', 'saved', 'ref', 'submitted']));
      if (!prev) { const ext = ((ox.extra || {})[s] || 0) * 60000, close = Date.parse(ox.close) || t + 864e5; out.start = t; out.deadline = Math.min(t + (ox.dur || 60) * 60000 + ext, close + ext); out.status = 'In progress'; }
      if (prev && t > (prev.deadline || 0) + 120000 && data.status === 'In progress') return NO('Time is up');
      if (['In progress', 'Submitted', 'Auto-submitted'].indexOf(out.status) < 0) out.status = 'In progress';
      if (out.status !== 'In progress') { out.submitted = Math.min(t, out.deadline || t); out.mstatus = 'Pending'; }
      out.marks = (prev && prev.marks) || {}; if (!prev || out.status === 'In progress') out.mstatus = (prev && prev.mstatus) || '';
      return { ok: true, data: out, merged: true };
    }
    return NO('Not allowed');
  }

  /* ---------- members (who may sign in, and as what) ---------- */
  function memberWrite(me, target, prev) {
    if (!me || !me.active) return NO('Not signed in');
    const R = me.role, email = String((target && target.email) || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return NO('Enter a full Gmail address');
    if (target.role && !has(ROLES, target.role)) return NO('Unknown role');
    if (prev && prev.role === 'Owner' && R !== 'Owner') return NO('Only the Owner can change the Owner');
    if (prev && prev.role === 'Owner' && (target.deleted || target.active === false || target.role !== 'Owner') && email === me.email) return NO('The Owner cannot remove themself');
    if (R === 'Owner') return YES(Object.assign({}, target, { email }));
    if (R === 'Admin') { if (has(['Owner', 'Admin'], target.role) || (prev && has(['Owner', 'Admin'], prev.role))) return NO('Only the Owner can add or remove Admins'); return YES(Object.assign({}, target, { email })); }
    if (R === 'Junior Admin') { if (['Student', 'Mentor'].indexOf(target.role) < 0 || (prev && prev.role !== target.role)) return NO('Junior Admins can give access only to teachers and students'); return YES(Object.assign({}, target, { email })); }
    if (R === 'Mentor') { if (target.role !== 'Student' || (prev && prev.role !== 'Student') || target.deleted) return NO('Teachers can only request a Student Portal'); return YES(Object.assign({}, target, { email, active: false })); }
    return NO('Only the Owner or an Admin can manage sign-in access');
  }
  function canListMembers(me) { return !!me && me.active && ['Owner', 'Admin'].indexOf(me.role) > -1; }

  return { ROLES, OFFICE, MONEY, PEOPLE, TEACH, COMMS, SETTINGS, tags, read, write, canSee, memberWrite, canListMembers, shape };
});
