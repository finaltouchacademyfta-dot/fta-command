/* =====================================================================
   v9 · owner review of v8 (28 Oct 2026)
   1. Every plain month dropdown becomes the premium month/year picker
      (any year SCH.Y0–SCH.Y1, any month), the old <select> stays hidden
      and still drives the page through its own onchange.
   2. Payment form: each open month shows Total fee, Paid before,
      "Paying now" (type it) and Remaining (auto, shown as Pending).
      Mentor payment shows the same Total / Paid / Paying now / Remaining.
   New skins only; old skins keep the original behaviour.
   ===================================================================== */
const V9 = window.V9 = {};

/* ---------- 1. month selects → picker ---------- */
V9.isMonthSel = s => { const v = [...s.options].map(o => o.value); const m = v.filter(x => /^\d{4}-\d{2}$/.test(x)); return m.length > 0 && v.every(x => /^\d{4}-\d{2}$/.test(x) || x === 'All' || x === ''); };
V9.n = 0;
V9.enhance = root => {
  if (!SCH.NEW() || !window.V8 || !V8.mpBtn) return;
  (root || document).querySelectorAll('select:not([data-v9])').forEach(s => {
    if (s.closest('#v8-pop') || !V9.isMonthSel(s)) return;
    s.dataset.v9 = 1;
    const key = 'v9m' + (++V9.n), vals = [...s.options].map(o => o.value), all = vals.includes('All') ? 'All' : vals.includes('') ? '' : null;
    const lab = s.closest('.fld, label, .field') && (s.closest('.fld, label, .field').querySelector('label, b, span, small') || {}).textContent;
    const set = v => {
      if (![...s.options].some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; o.textContent = V8.mLab(v); s.appendChild(o); }
      s.value = v; s.dispatchEvent(new Event('change', { bubbles: true }));
    };
    V8.MP[key] = { sel: s.value && s.value !== 'All' ? [s.value] : [], single: true, allowAll: all !== null, empty: 'All months', title: (lab || 'Month').trim().slice(0, 24) || 'Month', data: vals.filter(x => /^\d{4}-\d{2}$/.test(x)),
      apply: sel => set(sel[0] || all || CUR) };
    s.classList.add('v9-hid'); s.setAttribute('aria-hidden', 'true'); s.tabIndex = -1;
    s.insertAdjacentHTML('afterend', V8.mpBtn(key));
    const bt = s.nextElementSibling && s.nextElementSibling.querySelector('.v8-mp-t b'), v = s.value;
    if (bt) bt.textContent = /^\d{4}-\d{2}$/.test(v) ? V8.mLab(v, 1) : 'All months';   /* short label fits narrow filter boxes */
  });
};
/* single mode has no "All" choice: add it where the old dropdown had one */
V9._mpDraw = V8.mpDraw;
V8.mpDraw = key => {
  V9._mpDraw(key);
  const S = V8.MP[key], pre = document.querySelector('#v8-pop .v8-pre');
  if (S && S.single && S.allowAll && pre && !pre.querySelector('.v9-all')) pre.insertAdjacentHTML('afterbegin', `<button type="button" class="v9-all ${S.sel.length ? '' : 'on'}" onclick="V8.MP['${key}'].draft=[];V8.mpApply('${key}')">All months</button>`);
  const pop = document.getElementById('v8-pop'), ys = pop && pop.querySelector('.v8-yn select');
  if (ys && !ys.dataset.v9) ys.dataset.v9 = 1;     /* the year list is not a month list; leave it as it is */
};
V9.mo = new MutationObserver(() => { cancelAnimationFrame(V9.raf); V9.raf = requestAnimationFrame(() => V9.enhance()); });
V9.mo.observe(document.body, { childList: true, subtree: true });

