/* =====================================================================
   v9j · owner 29 Oct
   1. Routine per student: pick a student, set their own class days and
      times for each subject. Attendance, calendars and the Student Portal
      follow the student's own days (class days are used when none are set).
   2. The student's calendar shows homework due and events for them.
   3. Circles like WhatsApp groups: open circles can be joined / left by the
      person themselves; nobody sees the other members; every notice says
      which circle it came through.
   4. Everything can be edited or deleted: students (to the Recycle bin,
      with everything that belongs to them), expense categories, boards and
      accounts.
   New skins only.
   ===================================================================== */
const V9J = window.V9J = {};
V9J.boss = () => ['Owner', 'Admin'].includes(ST.role) && !SCH.preview;
V9J.DL = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
V9J.di = d => V9J.DL.indexOf(d);

/* ---------- 1. per-student routine ---------- */
V9J.own = (sid, gid) => SCH.RT.filter(e => e.stu && e.stu.includes(sid) && (!gid || e.gid === gid));
V9J._rtMatch = SCH.rtMatch;
SCH.rtMatch = (e, f) => {
  if (!V9J._rtMatch(e, f)) { if (!(f && f.stu && e.stu && e.stu.includes(f.stu))) return false; }
  if (f && f.stu) { if (e.stu) return e.stu.includes(f.stu); if (e.gid && V9J.own(f.stu, e.gid).length) return false; }
  return true;
};
V9J.slots = (sid, d, gid) => { const own = V9J.own(sid, gid), L = (own.length ? own : SCH.RT.filter(e => e.gid === gid && !e.stu)).filter(e => e.day === SCH.dow(d)); return L.sort((a, b) => a.start < b.start ? -1 : 1).map(e => [SCH.t12(e.start), SCH.t12(e.start), SCH.t12(e.end)]); };
V9I.dayInfo = (sid, d) => V9I.groups(sid).map(g => { const k = g.id + '|' + d, r = SCH.ATT[k], x = SCH.ATTX[k] || {}, slots = V9J.slots(sid, d, g.id); return { g, k, r, x, slots, v: r && r.marks[sid], off: x.held && x.held !== 'Held' }; });
V9J.canEdit = sid => { if (V9J.boss() || (SCH.can && SCH.can('rout', 'e') && !SCH.isTeacher())) return true; return SCH.isTeacher() && V9I.groups(sid).length > 0; };
V9J.students = () => { const G = SCH.isTeacher() ? SCH.myGroups() : SCH.GROUPS.filter(g => g.status === 'Active'); return uniq(G.flatMap(g => g.stu)).map(stuOf).filter(s => s && s.status !== 'Withdrawn').sort((a, b) => a.name.localeCompare(b.name)); };
V9J.form = sid => {
  const L = V9J.students(); if (!L.length) { toast('No students yet'); return; }
  sid = sid && L.some(s => s.id === sid) ? sid : (V9J.cur && L.some(s => s.id === V9J.cur) ? V9J.cur : L[0].id); V9J.cur = sid;
  const s = stuOf(sid), G = V9I.groups(sid), can = V9J.canEdit(sid);
  const block = g => { const own = V9J.own(sid, g.id), cls = SCH.RT.filter(e => e.gid === g.id && !e.stu), use = own.length ? own : cls;
    return `<section class="v9j-sub"><div class="v9j-sh"><div><b>${esc(g.name)}</b><small>Teacher · ${esc(menName(g.mentor))} · ${own.length ? 'Own days for ' + esc(s.name.split(' ')[0]) : 'Using the class days'}</small></div>${can ? `<button type="button" class="btn s p" onclick="V9J.add('${sid}','${g.id}')">${ic('plus')}Add a class day</button>` : ''}</div>
      ${use.length ? `<div class="v9j-days">${use.sort((a, b) => V9J.di(a.day) - V9J.di(b.day) || (a.start < b.start ? -1 : 1)).map(e => `<div class="v9j-day ${own.length ? 'own' : ''}"><b>${SCH.DAYL[e.day]}</b><span class="num">${SCH.t12(e.start)} – ${SCH.t12(e.end)}</span>${e.place ? `<small>${esc(e.place)}</small>` : ''}${own.length && can ? `<span class="v9j-act"><button type="button" class="btn s" onclick="V9J.add('${sid}','${g.id}','${e.id}')">${ic('edit')}Edit</button><button type="button" class="btn s d" onclick="V9J.del('${sid}','${e.id}')">${ic('trash')}</button></span>` : ''}</div>`).join('')}</div>` : `<p class="v9f-none">No class days yet.</p>`}
      ${!own.length && cls.length && can ? `<button type="button" class="v9h-add" onclick="V9J.copy('${sid}','${g.id}')">${ic('plus')}Give ${esc(s.name.split(' ')[0])} own days (start from the class days)</button>` : ''}${own.length && can ? `<button type="button" class="v9h-add" onclick="V9J.reset('${sid}','${g.id}')">Use the class days again</button>` : ''}</section>`; };
  sheet('STUDENT ROUTINE', 'Class days per student', `<div class="fld"><label for="v9j-s">Student</label><select id="v9j-s" onchange="V9J.form(this.value)">${opts(L.map(x => [x.id, x.name + ' · ' + x.id + ' · ' + x.cls]), sid)}</select></div>
    <p class="v9i-how">${ic('info')}Each student can have their own days and times for every subject. Attendance, the student’s calendar and the Student Portal follow these days. If none are set, the class days are used.</p>
    ${G.length ? G.map(block).join('') : `<p class="v9f-none">${esc(s.name)} has no subject${SCH.isTeacher() ? ' with you' : ''} yet.</p>`}
    <div class="acts"><button type="button" class="btn" onclick="V9F.stuCal('${sid}')">${ic('cal')}Attendance calendar</button><button type="button" class="btn p" onclick="closeSheet()">Done</button></div>`, true);
};
V9J.add = (sid, gid, id) => {
  if (!V9J.canEdit(sid)) { toast('You cannot change this routine'); return; }
  const e = id ? SCH.RT.find(x => x.id === id) : null, g = SCH.grp(gid), s = stuOf(sid);
  V9H.pop(`<div class="v9h-h"><b>${e ? 'Change class day' : 'Add class days'} · ${esc(s.name)}</b><small>${esc(g.name)} · ${esc(menName(g.mentor))}</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>
    <div class="fld"><label>Days</label><div class="v9j-dpick">${V9J.DL.map((d, i) => `<label><input type="checkbox" value="${d}" ${e ? (e.day === d ? 'checked' : '') : ''} ${e ? 'onclick="document.querySelectorAll(\'.v9j-dpick input\').forEach(x=>{if(x!==this)x.checked=false})"' : ''}><span>${d}</span></label>`).join('')}</div></div>
    <div class="grid g2" style="margin-top:8px">${fld('Starts', `<input id="v9j-a" type="time" value="${e ? e.start : '17:00'}">`)}${fld('Ends', `<input id="v9j-b" type="time" value="${e ? e.end : '18:00'}">`)}</div>
    <div style="margin-top:8px">${fld('Place or link', `<input id="v9j-p" value="${e ? esc(e.place || '') : ''}" placeholder="e.g. Room 2, Zoom">`)}</div><div id="v9j-w"></div>
    <div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Cancel</button><button class="btn p" type="button" onclick="V9J.save('${sid}','${gid}','${id || ''}')">Save</button></div>`);
};
V9J.save = (sid, gid, id) => {
  const days = [...document.querySelectorAll('.v9j-dpick input:checked')].map(x => x.value), a = $('#v9j-a').value, b = $('#v9j-b').value, pl = $('#v9j-p').value.trim(), g = SCH.grp(gid);
  if (!days.length) { toast('Tick at least one day'); return; } if (!a || !b || b <= a) { toast('The end time must be after the start time'); return; }
  const clash = []; days.forEach(d => { const v = { day: d, start: a, end: b, gid, mentor: g.mentor }; (SCH.rtClash(v, id) || []).forEach(c => { if (/already has/.test(c)) clash.push(d + ': ' + c); }); });
  if (clash.length && !V9J.force) { $('#v9j-w').innerHTML = note(esc(uniq(clash).join(' · ')) + '. Press Save again to keep it anyway.', 'warn'); V9J.force = true; return; }
  V9J.force = false;
  if (id) { const e = SCH.RT.find(x => x.id === id); Object.assign(e, { day: days[0], start: a, end: b, place: pl }); }
  else days.forEach(d => SCH.RT.push({ id: 'RT-S' + Date.now().toString(36) + d, day: d, start: a, end: b, gid, mentor: g.mentor, title: '', place: pl, note: '', stu: [sid] }));
  SCH.log('Student routine changed', stuOf(sid).name + ' · ' + g.name, days.join(', ') + ' ' + SCH.t12(a) + '–' + SCH.t12(b)); V9H.popClose(); V9J.form(sid); toast('Saved · ' + stuOf(sid).name + '’s routine');
};
V9J.del = (sid, id) => { const e = SCH.RT.find(x => x.id === id); SCH.confirm({ kind: 'delete', title: 'Remove this class day?', body: SCH.DAYL[e.day] + ' ' + SCH.t12(e.start) + ' · ' + esc(stuOf(sid).name), ok: 'Remove', onOk: () => { SCH.toBin('Class day', stuOf(sid).name + ' · ' + SCH.DAYL[e.day], SCH.RT, e); V9J.form(sid); } }); };
V9J.copy = (sid, gid) => { SCH.RT.filter(e => e.gid === gid && !e.stu).forEach(e => SCH.RT.push(Object.assign({}, e, { id: 'RT-S' + Date.now().toString(36) + e.day + Math.floor(Math.random() * 99), stu: [sid] }))); SCH.log('Student routine created', stuOf(sid).name + ' · ' + SCH.grp(gid).name, 'from the class days'); V9J.form(sid); };
V9J.reset = (sid, gid) => SCH.confirm({ kind: 'reset', title: 'Use the class days again?', body: 'Removes ' + esc(stuOf(sid).name) + '’s own days for ' + esc(SCH.grp(gid).name) + '.', ok: 'Use class days', onOk: () => { V9J.own(sid, gid).forEach(e => SCH.RT.splice(SCH.RT.indexOf(e), 1)); SCH.log('Student routine reset', stuOf(sid).name + ' · ' + SCH.grp(gid).name); V9J.form(sid); } });
/* entry points: routine pages, attendance calendar, student card */
V9J._rtPage = SCH.rtPage;
SCH.rtPage = mine => { const r = V9J._rtPage(mine); if (SCH.NEW()) requestAnimationFrame(() => { const pg = document.querySelector('#view .page'); if (pg && !pg.querySelector('.v9j-bar')) pg.insertAdjacentHTML('afterbegin', `<div class="v9j-bar">${ic('students')}<div class="grow"><b>Routine per student</b><small>Choose a student and set their own days and times for each subject</small></div><button type="button" class="btn p" onclick="V9J.form()">${ic('cal')}Student routine</button></div>`); }); return r; };
V9J._stuCal = V9F.stuCal;
V9F.stuCal = (sid, mo) => { V9J._stuCal(sid, mo); const a = document.querySelector('#sheet .acts'); if (a && V9J.canEdit(sid)) a.insertAdjacentHTML('afterbegin', `<button type="button" class="btn" onclick="V9J.form('${sid}')">${ic('edit')}Set class days</button>`); const w = document.querySelector('#sheet .v9f-box ul'); if (w) w.innerHTML = V9I.groups(sid).map(g => { const own = V9J.own(sid, g.id), L = own.length ? own : SCH.RT.filter(e => e.gid === g.id && !e.stu); return `<li><b>${esc(g.name)}</b> · ${L.length ? L.sort((a, b) => V9J.di(a.day) - V9J.di(b.day)).map(e => SCH.DAYL[e.day].slice(0, 3) + ' ' + SCH.t12(e.start)).join(', ') : 'no class day yet'}${own.length ? ' <span class="v9j-tag">own days</span>' : ''}</li>`; }).join('') || '<li>No subject yet.</li>'; };

