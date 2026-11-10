/* =====================================================================
   FTA · CLASSROOM LAYER (live app) — Class status + Messages
   Owner's decision (9 Nov 2026): no paid video service. What matters:
   1 Class status — everyone concerned sees which class is running and which is off.
     The mentor presses Start / End (the server stamps the time); the office sees the whole day
     against the routine (running · ended · not started · upcoming). An online class keeps using
     the mentor's own Meet / Zoom link: students see "Join" only while the class is running.
   2 Messages — mentors and students talk only inside the academy: class groups and private
     chats (mentor ↔ own student, anyone ↔ office). Mentors never receive a student's phone,
     Gmail or address (server rule). Owner / Admin can read every chat. Kept 6 months.
   Every rule is checked again on the server (public/vendor/fta-policy.js writeMsg / writeLive).
   Records: 'clslive' (FTA.CLSLIVE) and 'msg' (FTA.MSG), synced like every other record.
   ===================================================================== */
(function () {
  'use strict';
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const say = t => G(() => toast(t));
  const FTA = window.FTA = window.FTA || {};
  ['MSG', 'CLSLIVE'].forEach(k => { if (!Array.isArray(FTA[k])) FTA[k] = []; });
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const today = () => G(() => TODAY) || new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
  const tm = t => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' ').toLowerCase(); };
  const mins = (a, b) => Math.max(0, Math.round(((b ? new Date(b) : new Date()) - new Date(a)) / 60000));
  const dur = n => n < 60 ? n + ' min' : Math.floor(n / 60) + ' h ' + (n % 60 ? n % 60 + ' min' : '');
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const hash = s => { let x = 0; s = String(s); for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); };
  const ncol = pid => 'zc-n' + (hash(pid) % 8);

  /* ---------------------------------------------------------------- who am I, which classes are mine */
  function me() {
    const m = FTA.member || {}, role = m.role || G(() => ST.role) || 'Owner';
    if (role === 'Mentor') { const id = m.mentor_id || G(() => ME().mentor); return { pid: id, role, name: (G(() => MENTORS.find(x => x.id === id)) || {}).name || m.name || 'Mentor', kind: 't' }; }
    if (role === 'Student') { const id = m.student_id || G(() => ME().stu); return { pid: id, role, name: (G(() => STUDENTS.find(x => x.id === id)) || {}).name || m.name || 'Student', kind: 's' }; }
    return { pid: 'U:office', role, name: 'Academy Office', kind: 'o', office: true };
  }
  const OFFICE_WRITE = ['Owner', 'Admin', 'Junior Admin'];
  const MSG_OFFICE = ['Owner', 'Admin'];
  const pname = pid => pid === 'U:office' ? 'Academy Office' : (G(() => MENTORS.find(x => x.id === pid)) || G(() => STUDENTS.find(x => x.id === pid)) || {}).name || pid;
  const prole = pid => pid === 'U:office' ? 'Office' : /^MEN-/.test(pid) ? 'Mentor' : /^STU-/.test(pid) ? 'Student' : '';
  const groups = () => (G(() => SCH.GROUPS) || []).filter(g => g && g.status !== 'Inactive' && g.status !== 'Closed');
  const grp = id => (G(() => SCH.GROUPS) || []).find(g => g.id === id);
  function myGroups() {
    const m = me();
    if (m.kind === 't') return groups().filter(g => g.mentor === m.pid);
    if (m.kind === 's') return groups().filter(g => (g.stu || []).includes(m.pid));
    return groups();
  }

  /* ---------------------------------------------------------------- 1 · class status */
  const sessions = () => FTA.CLSLIVE.filter(x => x && x.gid);
  const latest = gid => sessions().filter(x => x.gid === gid).sort((a, b) => String(b.start).localeCompare(String(a.start)))[0] || null;
  const running = () => sessions().filter(x => x.status === 'On');
  /* a routine entry or a session can be for some students only (per-student routine: 'stu'); empty = the whole class */
  const stuKey = L => (Array.isArray(L) && L.length ? L.slice().sort().join(',') : '');
  const sameStu = (a, b) => !stuKey(a) || !stuKey(b) || a.some(x => b.indexOf(x) > -1);
  const stuNames = L => L.map(id => pname(id)).slice(0, 3).join(', ') + (L.length > 3 ? ' +' + (L.length - 3) : '');
  const lastLink = gid => (sessions().filter(x => x.gid === gid && x.link).sort((a, b) => String(b.start).localeCompare(String(a.start)))[0] || {}).link || '';
  /* today's routine for these classes, with what actually happened */
  function dayRows(gs) {
    const ids = new Set(gs.map(g => g.id)), rows = [];
    const mm = me(), f = mm.kind === 's' ? { stu: mm.pid } : undefined;
    (G(() => SCH.rtDay(today(), f)) || []).filter(e => e.gid && ids.has(e.gid)).forEach(e => rows.push({ gid: e.gid, stu: Array.isArray(e.stu) && e.stu.length ? e.stu.slice() : null, a: G(() => SCH.mins(e.start)), b: G(() => SCH.mins(e.end)), start: e.start, end: e.end, place: e.place || '' }));
    const td = today();
    /* a class started outside the routine today, or still running from before */
    sessions().filter(x => ids.has(x.gid) && (x.date === td || x.status === 'On')).forEach(x => { if (!rows.some(r => r.gid === x.gid && sameStu(r.stu, x.stu))) rows.push({ gid: x.gid, stu: x.stu && x.stu.length ? x.stu.slice() : null, a: null, b: null, extra: true }); });
    /* each session belongs to one routine slot: the one whose time is nearest to when it started */
    const minOf = iso => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };
    const owner = new Map();
    sessions().filter(x => ids.has(x.gid) && (x.date === td || x.status === 'On')).forEach(x => {
      const cand = rows.filter(r => r.gid === x.gid && sameStu(r.stu, x.stu)); if (!cand.length) return;
      const st = x.date === td ? minOf(x.start) : -1e4;
      const best = cand.reduce((a, r) => (r.a == null ? 1e5 : Math.abs(r.a - st)) < (a.a == null ? 1e5 : Math.abs(a.a - st)) ? r : a, cand[0]);
      (owner.get(best) || owner.set(best, []).get(best)).push(x);
    });
    rows.forEach(r => {
      const S = (owner.get(r) || []).sort((p, q) => String(q.start).localeCompare(String(p.start)));
      r.sess = S.find(x => x.status === 'On') || S[0] || null;
      const n = nowMin();
      r.state = r.sess ? (r.sess.status === 'On' ? 'live' : 'ended') : r.a == null ? 'none' : n > r.a + 10 && n <= (r.b || r.a + 60) ? 'late' : n > (r.b || r.a + 60) ? 'missed' : n >= r.a - 15 ? 'soon' : 'upcoming';
    });
    return rows.sort((p, q) => (p.state === 'live' ? -1 : 0) - (q.state === 'live' ? -1 : 0) || (p.a == null ? 1e4 : p.a) - (q.a == null ? 1e4 : q.a));
  }
  const PILL = { live: ['live', 'Running now'], ended: ['ended', 'Ended'], late: ['late', 'Not started'], missed: ['late', 'Did not start'], soon: ['soon', 'Starting soon'], upcoming: ['up', 'Upcoming'], none: ['up', 'Not today'] };
  function pill(r) {
    const p = PILL[r.state] || PILL.upcoming, s = r.sess;
    const sub = r.state === 'live' ? 'since ' + tm(s.start) + ' · ' + dur(mins(s.start)) + (s.date !== today() ? ' (from ' + h(s.date) + ')' : '') : r.state === 'ended' ? tm(s.start) + ' – ' + tm(s.end) + ' · ' + dur(mins(s.start, s.end)) : '';
    return '<span class="cl-pill is-' + p[0] + '">' + (r.state === 'live' ? '<i class="cl-dot"></i>' : '') + p[1] + '</span>' + (sub ? '<small class="cl-sub">' + sub + '</small>' : '');
  }
  const when = r => r.a == null ? '<span class="cl-muted">Not on today’s routine</span>' : h(G(() => SCH.t12(r.start)) || r.start) + ' – ' + h(G(() => SCH.t12(r.end)) || r.end);
  function startClass(gid, link, stu) {
    const m = me(), g = grp(gid); if (!g) return;
    stu = (Array.isArray(stu) ? stu : String(stu || '').split(',')).filter(x => x && (g.stu || []).indexOf(x) > -1);
    if (running().some(x => x.gid === gid && sameStu(x.stu, stu))) { say('This class is already running'); return; }
    link = String(link || '').trim();
    if (link && !/^https:\/\/[^\s"'<>]+$/.test(link)) { say('The class link must start with https://'); return; }
    FTA.CLSLIVE.push(Object.assign({ id: gid + '|' + Date.now().toString(36), gid, mentor: g.mentor, status: 'On', link, date: today(), start: new Date().toISOString(), end: '', by: m.kind === 't' ? m.pid : 'U:office' }, stu.length ? { stu } : {}));
    const label = stu.length ? stuNames(stu) + ' · ' + g.name : g.name;
    G(() => log('Class started', label, link ? 'Online' : 'In person')); say(label + ' started');
    G(() => FTA.sync && FTA.sync().then(() => draw()));
    draw();
  }
  function endClass(id) {
    const s = FTA.CLSLIVE.find(x => x.id === id); if (!s || s.status !== 'On') return;
    s.status = 'Off'; s.end = new Date().toISOString();
    const g = grp(s.gid) || {};
    G(() => log('Class ended', g.name || s.gid, dur(mins(s.start, s.end)))); say((g.name || 'Class') + ' ended · ' + dur(mins(s.start, s.end)));
    G(() => FTA.sync && FTA.sync().then(() => draw()));
    draw();
    if (me().kind === 't' && G(() => PAGES['tp-att'])) setTimeout(() => { const b = $('cl-att'); if (b) b.hidden = false; }, 50);
  }
  function pageLive(p) {
    const m = me(), gs = myGroups(), rows = dayRows(gs);
    const canRun = m.kind === 't' || OFFICE_WRITE.indexOf(m.role) > -1;
    let body = '';
    if (m.kind === 'o') {
      const c = k => rows.filter(r => r.state === k).length;
      body += '<div class="cl-kpis"><div class="is-live"><b>' + c('live') + '</b><span>running now</span></div><div><b>' + c('ended') + '</b><span>ended today</span></div><div class="is-late"><b>' + (c('late') + c('missed')) + '</b><span>not started</span></div><div><b>' + (c('upcoming') + c('soon')) + '</b><span>still to come</span></div></div>';
    }
    if (!gs.length) body += '<div class="card cl-empty"><b>No classes yet</b><p>' + (m.kind === 'o' ? 'Classes appear here once they are set up under Academics.' : 'Your classes appear here once the office adds you to one.') + '</p></div>';
    else if (!rows.length) body += '<div class="card cl-empty"><b>No class on today’s routine</b><p>' + (m.kind === 't' ? 'You can still start any of your classes below.' : 'Nothing is running right now.') + '</p></div>';
    else body += '<div class="cl-list">' + rows.map(r => {
      const g = grp(r.gid) || { name: r.gid }, s = r.sess, live = r.state === 'live', sk = h(stuKey(r.stu)), lk = h(r.gid + '~' + stuKey(r.stu));
      let act = '';
      if (m.kind === 's') act = live && s.link ? '<a class="btn p" href="' + h(s.link) + '" target="_blank" rel="noopener noreferrer">Join class</a>' : live ? '<span class="cl-muted">In person</span>' : '';
      else if (canRun && live) act = (s.link ? '<a class="btn" href="' + h(s.link) + '" target="_blank" rel="noopener noreferrer">Open link</a>' : '') + '<button type="button" class="btn p" data-cl="end" data-id="' + h(s.id) + '">End class</button>';
      else if (m.kind === 't' && r.state !== 'ended') act = '<input class="cl-link" data-link="' + lk + '" type="url" inputmode="url" placeholder="Online? Paste the Meet / Zoom link (optional)" value="' + h(lastLink(r.gid)) + '" aria-label="Class link for ' + h(g.name) + '"><button type="button" class="btn p" data-cl="start" data-gid="' + h(r.gid) + '" data-stu="' + sk + '">Start class</button>';
      else if (m.kind === 't' && r.state === 'ended') act = '<button type="button" class="btn" data-cl="start" data-gid="' + h(r.gid) + '" data-stu="' + sk + '">Start again</button>';
      /* a student's own class time shows the student's name first, so the mentor sees at a glance whose class it is */
      const title = r.stu && m.kind !== 's' ? stuNames(r.stu) : g.name;
      const sub = r.stu && m.kind !== 's' ? g.name + (m.kind === 'o' ? ' · ' + pname(g.mentor) : '') : (m.kind === 't' ? (g.stu || []).length + ' students' : pname(g.mentor));
      return '<article class="card cl-row is-' + r.state + '"><div class="cl-when">' + when(r) + '</div><div class="cl-what"><b>' + h(title) + '</b><small>' + h(sub) + (r.place ? ' · ' + h(r.place) : '') + '</small></div><div class="cl-st">' + pill(r) + '</div><div class="cl-act">' + act + '</div></article>';
    }).join('') + '</div>';
    if (m.kind === 't') {
      const free = gs.filter(g => !rows.some(r => r.gid === g.id && !r.stu));
      if (free.length) body += '<div class="card cl-extra"><b>Start a class that is not on today’s routine</b><div class="cl-extra-r"><select id="cl-gsel" aria-label="Class">' + free.map(g => '<option value="' + h(g.id) + '">' + h(g.name) + '</option>').join('') + '</select><input class="cl-link" id="cl-xlink" type="url" inputmode="url" placeholder="Meet / Zoom link (optional)"><button type="button" class="btn p" data-cl="startx">Start class</button></div></div>';
      body += '<div class="cl-hint" id="cl-att" hidden>Class ended. <button type="button" class="btn s" onclick="go(\'tp-att\')">Mark attendance now</button></div>';
      body += '<p class="cl-note">Press <b>Start class</b> when you begin and <b>End class</b> when you finish: the office and your students see it at once. For an online class paste your Meet / Zoom link; students see the Join button only while the class is running.</p>';
    }
    if (m.kind === 'o') {
      const old = running().filter(s => s.date !== today());
      if (old.length) body += '<p class="cl-note is-warn">' + old.length + ' class' + (old.length > 1 ? 'es were' : ' was') + ' left running from an earlier day. End ' + (old.length > 1 ? 'them' : 'it') + ' from the list above.</p>';
      body += '<p class="cl-note">Mentors press Start and End in their portal; the time is stamped by the server. A class is marked <b>Not started</b> 10 minutes after its routine time.</p>';
    }
    if (m.kind === 's') body += '<p class="cl-note">When your mentor starts an online class, a <b>Join class</b> button appears here.</p>';
    return '<div class="cl-wrap" data-notx>' + body + '</div>';
  }
  function bindLive(root) {
    root.onclick = e => {
      const b = e.target.closest('[data-cl]'); if (!b) return;
      if (b.disabled) return; b.disabled = true; setTimeout(() => { b.disabled = false; }, 1500);
      if (b.dataset.cl === 'start') { const i = root.querySelector('[data-link="' + b.dataset.gid + '~' + (b.dataset.stu || '') + '"]'); startClass(b.dataset.gid, i ? i.value : '', b.dataset.stu || ''); }
      else if (b.dataset.cl === 'startx') startClass(($('cl-gsel') || {}).value, ($('cl-xlink') || {}).value);
      else if (b.dataset.cl === 'end') endClass(b.dataset.id);
    };
  }

  /* ---------------------------------------------------------------- 2 · messages */
  const CH = { room: null, q: '', filter: 'all', open: false, shown: null, sig: '' };
  const canSeeAll = () => MSG_OFFICE.indexOf(me().role) > -1;
  const dmId = (a, b) => 'dm:' + [a, b].sort().join('|');
  const msgs = () => FTA.MSG.filter(x => x && x.room && x.text != null);
  const roomMsgs = id => msgs().filter(x => x.room === id).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const RKEY = () => 'fta-msg-read:' + ((FTA.member || {}).email || 'me');
  const reads = () => { try { return JSON.parse(localStorage.getItem(RKEY()) || '{}') || {}; } catch (e) { return {}; } };
  function markRead(id) { const l = roomMsgs(id).slice(-1)[0]; if (!l) return; const r = reads(); if (r[id] !== l.at) { r[id] = l.at; try { localStorage.setItem(RKEY(), JSON.stringify(r)); } catch (e) { } badges(); } }
  const unread = id => { const m = me(), at = reads()[id] || ''; return roomMsgs(id).filter(x => x.by !== m.pid && String(x.at) > at).length; };
  function contacts() {
    const m = me(), out = new Set();
    if (m.kind === 't') { G(() => ENROL.filter(e => e.mentor === m.pid && e.status !== 'Completed').forEach(e => out.add(e.stu))); myGroups().forEach(g => (g.stu || []).forEach(s => out.add(s))); }
    else if (m.kind === 's') { G(() => ENROL.filter(e => e.stu === m.pid && e.mentor && e.status !== 'Completed').forEach(e => out.add(e.mentor))); myGroups().forEach(g => g.mentor && out.add(g.mentor)); }
    else { G(() => MENTORS.filter(x => x.status === 'Active').forEach(x => out.add(x.id))); G(() => STUDENTS.filter(x => x.status === 'Active').forEach(x => out.add(x.id))); }
    out.delete(m.pid); return [...out].filter(Boolean);
  }
  function room(id) {
    if (!id) return null;
    if (id.indexOf('g:') === 0) { const g = grp(id.slice(2)); return g ? { id, kind: 'group', g, members: [g.mentor].concat(g.stu || []) } : null; }
    const ab = id.slice(3).split('|'); return ab.length === 2 ? { id, kind: 'dm', a: ab[0], b: ab[1], members: ab } : null;
  }
  const other = r => { const p = me().pid; return r.members.find(x => x !== p) || r.a; };
  const mineIn = r => r.members.includes(me().pid);
  const canWrite = r => { const m = me(); if (!r) return false; if (r.kind === 'group') return m.kind === 'o' ? canSeeAll() : mineIn(r); return mineIn(r); };
  const title = r => r.kind === 'group' ? r.g.name : mineIn(r) ? pname(other(r)) : pname(r.a) + ' ↔ ' + pname(r.b);
  function myRooms() {
    const m = me(), ids = new Set();
    myGroups().forEach(g => ids.add('g:' + g.id));
    if (m.kind !== 'o') ids.add(dmId(m.pid, 'U:office'));
    msgs().forEach(x => { const r = room(x.room); if (!r) return; if (canSeeAll() || mineIn(r) || (r.kind === 'group' && ids.has(r.id))) ids.add(x.room); });
    return [...ids].map(room).filter(Boolean);
  }
  const lastAt = r => (roomMsgs(r.id).slice(-1)[0] || {}).at || '';
  const shortDay = t => { const d = new Date(t), td = new Date(); if (isNaN(d)) return ''; if (d.toDateString() === td.toDateString()) return tm(t); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const dayLabel = t => { const d = new Date(t), td = new Date(), y = new Date(td - 864e5); if (d.toDateString() === td.toDateString()) return 'Today'; if (d.toDateString() === y.toDateString()) return 'Yesterday'; return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const IP = {
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.7-3.4 3-5.2 6-5.2s5.3 1.8 6 5.2"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.4.2 4 1.8 4.5 4.8"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>', back: '<path d="M15 5l-7 7 7 7"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'
  };
  const I = n => '<svg class="zi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IP[n] || '') + '</svg>';
  function av(pid, size) {
    const r = /^MEN-/.test(pid) ? G(() => MENTORS.find(x => x.id === pid)) : /^STU-/.test(pid) ? G(() => STUDENTS.find(x => x.id === pid)) : null;
    const inner = r && r.photo && /^data:image\//.test(r.photo) ? '<img src="' + h(r.photo) + '" alt="">' : pid === 'U:office' ? I('shield') : '<span>' + h(initials(pname(pid))) + '</span>';
    return '<span class="zc-av ' + ncol(pid) + (size ? ' s' + size : '') + '">' + inner + '</span>';
  }
  const gav = size => '<span class="zc-av zc-gav' + (size ? ' s' + size : '') + '">' + I('users') + '</span>';
  function listHtml() {
    const m = me(), q = CH.q.toLowerCase();
    let rs = myRooms().filter(r => CH.filter === 'all' || (CH.filter === 'unread' && unread(r.id)) || (CH.filter === 'groups' && r.kind === 'group') || (CH.filter === 'dm' && r.kind === 'dm'));
    rs.sort((a, b) => String(lastAt(b)).localeCompare(String(lastAt(a))) || title(a).localeCompare(title(b)));
    let html = rs.map(r => {
      const t = title(r); if (q && !t.toLowerCase().includes(q)) return '';
      const l = roomMsgs(r.id).slice(-1)[0], u = unread(r.id), live = r.kind === 'group' && running().some(x => x.gid === r.g.id);
      const pv = l ? (l.by === m.pid ? 'You: ' : r.kind === 'group' ? String(pname(l.by) !== l.by ? pname(l.by) : l.name || l.by).split(' ')[0] + ': ' : '') + String(l.text).slice(0, 80) : r.kind === 'group' ? pname(r.g.mentor) + ' · ' + (r.g.stu || []).length + ' students' : mineIn(r) ? prole(other(r)) : 'Private chat';
      return '<button type="button" class="zc-ri' + (CH.room === r.id ? ' on' : '') + (u ? ' unread' : '') + '" data-room="' + h(r.id) + '">' + (r.kind === 'group' ? gav(46) : av(mineIn(r) ? other(r) : r.a, 46)) +
        '<span class="zc-rt"><span class="zc-r1"><b>' + h(t) + (r.kind === 'dm' && !mineIn(r) ? ' <small>private</small>' : '') + '</b><time>' + (l ? shortDay(l.at) : '') + '</time></span><span class="zc-r2"><small>' + (live ? '<span class="zc-livepill"><span class="zc-livedot"></span>Live</span>' : '') + h(pv) + '</small>' + (u ? '<em class="zc-ub">' + u + '</em>' : '') + '</span></span></button>';
    }).join('');
    if (q) { const have = new Set(rs.filter(r => r.kind === 'dm' && mineIn(r)).map(other)); const start = (m.kind === 'o' ? [] : ['U:office']).concat(contacts()).filter(p => !have.has(p) && pname(p).toLowerCase().includes(q)).slice(0, 8); if (start.length) html += '<h6 class="zc-h6">Start a new chat</h6>' + start.map(p => '<button type="button" class="zc-ri" data-room="' + h(dmId(m.kind === 'o' ? 'U:office' : m.pid, p)) + '">' + av(p, 46) + '<span class="zc-rt"><span class="zc-r1"><b>' + h(pname(p)) + '</b></span><span class="zc-r2"><small>' + prole(p) + '</small></span></span></button>').join(''); }
    return html || '<p class="zc-empty">' + (q ? 'No chat found. Type a name to start a new chat.' : CH.filter === 'all' ? 'No chats yet.' : 'Nothing here.') + '</p>';
  }
  function drawSide() {
    const S = $('zc-side'); if (!S) return;
    if (!S.firstChild) {
      S.innerHTML = '<header class="zc-sh">' + (me().kind === 'o' ? '<span class="zc-av zc-gav s36">' + I('shield') + '</span>' : av(me().pid, 36)) + '<b>Chats</b></header><label class="zc-ss">' + I('search') + '<input id="zc-q" type="search" placeholder="Search or start a new chat" aria-label="Search chats" autocomplete="off"></label>' +
        '<div class="zc-chips" role="tablist">' + [['all', 'All'], ['unread', 'Unread'], ['groups', 'Classes'], ['dm', 'Private']].map(f => '<button type="button" role="tab" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="zc-rl" id="zc-rl"></div>';
      $('zc-q').oninput = () => { CH.q = $('zc-q').value; drawSide(); };
    }
    S.querySelectorAll('.zc-chips button').forEach(b => { b.classList.toggle('on', b.dataset.f === CH.filter); b.setAttribute('aria-selected', b.dataset.f === CH.filter); });
    $('zc-rl').innerHTML = listHtml();
  }
  function drawMain(force) {
    const V = $('zc-main'); if (!V) return; const wa = $('zc-wa'); if (wa) wa.dataset.open = CH.open && CH.room ? 1 : 0;
    const r = room(CH.room);
    if (!r) { CH.shown = null; V.innerHTML = '<div class="zc-blank"><span class="zc-bl">' + I('chat') + '</span><h3>FTA Messages</h3><p>Class groups and private chats with ' + (me().kind === 's' ? 'your mentors' : me().kind === 't' ? 'your students' : 'mentors and students') + ' and the office.<br>Choose a chat on the left.</p><small>' + I('lock') + 'Phone numbers are never shared. The academy office can read chats to keep students safe.</small></div>'; return; }
    const write = canWrite(r);
    if (CH.shown !== r.id || force || !$('zc-ml')) {
      const keep = $('zc-in') ? $('zc-in').value : '';
      CH.shown = r.id; CH.sig = '';
      V.innerHTML = '<header class="zc-hd"><button type="button" class="zc-ib zc-back" data-a="back" aria-label="Back to chats">' + I('back') + '</button>' + (r.kind === 'group' ? gav(40) : av(mineIn(r) ? other(r) : r.a, 40)) +
        '<div class="zc-ht"><b>' + h(title(r)) + '</b><small>' + h(r.kind === 'group' ? pname(r.g.mentor) + ' · ' + (r.g.stu || []).length + ' students' : mineIn(r) ? prole(other(r)) : 'Private chat · read only') + '</small></div>' +
        (r.kind === 'group' && G(() => PAGES[(me().kind === 't' ? 'tp' : me().kind === 's' ? 'sp' : 'cx') + '-live']) ? '<div class="zc-ha"><button type="button" class="zc-ib" data-a="live" title="Class status" aria-label="Class status">' + I('video') + '</button></div>' : '') + '</header>' +
        (me().kind !== 'o' ? '<div class="zc-monote">' + I('eye') + 'The academy office can read this chat to keep students safe. Do not share phone numbers.</div>' : '') +
        '<div class="zc-body" id="zc-body"><div class="zc-ml" id="zc-ml" role="log" aria-live="polite"></div></div>' +
        (write ? '<footer class="zc-comp" id="zc-comp"><div class="zc-cr"><div class="zc-inw"><textarea id="zc-in" rows="1" maxlength="2000" placeholder="Type a message" aria-label="Message"></textarea></div><button type="button" class="zc-send" id="zc-send" data-a="send" aria-label="Send">' + I('send') + '</button></div></footer>'
          : '<footer class="zc-ro">' + I(canSeeAll() ? 'eye' : 'lock') + (canSeeAll() ? 'Read only · a private chat between a mentor and a student' : 'You can read but not write here') + '</footer>');
      const inp = $('zc-in');
      if (inp) {
        inp.value = keep;
        const fit = () => { inp.style.height = 'auto'; inp.style.height = Math.min(140, inp.scrollHeight) + 'px'; $('zc-comp').classList.toggle('has', !!inp.value.trim()); };
        inp.oninput = fit; inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } }; fit();
      }
    }
    const L = roomMsgs(r.id), sig = r.id + '|' + L.length + '|' + (L.slice(-1)[0] || {}).at + '|' + L.filter(x => x._local).length;
    if (sig !== CH.sig || force) {
      CH.sig = sig; const B = $('zc-body'), ML = $('zc-ml'), atBottom = !B || B.scrollHeight - B.scrollTop - B.clientHeight < 80, m = me();
      let html = '', lastDay = '', prev = null;
      L.forEach(x => {
        const dl = dayLabel(x.at); if (dl !== lastDay) { html += '<div class="zc-day"><span>' + dl + '</span></div>'; lastDay = dl; prev = null; }
        const mine = x.by === m.pid, first = prev !== x.by; prev = x.by;
        html += '<div class="zc-row ' + (mine ? 'me' : 'them') + (first ? ' first' : '') + '" data-id="' + h(x.id) + '">' + (r.kind === 'group' && !mine ? (first ? av(x.by, 28) : '<span class="zc-avsp"></span>') : '') +
          '<div class="zc-bw"><div class="zc-b">' + (!mine && (r.kind === 'group' || !mineIn(r)) && first ? '<span class="zc-nm ' + ncol(x.by) + '">' + h(x.by === 'U:office' ? 'Academy Office' : pname(x.by) !== x.by ? pname(x.by) : x.name || x.by) + '<small>' + prole(x.by) + '</small></span>' : '') +
          '<p class="zc-tx">' + h(x.text) + '</p><span class="zc-meta">' + (x._local ? 'sending…' : tm(x.at)) + '</span></div></div>' +
          (canSeeAll() && !x._local ? '<div class="zc-acts"><button type="button" class="zc-ab" data-a="del" data-id="' + h(x.id) + '" title="Remove message" aria-label="Remove message">' + I('trash') + '</button></div>' : '') + '</div>';
      });
      ML.innerHTML = html || '<div class="zc-hello"><span>' + I('chat') + '</span><b>No messages yet</b><small>Say hello 👋</small></div>';
      if (B && atBottom) B.scrollTop = B.scrollHeight;
    }
    if (mineIn(r) || r.kind === 'group' || canSeeAll()) markRead(r.id);
  }
  function send() {
    const inp = $('zc-in'), r = room(CH.room), m = me(); if (!inp || !r) return;
    const text = inp.value.trim(); if (!text) return;
    if (!canWrite(r)) { say('You cannot write here'); return; }
    if (text.length > 2000) { say('A message can be up to 2000 letters'); return; }
    FTA.MSG.push({ id: uid('M'), room: r.id, gid: r.kind === 'group' ? r.g.id : '', by: m.pid, name: m.name, role: m.role, text, at: new Date().toISOString(), _local: 1 });
    inp.value = ''; inp.style.height = 'auto'; $('zc-comp').classList.remove('has');
    drawMain(); drawSide();
    G(() => FTA.sync && FTA.sync().then(() => { FTA.MSG.forEach(x => { if (x && x._local && x.by === m.pid) delete x._local; }); if (CH.room === r.id) { drawMain(true); drawSide(); } }));
    inp.focus();
  }
  function pageChat() {
    if (CH.room && !myRooms().some(r => r.id === CH.room) && !(room(CH.room) && room(CH.room).kind === 'dm' && mineIn(room(CH.room)))) CH.room = null;
    if (!CH.room && window.innerWidth > 760) CH.room = (myRooms().sort((a, b) => String(lastAt(b)).localeCompare(String(lastAt(a))))[0] || {}).id || null;
    CH.shown = null;
    return '<div class="zc-wa" id="zc-wa" data-notx data-open="' + (CH.open && CH.room ? 1 : 0) + '"><aside class="zc-side" id="zc-side"></aside><section class="zc-main" id="zc-main"></section></div>';
  }
  function bindChat(root) {
    root.onclick = e => {
      const f = e.target.closest('.zc-chips [data-f]'); if (f) { CH.filter = f.dataset.f; drawSide(); return; }
      const ri = e.target.closest('[data-room]'); if (ri) { CH.room = ri.dataset.room; CH.open = true; CH.q = ''; const q = $('zc-q'); if (q) q.value = ''; drawSide(); drawMain(true); const i = $('zc-in'); if (i && window.innerWidth > 760) i.focus(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'send') send();
      else if (a.dataset.a === 'back') { CH.open = false; drawMain(); }
      else if (a.dataset.a === 'live') G(() => go((me().kind === 't' ? 'tp' : me().kind === 's' ? 'sp' : 'cx') + '-live'));
      else if (a.dataset.a === 'del') {
        const x = FTA.MSG.find(y => y.id === a.dataset.id); if (!x || !canSeeAll()) return;
        if (!confirm('Remove this message for everyone?')) return;
        FTA.MSG.splice(FTA.MSG.indexOf(x), 1); G(() => log('Message removed', x.room, String(x.text).slice(0, 60))); G(() => FTA.sync && FTA.sync()); drawMain(true); drawSide();
      }
    };
  }

  /* ---------------------------------------------------------------- pages, menu, badges */
  const DEFS = [
    ['live', 'Class status', ['cx-live', 'tp-live', 'sp-live'], 'clsvid', 'Which class is running now, which is off', 'vae', { Owner: 'vae', Admin: 'vae', 'Junior Admin': 'vae', 'Finance Manager': 'v', Viewer: 'v', Mentor: 'vae', Student: 'v' }],
    ['chat', 'Messages', ['cx-chat', 'tp-chat', 'sp-chat'], 'chat', 'Class groups and private chats inside the academy', 'vae', { Owner: 'vae', Admin: 'vae', Mentor: 'vae', Student: 'vae' }]
  ];
  const ICONS = { clsvid: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/><circle cx="7.5" cy="9.5" r="1" fill="currentColor"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>' };
  let registered = false, FORCE = true;
  function register() {
    if (registered || typeof NAV === 'undefined' || typeof PAGES === 'undefined' || !window.FTA_MODS || !G(() => SCH.MODS) || !G(() => SCH.PERM)) return;
    Object.entries(ICONS).forEach(([k, v]) => { if (typeof P === 'object' && P && !P[k]) P[k] = v; });
    DEFS.forEach(d => d[2].forEach(p => { PAGE_ICON[p] = d[3]; if (!FLAT.some(f => f[0] === p)) FLAT.push([p, d[1], d[3]]); SUBS[p] = d[4]; }));
    const put = (gname, list) => { let g = NAV.find(x => x[0] === gname); if (!g && gname === 'Connect') { g = ['Connect', []]; NAV.splice(1, 0, g); } if (g) list.forEach(it => { if (!g[1].some(x => x[0] === it[0])) g[1].push(it); }); };
    const items = pre => DEFS.map(d => [d[2].find(p => p.startsWith(pre)), d[1], d[3]]);
    put('Connect', items('cx-')); put('My teaching', items('tp-')); put('My school', items('sp-'));
    DEFS.forEach(d => window.FTA_MODS.add('cx-' + d[0], d[1], d[2], d[5], 'b', d[6]));
    window.FTA_MODS.refresh();
    DEFS.forEach(d => d[2].forEach(p => { PAGES[p] = () => page(p); }));
    registered = true;
    if (G(() => ST.page) && $('sidenav') && !$('cx-root')) G(() => render());
  }
  function shell(key, html) {
    G(() => SCH.page('', '', '<div id="cx-root" data-cxk="' + key + '">' + html + '</div>'));
    const ey = document.querySelector('#view .bn-eye'), f = FLAT.find(x => x[0] === key); if (ey && f) ey.textContent = (me().role + ' Portal').toUpperCase() + ' · ' + f[1].toUpperCase();
  }
  function page(p) {
    const root = $('cx-root'), same = root && root.dataset.cxk === p && !FORCE; FORCE = false;
    if (/-live$/.test(p)) {
      const typing = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('cl-link');
      if (same && typing) return;
      shell(p, pageLive(p)); bindLive($('cx-root'));
    } else {
      if (!same || !$('zc-wa')) { shell(p, pageChat()); bindChat($('cx-root')); }
      drawSide(); drawMain();
    }
    badges();
  }
  function draw() { const p = G(() => ST.page); if (/-(live|chat)$/.test(p || '') && $('cx-root') && $('cx-root').dataset.cxk === p) page(p); else badges(); }
  /* small counters in the menu: classes running now, unread messages */
  function badges() {
    if (!registered) return;
    const m = me(), live = m.kind === 'o' ? running().length : running().filter(s => myGroups().some(g => g.id === s.gid)).length;
    const un = myRooms().filter(r => mineIn(r) || r.kind === 'group' || (m.kind === 'o' && r.members.includes('U:office'))).reduce((t, r) => t + unread(r.id), 0);
    document.querySelectorAll('#sidenav .nav').forEach(b => {
      const oc = b.getAttribute('onclick') || '', isLive = /-live'/.test(oc), isChat = /-chat'/.test(oc); if (!isLive && !isChat) return;
      const n = isLive ? live : un; let c = b.querySelector('.cl-nb');
      if (n && !c) { c = document.createElement('span'); c.className = 'cnt cl-nb' + (isLive ? ' is-live' : ''); b.appendChild(c); }
      if (c) { if (n) c.textContent = n; else c.remove(); }
    });
  }
  /* what is on screen follows the server: faster while a class or chat page is open */
  let SIG = '', lastPull = 0;
  function tick() {
    register(); if (!registered) return;
    const p = G(() => ST.page) || '', here = /-(live|chat)$/.test(p);
    if (here && FTA.pull && Date.now() - lastPull > (/-chat$/.test(p) ? 5000 : 10000) && document.visibilityState === 'visible') { lastPull = Date.now(); G(() => FTA.pull()); }
    const sig = FTA.MSG.length + '|' + (FTA.MSG.slice(-1)[0] || {}).at + '|' + FTA.CLSLIVE.map(x => x.id + x.status).join(',') + '|' + Math.floor(Date.now() / 60000);
    if (sig !== SIG) { SIG = sig; draw(); }
  }
  const _go = window.go;
  if (typeof _go === 'function') window.go = function (p) { if (/-(live|chat)$/.test(String(p))) FORCE = true; return _go.apply(this, arguments); };
  window.addEventListener('fta:started', () => { FORCE = true; register(); SIG = ''; });
  setTimeout(tick, 500); setInterval(tick, 2000);
  window.FTA_CLASSROOM = { running, dayRows: () => dayRows(myGroups()), rooms: myRooms, unread, startClass, endClass, open: id => { CH.room = id; CH.open = true; FORCE = true; } };
})();
