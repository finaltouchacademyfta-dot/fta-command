/* =====================================================================
   V9P · phone numbers for everyone
   - any country code is accepted; spaces, hyphens, dots, slashes and brackets are removed as you type or leave the box
   - Bangladesh numbers (01…, 880…, +880…) are kept as 01XXX-XXXXXX; every other country as +<country code><number>
   - "+ Add another number" on the office's student form and on the mentor's new-student form
   ===================================================================== */
const V9P = window.V9P = { X: [] };
V9P.clean = raw => {
  let s = String(raw == null ? '' : raw).trim(); if (!s) return { ok: true, num: '' };
  s = s.replace(/[\s\-().\/_ ‎‏‪-‮]/g, '');
  if (/[^\d+]/.test(s)) return { ok: false, err: 'Use digits only (spaces, hyphens and brackets are fine).' };
  if (/\+.*\+|.\+/.test(s)) return { ok: false, err: 'The + can only be at the start.' };
  let d = s.replace(/\D/g, ''), intl = s[0] === '+';
  if (!intl && d.startsWith('00')) { intl = true; d = d.slice(2); }
  if (intl) {
    if (d.startsWith('880')) { const l = d.slice(3); if (/^1\d{9}$/.test(l)) return { ok: true, num: V9P.bd('0' + l) }; return { ok: false, err: 'Bangladesh numbers have 10 digits after +880.' }; }
    if (d.startsWith('0')) return { ok: false, err: 'A country code cannot start with 0. Example: +44 7700 900123.' };
    if (d.length < 8 || d.length > 15) return { ok: false, err: 'International numbers have 8 to 15 digits including the country code.' };
    return { ok: true, num: '+' + d };
  }
  if (/^01\d{9}$/.test(d)) return { ok: true, num: V9P.bd(d) };
  if (/^8801\d{9}$/.test(d)) return { ok: true, num: V9P.bd(d.slice(2)) };
  if (/^1\d{9}$/.test(d)) return { ok: true, num: V9P.bd('0' + d) };
  if (d.length >= 10 && d.length <= 15 && !d.startsWith('0')) return { ok: true, num: '+' + d };   /* a country code was typed without the + */
  return { ok: false, err: 'Enter a Bangladesh number (01…) or add the country code, e.g. +44 7700 900123.' };
};
V9P.bd = d => d.slice(0, 5) + '-' + d.slice(5);
V9P.many = list => { const out = [], bad = []; (list || []).forEach((v, i) => { if (!String(v || '').trim()) return; const r = V9P.clean(v); if (!r.ok) bad.push({ i, err: r.err }); else if (!out.includes(r.num)) out.push(r.num); }); return { out, bad }; };
V9P.drawX = () => {
  const el = document.getElementById('ns-ph'); if (!el) return;
  el.innerHTML = V9P.X.map((v, i) => `<div class="v9h-phr"><input inputmode="tel" placeholder="Another number, any country, e.g. +44 7700 900123" value="${esc(v)}" oninput="V9P.X[${i}]=this.value" aria-label="Extra number ${i + 1}"><button type="button" class="btn s" aria-label="Remove this number" onclick="V9P.X.splice(${i},1);V9P.drawX()">${ic('x')}</button></div>`).join('');
};
V9P.addX = v => { V9P.X.push(v || ''); V9P.drawX(); const i = document.querySelectorAll('#ns-ph input'); if (i.length) i[i.length - 1].focus(); };
V9P.setX = a => { V9P.X = (a || []).slice(); V9P.drawX(); };

/* clean a number when the person leaves the box */
document.addEventListener('focusout', e => {
  const t = e.target; if (!t || !t.matches || !t.matches('#ns-p,#nf-p,#mf-p,#v9h-ph input,#ns-ph input,#mf-ph input,input[data-f="phone"],input[data-f="gphone"]')) return;
  const r = V9P.clean(t.value); if (r.ok && r.num && t.value !== r.num) { t.value = r.num; t.dispatchEvent(new Event('input', { bubbles: true })); }
}, true);

