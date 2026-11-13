
  /* ================================================================ GOOGLE-MEET-STYLE LIVE CLASS */
  const HBK = 'fta-demo-live-hb';
  const hbAll = () => { try { return JSON.parse(localStorage.getItem(HBK) || '{}') || {}; } catch (e) { return {}; } };
  const hbBeat = rk => { try { const o = hbAll(); o[rk] = now(); localStorage.setItem(HBK, JSON.stringify(o)); } catch (e) { } };
  function liveOn(rk) { if (!rk) return false; const L = D().live[rk]; if (!L || !L.on) return false; const t = hbAll()[rk] || 0; return now() - Math.max(t, L.at || 0) < 20000; }
  const LV = { rk: null, phase: null, cam: null, mic: null, scr: null, micOn: false, camOn: false, hand: false, pin: null, layout: 'auto', panel: null, cc: false, rec: null, recT: 0, recChunks: [], peers: {}, seen: new Set(), joinedAt: 0, wb: false, chatSeen: 0, tick: null, speak: false, ended: null, reply: null, sig: '', handAt: 0, recog: null, ccLines: {} };
  const rkInfo = rk => { if (!rk) return null; if (rk.startsWith('dm:')) { const r = roomOf(rk); if (!r) return null; return { rk, kind: 'dm', room: rk, roster: r.members.slice(), students: r.members.filter(p => /^STU-/.test(p)), name: r.members.map(pname).join(' & '), r }; } const g = grp(rk); if (!g) return null; return { rk, kind: 'group', gid: g.id, g, room: 'g:' + g.id, roster: [g.mentor].concat(g.stu || []), students: (g.stu || []).slice(), name: g.name, mentor: g.mentor }; };
  const amHost = rk => { const i = rkInfo(rk), m = me(), L = D().live[rk]; if (!i) return false; if (isOffice()) return true; if (i.kind === 'group') return i.mentor === m.pid; return (L && L.by === m.pid) || X.kindOf(m.role) === 't'; };
  const myLivePid = () => me().pid;
  function liveCount(rk) { if (LV.rk === rk && LV.phase === 'call') return 1 + Object.keys(livePeers()).length; return Object.values(X.ONLINE).filter(o => o.live === rk && now() - o.at < 9000).length; }
  function livePeers() { const o = {}; Object.values(LV.peers).forEach(p => { if (now() - p.at < 7000 && p.pid !== myLivePid()) o[p.pid] = p; }); return o; }
  const lstate = () => ({ t: 'lvs', rk: LV.rk, pid: myLivePid(), name: me().name, role: me().role, mic: LV.micOn, cam: LV.camOn, hand: LV.hand, handAt: LV.handAt, scr: !!LV.scr, speak: LV.speak, rec: !!LV.rec, host: amHost(LV.rk), wb: LV.wb });
  const lpost = () => { if (LV.phase === 'call') X.post(lstate()); };
  const lcmd = o => X.post(Object.assign({ t: 'lvc', rk: LV.rk, from: myLivePid(), name: me().name }, o));

  function joinLive(rk) { if (!rk) return; if (LV.phase === 'call' && LV.rk === rk) { X.force(); go(pref() + 'live'); return; } LV.rk = rk; LV.phase = 'lobby'; LV.ended = null; X.force(); go(pref() + 'live'); }
  function liveFor(gid) { joinLive(gid); }
  function callPerson(pid) { const m = me(), a = m.office ? 'U:office' : m.pid; if (!pid || pid === a) return; joinLive(X.dmId(a, pid)); }

  function pageLiveZ(p) {
    X.seed(); LV.page = p;
    if (LV.phase === 'call' && LV.rk) return roomView(p);
    if (LV.phase === 'lobby' && LV.rk) return lobbyView(p);
    if (LV.phase === 'ended' && LV.ended) return endedView(p);
    listView(p);
  }
  function listView(p) {
    const m = me(), gs = X.myGroups(), host = X.kindOf(m.role) !== 's', d = D();
    const calls = Object.keys(d.live).filter(k => k.startsWith('dm:') && liveOn(k) && roomOf(k) && (roomOf(k).members.includes(m.pid) || (m.office && roomOf(k).members.includes('U:office'))));
    const slots = gid => (G(() => SCH.rtDay(TODAY_(), {})) || []).filter(e => e.gid === gid).map(e => G(() => SCH.t12(e.start)) || e.start);
    const card = g => {
      const on = liveOn(g.id), L = d.live[g.id], last = d.liveLog.find(s => s.gid === g.id), sl = slots(g.id), cnt = on ? liveCount(g.id) : 0;
      const ppl = on ? Object.values(X.ONLINE).filter(o => o.live === g.id && now() - o.at < 9000).map(o => o.pid) : [];
      return '<article class="zl-card' + (on ? ' on' : '') + '">' + '<header>' + gav(g, 44) + '<div><b>' + h(g.name) + '</b><small>' + h(pname(g.mentor)) + ' · ' + (g.stu || []).length + ' students</small></div>' + (on ? '<span class="zc-livepill big"><span class="zc-livedot"></span>Live</span>' : '') + '</header>' +
        '<dl>' + (on ? '<div><dt>Now</dt><dd>' + h(L.title || 'Live class') + ' · started ' + tm(L.at) + ' · ' + cnt + ' in the call</dd></div>' : '') + '<div><dt>Today</dt><dd>' + (sl.length ? h(sl.join(', ')) + ' on the routine' : 'Not on today’s routine') + '</dd></div>' + (last ? '<div><dt>Last class</dt><dd>' + h(dayLabel(last.start)) + ' · ' + last.present.length + '/' + (last.present.length + last.absent.length) + ' present' + (last.recId ? ' · recording' : '') + '</dd></div>' : '') + '</dl>' +
        (ppl.length ? '<div class="zl-stack">' + ppl.slice(0, 5).map(p2 => av(p2, 28)).join('') + '</div>' : '') +
        '<div class="zl-cacts">' + (on ? '<button type="button" class="zl-btn p" data-lj="' + g.id + '">' + I('video') + 'Join now</button>' : host ? '<button type="button" class="zl-btn p" data-lj="' + g.id + '">' + I('video') + 'Start class</button>' : '<button type="button" class="zl-btn" disabled>' + I('clock') + 'Waiting for ' + h(first(pname(g.mentor))) + '</button>') + '<button type="button" class="zl-btn" data-lchat="g:' + g.id + '">' + I('chat') + 'Class chat</button>' + (last && last.recId ? '<button type="button" class="zl-btn" data-lrec="' + h(last.recId) + '">' + I('film') + 'Recording</button>' : '') + '</div></article>';
    };
    const log = d.liveLog.filter(s => s.kind === 'group' ? gs.some(g => g.id === s.gid) || isOffice() : roomOf(s.rk) && roomOf(s.rk).members.includes(m.pid)).slice(0, 12);
    X.shell(p, X.demoNote('<b>Live Class</b> works like Google Meet: a lobby to check your camera and mic, a grid that grows with the class, screen sharing, raise hand, reactions, captions, a shared whiteboard, polls and Q&amp;A. When the mentor ends the class, attendance is saved to the Attendance pages, the class chat gets a summary and the recording goes to Recordings. In this demo your own camera works; other people join from another tab and show as their picture. On the live site everyone’s video goes through LiveKit.') +
      '<div class="zl-list" data-notx>' + (calls.length ? '<h3 class="zl-h">Calls for you</h3><div class="zl-grid2">' + calls.map(k => { const r = roomOf(k), L = d.live[k]; return '<article class="zl-card on"><header>' + av(L.by, 44) + '<div><b>' + h(pname(L.by)) + ' is calling</b><small>1-on-1 video call · started ' + tm(L.at) + '</small></div><span class="zc-livepill big"><span class="zc-livedot"></span>Live</span></header><div class="zl-cacts"><button type="button" class="zl-btn p" data-lj="' + h(k) + '">' + I('video') + 'Join call</button></div></article>'; }).join('') + '</div>' : '') +
      '<h3 class="zl-h">Your classes</h3><div class="zl-grid2">' + (gs.map(card).join('') || '<div class="card zc-empty">No classes yet.</div>') + '</div>' +
      '<h3 class="zl-h">Past live classes</h3><div class="card zl-past">' + (log.length ? '<table class="cx-tbl"><thead><tr><th>When</th><th>Class</th><th>Length</th><th>Present</th>' + (X.kindOf(m.role) !== 's' ? '<th>Missed</th>' : '<th>You</th>') + '<th></th></tr></thead><tbody>' + log.map(s => '<tr><td>' + h(dayLabel(s.start)) + ' ' + tm(s.start) + '</td><td>' + h(s.title) + '</td><td>' + mmss((s.end - s.start) / 1000) + '</td><td>' + s.present.length + ' / ' + (s.present.length + s.absent.length) + '</td><td>' + (X.kindOf(m.role) !== 's' ? h(s.absent.map(p2 => first(pname(p2))).join(', ') || '—') : (s.present.includes(m.pid) ? 'Present' : s.absent.includes(m.pid) ? 'Missed' : '—')) + '</td><td>' + (s.recId ? '<button type="button" class="zl-btn s" data-lrec="' + h(s.recId) + '">' + I('play') + 'Play</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : '<p class="zc-muted">No live classes yet. When a class ends, it is listed here with who was present.</p>') + '</div></div>');
    $('cx-root').onclick = e => { const j = e.target.closest('[data-lj]'), c = e.target.closest('[data-lchat]'), r = e.target.closest('[data-lrec]'); if (j) joinLive(j.dataset.lj); else if (c) openChat(c.dataset.lchat); else if (r) openRec(r.dataset.lrec); };
  }

  /* ---------------------------------------------------------------- lobby */
  async function getCam() { if (LV.cam) return true; try { LV.cam = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } }); X.LIVE.cam = LV.cam; LV.camOn = true; return true; } catch (e) { say('Camera permission was not given (or there is no camera).'); LV.camOn = false; return false; } }
  async function getMic() { if (LV.mic) { LV.mic.getAudioTracks().forEach(t => t.enabled = true); LV.micOn = true; listenLevel(); return true; } try { LV.mic = await navigator.mediaDevices.getUserMedia({ audio: true }); X.LIVE.micS = LV.mic; LV.micOn = true; listenLevel(); return true; } catch (e) { say('Microphone permission was not given.'); LV.micOn = false; return false; } }
  function micOff() { if (LV.mic) LV.mic.getAudioTracks().forEach(t => t.enabled = false); LV.micOn = false; LV.speak = false; }
  function camOff() { if (LV.cam) LV.cam.getTracks().forEach(t => t.stop()); LV.cam = null; X.LIVE.cam = null; LV.camOn = false; }
  function listenLevel() {
    if (LV.ana || !LV.mic || !(window.AudioContext || window.webkitAudioContext)) return;
    try { const ac = new (window.AudioContext || window.webkitAudioContext)(), src = ac.createMediaStreamSource(LV.mic), an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); const buf = new Uint8Array(an.fftSize); LV.ana = { ac, an, buf, iv: setInterval(() => { if (!LV.micOn) { if (LV.speak) { LV.speak = false; speakUI(); } return; } an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } const rms = Math.sqrt(s / buf.length), sp = rms > 0.035; if (sp !== LV.speak) { LV.speak = sp; speakUI(); lpost(); } }, 180) }; } catch (e) { }
  }
  function speakUI() { const t = q1('.zl-tile[data-pid="' + myLivePid() + '"]'); if (t) t.classList.toggle('speak', LV.speak); const pv = q1('.zl-prev'); if (pv) pv.classList.toggle('speak', LV.speak); }
  function stopMedia() { [LV.cam, LV.mic, LV.scr].forEach(s => s && s.getTracks().forEach(t => t.stop())); LV.cam = LV.mic = LV.scr = null; X.LIVE.cam = X.LIVE.scr = X.LIVE.micS = null; LV.micOn = LV.camOn = false; LV.speak = false; if (LV.ana) { clearInterval(LV.ana.iv); G(() => LV.ana.ac.close()); LV.ana = null; } stopCC(); }

  function unroom() { const R = $('zl-room'); if (R) R.remove(); qa('.zl-pop').forEach(x => x.remove()); document.body.classList.remove('zl-on'); }
  function lobbyView(p) {
    const i = rkInfo(LV.rk); if (!i) { LV.phase = null; LV.rk = null; return listView(p); }
    const m = me(), on = liveOn(LV.rk), host = amHost(LV.rk), L = D().live[LV.rk];
    const inCall = Object.values(X.ONLINE).filter(o => o.live === LV.rk && now() - o.at < 9000);
    const defTitle = i.kind === 'group' ? i.name + ' · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Call with ' + i.roster.filter(x => x !== m.pid && x !== 'U:office').map(pname).join(', ');
    X.shell(p, '<div class="zl-lobby" data-notx><div class="zl-prevw"><div class="zl-prev" id="zl-prev"><video id="zl-pv" muted playsinline autoplay></video><div class="zl-pvav">' + av(m.pid, 96) + '<p id="zl-pvt">Camera is off</p></div><span class="zl-pvname">' + h(m.name) + '</span><div class="zl-pvbar"><button type="button" class="zl-rb" id="zl-pmic" aria-label="Turn microphone on or off">' + I('micoff') + '</button><button type="button" class="zl-rb" id="zl-pcam" aria-label="Turn camera on or off">' + I('videooff') + '</button></div></div><p class="zl-hint">' + I('info') + 'Only your own camera shows in this demo. On the live site everyone’s video and sound go through LiveKit.</p></div>' +
      '<div class="zl-ready"><span class="zl-eyebrow">' + (i.kind === 'group' ? 'Class group · ' + i.roster.length + ' people' : '1-on-1 call') + '</span><h2>' + (on ? 'Ready to join?' : host ? 'Start the class' : 'Waiting for the host') + '</h2><p class="zl-room-n">' + h(i.name) + '</p>' +
      '<p class="zl-who">' + (on ? (inCall.length ? '<span class="zl-stack">' + inCall.slice(0, 4).map(o => av(o.pid, 28)).join('') + '</span>' + h(inCall.map(o => first(o.name)).join(', ')) + (inCall.length === 1 ? ' is' : ' are') + ' in this call' : h(pname(L.by)) + ' started this call at ' + tm(L.at)) : host ? 'When you start, everyone in this ' + (i.kind === 'group' ? 'class' : 'chat') + ' gets a notification and a Join card in the chat.' : 'The class has not started yet. You will get a notification when it starts.') + '</p>' +
      (host && !on ? '<label class="zl-f"><span>Lesson title (saved with the attendance)</span><input id="zl-title" value="' + h(defTitle) + '" maxlength="80"></label>' : '') +
      '<div class="zl-ja">' + (on || host ? '<button type="button" class="zl-join" id="zl-join">' + (on ? 'Join now' : 'Start class') + '</button>' : '<button type="button" class="zl-join" disabled>Waiting…</button>') + '<button type="button" class="zl-btn" id="zl-lback">Back</button></div>' +
      '<ul class="zl-feat"><li>' + I('check') + 'Attendance is saved automatically when the class ends</li><li>' + I('chat') + 'The in-call chat is the class group chat</li><li>' + I('film') + 'Recordings go to Recordings and the chat</li></ul></div></div>');
    const draw = () => { const v = $('zl-pv'); if (!v) return; v.srcObject = LV.cam || null; v.hidden = !LV.cam; q1('.zl-pvav').hidden = !!LV.cam; const a = $('zl-pmic'), c = $('zl-pcam'); a.innerHTML = I(LV.micOn ? 'mic' : 'micoff'); a.classList.toggle('off', !LV.micOn); c.innerHTML = I(LV.camOn ? 'video' : 'videooff'); c.classList.toggle('off', !LV.camOn); };
    draw();
    $('zl-pmic').onclick = async () => { if (LV.micOn) micOff(); else await getMic(); draw(); };
    $('zl-pcam').onclick = async () => { if (LV.camOn) camOff(); else await getCam(); draw(); };
    $('zl-lback').onclick = () => { stopMedia(); LV.phase = null; LV.rk = null; X.force(); listView(p); };
    const j = $('zl-join'); if (j) j.onclick = () => enterCall(p, $('zl-title') ? $('zl-title').value.trim() : '');
    clearInterval(LV.lobbyT); LV.lobbyT = setInterval(() => { if (!$('zl-prev')) { clearInterval(LV.lobbyT); return; } const now2 = liveOn(LV.rk); if (now2 !== on) { X.force(); lobbyView(p); } }, 2500);
  }

  /* ---------------------------------------------------------------- start / join / leave / end */
  function enterCall(p, title) {
    const rk = LV.rk, i = rkInfo(rk), m = me(), d = D(); if (!i) return;
    if (!liveOn(rk)) {
      if (!amHost(rk)) { say('The class has not started yet'); return; }
      const sid = X.uid('S'), L = d.live[rk] = { on: true, sid, at: now(), by: m.pid, title: title || (i.kind === 'group' ? i.name + ' · live class' : 'Video call'), kind: i.kind, gid: i.gid || null, joined: [m.pid] };
      const by = m.office && roomOf(i.room).members.includes('U:office') ? 'U:office' : m.pid;
      const card = addMsg(i.room, by, { kind: 'card', card: { type: i.kind === 'group' ? 'live' : 'call', rk, sid, title: L.title, by: m.pid, start: L.at } });
      L.msg = card.id; const pins = d.pins[i.room] = d.pins[i.room] || []; pins.unshift(card.id); if (pins.length > 3) pins.pop();
      notify(i.roster.concat(i.kind === 'group' ? [] : []).filter(x => x !== m.pid), { kind: 'live', icon: 'video', t: (i.kind === 'group' ? 'Live class started · ' + i.name : pname(m.pid) + ' is calling you'), d: L.title + ' · tap to join', act: { live: rk }, btn: 'Join' });
      G(() => log(i.kind === 'group' ? 'Live class started' : 'Video call started', i.name, L.title));
      hbBeat(rk); X.save(); X.post({ t: 'msg', room: i.room, id: card.id }); X.post({ t: 'livestart', rk });
    } else { const L = d.live[rk]; L.joined = L.joined || []; if (!L.joined.includes(m.pid)) L.joined.push(m.pid); X.save(); }
    clearInterval(LV.lobbyT);
    LV.phase = 'call'; LV.joinedAt = now(); LV.peers = {}; LV.seen = new Set([m.pid]); LV.hand = false; LV.pin = null; LV.panel = window.innerWidth > 900 && amHost(rk) ? null : null; LV.chatSeen = X.roomMsgs(i.room).length; LV.sig = ''; LV.wb = !!(d.live[rk] && d.live[rk].wb);
    X.LIVE.gid = rk; X.LIVE.hand = false; hbBeat(rk);
    X.force(); roomView(p); lpost();
  }
  function leaveCall(p, quiet) {
    const rk = LV.rk; if (!rk) return; const i = rkInfo(rk), host = amHost(rk), others = Object.keys(livePeers()).length;
    const finish = () => { X.post({ t: 'lvbye', rk, pid: myLivePid() }); stopMedia(); clearInterval(LV.tick); LV.phase = null; X.LIVE.gid = null; X.LIVE.hand = false; LV.hand = false; LV.panel = null; unroom(); if (!quiet) { LV.rk = null; X.force(); listView(p || LV.page || pref() + 'live'); } else LV.rk = null; };
    if (host && !others && liveOn(rk)) { endForAll(p, true); return; }
    if (LV.rec) { stopRecording().then(finish); return; }
    finish();
  }
  async function endForAll(p, lonely) {
    const rk = LV.rk, i = rkInfo(rk), d = D(), L = d.live[rk], m = me(); if (!i || !L) { leaveCall(p); return; }
    let recId = null; if (LV.rec) recId = await stopRecording();
    lcmd({ act: 'end' });
    const joined = new Set([].concat(L.joined || [], [...LV.seen], [m.pid]));
    const present = i.students.filter(s => joined.has(s)), absent = i.students.filter(s => !joined.has(s)), end = now();
    const d2 = D(), L2 = d2.live[rk] || L;
    recId = recId || L2.lastRec || null;
    if (i.kind === 'group') writeAttendance(i.gid, present, L2.title, pname(i.mentor) || m.name, rk);
    const sess = { sid: L2.sid, rk, gid: i.gid || null, kind: i.kind, title: L2.title, start: L2.at, end, by: L2.by, present, absent, joined: [...joined], recId };
    d2.liveLog.unshift(sess); d2.liveLog = d2.liveLog.slice(0, 120);
    const card = d2.msgs.find(x => x.id === L2.msg); if (card && card.card) { card.card.end = end; card.card.present = i.kind === 'group' ? present.length : joined.size; }
    if (d2.pins[i.room]) d2.pins[i.room] = d2.pins[i.room].filter(x => x !== L2.msg);
    const by = m.office && roomOf(i.room).members.includes('U:office') ? 'U:office' : m.pid;
    const sys = addMsg(i.room, by, { kind: 'sys', icon: 'video', text: i.kind === 'group' ? 'Class ended · ' + present.length + ' present' + (absent.length ? ' · ' + absent.length + ' absent' : '') + ' · ' + (recId ? 'recording saved' : 'not recorded') : 'Call ended · ' + mmss((end - L2.at) / 1000) });
    if (i.kind === 'group' && absent.length) notify(absent, { kind: 'missed', icon: 'video', t: 'You missed today’s live class', d: L2.title + (recId ? ' · the recording is ready to watch' : ' · ask your mentor what was covered'), act: recId ? { rec: recId } : { room: i.room }, btn: recId ? 'Watch' : 'Open chat' });
    delete d2.live[rk];
    G(() => log(i.kind === 'group' ? 'Live class ended' : 'Video call ended', i.name + ' · ' + L2.title, i.kind === 'group' ? present.length + ' present, ' + absent.length + ' absent' + (recId ? ', recorded' : '') : mmss((end - L2.at) / 1000)));
    X.save(); X.post({ t: 'msg', room: i.room, id: sys.id });
    X.post({ t: 'lvbye', rk, pid: myLivePid() }); stopMedia(); clearInterval(LV.tick); X.LIVE.gid = null; unroom();
    LV.ended = Object.assign({ host: true, lonely: !!lonely }, sess); LV.phase = 'ended'; X.force(); endedView(p || LV.page);
    onData();
  }
  function writeAttendance(gid, present, title, byName, rk) {
    const key = gid + '|' + TODAY_(), g = grp(gid); if (!g) return;
    const ex = G(() => SCH.ATT[key]), marks = Object.assign({}, ex && ex.marks || {});
    (g.stu || []).forEach(s => { if (present.includes(s)) marks[s] = marks[s] === 'L' ? 'L' : 'P'; else if (!marks[s]) marks[s] = 'A'; });
    const rec = { at: G(() => SCH.nowStamp()) || new Date().toLocaleString('en-GB'), by: byName, marks, lesson: title, reason: 'Saved automatically from the live class' + (ex ? ' (merged with the attendance already taken)' : ''), live: true };
    G(() => { SCH.ATT[key] = rec; }); D().att[key] = rec;
    const P = Object.values(marks).filter(v => v === 'P' || v === 'L').length;
    G(() => log('Attendance saved from live class', g.name + ' · ' + TODAY_(), P + ' present, ' + ((g.stu || []).length - P) + ' absent · ' + title));
  }
  function endedView(p) {
    const e = LV.ended || {}, i = rkInfo(e.rk) || {}, m = me();
    X.shell(p, '<div class="zl-end" data-notx><span class="zl-endi">' + I(e.host ? 'check' : 'phoneoff') + '</span><h2>' + (e.kicked ? 'You were removed from the call' : e.host ? (e.lonely ? 'You were the last one — the class has ended' : 'You ended the class for everyone') : 'The host ended the class') + '</h2><p>' + h(e.title || i.name || '') + (e.start ? ' · ' + mmss(((e.end || now()) - e.start) / 1000) : '') + '</p>' +
      (e.present ? '<div class="zl-sum"><div><b>' + e.present.length + '</b><span>present</span></div><div><b>' + e.absent.length + '</b><span>absent</span></div><div><b>' + (e.recId ? 'Yes' : 'No') + '</b><span>recording</span></div></div>' + (e.kind === 'group' && X.kindOf(m.role) !== 's' ? '<div class="zl-att">' + e.present.map(s => '<span class="ok">' + av(s, 24) + h(pname(s)) + '</span>').join('') + e.absent.map(s => '<span class="no">' + av(s, 24) + h(pname(s)) + '</span>').join('') + '</div><p class="zc-muted">Saved to Attendance for ' + h(TODAY_()) + ' · ' + h(i.name || '') + '. A summary was posted in the class chat.</p>' : '') : '') +
      '<div class="zl-cacts c">' + (e.kind === 'group' && X.kindOf(m.role) !== 's' ? '<button type="button" class="zl-btn p" data-x="att">' + I('check') + 'Open attendance</button>' : '') + (e.recId ? '<button type="button" class="zl-btn" data-x="rec">' + I('film') + 'Play recording</button>' : '') + '<button type="button" class="zl-btn" data-x="chat">' + I('chat') + 'Open the chat</button><button type="button" class="zl-btn" data-x="back">' + I('back') + 'Back to classes</button></div></div>');
    $('cx-root').onclick = ev => { const b = ev.target.closest('[data-x]'); if (!b) return; const x = b.dataset.x; LV.phase = null; LV.ended = null; LV.rk = null;
      if (x === 'att') { G(() => { SCH.TS.gid = e.gid; SCH.TS.date = TODAY_(); }); goFirst(X.kindOf(m.role) === 't' ? ['tp-att'] : ['ac-att', 'attendance', 'ac-attendance']); }
      else if (x === 'rec') openRec(e.recId); else if (x === 'chat') openChat(i.room); else { X.force(); listView(p); } };
  }

  /* ---------------------------------------------------------------- the meeting room */
  function roomView(p) {
    const i = rkInfo(LV.rk), m = me(); if (!i) { LV.phase = null; return listView(p); }
    const host = amHost(LV.rk);
    if ($('zl-room') && $('zl-room').parentNode === document.body) { if (!$('cx-root')) X.shell(p, '<div class="zl-under"></div>'); return; }
    if (!X.shell(p, '<div class="zl-room" id="zl-room" data-notx>' +
      '<div class="zl-top"><div class="zl-tl"><b id="zl-clock"></b><i class="zl-sep"></i><span class="zl-tn">' + h(D().live[LV.rk] ? D().live[LV.rk].title : i.name) + '</span></div><div class="zl-tr"><span class="zl-rec" id="zl-rec" hidden><i></i>REC <b></b></span><span class="zl-lk" title="In this demo only your own camera shows; on the live site everyone’s video goes through LiveKit">' + I('lock') + 'Demo video</span></div></div>' +
      '<div class="zl-mid"><div class="zl-stage" id="zl-stage"></div><aside class="zl-panel" id="zl-panel" hidden></aside></div>' +
      '<div class="zl-cc" id="zl-cc" hidden></div><div class="zl-float" id="zl-float" aria-hidden="true"></div><div class="zl-cpop" id="zl-cpop" hidden></div>' +
      '<div class="zl-bar"><div class="zl-bl"><b id="zl-clock2"></b><i class="zl-sep"></i><span id="zl-bln"></span></div><div class="zl-bc">' +
      '<button type="button" class="zl-rb" id="zb-mic" data-l="mic" title="Microphone (Ctrl+D)" aria-label="Microphone"></button><button type="button" class="zl-rb" id="zb-cam" data-l="cam" title="Camera (Ctrl+E)" aria-label="Camera"></button>' +
      '<button type="button" class="zl-rb" id="zb-cc" data-l="cc" title="Captions" aria-label="Captions">' + I('cc') + '</button><button type="button" class="zl-rb" id="zb-hand" data-l="hand" title="Raise hand" aria-label="Raise hand">' + I('hand') + '</button><button type="button" class="zl-rb" id="zb-react" data-l="react" title="Send a reaction" aria-label="Send a reaction">' + I('smile') + '</button><button type="button" class="zl-rb" id="zb-scr" data-l="scr" title="Present now" aria-label="Present your screen">' + I('present') + '</button><button type="button" class="zl-rb" id="zb-more" data-l="more" title="More options" aria-label="More options">' + I('dots') + '</button>' +
      '<button type="button" class="zl-leave" id="zb-leave" data-l="leave" title="Leave call" aria-label="Leave call">' + I('phoneoff') + '</button></div>' +
      '<div class="zl-br"><button type="button" class="zl-ib" data-p="info" title="Meeting details" aria-label="Meeting details">' + I('info') + '</button><button type="button" class="zl-ib" data-p="people" title="People" aria-label="People">' + I('users') + '<em id="zb-pn"></em></button><button type="button" class="zl-ib" data-p="chat" title="Chat with everyone" aria-label="Chat">' + I('chat') + '<i id="zb-cd" hidden></i></button><button type="button" class="zl-ib" data-p="act" title="Activities" aria-label="Activities">' + I('shapes') + '</button>' + (host ? '<button type="button" class="zl-ib" data-p="host" title="Host controls" aria-label="Host controls">' + I('shield') + '</button>' : '') + '</div></div></div>', true)) return;
    document.body.classList.add('zl-on');
    { const R = $('zl-room'); if (R && R.parentNode !== document.body) document.body.appendChild(R); }
    const myv = document.createElement('video'); myv.id = 'zl-myv'; myv.muted = true; myv.playsInline = true; myv.autoplay = true; LV.myv = myv;
    const scv = document.createElement('video'); scv.id = 'zl-scv'; scv.muted = true; scv.playsInline = true; scv.autoplay = true; LV.scv = scv;
    LV.sig = ''; drawBar(); drawStage(); drawPanel();
    clearInterval(LV.tick); let k = 0;
    LV.tick = setInterval(() => {
      if (!$('zl-room')) { clearInterval(LV.tick); return; }
      k++; const t = new Date(), cl = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); if ($('zl-clock').textContent !== cl) $('zl-clock').textContent = cl; $('zl-clock2').textContent = mmss((now() - (D().live[LV.rk] ? D().live[LV.rk].at : LV.joinedAt)) / 1000); const bn = $('zl-bln'); if (bn) bn.textContent = (1 + Object.keys(livePeers()).length) + ' in the call' + (amHost(LV.rk) ? ' · you are the host' : '');
      const anyRec = LV.rec || Object.values(livePeers()).some(x => x.rec); const re = $('zl-rec'); re.hidden = !anyRec; if (anyRec) re.querySelector('b').textContent = LV.rec ? mmss((now() - LV.recT) / 1000) : '';
      if (k % 2 === 0) { lpost(); hbBeat(LV.rk); drawStage(); if (LV.panel === 'people' || LV.panel === 'host') drawPanel(); drawBar(); if (!liveOn(LV.rk) && !D().live[LV.rk]) { remoteEnded(); } }
    }, 1000);
    $('zl-room').onclick = roomClick;
  }
  function drawBar() {
    const s = (id, on, icOn, icOff, off) => { const b = $(id); if (!b) return; b.innerHTML = I(on ? icOn : icOff); b.classList.toggle('off', !!off); b.classList.toggle('on', !!(on && !off && icOn === icOff)); };
    s('zb-mic', LV.micOn, 'mic', 'micoff', !LV.micOn); s('zb-cam', LV.camOn, 'video', 'videooff', !LV.camOn);
    const t = (id, on) => { const b = $(id); if (b) b.classList.toggle('on', !!on); };
    t('zb-cc', LV.cc); t('zb-hand', LV.hand); t('zb-scr', !!LV.scr);
    qa('.zl-br [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === LV.panel));
    const pn = $('zb-pn'); if (pn) pn.textContent = 1 + Object.keys(livePeers()).length;
    const i = rkInfo(LV.rk), cd = $('zb-cd'); if (cd && i) cd.hidden = !(X.roomMsgs(i.room).length > LV.chatSeen && LV.panel !== 'chat');
  }
  function tiles() {
    const m = me(), P = livePeers();
    const L = [{ pid: m.pid, name: m.name, me: true, mic: LV.micOn, cam: LV.camOn, hand: LV.hand, handAt: LV.handAt, scr: !!LV.scr, speak: LV.speak, host: amHost(LV.rk) }].concat(Object.values(P).map(p => Object.assign({}, p)));
    Object.keys(P).forEach(pid => LV.seen.add(pid));
    return L;
  }
  function drawStage() {
    const S = $('zl-stage'); if (!S) return; const T = tiles(), m = me();
    const presenter = LV.scr ? T[0] : T.find(t => t.scr && !t.me);
    const wbOn = LV.wb;
    const mode = wbOn ? 'wb' : presenter ? 'present' : LV.pin && T.some(t => t.pid === LV.pin) ? 'pin' : LV.layout === 'spotlight' && T.length > 1 ? 'spot' : 'grid';
    const sig = mode + '|' + T.map(t => t.pid + (t.cam ? 'c' : '') + (t.scr ? 's' : '')).join(',') + '|' + (LV.pin || '') + '|' + LV.layout + '|' + window.innerWidth + '|' + (LV.panel ? 1 : 0);
    if (sig !== LV.sig) {
      LV.sig = sig;
      const tile = (t, cls) => '<div class="zl-tile ' + (cls || '') + (t.me ? ' me' : '') + '" data-pid="' + h(t.pid) + '"><div class="zl-vid">' + (t.cam && !t.me ? '<div class="zl-remote">' + av(t.pid, 84) + '<small>' + I('video') + 'Camera on · video shows on the live site</small></div>' : '') + (!t.cam ? '<div class="zl-avw">' + av(t.pid, 96) + '</div>' : '') + '</div><span class="zl-name">' + (t.host ? '<i class="zl-host" title="Host">' + I('shield') + '</i>' : '') + h(t.me ? 'You' : t.name) + '</span><span class="zl-mic"></span><span class="zl-handb">' + I('hand') + '</span><button type="button" class="zl-pinb" data-pin="' + h(t.pid) + '" title="Pin" aria-label="Pin ' + h(t.name) + '">' + I('pin') + '</button></div>';
      let html = '';
      if (mode === 'grid') {
        const n = T.length, W = S.clientWidth || 1000, Hh = S.clientHeight || 560;
        let best = { c: 1, s: 0 }; for (let c = 1; c <= Math.min(n, 5); c++) { const r = Math.ceil(n / c), tw = (W - (c - 1) * 10) / c, th = (Hh - (r - 1) * 10) / r, s = Math.min(tw, th * 16 / 9); if (s > best.s) best = { c, s }; }
        html = '<div class="zl-grid" style="--c:' + best.c + ';--w:' + Math.floor(best.s) + 'px">' + T.map(t => tile(t)).join('') + '</div>';
      } else {
        let main = '';
        if (mode === 'wb') main = '<div class="zl-mainv zl-wbw" id="zl-wbw"><div class="zl-wbbar">' + ['#111a2e', '#c0392b', '#1f6fd6', '#16935f', '#b8860b'].map((c, j) => '<button type="button" data-c="' + c + '" style="--c:' + c + '" class="' + (j === (LV.penI || 0) ? 'on' : '') + '" aria-label="Pen colour"></button>').join('') + '<button type="button" data-c="erase" aria-label="Eraser">' + I('trash') + '</button>' + (amHost(LV.rk) ? '<button type="button" data-c="clear">Clear</button>' : '') + '<button type="button" data-c="close" aria-label="Close whiteboard">' + I('x') + '</button></div><canvas id="zl-wb" width="1280" height="720" aria-label="Shared whiteboard"></canvas></div>';
        else if (mode === 'present') main = '<div class="zl-mainv" data-pid="' + h(presenter.pid) + '">' + (presenter.me ? '<div class="zl-scrw" id="zl-scrw"></div><span class="zl-tag">' + I('present') + 'You are presenting<button type="button" data-l="scr">Stop presenting</button></span>' : '<div class="zl-avw">' + I('present', 'zl-bigi') + '<b>' + h(presenter.name) + ' is presenting</b><small>The shared screen shows here on the live site (LiveKit)</small></div>') + '</div>';
        else { const t = mode === 'pin' ? T.find(x => x.pid === LV.pin) : (T.find(x => x.speak && !x.me) || T.find(x => !x.me) || T[0]); main = '<div class="zl-mainv">' + tile(t, 'big') + '</div>'; }
        const strip = T.filter(t => !(mode === 'pin' && t.pid === LV.pin));
        html = '<div class="zl-pres">' + main + '<div class="zl-strip">' + strip.map(t => tile(t, 'sm')).join('') + '</div></div>';
      }
      S.innerHTML = html;
      if (mode === 'wb') bindWBZ();
      if (mode === 'present' && LV.scr && $('zl-scrw')) { $('zl-scrw').appendChild(LV.scv); LV.scv.srcObject = LV.scr; }
    }
    /* my camera in my tile (the element moves, the stream stays) */
    const mt = q1('.zl-tile.me .zl-vid'); if (mt) { if (LV.camOn && LV.cam) { if (LV.myv.parentNode !== mt) mt.prepend(LV.myv); if (LV.myv.srcObject !== LV.cam) LV.myv.srcObject = LV.cam; } else if (LV.myv.parentNode) LV.myv.remove(); }
    /* live states without rebuilding */
    const T2 = {}; tiles().forEach(t => T2[t.pid] = t);
    qa('.zl-tile', S).forEach(el => { const t = T2[el.dataset.pid]; if (!t) return; el.classList.toggle('speak', !!t.speak && !!t.mic); el.classList.toggle('hand', !!t.hand); el.classList.toggle('pinned', LV.pin === t.pid); const mi = el.querySelector('.zl-mic'); const want = t.mic ? (t.speak ? 'speak' : 'on') : 'off'; if (mi.dataset.s !== want) { mi.dataset.s = want; mi.innerHTML = t.mic ? (t.speak ? '<i class="zl-eq"><b></b><b></b><b></b></i>' : '') : I('micoff'); } });
  }
  function roomClick(e) {
    const pb = e.target.closest('[data-pin]'); if (pb) { LV.pin = LV.pin === pb.dataset.pin ? null : pb.dataset.pin; LV.sig = ''; drawStage(); return; }
    const pp = e.target.closest('[data-p]'); if (pp && pp.closest('.zl-br')) { const v = pp.dataset.p; LV.panel = LV.panel === v ? null : v; if (LV.panel === 'chat') LV.chatSeen = X.roomMsgs(rkInfo(LV.rk).room).length; LV.sig = ''; drawPanel(); drawBar(); drawStage(); return; }
    const pa = e.target.closest('[data-pa]'); if (pa) { panelAct(pa.dataset.pa, pa); return; }
    const b = e.target.closest('[data-l]'); if (!b) return; lact(b.dataset.l, b);
  }
  async function lact(a, b) {
    if (a === 'mic') { if (LV.micOn) micOff(); else await getMic(); }
    else if (a === 'cam') { if (LV.camOn) camOff(); else await getCam(); LV.sig = ''; }
    else if (a === 'hand') { LV.hand = !LV.hand; LV.handAt = LV.hand ? now() : 0; X.LIVE.hand = LV.hand; if (LV.hand) lcmd({ act: 'hand' }); say(LV.hand ? 'You raised your hand' : 'Hand lowered'); }
    else if (a === 'react') { reactPop(b); return; }
    else if (a === 'scr') { if (!LV.scr) { try { LV.scr = await navigator.mediaDevices.getDisplayMedia({ video: true }); X.LIVE.scr = LV.scr; LV.scr.getVideoTracks()[0].onended = () => { LV.scr = null; X.LIVE.scr = null; LV.sig = ''; drawStage(); drawBar(); lpost(); }; LV.wb = false; } catch (err) { say('Presenting was cancelled.'); } } else { LV.scr.getTracks().forEach(t => t.stop()); LV.scr = null; X.LIVE.scr = null; } LV.sig = ''; }
    else if (a === 'cc') { toggleCC(); }
    else if (a === 'more') { morePop(b); return; }
    else if (a === 'leave') { if (amHost(LV.rk) && Object.keys(livePeers()).length) { leavePop(b); return; } leaveCall(LV.page); return; }
    drawBar(); drawStage(); lpost();
  }
  function lpop(anchor, html, cls) { qa('.zl-pop').forEach(x => x.remove()); const p = document.createElement('div'); p.className = 'zl-pop ' + (cls || ''); p.innerHTML = html; $('zl-room').appendChild(p); const r = anchor.getBoundingClientRect(), W = window.innerWidth; p.style.left = Math.max(8, Math.min(W - p.offsetWidth - 8, r.left + r.width / 2 - p.offsetWidth / 2)) + 'px'; p.style.bottom = (window.innerHeight - r.top + 10) + 'px'; setTimeout(() => document.addEventListener('click', function cl(ev) { if (!p.contains(ev.target)) { p.remove(); document.removeEventListener('click', cl, true); } }, true), 0); return p; }
  function reactPop(b) { const p = lpop(b, ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔', '👎'].map(e => '<button type="button" data-e="' + e + '">' + e + '</button>').join(''), 'zl-reacts'); p.onclick = e => { const x = e.target.closest('[data-e]'); if (!x) return; floatReact(x.dataset.e, 'You'); lcmd({ act: 'react', e: x.dataset.e }); }; }
  function floatReact(e, name) { const F = $('zl-float'); if (!F) return; const s = document.createElement('span'); s.className = 'zl-fr'; s.style.left = (6 + Math.random() * 18) + '%'; s.innerHTML = '<i>' + e + '</i><small>' + h(name) + '</small>'; F.appendChild(s); setTimeout(() => s.remove(), 4200); }
  function morePop(b) {
    const host = amHost(LV.rk);
    const p = lpop(b, '<button type="button" data-m="wb">' + I('pen') + (LV.wb ? 'Close whiteboard' : 'Whiteboard') + '</button>' + (host ? '<button type="button" data-m="rec">' + I('rec') + (LV.rec ? 'Stop recording' : 'Record meeting') + '</button>' : '') +
      '<div class="zl-sub">Layout</div>' + [['auto', 'Auto'], ['tiled', 'Tiled'], ['spotlight', 'Spotlight']].map(l => '<button type="button" data-m="lay" data-v="' + l[0] + '" class="' + (LV.layout === l[0] ? 'on' : '') + '">' + I(l[0] === 'spotlight' ? 'max' : 'grid') + l[1] + (LV.layout === l[0] ? I('check', 'zl-ck') : '') + '</button>').join('') +
      '<button type="button" data-m="full">' + I('max') + 'Full screen</button><button type="button" data-m="act">' + I('poll') + 'Polls, quiz and Q&amp;A</button>', 'zl-menu');
    p.onclick = async e => { const x = e.target.closest('[data-m]'); if (!x) return; p.remove(); const v = x.dataset.m;
      if (v === 'wb') { setWB(!LV.wb, true); }
      else if (v === 'rec') { if (LV.rec) await stopRecording(); else startRecording(); }
      else if (v === 'lay') { LV.layout = x.dataset.v; LV.pin = null; LV.sig = ''; drawStage(); }
      else if (v === 'full') { G(() => document.fullscreenElement ? document.exitFullscreen() : $('zl-room').requestFullscreen()); }
      else if (v === 'act') { LV.panel = 'act'; drawPanel(); drawBar(); LV.sig = ''; drawStage(); } };
  }
  function leavePop(b) { const p = lpop(b, '<button type="button" data-v="leave">' + I('leave') + 'Leave the call<small>The class continues for the others</small></button><button type="button" data-v="end" class="bad">' + I('phoneoff') + 'End the class for everyone<small>Saves attendance and posts the summary</small></button>', 'zl-menu zl-lv'); p.onclick = e => { const x = e.target.closest('[data-v]'); if (!x) return; p.remove(); if (x.dataset.v === 'end') endForAll(LV.page); else leaveCall(LV.page); }; }
  function setWB(on, broadcast) { LV.wb = on; if (on && LV.scr) { LV.scr.getTracks().forEach(t => t.stop()); LV.scr = null; } const L = D().live[LV.rk]; if (broadcast && amHost(LV.rk) && L) { L.wb = on; X.save(true); lcmd({ act: 'wb', on }); } LV.sig = ''; drawStage(); drawBar(); }
  function bindWBZ() {
    const c = $('zl-wb'); if (!c) return; const x = c.getContext('2d'), rk = LV.rk; let drawing = null; const cols = ['#111a2e', '#c0392b', '#1f6fd6', '#16935f', '#b8860b'];
    let pen = cols[LV.penI || 0];
    const draw = s => { x.strokeStyle = s.c === 'erase' ? '#ffffff' : s.c; x.lineWidth = s.c === 'erase' ? 30 : 4; x.lineCap = x.lineJoin = 'round'; x.beginPath(); s.p.forEach((pt, i) => i ? x.lineTo(pt[0], pt[1]) : x.moveTo(pt[0], pt[1])); x.stroke(); };
    const redraw = () => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#e8ebf1'; for (let gx = 40; gx < 1280; gx += 40) for (let gy = 40; gy < 720; gy += 40) x.fillRect(gx, gy, 2, 2); (D().wb[rk] || []).forEach(draw); };
    redraw(); LV.wbRedraw = redraw;
    const pos = e => { const r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * c.width), Math.round((e.clientY - r.top) / r.height * c.height)]; };
    c.onpointerdown = e => { c.setPointerCapture(e.pointerId); drawing = { c: pen, p: [pos(e)] }; };
    c.onpointermove = e => { if (!drawing) return; drawing.p.push(pos(e)); draw({ c: drawing.c, p: drawing.p.slice(-2) }); };
    c.onpointerup = () => { if (!drawing) return; const d = D(); d.wb[rk] = (d.wb[rk] || []).concat([drawing]).slice(-500); X.post({ t: 'zwb', rk, s: drawing }); X.save(true); drawing = null; };
    c.parentElement.querySelector('.zl-wbbar').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const v = b.dataset.c; if (v === 'clear') { D().wb[rk] = []; X.save(true); X.post({ t: 'zwbclear', rk }); redraw(); return; } if (v === 'close') { setWB(false, true); return; } pen = v; if (v !== 'erase') LV.penI = cols.indexOf(v); qa('[data-c]', b.parentElement).forEach(y => y.classList.toggle('on', y === b)); };
  }

  /* ---------------------------------------------------------------- side panels */
  function drawPanel() {
    const P = $('zl-panel'); if (!P) return; const v = LV.panel; P.hidden = !v; if (!v) return;
    const i = rkInfo(LV.rk), m = me(), host = amHost(LV.rk), d = D(), L = d.live[LV.rk] || {};
    const keepIn = document.activeElement && P.contains(document.activeElement) && document.activeElement.id; const keepVal = keepIn && $(keepIn) ? $(keepIn).value : null;
    const head = t => '<header><b>' + t + '</b><button type="button" class="zl-ib" data-pa="close" aria-label="Close panel">' + I('x') + '</button></header>';
    let html = '';
    if (v === 'people' || v === 'host') {
      const T = tiles(), inIds = T.map(t => t.pid), hands = T.filter(t => t.hand).sort((a, b) => (a.handAt || 0) - (b.handAt || 0));
      const notIn = i.roster.filter(p => !inIds.includes(p));
      html = head(v === 'host' ? 'Host controls' : 'People') + '<div class="zl-pb">' + (host ? '<div class="zl-hacts"><button type="button" class="zl-btn s" data-pa="muteall">' + I('micoff') + 'Mute everyone</button><button type="button" class="zl-btn s" data-pa="lowerall">' + I('hand') + 'Lower all hands</button></div>' : '') +
        (hands.length ? '<h6>Raised hands · ' + hands.length + '</h6>' + hands.map((t, j) => '<div class="zl-pr hand">' + av(t.pid, 32) + '<span><b>' + (j + 1) + '. ' + h(t.me ? 'You' : t.name) + '</b><small>' + (t.handAt ? 'raised at ' + tm(t.handAt) : '') + '</small></span>' + (host || t.me ? '<button type="button" class="zl-ib" data-pa="lower" data-pid="' + h(t.pid) + '" title="Lower hand" aria-label="Lower hand">' + I('hand') + '</button>' : '') + '</div>').join('') : '') +
        '<h6>In the call · ' + T.length + '</h6>' + T.map(t => '<div class="zl-pr">' + av(t.pid, 32) + '<span><b>' + h(t.me ? t.name + ' (You)' : t.name) + '</b><small>' + (t.host ? 'Host · ' : '') + h(prole(t.pid) || t.role || '') + (t.hand ? ' · ✋' : '') + '</small></span><i class="zl-ms">' + I(t.mic ? 'mic' : 'micoff') + '</i>' + (host && !t.me ? (t.mic ? '<button type="button" class="zl-mute" data-pa="mute" data-pid="' + h(t.pid) + '" aria-label="Mute ' + h(t.name) + '">Mute</button>' : '') + '<button type="button" class="zl-ib bad" data-pa="kick" data-pid="' + h(t.pid) + '" title="Remove from the call" aria-label="Remove ' + h(t.name) + '">' + I('leave') + '</button>' : '') + '</div>').join('') +
        (notIn.length ? '<h6>Not joined yet · ' + notIn.length + '</h6>' + notIn.map(p => '<div class="zl-pr dim">' + av(p, 32) + '<span><b>' + h(pname(p)) + '</b><small>' + h(prole(p)) + (X.online(p) ? ' · online in the app' : '') + '</small></span>' + (host ? '<button type="button" class="zl-btn s" data-pa="ask" data-pid="' + h(p) + '">Ask to join</button>' : '') + '</div>').join('') : '') + '</div>';
    } else if (v === 'chat') {
      const ms = X.roomMsgs(i.room).slice(-60);
      html = head('In-call messages') + '<p class="zl-pnote">' + I('chat') + 'This is the ' + (i.kind === 'group' ? 'class group chat — everyone in the group sees these messages, also after the class.' : 'private chat between you.') + '</p><div class="zl-chat" id="zl-chat">' + ms.map(x => { const rep = x.reply && d.msgs.find(y => y.id === x.reply); return x.kind === 'sys' ? '<div class="zl-cs">' + h(x.text) + '</div>' : '<div class="zl-cm' + (x.by === m.pid ? ' me' : '') + '" data-id="' + x.id + '"><div class="zl-cmh"><b class="' + ncol(x.by) + '">' + h(x.by === m.pid ? 'You' : x.by === 'U:office' ? 'Office' : first(x.name)) + '</b><time>' + tm(x.at) + '</time><button type="button" class="zl-ib s" data-pa="creply" data-id="' + x.id + '" title="Reply" aria-label="Reply">' + I('reply') + '</button></div>' + (rep ? '<div class="zl-cq">' + h(first(rep.name)) + ': ' + h(String(preview(rep)).slice(0, 60)) + '</div>' : '') + '<p>' + (x.deleted ? '<i>Message deleted</i>' : h(String(preview(x) || '').slice(0, 400))) + '</p></div>'; }).join('') + '</div>' +
        (LV.reply ? '<div class="zl-crp">' + I('reply') + 'Replying to ' + h(first((d.msgs.find(y => y.id === LV.reply) || {}).name)) + '<button type="button" class="zl-ib s" data-pa="cnoreply" aria-label="Cancel reply">' + I('x') + '</button></div>' : '') + '<div class="zl-cin"><input id="zl-cin" placeholder="Send a message" aria-label="Send a message to everyone"><button type="button" class="zl-ib" data-pa="csend" aria-label="Send">' + I('send') + '</button></div>';
    } else if (v === 'act') {
      const polls = (d.polls[LV.rk] || []).slice().reverse(), qs = (d.qa[LV.rk] || []).slice().sort((a, b) => (a.done - b.done) || (b.up.length - a.up.length) || a.at - b.at);
      html = head('Activities') + '<div class="zl-pb"><button type="button" class="zl-acti" data-pa="wb">' + I('pen') + '<span><b>Whiteboard</b><small>' + (LV.wb ? 'Open for everyone · tap to close' : 'Draw together; everyone sees it live') + '</small></span></button>' + (host ? '<button type="button" class="zl-acti" data-pa="rec">' + I('rec') + '<span><b>' + (LV.rec ? 'Stop recording' : 'Recording') + '</b><small>Saved to Recordings and the class chat</small></span></button>' : '') +
        '<h6>' + I('poll') + 'Polls &amp; quick quiz</h6>' + (host ? '<div class="zl-pform"><input id="zl-pq" placeholder="Ask a question…" aria-label="Poll question"><input id="zl-po" placeholder="Options, separated by commas" aria-label="Poll options" value="Yes, No"><label class="zl-chk"><input type="checkbox" id="zl-pquiz"> Quiz: first option is the right answer</label><button type="button" class="zl-btn s p" data-pa="pnew">Launch</button></div>' : '') +
        (polls.map(pl => { const tot = Object.keys(pl.votes).length, mine = pl.votes[m.pid]; return '<div class="zl-poll' + (pl.open ? '' : ' closed') + '"><b>' + (pl.quiz ? 'Quiz · ' : '') + h(pl.q) + '</b>' + pl.opts.map((o, j) => { const n = Object.values(pl.votes).filter(v2 => v2 === j).length, pc = tot ? Math.round(n / tot * 100) : 0, show = !pl.open || host || mine != null; return '<button type="button" class="zl-opt' + (mine === j ? ' mine' : '') + (pl.quiz && !pl.open && j === 0 ? ' right' : '') + '" data-pa="vote" data-pl="' + pl.id + '" data-j="' + j + '"' + (pl.open ? '' : ' disabled') + '><span class="zl-ob" style="width:' + (show ? pc : 0) + '%"></span><span>' + h(o) + '</span>' + (show ? '<em>' + pc + '%</em>' : '') + '</button>'; }).join('') + '<small>' + tot + ' vote' + (tot === 1 ? '' : 's') + (pl.open ? '' : ' · closed') + '</small>' + (host && pl.open ? '<button type="button" class="zl-btn s" data-pa="pclose" data-pl="' + pl.id + '">' + (pl.quiz ? 'Reveal answer' : 'End poll') + '</button>' : '') + '</div>'; }).join('') || '<p class="zc-muted">No polls yet.' + (host ? '' : ' Your mentor can start one.') + '</p>') +
        '<h6>' + I('qa') + 'Questions (Q&amp;A)</h6><div class="zl-pform"><input id="zl-qq" placeholder="Ask a question…" aria-label="Ask a question"><button type="button" class="zl-btn s" data-pa="qnew">Ask</button></div>' +
        (qs.map(qq => '<div class="zl-q' + (qq.done ? ' done' : '') + '"><button type="button" class="zl-up' + (qq.up.includes(m.pid) ? ' mine' : '') + '" data-pa="qup" data-q="' + qq.id + '" aria-label="Upvote">' + I('up') + '<b>' + qq.up.length + '</b></button><span><b>' + h(qq.text) + '</b><small>' + h(first(qq.name)) + ' · ' + tm(qq.at) + (qq.done ? ' · answered' : '') + '</small></span>' + (host && !qq.done ? '<button type="button" class="zl-ib" data-pa="qdone" data-q="' + qq.id + '" title="Mark answered" aria-label="Mark answered">' + I('check') + '</button>' : '') + '</div>').join('') || '<p class="zc-muted">No questions yet.</p>') + '</div>';
    } else if (v === 'info') {
      html = head('Meeting details') + '<div class="zl-pb"><h6>Class</h6><p><b>' + h(i.name) + '</b><br>' + h(L.title || '') + '</p><p class="zc-muted">Started by ' + h(pname(L.by)) + ' at ' + tm(L.at || now()) + (i.mentor ? ' · mentor ' + h(pname(i.mentor)) : '') + '</p><h6>Joining</h6><p class="zc-muted">Everyone in the ' + (i.kind === 'group' ? 'class group' : 'chat') + ' got a notification and a Join card in the chat. The Live Class page and today’s routine show “Join live” too.</p><h6>When the class ends</h6><ul class="zl-ul"><li>Attendance is saved for ' + h(TODAY_()) + ' (joined = present)</li><li>A summary is posted in the class chat</li><li>The recording goes to Recordings, the chat and each student’s profile</li><li>Students who missed it get a notification</li></ul><h6>About video in this demo</h6><p class="zc-muted">Your own camera, microphone level, screen sharing and recording work here. Other people join from another browser tab and appear with their picture, microphone, hand and reactions. On the live site their video and sound go through LiveKit.</p></div>';
    }
    P.innerHTML = html;
    if (v === 'chat') { const c = $('zl-chat'); c.scrollTop = c.scrollHeight; const inp = $('zl-cin'); inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); panelAct('csend'); } }; }
    if (keepIn && $(keepIn)) { $(keepIn).value = keepVal; $(keepIn).focus(); }
  }
  function panelAct(a, b) {
    const d = D(), m = me(), rk = LV.rk, i = rkInfo(rk), pid = b && b.dataset.pid;
    if (a === 'close') { LV.panel = null; LV.sig = ''; drawPanel(); drawBar(); drawStage(); return; }
    if (a === 'mute') { lcmd({ act: 'mute', to: pid }); say(first(pname(pid)) + ' was muted'); }
    else if (a === 'kick') { lcmd({ act: 'kick', to: pid }); delete LV.peers[pid]; say(first(pname(pid)) + ' was removed from the call'); }
    else if (a === 'lower') { if (pid === m.pid) { LV.hand = false; X.LIVE.hand = false; lpost(); } else lcmd({ act: 'lower', to: pid }); }
    else if (a === 'muteall') { lcmd({ act: 'mute', to: '*' }); say('Everyone else was muted'); }
    else if (a === 'lowerall') { lcmd({ act: 'lower', to: '*' }); LV.hand = false; lpost(); say('All hands lowered'); }
    else if (a === 'ask') { notify([pid], { kind: 'live', icon: 'video', t: pname(m.pid) + ' is asking you to join', d: (d.live[rk] || {}).title || i.name, act: { live: rk }, btn: 'Join' }); X.save(); say('Asked ' + first(pname(pid)) + ' to join'); return; }
    else if (a === 'creply') { LV.reply = b.dataset.id; drawPanel(); $('zl-cin') && $('zl-cin').focus(); return; }
    else if (a === 'cnoreply') { LV.reply = null; drawPanel(); return; }
    else if (a === 'csend') { const inp = $('zl-cin'), t = inp && inp.value.trim(); if (!t) return; const r = roomOf(i.room), by = m.office && r.members.includes('U:office') ? 'U:office' : m.pid; const ms = addMsg(i.room, by, { text: t, reply: LV.reply || undefined, inCall: true, mentions: mentionsIn(t, r).filter(p => p !== m.pid) }); if (ms.mentions.length) notify(ms.mentions, { kind: 'mention', icon: 'at', t: m.name + ' mentioned you', d: t.slice(0, 90), act: { room: i.room, mid: ms.id } }); LV.reply = null; inp.value = ''; LV.chatSeen = X.roomMsgs(i.room).length + 1; commit(ms); LV.chatSeen = X.roomMsgs(i.room).length; drawPanel(); return; }
    else if (a === 'wb') { setWB(!LV.wb, true); }
    else if (a === 'rec') { if (LV.rec) stopRecording(); else startRecording(); }
    else if (a === 'pnew') { const q = $('zl-pq').value.trim(), opts = $('zl-po').value.split(',').map(s => s.trim()).filter(Boolean); if (!q || opts.length < 2) { say('Write a question and at least two options'); return; } (d.polls[rk] = d.polls[rk] || []).push({ id: X.uid('P'), q, opts: opts.slice(0, 6), votes: {}, open: true, quiz: $('zl-pquiz').checked, by: m.pid, at: now() }); X.save(); lcmd({ act: 'poll', q }); }
    else if (a === 'vote') { const pl = (d.polls[rk] || []).find(x => x.id === b.dataset.pl); if (!pl || !pl.open) return; pl.votes[m.pid] = +b.dataset.j; X.save(); }
    else if (a === 'pclose') { const pl = (d.polls[rk] || []).find(x => x.id === b.dataset.pl); if (pl) { pl.open = false; X.save(); } }
    else if (a === 'qnew') { const t = $('zl-qq').value.trim(); if (!t) return; (d.qa[rk] = d.qa[rk] || []).push({ id: X.uid('Q'), by: m.pid, name: m.name, text: t, at: now(), up: [], done: false }); X.save(); lcmd({ act: 'qa', text: t }); }
    else if (a === 'qup') { const qq = (d.qa[rk] || []).find(x => x.id === b.dataset.q); if (qq) { const j = qq.up.indexOf(m.pid); if (j > -1) qq.up.splice(j, 1); else qq.up.push(m.pid); X.save(); } }
    else if (a === 'qdone') { const qq = (d.qa[rk] || []).find(x => x.id === b.dataset.q); if (qq) { qq.done = true; X.save(); } }
    drawPanel(); drawBar(); drawStage();
  }

  /* ---------------------------------------------------------------- captions */
  function toggleCC() {
    if (LV.cc) { stopCC(); LV.cc = false; $('zl-cc').hidden = true; drawBar(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    LV.cc = true; $('zl-cc').hidden = false;
    if (!SR) { ccShow('Captions', 'This browser cannot turn speech into text here. Chrome and Edge can; on the live site captions run for everyone.'); return; }
    if (!LV.micOn) ccShow('Captions', 'Turn on your microphone — what you say appears here for everyone.');
    try { const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-GB'; r.onresult = ev => { let t = ''; for (let k = ev.resultIndex; k < ev.results.length; k++) t += ev.results[k][0].transcript; t = t.trim(); if (!t) return; ccShow('You', t); lcmd({ act: 'cc', text: t }); }; r.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') ccShow('Captions', 'Speech recognition is not allowed in this browser window.'); }; r.onend = () => { if (LV.cc && LV.recog === r) G(() => r.start()); }; r.start(); LV.recog = r; } catch (e) { ccShow('Captions', 'Captions could not start here.'); }
  }
  function stopCC() { if (LV.recog) { const r = LV.recog; LV.recog = null; G(() => r.stop()); } }
  function ccShow(name, text) { const c = $('zl-cc'); if (!c) return; LV.ccLines[name] = { text, at: now() }; c.hidden = !LV.cc; c.innerHTML = Object.entries(LV.ccLines).filter(([n, v]) => now() - v.at < 6000).slice(-2).map(([n, v]) => '<p><b>' + h(n) + '</b>' + h(v.text.slice(-160)) + '</p>').join(''); }

  /* ---------------------------------------------------------------- recording (a picture of the meeting + your sound) */
  function startRecording() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { say('This browser cannot record here. On the live site LiveKit records the class.'); return; }
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const x = cv.getContext('2d'), i = rkInfo(LV.rk);
    const paint = () => {
      if (!LV.rec) return; x.fillStyle = '#16181d'; x.fillRect(0, 0, 1280, 720);
      const wb = $('zl-wb'); if (LV.wb && wb) x.drawImage(wb, 0, 0, 1280, 720);
      else if (LV.scr && LV.scv.readyState >= 2) x.drawImage(LV.scv, 0, 0, 1280, 720);
      else { const T = tiles(), n = T.length, c = n <= 1 ? 1 : n <= 4 ? 2 : 3, r = Math.ceil(n / c), w = 1280 / c, hh = 660 / r;
        T.forEach((t, j) => { const cx = (j % c) * w, cy = Math.floor(j / c) * hh; x.fillStyle = '#23262e'; x.fillRect(cx + 6, cy + 6, w - 12, hh - 12); if (t.me && LV.camOn && LV.myv.readyState >= 2) x.drawImage(LV.myv, cx + 6, cy + 6, w - 12, hh - 12); else { x.fillStyle = '#3a3f4b'; x.beginPath(); x.arc(cx + w / 2, cy + hh / 2, Math.min(w, hh) / 6, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '600 ' + Math.round(Math.min(w, hh) / 8) + 'px Manrope,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(initials(t.name), cx + w / 2, cy + hh / 2); } x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = '600 18px Manrope,sans-serif'; x.fillStyle = '#fff'; x.fillText(t.me ? 'You' : t.name, cx + 18, cy + hh - 20); if (t.speak) { x.strokeStyle = '#8ab4f8'; x.lineWidth = 4; x.strokeRect(cx + 8, cy + 8, w - 16, hh - 16); } }); }
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 670, 1280, 50); x.fillStyle = '#e8cc8c'; x.font = '600 18px Manrope,sans-serif'; x.fillText('FTA · ' + (i ? i.name : '') + ' · ' + new Date().toLocaleTimeString('en-GB'), 20, 702);
    };
    const st = cv.captureStream(12); if (LV.mic && LV.micOn) LV.mic.getAudioTracks().forEach(t => st.addTrack(t));
    let rec; try { rec = new MediaRecorder(st); } catch (e) { say('Recording could not start here.'); return; }
    LV.rec = rec; LV.recT = now(); LV.recChunks = []; LV.recIv = setInterval(paint, 90); paint();
    rec.ondataavailable = ev => ev.data && ev.data.size && LV.recChunks.push(ev.data);
    rec.start(1000); const L = D().live[LV.rk]; if (L) { L.rec = now(); X.save(true); }
    lcmd({ act: 'rec', on: true }); say('Recording started · everyone sees REC'); drawBar(); lpost(); if (LV.panel === 'act') drawPanel();
  }
  function stopRecording() {
    return new Promise(res => {
      const rec = LV.rec; if (!rec) return res(null); const i = rkInfo(LV.rk), L = D().live[LV.rk] || {}, m = me(), t0 = LV.recT;
      rec.onstop = () => {
        clearInterval(LV.recIv); const bl = new Blob(LV.recChunks, { type: rec.mimeType || 'video/webm' }), dur = Math.max(1, Math.round((now() - t0) / 1000)), id = X.uid('R');
        X.BLOBS[id] = URL.createObjectURL(bl);
        const d = D(); const present = i && i.kind === 'group' ? i.students.filter(s => LV.seen.has(s)).length : null;
        d.recs.unshift({ id, gid: i && i.gid || null, rk: LV.rk, sid: L.sid, title: (L.title || (i ? i.name : 'Live class')), at: t0, dur, by: m.pid, size: Math.max(1, Math.round(bl.size / 1024)) + ' KB', tab: X.TAB });
        if (d.live[LV.rk]) { d.live[LV.rk].lastRec = id; delete d.live[LV.rk].rec; }
        if (i) { const by = m.office && roomOf(i.room).members.includes('U:office') ? 'U:office' : m.pid; const card = addMsg(i.room, by, { kind: 'card', card: { type: 'rec', recId: id, title: L.title || i.name, dur, present } }); notify(i.roster.filter(p => p !== m.pid), { kind: 'rec', icon: 'film', t: 'Recording ready · ' + i.name, d: (L.title || '') + ' · ' + mmss(dur), act: { rec: id }, btn: 'Watch' }); X.save(); X.post({ t: 'msg', room: i.room, id: card.id }); }
        G(() => log('Live class recorded', (i ? i.name : '') + ' · ' + (L.title || ''), mmss(dur)));
        LV.rec = null; lcmd({ act: 'rec', on: false }); say('Recording saved to Recordings and the chat'); drawBar(); lpost(); if (LV.panel === 'act') drawPanel(); res(id);
      };
      G(() => rec.stop());
    });
  }

  /* ---------------------------------------------------------------- messages from the other tabs */
  function remoteEnded(kicked) {
    if (LV.phase !== 'call') return; const rk = LV.rk;
    const sess = D().liveLog.find(s => s.rk === rk && s.end >= LV.joinedAt - 1000);
    stopMedia(); clearInterval(LV.tick); X.LIVE.gid = null; unroom();
    LV.ended = Object.assign({ rk, kicked: !!kicked }, sess || { rk, title: (rkInfo(rk) || {}).name }); if (kicked) delete LV.ended.present;
    LV.phase = 'ended'; X.force(); endedView(LV.page || pref() + 'live');
  }
  X.LISTEN.push(msg => {
    const m = me();
    if (msg.t === 'lvs' && msg.rk === LV.rk && LV.phase === 'call') { const was = LV.peers[msg.pid]; LV.peers[msg.pid] = Object.assign({}, msg, { at: now() }); LV.seen.add(msg.pid); if (!was) { LV.sig = ''; drawStage(); drawBar(); if (LV.panel === 'people') drawPanel(); } else if (was.speak !== msg.speak || was.mic !== msg.mic || was.hand !== msg.hand || was.scr !== msg.scr || was.cam !== msg.cam || was.wb !== msg.wb) { if (was.scr !== msg.scr || was.cam !== msg.cam) LV.sig = ''; if (msg.host && was.wb !== msg.wb && msg.wb !== LV.wb) setWB(!!msg.wb, false); drawStage(); if (LV.panel === 'people') drawPanel(); } }
    if (msg.t === 'lvbye' && msg.rk === LV.rk) { delete LV.peers[msg.pid]; LV.sig = ''; drawStage(); drawBar(); }
    if (msg.t === 'zwb' && msg.rk === LV.rk) { const d = D(); d.wb[msg.rk] = (d.wb[msg.rk] || []).concat([msg.s]); LV.wbRedraw && $('zl-wb') && LV.wbRedraw(); }
    if (msg.t === 'zwbclear' && msg.rk === LV.rk) { D().wb[msg.rk] = []; LV.wbRedraw && $('zl-wb') && LV.wbRedraw(); }
    if (msg.t === 'livestart') { if ($('zl-list') || q1('.zl-list') || q1('.zl-lobby')) { if (LV.phase === 'lobby') { X.force(); lobbyView(LV.page); } else if (!LV.phase && LV.page && ST.page === LV.page) { X.force(); listView(LV.page); } } decorate(); }
    if (msg.t !== 'lvc' || msg.rk !== LV.rk || LV.phase !== 'call') return;
    const toMe = msg.to === '*' || msg.to === m.pid;
    if (msg.act === 'react') floatReact(msg.e, first(msg.name));
    else if (msg.act === 'hand') { if (amHost(LV.rk)) ztoast(first(msg.name) + ' raised a hand', 'Open People to see the queue', () => { LV.panel = 'people'; drawPanel(); drawBar(); }, 'People', 'hand'); }
    else if (msg.act === 'mute' && toMe && msg.from !== m.pid) { micOff(); drawBar(); drawStage(); lpost(); say('The host muted you'); }
    else if (msg.act === 'lower' && toMe) { LV.hand = false; X.LIVE.hand = false; drawBar(); drawStage(); lpost(); if (msg.to === m.pid) say('The host lowered your hand'); }
    else if (msg.act === 'kick' && msg.to === m.pid) { X.post({ t: 'lvbye', rk: LV.rk, pid: m.pid }); remoteEnded(true); }
    else if (msg.act === 'end') { setTimeout(() => remoteEnded(false), 600); }
    else if (msg.act === 'wb') setWB(!!msg.on, false);
    else if (msg.act === 'cc') { if (LV.cc) ccShow(first(msg.name), msg.text); }
    else if (msg.act === 'poll') { if (LV.panel !== 'act') ztoast(first(msg.name) + ' started a poll', msg.q, () => { LV.panel = 'act'; drawPanel(); drawBar(); LV.sig = ''; drawStage(); }, 'Vote', 'poll'); }
    else if (msg.act === 'qa') { if (amHost(LV.rk) && LV.panel !== 'act') ztoast('New question from ' + first(msg.name), msg.text, () => { LV.panel = 'act'; drawPanel(); drawBar(); }, 'Q&A', 'qa'); }
    else if (msg.act === 'rec') { say(msg.on ? first(msg.name) + ' started recording' : 'Recording stopped'); }
  });
  /* chat bubble pop-up inside the room when the panel is closed */
  function liveChatPing() {
    if (LV.phase !== 'call') return; const i = rkInfo(LV.rk); if (!i) return; const ms = X.roomMsgs(i.room);
    if (LV.panel === 'chat') { LV.chatSeen = ms.length; drawPanel(); return; }
    const last = ms[ms.length - 1]; drawBar();
    if (last && ms.length > LV.chatSeen && last.by !== me().pid && last.kind !== 'sys' && now() - last.at < 8000) { const c = $('zl-cpop'); if (c) { c.hidden = false; c.innerHTML = '<b>' + h(first(last.name)) + '</b>' + h(String(preview(last)).slice(0, 90)); clearTimeout(LV.cpT); LV.cpT = setTimeout(() => { c.hidden = true; }, 5000); c.onclick = () => { c.hidden = true; LV.panel = 'chat'; LV.chatSeen = ms.length; drawPanel(); drawBar(); LV.sig = ''; drawStage(); }; } }
  }
  X.OVR.live = pageLiveZ;
  /* keyboard shortcuts like Meet */
  document.addEventListener('keydown', e => { if (LV.phase !== 'call' || !(e.ctrlKey || e.metaKey)) return; if (e.key === 'd' || e.key === 'D') { e.preventDefault(); lact('mic'); } if (e.key === 'e' || e.key === 'E') { e.preventDefault(); lact('cam'); } });
  window.addEventListener('resize', () => { if (LV.phase === 'call') { LV.sig = ''; drawStage(); } });