/* ---------- 2. payment form: paying now per month ---------- */
V9.pfOpen = () => liveInv().filter(i => i.stu === PF.stu && invDue(i) > 0).sort((a, b) => a.month < b.month ? -1 : 1);
V9._payFormDraw = payFormDraw;
payFormDraw = function () {
  if (typeof PF !== 'undefined' && PF) { PF.manual = false; PF.adv = 0; }
  const r = V9._payFormDraw.apply(this, arguments);
  /* new skins: start at zero so nothing is saved by accident — type each month, or tap Full / Full due */
  if (SCH.NEW() && PF && !PF.keep) { PF.amt = 0; PF.alloc = {}; const a = document.getElementById('pf-a'); if (a) { a.value = ''; a.placeholder = 'Total received'; } payAllocDraw(); }
  return r;
};
V9._pfSet = SCH.pfSet;
SCH.pfSet = v => { PF.manual = false; PF.adv = 0; V9._pfSet(v); };
V9._payAllocDraw = payAllocDraw;
payAllocDraw = function () {
  if (!SCH.NEW()) return V9._payAllocDraw.apply(this, arguments);
  const a = document.activeElement; if (a && a.id === 'pf-a') { PF.manual = false; PF.adv = 0; }
  if (!PF.manual) { V9._payAllocDraw.apply(this, arguments); const open = V9.pfOpen(), al = open.reduce((x, i) => x + (PF.alloc[i.id] || 0), 0); PF.adv = Math.max(0, PF.amt - al); }
  V9.pfTable();
};
V9.pfTable = () => {
  const box = document.getElementById('pf-al'); if (!box) return;
  const open = V9.pfOpen();
  if (!open.length) { box.innerHTML = `<div class="v9-pt-empty">No open month for this student. Anything received is kept as advance for the next months.</div>` + V9.advRow(); V9.pfSum(); return; }
  box.innerHTML = `<div class="v9-pt" role="table" aria-label="Fees for each month">
    <div class="v9-pr h" role="row"><span role="columnheader">Month</span><span role="columnheader">Total fee</span><span role="columnheader">Paid before</span><span role="columnheader">Paying now</span><span role="columnheader">Remaining</span></div>
    ${open.map(i => { const net = invNet(i), before = invPaid(i), due = invDue(i), now = PF.alloc[i.id] || 0; return `<div class="v9-pr" role="row" data-inv="${i.id}">
      <span role="cell" class="m"><b>${mlab(i.month)}</b><small>${esc(i.id)}</small></span>
      <span role="cell" class="num" data-l="Total fee">${money(net)}</span>
      <span role="cell" class="num" data-l="Paid before">${money(before)}</span>
      <span role="cell" data-l="Paying now"><span class="v9-in"><i>BDT</i><input type="number" inputmode="decimal" min="0" max="${due}" step="1" value="${now || ''}" placeholder="0" aria-label="Paying now for ${esc(mlab(i.month))}, up to ${esc(money(due))}" oninput="V9.pfRow('${i.id}',this)"><button type="button" class="v9-full" onclick="V9.pfFull('${i.id}')" data-tip="Pay the whole remaining ${esc(money(due))}">Full</button></span></span>
      <span role="cell" class="r" data-l="Remaining" data-rem="${i.id}"></span></div>`; }).join('')}
    <div class="v9-pr f" role="row"><span role="cell"><b>Total</b></span><span role="cell" class="num" data-l="Total fee">${money(open.reduce((x, i) => x + invNet(i), 0))}</span><span role="cell" class="num" data-l="Paid before">${money(open.reduce((x, i) => x + invPaid(i), 0))}</span><span role="cell" class="num" data-l="Paying now" id="v9-tnow"></span><span role="cell" class="num" data-l="Remaining" id="v9-trem"></span></div>
  </div>${V9.advRow()}<p class="v9-pt-n">Type what the guardian paid for each month. Whatever is left stays <b>Pending</b> as due on that month. Typing in <b>Amount (BDT)</b> above fills the oldest month first.</p>`;
  V9.pfCells();
};
V9.advRow = () => `<div class="v9-adv"><label for="v9-adv"><b>Advance</b><small>Extra kept for the next months</small></label><span class="v9-in"><i>BDT</i><input id="v9-adv" type="number" min="0" step="1" value="${PF.adv || ''}" placeholder="0" oninput="V9.pfAdv(this)"></span></div>`;
V9.pfCells = () => {
  const open = V9.pfOpen(); let tn = 0, tr = 0;
  open.forEach(i => { const due = invDue(i), now = Math.min(due, PF.alloc[i.id] || 0), rem = due - now; tn += now; tr += rem; const c = document.querySelector(`[data-rem="${i.id}"]`); if (c) c.innerHTML = rem <= 0 ? `<span class="v9-st ok">${ic('check')}Paid</span><b class="num">BDT 0</b>` : `<span class="v9-st ${now > 0 ? 'warn' : 'bad'}">${now > 0 ? 'Part paid' : 'Unpaid'} · Pending</span><b class="num">${money(rem)}</b>`; });
  const a = document.getElementById('v9-tnow'), b = document.getElementById('v9-trem'); if (a) a.textContent = money(tn); if (b) b.textContent = money(tr);
  V9.pfSum();
};
V9.pfSync = () => { const open = V9.pfOpen(); PF.amt = open.reduce((x, i) => x + (PF.alloc[i.id] || 0), 0) + (PF.adv || 0); const t = document.getElementById('pf-a'); if (t) t.value = PF.amt || ''; V9.pfCells(); };
V9.pfRow = (id, el) => { const i = INVOICES.find(x => x.id === id), due = invDue(i); let v = Math.max(0, Math.round(+el.value || 0)); if (v > due) { v = due; el.value = due; toast('Only ' + money(due) + ' is left on ' + mlab(i.month) + '. Put any extra in Advance.'); } PF.manual = true; PF.alloc[id] = v; V9.pfSync(); };
V9.pfFull = id => { const i = INVOICES.find(x => x.id === id); PF.manual = true; PF.alloc[id] = invDue(i); const el = document.querySelector(`[data-inv="${id}"] input`); if (el) el.value = invDue(i); V9.pfSync(); };
V9.pfAdv = el => { PF.manual = true; PF.adv = Math.max(0, Math.round(+el.value || 0)); V9.pfSync(); };
/* the summary boxes above the table (Paid in full / Part paid / Still unpaid) follow the typed amounts */
V9.pfSum = () => {
  const s = document.getElementById('pf-sum'); if (!s) return;
  const open = V9.pfOpen(), due = open.reduce((a, i) => a + invDue(i), 0); let full = 0, part = 0, none = 0, now = 0;
  open.forEach(i => { const a = Math.min(invDue(i), PF.alloc[i.id] || 0); now += a; if (a >= invDue(i)) full++; else if (a > 0) part++; else none++; });
  s.innerHTML = `<div class="pf-s3"><div class="ok"><b>${dg(full)}</b><small>Paid in full</small></div><div class="warn"><b>${dg(part)}</b><small>Part paid</small></div><div class="bad"><b>${dg(none)}</b><small>Still unpaid</small></div></div>
    <div class="pf-bar" aria-hidden="true"><i style="width:${due ? Math.min(100, now / due * 100).toFixed(1) : 0}%"></i></div>
    <div class="pf-line"><span>Total due <b class="num">${money(due)}</b></span><span>Paying now <b class="num">${money(now)}</b></span><span>Pending after this <b class="num">${money(due - now)}</b></span>${PF.adv ? `<span>Advance <b class="num">${money(PF.adv)}</b></span>` : ''}</div>`;
  document.querySelectorAll('.pf-qb').forEach(b => { const m = (b.getAttribute('onclick') || '').match(/pfSet\((\d+)\)/); b.classList.toggle('on', !PF.manual && !!m && +m[1] === PF.amt && PF.amt > 0); });
};
/* saving uses PF.alloc as typed; make sure the amount matches the rows before the existing save runs */
V9._savePay = savePay;
savePay = function () { if (SCH.NEW() && PF && PF.manual) V9.pfSync(); return V9._savePay.apply(this, arguments); };
if (SCH.savePending) { V9._savePending = SCH.savePending; SCH.savePending = () => { if (PF && PF.manual) V9.pfSync(); V9._savePending(); }; }