/* mentor's new-student form: international + extra numbers */
(() => {
  const f0 = SCH.newStuForm;
  SCH.newStuForm = function () {
    const r = f0.apply(this, arguments); V9P.X = [];
    const p = document.getElementById('ns-p');
    if (p && !document.getElementById('ns-ph')) { p.placeholder = '01XXXXXXXXX or +44 7700 900123'; p.closest('.fld').insertAdjacentHTML('beforeend', `<div id="ns-ph"></div><button type="button" class="v9h-add" onclick="V9P.addX()">${ic('plus')}Add another number</button>`); }
    return r;
  };
  /* same checks as before, with any country code, and the extra numbers travel with the request */
  SCH._newStuSaveV8 = () => {
    const n = SCH.val('ns-n'), e = SCH.val('ns-e').toLowerCase(), pr = V9P.clean(SCH.val('ns-p'));
    let bad = SCH.err('ns-n', n.length < 3 ? 'Enter the student’s full name.' : '');
    bad = SCH.err('ns-p', !pr.ok ? pr.err : !pr.num ? 'Enter the guardian’s WhatsApp number.' : '') || bad;
    bad = SCH.err('ns-e', e && !/^[^\s@]+@gmail\.com$/.test(e) ? 'Use a Gmail address, or leave it empty.' : '') || bad;
    const ex = V9P.many(V9P.X); if (ex.bad.length) { bad = true; toast('Extra number ' + (ex.bad[0].i + 1) + ': ' + ex.bad[0].err); const el = document.querySelectorAll('#ns-ph input')[ex.bad[0].i]; if (el) el.focus(); }
    if (bad) return;
    const p = pr.num, d = SCH.dupStu(n, p, e); if (d) { SCH.err('ns-n', 'This student is already on record' + (d.id ? ' (' + d.id + ')' : ' and waiting for approval') + '. Ask the office to add them to your class.'); return; }
    SCH.PEND.unshift({ id: 'NEW-' + Date.now(), name: n, guardian: SCH.val('ns-g'), phone: p, phones: ex.out.filter(x => x !== p), gmail: e, cls: SCH.val('ns-c'), board: SCH.val('ns-b'), gid: SCH.val('ns-s'), by: SCH.mentor() || 'office', at: TODAY, note: SCH.val('ns-x'), status: 'Pending' });
    SCH.log('New student sent for approval', n, 'info'); closeSheet(); V9P.X = []; PAGES[ST.page](); toast('Sent to the office for approval');
  };
  /* approval: the extra numbers go onto the student record */
  const pd = SCH.pendDo;
  SCH.pendDo = function (id) {
    const c = SCH.confirm;
    SCH.confirm = function (o) {
      if (o && o.ok === 'Approve' && typeof o.onOk === 'function') {
        const k = o.onOk; o.onOk = function () {
          const r = k.apply(this, arguments), p = SCH.PEND.find(x => x.id === id), s = p && STUDENTS.find(x => x.id === p.stuId);
          if (s && p.phones && p.phones.length) s.phones = Array.from(new Set((s.phones || []).concat(p.phones)));
          return r;
        };
      }
      return c.apply(this, arguments);
    };
    try { return pd.apply(this, arguments); } finally { SCH.confirm = c; }
  };
})();

/* the office's student form: same checks on Save */
(() => {
  const s0 = window.saveStudent; if (typeof s0 !== 'function') return;
  window.saveStudent = function () {
    const pe = document.getElementById('nf-p');
    if (pe) {
      const pr = V9P.clean(pe.value); if (!pr.ok) { toast('Contact number: ' + pr.err); pe.focus(); return; }
      const ex = (window.V9H && V9H.F && V9H.F.phones) ? V9P.many(V9H.F.phones) : { out: [], bad: [] };
      if (ex.bad.length) { toast('Extra number ' + (ex.bad[0].i + 1) + ': ' + ex.bad[0].err); const el = document.querySelectorAll('#v9h-ph input')[ex.bad[0].i]; if (el) el.focus(); return; }
      if (pr.num) pe.value = pr.num; if (window.V9H && V9H.F) V9H.F.phones = ex.out.filter(x => x !== pr.num);
    }
    return s0.apply(this, arguments);
  };
})();

