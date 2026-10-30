/* =====================================================================
   v9 · money1 — QIT-style student payment update (owner, 28 Oct 2026)
   "Every money place: a Total (payable) box and a Paid box; the rest is Pending."
   · Payment Update dialog per student + month (invoice): Payable, Paid amount,
     date, method, "Paid in full", note, live Remaining. It saves a real payment
     through the existing engine (PAYMENTS + alloc, MOVES, log).
   · Payable can be changed only by Owner/Admin, as an invoice adjustment with a reason.
   · Monthly payments table (Month · Status · Payable · Paid · Pending · Date ·
     Method · Note · Update) on the student card, the student profile and the
     Payments page "By student" view. New skins only.
   ===================================================================== */
const PU = window.PU = {};
PU.canPay = () => !!(R_() && R_().edit && R_().money !== false && ST.role !== 'Mentor' && ST.role !== 'Student');
PU.canAdj = () => ['Owner', 'Admin'].includes(ST.role);
PU.canVerify = () => can('accounts');
PU.lastPay = id => { let best = null; PAYMENTS.forEach(p => { if (p.status === 'Rejected') return; p.alloc.forEach(a => { if (a.inv === id && (!best || p.date >= best.date)) best = p; }); }); return best; };
PU.pendingOn = id => { let s = 0; PAYMENTS.forEach(p => { if (p.status === 'Pending') p.alloc.forEach(a => { if (a.inv === id) s += a.amt; }); }); return s; };
PU.stat = i => {
  if (!i) return ['Not billed', 'n'];
  if (i.status === 'Cancelled') return ['Cancelled', 'n'];
  if (i.status === 'Draft') return ['Draft', 'n'];
  const net = invNet(i), pd = invPaid(i);
  if (pd >= net) return ['Paid', 'ok'];
  if (pd > 0) return ['Part paid', 'warn'];
  return ['Pending', 'bad'];
};
PU.badge = (st, tone) => `<span class="pu-st ${tone}">${tone === 'ok' ? ic('check') : ''}${esc(st)}</span>`;

/* ---------- the dialog ---------- */
PU.open = invId => {
  const i = invOf(invId); if (!i) return;
  if (!PU.canPay()) { toast('This role cannot record payments'); return; }
  if (i.status !== 'Approved') { toast(mlab(i.month) + ' invoice is ' + i.status.toLowerCase() + '; approve it first'); return; }
  const s = stuOf(i.stu), net = invNet(i), before = invPaid(i), pend = PU.pendingOn(i.id), lk = locked(i.month), adjOk = PU.canAdj() && (!lk || ST.role === 'Owner');
  PU.cur = { id: i.id, net0: net };
  sheet('PAYMENT UPDATE', `${esc(s.name)} · ${mlab(i.month)}`, `<div class="pu">
    <div class="pu-who"><span class="pu-mono">${esc(initials(s.name))}</span><div><b>${esc(s.name)}</b><small>${esc(s.id)} · ${esc(i.id)} · ${i.items.map(x => esc(progName(x.prog))).join(', ')}</small></div>${PU.badge(...PU.stat(i))}</div>
    <div class="grid g2">
      ${fld('Payable amount (BDT)', `<input id="pu-pay" type="number" min="0" step="1" value="${net}" ${adjOk ? '' : 'readonly'} oninput="PU.draw()">`, adjOk ? 'Change only for a discount or correction — you will be asked for the reason' : (lk ? mlab(i.month) + ' is locked' : 'Only the Owner or Admin can change the payable'))}
      ${fld('Paid amount (BDT)', `<input id="pu-amt" type="number" min="0" step="1" inputmode="decimal" placeholder="How much was paid now" oninput="PU.draw()">`, before ? 'Already paid before: ' + money(before) : 'Nothing paid yet for this month')}
      ${fld('Payment date', `<input id="pu-d" type="date" value="${TODAY}" max="${TODAY}">`)}
      ${fld('Payment method', `<select id="pu-c">${opts(ACCOUNTS.map(a => [a.id, a.name]), 'ACC-CASH')}</select>`)}
    </div>
    <div class="pu-row"><button type="button" class="pu-full" id="pu-full" aria-pressed="false" onclick="PU.full()">${ic('check')}Paid in full</button><span class="pu-hint">Fills the whole remaining amount</span></div>
    <div id="pu-why-w" class="pu-off">${fld('Reason for changing the payable', '<input id="pu-why" placeholder="e.g. Mid-month joining, sibling discount, fee correction">')}</div>
    ${fld('Reference', '<input id="pu-r" placeholder="Transaction ID (blank for cash)">')}
    ${fld('Payment note', '<textarea id="pu-n" rows="2" placeholder="Optional"></textarea>')}
    <div id="pu-sum"></div>
    ${pend ? note(money(pend) + ' from earlier payments is still waiting for verification; it is not counted as paid yet.', 'info') : ''}
    <div class="acts"><button class="btn" type="button" onclick="closeSheet()">Cancel</button>${PU.canVerify() ? `<button class="btn" type="button" onclick="PU.save(true)">${ic('clock')}Save as pending</button>` : ''}<button class="btn p" type="button" id="pu-go" onclick="PU.save(false)">${PU.canVerify() ? 'Save payment' : 'Send for verification'}</button></div>
  </div>`);
  PU.draw();
  setTimeout(() => { const a = document.getElementById('pu-amt'); if (a) a.focus(); }, 30);
};
PU.vals = () => {
  const i = invOf(PU.cur.id), before = invPaid(i), pay = Math.max(0, Math.round(+$('#pu-pay').value || 0)), amt = Math.max(0, Math.round(+$('#pu-amt').value || 0));
  return { i, before, pay, amt, left: Math.max(0, pay - before), rem: Math.max(0, pay - before - amt) };
};
PU.draw = () => {
  if (!document.getElementById('pu-sum')) return;
  const v = PU.vals(), changed = v.pay !== PU.cur.net0, over = v.amt > v.left, pct = v.pay ? Math.min(100, (v.before + Math.min(v.amt, v.left)) / v.pay * 100) : 0;
  $('#pu-why-w').classList.toggle('pu-off', !changed);
  const f = $('#pu-full'); if (f) { const on = v.left > 0 && v.amt === v.left; f.classList.toggle('on', on); f.setAttribute('aria-pressed', on); }
  const st = v.rem <= 0 && !over ? ['Paid in full', 'ok'] : v.before + v.amt > 0 ? ['Part paid', 'warn'] : ['Pending', 'bad'];
  $('#pu-sum').innerHTML = `<div class="v9-pp pu-pp"><div><small>Payable</small><b class="num">${money(v.pay)}</b></div><div><small>Paid before</small><b class="num">${money(v.before)}</b></div><div class="now"><small>Paying now</small><b class="num">${money(Math.min(v.amt, v.left))}</b></div><div class="${v.rem ? 'pend' : 'ok'}"><small>${v.rem ? 'Remaining · Pending' : 'Remaining'}</small><b class="num">${money(v.rem)}</b></div></div>
    <div class="pf-bar" aria-hidden="true"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="pu-after">After saving: ${PU.badge(...st)} <span>${Math.round(pct)}% of ${esc(mlab(v.i.month))} paid</span></div>
    ${over ? `<p class="v9-warn">Only ${esc(money(v.left))} is left on ${esc(mlab(v.i.month))}. To keep extra money as advance, use Receive payment.</p>` : ''}
    ${changed && v.pay < v.before ? `<p class="v9-warn">The payable cannot be less than what is already paid (${esc(money(v.before))}).</p>` : ''}`;
};
PU.full = () => { const v = PU.vals(); $('#pu-amt').value = v.left || ''; PU.draw(); };
PU.save = asPending => {
  const v = PU.vals(), i = v.i, s = stuOf(i.stu), changed = v.pay !== PU.cur.net0;
  if (changed) {
    if (!PU.canAdj() || (locked(i.month) && ST.role !== 'Owner')) { toast('Only the Owner or Admin can change the payable'); return; }
    const why = $('#pu-why').value.trim(); if (!why) { toast('Write the reason for changing the payable'); $('#pu-why').focus(); return; }
    if (v.pay < v.before) { toast('Payable cannot be less than what is already paid'); return; }
  }
  if (!changed && !v.amt) { toast('Enter the paid amount'); $('#pu-amt').focus(); return; }
  if (v.amt > v.left) { toast('Only ' + money(v.left) + ' is left on ' + mlab(i.month)); return; }
  const acct = $('#pu-c').value, date = $('#pu-d').value || TODAY, ref = $('#pu-r').value.trim(), nt = $('#pu-n').value.trim();
  if (ref && v.amt) { const dup = PAYMENTS.find(q => q.status !== 'Rejected' && q.ref === ref); if (dup && !PU.dupOk) { PU.dupOk = true; toast('Careful: reference ' + ref + ' is already on ' + dup.rcpt + '. Press save again if it is a new payment.'); return; } }
  PU.dupOk = false;
  if (changed) {
    const d = v.pay - PU.cur.net0, why = $('#pu-why').value.trim();
    i.adj = (i.adj || 0) + d;
    i.adjNote = (i.adjNote ? i.adjNote + ' · ' : '') + (d < 0 ? '− ' : '+ ') + money(Math.abs(d)) + ': ' + why + ' · by ' + ME().name + ' · ' + fdate(TODAY);
    log('Invoice adjusted', s.name + ' · ' + i.id + ' · ' + mlab(i.month), money(PU.cur.net0) + ' → ' + money(v.pay) + ' · ' + why);
  }
  let np = null;
  if (v.amt) {
    const staff = !PU.canVerify(), pend = staff || asPending;
    paySeq++;
    np = { id: 'PAY-' + String(paySeq).padStart(4, '0'), rcpt: 'RCP-2026-' + String(paySeq).padStart(4, '0'), stu: i.stu, date, amt: v.amt, acct, method: METHOD[acct] || accName(acct), ref, status: pend ? 'Pending' : 'Verified', by: ME().name, verifiedBy: pend ? '' : ME().name, alloc: [{ inv: i.id, amt: v.amt }], note: nt || ('Payment update · ' + mlab(i.month)) };
    PAYMENTS.push(np);
    log(pend ? 'Payment submitted' : 'Payment recorded', s.name + ' · ' + np.rcpt + ' · ' + mlab(i.month), money(v.amt) + ' · ' + accName(acct) + (v.rem ? ' · ' + money(v.rem) + ' still pending' : ' · month paid in full'));
  }
  MOVES = movements(); closeSheet(); render();
  if (np) receiptView(np.id);
  toast(np ? (np.status === 'Pending' ? 'Saved · waiting for verification' : v.rem ? 'Saved · ' + money(v.rem) + ' still pending for ' + mlab(i.month) : 'Saved · ' + mlab(i.month) + ' paid in full') : 'Payable updated');
};
/* open for a student: the given month, else the oldest month with something left */
PU.forStu = (sid, m) => {
  const L = liveInv().filter(i => i.stu === sid).sort((a, b) => a.month < b.month ? -1 : 1);
  const i = (m && L.find(x => x.month === m)) || L.find(x => invDue(x) > 0) || L[L.length - 1];
  if (!i) { toast('No approved invoice yet for this student'); return; }
  PU.open(i.id);
};

