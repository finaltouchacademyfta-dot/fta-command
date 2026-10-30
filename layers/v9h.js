/* =====================================================================
   v9h · owner review 29 Oct (new student form)
   1. Monthly payment: a year picker on top shows all 12 months of that year.
   2. Contact: "+ Add another number".
   3. Subjects: tick one or more (each with its teacher) — or none yet.
   4. Board: empty by default; click to get tick-box suggestions (or type).
   5. Every account dropdown gets a "+" to add a new account on the spot.
   New skins only; the existing save engine does the bookkeeping.
   ===================================================================== */
const V9H = window.V9H = {};

/* ---------- 5. "+ add account" next to every account dropdown ---------- */
V9H.isAcc = s => { const v = [...s.options].map(o => o.value).filter(Boolean); return v.length > 1 && v.filter(x => /^ACC-/.test(x)).length >= Math.max(2, v.length - 1); };
V9H.accScan = () => {
  if (!SCH.NEW() || !R_() || !R_().edit) return;
  document.querySelectorAll('select:not([data-v9h])').forEach(s => {
    if (!V9H.isAcc(s)) return; s.dataset.v9h = 1;
    const w = document.createElement('span'); w.className = 'v9h-accw'; s.parentNode.insertBefore(w, s); w.appendChild(s);
    w.insertAdjacentHTML('beforeend', `<button type="button" class="v9h-plus" data-tip="Add a new account (bank, mobile banking, cash box)" aria-label="Add a new account" onclick="V9H.accNew(this)">${ic('plus')}</button>`);
  });
};
V9H.mo = new MutationObserver(() => { cancelAnimationFrame(V9H.raf); V9H.raf = requestAnimationFrame(V9H.accScan); });
V9H.mo.observe(document.body, { childList: true, subtree: true });
V9H.pop = html => { V9H.popClose(); const d = document.createElement('div'); d.id = 'v9h-pop'; d.innerHTML = `<div class="v9h-card" role="dialog" aria-modal="true">${html}</div>`; d.addEventListener('mousedown', e => { if (e.target === d) V9H.popClose(); }); document.body.appendChild(d); const f = d.querySelector('input'); if (f) setTimeout(() => f.focus(), 30); };
V9H.popClose = () => { const d = document.getElementById('v9h-pop'); if (d) d.remove(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('v9h-pop')) { e.stopPropagation(); V9H.popClose(); } }, true);
V9H.accNew = btn => {
  V9H.accFor = btn.parentNode.querySelector('select');
  V9H.pop(`<div class="v9h-h"><b>New account</b><small>It appears in every account list straight away</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>
    <div class="grid g2">${fld('Account name', '<input id="v9h-an" placeholder="e.g. UCB Bank •• 2210">')}${fld('Type', `<select id="v9h-at" data-v9h="1">${opts(['Bank', 'Mobile banking', 'Cash', 'Other'])}</select>`)}${fld('Opening balance (BDT)', '<input id="v9h-ao" type="number" min="0" value="0">', 'Money already in it today')}${fld('Account / wallet number', '<input id="v9h-ar" placeholder="optional">')}</div>
    <div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Cancel</button><button class="btn p" type="button" onclick="V9H.accSave()">Add account</button></div>`);
};
V9H.accSave = () => {
  if (!R_() || !R_().edit) { toast('Your role cannot add accounts'); return; }
  const n = $('#v9h-an').value.trim(), t = $('#v9h-at').value, o = Math.max(0, +$('#v9h-ao').value || 0), r = $('#v9h-ar').value.trim();
  if (n.length < 2) { toast('Write the account name'); $('#v9h-an').focus(); return; }
  if (ACCOUNTS.some(a => a.name.toLowerCase() === n.toLowerCase())) { toast('An account with this name already exists'); return; }
  const id = 'ACC-' + n.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) + (ACCOUNTS.length + 1);
  ACCOUNTS.push({ id, name: n, type: t, open: o, no: r, by: ME().name, at: TODAY }); METHOD[id] = t === 'Cash' ? 'Cash' : n;
  MOVES = movements(); log('Account added', n, t + (o ? ' · opening ' + money(o) : ''));
  document.querySelectorAll('select[data-v9h]').forEach(s => { if (s.id === 'v9h-at' || [...s.options].some(x => x.value === id)) return; if (!V9H.isAcc(s)) return; const op = document.createElement('option'); op.value = id; op.textContent = n; s.appendChild(op); });
  if (V9H.accFor) { V9H.accFor.value = id; V9H.accFor.dispatchEvent(new Event('change', { bubbles: true })); }
  V9H.popClose(); toast(n + ' added');
};

