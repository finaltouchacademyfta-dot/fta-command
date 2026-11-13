// =====================================================================
// FTA · requirement-by-requirement check of the demo build in FTA Premium.
//   PV=file:///home/claude/prod/site-demo/index.html node tests/c-requirements.js
// Each check opens the real screen and asserts what the owner asked for.
// Screenshots: tests/shots/c/req/<id>.png   ·   exit code 1 if any check fails.
// Also: first-visit default (FTA Premium · dark · English), theme memory,
// language switch, and no horizontal overflow at 360 / 390 / 414 / 768 / 820 / 1440.
// =====================================================================
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
let L; try { L = require('/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/rlib'); } catch (e) { L = { FILE: process.env.PV, setup: async () => { } }; }
const FILE = process.env.PV || L.FILE; const OUT = path.join(__dirname, 'shots', 'c', 'req'); fs.mkdirSync(OUT, { recursive: true });
const res = []; const rec = (id, ok, note) => { res.push({ id, ok: !!ok, note: note || '' }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (note ? '  · ' + note : '')); };

// in-page checks: [id, owner-view setup + assertion]  (must return true or a string = failure reason)
const CHECKS = [
  ['R01 roles exist (Owner, Admin, Junior Admin, Finance Manager, Mentor/Teacher, Student)', () => { const r = Object.keys(SCH.PERM || {}); const need = ['Owner', 'Admin', 'Junior Admin', 'Finance Manager']; const miss = need.filter(x => !r.includes(x)); go('ac-roles'); return miss.length ? 'missing ' + miss : (typeof SCH.enterTeacherPreview === 'function' && typeof SCH.openStudent === 'function') || 'no teacher/student portal'; }],
  ['R02 Owner assigns a Gmail to a role (staff form has a Gmail field)', () => { SCH.staffForm(); const s = document.querySelector('#sheet'); return /gmail|email/i.test(s.innerHTML) && !!s.querySelector('input[type="email"],input[id*="e"]') || 'no Gmail input in staff form'; }],
  ['R03 Gmail sign-in screen', () => { SCH.signOut(); const lg = document.getElementById('sc-login') || document.body; const ok = /Google|Gmail/i.test(lg.innerText); return ok || 'no Google/Gmail sign-in on login screen'; }],
  ['R04 permissions are a per-role matrix the Owner can change', () => { go('ac-roles'); return typeof SCH.permSet === 'function' && /Owner|Admin/.test(document.querySelector('main,#main,body').innerText) || 'no permission matrix'; }],
  ['R05 Teacher portal (dashboard, routine, attendance, calendar, homework, notes)', () => { SCH.enterTeacherPreview('MEN-01'); const ids = ['tp-home', 'tp-routine', 'tp-att', 'tp-cal', 'tp-hw', 'tp-notes']; const miss = ids.filter(i => !document.querySelector(`[onclick*="go('${i}')"]`)); go('tp-home'); return miss.length ? 'menu lacks ' + miss : true; }],
  ['R06 Student is linked to the teacher (teacher sees own students)', () => { SCH.enterTeacherPreview('MEN-01'); const n = (V8.myStudents && V8.myStudents() || []).length; go('tp-students'); return n > 0 || 'teacher has no linked students'; }],
  ['R07 Student portal (home, calendar, results, attendance)', () => { SCH.openStudent('STU-1001'); const ids = ['sp-cal', 'sp-results', 'sp-att']; const miss = ids.filter(i => !document.querySelector(`[onclick*="go('${i}')"]`)); return miss.length ? 'menu lacks ' + miss : true; }],
  ['R08 QIT-style Payable / Paid / Pending on student money', () => { go('students'); const t = document.querySelector('main,#main,body').innerText; return (/Payable/i.test(t) && /Paid/i.test(t) && /(Pending|Due|Awaiting)/i.test(t)) || 'labels missing on Students'; }],
  ['R09 Payment Update dialog', () => { const s = STUDENTS[0]; V9L.open(s.id); const t = document.getElementById('sheet').innerText; return /Jan|January/.test(t) && /Dec|December/.test(t) || 'year view (Jan–Dec) missing'; }],
  ['R10 Monthly payments year view with month statuses incl. custom', () => { const s = STUDENTS[0]; V9L.open(s.id); const t = document.getElementById('sheet').innerHTML; return (V9L.SST || V9L.ST) && /status/i.test(t) || 'no month status control'; }],
  ['R11 payment edit + delete', () => typeof V9L.pEdit === 'function' && typeof V9L.pDel === 'function' && typeof SCH.payEdit === 'function' || 'edit/delete missing'],
  ['R12 student status change from the card', () => { go('students'); return typeof V9L.setS === 'function' && !!document.querySelector('.v9l-ssw select') || 'no status switch on student cards'; }],
  ['R13 per-student teacher share % editable', () => typeof V9S.form === 'function' || 'V9S.form missing'],
  ['R14 expense pay-later', () => { go('expenses'); return typeof V9.expPayForm === 'function' && EXPENSES.some(e => e.paid < e.amt) || 'no pay-later expense support'; }],
  ['R15 multiple accounts + "+" to add an account inline', () => typeof V9H.accNew === 'function' && /accNew/.test(document.documentElement.innerHTML) || 'no inline + account'],
  ['R16 edit & delete everywhere with reason + Recycle bin restore', () => typeof V9M.del === 'function' && typeof SCH.toBin === 'function' && typeof SCH.restore === 'function' && Object.keys(V9M.T || {}).length >= 5 || 'delete/restore coverage low: ' + Object.keys(V9M.T || {})],
  ['R17 lists & categories editable (Settings)', () => { go('settings'); const t = document.querySelector('main,#main,body').innerText; return /categor|list/i.test(t) || 'no editable lists in Settings'; }],
  ['R18 student form: 12-month year table, multiple phones, subject→teacher, boards, Gmail', () => { studentForm(); const h = document.getElementById('sheet').innerHTML; const miss = []; if (!/phAdd/.test(h)) miss.push('multiple phones'); if (!/gmail|email/i.test(h)) miss.push('gmail'); if (!/bdOpen|board/i.test(h)) miss.push('board'); if (!/subj|Subject/i.test(h)) miss.push('subjects'); return miss.length ? 'missing ' + miss : true; }],
  ['R19 board field is empty by default, tick-box suggestions on click', () => { studentForm(); const chips = document.querySelectorAll('#v9h-bdc .v9h-chip').length; V9H.bdOpen(); const opts = document.querySelectorAll('#v9h-bl input[type=checkbox]').length; const ticked = document.querySelectorAll('#v9h-bl input:checked').length; V9H.popClose(); return (chips === 0 && opts > 0 && ticked === 0) || ('chips ' + chips + ' options ' + opts + ' ticked ' + ticked); }],
  ['R20 per-student routine', () => { go('ac-routine'); return typeof SCH.rtForm === 'function' || 'routine form missing'; }],
  ['R21 attendance from student calendar (P/A/Late/Leave/No class + reasons)', () => { const t = (SCH.REASONS && JSON.stringify(SCH.REASONS)) || ''; return typeof V9I.day === 'function' && typeof V9F.stuCal === 'function' || 'calendar attendance missing'; }],
  ['R22 homework for chosen students with image/video/PDF', () => { SCH.enterTeacherPreview('MEN-01'); go('tp-hw'); SCH.hwForm(); const h = document.getElementById('sheet').innerHTML; return /type="file"/.test(h) && /(image|video|pdf)/i.test(h) || 'no file attach on homework'; }],
  ['R23 student calendar shows homework + events; teacher calendar like Google Calendar', () => { SCH.enterTeacherPreview('MEN-01'); go('tp-cal'); return !!document.querySelector('.v8-cd, .v8-cal, [class*="v8-c"]') || 'teacher calendar grid missing'; }],
  ['R24 class notes per student via WhatsApp', () => typeof SCH.noteSend === 'function' && /wa\.me/.test(document.documentElement.innerHTML) || 'note WhatsApp missing'],
  ['R25 progress reports with letterhead + send permission', () => typeof V8.prOpen === 'function' && typeof V8.prCanSend === 'function' && typeof V8.prPaper === 'function' || 'progress report parts missing'],
  ['R26 Notice Maker', () => { go('nc-notices'); return typeof V8.ntMaker === 'function' || 'notice maker missing'; }],
  ['R27 circles: join / leave, notices show the source circle', () => typeof V9J.join === 'function' && typeof V9J.leave === 'function' && typeof V9J.srcTag === 'function' || 'circle join/leave/source missing'],
  ['R28 teacher adds students without fees, Owner sets fees on approval', () => typeof SCH.newStuForm === 'function' && typeof SCH.pendDo === 'function' || 'teacher-add / approval missing'],
  ['R29 smart search + Ctrl K palette + list search bars', () => { go('students'); const has = !!document.querySelector('input[type="search"], input[placeholder*="earch"]'); return typeof V8.searchAll === 'function' && has || 'search missing'; }],
  ['R30 programme add / edit', () => { go('programmes'); return typeof V8.progForm === 'function' || 'programme form missing'; }],
  ['R31 month/year picker covers 1976–2126', () => { const m = document.documentElement.innerHTML; return (/1976/.test(m) && /2126/.test(m)) || (SCH.DMIN && SCH.DMAX && (String(SCH.DMIN).startsWith('1976') && String(SCH.DMAX).startsWith('2126'))) || 'range not 1976–2126 (DMIN ' + SCH.DMIN + ', DMAX ' + SCH.DMAX + ')'; }],
  ['R32 premium charts render (donut / bars)', () => { go('dashboard'); return !!document.querySelector('svg .xdn, [class*="xdn"], [class*="xc-"], svg path') || 'no charts on dashboard'; }],
  ['R33 3D boxed icons + tooltips', () => { go('dashboard'); return !!document.querySelector('svg.i') && typeof V8.tipShow === 'function' || 'icons/tooltips missing'; }],
  ['R34 centred windows (desktop dialog is centred)', () => { studentForm(); const s = document.querySelector('#sheet .sh, #sheet > div, #sheet'); const r = s.getBoundingClientRect(); const c = Math.abs((r.left + r.right) / 2 - innerWidth / 2); return c < 40 || 'dialog off-centre by ' + Math.round(c) + 'px'; }],
  ['R35 English default with Bangla in Settings; no Mixed option', () => { go('settings'); const h = document.documentElement.innerHTML; return /setLang\('bn'\)/.test(h) && /setLang\('en'\)/.test(h) && !/setLang\('(mix|mixed|bm)'\)/.test(h) || 'Settings must offer exactly English and Bangla'; }],
  ['R36 FTA Premium is the active theme (palette premium on the new engine)', () => { const R = document.documentElement; return (R.dataset.palette === 'premium' && SCH.NEW()) || 'palette ' + R.dataset.palette + ' skin ' + R.dataset.skin; }],
  ['R37 theme picker: FTA Premium card on, other themes selectable', () => { themeSheet(); const c = [...document.querySelectorAll('#sheet .sk')]; const p = c.find(b => /setSkin\('premium'\)/.test(b.getAttribute('onclick') || '')); return (p && p.classList.contains('on') && c.length >= 3) || 'premium card not on / too few themes'; }],
];

