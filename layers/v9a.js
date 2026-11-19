/* =====================================================================
   V9A · Attendance log (Owner and Admin)
   One searchable list of every attendance entry teachers submitted, with the lesson taught,
   four summary cards, totals by teacher, and a correction window (change or delete an entry).
   ===================================================================== */
const V9A = window.V9A = { F: { q: '', m: '', d: '', men: '', st: '', gid: '', tab: 'entries', n: 80 } };
V9A.ST = { P: ['Present', 'p-ok'], L: ['Late', 'p-warn'], A: ['Absent', 'p-bad'], E: ['Leave', 'p-info'] };
V9A.can = () => ST.role !== 'Mentor' && ST.role !== 'Student' && SCH.can('att', 'e') && SCH.can('attfix', 'e');
V9A.canDel = () => V9A.can() && SCH.can('att', 'd');
V9A.rows = (skipStatus) => {
  const F = V9A.F, q = F.q.trim().toLowerCase(), m = F.m || CUR, out = [];
  Object.keys(SCH.ATT).forEach(key => {
    const [gid, d] = key.split('|'); if (F.d ? d !== F.d : !d.startsWith(m)) return;
    const g = SCH.grp(gid); if (!g) return; if (F.gid && gid !== F.gid) return; if (F.men && g.mentor !== F.men) return;
    const rec = SCH.ATT[key]; if (!rec || !rec.marks) return;
    Object.keys(rec.marks).forEach(sid => {
      const v = rec.marks[sid]; if (!v) return; if (!skipStatus && F.st && v !== F.st) return;
      const s = stuOf(sid) || { name: sid, id: sid }, note = (rec.notes && rec.notes[sid]) || '';
      if (q && !((s.name || '') + ' ' + sid + ' ' + SCH.mName(g.mentor) + ' ' + g.name + ' ' + (rec.lesson || '') + ' ' + note).toLowerCase().includes(q)) return;
      out.push({ key, gid, d, sid, v, g, s, rec, note, men: g.mentor });
    });
  });
  return out.sort((a, b) => b.d.localeCompare(a.d) || a.g.name.localeCompare(b.g.name) || (a.s.name || '').localeCompare(b.s.name || ''));
};
V9A.stats = rows => {
  const sess = new Set(rows.map(r => r.key)); let p = 0, l = 0, a = 0, e = 0;
  rows.forEach(r => { if (r.v === 'P') p++; else if (r.v === 'L') l++; else if (r.v === 'A') a++; else if (r.v === 'E') e++; });
  const t = p + l + a; return { sess: sess.size, p, l, a, e, tot: rows.length, pc: t ? Math.round((p + l) / t * 100) : null };
};
V9A.csv = () => {
  const rows = V9A.rows(), q = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const t = ['Date,Student ID,Student,Subject,Teacher,Status,Lesson,Note,Submitted'].concat(rows.map(r => [r.d, r.sid, r.s.name, r.g.name, SCH.mName(r.men), (V9A.ST[r.v] || [r.v])[0], r.rec.lesson, r.note, r.rec.at].map(q).join(',')));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + t.join('\n')], { type: 'text/csv' })); a.download = 'attendance-log-' + (V9A.F.d || V9A.F.m || CUR) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
