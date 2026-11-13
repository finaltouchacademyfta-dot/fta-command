/* =====================================================================
   FTA · whole-app audit crawler
   Opens every page for every role, clicks every non-destructive button
   (forms, popups, pickers), and records on every screen:
     · any Bangla text while English is selected      (bn)
     · text / pills / buttons escaping their box      (ovf)
     · JavaScript errors                              (err)
   Usage:
     BUILD=mock|demo WIDTH=390 CLICKS=1 OUT=/path/out.json node tests/n-audit.js
   Exit code 1 when anything is found (STRICT=1 also counts ellipsis).
   ===================================================================== */
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const BUILD = process.env.BUILD || 'mock', WIDTH = +(process.env.WIDTH || 390), HEIGHT = +(process.env.HEIGHT || 844), CLICKS = process.env.CLICKS !== '0';
const LANGS = (process.env.LANGS || 'en').split(','), ONLY = process.env.ROLES ? process.env.ROLES.split(',') : null;
const OUT = process.env.OUT || path.join(__dirname, 'shots', 'audit-' + BUILD + '-' + WIDTH + '.json');
const ROOT = path.join(__dirname, '..', BUILD === 'demo' ? 'site-demo' : 'site-mock'), PORT = +(process.env.PORT || (8800 + (BUILD === 'demo' ? 100 : 0) + (WIDTH % 89)));
const URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/json' };
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
const INPAGE = fs.readFileSync(path.join(__dirname, 'audit-inpage.js'), 'utf8');