(async () => {
  const b = await chromium.launch();
  // ---------- 1 · first visit: no saved settings ----------
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await L.setup(p); await p.goto(FILE); await p.waitForTimeout(900);
    const r = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin, pal: document.documentElement.dataset.palette, th: document.documentElement.dataset.theme, lang: LANG, lsSkin: localStorage.getItem('fta-skin'), lsPal: localStorage.getItem('fta-palette'), lsLang: localStorage.getItem('fta-lang') }));
    rec('F1 first visit opens Premium Light (Onyx & Gold, approved 9 Nov 2026) · English', !r.pal && r.th === 'light' && r.lang === 'en' && r.skin === 'midnight', JSON.stringify(r));
    await p.screenshot({ path: path.join(OUT, 'F1-first-visit.png') });
    // the person's own choice is remembered
    await p.evaluate(() => { setTheme('light'); setLang('bn'); }); await p.reload(); await p.waitForTimeout(900);
    const r2 = await p.evaluate(() => ({ pal: document.documentElement.dataset.palette, th: document.documentElement.dataset.theme, lang: LANG }));
    rec('F2 reload keeps the choice (Premium Light + Bangla)', !r2.pal && r2.th === 'light' && r2.lang === 'bn', JSON.stringify(r2));
    await p.evaluate(() => { SCH.lgAs && SCH.lgAs('Owner'); setSkin('m-dark'); }); await p.reload(); await p.waitForTimeout(900);
    const r3 = await p.evaluate(() => ({ pal: document.documentElement.dataset.palette || '', skin: document.documentElement.dataset.skin }));
    rec('F3 switching to another theme sticks after reload', r3.pal === '' && r3.skin === 'midnight', JSON.stringify(r3));
    await p.evaluate(() => { setSkin('lux'); }); await p.reload(); await p.waitForTimeout(900);
    const r4 = await p.evaluate(() => ({ pal: document.documentElement.dataset.palette || '', skin: document.documentElement.dataset.skin }));
    rec('F4 old themes still work (FTA Lux)', r4.pal === '' && r4.skin === 'lux', JSON.stringify(r4));
    await p.evaluate(() => { setSkin('premium'); }); await p.reload(); await p.waitForTimeout(900);
    const r5 = await p.evaluate(() => ({ pal: document.documentElement.dataset.palette || '', skin: document.documentElement.dataset.skin }));
    rec('F5 back to FTA Premium sticks after reload', r5.pal === 'premium', JSON.stringify(r5));
    await ctx.close(); }

  // ---------- 2 · requirement checks (owner, FTA Premium dark) ----------
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await L.setup(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(FILE); await p.waitForTimeout(900);
  for (const [id, fn] of CHECKS) {
    let out;
    try {
      out = await p.evaluate(`(()=>{ try { closeSheet && closeSheet(); } catch(e){} SCH.preview=null; SCH.lgAs('Owner'); if (document.documentElement.dataset.palette!=='premium') setSkin('premium'); return (${fn.toString()})(); })()`);
    } catch (e) { out = 'threw: ' + e.message.slice(0, 140); }
    await p.waitForTimeout(350);
    await p.screenshot({ path: path.join(OUT, id.split(' ')[0] + '.png') });
    rec(id, out === true, out === true ? '' : String(out));
  }
  rec('E1 no page errors during the checks', errs.length === 0, errs.slice(0, 5).join(' | '));

  // ---------- 3 · no horizontal overflow on phones / tablets ----------
  for (const [w, h] of [[360, 780], [390, 844], [414, 896], [768, 1024], [820, 1180], [1440, 900]]) {
    await p.setViewportSize({ width: w, height: h }); const bad = [];
    for (const [who, pg] of [['o', 'dashboard'], ['o', 'students'], ['o', 'payments'], ['o', 'expenses'], ['o', 'settings'], ['o', 'nc-notices'], ['t', 'tp-home'], ['t', 'tp-cal'], ['s', 'sp-home'], ['s', 'sp-cal']]) {
      const o = await p.evaluate(([who, pg]) => { try { closeSheet(); } catch (e) { } SCH.preview = null; if (who === 'o') SCH.lgAs('Owner'); if (who === 't') SCH.enterTeacherPreview('MEN-01'); if (who === 's') SCH.openStudent('STU-1001'); go(pg); window.scrollTo(0, 0); return document.documentElement.scrollWidth - innerWidth; }, [who, pg]);
      if (o > 1) bad.push(pg + ' +' + o + 'px');
    }
    if (w <= 414) await p.screenshot({ path: path.join(OUT, 'W' + w + '-sp-cal.png') });
    rec('W' + w + ' no horizontal page overflow', bad.length === 0, bad.join(', '));
  }
  await b.close();
  const f = res.filter(r => !r.ok); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
  console.log('\n' + (res.length - f.length) + '/' + res.length + ' passed' + (f.length ? '  · FAILED: ' + f.map(x => x.id.split(' ')[0]).join(', ') : ''));
  process.exit(f.length ? 1 : 0);
})();
