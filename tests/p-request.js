/* Worker P · mentor requests to change / edit / delete a student (office approves) (mock backend = the same server code and policy as production)
   Run:  cd /home/claude/fta-command && MODE=mock python3 build.py && node tests/p-request.js */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8784, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = http.createServer((q, s) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(s);
});
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const OWNER = 'owner@gmail.com', T1 = 'nusrat.teacher@gmail.com', T2 = 'tanvir.teacher@gmail.com';
const ready = p => p.waitForFunction(() => document.documentElement.classList.contains('fta-on') && window.FTA && FTA.member, null, { timeout: 30000 });
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404|beforeunload/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  const as = async email => { await p.evaluate(async () => { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); }); await p.evaluate(e => localStorage.setItem('fta-mock-session', e), email); await p.reload(); await ready(p); await p.waitForTimeout(400); };
  const sync = () => p.evaluate(() => FTA.sync());
  const setMember = (e, patch) => p.evaluate(([e, patch]) => { const d = JSON.parse(localStorage.getItem('fta-mock-db')); d.members[e] = Object.assign(d.members[e] || { email: e, created_at: new Date().toISOString() }, { active: true }, patch); localStorage.setItem('fta-mock-db', JSON.stringify(d)); }, [e, patch]);
  const sees = (id) => p.evaluate(id => !!STUDENTS.find(s => s.id === id), id);
  const listed = () => p.evaluate(() => { const a = new Set(); SCH.myGroups().forEach(g => g.stu.forEach(x => a.add(x))); return [...a].filter(x => STUDENTS.find(s => s.id === x)).sort(); });



  const ST1 = 'zara.student@gmail.com';
  const stuIds = () => p.evaluate(() => STUDENTS.map(s => s.id).sort());
  const pend = () => p.evaluate(() => V8.SREQ.filter(r => r.status === 'Pending').map(r => r.kind + ':' + r.sid));
  const st = id => p.evaluate(id => { const s = STUDENTS.find(x => x.id === id); return s && { name: s.name, status: s.status, cls: s.cls }; }, id);

  console.log('0. Setup');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0);
  await p.waitForSelector('#fg-email', { timeout: 30000 }); await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  await p.evaluate(({ T1, T2 }) => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE Mathematics', fee: 6000, type: 'Individual', status: 'Active', subject: 'Maths' });
    MENTORS.push({ id: 'MEN-01', name: 'Ibrahim', gmail: T1, phone: '01712334455', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    MENTORS.push({ id: 'MEN-02', name: 'Tanvir', gmail: T2, phone: '01712334466', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 40, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    STUDENTS.push({ id: 'STU-1001', name: 'Zara Ahmed', gmail: 'zara.student@gmail.com', guardian: 'Ahmed', phone: '01711555001', cls: 'Grade 8', board: 'Cambridge', beh: 'good', joined: '2026-10-05', status: 'Active', notes: [] });
    STUDENTS.push({ id: 'STU-1002', name: 'Omar Faruk', guardian: 'Faruk', phone: '01711555002', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-10-05', status: 'Active', notes: [] });
    ENROL.push({ id: 'ENR-2001', stu: 'STU-1001', prog: 'PRG-01', mentor: 'MEN-01', type: 'One-to-One', batch: '', start: '2026-10-01', end: '', disc: 0, discEnd: '', discBy: '', classes: 8, freq: 'Monthly', status: 'Active', statusFrom: '2026-10', sh: [], fees: [{ from: '2026-10', fee: 6000, by: 'x', note: '' }] });
    ENROL.push({ id: 'ENR-2002', stu: 'STU-1002', prog: 'PRG-01', mentor: 'MEN-01', type: 'One-to-One', batch: '', start: '2026-10-01', end: '', disc: 0, discEnd: '', discBy: '', classes: 8, freq: 'Monthly', status: 'Active', statusFrom: '2026-10', sh: [], fees: [{ from: '2026-10', fee: 6000, by: 'x', note: '' }] });
    V9G.toGroups('STU-1001'); V9G.toGroups('STU-1002'); SCH.SPORT.push({ stu: 'STU-1001', gmail: 'zara.student@gmail.com', status: 'Active', by: 'Owner', at: TODAY }); render();
  }, { T1, T2 });
  await sync(); await setMember(ST1, { role: 'Student', student_id: 'STU-1001', name: 'Zara Ahmed' });

  console.log('1. The mentor can ask from the profile tree and from My Students');
  await as(T1);
  await p.evaluate(() => go('tp-profile')); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => document.querySelectorAll('#pt-host [data-act="chg"]').length >= 2), 'every student card in the tree has “Request change”');
  await p.evaluate(() => go('tp-students')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelectorAll('#view .v9q-b').length >= 2), 'My Students rows have “Request change”');
  await p.evaluate(() => V9Q.open('STU-1001')); await p.waitForTimeout(300);
  const sheetTxt = await p.evaluate(() => document.getElementById('sheet').textContent);
  ok(/Change status/.test(sheetTxt) && /Edit details/.test(sheetTxt) && /Delete student/.test(sheetTxt), 'the sheet offers status, edit and delete');

  console.log('2. Status (Hold), edit and delete requests are sent — nothing changes yet');
  await p.evaluate(() => V8.subjForm('STU-1001', '*')); await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelector('input[name=sf-st][value=Paused]').checked = true; }); await p.fill('#sf-r', 'Exam break');
  await p.evaluate(() => V8.subjSave()); await p.waitForTimeout(500);
  await p.evaluate(() => V9Q.editForm('STU-1002')); await p.waitForTimeout(300);
  await p.fill('#v9q-n', 'Omar Faruque'); await p.fill('#v9q-c', 'Grade 10'); await p.fill('#v9q-p', '+971 50 123 4567'); await p.fill('#v9q-r', 'Spelling and class'); await p.click('#v9q-n');
  await p.evaluate(() => V9Q.editSave('STU-1002')); await p.waitForTimeout(500);
  await p.evaluate(() => V9Q.delForm('STU-1002')); await p.waitForTimeout(300); await p.fill('#v9q-r', 'Added twice'); await p.evaluate(() => V9Q.delSave('STU-1002')); await p.waitForTimeout(500);
  await sync();
  ok((await pend()).sort().join() === 'sdel:STU-1002,sedit:STU-1002,status:STU-1001', 'three requests waiting (' + (await pend()).join() + ')');
  ok((await st('STU-1001')).status === 'Active' && (await st('STU-1002')).name === 'Omar Faruk', 'nothing has changed yet');
  await p.evaluate(() => V9Q.open('STU-1002')); await p.waitForTimeout(300);
  ok(/Waiting for the office/.test(await p.evaluate(() => document.getElementById('sheet').textContent)), 'the mentor sees what is waiting');

  console.log('3. Another mentor cannot ask about a student that is not theirs (server)');
  await as(T2);
  await p.evaluate(() => { V8.SREQ.push({ id: 'SR-99', by: 'MEN-02', sid: 'STU-1001', kind: 'sdel', note: 'x', status: 'Pending', at: 'now' }); }); await sync();
  ok(await p.evaluate(() => !FTA.mock.db().records['sreq\u0001SR-99']), 'the server refused it');

  console.log('4. Office sees the queue; Student cannot see it');
  await as(OWNER);
  ok((await pend()).length === 3, 'Owner sees 3 waiting requests');
  await p.evaluate(() => go('ac-portals')); await p.waitForTimeout(500);
  ok(/Student and subject changes from teachers/.test(await p.evaluate(() => document.getElementById('view').textContent)) && /edit name, class, WhatsApp/.test(await p.evaluate(() => document.getElementById('view').textContent)), 'queue shows the edit request');
  try { await as(ST1); } catch (e) { console.log('ERRS', await p.evaluate(() => JSON.stringify(Object.keys(FTA.mock.db().members)) + localStorage.getItem('fta-mock-session')), errs.slice(-4), await p.evaluate(() => document.body.innerText.slice(0, 300))); throw e; }
  ok(await p.evaluate(() => (V8.SREQ || []).length === 0), 'the student cannot see requests');

  console.log('5. Office approves: status, edit, delete');
  await as(OWNER);
  const id = k => p.evaluate(k => (V8.SREQ.find(r => r.kind === k && r.status === 'Pending') || {}).id, k);
  await p.evaluate(i => V8.sreqDo(i, true), await id('status')); await p.waitForTimeout(300);
  ok((await st('STU-1001')).status === 'Paused', 'student is now Paused (Hold)');
  await p.evaluate(i => V8.sreqDo(i, true), await id('sedit')); await p.waitForTimeout(300);
  const e = await p.evaluate(() => { const s = STUDENTS.find(x => x.id === 'STU-1002'); return { n: s.name, c: s.cls, ph: s.phone }; });
  ok(e.n === 'Omar Faruque' && e.c === 'Grade 10' && e.ph === '+971501234567', 'details changed (' + JSON.stringify(e) + ')');
  await p.evaluate(() => { SCH.confirm = o => o.onOk('approved request'); }); await p.evaluate(i => V8.sreqDo(i, true), await id('sdel')); await p.waitForTimeout(500);
  ok(!(await stuIds()).includes('STU-1002') && await p.evaluate(() => SCH.BIN.some(b => /Omar/.test(b.what || b.name || JSON.stringify(b)))), 'student deleted → Recycle bin');
  ok((await pend()).length === 0, 'no request left open');
  await sync();
  await as(T1);
  ok(!(await stuIds()).includes('STU-1002'), 'mentor no longer receives the deleted student');
  ok(await p.evaluate(() => V8.SREQ.filter(r => r.by === 'MEN-01').every(r => r.status !== 'Pending')), 'mentor sees the answers');
  await as(ST1); ok((await st('STU-1001')).status === 'Paused', 'student record shows the new status');

  console.log('6. Decline, and the Owner can switch the option off for mentors');
  await as(OWNER);
  await p.evaluate(() => { STUDENTS.push({ id: 'STU-1003', name: 'Mira Khan', guardian: 'K', phone: '01711555003', cls: 'Grade 7', board: 'Cambridge', beh: 'good', joined: '2026-10-05', status: 'Active', notes: [] }); ENROL.push({ id: 'ENR-2003', stu: 'STU-1003', prog: 'PRG-01', mentor: 'MEN-01', type: 'One-to-One', batch: '', start: '2026-10-01', end: '', disc: 0, discEnd: '', discBy: '', classes: 8, freq: 'Monthly', status: 'Active', statusFrom: '2026-10', sh: [], fees: [{ from: '2026-10', fee: 6000, by: 'x', note: '' }] }); V9G.toGroups('STU-1003'); }); await sync();
  await as(T1);
  await p.evaluate(() => { V8.SREQ.push({ id: 'SR-50', by: 'MEN-01', sid: 'STU-1003', kind: 'sedit', patch: { name: 'Mira K' }, note: 'typo', status: 'Pending', at: 'now' }); }); await sync();
  await as(OWNER);
  await p.evaluate(() => V8.sreqDo('SR-50', false)); await sync();
  ok((await st('STU-1003')).name === 'Mira Khan' && (await pend()).length === 0, 'declined: nothing changed');
  await p.evaluate(() => { SCH.PERM.Mentor.stureq = ''; }); await sync();
  await as(T1);
  await p.evaluate(() => V9Q.open('STU-1003')); await p.waitForTimeout(300);
  const t2 = await p.evaluate(() => document.getElementById('sheet').textContent);
  ok(!/Edit details/.test(t2) && !/Delete student/.test(t2), 'switched off by the Owner: edit and delete are not offered');

  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (errs.length ? ', ' + errs.length + ' page errors' : ''));
  errs.slice(0, 8).forEach(e => console.log('  ! ' + e.slice(0, 200)));
  await b.close(); server.close(); process.exit(fail || errs.length ? 1 : 0);
})();