/* the office's teacher form: any country, extra numbers */
V9P.M = [];
V9P.drawM = () => { const el = document.getElementById('mf-ph'); if (!el) return; el.innerHTML = V9P.M.map((v, i) => `<div class="v9h-phr"><input inputmode="tel" placeholder="Another number, any country" value="${esc(v)}" oninput="V9P.M[${i}]=this.value" aria-label="Extra number ${i + 1}"><button type="button" class="btn s" aria-label="Remove this number" onclick="V9P.M.splice(${i},1);V9P.drawM()">${ic('x')}</button></div>`).join(''); };
V9P.addM = v => { V9P.M.push(v || ''); V9P.drawM(); const i = document.querySelectorAll('#mf-ph input'); if (i.length) i[i.length - 1].focus(); };
(() => {
  const f0 = SCH.menForm;
  SCH.menForm = function (id) {
    const r = f0.apply(this, arguments), m = id ? MENTORS.find(x => x.id === id) : null; V9P.M = (m && m.phones || []).slice();
    const p = document.getElementById('mf-p');
    if (p && !document.getElementById('mf-ph')) { p.placeholder = '01XXXXXXXXX or +44 7700 900123'; p.closest('.fld').insertAdjacentHTML('beforeend', `<div id="mf-ph" style="display:grid;gap:6px;margin-top:6px"></div><button type="button" class="v9h-add" onclick="V9P.addM()">${ic('plus')}Add another number</button>`); V9P.drawM(); }
    return r;
  };
  SCH.menSave = id => {
    const n = SCH.val('mf-n'), e = SCH.val('mf-e').toLowerCase(), pr = V9P.clean(SCH.val('mf-p')), st = SCH.val('mf-st');
    let bad = SCH.err('mf-n', n.length < 3 ? 'Enter the full name.' : MENTORS.some(m => m.id !== id && m.name.toLowerCase() === n.toLowerCase()) ? 'Someone with this name already exists.' : '');
    bad = SCH.err('mf-e', !/^[^\s@]+@gmail\.com$/.test(e) ? 'Enter a Gmail address.' : MENTORS.some(m => m.id !== id && m.gmail === e) ? 'This Gmail is already used by another teacher.' : '') || bad;
    bad = SCH.err('mf-p', !pr.ok ? pr.err : !pr.num ? 'Enter the teacher’s WhatsApp number.' : '') || bad;
    const ex = V9P.many(V9P.M); if (ex.bad.length) { bad = true; toast('Extra number ' + (ex.bad[0].i + 1) + ': ' + ex.bad[0].err); }
    if (bad) return;
    const phones = ex.out.filter(x => x !== pr.num); let m;
    if (id) { m = MENTORS.find(x => x.id === id); Object.assign(m, { name: n, gmail: e, phone: pr.num, phones, subjects: SCH.val('mf-s'), status: st }); }
    else { m = { id: 'MEN-' + String(1 + MENTORS.length).padStart(2, '0'), name: n, gmail: e, phone: pr.num, phones, subjects: SCH.val('mf-s'), join: TODAY, status: st, model: 'fixed', rate: 0, eff: TODAY, pay: '', notes: 'Pay rule to be set by the Owner' }; MENTORS.push(m); }
    let L = SCH.login(m.id); if (!L) { L = { tid: 'FTA-T' + String(1 + SCH.LOGINS.length).padStart(2, '0'), mentor: m.id, status: 'Active', _c: SCH.newCode(), created: SCH.fmtD(TODAY), last: '', device: '', tries: 0, lockUntil: 0, sessions: 0 }; SCH.LOGINS.push(L); }
    L.gmail = e; L.method = 'Gmail'; if (st === 'Inactive') { L.status = 'Disabled'; L.sessions = 0; } else if (L.status === 'Disabled') L.status = 'Active';
    SCH.log(id ? 'Teacher changed' : 'Teacher added', n + ' · ' + e + ' · ' + st, 'ok'); V9P.M = []; closeSheet(); PAGES[ST.page](); toast(id ? 'Saved' : n + ' can now sign in with ' + e);
  };
})();
