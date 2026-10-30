/* =====================================================================
   money2 · owner request 28 Oct (QIT "PAYMENT UPDATE" style), worker Z
   Every money place except student fees: a Total (payable), what is
   already Paid, a Paid-now box with "Paid in full", date, account, note,
   and the rest shown as Pending. Mentor payroll, salary list, expenses,
   vendor dues, loans & others, refunds. New skins only; the existing
   engine (PRPAY, EXPENSES.paid + V9 dated pays, OTHERS.txns, MOVES,
   log) does the bookkeeping, so balances and reports keep matching.
   ===================================================================== */
const MZ = window.MZ = { D: null };
MZ.on = () => SCH.NEW && SCH.NEW();
MZ.staff = () => ST.role !== 'Mentor' && ST.role !== 'Student' && !SCH.preview;
MZ.canPay = kind => {
  if (!MZ.staff()) return false;
  if (ST.role === 'Owner') return true;
  if (kind === 'salary') return !!(SCH.can && SCH.can('salary', 'e')) || !!R_().edit;
  return !!R_().edit;
};
MZ.pct = (a, b) => b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0;
MZ.cell = (tot, paid) => { const pend = Math.max(0, tot - paid), p = MZ.pct(paid, tot); return `<span class="mz-c"><span class="mz-cl"><b class="num">${money(paid)}</b><small>of ${money(tot)}</small></span><span class="mz-bar" aria-hidden="true"><i style="width:${p}%"></i></span><span class="mz-cs ${pend ? (paid ? 'warn' : 'bad') : 'ok'}">${pend ? money(pend) + ' pending' : 'Paid'} · ${p}%</span></span>`; };
MZ.st = (tot, paid) => tot - paid <= 0 ? ['Paid', 'ok'] : paid > 0 ? ['Part paid', 'warn'] : ['Unpaid', 'bad'];

/* ---------- the one Payment Update dialog ----------
   o: { key, eyebrow, title, total, before, dir:'out'|'in', acct, picker:{label,opts,val,on}, extra, payableNote, save(r) } */
