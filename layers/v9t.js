/* =====================================================================
   V9T · Mentor transfer and the student's mentor journey
   - "Change mentor" keeps a structured history on the enrolment (e.mh): who, when, by whom, why
   - the old mentor stops receiving the student from that moment, the new mentor starts (the server keeps class lists and visibility right)
   - Owner, Admin, the office and the student see the whole journey; a mentor sees only their own part
   ===================================================================== */
const V9T = window.V9T = {};
/* the mentors of one subject, oldest first: [{ mentor, from, to, by, r, cur }] */
V9T.segs = e => {
  const h = (e.mh || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at))), out = [];
  let from = e.start;
  h.forEach((x, i) => { out.push({ mentor: x.from, from, to: x.at, by: i ? h[i - 1].by : '', r: i ? h[i - 1].r : '' }); from = x.at; });
  out.push({ mentor: e.mentor, from, to: e.end || '', by: h.length ? h[h.length - 1].by : '', r: h.length ? h[h.length - 1].r : '', cur: !e.end });
  return out;
};
V9T.html = (sid, own) => {
  const me = ST.role === 'Mentor' ? SCH.mentor() : null;
  const L = ENROL.filter(e => e.stu === sid).sort((a, b) => a.start.localeCompare(b.start));
  const rows = L.map(e => {
    let S = V9T.segs(e); if (me) S = S.filter(x => x.mentor === me); if (!S.length) return '';
    return `<div class="v9t-sub"><b>${esc(progName(e.prog))}</b><div class="v9t-line">${S.map(x => `<div class="v9t-seg ${x.cur ? 'cur' : ''}"><i></i><div><b>${esc(menName(x.mentor))}</b>${x.cur ? '<em>Current</em>' : ''}<small>${esc(SCH.fmtD(x.from))} → ${x.to ? esc(SCH.fmtD(x.to)) : 'now'}</small>${x.by && !me ? `<small class="v9t-why">Moved by ${esc(x.by)}${x.r ? ' · “' + esc(x.r) + '”' : ''}</small>` : ''}</div></div>`).join('')}</div></div>`;
  }).filter(Boolean).join('');
  if (!rows) return '';
  return `<div class="v9t-j"><h4>${ic('repeat')} Mentor journey</h4><p class="sub">${me ? 'Your part of this student’s journey.' : 'Every mentor this student has had, for each subject.'}</p>${rows}</div>`;
};
/* the office's "Change mentor": one confirmed step, recorded, class lists and notifications follow */
V9T.change = (enId, mid) => {
  const e = ENROL.find(x => x.id === enId); if (!e || !mid || e.mentor === mid) return;
  if (!SCH.can('mxfer', 'e')) { toast('Your role is not allowed to change a student’s mentor'); return; }
  const old = e.mentor;
  SCH.confirm({
    kind: 'submit', title: 'Move ' + stuOf(e.stu).name + ' from ' + menName(old) + ' to ' + menName(mid) + '?',
    impact: [menName(mid) + ' sees this student from today: classes, attendance, exams and progress', menName(old) + ' stops receiving new updates for ' + progName(e.prog) + '. Past attendance, marks and approved pay stay with ' + menName(old), 'The student, the Owner and the Admin keep the full mentor history', 'Draft invoices use the new mentor for pay'],
    reason: true, ok: 'Change mentor',
    onOk: r => {
      e.mh = (e.mh || []).concat({ from: old, to: mid, at: TODAY, by: V8.me().name, r: r || '' });
      e.mentor = mid;
      (e.sh = e.sh || []).push({ st: V8.enStatus(e), from: CUR, by: V8.me().name, at: SCH.nowStamp(), r: 'Teacher ' + menName(old) + ' → ' + menName(mid) + (r ? ' · ' + r : '') });
      V8.OX.forEach(o => { if (o.examiners[e.stu] === old && !['Published', 'Archived'].includes(o.status)) o.examiners[e.stu] = mid; });
      V8.sync(e.stu); SCH.reconcile();
      log('Teacher changed', stuOf(e.stu).name + ' · ' + progName(e.prog), menName(old) + ' → ' + menName(mid));
      stuView(e.stu, 'sub'); render(); toast('Mentor changed to ' + menName(mid));
    }
  });
};
V8.subjTeacher = (enId, mid) => { V9T.change(enId, mid); stuView((ENROL.find(x => x.id === enId) || {}).stu, 'sub'); };
/* the journey sits under the subjects in the student profile and in the mentor's student view */
(() => { const sh = V8.subjHTML; V8.subjHTML = sid => sh(sid) + V9T.html(sid); })();
/* and on the student's own home page */
(() => {
  const h = PAGES['sp-home'];
  PAGES['sp-home'] = function () { h.apply(this, arguments); try { const sid = SCH.mySid(), j = V9T.html(sid); if (j && !document.querySelector('#view .v9t-j')) { const pg = document.querySelector('#view .page'); if (pg) pg.insertAdjacentHTML('beforeend', `<div class="card v9t-card">${j}</div>`); } } catch (x) { console.error('journey', x); } };
})();

