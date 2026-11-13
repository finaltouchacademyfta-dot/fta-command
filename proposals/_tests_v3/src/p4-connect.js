
  /* ================================================================ RECORDINGS (connected to sessions, chat and profiles) */
  const RC = { play: null };
  function openRec(id) { RC.play = id; X.force(); go(pref() + 'rec'); }
  function pageRecZ(p) {
    X.seed(); const m = me(), gs = X.myGroups().map(g => g.id), d = D();
    const L = d.recs.filter(r => X.kindOf(m.role) === 'o' || gs.includes(r.gid) || (r.rk && roomOf(r.rk) && roomOf(r.rk).members.includes(m.pid)));
    const sessOf = r => d.liveLog.find(s => (r.sid && s.sid === r.sid) || (s.recId === r.id));
    X.shell(p, X.demoNote('<b>Recordings.</b> Every recorded live class lands here, in the class chat and on each student’s profile. Only that class’s students, its mentor and the office can see it. Recordings made in this demo play until the tab that made them is closed; on the live site they are kept in Supabase Storage.') +
      '<div class="zr-list" data-notx>' + (L.map(r => { const s = sessOf(r), g = grp(r.gid), playable = !!X.BLOBS[r.id]; return '<article class="zr-card' + (RC.play === r.id ? ' on' : '') + '" id="zr-' + h(r.id) + '"><button type="button" class="zr-th" data-rp="' + h(r.id) + '" aria-label="Play ' + h(r.title) + '">' + I('play') + '<span>' + mmss(r.dur) + '</span></button><div class="zr-b"><b>' + h(r.title) + '</b><small>' + h(g ? g.name : r.rk && r.rk.startsWith('dm:') ? '1-on-1 call' : '') + ' · ' + h(dayLabel(r.at)) + ' ' + tm(r.at) + ' · by ' + h(pname(r.by)) + '</small>' + (s ? '<small>' + I('users') + s.present.length + ' of ' + (s.present.length + s.absent.length) + ' attended' + (X.kindOf(m.role) === 's' ? (s.present.includes(m.pid) ? ' · you were there' : s.absent.includes(m.pid) ? ' · you missed it — watch it here' : '') : (s.absent.length ? ' · missed: ' + h(s.absent.map(x => first(pname(x))).join(', ')) : '')) + '</small>' : '') +
        '<div class="zr-a">' + (playable ? '<button type="button" class="zl-btn s p" data-rp="' + h(r.id) + '">' + I('play') + 'Play</button>' : '<span class="zc-muted">Plays on the live site</span>') + (g ? '<button type="button" class="zl-btn s" data-rc="g:' + h(g.id) + '">' + I('chat') + 'Discuss in class chat</button>' : '') + (s && g && X.kindOf(m.role) !== 's' ? '<button type="button" class="zl-btn s" data-ra="' + h(g.id) + '" data-rd="' + h(new Date(s.start).toISOString().slice(0, 10)) + '">' + I('check') + 'Attendance</button>' : '') + '</div></div></article>'; }).join('') || '<div class="card zc-empty">No recordings yet. Start a Live Class and choose ⋯ → Record meeting.</div>') + '</div><div id="zr-player"></div>');
    const play = id => { const u = X.BLOBS[id]; const P = $('zr-player'); if (!u) { say('This recording plays on the live site'); return; } P.innerHTML = '<div class="zr-pl card"><video controls autoplay src="' + u + '"></video></div>'; P.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    $('cx-root').onclick = e => { const a = e.target.closest('[data-rp]'), c = e.target.closest('[data-rc]'), t = e.target.closest('[data-ra]'); if (a) play(a.dataset.rp); else if (c) openChat(c.dataset.rc); else if (t) { G(() => { SCH.TS.gid = t.dataset.ra; SCH.TS.date = t.dataset.rd; }); goFirst(X.kindOf(m.role) === 't' ? ['tp-att'] : ['ac-att', 'attendance', 'ac-attendance']); } };
    if (RC.play) { const id = RC.play; RC.play = null; setTimeout(() => { const el = $('zr-' + id); if (el) el.scrollIntoView({ block: 'center' }); if (X.BLOBS[id]) play(id); }, 60); }
  }
  X.OVR.rec = pageRecZ;

  /* ================================================================ WATCH TOGETHER ↔ CHAT */
  function openWatch(sid, t) { X.WT.sid = sid; X.force(); go(pref() + 'watch'); if (t != null) setTimeout(() => G(() => X.WT.apply && X.WT.apply('pause', t)), 1500); }
  function wtSync() {
    const d = D(); let ch = false;
    d.wt.forEach(s => {
      if (s.card) return;
      const old = d.msgs.find(x => x.room === s.room && /Started Watch Together/.test(x.text || '') && Math.abs(x.at - s.at) < 5000 && !x.kind);
      if (old) { old.kind = 'card'; old.text = ''; old.card = { type: 'wt', sid: s.id, title: s.title, by: s.host }; s.card = old.id; ch = true; const r = roomOf(s.room); if (r) notify(r.members.filter(p => p !== s.host), { kind: 'wt', icon: 'tv', t: pname(s.host) + ' started Watch Together', d: s.title, act: { wt: s.id }, btn: 'Join' }); }
      else if (s.id === 'W1' && !s.card) { s.card = 'seed'; ch = true; }
    });
    d.wtn.forEach(n => {
      const s = d.wt.find(z => z.id === n.sid); if (!s) return;
      if (!n.chat && n.id && now() - n.at < 3600000 * 24 * 30 && !(s.id === 'W1' && n.at < now() - 3600000 * 2)) { const mm = addMsg(s.room, n.by, { kind: 'card', card: { type: 'wtq', sid: s.id, nid: n.id, t: n.t, text: n.text, title: s.title } }); n.chat = mm.id; n.chatR = (n.replies || []).length; ch = true; }
      if (n.chat && (n.replies || []).length > (n.chatR || 0)) { (n.replies || []).slice(n.chatR || 0).forEach(rp => { if (!rp.viaChat) addMsg(s.room, rp.by, { text: rp.text, reply: n.chat, wtr: n.id }); }); n.chatR = n.replies.length; ch = true; }
    });
    if (ch) X.save();
  }

  /* ================================================================ APP DATA → CHAT (homework, notices, exams, marks, payments) */
  const KNOWN = new Set(); let based = false, startedAt = 0;
  function appKeys() {
    const K = [];
    G(() => SCH.HW.forEach(x => K.push(['hw:' + x.id, x])));
    G(() => V8.NOTICES.forEach(n => { if (n.status === 'Published') K.push(['nt:' + n.id, n]); }));
    G(() => SCH.EXAMS.forEach(e => K.push(['ex:' + e.id, e])));
    G(() => Object.keys(SCH.MARKS).forEach(k => { const v = SCH.MARKS[k]; if (v && v.status === 'Published') K.push(['mk:' + k, v, k]); }));
    G(() => PAYMENTS.forEach(p => { if (p.status === 'Verified') K.push(['pay:' + p.id, p]); }));
    G(() => SCH.CNOTES.forEach(n => { if (n.sent) K.push(['cn:' + n.id, n]); }));
    return K;
  }
  const H = {
    hw(x) { const g = grp(x.gid); if (!g) return; const by = x.by && /^MEN-/.test(x.by) ? x.by : (X.kindOf(me().role) === 't' ? me().pid : 'U:office'); const card = { type: 'hw', id: x.id, title: x.title, details: x.details, due: x.due, set: x.set }; if (Array.isArray(x.stu) && x.stu.length) { card.for = x.stu.map(s2 => first(pname(s2))).join(', '); x.stu.forEach(s2 => addMsg(X.dmId(by === 'U:office' ? g.mentor : by, s2), by === 'U:office' ? g.mentor : by, { kind: 'card', card })); notify(x.stu, { kind: 'hw', icon: 'book', t: 'New homework for you · ' + g.name, d: x.title, act: { room: X.dmId(g.mentor, x.stu[0]) }, btn: 'Open' }); return X.dmId(g.mentor, x.stu[0]); } addMsg('g:' + g.id, by, { kind: 'card', card }); notify((g.stu || []), { kind: 'hw', icon: 'book', t: 'New homework · ' + g.name, d: x.title + ' · due ' + (G(() => SCH.fmtD(x.due)) || x.due), act: { room: 'g:' + g.id }, btn: 'Open' }); return 'g:' + g.id; },
    nt(n) { const reach = new Set(G(() => V8.cMembersOf(n)) || []); const gs = X.groups().filter(g => (g.stu || []).some(s => reach.has('stu:' + s)) || reach.has('men:' + g.mentor)); gs.forEach(g => addMsg('g:' + g.id, 'U:office', { kind: 'card', card: { type: 'notice', id: n.id, title: n.title, body: n.body } })); return gs[0] ? 'g:' + gs[0].id : null; },
    ex(e) { X.groups().forEach(g => addMsg('g:' + g.id, 'U:office', { kind: 'card', card: { type: 'exam', id: e.id, title: e.name + (e.term ? ' · ' + e.term : ''), from: G(() => SCH.fmtD(e.from)) || e.from, to: G(() => SCH.fmtD(e.to)) || e.to, max: e.max } })); return null; },
    mk(v, key) { const [exId, gid] = key.split('|'), g = grp(gid), ex = G(() => SCH.EXAMS.find(e => e.id === exId)) || { name: exId, max: 100 }; if (!g) return; (g.stu || []).forEach(s => { const mk = v.m && v.m[s]; if (mk == null || mk === '') return; addMsg(X.dmId(g.mentor, s), g.mentor, { kind: 'card', card: { type: 'marks', exam: ex.name, sub: g.name, mark: mk, max: ex.max } }); notify([s], { kind: 'marks', icon: 'award', t: 'Your result is out', d: ex.name + ' · ' + g.name + ': ' + mk + '/' + ex.max, act: { room: X.dmId(g.mentor, s) }, btn: 'Open' }); }); return null; },
    cn(n) { const g = grp(n.gid); if (!g) return; const by = (G(() => MENTORS.find(x => x.name === n.by)) || {}).id || g.mentor; const card = { type: 'cnote', topic: n.topic, progress: n.progress, hw: n.hw, next: n.next, comment: n.comment, date: G(() => SCH.fmtD(n.date)) || n.date }; if (n.stu === '*') { addMsg('g:' + g.id, by, { kind: 'card', card }); return 'g:' + g.id; } addMsg(X.dmId(by, n.stu), by, { kind: 'card', card }); notify([n.stu], { kind: 'hw', icon: 'doc', t: 'Class note from ' + first(pname(by)), d: (n.topic || '') + ' · ' + g.name, act: { room: X.dmId(by, n.stu) }, btn: 'Open' }); return X.dmId(by, n.stu); },
    pay(p) { if (!p.stu) return; const rid = X.dmId('U:office', p.stu), due = G(() => studentDue(p.stu)); addMsg(rid, 'U:office', { kind: 'card', card: { type: 'pay', id: p.id, amt: p.amt, rcpt: p.rcpt, date: G(() => fdate(p.date)) || p.date, method: p.method, due } }); notify([p.stu], { kind: 'pay', icon: 'wallet', t: 'Payment received', d: money(p.amt) + (p.rcpt ? ' · receipt ' + p.rcpt : '') + ' · thank you', act: { room: rid }, btn: 'Open' }); return rid; }
  };
  function watchApp() {
    if (!startedAt || now() - startedAt < 2500 || !G(() => SCH.GROUPS)) return;
    const K = appKeys();
    if (!based) { K.forEach(k => KNOWN.add(k[0])); based = true; return; }
    const d = D(); let changed = false, lastRoom = null;
    K.forEach(([key, x, extra]) => { if (KNOWN.has(key)) return; KNOWN.add(key); if (d.posted[key]) return; d.posted[key] = now(); changed = true; const r = G(() => H[key.split(':')[0]](x, extra)); if (r) lastRoom = r; });
    if (changed) { X.save(); if (lastRoom) X.post({ t: 'msg', room: lastRoom, id: (X.roomMsgs(lastRoom).slice(-1)[0] || {}).id }); onData(); }
  }
  /* attendance saved by a live class in another tab → this tab's Attendance pages */
  function applyAtt() {
    const m = me(); if (X.kindOf(m.role) === 's' && !G(() => FTA.demo)) return;
    Object.entries(D().att).forEach(([k, v]) => { const gid = k.split('|')[0]; if (!grp(gid)) return; const cur = G(() => SCH.ATT[k]); if (!cur || (cur.live && cur.at !== v.at) || (!cur.live && v.live && JSON.stringify(cur.marks) !== JSON.stringify(v.marks) && cur.at < v.at)) G(() => { SCH.ATT[k] = JSON.parse(JSON.stringify(v)); }); });
  }

  /* ================================================================ BELL, SIDEBAR BADGE, DASHBOARD "JOIN LIVE" */
  function bellItems() {
    const m = me(), out = []; if (!m.pid) return out;
    G(() => X.myGroups().forEach(g => { if (liveOn(g.id) && !(LV.phase === 'call' && LV.rk === g.id)) { const L = D().live[g.id]; out.push({ k: 'ok', i: 'video', t: 'Live now · ' + g.name, d: (L.title || '') + ' · started ' + tm(L.at) + ' by ' + first(pname(L.by)), go: "FTA_ZC.joinLive('" + g.id + "')" }); } }));
    G(() => Object.keys(D().live).filter(k => k.startsWith('dm:') && liveOn(k) && roomOf(k) && roomOf(k).members.includes(m.office ? 'U:office' : m.pid) && D().live[k].by !== m.pid && LV.rk !== k).forEach(k => out.push({ k: 'ok', i: 'video', t: pname(D().live[k].by) + ' is calling', d: '1-on-1 video call · tap to join', go: "FTA_ZC.joinLive('" + k + "')" })));
    const ment = myUnreadMentions(); if (ment.length) out.push({ k: 'warn', i: 'chat', t: '@ ' + ment.length + ' mention' + (ment.length > 1 ? 's' : ''), d: ment.slice(0, 2).map(n => n.t).join(' · '), go: "FTA_ZC.note('" + ment[0].id + "')" });
    const rooms = X.myRooms().filter(r => X.unread(r.id, m.pid)); const n = rooms.reduce((t, r) => t + X.unread(r.id, m.pid), 0);
    if (n) out.push({ k: 'info', i: 'chat', t: n + ' unread message' + (n > 1 ? 's' : ''), d: rooms.slice(0, 3).map(r => X.roomTitle(r, m.pid) + ' (' + X.unread(r.id, m.pid) + ')').join(' · '), go: "FTA_ZC.openChat('" + rooms[0].id + "')" });
    myNotes().filter(x => x.kind !== 'mention' && x.kind !== 'live' && !x.read.includes(m.pid)).slice(0, 6).forEach(x => out.push({ k: x.kind === 'missed' ? 'warn' : x.kind === 'pay' || x.kind === 'rec' ? 'ok' : 'info', i: x.kind === 'pay' ? 'payments' : x.kind === 'hw' ? 'book' : x.kind === 'rec' ? 'video' : x.kind === 'marks' ? 'award' : 'chat', t: x.t, d: x.d + ' · ' + shortDay(x.at), go: "FTA_ZC.note('" + x.id + "')" }));
    myNotes().filter(x => x.kind === 'live' && !x.read.includes(m.pid) && x.act && !liveOn(x.act.live)).forEach(x => { x.read.push(m.pid); });
    return out;
  }
  function hookBell() {
    if (typeof window.notifs !== 'function' || window.notifs.__zc) return;
    const base = window.notifs; const f = function () { let N = []; try { N = base.apply(this, arguments) || []; } catch (e) { } let Z = []; try { Z = bellItems(); } catch (e) { } return Z.concat(N); }; f.__zc = 1;
    try { window.notifs = f; } catch (e) { } try { notifs = f; } catch (e) { } /* eslint-disable-line */
  }
  function sideBadge() {
    const at = myUnreadMentions().length;
    qa('#sidenav .cx-nb').forEach(c => { c.classList.toggle('zc-atn', !!at); c.title = at ? at + ' mention' + (at > 1 ? 's' : '') : 'Unread messages'; });
    G(() => V8.bell());
  }
  /* "Join live" on today's classes (My Day, dashboards, routine) and a Live-now strip on home pages */
  function decorate() {
    const v = $('view'); if (!v || $('zl-room')) return; const m = me(), mine = X.myGroups(), host = X.kindOf(m.role) !== 's';
    qa('.zc-dlive').forEach(x => { const g = grp(x.dataset.g); if (!g || !liveOn(g.id) !== !x.classList.contains('on') ) x.remove(); });
    qa('#view .sc-li, #view .rt-item, #view .sc-row').forEach(row => {
      if (row.closest('#cx-root')) return; const b = row.querySelector('b'); if (!b) return; const g = mine.find(x => x.name === b.textContent.trim()); if (!g) return;
      const on = liveOn(g.id); if (row.querySelector('.zc-dlive')) return; if (!on && !host) return;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn s zc-dlive' + (on ? ' on' : ''); btn.dataset.g = g.id; btn.innerHTML = on ? '<span class="zc-livedot"></span>Join live' : I('video') + 'Go live'; btn.onclick = e => { e.stopPropagation(); joinLive(g.id); };
      const last = row.lastElementChild; if (last && last.tagName === 'BUTTON') last.before(btn); else row.appendChild(btn);
    });
    const home = /(-home|^dashboard|^home|^ac-overview)$/.test(G(() => ST.page) || '');
    const live = mine.filter(g => liveOn(g.id));
    const strip = $('zc-livestrip');
    if (home && live.length) {
      const html = live.map(g => { const L = D().live[g.id]; return '<div class="zc-ls1"><span class="zc-livedot"></span><div><b>Live now · ' + h(g.name) + '</b><small>' + h(L.title || '') + ' · ' + h(pname(L.by)) + ' · started ' + tm(L.at) + ' · ' + liveCount(g.id) + ' in the call</small></div><button type="button" class="zl-btn p s" data-zj="' + g.id + '">' + I('video') + 'Join live</button></div>'; }).join('');
      if (strip) { if (strip.dataset.h !== html) { strip.innerHTML = html; strip.dataset.h = html; } }
      else { const page = q1('#view .page') || v; const s = document.createElement('div'); s.id = 'zc-livestrip'; s.className = 'zc-livestrip'; s.setAttribute('data-notx', ''); s.innerHTML = html; s.dataset.h = html; s.onclick = e => { const b = e.target.closest('[data-zj]'); if (b) joinLive(b.dataset.zj); }; const banner = page.querySelector('.bn, .v2-bn, .page-banner, header'); if (banner && banner.parentNode === page) banner.after(s); else page.prepend(s); }
    } else if (strip) strip.remove();
  }

  /* ================================================================ PROFILES: message · call · watch together */
  function canReach(pid) { const m = me(); if (m.office) return true; return X.contacts().includes(pid); }
  function connectBar(pid) {
    if (!pid || !canReach(pid) || pid === me().pid) return '';
    return '<div class="zc-pact" data-notx><span>Connect with ' + h(first(pname(pid))) + '</span><button type="button" class="zl-btn s" data-zc="dm" data-pid="' + h(pid) + '">' + I('chat') + 'Message</button><button type="button" class="zl-btn s" data-zc="call" data-pid="' + h(pid) + '">' + I('video') + 'Call (live 1-on-1)</button><button type="button" class="zl-btn s" data-zc="watch" data-pid="' + h(pid) + '">' + I('tv') + 'Watch together</button></div>';
  }
  function zcAct(a, pid) { const m = me(), mine = m.office ? 'U:office' : m.pid; if (a === 'dm') openChat(X.dmId(mine, pid)); else if (a === 'call') callPerson(pid); else if (a === 'watch') { X.WT.room = X.dmId(mine, pid); X.WT.sid = null; X.force(); go(pref() + 'watch'); } if (G(() => window.FTA_TREE.isOpen())) G(() => window.FTA_TREE.close()); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-zc]'); if (!b) return; e.preventDefault(); e.stopPropagation(); zcAct(b.dataset.zc, b.dataset.pid); }, true);
  function decorateTrees() {
    qa('.pt').forEach(el => {
      const inst = el.parentNode && el.parentNode.__pt; const pid = inst ? inst.pid : null;
      if (pid && !el.querySelector(':scope > .zc-pact') && !(inst.mode === 'self')) { const bar = connectBar(pid); if (bar) { const t = document.createElement('div'); t.innerHTML = bar; const vp = el.querySelector(':scope > .pt-vp'); if (vp) vp.before(t.firstChild); } }
      qa('[data-act="ktree"][data-pid]', el).forEach(k => { const p2 = k.dataset.pid; if (k.parentNode.querySelector('.zc-kact') || !canReach(p2)) return; const s = document.createElement('span'); s.className = 'zc-kact'; s.innerHTML = '<button type="button" class="pt-btn is-ghost" data-zc="dm" data-pid="' + h(p2) + '" title="Message ' + h(pname(p2)) + '" aria-label="Message">' + I('chat') + '</button><button type="button" class="pt-btn is-ghost" data-zc="call" data-pid="' + h(p2) + '" title="Call (live 1-on-1)" aria-label="Call">' + I('video') + '</button><button type="button" class="pt-btn is-ghost" data-zc="watch" data-pid="' + h(p2) + '" title="Watch together" aria-label="Watch together">' + I('tv') + '</button>'; k.before(s); });
    });
  }
  X.profileActs = (pid, mode) => mode === 'office' ? '<button class="btn" type="button" data-zc="call" data-pid="' + h(pid) + '">' + I('video') + 'Call</button><button class="btn" type="button" data-zc="watch" data-pid="' + h(pid) + '">' + I('tv') + 'Watch together</button>' : '';
  X.profileLive = (pid, mode) => {
    const d = D(), isM = /^MEN-/.test(pid), gs = X.groups().filter(g => isM ? g.mentor === pid : (g.stu || []).includes(pid)).map(g => g.id);
    const S = d.liveLog.filter(s => s.gid && gs.includes(s.gid)).slice(0, 12), recs = d.recs.filter(r => gs.includes(r.gid)).slice(0, 8);
    const att = isM ? null : { p: S.filter(s => s.present.includes(pid)).length, a: S.filter(s => s.absent.includes(pid)).length };
    return (att ? '<div class="cx-kpis"><div><b>' + att.p + '</b><span>live classes joined</span></div><div><b>' + att.a + '</b><span>missed</span></div><div><b>' + recs.length + '</b><span>recordings</span></div></div>' : '<div class="cx-kpis"><div><b>' + S.length + '</b><span>live classes taught</span></div><div><b>' + recs.length + '</b><span>recordings</span></div></div>') +
      '<table class="cx-tbl"><thead><tr><th>When</th><th>Class</th><th>' + (isM ? 'Present' : 'Status') + '</th><th>Recording</th></tr></thead><tbody>' + (S.map(s => '<tr><td>' + h(dayLabel(s.start)) + ' ' + tm(s.start) + '</td><td>' + h(s.title) + '</td><td>' + (isM ? s.present.length + ' / ' + (s.present.length + s.absent.length) : s.present.includes(pid) ? 'Present' : 'Missed') + '</td><td>' + (s.recId ? '<button type="button" class="btn s" onclick="FTA_ZC.openRec(\'' + h(s.recId) + '\')">' + I('play') + 'Watch</button>' : '—') + '</td></tr>').join('') || '<tr><td colspan="4" class="cx-muted">No live classes yet.</td></tr>') + '</tbody></table>';
  };

  /* ================================================================ AI ASSISTANT: it can read chat, live classes and recordings */
  let aiDone = false;
  function hookAI() {
    if (aiDone || !G(() => FTA.agentTools && FTA.agentTools.TOOLS && FTA.agentTools.RUN)) return; aiDone = true;
    const T = FTA.agentTools.TOOLS, R = FTA.agentTools.RUN, obj = (p, r) => ({ type: 'object', properties: p, required: r || [] });
    const slim = x => ({ id: x.id, room: x.room, chat: G(() => X.roomTitle(roomOf(x.room), 'U:office')) || x.room, by: x.by, name: x.name, at: new Date(x.at).toISOString(), text: x.deleted ? '(deleted) ' + (x.text || '') : preview(x), reply: x.reply || undefined, mentions: x.mentions && x.mentions.length ? x.mentions.map(pname) : undefined, reactions: x.react ? Object.fromEntries(Object.entries(x.react).filter(([e, L]) => L.length).map(([e, L]) => [e, L.map(pname)])) : undefined });
    const sess = s => ({ class: s.gid ? (grp(s.gid) || {}).name : 'call', group: s.gid, title: s.title, date: new Date(s.start).toISOString().slice(0, 10), start: new Date(s.start).toISOString(), minutes: Math.round((s.end - s.start) / 60000), host: pname(s.by), present: s.present.map(p => ({ id: p, name: pname(p) })), absent: s.absent.map(p => ({ id: p, name: pname(p) })), recording: s.recId || null });
    T.push({ name: 'live_status', read: true, description: 'Live classes and video calls: which are live right now (who is in them) and the recent finished sessions with who was present and who missed them, plus recordings. Use for questions like "who missed today\'s live class?".', input_schema: obj({ date: { type: 'string', description: 'YYYY-MM-DD, default today' }, group: { type: 'string', description: 'Class group id or name (optional)' } }) });
    T.push({ name: 'who_missed_live_class', read: true, description: 'Students who did not join a live class on a date (default today), per class, with the mentor and whether a recording exists.', input_schema: obj({ date: { type: 'string' }, group: { type: 'string' } }) });
    T.push({ name: 'recent_messages', read: true, description: 'Read the Messages (class group chats and private chats, the same data the Chat Monitor shows). Filter by chat (group id/name or person name), by text, or by person. Returns newest last.', input_schema: obj({ chat: { type: 'string' }, text: { type: 'string' }, person: { type: 'string' }, limit: { type: 'integer' } }) });
    const pickG = q => { if (!q) return null; q = String(q).toLowerCase(); const g = X.groups().find(x => x.id.toLowerCase() === q || x.name.toLowerCase().includes(q)); return g ? g.id : '__none'; };
    R.live_status = a => { const d = D(), day = a.date || TODAY_(), gid = pickG(a.group); return { now_live: Object.keys(d.live).filter(liveOn).map(k => ({ key: k, class: grp(k) ? grp(k).name : '1-on-1 call', title: d.live[k].title, started: new Date(d.live[k].at).toISOString(), host: pname(d.live[k].by), joined: (d.live[k].joined || []).map(pname) })), sessions: d.liveLog.filter(s => (!a.date || new Date(s.start).toISOString().slice(0, 10) === day) && (!gid || s.gid === gid)).slice(0, 20).map(sess), recordings: d.recs.slice(0, 10).map(r => ({ id: r.id, title: r.title, class: (grp(r.gid) || {}).name, date: new Date(r.at).toISOString().slice(0, 10), minutes: Math.round(r.dur / 60) })) }; };
    R.who_missed_live_class = a => { const d = D(), day = a.date || TODAY_(), gid = pickG(a.group); const S = d.liveLog.filter(s => s.kind === 'group' && new Date(s.start).toISOString().slice(0, 10) === day && (!gid || s.gid === gid)); if (!S.length) return { date: day, sessions: 0, note: 'No live class ended on this date' + (gid ? ' for that class' : '') + '. Live classes that are still running: ' + (Object.keys(d.live).filter(liveOn).map(k => (grp(k) || {}).name || k).join(', ') || 'none') + '.' }; return { date: day, sessions: S.map(s => ({ class: (grp(s.gid) || {}).name, title: s.title, mentor: pname((grp(s.gid) || {}).mentor), time: tm(s.start) + '–' + tm(s.end), missed: s.absent.map(p => ({ id: p, name: pname(p), phone: (X.personRec(p) || {}).phone, guardian: (X.personRec(p) || {}).guardian })), present_count: s.present.length, recording: !!s.recId })) }; };
    R.recent_messages = a => { const d = D(), q = String(a.chat || '').toLowerCase(), t = String(a.text || '').toLowerCase(), pp = String(a.person || '').toLowerCase(); let L = d.msgs.filter(x => { const r = roomOf(x.room); if (!r) return false; const title = (r.kind === 'group' ? r.name : r.members.map(pname).join(' ')).toLowerCase(); return (!q || x.room.toLowerCase().includes(q) || title.includes(q)) && (!t || String(preview(x) || '').toLowerCase().includes(t)) && (!pp || String(x.name || '').toLowerCase().includes(pp)); }).sort((x, y) => x.at - y.at); L = L.slice(-Math.min(200, a.limit || 40)); return { count: L.length, messages: L.map(slim) }; };
    const C2 = FTA.collections || (FTA.collections = {});
    C2['DEMO.CHAT'] = { name: 'DEMO.CHAT', kind: 'list', key: 'id', get: () => D().msgs.map(slim), demo: true };
    C2['DEMO.LIVE'] = { name: 'DEMO.LIVE', kind: 'list', key: 'sid', get: () => D().liveLog.map(s => Object.assign({ sid: s.sid }, sess(s))), demo: true };
    C2['DEMO.RECORDINGS'] = { name: 'DEMO.RECORDINGS', kind: 'list', key: 'id', get: () => D().recs.map(r => ({ id: r.id, title: r.title, group: r.gid, at: new Date(r.at).toISOString(), seconds: r.dur, by: pname(r.by) })), demo: true };
    C2['DEMO.NOTIFICATIONS'] = { name: 'DEMO.NOTIFICATIONS', kind: 'list', key: 'id', get: () => D().notes.map(n => ({ id: n.id, kind: n.kind, title: n.t, detail: n.d, to: n.to.map(pname), at: new Date(n.at).toISOString(), read_by: n.read.map(pname) })), demo: true };
  }

  /* ================================================================ when shared data changes, keep every screen in step */
  function onData() {
    G(wtSync);
    if ($('zc-wa')) { G(drawSide); G(() => drawMain()); }
    if (LV.phase === 'call') { G(liveChatPing); if (LV.panel === 'act' || LV.panel === 'people') G(drawPanel); }
    G(applyAtt); G(toastNewNotes); G(sideBadge); G(decorate);
  }
  X.HOOKS.push(onData);
  X.HERE.push(() => ({ zc: 1 }));

  /* navigation: leaving the live page while in a call leaves the call cleanly */
  const _go = window.go;
  if (typeof _go === 'function') window.go = function (p) { if (LV.phase === 'call' && !/live$/.test(String(p))) leaveCall(null, true); if (LV.phase === 'lobby' && !/live$/.test(String(p))) { stopMedia(); LV.phase = null; LV.rk = null; } if (LV.phase === 'ended' && !/live$/.test(String(p))) { LV.phase = null; LV.ended = null; LV.rk = null; } C.open = false; C.info = false; return _go.apply(this, arguments); };

  window.FTA_ZC = { openChat, joinLive, call: callPerson, note: openNote, openRec, openWatch, notify: (to, n) => { notify(to, n); X.save(); }, state: () => ({ LV: { rk: LV.rk, phase: LV.phase, peers: Object.keys(livePeers()), seen: [...LV.seen], panel: LV.panel, rec: !!LV.rec, wb: LV.wb }, C: { room: X.CH.room, open: C.open } }), liveOn, bellItems, endForAll: () => endForAll(LV.page), watchApp };
  X.quiet = true;
  function tick() { G(hookBell); G(hookAI); G(watchApp); G(sideBadge); G(decorate); G(decorateTrees); if ($('zc-wa')) { const r = roomOf(X.CH.room); if (r) G(() => drawSub(r)); } }
  window.addEventListener('fta:started', () => { startedAt = now(); });
  setTimeout(() => { if (!startedAt && G(() => FTA.member)) startedAt = now(); }, 4000);
  setInterval(tick, 1200);
  const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(() => { G(decorate); G(decorateTrees); }, 120); });
  const startObs = () => { const v = $('view'); if (v) mo.observe(v, { childList: true, subtree: false }); document.body && mo.observe(document.body, { childList: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObs); else startObs();
  G(() => D().notes.forEach(n => SEEN_NOTES.add(n.id)));
})();
