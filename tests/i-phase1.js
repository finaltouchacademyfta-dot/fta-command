/* Worker I · Phase 1 end to end (mock backend = the same server code and policy as the live site)
   Run:  cd /home/claude/prod && MODE=mock python3 build.py && node tests/i-phase1.js
   1 approved design opens by default (Premium Light) · new pages in the menu for the right roles
   2 Receipt Maker: issue → saved on the server, numbers never doubled, void rules, never deleted
   3 Profiles / My Profile: mentor & student change only their own allowed fields (checked on the server)
   4 Mentor slot request → office approves → planned slot; mentors see only their own requests
   5 Connect (Messages / Live / Watch / Recordings) is not in the live app */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8772, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = http.createServer((q, s) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(s);
});
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const OWNER = 'owner@gmail.com', T1 = 'nusrat.teacher@gmail.com', T2 = 'tanvir.teacher@gmail.com', S1 = 'ayaan.student@gmail.com', FM = 'finance.fta@gmail.com', ADM = 'admin.fta@gmail.com', CS = 'collect.fta@gmail.com', JA = 'junior.fta@gmail.com', VW = 'viewer.fta@gmail.com';
const ready = p => p.waitForFunction(() => document.documentElement.classList.contains('fta-on') && window.FTA && FTA.member && window.FTA_MODS, null, { timeout: 30000 });
const db = p => p.evaluate(() => FTA.mock.db());
const recs = (d, c) => Object.values(d.records).filter(r => r.collection === c && !r.deleted);
const userClick = p => p.mouse.click(5, 300);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404|beforeunload/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  const as = async email => { await p.evaluate(async () => { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); }); await p.evaluate(e => localStorage.setItem('fta-mock-session', e), email); await p.reload(); await ready(p); await p.waitForTimeout(400); };
  const setMember = (e, patch) => p.evaluate(([e, patch]) => { const d = JSON.parse(localStorage.getItem('fta-mock-db')); d.members[e] = Object.assign(d.members[e] || { email: e, created_at: new Date().toISOString() }, { email: e, active: true }, patch); localStorage.setItem('fta-mock-db', JSON.stringify(d)); }, [e, patch]);

  console.log('1. First visit: approved design, new pages in the menu');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0);
  await p.waitForSelector('#fg-email', { timeout: 30000 }); await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  const look = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme, pal: document.documentElement.dataset.palette || '', ui: document.querySelectorAll('style[data-ui]').length }));
  ok(look.skin === 'midnight' && look.theme === 'light' && !look.pal, 'opens in Premium Light (' + look.skin + ' / ' + look.theme + ')');
  ok(look.ui === 17, 'all approved design layers (plus Class status styles and the every-screen fit layer) are in the page');
  const nav = await p.evaluate(() => ({ pages: ROLES.Owner.pages || [], flat: FLAT.map(f => f[0]), title: document.title, brand: (document.querySelector('#side .brand b') || {}).textContent }));
  ok(nav.flat.includes('cx-people') && nav.flat.includes('rc-maker'), 'Profiles and Receipt Maker are registered');
  ok(!nav.flat.some(x => /^(cx|tp|sp)-(watch|rec|monitor)$/.test(x)), 'Watch Together / Recordings / Chat Monitor are not in the live app');
  ok(/Owner Portal/.test(nav.title) && nav.brand === 'Owner Portal', 'portal title by role (' + nav.brand + ')');
  await p.evaluate(() => FTA.sync());
  let d0 = await db(p);
  const permAdmin = (recs(d0, 'perm').find(r => r.id === 'Admin') || {}).data || {};
  ok(permAdmin.rcm === 'vaed' && permAdmin['cx-people'] === 'vae', 'Owner\'s Permissions table now lists the new pages with their defaults (saved by the Owner)');

  console.log('2. Owner sets up people');
  await p.evaluate(({ T1, T2, S1 }) => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE English', fee: 6000, type: 'Individual', status: 'Active' });
    MENTORS.push({ id: 'MEN-01', name: 'Nusrat Jahan', gmail: T1, phone: '01712334455', subjects: 'English', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: 'private note' });
    MENTORS.push({ id: 'MEN-02', name: 'Tanvir Ahmed', gmail: T2, phone: '01712334466', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 40, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    STUDENTS.push({ id: 'STU-1001', name: 'Ayaan Rahman', guardian: 'Rahman', phone: '01711000001', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: ['office-only note'], gmail: S1 });
    STUDENTS.push({ id: 'STU-1002', name: 'Rafi Hasan', guardian: 'Hasan', phone: '01711000002', cls: 'Grade 10', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [] });
    ENROL.push({ id: 'ENR-2001', stu: 'STU-1001', prog: 'PRG-01', mentor: 'MEN-01', type: 'Individual', fees: [{ from: '2026-10', fee: 6000 }], disc: 0, start: '2026-10-01', status: 'Active' });
    V9G.toGroups('STU-1001');
    SCH.SPORT.push({ stu: 'STU-1001', gmail: S1, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' });
    render();
  }, { T1, T2, S1 });
  await p.evaluate(() => FTA.sync());
  await setMember(FM, { role: 'Finance Manager', name: 'Finance' }); await setMember(ADM, { role: 'Admin', name: 'Admin' }); await setMember(CS, { role: 'Collection Staff', name: 'Collector' });
  await setMember(JA, { role: 'Junior Admin', name: 'Junior' }); await setMember(VW, { role: 'Viewer', name: 'Viewer' });
  d0 = await db(p);
  ok(d0.members[T1] && d0.members[T1].mentor_id === 'MEN-01' && d0.members[S1] && d0.members[S1].student_id === 'STU-1001', 'mentor and student Gmails linked');

  console.log('3. Receipt Maker');
  const issue = (name, amt) => p.evaluate(async ([name, amt]) => {
    ST.page = 'rc-maker'; render(); await new Promise(r => setTimeout(r, 200));
    const RM = FTA_RECEIPT._rm(); RM.doc = 'receipt'; RM.view = null; const d = RM.d.receipt; d.name = name; d.single.amt = String(amt); d.single.desc = 'Tuition fee';
    FTA_RECEIPT.issue(false);
    for (let i = 0; i < 80 && (RM.busy || RM.d.receipt.name === name); i++) await new Promise(r => setTimeout(r, 150));
    return { view: RM.view, msg: RM.msg, err: RM.msgErr };
  }, [name, amt]);
  const r1 = await issue('Ayaan Rahman', 6000);
  const yr = new Date().getFullYear();
  ok(r1.view === 'FTA-' + yr + '-0001' && !r1.err, 'Owner issues the first receipt: ' + r1.view + ' (' + r1.msg + ')');
  d0 = await db(p);
  const sr1 = recs(d0, 'rcpt').find(r => r.id === r1.view);
  ok(sr1 && sr1.data.issuedBy === OWNER && sr1.data.calc.paid === 600000 && sr1.data.void === false, 'saved on the server with who issued it (server-stamped) and the amount in paisa');
  ok(await p.evaluate(() => /FTA-\d{4}-0001/.test(document.getElementById('view').innerText) || !!document.getElementById('rm-root')), 'Receipt Maker page opens');

  /* Collection Staff issues the next one (they may), but cannot void, delete or see salary slips */
  await as(CS);
  ok(await p.evaluate(() => ROLES['Collection Staff'].pages.includes('rc-maker')), 'Collection Staff has the Receipt Maker page (default access)');
  const r2 = await issue('Rafi Hasan', 4500);
  ok(r2.view === 'FTA-' + yr + '-0002', 'Collection Staff issues the next number: ' + r2.view);
  await userClick(p);
  await p.evaluate(no => { const i = FTA.RCPT.findIndex(x => x.id === no); FTA.RCPT.splice(i, 1); }, r2.view);
  await p.evaluate(() => FTA.sync());
  d0 = await db(p);
  ok(recs(d0, 'rcpt').some(r => r.id === r2.view), 'Collection Staff cannot delete an issued receipt (still on the server)');
  const clash = await p.evaluate(async no => {
    /* another device's receipt with the same number arrives at the server first; ours is refused */
    const d = FTA.mock.db(); const k = 'rcpt\u0001' + no.replace(/0002$/, '0003'); d.records[k] = { collection: 'rcpt', id: no.replace(/0002$/, '0003'), data: { id: no.replace(/0002$/, '0003'), no: no.replace(/0002$/, '0003'), tok: 'xyz', at: '2026-01-01T00:00:00Z', d: { doc: 'receipt', name: 'From the other device' }, calc: { paid: 1 } }, deleted: false, mentor_ids: [], student_ids: [], updated_at: new Date(Date.now() + 1000).toISOString(), updated_by: 'x' }; FTA.mock.save(d);
    const RM = FTA_RECEIPT._rm(); RM.view = null; const r = RM.d.receipt; r.name = 'Clash Test'; r.single.amt = '100';
    /* issue without the fresh read, so the number is the stale one */
    const pull = FTA.pull; FTA.pull = () => Promise.resolve(); FTA_RECEIPT.issue(false);
    for (let i = 0; i < 80 && RM.busy === false; i++) await new Promise(r => setTimeout(r, 25));
    for (let i = 0; i < 120 && RM.busy; i++) await new Promise(r => setTimeout(r, 150));
    FTA.pull = pull;
    return { msg: RM.msg, err: RM.msgErr, draft: RM.d.receipt.name, server: FTA.mock.db().records[k].data.d.name };
  }, r2.view);
  ok(clash.err && /just used by someone else/.test(clash.msg) && clash.draft === 'Clash Test' && clash.server === 'From the other device', 'a number already taken is refused on the server; the draft is kept and the message says "Press Save again"');
  const r3 = await p.evaluate(async () => { const RM = FTA_RECEIPT._rm(); FTA_RECEIPT.issue(false); for (let i = 0; i < 120 && (RM.busy || RM.d.receipt.name === 'Clash Test'); i++) await new Promise(r => setTimeout(r, 150)); return RM.view; });
  ok(r3 === 'FTA-' + yr + '-0004', 'pressing Save again takes the next free number (' + r3 + ')');
  await userClick(p);
  const csVoid = await p.evaluate(async no => { const a = FTA.RCPT.find(x => x.id === no); a.void = true; a.voidReason = 'test'; await FTA.sync(); const s = FTA.mock.db().records['rcpt\u0001' + no].data; return s.void; }, r2.view);
  ok(csVoid === false, 'Collection Staff cannot void (refused, kept as issued)');
  ok(await p.evaluate(() => !FTA.syncedCollections.includes('x_rcsal') && FTA.RCSAL.length === 0), 'Collection Staff receives no salary slips');

  /* Finance Manager voids; nobody can edit an issued receipt */
  await as(FM);
  await userClick(p);
  const fmv = await p.evaluate(async no => { const a = FTA.RCPT.find(x => x.id === no); a.void = true; a.voidReason = 'Wrong amount'; a.voidBy = 'fake name'; a.voidAt = '1999-01-01'; await FTA.sync(); return FTA.mock.db().records['rcpt\u0001' + no].data; }, r2.view);
  ok(fmv.void === true && fmv.voidReason === 'Wrong amount' && fmv.voidByEmail === FM && fmv.voidAt > '2026', 'Finance Manager voids it; the server stamps who and when');
  await userClick(p);
  const edit = await p.evaluate(async no => { const a = FTA.RCPT.find(x => x.id === no); a.calc.paid = 1; a.d.name = 'Changed'; await FTA.sync(); return FTA.mock.db().records['rcpt\u0001' + no].data; }, 'FTA-' + yr + '-0001');
  ok(edit.calc.paid === 600000 && edit.d.name === 'Ayaan Rahman', 'an issued receipt can never be edited (amount and name unchanged on the server)');
  const sal = await p.evaluate(async () => {
    const RM = FTA_RECEIPT._rm(); FTA_RECEIPT.doc('salary'); RM.view = null; const d = RM.d.salary; d.name = 'Nusrat Jahan'; d.pkg.amt = '15000';
    FTA_RECEIPT.issue(false); for (let i = 0; i < 120 && (RM.busy || RM.d.salary.name === 'Nusrat Jahan'); i++) await new Promise(r => setTimeout(r, 150)); return RM.view;
  });
  ok(sal === 'FTA-SAL-' + yr + '-0001', 'Finance Manager issues a salary slip: ' + sal);
  /* settings: Finance may change them; the next number is a floor shared by everyone */
  await p.evaluate(() => { FTA_RECEIPT.doc('receipt'); FTA_RECEIPT.setNext('FTA-' + new Date().getFullYear() + '-0050'); });
  await p.evaluate(() => FTA.sync());
  d0 = await db(p);
  ok(((recs(d0, 'rcset').find(r => r.id === 'main') || {}).data || {}).seq && Object.values(recs(d0, 'rcset')[0].data.seq).includes(49), '"Next number" saved for everyone (shared settings record)');

  /* Junior Admin: receipts yes, salary slips no; Viewer: read only */
  await as(JA);
  ok(await p.evaluate(() => FTA.RCSAL.length === 0 && FTA.RCPT.length >= 3), 'Junior Admin sees receipts but not salary slips');
  const jaRes = await p.evaluate(async () => { const RM = FTA_RECEIPT._rm(); RM.doc = 'receipt'; RM.view = null; const d = RM.d.receipt; d.name = 'JA Test'; d.single.amt = '200'; FTA_RECEIPT.issue(false); for (let i = 0; i < 120 && (RM.busy || RM.d.receipt.name === 'JA Test'); i++) await new Promise(r => setTimeout(r, 150)); return RM.view; });
  ok(jaRes === 'FTA-' + yr + '-0050', 'Junior Admin issues from the shared next number (' + jaRes + ')');
  await as(VW);
  await userClick(p);
  const vw = await p.evaluate(async () => { FTA.RCPT.push({ id: 'FTA-2026-9999', no: 'FTA-2026-9999', d: { doc: 'receipt' }, tok: 'v' }); await FTA.sync(); return { server: !!FTA.mock.db().records['rcpt\u0001FTA-2026-9999'], local: FTA.RCPT.some(x => x.id === 'FTA-2026-9999'), page: ROLES.Viewer.pages.includes('rc-maker') }; });
  ok(!vw.server && !vw.local, 'Viewer cannot issue (refused, nothing saved)');
  ok(vw.page, 'Viewer can open Receipt Maker to read and reprint');

  console.log('4. Mentor: own profile only, own fields only');
  await as(T1);
  ok(await p.evaluate(() => ROLES.Mentor.pages.includes('tp-profile') && !ROLES.Mentor.pages.includes('rc-maker') && FTA.RCPT.length === 0), 'mentor has My Profile; no Receipt Maker and no receipts');
  await userClick(p);
  const ms = await p.evaluate(async () => { const m = MENTORS.find(x => x.id === 'MEN-01'); m.phone = '01999888777'; m.bio = 'I love grammar'; m.name = 'Hacked Name'; m.rate = 99; await FTA.sync(); return FTA.mock.db().records['mentors\u0001MEN-01'].data; });
  ok(ms.phone === '01999888777' && ms.bio === 'I love grammar', 'mentor changes own phone and bio (saved on the server)');
  ok(ms.name === 'Nusrat Jahan' && ms.rate === 50 && ms.notes === 'private note', 'name, pay rate and the office note stay as the office saved them');
  ok(await p.evaluate(() => MENTORS.find(x => x.id === 'MEN-01').name === 'Nusrat Jahan'), 'the screen shows the server\'s version back');
  await userClick(p);
  const other = await p.evaluate(async () => { const m = MENTORS.find(x => x.id === 'MEN-02'); if (!m) return 'not visible'; m.phone = '000'; await FTA.sync(); return FTA.mock.db().records['mentors\u0001MEN-02'].data.phone; });
  ok(other === '01712334466' || other === 'not visible', 'mentor cannot change another mentor (' + other + ')');
  await userClick(p);
  const sq = await p.evaluate(async () => {
    FTA.SLOTREQ.push({ id: 'SR-t1', mentor: 'MEN-01', stu: 'STU-1001', prog: 'PRG-01', when: 'Sun 5 pm', medium: 'Online', note: 'extra class', at: '2026-11-09', by: 'mentor', status: 'Approved' });
    FTA.SLOTREQ.push({ id: 'SR-t2', mentor: 'MEN-01', stu: 'STU-1002', prog: 'PRG-01', when: 'Mon', status: 'Pending' });
    await FTA.sync(); const d = FTA.mock.db(); return { a: (d.records['slotreq\u0001SR-t1'] || {}).data, b: d.records['slotreq\u0001SR-t2'] };
  });
  ok(sq.a && sq.a.status === 'Pending' && sq.a.mentor === 'MEN-01', 'slot request saved as Pending (the mentor cannot approve it)');
  ok(!sq.b, 'a request for a student the mentor does not teach is refused');
  await p.evaluate(() => { ST.page = 'tp-profile'; render(); }); await p.waitForTimeout(500);
  const mp = await p.evaluate(() => ({ page: ST.page, card: !!document.querySelector('#pt-host .pt-card'), txt: [...document.querySelectorAll('#pt-host .pt-ch')].map(x => x.textContent).join(' | ') }));
  ok(mp.card && /Requested/.test(mp.txt) && /Sun.*5 pm/.test(mp.txt), 'My Profile shows the Profile Tree with the requested slot' + (mp.card && /Requested/.test(mp.txt) && /Sun.*5 pm/.test(mp.txt) ? '' : ' [' + mp.page + ' card=' + mp.card + '] ' + mp.txt.replace(/\s+/g, ' ').slice(0, 300)));

  console.log('5. Office approves; the other mentor never sees it');
  await as(T2);
  ok(await p.evaluate(() => FTA.SLOTREQ.length === 0), 'another mentor does not receive the request');
  await as(OWNER);
  ok(await p.evaluate(() => FTA.SLOTREQ.some(x => x.id === 'SR-t1' && x.status === 'Pending')), 'office sees the pending request');
  await p.evaluate(() => { ST.page = 'cx-people'; render(); }); await p.waitForTimeout(400);
  await p.evaluate(() => { const b = document.querySelector('#cx-ptl [data-person="MEN-01"]'); b && b.click(); }); await p.waitForTimeout(400);
  const btn = await p.$('#pt-host [data-act="rok"]');
  ok(!!btn, 'Approve button on the Profiles page');
  if (btn) { await btn.click(); await p.waitForTimeout(300); }
  await p.evaluate(() => FTA.sync());
  d0 = await db(p);
  const sr = (recs(d0, 'slotreq').find(r => r.id === 'SR-t1') || {}).data || {}, men = (recs(d0, 'mentors').find(r => r.id === 'MEN-01') || {}).data || {};
  ok(sr.status === 'Approved' && (men.slotsPlan || []).some(x => x.id === 'SR-t1' && x.by === 'mentor'), 'approved: request answered and the slot is on the mentor\'s plan');

  console.log('6. Student: own About me / address only');
  await as(S1);
  await userClick(p);
  const st = await p.evaluate(async () => { const s = STUDENTS.find(x => x.id === 'STU-1001'); s.bio = 'Football and maths'; s.address = 'Savar'; s.cls = 'Grade 12'; s.phone = '0'; await FTA.sync(); return FTA.mock.db().records['students\u0001STU-1001'].data; });
  ok(st.bio === 'Football and maths' && st.address === 'Savar' && st.cls === 'Grade 9' && st.phone === '01711000001' && (st.notes || []).length === 1, 'student saves About me and address; class, phone and office notes unchanged');
  ok(await p.evaluate(() => ROLES.Student.pages.includes('sp-profile')), 'student has My Profile');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  console.log(`\n${pass}/${pass + fail} passed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