V9A.set = (k, v) => { V9A.F[k] = v; V9A.F.n = 80; V9A.draw(); };
V9A.more = () => { V9A.F.n += 120; V9A.draw(); };
V9A.draw = () => {
  const out = document.getElementById('va-out'); if (!out) return;
  const F = V9A.F, all = V9A.rows(true), rows = F.st ? all.filter(r => r.v === F.st) : all, S = V9A.stats(all), can = V9A.can();
  const card = (cls, ic2, label, big, sub) => `<div class="va-k ${cls}"><div class="va-kh">${ic(ic2)}<span>${label}</span></div><b>${big}</b><small>${sub}</small></div>`;
  let body;
  if (F.tab === 'men') {
    const by = {}; all.forEach(r => { const o = by[r.men] || (by[r.men] = { men: r.men, keys: new Set(), p: 0, l: 0, a: 0, e: 0 }); o.keys.add(r.key); o[r.v.toLowerCase()]++; });
    const list = Object.values(by).map(o => { const t = o.p + o.l + o.a; return Object.assign(o, { cls: o.keys.size, pc: t ? Math.round((o.p + o.l) / t * 100) : null }); }).sort((x, y) => y.cls - x.cls);
    body = table([{ h: 'Teacher', c: 'ttl', f: o => `<b>${esc(SCH.mName(o.men))}</b>` }, { h: 'Classes', r: 1, f: o => dg(o.cls) }, { h: 'Present', r: 1, f: o => dg(o.p + o.l) }, { h: 'Absent', r: 1, f: o => `<span style="color:var(--bad)">${dg(o.a)}</span>` }, { h: 'Leave', r: 1, f: o => dg(o.e) }, { h: 'Rate', f: o => o.pc == null ? '—' : `<div style="min-width:110px"><b class="num" style="color:var(--${SCH.tone(o.pc)})">${o.pc}%</b>${SCH.bar(o.pc, SCH.tone(o.pc))}</div>` }], list, { empty: 'No attendance entries for these filters.' });
  } else if (!rows.length) body = `<div class="tw"><div class="empty">No attendance entries for these filters.</div></div>`;
  else {
    const shown = rows.slice(0, F.n), days = []; shown.forEach(r => { let d = days[days.length - 1]; if (!d || d.d !== r.d) days.push(d = { d: r.d, a: [] }); d.a.push(r); });
    const cnt = {}; rows.forEach(r => cnt[r.d] = (cnt[r.d] || 0) + 1);
    body = `<div class="va-list">${days.map(d => `<div class="va-day"><span>${ic('cal')}${esc(SCH.longDay(d.d).slice(0, 3))}, ${esc(SCH.fmtD(d.d))}</span><em>${dg(cnt[d.d])} ${cnt[d.d] === 1 ? 'entry' : 'entries'}</em></div>` + d.a.map(r => {
      const st = V9A.ST[r.v] || [r.v, ''], absent = r.v === 'A' || r.v === 'E';
      return `<div class="va-row"><div class="va-stu"><b>${esc(r.s.name)}</b><small>${esc(r.sid)}</small></div><div class="va-sub"><span>${esc(r.g.name)}</span><small>${esc(SCH.mName(r.men))}</small></div><div class="va-st">${pill(st[0], 'p-' + (r.v === 'P' ? 'ok' : r.v === 'L' ? 'warn' : r.v === 'A' ? 'bad' : 'info'))}</div><div class="va-ls">${absent ? `<i>No lesson taught.</i>` : esc(r.rec.lesson || '') || '<i>No lesson written.</i>'}${r.note ? `<small>Note: ${esc(r.note)}</small>` : ''}</div><div class="va-at"><span>${esc(r.rec.at || '')}</span>${r.rec.edited ? `<small>Edited ${esc(r.rec.edited)}</small>` : ''}<small>${esc(r.rec.by || '')}</small></div>${can ? `<button type="button" class="va-ed" aria-label="Edit this entry" onclick="V9A.edit('${r.key}','${r.sid}')">${ic('edit')}</button>` : ''}</div>`;
    }).join('')).join('')}</div>${rows.length > shown.length ? `<div style="text-align:center;margin-top:12px">${SCH.btn('Show more (' + dg(rows.length - shown.length) + ' left)', 'V9A.more()', { cls: 's' })}</div>` : ''}`;
  }
  out.innerHTML = `<div class="va-ks">${card('k1', 'check', 'Classes conducted', dg(S.sess), dg(S.tot) + ' marks')}${card('k2', 'students', 'Present', dg(S.p + S.l), (S.pc == null ? '—' : S.pc + '%') + ' attendance' + (S.l ? ' · ' + dg(S.l) + ' late' : ''))}${card('k3', 'alert', 'Absent', dg(S.a), 'marked absent')}${card('k4', 'cal', 'Leave', dg(S.e), 'excused')}</div>
  <div class="va-tabs" role="tablist"><button type="button" role="tab" class="${F.tab === 'entries' ? 'on' : ''}" onclick="V9A.set('tab','entries')">Entries</button><button type="button" role="tab" class="${F.tab === 'men' ? 'on' : ''}" onclick="V9A.set('tab','men')">Totals by teacher</button></div>${body}`;
};
V9A.page = () => {
  const F = V9A.F; if (!F.m) F.m = (SCH.OS && SCH.OS.attM) || CUR;
  const men = MENTORS.map(x => [x.id, x.name]), grp = SCH.GROUPS.filter(g => g.status !== 'Pending').map(g => [g.id, g.name]);
  SCH.page('', '', `<div class="chips" role="tablist" style="margin-bottom:14px">${[['day', 'Day view'], ['month', 'Month view'], ['men', 'Teacher view'], ['log', 'Log']].map(t => `<button type="button" role="tab" class="${t[0] === 'log' ? 'on' : ''}" onclick="SCH.OS.attView='${t[0]}';PAGES['ac-att']()">${t[1]}</button>`).join('')}</div>
  <div class="card flat va-top"><p class="sub" style="margin:0 0 10px">Every class entry teachers submitted, with the lesson taught. Search, filter, and correct or delete an entry if something was entered wrongly.</p>
  <div class="va-bar"><input id="va-q" type="search" placeholder="Student, teacher, subject or lesson" aria-label="Search the attendance log" value="${esc(F.q)}" oninput="V9A.F.q=this.value;V9A.F.n=80;V9A.draw()"><button type="button" class="btn s" onclick="document.getElementById('va-fl').hidden=!document.getElementById('va-fl').hidden">${ic('sliders')}Filters</button><button type="button" class="btn s" onclick="V9A.csv()">${ic('download')}CSV</button><button type="button" class="btn s" onclick="(window.FTA&&FTA.pull?FTA.pull():Promise.resolve()).then(()=>V9A.draw())">${ic('repeat')}Refresh</button></div>
  <div id="va-fl" class="fbar" style="margin-top:12px">${fld('Month', SCH.ym('va-m', F.m, "V9A.F.m=v;V9A.F.d='';var x=document.getElementById('va-d');if(x)x.value='';V9A.set('m',v)"))}${fld('Date', `<input id="va-d" type="date" value="${esc(F.d)}" onchange="V9A.set('d',this.value)">`)}${fld('Teacher', `<select onchange="V9A.set('men',this.value)"><option value="">All teachers</option>${opts(men, F.men)}</select>`)}${fld('Subject', `<select onchange="V9A.set('gid',this.value)"><option value="">All subjects</option>${opts(grp, F.gid)}</select>`)}${fld('Attendance', `<select onchange="V9A.set('st',this.value)">${opts([['', 'Present & absent'], ['P', 'Present'], ['L', 'Late'], ['A', 'Absent'], ['E', 'Leave']], F.st)}</select>`)}</div></div>
  <div id="va-out"></div>`);
  V9A.draw();
};
/* the correction window */
V9A.edit = (key, sid) => {
  const rec = SCH.ATT[key]; if (!rec || !V9A.can()) return; const [gid, d] = key.split('|'), g = SCH.grp(gid), s = stuOf(sid) || { name: sid };
  sheet('ATTENDANCE', 'Edit attendance entry', `<p class="sub" style="margin:0 0 12px"><b>${esc(s.name)}</b> (${esc(sid)}) · ${esc(g.name)} · ${esc(SCH.mName(g.mentor))}<br>Submitted ${esc(rec.at || '')}${rec.by ? ' by ' + esc(rec.by) : ''}</p>
  <div class="grid g2">${fld('Date', `<input id="va-ed-d" type="date" value="${d}" max="${TODAY}">`)}${fld('Attendance', `<select id="va-ed-s">${opts([['P', 'Present'], ['L', 'Late'], ['A', 'Absent'], ['E', 'Leave']], rec.marks[sid])}</select>`)}</div>
  ${fld('Today’s lesson (for the whole class on this day)', `<textarea id="va-ed-l" rows="3" maxlength="400">${esc(rec.lesson || '')}</textarea>`)}${fld('Absence reason / note', `<input id="va-ed-n" maxlength="140" value="${esc((rec.notes && rec.notes[sid]) || '')}">`)}
  <div class="acts" style="justify-content:space-between">${V9A.canDel() ? `<button class="btn" type="button" style="color:var(--bad)" onclick="V9A.del('${key}','${sid}')">Delete</button>` : '<span></span>'}<span class="row" style="gap:8px"><button class="btn" type="button" onclick="closeSheet()">Cancel</button><button class="btn p" type="button" id="va-ed-go" onclick="V9A.save('${key}','${sid}')">Save</button></span></div>`);
};
V9A.save = (key, sid) => {
  const rec = SCH.ATT[key]; if (!rec) return; const [gid, d] = key.split('|'), nd = document.getElementById('va-ed-d').value, v = document.getElementById('va-ed-s').value, lesson = document.getElementById('va-ed-l').value.trim(), note = document.getElementById('va-ed-n').value.trim();
  if (!nd) { SCH.err('va-ed-d', 'Choose a date.'); return; } if (nd > TODAY) { SCH.err('va-ed-d', 'The date cannot be in the future.'); return; }
  const k2 = gid + '|' + nd; if (nd !== d && SCH.ATT[k2] && SCH.ATT[k2].marks && SCH.ATT[k2].marks[sid]) { SCH.err('va-ed-d', 'This student already has an entry for that class on that date.'); return; }
  const b = document.getElementById('va-ed-go'); if (b) { if (b.disabled) return; b.disabled = true; }
  const stamp = SCH.nowStamp(), who = (ME() || {}).name || '';
  let tgt = rec;
  if (nd !== d) {
    delete rec.marks[sid]; if (rec.notes) delete rec.notes[sid];
    const left = Object.keys(rec.marks).length; if (!left) delete SCH.ATT[key];
    tgt = SCH.ATT[k2] || (SCH.ATT[k2] = { at: rec.at, by: rec.by, marks: {}, lesson: rec.lesson });
  }
  tgt.marks[sid] = v; tgt.lesson = lesson; tgt.notes = Object.assign({}, tgt.notes); if (note) tgt.notes[sid] = note; else delete tgt.notes[sid];
  tgt.edited = stamp; tgt.editedBy = who;
  SCH.log('Attendance corrected', (stuOf(sid) || {}).name + ' · ' + SCH.grp(gid).name + ' · ' + SCH.fmtD(nd) + ' · ' + (V9A.ST[v] || [v])[0], 'warn');
  closeSheet(); V9A.draw(); toast('Entry saved');
};
V9A.del = (key, sid) => {
  const rec = SCH.ATT[key]; if (!rec || !V9A.canDel()) return; const g = SCH.grp(key.split('|')[0]), s = stuOf(sid) || { name: sid };
  SCH.confirm({ kind: 'delete', title: 'Delete this attendance entry?', impact: [s.name + ' · ' + g.name + ' · ' + SCH.fmtD(key.split('|')[1]), 'The student’s attendance rate and the teacher’s totals are recalculated', 'This is recorded in the activity log'], reason: true, ok: 'Delete entry',
    onOk: r => { delete rec.marks[sid]; if (rec.notes) delete rec.notes[sid]; if (!Object.keys(rec.marks).length) delete SCH.ATT[key]; SCH.log('Attendance entry deleted', s.name + ' · ' + g.name + ' · ' + SCH.fmtD(key.split('|')[1]) + (r ? ' · ' + r : ''), 'warn'); closeSheet(); V9A.draw(); toast('Entry deleted'); } });
};
/* the Log tab joins Day view / Month view / Teacher view */
(() => {
  const p0 = PAGES['ac-att'];
  PAGES['ac-att'] = function () {
    if (SCH.OS.attView === 'log' && V9A.can()) return V9A.page();
    const r = p0.apply(this, arguments);
    const t = document.querySelector('#view .chips'); if (V9A.can() && t && !t.querySelector('[data-log]')) t.insertAdjacentHTML('beforeend', `<button type="button" role="tab" data-log onclick="SCH.OS.attView='log';PAGES['ac-att']()">Log</button>`);
    return r;
  };
})();