/* ---------- 2b. mentor payment: total / paid / paying now / remaining ---------- */
V9._prPayForm = prPayForm;
prPayForm = function () {
  V9._prPayForm.apply(this, arguments);
  if (!SCH.NEW()) return;
  const m = $('#pp-m'), a = $('#pp-a'); if (!m || !a) return;
  const box = document.createElement('div'); box.id = 'v9-pp'; a.closest('.grid').after(box);
  const draw = () => {
    const it = PAYROLL[ST.prM].items.find(i => i.mentor === m.value); if (!it) { box.innerHTML = ''; return; }
    const before = prPaid(ST.prM, it.mentor), left = it.net - before, now = Math.max(0, +a.value || 0), rem = Math.max(0, left - now);
    box.innerHTML = `<div class="v9-pp"><div><small>Total for ${esc(mlab(ST.prM))}</small><b class="num">${money(it.net)}</b></div><div><small>Paid before</small><b class="num">${money(before)}</b></div><div class="now"><small>Paying now</small><b class="num">${money(Math.min(now, left))}</b></div><div class="${rem ? 'pend' : 'ok'}"><small>${rem ? 'Remaining · Pending' : 'Remaining'}</small><b class="num">${money(rem)}</b></div></div>
      <div class="pf-bar" aria-hidden="true"><i style="width:${it.net ? Math.min(100, (before + Math.min(now, left)) / it.net * 100).toFixed(1) : 0}%"></i></div>
      ${now > left ? `<p class="v9-warn">That is more than the ${esc(money(left))} still owed to ${esc(menName(it.mentor))}.</p>` : ''}`;
  };
  m.addEventListener('change', () => setTimeout(draw)); a.addEventListener('input', draw); draw();
};

