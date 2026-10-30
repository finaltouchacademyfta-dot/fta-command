/* =====================================================================
   FTA Command Centre · who gets which notification (phones and laptops)
   One copy, used by the Netlify functions and by the in-browser mock backend.
   · events()  turns a saved change into notifications (notice published,
               homework set, reply in a thread, marks published, …)
   · resolve() turns an audience into Gmail accounts — every person must also
               be allowed to READ the record (FTAPolicy.read), so a
               notification can never show something its reader may not see
   · remind()  time-based reminders (events, exams opening, homework due)
   · drain()   sends what is waiting, per device, honouring each device's
               on/off choices; devices that were uninstalled are forgotten
   ===================================================================== */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./fta-policy.js')); else root.FTANotify = factory(root.FTAPolicy); })(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';
  const CATS = ['notices', 'messages', 'homework', 'classes', 'exams', 'office', 'money'];
  const OFFICE = ['Owner', 'Admin', 'Junior Admin', 'Finance Manager', 'Collection Staff', 'Viewer'];
  const DESK = ['Owner', 'Admin', 'Junior Admin'];            /* inbox, approvals */
  const FIN = ['Owner', 'Admin', 'Finance Manager'];          /* money to verify */
  const TZ = 6 * 3600e3;                                      /* Asia/Dhaka, no daylight saving */
  /* the screen each kind of person lands on when they tap the notification */
  const PG = {
    notices: { S: 'sp-notices', M: 'tp-notices', O: 'nc-notices' }, circles: { S: 'sp-notices', M: 'tp-notices', O: 'nc-notices' },
    req: { S: 'sp-notices', M: 'tp-notices', O: 'nc-notices' }, hw: { S: 'sp-cal', M: 'tp-hw', O: 'ac-cal' }, cnotes: { S: 'sp-notes', M: 'tp-notes', O: 'ac-cal' },
    att: { S: 'sp-att', M: 'tp-att', O: 'ac-att' }, events: { S: 'sp-cal', M: 'tp-cal', O: 'ac-cal' }, rt: { S: 'sp-cal', M: 'tp-routine', O: 'ac-routine' },
    marks: { S: 'sp-results', M: 'tp-marks', O: 'ac-exams' }, prr: { S: 'sp-results', M: 'tp-progress', O: 'ac-progress' }, ox: { S: 'sp-exams', M: 'tp-exams', O: 'ac-online' },
    oxatt: { M: 'tp-exams', O: 'ac-online' }, qb: { M: 'tp-exams', O: 'ac-online' }, pend: { M: 'tp-students', O: 'ac-portals' }, sreq: { M: 'tp-students', O: 'students' },
    leave: { M: 'tp-leave', O: 'ac-portals' }, payments: { O: 'payments' }, test: { S: 'sp-home', M: 'tp-home', O: 'dashboard' }
  };
  const has = (a, x) => (a || []).indexOf(x) > -1;
  const uniq = a => Array.from(new Set((a || []).filter(Boolean)));
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > (n || 160) ? s.slice(0, (n || 160) - 1) + '…' : s; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fdate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? (+m[3]) + ' ' + MON[+m[2] - 1] : ''; };
  const t12 = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return ''; const h = +m[1]; return (h % 12 || 12) + ':' + m[2] + (h < 12 ? ' am' : ' pm'); };
  const dhaka = ms => new Date(ms + TZ).toISOString();          /* 'YYYY-MM-DDTHH:MM…' in Dhaka time */
  const atDhaka = (d, t) => Date.parse(d + 'T' + (t || '00:00') + ':00+06:00');
  const money = n => '৳' + Math.round(+n || 0).toLocaleString('en-IN');

  /* ---------- names and audiences from the academy's own records ---------- */
  const AUTO = { 'CI-TEACH': { id: 'CI-TEACH', name: 'Teacher Circle', kind: 'auto', rule: { who: 'teachers' } }, 'CI-STU': { id: 'CI-STU', name: 'Student Circle', kind: 'auto', rule: { who: 'students' } }, 'CI-GUARD': { id: 'CI-GUARD', name: 'Guardian Circle', kind: 'auto', rule: { who: 'guardians' } } };
  function helper(D) {
    const by = c => { const m = new Map(); (D[c] || []).forEach(x => { if (x && x.id != null) m.set(String(x.id), x); }); return m; };
    const S = by('students'), Mn = by('mentors'), G = by('groups'), C = by('circles'), E = by('exams'), OX = by('ox');
    const cur = dhaka(Date.now()).slice(0, 7);
    const X = {
      stuName: id => (S.get(id) || {}).name || id, menName: id => (Mn.get(id) || {}).name || id,
      group: id => G.get(id) || { stu: [], name: '' }, groupName: id => (G.get(id) || {}).name || '',
      exam: id => (E.get(id) || {}).name || '', oxTitle: id => (OX.get(id) || {}).title || 'Online exam',
      keyName: k => { const [t, id] = String(k || '').split(':'); return t === 'men' ? X.menName(id) : t === 'grd' ? ((S.get(id) || {}).guardian || 'Guardian of ' + X.stuName(id)) : X.stuName(id); },
      circle: id => C.get(id) || AUTO[id] || null,
      circleKeys: ids => uniq([].concat.apply([], (ids || []).map(id => {
        const c = X.circle(id); if (!c) return []; const r = c.rule || {}, out = [];
        if (c.kind === 'manual') (c.members || []).forEach(x => out.push(x));
        else {
          if (r.who === 'teachers') (D.mentors || []).filter(m => m.status === 'Active').forEach(m => out.push('men:' + m.id));
          if (r.who === 'students' || r.who === 'guardians') (D.students || []).filter(s => s.status === 'Active' && (!r.cls || has(r.cls, s.cls)) && (!r.board || r.board === s.board) && (!r.prog || (D.enrol || []).some(e => e.stu === s.id && e.prog === r.prog && (!e.end || e.end >= cur) && e.status !== 'Ended'))).forEach(s => { if (r.who === 'students') out.push('stu:' + s.id); if (r.who === 'guardians' || r.guardians) out.push('grd:' + s.id); });
          (c.extra || []).forEach(x => out.push(x));
        }
        return out;
      })))
    };
    return X;
  }
  const NEEDS = ['students', 'mentors', 'groups', 'circles', 'exams', 'ox', 'enrol'];
  /* an audience from portal keys ('stu:STU-1', 'grd:STU-1', 'men:MEN-1') */
  const keysAud = keys => ({ stu: uniq((keys || []).filter(k => /^(stu|grd):/.test(k)).map(k => k.split(':')[1])), men: uniq((keys || []).filter(k => /^men:/.test(k)).map(k => k.split(':')[1])) });

  /* ---------- 1. a saved change → notifications ---------- */
  /* quick test first, so ordinary saves (payments edits, settings…) cost nothing */
  const WATCH = ['notices', 'circles', 'req', 'hw', 'cnotes', 'att', 'events', 'rt', 'marks', 'prr', 'ox', 'oxatt', 'qb', 'pend', 'sreq', 'leave', 'payments'];
  function watched(c) { return has(WATCH, c); }
  function events(c, id, prev, next, actor, tg, X) {
    const E = [], d = next || {}, p = prev || {}, A = actor.role, office = has(OFFICE, A);
    const into = set => !!next && has(set, d.status) && !(prev && has(set, p.status));
    const add = (cat, aud, title, body, x) => E.push(Object.assign({ c, id, cat, aud, title: clip(title, 70), body: clip(body) }, x || {}));
    const tS = tg.student_ids || [], tM = tg.mentor_ids || [];
    if (!next) return E;                                       /* deletions never notify */
    switch (c) {
      case 'notices': {
        if (into(['Published'])) {
          const names = (d.circles || []).map(i => (X.circle(i) || {}).name).filter(Boolean);
          add('notices', keysAud(X.circleKeys(d.circles)), 'New notice' + (names.length === 1 ? ' · ' + names[0] : ''), d.title, { open: { nt: id }, tag: 'nt-' + id, urgency: /urgent|emergency|closed|cancel/i.test(d.type + ' ' + d.title) ? 'high' : 'normal' });
        } else if (into(['Pending'])) add('office', { office: ['Owner', 'Admin'] }, 'Notice waiting to publish', d.title, { tag: 'nt-' + id });
        break;
      }
      case 'circles': {
        if (!prev || !office || d.kind !== 'manual') break;
        const added = (d.members || []).filter(k => !has(p.members, k));
        if (added.length) add('notices', keysAud(added), 'You were added to ' + (d.name || 'a circle'), d.desc || 'You will now get its notices.', { tag: 'ci-' + id });
        break;
      }
      case 'req': {
        const from = d.from || p.from, who = X.keyName(from), th = d.thread || [], pth = p.thread || [];
        if (!prev) add('messages', { office: DESK }, (d.type === 'join' ? 'Join request' : 'New message') + ' from ' + who, d.msg, { open: { tab: 'inbox' }, tag: 'rq-' + id });
        else if (th.length > pth.length) {
          const last = th[th.length - 1] || {};
          if (office) add('messages', keysAud([from]), d.status === 'Declined' ? 'The office declined your request' : d.status === 'Approved' ? 'Your request was approved' : 'The office replied', last.t, { tag: 'rq-' + id });
          else add('messages', { office: DESK }, 'New reply from ' + who, last.t, { open: { tab: 'inbox' }, tag: 'rq-' + id });
        } else if (office && d.status !== p.status && has(['Approved', 'Declined'], d.status)) add('messages', keysAud([from]), 'Your request was ' + d.status.toLowerCase(), d.msg, { tag: 'rq-' + id });
        break;
      }
      case 'hw': {
        const changed = !prev || p.due !== d.due || p.title !== d.title || p.details !== d.details;
        if (!changed || d.status === 'Closed') break;
        const stu = Array.isArray(d.stu) && d.stu.length ? d.stu : tS;
        add('homework', { stu, men: office ? tM : [] }, (prev ? 'Homework changed' : 'New homework') + (X.groupName(d.gid) ? ' · ' + X.groupName(d.gid) : ''), d.title + (d.due ? ' · due ' + fdate(d.due) : ''), { tag: 'hw-' + id });
        break;
      }
      case 'cnotes': {
        if (!d.sent || p.sent) break;
        const stu = d.stu === '*' ? (X.group(d.gid).stu || []) : [d.stu];
        add('classes', { stu }, 'Class note · ' + fdate(d.date), [d.topic, d.hw && 'Homework: ' + d.hw, d.next && 'Next: ' + d.next].filter(Boolean).join(' · '), { tag: 'cn-' + id });
        break;
      }
      case 'att': {
        const [gid, date] = String(id).split('|'), pm = p.marks || {};
        Object.keys(d.marks || {}).forEach(sid => { const v = d.marks[sid]; if ((v === 'A' || v === 'L') && pm[sid] !== v) add('classes', { stu: [sid] }, v === 'A' ? 'Marked absent' : 'Marked late', [X.groupName(gid), fdate(date)].filter(Boolean).join(' · '), { tag: 'at-' + gid + '-' + sid }); });
        break;
      }
      case 'events': {
        if (prev && p.date === d.date && p.start === d.start && p.title === d.title && JSON.stringify(p.stu) === JSON.stringify(d.stu)) break;
        const men = d.mentor && !(A === 'Mentor' && actor.mentor_id === d.mentor) ? [d.mentor] : [];
        add('classes', { stu: d.stu || [], men }, (prev ? 'Changed · ' : 'New · ') + d.title, [fdate(d.date) + (d.allDay || !d.start ? '' : ' at ' + t12(d.start)), d.place].filter(Boolean).join(' · '), { tag: 'ev-' + id });
        break;
      }
      case 'rt': {
        if (!office) break;
        const k = x => [x.day, x.start, x.end, x.place, x.gid, x.mentor].join('|');
        if (prev && k(p) === k(d)) break;
        add('classes', { stu: tS, men: tM }, prev ? 'Routine changed' : 'New class on your routine', [X.groupName(d.gid) || d.title, d.day, d.start && t12(d.start) + (d.end ? '–' + t12(d.end) : ''), d.place].filter(Boolean).join(' · '), { tag: 'rt-' + id });
        break;
      }
      case 'marks': {
        const [ex] = String(id).split('|');
        if (into(['Approved', 'Published'])) add('exams', { stu: Object.keys(d.m || {}).length ? Object.keys(d.m) : tS }, 'Marks published', X.exam(ex) || 'Your marks are ready', { tag: 'mk-' + id });
        else if (into(['Submitted'])) add('office', { office: DESK }, 'Marks to approve', [X.exam(ex), X.groupName(String(id).split('|')[1])].filter(Boolean).join(' · '), { tag: 'mk-' + id });
        break;
      }
      case 'prr': {
        const sid = String(id).split('|')[0];
        if (into(['Sent', 'Published', 'Approved'])) add('exams', { stu: [sid] }, 'Progress report ready', 'Open your results to read it', { tag: 'pr-' + id });
        else if (into(['Waiting approval'])) add('office', { office: DESK }, 'Progress report to check', X.stuName(sid), { tag: 'pr-' + id });
        break;
      }
      case 'ox': {
        if (into(['Scheduled', 'Open'])) add('exams', { stu: tS }, 'New online exam', d.title + (d.open ? ' · opens ' + fdate(d.open) + ' ' + t12(String(d.open).slice(11)) : ''), { tag: 'ox-' + id });
        else if (into(['Published'])) add('exams', { stu: tS }, 'Exam result published', d.title, { tag: 'ox-' + id });
        else if (into(['Awaiting approval'])) add('office', { office: DESK }, 'Exam results waiting for approval', d.title, { tag: 'ox-' + id });
        break;
      }
      case 'oxatt': {
        const [ox, sid] = String(id).split('|');
        if (has(['Submitted', 'Auto-submitted'], d.status) && !has(['Submitted', 'Auto-submitted'], p.status)) add('exams', { men: tM }, 'Script to mark', X.stuName(sid) + ' · ' + X.oxTitle(ox), { tag: 'oa-' + ox });
        break;
      }
      case 'qb': if (!prev && d.status === 'Proposed' && A === 'Mentor') add('office', { office: DESK }, 'Question proposed by ' + X.menName(actor.mentor_id), d.text, { tag: 'qb' }); break;
      case 'pend': {
        if (!prev && A === 'Mentor') add('office', { office: DESK }, 'New student from ' + X.menName(d.by), d.name, { tag: 'pd-' + id });
        else if (prev && office && d.status !== p.status && d.status !== 'Pending' && /^MEN-/.test(d.by || '')) add('office', { men: [d.by] }, 'New student ' + String(d.status).toLowerCase(), d.name, { tag: 'pd-' + id });
        break;
      }
      case 'sreq': {
        if (!prev && A === 'Mentor') add('office', { office: DESK }, 'Subject change from ' + X.menName(d.by), X.stuName(d.sid), { tag: 'sr-' + id });
        else if (prev && office && d.status !== p.status && d.status !== 'Pending') add('office', { men: [d.by] }, 'Subject change ' + String(d.status).toLowerCase(), X.stuName(d.sid), { tag: 'sr-' + id });
        break;
      }
      case 'leave': {
        if (A === 'Mentor' && (!prev || (d.status !== p.status && has(['Submitted', 'Pending'], d.status)))) add('office', { office: DESK }, 'Leave report from ' + X.menName(d.mentor), [d.from && fdate(d.from), d.to && '– ' + fdate(d.to), d.reason || d.note].filter(Boolean).join(' '), { tag: 'lv-' + id });
        else if (prev && office && d.status !== p.status && !has(['Submitted', 'Pending'], d.status)) add('office', { men: [d.mentor] }, 'Leave ' + String(d.status).toLowerCase(), [d.from && fdate(d.from), d.note].filter(Boolean).join(' · '), { tag: 'lv-' + id });
        break;
      }
      case 'payments': if (!prev && d.status === 'Pending') add('money', { office: FIN }, 'Payment to verify', X.stuName(d.stu) + ' · ' + money(d.amt), { tag: 'py-' + id }); break;
    }
    return E;
  }

  /* ---------- 2. audience → Gmail accounts (only people who may read the record) ---------- */
  const kind = r => r === 'Student' ? 'S' : r === 'Mentor' ? 'M' : 'O';
  function urlFor(ev, role) {
    const page = (PG[ev.c] || PG.test)[kind(role)] || PG.test[kind(role)];
    const q = ['go=' + encodeURIComponent(page)];
    if (ev.open && ev.open.nt) q.push('nt=' + encodeURIComponent(ev.open.nt));
    if (ev.open && ev.open.tab && kind(role) === 'O') q.push('tab=' + encodeURIComponent(ev.open.tab));
    return '/?' + q.join('&');
  }
  function resolve(members, ev, row, actorEmail) {
    const a = ev.aud || {}, out = [];
    (members || []).forEach(m => {
      if (!m || !m.active || m.email === actorEmail) return;
      const hit = (m.role === 'Student' && has(a.stu, m.student_id)) || (m.role === 'Mentor' && has(a.men, m.mentor_id)) || (has(OFFICE, m.role) && has(a.office, m.role));
      if (!hit) return;
      if (row && P.read(m, row) == null) return;                /* never tell someone about what they may not see */
      out.push(m);
    });
    return out;
  }
  function payload(ev, m) { return { t: ev.title, b: ev.body, u: urlFor(ev, m.role), g: ev.tag || ev.c, c: ev.cat, ts: Date.now(), r: ev.urgency === 'high' ? 1 : 0 }; }
  /* many updates at once for one person → one tidy notification */
  function collapse(rows) {
    const byE = new Map(); rows.forEach(r => { if (!byE.has(r.email)) byE.set(r.email, []); byE.get(r.email).push(r); });
    const out = [];
    byE.forEach((list, email) => {
      if (list.length <= 3) { list.forEach(r => out.push(r)); return; }
      const cats = uniq(list.map(r => r.cat)), first = list[0].payload;
      out.push({ email, cat: cats.length === 1 ? cats[0] : 'office', payload: { t: list.length + ' new updates', b: clip(uniq(list.map(r => r.payload.t)).join(' · ')), u: first.u, g: 'many', c: cats[0], ts: Date.now(), r: list.some(r => r.payload.r) ? 1 : 0 } });
    });
    return out;
  }
  async function loadData(store, cache) {
    const D = {};
    for (const c of NEEDS) D[c] = cache && cache[c] ? cache[c] : (await store.allRecords(c)).filter(r => !r.deleted).map(r => r.data);
    return D;
  }
  /* done: [{ c, id, prev, next, tg }] from one save · returns queued rows */
  async function plan(store, actor, done, cache) {
    if (!store.enqueue) return [];
    const list = (done || []).filter(x => watched(x.c) && x.next); if (!list.length) return [];
    const X = helper(await loadData(store, cache)), members = await store.listMembers(), rows = [];
    list.forEach(x => events(x.c, x.id, x.prev, x.next, actor, x.tg || {}, X).forEach(ev => {
      const row = { collection: x.c, id: x.id, data: x.next, deleted: false, mentor_ids: (x.tg || {}).mentor_ids || [], student_ids: (x.tg || {}).student_ids || [] };
      resolve(members, ev, row, actor.email).forEach(m => rows.push({ email: m.email, cat: ev.cat, payload: payload(ev, m) }));
    }));
    const q = collapse(rows); if (q.length) await store.enqueue(q);
    return q;
  }

  /* ---------- 3. reminders (run every few minutes by the scheduled function) ---------- */
  const LEAD = { '5m': 5, '10m': 10, '15m': 15, '30m': 30, '1h': 60, '2h': 120, '3h': 180, '1d': 1440, '2d': 2880 };
  const dow = d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(d + 'T12:00:00Z').getUTCDay()];
  const occurs = (e, d) => { if (e.date === d) return true; if (!e.date || d < e.date || (e.until && d > e.until)) return false; if (e.repeat === 'weekly') return dow(d) === dow(e.date); if (e.repeat === 'monthly') return d.slice(8) === e.date.slice(8); return false; };
  async function remind(store, now) {
    if (!store.enqueue || !store.sentOnce) return [];
    now = now || Date.now();
    const today = dhaka(now).slice(0, 10), plus = n => dhaka(now + n * 864e5).slice(0, 10), hour = +dhaka(now).slice(11, 13);
    const rowsOf = async c => (await store.allRecords(c)).filter(r => !r.deleted);
    const evs = [];
    /* calendar events with a reminder */
    for (const r of await rowsOf('events')) {
      const e = r.data || {}; if (!e.remind || e.remind === 'none') continue; const lead = LEAD[e.remind] || 60;
      for (const d of [today, plus(1), plus(2)]) {
        if (!occurs(e, d)) continue;
        const at = atDhaka(d, e.allDay || !e.start ? '08:00' : e.start); if (now < at - lead * 60e3 || now >= at) continue;
        if (!(await store.sentOnce('ev:' + r.id + ':' + d))) continue;
        const when = d === today ? (e.allDay || !e.start ? 'Today' : 'Today at ' + t12(e.start)) : d === plus(1) ? 'Tomorrow' + (e.start && !e.allDay ? ' at ' + t12(e.start) : '') : fdate(d);
        evs.push([r, { c: 'events', id: r.id, cat: 'classes', aud: { stu: e.stu || [], men: e.mentor ? [e.mentor] : [] }, title: clip(when + ' · ' + e.title, 70), body: clip(e.place || e.details || ''), tag: 'ev-' + r.id, urgency: 'high' }]);
      }
    }
    /* online exams opening in the next 30 minutes */
    for (const r of await rowsOf('ox')) {
      const o = r.data || {}; if (!has(['Scheduled', 'Open'], o.status) || !o.open) continue;
      const at = Date.parse(String(o.open).length <= 16 ? o.open + ':00+06:00' : o.open); if (!(now >= at - 30 * 60e3 && now < at + 10 * 60e3)) continue;
      if (!(await store.sentOnce('ox-open:' + r.id))) continue;
      evs.push([r, { c: 'ox', id: r.id, cat: 'exams', aud: { stu: r.student_ids || [] }, title: now >= at ? 'Exam open now' : 'Exam opens at ' + t12(String(o.open).slice(11, 16)), body: clip(o.title), tag: 'ox-' + r.id, urgency: 'high' }]);
    }
    /* homework due tomorrow: one reminder in the evening */
    if (hour >= 17) for (const r of await rowsOf('hw')) {
      const h = r.data || {}; if (h.status === 'Closed' || h.due !== plus(1)) continue;
      if (!(await store.sentOnce('hw-due:' + r.id))) continue;
      evs.push([r, { c: 'hw', id: r.id, cat: 'homework', aud: { stu: Array.isArray(h.stu) && h.stu.length ? h.stu : r.student_ids || [] }, title: 'Homework due tomorrow', body: clip(h.title), tag: 'hw-' + r.id }]);
    }
    if (!evs.length) return [];
    const members = await store.listMembers(), rows = [];
    evs.forEach(([r, ev]) => resolve(members, ev, r, '').forEach(m => rows.push({ email: m.email, cat: ev.cat, payload: payload(ev, m) })));
    const q = collapse(rows); if (q.length) await store.enqueue(q);
    return q;
  }

  /* ---------- 4. send what is waiting ---------- */
  function cleanPrefs(p) { p = p || {}; return { off: uniq((p.off || []).filter(x => has(CATS, x))) }; }
  async function drain(store, budgetMs) {
    if (!store.claimQueue || !store.sendPush) return { sent: 0 };
    const t0 = Date.now(); let sent = 0, gone = 0; const vapid = await store.vapid();
    while (Date.now() - t0 < (budgetMs || 3000)) {
      const rows = await store.claimQueue(100); if (!rows.length) break;
      const subs = await store.subsFor(uniq(rows.map(r => r.email))), done = [], retry = [];
      const jobs = [];
      rows.forEach(r => {
        const devs = subs.filter(s => s.email === r.email && !has(cleanPrefs(s.prefs).off, r.cat));
        if (!devs.length) { done.push(r.id); return; }
        jobs.push({ r, devs });
      });
      /* up to 20 at a time */
      const tasks = []; jobs.forEach(j => j.devs.forEach(s => tasks.push([j, s])));
      const results = new Map();
      for (let i = 0; i < tasks.length; i += 20) {
        await Promise.all(tasks.slice(i, i + 20).map(async ([j, s]) => {
          let res; try { res = await store.sendPush(s, JSON.stringify(j.r.payload), vapid, { urgency: j.r.payload.r ? 'high' : 'normal', topic: String(j.r.payload.g || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) }); } catch (e) { res = { ok: false }; }
          if (res.gone) { gone++; try { await store.delSub(s.endpoint); } catch (e) { } }
          if (res.ok) sent++;
          const k = results.get(j.r.id) || { ok: 0, fail: 0 }; if (res.ok || res.gone) k.ok++; else k.fail++; results.set(j.r.id, k);
        }));
      }
      jobs.forEach(j => { const k = results.get(j.r.id) || { ok: 1, fail: 0 }; if (k.fail && (j.r.tries || 0) < 4) retry.push(j.r.id); else done.push(j.r.id); });
      if (done.length) await store.doneQueue(done);
      if (retry.length) await store.retryQueue(retry);
      if (retry.length && !done.length) break;                    /* the push service is struggling: try again on the next run */
    }
    return { sent, gone };
  }

  /* ---------- devices ---------- */
  const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^[a-z0-9.-]+\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9.-]+\.push\.apple\.com$/, /^[a-z0-9.-]+\.notify\.windows\.com$/, /^[a-z0-9.-]+\.push\.microsoft\.com$/];
  function subOk(s) {
    if (!s || typeof s.endpoint !== 'string' || s.endpoint.length > 900) return 'Bad subscription';
    let u; try { u = new URL(s.endpoint); } catch (e) { return 'Bad subscription'; }
    if (u.protocol !== 'https:' || u.port || !PUSH_HOSTS.some(r => r.test(u.hostname))) return 'This browser’s push service is not supported';
    const k = s.keys || {}; if (!/^[A-Za-z0-9_-]{80,100}$/.test(k.p256dh || '') || !/^[A-Za-z0-9_-]{16,30}$/.test(k.auth || '')) return 'Bad subscription keys';
    return null;
  }
  return { CATS, PG, events, resolve, plan, remind, drain, collapse, helper, watched, cleanPrefs, subOk, urlFor, payload };
});
