/* Worker R · role labels + office send/delete in mentor-student chats */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8788, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(s); });
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const OWNER = 'owner@gmail.com', T1 = 'nusrat.teacher@gmail.com', ST1 = 'zara.student@gmail.com';
const ready = p => p.waitForFunction(() => document.documentElement.classList.contains('fta-on') && window.FTA && FTA.member, null, { timeout: 30000 });
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const as = async email => { await p.evaluate(async () => { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); }); await p.evaluate(e => localStorage.setItem('fta-mock-session', e), email); await p.reload(); await ready(p); };
  const sync = () => p.evaluate(() => FTA.sync());
  const setMember = (e, patch) => p.evaluate(([e, patch]) => { const d = JSON.parse(localStorage.getItem('fta-mock-db')); d.members[e] = Object.assign(d.members[e] || { email: e, created_at: new Date().toISOString() }, patch); localStorage.setItem('fta-mock-db', JSON.stringify(d)); }, [e, patch]);
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0);
  await p.waitForSelector('#fg-email', { timeout: 30000 }); await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  await p.evaluate(T1 => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE Mathematics', fee: 6000, type: 'Individual', status: 'Active', subject: 'Maths' });
    MENTORS.push({ id: 'MEN-01', name: 'Ibrahim', gmail: T1, phone: '01712334455', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    STUDENTS.push({ id: 'STU-1001', name: 'Zara Ahmed', gmail: 'zara.student@gmail.com', guardian: 'Ahmed', phone: '01711555001', cls: 'Grade 8', board: 'Cambridge', beh: 'good', joined: '2026-10-05', status: 'Active', notes: [] });
    ENROL.push({ id: 'ENR-2001', stu: 'STU-1001', prog: 'PRG-01', mentor: 'MEN-01', type: 'One-to-One', batch: '', start: '2026-10-01', end: '', disc: 0, discEnd: '', discBy: '', classes: 8, freq: 'Monthly', status: 'Active' });
    V9G.toGroups('STU-1001'); SCH.SPORT.push({ stu: 'STU-1001', gmail: 'zara.student@gmail.com', status: 'Active', by: 'Owner', at: TODAY }); render();
  }, T1);
  await sync(); await setMember(ST1, { role: 'Student', student_id: 'STU-1001', name: 'Zara Ahmed' });
  await as(T1);
  const h = await p.evaluate(() => { V8.share = () => [{ stu: 'STU-1001', prog: 'PRG-01', t: 3000, fixed: false, batch: '' }]; return V8.myShare(); });
  ok(!/%|agreed fee|your share|Pay rule/i.test(h), 'mentor share card shows no percentage or rule');
  ok(/3,000|3000/.test(h) && /Your earning this month so far/.test(h), 'amount owed and total are shown');
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
