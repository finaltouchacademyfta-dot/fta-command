/* =====================================================================
   FTA · STUDENT CLASS TIMES (live app)
   Owner's request (10 Nov 2026): class times by student, not only by subject, so a mentor sees at a
   glance which student has class when (like the QIT app's per-student schedule).
   The app already keeps a per-student routine (v9j: routine entries with 'stu'). This layer makes it
   the easy way in:
   1 the weekly routine shows the student's name on their own sessions ("Ayaan Rahman · IGCSE English")
   2 under the weekly routine: every student with their days and times, "Set times" for each, and a
     warning for students who have no class time yet
   3 tapping a student's session opens that student's times (not the general session form)
   4 the class-day window gets a Duration choice (30 – 120 min) that fills the end time
   5 after a new student is saved, the office is taken straight to that student's class times
   Saved as ordinary routine records ('rt' with 'stu'); who may change them is checked on the server
   (fta-policy.js: a mentor only for their own students, the office for all).
   ===================================================================== */
(function () {
  'use strict';
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DL = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const sName = id => (G(() => stuOf(id)) || {}).name || id;
  let done = false;

  function install() {
    if (done || typeof SCH === 'undefined' || !SCH.rtPage || !SCH.rtTitle || !window.V9J || !V9J.add || !window.V9I || !V9I.groups) return false;
    done = true;

    /* 1 · the student's name on their own sessions */
    const _title = SCH.rtTitle;
    SCH.rtTitle = e => {
      if (e && Array.isArray(e.stu) && e.stu.length) { const g = e.gid ? G(() => SCH.grp(e.gid)) : null; return e.stu.slice(0, 2).map(sName).join(', ') + (e.stu.length > 2 ? ' +' + (e.stu.length - 2) : '') + (g ? ' · ' + g.name : ''); }
      return _title(e);
    };

    /* 3 · a student's session opens that student's class times; the New session window asks "which student?" */
    const _form = SCH.rtForm, _save = SCH.rtSave;
    const mm = t => { const [x, y] = String(t || '').split(':').map(Number); return x * 60 + y; };
    const hhmm = n => String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
    SCH.rtForm = function (id, mine, day) {
      const e = id ? SCH.RT.find(x => x.id === id) : null;
      if (e && Array.isArray(e.stu) && e.stu.length === 1 && e.gid) return V9J.add(e.stu[0], e.gid, e.id);
      const r = _form.apply(this, arguments);
      const g = document.getElementById('rt-g'), d = document.getElementById('rt-d'); if (!g || document.getElementById('rt-stu')) return r;
      const gf = g.closest('.fld') || g.parentElement, sEl = document.getElementById('rt-s'), eEl = document.getElementById('rt-e');
      /* which student (one-to-one classes are set per student; "all" keeps one time for the whole class) */
      const sw = document.createElement('div'); sw.id = 'rt-stu-w'; sw.className = 'fld st-fld';
      sw.innerHTML = '<label for="rt-stu">Student</label><select id="rt-stu"></select><small class="st-help">Choose the student whose class this is. "All students" = one time for the whole subject group.</small>';
      gf.insertAdjacentElement('afterend', sw);
      const fillStu = () => {
        const grp = g.value ? G(() => SCH.grp(g.value)) : null, L = grp ? (grp.stu || []).filter(x => (G(() => stuOf(x)) || {}).status !== 'Withdrawn') : [];
        sw.hidden = !grp || !L.length;
        const one = grp && /individual|one/i.test(String(grp.type || grp.kind || '')) || L.length === 1;
        document.getElementById('rt-stu').innerHTML = '<option value="">All students in this subject (' + L.length + ')</option>' + L.map(x => '<option value="' + h(x) + '">' + h(sName(x)) + '</option>').join('');
        if (L.length && (one || L.length <= 6) && !e) document.getElementById('rt-stu').value = L[0];
      };
      g.addEventListener('change', fillStu); fillStu();
      /* duration fills the end time */
      if (sEl && eEl) {
        const dw = document.createElement('div'); dw.className = 'fld st-fld';
        const cur = Math.max(0, mm(eEl.value) - mm(sEl.value)), opts = [30, 45, 60, 75, 90, 120];
        dw.innerHTML = '<label for="rt-dur">Duration</label><select id="rt-dur"><option value="">Custom (use the end time)</option>' + opts.map(o => '<option value="' + o + '"' + (o === cur ? ' selected' : '') + '>' + o + ' min</option>').join('') + '</select>';
        (eEl.closest('.fld') || eEl.parentElement).insertAdjacentElement('afterend', dw);
        const fill = () => { const v = +document.getElementById('rt-dur').value; if (v && sEl.value) eEl.value = hhmm(mm(sEl.value) + v); };
        document.getElementById('rt-dur').onchange = fill; sEl.addEventListener('change', fill); sEl.addEventListener('input', fill);
      }
      /* more days at once (new session only) */
      if (!e && d) {
        const aw = document.createElement('div'); aw.className = 'st-also';
        aw.innerHTML = '<span>Also on</span>' + DL.map(x => '<label><input type="checkbox" value="' + x + '"><b>' + x + '</b></label>').join('') + '<small>Times are Bangladesh time.</small>';
        const host = document.getElementById('rt-cl'); host.insertAdjacentElement('beforebegin', aw);
        const sync = () => aw.querySelectorAll('input').forEach(i => { const same = i.value === d.value; i.disabled = same; if (same) i.checked = false; i.closest('label').classList.toggle('off', same); });
        d.addEventListener('change', sync); sync();
      }
      return r;
    };
    SCH.rtSave = function (id, mine, men) {
      const stu = (document.getElementById('rt-stu') || {}).value || '', grp = (document.getElementById('rt-g') || {}).value || '';
      const also = [...document.querySelectorAll('.st-also input:checked')].map(i => i.value);
      const before = new Set(SCH.RT.map(x => x.id));
      /* the original closes the window only when it saved */
      let saved = false; const cs = window.closeSheet; window.closeSheet = function () { saved = true; return cs.apply(this, arguments); };
      let r; try { r = _save.apply(this, arguments); } finally { window.closeSheet = cs; }
      if (!saved) return r;                                        /* not saved (a clash or a missing time): the window stays open */
      const made = id ? SCH.RT.filter(x => x.id === id) : SCH.RT.filter(x => !before.has(x.id));
      if (!made.length) return r;
      made.forEach(x => { if (grp && stu) x.stu = [stu]; else if (id) delete x.stu; });
      const base = made[0], skipped = [];
      if (!id) also.forEach((day, k) => {
        const v = Object.assign({}, base, { id: 'RT' + (Date.now() + k + 1), day });
        if (G(() => SCH.rtClash(v, '').length)) { skipped.push(SCH.DAYL[day]); return; }
        SCH.RT.push(v);
      });
      if (stu || also.length) { G(() => PAGES[ST.page]()); G(() => toast((stu ? sName(stu) + ' · ' : '') + 'class time saved' + (also.length - skipped.length ? ' for ' + (also.length - skipped.length + 1) + ' days' : '') + (skipped.length ? ' · not on ' + skipped.join(', ') + ' (clash)' : ''))); }
      return r;
    };

    /* 4 · duration choice in the class-day window */
    const _add = V9J.add;
    V9J.add = function (sid, gid, id) {
      const r = _add.apply(this, arguments);
      requestAnimationFrame(() => {
        const a = document.getElementById('v9j-a'), b = document.getElementById('v9j-b'); if (!a || !b || document.getElementById('st-dur')) return;
        const m = t => { const [x, y] = String(t || '').split(':').map(Number); return x * 60 + y; }, cur = Math.max(0, m(b.value) - m(a.value));
        const opts = [30, 45, 60, 75, 90, 120], pick = opts.includes(cur) ? cur : '';
        const wrap = document.createElement('div'); wrap.className = 'st-dur';
        wrap.innerHTML = '<label for="st-dur">Duration</label><select id="st-dur"><option value="">Custom (use the end time)</option>' + opts.map(o => '<option value="' + o + '"' + (o === pick ? ' selected' : '') + '>' + o + ' min</option>') .join('') + '</select><small>Times are Bangladesh time.</small>';
        const box = b.closest('.grid') || b.parentElement; box.insertAdjacentElement('afterend', wrap);
        const fill = () => { const d = +document.getElementById('st-dur').value; if (!d || !a.value) return; const t = m(a.value) + d; b.value = String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
        document.getElementById('st-dur').onchange = fill; a.addEventListener('change', fill); a.addEventListener('input', fill);
      });
      return r;
    };

    /* 2 · every student with their times, under the weekly routine */
    const timesOf = (sid, gid) => { const own = V9J.own(sid, gid); const L = own.length ? own : SCH.RT.filter(e => e.gid === gid && !e.stu); return { own: own.length > 0, L: L.slice().sort((x, y) => DL.indexOf(x.day) - DL.indexOf(y.day) || (x.start < y.start ? -1 : 1)) }; };
    function card(mine) {
      const men = mine ? G(() => SCH.mentor()) : (SCH.RS && SCH.RS.by === 'men' ? SCH.RS.men : null);
      if (!men) return '';
      const groups = (SCH.GROUPS || []).filter(g => g.status === 'Active' && g.mentor === men);
      const rows = [];
      groups.forEach(g => (g.stu || []).forEach(sid => { const s = G(() => stuOf(sid)); if (!s || s.status === 'Withdrawn') return; rows.push({ sid, s, g, t: timesOf(sid, g.id) }); }));
      rows.sort((a, b) => a.s.name.localeCompare(b.s.name) || a.g.name.localeCompare(b.g.name));
      const can = sid => G(() => V9J.canEdit(sid));
      const none = rows.filter(r => !r.t.L.length).length;
      const list = rows.map(r => {
        const chips = r.t.L.map(e => '<span class="st-chip">' + h(SCH.DAYL[e.day].slice(0, 3)) + ' ' + h(SCH.t12(e.start)) + '–' + h(SCH.t12(e.end)) + '</span>').join('');
        return '<div class="st-row' + (r.t.L.length ? '' : ' is-none') + '"><div class="st-who"><b>' + h(r.s.name) + '</b><small>' + h(r.g.name) + (r.s.cls ? ' · ' + h(r.s.cls) : '') + '</small></div><div class="st-when">' + (chips || '<span class="st-none">No class time yet</span>') + (r.t.L.length && !r.t.own ? '<small class="st-tag">class days</small>' : '') + '</div>' +
          (can(r.sid) ? '<div class="st-act"><button type="button" class="btn s' + (r.t.L.length ? '' : ' p') + '" onclick="V9J.add(\'' + r.sid + '\',\'' + r.g.id + '\')">' + (G(() => ic('plus')) || '') + (r.t.L.length ? 'Add time' : 'Set time') + '</button>' + (r.t.L.length ? '<button type="button" class="btn s" onclick="V9J.form(\'' + r.sid + '\')">' + (G(() => ic('edit')) || '') + 'Change</button>' : '') + '</div>' : '') + '</div>';
      }).join('');
      return '<div class="card st-card" data-notx><div class="ch"><div><h2>' + (mine ? 'My students’ class times' : 'Students’ class times · ' + h(G(() => SCH.mName(men)) || '')) + '</h2><p>' + rows.length + ' student' + (rows.length === 1 ? '' : 's') + (none ? ' · <b class="st-warn">' + none + ' without a class time</b>' : '') + ' · each student can have their own days and times</p></div></div>' +
        (rows.length ? '<div class="st-list">' + list + '</div>' : '<p class="st-empty">No students yet. Students appear here once they are enrolled with ' + (mine ? 'you' : 'this teacher') + '.</p>') + '</div>';
    }
    const _page = SCH.rtPage;
    SCH.rtPage = function (mine) {
      const r = _page.apply(this, arguments);
      const add = () => { const pg = document.querySelector('#view .page') || document.getElementById('view'); if (!pg || pg.querySelector('.st-card')) return; const wk = pg.querySelector('.rt-wk'); const host = wk ? wk.closest('.card') : null; const html = card(!!mine); if (!html) return; if (host) host.insertAdjacentHTML('afterend', html); else pg.insertAdjacentHTML('beforeend', html); };
      add(); requestAnimationFrame(add);
      return r;
    };
    /* the routine page follows changes made in the student-times windows */
    const refresh = () => { const p = G(() => ST.page); if (p === 'ac-routine' || p === 'tp-routine') G(() => PAGES[p]()); };
    if (window.V9H && typeof V9H.popClose === 'function') { const o = V9H.popClose; V9H.popClose = function () { const r = o.apply(this, arguments); setTimeout(refresh, 60); return r; }; }
    if (typeof window.closeSheet === 'function') { const o = window.closeSheet; window.closeSheet = function () { const r = o.apply(this, arguments); setTimeout(refresh, 60); return r; }; }

    /* 5 · a new student: straight to their class times (office) */
    if (typeof window.saveStudent === 'function') {
      const o = window.saveStudent;
      window.saveStudent = function () {
        const all = () => (typeof STUDENTS !== 'undefined' ? STUDENTS : []), before = new Set(all().map(s => s.id));
        const r = o.apply(this, arguments);
        setTimeout(() => {
          const s = all().find(x => !before.has(x.id)); if (!s) return;
          if (!V9I.groups(s.id).length || !G(() => V9J.canEdit(s.id))) return;
          G(() => toast('Now set ' + s.name.split(' ')[0] + '’s class days and times'));
          V9J.form(s.id);
        }, 500);
        return r;
      };
    }
    return true;
  }
  if (!install()) { const t = setInterval(() => { if (install()) clearInterval(t); }, 300); setTimeout(() => clearInterval(t), 20000); }
  window.addEventListener('fta:started', () => install());
})();