/* ---------- monthly payments table ---------- */
PU.months = sid => {
  const inv = INVOICES.filter(i => i.stu === sid), en = stuEnrols(sid);
  const ms = inv.map(i => i.month).concat(en.map(e => (e.start || '').slice(0, 7)).filter(Boolean)), lo = ms.length ? ms.sort()[0] : CUR, hi = inv.map(i => i.month).concat([CUR]).sort().pop();
  const out = []; let x = lo, n = 0;
  while (x <= hi && n < 240) { out.push(x); x = nextM(x); n++; }
  return out;
};
PU.table = (sid, o) => {
  o = o || {}; const money_ = R_() && R_().money !== false && ST.role !== 'Mentor';
  if (!money_) return '';
  const ms = PU.months(sid), byM = {}; INVOICES.filter(i => i.stu === sid && i.status !== 'Cancelled').forEach(i => { byM[i.month] = i; });
  const run = ms.filter(m => m <= CUR).reverse(), fut = ms.filter(m => m > CUR);
  const row = m => {
    const i = byM[m], [st, tone] = PU.stat(i), lp = i && PU.lastPay(i.id), pend = i ? PU.pendingOn(i.id) : 0;
    return `<tr class="${m === CUR ? 'run' : ''}"><td class="m"><b>${mlab(m)}</b>${m === CUR ? '<span class="pu-run">Running</span>' : ''}</td><td data-l="Status">${PU.badge(st, tone)}${pend ? `<small class="pu-wait">${money(pend)} awaiting verification</small>` : ''}</td>
      <td class="num" data-l="Payable">${i ? money(invNet(i)) : '—'}</td><td class="num ok" data-l="Paid">${i ? money(invPaid(i)) : '—'}</td><td class="num ${i && invDue(i) ? 'bad' : ''}" data-l="Pending">${i ? money(invDue(i)) : '—'}</td>
      <td data-l="Date">${lp ? fdate(lp.date) : '—'}</td><td data-l="Method">${lp ? esc(lp.method || accName(lp.acct)) : '—'}</td><td class="nt" data-l="Note">${esc((lp && lp.note) || (i && i.adjNote) || '') || '—'}</td>
      <td class="a">${i && i.status === 'Approved' && PU.canPay() ? `<button type="button" class="btn s ${invDue(i) ? 'p' : ''}" onclick="PU.open('${i.id}')">${ic('edit')}Update</button>` : ''}</td></tr>`;
  };
  const tot = run.map(m => byM[m]).filter(i => i && i.status === 'Approved');
  return `<div class="pu-tw"><table class="pu-t"><thead><tr><th>Month</th><th>Status</th><th>Payable</th><th>Paid</th><th>Pending</th><th>Date</th><th>Method</th><th>Note</th><th></th></tr></thead>
    <tbody>${run.map(row).join('') || `<tr><td colspan="9" class="pu-empty">No months yet. They appear after the student is enrolled.</td></tr>`}</tbody>
    ${tot.length ? `<tfoot><tr><td><b>Total</b></td><td></td><td class="num">${money(sum(tot, invNet))}</td><td class="num ok">${money(sum(tot, i => invPaid(i)))}</td><td class="num bad">${money(sum(tot, i => invDue(i)))}</td><td colspan="4"></td></tr></tfoot>` : ''}</table></div>
    ${fut.length ? `<details class="pu-fut"><summary>Future months (${fut.length})</summary><div class="pu-tw"><table class="pu-t"><tbody>${fut.map(row).join('')}</tbody></table></div></details>` : ''}`;
};