/* ---------- 2. student calendar: homework and events ---------- */
V9J.myItems = (sid, d) => {
  const G = SCH.GROUPS.filter(g => g.stu.includes(sid)), hw = SCH.HW.filter(h => h.due === d && G.some(g => g.id === h.gid) && (!h.stu || h.stu.includes(sid)));
  const ev = (V8.EV || []).filter(e => (e.stu || []).includes(sid) && (e.date === d || (e.repeat === 'weekly' && e.date <= d && SCH.dow(e.date) === SCH.dow(d) && (!e.until || d <= e.until))));
  return { hw, ev };
};
V9J._spCal = PAGES['sp-cal'];
PAGES['sp-cal'] = function () {
  const r = V9J._spCal.apply(this, arguments); if (!SCH.NEW()) return r;
  const sid = SCH.mySid(), list = [];
  document.querySelectorAll('#view .cal-d[onclick]').forEach(b => { const d = (b.getAttribute('onclick').match(/'(\d{4}-\d{2}-\d{2})'/) || [])[1]; if (!d) return; const I = V9J.myItems(sid, d); if (!I.hw.length && !I.ev.length) return; b.insertAdjacentHTML('beforeend', `<span class="v9j-ci">${I.hw.map(() => '<i class="hw">HW</i>').join('')}${I.ev.map(() => '<i class="ev">★</i>').join('')}</span>`); b.dataset.tip = I.hw.map(h => 'Homework due: ' + h.title).concat(I.ev.map(e => e.title + (e.start ? ' · ' + SCH.t12(e.start) : ''))).join(' · '); I.hw.forEach(h => list.push([d, 'Homework due', h.title, SCH.grp(h.gid).name])); I.ev.forEach(e => list.push([d, e.type === 'class' ? 'Extra class' : 'Event', e.title, (e.start ? SCH.t12(e.start) : 'All day') + (e.place ? ' · ' + e.place : '')])); });
  const card = document.querySelector('#view .cal'); if (card) card.closest('.card').insertAdjacentHTML('afterend', `<div class="card" style="margin-top:14px"><div class="ch"><div><h2>Homework and events this month</h2><p>Shown on the calendar as HW and ★</p></div></div>${list.length ? `<div class="sc-list">${list.sort().map(x => `<div class="sc-li"><span class="sc-time">${SCH.fmtD(x[0])}</span><div class="grow"><b>${esc(x[2])}</b><small>${esc(x[1])} · ${esc(x[3])}</small></div></div>`).join('')}</div>` : SCH.empty('Nothing due this month.')}</div>`);
  return r;
};