MZ.dlg = o => {
  if (!MZ.canPay(o.kind)) { toast('You do not have permission to record this payment'); return; }
  MZ.D = o; const left = Math.max(0, o.total - o.before), out = o.dir !== 'in';
  sheet(o.eyebrow || 'PAYMENT UPDATE', esc(o.title), `<div class="mz-d">
    ${o.picker ? `<div class="mz-pick">${fld(o.picker.label, `<select id="mz-pk" onchange="${o.picker.on}">${opts(o.picker.opts, o.picker.val)}</select>`)}</div>` : ''}
    <div class="mz-top"><div><small>${esc(o.totalLabel || 'Payable amount')}</small><b class="num">${money(o.total)}</b></div><div><small>${out ? 'Paid before' : 'Received before'}</small><b class="num">${money(o.before)}</b></div><div class="${left ? 'pend' : 'ok'}"><small>${left ? 'Pending now' : 'Pending'}</small><b class="num">${money(left)}</b></div></div>
    <div class="grid g2">
      ${fld(o.totalLabel || 'Payable amount', `<input id="mz-t" type="text" value="${String(money(o.total)).replace(/৳\s?/, 'BDT ')}" readonly aria-readonly="true">`, o.payableNote || '')}
      ${fld(out ? 'Paid amount (BDT)' : 'Received amount (BDT)', `<input id="mz-a" type="number" inputmode="decimal" min="1" max="${left}" step="1" placeholder="0" ${left ? '' : 'disabled'} oninput="MZ.calc()">`)}
      ${fld(out ? 'Payment date' : 'Date received', SCH.dateIn ? SCH.dateIn('mz-dt', TODAY, { max: TODAY }) : `<input id="mz-dt" type="date" value="${TODAY}" max="${TODAY}">`)}
      ${fld(out ? 'Payment method (paid from)' : 'Payment method (received into)', `<select id="mz-ac" onchange="MZ.calc()">${opts(ACCOUNTS.map(a => [a.id, a.name + ' · ' + money(balance(a.id))]), o.acct && String(o.acct).startsWith('ACC') ? o.acct : 'ACC-BANK')}</select>`)}
    </div>
    <button type="button" class="mz-full" id="mz-f" aria-pressed="false" onclick="MZ.full()" ${left ? '' : 'disabled'}>${ic('check')}<span>${out ? 'Paid in full' : 'Received in full'} · ${money(left)}</span></button>
    ${o.extra || ''}
    <div class="mz-n">${fld(out ? 'Payment note' : 'Note', '<textarea id="mz-nt" rows="3" placeholder="optional"></textarea>')}</div>
    <div id="mz-r" aria-live="polite"></div>
    <div class="acts"><button class="btn" type="button" onclick="${o.back || 'closeSheet()'}">${o.back ? 'Back' : 'Cancel'}</button><button class="btn p" type="button" id="mz-go" onclick="MZ.go()" ${left ? '' : 'disabled'}>${ic('check')}Save Payment</button></div></div>`);
  MZ.calc(); setTimeout(() => { const a = $('#mz-a'); if (a && !a.disabled) a.focus(); }, 40);
};
MZ.full = () => { const o = MZ.D; if (!o) return; const a = $('#mz-a'); a.value = Math.max(0, o.total - o.before); MZ.calc(); };
MZ.calc = () => {
  const o = MZ.D, r = $('#mz-r'); if (!o || !r) return;
  const left = Math.max(0, o.total - o.before), a = Math.max(0, Math.round(+($('#mz-a') || {}).value || 0)), acct = ($('#mz-ac') || {}).value, now = Math.min(a, left), after = left - now;
  const f = $('#mz-f'); if (f) { const on = left > 0 && a === left; f.classList.toggle('on', on); f.setAttribute('aria-pressed', on); }
  const [sl, st] = MZ.st(o.total, o.before + now), warn = a > left ? `Only ${money(left)} is pending. Enter ${money(left)} or less.` : (o.dir !== 'in' && acct && a > balance(acct)) ? `${accName(acct)} has only ${money(balance(acct))}.` : '';
  r.innerHTML = `<div class="mz-res"><div><small>${o.dir !== 'in' ? 'Paying now' : 'Receiving now'}</small><b class="num">${money(now)}</b></div><div class="${after ? 'pend' : 'ok'}"><small>${after ? 'Remaining · Pending' : 'Remaining'}</small><b class="num">${money(after)}</b></div><div><small>Status after saving</small><b class="mz-s ${st}">${sl}</b></div></div><div class="pf-bar" aria-hidden="true"><i style="width:${MZ.pct(o.before + now, o.total)}%"></i></div>${warn ? `<p class="v9-warn">${warn}</p>` : ''}`;
};
MZ.go = () => {
  const o = MZ.D; if (!o) return;
  if (!MZ.canPay(o.kind)) { toast('You do not have permission to record this payment'); return; }
  const left = Math.max(0, o.total - o.before), a = Math.round(+$('#mz-a').value || 0), acct = $('#mz-ac').value, date = $('#mz-dt').value || TODAY, note = ($('#mz-nt').value || '').trim();
  if (!(a > 0)) { toast('Enter the paid amount'); $('#mz-a').focus(); return; }
  if (a > left) { toast('Only ' + money(left) + ' is pending'); return; }
  if (date > TODAY) { toast('The date cannot be in the future'); return; }
  if (o.dir !== 'in' && a > balance(acct)) { toast(accName(acct) + ' does not have ' + money(a)); return; }
  if (o.lockM && typeof locked === 'function' && locked(o.lockM) && ST.role !== 'Owner') { toast(mlab(o.lockM) + ' is locked. Owner approval needed.'); return; }
  o.save({ amt: a, acct, date, note, left: left - a });
};

