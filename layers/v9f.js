/* =====================================================================
   v9f · owner review 29 Oct
   1. Nothing is final once typed: payroll adjustments and mentor payments
      can be edited or deleted (Owner / Admin; others per their rights),
      always with a reason and a log line.
   2. Smart attendance: did the class take place, a reason for every
      Late / Leave / Absent, a reason when a past day is marked late, and a
      calendar for each student.
   3. Homework for the whole class or chosen students, with pictures,
      videos or PDFs attached; students only see what is for them.
   New skins only.
   ===================================================================== */
const V9F = window.V9F = {};
V9F.boss = () => ['Owner', 'Admin'].includes(ST.role) && !SCH.preview;

/* ---------- 1. payroll adjustments and mentor payments: edit / delete ---------- */
V9F.adjs = it => {
  if (!it.adjs) { it.adjs = []; if (it.bonus) it.adjs.push({ t: 'Bonus', a: it.bonus, r: it.bonusNote || '', at: '' }); if (it.deduct) it.adjs.push({ t: 'Deduction', a: it.deduct, r: it.deductNote || '', at: '' }); }
  return it.adjs;
};
V9F.adjSync = it => { const L = V9F.adjs(it), B = L.filter(x => x.t === 'Bonus'), D = L.filter(x => x.t === 'Deduction'); it.bonus = sum(B, x => x.a); it.deduct = sum(D, x => x.a); it.bonusNote = B.map(x => x.r).filter(Boolean).join(' / '); it.deductNote = D.map(x => x.r).filter(Boolean).join(' / '); };
V9F.canAdj = m => { const r = PAYROLL[m]; if (!r) return false; if (ST.role === 'Owner' && !SCH.preview) return true; if (r.status === 'Paid' || (typeof locked === 'function' && locked(m))) return false; return V9F.boss() || !!(R_() && R_().edit && ST.role !== 'Mentor' && ST.role !== 'Student'); };
V9F._prAdj = prAdj;
prAdj = function (m, men) {
  if (!SCH.NEW()) return V9F._prAdj.apply(this, arguments);
  const it = PAYROLL[m].items.find(x => x.mentor === men); V9F.adjs(it);
  const t = $('#pa-t').value, a = +$('#pa-a').value, r = $('#pa-r').value.trim();
  if (!a || !r) { toast('Write the amount and the reason'); return; }
  it.adjs.push({ t, a, r: r + ' · ' + ME().name, at: SCH.nowStamp() }); V9F.adjSync(it);
  log('Payroll adjustment', menName(men) + ' · ' + mlab(m), t + ' ' + money(a) + ' · ' + r); prItem(m, men); render(); toast('Adjustment added');
};
V9F._prItem = prItem;
prItem = function (m, men) {
  V9F._prItem.apply(this, arguments);
  if (!SCH.NEW()) return;
  const it = PAYROLL[m].items.find(x => x.mentor === men); if (!it) return; const L = V9F.adjs(it), can = V9F.canAdj(m), sh = $('#sheet');
  const kv = sh.querySelector('.kv'); if (!kv) return;
  const pays = PRPAY.filter(p => p.month === m && p.mentor === men);
  sh.querySelectorAll('.li').forEach(li => { if (pays.some(p => li.textContent.includes(p.id))) li.remove(); });
  kv.insertAdjacentHTML('afterend', `<section class="v9f-box"><h4>Bonus and deductions</h4>${L.length ? L.map((x, k) => `<div class="v9f-row"><span class="v9f-t ${x.t === 'Bonus' ? 'ok' : 'bad'}">${x.t}</span><div class="grow"><b class="num">${money(x.a)}</b><small>${esc(x.r || '—')}${x.at ? ' · ' + esc(x.at) : ''}</small></div>${can ? `<button type="button" class="btn s" onclick="V9F.adjForm('${m}','${men}',${k})">${ic('edit')}Edit</button><button type="button" class="btn s d" onclick="V9F.adjDel('${m}','${men}',${k})">${ic('trash')}Delete</button>` : ''}</div>`).join('') : '<p class="v9f-none">No bonus or deduction this month.</p>'}</section>
    <section class="v9f-box"><h4>Payments to ${esc(menName(men))}</h4>${pays.length ? pays.map(p => `<div class="v9f-row"><span class="v9f-t">${esc(p.id)}</span><div class="grow"><b class="num">${money(p.amt)}</b><small>${fdate(p.date)} · ${esc(accName(p.acct))}${p.note ? ' · ' + esc(p.note) : ''}</small></div>${V9F.boss() ? `<button type="button" class="btn s" onclick="V9F.ppForm('${p.id}')">${ic('edit')}Edit</button><button type="button" class="btn s d" onclick="V9F.ppDel('${p.id}')">${ic('trash')}Delete</button>` : ''}</div>`).join('') : '<p class="v9f-none">Nothing paid yet for this month.</p>'}</section>`);
};
V9F.adjForm = (m, men, k) => {
  if (!V9F.canAdj(m)) { toast('You cannot change this month'); return; }
  const it = PAYROLL[m].items.find(x => x.mentor === men), x = V9F.adjs(it)[k];
  sheet('EDIT ADJUSTMENT · ' + mlab(m), esc(menName(men)), `<div class="grid g2">${fld('Type', `<select id="v9f-t">${opts(['Bonus', 'Deduction'], x.t)}</select>`)}${fld('Amount (BDT)', `<input id="v9f-a" type="number" min="1" value="${x.a}">`)}</div><div style="margin-top:10px">${fld('Reason', `<input id="v9f-r" value="${esc((x.r || '').replace(/ · [^·]+$/, ''))}">`)}</div><div style="margin-top:10px">${fld('Why are you changing it?', '<input id="v9f-w" placeholder="e.g. it was 4,000, not 5,000">')}</div>
    <div class="acts"><button class="btn" type="button" onclick="prItem('${m}','${men}')">Cancel</button><button class="btn p" type="button" onclick="V9F.adjSave('${m}','${men}',${k})">Save changes</button></div>`);
};
V9F.adjSave = (m, men, k) => {
  if (!V9F.canAdj(m)) return; const it = PAYROLL[m].items.find(x => x.mentor === men), x = V9F.adjs(it)[k];
  const t = $('#v9f-t').value, a = +$('#v9f-a').value, r = $('#v9f-r').value.trim(), w = $('#v9f-w').value.trim();
  if (!a || a < 0) { toast('Write the amount'); return; } if (!r) { toast('Write the reason'); return; } if (!w) { toast('Say why you are changing it'); $('#v9f-w').focus(); return; }
  const was = x.t + ' ' + money(x.a); Object.assign(x, { t, a, r: r + ' · ' + ME().name, at: SCH.nowStamp() }); V9F.adjSync(it);
  log('Payroll adjustment changed', menName(men) + ' · ' + mlab(m), was + ' → ' + t + ' ' + money(a) + ' · ' + w); render(); prItem(m, men); toast('Adjustment updated');
};
V9F.adjDel = (m, men, k) => {
  if (!V9F.canAdj(m)) return; const it = PAYROLL[m].items.find(x => x.mentor === men), x = V9F.adjs(it)[k];
  SCH.confirm({ kind: 'delete', title: 'Delete this ' + x.t.toLowerCase() + '?', body: money(x.a) + ' · ' + esc(x.r || ''), reason: true, ok: 'Delete', onOk: why => { it.adjs.splice(k, 1); V9F.adjSync(it); log('Payroll adjustment deleted', menName(men) + ' · ' + mlab(m), x.t + ' ' + money(x.a) + (why ? ' · ' + why : '')); render(); prItem(m, men); toast('Deleted'); } });
};
V9F.prStatus = m => { const r = PAYROLL[m]; if (!r || !['Paid', 'Partially Paid', 'Approved'].includes(r.status)) return; const any = r.items.some(i => prPaid(m, i.mentor) > 0), all = r.items.every(i => i.net - prPaid(m, i.mentor) <= 0); r.status = all ? 'Paid' : any ? 'Partially Paid' : 'Approved'; };
V9F.ppForm = id => {
  if (!V9F.boss()) { toast('Only the Owner or an Admin can change a payment'); return; }
  const p = PRPAY.find(x => x.id === id);
  sheet('EDIT MENTOR PAYMENT · ' + p.id, esc(menName(p.mentor)) + ' · ' + mlab(p.month), `<div class="grid g2">${fld('Paid amount (BDT)', `<input id="v9f-pa" type="number" min="1" value="${p.amt}">`)}${fld('Payment date', SCH.dateIn('v9f-pd', p.date, { max: TODAY }))}${fld('Account', `<select id="v9f-pc">${opts(ACCOUNTS.map(a => [a.id, a.name]), p.acct)}</select>`)}${fld('Note', `<input id="v9f-pn" value="${esc(p.note || '')}">`)}</div><div style="margin-top:10px">${fld('Why are you changing it?', '<input id="v9f-pw" placeholder="e.g. typed 5,000 but paid 4,000">')}</div>
    <div class="acts"><button class="btn" type="button" onclick="prItem('${p.month}','${p.mentor}')">Cancel</button><button class="btn p" type="button" onclick="V9F.ppSave('${id}')">Save changes</button></div>`);
};
V9F.ppSave = id => {
  if (!V9F.boss()) return; const p = PRPAY.find(x => x.id === id), a = +$('#v9f-pa').value, d = $('#v9f-pd').value, ac = $('#v9f-pc').value, w = $('#v9f-pw').value.trim();
  if (!a || a <= 0) { toast('Write the amount'); return; } if (!SCH.inRange(d) || d > TODAY) { toast('Choose a payment date up to today'); return; } if (!w) { toast('Say why you are changing it'); $('#v9f-pw').focus(); return; }
  const it = PAYROLL[p.month].items.find(i => i.mentor === p.mentor), other = prPaid(p.month, p.mentor) - p.amt; if (it && a + other > it.net) { toast('That is more than the ' + money(it.net) + ' payable'); return; }
  const was = money(p.amt) + ' · ' + fdate(p.date) + ' · ' + accName(p.acct); Object.assign(p, { amt: a, date: d, acct: ac, note: $('#v9f-pn').value.trim() });
  V9F.prStatus(p.month); MOVES = movements(); log('Mentor payment changed', menName(p.mentor) + ' · ' + p.id, was + ' → ' + money(a) + ' · ' + w); render(); prItem(p.month, p.mentor); toast('Payment updated');
};
V9F.ppDel = id => {
  if (!V9F.boss()) return; const p = PRPAY.find(x => x.id === id);
  SCH.confirm({ kind: 'delete', title: 'Delete payment ' + p.id + '?', body: money(p.amt) + ' to ' + esc(menName(p.mentor)) + ' on ' + fdate(p.date) + '. The money goes back to ' + esc(accName(p.acct)) + '.', reason: true, ok: 'Delete', onOk: why => { PRPAY.splice(PRPAY.indexOf(p), 1); if (SCH.BIN) SCH.BIN.unshift({ kind: 'Mentor payment', item: p, at: SCH.nowStamp(), by: ME().name, why }); V9F.prStatus(p.month); MOVES = movements(); log('Mentor payment deleted', menName(p.mentor) + ' · ' + p.id, money(p.amt) + (why ? ' · ' + why : '')); render(); prItem(p.month, p.mentor); toast('Deleted'); } });
};