/* ---------- 3. circles: join / leave yourself, private members, source on notices ---------- */
V9J.open = c => c.kind === 'manual' && c.open !== false && (c.open || c.policy === 'On request');
V9J.inC = (c, k) => V8.cMembers(c).includes(k) || (ST.role === 'Student' && V8.cMembers(c).includes('grd:' + SCH.mySid()));
V9J.myCircles = () => {
  const k = V8.meKey(), mine = V8.CIRCLES.filter(c => V9J.inC(c, k)), open = V8.CIRCLES.filter(c => V9J.open(c) && !mine.includes(c));
  return `<div class="card v9j-mc"><div class="ch"><div><h2>My circles</h2><p>Notices reach you through these circles. Other members are private — nobody can see who else is in a circle.</p></div></div>
    <div class="v9j-cl">${mine.map(c => `<div class="v9j-c" style="--tone:var(--${c.tone || 'gold'})"><span class="v9j-dot"></span><div class="grow"><b>${esc(c.name)}</b><small>${esc(c.desc || '')}</small></div>${V9J.open(c) && (c.members || []).includes(k) ? `<button type="button" class="btn s" onclick="V9J.leave('${c.id}')">Leave</button>` : '<span class="v9j-off">Official · automatic</span>'}</div>`).join('') || '<p class="v9f-none">You are not in any circle yet.</p>'}</div>
    ${open.length ? `<h4 class="v9j-h4">Circles you can join</h4><div class="v9j-cl">${open.map(c => `<div class="v9j-c" style="--tone:var(--${c.tone || 'gold'})"><span class="v9j-dot"></span><div class="grow"><b>${esc(c.name)}</b><small>${esc(c.desc || '')}</small></div><button type="button" class="btn s p" onclick="V9J.join('${c.id}')">${ic('plus')}Join</button></div>`).join('')}</div>` : ''}</div>`;
};
V9J.join = id => { const c = V8.CIRCLES.find(x => x.id === id), k = V8.meKey(); if (!c || !V9J.open(c)) { toast('This circle is not open to join'); return; } c.members = uniq((c.members || []).concat(k)); SCH.log('Joined circle', c.name, (ME() || {}).name); PAGES[ST.page](); toast('You joined ' + c.name); };
V9J.leave = id => { const c = V8.CIRCLES.find(x => x.id === id), k = V8.meKey(); if (!c || !V9J.open(c)) return; SCH.confirm({ kind: 'off', title: 'Leave ' + esc(c.name) + '?', body: 'You will stop getting its notices. You can join again later.', ok: 'Leave', onOk: () => { c.members = (c.members || []).filter(x => x !== k); SCH.log('Left circle', c.name, (ME() || {}).name); PAGES[ST.page](); toast('You left ' + c.name); } }); };
V9J.srcTag = () => requestAnimationFrame(() => {
  const k = V8.meKey();
  document.querySelectorAll('#view .v8-nt').forEach(a => {
    if (a.dataset.v9j) return; a.dataset.v9j = 1; const b = a.querySelector('[onclick*="V8.ntOpen"]'), id = b && (b.getAttribute('onclick').match(/'([^']+)'/) || [])[1], n = id && V8.NOTICES.find(x => x.id === id); if (!n) return;
    const via = (n.circles || []).map(cid => V8.CIRCLES.find(c => c.id === cid)).filter(c => c && V9J.inC(c, k));
    const top = a.querySelector('.v8-nt-top'); if (top && via.length) top.insertAdjacentHTML('beforeend', `<span class="v9j-from">${ic('circles')}From ${via.map(c => `<b style="--tone:var(--${c.tone || 'gold'})">${esc(c.name)}</b>`).join(', ')}</span>`);
  });
});
['tp-notices', 'sp-notices'].forEach(p => { const o = PAGES[p]; if (!o) return; PAGES[p] = function () { const r = o.apply(this, arguments); if (SCH.NEW()) { const pg = document.querySelector('#view .page') || document.getElementById('view'); const feed = pg.querySelector('.v8-feed') || pg.querySelector('.tw'); if (feed && !pg.querySelector('.v9j-mc')) feed.insertAdjacentHTML('beforebegin', V9J.myCircles()); V9J.srcTag(); } return r; }; });
/* office: choose which circles people may join or leave themselves */
V9J._ciList = V8.ciList;
if (V9J._ciList) V8.ciList = function () {
  let h = V9J._ciList.apply(this, arguments); if (!SCH.NEW() || !SCH.can('notice', 'e')) return h;
  return h + `<div class="card" style="margin-top:14px"><div class="ch"><div><h2>Open circles</h2><p>People can join or leave an open circle themselves from their portal, like a WhatsApp group. Automatic circles (teachers, students, guardians) cannot be left.</p></div></div><div class="v9j-cl">${V8.CIRCLES.filter(c => c.kind === 'manual').map(c => `<div class="v9j-c" style="--tone:var(--${c.tone || 'gold'})"><span class="v9j-dot"></span><div class="grow"><b>${esc(c.name)}</b><small>${dg((c.members || []).length)} members</small></div><label class="v9j-sw"><input type="checkbox" ${V9J.open(c) ? 'checked' : ''} onchange="V9J.setOpen('${c.id}',this.checked)"><span>${V9J.open(c) ? 'Open' : 'Closed'}</span></label></div>`).join('') || '<p class="v9f-none">Make a hand-picked circle first.</p>'}</div></div>`;
};
V9J.setOpen = (id, on) => { const c = V8.CIRCLES.find(x => x.id === id); c.open = !!on; SCH.log('Circle ' + (on ? 'opened' : 'closed'), c.name); PAGES[ST.page](); };