/* ---------- 1. mentor payroll ---------- */
MZ.prOk = m => PAYROLL[m] && ['Approved', 'Partially Paid', 'Paid'].includes(PAYROLL[m].status);
MZ.prStatus = m => { const r = PAYROLL[m]; r.status = r.items.every(i => i.net - prPaid(m, i.mentor) <= 0) ? 'Paid' : prPaid(m) > 0 ? 'Partially Paid' : 'Approved'; };
MZ.prDlg = (m, men, back) => {
  if (!MZ.prOk(m)) { toast(mlab(m) + ' payroll is not approved yet'); return; }
  const it = PAYROLL[m].items.find(i => i.mentor === men); if (!it) { toast('No payroll line for this mentor in ' + mlab(m)); return; }
  const open = PAYROLL[m].items.filter(i => i.net - prPaid(m, i.mentor) > 0 || i.mentor === men);
  MZ.dlg({ kind: 'salary', eyebrow: 'PAYMENT UPDATE · MENTOR', title: menName(men) + ' · ' + mlab(m), total: it.net, before: prPaid(m, men), dir: 'out', acct: 'ACC-BANK', back,
    totalLabel: 'Payable amount (net)', payableNote: 'Gross ' + money(it.gross) + (it.bonus ? ' + bonus ' + money(it.bonus) : '') + (it.deduct ? ' − deduction ' + money(it.deduct) : ''),
    picker: open.length > 1 ? { label: 'Mentor', opts: open.map(i => [i.mentor, menName(i.mentor) + ' · pending ' + money(Math.max(0, i.net - prPaid(m, i.mentor)))]), val: men, on: `MZ.prDlg('${m}',this.value${back ? `,${J(back)}` : ''})` } : null,
    extra: '<p class="v9-pt-n">This is cash out only. The salary was counted as an expense when payroll was approved, so it is not added again.</p>',
    save: r => {
      PRPAY.push({ id: 'PRP-' + String(PRPAY.length + 1).padStart(4, '0'), month: m, mentor: men, date: r.date, amt: r.amt, acct: r.acct, note: r.note });
      MZ.prStatus(m); MOVES = movements(); log('Mentor paid', menName(men) + ' · ' + mlab(m), money(r.amt) + ' · ' + accName(r.acct) + (r.left ? ' · ' + money(r.left) + ' pending' : ''));
      closeSheet(); render(); toast(r.left ? 'Saved · ' + money(r.left) + ' still pending' : 'Saved · ' + menName(men) + ' fully paid for ' + mlab(m));
    } });
};
MZ._prPayForm = prPayForm;
prPayForm = function () {
  if (!MZ.on()) return MZ._prPayForm.apply(this, arguments);
  const m = ST.prM, r = PAYROLL[m], o = r && r.items.find(i => i.net - prPaid(m, i.mentor) > 0);
  if (!o) { toast('Everyone is paid for ' + mlab(m)); return; }
  MZ.prDlg(m, o.mentor);
};
/* payroll table: one Paid / Pending column and an Update button per mentor */
MZ.withTable = (fn, edit) => { const T = table; table = function (cols, rows, o) { const x = edit(cols, rows, o || {}); return T(x[0], x[1], x[2]); }; try { return fn(); } finally { table = T; } };
MZ._payroll = PAGES.payroll;
PAGES.payroll = function () {
  if (!MZ.on()) return MZ._payroll.apply(this, arguments);
  const m = ST.prM, can = MZ.canPay('salary') && MZ.prOk(m);
  let done = false;
  return MZ.withTable(() => MZ._payroll.apply(this, arguments), (cols, rows, o) => {
    if (done || !rows.length || !rows[0] || rows[0].net == null || !rows[0].lines) return [cols, rows, o];
    done = true;
    const c = cols.filter(x => x.h !== 'Paid' && x.h !== 'Outstanding');
    c.push({ h: 'Paid / Pending', c: 'mz-td', f: i => MZ.cell(i.net, prPaid(m, i.mentor)) });
    if (can) c.push({ h: '', c: 'act', f: i => i.net - prPaid(m, i.mentor) > 0 ? `<button class="btn s p" type="button" onclick="event.stopPropagation();MZ.prDlg('${m}',${J(i.mentor)})">${ic('edit')}Update</button>` : `<span class="mz-s ok">Paid</span>` });
    let foot = o.foot; if (foot) { const tn = sum(rows, i => i.net), tp = sum(rows, i => prPaid(m, i.mentor)); foot = foot.slice(0, foot.length - 2).concat([`<b class="num">${money(tp)}</b> <small class="sub">of ${money(tn)} · ${money(tn - tp)} pending</small>`]); if (can) foot.push(''); }
    return [c, rows, Object.assign({}, o, { foot })];
  });
};
/* the mentor's payroll sheet gets the same box */
MZ._prItem = prItem;
prItem = function (m, men) {
  MZ._prItem.apply(this, arguments);
  if (!MZ.on()) return;
  const it = PAYROLL[m] && PAYROLL[m].items.find(x => x.mentor === men), kv = document.querySelector('#sheet .kv'); if (!it || !kv) return;
  const paid = prPaid(m, men), pend = Math.max(0, it.net - paid);
  kv.insertAdjacentHTML('afterend', `<div class="mz-top mz-in"><div><small>Payable (net)</small><b class="num">${money(it.net)}</b></div><div><small>Paid</small><b class="num">${money(paid)}</b></div><div class="${pend ? 'pend' : 'ok'}"><small>${pend ? 'Pending' : 'Pending'}</small><b class="num">${money(pend)}</b></div></div>${pend && MZ.canPay('salary') && MZ.prOk(m) ? `<div class="acts" style="margin-top:10px"><button class="btn p" type="button" onclick="MZ.prDlg('${m}',${J(men)},${J(`prItem('${m}',${J(men)})`)})">${ic('edit')}Update payment</button></div>` : ''}`);
};

