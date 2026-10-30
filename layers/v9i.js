/* =====================================================================
   v9i · owner 29 Oct: take attendance straight from a student's calendar.
   Class days come from the routine (weekly classes of the student's
   subjects); any other day can get an extra class. Click a day → P, A,
   Late, Leave or "No class that day", with a reason where needed.
   ===================================================================== */
const V9I = window.V9I = {};
V9I.groups = sid => SCH.GROUPS.filter(g => g.stu.includes(sid) && g.status === 'Active' && (!SCH.isTeacher() || g.mentor === SCH.mentor()));
V9I.dayInfo = (sid, d) => V9I.groups(sid).map(g => { const k = g.id + '|' + d, r = SCH.ATT[k], x = SCH.ATTX[k] || {}, slots = SCH.slotsOn(d, g.id) || []; return { g, k, r, x, slots, v: r && r.marks[sid], off: x.held && x.held !== 'Held' }; });
/* calendar: scheduled class days are marked even before attendance */
V9F.stuCal = (sid, mo) => {
  const s = stuOf(sid); mo = mo || V9F.SC[sid] || (SCH.TS.date || TODAY).slice(0, 7); V9F.SC[sid] = mo;
  const y = +mo.slice(0, 4), m = +mo.slice(5), days = new Date(y, m, 0).getDate(), lead = (new Date(y, m - 1, 1).getDay() + 1) % 7;
  const c = { P: 0, A: 0, L: 0, E: 0, N: 0, S: 0 }, notes = [];
  const cell = n => {
    const d = mo + '-' + String(n).padStart(2, '0'), I = V9I.dayInfo(sid, d), sch = I.filter(x => x.slots.length), marks = I.filter(x => x.v || x.off);
    marks.forEach(x => { if (x.off) c.N++; else c[x.v]++; const why = x.off ? x.x.heldWhy : (x.x.why || {})[sid]; if (why) notes.push(`<li><b>${SCH.fmtD(d)}</b> · ${esc(x.g.name)} · ${x.off ? 'No class' : SCH.ATT_LBL[x.v]} — ${esc(why)}</li>`); });
    const open = sch.filter(x => !x.v && !x.off); if (open.length && d <= TODAY) c.S++;
    const tip = I.filter(x => x.slots.length || x.v || x.off).map(x => x.g.name + ': ' + (x.off ? 'No class' : x.v ? SCH.ATT_LBL[x.v] : x.slots.length ? (d > TODAY ? 'class ' + x.slots.map(p => p[1]).join(', ') : 'not marked yet') : '') + (x.off ? ' — ' + (x.x.heldWhy || '') : (x.x.why || {})[sid] ? ' — ' + x.x.why[sid] : '')).join(' · ');
    return `<button type="button" class="v9f-d ${d === TODAY ? 'today' : ''} ${marks.length ? 'has' : ''} ${sch.length ? 'sch' : ''} ${open.length && d <= TODAY ? 'todo' : ''} ${d > TODAY ? 'fut' : ''}" ${tip ? `data-tip="${esc(tip)}"` : ''} onclick="V9I.day('${sid}','${d}')" aria-label="${SCH.fmtD(d)}${tip ? ': ' + esc(tip) : ''}"><span>${n}</span><div>${marks.map(x => `<i class="k-${x.off ? 'N' : x.v}">${x.off ? '—' : SCH.ATT_KEY[x.v]}</i>`).join('')}${open.map(() => `<i class="k-S">${d > TODAY ? 'Class' : '?'}</i>`).join('')}</div></button>`;
  };
  const cells = Array.from({ length: days }, (_, i) => cell(i + 1)).join(''), prev = V9F.mAdd(mo, -1), next = V9F.mAdd(mo, 1), G = V9I.groups(sid);
  const week = G.map(g => { const rt = SCH.RT.filter(e => e.gid === g.id); return `<li><b>${esc(g.name)}</b> · ${rt.length ? rt.map(e => SCH.DAYL[e.day].slice(0, 3) + ' ' + SCH.t12(e.start)).join(', ') : 'no weekly class on the routine yet'}</li>`; }).join('');
  sheet('ATTENDANCE CALENDAR · ' + s.id, esc(s.name), `<div class="v9f-ch"><button type="button" class="btn s" onclick="V9F.stuCal('${sid}','${prev}')" aria-label="Previous month">‹</button><b>${mlab(mo)}</b><button type="button" class="btn s" onclick="V9F.stuCal('${sid}','${next}')" aria-label="Next month">›</button></div>
    <div class="v9f-sum" data-notx>${[["P", "Present", "ok"], ["L", "Late", "warn"], ["E", "Leave", "info"], ["A", "Absent", "bad"], ["N", "No class", "n"], ["S", "Not marked", "gold"]].map(x => `<div class="${x[2]}"><b>${dg(c[x[0]])}</b><small>${x[1]}</small></div>`).join('')}</div>
    <p class="v9i-how">${ic('info')}Tap any day to mark attendance. Days with <i class="k-S">?</i> had a class on the routine but nothing is marked yet; <i class="k-S">Class</i> shows the coming classes. A day without a class can get an extra class.</p>
    <div class="v9f-grid">${['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(x => `<div class="h">${x}</div>`).join('')}${'<div class="v9f-d e"></div>'.repeat(lead)}${cells}</div>
    <div class="v9f-box"><h4>Weekly classes (from the routine)</h4><ul class="v9f-ul">${week || '<li>No subject yet.</li>'}</ul><p class="v9i-sm">Class days come from the routine. To change a regular day or time, edit the routine (${SCH.isTeacher() ? 'My Routine' : 'Academics → Routine'}); for a one-off class, tap the day here and add an extra class.</p>${SCH.isTeacher() ? '' : `<button type="button" class="btn s" onclick="closeSheet();go('ac-routine')">${ic('cal')}Open the routine</button>`}</div>
    ${notes.length ? `<div class="v9f-box"><h4>Reasons this month</h4><ul class="v9f-ul">${notes.join('')}</ul></div>` : ''}
    <div class="acts"><button class="btn" type="button" onclick="closeSheet()">Close</button></div>`, true);
};
/* one day: choose the class, then P / A / Late / Leave / No class */
V9I.D = null;
V9I.day = (sid, d) => {
  if (d > TODAY) { toast('This day has not come yet. Attendance can be marked on the day of the class.'); return; }
  const I = V9I.dayInfo(sid, d), s = stuOf(sid); if (!I.length) { toast(s.name + ' has no subject with you yet'); return; }
  const first = I.find(x => x.slots.length) || I[0];
  V9I.D = { sid, d, gid: first.g.id, v: first.v || (first.off ? 'N' : ''), why: first.off ? first.x.heldWhy || '' : ((first.x.why || {})[sid] || ''), late: '' };
  V9I.draw();
};
V9I.draw = () => {
  const D = V9I.D, s = stuOf(D.sid), I = V9I.dayInfo(D.sid, D.d), cur = I.find(x => x.g.id === D.gid) || I[0], late = SCH.isTeacher() && !cur.r && D.d < TODAY;
  const locked = SCH.isTeacher() && cur.r && D.d !== TODAY && !SCH.adminMode(), need = { L: 'Why late? (needed)', E: 'Reason for leave (needed)', A: 'Reason (optional)', N: 'Why was there no class? (needed)' }[D.v];
  V9H.pop(`<div class="v9h-h"><b>${esc(s.name)} · ${SCH.longDay(D.d)}, ${SCH.fmtD(D.d)}</b><small>${cur.slots.length ? 'On the routine · ' + cur.slots.map(p => p[1] + '–' + p[2]).join(', ') : 'No class on the routine this day — saving adds an extra class'}</small><button type="button" class="v9h-x" aria-label="Close" onclick="V9H.popClose()">${ic('x')}</button></div>
    ${I.length > 1 ? `<div class="v9i-gs">${I.map(x => `<button type="button" data-notx class="${x.g.id === cur.g.id ? 'on' : ''}" onclick="V9I.D.gid='${x.g.id}';V9I.D.v='';V9I.D.why='';V9I.draw()">${esc(x.g.name)}${x.slots.length ? ' · routine' : ''}${x.v ? ' · ' + SCH.ATT_LBL[x.v] : x.off ? ' · no class' : ''}</button>`).join('')}</div>` : `<p class="v9i-sm">${esc(cur.g.name)}</p>`}
    ${locked ? `<p class="v9f-note">${ic('lock')}Already saved as ${cur.v ? SCH.ATT_LBL[cur.v] : 'no class'} by ${esc(cur.r.by)}. Teachers cannot change a past day; ask the office.</p><div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Close</button><button class="btn p" type="button" onclick="SCH.attAsk('${cur.k}');V9H.popClose()">Ask office to change</button></div>` : `
    <div class="v9i-opts" role="radiogroup">${[['P', 'Present', 'ok'], ['A', 'Absent', 'bad'], ['L', 'Late', 'warn'], ['E', 'Leave', 'info'], ['N', 'No class that day', 'n']].map(x => `<button type="button" data-notx role="radio" aria-checked="${D.v === x[0]}" class="${x[2]} ${D.v === x[0] ? 'on' : ''}" onclick="V9I.D.v='${x[0]}';V9I.draw()">${x[1]}</button>`).join('')}</div>
    ${need ? fld(need, `<input id="v9i-w" value="${esc(D.why)}" oninput="V9I.D.why=this.value" placeholder="${D.v === 'N' ? 'e.g. teacher ill, holiday' : D.v === 'L' ? 'e.g. traffic, 15 minutes late' : D.v === 'E' ? 'e.g. family programme' : 'optional'}">`) : ''}
    ${D.v === 'N' ? `<p class="v9i-sm">“No class” is for the whole class (${esc(cur.g.name)}), not only ${esc(s.name)}.</p>` : ''}
    ${late ? `<div style="margin-top:8px">${fld('This day has passed — why is it marked now? (needed)', `<input id="v9i-l" value="${esc(D.late)}" oninput="V9I.D.late=this.value" placeholder="e.g. internet was down after class">`)}</div>` : ''}
    <div class="acts"><button class="btn" type="button" onclick="V9H.popClose()">Cancel</button><button class="btn p" type="button" onclick="V9I.save()">Save</button></div>`}`);
};
V9I.save = () => {
  const D = V9I.D, I = V9I.dayInfo(D.sid, D.d), cur = I.find(x => x.g.id === D.gid) || I[0], k = cur.k, s = stuOf(D.sid), had = !!cur.r;
  if (!D.v) { toast('Choose Present, Absent, Late, Leave or No class'); return; }
  if ((D.v === 'L' || D.v === 'E' || D.v === 'N') && D.why.trim().length < 3) { toast('Write the reason'); const w = $('#v9i-w'); if (w) w.focus(); return; }
  if (SCH.isTeacher() && !had && D.d < TODAY && D.late.trim().length < 3) { toast('This day has passed. Write why it is marked now.'); const l = $('#v9i-l'); if (l) l.focus(); return; }
  if (SCH.isTeacher() && had && D.d !== TODAY && !SCH.adminMode()) { toast('Ask the office to change a past day'); return; }
  const go = reason => {
    const x = SCH.ATTX[k] = SCH.ATTX[k] || { held: 'Held', heldWhy: '', moved: '', late: '', why: {} };
    if (!had && D.late) x.late = D.late.trim();
    if (D.v === 'N') { x.held = 'Not held'; x.heldWhy = D.why.trim(); SCH.ATT[k] = { at: SCH.nowStamp(), by: (ME() || {}).name, marks: {}, reason: reason || '' }; }
    else {
      x.held = 'Held'; x.heldWhy = '';
      const r = SCH.ATT[k] && !cur.off ? SCH.ATT[k] : (SCH.ATT[k] = { at: SCH.nowStamp(), by: (ME() || {}).name, marks: {}, reason: '' });
      r.marks[D.sid] = D.v; r.at = SCH.nowStamp(); r.by = (ME() || {}).name; if (reason) r.reason = reason;
      if (D.why.trim()) x.why[D.sid] = D.why.trim(); else delete x.why[D.sid];
    }
    SCH.log(had ? 'Attendance changed' : 'Attendance saved', cur.g.name + ' · ' + SCH.fmtD(D.d) + ' · ' + s.name + ' · ' + (D.v === 'N' ? 'No class' : SCH.ATT_LBL[D.v]) + (cur.slots.length ? '' : ' · extra class') + (reason ? ' · ' + reason : ''), 'ok');
    V9H.popClose(); V9F.stuCal(D.sid, D.d.slice(0, 7)); toast('Saved · ' + s.name + ' · ' + (D.v === 'N' ? 'No class' : SCH.ATT_LBL[D.v]));
    if (['tp-att', 'ac-att'].includes(ST.page)) { SCH.TS.draft = null; }
  };
  if (!SCH.isTeacher() && had && D.d !== TODAY) { V9H.popClose(); } if (!SCH.isTeacher() && had && D.d !== TODAY) SCH.confirm({ kind: 'submit', title: 'Change saved attendance?', body: 'This changes a day that was already saved.', reason: true, ok: 'Save changes', onOk: go });
  else go('');
};
/* the calendar also opens from the student card and the teacher's student list */
if (SCH.stu360) { V9I._s360 = SCH.stu360; SCH.stu360 = function (sid) { V9I._s360.apply(this, arguments); const a = document.querySelector('#sheet .s3-acts.end'); if (SCH.NEW() && a && V9I.groups(sid).length) a.insertAdjacentHTML('afterbegin', `<button type="button" class="btn s" onclick="V9F.stuCal('${sid}')">${ic('cal')}Attendance calendar</button>`); }; }