/* ---------- where it shows ---------- */
/* student card (SCH.stu360): replace the month tiles with the full table */
if (SCH.stu360) {
  PU._s360 = SCH.stu360;
  SCH.stu360 = function (sid, payId) {
    PU._s360.apply(this, arguments);
    if (!SCH.NEW()) return;
    const mo = document.querySelector('#sheet .s3-mo'), sec = mo ? mo.closest('section') : [...document.querySelectorAll('#sheet .s360 section h4')].map(h => h.parentElement).find(x => /Monthly fee/i.test(x.textContent));
    const t = PU.table(sid); if (!t) return;
    if (sec) sec.innerHTML = `<h4>Monthly payments</h4>${t}`;
  };
}
/* full profile: the Invoices tab becomes the monthly payments table; the overview gets it too */
PU._stuView = stuView;
stuView = function (id, tab) {
  PU._stuView.apply(this, arguments);
  if (!SCH.NEW()) return;
  const t = PU.table(id); if (!t) return;
  const tabs = document.querySelector('#sheet .tabs'); if (!tabs) return;
  let body = tabs.nextElementSibling; while (body && body.matches('script,style')) body = body.nextElementSibling;
  if ((tab || 'ov') === 'inv' && body) body.outerHTML = `<div class="pu-sec">${t}</div>`;
  else if ((tab || 'ov') === 'ov' && body) body.insertAdjacentHTML('afterend', `<div class="pu-sec"><h3>Monthly payments</h3>${t}</div>`);
};
/* invoice detail: Update button */
PU._invView = invView;
invView = function (id) {
  PU._invView.apply(this, arguments);
  if (!SCH.NEW()) return;
  const i = invOf(id), sh = document.getElementById('sheet'); if (!sh || !i || i.status !== 'Approved' || !PU.canPay() || sh.querySelector('.pu-up')) return;
  const btn = `<button class="btn ${invDue(i) ? 'p' : ''} pu-up" type="button" onclick="PU.open('${id}')">${ic('edit')}Update payment</button>`;
  const pf = [...sh.querySelectorAll('button')].find(b => /payForm\(/.test(b.getAttribute('onclick') || '')), a = sh.querySelector('.acts');
  if (pf) pf.insertAdjacentHTML('beforebegin', btn); else if (a) a.insertAdjacentHTML('afterbegin', btn);
  else { const h = sh.querySelector('.sh'); if (h) h.insertAdjacentHTML('afterend', `<div class="pu-ivb">${btn}<span>${money(invPaid(i))} paid of ${money(invNet(i))} · ${money(invDue(i))} pending</span></div>`); }
};
/* Students and Dues cards: Update next to Payment; Paid shows its % */
PU.cards = (root, monthOf) => {
  if (!SCH.NEW() || !PU.canPay()) return;
  (root || document).querySelectorAll('.qc').forEach(c => {
    const idc = c.querySelector('.idc'), sid = idc && idc.textContent.trim(); if (!sid || !/^STU-/.test(sid)) return;
    const a = c.querySelector('.qc-a'); if (!a || a.querySelector('.pu-up')) return;
    const m = monthOf ? monthOf(sid) : null;
    a.insertAdjacentHTML('afterbegin', `<button class="btn s pu-up" type="button" onclick="event.stopPropagation();PU.forStu('${sid}'${m ? `,'${m}'` : ''})" data-tip="Payment update for ${m ? esc(mlab(m)) : 'the oldest unpaid month'}">${ic('edit')}Update</button>`);
  });
};
PU._stuList = stuList;
stuList = function () {
  PU._stuList.apply(this, arguments);
  if (!SCH.NEW()) return;
  const box = document.getElementById('s-list'); if (!box) return;
  PU.cards(box, () => ST.sm);
  box.querySelectorAll('.qc').forEach(c => {
    const sid = (c.querySelector('.idc') || {}).textContent, s = sid && stuOf(sid.trim()); if (!s) return;
    const bil = stuMonthBilled(s, ST.sm), pd = stuMonthPaid(s, ST.sm), b = c.querySelectorAll('.qbx');
    if (b[1] && bil) { const sm = b[1].querySelector('small'); if (sm && !sm.dataset.pu) { sm.dataset.pu = 1; sm.textContent = 'Paid ✓ (' + Math.round(pd / bil * 100) + '%)'; } }
    if (b[2] && bil) { b[2].className = 'qbx ' + (bil - pd > 0 ? 'bad' : 'ok'); b[2].innerHTML = `<b>${money(Math.max(0, bil - pd))}</b><small>Pending · ${MF[+ST.sm.slice(5) - 1]}</small>`; }
  });
};
PU._duesPage = duesPage;
duesPage = function () { PU._duesPage.apply(this, arguments); if (SCH.NEW()) PU.cards(document.getElementById('inv-body')); };

/* Payments page: "By student" — every student's month like the QIT app */
ST.puV = ST.puV || 'rc'; ST.puM = ST.puM || CUR; ST.puS = ST.puS || 'All'; ST.puQ = ST.puQ || '';
PU.rows = () => {
  const q = ST.puQ.trim().toLowerCase();
  return liveInv().filter(i => i.month === ST.puM).map(i => ({ i, s: stuOf(i.stu), st: PU.stat(i)[0] }))
    .filter(x => (ST.puS === 'All' || x.st === ST.puS) && (!q || (x.s.name + ' ' + x.s.id + ' ' + x.s.phone + ' ' + x.s.guardian + ' ' + x.i.id + ' ' + x.i.items.map(t => progName(t.prog)).join(' ')).toLowerCase().includes(q)))
    .sort((a, b) => invDue(b.i) - invDue(a.i) || a.s.name.localeCompare(b.s.name));
};
PU.byStu = () => {
  const box = document.getElementById('p-list'); if (!box) return;
  const all = liveInv().filter(i => i.month === ST.puM), L = PU.rows(), c = k => all.filter(i => k === 'All' || PU.stat(i)[0] === k).length;
  const tb = sum(all, invNet), tp = sum(all, i => invPaid(i));
  if (!V8.MP.puM) V8.MP.puM = { sel: [ST.puM], single: true, title: 'Month', apply: sel => { ST.puM = sel[0] || CUR; PU.byStu(); } };
  V8.MP.puM.sel = [ST.puM]; V8.MP.puM.data = uniq(liveInv().map(i => i.month)).sort();
  box.innerHTML = `<div class="pu-bar card flat"><div class="pu-bl">${V8.mpBtn('puM')}<label class="pu-q"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" placeholder="Name, ID, phone or subject" value="${esc(ST.puQ)}" oninput="ST.puQ=this.value;clearTimeout(PU.qt);PU.qt=setTimeout(PU.byStu,160)"></label></div>
      <div class="pu-tot"><span>Payable <b class="num">${money(tb)}</b></span><span>Paid <b class="num ok">${money(tp)}</b></span><span>Pending <b class="num bad">${money(tb - tp)}</b></span><span>${tb ? Math.round(tp / tb * 100) : 0}% collected</span></div></div>
    <div class="pu-chips" role="group" aria-label="Filter">${[['All', 'All'], ['Paid', 'Paid'], ['Part paid', 'Part paid'], ['Pending', 'Pending']].map(x => `<button type="button" class="${ST.puS === x[0] ? 'on' : ''}" aria-pressed="${ST.puS === x[0]}" onclick="ST.puS='${x[0]}';PU.byStu()">${x[1]}<b>${dg(c(x[0]))}</b></button>`).join('')}</div>
    ${L.length ? `<div class="qcs">${L.map(x => { const net = invNet(x.i), pd = invPaid(x.i), due = invDue(x.i), [st, tone] = PU.stat(x.i), lp = PU.lastPay(x.i.id);
      return qcard({ name: x.s.name, id: x.s.id, tone: tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : 'bad', tags: uniq(x.i.items.map(t => progName(t.prog))), status: PU.badge(st, tone), open: `SCH.stu360 ? SCH.stu360('${x.s.id}') : stuView('${x.s.id}')`,
        boxes: [[money(net), 'Payable · ' + MF[+ST.puM.slice(5) - 1]], [money(pd), 'Paid ✓ (' + (net ? Math.round(pd / net * 100) : 0) + '%)', 'ok'], [money(due), due ? 'Pending' : 'All paid', due ? 'bad' : 'ok']],
        actions: `${PU.canPay() ? `<button class="btn s ${due ? 'p' : ''} pu-up" type="button" onclick="PU.open('${x.i.id}')">${ic('edit')}Update</button>` : ''}${lp ? `<button class="btn s" type="button" onclick="receiptView('${lp.id}')" data-tip="Last receipt ${esc(lp.rcpt)}">${ic('receipt')}</button>` : ''}`,
        foot: `<span>${lp ? 'Last paid ' + fdate(lp.date) + ' · ' + esc(lp.method || accName(lp.acct)) : 'No payment yet'}</span>${x.i.adjNote ? `<span class="sub">Adjusted: ${esc(x.i.adjNote)}</span>` : ''}<span>Guardian: <b>${esc(x.s.guardian)}</b></span>` }); }).join('')}</div>` : `<div class="tw"><div class="empty">No student matches for ${esc(mlab(ST.puM))}.</div></div>`}`;
};
PU._payList = payList;
payList = function () { if (SCH.NEW() && ST.puV === 'st' && document.getElementById('p-list')) return PU.byStu(); return PU._payList.apply(this, arguments); };
PU._payPage = PAGES.payments;
PAGES.payments = function () {
  PU._payPage.apply(this, arguments);
  if (!SCH.NEW() || !(R_() && R_().money !== false)) return;
  const pl = document.getElementById('p-list'); if (!pl || document.getElementById('pu-sw')) return;
  pl.insertAdjacentHTML('beforebegin', `<div class="pu-sw seg" id="pu-sw" role="tablist" aria-label="Payments view"><button type="button" role="tab" class="${ST.puV === 'rc' ? 'on' : ''}" aria-selected="${ST.puV === 'rc'}" onclick="ST.puV='rc';PAGES.payments()">${ic('receipt')}Receipts</button><button type="button" role="tab" class="${ST.puV === 'st' ? 'on' : ''}" aria-selected="${ST.puV === 'st'}" onclick="ST.puV='st';PAGES.payments()">${ic('students')}By student · monthly</button></div>`);
  document.querySelectorAll('#view .pu-hide-st').forEach(e => e.classList.remove('pu-hide-st'));
  if (ST.puV === 'st') { const prev = pl.previousElementSibling && pl.previousElementSibling.previousElementSibling; [...pl.parentElement.children].forEach(e => { if (e !== pl && e.id !== 'pu-sw' && e.classList.contains('chips')) e.classList.add('pu-hide-st'); }); PU.byStu(); }
};

/* new student form: say where the monthly rows come from */
PU._studentForm = studentForm;
studentForm = function () {
  PU._studentForm.apply(this, arguments);
  if (!SCH.NEW()) return;
  const a = document.querySelector('#sheet .acts'); if (!a) return;
  a.insertAdjacentHTML('beforebegin', `<div class="pu-new"><b>Monthly payments</b><span>After you save, each month gets its own row on the student's card — Payable (from the programme fee minus any discount), Paid and Pending — and you record money with <b>Update</b>.</span><div class="pu-np" id="pu-np"></div></div>`);
  const pr = $('#nf-pr'), d = $('#nf-d'), s = $('#nf-s');
  const draw = () => { const p = PROGS.find(x => x.id === pr.value) || {}, f = Math.max(0, (p.fee || 0) - (+d.value || 0)), m = (s.value || CUR).slice(0, 7); ($('#pu-np') || {}).innerHTML = `<span>First month <b>${mlab(m)}</b></span><span>Payable <b class="num">${money(f)}</b></span><span>Paid <b class="num">BDT 0</b></span><span>Pending <b class="num">${money(f)}</b></span>`; };
  [pr, d, s].forEach(e => e && e.addEventListener('input', draw)); pr && pr.addEventListener('change', draw); draw();
};

/* =====================================================================
   money1 · part 2 (owner, 29 Oct): Total + Paid boxes in every student-fee place
   ===================================================================== */
PU.AWAIT = 'Awaiting verification';
PU.invId = n => { const y = n.slice(0, 4); return 'INV-' + y + '-' + String(Math.max(0, ...INVOICES.filter(i => i.id.startsWith('INV-' + y)).map(i => +i.id.slice(-4))) + 1).padStart(4, '0'); };
PU.mkPay = (o) => {
  /* one real payment through the existing engine; o: {stu, inv, amt, date, acct, ref, note, pend} */
  paySeq++;
  const np = { id: 'PAY-' + String(paySeq).padStart(4, '0'), rcpt: 'RCP-2026-' + String(paySeq).padStart(4, '0'), stu: o.stu, date: o.date || TODAY, amt: o.amt, acct: o.acct || 'ACC-CASH', method: METHOD[o.acct] || accName(o.acct || 'ACC-CASH'), ref: o.ref || '', status: o.pend ? 'Pending' : 'Verified', by: ME().name, verifiedBy: o.pend ? '' : ME().name, alloc: o.inv ? [{ inv: o.inv, amt: o.amt }] : [], note: o.note || '' };
  PAYMENTS.push(np); return np;
};

/* ---------- receipts view cards: Payable / Paid / Pending, "Awaiting verification" ---------- */
PU.recCards = () => {
  const box = document.getElementById('p-list'); if (!box || ST.puV === 'st') return;
  box.querySelectorAll('.qc').forEach(c => {
    if (c.dataset.pu2) return; c.dataset.pu2 = 1;
    const n = c.querySelector('.qc-n'), m = n && (n.getAttribute('onclick') || '').match(/PAY-\d+/), p = m && PAYMENTS.find(x => x.id === m[0]); if (!p) return;
    const inv = p.alloc.map(a => invOf(a.inv)).filter(Boolean), pay = sum(inv, invNet), paidAll = sum(inv, i => invPaid(i)), pend = sum(inv, i => invDue(i)), adv = payUnalloc(p);
    c.querySelectorAll('.qc-h .pill').forEach(pl => { if (pl.textContent.trim() === 'Pending') { pl.textContent = PU.AWAIT; pl.title = 'This payment is not verified yet, so it is not counted as paid'; } });
    const bx = c.querySelectorAll('.qc-b > .qbx'), ms = inv.map(i => MS[+i.month.slice(5) - 1]).join(', ');
    if (bx.length >= 3) {
      bx[0].className = 'qbx'; bx[0].innerHTML = `<b>${inv.length ? money(pay) : '—'}</b><small>Payable${ms ? ' · ' + esc(ms) : ''}</small>`;
      bx[1].className = 'qbx ' + (p.status === 'Verified' ? 'ok' : p.status === 'Rejected' ? '' : 'warn'); bx[1].innerHTML = `<b>${money(p.amt)}</b><small>${p.status === 'Verified' ? 'Paid ✓' : p.status === 'Rejected' ? 'Rejected · not counted' : 'Paid · ' + PU.AWAIT.toLowerCase()} · ${fdate(p.date)}${inv.length && pay ? ' (' + Math.round(paidAll / pay * 100) + '%)' : ''}</small>`;
      bx[2].className = 'qbx ' + (adv > 0 ? 'gold' : pend ? 'bad' : 'ok'); bx[2].innerHTML = adv > 0 ? `<b>${money(adv)}</b><small>Kept as advance</small>` : `<b>${money(pend)}</b><small>${pend ? 'Pending' : 'All paid'}</small>`;
    }
    const a = c.querySelector('.qc-a'), open = inv.find(i => invDue(i) > 0) || liveInv().filter(i => i.stu === p.stu && invDue(i) > 0).sort((x, y) => x.month < y.month ? -1 : 1)[0];
    if (a && open && PU.canPay() && !a.querySelector('.pu-up')) a.insertAdjacentHTML('afterbegin', `<button class="btn s pu-up" type="button" onclick="event.stopPropagation();PU.open('${open.id}')" data-tip="Payment update for ${esc(mlab(open.month))}">${ic('edit')}Update</button>`);
  });
  /* the status chip above the list */
  document.querySelectorAll('#view .chips button').forEach(b => { if ((b.getAttribute('onclick') || '') === "payChip('Pending')") { [...b.childNodes].forEach(t => { if (t.nodeType === 3 && t.textContent.trim() === 'Pending') t.textContent = PU.AWAIT; }); } });
};
PU._payList2 = payList;
payList = function () { const r = PU._payList2.apply(this, arguments); if (SCH.NEW()) PU.recCards(); return r; };
PU._payPage2 = PAGES.payments;
PAGES.payments = function () { PU._payPage2.apply(this, arguments); if (SCH.NEW()) PU.recCards(); };
/* payment drawer: status reads "Awaiting verification" */
PU._payView = payView;
payView = function (id) {
  PU._payView.apply(this, arguments);
  if (!SCH.NEW()) return;
  const p = PAYMENTS.find(x => x.id === id), sh = document.getElementById('sheet'); if (!p || !sh || p.status !== 'Pending') return;
  sh.querySelectorAll('.pill').forEach(pl => { if (pl.textContent.trim() === 'Pending') pl.textContent = PU.AWAIT; });
};

/* ---------- invoices table: Update on rows that still have something pending ---------- */
PU._invPage = invPage;
invPage = function () {
  const r = PU._invPage.apply(this, arguments);
  if (!SCH.NEW() || !PU.canPay()) return r;
  document.querySelectorAll('#inv-body tbody tr').forEach(tr => {
    if (tr.dataset.pu) return; tr.dataset.pu = 1;
    const m = tr.textContent.match(/INV-\d{4}-\d{4}/), i = m && invOf(m[0]); if (!i || i.status !== 'Approved' || !invDue(i)) return;
    const td = tr.lastElementChild; if (td) td.insertAdjacentHTML('beforeend', ` <button class="btn s p pu-up pu-tr" type="button" onclick="event.stopPropagation();PU.open('${i.id}')" data-tip="Payment update · ${esc(mlab(i.month))}">${ic('edit')}Update</button>`);
  });
  return r;
};

/* ---------- receive-payment form (v9 rows): QIT wording ---------- */
PU._pad = payAllocDraw;
payAllocDraw = function () {
  const r = PU._pad.apply(this, arguments);
  if (!SCH.NEW()) return r;
  const t = document.querySelector('#pf-al .v9-pr.h'); if (t) { const c = t.children; if (c[1]) c[1].textContent = 'Payable'; if (c[3]) c[3].textContent = 'Paid now'; if (c[4]) c[4].textContent = 'Pending'; }
  document.querySelectorAll('#pf-al [data-l="Total fee"]').forEach(e => e.dataset.l = 'Payable');
  document.querySelectorAll('#pf-al [data-l="Paying now"]').forEach(e => e.dataset.l = 'Paid now');
  document.querySelectorAll('#pf-al [data-l="Remaining"]').forEach(e => e.dataset.l = 'Pending');
  return r;
};

/* ---------- dashboard: clear words for the two kinds of "pending" ---------- */
if (SCH.ccDash) {
  PU._cc = SCH.ccDash;
  SCH.ccDash = function () {
    PU._cc.apply(this, arguments);
    if (!SCH.NEW()) return;
    document.querySelectorAll('#view .cc-at .sc-li').forEach(li => {
      const b = li.querySelector('b'), sm = li.querySelector('small'); if (!b) return;
      if (/verif/i.test(b.textContent)) b.textContent = 'Payment ' + PU.AWAIT.toLowerCase();
      const m = /overdue/i.test(b.textContent) && b.textContent.match(/\d+/);
      if (m) { const L = liveInv().filter(i => invStatus(i) === 'Overdue'), pay = sum(L, invNet), pd = sum(L, i => invPaid(i)); b.textContent = dg(L.length) + ' invoices overdue'; if (sm) sm.innerHTML = `Payable ${money(pay)} · Paid ${money(pd)} · <b>Pending ${money(pay - pd)}</b>`; }
    });
  };
}

/* ---------- monthly payment table for the student form (new + edit), like QIT ---------- */
PU.F = null;   /* form state: {sid?, rows:{m:{st, pay, paid, d, acct, n}}} */
PU.feeOf = () => {
  const pr = $('#nf-pr'), d = $('#nf-d'); const p = pr && PROGS.find(x => x.id === pr.value); return Math.max(0, ((p && p.fee) || 0) - (+(d && d.value) || 0));
};
PU.fRows = () => {
  const s = ($('#nf-s') && $('#nf-s').value || CUR).slice(0, 7), lo = s < CUR ? s : CUR, out = []; let x = lo, n = 0;
  const hi = V8 && V8.mAdd ? V8.mAdd(s > CUR ? s : CUR, 2) : nextM(nextM(CUR));
  while (x <= hi && n < 240) { if (x >= s) out.push(x); x = nextM(x); n++; }
  return out;
};
PU.fRow = (m, R, adj) => {
  const r = R[m], run = m === CUR, fut = m > CUR, accs = ACCOUNTS.map(a => [a.id, a.name]);
  return `<tr data-m="${m}" class="${run ? 'run' : ''} ${r.st === 'Off' ? 'off' : ''}"><td class="m"><b>${mlab(m)}</b>${run ? '<span class="pu-run">Running</span>' : fut ? '<span class="pu-fu">Future</span>' : ''}</td>
    <td data-l="Month status"><select class="pu-fs" aria-label="Status for ${mlab(m)}" onchange="PU.fSet('${m}','st',this.value)">${opts([['Active', 'Active'], ['Off', 'Not billed']], r.st)}</select></td>
    <td data-l="Payable"><span class="v9-in"><i>BDT</i><input type="number" min="0" step="1" value="${r.pay}" ${adj ? '' : 'readonly title="Only the Owner or Admin can set fees"'} aria-label="Payable for ${mlab(m)}" oninput="PU.fSet('${m}','pay',this.value)"></span></td>
    <td data-l="Paid"><span class="v9-in"><i>BDT</i><input type="number" min="0" step="1" value="${r.paid || ''}" placeholder="0" aria-label="Paid for ${mlab(m)}" oninput="PU.fSet('${m}','paid',this.value)"></span></td>
    <td data-l="Pending" class="num pu-fp" data-p="${m}"></td>
    <td data-l="Date"><input type="date" value="${r.d}" max="${TODAY}" aria-label="Payment date for ${mlab(m)}" onchange="PU.fSet('${m}','d',this.value)"></td>
    <td data-l="Method"><select aria-label="Method for ${mlab(m)}" onchange="PU.fSet('${m}','acct',this.value)">${opts(accs, r.acct)}</select></td>
    <td data-l="Note"><input value="${esc(r.n || '')}" placeholder="Optional" aria-label="Note for ${mlab(m)}" oninput="PU.fSet('${m}','n',this.value)"></td></tr>`;
};
PU.fDraw = () => {
  const box = document.getElementById('pu-mt'); if (!box || !PU.F) return;
  const adj = PU.canAdj(), ms = PU.fRows(), R = PU.F.rows, fee = PU.feeOf();
  ms.forEach(m => { if (!R[m]) R[m] = { st: 'Active', pay: fee, paid: 0, d: m < CUR ? m + '-05' : TODAY, acct: 'ACC-CASH', n: '' }; });
  const run = ms.filter(m => m <= CUR).reverse(), fut = ms.filter(m => m > CUR);
  const head = `<thead><tr><th>Month</th><th>Month status</th><th>Payable</th><th>Paid</th><th>Pending</th><th>Date</th><th>Method</th><th>Note</th></tr></thead>`;
  box.innerHTML = `<div class="pu-mh"><div><b>Monthly payment</b><small>Running month first · future months separate</small></div><button type="button" class="btn s" onclick="PU.fFill()" ${adj ? '' : 'disabled'}>${ic('plus')}Fill monthly fee in empty months</button></div>
    ${run.length ? `<div class="pu-tw"><table class="pu-t pu-ft">${head}<tbody>${run.map(m => PU.fRow(m, R, adj)).join('')}</tbody></table></div>` : ''}
    ${fut.length ? `<details class="pu-fut" ${run.length ? '' : 'open'}><summary>Future months (${fut.length}) · paid money is kept as advance</summary><div class="pu-tw"><table class="pu-t pu-ft">${head}<tbody>${fut.map(m => PU.fRow(m, R, adj)).join('')}</tbody></table></div></details>` : ''}
    <div class="pu-ftot" id="pu-ftot"></div>${adj ? '' : '<p class="pu-hint">Fees are set by the Owner or Admin. You can record what was paid.</p>'}`;
  PU.fCalc();
};
PU.fSet = (m, k, v) => {
  const r = PU.F.rows[m]; if (!r) return;
  if (k === 'pay' || k === 'paid') { v = Math.max(0, Math.round(+v || 0)); if (k === 'pay' && !PU.canAdj()) return; }
  r[k] = v;
  if (k === 'st') { const tr = document.querySelector(`#pu-mt tr[data-m="${m}"]`); if (tr) tr.classList.toggle('off', v === 'Off'); }
  PU.fCalc();
};
PU.fCalc = () => {
  const R = PU.F.rows, ms = PU.fRows(); let tp = 0, td = 0, tn = 0, over = [];
  let fa = 0;
  ms.forEach(m => { const r = R[m]; if (!r) return; const on = r.st !== 'Off', fut = m > CUR, pay = on ? r.pay : 0, paid = r.paid || 0, pend = Math.max(0, pay - paid);
    if (on && !fut) { tp += pay; tn += Math.min(paid, pay); td += pend; } if (fut) fa += paid; if (paid > pay && !fut) over.push(mlab(m));
    const c = document.querySelector(`#pu-mt [data-p="${m}"]`); if (c) c.innerHTML = !on ? '<span class="sub">—</span>' : fut ? (paid ? `<span class="pu-st n">${money(paid)} advance</span>` : '<span class="sub">Not due yet</span>') : pend ? `<b class="bad">${money(pend)}</b>` : `<span class="pu-st ok">${ic('check')}Paid</span>`; });
  const t = document.getElementById('pu-ftot'); if (t) t.innerHTML = `<span>Up to ${esc(mlab(CUR))}: Payable <b class="num">${money(tp)}</b></span><span>Paid <b class="num ok">${money(tn)}</b></span><span>Pending <b class="num bad">${money(td)}</b></span>${fa ? `<span>Advance for future months <b class="num">${money(fa)}</b></span>` : ''}${over.length ? `<span class="v9-warn">Paid is more than payable for ${esc(over.join(', '))}; the extra is kept as advance.</span>` : ''}`;
};
PU.fFill = () => { if (!PU.canAdj()) return; const fee = PU.feeOf(); PU.fRows().forEach(m => { const r = PU.F.rows[m]; if (r && r.st !== 'Off' && !r.pay) r.pay = fee; }); PU.fDraw(); };
/* create the months for a student through the engine: invoices (approved up to the running month, draft after) and real payments */
PU.fCommit = (sid, enrId) => {
  const R = PU.F.rows, en = ENROL.find(e => e.id === enrId), adj = PU.canAdj(), pend = !PU.canVerify(); let nInv = 0, nPay = 0, paidT = 0;
  PU.fRows().forEach(m => {
    const r = R[m]; if (!r || r.st === 'Off') return;
    let inv = INVOICES.find(i => i.stu === sid && i.month === m && i.status !== 'Cancelled');
    if (!inv && en && (r.pay > 0 || r.paid > 0)) {
      const fee = feeFor(en, m), disc = en.disc || 0;
      inv = { id: PU.invId(m), stu: sid, month: m, issue: m + '-01', due: m + '-10', status: m <= CUR && adj ? 'Approved' : 'Draft', items: [{ enr: en.id, prog: en.prog, mentor: en.mentor, batch: en.batch || '', fee, disc }], adj: 0, adjNote: '', approvedBy: m <= CUR && adj ? ME().name : '' };
      const want = adj ? r.pay : fee - disc; if (want !== fee - disc) { inv.adj = want - (fee - disc); inv.adjNote = 'Set on the student form · by ' + ME().name + ' · ' + fdate(TODAY); }
      INVOICES.push(inv); nInv++;
    }
    if (r.paid > 0) {
      const live = inv && inv.status === 'Approved', onInv = live ? Math.min(r.paid, invDue(inv)) : 0, extra = r.paid - onInv;
      if (onInv > 0) { PU.mkPay({ stu: sid, inv: inv.id, amt: onInv, date: r.d && r.d <= TODAY ? r.d : TODAY, acct: r.acct, note: r.n || ('Monthly payment · ' + mlab(m)), pend }); nPay++; paidT += onInv; }
      if (extra > 0) { PU.mkPay({ stu: sid, inv: null, amt: extra, date: r.d && r.d <= TODAY ? r.d : TODAY, acct: r.acct, note: (r.n ? r.n + ' · ' : '') + 'Advance for ' + mlab(m), pend }); nPay++; paidT += extra; }
    }
  });
  if (nInv || nPay) { MOVES = movements(); log('Monthly payments set', stuOf(sid).name + ' · ' + sid, dg(nInv) + ' months billed · ' + money(paidT) + ' paid' + (pend ? ' (' + PU.AWAIT.toLowerCase() + ')' : '')); }
  return { nInv, nPay, paidT };
};
/* new student */
PU._stuForm2 = studentForm;
studentForm = function () {
  PU._stuForm2.apply(this, arguments);
  if (!SCH.NEW() || !PU.canPay()) return;
  const n = document.querySelector('#sheet .pu-new'); if (n) n.remove();
  const a = document.querySelector('#sheet .acts'); if (!a) return;
  a.insertAdjacentHTML('beforebegin', '<div class="pu-mt" id="pu-mt"></div>');
  PU.F = { rows: {} };
  const re = () => { const fee = PU.feeOf(); Object.values(PU.F.rows).forEach(r => { if (!r.touched) r.pay = fee; }); PU.fDraw(); };
  ['#nf-pr', '#nf-d', '#nf-s'].forEach(s => { const e = $(s); if (e) { e.addEventListener('change', re); e.addEventListener('input', re); } });
  PU.fDraw();
  document.getElementById('sheet').classList.add('wide');
};
PU._fSet0 = PU.fSet; PU.fSet = (m, k, v) => { if (k === 'pay' && PU.F && PU.F.rows[m]) PU.F.rows[m].touched = true; PU._fSet0(m, k, v); };
PU._saveStu = saveStudent;
saveStudent = function () {
  const use = SCH.NEW() && PU.F && document.getElementById('pu-mt'), n0 = STUDENTS.length;
  PU._saveStu.apply(this, arguments);
  if (!use || STUDENTS.length === n0) { PU.F = null; return; }
  const s = STUDENTS[STUDENTS.length - 1], en = ENROL.filter(e => e.stu === s.id).pop();
  const r = PU.fCommit(s.id, en && en.id); PU.F = null; render();
  if (r.nInv || r.nPay) toast(s.name + ' added · ' + dg(r.nInv) + ' months billed · ' + money(r.paidT) + ' paid');
};
/* edit student: details + the same monthly table for existing months */
PU.stuEdit = sid => {
  const s = stuOf(sid); if (!s) return; if (!PU.canPay()) { toast('This role cannot edit students'); return; }
  const adj = PU.canAdj(), L = INVOICES.filter(i => i.stu === sid && i.status !== 'Cancelled').sort((a, b) => a.month < b.month ? 1 : -1);
  const run = L.filter(i => i.month <= CUR), fut = L.filter(i => i.month > CUR), accs = ACCOUNTS.map(a => [a.id, a.name]);
  const row = i => { const net = invNet(i), pd = invPaid(i), lp = PU.lastPay(i.id), [st, tone] = PU.stat(i), ok = i.status === 'Approved';
    return `<tr data-i="${i.id}" class="${i.month === CUR ? 'run' : ''}"><td class="m"><b>${mlab(i.month)}</b>${i.month === CUR ? '<span class="pu-run">Running</span>' : i.month > CUR ? '<span class="pu-fu">Future</span>' : ''}</td><td data-l="Month status">${PU.badge(i.status === 'Draft' ? 'Draft' : st, i.status === 'Draft' ? 'n' : tone)}</td>
      <td data-l="Payable"><span class="v9-in"><i>BDT</i><input type="number" min="${pd}" step="1" value="${net}" ${adj && ok ? '' : 'readonly'} data-k="pay" data-o="${net}" aria-label="Payable for ${mlab(i.month)}" oninput="PU.eCalc()"></span></td>
      <td data-l="Paid"><span class="v9-in"><i>BDT</i><input type="number" min="${pd}" step="1" value="${pd}" ${ok ? '' : 'readonly'} data-k="paid" data-o="${pd}" aria-label="Paid for ${mlab(i.month)} (raise it to record a new payment)" oninput="PU.eCalc()"></span></td>
      <td data-l="Pending" class="num" data-p="${i.id}"></td>
      <td data-l="Date"><input type="date" value="${TODAY}" max="${TODAY}" data-k="d" aria-label="Date of a new payment"></td>
      <td data-l="Method"><select data-k="acct" aria-label="Method">${opts(accs, (lp && lp.acct) || 'ACC-CASH')}</select></td>
      <td data-l="Note"><input data-k="n" value="" placeholder="${esc((lp && lp.note) || 'Optional')}" aria-label="Note"></td></tr>`; };
  const head = `<thead><tr><th>Month</th><th>Month status</th><th>Payable</th><th>Paid</th><th>Pending</th><th>Date</th><th>Method</th><th>Note</th></tr></thead>`;
  sheet('EDIT STUDENT · ' + sid, esc(s.name), `<div class="grid g2">${fld('Name', `<input id="pe-n" value="${esc(s.name)}">`)}${fld('Guardian', `<input id="pe-g" value="${esc(s.guardian)}">`)}${fld('Contact', `<input id="pe-p" value="${esc(s.phone)}" inputmode="tel">`)}${fld('Class / level', `<input id="pe-c" value="${esc(s.cls)}">`)}${fld('Board', `<select id="pe-b">${opts(['Cambridge', 'Edexcel', 'National', '—'], s.board)}</select>`)}${fld('Gmail', `<input id="pe-e" type="email" value="${esc(s.gmail || '')}" placeholder="name@gmail.com">`)}</div>
    <div class="pu-mt" id="pu-et"><div class="pu-mh"><div><b>Monthly payment</b><small>Running month first · future months separate · raise Paid to record new money</small></div></div>
    ${run.length ? `<div class="pu-tw"><table class="pu-t pu-ft">${head}<tbody>${run.map(row).join('')}</tbody></table></div>` : '<p class="pu-hint">No months billed yet.</p>'}
    ${fut.length ? `<details class="pu-fut"><summary>Future months (${fut.length})</summary><div class="pu-tw"><table class="pu-t pu-ft">${head}<tbody>${fut.map(row).join('')}</tbody></table></div></details>` : ''}
    <div class="pu-ftot" id="pu-etot"></div>${adj ? `<div id="pe-why-w" class="pu-off">${fld('Reason for changing a payable', '<input id="pe-why" placeholder="e.g. sibling discount, fee correction">')}</div>` : '<p class="pu-hint">Fees are set by the Owner or Admin.</p>'}</div>
    <div class="acts"><button class="btn" type="button" onclick="closeSheet()">Cancel</button><button class="btn p" type="button" onclick="PU.eSave('${sid}')">Save</button></div>`, true);
  document.getElementById('sheet').classList.add('wide'); PU.eCalc();
};
PU.eCalc = () => {
  let tp = 0, tn = 0, td = 0, chg = false;
  document.querySelectorAll('#pu-et tr[data-i]').forEach(tr => {
    const i = invOf(tr.dataset.i), pay = Math.max(0, Math.round(+tr.querySelector('[data-k="pay"]').value || 0)), paid = Math.max(0, Math.round(+tr.querySelector('[data-k="paid"]').value || 0)), pend = Math.max(0, pay - paid);
    if (pay !== invNet(i)) chg = true;
    if (i.status === 'Approved') { tp += pay; tn += Math.min(paid, pay); td += pend; }
    const c = tr.querySelector('[data-p]'); if (c) c.innerHTML = pend ? `<b class="bad">${money(pend)}</b>` : `<span class="pu-st ok">${ic('check')}Paid</span>`;
  });
  const w = document.getElementById('pe-why-w'); if (w) w.classList.toggle('pu-off', !chg);
  const t = document.getElementById('pu-etot'); if (t) t.innerHTML = `<span>Payable <b class="num">${money(tp)}</b></span><span>Paid <b class="num ok">${money(tn)}</b></span><span>Pending <b class="num bad">${money(td)}</b></span>`;
};
PU.eSave = sid => {
  const s = stuOf(sid), nm = $('#pe-n').value.trim(); if (!nm) { toast('Write the name'); return; }
  const rows = [...document.querySelectorAll('#pu-et tr[data-i]')].map(tr => { const g = k => tr.querySelector(`[data-k="${k}"]`); return { i: invOf(tr.dataset.i), pay: Math.round(+g('pay').value || 0), paid: Math.round(+g('paid').value || 0), d: g('d').value || TODAY, acct: g('acct').value, n: g('n').value.trim() }; });
  const ch = rows.filter(r => r.pay !== invNet(r.i));
  if (ch.length) {
    if (!PU.canAdj()) { toast('Only the Owner or Admin can change fees'); return; }
    const lk = ch.find(r => locked(r.i.month) && ST.role !== 'Owner'); if (lk) { toast(mlab(lk.i.month) + ' is locked'); return; }
    const bad = ch.find(r => r.pay < invPaid(r.i)); if (bad) { toast('Payable for ' + mlab(bad.i.month) + ' cannot be less than what is already paid'); return; }
    if (!($('#pe-why') && $('#pe-why').value.trim())) { toast('Write the reason for changing the payable'); $('#pe-why') && $('#pe-why').focus(); return; }
  }
  const low = rows.find(r => r.paid < invPaid(r.i)); if (low) { toast('To reduce what was paid for ' + mlab(low.i.month) + ', edit or reject that payment on the Payments page'); return; }
  const newPay = rows.filter(r => r.paid > invPaid(r.i) && r.i.status === 'Approved');
  const over = newPay.find(r => r.paid - invPaid(r.i) > Math.max(0, r.pay - invPaid(r.i))); if (over) { toast('Paid is more than payable for ' + mlab(over.i.month) + '. Put extra money through Receive payment as advance.'); return; }
  /* details */
  const before = JSON.stringify([s.name, s.guardian, s.phone, s.cls, s.board, s.gmail]);
  s.name = nm; s.guardian = $('#pe-g').value.trim() || '—'; s.phone = $('#pe-p').value.trim() || '—'; s.cls = $('#pe-c').value.trim() || '—'; s.board = $('#pe-b').value; s.gmail = $('#pe-e').value.trim();
  if (JSON.stringify([s.name, s.guardian, s.phone, s.cls, s.board, s.gmail]) !== before) log('Student edited', s.name + ' · ' + sid, 'Details updated');
  const why = $('#pe-why') ? $('#pe-why').value.trim() : '';
  ch.forEach(r => { const d = r.pay - invNet(r.i); r.i.adj = (r.i.adj || 0) + d; r.i.adjNote = (r.i.adjNote ? r.i.adjNote + ' · ' : '') + (d < 0 ? '− ' : '+ ') + money(Math.abs(d)) + ': ' + why + ' · by ' + ME().name + ' · ' + fdate(TODAY); log('Invoice adjusted', s.name + ' · ' + r.i.id + ' · ' + mlab(r.i.month), money(r.pay - d) + ' → ' + money(r.pay) + ' · ' + why); });
  const pend = !PU.canVerify(); let tot = 0;
  newPay.forEach(r => { const amt = r.paid - invPaid(r.i); PU.mkPay({ stu: sid, inv: r.i.id, amt, date: r.d, acct: r.acct, note: r.n || ('Payment update · ' + mlab(r.i.month)), pend }); tot += amt; log(pend ? 'Payment submitted' : 'Payment recorded', s.name + ' · ' + mlab(r.i.month), money(amt) + ' · ' + accName(r.acct)); });
  MOVES = movements(); closeSheet(); render();
  toast(tot ? 'Saved · ' + money(tot) + (pend ? ' sent for verification' : ' recorded') : 'Saved');
};
/* Edit buttons: student card, profile, students list */
if (SCH.stu360) {
  PU._s3b = SCH.stu360;
  SCH.stu360 = function (sid) { PU._s3b.apply(this, arguments); if (!SCH.NEW() || !PU.canPay()) return; const a = document.querySelector('#sheet .s3-acts.end'); if (a && !a.querySelector('.pu-ed')) a.insertAdjacentHTML('afterbegin', `<button class="btn s pu-ed" type="button" onclick="PU.stuEdit('${sid}')">${ic('edit')}Edit student</button>`); };
}
PU._stuView2 = stuView;
stuView = function (id) { PU._stuView2.apply(this, arguments); if (!SCH.NEW() || !PU.canPay()) return; const h = document.querySelector('#sheet .mn-prof'); if (h && !h.querySelector('.pu-ed')) h.insertAdjacentHTML('beforeend', `<button class="btn s pu-ed" type="button" onclick="PU.stuEdit('${id}')">${ic('edit')}Edit</button>`); };