/* ---------- 1b. salary list ---------- */
MZ.salLines = () => { const L = []; Object.keys(PAYROLL).sort().reverse().forEach(m => { if (!MZ.prOk(m)) return; PAYROLL[m].items.forEach(i => { const p = prPaid(m, i.mentor); if (i.net - p > 0) L.push({ m, men: i.mentor, net: i.net, paid: p }); }); }); return L; };
MZ._sal = PAGES['mn-salary'];
PAGES['mn-salary'] = function () {
  MZ._sal.apply(this, arguments);
  if (!MZ.on()) return;
  const pg = document.querySelector('#view .page'), kp = pg && pg.querySelector('.kpis'); if (!kp) return;
  const L = MZ.salLines().filter(x => !SCH.SL || SCH.SL.men === 'All' || x.men === SCH.SL.men), can = MZ.canPay('salary');
  kp.insertAdjacentHTML('afterend', `<div class="card mz-card"><div class="ch"><div><h2>Pending salaries</h2><p>${L.length ? dg(L.length) + ' mentor-month' + (L.length === 1 ? '' : 's') + ' not fully paid · ' + money(sum(L, x => x.net - x.paid)) + ' pending' : 'Every approved month is fully paid'}</p></div></div>
    ${L.length ? `<div class="mz-list">${L.map(x => `<div class="mz-row"><div class="mz-w"><b>${esc(menName(x.men))}</b><small>${mlab(x.m)} · ${esc(PAYROLL[x.m].status)}</small></div>${MZ.cell(x.net, x.paid)}${can ? `<button class="btn s p" type="button" onclick="MZ.prDlg('${x.m}',${J(x.men)})">${ic('edit')}Update</button>` : ''}</div>`).join('')}</div>` : SCH.empty ? SCH.empty('Nothing pending.') : ''}</div>`);
};
MZ._salForm = SCH.salForm;
SCH.salForm = id => {
  if (!MZ.on() || id) return MZ._salForm(id);          /* editing an existing payment keeps its own form (with the reason box) */
  const L = MZ.salLines(), pref = SCH.SL && SCH.SL.men !== 'All' ? L.find(x => x.men === SCH.SL.men) : null, x = pref || L[0];
  if (!x) { toast('Every approved month is fully paid'); return; }
  MZ.prDlg(x.m, x.men);
};

