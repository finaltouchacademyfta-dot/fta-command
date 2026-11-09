/* =====================================================================
   FTA · PORTAL LAYER (live app)
   1 Portal title by role ("Owner Portal", "Mentor Portal" …) in the side menu, page eyebrow and tab title
   2 "QIT Admin" theme is named "QIT Theme"
   3 Profiles (office: cx-people) and My Profile (mentor tp-profile · student sp-profile), built on the
     Profile Tree (src/ui/profile-tree.js) with the full record (classes, attendance, payments, login) below it
   4 Default access for the new pages (window.FTA_MODS): used until the Owner saves the Permissions
     table, so nothing is written for other roles and nothing is refused by the server
   5 FTA Premium is a dark design: choosing it from Premium Light also switches to dark
   Messages, Live Class, Watch Together, Recordings and Chat Monitor are NOT part of this layer.
   Who may change what is checked again on the server (public/vendor/fta-policy.js).
   ===================================================================== */
(function () {
  'use strict';
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const say = t => G(() => toast(t));
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const FTA = window.FTA = window.FTA || {};

  /* ---------------------------------------------------------------- who am I */
  function me() {
    const m = FTA.member || {}, role = m.role || G(() => ST.role) || 'Owner';
    if (role === 'Mentor') { const x = G(() => MENTORS.find(y => y.id === m.mentor_id)) || {}; return { pid: m.mentor_id || G(() => ME().mentor), name: x.name || m.name || 'Mentor', role, email: m.email }; }
    if (role === 'Student') { const x = G(() => STUDENTS.find(y => y.id === m.student_id)) || {}; return { pid: m.student_id || G(() => ME().stu), name: x.name || m.name || 'Student', role, email: m.email }; }
    return { pid: 'U:office', name: m.name && m.name !== 'Owner' ? m.name : role, role, email: m.email, office: true };
  }
  const pname = pid => (G(() => MENTORS.find(x => x.id === pid)) || G(() => STUDENTS.find(x => x.id === pid)) || {}).name || pid;
  const groups = () => G(() => SCH.GROUPS.filter(g => g.status !== 'Inactive')) || [];

  /* ---------------------------------------------------------------- 4 · default access for new pages */
  /* defaults apply only where the Permissions table has no entry yet; the Owner's own choice always wins */
  const DEF = {};
  const MODS = window.FTA_MODS = {
    add(key, label, pages, acts, scope, def) { DEF[key] = def; if (G(() => !SCH.MODS.some(m => m[0] === key))) SCH.MODS.push([key, label, pages, acts, scope || 'b']); },
    effective(r) { const P0 = G(() => SCH.PERM[r]) || {}, out = Object.assign({}, P0); Object.keys(DEF).forEach(k => { if (out[k] == null) { const d = typeof DEF[k] === 'function' ? G(() => DEF[k](r, P0)) : DEF[k] && DEF[k][r]; if (d != null) out[k] = d; } }); return out; }
  };
  let wrapped = false;
  function wrapPerm() {
    if (wrapped || !G(() => SCH.can && SCH.syncPages && SCH.PERM)) return false;
    const _can = SCH.can, _sync = SCH.syncPages;
    SCH.can = function (mod, a) { if (G(() => ST.role) === 'Owner') return true; if (DEF[mod] !== undefined && (G(() => SCH.PERM[ST.role]) || {})[mod] == null) return (MODS.effective(ST.role)[mod] || '').includes(a); return _can.apply(this, arguments); };
    /* the page list is worked out from the table plus the defaults; the saved table itself is not changed */
    SCH.syncPages = function (r) { if (!Object.keys(DEF).length || !SCH.PERM) return _sync.apply(this, arguments); const real = SCH.PERM[r]; SCH.PERM[r] = MODS.effective(r); try { return _sync.apply(this, arguments); } finally { if (real === undefined) delete SCH.PERM[r]; else SCH.PERM[r] = real; } };
    wrapped = true; return true;
  }
  /* the Owner's Permissions table shows the new pages with their defaults (the Owner may save the table; nobody else) */
  function ownerFill() {
    if (G(() => FTA.member && FTA.member.role) !== 'Owner' && !(G(() => !FTA.member && ST.role === 'Owner'))) return false;
    let ch = false;
    Object.keys(G(() => ROLES) || {}).forEach(r => { const P0 = SCH.PERM[r] = SCH.PERM[r] || {}; Object.keys(DEF).forEach(k => { if (P0[k] == null) { const d = typeof DEF[k] === 'function' ? G(() => DEF[k](r, P0)) : DEF[k] && DEF[k][r]; if (d != null) { P0[k] = d; ch = true; } } }); });
    return ch;
  }
  MODS.refresh = function () { ownerFill(); Object.keys(G(() => ROLES) || {}).forEach(r => G(() => SCH.syncPages(r))); };

  /* ---------------------------------------------------------------- 1 · portal title by role */
  const portal = () => me().role + ' Portal';
  const PREFIX = /^(\s*)(FTA FINANCE|TEACHER PORTAL|STUDENT PORTAL|COMMAND CENTRE)(\s·)/i;
  function applyTitle() {
    const b = document.querySelector('#side .brand b'); if (b && b.textContent !== portal()) b.textContent = portal();
    const v = $('view'); if (v) { const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n, k = 0; while ((n = w.nextNode()) && k++ < 400) { if (PREFIX.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(PREFIX, (all, sp, x, dot) => sp + (x === x.toUpperCase() ? portal().toUpperCase() : portal()) + dot); } }
    const t = portal() + ' · Final Touch Academy'; if (document.title !== t) document.title = t;
  }
  /* ---------------------------------------------------------------- 2 · "QIT Admin" → "QIT Theme" */
  function renameQit(root) { const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes('QIT Admin')) n.nodeValue = n.nodeValue.replace(/QIT Admin/g, 'QIT Theme'); }

  /* ---------------------------------------------------------------- 3 · pages */
  const ICONS = {
    tree: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v10a2 2 0 0 0 2 2h8M6 12h10"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4M14 10h4M14 13h3"/>'
  };
  const DEFS = [
    ['people', 'Profiles', ['cx-people'], 'tree', 'Mentors, their students and classes in one tree', 'vae', { Owner: 'vae', Admin: 'vae', 'Junior Admin': 'vae' }],
    ['profile', 'My Profile', ['tp-profile', 'sp-profile'], 'idcard', 'Your details, classes and account', 'vae', { Mentor: 'vae', Student: 'vae' }]
  ];
  let registered = false, FORCE = true;
  function register() {
    if (registered || typeof NAV === 'undefined' || typeof PAGES === 'undefined' || !G(() => SCH.MODS) || !G(() => SCH.PERM)) return;
    wrapPerm();
    Object.entries(ICONS).forEach(([k, v]) => { if (typeof P === 'object' && P && !P[k]) P[k] = v; });
    const items = []; DEFS.forEach(d => d[2].forEach(p => { items.push([p, d[1], d[3]]); PAGE_ICON[p] = d[3]; if (!FLAT.some(f => f[0] === p)) FLAT.push([p, d[1], d[3]]); SUBS[p] = d[4]; }));
    /* office: a "Connect" group under Overview (Profiles, Class status, Messages); mentors and students: at the end of their own menu group */
    const put = (gname, list) => { const g = NAV.find(x => x[0] === gname); if (g) list.forEach(it => { if (!g[1].some(x => x[0] === it[0])) g[1].push(it); }); else if (gname === 'Connect') NAV.splice(1, 0, ['Connect', list]); };
    put('Connect', items.filter(i => i[0].startsWith('cx-'))); put('My teaching', items.filter(i => i[0].startsWith('tp-'))); put('My school', items.filter(i => i[0].startsWith('sp-')));
    DEFS.forEach(d => MODS.add('cx-' + d[0], d[1], d[2], d[5], 'b', d[6]));
    MODS.refresh();
    const R = { people: pagePeople, profile: pageProfile };
    DEFS.forEach(d => d[2].forEach(p => { PAGES[p] = () => R[d[0]](p); }));
    registered = true;
    if (G(() => ST.page) && $('sidenav') && !$('cx-root')) G(() => render());
  }
  /* keep an open page (a half-typed field) when the app redraws for other reasons */
  function shell(key, html, keep) {
    const root = $('cx-root');
    if (keep && !FORCE && root && root.dataset.cxk === key) return false;
    FORCE = false;
    SCH.page('', '', '<div id="cx-root" data-cxk="' + key + '">' + html + '</div>');
    const ey = document.querySelector('#view .bn-eye'), f = FLAT.find(x => x[0] === key); if (ey && f) ey.textContent = portal().toUpperCase() + ' · ' + f[1].toUpperCase();
    applyTitle();
    return true;
  }

  /* ---------------------------------------------------------------- the full record under the tree */
  const PF = { sel: null, node: 'overview', edit: false };
  const MEN_FIELDS = { personal: [['name', 'Full name', 'office'], ['dob', 'Date of birth', 'office', 'date'], ['address', 'Address', 'self'], ['bio', 'About me', 'self', 'area']], contact: [['phone', 'Phone / WhatsApp', 'self'], ['gmail', 'Google sign-in (Gmail)', 'office'], ['emergency', 'Emergency contact', 'office']], teaching: [['subjects', 'Subjects', 'office'], ['qual', 'Qualifications', 'self', 'area'], ['exp', 'Teaching experience', 'office'], ['join', 'Joined FTA', 'none']], money: [['model', 'Pay model', 'none'], ['rate', 'Rate', 'none'], ['pay', 'Salary account (bKash / bank)', 'self']] };
  const STU_FIELDS = { personal: [['name', 'Full name', 'office'], ['dob', 'Date of birth', 'office', 'date'], ['address', 'Address', 'self'], ['bio', 'About me', 'self', 'area']], contact: [['phone', 'Phone', 'office'], ['guardian', 'Guardian', 'office'], ['gphone', 'Guardian phone', 'office'], ['gmail', 'Google sign-in (Gmail)', 'office']], teaching: [['cls', 'Class / level', 'office'], ['board', 'Board', 'office'], ['school', 'School', 'office'], ['joined', 'Joined FTA', 'none']] };
  const NODES = [['overview', 'Overview'], ['personal', 'Personal info'], ['contact', 'Contact'], ['teaching', 'Teaching'], ['classes', 'Classes & students'], ['attendance', 'Attendance'], ['money', 'Payments'], ['account', 'Login & security']];
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
    const r = personRec(pid); if (!r) return '<div class="card cx-empty">' + (mode === 'self' ? 'Your profile is not linked yet. Ask the office to link your Gmail to your record.' : 'Choose a person on the left.') + '</div>';
    const isM = /^MEN-/.test(pid), F = isM ? MEN_FIELDS : STU_FIELDS;
    const node = NODES.some(n => n[0] === PF.node) ? PF.node : 'overview';
    const canEdit = f => f[2] === 'self' || (mode === 'office' && f[2] === 'office');
    const field = f => { const v = r[f[0]]; const ed = PF.edit && canEdit(f); return '<div class="cx-f"><label for="pf-' + f[0] + '">' + h(f[1]) + (f[2] === 'office' && mode === 'self' ? ' <small>office changes this</small>' : f[2] === 'none' ? ' <small>from records</small>' : '') + '</label>' + (ed ? (f[3] === 'area' ? '<textarea id="pf-' + f[0] + '" rows="3">' + h(v) + '</textarea>' : '<input id="pf-' + f[0] + '" type="' + (f[3] === 'date' ? 'date' : 'text') + '" value="' + h(v) + '">') : '<div class="cx-v">' + (v ? h(f[0] === 'rate' && r.model === 'pct_fee' ? v + '% of fees' : v) : '<i>—</i>') + '</div>') + '</div>'; };
    const editBar = list => list.some(canEdit) ? '<div class="cx-pacts">' + (PF.edit ? '<button class="btn" type="button" data-pf="cancel">Cancel</button><button class="btn p" type="button" data-pf="save">Save changes</button>' : '<button class="btn" type="button" data-pf="edit">' + (G(() => ic('desc')) || '') + 'Edit</button>') + '</div>' : '';
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
      body = gs.length ? gs.map(g => '<details class="cx-tg" open><summary><b>' + h(g.name) + '</b><span>' + (isM ? (g.stu || []).length + ' students' : 'Mentor: ' + h(pname(g.mentor))) + '</span></summary>' + (isM ? '<ul>' + (g.stu || []).map(s => '<li>' + (mode === 'office' ? '<button type="button" class="cx-link" data-person="' + h(s) + '">' + h(pname(s)) + '</button>' : '<span>' + h(pname(s)) + '</span>') + '<span>' + h((personRec(s) || {}).cls || '') + '</span></li>').join('') + '</ul>' : '') + '</details>').join('') : '<p class="cx-muted">No classes yet.</p>';
    } else if (node === 'attendance') {
      body = (isM ? '<p>' + at.held + ' classes marked in total.</p>' : '<div class="cx-kpis"><div><b>' + at.P + '</b><span>present</span></div><div><b>' + at.L + '</b><span>late</span></div><div><b>' + at.A + '</b><span>absent</span></div></div>') + '<table class="cx-tbl"><thead><tr><th>Date</th><th>Class</th><th>' + (isM ? 'Marked' : 'Status') + '</th></tr></thead><tbody>' + (at.recent.map(x => '<tr><td>' + h(x[0]) + '</td><td>' + h(x[1]) + '</td><td>' + h(x[2]) + '</td></tr>').join('') || '<tr><td colspan="3" class="cx-muted">Nothing yet</td></tr>') + '</tbody></table>';
    } else if (node === 'money') {
      if (isM) body = MEN_FIELDS.money.map(field).join('') + editBar(MEN_FIELDS.money);
      else { const pays = (G(() => PAYMENTS.filter(p => p.stu === pid)) || []).slice(-5).reverse(); body = '<div class="cx-kpis"><div><b>' + h(G(() => money(studentDue(pid))) || '—') + '</b><span>due now</span></div><div><b>' + pays.length + '</b><span>recent payments</span></div></div><table class="cx-tbl"><thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>' + (pays.map(p => '<tr><td>' + h(p.date) + '</td><td>' + h(G(() => money(p.amt))) + '</td><td>' + h(p.status) + '</td></tr>').join('') || '<tr><td colspan="3" class="cx-muted">No payments yet</td></tr>') + '</tbody></table>'; }
    } else if (node === 'account') {
      body = '<div class="cx-f"><label>Signs in with</label><div class="cx-v">' + h(r.gmail || (mode === 'self' ? me().email : '') || '— no Gmail saved —') + '</div></div><div class="cx-f"><label>Status</label><div class="cx-v">' + h(r.status || '') + '</div></div><p class="cx-muted">Google checks the password. ' + (mode === 'self' ? 'If this Gmail is wrong, ask the office to change it.' : 'Change the Gmail from the ' + (isM ? 'Mentors' : 'Students') + ' page.') + '</p>';
    }
    const photo = r.photo ? '<img src="' + h(G(() => FTA.fileUrl ? FTA.fileUrl(r.photo) : r.photo) || r.photo) + '" alt="">' : '<span>' + h(initials(r.name)) + '</span>';
    return '<div class="cx-prof card"><div class="cx-ph"><div class="cx-av">' + photo + '<label class="cx-avb" title="Change photo">' + (G(() => ic('plus')) || '+') + '<input type="file" accept="image/*" id="pf-photo" hidden></label></div><div class="cx-pn"><h2>' + h(r.name) + '</h2><p>' + (isM ? 'Mentor · ' + h(r.subjects || '') : 'Student · ' + h(r.cls || '')) + ' · <span class="cx-st ' + (r.status === 'Active' ? 'ok' : '') + '">' + h(r.status || '') + '</span></p></div></div>' +
      '<div class="cx-pt"><nav class="cx-tree" aria-label="Profile sections">' + NODES.map(n => '<button type="button" class="' + (n[0] === node ? 'on' : '') + '" data-node="' + n[0] + '"><i></i>' + h(n[1]) + '</button>').join('') + '</nav><section class="cx-pb">' + body + '</section></div></div>';
  }
  /* who may change a field: the person their own 'self' fields; the office (not Viewer) everything marked office/self */
  const officeCanEdit = () => { const r = G(() => ST.role); return ['Owner', 'Admin', 'Junior Admin'].indexOf(r) > -1; };
  function bindProfile(root, pid, mode, redraw) {
    root.onclick = e => {
      const b = e.target.closest('[data-node],[data-pf],[data-person]'); if (!b) return;
      if (b.dataset.node) { PF.node = b.dataset.node; PF.edit = false; redraw(); }
      else if (b.dataset.pf === 'edit') { if (mode === 'office' && !officeCanEdit()) { say('You can only view profiles'); return; } PF.edit = true; redraw(); }
      else if (b.dataset.pf === 'cancel') { PF.edit = false; redraw(); }
      else if (b.dataset.pf === 'save') {
        if (b.disabled) return; b.disabled = true;
        const r = personRec(pid), F = /^MEN-/.test(pid) ? MEN_FIELDS : STU_FIELDS, list = F[PF.node] || [], changed = [];
        list.forEach(f => { if (!(f[2] === 'self' || (mode === 'office' && f[2] === 'office'))) return; const el = $('pf-' + f[0]); if (!el) return; const v = el.value.trim(); if ((r[f[0]] || '') !== v) { r[f[0]] = v; changed.push(f[1]); } });
        PF.edit = false;
        if (changed.length) { G(() => log('Profile updated', r.id + ' · ' + r.name, changed.join(', ') + (mode === 'self' ? ' (by themselves)' : ''))); say('Saved: ' + changed.join(', ')); G(() => FTA.sync && FTA.sync()); } else say('Nothing changed');
        redraw();
      } else if (b.dataset.person && mode === 'office') { PF.sel = b.dataset.person; PF.node = 'overview'; redraw(true); }
    };
    const ph = $('pf-photo'); if (ph) ph.onchange = () => {
      const f = ph.files[0]; if (!f) return;
      if (mode === 'office' && !officeCanEdit()) { say('You can only view profiles'); return; }
      if (!/^image\//.test(f.type)) { say('Choose an image file'); return; }
      const img = new Image(), rd = new FileReader();
      rd.onload = () => { img.onload = () => { const c = document.createElement('canvas'), s = 200, k = Math.max(s / img.width, s / img.height); c.width = c.height = s; c.getContext('2d').drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k); const r = personRec(pid); if (!r) return; r.photo = c.toDataURL('image/jpeg', .84); G(() => log('Profile photo changed', pid, mode === 'self' ? 'by themselves' : '')); say('Photo saved'); G(() => FTA.sync && FTA.sync()); redraw(); }; img.onerror = () => say('Could not read that image'); img.src = rd.result; };
      rd.readAsDataURL(f);
    };
  }
  const TREE = () => window.FTA_TREE;
  let PTI = null;
  function pageProfile(p) {
    const m = me(); PF.sel = m.pid;
    if (!shell(p, '<div id="pt-host" class="pt-host"></div><h3 class="pt-rec-h">Full record</h3><div id="cx-prof-wrap"></div>', true)) return;
    if (!m.pid || !personRec(m.pid)) { $('pt-host').innerHTML = ''; $('cx-prof-wrap').innerHTML = profileView(m.pid, 'self'); return; }
    const drawRec = () => { const w = $('cx-prof-wrap'); if (!w) return; w.innerHTML = profileView(m.pid, 'self'); bindProfile(w, m.pid, 'self', () => { drawRec(); PTI && PTI.refresh(); }); };
    PTI = TREE() && $('pt-host') ? TREE().mount($('pt-host'), m.pid, { mode: 'self', full: true, onSave: drawRec }) : null;
    drawRec();
  }
  function pagePeople(p) {
    const M = G(() => MENTORS.filter(x => x.status === 'Active')) || [], S = G(() => STUDENTS) || [];
    const mentorOf = sid => { const e = G(() => ENROL.filter(x => x.stu === sid && x.mentor)) || []; return [...new Set(e.map(x => x.mentor))]; };
    const noMentor = S.filter(s => s.status === 'Active' && !mentorOf(s.id).length);
    const highDue = S.filter(s => (G(() => studentDue(s.id)) || 0) > 10000);
    if (!PF.sel || !personRec(PF.sel)) PF.sel = (M[0] || S[0] || {}).id;
    if (!shell(p, '<div class="cx-people"><aside class="card cx-ptree"><input id="cx-ps" type="search" placeholder="Search a name…" aria-label="Search people"><div id="cx-ptl"></div></aside><div class="cx-pmain"><div id="pt-host" class="pt-host"></div><h3 class="pt-rec-h">Full record</h3><div id="cx-prof-wrap"></div></div></div>', true)) return;
    const tree = q => {
      q = (q || '').toLowerCase(); const hit = n => !q || String(n).toLowerCase().includes(q);
      const item = (pid, sub) => '<button type="button" class="cx-ti ' + (PF.sel === pid ? 'on' : '') + '" data-person="' + h(pid) + '"><span class="cx-dot"></span>' + h(pname(pid)) + (sub ? '<small>' + h(sub) + '</small>' : '') + '</button>';
      let html = '<details open><summary>Mentors <em>' + M.length + '</em></summary>' + M.map(x => { const st = [...new Set(groups().filter(g => g.mentor === x.id).flatMap(g => g.stu || []))]; if (!hit(x.name) && !st.some(s => hit(pname(s)))) return ''; return '<details class="cx-sub"' + (q || PF.sel === x.id || st.includes(PF.sel) ? ' open' : '') + '><summary>' + item(x.id, st.length + ' students') + '</summary>' + st.filter(s => hit(pname(s)) || hit(x.name)).map(s => item(s, (personRec(s) || {}).cls)).join('') + '</details>'; }).join('') + '</details>';
      const cls = {}; S.forEach(s => { (cls[s.cls || 'Other'] = cls[s.cls || 'Other'] || []).push(s); });
      html += '<details' + (q ? ' open' : '') + '><summary>Students by class <em>' + S.length + '</em></summary>' + Object.keys(cls).sort().map(c => { const L = cls[c].filter(s => hit(s.name)); return L.length ? '<details class="cx-sub"' + (q ? ' open' : '') + '><summary><span class="cx-tc">' + h(c) + '</span><small>' + L.length + '</small></summary>' + L.map(s => item(s.id, mentorOf(s.id).map(pname).join(', ') || 'no mentor')).join('') + '</details>' : ''; }).join('') + '</details>';
      html += '<details open><summary>Needs attention <em>' + (noMentor.length + highDue.length) + '</em></summary>' + noMentor.filter(s => hit(s.name)).map(s => item(s.id, 'no mentor yet')).join('') + highDue.filter(s => hit(s.name)).map(s => item(s.id, 'due ' + G(() => money(studentDue(s.id))))).join('') + '</details>';
      if (!M.length && !S.length) html = '<p class="cx-muted">No mentors or students yet. Add them from the Mentors and Students pages.</p>';
      $('cx-ptl').innerHTML = html;
    };
    let shownSel = null;
    const drawRec = () => { const w = $('cx-prof-wrap'); if (!w) return; if (!PF.sel) { w.innerHTML = ''; return; } w.innerHTML = profileView(PF.sel, 'office'); bindProfile(w, PF.sel, 'office', moved => { if (moved || PF.sel !== shownSel) draw(); else { drawRec(); PTI && PTI.refresh(); } }); };
    const draw = () => { tree($('cx-ps') && $('cx-ps').value); shownSel = PF.sel; PTI = TREE() && $('pt-host') && PF.sel ? TREE().mount($('pt-host'), PF.sel, { mode: officeCanEdit() ? 'office' : 'view', full: true, onSave: drawRec }) : null; drawRec(); };
    $('cx-ptl').onclick = e => { const b = e.target.closest('[data-person]'); if (!b) return; e.preventDefault(); PF.sel = b.dataset.person; PF.node = 'overview'; PF.edit = false; draw(); };
    $('cx-ps').oninput = () => tree($('cx-ps').value);
    draw();
  }

  /* ---------------------------------------------------------------- 5 · FTA Premium (dark) after Premium Light */
  const _skin = window.setSkin;
  if (typeof _skin === 'function') window.setSkin = function (k) { const r = _skin.apply(this, arguments); if (k === 'premium' && document.documentElement.dataset.theme === 'light') G(() => setTheme('dark')); return r; };
  const _go = window.go;
  if (typeof _go === 'function') window.go = function () { FORCE = true; return _go.apply(this, arguments); };

  /* ---------------------------------------------------------------- start */
  /* the saved permission table can arrive from the server after start-up: work the page lists out again */
  let lastPerm = '';
  function tick() {
    register();
    if (registered) { const k = G(() => JSON.stringify(SCH.PERM)) || ''; if (k !== lastPerm) { lastPerm = k; MODS.refresh(); lastPerm = G(() => JSON.stringify(SCH.PERM)) || ''; } }
    applyTitle();
    const sk = document.querySelector('.skl'); if (sk) renameQit(sk);
  }
  const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.textContent && n.textContent.includes('QIT Admin')) renameQit(n); });
  const startObs = () => { mo.observe(document.body, { childList: true, subtree: true }); const v = $('view'); if (v) new MutationObserver(() => applyTitle()).observe(v, { childList: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObs); else startObs();
  window.addEventListener('fta:started', () => { FORCE = true; register(); MODS.refresh(); G(() => render()); });
  setInterval(tick, 1500); setTimeout(tick, 300);
  window.FTA_PORTAL = { me, pname, personRec, attendanceOf, profileView, refresh: () => { FORCE = true; G(() => render()); } };
})();