/* ---------- 2c. expenses: total / paid / remaining, and pay the rest later ---------- */
V9._expForm = expForm;
expForm = function () {
  V9._expForm.apply(this, arguments);
  if (!SCH.NEW()) return;
  const a = $('#xf-a'), p = $('#xf-pd'); if (!a || !p) return;
  p.placeholder = 'Blank = paid in full';
  const box = document.createElement('div'); box.id = 'v9-xf'; a.closest('.grid').after(box);
  const draw = () => {
    const t = Math.max(0, +a.value || 0), pd = p.value === '' ? t : Math.min(t, Math.max(0, +p.value || 0)), rem = t - pd;
    box.innerHTML = t ? `<div class="v9-pp"><div><small>Total</small><b class="num">${money(t)}</b></div><div class="now"><small>Paid now</small><b class="num">${money(pd)}</b></div><div class="${rem ? 'pend' : 'ok'}"><small>${rem ? 'Remaining · Pending' : 'Remaining'}</small><b class="num">${money(rem)}</b></div><div><small>Status</small><b>${rem ? (pd ? 'Part paid' : 'Unpaid') : 'Paid'}</b></div></div><div class="pf-bar" aria-hidden="true"><i style="width:${(pd / t * 100).toFixed(1)}%"></i></div>${rem ? '<p class="v9-pt-n">The remaining amount shows as unpaid on the Expenses page. Pay it later from the expense with <b>Record payment</b>.</p>' : ''}` : '';
  };
  a.addEventListener('input', draw); p.addEventListener('input', draw); draw();
};
V9._expView = expView;
expView = function (id) {
  V9._expView.apply(this, arguments);
  if (!SCH.NEW()) return;
  const e = EXPENSES.find(x => x.id === id), rem = e.amt - e.paid, acts = document.querySelector('#sheet .acts'); if (!acts) return;
  const kv = document.querySelector('#sheet .kv');
  if (kv) kv.insertAdjacentHTML('afterend', `<div class="v9-pp" style="margin-top:14px"><div><small>Total</small><b class="num">${money(e.amt)}</b></div><div class="now"><small>Paid</small><b class="num">${money(e.paid)}</b></div><div class="${rem ? 'pend' : 'ok'}"><small>${rem ? 'Remaining · Pending' : 'Remaining'}</small><b class="num">${money(rem)}</b></div><div><small>Status</small><b>${rem ? (e.paid ? 'Part paid' : 'Unpaid') : 'Paid'}</b></div></div>
    ${(e.v9pays || []).length ? `<div class="v9-hist"><b>Payments made later</b>${e.v9pays.map(x => `<span>${fdate(x.date)} · ${esc(accName(x.acct))} <b class="num">${money(x.amt)}</b></span>`).join('')}</div>` : ''}`);
  if (rem > 0 && R_().edit && e.acct !== 'FUND-QIT') acts.insertAdjacentHTML('afterbegin', `<button class="btn p" type="button" onclick="V9.expPayForm('${id}')">${ic('plus')}Record payment</button>`);
};
V9.expPayForm = id => {
  const e = EXPENSES.find(x => x.id === id), rem = e.amt - e.paid;
  if (locked(e.month) && ST.role !== 'Owner') { toast(mlab(e.month) + ' is locked. Owner approval needed.'); return; }
  sheet('EXPENSE PAYMENT · ' + e.id, esc(e.payee), `<div class="grid g2">${fld('Paying now (BDT)', `<input id="v9-xa" type="number" min="1" max="${rem}" value="${rem}">`)}${fld('Account', `<select id="v9-xc">${opts(ACCOUNTS.map(a => [a.id, a.name + ' · ' + money(balance(a.id))]), e.acct && e.acct.startsWith('ACC') ? e.acct : 'ACC-BANK')}</select>`)}${fld('Date', `<input id="v9-xd" type="date" value="${TODAY}" max="${TODAY}">`)}</div><div id="v9-xs"></div>
  <div class="acts"><button class="btn" type="button" onclick="expView('${id}')">Back</button><button class="btn p" type="button" onclick="V9.expPay('${id}')">Save payment</button></div>`);
  const a = $('#v9-xa'), draw = () => { const now = Math.max(0, +a.value || 0), left = Math.max(0, rem - now); $('#v9-xs').innerHTML = `<div class="v9-pp"><div><small>Total</small><b class="num">${money(e.amt)}</b></div><div><small>Paid before</small><b class="num">${money(e.paid)}</b></div><div class="now"><small>Paying now</small><b class="num">${money(Math.min(now, rem))}</b></div><div class="${left ? 'pend' : 'ok'}"><small>${left ? 'Remaining · Pending' : 'Remaining'}</small><b class="num">${money(left)}</b></div></div>${now > rem ? `<p class="v9-warn">Only ${esc(money(rem))} is left on this expense.</p>` : ''}`; };
  a.addEventListener('input', draw); draw();
};
V9.expPay = id => {
  const e = EXPENSES.find(x => x.id === id), rem = e.amt - e.paid, a = Math.round(+$('#v9-xa').value || 0), acct = $('#v9-xc').value, d = $('#v9-xd').value || TODAY;
  if (a <= 0) { toast('Enter the amount paid'); return; } if (a > rem) { toast('Only ' + money(rem) + ' is left'); return; }
  if (a > balance(acct)) { toast('Not enough money in ' + accName(acct)); return; }
  (e.v9pays = e.v9pays || []).push({ date: d, amt: a, acct, by: ME().name }); e.paid += a;
  MOVES = movements(); log('Expense paid', e.cat + ' · ' + e.payee, money(a) + ' · ' + accName(acct)); render(); expView(id); toast(e.amt - e.paid > 0 ? 'Saved · ' + money(e.amt - e.paid) + ' still pending' : 'Saved · expense fully paid');
};
/* cash movements: a later payment leaves the account on its own date, from its own account */
V9._movements = movements;
movements = function () {
  const L = V9._movements.apply(this, arguments);
  EXPENSES.forEach(e => {
    if (!e.v9pays || !e.v9pays.length) return;
    const later = e.v9pays.reduce((s, x) => s + x.amt, 0), base = e.paid - later, m = L.find(x => x.ref === e.id && x.cls === 'out-exp');
    if (m) { if (base > 0) m.amt = -base; else L.splice(L.indexOf(m), 1); }
    e.v9pays.forEach(x => { if (x.date <= TODAY) L.push({ date: x.date, acct: x.acct, amt: -x.amt, kind: e.cls === 'Operating' ? 'Expense' : e.cls, ref: e.id, label: e.cat + ' · ' + e.payee + ' (payment)', ext: true, cls: 'out-exp' }); });
  });
  L.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return L;
};