/* ---------- 2. expenses ---------- */
MZ.expPays = e => (e.v9pays || []);
MZ.expDlg = (id, back) => {
  const e = EXPENSES.find(x => x.id === id); if (!e) return;
  if (e.acct === 'FUND-QIT') { toast('Paid from the QIT fund. Repay it under Loans & Others.'); return; }
  MZ.dlg({ kind: 'expense', eyebrow: 'PAYMENT UPDATE · EXPENSE', title: e.payee + ' · ' + e.cat, total: e.amt, before: e.paid, dir: 'out', acct: e.acct, lockM: e.month, back,
    payableNote: mlab(e.month) + ' · ' + e.id,
    save: r => {
      (e.v9pays = e.v9pays || []).push({ date: r.date, amt: r.amt, acct: r.acct, by: ME().name, note: r.note }); e.paid += r.amt;
      MOVES = movements(); log('Expense paid', e.cat + ' · ' + e.payee, money(r.amt) + ' · ' + accName(r.acct) + (r.left ? ' · ' + money(r.left) + ' pending' : ''));
      render(); expView(id); toast(r.left ? 'Saved · ' + money(r.left) + ' still pending' : 'Saved · expense fully paid');
    } });
};
if (window.V9) { MZ._v9exp = V9.expPayForm; V9.expPayForm = id => MZ.on() ? MZ.expDlg(id, `expView('${id}')`) : MZ._v9exp(id); }
MZ._expList = expList;
expList = function () {
  if (!MZ.on()) return MZ._expList.apply(this, arguments);
  const can = MZ.canPay('expense');
  return MZ.withTable(() => MZ._expList.apply(this, arguments), (cols, rows, o) => {
    const c = cols.filter(x => x.h !== 'Amount' && x.h !== 'Unpaid');
    const at = c.findIndex(x => x.h === 'Entered by');
    const add = [{ h: 'Total / Paid / Pending', c: 'mz-td', f: e => e.amt > 0 ? MZ.cell(e.amt, e.paid) : '—' }];
    if (can) add.push({ h: '', c: 'act', f: e => e.amt - e.paid > 0 && e.acct !== 'FUND-QIT' ? `<button class="btn s p" type="button" onclick="event.stopPropagation();MZ.expDlg(${J(e.id)})">${ic('edit')}Update</button>` : '' });
    c.splice(at < 0 ? c.length : at, 0, ...add);
    return [c, rows, o];
  });
};

