/* Worker A · empty-state crawler.
   Loads the demo build in 'test-empty' mode (production clock + empty start, no backend),
   signs in as each office role, visits every page / tab / period / common form, checks for
   JS errors and leaked sample data; then adds 1 programme, 1 teacher, 2 students, 1 payment,
   1 expense through the app's own forms and crawls again, checking the numbers agree.
   PV=file:///home/claude/prod/site-demo/index.html node tests/a-empty.js [skin ...]          */
const { chromium } = require('playwright'); const L = require('./rlib');
const SKINS = process.argv.slice(2).length ? process.argv.slice(2) : ['default', 'lux', 'qit', 'm-light'];
const TODAY = process.env.FTA_TODAY || '';
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const skin of SKINS) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const outer = [];
    p.on('pageerror', e => outer.push(e.message)); const cons = new Set(); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) cons.add(m.text().slice(0, 140)); }); p.on('dialog', d => d.dismiss());
    await L.setup(p);
    await p.addInitScript(([t]) => {
      Object.defineProperty(window, 'FTA_MODE', { value: 'test-empty', writable: false, configurable: false });
      if (t) window.FTA_TODAY = t;
      window.__errs = []; window.__lbl = 'load';
      window.addEventListener('error', e => window.__errs.push(window.__lbl + ' :: ' + (e.message || e) + ' @ ' + String((e.error && e.error.stack) || '').split('\n')[1]));
      window.addEventListener('unhandledrejection', e => window.__errs.push(window.__lbl + ' :: (promise) ' + (e.reason && e.reason.message || e.reason)));
      try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
    }, [TODAY]);
    await p.goto(L.FILE); await p.waitForTimeout(1200);
    if (skin !== 'default') await p.evaluate(k => { try { setSkin(k); } catch (e) { __errs.push('setSkin ' + e.message); } closeSheet(); }, skin);
    const R = await p.evaluate(async (skin) => {
      const out = { skin, today: TODAY, months: MONTHS.join(','), notes: [] };
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const run = (lbl, f) => { window.__lbl = lbl; try { const r = f(); return r; } catch (e) { __errs.push(lbl + ' :: ' + e.message + ' @ ' + String(e.stack || '').split('\n')[1]); } };
      /* 1. reset left nothing behind */
      const leaks = [];
      Object.values(FTA.collections).forEach(c => {
        const v = c.get(); if (!v) return;
        const allow = { ACCOUNTS: 4, USERS: 1, 'SCH.STAFF': 1 };
        if (c.kind === 'values' || c.kind === 'setting' || ['ORG', 'SCH.PERM', 'SCH.TOPICS', 'V8.STATUSES', 'V9L.ST', 'METHOD', 'CLOSE', 'PAYROLL', 'SCH.ROUT'].includes(c.name)) return;
        if (c.name === 'V8.CIRCLES') { if (v.some(x => x.kind !== 'auto')) leaks.push('V8.CIRCLES non-auto'); return; }
        const n = Array.isArray(v) ? v.length : Object.keys(v).length;
        if (n > (allow[c.name] || 0)) leaks.push(c.name + ':' + n);
      });
      if (Object.values(SCH.ROUT || {}).some(a => a.length)) leaks.push('SCH.ROUT has groups');
      out.leaks = leaks;
      const SEED = /Ayaan|Mahmud Alam|Shakil Ahmed|Rumana Begum|Nusrat Jahan|Samiha|Karim Properties|Link3|DESCO|Tanvir Ahmed|Fahim Mahmud|Adib Rahman|City Bank/;
      const seen = new Set();
      const scan = lbl => { const t = document.body.innerText; const m = t.match(SEED); if (m && !seen.has(m[0])) { seen.add(m[0]); out.notes.push('seed text "' + m[0] + '" on ' + lbl); } const d = t.match(/\bDemo\b|DEMO ·|sample data|Demo code/); if (d && !seen.has('demo:' + lbl.split(' ')[0])) { seen.add('demo:' + lbl.split(' ')[0]); out.notes.push('demo text "' + d[0] + '" on ' + lbl); } };
      const tabsOf = () => [...document.querySelectorAll('#view [role=tab], #view .seg button, #view .tabs button, #view .stabs button, #view .vt button, #view .chips button')].filter(x => !x.disabled && !/delete|remove|lock|approve/i.test(x.getAttribute('onclick') || ''));
      const crawl = async tag => {
        const roles = Object.keys(ROLES).filter(r => r !== 'Mentor' && r !== 'Student');
        for (const role of roles) {
          run(tag + ' signin ' + role, () => { SCH.lgAs(role); });
          await wait(30);
          for (const pg of ROLES[role].pages) {
            run(tag + ' ' + role + ' page ' + pg, () => go(pg)); window.__visits = (window.__visits || 0) + 1; await wait(15); scan(role + ' ' + pg);
            if (role === 'Owner') {
              const n = tabsOf().length;
              for (let i = 0; i < Math.min(n, 14); i++) { const t = tabsOf()[i]; if (!t) break; run(tag + ' ' + role + ' ' + pg + ' tab "' + t.textContent.trim().slice(0, 24) + '"', () => t.click()); await wait(10); }
              run(tag + ' close', () => closeSheet());
            }
          }
        }
        run(tag + ' signin Owner', () => SCH.lgAs('Owner'));
        for (const per of PERS) { run(tag + ' period ' + per[0], () => { ST.per = per[0]; go('dashboard'); }); await wait(10); }
        ST.per = 'tm';
        for (const t of (typeof STABS2 !== 'undefined' ? STABS2 : STABS)) { run(tag + ' settings ' + t[0], () => { ST.setTab = t[0]; go('settings'); }); await wait(10); scan('settings ' + t[0]); }
        const forms = ['payForm()', 'studentForm()', 'expForm()', 'trfForm()', 'noteForm()', 'followForm()', 'V8.progForm()', 'SCH.newTeacher()', 'SCH.menForm()', 'V8.enrForm()', 'SCH.staffForm()', 'themeSheet()', 'MZ.othNew()', 'V8.batchForm && V8.batchForm()', 'quickAdd()', "document.getElementById('nb').click()", "document.getElementById('whob').click()", 'recurApprove()', "docOpen({ kind: 'rcpt', months: [CUR] })", "FTA.act('userAdd')"];
        for (const f of forms) { run(tag + ' form ' + f, () => (0, eval)(f)); await wait(20); scan('form ' + f); run(tag + ' close', () => closeSheet()); }
        run(tag + ' quickAdd', () => quickAdd());
        const qa = [...document.querySelectorAll('#sheet .qa button')].map(x => x.getAttribute('onclick'));
        for (const q of qa) { run(tag + ' quick ' + q, () => (0, eval)(q)); await wait(20); run(tag + ' close', () => closeSheet()); }
        REPORTS.forEach(g => g[1].forEach(r => { run(tag + ' report ' + r[0], () => openReport(r[0])); run(tag + ' report preview ' + r[0], () => repPreview(r[0])); run(tag + ' close', () => closeSheet()); }));
        /* role previews (Owner → "see as"), teacher portal, student portal */
        for (const r of ['Admin', 'Junior Admin', 'Finance Manager', 'Collection Staff', 'Mentor', 'Student']) {
          if (!ROLES[r]) continue;
          run(tag + ' previewAs ' + r, () => SCH.previewAs(r)); await wait(20);
          for (const pg of ROLES[r].pages) { run(tag + ' preview ' + r + ' ' + pg, () => go(pg)); await wait(10); scan('preview ' + r + ' ' + pg); }
          run(tag + ' endPreview', () => SCH.endPreview()); run(tag + ' signin Owner', () => SCH.lgAs('Owner'));
        }
        for (const m of MENTORS) {
          run(tag + ' teacher preview ' + m.id, () => SCH.previewTeacher(m.id)); await wait(20);
          for (const pg of ROLES.Mentor.pages) { run(tag + ' teacher ' + pg, () => go(pg)); await wait(10); }
          run(tag + ' endPreview', () => SCH.endPreview()); run(tag + ' signin Owner', () => SCH.lgAs('Owner'));
        }
        for (const s of STUDENTS) {
          run(tag + ' student portal ' + s.id, () => SCH.openStudent(s.id)); await wait(20);
          for (const pg of ROLES.Student.pages) { run(tag + ' student ' + pg, () => go(pg)); await wait(10); }
          run(tag + ' endPreview', () => SCH.endPreview()); run(tag + ' signin Owner', () => SCH.lgAs('Owner'));
        }
        /* users added only for previews are not left behind */
        out[tag + ' users'] = USERS.map(u => u.role + (u.stu ? ':' + u.stu : '') + (u.mentor ? ':' + u.mentor : '')).join(', ');
      };
      await crawl('[empty]');
      out.empty = { stu: STUDENTS.length, inv: INVOICES.length, pay: PAYMENTS.length };

      /* 2. add a little real data through the app's own forms */
      const set = (id, v) => { const e = document.getElementById(id); if (!e) { __errs.push('setup :: missing field #' + id); return; } e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
      run('setup', () => SCH.lgAs('Owner'));
      run('add programme', () => { V8.progForm(); set('pf-n', 'IGCSE Mathematics'); set('pf-sub', 'Mathematics'); set('pf-f', '5000'); V8.progSave(''); closeSheet(); });
      run('add teacher', () => { SCH.newTeacher(); set('nt-n', 'Test Teacher'); set('nt-s', 'Mathematics'); set('nt-p', '01712345678'); SCH.newTeacherSave(); closeSheet(); });
      run('teacher pay rule', () => { SCH.menForm(MENTORS[0].id); set('mf-e', 'test.teacher@gmail.com'); set('mf-model', 'per_student'); set('mf-rate', '2000'); SCH.menSave(MENTORS[0].id); closeSheet(); });
      for (const nm of ['Student One', 'Student Two']) run('add student ' + nm, () => { studentForm(); set('nf-n', nm); set('nf-g', 'Guardian ' + nm); set('nf-p', '01811111111'); if (window.V9H && V9H.F) { V9H.F.subs[PROGS[0].id] = MENTORS[0].id; V9H.sbDraw(); } else { set('nf-pr', PROGS[0].id); set('nf-m', MENTORS[0].id); } saveStudent(); closeSheet(); });
      run('add payment', () => { payForm(STUDENTS[0].id); if (window.SCH && SCH.pfSet && document.querySelector('[onclick^="SCH.pfSet"]')) SCH.pfSet(5000); else { set('pf-a', '5000'); PF.amt = 5000; } set('pf-c', 'ACC-CASH'); savePay(); });
      await wait(1500); run('close', () => closeSheet());
      run('add expense', () => { expForm(); set('xf-c', 'Office rent'); set('xf-p', 'Landlord'); set('xf-a', '3000'); set('xf-ac', 'ACC-CASH'); saveExp(); closeSheet(); });
      await wait(100);
      run('payroll reviewed', () => { ST.prM = CUR; go('payroll'); prStep('Reviewed'); });
      run('render', () => go('dashboard'));
      const nums = {};
      run('numbers', () => Object.assign(nums, { students: STUDENTS.length, enrol: ENROL.length, invoices: INVOICES.map(i => i.month + ':' + i.status).join(' '), revenue: revenue(CUR), collection: SER.collection(CUR), dues: sum(STUDENTS, s => studentDue(s.id)), incurred: incurred(CUR), payroll: payrollNet(CUR), profit: profit(CUR), cash: cashTotal(), pay: PAYMENTS.map(p => p.id + '/' + p.rcpt + '/' + p.status).join(' '), exp: EXPENSES.map(e => e.id + '/' + e.amt).join(' '), months: MONTHS.join(','), close: Object.keys(CLOSE).join(','), payrollMonths: Object.keys(PAYROLL).map(m => m + ':' + PAYROLL[m].status + ':' + PAYROLL[m].items.map(i => i.mentor + '=' + i.net).join('+')).join(' ') }));
      out.nums = nums;
      const exp = { students: 2, revenue: 10000, collection: 5000, dues: 5000, incurred: 7000, payroll: 4000, profit: 3000, cash: 2000 };
      if (!SCH.NEW()) { out.nums.note = 'old skin: new students start next month, so only the money checks apply'; ['revenue', 'dues', 'incurred', 'payroll', 'profit'].forEach(k => delete exp[k]); }
      out.numErr = Object.keys(exp).filter(k => nums[k] !== exp[k]).map(k => k + ' = ' + nums[k] + ' (expected ' + exp[k] + ')');
      const dash = document.getElementById('view').innerText;
      if (SCH.NEW() && !/10,000/.test(dash)) out.numErr.push('dashboard does not show 10,000 revenue');
      await crawl('[data]');
      out.errs = __errs.splice(0).concat((FTA.errors || []).splice(0).map(e => 'guarded :: ' + e)); out.visited = __visits;
      return out;
    }, skin);
    console.log('==== skin', skin, '| today', R.today, '| months', R.months);
    console.log('pages visited:', R.visited); console.log('leaks:', R.leaks.length ? R.leaks.join(', ') : 'none');
    console.log('notes:', R.notes.length ? '\n  ' + R.notes.join('\n  ') : 'none');
    const G = {}; R.errs.forEach(e => { const [lbl, msg] = e.split(' :: '); const k = (msg || '').replace(/^Uncaught /, ''); (G[k] = G[k] || []).push(lbl); });
    const errs = Object.keys(G);
    console.log('errors:', errs.length ? '\n  ' + errs.map(k => k + '\n      x' + G[k].length + ' first: ' + G[k][0]).join('\n  ') : 'none');
    console.log('users after empty crawl:', R['[empty] users']); console.log('users after data crawl:', R['[data] users']);
    console.log('numbers:', JSON.stringify(R.nums)); console.log('number check:', R.numErr && R.numErr.length ? R.numErr.join('; ') : 'ok');
    console.log('console errors:', cons.size ? '\n  ' + [...cons].slice(0, 12).join('\n  ') : 'none');
    if (cons.size || errs.length || R.leaks.length || (R.numErr && R.numErr.length)) fail++;
    await p.close();
  }
  await b.close();
  console.log(fail ? 'FAIL ' + fail : 'ALL OK');
})();
