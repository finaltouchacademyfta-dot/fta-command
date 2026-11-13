/* =====================================================================
   FTA · ZZ3 CONNECT LAYER (demo only — not part of the live app)
   · Messages that work like a WhatsApp group (reply from every role, swipe to
     reply, reactions, @mentions, pins, stars, message info, forward, search…)
   · Live Class that works like Google Meet (lobby, adaptive grid, present,
     reactions, captions, hand, people / chat / activities panels, record)
   · Every feature connected: live class → attendance + chat + recordings +
     notifications; homework / notices / exams / marks / payments → chat;
     profiles → message / call / watch; AI assistant can read it all.
   Uses the internals of demo-proposals.js (window.FTA_DEMO_CONNECT.X).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.FTA_DEMO_CONNECT && window.FTA_DEMO_CONNECT.X;
  if (!X) return;
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const h = X.h, $ = id => document.getElementById(id), now = () => Date.now();
  const q1 = (s, r) => (r || document).querySelector(s), qa = (s, r) => [...(r || document).querySelectorAll(s)];
  const say = t => G(() => toast(t));
  const tm = X.tm, mmss = X.mmss, initials = X.initials;
  const D = () => { const d = X.db(); ['pins', 'stars', 'hide', 'mute', 'att', 'posted', 'polls', 'qa', 'readT', 'live', 'wb'].forEach(k => { if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {}; }); ['notes', 'liveLog', 'msgs', 'recs', 'wt', 'wtn'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; }); return d; };
  const me = () => X.me();
  const isOffice = () => !!me().office;
  const pref = () => { const k = X.kindOf(me().role); return k === 't' ? 'tp-' : k === 's' ? 'sp-' : 'cx-'; };
  const TODAY_ = () => G(() => TODAY) || new Date().toISOString().slice(0, 10);
  const dayLabel = t => { const d = new Date(t), td = new Date(), y = new Date(td.getTime() - 86400000); if (d.toDateString() === td.toDateString()) return 'Today'; if (d.toDateString() === y.toDateString()) return 'Yesterday'; if (td - d < 6 * 86400000) return d.toLocaleDateString('en-GB', { weekday: 'long' }); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const shortDay = t => { const d = new Date(t), td = new Date(); if (d.toDateString() === td.toDateString()) return tm(t); if (td - d < 86400000 * 2 && td.getDate() !== d.getDate() && td - d < 86400000 * 2) return 'Yesterday'; return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const money = n => G(() => window.money(n)) || 'BDT ' + Number(n || 0).toLocaleString('en-IN');
  const grp = id => X.groups().find(g => g.id === id) || G(() => SCH.GROUPS.find(g => g.id === id));
  const hash = s => { let x = 0; s = String(s); for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); };
  const ncol = pid => 'zc-n' + (hash(pid) % 8);
  const pname = X.pname, prole = X.prole;
  const first = n => String(n || '').split(' ')[0];

  /* ---------------------------------------------------------------- icons (1.75 stroke line icons) */
  const IP = {
    reply: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v4"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.2 2 3.5 2 3.5-2 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    chev: '<path d="M6 9l6 6 6-6"/>', chevu: '<path d="M18 15l-6-6-6 6"/>', chevr: '<path d="M9 6l6 6-6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    fwd: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0-6 6v4"/>',
    pin: '<path d="M9 4h6l-1 6 4 4H6l4-4z"/><path d="M12 14v6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    videooff: '<path d="M3 3l18 18"/><path d="M16 16v0a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 15.5v-7A2.5 2.5 0 0 1 5.5 6H6M10 6h3.5A2.5 2.5 0 0 1 16 8.5V12l5-3v8"/>',
    tv: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M10 8l5 2.5-5 2.5z"/><path d="M8 21h8"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    micoff: '<path d="M3 3l18 18"/><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 10V6a3 3 0 0 0-5.7-1.3"/><path d="M5 11a7 7 0 0 0 11.3 5.5M19 11a7 7 0 0 1-.6 2.8M12 18v3"/>',
    clip: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.7-3.4 3-5.2 6-5.2s5.3 1.8 6 5.2"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.4.2 4 1.8 4.5 4.8"/>',
    belloff: '<path d="M3 3l18 18"/><path d="M8.5 4.8A6 6 0 0 1 18 10v3l2 3H8M6 10v3l-2 3h4"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    bell: '<path d="M6 10a6 6 0 0 1 12 0v3l2 3H4l2-3z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5v-6a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L2.8 15.6a1.6 1.6 0 0 1 2.4-2.1L8 16"/>',
    cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.5 2.5 0 1 0 0 3.6M17 10.2a2.5 2.5 0 1 0 0 3.6"/>',
    present: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 14V8M9 10.5L12 7.5l3 3M8 21h8M12 17v4"/>',
    dots: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    phoneoff: '<path d="M3.5 14.5c4.8-4.6 12.2-4.6 17 0l-2.2 2.6-3.6-1.4v-2.6a12 12 0 0 0-5.4 0v2.6l-3.6 1.4z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    shapes: '<circle cx="7.5" cy="7.5" r="3.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 3l3.5 6h-7zM4 14h7v6H4z" opacity=".001"/><path d="M16.5 3.5l3.2 5.5h-6.4z"/><path d="M4.5 14.5l3 5.5 3-5.5z"/>',
    pen: '<path d="M3 21l3.8-1 11.4-11.4a2 2 0 0 0 0-2.8l-1-1a2 2 0 0 0-2.8 0L3 16.2z"/><path d="M13.5 6.5l4 4"/>',
    rec: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    poll: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    qa: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01"/>',
    up: '<path d="M7 11l5-5 5 5M12 6v13"/>',
    max: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    play: '<path d="M8 5v14l11-7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h8"/>',
    mega: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7.5 21l4.5-2.5 4.5 2.5-1.5-7.5"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12.5h2M3 9h15a3 3 0 0 0-3-3H6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
    at: '<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    leave: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>'
  };
  const I = (n, cls) => '<svg class="zi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IP[n] || '') + '</svg>';

  /* ---------------------------------------------------------------- avatars */
  function av(pid, size, extra) {
    const r = /^(MEN|STU)-/.test(pid) ? X.personRec(pid) : null, n = pname(pid);
    const inner = r && r.photo ? '<img src="' + h(r.photo) + '" alt="">' : pid === 'U:office' ? I('shield') : '<span>' + h(initials(n)) + '</span>';
    return '<span class="zc-av ' + ncol(pid) + (size ? ' s' + size : '') + '"' + (extra || '') + '>' + inner + '</span>';
  }
  const gav = (g, size) => '<span class="zc-av zc-gav' + (size ? ' s' + size : '') + '">' + I('users') + '</span>';

  /* ---------------------------------------------------------------- toasts with an action, and notifications */
  function ztoast(title, body, act, actLabel, icon) {
    let box = $('zc-toasts'); if (!box) { box = document.createElement('div'); box.id = 'zc-toasts'; box.setAttribute('data-notx', ''); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'zc-toast';
    t.innerHTML = '<span class="zc-ti">' + I(icon || 'bell') + '</span><div><b>' + h(title) + '</b>' + (body ? '<small>' + h(body) + '</small>' : '') + '</div>' + (act ? '<button type="button" class="zc-tb">' + h(actLabel || 'Open') + '</button>' : '') + '<button type="button" class="zc-tclose" aria-label="Dismiss">' + I('x') + '</button>';
    t.onclick = e => { if (e.target.closest('.zc-tb')) { G(act); t.remove(); } else if (e.target.closest('.zc-tclose')) t.remove(); };
    box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, act ? 9000 : 5000);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') G(() => new Notification(title, { body: body || '' }));
  }
  /* a notification for some people: shown in their bell list and as a toast in their tab */
  function notify(to, n) {
    const d = D(); to = [...new Set([].concat(to || []))].filter(Boolean); if (!to.length) return;
    d.notes.unshift(Object.assign({ id: X.uid('N'), to, at: now(), read: [] }, n)); d.notes = d.notes.slice(0, 250);
  }
  const forMe = n => { const m = me(); return n.to.includes(m.pid) || (m.office && n.to.includes('U:office')); };
  const myNotes = () => D().notes.filter(forMe);
  const SEEN_NOTES = new Set();
  function toastNewNotes() {
    const m = me(); if (!m.pid) return;
    myNotes().forEach(n => { if (SEEN_NOTES.has(n.id)) return; SEEN_NOTES.add(n.id); if (n.read.includes(m.pid) || now() - n.at > 60000) return; ztoast(n.t, n.d, () => openNote(n.id), n.btn || 'Open', n.icon || 'bell'); });
  }
  function openNote(id) {
    const n = D().notes.find(x => x.id === id); if (!n) return; const m = me();
    if (!n.read.includes(m.pid)) { n.read.push(m.pid); X.save(); }
    const a = n.act || {};
    if (a.live) joinLive(a.live); else if (a.room) openChat(a.room, a.mid); else if (a.rec) openRec(a.rec); else if (a.wt) openWatch(a.wt, a.t); else if (a.page) G(() => go(a.page));
    G(() => V8.bell());
  }

  /* ---------------------------------------------------------------- messages: helpers */
  const roomOf = id => G(() => X.room(id));
  const msgsOf = id => { const m = me(), hid = new Set(D().hide[m.pid] || []); return X.roomMsgs(id).filter(x => !hid.has(x.id)); };
  function addMsg(rid, by, o) {
    const d = D(), m = Object.assign({ id: X.uid('m'), room: rid, by, name: by === 'U:office' ? 'Academy Office' : pname(by), text: '', at: now() }, o || {});
    d.msgs.push(m); return m;
  }
  function commit(m) { X.save(); if (m) X.post({ t: 'msg', room: m.room, id: m.id }); onData(); }
  function mentionsIn(text, r) {
    const out = new Set(), t = String(text || '').toLowerCase(); if (!r) return [];
    if (/@(all|everyone)\b/.test(t)) r.members.forEach(p => out.add(p));
    r.members.concat(['U:office']).forEach(p => { const n = pname(p).toLowerCase(); if (n && (t.includes('@' + n) || t.includes('@' + n.split(' ')[0] + ' ') || t.endsWith('@' + n.split(' ')[0]))) out.add(p); });
    return [...out];
  }
  const roomLive = rid => { const r = roomOf(rid); if (!r) return null; const k = r.kind === 'group' ? r.g.id : rid; return liveOn(k) ? k : null; };
  const preview = x => x.deleted ? 'This message was deleted' : x.kind === 'card' ? cardLine(x.card) : x.kind === 'sys' ? x.text : x.file ? (x.file.type.startsWith('image/') ? 'Photo' : x.file.name) + (x.text ? ' · ' + x.text : '') : x.voice ? 'Voice message (' + mmss(x.voice.dur || 0) + ')' : x.text;
  function cardLine(c) {
    c = c || {};
    return c.type === 'live' ? 'Live class · ' + (c.title || '') : c.type === 'liveend' ? 'Class ended · ' + (c.present || 0) + ' present' : c.type === 'rec' ? 'Recording · ' + (c.title || '') : c.type === 'hw' ? 'Homework · ' + c.title : c.type === 'notice' ? 'Notice · ' + c.title : c.type === 'exam' ? 'Exam · ' + c.title : c.type === 'marks' ? 'Result · ' + c.exam : c.type === 'pay' ? 'Payment received · ' + money(c.amt) : c.type === 'wt' ? 'Watch Together · ' + c.title : c.type === 'wtq' ? 'Question at ' + mmss(c.t) + ' · ' + c.text : c.type === 'call' ? 'Call · ' + (c.title || '') : 'Update';
  }
  /* last-read history per person, so "Message info" can show when someone read it */
  function markReadZ(rid) {
    const m = me(); if (!m.pid) return; const d = D(), last = X.roomMsgs(rid).slice(-1)[0]; if (!last) return;
    d.reads[rid] = d.reads[rid] || {};
    const who = m.office && roomOf(rid) && roomOf(rid).members.includes('U:office') ? 'U:office' : m.pid;
    if ((d.reads[rid][who] || 0) < last.at) {
      d.reads[rid][who] = last.at; d.readT[rid] = d.readT[rid] || {}; const L = d.readT[rid][who] = (d.readT[rid][who] || []); L.push([last.at, now()]); if (L.length > 40) L.splice(0, L.length - 40);
      /* reading the chat also reads its mention notifications */
      d.notes.forEach(n => { if (n.kind === 'mention' && n.act && n.act.room === rid && forMe(n) && !n.read.includes(m.pid)) n.read.push(m.pid); });
      X.save();
    }
  }
  const readAt = (rid, pid, at) => { const L = ((D().readT[rid] || {})[pid]) || []; const f = L.find(x => x[0] >= at); return f ? f[1] : (((D().reads[rid] || {})[pid] || 0) >= at ? null : undefined); };
  const myUnreadMentions = () => { const m = me(); return myNotes().filter(n => n.kind === 'mention' && !n.read.includes(m.pid)); };
  const isMuted = rid => (D().mute[me().pid] || []).includes(rid);
