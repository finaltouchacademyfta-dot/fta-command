/* =====================================================================
   v9l · owner 29 Oct: student payment management like QIT
   · Change a student's status (Active / Inactive / …) right on their card.
   · "Monthly payments": pick a year → January to December. Each month has
     its own status (Active, Inactive, Leave, Free, Paused or a status you
     add), its payable, paid and pending, and its payments — update, edit
     or delete any of them. Billing follows the month status, so every
     page (dues, invoices, reports, cards) shows the same numbers.
   Additive: the existing Payment Update dialog, payment edit and the
   engine (INVOICES, PAYMENTS, MOVES) do the bookkeeping. New skins only.
   ===================================================================== */
const V9L = window.V9L = { MST: {}, Y: {} };
V9L.boss = () => PU.canAdj() && !SCH.preview;
V9L.ST = [ { n: 'Active', bill: true, tone: 'ok' }, { n: 'Inactive', bill: false, tone: 'n' }, { n: 'Leave', bill: false, tone: 'info' }, { n: 'Free', bill: false, tone: 'gold' }, { n: 'Paused', bill: false, tone: 'warn' } ];
V9L.SST = ['Active', 'Inactive', 'Paused', 'Completed', 'Withdrawn'];      /* student statuses */
V9L.st = n => V9L.ST.find(x => x.n === n) || { n, bill: false, tone: 'n' };
V9L.inv = (sid, m) => INVOICES.find(i => i.stu === sid && i.month === m && i.status !== 'Cancelled') || INVOICES.find(i => i.stu === sid && i.month === m);
V9L.mstat = (sid, m) => { const k = sid + '|' + m; if (V9L.MST[k]) return V9L.MST[k]; const i = V9L.inv(sid, m); return i && i.status !== 'Cancelled' ? 'Active' : 'Inactive'; };
V9L.pays = inv => inv ? PAYMENTS.filter(p => p.status !== 'Rejected' && p.alloc.some(a => a.inv === inv.id)) : [];