/* ---------- 4. delete a student; lists & categories ---------- */
V9J.stuDel = sid => {
  if (!V9J.boss()) { toast('Only the Owner or an Admin can delete a student'); return; }
  const s = stuOf(sid), pays = PAYMENTS.filter(p => p.stu === sid && p.status !== 'Rejected'), paid = sum(pays.filter(p => p.status === 'Verified'), p => p.amt);
  SCH.confirm({ kind: 'delete', title: 'Delete ' + esc(s.name) + '?', body: `Moves the student, ${dg(ENROL.filter(e => e.stu === sid).length)} subjects, ${dg(INVOICES.filter(i => i.stu === sid).length)} invoices and ${dg(pays.length)} payments${paid ? ' (' + money(paid) + ' received — this leaves the account balances)' : ''} to the Recycle bin. You can restore everything within 30 days. If the student only stopped coming, mark them Withdrawn instead.`, reason: true, ok: 'Delete student', onOk: why => {
    const B = { enrol: ENROL.filter(e => e.stu === sid), inv: INVOICES.filter(i => i.stu === sid), pay: PAYMENTS.filter(p => p.stu === sid), sport: SCH.SPORT.filter(x => x.stu === sid), groups: SCH.GROUPS.filter(g => g.stu.includes(sid)).map(g => g.id) };
    B.enrol.forEach(x => ENROL.splice(ENROL.indexOf(x), 1)); B.inv.forEach(x => INVOICES.splice(INVOICES.indexOf(x), 1)); B.pay.forEach(x => PAYMENTS.splice(PAYMENTS.indexOf(x), 1)); B.sport.forEach(x => SCH.SPORT.splice(SCH.SPORT.indexOf(x), 1)); SCH.GROUPS.forEach(g => { const k = g.stu.indexOf(sid); if (k >= 0) g.stu.splice(k, 1); });
    s._v9bundle = B; SCH.toBin('Student', s.name + ' · ' + sid + (why ? ' · ' + why : ''), STUDENTS, s); MOVES = movements(); closeSheet(); go('students'); toast(s.name + ' moved to the Recycle bin');
  } });
};
V9J._restore = SCH.restore;
SCH.restore = id => { const b = SCH.BIN.find(x => x.id === id), B = b && b.item && b.item._v9bundle; V9J._restore(id); if (B) { const s = b.item; ENROL.push(...B.enrol); INVOICES.push(...B.inv); PAYMENTS.push(...B.pay); SCH.SPORT.push(...B.sport); B.groups.forEach(gid => { const g = SCH.grp(gid); if (g && !g.stu.includes(s.id)) g.stu.push(s.id); }); delete s._v9bundle; MOVES = movements(); } };
['stuView', 'stu360'].forEach(k => {
  const host = k === 'stu360' ? SCH : window, o = host[k]; if (typeof o !== 'function') return;
  host[k] = function (sid) { o.apply(this, arguments); if (!SCH.NEW() || !V9J.boss()) return; const a = document.querySelector('#sheet .s3-acts.end') || document.querySelector('#sheet .acts'); const s = stuOf(sid); if (a && s && !a.querySelector('.v9j-del')) a.insertAdjacentHTML('afterbegin', `<button type="button" class="btn d v9j-del" onclick="V9J.stuDel('${s.id}')">${ic('trash')}Delete student</button>`); else if (!a && s) { const sh = document.getElementById('sheet'); if (sh && !sh.querySelector('.v9j-del')) sh.insertAdjacentHTML('beforeend', `<div class="acts"><button type="button" class="btn d v9j-del" onclick="V9J.stuDel('${s.id}')">${ic('trash')}Delete student</button></div>`); } };
});
/* lists & categories */
V9J.lists = tab => {
  if (!V9J.boss()) { toast('Only the Owner or an Admin can change lists'); return; }
  tab = tab || V9J.lt || 'cat'; V9J.lt = tab;
  const T = [['cat', 'Expense categories'], ['board', 'Boards'], ['acc', 'Accounts']];
  let body = '';
  if (tab === 'cat') body = EXP_CATS.map((c, i) => { const n = EXPENSES.filter(e => e.cat === c).length; return `<div class="v9f-row"><div class="grow"><b>${esc(c)}</b><small>${dg(n)} expenses</small></div>${c === 'Mentor remuneration' ? '<span class="v9j-off">Used by payroll</span>' : `<button type="button" class="btn s" onclick="V9J.item('cat',${i})">${ic('edit')}Rename</button><button type="button" class="btn s d" onclick="V9J.itemDel('cat',${i})">${ic('trash')}</button>`}</div>`; }).join('');
  if (tab === 'board') body = V9H.BOARDS.map((c, i) => `<div class="v9f-row"><div class="grow"><b>${esc(c)}</b><small>${dg(STUDENTS.filter(s => (s.board || '').split(/,\s*/).includes(c)).length)} students</small></div><button type="button" class="btn s" onclick="V9J.item('board',${i})">${ic('edit')}Rename</button><button type="button" class="btn s d" onclick="V9J.itemDel('board',${i})">${ic('trash')}</button></div>`).join('');
  if (tab === 'acc') body = ACCOUNTS.map((a, i) => `<div class="v9f-row"><div class="grow"><b>${esc(a.name)}</b><small>${esc(a.type)} · balance ${money(balance(a.id))}${a.no ? ' · ' + esc(a.no) : ''}</small></div><button type="button" class="btn s" onclick="V9J.item('acc',${i})">${ic('edit')}Edit</button><button type="button" class="btn s d" onclick="V9J.itemDel('acc',${i})">${ic('trash')}</button></div>`).join('');
  sheet('SETTINGS', 'Lists & categories', `<div class="tabs" role="tablist">${T.map(t => `<button type="button" role="tab" class="${t[0] === tab ? 'on' : ''}" onclick="V9J.lists('${t[0]}')">${t[1]}</button>`).join('')}</div><div class="v9f-box">${body}</div><div class="acts"><button type="button" class="btn" onclick="closeSheet()">Close</button><button type="button" class="btn p" onclick="V9J.item('${tab}',-1)">${ic('plus')}Add</button></div>`);
};
V9J.item = (tab, i) => {
  if (tab === 'acc' && i < 0) { V9H.accFor = null; return V9H.accNew({ parentNode: { querySelector: () => null } }); }
  const cur = i < 0 ? '' : tab === 'cat' ? EXP_CATS[i] : tab === 'board' ? V9H.BOARDS[i] : ACCOUNTS[i].name, a = tab === 'acc' && i >= 0 ? ACCOUNTS[i] : null;
  V9H.pop(`<div class="v9h-h"><b>${i < 0 ? 'Add' : 'Edit'} ${tab === 'cat' ? 'category' : tab === 'board' ? 'board' : 'account'}</b><small>${i < 0 ? '' : 'Everything that uses it follows the new name'}</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>${fld('Name', `<input id="v9j-in" value="${esc(cur)}">`)}${a ? `<div class="grid g2" style="margin-top:8px">${fld('Type', `<select id="v9j-it" data-v9h="1">${opts(['Bank', 'Mobile banking', 'Cash', 'Other'], a.type)}</select>`)}${fld('Number', `<input id="v9j-ir" value="${esc(a.no || '')}">`)}</div>` : ''}<div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Cancel</button><button class="btn p" type="button" onclick="V9J.itemSave('${tab}',${i})">Save</button></div>`);
};
V9J.itemSave = (tab, i) => {
  const v = $('#v9j-in').value.trim(); if (v.length < 2) { toast('Write a name'); return; }
  const L = tab === 'cat' ? EXP_CATS : tab === 'board' ? V9H.BOARDS : null;
  if (L) { if (L.some((x, k) => k !== i && x.toLowerCase() === v.toLowerCase())) { toast('This name already exists'); return; }
    if (i < 0) L.splice(tab === 'cat' ? L.length - 1 : L.length, 0, v); else { const old = L[i]; L[i] = v; if (tab === 'cat') EXPENSES.forEach(e => { if (e.cat === old) e.cat = v; }); if (tab === 'board') STUDENTS.forEach(s => { if (s.board) s.board = s.board.split(/,\s*/).map(x => x === old ? v : x).join(', '); }); SCH.log((tab === 'cat' ? 'Category' : 'Board') + ' renamed', old + ' → ' + v); } }
  else { const a = ACCOUNTS[i]; const old = a.name; Object.assign(a, { name: v, type: $('#v9j-it').value, no: $('#v9j-ir').value.trim() }); METHOD[a.id] = a.type === 'Cash' ? 'Cash' : v; SCH.log('Account changed', old + ' → ' + v); }
  V9H.popClose(); V9J.lists(tab); toast('Saved');
};
V9J.itemDel = (tab, i) => {
  if (tab === 'cat') { const c = EXP_CATS[i], n = EXPENSES.filter(e => e.cat === c); SCH.confirm({ kind: 'delete', title: 'Delete category “' + esc(c) + '”?', body: n.length ? dg(n.length) + ' expenses use it; they move to “Other”.' : 'No expense uses it.', ok: 'Delete', onOk: () => { n.forEach(e => e.cat = 'Other'); EXP_CATS.splice(i, 1); SCH.log('Category deleted', c); V9J.lists('cat'); } }); }
  if (tab === 'board') { const c = V9H.BOARDS[i]; SCH.confirm({ kind: 'delete', title: 'Delete board “' + esc(c) + '” from the list?', body: 'Students keep what is written on their record.', ok: 'Delete', onOk: () => { V9H.BOARDS.splice(i, 1); SCH.log('Board removed', c); V9J.lists('board'); } }); }
  if (tab === 'acc') { const a = ACCOUNTS[i], used = (MOVES || []).some(m => m.acct === a.id); if (used) { toast(a.name + ' has money movements, so it cannot be deleted. Rename it or move its money first.'); return; } SCH.confirm({ kind: 'delete', title: 'Delete account “' + esc(a.name) + '”?', body: 'It has no money movements.', ok: 'Delete', onOk: () => { SCH.toBin('Account', a.name, ACCOUNTS, a); V9J.lists('acc'); } }); }
};
V9J._settings = PAGES.settings;
if (V9J._settings) PAGES.settings = function () { const r = V9J._settings.apply(this, arguments); if (SCH.NEW() && V9J.boss()) { const pg = document.querySelector('#view .page'); if (pg && !pg.querySelector('.v9j-bar')) pg.insertAdjacentHTML('afterbegin', `<div class="v9j-bar">${ic('settings')}<div class="grow"><b>Lists & categories</b><small>Add, rename or delete expense categories, boards and accounts — no code change needed</small></div><button type="button" class="btn p" onclick="V9J.lists()">${ic('edit')}Open</button></div>`); } return r; };
V9J._exp = PAGES.expenses;
if (V9J._exp) PAGES.expenses = function () { const r = V9J._exp.apply(this, arguments); if (SCH.NEW() && V9J.boss()) { const h = document.querySelector('#view .banner .row, #view .bn-acts, #view .banner'); const b = document.querySelector('#view .page'); if (b && !b.querySelector('.v9j-cat')) { const x = b.querySelector('.fbar'); if (x) x.insertAdjacentHTML('beforeend', `<button type="button" class="btn s v9j-cat" onclick="V9J.lists('cat')">${ic('edit')}Categories</button>`); } } return r; };