/* ---------- 1. monthly payment table: one year at a time ---------- */
V9H.Y = null;
V9H._fRows = PU.fRows;
PU.fRows = () => {
  if (!SCH.NEW() || V9H.all || !document.getElementById('pu-mt')) return V9H._fRows();
  const y = V9H.Y || +((($('#nf-s') && $('#nf-s').value) || CUR).slice(0, 4)); V9H.Y = y;
  return Array.from({ length: 12 }, (_, i) => y + '-' + String(i + 1).padStart(2, '0'));
};
V9H._fDraw = PU.fDraw;
PU.fDraw = () => {
  if (!SCH.NEW() || !PU.F || !document.getElementById('pu-mt')) return V9H._fDraw();
  const start = (($('#nf-s') && $('#nf-s').value) || CUR).slice(0, 7), fee = PU.feeOf();
  PU.fRows().forEach(m => { if (!PU.F.rows[m]) PU.F.rows[m] = { st: m < start ? 'Off' : 'Active', pay: m < start ? 0 : fee, paid: 0, d: m < CUR ? m + '-05' : TODAY, acct: 'ACC-CASH', n: '' }; });
  Object.keys(PU.F.rows).forEach(m => { const r = PU.F.rows[m]; if (r.stTouched) return; const st = m < start ? 'Off' : 'Active'; if (r.st !== st) { r.st = st; if (st === 'Active' && !r.touched) r.pay = fee; } });
  V9H._fDraw();
  const box = document.getElementById('pu-mt'); if (!box) return;
  const fut = box.querySelector('.pu-fut'); if (fut) fut.open = true;
  const sub = box.querySelector('.pu-mh small'); if (sub) sub.textContent = 'Pick a year · January to December · Running and Future months are marked';
  /* one table, January → December */
  const tb = [...box.querySelectorAll('tbody')], rows = tb.flatMap(t => [...t.querySelectorAll('tr')]).sort((a, b) => a.dataset.m < b.dataset.m ? -1 : 1);
  if (tb[0]) { rows.forEach(r => tb[0].appendChild(r)); const tw = tb[0].closest('.pu-tw'); if (fut && fut.contains(tw)) fut.before(tw); if (fut) fut.remove(); }
  const y = V9H.Y, yrs = []; for (let i = +CUR.slice(0, 4) + 10; i >= +CUR.slice(0, 4) - 10; i--) yrs.push(i);
  const filled = Object.keys(PU.F.rows).filter(m => { const r = PU.F.rows[m]; return r.st !== 'Off' && (r.pay || r.paid); }).map(m => +m.slice(0, 4));
  box.querySelector('.pu-mh').insertAdjacentHTML('afterend', `<div class="v9h-yb"><button type="button" class="btn s" aria-label="Previous year" onclick="V9H.year(${y - 1})">‹</button><select aria-label="Year" data-v9h="1" onchange="V9H.year(+this.value)">${yrs.map(v => `<option value="${v}" ${v === y ? 'selected' : ''}>${v}${filled.includes(v) && v !== y ? ' •' : ''}</option>`).join('')}</select><button type="button" class="btn s" aria-label="Next year" onclick="V9H.year(${y + 1})">›</button><small>All 12 months of ${y}. Months before the start date are “Not billed”; switch any month on or off.</small></div>`);
};
V9H.year = y => { V9H.Y = y; PU.fDraw(); };
V9H._fCommit = PU.fCommit;
PU.fCommit = (sid, enrId) => {        /* save every year that was filled, not only the one on screen */
  if (!SCH.NEW()) return V9H._fCommit(sid, enrId);
  const keep = PU.fRows; PU.fRows = () => Object.keys(PU.F.rows).sort();
  try { return V9H._fCommit(sid, enrId); } finally { PU.fRows = keep; }
};