/* ===== a mentor's own student requests: edit or cancel while they wait for the office ===== */
SCH.pendMine = () => SCH.PEND.filter(p => p.by === SCH.mentor() && p.status === 'Pending');
SCH.pendCancel = id => {
  const p = SCH.PEND.find(x => x.id === id); if (!p || p.status !== 'Pending' || p.by !== SCH.mentor()) return;
  SCH.confirm({ kind: 'delete', title: 'Cancel the request for ' + p.name + '?', impact: ['The office will no longer see this request', 'You can add the student again later'], ok: 'Cancel request',
    onOk: () => { SCH.PEND.splice(SCH.PEND.indexOf(p), 1); SCH.log('Student request cancelled', p.name, 'info'); render(); toast('Request cancelled'); } });
};
SCH.pendEdit = id => {
  const p = SCH.PEND.find(x => x.id === id); if (!p || p.status !== 'Pending' || p.by !== SCH.mentor()) return;
  SCH.newStuForm();
  const set = (i, v) => { const el = document.getElementById(i); if (el && v != null) el.value = v; };
  set('ns-n', p.name); set('ns-g', p.guardian); set('ns-p', String(p.phone || '').replace(/\D/g, '')); set('ns-e', p.gmail); set('ns-c', p.cls); set('ns-b', p.board); set('ns-s', p.gid); set('ns-x', p.note);
  const h = document.querySelector('#sheet h3, #sheet .sh-t'); if (h) h.textContent = 'Edit student request';
  if (window.V9P) V9P.setX(p.phones || []);
  SCH._editPend = id;
};
(() => {
  const s0 = SCH.newStuSave;
  SCH.newStuSave = function () {
    const id = SCH._editPend, old = id && SCH.PEND.find(x => x.id === id), at = old ? SCH.PEND.indexOf(old) : -1;
    if (old) SCH.PEND.splice(at, 1);   /* so the duplicate check does not match the request being edited */
    const n = SCH.PEND.length; s0.apply(this, arguments);
    if (old) { if (SCH.PEND.length === n) SCH.PEND.splice(at, 0, old); else SCH._editPend = null; }
  };
  const c0 = window.closeSheet; if (c0) window.closeSheet = function () { SCH._editPend = null; return c0.apply(this, arguments); };
  /* My Students page: Edit / Cancel next to each waiting request */
  const pg = PAGES['tp-students'];
  PAGES['tp-students'] = function () {
    const r = pg.apply(this, arguments);
    try {
      const mine = SCH.PEND.filter(p => p.by === SCH.mentor());
      document.querySelectorAll('#view .sc-li').forEach(li => {
        const nm = (li.querySelector('b') || {}).textContent, p = mine.find(x => x.name === nm && x.status === 'Pending');
        if (p && !li.querySelector('.v9t-pb')) li.insertAdjacentHTML('beforeend', `<div class="v9t-pb row" style="gap:6px">${SCH.btn('Edit', `SCH.pendEdit('${p.id}')`, { cls: 's', icon: 'pen' })}${SCH.btn('Cancel', `SCH.pendCancel('${p.id}')`, { cls: 's', icon: 'trash' })}</div>`);
      });
    } catch (x) { console.error('pend buttons', x); }
    return r;
  };
})();
