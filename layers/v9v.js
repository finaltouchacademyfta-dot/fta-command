/* ===== V9V · a mentor adds a student: the same form as the office, without any money ======================
   Subjects: type to see suggestions (English-academy subjects first), tick several, or type your own (even a
   misspelling) and it is kept exactly as typed. The request carries the subjects; the office creates the classes
   when it approves, so nothing here touches fees, invoices or payments.                                      */
const V9V = window.V9V = { M: new Map(), S: [] };
V9V.EN = ['English Language', 'English Literature', 'IGCSE English First Language', 'IGCSE English as a Second Language', 'O Level English Language', 'A Level English Language', 'A Level English Literature', 'Spoken English', 'English Grammar', 'Vocabulary Building', 'Creative Writing', 'Academic Writing', 'Reading Comprehension', 'Phonics', 'Handwriting', 'Public Speaking', 'IELTS Academic', 'IELTS General Training', 'TOEFL', 'PTE Academic', 'Duolingo English Test', 'SAT English (Reading & Writing)', 'Business English', 'English for Kids', 'Mathematics', 'Additional Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'ICT', 'Economics', 'Business Studies', 'Accounting', 'Bangla', 'Islamic Studies', 'General Science', 'Social Studies', 'Geography', 'History'];
const v9vKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const v9vEsc = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
V9V.names = () => {
  const seen = new Map(), add = n => { n = String(n || '').trim(); const k = v9vKey(n); if (n && k && !seen.has(k)) seen.set(k, n); };
  V9V.M.forEach(v => add(v)); V9V.EN.forEach(add);
  try { PROGS.filter(p => p.status !== 'Archived').forEach(p => add(String(p.name || '').replace(/ · .*$/, ''))); } catch (e) { }
  try { SCH.myGroups().forEach(g => add(g.name)); } catch (e) { }
  return [...seen.values()];
};
V9V.canon = typed => { const k = v9vKey(typed), hit = V9V.names().find(n => v9vKey(n) === k); return hit || String(typed).trim().replace(/\s+/g, ' ').slice(0, 60); };
V9V.shown = [];
V9V.draw = () => {
  const box = document.getElementById('v9v-l'); if (!box) return;
  const q = (document.getElementById('v9v-q') || {}).value || '', k = v9vKey(q);
  let list = V9V.names().filter(n => !k || v9vKey(n).includes(k));
  list.sort((a, b) => (V9V.M.has(v9vKey(b)) - V9V.M.has(v9vKey(a))) || ((v9vKey(b).startsWith(k) ? 1 : 0) - (v9vKey(a).startsWith(k) ? 1 : 0)));
  V9V.shown = list;
  const exact = !!k && V9V.names().some(n => v9vKey(n) === k);
  box.innerHTML = (k && !exact ? `<button type="button" class="v9v-addrow" onclick="V9V.addTyped()">${ic('plus')}<span>Use “${v9vEsc(q.trim())}” as a new subject</span></button>` : '') +
    (list.length ? list.map((n, i) => `<label class="v9f-pick"><input type="checkbox" ${V9V.M.has(v9vKey(n)) ? 'checked' : ''} onchange="V9V.tog(${i},this.checked)"><span>${v9vEsc(n)}</span></label>`).join('') : (k ? '' : '<p class="v9h-ph">No subjects yet</p>'));
  const c = document.getElementById('v9v-cnt'); if (c) c.textContent = V9V.M.size ? V9V.M.size + ' selected' : 'None selected yet';
};
V9V.tog = (i, on) => { const n = V9V.shown[i]; if (!n) return; const k = v9vKey(n); if (on) V9V.M.set(k, n); else V9V.M.delete(k); const c = document.getElementById('v9v-cnt'); if (c) c.textContent = V9V.M.size ? V9V.M.size + ' selected' : 'None selected yet'; };
V9V.addTyped = () => {
  const el = document.getElementById('v9v-q'); if (!el) return; const t = el.value.trim(); if (!t) return;
  const n = V9V.canon(t); V9V.M.set(v9vKey(n), n); el.value = ''; V9V.draw(); el.focus();
};
V9V.open = () => {
  V9V.M = new Map(V9V.S.map(n => [v9vKey(n), n]));
  V9H.pop(`<div class="v9h-h"><b>Subjects</b><small>Start typing to see matching subjects, tick as many as you need, or type your own</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>
    <input id="v9v-q" placeholder="Type a subject, e.g. English, Maths, IELTS…" autocomplete="off" spellcheck="false" oninput="V9V.draw()" onkeydown="if(event.key==='Enter'){event.preventDefault();V9V.addTyped()}">
    <div class="v9v-hint">Not in the list? Press Enter to use exactly what you typed.</div>
    <div class="v9h-list" id="v9v-l"></div>
    <div class="acts"><span class="v9v-cnt" id="v9v-cnt"></span><button class="btn" type="button" onclick="V9V.M=new Map();V9V.apply()">Clear</button><button class="btn p" type="button" onclick="V9V.apply()">Done</button></div>`);
  V9V.draw();
};
V9V.apply = () => {
  const el = document.getElementById('v9v-q'), t = el && el.value.trim();
  if (t && !V9V.names().some(n => v9vKey(n).includes(v9vKey(t)))) { const n = V9V.canon(t); V9V.M.set(v9vKey(n), n); }   /* typed and nothing matched: keep it as typed */
  V9V.S = [...V9V.M.values()]; V9H.popClose(); V9V.chips();
};
V9V.rm = i => { V9V.S.splice(i, 1); V9V.chips(); };
V9V.chips = () => {
  const c = document.getElementById('v9v-chips'); if (!c) return;
  c.innerHTML = V9V.S.length ? V9V.S.map((n, i) => `<span class="v9h-chip">${v9vEsc(n)}<button type="button" class="v9v-rm" aria-label="Remove ${v9vEsc(n)}" onclick="event.stopPropagation();V9V.rm(${i})">×</button></span>`).join('') : '<span class="v9h-ph">Click to choose or type subjects</span>';
  const h = document.getElementById('ns-sub'); if (h) { h.value = V9V.S.join('|'); SCH.err('ns-sub', ''); }
};
/* ---------- the form ---------- */
SCH.newStuForm = () => {
  V9P.X = []; V9H.F = { subs: {}, boards: [], phones: [] }; V9V.S = []; SCH._editPend = null;
  const cls = (SCH.CLS_ORDER || []).map(c => `<option value="${v9vEsc(c)}"></option>`).join('');
  sheet('NEW STUDENT', 'Add a new student', `${note('The office receives this and approves it before the student appears in fees and invoices. Fees and payments are set by the office only.', 'info')}
    <div class="grid g2" style="margin-top:12px">${fld('Student name', '<input id="ns-n" maxlength="60" autocomplete="off">')}${fld('Guardian name', '<input id="ns-g" maxlength="60">')}
    ${fld('Contact (guardian WhatsApp)', '<input id="ns-p" inputmode="tel" placeholder="01XXXXXXXXX or +44 7700 900123"><div id="ns-ph"></div><button type="button" class="v9h-add" onclick="V9P.addX()">' + ic('plus') + 'Add another number</button>')}
    ${fld('Student Gmail', '<input id="ns-e" type="email" maxlength="80" placeholder="name@gmail.com" autocomplete="off">', 'Optional. Used for the student’s portal sign-in.')}
    ${fld('Class / level', `<input id="ns-c" list="v9v-cl" maxlength="40" placeholder="Grade 9" autocomplete="off"><datalist id="v9v-cl">${cls}</datalist>`)}
    ${fld('Start date', `<input id="ns-st" type="date" value="${TODAY}">`)}
    <div class="fld v9h-wide"><label>Board</label><div class="v9h-cb" id="v9h-bd"><div class="v9h-in" tabindex="0" role="button" aria-haspopup="listbox" onclick="V9H.bdOpen()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();V9H.bdOpen()}"><span class="v9h-chips" id="v9h-bdc"><span class="v9h-ph">Choose or type a board (optional)</span></span><svg class="v8-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></div></div></div>
    <div class="fld v9h-wide"><label>Subjects (tick one or more, or type your own)</label><div class="v9h-cb" id="v9v-sb"><div class="v9h-in" tabindex="0" role="button" aria-haspopup="listbox" onclick="V9V.open()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();V9V.open()}"><span class="v9h-chips" id="v9v-chips"></span><svg class="v8-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></div><input type="hidden" id="ns-sub"></div></div>
    <div class="fld v9h-wide"><label>Note for the office (optional)</label><textarea id="ns-x" rows="2" maxlength="300" placeholder="Anything the office should know"></textarea></div></div>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn" type="button" onclick="closeSheet()">Cancel</button><button class="btn p" type="button" id="ns-go" onclick="SCH.newStuSave()">Send to the office</button></div>`);
  V9V.chips(); V9H.bdDraw();
};
SCH.newStuSave = () => {
  const n = SCH.val('ns-n'), e = SCH.val('ns-e').toLowerCase(), pr = V9P.clean(SCH.val('ns-p'));
  let bad = SCH.err('ns-n', n.length < 3 ? 'Enter the student’s full name.' : '');
  bad = SCH.err('ns-p', !pr.ok ? pr.err : !pr.num ? 'Enter the guardian’s WhatsApp number.' : '') || bad;
  bad = SCH.err('ns-e', e && !/^[^\s@]+@gmail\.com$/.test(e) ? 'Use a Gmail address, or leave it empty.' : '') || bad;
  bad = SCH.err('ns-sub', V9V.S.length ? '' : 'Choose at least one subject, or type one.') || bad;
  const ex = V9P.many(V9P.X); if (ex.bad.length) { bad = true; toast('Extra number ' + (ex.bad[0].i + 1) + ': ' + ex.bad[0].err); const el = document.querySelectorAll('#ns-ph input')[ex.bad[0].i]; if (el) el.focus(); }
  if (bad) { const f = document.querySelector('#sheet .sc-err:not(:empty)'); if (f) { try { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { } toast('Please fix the highlighted field'); } return; }
  const id0 = SCH._editPend, old = id0 && SCH.PEND.find(x => x.id === id0);
  const d = SCH.dupStu(n, pr.num, e); if (d && !(old && d === old)) { SCH.err('ns-n', 'This student is already on record' + (d.id ? ' (' + d.id + ')' : ' and waiting for approval') + '. Ask the office to add them to your class.'); return; }
  const go = document.getElementById('ns-go'); if (go) { if (go.disabled) return; go.disabled = true; }   /* no double sending */
  const rid = old ? old.id : 'NEW-' + Date.now(), subs = V9V.S.slice();
  const rec = { id: rid, name: n, guardian: SCH.val('ns-g'), phone: pr.num, phones: ex.out.filter(x => x !== pr.num), gmail: e, cls: SCH.val('ns-c') || '—', board: (V9H.F.boards || []).join(', ') || '—', subjects: subs, start: SCH.val('ns-st') || TODAY, gid: 'REQ:' + rid, by: SCH.mentor() || 'office', at: old ? old.at : TODAY, note: SCH.val('ns-x'), status: 'Pending' };
  if (old) Object.assign(old, rec); else SCH.PEND.unshift(rec);
  SCH.log(old ? 'Student request changed' : 'New student sent for approval', n + ' · ' + subs.join(', '), 'info'); SCH._editPend = null; closeSheet(); V9P.X = []; PAGES[ST.page](); toast(old ? 'Request updated' : 'Sent to the office for approval');
};
SCH.pendEdit = id => {
  const p = SCH.PEND.find(x => x.id === id); if (!p || p.status !== 'Pending' || p.by !== SCH.mentor()) return;
  SCH.newStuForm();
  const set = (i, v) => { const el = document.getElementById(i); if (el && v != null) el.value = v; };
  set('ns-n', p.name); set('ns-g', p.guardian); set('ns-p', String(p.phone || '').replace(/\D/g, '')); set('ns-e', p.gmail); set('ns-c', p.cls === '—' ? '' : p.cls); set('ns-x', p.note); set('ns-st', p.start || p.at || TODAY);
  V9H.F.boards = String(p.board || '').split(/,\s*/).filter(x => x && x !== '—'); V9H.bdDraw();
  V9V.S = (p.subjects || []).slice(); V9V.chips();
  const h = document.querySelector('#sheet h3, #sheet .sh-t'); if (h) h.textContent = 'Edit student request';
  V9P.setX(p.phones || []); SCH._editPend = id;
};
/* a request that names subjects has no class yet: it shows the subject names wherever a class name was shown */
(() => {
  const g0 = SCH.grp;
  SCH.grp = id => {
    const g = g0(id); if (g || typeof id !== 'string' || id.indexOf('REQ:') !== 0) return g;
    const p = SCH.PEND.find(x => x.id === id.slice(4)); return { id, name: p && p.subjects && p.subjects.length ? p.subjects.join(', ') : 'New class', mentor: p && p.by, stu: [], prog: '', status: 'Pending', virtual: true };
  };
})();
/* ---------- the office approves: one class per subject (an existing class of that teacher is reused) ---------- */
SCH.pendDo = (id, ok) => {
  const p = SCH.PEND.find(x => x.id === id); if (!p) return;
  if (!ok) return SCH.confirm({ kind: 'submit', title: 'Return ' + p.name + ' to the teacher?', reason: true, ok: 'Return', onOk: r => { p.status = 'Returned'; p.reply = r; SCH.log('New student returned', p.name + ' · ' + r, 'warn'); PAGES[ST.page](); } });
  const dg10 = x => String(x || '').replace(/\D/g, '').slice(-10);
  const d = STUDENTS.find(s => s.gmail && s.gmail === p.gmail) || STUDENTS.find(s => s.name.toLowerCase() === p.name.toLowerCase() && dg10(s.phone) === dg10(p.phone));
  const subs = (p.subjects || []).filter(Boolean), legacy = !subs.length && SCH.GROUPS.find(g => g.id === p.gid);
  const mine = () => SCH.GROUPS.filter(g => g.mentor === p.by && g.status !== 'Closed');
  const find = n => mine().find(g => v9vKey(g.name) === v9vKey(n) || v9vKey(progName(g.prog)) === v9vKey(n));
  const plan = subs.map(n => { const g = find(n); return { n, g }; });
  const impact = [d ? 'Uses ' + d.id + ' (a matching record exists)' : 'New Student ID, class ' + p.cls].concat(subs.length ? ['Classes: ' + plan.map(x => x.n + (x.g ? ' (existing class)' : ' (new class)')).join(', ')] : legacy ? ['Added to ' + legacy.name] : [], ['Fees start only after the office adds an enrolment in Programmes & Enrolments']);
  SCH.confirm({ kind: 'submit', title: 'Approve ' + p.name + '?', body: d ? 'A matching record exists (' + d.id + '). Approving links to it instead of making a second student.' : 'A new student record is made.', impact, ok: 'Approve', onOk: () => {
    let s = d;
    if (!s) { s = { id: 'STU-' + (1001 + STUDENTS.length), name: p.name, guardian: p.guardian, phone: p.phone, cls: p.cls, board: p.board, beh: 'good', joined: p.start || TODAY, status: 'Active', notes: [{ d: TODAY, t: 'Added by ' + SCH.mName(p.by) + ' and approved by ' + (ME() || {}).name + '.' + (subs.length ? ' Subjects: ' + subs.join(', ') + '.' : '') + ' ' + (p.note || ''), by: (ME() || {}).name }], gmail: p.gmail }; STUDENTS.push(s); }
    if (p.phones && p.phones.length) s.phones = Array.from(new Set((s.phones || []).concat(p.phones)));
    const nextId = () => 'G' + (1 + Math.max(0, ...SCH.GROUPS.map(x => +(/^G(\d+)$/.exec(x.id || '') || [0, 0])[1])));
    plan.forEach(x => {
      let g = x.g;
      if (!g) { g = { key: 'req|' + p.by + '|' + v9vKey(x.n), id: nextId(), prog: '', mentor: p.by, batch: '', name: x.n, stu: [], per: 2, status: 'Active', custom: { subject: x.n, board: p.board || '', level: p.cls || '', type: 'Group', when: '' } }; SCH.GROUPS.push(g); }
      if (g.status === 'Pending') g.status = 'Active';
      if (!g.stu.includes(s.id)) g.stu.push(s.id);
    });
    if (legacy) { if (legacy.status === 'Pending') legacy.status = 'Active'; if (!legacy.stu.includes(s.id)) legacy.stu.push(s.id); }
    p.status = 'Approved'; p.stuId = s.id;
    SCH.log('New student approved', s.name + ' · ' + s.id + (subs.length ? ' · ' + subs.join(', ') : ''), 'ok'); PAGES[ST.page](); toast(s.name + ' approved as ' + s.id);
  } });
};

/* ===== the mentor's "My share" card: only what is owed to the mentor, never the percentage or the pay rule ===== */
V8.myShare = function () {
  const mid = SCH.mentor(), m = MENTORS.find(x => x.id === mid); if (!m) return '';
  const R = V8.share(mid, [CUR]), tot = sum(R, r => r.t);
  const card = SCH.card('My share · ' + mlab(CUR), 'What you earn from your students this month', R.length ? `<div class="sc-list">${R.map(r => `<div class="sc-li"><div class="grow"><b>${esc(stuOf(r.stu).name)}</b><small>${esc(progName(r.prog))}${r.batch ? ' · batch' : ''}</small></div><div class="v8-myp">${r.fixed ? '<small>—</small>' : `<b>${money(r.t)}</b><small>this month</small>`}</div></div>`).join('')}</div><div class="v8-mytot"><span>Your earning this month so far</span><b>${money(tot)}</b></div>` : SCH.empty('No approved invoices for your students this month yet.'));
  const MZx = window.MZ; return card + (MZx && MZx.on && MZx.on() && ST.role === 'Mentor' && mid ? MZx.myPayCard(mid) : '');
};
