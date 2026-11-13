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

  /* ================================================================ WHATSAPP-STYLE MESSAGES */
  const C = { q: '', filter: 'all', open: false, info: false, starred: false, sOpen: false, sq: '', sIdx: 0, divAt: null, divRoom: null, jump: null, pending: null, menu: null, shownRoom: null, sig: '', mon: false, emoji: false, ment: null };
  const EMO = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const EMO_ALL = ['😀', '😁', '😂', '🙂', '😊', '😍', '🤔', '😮', '😢', '😅', '🙏', '👍', '👏', '🙌', '💪', '🔥', '✅', '❌', '⭐', '🎉', '📚', '✏️', '📝', '📎', '⏰', '📅', '💡', '❤️', '👀', '🤝', '👋', '🎯'];
  const firstPage = list => list.find(p => G(() => PAGES[p]) && G(() => can(p)));
  const goFirst = list => { const p = firstPage(list); if (p) { X.force(); go(p); } else say('That page is not in your menu'); };

  function renderCard(x, r) {
    const c = x.card || {}, m = me(), btn = (a, label, icon, prim) => '<button type="button" class="zc-cb' + (prim ? ' p' : '') + '" ' + a + '>' + (icon ? I(icon) : '') + h(label) + '</button>';
    let ic = 'info', kick = '', title = '', body = '', acts = '';
    if (c.type === 'live' || c.type === 'call') {
      const on = liveOn(c.rk) && D().live[c.rk] && D().live[c.rk].sid === c.sid;
      ic = c.type === 'call' ? 'phone' : 'video'; kick = on ? '<span class="zc-livedot"></span>Live now' : 'Ended';
      title = c.title || 'Live class'; body = (c.type === 'call' ? pname(c.by) + ' started a call' : 'Started by ' + pname(c.by)) + ' · ' + tm(c.start || x.at) + (c.end ? ' – ' + tm(c.end) : '') + (c.present != null ? ' · ' + c.present + ' joined' : '');
      acts = on ? btn('data-a="joinlive" data-rk="' + h(c.rk) + '"', 'Join', 'video', true) : '';
    } else if (c.type === 'liveend') {
      ic = 'check'; kick = 'Class ended'; title = c.title || 'Live class';
      body = c.present + ' present · ' + c.absent + ' absent · ' + mmss(c.dur || 0).replace(/^(\d+):(\d+)$/, (a, mi) => mi + ' min') + (c.recId ? ' · recording saved' : '');
      acts = (c.recId ? btn('data-a="rec" data-rec="' + h(c.recId) + '"', 'Play recording', 'play') : '') + (X.kindOf(m.role) !== 's' && c.gid ? btn('data-a="att" data-gid="' + h(c.gid) + '" data-date="' + h(c.date || '') + '"', 'Attendance', 'check') : '');
    } else if (c.type === 'rec') {
      ic = 'film'; kick = 'Recording'; title = c.title; body = 'Length ' + mmss(c.dur || 0) + ' · ' + (c.present != null ? c.present + ' attended' : 'class recording');
      acts = btn('data-a="rec" data-rec="' + h(c.recId) + '"', 'Play', 'play', true);
    } else if (c.type === 'hw') {
      ic = 'book'; kick = 'New homework'; title = c.title; body = (c.details ? h(String(c.details).slice(0, 140)) + '<br>' : '') + 'Due ' + h(G(() => SCH.fmtD(c.due)) || c.due || '') + (c.for ? ' · for ' + h(c.for) : '');
      acts = btn('data-a="page" data-p="tp-hw,sp-lessons,sp-home,ac-hw"', 'Open homework', 'book');
      return cardHtml(ic, kick, title, body, acts, true);
    } else if (c.type === 'notice') {
      ic = 'mega'; kick = 'Notice'; title = c.title; body = h(String(c.body || '').slice(0, 160)); acts = btn('data-a="notice" data-id="' + h(c.id) + '"', 'Open notice', 'mega');
      return cardHtml(ic, kick, title, body, acts, true);
    } else if (c.type === 'exam') {
      ic = 'award'; kick = 'Exam scheduled'; title = c.title; body = h((c.from || '') + (c.to && c.to !== c.from ? ' – ' + c.to : '') + (c.max ? ' · full marks ' + c.max : ''));
      acts = btn('data-a="page" data-p="sp-exams,tp-exams,ac-exams,sp-results"', 'Exams', 'award');
      return cardHtml(ic, kick, title, body, acts, true);
    } else if (c.type === 'marks') {
      ic = 'award'; kick = 'Result published'; title = c.exam + ' · ' + c.sub; body = '<span class="zc-big">' + h(c.mark) + '<small>/' + h(c.max) + '</small></span>' + (c.max ? ' ' + Math.round(c.mark / c.max * 100) + '%' : '');
      acts = btn('data-a="page" data-p="sp-results,tp-marks,ac-exams"', 'Open results', 'award');
      return cardHtml(ic, kick, title, body, acts, true);
    } else if (c.type === 'pay') {
      ic = 'wallet'; kick = 'Payment received'; title = money(c.amt); body = h((c.rcpt ? 'Receipt ' + c.rcpt + ' · ' : '') + (c.date || '') + (c.method ? ' · ' + c.method : '')) + (c.due != null ? '<br>Still due: ' + h(money(c.due)) : '') + '<br>Thank you.';
      acts = btn('data-a="page" data-p="payments,sp-profile"', 'My payments', 'wallet');
      return cardHtml(ic, kick, title, body, acts, true);
    } else if (c.type === 'cnote') {
      ic = 'doc'; kick = 'Class note · ' + h(c.date || ''); title = c.topic || 'Today’s class'; body = [['Progress', c.progress], ['Homework', c.hw], ['Next class', c.next], ['Comment', c.comment]].filter(z => z[1]).map(z => '<b>' + z[0] + ':</b> ' + h(z[1])).join('<br>');
      return cardHtml(ic, kick, title, body, '', true);
    } else if (c.type === 'wt') {
      ic = 'tv'; kick = 'Watch Together'; title = c.title; body = 'Started by ' + h(pname(c.by)) + ' · play, pause and jumps stay in sync';
      acts = btn('data-a="wt" data-wt="' + h(c.sid) + '"', 'Join', 'tv', true);
    } else if (c.type === 'wtq') {
      ic = 'qa'; kick = 'Question at ' + mmss(c.t); title = c.text; body = 'on “' + h(c.title || 'video') + '”';
      acts = btn('data-a="wt" data-wt="' + h(c.sid) + '" data-t="' + (+c.t || 0) + '"', 'Jump to ' + mmss(c.t), 'play');
      return cardHtml(ic, kick, title, body, acts, true);
    }
    return cardHtml(ic, kick, h(title), body, acts, true);
  }
  function cardHtml(ic, kick, title, body, acts, raw) { return '<div class="zc-card"><div class="zc-ch"><span class="zc-ci">' + I(ic) + '</span><div><em>' + kick + '</em><b>' + (raw ? h(title) : title) + '</b></div></div>' + (body ? '<p class="zc-cbody">' + body + '</p>' : '') + (acts ? '<div class="zc-cacts">' + acts + '</div>' : '') + '</div>'; }

  function fmtText(t, x) {
    let s = h(t);
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    (x.mentions || []).forEach(p => { const n = h(pname(p)); s = s.split('@' + n).join('<span class="zc-at' + (p === me().pid ? ' mine' : '') + '">@' + n + '</span>'); });
    s = s.replace(/@(all|everyone)\b/gi, '<span class="zc-at">@$1</span>');
    s = s.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<b>$2</b>').replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1<i>$2</i>');
    if (C.sOpen && C.sq.length > 1) { const re = new RegExp('(' + C.sq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'gi'); s = s.replace(re, '<mark>$1</mark>'); }
    return s;
  }
  const emojiOnly = t => t && t.length <= 8 && /^(\p{Extended_Pictographic}|️|‍|\s)+$/u.test(t);
  function linkChip(t) { const u = (String(t || '').match(/https?:\/\/[^\s]+/) || [])[0]; if (!u) return ''; let host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } const yt = /youtu/.test(host); return '<a class="zc-lp" href="' + h(u) + '" target="_blank" rel="noopener"><span class="zc-lpi">' + I(yt ? 'tv' : 'link') + '</span><span><b>' + h(yt ? 'YouTube video' : host) + '</b><small>' + h(u.replace(/^https?:\/\//, '').slice(0, 60)) + '</small></span></a>'; }
  function wave(id, dur) { let s = hash(id), out = ''; for (let i = 0; i < 34; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; out += '<i style="height:' + (22 + (s % 70)) + '%"></i>'; } return '<span class="zc-wave" data-vid="' + id + '">' + out + '</span>'; }

  function seenList(x, r) { const R = D().reads[r.id] || {}; return Object.keys(R).filter(p => p !== x.by && R[p] >= x.at); }
  function ticks(x, r) {
    const seen = seenList(x, r), others = r.members.filter(p => p !== x.by), all = others.length && others.every(p => seen.includes(p) || (p === 'U:office'));
    const deliv = others.some(p => X.online(p)) || seen.length;
    return '<span class="zc-tk ' + (all ? 'read' : seen.length ? 'part' : '') + '" title="' + (seen.length ? 'Read by ' + h(seen.map(pname).join(', ')) : deliv ? 'Delivered' : 'Sent') + '">' + I('check') + (seen.length || deliv ? I('check', 'z2') : '') + '</span>';
  }

  function msgRow(x, r, opt) {
    const m = me(), mon = opt.mon;
    if (x.kind === 'sys') return '<div class="zc-sys" id="zm-' + x.id + '"><span>' + I(x.icon || 'info') + h(x.text) + '</span></div>';
    const mine = !mon && (x.by === m.pid || (m.office && x.by === 'U:office'));
    const rep = x.reply && D().msgs.find(y => y.id === x.reply);
    const stars = (D().stars[m.pid] || []).includes(x.id), pinned = (D().pins[r.id] || []).includes(x.id);
    let body = '';
    if (x.deleted) body = '<p class="zc-del">' + I('x') + (mine ? 'You deleted this message' : 'This message was deleted') + '</p>' + (mon && x.text ? '<div class="zc-orig">Original (office only): ' + h(x.text) + '</div>' : '');
    else {
      if (x.fwd) body += '<span class="zc-fwd">' + I('fwd') + 'Forwarded</span>';
      if (rep) body += '<button type="button" class="zc-q ' + ncol(rep.by) + '" data-a="jump" data-id="' + rep.id + '"><b>' + h(rep.by === m.pid ? 'You' : rep.name) + '</b><span>' + h(String(preview(rep) || '').slice(0, 120)) + '</span>' + (rep.file && rep.file.type.startsWith('image/') && !rep.deleted ? '<img src="' + rep.file.data + '" alt="">' : '') + '</button>';
      if (x.kind === 'card') body += renderCard(x, r);
      if (x.file) body += x.file.type.startsWith('image/') ? '<a class="zc-img" href="' + x.file.data + '" target="_blank" rel="noopener"><img src="' + x.file.data + '" alt="' + h(x.file.name) + '" loading="lazy"></a>' : '<a class="zc-file" href="' + x.file.data + '" download="' + h(x.file.name) + '"><span class="zc-fi">' + I('doc') + '</span><span><b>' + h(x.file.name) + '</b><small>' + Math.max(1, Math.ceil(x.file.size / 1024)) + ' KB · ' + h((x.file.name.split('.').pop() || '').toUpperCase()) + '</small></span>' + I('dl') + '</a>';
      if (x.voice) body += '<div class="zc-voice"><button type="button" class="zc-vp" data-a="vplay" data-id="' + x.id + '" aria-label="Play voice message">' + I('play') + '</button>' + wave(x.id) + '<small class="zc-vd">' + mmss(x.voice.dur || 0) + '</small><audio preload="none" src="' + x.voice.data + '"></audio></div>';
      if (x.text && x.kind !== 'card') body += (x.kind !== 'card' ? linkChip(x.text) : '') + '<p class="zc-tx' + (emojiOnly(x.text) && !rep && !x.file ? ' big' : '') + '">' + fmtText(x.text, x) + '</p>';
    }
    const meta = '<span class="zc-meta">' + (stars ? I('star', 'zs') : '') + (pinned ? I('pin', 'zs') : '') + (x.edited && !x.deleted ? '<em>Edited</em>' : '') + tm(x.at) + (mine && !x.deleted ? ticks(x, r) : '') + '</span>';
    const reacts = x.react && !x.deleted ? Object.entries(x.react).filter(([e, L]) => L && L.length) : [];
    const reactHtml = reacts.length ? '<div class="zc-rx">' + reacts.map(([e, L]) => '<button type="button" class="' + (L.includes(m.pid) ? 'mine' : '') + '" data-a="react" data-e="' + h(e) + '" data-id="' + x.id + '" title="' + h(L.map(pname).join(', ')) + '">' + e + (L.length > 1 ? '<small>' + L.length + '</small>' : '') + '</button>').join('') + '</div>' : '';
    const showName = !mine && r.kind === 'group' && opt.firstOfRun;
    const hl = (x.mentions || []).includes(m.pid) && !mine ? ' zc-hlme' : '';
    const acts = !x.deleted ? '<div class="zc-acts">' + (opt.canWrite ? '<button type="button" class="zc-ab" data-a="reply" data-id="' + x.id + '" title="Reply" aria-label="Reply">' + I('reply') + '</button>' : '') + (!mon ? '<button type="button" class="zc-ab" data-a="reactbar" data-id="' + x.id + '" title="React" aria-label="React">' + I('smile') + '</button>' : '') + '<button type="button" class="zc-ab" data-a="menu" data-id="' + x.id + '" title="More" aria-label="More options">' + I('chev') + '</button></div>' : '';
    return '<div class="zc-row ' + (mine ? 'me' : 'them') + (opt.firstOfRun ? ' first' : '') + (x.kind === 'card' ? ' iscard' : '') + hl + '" id="zm-' + x.id + '" data-id="' + x.id + '">' +
      (r.kind === 'group' && !mine ? (opt.firstOfRun ? av(x.by, 28, ' title="' + h(x.name) + '"') : '<span class="zc-avsp"></span>') : '') +
      '<div class="zc-bw"><div class="zc-b">' + (showName ? '<span class="zc-nm ' + ncol(x.by) + '">' + h(x.by === 'U:office' ? 'Academy Office' : pname(x.by)) + '<small>' + h(x.by === 'U:office' ? String(x.name || '').replace(/ \(office\)$/, '').replace(/^Academy Office$/, 'Office') : prole(x.by)) + '</small></span>' : '') + body + meta + '</div>' + reactHtml + '</div>' + acts + '</div>';
  }

  function listRows() {
    const m = me(), q = C.q.toLowerCase(), mon = C.mon;
    let rooms = mon ? monRooms() : X.myRooms();
    const lastAt = r => (msgsOf(r.id).slice(-1)[0] || {}).at || 0;
    rooms.sort((a, b) => (roomLive(b.id) ? 1 : 0) - (roomLive(a.id) ? 1 : 0) || lastAt(b) - lastAt(a));
    const ment = new Set(myUnreadMentions().map(n => n.act && n.act.room));
    const f = C.filter;
    rooms = rooms.filter(r => (f === 'all') || (f === 'unread' && X.unread(r.id, m.pid)) || (f === 'groups' && r.kind === 'group') || (f === 'dm' && r.kind === 'dm') || (f === 'mention' && ment.has(r.id)));
    let html = rooms.map(r => {
      const t = X.roomTitle(r, m.pid); if (q && !t.toLowerCase().includes(q) && !msgsOf(r.id).some(x => (x.text || '').toLowerCase().includes(q))) return '';
      const l = msgsOf(r.id).slice(-1)[0], u = mon ? 0 : X.unread(r.id, m.pid), o = r.kind === 'dm' && r.members.includes(m.pid) ? X.other(r, m.pid) : null;
      const ty = X.CH.typing[r.id] && now() - X.CH.typing[r.id].at < 3500;
      const lv = roomLive(r.id);
      const mine = l && (l.by === m.pid || (m.office && l.by === 'U:office'));
      const pv = ty ? '<em class="zc-typ">' + h(first(X.CH.typing[r.id].name)) + ' is typing…</em>' : l ? (mine && !l.deleted && l.kind !== 'sys' ? ticks(l, r) : '') + h((r.kind === 'group' && !mine && l.kind !== 'sys' && l.kind !== 'card' ? (l.by === 'U:office' ? 'Office' : first(l.name)) + ': ' : '') + String(preview(l) || '').slice(0, 80)) : h(r.kind === 'group' ? pname(r.g.mentor) + ' · ' + (r.g.stu || []).length + ((r.g.stu || []).length === 1 ? ' student' : ' students') : 'No messages yet');
      return '<button type="button" class="zc-ri' + (X.CH.room === r.id ? ' on' : '') + (u ? ' unread' : '') + '" data-room="' + h(r.id) + '">' + (r.kind === 'group' ? gav(r.g, 46) : mon ? '<span class="zc-av zc-gav s46">' + I('eye') + '</span>' : av(o || r.a, 46)) + (o && X.online(o) ? '<i class="zc-on"></i>' : '') +
        '<span class="zc-rt"><span class="zc-r1"><b>' + h(t) + '</b><time>' + (l ? shortDay(l.at) : '') + '</time></span><span class="zc-r2"><small>' + (lv ? '<span class="zc-livepill"><span class="zc-livedot"></span>Live</span>' : '') + pv + '</small>' + (isMuted(r.id) ? I('belloff', 'zm') : '') + (ment.has(r.id) ? '<em class="zc-atb">@</em>' : '') + (u ? '<em class="zc-ub">' + u + '</em>' : '') + '</span></span></button>';
    }).join('');
    if (!html) html = '<p class="zc-empty">' + (f === 'all' ? 'No chats yet.' : 'Nothing here.') + '</p>';
    if (q && !mon) { const have = new Set(rooms.filter(r => r.kind === 'dm').map(r => X.other(r, m.pid))); const start = X.contacts().filter(p => !have.has(p) && pname(p).toLowerCase().includes(q)).slice(0, 8); if (start.length) html += '<h6 class="zc-h6">Start a new chat</h6>' + start.map(p => '<button type="button" class="zc-ri" data-room="' + h(X.dmId(m.pid, p)) + '">' + av(p, 46) + '<span class="zc-rt"><span class="zc-r1"><b>' + h(pname(p)) + '</b></span><span class="zc-r2"><small>' + prole(p) + '</small></span></span></button>').join(''); }
    return html;
  }
  function starredList() {
    const m = me(), ids = D().stars[m.pid] || [], L = D().msgs.filter(x => ids.includes(x.id) && X.canSee(roomOf(x.room))).sort((a, b) => b.at - a.at);
    return '<div class="zc-sth"><button type="button" class="zc-ib" data-a="unstarview" aria-label="Back">' + I('back') + '</button><b>Starred messages</b></div>' + (L.map(x => { const r = roomOf(x.room); return '<button type="button" class="zc-ri zc-star" data-room="' + h(x.room) + '" data-mid="' + x.id + '">' + av(x.by, 36) + '<span class="zc-rt"><span class="zc-r1"><b>' + h(x.by === m.pid ? 'You' : x.name) + ' <small>› ' + h(X.roomTitle(r, m.pid)) + '</small></b><time>' + shortDay(x.at) + '</time></span><span class="zc-r2"><small>' + h(String(preview(x)).slice(0, 90)) + '</small></span></span></button>'; }).join('') || '<p class="zc-empty">' + I('star') + 'Tap ⌄ on any message, then Star, to keep it here.</p>');
  }
  function monRooms() { const ids = new Set(X.groups().map(g => 'g:' + g.id)); D().msgs.forEach(x => ids.add(x.room)); return [...ids].map(roomOf).filter(r => r && X.canSee(r)); }

  function pageChatZ(p, mon) {
    X.seed(); const m = me(); C.mon = !!mon;
    const st = mon ? X.MON : X.CH;
    if (st.room && !X.canSee(roomOf(st.room))) st.room = null;
    if (!mon && st.room) { X.CH.room = st.room; }
    if (mon && !X.MON.room) { const rs = monRooms(); X.MON.room = (rs.find(r => X.roomMsgs(r.id).length) || rs[0] || {}).id || null; }
    if (!mon && !X.CH.room && window.innerWidth > 760) X.CH.room = (X.myRooms()[0] || {}).id || null;
    if (mon) X.CH.room = X.MON.room;
    if (C.extOpen) { C.open = true; C.extOpen = false; }
    const note = mon ? X.demoNote('<b>Chat Monitor.</b> Owner and Admin can read every class group and every mentor–student chat, read-only. Each chat you open is written to the activity log. Deleted messages still show their original text here.') : '';
    const fresh = X.shell(p, note + '<div class="zc-wa' + (mon ? ' mon' : '') + '" id="zc-wa" data-notx data-open="' + (C.open && X.CH.room ? 1 : 0) + '"><aside class="zc-side" id="zc-side"></aside><section class="zc-main" id="zc-main"></section><aside class="zc-drawer" id="zc-drawer" hidden></aside></div>' + (mon ? '' : X.demoNote('Demo: open this file in a <b>second browser tab</b>, choose another person there (DEMO button) and chat between the tabs — messages, replies, reactions, typing, read ticks and online status update live. On the live site this runs on Supabase Realtime.')), true);
    if (!fresh && $('zc-wa')) { drawSide(); drawMain(); return; }
    C.shownRoom = null; C.sig = '';
    drawSide(); drawMain(); bindWA();
  }
  function drawSide() {
    const S = $('zc-side'); if (!S) return; const m = me();
    const keepQ = $('zc-q') && document.activeElement === $('zc-q');
    if (!S.firstChild) {
      S.innerHTML = '<header class="zc-sh">' + (C.mon ? '<span class="zc-av zc-gav s36">' + I('eye') + '</span><b>All chats</b>' : av(m.pid, 36) + '<b>Chats</b>') + '<span class="zc-sp"></span>' + (C.mon ? '' : '<button type="button" class="zc-ib" data-a="starview" title="Starred messages" aria-label="Starred messages">' + I('star') + '</button><button type="button" class="zc-ib" data-a="newchat" title="New chat" aria-label="New chat">' + I('edit') + '</button>') + '</header>' +
        '<label class="zc-ss">' + I('search') + '<input id="zc-q" type="search" placeholder="' + (C.mon ? 'Filter chats by name or text' : 'Search or start a new chat') + '" aria-label="Search chats" autocomplete="off"></label>' +
        '<div class="zc-chips" role="tablist">' + [['all', 'All'], ['unread', 'Unread'], ['groups', 'Groups'], ['dm', 'Private']].concat(C.mon ? [] : [['mention', '@ Mentions']]).map(f => '<button type="button" role="tab" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="zc-rl" id="zc-rl"></div>';
      $('zc-q').oninput = () => { C.q = $('zc-q').value; drawSide(); };
    }
    qa('.zc-chips button', S).forEach(b => b.classList.toggle('on', b.dataset.f === C.filter));
    $('zc-rl').innerHTML = C.starred ? starredList() : listRows();
    if (keepQ) $('zc-q').focus();
  }
  function chatSig(rid) { const L = msgsOf(rid), d = D(); return rid + '|' + L.length + '|' + L.map(x => (x.edited ? 'e' : '') + (x.deleted ? 'd' : '') + JSON.stringify(x.react || '') + (x.card && x.card.end ? 'x' : '')).join('').length + '|' + JSON.stringify(d.reads[rid] || {}) + '|' + (d.pins[rid] || []).join() + '|' + (d.stars[me().pid] || []).length + '|' + (roomLive(rid) || '') + '|' + C.sq + C.sOpen; }

  function drawMain(force) {
    const V = $('zc-main'); if (!V) return; const m = me(), rid = X.CH.room, mon = C.mon;
    const wa = $('zc-wa'); if (wa) wa.dataset.open = C.open && rid ? 1 : 0;
    if (!rid) { V.innerHTML = '<div class="zc-blank"><span class="zc-bl">' + I('chat') + '</span><h3>FTA Messages</h3><p>Class groups and private chats with mentors, students and the office.<br>Choose a chat on the left.</p><small>' + I('lock') + 'The office can read student chats to keep everyone safe.</small></div>'; return; }
    const r = roomOf(rid); if (!r || !X.canSee(r)) { V.innerHTML = '<div class="zc-blank"><p>You cannot open this chat.</p></div>'; return; }
    const write = !mon && X.canWrite(r, m);
    if (C.shownRoom !== rid || force || !$('zc-ml')) {
      /* new room: whole frame */
      if (C.shownRoom !== rid) { C.divAt = X.lastRead(rid, m.office && r.members.includes('U:office') ? 'U:office' : m.pid); C.divRoom = rid; C.sOpen = false; C.sq = ''; C.info = false; C.pending = null; X.CH.reply = X.CH.edit = null; C.firstScroll = true; }
      const keep = $('zc-in') ? $('zc-in').value : '';
      C.shownRoom = rid;
      const o = r.kind === 'dm' && r.members.includes(m.pid) ? X.other(r, m.pid) : null;
      V.innerHTML = '<header class="zc-hd"><button type="button" class="zc-ib zc-back" data-a="back" aria-label="Back to chats">' + I('back') + '</button>' + (r.kind === 'group' ? gav(r.g, 40) : av(o || r.a, 40)) +
        '<button type="button" class="zc-ht" data-a="info"><b>' + h(X.roomTitle(r, m.pid)) + '</b><small id="zc-sub"></small></button><div class="zc-ha">' +
        (!mon && (r.kind === 'group' || o) ? '<button type="button" class="zc-ib" data-a="call" title="' + (r.kind === 'group' ? 'Live class' : 'Video call') + '" aria-label="Live class">' + I('video') + '</button><button type="button" class="zc-ib" data-a="watch" title="Watch together" aria-label="Watch together">' + I('tv') + '</button>' : '') +
        '<button type="button" class="zc-ib" data-a="search" title="Search in this chat" aria-label="Search in this chat">' + I('search') + '</button><button type="button" class="zc-ib" data-a="info" title="' + (r.kind === 'group' ? 'Group info' : 'Contact info') + '" aria-label="Chat info">' + I('dots') + '</button></div></header>' +
        '<div class="zc-sbar" id="zc-sbar" hidden>' + I('search') + '<input id="zc-sq" placeholder="Search in this chat" aria-label="Search in this chat"><span id="zc-sn"></span><button type="button" class="zc-ib" data-a="sprev" aria-label="Previous match">' + I('chevu') + '</button><button type="button" class="zc-ib" data-a="snext" aria-label="Next match">' + I('chev') + '</button><button type="button" class="zc-ib" data-a="sclose" aria-label="Close search">' + I('x') + '</button></div>' +
        '<div id="zc-top"></div>' +
        '<div class="zc-body" id="zc-body"><div class="zc-ml" id="zc-ml" role="log" aria-live="polite"></div></div>' +
        '<button type="button" class="zc-fab" id="zc-fab" data-a="bottom" aria-label="Scroll to the newest message" hidden>' + I('chev') + '<em id="zc-fabn"></em></button>' +
        '<div class="zc-drop" id="zc-drop" hidden>' + I('image') + '<b>Drop to send</b></div>' +
        (write ? '<footer class="zc-comp" id="zc-comp"></footer>' : '<footer class="zc-ro">' + I(mon ? 'eye' : 'lock') + (mon ? 'Read-only monitoring · opening this chat was written to the activity log' : 'You can read but not write here') + '</footer>');
      if (write) { drawComposer(keep); }
      bindBody(r);
      C.sig = '';
    }
    drawSub(r);
    drawTop(r);
    const sig = chatSig(rid);
    if (sig !== C.sig) { C.sig = sig; drawList(r); }
    if (C.info) drawInfo(r); else { const d = $('zc-drawer'); if (d) d.hidden = true; }
  }
  function drawSub(r) {
    const s = $('zc-sub'); if (!s || !r) return; const m = me();
    const ty = X.CH.typing[r.id] && now() - X.CH.typing[r.id].at < 3500 ? X.CH.typing[r.id].name : '';
    if (ty) { s.innerHTML = '<em class="zc-typ">' + h(first(ty)) + ' is typing…</em>'; return; }
    if (r.kind === 'group') { const on = r.members.filter(X.online); s.textContent = r.members.map(p => p === m.pid ? 'You' : first(pname(p))).slice(0, 6).join(', ') + (r.members.length > 6 ? '…' : '') + ' · ' + on.length + ' online'; }
    else { const o = r.members.includes(m.pid) ? X.other(r, m.pid) : null; s.innerHTML = o ? (X.online(o) ? '<span class="zc-onl">online</span>' : 'last seen recently') + ' · ' + prole(o) : h(pname(r.a) + ' ↔ ' + pname(r.b)); }
  }
  function drawTop(r) {
    const T = $('zc-top'); if (!T) return; const d = D(), m = me();
    const pins = (d.pins[r.id] || []).map(id => d.msgs.find(x => x.id === id)).filter(x => x && !x.deleted);
    const lv = roomLive(r.id), L = lv ? d.live[lv] : null;
    let html = '';
    if (L) html += '<div class="zc-livebar"><span class="zc-livedot"></span><div><b>' + h(L.title || 'Live class') + '</b><small>' + h(pname(L.by)) + ' started at ' + tm(L.at) + ' · ' + liveCount(lv) + ' in the call</small></div><button type="button" class="zc-cb p" data-a="joinlive" data-rk="' + h(lv) + '">' + I('video') + 'Join</button></div>';
    if (pins.length) { const i = (C.pinIdx || 0) % pins.length, x = pins[i]; html += '<button type="button" class="zc-pinbar" data-a="pinjump" data-id="' + x.id + '">' + I('pin') + '<span><b>Pinned' + (pins.length > 1 ? ' ' + (i + 1) + ' of ' + pins.length : '') + '</b><small>' + h(String(preview(x) || '').slice(0, 100)) + '</small></span>' + '</button>'; }
    if (r.monitored && !C.mon) html += '<div class="zc-monote">' + I('eye') + 'The academy office can read this chat to keep students safe.</div>';
    if (T.innerHTML !== html) T.innerHTML = html;
  }
  function drawList(r) {
    const L = $('zc-ml'), B = $('zc-body'); if (!L || !B) return; const m = me();
    const atBottom = B.scrollHeight - B.scrollTop - B.clientHeight < 80, oldTop = B.scrollTop;
    const ms = msgsOf(r.id), write = !C.mon && X.canWrite(r, m);
    let lastDay = '', prevBy = null, prevAt = 0, div = false, html = '';
    const divAt = C.divRoom === r.id ? C.divAt : null;
    ms.forEach(x => {
      const dl = dayLabel(x.at);
      if (dl !== lastDay) { html += '<div class="zc-day"><span>' + dl + '</span></div>'; lastDay = dl; prevBy = null; }
      if (!div && divAt != null && x.at > divAt && x.by !== m.pid && !(m.office && x.by === 'U:office')) { const n = ms.filter(y => y.at > divAt && y.by !== m.pid).length; html += '<div class="zc-newdiv" id="zc-newdiv"><span>' + n + ' unread message' + (n > 1 ? 's' : '') + '</span></div>'; div = true; prevBy = null; }
      const firstOfRun = prevBy !== x.by || x.at - prevAt > 5 * 60000 || x.kind === 'sys';
      html += msgRow(x, r, { mon: C.mon, firstOfRun, canWrite: write });
      prevBy = x.kind === 'sys' ? null : x.by; prevAt = x.at;
    });
    L.innerHTML = html || '<div class="zc-hello"><span>' + I('chat') + '</span><b>No messages yet</b><small>Say hello 👋</small></div>';
    if (C.jump) { const id = C.jump; C.jump = null; C.firstScroll = false; setTimeout(() => jumpTo(id), 30); }
    else if (C.firstScroll) { C.firstScroll = false; const dv = $('zc-newdiv'); if (dv) B.scrollTop = dv.offsetTop - 60; else B.scrollTop = B.scrollHeight; }
    else if (atBottom) B.scrollTop = B.scrollHeight; else B.scrollTop = oldTop;
    if (!C.mon && B.scrollHeight - B.scrollTop - B.clientHeight < 80) markReadZ(r.id);
    fab(r);
    if (C.sOpen) searchCount();
  }
  function fab(r) {
    const B = $('zc-body'), F = $('zc-fab'); if (!B || !F) return;
    const far = B.scrollHeight - B.scrollTop - B.clientHeight > 220; F.hidden = !far;
    const n = r && !C.mon ? X.unread(r.id, me().pid) : 0; const e = $('zc-fabn'); if (e) { e.textContent = n || ''; e.hidden = !n; }
  }
  function jumpTo(id) { const el = $('zm-' + id), B = $('zc-body'); if (!el || !B) { say('That message is no longer in this chat'); return; } B.scrollTop = el.offsetTop - B.clientHeight / 2 + el.offsetHeight / 2; el.classList.remove('zc-flash'); void el.offsetWidth; el.classList.add('zc-flash'); }

  /* ---------------------------------------------------------------- composer */
  function drawComposer(keep) {
    const F = $('zc-comp'); if (!F) return; const d = D();
    const rep = X.CH.reply && d.msgs.find(y => y.id === X.CH.reply), ed = X.CH.edit && d.msgs.find(y => y.id === X.CH.edit);
    F.innerHTML = (rep || ed ? '<div class="zc-rp ' + (rep ? ncol(rep.by) : '') + '">' + I(ed ? 'edit' : 'reply') + '<div><b>' + (ed ? 'Edit message' : 'Replying to ' + h(rep.by === me().pid ? 'yourself' : rep.name)) + '</b><small>' + h(String(preview(ed || rep) || '').slice(0, 110)) + '</small></div><button type="button" class="zc-ib" data-a="cancel" aria-label="Cancel">' + I('x') + '</button></div>' : '') +
      (C.pending ? '<div class="zc-pend">' + (C.pending.type.startsWith('image/') ? '<img src="' + C.pending.data + '" alt="">' : '<span class="zc-fi">' + I('doc') + '</span>') + '<div><b>' + h(C.pending.name) + '</b><small>' + Math.ceil(C.pending.size / 1024) + ' KB · add a caption below</small></div><button type="button" class="zc-ib" data-a="unpend" aria-label="Remove attachment">' + I('x') + '</button></div>' : '') +
      '<div class="zc-ment" id="zc-ment" hidden></div><div class="zc-emo" id="zc-emo" hidden>' + EMO_ALL.map(e => '<button type="button" data-a="emo" data-e="' + e + '">' + e + '</button>').join('') + '</div>' +
      '<div class="zc-cr"><button type="button" class="zc-ib" data-a="emopick" title="Emoji" aria-label="Emoji">' + I('smile') + '</button><label class="zc-ib" title="Attach a photo or document" aria-label="Attach">' + I('clip') + '<input type="file" id="zc-file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" hidden></label>' +
      '<div class="zc-inw"><textarea id="zc-in" rows="1" placeholder="' + (C.pending ? 'Add a caption…' : 'Type a message · @ to mention') + '" aria-label="Message"></textarea></div>' +
      '<button type="button" class="zc-send" id="zc-send" data-a="send" aria-label="Send">' + I('send') + '</button><button type="button" class="zc-send zc-mic" id="zc-mic" data-a="voice" aria-label="Record a voice message">' + I('mic') + '</button></div><div class="zc-recbar" id="zc-recbar" hidden><button type="button" class="zc-ib" data-a="vcancel" aria-label="Cancel recording">' + I('trash') + '</button><span class="zc-rdot"></span><b id="zc-rt">0:00</b><span class="zc-rw">' + wave('rec' + now()) + '</span><button type="button" class="zc-send" data-a="vsend" aria-label="Send voice message">' + I('send') + '</button></div>';
    const inp = $('zc-in'); inp.value = ed ? ed.text || '' : keep || '';
    const sync = () => { inp.style.height = 'auto'; inp.style.height = Math.min(140, inp.scrollHeight) + 'px'; F.classList.toggle('has', !!inp.value.trim() || !!C.pending); };
    let lastT = 0;
    inp.oninput = () => { sync(); const m = me(); if (now() - lastT > 1500) { lastT = now(); X.post({ t: 'typing', room: X.CH.room, pid: m.pid, name: m.name }); } mentionPop(); };
    inp.onkeydown = e => {
      const mp = $('zc-ment'); if (mp && !mp.hidden) { const items = qa('button', mp); let i = items.findIndex(b => b.classList.contains('on')); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((b, j) => b.classList.toggle('on', j === i)); return; } if ((e.key === 'Enter' || e.key === 'Tab') && items.length) { e.preventDefault(); pickMention((items[i] || items[0]).dataset.pid); return; } if (e.key === 'Escape') { mp.hidden = true; return; } }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendNow(); }
      if (e.key === 'Escape' && (X.CH.reply || X.CH.edit)) { X.CH.reply = X.CH.edit = null; drawComposer(inp.value); $('zc-in').focus(); }
    };
    inp.onpaste = e => { const it = [...(e.clipboardData || {}).items || []].find(i => i.kind === 'file'); if (it) { e.preventDefault(); attach(it.getAsFile()); } };
    $('zc-file').onchange = e => { const f = e.target.files[0]; if (f) attach(f); };
    sync();
  }
  function mentionPop() {
    const inp = $('zc-in'), mp = $('zc-ment'); if (!inp || !mp) return; const r = roomOf(X.CH.room);
    const before = inp.value.slice(0, inp.selectionStart), mt = before.match(/(^|\s)@([\wঀ-৿]*)$/);
    if (!mt || !r) { mp.hidden = true; return; }
    const q = mt[2].toLowerCase(), m = me();
    const L = r.members.concat(r.kind === 'group' ? ['U:office'] : []).filter(p => p !== m.pid && pname(p).toLowerCase().includes(q)).slice(0, 7);
    const all = r.kind === 'group' && X.kindOf(m.role) !== 's' && 'everyone'.startsWith(q);
    if (!L.length && !all) { mp.hidden = true; return; }
    mp.innerHTML = (all ? '<button type="button" data-pid="@everyone" class="on"><span class="zc-av zc-gav s28">' + I('users') + '</span><b>everyone</b><small>Notify the whole class</small></button>' : '') + L.map((p, i) => '<button type="button" data-pid="' + h(p) + '" class="' + (!all && !i ? 'on' : '') + '">' + av(p, 28) + '<b>' + h(pname(p)) + '</b><small>' + prole(p) + (X.online(p) ? ' · online' : '') + '</small></button>').join('');
    mp.hidden = false;
    mp.onmousedown = e => { const b = e.target.closest('[data-pid]'); if (b) { e.preventDefault(); pickMention(b.dataset.pid); } };
  }
  function pickMention(pid) {
    const inp = $('zc-in'), pos = inp.selectionStart, before = inp.value.slice(0, pos).replace(/@([\wঀ-৿]*)$/, ''), after = inp.value.slice(pos);
    const tag = pid === '@everyone' ? '@everyone ' : '@' + pname(pid) + ' ';
    inp.value = before + tag + after; const c = (before + tag).length; inp.setSelectionRange(c, c); inp.focus(); $('zc-ment').hidden = true; inp.dispatchEvent(new Event('input'));
  }
  function attach(f) {
    if (!f) return;
    const done = o => { C.pending = o; drawComposer($('zc-in') ? $('zc-in').value : ''); $('zc-in') && $('zc-in').focus(); };
    if (f.type.startsWith('image/') && f.type !== 'image/gif') {
      const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const data = c.toDataURL('image/jpeg', .82); done({ name: f.name || 'photo.jpg', type: 'image/jpeg', size: Math.round(data.length * .75), data }); }; img.onerror = () => say('That image could not be read'); img.src = rd.result; }; rd.readAsDataURL(f); return;
    }
    if (f.size > 700 * 1024) { say('In this demo files up to 700 KB fit (live site: 20 MB). Try a smaller file.'); return; }
    const rd = new FileReader(); rd.onload = () => done({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, data: rd.result }); rd.readAsDataURL(f);
  }
  function sendNow(extra) {
    const inp = $('zc-in'), m = me(), rid = X.CH.room, r = roomOf(rid); if (!r) return;
    const text = inp ? inp.value.trim() : '';
    if (!text && !extra && !C.pending) return;
    const d = D();
    if (X.CH.edit) { const x = d.msgs.find(y => y.id === X.CH.edit); if (x && text) { x.text = text; x.edited = now(); x.mentions = mentionsIn(text, r).filter(p => p !== m.pid); } X.CH.edit = null; if (inp) inp.value = ''; X.save(); drawComposer(''); C.sig = ''; drawMain(); return; }
    const o = Object.assign({ text, reply: X.CH.reply || undefined, name: m.office ? m.name + ' (office)' : m.name }, extra || {});
    if (C.pending) { o.file = C.pending; C.pending = null; }
    o.mentions = mentionsIn(text, r).filter(p => p !== m.pid && p !== (m.office ? 'U:office' : ''));
    const by = m.office && r.members.includes('U:office') ? 'U:office' : m.pid;
    const msg = addMsg(rid, by, o);
    if (by === 'U:office') msg.name = m.name + ' (office)';
    /* replying to a Watch Together question in the chat also answers it on the video */
    const rep = o.reply && d.msgs.find(y => y.id === o.reply);
    if (rep && rep.card && rep.card.type === 'wtq' && text) { const n = d.wtn.find(z => z.id === rep.card.nid); if (n) { n.replies = (n.replies || []).concat([{ by: m.pid, name: m.name, text, at: now(), viaChat: true }]); msg.wtr = n.id; } }
    if (o.mentions.length) notify(o.mentions, { kind: 'mention', icon: 'at', t: (by === 'U:office' ? 'Academy Office' : m.name) + ' mentioned you', d: (r.kind === 'group' ? r.name + ': ' : '') + text.slice(0, 90), act: { room: rid, mid: msg.id }, btn: 'Reply' });
    X.CH.reply = null; if (inp) inp.value = '';
    markReadZ(rid); commit(msg); drawComposer(''); const B = $('zc-body'); if (B) B.scrollTop = B.scrollHeight; $('zc-in') && $('zc-in').focus();
  }

  /* ---------------------------------------------------------------- the context menu, reactions, info, forward */
  function closePop() { qa('.zc-pop,.zc-modal').forEach(x => x.remove()); C.menu = null; }
  function popAt(anchor, html, cls) {
    closePop(); const p = document.createElement('div'); p.className = 'zc-pop ' + (cls || ''); p.setAttribute('data-notx', ''); p.innerHTML = html; document.body.appendChild(p);
    const r = anchor.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, pw = p.offsetWidth, ph = p.offsetHeight;
    if (W <= 600 && cls !== 'zc-rbar') { p.classList.add('sheet'); return p; }
    let x = Math.min(Math.max(8, r.right - pw), W - pw - 8), y = r.bottom + 6; if (y + ph > H - 8) y = Math.max(8, r.top - ph - 6);
    p.style.left = x + 'px'; p.style.top = y + 'px'; return p;
  }
  function msgMenu(id, anchor) {
    const d = D(), x = d.msgs.find(y => y.id === id); if (!x) return; const m = me(), r = roomOf(x.room), mon = C.mon;
    const mine = x.by === m.pid || (m.office && x.by === 'U:office'), write = !mon && X.canWrite(r, m);
    const canPin = write && (r.kind === 'dm' || X.kindOf(m.role) !== 's');
    const pinned = (d.pins[r.id] || []).includes(id), starred = (d.stars[m.pid] || []).includes(id);
    const it = (a, icon, label, cls) => '<button type="button" data-a="' + a + '" data-id="' + id + '" class="' + (cls || '') + '">' + I(icon) + label + '</button>';
    const html = (write ? '<div class="zc-emrow">' + EMO.map(e => '<button type="button" data-a="react" data-e="' + e + '" data-id="' + id + '" class="' + ((x.react && x.react[e] || []).includes(m.pid) ? 'mine' : '') + '">' + e + '</button>').join('') + '<button type="button" data-a="emomore" data-id="' + id + '" aria-label="More emoji">' + I('plus') + '</button></div>' : '') +
      '<div class="zc-mi">' + (write ? it('reply', 'reply', 'Reply') : '') + (write && r.kind === 'group' && !mine && x.by !== 'U:office' && X.contacts().includes(x.by) ? it('replypriv', 'chat', 'Reply privately') : '') + (x.text ? it('copy', 'copy', 'Copy') : '') + (!mon ? it('fwd', 'fwd', 'Forward') : '') + (canPin ? it('pin', 'pin', pinned ? 'Unpin' : 'Pin') : '') + (!mon ? it('star', 'star', starred ? 'Unstar' : 'Star') : '') + ((mine || mon) && x.kind !== 'sys' ? it('msginfo', 'info', 'Message info') : '') + (mine && !x.deleted && x.text && x.kind !== 'card' && now() - x.at < 15 * 60000 ? it('edit', 'edit', 'Edit') : '') + (!mon ? it('delme', 'trash', 'Delete for me', 'bad') : '') + (mine && !x.deleted && now() - x.at < 60 * 60000 ? it('delall', 'trash', 'Delete for everyone', 'bad') : '') + '</div>';
    C.menu = id; popAt(anchor, html, 'zc-menu');
  }
  function reactBar(id, anchor) { const x = D().msgs.find(y => y.id === id), m = me(); popAt(anchor, '<div class="zc-emrow">' + EMO.map(e => '<button type="button" data-a="react" data-e="' + e + '" data-id="' + id + '" class="' + ((x.react && x.react[e] || []).includes(m.pid) ? 'mine' : '') + '">' + e + '</button>').join('') + '<button type="button" data-a="emomore" data-id="' + id + '" aria-label="More emoji">' + I('plus') + '</button></div>', 'zc-rbar'); }
  function toggleReact(id, e) { const x = D().msgs.find(y => y.id === id); if (!x) return; const p = me().pid; x.react = x.react || {}; Object.keys(x.react).forEach(k => { if (k !== e) x.react[k] = (x.react[k] || []).filter(z => z !== p); }); const L = x.react[e] = x.react[e] || []; const i = L.indexOf(p); if (i > -1) L.splice(i, 1); else L.push(p); X.save(); X.post({ t: 'react', room: x.room, id }); closePop(); onData(); }
  function modal(title, body, foot) { closePop(); const w = document.createElement('div'); w.className = 'zc-modal'; w.setAttribute('data-notx', ''); w.innerHTML = '<div class="zc-mbox" role="dialog" aria-modal="true" aria-label="' + h(title) + '"><header><b>' + h(title) + '</b><button type="button" class="zc-ib" data-a="mclose" aria-label="Close">' + I('x') + '</button></header><div class="zc-mbody">' + body + '</div>' + (foot ? '<footer>' + foot + '</footer>' : '') + '</div>'; document.body.appendChild(w); w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-a="mclose"]')) w.remove(); }); return w; }
  function msgInfo(id) {
    const x = D().msgs.find(y => y.id === id), r = roomOf(x.room), others = r.members.concat(r.kind === 'group' ? ['U:office'] : []).filter(p => p !== x.by);
    const rows = others.map(p => { const t = readAt(r.id, p, x.at); return [p, t]; });
    const read = rows.filter(z => z[1] !== undefined), not = rows.filter(z => z[1] === undefined);
    modal('Message info', '<div class="zc-infomsg">' + h(String(preview(x) || '').slice(0, 200)) + '<small>Sent ' + dayLabel(x.at) + ' at ' + tm(x.at) + (x.edited ? ' · edited ' + tm(x.edited) : '') + '</small></div>' +
      '<h6 class="zc-h6">' + I('check') + 'Read by ' + read.length + ' of ' + others.length + '</h6>' + (read.map(([p, t]) => '<div class="zc-pr">' + av(p, 32) + '<span><b>' + h(pname(p)) + '</b><small>' + prole(p) + '</small></span><time>' + (t ? dayLabel(t) + ' ' + tm(t) : 'read') + '</time></div>').join('') || '<p class="zc-muted">No one yet.</p>') +
      (not.length ? '<h6 class="zc-h6">' + I('clock') + 'Not read yet</h6>' + not.map(([p]) => '<div class="zc-pr">' + av(p, 32) + '<span><b>' + h(pname(p)) + '</b><small>' + prole(p) + (X.online(p) ? ' · online now (delivered)' : '') + '</small></span><time>—</time></div>').join('') : ''));
  }
  function forward(id) {
    const m = me(), rooms = X.myRooms().filter(r => X.canWrite(r, m));
    const w = modal('Forward message to…', '<div class="zc-fwl">' + rooms.map(r => '<label class="zc-pr">' + (r.kind === 'group' ? gav(r.g, 32) : av(X.other(r, m.pid), 32)) + '<span><b>' + h(X.roomTitle(r, m.pid)) + '</b><small>' + (r.kind === 'group' ? 'Class group' : prole(X.other(r, m.pid))) + '</small></span><input type="checkbox" value="' + h(r.id) + '"></label>').join('') + '</div>', '<button type="button" class="zc-cb p" data-a="dofwd">' + I('send') + 'Forward</button>');
    w.querySelector('[data-a="dofwd"]').onclick = () => { const to = qa('input:checked', w).map(i => i.value); if (!to.length) { say('Choose at least one chat'); return; } const x = D().msgs.find(y => y.id === id); let last; to.forEach(rid => { const r = roomOf(rid); last = addMsg(rid, m.office && r.members.includes('U:office') ? 'U:office' : m.pid, { text: x.text, file: x.file, voice: x.voice, kind: x.kind === 'card' ? 'card' : undefined, card: x.card, fwd: true, name: m.name }); }); commit(last); w.remove(); say('Forwarded to ' + to.length + ' chat' + (to.length > 1 ? 's' : '')); };
  }
  function moreEmoji(id) { const w = modal('React with', '<div class="zc-emogrid">' + EMO_ALL.map(e => '<button type="button" data-e="' + e + '">' + e + '</button>').join('') + '</div>'); w.querySelector('.zc-emogrid').onclick = e => { const b = e.target.closest('[data-e]'); if (b) { w.remove(); toggleReact(id, b.dataset.e); } }; }

  /* ---------------------------------------------------------------- group / contact info drawer */
  function drawInfo(r) {
    const Dr = $('zc-drawer'); if (!Dr) return; Dr.hidden = false; const m = me(), ms = msgsOf(r.id), d = D();
    const media = ms.filter(x => !x.deleted && x.file && x.file.type.startsWith('image/')), docs = ms.filter(x => !x.deleted && x.file && !x.file.type.startsWith('image/')), links = ms.filter(x => !x.deleted && /https?:\/\//.test(x.text || ''));
    const recs = r.kind === 'group' ? d.recs.filter(z => z.gid === r.g.id) : [];
    const stars = ms.filter(x => (d.stars[m.pid] || []).includes(x.id));
    const tab = C.itab || 'media';
    const o = r.kind === 'dm' ? (r.members.includes(m.pid) ? X.other(r, m.pid) : r.a) : null;
    const memberRow = p => '<div class="zc-pr">' + av(p, 36) + (X.online(p) ? '<i class="zc-on s"></i>' : '') + '<span><b>' + h(p === m.pid ? 'You' : pname(p)) + '</b><small>' + (X.online(p) ? '<span class="zc-onl">online</span> · ' : '') + h(prole(p)) + '</small></span>' + (r.g && p === r.g.mentor ? '<em class="zc-role">Group admin</em>' : '') + (p !== m.pid && X.contacts().includes(p) && !C.mon ? '<button type="button" class="zc-ib" data-a="dmto" data-pid="' + h(p) + '" title="Message ' + h(first(pname(p))) + '" aria-label="Message">' + I('chat') + '</button>' : '') + '</div>';
    Dr.innerHTML = '<header class="zc-dh"><button type="button" class="zc-ib" data-a="infoclose" aria-label="Close">' + I('x') + '</button><b>' + (r.kind === 'group' ? 'Group info' : 'Contact info') + '</b></header><div class="zc-db">' +
      '<div class="zc-dhero">' + (r.kind === 'group' ? gav(r.g, 88) : av(o, 88)) + '<h3>' + h(X.roomTitle(r, m.pid)) + '</h3><p>' + (r.kind === 'group' ? 'Class group · ' + r.members.length + ' members' : h(prole(o)) + (X.online(o) ? ' · online' : '')) + '</p>' +
      '<div class="zc-dacts">' + (!C.mon ? '<button type="button" data-a="call">' + I('video') + '<span>' + (r.kind === 'group' ? 'Live class' : 'Call') + '</span></button><button type="button" data-a="watch">' + I('tv') + '<span>Watch</span></button>' : '') + '<button type="button" data-a="search">' + I('search') + '<span>Search</span></button>' + (r.kind === 'dm' && G(() => window.FTA_TREE.open) && (isOffice() || X.kindOf(m.role) === 't') ? '<button type="button" data-a="profile" data-pid="' + h(o) + '">' + I('users') + '<span>Profile</span></button>' : '') + '</div></div>' +
      (r.kind === 'group' ? '<section><h6 class="zc-h6">About</h6><p class="zc-muted">' + h(pname(r.g.mentor)) + ' teaches this class. Homework, notices, exams, live classes and recordings for this class are posted here automatically.</p></section>' : '') +
      '<section><div class="zc-dtabs">' + [['media', 'Media', media.length], ['docs', 'Docs', docs.length], ['links', 'Links', links.length]].concat(recs.length ? [['recs', 'Videos', recs.length]] : []).map(t => '<button type="button" data-a="itab" data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + ' <small>' + t[2] + '</small></button>').join('') + '</div>' +
      (tab === 'media' ? (media.length ? '<div class="zc-mgrid">' + media.slice(-12).reverse().map(x => '<button type="button" data-a="jumpclose" data-id="' + x.id + '"><img src="' + x.file.data + '" alt=""></button>').join('') + '</div>' : '<p class="zc-muted">No photos yet. Paste or drop a photo into the chat.</p>') : '') +
      (tab === 'docs' ? (docs.map(x => '<a class="zc-file" href="' + x.file.data + '" download="' + h(x.file.name) + '"><span class="zc-fi">' + I('doc') + '</span><span><b>' + h(x.file.name) + '</b><small>' + h(x.name) + ' · ' + shortDay(x.at) + '</small></span></a>').join('') || '<p class="zc-muted">No documents yet.</p>') : '') +
      (tab === 'links' ? (links.map(x => '<button type="button" class="zc-lrow" data-a="jumpclose" data-id="' + x.id + '">' + I('link') + '<span>' + h((x.text.match(/https?:\/\/\S+/) || [''])[0]) + '<small>' + h(x.name) + ' · ' + shortDay(x.at) + '</small></span></button>').join('') || '<p class="zc-muted">No links yet.</p>') : '') +
      (tab === 'recs' ? recs.map(z => '<button type="button" class="zc-lrow" data-a="rec" data-rec="' + h(z.id) + '">' + I('film') + '<span>' + h(z.title) + '<small>' + mmss(z.dur) + ' · ' + shortDay(z.at) + '</small></span></button>').join('') : '') + '</section>' +
      (!C.mon ? '<section><button type="button" class="zc-drow" data-a="starsin">' + I('star') + '<span>Starred messages</span><em>' + stars.length + '</em></button><label class="zc-drow">' + I('belloff') + '<span>Mute notifications</span><input type="checkbox" id="zc-mute"' + (isMuted(r.id) ? ' checked' : '') + ' role="switch"></label>' + (r.monitored ? '<div class="zc-drow">' + I('eye') + '<span>Monitored by the office<small>Owner and Admin can read this chat (read-only)</small></span></div>' : '') + '</section>' : '') +
      (r.kind === 'group' ? '<section><h6 class="zc-h6">' + r.members.length + ' members · ' + r.members.filter(X.online).length + ' online</h6>' + r.members.slice().sort((a, b) => (b === r.g.mentor) - (a === r.g.mentor) || (X.online(b) ? 1 : 0) - (X.online(a) ? 1 : 0)).map(memberRow).join('') + '<div class="zc-pr">' + av('U:office', 36) + '<span><b>Academy Office</b><small>Can post and read · monitors</small></span><em class="zc-role">Office</em></div></section>' : '') +
      (stars.length && C.istars ? '<section><h6 class="zc-h6">Starred here</h6>' + stars.map(x => '<button type="button" class="zc-lrow" data-a="jumpclose" data-id="' + x.id + '">' + I('star') + '<span>' + h(String(preview(x)).slice(0, 80)) + '<small>' + h(x.name) + ' · ' + shortDay(x.at) + '</small></span></button>').join('') + '</section>' : '') +
      '</div>';
    const mu = $('zc-mute'); if (mu) mu.onchange = () => { const d2 = D(), L = d2.mute[m.pid] = d2.mute[m.pid] || []; const i = L.indexOf(r.id); if (mu.checked && i < 0) L.push(r.id); if (!mu.checked && i > -1) L.splice(i, 1); X.save(); say(mu.checked ? 'Muted: no pop-ups from this chat' : 'Notifications on'); drawSide(); };
  }

  /* ---------------------------------------------------------------- search inside a chat */
  function searchCount() { const L = qa('#zc-ml mark'); const n = $('zc-sn'); if (n) n.textContent = C.sq.length > 1 ? (L.length ? (Math.min(C.sIdx, L.length - 1) + 1) + ' of ' + L.length : 'No results') : ''; }
  function searchGo(dir) { const L = qa('#zc-ml mark'); if (!L.length) return; C.sIdx = (C.sIdx + dir + L.length) % L.length; L.forEach((x, i) => x.classList.toggle('cur', i === C.sIdx)); const row = L[C.sIdx].closest('.zc-row'); if (row) jumpTo(row.dataset.id); searchCount(); }

  /* ---------------------------------------------------------------- events */
  function bindWA() {
    const W = $('zc-wa'); if (!W || W.__b) return; W.__b = 1;
    W.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'); if (f && f.closest('.zc-chips')) { C.filter = f.dataset.f; C.starred = false; drawSide(); return; }
      const rb = e.target.closest('[data-room]');
      if (rb && rb.closest('#zc-rl')) { openRoom(rb.dataset.room, rb.dataset.mid); return; }
      const b = e.target.closest('[data-a]'); if (!b || !W.contains(b)) return;
      act(b.dataset.a, b, e);
    });
  }
  function openRoom(rid, mid) {
    const m = me();
    if (C.mon) { X.MON.room = rid; G(() => log('Chat opened by ' + m.role, rid, 'Chat Monitor')); }
    X.CH.room = rid; C.open = true; C.starred = false; if (mid) C.jump = mid;
    drawSide(); drawMain(true);
    if (window.innerWidth > 760 && $('zc-in')) $('zc-in').focus();
  }
  function act(a, b, e) {
    const m = me(), rid = X.CH.room, r = roomOf(rid), d = D(), id = b.dataset.id, x = id && d.msgs.find(y => y.id === id);
    switch (a) {
      case 'back': C.open = false; C.info = false; drawMain(); break;
      case 'starview': C.starred = true; drawSide(); break;
      case 'unstarview': C.starred = false; drawSide(); break;
      case 'newchat': C.starred = false; $('zc-q').focus(); say('Type a name to start a private chat'); break;
      case 'info': C.info = !C.info; C.istars = false; drawMain(); break;
      case 'infoclose': C.info = false; drawMain(); break;
      case 'itab': C.itab = b.dataset.t; drawInfo(r); break;
      case 'starsin': C.istars = !C.istars; drawInfo(r); break;
      case 'profile': G(() => window.FTA_TREE.open(b.dataset.pid, { mode: isOffice() ? 'office' : 'view' })); break;
      case 'dmto': openRoom(X.dmId(m.office ? 'U:office' : m.pid, b.dataset.pid)); break;
      case 'search': C.sOpen = true; C.info = false; $('zc-sbar').hidden = false; $('zc-sq').value = C.sq; $('zc-sq').focus(); $('zc-sq').oninput = () => { C.sq = $('zc-sq').value.trim(); C.sIdx = 0; C.sig = ''; drawMain(); }; $('zc-sq').onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); searchGo(ev.shiftKey ? -1 : 1); } if (ev.key === 'Escape') act('sclose', b); }; drawMain(); break;
      case 'sclose': C.sOpen = false; C.sq = ''; $('zc-sbar').hidden = true; C.sig = ''; drawMain(); break;
      case 'snext': searchGo(1); break; case 'sprev': searchGo(-1); break;
      case 'call': if (r.kind === 'group') { liveFor(r.g.id); } else { callPerson(X.other(r, m.office ? 'U:office' : m.pid)); } break;
      case 'watch': X.WT.room = rid; X.force(); go(pref() + 'watch'); break;
      case 'joinlive': joinLive(b.dataset.rk); break;
      case 'pinjump': { const pins = (d.pins[rid] || []); jumpTo(b.dataset.id); C.pinIdx = ((C.pinIdx || 0) + 1) % Math.max(1, pins.length); setTimeout(() => drawTop(r), 600); break; }
      case 'jump': jumpTo(b.dataset.id); break;
      case 'jumpclose': C.info = false; drawMain(); setTimeout(() => jumpTo(b.dataset.id), 50); break;
      case 'bottom': { const B = $('zc-body'); B.scrollTop = B.scrollHeight; markReadZ(rid); break; }
      case 'reply': startReply(id); break;
      case 'reactbar': reactBar(id, b); break;
      case 'menu': msgMenu(id, b); break;
      case 'react': toggleReact(id, b.dataset.e); break;
      case 'send': sendNow(); break;
      case 'cancel': X.CH.reply = X.CH.edit = null; drawComposer($('zc-in').value && !X.CH.edit ? $('zc-in').value : ''); break;
      case 'unpend': C.pending = null; drawComposer($('zc-in').value); break;
      case 'emopick': { const em = $('zc-emo'); em.hidden = !em.hidden; break; }
      case 'emo': { const inp = $('zc-in'), p = inp.selectionStart || inp.value.length; inp.value = inp.value.slice(0, p) + b.dataset.e + inp.value.slice(p); inp.focus(); inp.setSelectionRange(p + b.dataset.e.length, p + b.dataset.e.length); inp.dispatchEvent(new Event('input')); break; }
      case 'voice': voiceStart(); break;
      case 'vcancel': voiceStop(false); break;
      case 'vsend': voiceStop(true); break;
      case 'vplay': vplay(b); break;
      case 'rec': openRec(b.dataset.rec); break;
      case 'att': { G(() => { SCH.TS.gid = b.dataset.gid; SCH.TS.date = b.dataset.date || TODAY_(); }); goFirst(X.kindOf(m.role) === 't' ? ['tp-att'] : ['ac-att', 'attendance', 'ac-attendance', 'tp-att']); break; }
      case 'page': goFirst(b.dataset.p.split(',')); break;
      case 'notice': if (G(() => V8.ntOpen)) G(() => V8.ntOpen(b.dataset.id)); else goFirst(['sp-notices', 'tp-notices', 'nc-notices']); break;
      case 'wt': openWatch(b.dataset.wt, b.dataset.t != null ? +b.dataset.t : null); break;
    }
  }
  function startReply(id) { X.CH.reply = id; X.CH.edit = null; closePop(); drawComposer($('zc-in') ? $('zc-in').value : ''); const i = $('zc-in'); if (i) i.focus(); }
  /* menu actions live on body-level popovers */
  document.addEventListener('click', e => {
    const p = e.target.closest('.zc-pop'); if (!p) { if (!e.target.closest('[data-a="menu"],[data-a="reactbar"]')) qa('.zc-pop').forEach(x => x.remove()); const em = $('zc-emo'); if (em && !em.hidden && !e.target.closest('#zc-emo,[data-a="emopick"]')) em.hidden = true; return; }
    const b = e.target.closest('[data-a]'); if (!b) return; const id = b.dataset.id, d = D(), x = d.msgs.find(y => y.id === id), m = me(); if (!x) return;
    const a = b.dataset.a;
    if (a === 'react') return toggleReact(id, b.dataset.e);
    if (a === 'emomore') return moreEmoji(id);
    closePop();
    if (a === 'reply') startReply(id);
    else if (a === 'replypriv') { X.CH.room = X.dmId(m.pid, x.by); C.open = true; drawSide(); drawMain(true); X.CH.reply = id; drawComposer(''); $('zc-in') && $('zc-in').focus(); }
    else if (a === 'copy') { G(() => navigator.clipboard.writeText(x.text)); say('Copied'); }
    else if (a === 'fwd') forward(id);
    else if (a === 'pin') { const L = d.pins[x.room] = d.pins[x.room] || []; const i = L.indexOf(id); if (i > -1) L.splice(i, 1); else { L.unshift(id); if (L.length > 3) L.pop(); addMsg(x.room, m.office ? 'U:office' : m.pid, { kind: 'sys', icon: 'pin', text: first(m.name) + ' pinned a message' }); } X.save(); onData(); }
    else if (a === 'star') { const L = d.stars[m.pid] = d.stars[m.pid] || []; const i = L.indexOf(id); if (i > -1) L.splice(i, 1); else L.push(id); X.save(); say(i > -1 ? 'Unstarred' : 'Starred'); onData(); }
    else if (a === 'msginfo') msgInfo(id);
    else if (a === 'edit') { X.CH.edit = id; X.CH.reply = null; drawComposer(x.text); $('zc-in').focus(); }
    else if (a === 'delme') { const L = d.hide[m.pid] = d.hide[m.pid] || []; L.push(id); X.save(); C.sig = ''; onData(); say('Deleted for you'); }
    else if (a === 'delall') { x.deleted = true; x.delAt = now(); X.save(); C.sig = ''; onData(); say('Deleted for everyone'); }
  });
  /* touch: swipe right to reply, long-press for the menu; desktop: right-click for the menu, double-click to reply */
  (function touch() {
    let st = null;
    document.addEventListener('pointerdown', e => { const row = e.target.closest('#zc-ml .zc-row'); if (!row || e.button > 0 || e.target.closest('button,a,audio,input')) { st = null; return; } st = { row, x: e.clientX, y: e.clientY, id: row.dataset.id, t: now(), touch: e.pointerType !== 'mouse', lp: null, moved: false }; if (st.touch) st.lp = setTimeout(() => { if (st && !st.moved) { navigator.vibrate && G(() => navigator.vibrate(15)); msgMenu(st.id, st.row.querySelector('.zc-b')); st = null; } }, 480); }, { passive: true });
    document.addEventListener('pointermove', e => { if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { st.moved = true; clearTimeout(st.lp); } if (!st.touch || Math.abs(dy) > 30) return; if (dx > 0 && dx > Math.abs(dy)) { const b = st.row.querySelector('.zc-bw'); b.style.transform = 'translateX(' + Math.min(80, dx) + 'px)'; st.row.classList.toggle('swipe', dx > 56); } }, { passive: true });
    const end = e => { if (!st) return; clearTimeout(st.lp); const dx = e.clientX - st.x; const b = st.row.querySelector('.zc-bw'); if (b) b.style.transform = ''; st.row.classList.remove('swipe'); if (st.touch && dx > 56 && roomOf(X.CH.room) && X.canWrite(roomOf(X.CH.room), me()) && !C.mon) startReply(st.id); st = null; };
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    document.addEventListener('contextmenu', e => { const row = e.target.closest('#zc-ml .zc-row'); if (!row || e.target.closest('a,img')) return; e.preventDefault(); msgMenu(row.dataset.id, row.querySelector('.zc-b')); });
    document.addEventListener('dblclick', e => { const row = e.target.closest('#zc-ml .zc-row'); if (!row || C.mon) return; const r = roomOf(X.CH.room); if (r && X.canWrite(r, me())) startReply(row.dataset.id); });
  })();
  function bindBody(r) {
    const B = $('zc-body'), M = $('zc-main'); if (!B) return;
    B.onscroll = () => { fab(r); if (!C.mon && B.scrollHeight - B.scrollTop - B.clientHeight < 80 && X.unread(r.id, me().pid)) { markReadZ(r.id); drawSide(); fab(r); } };
    if (!X.canWrite(r, me()) || C.mon) return;
    let dc = 0;
    M.ondragenter = e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { dc++; $('zc-drop').hidden = false; e.preventDefault(); } };
    M.ondragover = e => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); };
    M.ondragleave = () => { dc = Math.max(0, dc - 1); if (!dc) $('zc-drop').hidden = true; };
    M.ondrop = e => { e.preventDefault(); dc = 0; $('zc-drop').hidden = true; const f = e.dataTransfer.files[0]; if (f) attach(f); };
  }
  /* voice notes */
  const VR = { rec: null, chunks: [], t0: 0, tick: null, send: false };
  async function voiceStart() {
    if (VR.rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { say('This browser cannot record voice here. On the live site it works in Chrome and Safari.'); return; }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true }); VR.chunks = []; VR.rec = new MediaRecorder(st); VR.t0 = now(); VR.send = false;
      VR.rec.ondataavailable = ev => VR.chunks.push(ev.data);
      VR.rec.onstop = () => { st.getTracks().forEach(t => t.stop()); clearInterval(VR.tick); const bl = new Blob(VR.chunks, { type: VR.rec.mimeType || 'audio/webm' }), dur = Math.max(1, Math.round((now() - VR.t0) / 1000)); VR.rec = null; const rb = $('zc-recbar'); if (rb) rb.hidden = true; if (!VR.send) return; if (bl.size > 700 * 1024) { say('Voice message too long for the demo (keep it under a minute).'); return; } const rd = new FileReader(); rd.onload = () => sendNow({ voice: { data: rd.result, dur } }); rd.readAsDataURL(bl); };
      VR.rec.start(); $('zc-recbar').hidden = false; VR.tick = setInterval(() => { const e = $('zc-rt'); if (e) e.textContent = mmss((now() - VR.t0) / 1000); }, 300); setTimeout(() => VR.rec && VR.rec.state === 'recording' && voiceStop(true), 60000);
    } catch (err) { say('Microphone permission was not given.'); }
  }
  function voiceStop(send) { if (!VR.rec) return; VR.send = send; VR.rec.stop(); }
  function vplay(b) {
    const box = b.closest('.zc-voice'), au = box.querySelector('audio'), wv = box.querySelector('.zc-wave');
    qa('.zc-voice audio').forEach(o => { if (o !== au && !o.paused) o.pause(); });
    if (au.paused) { au.play().catch(() => say('This voice message cannot play here')); b.innerHTML = I('pause'); } else { au.pause(); b.innerHTML = I('play'); }
    au.ontimeupdate = () => { const k = au.duration && isFinite(au.duration) ? au.currentTime / au.duration : 0; const bars = qa('i', wv); bars.forEach((x, i) => x.classList.toggle('on', i / bars.length <= k)); };
    au.onended = au.onpause = () => { b.innerHTML = I('play'); };
  }
  function openChat(rid, mid) {
    if (rid) { X.CH.room = rid; C.extOpen = true; if (mid) C.jump = mid; }
    X.force(); go(pref() + 'chat');
  }
  X.OVR.chat = p => pageChatZ(p, false);
  X.OVR.monitor = p => pageChatZ(p, true);
  X.LISTEN.push(msg => {
    if (msg.t === 'typing') { X.CH.typing[msg.room] = { name: msg.name, at: now() }; if ($('zc-wa')) { drawSide(); if (X.CH.room === msg.room) drawSub(roomOf(msg.room)); setTimeout(() => { if ($('zc-wa')) { drawSide(); if (X.CH.room === msg.room) drawSub(roomOf(msg.room)); } }, 3700); } }
    if (msg.t === 'msg') {
      const r = roomOf(msg.room), m = me(); if (!r || (!r.members.includes(m.pid) && !(m.office && r.members.includes('U:office')))) return;
      const x = D().msgs.find(y => y.id === msg.id); if (!x || x.by === m.pid) return;
      const here = $('zc-wa') && X.CH.room === msg.room && !document.hidden;
      if (!here && !isMuted(msg.room) && !(x.mentions || []).includes(m.pid) && x.kind !== 'card') ztoast((r.kind === 'group' ? r.name + ' · ' : '') + (x.by === 'U:office' ? 'Academy Office' : x.name || ''), String(preview(x) || '').slice(0, 80), () => openChat(msg.room, x.id), 'Reply', 'chat');
    }
  });

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