/* ---------- 3. loans & others (+ vendor dues on the same page) ---------- */
MZ.othDone = o => { if (o.dir === 'Payable') o.done = sum(o.txns.filter(t => t.kind === 'out'), t => t.amt); else if (o.dir === 'Receivable') o.done = sum(o.txns.filter(t => t.kind === 'in'), t => t.amt); else o.done = 0; };
MZ.othDlg = id => {
  const o = OTHERS.find(x => x.id === id); if (!o || o.dir === 'Equity') return;
  MZ.othDone(o); const pay = o.dir === 'Payable';
  MZ.dlg({ kind: 'loan', eyebrow: pay ? 'PAYMENT UPDATE · FTA PAYS BACK' : 'PAYMENT UPDATE · FTA RECEIVES', title: o.party, total: o.orig, before: o.done, dir: pay ? 'out' : 'in', acct: (o.txns[o.txns.length - 1] || {}).acct,
    totalLabel: pay ? 'Total to repay' : 'Total to receive', payableNote: o.type + ' · ' + o.id + (o.due ? ' · due ' + fdate(o.due) : ''),
    save: r => {
      o.txns.push({ date: r.date, amt: r.amt, acct: r.acct, kind: pay ? 'out' : 'in', note: r.note || (pay ? 'Repayment' : 'Installment received'), by: ME().name });
      MZ.othDone(o); MOVES = movements(); log(pay ? 'Repaid' : 'Received', o.party + ' · ' + o.id, money(r.amt) + ' · ' + accName(r.acct) + (r.left ? ' · ' + money(r.left) + ' pending' : ''));
      closeSheet(); render(); toast(r.left ? 'Saved · ' + money(r.left) + ' still pending' : 'Saved · fully settled');
    } });
};
MZ._loans = PAGES.loans;
PAGES.loans = function () {
  if (!MZ.on()) return MZ._loans.apply(this, arguments);
  OTHERS.forEach(MZ.othDone);
  const canL = MZ.canPay('loan'), canE = MZ.canPay('expense');
  const r = MZ.withTable(() => MZ._loans.apply(this, arguments), (cols, rows, o) => {
    if (!rows.length) return [cols, rows, o];
    const x = rows[0];
    if (x.txns && x.party) {            /* the loans & others table */
      const c = cols.filter(k => !['Received / repaid', 'Outstanding'].includes(k.h));
      const at = c.findIndex(k => k.h === 'Original');
      c.splice(at + 1, 0, { h: 'Paid / Pending', c: 'mz-td', f: q => q.dir === 'Equity' ? '<span class="sub">Not repaid · equity</span>' : MZ.cell(q.orig, q.done) });
      if (at > -1) c[at] = Object.assign({}, c[at], { h: 'Total' });
      if (canL) c.push({ h: '', c: 'act', f: q => q.dir !== 'Equity' && q.orig - q.done > 0 ? `<button class="btn s p" type="button" onclick="event.stopPropagation();MZ.othDlg(${J(q.id)})">${ic('edit')}Update</button>` : '' });
      return [c, rows, Object.assign({}, o, { click: q => q.dir === 'Equity' ? '' : `MZ.othView(${J(q.id)})` })];
    }
    if (x.payee && x.cat && x.amt != null) {  /* vendor & staff due */
      const c = cols.filter(k => !['Amount', 'Paid', 'Outstanding'].includes(k.h));
      c.push({ h: 'Total / Paid / Pending', c: 'mz-td', f: e => MZ.cell(e.amt, e.paid) });
      if (canE) c.push({ h: '', c: 'act', f: e => e.acct !== 'FUND-QIT' ? `<button class="btn s p" type="button" onclick="event.stopPropagation();MZ.expDlg(${J(e.id)})">${ic('edit')}Update</button>` : '' });
      return [c, rows, o];
    }
    return [cols, rows, o];
  });
  /* the demo-only "new entry" button becomes a real form */
  const b = [...document.querySelectorAll('#view .page button')].find(x => /toast\('Demo: নতুন loan/.test(x.getAttribute('onclick') || ''));
  if (b) { if (canL) b.setAttribute('onclick', 'MZ.othNew()'); else b.remove(); }
  return r;
};
MZ.othView = id => {
  if (!MZ.staff()) return;
  const o = OTHERS.find(x => x.id === id); if (!o) return; MZ.othDone(o);
  const pend = Math.max(0, o.orig - o.done), pay = o.dir === 'Payable';
  sheet(o.type.toUpperCase() + ' · ' + o.id, esc(o.party), `<div class="mz-top mz-in"><div><small>${pay ? 'Total to repay' : 'Total to receive'}</small><b class="num">${money(o.orig)}</b></div><div><small>${pay ? 'Repaid' : 'Received'}</small><b class="num">${money(o.done)}</b></div><div class="${pend ? 'pend' : 'ok'}"><small>Pending</small><b class="num">${money(pend)}</b></div></div><div class="pf-bar" aria-hidden="true"><i style="width:${MZ.pct(o.done, o.orig)}%"></i></div>
    <div class="kv" style="margin-top:12px"><div><small>Direction</small><span>${pay ? 'FTA pays (payable)' : 'FTA receives (receivable)'}</span></div><div><small>Date</small><span>${fdate(o.date)}</span></div><div><small>Due date</small><span>${o.due ? fdate(o.due) : '—'}</span></div><div><small>Reference</small><span>${esc(o.ref || '—')}</span></div></div>
    <div class="v9-hist"><b>Money moved</b>${o.txns.map(t => `<span>${fdate(t.date)} · ${t.kind === 'in' ? 'In to' : 'Out of'} ${esc(accName(t.acct))}${t.note ? ' · ' + esc(t.note) : ''} <b class="num">${money(t.amt)}</b></span>`).join('') || '<span>Nothing yet</span>'}</div>
    <div class="acts">${pend && MZ.canPay('loan') ? `<button class="btn p" type="button" onclick="MZ.othDlg(${J(id)})">${ic('edit')}Update payment</button>` : ''}</div>`);
};
MZ.OTYPES = [['Borrowed funds', 'Payable', 'in', 'FTA borrowed money · it comes in now, FTA pays it back'], ['Other payable', 'Payable', '', 'FTA owes someone (no money moves now)'], ['Loan given', 'Receivable', 'out', 'FTA lends money · it goes out now, FTA gets it back'], ['Staff advance', 'Receivable', 'out', 'Advance to staff · goes out now, comes back from salary'], ['Other receivable', 'Receivable', '', 'Someone owes FTA (no money moves now)']];
MZ.othNew = () => {
  if (!MZ.canPay('loan')) { toast('You do not have permission to add this'); return; }
  sheet('NEW ENTRY · LOANS & OTHERS', 'Add a payable or receivable', `<div class="grid g2">${fld('Type', `<select id="on-t" onchange="MZ.othNewCalc()">${opts(MZ.OTYPES.map(x => [x[0], x[0] + ' · ' + x[1]]))}</select>`)}${fld('Party (person or company)', '<input id="on-p" placeholder="e.g. Rahim Printing">')}${fld('Total amount', '<input id="on-a" type="number" min="1" step="1" placeholder="0" oninput="MZ.othNewCalc()">')}${fld('Already paid / received back', '<input id="on-d" type="number" min="0" step="1" placeholder="0" oninput="MZ.othNewCalc()">', 'Leave 0 if nothing has been settled yet')}${fld('Date', SCH.dateIn ? SCH.dateIn('on-dt', TODAY, { max: TODAY }) : `<input id="on-dt" type="date" value="${TODAY}">`)}${fld('Due date', SCH.dateIn ? SCH.dateIn('on-du', '') : '<input id="on-du" type="date">')}${fld('Account', `<select id="on-c">${opts(ACCOUNTS.map(a => [a.id, a.name + ' · ' + money(balance(a.id))]), 'ACC-BANK')}</select>`)}${fld('Reference', '<input id="on-r" placeholder="optional">')}</div>
    <div style="margin-top:10px">${fld('Note', '<input id="on-n" placeholder="optional">')}</div><div id="on-x"></div>
    <div class="acts"><button class="btn" type="button" onclick="closeSheet()">Cancel</button><button class="btn p" type="button" onclick="MZ.othNewSave()">${ic('check')}Save</button></div>`);
  MZ.othNewCalc();
};
MZ.othNewCalc = () => {
  const t = MZ.OTYPES.find(x => x[0] === ($('#on-t') || {}).value) || MZ.OTYPES[0], a = Math.max(0, +($('#on-a') || {}).value || 0), d = Math.min(a, Math.max(0, +($('#on-d') || {}).value || 0)), pend = a - d, box = $('#on-x'); if (!box) return;
  box.innerHTML = `<p class="v9-pt-n">${esc(t[3])}.</p>${a ? `<div class="mz-res"><div><small>Total</small><b class="num">${money(a)}</b></div><div><small>${t[1] === 'Payable' ? 'Repaid' : 'Received back'}</small><b class="num">${money(d)}</b></div><div class="${pend ? 'pend' : 'ok'}"><small>Pending</small><b class="num">${money(pend)}</b></div></div>` : ''}`;
};
MZ.othNewSave = () => {
  if (!MZ.canPay('loan')) { toast('You do not have permission to add this'); return; }
  const t = MZ.OTYPES.find(x => x[0] === $('#on-t').value), party = $('#on-p').value.trim(), a = Math.round(+$('#on-a').value || 0), d = Math.round(+$('#on-d').value || 0), acct = $('#on-c').value, date = $('#on-dt').value || TODAY;
  if (!party) { toast('Write who it is with'); return; } if (!(a > 0)) { toast('Enter the total amount'); return; } if (d > a) { toast('Already settled cannot be more than the total'); return; }
  const needOut = (t[2] === 'out' ? a : 0) + (t[1] === 'Payable' ? d : 0), needIn = (t[2] === 'in' ? a : 0) + (t[1] === 'Receivable' ? d : 0);
  if (needOut > balance(acct) + needIn) { toast(accName(acct) + ' does not have ' + money(needOut - needIn)); return; }
  const txns = [];
  if (t[2] === 'in') txns.push({ date, amt: a, acct, kind: 'in', note: 'Borrowed' });
  if (t[2] === 'out') txns.push({ date, amt: a, acct, kind: 'out', note: t[0] });
  if (d > 0) txns.push({ date, amt: d, acct, kind: t[1] === 'Payable' ? 'out' : 'in', note: t[1] === 'Payable' ? 'Repaid' : 'Received back' });
  const o = { id: 'OTH-' + String(OTHERS.length + 1).padStart(4, '0'), type: t[0], dir: t[1], party, date, orig: a, due: $('#on-du').value || '', ref: $('#on-r').value.trim(), note: $('#on-n').value.trim(), txns };
  OTHERS.push(o); MZ.othDone(o); MOVES = movements(); log('Loans & others entry', o.type + ' · ' + party, money(a) + (a - o.done ? ' · ' + money(a - o.done) + ' pending' : ''));
  closeSheet(); render(); toast('Saved · ' + money(a - o.done) + ' pending');
};

/* ---------- 4. refund from a student's advance: what can be refunded, what is left ---------- */
MZ._rev = typeof reverseAsk === 'function' ? reverseAsk : null;
if (MZ._rev) reverseAsk = function (id) {
  MZ._rev.apply(this, arguments);
  if (!MZ.on()) return;
  const p = PAYMENTS.find(x => x.id === id), a = $('#rf-a'); if (!p || !a) return;
  const adv = Math.max(0, studentAdvance(p.stu)), box = document.createElement('div'); a.closest('.grid').after(box);
  const draw = () => { const v = Math.max(0, +a.value || 0), left = Math.max(0, adv - v); box.innerHTML = `<div class="mz-res" style="margin-top:12px"><div><small>Advance that can be refunded</small><b class="num">${money(adv)}</b></div><div><small>Refunding now</small><b class="num">${money(Math.min(v, adv))}</b></div><div class="${left ? 'pend' : 'ok'}"><small>Advance left</small><b class="num">${money(left)}</b></div></div>${v > adv ? `<p class="v9-warn">Only ${money(adv)} is held as advance. Refunding more first needs the money taken off its invoices.</p>` : ''}`; };
  a.addEventListener('input', draw); draw();
};

/* ---------- 5. the teacher's own pay: Payable / Paid / Pending (own lines only) ---------- */
MZ.myPay = mid => (ST.role === 'Mentor' || ST.role === 'Student') && (!SCH.mentor || mid !== SCH.mentor()) ? [] : Object.keys(PAYROLL).sort().reverse().map(m => { const it = PAYROLL[m].items.find(i => i.mentor === mid); return it ? { m, net: it.net, paid: prPaid(m, mid), st: PAYROLL[m].status } : null; }).filter(Boolean);
MZ.myPayCard = mid => {
  const L = MZ.myPay(mid); if (!L.length) return '';
  const tn = sum(L, x => x.net), tp = sum(L, x => x.paid);
  return `<div class="card mz-card mz-my"><div class="ch"><div><h2>My pay</h2><p>What the academy owes you each month · Payable, Paid and Pending</p></div><button class="cc-link" type="button" onclick="go('mystatement')">Statement →</button></div>
    <div class="mz-top mz-in"><div><small>Payable (all months)</small><b class="num">${money(tn)}</b></div><div><small>Paid to you</small><b class="num">${money(tp)}</b></div><div class="${tn - tp ? 'pend' : 'ok'}"><small>Pending</small><b class="num">${money(tn - tp)}</b></div></div>
    <div class="mz-list">${L.slice(0, 4).map(x => `<div class="mz-row"><div class="mz-w"><b>${mlab(x.m)}</b><small>${esc(x.st)}</small></div>${MZ.cell(x.net, x.paid)}</div>`).join('')}</div></div>`;
};
if (window.V8 && V8.myShare) {
  MZ._myShare = V8.myShare;
  V8.myShare = function () { const h = MZ._myShare.apply(this, arguments); if (!MZ.on() || ST.role !== 'Mentor') return h; const mid = SCH.mentor && SCH.mentor(); return h + (mid ? MZ.myPayCard(mid) : ''); };
}
/* My Statement (teacher): Payable and one Paid / Pending column per month */
MZ._myst = PAGES.mystatement;
PAGES.mystatement = function () {
  if (!MZ.on()) return MZ._myst.apply(this, arguments);
  const id = ME().mentor;
  return MZ.withTable(() => MZ._myst.apply(this, arguments), (cols, rows, o) => {
    if (!rows.length || typeof rows[0] !== 'string' || !/^\d{4}-\d{2}$/.test(rows[0])) return [cols, rows, o];
    const it = mm => PAYROLL[mm].items.find(i => i.mentor === id) || { net: 0 };
    return [[cols[0], { h: 'Payable', r: 1, f: mm => money(it(mm).net) }, { h: 'Paid / Pending', c: 'mz-td', f: mm => MZ.cell(it(mm).net, prPaid(mm, id)) }], rows, o];
  });
};
