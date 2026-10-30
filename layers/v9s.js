/* =====================================================================
   v9s · owner 29 Oct: the teacher's share can be set per student
   (Teacher profile → Students & share). Owner / Admin only. It counts
   from the chosen month onward, never rewrites paid or locked payroll,
   and the payroll lines, the profile split and the teacher's own view
   all follow it.
   ===================================================================== */
const V9S = window.V9S = { SH: {} };      // 'mid|stu|prog' -> { pct, from, by, at, reason }
V9S.k = (mid, stu, prog) => mid + '|' + stu + '|' + prog;
V9S.can = () => ['Owner', 'Admin'].includes(ST.role) && !SCH.preview;
V9S._lines = payrollLines;
payrollLines = function (mid, m) {
  const L = V9S._lines.apply(this, arguments);
  if (!Object.keys(V9S.SH).length) return L;
  INVOICES.filter(i => i.month === m && i.status === 'Approved').forEach(inv => inv.items.forEach(it => {
    if (it.mentor !== mid || it.batch) return;
    const o = V9S.SH[V9S.k(mid, inv.stu, it.prog)]; if (!o || m < o.from) return;
    const who = stuOf(inv.stu).name + ' · ' + progName(it.prog), ln = L.find(x => x.who === who); if (!ln) return;
    const net = it.fee - it.disc; ln.amt = Math.round(net * o.pct / 100); ln.method = 'Custom share'; ln.calc = o.pct + '% × ' + money(net) + ' (set by ' + o.by + ')'; ln.base = 'Agreed fee ' + money(net);
  }));
  return L;
};
/* payroll months that are still open follow the new share */
V9S.recalc = (mid, from) => {
  Object.keys(PAYROLL).forEach(m => {
    const r = PAYROLL[m]; if (m < from || !r || r.status === 'Paid' || (typeof locked === 'function' && locked(m))) return;
    const it = r.items.find(i => i.mentor === mid); if (!it) return;
    it.lines = payrollLines(mid, m); it.gross = sum(it.lines, l => l.amt);
  });
  if (typeof movements === 'function') MOVES = movements();
};
/* the profile's split uses the same numbers as payroll */
V9S._share = V8.share;
V8.share = (mid, sel) => {
  const R = V9S._share(mid, sel);
  R.forEach(r => {
    const o = !r.batch && V9S.SH[V9S.k(mid, r.stu, r.prog)]; if (!o) return;
    const who = stuOf(r.stu).name + ' · ' + progName(r.prog);
    r.t = sum(r.months, m => { const ln = payrollLines(mid, m).find(x => x.who === who); return ln ? ln.amt : 0; });
    r.a = r.fee - r.t; r.tp = r.fee ? r.t / r.fee * 100 : null; r.custom = o;
  });
  return R;
};
/* edit buttons in the Students & share table */
V9S._tprof = V8.tprof;
V8.tprof = (mid, tab) => {
  V9S._tprof(mid, tab);
  if ((tab || V8.TP.tab) !== 'stu' || !V8.shareSee()) return;
  const sel = (V8.MP['tp-' + mid] || {}).sel || [CUR], R = V8.share(mid, sel), men = MENTORS.find(x => x.id === mid);
  document.querySelectorAll('#sheet .v8-tpt tbody tr').forEach(tr => {
    const sid = ((tr.getAttribute('onclick') || '').match(/STU-\d+/) || [])[0], td = tr.children; if (!sid || td.length < 6) return;
    const pn = td[1].textContent.replace(/ · batch$/, '').trim(), r = R.find(x => x.stu === sid && progName(x.prog) === pn); if (!r || r.batch) return;
    const o = V9S.SH[V9S.k(mid, sid, r.prog)];
    td[5].insertAdjacentHTML('beforeend', `<span class="v9s-c">${o ? `<span class="v9s-tag" data-tip="Custom share from ${esc(mlab(o.from))}, set by ${esc(o.by)}">Custom ${o.pct}%</span>` : ''}${V9S.can() ? `<button type="button" class="v9s-e" data-tip="Change this teacher’s share for ${esc(stuOf(sid).name)}" onclick="event.stopPropagation();V9S.form('${mid}','${sid}','${r.prog}')">${ic('edit')}${o ? 'Change' : 'Set %'}</button>` : ''}</span>`);
  });
  const tw = document.querySelector('#sheet .v8-tpt'); if (tw && V9S.can()) tw.closest('.tw').insertAdjacentHTML('beforebegin', `<p class="v9s-hint">${ic('info')}Tap <b>Set %</b> next to a student to give this teacher a different share for that student. Current rule: ${esc(V8.rule(men))}.</p>`);
};
V9S.form = (mid, sid, prog) => {
  if (!V9S.can()) { toast('Only the Owner or an Admin can change a teacher’s share'); return; }
  const men = MENTORS.find(x => x.id === mid), s = stuOf(sid), en = ENROL.find(e => e.stu === sid && e.prog === prog && e.mentor === mid) || ENROL.find(e => e.stu === sid && e.prog === prog);
  const fee = en ? feeFor(en, CUR) - (en.disc || 0) : 0, o = V9S.SH[V9S.k(mid, sid, prog)];
  const nowLn = payrollLines(mid, CUR).find(x => x.who === s.name + ' · ' + progName(prog)), nowT = nowLn ? nowLn.amt : 0, nowP = fee ? Math.round(nowT / fee * 1000) / 10 : 0;
  const months = MONTHS.filter(m => m >= CUR || (PAYROLL[m] && PAYROLL[m].status !== 'Paid' && !(typeof locked === 'function' && locked(m))));
  sheet('TEACHER SHARE · ' + men.name, esc(s.name) + ' · ' + esc(progName(prog)), `<div class="v9-pp"><div><small>Monthly fee</small><b class="num">${money(fee)}</b></div><div><small>Now (${esc(MODELS[men.model])})</small><b class="num">${money(nowT)}</b><small>${nowP}% to teacher</small></div><div class="now"><small>Teacher gets</small><b class="num" id="v9s-t">—</b></div><div><small>Academy keeps</small><b class="num" id="v9s-a">—</b></div></div>
    <div class="grid g2" style="margin-top:12px">${fld('Teacher share (%)', `<input id="v9s-p" type="number" min="0" max="100" step="0.5" value="${o ? o.pct : nowP}">`, 'Percent of this student’s agreed monthly fee')}${fld('Counts from', `<select id="v9s-f">${opts(months.map(m => [m, mlab(m) + (PAYROLL[m] ? ' · payroll ' + PAYROLL[m].status : '')]), o ? o.from : CUR)}</select>`, 'Paid and locked months never change')}</div>
    <div style="margin-top:10px">${fld('Reason', `<input id="v9s-r" placeholder="e.g. agreed 60% for this student" value="${o ? esc(o.reason || '') : ''}">`)}</div>
    <div class="acts">${o ? `<button class="btn d" type="button" onclick="V9S.clear('${mid}','${sid}','${prog}')">Back to the normal rule</button>` : ''}<button class="btn" type="button" onclick="V8.tprof('${mid}','stu')">Cancel</button><button class="btn p" type="button" onclick="V9S.save('${mid}','${sid}','${prog}',${fee})">Save share</button></div>`);
  const p = $('#v9s-p'), draw = () => { const v = Math.max(0, Math.min(100, +p.value || 0)), t = Math.round(fee * v / 100); $('#v9s-t').textContent = money(t) + ' · ' + v + '%'; $('#v9s-a').textContent = money(fee - t) + ' · ' + (Math.round((100 - v) * 10) / 10) + '%'; };
  p.addEventListener('input', draw); draw();
};
V9S.save = (mid, sid, prog, fee) => {
  if (!V9S.can()) { toast('Only the Owner or an Admin can change a teacher’s share'); return; }
  const v = +$('#v9s-p').value, from = $('#v9s-f').value, reason = $('#v9s-r').value.trim();
  if (!(v >= 0 && v <= 100)) { toast('Share must be between 0 and 100%'); return; }
  if (!reason) { toast('Write a short reason'); $('#v9s-r').focus(); return; }
  V9S.SH[V9S.k(mid, sid, prog)] = { pct: Math.round(v * 10) / 10, from, by: ME().name, at: TODAY, reason };
  V9S.recalc(mid, from); log('Teacher share changed', menName(mid) + ' · ' + stuOf(sid).name + ' · ' + progName(prog), v + '% from ' + mlab(from) + ' · ' + reason);
  toast('Saved · ' + menName(mid) + ' gets ' + v + '% for ' + stuOf(sid).name); render(); V8.tprof(mid, 'stu');
};
V9S.clear = (mid, sid, prog) => {
  if (!V9S.can()) return; const o = V9S.SH[V9S.k(mid, sid, prog)]; if (!o) return;
  delete V9S.SH[V9S.k(mid, sid, prog)]; V9S.recalc(mid, o.from); log('Teacher share reset', menName(mid) + ' · ' + stuOf(sid).name, 'back to ' + MODELS[MENTORS.find(x => x.id === mid).model]);
  toast('Back to the normal rule'); render(); V8.tprof(mid, 'stu');
};