/* ---------- 2. smart attendance ---------- */
SCH.ATTX = SCH.ATTX || {};          // 'gid|date' -> { held:'Held'|'Not held'|'Moved', heldWhy, moved, late, why:{sid:text} }
V9F.ax = () => { const k = SCH.TS.draftKey; if (!k) return null; if (!SCH.TS.ax || SCH.TS.axKey !== k) { SCH.TS.ax = JSON.parse(JSON.stringify(SCH.ATTX[k] || { held: 'Held', heldWhy: '', moved: '', late: '', why: {} })); SCH.TS.axKey = k; } return SCH.TS.ax; };
V9F.NEED = { L: 'Why late?', E: 'Reason for leave', A: 'Reason (optional)' };
V9F._attPage = SCH.attPage;
SCH.attPage = teacher => { const r = V9F._attPage(teacher); if (SCH.NEW()) requestAnimationFrame(() => V9F.attEnhance(teacher)); return r; };
V9F.attEnhance = teacher => {
  const list = document.querySelector('#view .sc-list'), key = SCH.TS.draftKey; if (!list || !key || list.dataset.v9f) return; list.dataset.v9f = 1;
  const ax = V9F.ax(), [gid, d] = key.split('|'), rec = SCH.ATT[key], card = list.closest('.card'), dis = !!list.querySelector('.sc-att button[disabled]');
  const lateEntry = teacher && !rec && d < TODAY;
  card.querySelector('.sc-pillrow').insertAdjacentHTML('beforebegin', `<div class="v9f-held"><b>Did this class take place?</b><div class="seg" role="radiogroup">${['Held', 'Not held', 'Moved'].map(x => `<button type="button" data-notx class="${ax.held === x ? 'on' : ''}" ${dis ? 'disabled' : ''} onclick="V9F.held('${x}')">${{ Held: 'Yes, class held', 'Not held': 'No class', Moved: 'Moved to another day' }[x]}</button>`).join('')}</div>
    <div class="v9f-hw" ${ax.held === 'Held' ? 'hidden' : ''}>${fld(ax.held === 'Moved' ? 'Why was it moved?' : 'Why was there no class?', `<input id="v9f-hy" value="${esc(ax.heldWhy || '')}" ${dis ? 'disabled' : ''} oninput="SCH.TS.ax.heldWhy=this.value" placeholder="e.g. teacher ill, holiday, students on exam">`)}${ax.held === 'Moved' ? fld('New date', SCH.dateIn('v9f-mv', ax.moved, { on: 'SCH.TS.ax.moved=this.value' })) : ''}</div>
    ${lateEntry ? `<div class="v9f-late">${fld('This day has passed — why is attendance being marked now?', `<input id="v9f-lt" value="${esc(ax.late || '')}" oninput="SCH.TS.ax.late=this.value" placeholder="e.g. internet was down after class">`)}</div>` : rec && ax.late ? `<p class="v9f-note">${ic('clock')}Marked late: ${esc(ax.late)}</p>` : ''}</div>`);
  if (ax.held !== 'Held') { card.querySelectorAll('.sc-pillrow, .sc-list, [onclick="SCH.attAll()"]').forEach(e => e.classList.add('v9f-off')); }
  list.querySelectorAll('.sc-li').forEach(li => {
    const grp = li.querySelector('.sc-att'); if (!grp) return; const name = grp.getAttribute('aria-label').replace('Attendance for ', ''), s = STUDENTS.find(x => x.name === name); if (!s) return;
    li.dataset.sid = s.id;
    li.querySelector('.grow').insertAdjacentHTML('beforeend', `<button type="button" class="v9f-cal" onclick="V9F.stuCal('${s.id}')" data-tip="${esc(s.name)}’s attendance calendar">${ic('cal')}Calendar</button>`);
    li.insertAdjacentHTML('beforeend', `<div class="v9f-why" hidden><input type="text" ${dis ? 'disabled' : ''} placeholder="" value="${esc(ax.why[s.id] || '')}" oninput="SCH.TS.ax.why['${s.id}']=this.value" aria-label="Reason for ${esc(s.name)}"></div>`);
    V9F.whyShow(s.id);
  });
};
V9F.whyShow = sid => {
  const li = document.querySelector(`#view .sc-li[data-sid="${sid}"]`); if (!li) return; const v = SCH.TS.draft && SCH.TS.draft[sid], w = li.querySelector('.v9f-why'); if (!w) return;
  w.hidden = !V9F.NEED[v]; const i = w.querySelector('input'); i.placeholder = (V9F.NEED[v] || '') + (v === 'L' || v === 'E' ? ' (needed)' : ''); li.classList.toggle('v9f-need', v === 'L' || v === 'E');
};
V9F._attSet = SCH.attSet;
SCH.attSet = (id, k) => { V9F._attSet(id, k); if (SCH.NEW()) V9F.whyShow(id); };
V9F.held = x => { const ax = V9F.ax(); ax.held = x; PAGES[ST.page](); };
V9F._attSave = SCH.attSave;
SCH.attSave = teacher => {
  if (!SCH.NEW()) return V9F._attSave(teacher);
  const key = SCH.TS.draftKey, ax = V9F.ax(), d = key.split('|')[1];
  if (ax.held !== 'Held') { if ((ax.heldWhy || '').trim().length < 3) { toast('Write why the class did not take place'); const e = $('#v9f-hy'); if (e) e.focus(); return; } if (ax.held === 'Moved' && !ax.moved) { toast('Choose the new date'); return; } }
  else { const miss = Object.entries(SCH.TS.draft).filter(([sid, v]) => (v === 'L' || v === 'E') && !(ax.why[sid] || '').trim()); if (miss.length) { toast('Write a reason for ' + miss.map(m => stuOf(m[0]).name).join(', ')); const i = document.querySelector(`#view .sc-li[data-sid="${miss[0][0]}"] .v9f-why input`); if (i) i.focus(); return; } }
  if (teacher && !SCH.ATT[key] && d < TODAY && (ax.late || '').trim().length < 3) { toast('This day has passed. Write why attendance is being marked now.'); const e = $('#v9f-lt'); if (e) e.focus(); return; }
  if (ax.held !== 'Held') SCH.TS.draft = {};
  Object.keys(ax.why).forEach(sid => { const v = SCH.TS.draft[sid]; if (!V9F.NEED[v]) delete ax.why[sid]; });
  SCH.ATTX[key] = JSON.parse(JSON.stringify(ax)); SCH.TS.ax = null;
  V9F._attSave(teacher);
};
/* one calendar per student */
V9F.SC = {};
V9F.stuCal = (sid, mo) => {
  const s = stuOf(sid); mo = mo || V9F.SC[sid] || d2m(SCH.TS.date || TODAY); V9F.SC[sid] = mo;
  const G = SCH.GROUPS.filter(g => g.stu.includes(sid)), y = +mo.slice(0, 4), m = +mo.slice(5), first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = (first.getDay() + 1) % 7;
  const E = {}; let c = { P: 0, A: 0, L: 0, E: 0, N: 0 };
  Object.keys(SCH.ATT).forEach(k => { const [gid, d] = k.split('|'); if (!d.startsWith(mo) || !G.some(g => g.id === gid)) return; const r = SCH.ATT[k], x = SCH.ATTX[k] || {}, v = r.marks[sid];
    if (x.held && x.held !== 'Held') { (E[d] = E[d] || []).push({ v: 'N', g: SCH.grp(gid).name, why: x.heldWhy }); c.N++; return; }
    if (!v) return; (E[d] = E[d] || []).push({ v, g: SCH.grp(gid).name, why: (x.why || {})[sid] || '', late: x.late }); c[v]++; });
  const cell = d => { const ds = mo + '-' + String(d).padStart(2, '0'), L = E[ds] || []; return `<div class="v9f-d ${ds === TODAY ? 'today' : ''} ${L.length ? 'has' : ''}" ${L.length ? `data-tip="${esc(L.map(e => e.g + ': ' + (e.v === 'N' ? 'No class' : SCH.ATT_LBL[e.v]) + (e.why ? ' — ' + e.why : '')).join(' · '))}"` : ''}><span>${d}</span><div>${L.map(e => `<i class="k-${e.v}">${e.v === 'N' ? '—' : SCH.ATT_KEY[e.v]}</i>`).join('')}</div></div>`; };
  const prev = V9F.mAdd(mo, -1), next = V9F.mAdd(mo, 1), notes = Object.keys(E).sort().flatMap(d => E[d].filter(e => e.why).map(e => `<li><b>${SCH.fmtD(d)}</b> · ${esc(e.g)} · ${e.v === 'N' ? 'No class' : SCH.ATT_LBL[e.v]} — ${esc(e.why)}</li>`));
  sheet('ATTENDANCE CALENDAR · ' + s.id, esc(s.name), `<div class="v9f-ch"><button type="button" class="btn s" onclick="V9F.stuCal('${sid}','${prev}')" aria-label="Previous month">‹</button><b>${mlab(mo)}</b><button type="button" class="btn s" onclick="V9F.stuCal('${sid}','${next}')" aria-label="Next month">›</button></div>
    <div class="v9f-sum">${[['P', 'Present', 'ok'], ['L', 'Late', 'warn'], ['E', 'Leave', 'info'], ['A', 'Absent', 'bad'], ['N', 'No class', 'n']].map(x => `<div class="${x[2]}"><b>${dg(c[x[0]])}</b><small>${x[1]}</small></div>`).join('')}</div>
    <div class="v9f-grid">${['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(x => `<div class="h">${x}</div>`).join('')}${'<div class="v9f-d e"></div>'.repeat(lead)}${Array.from({ length: days }, (_, i) => cell(i + 1)).join('')}</div>
    ${notes.length ? `<div class="v9f-box"><h4>Reasons this month</h4><ul class="v9f-ul">${notes.join('')}</ul></div>` : ''}
    <div class="acts"><button class="btn" type="button" onclick="closeSheet()">Close</button></div>`, true);
};
V9F.mAdd = (ym, n) => { let y = +ym.slice(0, 4), m = +ym.slice(5) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + String(m + 1).padStart(2, '0'); };
function d2m(d) { return d.slice(0, 7); }

