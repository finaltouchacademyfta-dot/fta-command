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
  const MONEY_SECRET = ['rcsal', 'payroll', 'prpay', 'accounts', 'others', 'transfers', 'budget', 'recon', 'bonus', 'deduct', 'shares', 'expenses', 'advapp', 'refunds', 'checks'];
  const PEOPLE = ['students', 'enrol', 'mentors', 'progs', 'batches', 'sport', 'pend'];
  const TEACH = ['clslive', 'slotreq', 'groups', 'rt', 'rout', 'prr', 'att', 'attx', 'hw', 'exams', 'marks', 'cnotes', 'leave', 'events', 'sreq', 'ox', 'qb', 'oxatt', 'topics', 'classes', 'snotices', 'subf'];
  const COMMS = ['notices', 'circles', 'req'];
  const SETTINGS = ['org', 'perm', 'docset', 'msgs', 'ui', 'boards', 'boards8', 'levels', 'classlist', 'statuses', 'paymethods', 'lists', 'settings', 'themes'];
  const OFFICE_ONLY = ['logins', 'staff', 'users', 'bin', 'notes', 'audit'];
  const APPEND = ['log', 'audit'];
  const OWNER_ONLY_WRITE = ['perm', 'staff', 'logins', 'users', 'org', 'docset', 'msgs', 'ui', 'themes', 'settings'];
  /* collections teachers and students may read (always filtered by tags and redacted) */
  const MENTOR_READ = ['msg', 'students', 'enrol', 'mentors', 'progs', 'batches', 'sport', 'pend', 'payroll', 'prpay', 'shares'].concat(SETTINGS, TEACH, COMMS);
  const MENTOR_WRITE = ['msg', 'clslive', 'mentors', 'slotreq', 'att', 'attx', 'hw', 'cnotes', 'leave', 'events', 'pend', 'sreq', 'rt', 'marks', 'sport', 'req', 'notices', 'circles', 'oxatt', 'ox', 'qb', 'prr', 'log'];
  const STUDENT_READ = ['msg', 'clslive', 'students', 'enrol', 'mentors', 'progs', 'groups', 'rt', 'att', 'attx', 'hw', 'exams', 'marks', 'cnotes', 'events', 'ox', 'qb', 'oxatt', 'notices', 'circles', 'req', 'topics', 'classes', 'prr'].concat(SETTINGS);
  const STUDENT_WRITE = ['msg', 'students', 'oxatt', 'req', 'notices', 'circles', 'log'];
  /* Receipt Maker: receipts, salary slips and their shared settings (numbering floor, look, texts, signature, templates) */
  const RECEIPTS = ['rcpt', 'rcsal', 'rcset'];
  const RC_MAKE = { rcpt: ['Owner', 'Admin', 'Finance Manager', 'Junior Admin', 'Collection Staff'], rcsal: ['Owner', 'Admin', 'Finance Manager'] };
  const RC_VOID = ['Owner', 'Admin', 'Finance Manager'];
  const RC_SET = ['Owner', 'Admin', 'Finance Manager', 'Junior Admin'];
  /* the fields a teacher / student may change on their own profile (everything else stays as the office saved it) */
  const SELF = { mentors: ['phone', 'address', 'pay', 'specialties', 'qual', 'bio', 'availability', 'slotsPreferred', 'photo'], students: ['address', 'bio', 'photo'] };
  /* a mentor never receives a student's contact details, and a student never a mentor's: they talk only inside the academy's Messages */
  const CONTACT = ['phone', 'gphone', 'gmail', 'email', 'address', 'whatsapp', 'wa', 'emergency', 'mobile', 'altPhone'];
  /* messages: only these office roles may read or write them (Owner / Admin read every chat, to keep students safe) */
  const MSG_OFFICE = ['Owner', 'Admin'];
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
      case 'students': if (!tagged) return null; return omit(d, ['notes', 'fees', 'disc'].concat(R === 'Mentor' ? CONTACT : []));
      case 'enrol': if (!tagged) return null; return omit(d, ['fees', 'disc', 'discEnd', 'discBy']);
      case 'progs': return omit(d, ['fee', 'fees', 'price']);
      case 'batches': if (R === 'Student') return null; return omit(d, ['mentorPay', 'direct', 'directNote', 'fee']);
      case 'mentors': if (R === 'Mentor' && id === mine) return omit(d, ['notes']); return pick(d, ['id', 'name', 'subjects', 'status']);
      case 'sport': return tagged ? (R === 'Student' ? omit(d, ['by', 'role']) : omit(d, ['gmail'])) : null;
      case 'pend': return tagged ? (R === 'Student' ? omit(d, ['by', 'role']) : d) : null;
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
      case 'slotreq': return R === 'Mentor' && d.mentor === mine ? d : null;
      case 'clslive': if (!tagged && !(R === 'Mentor' && d.mentor === mine)) return null; return R === 'Student' && d.status !== 'On' ? omit(d, ['link']) : d;
      case 'msg': { const room = String(d.room || ''); if (room.indexOf('dm:') === 0) return room.slice(3).split('|').indexOf(mine) > -1 ? d : null; return tagged ? d : null; }
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
    if (c === 'agentmem') return R === 'Owner';   /* the AI assistant's memory: Owner only */
    if (c === 'msg') return has(MSG_OFFICE, R) || R === 'Mentor' || R === 'Student';
    if (R === 'Owner' || R === 'Admin' || R === 'Finance Manager' || R === 'Viewer') return c !== 'audit' || R === 'Owner' || R === 'Admin';
    if (R === 'Junior Admin') return !has(MONEY_SECRET, c) && c !== 'audit' && c !== 'staff' && c !== 'logins' && c !== 'users';
    if (R === 'Collection Staff') return has(['rcpt', 'rcset', 'students', 'enrol', 'progs', 'mentors', 'batches', 'invoices', 'payments', 'advapp', 'accounts', 'follow', 'notes', 'notices', 'circles', 'close', 'mst', 'mstatus', 'methods', 'expcats', 'log'], c) || has(SETTINGS, c);
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
    if (c === 'agentmem' && R !== 'Owner') return NO('Only the Owner can change this');
    if (has(APPEND, c)) { if (del || prev) return R === 'Owner' ? YES(data) : IGNORE; return YES(data); }
    if (R === 'Viewer') return NO('Viewers cannot change anything');
    if (has(RECEIPTS, c)) return writeReceipt(me, c, id, data, prev, now);
    if (c === 'msg') return writeMsg(me, id, data, prev, ctx, now);
    if (c === 'clslive') return writeLive(me, id, data, prev, ctx, now);
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
  /* ---------- Receipt Maker ----------
     A receipt / salary slip is never changed after it is issued and never deleted (Owner only, for a test copy).
     The only later change is VOID, by Owner / Admin / Finance Manager, stamped by the server.
     A new number that is already taken is refused, so two people can never print the same number. */
  const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
  function writeReceipt(me, c, id, data, prev, now) {
    const R = me.role, del = data == null;
    if (c === 'rcset') {
      if (!has(RC_SET, R)) return NO('You cannot change the Receipt Maker settings');
      if (del) return R === 'Owner' ? YES(null) : NO('Only the Owner can delete the Receipt Maker settings');
      if (id !== 'main') return NO('Bad record');
      return YES(data);
    }
    if (del) return R === 'Owner' ? YES(null) : NO('Issued documents are never deleted. Void it instead.');
    const doc = c === 'rcsal' ? 'salary' : 'receipt';
    if (!data.d || data.d.doc !== doc || data.no !== id || !/^[A-Z0-9-]{1,40}$/.test(id)) return NO('Bad document');
    if (!prev) {
      if (!has(RC_MAKE[c], R)) return NO(c === 'rcsal' ? 'Only the Owner, Admin or Finance can issue salary slips' : 'You cannot issue receipts');
      return { ok: true, data: Object.assign({}, data, { void: false, voidReason: '', voidBy: '', voidAt: '', issuedBy: me.email, issuedRole: R }), merged: true };
    }
    if (data.tok !== prev.tok || data.at !== prev.at) return NO('This number (' + id + ') was just used by someone else. Press Save again to take the next number.');
    if (prev.void) return IGNORE;
    if (!data.void) return IGNORE;                                     /* nothing that may change, changed */
    if (!has(RC_VOID, R)) return NO('Only the Owner, Admin or Finance can void documents');
    const why = txt(data.voidReason, 240).trim(); if (why.length < 3) return NO('Write why it is voided');
    const out = clone(prev);
    out.void = true; out.voidReason = why; out.voidBy = txt(data.voidBy || me.email, 80); out.voidByEmail = me.email; out.voidAt = new Date(now || Date.now()).toISOString();
    return { ok: true, data: out, merged: true };
  }
  /* ---------- Messages ----------
     rooms: 'g:<group id>' (the class group) and 'dm:<a>|<b>' (two people, sorted; 'U:office' = the academy office).
     A mentor writes only to their own class groups and to their own students or the office; a student only to their
     own classes, their own mentors or the office. Who wrote it and when is set by the server. Never edited; only the
     Owner / Admin may remove a message. Kept 6 months (server housekeeping). */
  const BD_DAY = t => new Date((t || Date.now()) + 6 * 3600000).toISOString().slice(0, 10);
  function teaches(ctx, men, stu) { return !!ctx && (ctx.all('enrol').some(E => E.stu === stu && E.mentor === men && E.status !== 'Completed') || ctx.all('groups').some(G => G.mentor === men && G.status !== 'Closed' && (G.stu || []).indexOf(stu) > -1)); }
  function writeMsg(me, id, data, prev, ctx, now) {
    const R = me.role, office = has(MSG_OFFICE, R);
    if (!office && R !== 'Mentor' && R !== 'Student') return NO('You cannot send messages');
    if (data == null) return prev ? (office ? YES(null) : NO('Only the Owner or Admin can remove a message')) : IGNORE;
    if (prev) return IGNORE;                                                            /* a sent message never changes */
    const mine = R === 'Mentor' ? me.mentor_id : R === 'Student' ? me.student_id : 'U:office';
    if (!mine) return NO('Your account is not linked yet');
    const room = String(data.room || ''), text = txt(data.text, 2000).trim();
    if (!text) return NO('Write a message');
    let gid = '';
    if (room.indexOf('g:') === 0) {
      gid = room.slice(2); const G = ctx && ctx.get('groups', gid); if (!G) return NO('Class not found');
      if (R === 'Mentor' && G.mentor !== mine) return NO('Not your class');
      if (R === 'Student' && (G.stu || []).indexOf(mine) < 0) return NO('Not your class');
    } else if (room.indexOf('dm:') === 0) {
      const ab = room.slice(3).split('|'); if (ab.length !== 2 || ab[0] === ab[1] || ab.slice().sort().join('|') !== ab.join('|')) return NO('Bad chat');
      if (ab.indexOf(mine) < 0) return NO('Not your chat');
      const other = ab[0] === mine ? ab[1] : ab[0];
      if (other !== 'U:office') {
        if (R === 'Mentor' && !(/^STU-/.test(other) && teaches(ctx, mine, other))) return NO('You can message only your own students and the office');
        if (R === 'Student' && !(/^MEN-/.test(other) && teaches(ctx, other, mine))) return NO('You can message only your own mentors and the office');
        /* the office answers anyone in its own chat ('U:office' is one side, checked above) */
        if (office && !/^(MEN|STU)-/.test(other)) return NO('Bad chat');
      }
    } else return NO('Bad chat');
    /* 'by' is the sender (from the sign-in); screens show the name from the academy's own list for that id */
    return { ok: true, merged: true, data: { id, room, gid, by: mine, name: office ? 'Academy Office' : txt(data.name, 80), role: R, text, at: new Date(now || Date.now()).toISOString() } };
  }
  /* ---------- Class status: a mentor presses Start / End; everyone concerned sees which class is running ---------- */
  function writeLive(me, id, data, prev, ctx, now) {
    const R = me.role, t = new Date(now || Date.now()).toISOString();
    if (R === 'Student') return NO('Students cannot change the class status');
    const office = ['Owner', 'Admin', 'Junior Admin'].indexOf(R) > -1;
    if (!office && R !== 'Mentor') return NO('You cannot change the class status');
    if (data == null) return R === 'Owner' ? YES(null) : NO('Class records are kept');
    const gid = String(data.gid || (prev && prev.gid) || ''), G = ctx && ctx.get('groups', gid);
    if (!G) return NO('Class not found');
    if (R === 'Mentor' && G.mentor !== me.mentor_id) return NO('Not your class');
    const link = txt(data.link, 300).trim();
    if (link && !/^https:\/\/[^\s"'<>]+$/.test(link)) return NO('The class link must start with https://');
    if (!prev) {
      if (data.status !== 'On') return NO('Start the class first');
      return { ok: true, merged: true, data: { id, gid, mentor: G.mentor, status: 'On', link, date: BD_DAY(now), start: t, end: '', by: R === 'Mentor' ? me.mentor_id : 'U:office', note: txt(data.note, 140) } };
    }
    const out = clone(prev);
    if (prev.status === 'Off') return IGNORE;
    if (data.status === 'Off') { out.status = 'Off'; out.end = t; out.endBy = R === 'Mentor' ? me.mentor_id : 'U:office'; }
    else out.link = link;
    return { ok: true, data: out, merged: true };
  }
  /* a teacher / student changes their own profile: only their own row, only their own fields */
  function selfProfile(me, c, id, data, prev) {
    const mine = c === 'mentors' ? me.mentor_id : me.student_id;
    if (!mine || id !== mine) return NO(c === 'mentors' ? 'Teachers can change only their own profile' : 'Students can change only their own profile');
    if (!prev || data == null) return NO('Only the office can add or remove profiles');
    const out = clone(prev);
    for (const k of SELF[c]) {
      if (!(k in data) || JSON.stringify(data[k]) === JSON.stringify(prev[k])) continue;
      let v = data[k];
      if (k === 'photo') { if (v && (typeof v !== 'string' || !(/^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length < 200000) && !/^fta-file:/.test(v))) return NO('Use a smaller photo'); }
      else if (k === 'slotsPreferred') { v = v === '' || v == null ? '' : Math.max(0, Math.min(200, parseInt(v, 10) || 0)); }
      else v = txt(v, k === 'bio' || k === 'qual' || k === 'availability' ? 2000 : 300);
      out[k] = v;
    }
    return { ok: true, data: out, merged: true };
  }
  /* a mentor asks the office for a new mentorship slot; the office approves or declines it */
  function slotRequest(me, id, data, prev, ctx) {
    const m = me.mentor_id;
    if (prev && prev.mentor !== m) return NO('Not your request');
    if (data == null) return prev && (prev.status || 'Pending') === 'Pending' ? YES(null) : NO('The office already answered this request');
    if (prev) return NO('The office answers slot requests; cancel it and send a new one');
    if (data.mentor !== m) return NO('Not your request');
    if (data.stu) {
      const teaches = (ctx ? ctx.all('enrol') : []).some(E => E.stu === data.stu && E.mentor === m) || (ctx ? ctx.all('groups') : []).some(G => G.mentor === m && (G.stu || []).indexOf(data.stu) > -1);
      if (!teaches) return NO('You can add only your own students');
    }
    return { ok: true, merged: true, data: { id, mentor: m, stu: txt(data.stu, 40), prog: txt(data.prog, 40), when: txt(data.when, 120), medium: txt(data.medium, 20) || 'In person', grade: txt(data.grade, 60), note: txt(data.note, 140), at: txt(data.at, 10), by: 'mentor', status: 'Pending' } };
  }
  function mineTag(me, c, id, data, ctx) { return has(tags(c, id, data, ctx).mentor_ids, me.mentor_id); }
  function writeMentor(me, c, id, data, prev, ctx) {
    const m = me.mentor_id, del = data == null;
    if (!has(MENTOR_WRITE, c)) return NO('Teachers cannot change this');
    if (c === 'mentors') return selfProfile(me, c, id, data, prev);
    if (c === 'slotreq') return slotRequest(me, id, data, prev, ctx);
    const chk = d => d && mineTag(me, c, id, d, ctx);
    if (c === 'notices' || c === 'circles') return selfOnly(me, c, data, prev, 'men:' + m);
    if (c === 'req') { const k = 'men:' + m; if (prev && prev.from !== k) return IGNORE; if (data && data.from !== k) return NO('Not your request'); return YES(data); }
    if (c === 'ox' || c === 'qb') { if (prev && !chk(prev)) return IGNORE; if (data && !chk(data) && c === 'ox') return IGNORE; return YES(data); }
    if (c === 'leave') { if ((prev && prev.mentor !== m) || (data && data.mentor !== m)) return NO('Not your leave report'); if (prev && prev.status && prev.status !== 'Pending' && data && data.status !== prev.status) return NO('The office already answered this report'); return YES(data); }
    if (c === 'events') { if ((prev && prev.mentor !== m) || (data && data.mentor !== m)) return NO('Not your event'); return YES(data); }
    if (c === 'pend' || c === 'sreq') { if ((prev && prev.by !== m) || (data && data.by !== m)) return NO('Not your request'); if (prev && prev.status && prev.status !== 'Pending' && !del) return NO('The office already answered this'); return YES(data); }
    if (c === 'sport') { if (prev && prev.status !== 'Pending') return NO('Only the office can change an open portal');
      if (prev && data && !data.gmail && prev.gmail) data = Object.assign({}, data, { gmail: prev.gmail });   /* the teacher never sees the Gmail again */ if (data && data.status !== 'Pending') data = Object.assign({}, data, { status: 'Pending' }); if (data && !chk(data)) return NO('Not your student'); return YES(data); }
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
    if (c === 'students') return selfProfile(me, c, id, data, prev);
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

  return { RECEIPTS, SELF, ROLES, OFFICE, MONEY, PEOPLE, TEACH, COMMS, SETTINGS, tags, read, write, canSee, memberWrite, canListMembers, shape };
});
