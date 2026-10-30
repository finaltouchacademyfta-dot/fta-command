/* =====================================================================
   v9m · owner 29 Oct: a Delete option everywhere — safely.
   Every delete asks first, needs a reason, goes to the Recycle bin
   (restore within 30 days brings it back with its money), and is
   blocked when deleting would break other records (it then says what
   to do first). Only the Owner or an Admin can delete money records.
   Additive: nothing existing is removed. New skins only.
   ===================================================================== */
const V9M = window.V9M = {};
V9M.boss = () => ['Owner', 'Admin'].includes(ST.role) && !SCH.preview;
V9M.lockedM = m => typeof CLOSE !== 'undefined' && CLOSE[m] && CLOSE[m].status === 'Locked' && ST.role !== 'Owner';
V9M.T = {
  pay: { list: () => PAYMENTS, find: id => PAYMENTS.find(x => x.id === id), name: p => p.rcpt + ' · ' + stuOf(p.stu).name, what: 'payment',
    block: p => V9M.lockedM(p.date.slice(0, 7)) ? mlab(p.date.slice(0, 7)) + ' is locked.' : null, body: p => money(p.amt) + ' from ' + esc(stuOf(p.stu).name) + ' on ' + fdate(p.date) + '. The months it paid go back to pending and the money leaves ' + esc(accName(p.acct)) + '.' },
  inv: { list: () => INVOICES, find: id => INVOICES.find(x => x.id === id), name: i => i.id + ' · ' + stuOf(i.stu).name + ' · ' + mlab(i.month), what: 'invoice',
    block: i => invPaid(i) > 0 ? money(invPaid(i)) + ' is paid on this invoice. Delete or edit those payments first.' : V9M.lockedM(i.month) ? mlab(i.month) + ' is locked.' : null, body: i => esc(stuOf(i.stu).name) + ' · ' + mlab(i.month) + ' · ' + money(invNet(i)) + '. The month stops being billed.' },
  exp: { list: () => EXPENSES, find: id => EXPENSES.find(x => x.id === id), name: e => e.id + ' · ' + e.cat + ' · ' + e.payee, what: 'expense',
    block: e => V9M.lockedM(e.month) ? mlab(e.month) + ' is locked.' : null, body: e => esc(e.payee) + ' · ' + money(e.amt) + (e.paid ? '. ' + money(e.paid) + ' paid goes back to the account.' : '.'),
    undo: e => { if (e.acct === 'FUND-QIT' && OTHERS[0]) { OTHERS[0].orig -= e.amt; return () => { OTHERS[0].orig += e.amt; }; } } },
  men: { list: () => MENTORS, find: id => MENTORS.find(x => x.id === id), name: m => m.name + ' · ' + m.id, what: 'teacher',
    block: m => { const en = ENROL.filter(e => e.mentor === m.id), pr = Object.values(PAYROLL).some(r => r.items.some(i => i.mentor === m.id)); return en.length || pr ? m.name + ' has ' + (en.length ? dg(en.length) + ' student subjects' : '') + (en.length && pr ? ' and ' : '') + (pr ? 'salary history' : '') + '. Move the students to another teacher, or set the teacher to Inactive to keep the history.' : null; },
    body: m => esc(m.name) + ' and their sign-in are removed.', undo: m => { const L = (SCH.LOGINS || []).filter(l => l.mentor === m.id); L.forEach(l => SCH.LOGINS.splice(SCH.LOGINS.indexOf(l), 1)); return () => L.forEach(l => SCH.LOGINS.push(l)); } },
  oth: { list: () => OTHERS, find: id => OTHERS.find(x => x.id === id), name: o => o.id + ' · ' + o.party, what: 'entry', block: o => o.legacy ? 'This entry came from the old app and is linked to expenses. Edit it instead.' : null, body: o => esc(o.party) + ' · ' + money(o.orig) + ((o.txns || []).length ? '. Its ' + dg(o.txns.length) + ' money movements are removed from the accounts too.' : '.') },
  trf: { list: () => TRANSFERS, find: id => TRANSFERS.find(x => x.id === id), name: t => t.id + ' · ' + accName(t.from) + ' → ' + accName(t.to), what: 'transfer', block: t => V9M.lockedM(t.date.slice(0, 7)) ? mlab(t.date.slice(0, 7)) + ' is locked.' : null, body: t => money(t.amt) + ' from ' + esc(accName(t.from)) + ' to ' + esc(accName(t.to)) + ' on ' + fdate(t.date) + '.' },
  note: { list: () => NOTES, find: id => NOTES.find(x => x.id === id), name: n => n.title, what: 'note', staff: true, body: n => esc(n.title) },
  cn: { list: () => SCH.CNOTES, find: id => SCH.CNOTES.find(x => (x.id || '') === id), name: n => 'Class note · ' + (n.topic || n.t || n.lesson || ''), what: 'class note', teacher: true, body: n => esc(n.topic || n.t || n.lesson || '') },
  lv: { list: () => SCH.LEAVE, find: id => SCH.LEAVE.find(x => x.id === id), name: l => 'Leave report · ' + menName(l.mentor) + ' · ' + SCH.fmtD(l.date), what: 'leave report', teacher: true, body: l => SCH.fmtD(l.date) + ' · ' + esc(l.reason || '') },
  pend: { list: () => SCH.PEND, find: id => SCH.PEND.find(x => x.id === id), name: n => 'New student request · ' + n.name, what: 'request', staff: true, body: n => esc(n.name) + ' · sent by ' + esc(menName(n.by)) }
};
V9M.can = k => { const T = V9M.T[k]; if (V9M.boss()) return true; if (T.staff) return !!(R_() && R_().edit) && ST.role !== 'Student'; if (T.teacher) return ST.role === 'Mentor' || (R_() && R_().edit); return false; };
V9M.del = (k, id) => {
  const T = V9M.T[k], it = T && T.find(id); if (!it) { toast('Already deleted'); return; }
  if (!V9M.can(k)) { toast('Only the Owner or an Admin can delete this'); return; }
  if (k === 'cn' && ST.role === 'Mentor' && !(SCH.grp(it.gid) && SCH.grp(it.gid).mentor === SCH.mentor())) { toast('You can delete only your own notes'); return; }
  const b = T.block && T.block(it); if (b) { sheetOrToast(b); return; }
  SCH.confirm({ kind: 'delete', title: 'Delete this ' + T.what + '?', body: T.body(it) + ' It goes to the Recycle bin and can be restored within 30 days.', reason: true, ok: 'Delete', onOk: why => {
    const u = T.undo && T.undo(it); if (u) it._v9r = u;
    SCH.toBin(T.what[0].toUpperCase() + T.what.slice(1), T.name(it) + (why ? ' · ' + why : ''), T.list(), it);
    if (typeof movements === 'function') MOVES = movements();
    log(T.what[0].toUpperCase() + T.what.slice(1) + ' deleted', T.name(it), why || '');
    closeSheet(); render(); toast('Deleted · you can restore it from the Recycle bin');
  } });
};
function sheetOrToast(msg) { toast(msg); }
V9M._restore = SCH.restore;
SCH.restore = id => { const b = SCH.BIN.find(x => x.id === id), f = b && b.item && b.item._v9r; V9M._restore(id); if (f) { f(); delete b.item._v9r; } if (typeof movements === 'function') MOVES = movements(); };
V9M.btn = (k, id, small) => V9M.can(k) ? `<button type="button" class="btn s d v9m-del${small ? ' ic' : ''}" data-tip="Delete" aria-label="Delete" onclick="event.stopPropagation();V9M.del('${k}','${id}')">${ic('trash')}${small ? '' : 'Delete'}</button>` : '';