/* ---------- 3. homework: chosen students and attachments ---------- */
V9F.HWF = [];
V9F._hwForm = SCH.hwForm;
SCH.hwForm = id => {
  V9F._hwForm(id);
  if (!SCH.NEW()) return;
  const h = id ? SCH.HW.find(x => x.id === id) : null, box = document.querySelector('#sheet #hw-x'); if (!box) return;
  V9F.HWF = h && h.files ? h.files.slice() : [];
  box.closest('div').insertAdjacentHTML('afterend', `<div class="v9f-hwfor"><b>Who is this homework for?</b><div class="seg" role="radiogroup"><button type="button" data-notx id="v9f-all" class="${h && h.stu ? '' : 'on'}" onclick="V9F.hwFor(0)">Whole class</button><button type="button" id="v9f-some" class="${h && h.stu ? 'on' : ''}" onclick="V9F.hwFor(1)">Chosen students</button></div><div id="v9f-stu"></div></div>
    <div class="v9f-att"><b>Pictures, videos or files</b><label class="btn s v9f-up">${ic('plus')}Add files<input type="file" id="v9f-f" accept="image/*,video/*,.pdf" multiple onchange="V9F.hwFiles(this)" hidden></label><small>Photos of the page, a short video explaining the task, or a PDF worksheet</small><div id="v9f-fl"></div></div>`);
  $('#hw-g').addEventListener('change', () => V9F.hwStu(h)); V9F.hwStu(h); V9F.hwDraw();
};
V9F.hwFor = some => { $('#v9f-all').classList.toggle('on', !some); $('#v9f-some').classList.toggle('on', !!some); V9F.hwStu(null, true); };
V9F.hwStu = (h, keep) => {
  const g = SCH.grp($('#hw-g').value), some = $('#v9f-some').classList.contains('on'), el = $('#v9f-stu'); if (!g || !el) return;
  const prev = keep ? [...el.querySelectorAll('input:checked')].map(x => x.value) : h && h.stu ? h.stu : [];
  el.innerHTML = some ? `<div class="v9f-picks">${g.stu.map(id => `<label class="v9f-pick"><input type="checkbox" value="${id}" ${prev.includes(id) ? 'checked' : ''}><span>${esc(stuOf(id).name)}<small>${id} · ${esc(stuOf(id).cls)}</small></span></label>`).join('')}</div>` : `<p class="v9f-none">All ${g.stu.length} students of ${esc(g.name)} will see it.</p>`;
};
V9F.hwFiles = inp => {
  [...inp.files].forEach(f => {
    if (f.size > 25 * 1024 * 1024) { toast(f.name + ' is larger than 25 MB'); return; }
    const o = { name: f.name, type: f.type, size: f.size, url: URL.createObjectURL(f) }; V9F.HWF.push(o);
    if (f.type.startsWith('image/') && f.size < 3 * 1024 * 1024) { const r = new FileReader(); r.onload = () => { o.url = r.result; V9F.hwDraw(); }; r.readAsDataURL(f); }
  });
  inp.value = ''; V9F.hwDraw();
};
V9F.hwDraw = () => { const el = $('#v9f-fl'); if (!el) return; el.innerHTML = V9F.HWF.map((f, i) => `<div class="v9f-file">${f.type.startsWith('image/') ? `<img src="${f.url}" alt="">` : `<span class="v9f-fi">${f.type.startsWith('video/') ? '▶' : 'PDF'}</span>`}<div class="grow"><b>${esc(f.name)}</b><small>${(f.size / 1048576).toFixed(1)} MB</small></div><button type="button" class="v9f-x" aria-label="Remove ${esc(f.name)}" onclick="V9F.HWF.splice(${i},1);V9F.hwDraw()">${ic('x')}</button></div>`).join(''); };
V9F._hwSave = SCH.hwSave;
SCH.hwSave = id => {
  if (!SCH.NEW() || !$('#v9f-stu')) return V9F._hwSave(id);
  const some = $('#v9f-some').classList.contains('on'), stu = some ? [...document.querySelectorAll('#v9f-stu input:checked')].map(x => x.value) : null, files = V9F.HWF.slice();
  if (some && !stu.length) { toast('Choose at least one student, or pick Whole class'); return; }
  const n = SCH.HW.length, old = id ? JSON.stringify(SCH.HW.find(x => x.id === id)) : ''; V9F._hwSave(id);
  const h = id ? SCH.HW.find(x => x.id === id) : SCH.HW.length > n ? SCH.HW[SCH.HW.length - 1] : null;
  if (!h) return;                                                         /* not saved (a field was missing) */
  if (id && JSON.stringify(h) === old && document.querySelector('#sheet #hw-t[aria-invalid="true"], #sheet .err:not(:empty)')) return;
  h.stu = stu; h.files = files; if (stu) h.checked = Math.min(h.checked || 0, stu.length);
};
/* students see only homework for them; teachers see who it is for */
V9F.forMe = h => !h.stu || (ST.role !== 'Student') || h.stu.includes((ME() || {}).stu);
Object.keys(PAGES).filter(k => k.startsWith('sp-')).forEach(k => {
  const o = PAGES[k];
  PAGES[k] = function () { if (!SCH.NEW() || ST.role !== 'Student') return o.apply(this, arguments); const keep = SCH.HW.slice(); for (let i = SCH.HW.length - 1; i >= 0; i--) if (!V9F.forMe(SCH.HW[i])) SCH.HW.splice(i, 1); try { return o.apply(this, arguments); } finally { SCH.HW.length = 0; keep.forEach(x => SCH.HW.push(x)); V9F.hwTags(); } };
});
['tp-hw', 'tp-home'].forEach(k => { const o = PAGES[k]; if (!o) return; PAGES[k] = function () { const r = o.apply(this, arguments); if (SCH.NEW()) V9F.hwTags(); return r; }; });
V9F.hwTags = () => requestAnimationFrame(() => {
  SCH.HW.forEach(h => {
    if (!h.stu && !(h.files || []).length) return;
    document.querySelectorAll('#view b, #view h3, #view .ttl').forEach(el => {
      if (el.dataset.v9f || el.textContent.trim() !== h.title) return; el.dataset.v9f = 1;
      el.insertAdjacentHTML('afterend', `<span class="v9f-tags">${h.stu ? `<span class="v9f-for" data-tip="${esc(h.stu.map(id => stuOf(id).name).join(', '))}">For ${h.stu.length === 1 ? esc(stuOf(h.stu[0]).name) : h.stu.length + ' students'}</span>` : ''}${(h.files || []).map(f => `<a class="v9f-fa" href="${f.url}" target="_blank" rel="noopener" download="${esc(f.name)}">${f.type.startsWith('image/') ? '🖼' : f.type.startsWith('video/') ? '▶' : '📄'} ${esc(f.name)}</a>`).join('')}</span>`);
    });
  });
});