/* ---------- 2–4. contact numbers, subjects with teachers, board suggestions ---------- */
V9H.BOARDS = ['Cambridge', 'Edexcel', 'National curriculum', 'IB', 'Oxford AQA', 'Other'];
V9H.F = null;   /* { subs: { prog: mentorId }, boards: [], phones: [] } */
V9H.teacherFor = prog => { const p = PROGS.find(x => x.id === prog) || {}; const d = (p.teachers || p.mentors || [])[0]; if (d) return d; const c = {}; ENROL.filter(e => e.prog === prog && e.mentor).forEach(e => c[e.mentor] = (c[e.mentor] || 0) + 1); const best = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; return best || (MENTORS.find(m => m.status === 'Active') || {}).id; };
V9H._studentForm = studentForm;
studentForm = function () {
  const r = V9H._studentForm.apply(this, arguments);
  if (!SCH.NEW()) return r;
  V9H.F = { subs: {}, boards: [], phones: [] }; V9H.Y = null;
  const st = $('#nf-s'); if (st) { st.value = CUR + '-01'; if (PU.F) { PU.F.rows = {}; } }   /* starts this month unless changed */
  const p = $('#nf-p'), b = $('#nf-b'), pr = $('#nf-pr'), m = $('#nf-m');
  if (p) p.closest('.fld').insertAdjacentHTML('beforeend', `<div id="v9h-ph"></div><button type="button" class="v9h-add" onclick="V9H.phAdd()">${ic('plus')}Add another number</button>`);
  if (b) { b.classList.add('v9-hid'); b.insertAdjacentHTML('afterend', `<div class="v9h-cb" id="v9h-bd"><div class="v9h-in" tabindex="0" role="button" aria-haspopup="listbox" onclick="V9H.bdOpen()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();V9H.bdOpen()}"><span class="v9h-chips" id="v9h-bdc"><span class="v9h-ph">Choose or type a board (optional)</span></span><svg class="v8-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></div></div>`); }
  if (pr) {
    const f = pr.closest('.fld'), mf = m && m.closest('.fld'); pr.classList.add('v9-hid'); if (mf) mf.classList.add('v9h-gone');
    f.classList.add('v9h-wide'); const l = f.querySelector('label'); if (l) l.textContent = 'Subjects (tick one or more — or leave empty for now)';
    pr.insertAdjacentHTML('afterend', `<div class="v9h-cb" id="v9h-sb"><div class="v9h-in" tabindex="0" role="button" aria-haspopup="listbox" onclick="V9H.sbOpen()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();V9H.sbOpen()}"><span class="v9h-chips"><span class="v9h-ph">Click to choose subjects</span></span><svg class="v8-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></div><div id="v9h-sl"></div></div>`);
  }
  V9H.sbDraw(); V9H.bdDraw();
  return r;
};
V9H.phAdd = v => { V9H.F.phones.push(v || ''); V9H.phDraw(); const i = document.querySelectorAll('#v9h-ph input'); if (i.length) i[i.length - 1].focus(); };
V9H.phDraw = () => { const el = $('#v9h-ph'); if (!el) return; el.innerHTML = V9H.F.phones.map((v, i) => `<div class="v9h-phr"><input inputmode="tel" placeholder="Another number (WhatsApp, guardian, home…)" value="${esc(v)}" oninput="V9H.F.phones[${i}]=this.value" aria-label="Extra number ${i + 1}"><button type="button" class="v9h-x" aria-label="Remove this number" onclick="V9H.F.phones.splice(${i},1);V9H.phDraw()">${ic('x')}</button></div>`).join(''); };
/* board picker */
V9H.bdOpen = () => {
  const all = uniq(V9H.BOARDS.concat(STUDENTS.map(s => s.board).filter(x => x && x !== '—').flatMap(x => x.split(/,\s*/))));
  V9H.pop(`<div class="v9h-h"><b>Board</b><small>Tick one or more, or type a new one</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>
    <input id="v9h-bq" placeholder="Search or type a board" oninput="V9H.bdFilter(this.value)" onkeydown="if(event.key==='Enter'){V9H.bdAddTyped()}">
    <div class="v9h-list" id="v9h-bl">${all.map(x => `<label class="v9f-pick" data-n="${esc(x.toLowerCase())}"><input type="checkbox" value="${esc(x)}" ${V9H.F.boards.includes(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div>
    <div class="acts"><button class="btn" type="button" onclick="V9H.F.boards=[];V9H.bdDraw();V9H.popClose()">Clear</button><button class="btn p" type="button" onclick="V9H.bdApply()">Done</button></div>`);
};
V9H.bdFilter = q => { q = q.toLowerCase(); document.querySelectorAll('#v9h-bl .v9f-pick').forEach(l => l.hidden = q && !l.dataset.n.includes(q)); };
V9H.bdAddTyped = () => { const q = $('#v9h-bq').value.trim(); if (!q) return; if (![...document.querySelectorAll('#v9h-bl input')].some(i => i.value.toLowerCase() === q.toLowerCase())) $('#v9h-bl').insertAdjacentHTML('afterbegin', `<label class="v9f-pick" data-n="${esc(q.toLowerCase())}"><input type="checkbox" value="${esc(q)}" checked><span>${esc(q)}</span></label>`); $('#v9h-bq').value = ''; V9H.bdFilter(''); };
V9H.bdApply = () => { const q = $('#v9h-bq') && $('#v9h-bq').value.trim(); if (q) V9H.bdAddTyped(); V9H.F.boards = [...document.querySelectorAll('#v9h-bl input:checked')].map(i => i.value); V9H.bdDraw(); V9H.popClose(); };
V9H.bdDraw = () => { const c = $('#v9h-bdc'); if (!c) return; c.innerHTML = V9H.F.boards.length ? V9H.F.boards.map(x => `<span class="v9h-chip">${esc(x)}</span>`).join('') : '<span class="v9h-ph">Choose or type a board (optional)</span>'; };
/* subject picker */
V9H.sbOpen = () => {
  V9H.pop(`<div class="v9h-h"><b>Subjects</b><small>Tick every subject this student will take; choose the teacher for each</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>
    <input id="v9h-sq" placeholder="Search subjects" oninput="V9H.sbFilter(this.value)">
    <div class="v9h-list" id="v9h-sbl">${PROGS.filter(p => p.status !== 'Archived').map(p => `<label class="v9f-pick" data-n="${esc(p.name.toLowerCase())}"><input type="checkbox" value="${p.id}" ${V9H.F.subs[p.id] ? 'checked' : ''}><span>${esc(p.name)}<small>${esc(p.type || '')} · ${money(p.fee)} a month</small></span></label>`).join('')}</div>
    <div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Cancel</button><button class="btn p" type="button" onclick="V9H.sbApply()">Done</button></div>`);
};
V9H.sbFilter = q => { q = q.toLowerCase(); document.querySelectorAll('#v9h-sbl .v9f-pick').forEach(l => l.hidden = q && !l.dataset.n.includes(q)); };
V9H.sbApply = () => { const on = [...document.querySelectorAll('#v9h-sbl input:checked')].map(i => i.value), S = {}; on.forEach(id => S[id] = V9H.F.subs[id] || V9H.teacherFor(id)); V9H.F.subs = S; V9H.popClose(); V9H.sbDraw(); };
V9H.sbDraw = () => {
  const el = $('#v9h-sl'), ids = Object.keys(V9H.F.subs), chips = document.querySelector('#v9h-sb .v9h-chips'); if (!el) return;
  chips.innerHTML = ids.length ? ids.map(id => `<span class="v9h-chip">${esc(progName(id))}</span>`).join('') : '<span class="v9h-ph">Click to choose subjects — you can add them later</span>';
  el.innerHTML = ids.map(id => { const p = PROGS.find(x => x.id === id); return `<div class="v9h-sr"><div class="grow"><b>${esc(p.name)}</b><small>${money(p.fee)} a month</small></div><select data-v9h="1" aria-label="Teacher for ${esc(p.name)}" onchange="V9H.F.subs['${id}']=this.value">${opts(MENTORS.filter(m => m.status === 'Active').map(m => [m.id, m.name]), V9H.F.subs[id])}</select><button type="button" class="v9h-x" aria-label="Remove ${esc(p.name)}" onclick="delete V9H.F.subs['${id}'];V9H.sbDraw()">${ic('x')}</button></div>`; }).join('');
  if (ids.length) { const pr = $('#nf-pr'), m = $('#nf-m'); pr.value = ids[0]; if (m) m.value = V9H.F.subs[ids[0]]; }
  if (PU.F && document.getElementById('pu-mt')) { const fee = PU.feeOf(); Object.values(PU.F.rows).forEach(r => { if (!r.touched && r.st !== 'Off') r.pay = fee; }); PU.fDraw(); }
};
/* the monthly fee is the total of the ticked subjects */
V9H._feeOf = PU.feeOf;
PU.feeOf = () => { if (!SCH.NEW() || !V9H.F || !$('#v9h-sb')) return V9H._feeOf(); const d = +(($('#nf-d') || {}).value) || 0; return Math.max(0, sum(Object.keys(V9H.F.subs), id => (PROGS.find(p => p.id === id) || {}).fee || 0) - d); };
/* save: first subject goes through the existing engine; the others are added the same way */
V9H._saveStudent = saveStudent;
saveStudent = function () {
  if (!SCH.NEW() || !V9H.F || !$('#v9h-sb')) return V9H._saveStudent.apply(this, arguments);
  const F = V9H.F, ids = Object.keys(F.subs);
  if (!ids.length && PU.F && Object.values(PU.F.rows).some(r => r.st !== 'Off' && (r.paid > 0))) { toast('Choose a subject before recording money for this student'); return; }
  const b = $('#nf-b'); if (b) { const v = F.boards.join(', ') || '—'; if (![...b.options].some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; o.textContent = v; b.appendChild(o); } b.value = v; }
  if (ids.length) { $('#nf-pr').value = ids[0]; if ($('#nf-m')) $('#nf-m').value = F.subs[ids[0]]; }
  const n0 = STUDENTS.length, e0 = ENROL.length, i0 = INVOICES.length;
  V9H._saveStudent.apply(this, arguments);
  if (STUDENTS.length === n0) return;
  const s = STUDENTS[STUDENTS.length - 1], first = ENROL.slice(e0).find(e => e.stu === s.id);
  s.phones = F.phones.map(x => x.trim()).filter(Boolean);
  if (!ids.length) { if (first) ENROL.splice(ENROL.indexOf(first), 1); for (let i = INVOICES.length - 1; i >= i0; i--) if (INVOICES[i].stu === s.id && !invPaid(INVOICES[i])) INVOICES.splice(i, 1); SCH.GROUPS.forEach(g => { const k = g.stu.indexOf(s.id); if (k >= 0) g.stu.splice(k, 1); }); log('Student added without a subject', s.name + ' · ' + s.id, 'subjects can be added later'); }
  else if (first) {
    ids.slice(1).forEach(id => { const p = PROGS.find(x => x.id === id); ENROL.push(Object.assign({}, first, { id: 'ENR-' + String(2001 + ENROL.length), prog: id, mentor: F.subs[id], type: p.type, disc: 0, discBy: '', fees: [{ from: first.start.slice(0, 7), fee: p.fee, by: ME().name, note: 'Standard fee' }] })); });
    /* months billed on the form carry one line per subject; the total stays what was typed */
    const ens = ENROL.filter(e => e.stu === s.id);
    INVOICES.slice(i0).filter(i => i.stu === s.id).forEach(inv => { const want = invNet(inv); inv.items = ens.map(e => ({ enr: e.id, prog: e.prog, mentor: e.mentor, batch: e.batch || '', fee: feeFor(e, inv.month), disc: e.disc || 0 })); inv.adj = want - sum(inv.items, x => x.fee - x.disc); });
    if (window.V9G) V9G.toGroups(s.id); MOVES = movements();
    if (ids.length > 1) log('Subjects added', s.name + ' · ' + s.id, ids.map(progName).join(', '));
  }
  V9H.F = null; render();
};
/* extra numbers show on the student card */
if (SCH.stu360) { V9H._s360 = SCH.stu360; SCH.stu360 = function (sid) { V9H._s360.apply(this, arguments); const s = stuOf(sid), g = document.querySelector('#sheet .s3-g'); if (SCH.NEW() && g && s && s.phones && s.phones.length) g.insertAdjacentHTML('beforeend', `<small>Also: ${s.phones.map(esc).join(', ')}</small>`); }; }
V9H._stuView = stuView;
stuView = function (id) { V9H._stuView.apply(this, arguments); const s = stuOf(id), kv = document.querySelector('#sheet .kv'); if (SCH.NEW() && kv && s && s.phones && s.phones.length) kv.insertAdjacentHTML('beforeend', `<div><small>Other numbers</small><span>${s.phones.map(esc).join(', ')}</span></div>`); };

V9H._fSet = PU.fSet; PU.fSet = (m, k, v) => { if (k === 'st' && PU.F && PU.F.rows[m]) PU.F.rows[m].stTouched = true; V9H._fSet(m, k, v); };