/* ---------- Delete inside every detail window ---------- */
V9M.sheetBtn = (k, id) => { if (!SCH.NEW()) return; const sh = document.getElementById('sheet'); if (!sh || sh.querySelector('.v9m-del')) return; const h = V9M.btn(k, id); if (!h) return; const a = sh.querySelector('.acts:last-of-type') || sh.querySelector('.acts'); if (a) a.insertAdjacentHTML('afterbegin', h); else sh.insertAdjacentHTML('beforeend', `<div class="acts">${h}</div>`); };
[['payView', 'pay'], ['invView', 'inv'], ['expView', 'exp'], ['menView', 'men']].forEach(([f, k]) => { const o = window[f]; if (typeof o !== 'function') return; window[f] = function (id) { const r = o.apply(this, arguments); V9M.sheetBtn(k, id); return r; }; });
if (window.MZ && MZ.othView) { V9M._oth = MZ.othView; MZ.othView = function (id) { const r = V9M._oth.apply(this, arguments); V9M.sheetBtn('oth', id); return r; }; }

/* ---------- a small delete button on every list card and row ---------- */
V9M.PAT = [[/payView\(['"](PAY-[\w-]+)['"]/, 'pay'], [/invView\(['"](INV-[\w-]+)['"]/, 'inv'], [/expView\(['"](EXP-[\w-]+)['"]/, 'exp'], [/menView\(['"](MEN-[\w-]+)['"]/, 'men'], [/othView\(['"](OTH-[\w-]+)['"]/, 'oth'], [/stuView\(['"](STU-[\w-]+)['"]/, 'stu']];
V9M.scan = () => {
  if (!SCH.NEW() || ST.role === 'Student') return; const v = document.getElementById('view'); if (!v) return;
  v.querySelectorAll('.qc:not([data-v9m]), tr[onclick]:not([data-v9m])').forEach(el => {
    el.dataset.v9m = 1;
    const src = el.matches('tr') ? el.getAttribute('onclick') : [...el.querySelectorAll('[onclick]')].map(x => x.getAttribute('onclick')).join(' ');
    let k = null, id = null; for (const [re, kk] of V9M.PAT) { const m = (src || '').match(re); if (m) { k = kk; id = m[1]; break; } } if (!k) return;
    const h = k === 'stu' ? (V9J && V9J.boss() ? `<button type="button" class="btn s d v9m-del ic" data-tip="Delete student" aria-label="Delete student" onclick="event.stopPropagation();V9J.stuDel('${id}')">${ic('trash')}</button>` : '') : V9M.btn(k, id, true); if (!h) return;
    if (el.matches('tr')) { const td = el.lastElementChild; if (td) td.insertAdjacentHTML('beforeend', ' ' + h); }
    else { const a = el.querySelector('.qc-a'); if (a) a.insertAdjacentHTML('beforeend', h); }
  });
  /* transfers on Accounts, notes, class notes, leave reports, new-student requests */
  if (ST.page === 'accounts' && V9M.can('trf') && !v.querySelector('.v9m-trf')) { const pg = v.querySelector('.page'); if (pg) pg.insertAdjacentHTML('beforeend', `<div class="card v9m-trf"><div class="ch"><div><h2>Transfers between accounts</h2><p>Edit by deleting and making it again · newest first</p></div></div>${TRANSFERS.length ? `<div class="sc-list">${TRANSFERS.slice().reverse().map(t => `<div class="sc-li"><span class="sc-time">${fdate(t.date)}</span><div class="grow"><b>${esc(accName(t.from))} → ${esc(accName(t.to))}</b><small>${esc(t.id)}${t.note ? ' · ' + esc(t.note) : ''}</small></div><b class="num">${money(t.amt)}</b>${V9M.btn('trf', t.id, true)}</div>`).join('')}</div>` : SCH.empty('No transfers yet.')}</div>`); }
  if (ST.page === 'notes') v.querySelectorAll('.ncard:not([data-v9m])').forEach(c => { c.dataset.v9m = 1; const b = c.querySelector('[onclick*="togglePin"]'), id = b && (b.getAttribute('onclick').match(/'([^']+)'/) || [])[1]; const h = id && V9M.btn('note', id, true); if (h) b.insertAdjacentHTML('afterend', h); });
  if (ST.page === 'tp-notes' || ST.page === 'tp-leave' || ST.page === 'ac-portals') {
    const tag = (L, k, key) => L.forEach(x => { if (!x.id) return; v.querySelectorAll('tr:not([data-v9m]), .sc-li:not([data-v9m]), .cn-i:not([data-v9m])').forEach(el => { if (!el.textContent.includes(key(x)) || el.dataset.v9m) return; el.dataset.v9m = 1; const h = V9M.btn(k, x.id, true); if (h) (el.matches('tr') ? el.lastElementChild : el).insertAdjacentHTML('beforeend', h); }); });
    if (ST.page === 'tp-leave') tag(SCH.LEAVE.filter(l => l.mentor === SCH.mentor()), 'lv', l => SCH.fmtD(l.date));
    if (ST.page === 'ac-portals') tag(SCH.PEND, 'pend', n => n.name);
    if (ST.page === 'tp-notes') tag(SCH.CNOTES.filter(n => n.topic || n.t || n.lesson), 'cn', n => n.topic || n.t || n.lesson);
  }
};
V9M.mo = new MutationObserver(() => { cancelAnimationFrame(V9M.raf); V9M.raf = requestAnimationFrame(V9M.scan); });
V9M.mo.observe(document.body, { childList: true, subtree: true });
/* class notes have no id in the seed data: give them one so they can be deleted */
(SCH.CNOTES || []).forEach((n, i) => { if (!n.id) n.id = 'CN-' + (i + 1); });
(SCH.LEAVE || []).forEach((n, i) => { if (!n.id) n.id = 'LV-' + (i + 1); });
