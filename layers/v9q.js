/* =====================================================================
   V9Q · A mentor asks the office to change a student: status (Active / Hold ...), edit details, delete
   - nothing changes until the office approves; every request shows on the office "Waiting for approval" queue and in the student's Subjects & Status tab
   - the mentor sees their open requests, can cancel them, and is told the answer
   - the Owner decides per role who may ask (Roles & Permissions → "Teachers ask the office to edit or delete a student")
   - approving a delete moves the student to the Recycle bin exactly like the office's own delete
   ===================================================================== */
const V9Q = window.V9Q = { del: null };
SCH.MODS.push(['stureq', 'Teachers ask the office to edit or delete a student', [], 'ed', 't']);
Object.keys(ROLES).forEach(r => { if (SCH.PERM[r] && SCH.PERM[r].stureq == null) SCH.PERM[r].stureq = r === 'Mentor' ? 'ed' : ''; });
V9Q.can = a => ST.role === 'Mentor' && SCH.can('stureq', a);
V9Q.mine = sid => V8.SREQ.filter(r => r.by === SCH.mentor() && r.sid === sid && r.status === 'Pending');
V9Q.newId = () => 'SR-' + (1 + Math.max(0, ...V8.SREQ.map(r => +((/^SR-(\d+)$/.exec(r.id || '') || [0, 0])[1]))));
V9Q.ok = sid => ST.role === 'Mentor' && V8.myStudents().some(s => s.id === sid);
const KIND = { status: 'Status change', sedit: 'Edit details', sdel: 'Delete' };
V9Q.open = sid => {
  if (!V9Q.ok(sid)) { toast('This student is not in your classes'); return; }
  const s = stuOf(sid), me = SCH.mentor(), subs = ENROL.filter(e => e.stu === sid && e.mentor === me && !e.next), pend = V9Q.mine(sid);
  V8.SUBF.from = 'tp';
  const stat = SCH.can('stusubj', 'p');
  sheet('MY STUDENT · ' + sid, esc(s.name), `${note('The office checks every change before it is made. Until then nothing changes for the student.', 'info')}
    ${pend.length ? `<div class="v9q-pend"><b>Waiting for the office</b>${pend.map(r => `<div class="v9q-p"><span><b>${KIND[r.kind] || 'Request'}</b> · ${esc(V8.reqText(r))}${r.note ? ' · “' + esc(r.note) + '”' : ''}</span><button type="button" class="btn s" onclick="V9Q.cancel('${r.id}','${sid}')">${ic('x')}Cancel</button></div>`).join('')}</div>` : ''}
    <div class="v9q-acts">
      ${stat ? `<div class="v9q-a"><div><b>Change status</b><small>Active, Paused (Hold), Completed, Withdrawn ...</small></div><div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${SCH.btn('Whole student', `V8.subjForm('${sid}','*')`, { cls: 's', icon: 'repeat' })}${subs.map(e => SCH.btn(esc(progName(e.prog)), `V8.subjForm('${sid}','${e.id}')`, { cls: 's', icon: 'repeat' })).join('')}</div></div>` : ''}
      ${V9Q.can('e') ? `<div class="v9q-a"><div><b>Edit details</b><small>Name, class, board, guardian</small></div>${SCH.btn('Edit', `V9Q.editForm('${sid}')`, { cls: 's', icon: 'edit' })}</div>` : ''}
      ${V9Q.can('d') ? `<div class="v9q-a"><div><b>Delete student</b><small>The Owner or an Admin decides. The record goes to the Recycle bin.</small></div>${SCH.btn('Ask to delete', `V9Q.delForm('${sid}')`, { cls: 's bad', icon: 'trash' })}</div>` : ''}
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:14px">${SCH.btn('Close', 'closeSheet()')}</div>`);
};
V9Q.cancel = (id, sid) => {
  const i = V8.SREQ.findIndex(r => r.id === id && r.by === SCH.mentor() && r.status === 'Pending'); if (i < 0) return;
  const r = V8.SREQ[i]; V8.SREQ.splice(i, 1); SCH.log('Request cancelled', stuOf(sid).name + ' · ' + V8.reqText(r), 'info'); V9Q.open(sid); render(); toast('Request cancelled');
};
V9Q.send = (o) => {
  V8.SREQ.push(Object.assign({ id: V9Q.newId(), by: SCH.mentor(), status: 'Pending', at: SCH.nowStamp() }, o));
  SCH.log(o.kind === 'sdel' ? 'Student delete requested' : 'Student edit requested', stuOf(o.sid).name, o.note || '');
  closeSheet(); render(); toast('Sent to the office');
};
V9Q.editForm = sid => {
  if (!V9Q.ok(sid) || !V9Q.can('e')) return; const s = stuOf(sid);
  const boards = (window.V9H && V9H.BOARDS) || ['Cambridge', 'Edexcel', 'National', 'Other'];
  sheet('EDIT REQUEST', esc(s.name), `${note('Change only what is wrong. Fields you leave as they are stay as they are.', 'info')}
    <div class="grid g2" style="margin-top:12px">${fld('Student name', `<input id="v9q-n" maxlength="60" value="${esc(s.name)}">`)}${fld('Class / grade', `<input id="v9q-c" maxlength="30" value="${esc(s.cls || '')}">`)}
    ${fld('Board', `<select id="v9q-b">${opts(['', ...boards].map(b => [b, b || 'Keep as it is']), '')}</select>`, 'Now: ' + esc(s.board || '—'))}${fld('Guardian name', `<input id="v9q-g" maxlength="60" value="${esc(s.guardian || '')}">`)}
    ${fld('Guardian WhatsApp (new number)', '<input id="v9q-p" inputmode="tel" placeholder="Leave empty to keep the number">', 'Any country is fine, e.g. +971 50 123 4567')}</div>
    ${fld('Why? (the office sees this)', '<input id="v9q-r" maxlength="140" placeholder="e.g. spelling was wrong, moved to Grade 7">')}
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px">${SCH.btn('Back', `V9Q.open('${sid}')`)}${SCH.btn('Send to the office', `V9Q.editSave('${sid}')`, { cls: 'p', icon: 'send' })}</div>`);
};
V9Q.editSave = sid => {
  const s = stuOf(sid), patch = {}, v = id => SCH.val(id).trim();
  [['name', 'v9q-n'], ['cls', 'v9q-c'], ['guardian', 'v9q-g']].forEach(([k, id]) => { if (v(id) && v(id) !== (s[k] || '')) patch[k] = v(id); });
  if (v('v9q-b') && v('v9q-b') !== (s.board || '')) patch.board = v('v9q-b');
  if (v('v9q-p')) { const r = window.V9P ? V9P.clean(v('v9q-p')) : { ok: true, num: v('v9q-p') }; if (SCH.err('v9q-p', r.ok ? '' : (r.msg || 'Enter a valid number.'))) return; patch.phone = r.num || v('v9q-p'); }
  if (SCH.err('v9q-n', patch.name !== undefined && patch.name.length < 2 ? 'Write the name.' : !Object.keys(patch).length ? 'Change at least one thing.' : '')) return;
  if (SCH.err('v9q-r', v('v9q-r').length < 3 ? 'Write a short reason.' : '')) return;
  V9Q.send({ sid, kind: 'sedit', patch, note: v('v9q-r') });
};
V9Q.delForm = sid => {
  if (!V9Q.ok(sid) || !V9Q.can('d')) return; const s = stuOf(sid);
  sheet('DELETE REQUEST', esc(s.name), `${note('This only asks the office. If it is approved, ' + esc(s.name) + ' and their subjects, invoices and payments move to the Recycle bin.', 'warn')}
    ${fld('Why should this student be deleted?', '<input id="v9q-r" maxlength="140" placeholder="e.g. added twice by mistake">')}
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px">${SCH.btn('Back', `V9Q.open('${sid}')`)}${SCH.btn('Ask the office', `V9Q.delSave('${sid}')`, { cls: 'p bad', icon: 'send' })}</div>`);
};
V9Q.delSave = sid => { if (SCH.err('v9q-r', SCH.val('v9q-r').trim().length < 3 ? 'Write a short reason.' : '')) return; V9Q.send({ sid, kind: 'sdel', note: SCH.val('v9q-r').trim() }); };

