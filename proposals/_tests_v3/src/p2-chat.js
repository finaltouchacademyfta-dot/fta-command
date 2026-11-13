
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