const OWNER = 'owner@gmail.com', T1 = 'nusrat.teacher@gmail.com', T2 = 'tanvir.teacher@gmail.com', S1 = 'ayaan.student@gmail.com', S2 = 'rafi.student@gmail.com', FM = 'finance.fta@gmail.com', ADM = 'admin.fta@gmail.com', CS = 'collect.fta@gmail.com', JA = 'junior.fta@gmail.com';
const found = { bn: [], ovf: [], err: [], en: [] }; let screens = 0, clicks = 0, shotN = 0;
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const DANGER = /signOut|sign out|del\b|del\(|delete|Del\(|remove|rdel|void|reset|wipe|hardReload|reload|print\(|setLang|setTheme|setSkin|lock|reject|logout|resetData|clearAll|leave\(|endClass|startClass|issue\(|download|xls|pdf\(|wa\.me|window\.open|location|share|navigator|copy|Push|subscribe|notify|install|archive|restore|toBin|closeMonth|mcClose|import|export|backup/i;

async function ready(p) {
  if (BUILD === 'demo') { await p.waitForFunction(() => typeof render === 'function' && document.querySelector('#view .page'), null, { timeout: 30000 }); return; }
  await p.waitForFunction(() => window.FTA && FTA.member && document.getElementById('fta-gate') && document.getElementById('fta-gate').hidden, null, { timeout: 30000 });
  await p.waitForTimeout(400);
}
async function as(p, email) {
  await p.evaluate(async () => { try { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); } catch (e) { } });
  await p.evaluate(e => { localStorage.setItem('fta-mock-session', e); }, email);
  await p.goto(URL0); await ready(p);
}
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));

async function scan(p, where, lang) {
  screens++;
  await settle(p);
  await p.evaluate(() => { try { window.FTA_FIT && FTA_FIT.run(); } catch (e) { } });   /* the state a person sees a moment later */
  const r = await p.evaluate(({ where, lang }) => ({ bn: lang === 'en' ? window.__bnScan(where) : [], en: lang === 'bn' ? window.__enScan(where) : [], ovf: window.__ovfScan(where) }), { where, lang });
  r.en.forEach(x => found.en.push(x)); r.bn.forEach(x => found.bn.push(x)); r.ovf.forEach(x => found.ovf.push(x));
  if (SHOTS && (r.bn.length || r.ovf.some(x => !/ellipsis/.test(x.kind)))) {
    const f = path.join(SHOTS, String(++shotN).padStart(4, '0') + '.png');
    await p.evaluate(list => { document.querySelectorAll('[data-audit-mark]').forEach(e => { e.style.outline = ''; e.removeAttribute('data-audit-mark'); }); }, null);
    await p.screenshot({ path: f }).catch(() => { });
    r.bn.concat(r.ovf).forEach(x => x.shot = path.basename(f));
  }
}
async function closeAll(p) {
  await p.evaluate(() => { try { closeSheet(); } catch (e) { } try { window.V9H && V9H.popClose && V9H.popClose(); } catch (e) { } document.querySelectorAll('.v9h-pop,.pop,[data-pop]').forEach(x => { if (x.id !== 'view') x.remove && x.classList.contains('v9h-pop') && x.remove(); }); try { if (window.FTA && FTA.agent && FTA.agent.state && FTA.agent.state.open) FTA.agent.close(); } catch (e) { } });
  await p.keyboard.press('Escape').catch(() => { });
}

async function crawlRole(p, role, lang, doneClicks) {
  await p.evaluate(l => { if (typeof setLang === 'function' && LANG !== l) setLang(l); }, lang);
  const pages = await p.evaluate(() => Object.keys(PAGES));
  const visited = new Set();
  for (const k of pages) {
    const at = await p.evaluate(k => { try { go(k); } catch (e) { return 'ERR ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 4).join(' | '); } return ST.page; }, k).catch(e => 'ERR ' + e.message);
    if (/^ERR/.test(at)) { found.err.push({ where: role + ' go(' + k + ')', text: at }); continue; }
    if (visited.has(at)) continue; visited.add(at);
    const where = role + ' · ' + lang + ' · ' + at;
    await scan(p, where, lang);
    if (!CLICKS) continue;
    const cands = await p.evaluate(D => {
      const out = [], seen = new Set(), rx = new RegExp(D, 'i');
      document.querySelectorAll('#view [onclick], #view button, #top [onclick], #top button, #bnav [onclick], #bnav button').forEach((el, i) => {
        if (!el.checkVisibility || !el.checkVisibility()) return;
        const oc = el.getAttribute('onclick') || '', tx = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40);
        if (rx.test(oc) || rx.test(tx) || el.disabled || el.closest('[data-noaudit]')) return;
        if (/^go\(/.test(oc) && !/;/.test(oc)) return;                  /* plain page links: pages are crawled anyway */
        if (el.nodeName === 'A' && el.getAttribute('href') && !/^#|javascript/.test(el.getAttribute('href'))) return;
        const key = (oc || tx).replace(/'[A-Z]{2,4}-\d+'/g, "'X'").replace(/\d{4}-\d{2}(-\d{2})?/g, 'D');
        if (!key || seen.has(key)) return; seen.add(key);
        el.setAttribute('data-audit-i', String(i)); out.push({ i: String(i), key, tx });
      });
      return out;
    }, DANGER.source);
    for (const c of cands.slice(0, 70)) {
      const gk = role + '|' + c.key; if (doneClicks.has(gk)) continue; doneClicks.add(gk);
      clicks++;
      try {
        await p.evaluate(({ i, k }) => { if (ST.page !== k) go(k); }, { i: c.i, k: at });
        const ok = await p.evaluate(i => { const el = document.querySelector('[data-audit-i="' + i + '"]'); if (!el) return false; el.click(); return true; }, c.i);
        if (!ok) continue;
        await scan(p, where + ' › ' + (c.tx || c.key).slice(0, 50), lang);
        /* one level deeper inside an opened sheet / popover: pickers and sub-forms */
        const inner = await p.evaluate(D => { const ov = document.getElementById('ov'); const host = (ov && !ov.hidden) ? document.getElementById('sheet') : document.querySelector('.v9h-pop'); if (!host) return []; const rx = new RegExp(D + '|save|submit|send|confirm|ok\\b|approve|pay\\(|record', 'i'); const out = []; host.querySelectorAll('button[onclick],[onclick]').forEach((el, j) => { const oc = el.getAttribute('onclick') || '', tx = (el.innerText || '').trim().slice(0, 40); if (!el.checkVisibility() || rx.test(oc) || rx.test(tx) || /closeSheet|popClose/.test(oc)) return; el.setAttribute('data-audit-j', String(j)); out.push({ j: String(j), tx: tx || oc.slice(0, 40) }); }); return out.slice(0, 12); }, DANGER.source);
        for (const d of inner) {
          const ok2 = await p.evaluate(j => { const el = document.querySelector('[data-audit-j="' + j + '"]'); if (!el) return false; el.click(); return true; }, d.j);
          if (ok2) await scan(p, where + ' › ' + (c.tx || c.key).slice(0, 30) + ' › ' + d.tx.slice(0, 30), lang);
        }
      } catch (e) { found.err.push({ where: where + ' click ' + c.key, text: e.message.split('\n')[0] }); }
      await closeAll(p);
    }
  }
}

async function seed(p) {
  await p.evaluate(({ T1, T2, S1, S2, FM, ADM, CS, JA }) => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE English', fee: 6000, type: 'Individual', status: 'Active' }, { id: 'PRG-02', name: 'IGCSE Maths', fee: 7000, type: 'Individual', status: 'Active' });
    MENTORS.push({ id: 'MEN-01', name: 'Nusrat Jahan', gmail: T1, phone: '01712334455', subjects: 'English', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: 'private note' });
    MENTORS.push({ id: 'MEN-02', name: 'Tanvir Ahmed', gmail: T2, phone: '01712334466', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 40, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    STUDENTS.push({ id: 'STU-1001', name: 'Ayaan Rahman', guardian: 'Rahman', phone: '01711000001', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: ['office-only note'], gmail: S1 });
    STUDENTS.push({ id: 'STU-1002', name: 'Rafi Hasan', guardian: 'Hasan', phone: '01711000002', cls: 'Grade 10', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [], gmail: S2 });
    ENROL.push({ id: 'ENR-2001', stu: 'STU-1001', prog: 'PRG-01', mentor: 'MEN-01', type: 'Individual', fees: [{ from: '2026-10', fee: 6000 }], disc: 500, start: '2026-10-01', status: 'Active' });
    ENROL.push({ id: 'ENR-2002', stu: 'STU-1002', prog: 'PRG-02', mentor: 'MEN-02', type: 'Individual', fees: [{ from: '2026-10', fee: 7000 }], disc: 0, start: '2026-10-01', status: 'Active' });
    ENROL.push({ id: 'ENR-2003', stu: 'STU-1001', prog: 'PRG-02', mentor: 'MEN-02', type: 'Individual', fees: [{ from: '2026-10', fee: 7000 }], disc: 0, start: '2026-10-01', status: 'Active' });
    V9G.toGroups('STU-1001'); V9G.toGroups('STU-1002');
    SCH.SPORT.push({ stu: 'STU-1001', gmail: S1, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' }, { stu: 'STU-1002', gmail: S2, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' });
    if (!ACCOUNTS.length) ACCOUNTS.push({ id: 'ACC-CASH', name: 'Cash box', type: 'Cash', open: 0 });
    ACCOUNTS.push({ id: 'ACC-BK', name: 'bKash 01700', type: 'Mobile', open: 0 });
    PAYMENTS.push({ id: 'PAY-0001', stu: 'STU-1001', date: TODAY, amt: 5500, acct: ACCOUNTS[0].id, method: 'Cash', status: 'Verified', alloc: [], rcpt: 'RC-0001', by: 'Owner' });
    PAYMENTS.push({ id: 'PAY-0002', stu: 'STU-1002', date: TODAY, amt: 3000, acct: ACCOUNTS[1].id, method: 'bKash', status: 'Pending', alloc: [], rcpt: '', by: 'Owner' });
    EXPENSES.push({ id: 'EXP-0001', date: TODAY, month: TODAY.slice(0, 7), cat: 'Office rent', payee: 'Landlord', desc: 'Rent', amt: 18000, acct: ACCOUNTS[0].id, cls: 'Operating', status: 'Approved', by: 'Owner', paid: 18000 });
    { const pm = FTA.prevM ? FTA.prevM(TODAY.slice(0, 7)) : '2026-10';
      PAYMENTS.push({ id: 'PAY-0003', stu: 'STU-1001', date: pm + '-10', amt: 13000, acct: ACCOUNTS[0].id, method: 'Cash', status: 'Verified', alloc: [], rcpt: 'RC-0003', by: 'Owner' });
      PAYMENTS.push({ id: 'PAY-0004', stu: 'STU-1002', date: pm + '-12', amt: 7000, acct: ACCOUNTS[1].id, method: 'bKash', status: 'Verified', alloc: [], rcpt: 'RC-0004', by: 'Owner' });
      EXPENSES.push({ id: 'EXP-0003', date: pm + '-05', month: pm, cat: 'Office rent', payee: 'Landlord', desc: 'Rent', amt: 18000, acct: ACCOUNTS[0].id, cls: 'Operating', status: 'Approved', by: 'Owner', paid: 18000 }); }
    EXPENSES.push({ id: 'EXP-0002', date: TODAY, month: TODAY.slice(0, 7), cat: 'Utilities', payee: 'DESCO', desc: 'Electricity', amt: 2500, acct: ACCOUNTS[0].id, cls: 'Operating', status: 'Pending', by: 'Owner', paid: 0 });
    [[FM, 'Finance Manager', 'Shakil Ahmed'], [ADM, 'Admin', 'Admin One'], [CS, 'Collection Staff', 'Rumana Begum'], [JA, 'Junior Admin', 'Junior One']].forEach(([e, r, n]) => { const u = { id: 'U' + (USERS.length + 1), name: n, email: e, role: r }; USERS.push(u); SCH.STAFF.push({ uid: u.id, status: 'Active', last: 'Never', twoStep: false }); });
    render();
  }, { T1, T2, S1, S2, FM, ADM, CS, JA });
  await p.evaluate(() => FTA.sync());
  /* routine, a running class and a message so those screens have content */
  await p.evaluate(() => {
    try { const g = (typeof GROUPS !== 'undefined' ? GROUPS : []).find(x => (x.stu || []).includes('STU-1001')); if (g && SCH.RT) { SCH.RT.push({ id: 'RT-A1', gid: g.id, day: new Date().getDay(), from: '16:00', to: '17:00', stu: ['STU-1001'] }); } } catch (e) { }
    try { if (FTA.MSG) FTA.MSG.push({ id: 'M-1', room: 'U:office', by: 'Owner', text: 'Welcome to FTA', at: new Date().toISOString() }); } catch (e) { }
    render();
  });
  await p.evaluate(() => FTA.sync()).catch(() => { });
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: WIDTH, height: HEIGHT }, isMobile: WIDTH < 800, hasTouch: WIDTH < 800, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); await R.setup(p); await p.addInitScript(INPAGE);
  let curWhere = 'boot';
  p.on('pageerror', e => found.err.push({ where: curWhere, text: e.message.split('\n')[0] }));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404|Failed to load resource|net::/.test(m.text())) found.err.push({ where: curWhere, text: 'console: ' + m.text().slice(0, 200) }); });
  p.on('dialog', d => d.dismiss().catch(() => { }));
  await p.route(/wa\.me|api\.whatsapp/, r => r.abort());
  await p.goto(URL0);
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('fta-lang', 'en'); });

  let ROLES;
  if (BUILD === 'demo') {
    await p.goto(URL0); await ready(p);
    ROLES = [['Owner (demo)', null]];
  } else {
    await p.evaluate(e => localStorage.setItem('fta-mock-session', e), OWNER);
    await p.goto(URL0); await ready(p);
    if (!process.env.NOSEED) await seed(p);
    ROLES = [['Owner', OWNER], ['Admin', ADM], ['Finance Manager', FM], ['Collection Staff', CS], ['Junior Admin', JA], ['Mentor', T1], ['Student', S1]];
  }
  /* the login / gate screen itself */
  if (BUILD !== 'demo') {
    await p.evaluate(() => localStorage.removeItem('fta-mock-session')); await p.goto(URL0);
    await p.waitForFunction(() => document.getElementById('fta-gate') && !document.getElementById('fta-gate').hidden, null, { timeout: 20000 }).catch(() => { });
    for (const l of LANGS) { await p.evaluate(l => { localStorage.setItem('fta-lang', l); }, l); await p.reload(); await p.waitForTimeout(1200); curWhere = 'sign-in screen · ' + l; await scan(p, curWhere, l); }
  }
  for (const [role, email] of ROLES) {
    if (ONLY && !ONLY.includes(role.split(' ')[0])) continue;
    if (email) { await as(p, email); }
    for (const l of LANGS) {
      curWhere = role + ' · ' + l;
      const done = new Set();
      try { await crawlRole(p, role, l, done); } catch (e) { found.err.push({ where: role, text: 'crawler: ' + e.message.split('\n')[0] }); }
      /* AI panel, notifications panel, theme sheet, profile menu */
      for (const [nm, fn] of [['AI panel', 'window.FTA && FTA.agent && FTA.agent.open()'], ['Theme sheet', 'typeof themeSheet==="function" && themeSheet()'], ['Notifications', 'window.FTA_NOTIFY && FTA_NOTIFY.panel && FTA_NOTIFY.panel()'], ['Command palette', 'window.V8 && V8.palette && V8.palette()']]) {
        try { await p.evaluate(fn); await scan(p, role + ' · ' + l + ' · ' + nm, l); } catch (e) { }
        await closeAll(p);
      }
    }
  }
  /* de-duplicate: same text at the same place counts once, keep first screen */
  const uniq = (arr, f) => { const m = new Map(); arr.forEach(x => { const k = f(x); if (!m.has(k)) m.set(k, Object.assign({ n: 1 }, x)); else m.get(k).n++; }); return [...m.values()]; };
  const res = { build: BUILD, width: WIDTH, screens, clicks, bn: uniq(found.bn, x => x.kind + '|' + x.text), en: uniq(found.en, x => x.kind + '|' + x.text), ovf: uniq(found.ovf, x => x.kind + '|' + x.at + '|' + x.text), err: uniq(found.err, x => x.text) };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  const ovfHard = res.ovf.filter(x => !/ellipsis/.test(x.kind) || process.env.STRICT);
  console.log(`screens ${screens} · clicks ${clicks} · Bangla ${res.bn.length} · Latin-in-bn ${res.en.length} · layout ${ovfHard.length} (ellipsis ${res.ovf.length - ovfHard.length}) · errors ${res.err.length}  → ${OUT}`);
  await b.close(); server.close();
  process.exit(res.bn.length || ovfHard.length || res.err.length ? 1 : 0);
})();
