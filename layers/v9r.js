/* =====================================================================
   V9R · Roles & Permissions: the Owner can switch every cell, for every part of the app
   - all five actions (View, Add, Edit, Delete, Approve) are open for every part, not only the ones the app first offered
   - a cell the Owner switches is remembered as a hand-made choice (SCH.PERM._set) and the SERVER enforces it:
       ticked = allowed even where the built-in rules said no · unticked = refused even where they said yes
   - sub-features (e.g. "change a student's mentor") follow their parent part until the Owner sets them on their own
   ===================================================================== */
const V9R = window.V9R = {};
/* sub-features: [key, label, parent part, parent letter] */
V9R.SUBS = [['mxfer', 'Students · change a mentor', 'stu', 'e'], ['attfix', 'Attendance · correct or delete a log entry', 'att', 'e']];
V9R.SUBS.forEach(x => { if (!SCH.MODS.some(m => m[0] === x[0])) SCH.MODS.push([x[0], x[1], ['students'], 'e', 'o']); });
V9R.isSub = k => V9R.SUBS.some(x => x[0] === k);
(() => {
  const can0 = SCH.can;
  SCH.can = function (mod, a) {
    const sub = V9R.SUBS.find(x => x[0] === mod);
    if (sub && ST.role !== 'Owner' && ((SCH.PERM[ST.role] || {})[mod] == null)) return can0.call(this, sub[2], sub[3]);
    return can0.apply(this, arguments);
  };
})();
SCH.PERM._set = SCH.PERM._set || {};
/* every cell can be switched */
(() => {
  const roles = PAGES['ac-roles'];
  PAGES['ac-roles'] = function () {
    const keep = SCH.MODS.map(m => m[3]);
    SCH.MODS.forEach(m => { if (!V9R.isSub(m[0]) && m[3].length < 5) m[3] = 'vaedp'; });
    try { return roles.apply(this, arguments); } finally { SCH.MODS.forEach((m, i) => { m[3] = keep[i]; }); V9R.after(); }
  };
})();
V9R.after = () => {
  /* a sub-feature that has no choice of its own shows what its parent part allows */
  V9R.SUBS.forEach(x => { const P0 = SCH.PERM[SCH.OS.role] || {}; if (P0[x[0]] != null) return;
    const b = [...document.querySelectorAll('#view .sc-mat .sc-chk')].find(e => e.getAttribute('aria-label') === 'Edit ' + x[1]); if (b) b.setAttribute('aria-checked', String((P0[x[2]] || '').includes(x[3]))); });
  const r = SCH.OS.role, set = SCH.PERM._set || {}, n = Object.keys(set).filter(k => k.startsWith(r + '|')).length;
  const card = document.querySelector('#view .sc-mat'); if (!card) return;
  const host = card.closest('.sc-scroll'); if (!host || host.parentElement.querySelector('.v9r-note')) return;
  host.insertAdjacentHTML('beforebegin', `<div class="v9r-note"><span>${ic('info')}Every box can be switched. A box you switch by hand is enforced by the server, not only hidden in the app.${n ? ' <b>' + n + ' hand-made ' + (n === 1 ? 'choice' : 'choices') + '</b> for this role.' : ''}</span>${n && ST.role === 'Owner' && r !== 'Owner' ? `<button type="button" class="btn s" onclick="V9R.reset('${esc(r)}')">Back to the standard rules</button>` : ''}</div>`);
};
/* a hand-made choice is flagged so the server knows it is deliberate */
(() => {
  const ps = SCH.permSet;
  SCH.permSet = function (r, mod, a) {
    if (ST.role !== 'Owner') { toast('Only the Owner can change permissions'); return; }
    SCH.PERM._set = SCH.PERM._set || {}; SCH.PERM._set[r + '|' + mod + '|' + a] = 1;
    const sub = V9R.SUBS.find(x => x[0] === mod), P0 = SCH.PERM[r];
    if (sub && P0 && P0[mod] == null) P0[mod] = ((P0[sub[2]] || '').includes(sub[3]) ? sub[3] : '');   /* start from what the parent part allows */
    return ps.apply(this, arguments);
  };
})();
V9R.reset = r => {
  if (ST.role !== 'Owner') return;
  SCH.confirm({ kind: 'submit', title: 'Put ' + (r === 'Mentor' ? 'Teacher' : r) + ' back to the standard rules?', impact: ['Every hand-made choice for this role is removed', 'The role’s boxes go back to the standard setting'], ok: 'Reset',
    onOk: () => { const set = SCH.PERM._set || {}; Object.keys(set).forEach(k => { if (k.startsWith(r + '|')) delete set[k]; }); SCH.seedPerm(r); SCH.syncPages(r); SCH.log('Permissions reset', r, 'warn'); PAGES['ac-roles'](); toast('Back to the standard rules'); } });
};

/* ===== "New mentor" is on the Mentors page in every build, for anyone whose role may add teachers ===== */
(() => {
  const pm = PAGES.mentors;
  PAGES.mentors = function () {
    const r = pm.apply(this, arguments);
    try {
      if (typeof SCH.menForm === 'function' && ST.role !== 'Mentor' && ST.role !== 'Student' && SCH.can('tea', 'a') && !document.getElementById('fx-newmen')) {
        const html = `<button type="button" class="btn p" id="fx-newmen" onclick="SCH.menForm()">${ic('plus')}New mentor</button>`;
        const rep = [...document.querySelectorAll('#view button')].find(b => /^\s*Report\s*$/.test(b.innerText));
        if (rep) rep.insertAdjacentHTML('afterend', html); else { const v = document.querySelector('#view .page') || document.querySelector('#view'); if (v) v.insertAdjacentHTML('afterbegin', `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">${html}</div>`); }
      }
    } catch (e) { console.error('new mentor button', e); }
    return r;
  };
})();
