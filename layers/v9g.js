/* =====================================================================
   v9g · owner 29 Oct: Gmail ties every person to a role, a portal and a
   dashboard. Office staff sign in with the Gmail the Owner adds; teachers
   with the Gmail on their teacher record; students with the Gmail taken
   at entry. A student added by the office goes straight into the chosen
   teacher's class (Teacher Dashboard), and gets Student Portal access.
   ===================================================================== */
const V9G = window.V9G = {};
V9G.ok = e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e);
/* every enrolment of a student sits in its teacher's class group */
V9G.toGroups = sid => {
  ENROL.filter(e => e.stu === sid && e.mentor).forEach(e => {
    const key = e.prog + '|' + e.mentor + '|' + (e.batch || '');
    let g = SCH.GROUPS.find(x => x.key === key && x.status === 'Active') || SCH.GROUPS.find(x => x.prog === e.prog && x.mentor === e.mentor && x.status === 'Active');
    if (!g) { g = { key, id: 'G' + (SCH.GROUPS.length + 1), prog: e.prog, mentor: e.mentor, batch: e.batch || '', name: progName(e.prog), stu: [], per: 0, status: 'Active' }; SCH.GROUPS.push(g); }
    if (!g.stu.includes(sid)) g.stu.push(sid);
  });
};
/* student entry: Gmail field + portal access + teacher's class */
V9G._studentForm = studentForm;
studentForm = function () {
  const r = V9G._studentForm.apply(this, arguments);
  if (SCH.NEW()) { const c = document.getElementById('nf-p'); const f = c && c.closest('.fld'); if (f && !document.getElementById('nf-e')) f.insertAdjacentHTML('afterend', fld('Student Gmail', '<input id="nf-e" type="email" placeholder="name@gmail.com" autocomplete="off">', 'Used to sign in to the Student Portal. The student appears on the chosen teacher’s dashboard.')); }
  return r;
};
V9G._saveStudent = saveStudent;
saveStudent = function () {
  if (!SCH.NEW() || !document.getElementById('nf-e')) return V9G._saveStudent.apply(this, arguments);
  const e = (document.getElementById('nf-e').value || '').trim().toLowerCase();
  if (e && !V9G.ok(e)) { toast('Enter the full Gmail address, or leave it empty'); document.getElementById('nf-e').focus(); return; }
  if (e && (SCH.SPORT.some(x => x.gmail === e) || STUDENTS.some(x => (x.gmail || '').toLowerCase() === e))) { toast('This Gmail is already used by another student'); document.getElementById('nf-e').focus(); return; }
  const n0 = STUDENTS.length; V9G._saveStudent.apply(this, arguments);
  if (STUDENTS.length === n0) return;
  const s = STUDENTS[STUDENTS.length - 1]; V9G.toGroups(s.id);
  if (e) { s.gmail = e; SCH.SPORT.push({ stu: s.id, gmail: e, status: 'Active', by: (ME() || {}).name, role: ST.role, at: TODAY, last: '' }); SCH.log('Student Portal opened', s.name + ' · ' + e, 'ok'); }
  setTimeout(() => toast(e ? s.name + ' can now sign in with ' + e : s.name + ' saved · add a Gmail later to open the Student Portal'), 900);
};
/* students added any other way (teacher approval, edit) also land in their teacher's class */
['enrolSave', 'saveEnrol'].forEach(k => { if (typeof window[k] !== 'function') return; const o = window[k]; window[k] = function () { const n = ENROL.length, r = o.apply(this, arguments); if (ENROL.length > n) ENROL.slice(n).forEach(e => V9G.toGroups(e.stu)); return r; }; });
/* office sign-in and staff accounts say Gmail */
V9G._loginHTML = SCH.loginHTML;
if (V9G._loginHTML) SCH.loginHTML = function () { let h = V9G._loginHTML.apply(this, arguments); if (SCH.NEW()) h = h.replace('>Work email<', '>Gmail<').replace('name@finaltouch.academy', 'name@gmail.com'); return h; };
V9G._staffForm = SCH.staffForm;
if (V9G._staffForm) SCH.staffForm = function () {
  const r = V9G._staffForm.apply(this, arguments);
  if (SCH.NEW()) { const e = document.getElementById('sf-e'), l = e && e.closest('.fld') && e.closest('.fld').querySelector('label'); if (l) l.textContent = 'Gmail (used to sign in)'; if (e) e.placeholder = 'name@gmail.com';
    const sel = document.getElementById('sf-r'); if (sel) sel.closest('.fld').insertAdjacentHTML('afterend', `<p class="v9g-n">${ic('info')}They sign in on the Office tab with this Gmail and open the portal of the role you choose. Teachers are added from <b>Teacher Dashboards → Add teacher</b> with their Gmail; students get a Gmail at entry.</p>`); }
  return r;
};
