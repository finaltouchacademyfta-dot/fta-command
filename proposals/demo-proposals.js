/* =====================================================================
   FTA · PROPOSALS DEMO LAYER (not part of the live app)
   Shown only in the preview file so the Owner can try the 10 requested changes
   before anything touches the real code or database.
   1 Portal title by role · 2 Profile Tree · 3 Quick Add outline · 4 Watch Together
   5 Profiles (mentor ↔ student management) · 6 Messages, Live Class, Recordings, Chat Monitor
   7 Premium Light (CSS) · 8 text fixes (CSS) · 9 "QIT Theme" name · 10 (AI: in the plan)
   Realtime between people is simulated across browser TABS of this same file
   (BroadcastChannel + localStorage). On the live site the same screens use
   Supabase Realtime / Storage and LiveKit (see the plan document).
   ===================================================================== */
(function () {
  'use strict';
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const now = () => Date.now();
  const uid = p => p + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const say = t => G(() => toast(t));
  const tm = t => { const d = new Date(t); return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  const day = t => { const d = new Date(t), td = new Date(); return d.toDateString() === td.toDateString() ? 'Today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();

  /* ---------------------------------------------------------------- who am I */
  function me() {
    const m = FTA.member || {}, role = m.role || G(() => ST.role) || 'Owner';
    if (role === 'Mentor') { const x = G(() => MENTORS.find(y => y.id === m.mentor_id)) || {}; return { pid: m.mentor_id, name: x.name || m.name || 'Mentor', role, email: m.email }; }
    if (role === 'Student') { const x = G(() => STUDENTS.find(y => y.id === m.student_id)) || {}; return { pid: m.student_id, name: x.name || m.name || 'Student', role, email: m.email }; }
    return { pid: 'U:office', name: m.name && m.name !== 'Owner' ? m.name : role, role, email: m.email, office: true };
  }
  const kindOf = r => r === 'Mentor' ? 't' : r === 'Student' ? 's' : 'o';
  const isMonitor = r => r === 'Owner' || r === 'Admin';
  const pname = pid => pid === 'U:office' ? 'Academy Office' : (G(() => MENTORS.find(x => x.id === pid)) || G(() => STUDENTS.find(x => x.id === pid)) || {}).name || pid;
  const prole = pid => pid === 'U:office' ? 'Office' : /^MEN-/.test(pid) ? 'Mentor' : /^STU-/.test(pid) ? 'Student' : '';

  /* ---------------------------------------------------------------- demo store (this browser) + live channel */
  const SK = 'fta-demo-connect-v1';
  let DB = null;
  const blank = () => ({ msgs: [], reads: {}, live: {}, wb: {}, wt: [], wtn: [], recs: [], seeded: false });
  function load() { try { DB = Object.assign(blank(), JSON.parse(localStorage.getItem(SK) || 'null') || {}); } catch (e) { DB = blank(); } }
  function save(quiet) { try { localStorage.setItem(SK, JSON.stringify(DB)); } catch (e) { say('The demo storage is full: remove a few files or press Reset demo data'); } if (!quiet) post({ t: 'db' }); }
  load();
  const ch = typeof BroadcastChannel === 'function' ? new BroadcastChannel('fta-demo-connect') : null;
  const LISTEN = [], OVR = {}, HOOKS = [], HERE = [], X = { quiet: false };
  function post(m) { m.from = TAB; try { ch && ch.postMessage(m); } catch (e) { } }
  const TAB = uid('tab-');
  if (ch) ch.onmessage = e => { const m = e.data || {}; if (m.from === TAB) return; if (m.t === 'db') { load(); onData(); } LISTEN.forEach(f => G(() => f(m))); };
  window.addEventListener('storage', e => { if (e.key === SK) { load(); onData(); } });

  /* presence: which people have this file open in another tab, and where */
  const ONLINE = {};
  setInterval(() => { const m = me(); if (m.pid) post(Object.assign({ t: 'here', pid: m.pid, name: m.name, role: m.role, page: G(() => ST.page), live: LIVE.gid || '', wt: WT.sid || '', hand: LIVE.hand || false }, ...HERE.map(f => G(f) || {}))); }, 3000);
  LISTEN.push(m => { if (m.t === 'here') { ONLINE[m.pid] = Object.assign({ at: now() }, m); } });
  const online = pid => pid === me().pid || (ONLINE[pid] && now() - ONLINE[pid].at < 9000);

  /* ---------------------------------------------------------------- rooms and who may see them */
  const groups = () => G(() => SCH.GROUPS.filter(g => g.status !== 'Inactive')) || [];
  function myGroups() {
    const m = me();
    if (m.role === 'Mentor') return groups().filter(g => g.mentor === m.pid);
    if (m.role === 'Student') return groups().filter(g => (g.stu || []).includes(m.pid));
    return groups();
  }
  const dmId = (a, b) => 'dm:' + [a, b].sort().join('|');
  function contacts() {
    const m = me(), out = [];
    if (m.role === 'Student') {
      const ms = new Set(); G(() => ENROL.filter(e => e.stu === m.pid && e.mentor).forEach(e => ms.add(e.mentor))); myGroups().forEach(g => g.mentor && ms.add(g.mentor));
      ms.forEach(x => out.push(x)); out.push('U:office');
    } else if (m.role === 'Mentor') {
      const ss = new Set(); G(() => V8.myStudents().forEach(s => ss.add(s.id))); myGroups().forEach(g => (g.stu || []).forEach(s => ss.add(s)));
      ss.forEach(x => out.push(x)); out.push('U:office');
    } else {
      G(() => MENTORS.filter(x => x.status === 'Active').forEach(x => out.push(x.id))); G(() => STUDENTS.filter(x => x.status === 'Active').forEach(x => out.push(x.id)));
    }
    return out;
  }
  function room(id) {
    if (id.startsWith('g:')) { const g = groups().find(x => x.id === id.slice(2)); if (!g) return null; return { id, kind: 'group', name: g.name, sub: pname(g.mentor) + ' · ' + (g.stu || []).length + ' students', members: [g.mentor].concat(g.stu || []), monitored: true, g }; }
    const [a, b] = id.slice(3).split('|');
    const stuMentor = (/^MEN-/.test(a) && /^STU-/.test(b)) || (/^STU-/.test(a) && /^MEN-/.test(b));
    return { id, kind: 'dm', name: '', members: [a, b], monitored: stuMentor || a === 'U:office' || b === 'U:office', a, b };
  }
  const other = (r, pid) => r.members.find(x => x !== pid) || pid;
  function canSee(r, m) { m = m || me(); if (!r) return false; if (r.members.includes(m.pid)) return true; if (m.office && r.members.includes('U:office')) return true; return isMonitor(m.role) && r.monitored; }
  const canWrite = (r, m) => { m = m || me(); return r.members.includes(m.pid) || (m.office && r.kind === 'group' && m.role !== 'Viewer'); };
  function myRooms() {
    const m = me(), ids = new Set(myGroups().map(g => 'g:' + g.id));
    DB.msgs.forEach(x => { const r = room(x.room); if (r && r.kind === 'dm' && r.members.includes(m.pid)) ids.add(x.room); });
    return [...ids].map(room).filter(Boolean);
  }
  const roomMsgs = id => DB.msgs.filter(x => x.room === id).sort((a, b) => a.at - b.at);
  const lastRead = (id, pid) => ((DB.reads[id] || {})[pid]) || 0;
  const unread = (id, pid) => roomMsgs(id).filter(x => x.by !== pid && x.at > lastRead(id, pid)).length;
  function markRead(id) { const m = me(); if (!m.pid) return; const last = roomMsgs(id).slice(-1)[0]; if (!last) return; DB.reads[id] = DB.reads[id] || {}; if ((DB.reads[id][m.pid] || 0) < last.at) { DB.reads[id][m.pid] = last.at; save(); } }
  const totalUnread = () => { const m = me(); return myRooms().reduce((t, r) => t + unread(r.id, m.pid), 0); };
  const roomTitle = (r, pid) => r.kind === 'group' ? r.name : (r.members.includes(pid) ? pname(other(r, pid)) : pname(r.a) + ' ↔ ' + pname(r.b));

  /* first visit: a few real-looking conversations from the sample academy */
  function seed() {
    if (DB.seeded || !groups().length) return;
    const g = groups()[0], t0 = now() - 86400000;
    const add = (room, by, text, mins, extra) => DB.msgs.push(Object.assign({ id: uid('m'), room, by, name: pname(by), text, at: t0 + mins * 60000 }, extra || {}));
    const stu = (g.stu || [])[0] || 'STU-1001';
    add('g:' + g.id, g.mentor, 'Assalamu alaikum everyone. Tomorrow we revise Paper 2, Question 3. Please bring last year’s paper.', 10);
    add('g:' + g.id, stu, 'Okay Miss, will it be in the mock test too?', 14);
    add('g:' + g.id, g.mentor, 'Yes, the same type. I will share a short video tonight in Watch Together.', 16);
    add(dmId(g.mentor, stu), stu, 'Miss, I did not understand the summary-writing part. Can you check my answer?', 40);
    add(dmId(g.mentor, stu), g.mentor, 'Of course. Send me a photo of your answer and I will mark it.', 47);
    add(dmId('U:office', g.mentor), 'U:office', 'Please submit the mid-term marks by Thursday.', 70, { name: 'Academy Office' });
    DB.wt.push({ id: 'W1', title: 'Summary writing — worked example', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', vid: 'dQw4w9WgXcQ', host: g.mentor, room: 'g:' + g.id, at: t0 + 3600000, state: { playing: false, time: 0, at: t0 } });
    DB.wtn.push({ id: uid('n'), sid: 'W1', t: 74, by: stu, name: pname(stu), text: 'Why is the second sentence not needed here?', at: t0 + 4000000, replies: [{ by: g.mentor, name: pname(g.mentor), text: 'Because it repeats the first point. A summary keeps each point once.', at: t0 + 4100000 }] });
    DB.recs.push({ id: 'R1', gid: g.id, title: g.name + ' — Paper 2 revision', at: t0 - 2 * 86400000, dur: 3420, by: g.mentor, size: '0.9 GB (live site)' });
    DB.seeded = true; save(true);
  }

  /* ---------------------------------------------------------------- 1 · portal title by role */
  const portal = () => { const r = me().role; return r + ' Portal'; };
  const PREFIX = /^(\s*)(FTA FINANCE|TEACHER PORTAL|STUDENT PORTAL|COMMAND CENTRE)(\s·)/i;
  function applyTitle() {
    const b = document.querySelector('#side .brand b'); if (b && b.textContent !== portal()) b.textContent = portal();
    const v = $('view'); if (v) { const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n, k = 0; while ((n = w.nextNode()) && k++ < 400) { if (PREFIX.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(PREFIX, (all, sp, w, dot) => sp + (w === w.toUpperCase() ? portal().toUpperCase() : portal()) + dot); } }
    const t = portal() + ' · Final Touch Academy'; if (document.title !== t) document.title = t;
  }
  /* ---------------------------------------------------------------- 9 · "QIT Admin" → "QIT Theme" */
  function renameQit(root) { const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('QIT Admin')) n.nodeValue = n.nodeValue.replace(/QIT Admin/g, 'QIT Theme'); }

  /* ---------------------------------------------------------------- page registry */
  const ICONS = {
    chat: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    play: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M10 8l5 2.5-5 2.5z"/><path d="M7 20h10"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    tree: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v10a2 2 0 0 0 2 2h8M6 12h10"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4M14 10h4M14 13h3"/>'
  };
  const DEFS = [
    ['people', 'Profiles', ['cx-people'], 'tree', 'Mentors, their students and classes in one tree', 'vae'],
    ['profile', 'My Profile', ['tp-profile', 'sp-profile'], 'idcard', 'Your details, classes and account', 'vae'],
    ['chat', 'Messages', ['cx-chat', 'tp-chat', 'sp-chat'], 'chat', 'Class groups and private messages', 'vaed'],
    ['live', 'Live Class', ['cx-live', 'tp-live', 'sp-live'], 'video', 'Video class, screen share, whiteboard and attendance', 'va'],
    ['watch', 'Watch Together', ['cx-watch', 'tp-watch', 'sp-watch'], 'play', 'Watch a YouTube lesson together, ask about any moment', 'va'],
    ['rec', 'Recordings', ['cx-rec', 'tp-rec', 'sp-rec'], 'film', 'Recorded live classes', 'v'],
    ['monitor', 'Chat Monitor', ['cx-monitor'], 'eye', 'Read every class group and mentor–student chat', 'v']
  ];
  const GRANT = { Owner: ['people', 'chat', 'live', 'watch', 'rec', 'monitor'], Admin: ['people', 'chat', 'live', 'watch', 'rec', 'monitor'], 'Junior Admin': ['people', 'chat', 'live', 'watch', 'rec'], 'Finance Manager': ['chat'], 'Collection Staff': ['chat'], Mentor: ['profile', 'chat', 'live', 'watch', 'rec'], Student: ['profile', 'chat', 'live', 'watch', 'rec'] };
  let registered = false;
  function register() {
    if (registered || typeof NAV === 'undefined' || typeof PAGES === 'undefined' || !G(() => SCH.MODS)) return;
    Object.entries(ICONS).forEach(([k, v]) => { if (!P[k]) P[k] = v; });
    const items = []; DEFS.forEach(d => d[2].forEach(p => { items.push([p, d[1], d[3]]); PAGE_ICON[p] = d[3]; if (!FLAT.some(f => f[0] === p)) FLAT.push([p, d[1], d[3]]); SUBS[p] = d[4]; }));
    /* office: a new "Connect" group under Overview; mentors and students: at the end of their own menu group */
    const put = (gname, list) => { const g = NAV.find(x => x[0] === gname); if (g) list.forEach(it => { if (!g[1].some(x => x[0] === it[0])) g[1].push(it); }); else if (gname === 'Connect') NAV.splice(1, 0, ['Connect', list]); };
    put('Connect', items.filter(i => i[0].startsWith('cx-'))); put('My teaching', items.filter(i => i[0].startsWith('tp-'))); put('My school', items.filter(i => i[0].startsWith('sp-')));
    DEFS.forEach(d => { if (!SCH.MODS.some(m => m[0] === 'cx-' + d[0])) SCH.MODS.push(['cx-' + d[0], d[1], d[2], d[5], 'b']); });
    Object.keys(ROLES).forEach(r => { SCH.PERM[r] = SCH.PERM[r] || {}; (GRANT[r] || []).forEach(k => { const d = DEFS.find(x => x[0] === k); SCH.PERM[r]['cx-' + k] = d[5]; }); G(() => SCH.syncPages(r)); });
    const R = { people: pagePeople, profile: pageProfile, chat: pageChat, live: pageLive, watch: pageWatch, rec: pageRec, monitor: pageMonitor };
    DEFS.forEach(d => d[2].forEach(p => { PAGES[p] = () => (OVR[d[0]] || R[d[0]])(p); }));
    registered = true;
    if (G(() => ST.page) && document.getElementById('sidenav') && !$('cx-root')) G(() => render());
  }

  /* keep a live page (video, whiteboard, a half-typed message) when the app redraws for other reasons */
  let FORCE = true;
  function shell(key, html, keep) {
    const root = $('cx-root');
    if (keep && !FORCE && root && root.dataset.cxk === key) return false;
    FORCE = false;
    SCH.page('', '', '<div id="cx-root" data-cxk="' + key + '">' + html + '</div>');
    const ey = document.querySelector('#view .bn-eye'), f = FLAT.find(x => x[0] === key); if (ey && f) ey.textContent = portal().toUpperCase() + ' · ' + f[1].toUpperCase();
    applyTitle();
    return true;
  }
  const demoNote = t => '<p class="cx-demo">' + t + '</p>';

  /* ---------------------------------------------------------------- 2 + 5 · profile tree */
  const PF = { sel: null, node: 'overview', edit: false, open: {} };
  const MEN_FIELDS = { personal: [['name', 'Full name', 'office'], ['dob', 'Date of birth', 'self', 'date'], ['address', 'Address', 'self'], ['bio', 'About me', 'self', 'area']], contact: [['phone', 'Phone / WhatsApp', 'self'], ['gmail', 'Google sign-in (Gmail)', 'office'], ['emergency', 'Emergency contact', 'self']], teaching: [['subjects', 'Subjects', 'office'], ['qual', 'Qualifications', 'self', 'area'], ['exp', 'Teaching experience', 'self'], ['join', 'Joined FTA', 'none']], money: [['model', 'Pay model', 'none'], ['rate', 'Rate', 'none'], ['pay', 'Salary account (bKash / bank)', 'self']] };
  const STU_FIELDS = { personal: [['name', 'Full name', 'office'], ['dob', 'Date of birth', 'office', 'date'], ['address', 'Address', 'self'], ['bio', 'About me', 'self', 'area']], contact: [['phone', 'Phone', 'office'], ['guardian', 'Guardian', 'office'], ['gphone', 'Guardian phone', 'office'], ['gmail', 'Google sign-in (Gmail)', 'office']], teaching: [['cls', 'Class / level', 'office'], ['board', 'Board', 'office'], ['school', 'School', 'self'], ['joined', 'Joined FTA', 'none']] };
  const NODES = [['overview', 'Overview'], ['personal', 'Personal info'], ['contact', 'Contact'], ['teaching', 'Teaching'], ['classes', 'Classes & students'], ['attendance', 'Attendance'], ['money', 'Payments'], ['account', 'Login & security'], ['live', 'Live classes'], ['chats', 'Chats']];
  function personRec(pid) { return /^MEN-/.test(pid) ? G(() => MENTORS.find(x => x.id === pid)) : G(() => STUDENTS.find(x => x.id === pid)); }
  function attendanceOf(pid) {
    const out = { P: 0, A: 0, L: 0, held: 0, recent: [] };
    Object.entries(G(() => SCH.ATT) || {}).forEach(([k, v]) => {
      const [gid, d] = k.split('|'), g = groups().find(x => x.id === gid);
      if (/^MEN-/.test(pid)) { if (g && g.mentor === pid) { out.held++; out.recent.push([d, g.name, Object.values(v.marks || {}).filter(x => x === 'P').length + ' present']); } }
      else if (v.marks && v.marks[pid]) { const s = v.marks[pid]; out[s] = (out[s] || 0) + 1; out.recent.push([d, g ? g.name : gid, s === 'P' ? 'Present' : s === 'A' ? 'Absent' : s === 'L' ? 'Late' : s]); }
    });
    out.recent.sort((a, b) => b[0].localeCompare(a[0])); out.recent = out.recent.slice(0, 6);
    return out;
  }
  function profileView(pid, mode) {
    const r0 = personRec(pid); if (!r0) return '<div class="card cx-empty">Choose a person on the left.</div>';
    const r = Object.assign({}, r0, G(() => window.FTA_TREE.overlay(pid)) || {});
    const isM = /^MEN-/.test(pid), F = isM ? MEN_FIELDS : STU_FIELDS, m = me();
    const nodes = NODES.filter(n => !(n[0] === 'chats' && mode === 'self') && !(n[0] === 'money' && !isM && mode === 'self' && false));
    const node = nodes.some(n => n[0] === PF.node) ? PF.node : 'overview';
    const canEdit = f => f[2] === 'self' || (mode === 'office' && f[2] === 'office');
    const field = (f) => { const v = r[f[0]]; const ed = PF.edit && canEdit(f); return '<div class="cx-f"><label for="pf-' + f[0] + '">' + h(f[1]) + (f[2] === 'office' && mode === 'self' ? ' <small>office changes this</small>' : f[2] === 'none' ? ' <small>from records</small>' : '') + '</label>' + (ed ? (f[3] === 'area' ? '<textarea id="pf-' + f[0] + '" rows="3">' + h(v) + '</textarea>' : '<input id="pf-' + f[0] + '" type="' + (f[3] === 'date' ? 'date' : 'text') + '" value="' + h(v) + '">') : '<div class="cx-v">' + (v ? h(f[0] === 'rate' && r.model === 'pct_fee' ? v + '% of fees' : v) : '<i>—</i>') + '</div>') + '</div>'; };
    const editBar = list => list.some(canEdit) ? '<div class="cx-pacts">' + (PF.edit ? '<button class="btn" type="button" data-pf="cancel">Cancel</button><button class="btn p" type="button" data-pf="save">Save changes</button>' : '<button class="btn" type="button" data-pf="edit">' + G(() => ic('desc')) + 'Edit</button>') + '</div>' : '';
    let body = '';
    const at = attendanceOf(pid);
    if (node === 'overview') {
      const gs = isM ? groups().filter(g => g.mentor === pid) : groups().filter(g => (g.stu || []).includes(pid));
      const studs = isM ? new Set(gs.flatMap(g => g.stu || [])) : null;
      const due = !isM ? G(() => studentDue(pid)) : null;
      const pct = !isM && (at.P + at.A + at.L) ? Math.round((at.P + at.L) / (at.P + at.A + at.L) * 100) : null;
      body = '<div class="cx-kpis">' + (isM ? '<div><b>' + gs.length + '</b><span>classes</span></div><div><b>' + studs.size + '</b><span>students</span></div><div><b>' + at.held + '</b><span>classes taken</span></div>' : '<div><b>' + gs.length + '</b><span>classes</span></div><div><b>' + (pct == null ? '—' : pct + '%') + '</b><span>attendance</span></div><div><b>' + h(G(() => money(due)) || '—') + '</b><span>due now</span></div>') + '</div>' +
        '<div class="cx-f"><label>' + (isM ? 'Subjects' : 'Class') + '</label><div class="cx-v">' + h(isM ? r.subjects : (r.cls || '') + (r.board ? ' · ' + r.board : '')) + '</div></div>' +
        '<div class="cx-f"><label>About</label><div class="cx-v">' + (r.bio ? h(r.bio) : '<i>Not written yet' + (mode === 'self' ? ' — open Personal info → Edit' : '') + '</i>') + '</div></div>';
    } else if (F[node]) body = F[node].map(field).join('') + editBar(F[node]);
    else if (node === 'classes') {
      const gs = isM ? groups().filter(g => g.mentor === pid) : groups().filter(g => (g.stu || []).includes(pid));
      body = gs.length ? gs.map(g => '<details class="cx-tg" open><summary><b>' + h(g.name) + '</b><span>' + (isM ? (g.stu || []).length + ' students' : 'Mentor: ' + h(pname(g.mentor))) + '</span></summary>' + (isM ? '<ul>' + (g.stu || []).map(s => '<li><button type="button" class="cx-link" data-person="' + s + '">' + h(pname(s)) + '</button><span>' + h((personRec(s) || {}).cls || '') + '</span></li>').join('') + '</ul>' : '') + '</details>').join('') : '<p class="cx-muted">No classes yet.</p>';
    } else if (node === 'attendance') {
      body = (isM ? '<p>' + at.held + ' classes marked in total.</p>' : '<div class="cx-kpis"><div><b>' + at.P + '</b><span>present</span></div><div><b>' + at.L + '</b><span>late</span></div><div><b>' + at.A + '</b><span>absent</span></div></div>') + '<table class="cx-tbl"><thead><tr><th>Date</th><th>Class</th><th>' + (isM ? 'Marked' : 'Status') + '</th></tr></thead><tbody>' + (at.recent.map(x => '<tr><td>' + h(x[0]) + '</td><td>' + h(x[1]) + '</td><td>' + h(x[2]) + '</td></tr>').join('') || '<tr><td colspan="3" class="cx-muted">Nothing yet</td></tr>') + '</tbody></table>';
    } else if (node === 'money') {
      if (isM) body = MEN_FIELDS.money.map(field).join('') + editBar(MEN_FIELDS.money);
      else { const pays = (G(() => PAYMENTS.filter(p => p.stu === pid)) || []).slice(-5).reverse(); body = '<div class="cx-kpis"><div><b>' + h(G(() => money(studentDue(pid))) || '—') + '</b><span>due now</span></div><div><b>' + pays.length + '</b><span>recent payments</span></div></div><table class="cx-tbl"><thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>' + (pays.map(p => '<tr><td>' + h(p.date) + '</td><td>' + h(G(() => money(p.amt))) + '</td><td>' + h(p.status) + '</td></tr>').join('') || '<tr><td colspan="3" class="cx-muted">No payments yet</td></tr>') + '</tbody></table>'; }
    } else if (node === 'account') {
      body = '<div class="cx-f"><label>Signs in with</label><div class="cx-v">' + h(r.gmail || '— no Gmail saved —') + '</div></div><div class="cx-f"><label>Status</label><div class="cx-v">' + h(r.status || '') + '</div></div><p class="cx-muted">Google checks the password. ' + (mode === 'self' ? 'If this Gmail is wrong, ask the office to change it.' : 'Change the Gmail from the ' + (isM ? 'Mentors' : 'Students') + ' page.') + '</p>';
    } else if (node === 'live') { body = G(() => X.profileLive(pid, mode)) || '<p class="cx-muted">No live classes yet.</p>';
    } else if (node === 'chats') {
      const rooms = DB.msgs.map(x => x.room).filter((v, i, a) => a.indexOf(v) === i).map(room).filter(rm => rm && rm.members.includes(pid));
      groups().filter(g => g.mentor === pid || (g.stu || []).includes(pid)).forEach(g => { if (!rooms.some(x => x.id === 'g:' + g.id)) rooms.push(room('g:' + g.id)); });
      body = rooms.length ? '<ul class="cx-rl">' + rooms.map(rm => { const ms = roomMsgs(rm.id), l = ms.slice(-1)[0]; return '<li><button type="button" class="cx-link" data-openroom="' + h(rm.id) + '"><b>' + h(rm.kind === 'group' ? rm.name : pname(rm.a) + ' ↔ ' + pname(rm.b)) + '</b></button><span>' + ms.length + ' messages' + (l ? ' · last ' + day(l.at) : '') + '</span></li>'; }).join('') + '</ul><p class="cx-muted">Opening a chat from here is written to the activity log.</p>' : '<p class="cx-muted">No chats yet.</p>';
    }
    const photo = r.photo ? '<img src="' + h(r.photo) + '" alt="">' : '<span>' + h(initials(r.name)) + '</span>';
    return '<div class="cx-prof card"><div class="cx-ph"><div class="cx-av">' + photo + (mode === 'self' || mode === 'office' ? '<label class="cx-avb" title="Change photo">' + G(() => ic('plus')) + '<input type="file" accept="image/*" id="pf-photo" hidden></label>' : '') + '</div><div class="cx-pn"><h2>' + h(r.name) + '</h2><p>' + (isM ? 'Mentor · ' + h(r.subjects || '') : 'Student · ' + h(r.cls || '')) + ' · <span class="cx-st ' + (r.status === 'Active' ? 'ok' : '') + '">' + h(r.status || '') + '</span>' + (online(pid) ? ' · <span class="cx-on">online</span>' : '') + '</p></div>' +
      (mode === 'office' ? '<div class="cx-pacts"><button class="btn" type="button" data-dm="' + pid + '">' + G(() => ic('chat')) + 'Message</button>' + (G(() => X.profileActs(pid, mode)) || '') + '</div>' : '') + '</div>' +
      '<div class="cx-pt"><nav class="cx-tree" aria-label="Profile sections">' + nodes.map(n => '<button type="button" class="' + (n[0] === node ? 'on' : '') + '" data-node="' + n[0] + '"><i></i>' + h(n[1]) + '</button>').join('') + '</nav><section class="cx-pb">' + body + '</section></div></div>';
  }
  function bindProfile(root, pid, mode, redraw) {
    root.onclick = e => {
      const b = e.target.closest('[data-node],[data-pf],[data-person],[data-openroom],[data-dm]'); if (!b) return;
      if (b.dataset.node) { PF.node = b.dataset.node; PF.edit = false; redraw(); }
      else if (b.dataset.pf === 'edit') { PF.edit = true; redraw(); }
      else if (b.dataset.pf === 'cancel') { PF.edit = false; redraw(); }
      else if (b.dataset.pf === 'save') {
        const r = personRec(pid), F = /^MEN-/.test(pid) ? MEN_FIELDS : STU_FIELDS, list = F[PF.node] || []; const changed = [];
        const ov = {}; list.forEach(f => { const el = $('pf-' + f[0]); if (!el) return; const v = el.value.trim(); if ((r[f[0]] || '') !== v) { r[f[0]] = v; ov[f[0]] = v; changed.push(f[1]); } });
        if (mode === 'self') G(() => window.FTA_TREE.remember(pid, ov)); else G(() => window.FTA_TREE.remember(pid, null, Object.keys(ov)));
        PF.edit = false; if (changed.length) { G(() => log('Profile updated', r.id + ' · ' + r.name, changed.join(', ') + (mode === 'self' ? ' (by themselves)' : ''))); say('Saved: ' + changed.join(', ')); } else say('Nothing changed');
        redraw();
      } else if (b.dataset.person) { PF.sel = b.dataset.person; PF.node = 'overview'; if (mode === 'office') { redraw(); } }
      else if (b.dataset.openroom) { G(() => log('Chat opened by ' + me().role, b.dataset.openroom, 'Chat Monitor from profile')); MON.room = b.dataset.openroom; FORCE = true; go('cx-monitor'); }
      else if (b.dataset.dm) { CH.room = dmId(me().pid, b.dataset.dm); FORCE = true; go(kindOf(me().role) === 't' ? 'tp-chat' : kindOf(me().role) === 's' ? 'sp-chat' : 'cx-chat'); }
    };
    const ph = $('pf-photo'); if (ph) ph.onchange = () => { const f = ph.files[0]; if (!f) return; const img = new Image(), rd = new FileReader(); rd.onload = () => { img.onload = () => { const c = document.createElement('canvas'), s = 160, k = Math.max(s / img.width, s / img.height); c.width = c.height = s; c.getContext('2d').drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k); personRec(pid).photo = c.toDataURL('image/jpeg', .82); G(() => log('Profile photo changed', pid, '')); say('Photo saved'); redraw(); }; img.src = rd.result; }; rd.readAsDataURL(f); };
  }
  /* the Profile Tree itself lives in profile-tree.js (window.FTA_TREE); below it the full record stays available */
  const TREE = () => window.FTA_TREE;
  let PTI = null;
  function pageProfile(p) {
    const m = me(); PF.sel = m.pid;
    if (!shell(p, demoNote('<b>New: Profile Tree.</b> Your profile as one tree. Change your own details right inside the cards; the office keeps the rest. The full record (attendance, payments, login) is below.') + '<div id="pt-host" class="pt-host"></div><h3 class="pt-rec-h">Full record</h3><div id="cx-prof-wrap"></div>', true)) return;
    const drawRec = () => { const w = $('cx-prof-wrap'); if (!w) return; w.innerHTML = profileView(m.pid, 'self'); bindProfile(w, m.pid, 'self', () => { drawRec(); PTI && PTI.refresh(); }); };
    PTI = TREE() && $('pt-host') ? TREE().mount($('pt-host'), m.pid, { mode: 'self', full: true, onSave: drawRec }) : null;
    drawRec();
  }
  function pagePeople(p) {
    const M = G(() => MENTORS.filter(x => x.status === 'Active')) || [], S = G(() => STUDENTS) || [];
    const mentorOf = sid => { const e = G(() => ENROL.filter(x => x.stu === sid && x.mentor)) || []; return [...new Set(e.map(x => x.mentor))]; };
    const noMentor = S.filter(s => s.status === 'Active' && !mentorOf(s.id).length);
    const highDue = S.filter(s => (G(() => studentDue(s.id)) || 0) > 10000);
    if (!PF.sel || !personRec(PF.sel)) PF.sel = (M[0] || {}).id;
    if (!shell(p, demoNote('<b>New: Profiles.</b> Mentor → their students → classes, in one tree. Click anyone to see and edit their Profile Tree; attendance, payments and chats are in the full record below it.') + '<div class="cx-people"><aside class="card cx-ptree"><input id="cx-ps" type="search" placeholder="Search a name…" aria-label="Search people"><div id="cx-ptl"></div></aside><div class="cx-pmain"><div id="pt-host" class="pt-host"></div><h3 class="pt-rec-h">Full record</h3><div id="cx-prof-wrap"></div></div></div>', true)) return;
    const tree = q => {
      q = (q || '').toLowerCase(); const hit = n => !q || String(n).toLowerCase().includes(q);
      const item = (pid, sub) => '<button type="button" class="cx-ti ' + (PF.sel === pid ? 'on' : '') + '" data-person="' + pid + '"><span class="cx-dot ' + (online(pid) ? 'on' : '') + '"></span>' + h(pname(pid)) + (sub ? '<small>' + h(sub) + '</small>' : '') + '</button>';
      let html = '<details open><summary>Mentors <em>' + M.length + '</em></summary>' + M.map(x => { const st = [...new Set(groups().filter(g => g.mentor === x.id).flatMap(g => g.stu || []))]; if (!hit(x.name) && !st.some(s => hit(pname(s)))) return ''; return '<details class="cx-sub"' + (q || PF.sel === x.id || st.includes(PF.sel) ? ' open' : '') + '><summary>' + item(x.id, st.length + ' students') + '</summary>' + st.filter(s => hit(pname(s)) || hit(x.name)).map(s => item(s, (personRec(s) || {}).cls)).join('') + '</details>'; }).join('') + '</details>';
      const cls = {}; S.forEach(s => { (cls[s.cls || 'Other'] = cls[s.cls || 'Other'] || []).push(s); });
      html += '<details' + (q ? ' open' : '') + '><summary>Students by class <em>' + S.length + '</em></summary>' + Object.keys(cls).sort().map(c => { const L = cls[c].filter(s => hit(s.name)); return L.length ? '<details class="cx-sub"' + (q ? ' open' : '') + '><summary><span class="cx-tc">' + h(c) + '</span><small>' + L.length + '</small></summary>' + L.map(s => item(s.id, mentorOf(s.id).map(pname).join(', ') || 'no mentor')).join('') + '</details>' : ''; }).join('') + '</details>';
      html += '<details open><summary>Needs attention <em>' + (noMentor.length + highDue.length) + '</em></summary>' + noMentor.filter(s => hit(s.name)).map(s => item(s.id, 'no mentor yet')).join('') + highDue.filter(s => hit(s.name)).map(s => item(s.id, 'due ' + G(() => money(studentDue(s.id))))).join('') + '</details>';
      $('cx-ptl').innerHTML = html;
    };
    const drawRec = () => { const w = $('cx-prof-wrap'); if (!w) return; w.innerHTML = profileView(PF.sel, 'office'); bindProfile(w, PF.sel, 'office', () => { if (PF.sel !== shownSel) draw(); else { drawRec(); PTI && PTI.refresh(); } }); };
    let shownSel = null;
    const draw = () => { tree($('cx-ps') && $('cx-ps').value); shownSel = PF.sel; PTI = TREE() && $('pt-host') ? TREE().mount($('pt-host'), PF.sel, { mode: 'office', full: true, onSave: drawRec }) : null; drawRec(); };
    $('cx-ptl').onclick = e => { const b = e.target.closest('[data-person]'); if (!b) return; e.preventDefault(); PF.sel = b.dataset.person; PF.node = 'overview'; PF.edit = false; draw(); };
    $('cx-ps').oninput = () => tree($('cx-ps').value);
    draw();
  }

  /* ---------------------------------------------------------------- 6 · messages */
  const CH = { room: null, reply: null, edit: null, typing: {}, q: '' };
  function pageChat(p) {
    seed(); const m = me();
    if (!CH.room || !canSee(room(CH.room) || null)) CH.room = (myRooms()[0] || {}).id || null;
    if (!shell(p, '<div class="cx-chat card" id="cx-chat"><aside class="cx-cl"><div class="cx-clh"><input id="cx-cs" type="search" placeholder="Search or start a chat…" aria-label="Search chats"></div><div id="cx-cll"></div></aside><section class="cx-cv" id="cx-cv"></section></div>' + demoNote('Demo: open this file in a <b>second browser tab</b>, sign in there as another person (DEMO button), and chat between the two tabs — messages, typing, seen and online status update live. On the live site this runs on Supabase Realtime.'), true)) { drawChatList(); return; }
    drawChatList(); drawChat();
    $('cx-cs').oninput = () => { CH.q = $('cx-cs').value; drawChatList(); };
    $('cx-cll').onclick = e => { const b = e.target.closest('[data-room]'); if (!b) return; CH.room = b.dataset.room; CH.reply = CH.edit = null; drawChatList(); drawChat(); };
  }
  function drawChatList() {
    const L = $('cx-cll'); if (!L) return; const m = me(), q = CH.q.toLowerCase();
    const rooms = myRooms(), gs = rooms.filter(r => r.kind === 'group'), dms = rooms.filter(r => r.kind === 'dm').sort((a, b) => ((roomMsgs(b.id).slice(-1)[0] || {}).at || 0) - ((roomMsgs(a.id).slice(-1)[0] || {}).at || 0));
    const row = r => { const l = roomMsgs(r.id).slice(-1)[0], u = unread(r.id, m.pid), t = roomTitle(r, m.pid), o = r.kind === 'dm' ? other(r, m.pid) : null; if (q && !t.toLowerCase().includes(q)) return ''; return '<button type="button" class="cx-ri ' + (CH.room === r.id ? 'on' : '') + '" data-room="' + h(r.id) + '"><span class="cx-ra">' + (r.kind === 'group' ? G(() => ic('students')) : h(initials(t))) + (o ? '<i class="cx-dot ' + (online(o) ? 'on' : '') + '"></i>' : '') + '</span><span class="cx-rt"><b>' + h(t) + '</b><small>' + (CH.typing[r.id] && now() - CH.typing[r.id].at < 3500 ? '<em>' + h(CH.typing[r.id].name) + ' is typing…</em>' : l ? h((l.by === m.pid ? 'You: ' : r.kind === 'group' ? l.name.split(' ')[0] + ': ' : '') + (l.deleted ? 'Message deleted' : l.file ? '📎 ' + l.file.name : l.voice ? 'Voice message' : l.text)) : h(r.sub || 'No messages yet')) + '</small></span><span class="cx-rm">' + (l ? '<time>' + day(l.at) + '</time>' : '') + (u ? '<em class="cx-badge">' + u + '</em>' : '') + '</span></button>'; };
    let html = '<h6>Class groups</h6>' + (gs.map(row).join('') || '<p class="cx-muted">No class groups</p>') + '<h6>Private</h6>' + (dms.map(row).join('') || '<p class="cx-muted">No private chats yet</p>');
    if (q) { const have = new Set(dms.map(r => other(r, m.pid))); const start = contacts().filter(pid => !have.has(pid) && pname(pid).toLowerCase().includes(q)).slice(0, 8); if (start.length) html += '<h6>Start a new chat</h6>' + start.map(pid => '<button type="button" class="cx-ri" data-room="' + h(dmId(m.pid, pid)) + '"><span class="cx-ra">' + h(initials(pname(pid))) + '</span><span class="cx-rt"><b>' + h(pname(pid)) + '</b><small>' + prole(pid) + '</small></span></button>').join(''); }
    else html += '<p class="cx-hint">Type a name above to start a private chat' + (me().role === 'Student' ? ' with your mentor or the office' : '') + '.</p>';
    L.innerHTML = html;
  }
  function msgHtml(x, r, m, monitor) {
    const mine = x.by === m.pid || (m.office && x.by === 'U:office' && !monitor), rep = x.reply && DB.msgs.find(y => y.id === x.reply);
    const seenBy = Object.entries(DB.reads[r.id] || {}).filter(([pid, t]) => pid !== x.by && t >= x.at).map(([pid]) => pid);
    const ticks = mine ? '<span class="cx-tick ' + (seenBy.length ? 'seen' : '') + '" title="' + (seenBy.length ? 'Seen by ' + h(seenBy.map(pname).join(', ')) : 'Sent') + '">' + (seenBy.length ? '✓✓' : '✓') + (r.kind === 'group' && seenBy.length ? ' ' + seenBy.length : '') + '</span>' : '';
    let body;
    if (x.deleted) body = '<i class="cx-del">Message deleted</i>' + (monitor && x.text ? '<div class="cx-orig">Original (office only): ' + h(x.text) + '</div>' : '');
    else body = (rep ? '<div class="cx-quote"><b>' + h(rep.name) + '</b>' + h(rep.deleted ? 'Message deleted' : rep.text || (rep.file ? rep.file.name : 'Voice message')) + '</div>' : '') +
      (x.file ? (x.file.type.startsWith('image/') ? '<a class="cx-img" href="' + x.file.data + '" target="_blank" rel="noopener"><img src="' + x.file.data + '" alt="' + h(x.file.name) + '"></a>' : '<a class="cx-file" href="' + x.file.data + '" download="' + h(x.file.name) + '">' + G(() => ic('download')) + '<span><b>' + h(x.file.name) + '</b><small>' + Math.ceil(x.file.size / 1024) + ' KB</small></span></a>') : '') +
      (x.voice ? '<audio controls src="' + x.voice.data + '"></audio>' : '') + (x.text ? '<p>' + h(x.text).replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') + '</p>' : '');
    const acts = !monitor && !x.deleted ? '<span class="cx-ma"><button type="button" data-act="reply" data-id="' + x.id + '" title="Reply">↩</button>' + (mine && now() - x.at < 15 * 60000 && x.text ? '<button type="button" data-act="edit" data-id="' + x.id + '" title="Edit (within 15 minutes)">✎</button>' : '') + (mine ? '<button type="button" data-act="del" data-id="' + x.id + '" title="Delete">🗑</button>' : '') + '</span>' : '';
    return '<div class="cx-m ' + (mine ? 'me' : '') + '" id="msg-' + x.id + '">' + (!mine && r.kind === 'group' ? '<span class="cx-mn">' + h(x.name) + ' <small>' + prole(x.by) + '</small></span>' : '') + '<div class="cx-bub">' + body + '<span class="cx-mt">' + (x.edited ? 'edited · ' : '') + tm(x.at) + ' ' + ticks + '</span></div>' + acts + '</div>';
  }
  function drawChat(monitor) {
    const V = $(monitor ? 'cx-mv' : 'cx-cv'); if (!V) return; const m = me(), id = monitor ? MON.room : CH.room;
    if (!id) { V.innerHTML = '<div class="cx-empty">Choose a chat on the left.</div>'; return; }
    const r = room(id); if (!r || !canSee(r)) { V.innerHTML = '<div class="cx-empty">You cannot open this chat.</div>'; return; }
    const ms = roomMsgs(id), title = roomTitle(r, m.pid), o = r.kind === 'dm' && r.members.includes(m.pid) ? other(r, m.pid) : null, write = !monitor && canWrite(r, m);
    const typing = CH.typing[id] && now() - CH.typing[id].at < 3500 ? CH.typing[id].name + ' is typing…' : '';
    const oldText = $('cx-in') ? $('cx-in').value : '';
    let lastDay = '';
    V.innerHTML = '<header class="cx-ch"><div><b>' + h(title) + '</b><small id="cx-sub">' + (typing ? '<em>' + h(typing) + '</em>' : r.kind === 'group' ? h(r.sub) + ' · ' + r.members.filter(online).length + ' online' : o ? (online(o) ? '<span class="cx-on">online</span>' : 'offline') + ' · ' + prole(o) : h(pname(r.a) + ' ↔ ' + pname(r.b))) + '</small></div>' +
      (!monitor && r.kind === 'group' && kindOf(m.role) !== 's' ? '<button class="btn" type="button" data-go="live">' + G(() => ic('video')) + 'Live class</button>' : '') + (!monitor ? '<button class="btn" type="button" data-go="watch">' + G(() => ic('play')) + 'Watch together</button>' : '') + '</header>' +
      (r.monitored ? '<div class="cx-mon">' + G(() => ic('eye')) + (monitor ? 'You are reading this chat as ' + h(m.role) + '. This is written to the activity log.' : 'The academy office can read this chat to keep students safe.') + '</div>' : '') +
      '<div class="cx-ml" id="cx-ml">' + (ms.map(x => { const d = day(x.at), sep = d !== lastDay ? '<div class="cx-day"><span>' + d + '</span></div>' : ''; lastDay = d; return sep + msgHtml(x, r, m, monitor); }).join('') || '<div class="cx-empty">No messages yet. Say hello 👋</div>') + '</div>' +
      (write ? '<div class="cx-comp">' + (CH.reply || CH.edit ? '<div class="cx-rp">' + (CH.edit ? 'Editing your message' : 'Replying to <b>' + h((DB.msgs.find(y => y.id === CH.reply) || {}).name) + '</b>: ' + h(((DB.msgs.find(y => y.id === CH.reply) || {}).text || '').slice(0, 60))) + '<button type="button" data-act="cancel" aria-label="Cancel">×</button></div>' : '') +
        '<div class="cx-cr"><label class="cx-ib" title="Attach a photo, PDF or document">' + G(() => ic('plus')) + '<input type="file" id="cx-file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" hidden></label><button type="button" class="cx-ib" id="cx-voice" title="Hold to record a voice message">🎤</button><textarea id="cx-in" rows="1" placeholder="Write a message…" aria-label="Message"></textarea><button type="button" class="btn p" id="cx-send">Send</button></div></div>' : (monitor ? '' : '<div class="cx-comp cx-ro">You can read but not write here.</div>'));
    const ml = $('cx-ml'); ml.scrollTop = ml.scrollHeight;
    if (!monitor) markRead(id);
    V.onclick = e => {
      const b = e.target.closest('[data-act],[data-go]'); if (!b) return;
      if (b.dataset.go) { if (b.dataset.go === 'live' && r.g) LIVE.pick = r.g.id; if (b.dataset.go === 'watch') WT.room = id; FORCE = true; go((kindOf(m.role) === 't' ? 'tp-' : kindOf(m.role) === 's' ? 'sp-' : 'cx-') + b.dataset.go); return; }
      const x = DB.msgs.find(y => y.id === b.dataset.id);
      if (b.dataset.act === 'reply') { CH.reply = x.id; CH.edit = null; drawChat(); $('cx-in').focus(); }
      else if (b.dataset.act === 'edit') { CH.edit = x.id; CH.reply = null; drawChat(); $('cx-in').value = x.text; $('cx-in').focus(); }
      else if (b.dataset.act === 'del') { if (b.dataset.sure) { x.deleted = true; save(); drawChat(); drawChatList(); } else { b.dataset.sure = '1'; b.textContent = 'Delete?'; b.classList.add('sure'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = '🗑'; b.classList.remove('sure'); } }, 3000); } }
      else if (b.dataset.act === 'cancel') { CH.reply = CH.edit = null; drawChat(); }
    };
    if (!write) return;
    const inp = $('cx-in'); inp.value = CH.edit ? (DB.msgs.find(y => y.id === CH.edit) || {}).text || '' : oldText;
    let lastT = 0;
    inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; if (now() - lastT > 1500) { lastT = now(); post({ t: 'typing', room: id, pid: m.pid, name: m.name }); } };
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
    $('cx-send').onclick = send;
    function send(extra) {
      const text = inp.value.trim(); if (!text && !extra) return;
      if (CH.edit) { const x = DB.msgs.find(y => y.id === CH.edit); if (x) { x.text = text; x.edited = true; } CH.edit = null; }
      else { const msg = Object.assign({ id: uid('m'), room: id, by: m.pid, name: m.office ? m.name + ' (office)' : m.name, text, at: now(), reply: CH.reply || undefined }, extra || {}); DB.msgs.push(msg); post({ t: 'msg', room: id, id: msg.id }); }
      CH.reply = null; inp.value = ''; save(); drawChat(); drawChatList(); if ($('cx-in')) $('cx-in').focus();
    }
    $('cx-file').onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 700 * 1024) { say('In this demo files up to 700 KB fit (live site: 20 MB). Try a smaller file.'); return; } const rd = new FileReader(); rd.onload = () => send({ file: { name: f.name, type: f.type || 'application/octet-stream', size: f.size, data: rd.result } }); rd.readAsDataURL(f); };
    const vb = $('cx-voice'); let rec = null, chunks = [], t0 = 0;
    vb.onclick = async () => {
      if (rec) { rec.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { say('This browser cannot record voice here. On the live site it works in Chrome and Safari.'); return; }
      try {
        const st = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = []; rec = new MediaRecorder(st); t0 = now();
        rec.ondataavailable = ev => chunks.push(ev.data);
        rec.onstop = () => { st.getTracks().forEach(t => t.stop()); const bl = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); rec = null; vb.classList.remove('rec'); vb.textContent = '🎤'; if (bl.size > 700 * 1024) { say('Voice message too long for the demo (keep it under 30 seconds).'); return; } const rd = new FileReader(); rd.onload = () => send({ voice: { data: rd.result, dur: Math.round((now() - t0) / 1000) } }); rd.readAsDataURL(bl); };
        rec.start(); vb.classList.add('rec'); vb.textContent = '■ ' ; say('Recording… press again to send'); setTimeout(() => rec && rec.state === 'recording' && rec.stop(), 30000);
      } catch (err) { say('Microphone permission was not given.'); }
    };
  }
  LISTEN.push(msg => {
    if (msg.t === 'typing') { CH.typing[msg.room] = { name: msg.name, at: now() }; if (CH.room === msg.room && $('cx-sub')) $('cx-sub').innerHTML = '<em>' + h(msg.name) + ' is typing…</em>'; drawChatList(); setTimeout(() => { if (CH.room === msg.room && $('cx-cv')) drawChatHeaderOnly(); drawChatList(); }, 3600); }
    if (msg.t === 'msg' && !X.quiet) { const r = room(msg.room), m = me(); if (r && r.members.includes(m.pid) && !(CH.room === msg.room && $('cx-cv'))) { const x = DB.msgs.find(y => y.id === msg.id); if (x) say('💬 ' + (x.name || '') + ': ' + (x.text || (x.file ? x.file.name : 'Voice message')).slice(0, 60)); } }
  });
  function drawChatHeaderOnly() { const s = $('cx-sub'); if (!s || !CH.room) return; const r = room(CH.room), m = me(), o = r && r.kind === 'dm' ? other(r, m.pid) : null; s.innerHTML = r.kind === 'group' ? h(r.sub) + ' · ' + r.members.filter(online).length + ' online' : o ? (online(o) ? '<span class="cx-on">online</span>' : 'offline') + ' · ' + prole(o) : ''; }

  /* ---------------------------------------------------------------- 6 · chat monitor (Owner/Admin) */
  const MON = { room: null, q: '' };
  function pageMonitor(p) {
    seed();
    const ids = new Set(groups().map(g => 'g:' + g.id)); DB.msgs.forEach(x => ids.add(x.room));
    const rooms = [...ids].map(room).filter(r => r && canSee(r));
    if (!MON.room || !rooms.some(r => r.id === MON.room)) MON.room = (rooms.find(r => roomMsgs(r.id).length) || rooms[0] || {}).id;
    shell(p, demoNote('<b>Admin Monitoring.</b> Owner and Admin can read every class group and every mentor–student chat (read-only). Each opening is written to the activity log. Deleted messages still show their original text here.') + '<div class="cx-chat card"><aside class="cx-cl"><div class="cx-clh"><input id="cx-msq" type="search" placeholder="Filter by name…" aria-label="Filter chats"></div><div id="cx-mll"></div></aside><section class="cx-cv" id="cx-mv"></section></div>');
    const list = () => { const q = MON.q.toLowerCase(); $('cx-mll').innerHTML = rooms.filter(r => !q || (r.kind === 'group' ? r.name : pname(r.a) + pname(r.b)).toLowerCase().includes(q)).sort((a, b) => ((roomMsgs(b.id).slice(-1)[0] || {}).at || 0) - ((roomMsgs(a.id).slice(-1)[0] || {}).at || 0)).map(r => { const ms = roomMsgs(r.id), l = ms.slice(-1)[0]; return '<button type="button" class="cx-ri ' + (MON.room === r.id ? 'on' : '') + '" data-room="' + h(r.id) + '"><span class="cx-ra">' + (r.kind === 'group' ? G(() => ic('students')) : '↔') + '</span><span class="cx-rt"><b>' + h(r.kind === 'group' ? r.name : pname(r.a) + ' ↔ ' + pname(r.b)) + '</b><small>' + ms.length + ' messages' + (l ? ' · ' + day(l.at) : '') + '</small></span></button>'; }).join(''); };
    $('cx-mll').onclick = e => { const b = e.target.closest('[data-room]'); if (!b) return; MON.room = b.dataset.room; G(() => log('Chat opened by ' + me().role, MON.room, 'Chat Monitor')); list(); drawChat(true); };
    $('cx-msq').oninput = () => { MON.q = $('cx-msq').value; list(); };
    list(); drawChat(true);
  }

  /* ---------------------------------------------------------------- 6 · live class */
  const LIVE = { gid: null, pick: null, cam: null, scr: null, mic: false, hand: false, rec: null, recT: 0, mode: 'stage', joinedAt: 0, people: {} };
  function pageLive(p) {
    seed(); const m = me();
    if (LIVE.gid) return liveRoom(p);
    const gs = myGroups(), mine = kindOf(m.role) !== 's';
    shell(p, demoNote('<b>Live Class</b> inside the website: video, voice, screen share, a shared whiteboard, raise hand, automatic attendance and recording. In this demo your own camera and screen work; other people appear when they join from another tab. On the live site video goes through LiveKit.') +
      '<div class="cx-lgrid">' + (gs.map(g => { const live = DB.live[g.id] && now() - DB.live[g.id].at < 15000; return '<div class="card cx-lc ' + (LIVE.pick === g.id ? 'pick' : '') + '"><div><b>' + h(g.name) + '</b><small>' + h(pname(g.mentor)) + ' · ' + (g.stu || []).length + ' students</small></div>' + (live ? '<span class="cx-live">● LIVE now</span>' : '<span class="cx-muted">Not started</span>') + (mine || live ? '<button class="btn ' + (live ? 'p' : '') + '" type="button" data-join="' + g.id + '">' + G(() => ic('video')) + (live ? 'Join' : 'Start class') + '</button>' : '<button class="btn" type="button" disabled title="Your mentor starts the class">Waiting for mentor</button>') + '</div>'; }).join('') || '<div class="card cx-empty">No classes yet.</div>') + '</div>');
    $('cx-root').onclick = e => { const b = e.target.closest('[data-join]'); if (!b) return; LIVE.gid = b.dataset.join; LIVE.joinedAt = now(); LIVE.people = {}; FORCE = true; liveRoom(p); };
  }
  function liveRoom(p) {
    const m = me(), g = groups().find(x => x.id === LIVE.gid); if (!g) { LIVE.gid = null; return pageLive(p); }
    const host = kindOf(m.role) !== 's';
    if (host) { DB.live[g.id] = { at: now(), by: m.pid }; save(true); }
    if (!shell(p, '<div class="cx-room" id="cx-room"><header><div><b>' + h(g.name) + '</b><small id="cx-lsub"></small></div><span class="cx-rec" id="cx-rect" hidden>● REC <span></span></span><button class="btn" type="button" data-l="leave">Leave</button></header><div class="cx-rb"><div class="cx-stage" id="cx-stage"></div><aside class="cx-side"><div class="cx-tabs"><button type="button" class="on" data-tab="people">People</button><button type="button" data-tab="chat">Chat</button></div><div id="cx-sidebody"></div></aside></div><footer class="cx-bar"><button type="button" data-l="mic" id="lb-mic">🎙<span>Mic</span></button><button type="button" data-l="cam" id="lb-cam">📷<span>Camera</span></button><button type="button" data-l="scr" id="lb-scr">🖥<span>Share screen</span></button><button type="button" data-l="wb" id="lb-wb">✏️<span>Whiteboard</span></button><button type="button" data-l="hand" id="lb-hand">✋<span>Raise hand</span></button>' + (host ? '<button type="button" data-l="rec" id="lb-rec">⏺<span>Record</span></button>' : '') + '<button type="button" data-l="leave" class="end">Leave</button></footer></div>', true)) return;
    const sideTab = { v: 'people' };
    const drawStage = () => {
      const S = $('cx-stage'); if (!S) return;
      if (LIVE.mode === 'wb') { if (!$('cx-wb')) { S.innerHTML = '<div class="cx-wbbar"><button type="button" data-c="#111a2e" class="on" style="--c:#111a2e" aria-label="Ink"></button><button type="button" data-c="#c0392b" style="--c:#c0392b" aria-label="Red"></button><button type="button" data-c="#1f6fd6" style="--c:#1f6fd6" aria-label="Blue"></button><button type="button" data-c="#16935f" style="--c:#16935f" aria-label="Green"></button><button type="button" data-c="erase" aria-label="Eraser">⌫</button>' + (host ? '<button type="button" data-c="clear">Clear</button>' : '') + '</div><canvas id="cx-wb" width="1280" height="720" aria-label="Shared whiteboard"></canvas>'; bindWB(); } return; }
      const main = LIVE.scr || LIVE.cam;
      const others = Object.values(ONLINE).filter(o => o.live === g.id && now() - o.at < 9000);
      S.innerHTML = '<div class="cx-main">' + (main ? '<video id="cx-mainv" autoplay playsinline muted></video><span class="cx-tag">' + (LIVE.scr ? 'Your screen' : 'You') + '</span>' : '<div class="cx-ph2"><span>' + h(initials(m.name)) + '</span><p>' + (host ? 'Turn on your camera or share your screen to start teaching.' : 'Waiting for the mentor’s video…') + '</p></div>') + '</div><div class="cx-tiles"><div class="cx-tile"><span>' + h(initials(m.name)) + '</span><small>You' + (LIVE.mic ? '' : ' · muted') + '</small></div>' + others.map(o => '<div class="cx-tile"><span>' + h(initials(o.name)) + '</span><small>' + h(o.name.split(' ')[0]) + (o.hand ? ' ✋' : '') + '</small></div>').join('') + '</div>';
      if (main) { const v = $('cx-mainv'); v.srcObject = main; }
    };
    const drawSide = () => {
      const B = $('cx-sidebody'); if (!B) return;
      const others = Object.values(ONLINE).filter(o => o.live === g.id && now() - o.at < 9000);
      others.forEach(o => { LIVE.people[o.pid] = LIVE.people[o.pid] || now(); });
      if (sideTab.v === 'people') {
        const roster = [g.mentor].concat(g.stu || []);
        B.innerHTML = '<p class="cx-muted">Joined now: ' + (others.length + 1) + '</p><ul class="cx-att">' + roster.map(pid => { const here = pid === m.pid || others.some(o => o.pid === pid), o = others.find(x => x.pid === pid); return '<li><span class="cx-dot ' + (here ? 'on' : '') + '"></span>' + h(pname(pid)) + (pid === g.mentor ? ' <small>mentor</small>' : '') + (o && o.hand ? ' ✋' : '') + '<em>' + (here ? 'present · ' + tm(pid === m.pid ? LIVE.joinedAt : LIVE.people[pid]) : 'not joined') + '</em></li>'; }).join('') + '</ul>' + (host ? '<button class="btn p" type="button" data-l="att">Save attendance</button>' : '');
      } else {
        const id = 'g:' + g.id, ms = roomMsgs(id).slice(-30);
        B.innerHTML = '<div class="cx-lchat">' + ms.map(x => '<p><b>' + h(x.name.split(' ')[0]) + ':</b> ' + h(x.deleted ? 'Message deleted' : x.text || '📎') + '</p>').join('') + '</div><div class="cx-cr"><input id="cx-lin" placeholder="Message the class…" aria-label="Message the class"><button class="btn p" type="button" data-l="say">Send</button></div>';
        const c = B.querySelector('.cx-lchat'); c.scrollTop = c.scrollHeight;
      }
    };
    const sub = () => { const s = $('cx-lsub'); if (s) s.textContent = pname(g.mentor) + ' · started ' + tm(LIVE.joinedAt) + ' · ' + mmss((now() - LIVE.joinedAt) / 1000); };
    drawStage(); drawSide(); sub();
    clearInterval(LIVE.tick); LIVE.tick = setInterval(() => { if (!$('cx-room')) { clearInterval(LIVE.tick); return; } sub(); if (host) { DB.live[g.id] = { at: now(), by: m.pid }; save(true); } if (sideTab.v === 'people') drawSide(); if (LIVE.mode !== 'wb' && !LIVE.cam && !LIVE.scr) drawStage(); if (LIVE.rec) { const r = $('cx-rect'); r.hidden = false; r.querySelector('span').textContent = mmss((now() - LIVE.recT) / 1000); } }, 3000);
    const btn = (id, on) => { const b = $(id); if (b) b.classList.toggle('on', !!on); };
    $('cx-room').onclick = async e => {
      const t = e.target.closest('[data-tab]'); if (t) { sideTab.v = t.dataset.tab; [...document.querySelectorAll('.cx-tabs button')].forEach(x => x.classList.toggle('on', x === t)); drawSide(); return; }
      const b = e.target.closest('[data-l]'); if (!b) return; const a = b.dataset.l;
      if (a === 'mic') { if (!LIVE.mic) { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); LIVE.micS = s; LIVE.mic = true; } catch (err) { say('Microphone permission was not given.'); } } else { LIVE.micS && LIVE.micS.getTracks().forEach(x => x.stop()); LIVE.mic = false; } btn('lb-mic', LIVE.mic); drawStage(); }
      else if (a === 'cam') { if (!LIVE.cam) { try { LIVE.cam = await navigator.mediaDevices.getUserMedia({ video: true }); } catch (err) { say('Camera permission was not given (or no camera).'); } } else { LIVE.cam.getTracks().forEach(x => x.stop()); LIVE.cam = null; } btn('lb-cam', LIVE.cam); LIVE.mode = 'stage'; btn('lb-wb', false); drawStage(); }
      else if (a === 'scr') { if (!LIVE.scr) { try { LIVE.scr = await navigator.mediaDevices.getDisplayMedia({ video: true }); LIVE.scr.getVideoTracks()[0].onended = () => { LIVE.scr = null; btn('lb-scr', false); drawStage(); }; } catch (err) { say('Screen sharing was cancelled.'); } } else { LIVE.scr.getTracks().forEach(x => x.stop()); LIVE.scr = null; } btn('lb-scr', LIVE.scr); LIVE.mode = 'stage'; btn('lb-wb', false); drawStage(); }
      else if (a === 'wb') { LIVE.mode = LIVE.mode === 'wb' ? 'stage' : 'wb'; btn('lb-wb', LIVE.mode === 'wb'); $('cx-stage').innerHTML = ''; drawStage(); }
      else if (a === 'hand') { LIVE.hand = !LIVE.hand; btn('lb-hand', LIVE.hand); say(LIVE.hand ? 'Hand raised — the mentor sees ✋' : 'Hand lowered'); }
      else if (a === 'rec') {
        if (LIVE.rec) { LIVE.rec.stop(); return; }
        const src = LIVE.scr || LIVE.cam || ($('cx-wb') && $('cx-wb').captureStream ? $('cx-wb').captureStream(15) : null);
        if (!src || !window.MediaRecorder) { say('Turn on the camera, share the screen or open the whiteboard first — that is what gets recorded.'); return; }
        const chunks = []; const rec = new MediaRecorder(src); LIVE.rec = rec; LIVE.recT = now(); btn('lb-rec', true);
        rec.ondataavailable = ev => chunks.push(ev.data);
        rec.onstop = () => { const bl = new Blob(chunks, { type: rec.mimeType || 'video/webm' }), dur = Math.round((now() - LIVE.recT) / 1000); LIVE.rec = null; btn('lb-rec', false); $('cx-rect').hidden = true; const id = uid('R'); BLOBS[id] = URL.createObjectURL(bl); DB.recs.unshift({ id, gid: g.id, title: g.name + ' — ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), at: now(), dur, by: m.pid, size: Math.round(bl.size / 1024) + ' KB' }); save(); say('Recording saved to Recordings'); };
        rec.start(1000); $('cx-rect').hidden = false; say('Recording started');
      }
      else if (a === 'att') { const others = Object.values(ONLINE).filter(o => o.live === g.id && now() - o.at < 9000).map(o => o.pid); const roster = g.stu || []; const pres = roster.filter(s => others.includes(s)); say('Attendance: ' + pres.length + ' present, ' + (roster.length - pres.length) + ' absent. (Live site: saved to Attendance automatically when the class ends.)'); }
      else if (a === 'say') { const i = $('cx-lin'); const tx = i.value.trim(); if (!tx) return; DB.msgs.push({ id: uid('m'), room: 'g:' + g.id, by: m.pid, name: m.name, text: tx, at: now() }); save(); drawSide(); }
      else if (a === 'leave') { [LIVE.cam, LIVE.scr, LIVE.micS].forEach(s => s && s.getTracks().forEach(x => x.stop())); if (LIVE.rec) LIVE.rec.stop(); LIVE.cam = LIVE.scr = LIVE.micS = null; LIVE.mic = LIVE.hand = false; LIVE.mode = 'stage'; if (host) { delete DB.live[g.id]; save(); } LIVE.gid = null; clearInterval(LIVE.tick); FORCE = true; pageLive(p); }
    };
  }
  const BLOBS = {};
  function bindWB() {
    const c = $('cx-wb'), x = c.getContext('2d'); let pen = '#111a2e', drawing = null;
    const gid = LIVE.gid, draw = s => { x.strokeStyle = s.c === 'erase' ? '#ffffff' : s.c; x.lineWidth = s.c === 'erase' ? 28 : 4; x.lineCap = x.lineJoin = 'round'; x.beginPath(); s.p.forEach((pt, i) => i ? x.lineTo(pt[0], pt[1]) : x.moveTo(pt[0], pt[1])); x.stroke(); };
    const redraw = () => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); (DB.wb[gid] || []).forEach(draw); };
    redraw(); WB.redraw = redraw;
    const pos = e => { const r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * c.width), Math.round((e.clientY - r.top) / r.height * c.height)]; };
    c.onpointerdown = e => { c.setPointerCapture(e.pointerId); drawing = { c: pen, p: [pos(e)] }; };
    c.onpointermove = e => { if (!drawing) return; drawing.p.push(pos(e)); draw({ c: drawing.c, p: drawing.p.slice(-2) }); };
    c.onpointerup = () => { if (!drawing) return; DB.wb[gid] = (DB.wb[gid] || []).concat([drawing]).slice(-400); post({ t: 'wb', gid, s: drawing }); save(true); drawing = null; };
    c.parentElement.querySelector('.cx-wbbar').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; if (b.dataset.c === 'clear') { DB.wb[gid] = []; save(true); post({ t: 'wbclear', gid }); redraw(); return; } pen = b.dataset.c; [...b.parentElement.children].forEach(y => y.classList.toggle('on', y === b)); };
  }
  const WB = { redraw: null };
  LISTEN.push(msg => { if (msg.t === 'wb' && msg.gid === LIVE.gid && $('cx-wb')) { DB.wb[msg.gid] = (DB.wb[msg.gid] || []).concat([msg.s]); WB.redraw && WB.redraw(); } if (msg.t === 'wbclear' && msg.gid === LIVE.gid) { DB.wb[msg.gid] = []; WB.redraw && WB.redraw(); } });

  /* ---------------------------------------------------------------- 6 · recordings */
  function pageRec(p) {
    seed(); const m = me(), gs = myGroups().map(g => g.id);
    const L = DB.recs.filter(r => kindOf(m.role) === 'o' || gs.includes(r.gid));
    shell(p, demoNote('<b>Recording Library.</b> Recorded live classes, only for that class’s students, mentors and the office. Recordings made in this demo can be played until you close the tab; on the live site they are kept in Supabase Storage (for example 90 days).') +
      '<div class="card"><table class="cx-tbl"><thead><tr><th>Class</th><th>Date</th><th>Length</th><th>By</th><th></th></tr></thead><tbody>' + (L.map(r => '<tr><td><b>' + h(r.title) + '</b></td><td>' + day(r.at) + '</td><td>' + mmss(r.dur) + '</td><td>' + h(pname(r.by)) + '</td><td>' + (BLOBS[r.id] ? '<button class="btn" type="button" data-play="' + r.id + '">' + G(() => ic('play')) + 'Play</button>' : '<span class="cx-muted">on live site</span>') + '</td></tr>').join('') || '<tr><td colspan="5" class="cx-muted">No recordings yet. Start a Live Class and press Record.</td></tr>') + '</tbody></table><div id="cx-player"></div></div>');
    $('cx-root').onclick = e => { const b = e.target.closest('[data-play]'); if (!b) return; $('cx-player').innerHTML = '<video controls autoplay src="' + BLOBS[b.dataset.play] + '" style="width:100%;max-height:60vh;margin-top:12px;border-radius:12px;background:#000"></video>'; };
  }

  /* ---------------------------------------------------------------- 4 · watch together */
  const WT = { sid: null, room: null, player: null, kind: null, quiet: 0, demo: null };
  const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(u) ? u : null); };
  function visibleSessions() { const m = me(); return DB.wt.filter(s => { const r = room(s.room); return r && (r.members.includes(m.pid) || (m.office && (r.members.includes('U:office') || isMonitor(m.role)))); }); }
  function pageWatch(p) {
    seed(); const m = me();
    if (WT.sid) return wtRoom(p);
    const rooms = myRooms(); const pre = WT.room;
    const opts = rooms.map(r => '<option value="' + h(r.id) + '"' + (pre === r.id ? ' selected' : '') + '>' + h(roomTitle(r, m.pid)) + (r.kind === 'group' ? ' (class group)' : '') + '</option>').join('') + contacts().filter(pid => !rooms.some(r => r.id === dmId(m.pid, pid))).slice(0, 40).map(pid => '<option value="' + h(dmId(m.pid, pid)) + '">' + h(pname(pid)) + ' (' + prole(pid) + ')</option>').join('');
    shell(p, demoNote('<b>Watch Together.</b> Share a YouTube link and watch at the same time: when anyone plays, pauses or jumps, everyone’s video follows. Students can send a note fixed to the exact second they did not understand; the mentor replies there. Try it in two tabs.') +
      '<div class="cx-wtg"><form class="card cx-wtn" id="cx-wtf"><h2>Start a session</h2><div class="cx-f"><label for="wt-url">YouTube link</label><input id="wt-url" required placeholder="https://www.youtube.com/watch?v=…"></div><div class="cx-f"><label for="wt-title">Title</label><input id="wt-title" placeholder="e.g. Photosynthesis — chapter 4"></div><div class="cx-f"><label for="wt-room">With</label><select id="wt-room">' + opts + '</select></div><button class="btn p" type="submit">' + G(() => ic('play')) + 'Start watching</button></form>' +
      '<div class="card"><h2>Sessions</h2>' + (visibleSessions().map(s => '<button type="button" class="cx-ws" data-wt="' + s.id + '"><span class="cx-wthumb" style="background-image:url(https://i.ytimg.com/vi/' + h(s.vid) + '/mqdefault.jpg)"></span><span><b>' + h(s.title) + '</b><small>' + h(pname(s.host)) + ' · ' + h(roomTitle(room(s.room), m.pid)) + ' · ' + DB.wtn.filter(n => n.sid === s.id).length + ' notes</small></span></button>').join('') || '<p class="cx-muted">No sessions yet.</p>') + '</div></div>');
    $('cx-wtf').onsubmit = e => { e.preventDefault(); const vid = ytId($('wt-url').value.trim()); if (!vid) { say('That does not look like a YouTube link.'); return; } const s = { id: uid('W'), title: $('wt-title').value.trim() || 'Lesson video', url: $('wt-url').value.trim(), vid, host: m.pid, room: $('wt-room').value, at: now(), state: { playing: false, time: 0, at: now() } }; DB.wt.unshift(s); const r = room(s.room); DB.msgs.push({ id: uid('m'), room: s.room, by: m.pid, name: m.name, text: '▶ Started Watch Together: ' + s.title + ' — open Watch Together to join', at: now() }); save(); WT.sid = s.id; FORCE = true; wtRoom(p); };
    $('cx-root').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if (!b) return; WT.sid = b.dataset.wt; FORCE = true; wtRoom(p); });
  }
  function wtRoom(p) {
    const s = DB.wt.find(x => x.id === WT.sid), m = me(); if (!s) { WT.sid = null; return pageWatch(p); }
    if (!shell(p, '<div class="cx-wt"><div class="cx-wtl"><div class="cx-wth"><button class="btn" type="button" id="wt-back">← Sessions</button><div><b>' + h(s.title) + '</b><small id="wt-who"></small></div></div><div class="cx-vid"><div id="wt-player"></div></div><div class="cx-wtc"><button class="btn p" type="button" id="wt-pp">▶ Play</button><input type="range" id="wt-seek" min="0" max="600" value="0" aria-label="Video position"><span id="wt-time">0:00</span></div><p class="cx-muted" id="wt-mode"></p></div><aside class="card cx-wtnotes"><h2>Questions on this video</h2><form id="wt-nf" class="cx-wtask"><label for="wt-note">' + (kindOf(m.role) === 's' ? 'Did not understand something? Ask about this moment' : 'Add a note at this moment') + '</label><textarea id="wt-note" rows="2" placeholder="Type your question…"></textarea><button class="btn p" type="submit">Send at <span id="wt-at">0:00</span></button></form><div id="wt-nl"></div></aside></div>', true)) return;
    $('wt-back').onclick = () => { stopWT(); WT.sid = null; FORCE = true; pageWatch(p); };
    const cur = () => WT.kind === 'yt' ? G(() => WT.player.getCurrentTime()) || 0 : WT.demo ? WT.demo.time() : 0;
    const dur = () => WT.kind === 'yt' ? G(() => WT.player.getDuration()) || 600 : 600;
    const ui = () => { const t = cur(); if ($('wt-time')) { $('wt-time').textContent = mmss(t) + ' / ' + mmss(dur()); $('wt-seek').max = Math.round(dur()); if (!WT.dragging) $('wt-seek').value = Math.round(t); $('wt-at').textContent = mmss(t); $('wt-pp').textContent = playing() ? '❚❚ Pause' : '▶ Play'; const others = Object.values(ONLINE).filter(o => o.wt === s.id && now() - o.at < 9000); $('wt-who').textContent = 'Watching: you' + (others.length ? ', ' + others.map(o => o.name.split(' ')[0]).join(', ') : ' (open a second tab to watch together)'); } };
    const playing = () => WT.kind === 'yt' ? G(() => WT.player.getPlayerState()) === 1 : WT.demo ? WT.demo.playing : false;
    const send = (action, t) => { if (now() < WT.quiet) return; s.state = { playing: action === 'play' ? true : action === 'pause' ? false : playing(), time: t, at: now() }; save(true); post({ t: 'wt', sid: s.id, action, time: t, by: m.name }); };
    const apply = (action, t, by) => { WT.quiet = now() + 900; if (WT.kind === 'yt') { G(() => WT.player.seekTo(t, true)); if (action === 'play') G(() => WT.player.playVideo()); if (action === 'pause') G(() => WT.player.pauseVideo()); } else if (WT.demo) { WT.demo.seek(t); action === 'play' ? WT.demo.play() : action === 'pause' ? WT.demo.pause() : 0; } if (by) say(by + (action === 'play' ? ' pressed play' : action === 'pause' ? ' paused' : ' jumped to ' + mmss(t))); ui(); };
    WT.apply = apply;
    $('wt-pp').onclick = () => { const t = cur(); if (playing()) { apply('pause', t); WT.quiet = 0; send('pause', t); } else { apply('play', t); WT.quiet = 0; send('play', t); } };
    $('wt-seek').oninput = () => { WT.dragging = true; $('wt-time').textContent = mmss(+$('wt-seek').value) + ' / ' + mmss(dur()); };
    $('wt-seek').onchange = () => { WT.dragging = false; const t = +$('wt-seek').value; apply(playing() ? 'play' : 'seek', t); WT.quiet = 0; send(playing() ? 'play' : 'seek', t); };
    const notes = () => { const L = DB.wtn.filter(n => n.sid === s.id).sort((a, b) => a.t - b.t); $('wt-nl').innerHTML = L.map(n => '<div class="cx-note"><button type="button" class="cx-ts" data-ts="' + n.t + '">' + mmss(n.t) + '</button><div><p><b>' + h(n.name) + '</b> ' + h(n.text) + '</p>' + (n.replies || []).map(r => '<p class="cx-reply"><b>' + h(r.name) + '</b> ' + h(r.text) + '</p>').join('') + '<form class="cx-rf" data-note="' + n.id + '"><input placeholder="Reply…" aria-label="Reply"><button class="btn" type="submit">Reply</button></form></div></div>').join('') || '<p class="cx-muted">No questions yet. Pause where it gets hard and ask.</p>'; };
    notes(); WT.notes = notes;
    $('wt-nf').onsubmit = e => { e.preventDefault(); const tx = $('wt-note').value.trim(); if (!tx) return; const t = Math.round(cur()); DB.wtn.push({ id: uid('n'), sid: s.id, t, by: m.pid, name: m.name, text: tx, at: now(), replies: [] }); $('wt-note').value = ''; save(); post({ t: 'wtnote', sid: s.id, name: m.name, time: t }); notes(); say('Sent to ' + pname(s.host) + ' at ' + mmss(t)); };
    $('wt-nl').onclick = e => { const b = e.target.closest('[data-ts]'); if (!b) return; const t = +b.dataset.ts; apply('pause', t); WT.quiet = 0; send('pause', t); };
    $('wt-nl').onsubmit = e => { e.preventDefault(); const f = e.target.closest('[data-note]'); const n = DB.wtn.find(x => x.id === f.dataset.note), i = f.querySelector('input'); if (!i.value.trim()) return; n.replies = (n.replies || []).concat([{ by: m.pid, name: m.name, text: i.value.trim(), at: now() }]); save(); notes(); };
    /* the player: real YouTube when it loads, otherwise a stand-in so the syncing can still be tried */
    const start = () => { const st = s.state || {}; const t = st.time + (st.playing ? (now() - st.at) / 1000 : 0); apply(st.playing ? 'play' : 'pause', t); WT.quiet = 0; };
    const demoPlayer = why => {
      WT.kind = 'demo'; $('wt-mode').textContent = 'Demo player: ' + why + ' On the live site the real YouTube video plays here.';
      $('wt-player').innerHTML = '<canvas id="wt-can" width="960" height="540" aria-label="Demo video"></canvas>';
      const c = $('wt-can'), x = c.getContext('2d'); let t0 = 0, base = 0, on = false;
      WT.demo = { playing: false, time: () => on ? base + (now() - t0) / 1000 : base, play() { if (!on) { t0 = now(); on = true; this.playing = true; } }, pause() { if (on) { base += (now() - t0) / 1000; on = false; this.playing = false; } }, seek(t) { base = t; t0 = now(); } };
      const slides = ['What is a summary?', 'Find the key points', 'Remove repeats', 'Use your own words', 'Check the word limit', 'Worked example'];
      (function paint() { if (!$('wt-can')) return; const t = WT.demo.time(), k = Math.floor(t / 100) % slides.length; x.fillStyle = '#0f1a2e'; x.fillRect(0, 0, 960, 540); x.fillStyle = '#e3c77f'; x.font = '600 22px Manrope, sans-serif'; x.fillText('FTA LESSON · DEMO VIDEO', 48, 70); x.fillStyle = '#ffffff'; x.font = '700 52px Manrope, sans-serif'; x.fillText(slides[k], 48, 260); x.font = '400 26px Manrope, sans-serif'; x.fillStyle = '#c9cfdb'; x.fillText('Part ' + (k + 1) + ' of ' + slides.length, 48, 310); x.fillStyle = '#25324a'; x.fillRect(48, 470, 864, 8); x.fillStyle = '#e3c77f'; x.fillRect(48, 470, 864 * Math.min(1, t / 600), 8); x.fillStyle = '#fff'; x.font = '600 24px Manrope, sans-serif'; x.fillText(mmss(t), 48, 520); if (!WT.demo.playing) { x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.moveTo(456, 200); x.lineTo(456, 320); x.lineTo(556, 260); x.fill(); } requestAnimationFrame(paint); })();
      start();
    };
    WT.kind = null;
    const yt = () => {
      const make = () => { try { WT.player = new YT.Player('wt-player', { videoId: s.vid, playerVars: { rel: 0, modestbranding: 1, playsinline: 1 }, events: { onReady: () => { WT.kind = 'yt'; $('wt-mode').textContent = 'Everyone’s video follows play, pause and jumps.'; start(); }, onError: ev => { G(() => WT.player.destroy()); demoPlayer('YouTube would not play this video here (error ' + ev.data + ').'); }, onStateChange: ev => { if (now() < WT.quiet) return; if (ev.data === 1) send('play', cur()); if (ev.data === 2) send('pause', cur()); } } }); } catch (e) { demoPlayer('YouTube could not load.'); } };
      if (window.YT && YT.Player) return make();
      window.onYouTubeIframeAPIReady = make;
      if (!document.getElementById('yt-api')) { const sc = document.createElement('script'); sc.id = 'yt-api'; sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = () => demoPlayer('YouTube could not load (no internet?).'); document.head.appendChild(sc); }
      setTimeout(() => { if (!WT.kind && $('wt-player')) demoPlayer('YouTube did not answer in time.'); }, 9000);
    };
    location.protocol === 'file:' ? (function () { /* YouTube refuses to play inside a file opened from the computer */ demoPlayer('YouTube does not play inside a file opened from your computer.'); })() : yt();
    clearInterval(WT.tick); WT.tick = setInterval(() => { if (!$('wt-time')) { clearInterval(WT.tick); return; } ui(); }, 500);
  }
  function stopWT() { clearInterval(WT.tick); G(() => WT.player && WT.player.destroy && WT.player.destroy()); WT.player = null; WT.demo = null; WT.kind = null; }
  LISTEN.push(msg => { if (msg.t === 'wt' && msg.sid === WT.sid && WT.apply) WT.apply(msg.action, msg.time, msg.by); if (msg.t === 'wtnote' && msg.sid === WT.sid) { load(); WT.notes && WT.notes(); say('❓ ' + msg.name + ' asked about ' + mmss(msg.time)); } });

  /* ---------------------------------------------------------------- when the shared demo data changes */
  function onData() {
    if ($('cx-cll')) drawChatList();
    if ($('cx-cv') && CH.room) { const keep = $('cx-in') && document.activeElement === $('cx-in'); drawChat(); if (keep && $('cx-in')) $('cx-in').focus(); }
    if ($('cx-mv')) drawChat(true);
    if ($('wt-nl') && WT.notes) WT.notes();
    HOOKS.forEach(f => G(f));
    badge();
  }
  function badge() {
    const n = registered ? totalUnread() : 0;
    document.querySelectorAll('#sidenav .nav').forEach(b => { if (/-chat'/.test(b.getAttribute('onclick') || '') || /^Messages$/.test(((b.querySelector('.l') || {}).textContent || '').trim())) { let c = b.querySelector('.cx-nb'); if (n && !c) { c = document.createElement('span'); c.className = 'cnt cx-nb'; b.appendChild(c); } if (c) { if (n) c.textContent = n; else c.remove(); } } });
  }

  /* ---------------------------------------------------------------- start */
  /* FTA Premium is a dark design: choosing it after Premium Light used to leave a half-light page (black banner on ivory) */
  const _skin = window.setSkin;
  if (typeof _skin === 'function') window.setSkin = function (k) { const r = _skin.apply(this, arguments); if (k === 'premium' && document.documentElement.dataset.theme === 'light') G(() => setTheme('dark')); return r; };
  const _go = window.go;
  if (typeof _go === 'function') window.go = function (p) { FORCE = true; if (LIVE.gid && !/live$/.test(p)) { [LIVE.cam, LIVE.scr, LIVE.micS].forEach(s => s && s.getTracks().forEach(x => x.stop())); LIVE.cam = LIVE.scr = LIVE.micS = null; LIVE.gid = null; } if (WT.sid && !/watch$/.test(p)) { stopWT(); WT.sid = null; } return _go.apply(this, arguments); };
  /* the saved permission table can arrive from the server after start-up: put the new pages back if it dropped them */
  function regrant() {
    if (!registered) return; let changed = false;
    Object.keys(GRANT).forEach(r => { if (!ROLES[r] || !SCH.PERM[r]) return; GRANT[r].forEach(k => { const d = DEFS.find(x => x[0] === k); if (!SCH.PERM[r]['cx-' + k]) { SCH.PERM[r]['cx-' + k] = d[5]; changed = true; } }); if (changed) G(() => SCH.syncPages(r)); });
    if (!SCH.MODS.some(m => m[0] === 'cx-chat')) { DEFS.forEach(d => SCH.MODS.push(['cx-' + d[0], d[1], d[2], d[5], 'b'])); changed = true; Object.keys(ROLES).forEach(r => G(() => SCH.syncPages(r))); }
    Object.keys(GRANT).forEach(r => { const R = ROLES[r]; if (!R || !Array.isArray(R.pages)) return; const k = kindOf(r); GRANT[r].forEach(g => { const d = DEFS.find(x => x[0] === g); d[2].filter(p => (p.startsWith('tp-') ? 't' : p.startsWith('sp-') ? 's' : 'o') === k).forEach(p => { if (!R.pages.includes(p)) { R.pages.push(p); changed = true; } }); }); });
    if (changed) { const b = document.querySelector('#sidenav'); if ($('cx-root')) { /* keep the open screen; just redraw the menu next time */ } else G(() => render()); }
  }
  function tick() {
    register(); regrant(); applyTitle(); badge();
    const sk = document.querySelector('.skl'); if (sk) renameQit(sk);
  }
  const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.textContent && n.textContent.includes('QIT Admin')) renameQit(n); });
  const startObs = () => { mo.observe(document.body, { childList: true, subtree: true }); const v = $('view'); if (v) new MutationObserver(() => { applyTitle(); badge(); }).observe(v, { childList: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObs); else startObs();
  window.addEventListener('fta:started', () => { register(); G(() => render()); });
  setInterval(tick, 1500); setTimeout(tick, 300);
  /* internals for the zz3-connect layer (WhatsApp-style chat, Meet-style live class, connections) */
  Object.assign(X, { db: () => DB, load, save, post, LISTEN, OVR, HOOKS, HERE, ONLINE, online, me, kindOf, isMonitor, pname, prole, groups, myGroups, dmId, contacts, room, other, canSee, canWrite, myRooms, roomMsgs, lastRead, unread, markRead, totalUnread, roomTitle, seed, shell, force: () => { FORCE = true; }, demoNote, CH, MON, LIVE, WT, BLOBS, uid, h, tm, day, mmss, initials, badge, personRec, attendanceOf, stopWT, TAB });
  window.FTA_DEMO_CONNECT = { reset() { localStorage.removeItem(SK); load(); }, db: () => DB, me, unread: () => totalUnread(), X };
})();