/* ---------- the manager ---------- */
V9L.open = (sid, y) => {
  const s = stuOf(sid); if (!s) return; if (!PU.canPay()) { toast('This role cannot manage payments'); return; }
  y = y || V9L.Y[sid] || +CUR.slice(0, 4); V9L.Y[sid] = y; V9L.sid = sid;
  const ms = Array.from({ length: 12 }, (_, i) => y + '-' + String(i + 1).padStart(2, '0')), adj = V9L.boss();
  let tp = 0, tpd = 0, tpe = 0;
  const rows = ms.map(m => {
    const inv = V9L.inv(sid, m), stn = V9L.mstat(sid, m), stO = V9L.st(stn), live = inv && inv.status !== 'Cancelled', net = live ? invNet(inv) : 0, pd = live ? invPaid(inv) : 0, pe = live && inv.status === 'Approved' ? invDue(inv) : 0, P = V9L.pays(live ? inv : null);
    if (live && m <= CUR) { tp += net; tpd += pd; tpe += pe; }
    return `<tr data-m="${m}" class="${m === CUR ? 'run' : ''} ${stO.bill ? '' : 'off'}"><td class="m"><b>${MF[+m.slice(5) - 1]}</b>${m === CUR ? '<span class="pu-run">Running</span>' : m > CUR ? '<span class="pu-fu">Future</span>' : ''}</td>
      <td data-l="Month status"><select data-v9h="1" aria-label="Status for ${mlab(m)}" onchange="V9L.setM('${sid}','${m}',this.value,this)">${V9L.ST.map(x => `<option value="${esc(x.n)}" ${x.n === stn ? 'selected' : ''}>${esc(x.n)}${x.bill ? '' : ' · not billed'}</option>`).join('')}${adj ? '<option value="__new">+ Add a new status…</option>' : ''}</select></td>
      <td data-l="Payable" class="num">${live ? money(net) + (inv.status === 'Draft' ? '<small class="sub"> draft</small>' : '') : '<span class="sub">—</span>'}</td>
      <td data-l="Paid" class="num ok">${pd ? money(pd) : '<span class="sub">—</span>'}</td>
      <td data-l="Pending" class="num">${!live ? '<span class="sub">—</span>' : m > CUR ? '<span class="sub">Not due yet</span>' : pe ? `<b class="bad">${money(pe)}</b>` : `<span class="pu-st ok">${ic('check')}Paid</span>`}</td>
      <td data-l="Payments">${P.map(p => `<div class="v9l-p"><span>${fdate(p.date)} · ${money(p.alloc.filter(a => a.inv === inv.id).reduce((a, b) => a + b.amt, 0))} · ${esc(accName(p.acct))}${p.status === 'Pending' ? ' · <i>awaiting verification</i>' : ''}</span><button type="button" class="v9l-i" data-tip="Edit this payment" aria-label="Edit payment ${esc(p.rcpt)}" onclick="V9L.pEdit('${p.id}')">${ic('edit')}</button>${adj ? `<button type="button" class="v9l-i d" data-tip="Delete this payment" aria-label="Delete payment ${esc(p.rcpt)}" onclick="V9L.pDel('${p.id}')">${ic('trash')}</button>` : ''}</div>`).join('') || '<span class="sub">—</span>'}</td>
      <td data-l="" class="r">${live && inv.status === 'Approved' ? `<button type="button" class="btn s p" onclick="V9L.upd('${inv.id}')">${ic('edit')}Update</button>` : stO.bill && !live ? `<button type="button" class="btn s" onclick="V9L.setM('${sid}','${m}','${esc(stn)}')">Bill this month</button>` : ''}</td></tr>`;
  }).join('');
  const yrs = []; for (let i = +CUR.slice(0, 4) + 10; i >= +CUR.slice(0, 4) - 10; i--) yrs.push(i);
  sheet('MONTHLY PAYMENTS · ' + s.id, esc(s.name), `<div class="v9l-top"><div class="v9l-who"><b>${esc(s.name)}</b><small>${esc(s.cls)} · ${stuEnrols(s.id).map(e => esc(progName(e.prog))).join(', ') || 'no subject yet'}</small></div>
      <label class="v9l-ss">Student status ${V9L.ssSel(sid)}</label></div>
    <div class="v9h-yb"><button type="button" class="btn s" aria-label="Previous year" onclick="V9L.open('${sid}',${y - 1})">‹</button><select data-v9h="1" aria-label="Year" onchange="V9L.open('${sid}',+this.value)">${yrs.map(v => `<option value="${v}" ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select><button type="button" class="btn s" aria-label="Next year" onclick="V9L.open('${sid}',${y + 1})">›</button><small>January to December ${y}. Change a month’s status to bill it or not; Update records money for that month.</small></div>
    <div class="v9l-sum"><div><small>Payable to ${y === +CUR.slice(0, 4) ? mlab(CUR) : 'end of ' + y}</small><b class="num">${money(tp)}</b></div><div class="ok"><small>Paid</small><b class="num">${money(tpd)}</b></div><div class="bad"><small>Pending</small><b class="num">${money(tpe)}</b></div></div>
    <div class="pu-tw"><table class="pu-t v9l-t"><thead><tr><th>Month</th><th>Month status</th><th>Payable</th><th>Paid</th><th>Pending</th><th>Payments</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    ${adj ? `<div class="v9l-stl"><b>Month statuses</b>${V9L.ST.map((x, i) => `<span class="v9l-chip ${x.tone}">${esc(x.n)}${x.bill ? ' · billed' : ''}${i > 4 ? `<button type="button" aria-label="Remove status ${esc(x.n)}" onclick="V9L.stDel(${i})">${ic('x')}</button>` : ''}</span>`).join('')}<button type="button" class="v9h-add" onclick="V9L.stNew()">${ic('plus')}Add a status</button></div>` : ''}
    <div class="acts"><button type="button" class="btn" onclick="SCH.stu360 ? SCH.stu360('${sid}') : stuView('${sid}')">Student card</button><button type="button" class="btn p" onclick="closeSheet();render()">Done</button></div>`, true);
};
V9L.ssSel = sid => { const s = stuOf(sid), L = uniq(V9L.SST.concat(s.status)); return `<select data-v9h="1" class="v9l-ssel" aria-label="Student status for ${esc(s.name)}" ${V9L.boss() || (R_() && R_().edit) ? '' : 'disabled'} onchange="V9L.setS('${sid}',this.value,this)">${L.map(x => `<option ${x === s.status ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`; };
V9L.setS = (sid, v, el) => {
  const s = stuOf(sid), old = s.status; if (v === old) return;
  SCH.confirm({ kind: v === 'Active' ? 'submit' : 'off', title: 'Change ' + esc(s.name) + ' to ' + esc(v) + '?', body: v === 'Active' ? 'They count as an active student again.' : 'They stop counting as active. Past months and payments stay as they are; set future months to Inactive in Monthly payments if they should not be billed.', reason: true, ok: 'Change status', onOk: why => { s.status = v; if (v === 'Paused' && !s.pausedFrom) s.pausedFrom = TODAY; if (v === 'Active') delete s.pausedFrom; log('Student status changed', s.name + ' · ' + sid, old + ' → ' + v + (why ? ' · ' + why : '')); render(); if (V9L.sid === sid && document.querySelector('.v9l-t')) V9L.open(sid); toast(s.name + ' is now ' + v); } });
  if (el) el.value = old;
};
/* month status: bill / stop billing through the real invoices */
V9L.setM = (sid, m, v, el) => {
  if (v === '__new') { if (el) el.value = V9L.mstat(sid, m); return V9L.stNew(sid, m); }
  const st = V9L.st(v), inv = V9L.inv(sid, m), live = inv && inv.status !== 'Cancelled';
  if (typeof locked === 'function' && locked(m) && ST.role !== 'Owner') { toast(mlab(m) + ' is locked. Only the Owner can change it.'); if (el) el.value = V9L.mstat(sid, m); return; }
  if (!st.bill && live && invPaid(inv) > 0) { toast(money(invPaid(inv)) + ' is paid on ' + mlab(m) + '. Edit or delete that payment first.'); if (el) el.value = V9L.mstat(sid, m); return; }
  if (st.bill && !live) {
    const ens = stuEnrols(sid).filter(e => e.start.slice(0, 7) <= m && (!e.end || e.end.slice(0, 7) >= m));
    if (!ens.length) { toast('No subject is running for this student in ' + mlab(m) + '. Add a subject first.'); if (el) el.value = V9L.mstat(sid, m); return; }
    if (inv && inv.status === 'Cancelled') { inv.status = m <= CUR ? 'Approved' : 'Draft'; inv.v9re = true; }
    else INVOICES.push({ id: PU.invId(m), stu: sid, month: m, issue: m + '-01', due: m + '-10', status: m <= CUR ? 'Approved' : 'Draft', items: ens.map(e => ({ enr: e.id, prog: e.prog, mentor: e.mentor, batch: e.batch || '', fee: feeFor(e, m), disc: e.disc || 0 })), adj: 0, adjNote: '', approvedBy: m <= CUR ? (ME() || {}).name : '' });
  }
  if (!st.bill && live) inv.status = 'Cancelled';
  V9L.MST[sid + '|' + m] = v; MOVES = movements();
  log('Month status changed', stuOf(sid).name + ' · ' + mlab(m), v + (st.bill ? ' (billed)' : ' (not billed)'));
  V9L.open(sid, +m.slice(0, 4)); toast(mlab(m) + ' · ' + v);
};
V9L.stNew = (sid, m) => {
  if (!V9L.boss()) { toast('Only the Owner or an Admin can add statuses'); return; }
  V9H.pop(`<div class="v9h-h"><b>New month status</b><small>Use it for any month of any student</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>${fld('Name', '<input id="v9l-n" placeholder="e.g. Exam month, Half fee, Trial">')}<label class="v9j-sw" style="margin-top:10px"><input type="checkbox" id="v9l-b"><span>Bill the monthly fee in this status</span></label>
    <div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Cancel</button><button class="btn p" type="button" onclick="V9L.stSave(${sid ? `'${sid}'` : 'null'},${m ? `'${m}'` : 'null'})">Add status</button></div>`);
};
V9L.stSave = (sid, m) => { const n = $('#v9l-n').value.trim(); if (n.length < 2) { toast('Write a name'); return; } if (V9L.ST.some(x => x.n.toLowerCase() === n.toLowerCase())) { toast('This status already exists'); return; } V9L.ST.push({ n, bill: $('#v9l-b').checked, tone: 'n' }); log('Month status added', n, $('#v9l-b').checked ? 'billed' : 'not billed'); V9H.popClose(); if (sid && m) V9L.setM(sid, m, n); else if (V9L.sid) V9L.open(V9L.sid); };
V9L.stDel = i => { const x = V9L.ST[i]; if (Object.values(V9L.MST).includes(x.n)) { toast('“' + x.n + '” is used by some months. Change those months first.'); return; } SCH.confirm({ kind: 'delete', title: 'Remove status “' + esc(x.n) + '”?', ok: 'Remove', onOk: () => { V9L.ST.splice(i, 1); log('Month status removed', x.n); V9L.open(V9L.sid); } }); };
/* payments: update, edit, delete */
V9L.upd = invId => PU.open(invId);
V9L.pEdit = id => SCH.payEdit(id);
V9L.pDel = id => {
  if (!V9L.boss()) { toast('Only the Owner or an Admin can delete a payment'); return; }
  const p = PAYMENTS.find(x => x.id === id), lk = typeof CLOSE !== 'undefined' && CLOSE[p.date.slice(0, 7)] && CLOSE[p.date.slice(0, 7)].status === 'Locked';
  if (lk && ST.role !== 'Owner') { toast(mlab(p.date.slice(0, 7)) + ' is locked'); return; }
  SCH.confirm({ kind: 'delete', title: 'Delete payment ' + esc(p.rcpt) + '?', body: money(p.amt) + ' from ' + esc(stuOf(p.stu).name) + ' on ' + fdate(p.date) + '. The month goes back to pending and the money leaves ' + esc(accName(p.acct)) + '. You can restore it from the Recycle bin.', reason: true, ok: 'Delete payment', onOk: why => { SCH.toBin('Payment', p.rcpt + ' · ' + stuOf(p.stu).name + (why ? ' · ' + why : ''), PAYMENTS, p); MOVES = movements(); log('Payment deleted', stuOf(p.stu).name + ' · ' + p.rcpt, money(p.amt) + (why ? ' · ' + why : '')); const wasYear = !!document.querySelector('.v9l-t'); render(); if (wasYear) V9L.open(p.stu); else closeSheet(); toast('Payment deleted'); } });
};
/* ---------- entry points ---------- */
V9L._stuList = stuList;
stuList = function () {
  const r = V9L._stuList.apply(this, arguments); if (!SCH.NEW()) return r;
  document.querySelectorAll('#s-list .qc').forEach(c => {
    const n = c.querySelector('.qc-n'), sid = n && ((n.getAttribute('onclick') || '').match(/STU-\d+/) || [])[0], a = c.querySelector('.qc-a'); if (!sid || !a || a.querySelector('.v9l-mp')) return;
    if (PU.canPay()) a.insertAdjacentHTML('beforeend', `<button type="button" class="btn s v9l-mp" onclick="V9L.open('${sid}')">${ic('cal')}Monthly payments</button>`);
    const h = c.querySelector('.qc-h'); if (h && (R_() && R_().edit)) h.insertAdjacentHTML('beforeend', `<span class="v9l-ssw" data-tip="Change status">${V9L.ssSel(sid)}</span>`);
  });
  return r;
};
if (SCH.stu360) { V9L._s360 = SCH.stu360; SCH.stu360 = function (sid) { V9L._s360.apply(this, arguments); const a = document.querySelector('#sheet .s3-acts.end'); if (SCH.NEW() && a && PU.canPay() && !a.querySelector('.v9l-mp')) a.insertAdjacentHTML('afterbegin', `<button type="button" class="btn s v9l-mp" onclick="V9L.open('${sid}')">${ic('cal')}Monthly payments</button>`); const h = document.querySelector('#sheet .s3-h .chips2'); if (SCH.NEW() && h && R_() && R_().edit) h.insertAdjacentHTML('beforeend', `<span class="v9l-ssw">${V9L.ssSel(sid)}</span>`); }; }
V9L._stuView = stuView;
stuView = function (id) { V9L._stuView.apply(this, arguments); if (!SCH.NEW() || !PU.canPay()) return; const sh = document.getElementById('sheet'), t = sh && sh.querySelector('.tabs'); if (t && !sh.querySelector('.v9l-mp')) t.insertAdjacentHTML('beforebegin', `<div class="v9l-bar"><button type="button" class="btn s p v9l-mp" onclick="V9L.open('${id}')">${ic('cal')}Monthly payments · year view</button><span class="v9l-ssw">Status ${V9L.ssSel(id)}</span></div>`); };

/* anything restored from the Recycle bin (payments, accounts…) counts in the balances again */
V9L._restore = SCH.restore; SCH.restore = id => { V9L._restore(id); MOVES = movements(); };