/* how a request reads in the office queue, the student's tab and notifications */
const _rt = V8.reqText;
V8.reqText = r => r.kind === 'sdel' ? 'delete this student' : r.kind === 'sedit' ? 'edit ' + Object.keys(r.patch || {}).map(k => ({ name: 'name', cls: 'class', board: 'board', guardian: 'guardian', phone: 'WhatsApp' }[k] || k)).join(', ') + ' → ' + Object.entries(r.patch || {}).map(([k, v]) => k === 'phone' ? 'new number' : '“' + v + '”').join(', ') : _rt(r);
/* the office answers */
const _do = V8.sreqDo;
V8.sreqDo = function (id, ok) {
  const r = V8.SREQ.find(x => x.id === id);
  if (!r || (r.kind !== 'sedit' && r.kind !== 'sdel')) return _do.apply(this, arguments);
  if (r.status !== 'Pending') return;
  if (ST.role === 'Mentor' || !SCH.can('stusubj', 'p')) { toast('You do not have permission to do this'); return; }
  const s = stuOf(r.sid), done = st => { r.status = st; r.done = SCH.nowStamp(); r.doneBy = V8.me().name; };
  if (!ok) { done('Declined'); SCH.log('Student request declined', (s ? s.name : r.sid) + ' · ' + V8.reqText(r), 'warn'); render(); toast('Declined'); return; }
  if (!s) { done('Declined'); render(); return; }
  if (r.kind === 'sdel') { if (!(window.V9J && V9J.boss())) { toast('Only the Owner or an Admin can delete a student'); return; } V9Q.del = id; V9J.stuDel(r.sid); return; }
  const p = r.patch || {}, keys = ['name', 'cls', 'guardian', 'board', 'phone'].filter(k => p[k]);
  keys.forEach(k => { s[k] = p[k]; });
  (s.notes = s.notes || []).unshift({ d: TODAY, t: 'Details edited (' + keys.join(', ') + ') on the request of ' + SCH.mName(r.by) + '. ' + (r.note || ''), by: V8.me().name });
  done('Approved'); SCH.log('Student details changed', s.name + ' · ' + keys.join(', '), 'ok'); render(); toast(s.name + ' updated');
};
/* an approved delete answers every other open request about that student */
const _tb = SCH.toBin;
SCH.toBin = function (label, desc, list, item) {
  const out = _tb.apply(this, arguments);
  if (list === STUDENTS && item) { V8.SREQ.forEach(q => { if (q.sid === item.id && q.status === 'Pending') { q.status = V9Q.del === q.id ? 'Approved' : 'Declined'; q.done = SCH.nowStamp(); q.doneBy = V8.me().name; } }); V9Q.del = null; }
  return out;
};
/* the office card is about all teacher requests now */
(() => { const f = PAGES['ac-portals']; if (!f) return; PAGES['ac-portals'] = function () { const r = f.apply(this, arguments); const h = document.querySelector('#view .v8-srq .ch h2'); if (h) h.textContent = 'Student and subject changes from teachers'; return r; }; })();

/* My Students: a "Request change" button on every row */
(() => {
  const f = PAGES['tp-students']; if (!f) return;
  PAGES['tp-students'] = function () {
    const out = f.apply(this, arguments);
    if (ST.role !== 'Mentor') return out;
    document.querySelectorAll('#view .tw tbody tr').forEach(tr => {
      const sid = (tr.textContent.match(/STU-\d+/) || [])[0]; if (!sid || !V9Q.ok(sid) || tr.querySelector('.v9q-b')) return;
      const act = tr.querySelector('td.act .row') || tr.querySelector('td.act'); if (!act) return;
      const n = V9Q.mine(sid).length;
      act.insertAdjacentHTML('afterbegin', `<button type="button" class="btn s v9q-b" onclick="event.stopPropagation();V9Q.open('${sid}')">${ic('edit')}Request change${n ? ' · ' + n : ''}</button>`);
    });
    return out;
  };
})();
