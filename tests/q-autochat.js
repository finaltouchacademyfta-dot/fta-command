/* Worker Q · automatic mentor-student chats (mock backend = the same server code and policy as production)
   Run:  cd /home/claude/fta-command && MODE=mock python3 build.py && node tests/p-request.js */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8785, URL0 = 'http://localhost:' + PORT + '/';
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

  const rooms = () => p.evaluate(() => { try { return (window.ZC && ZC.rooms ? ZC.rooms() : []).length; } catch (e) { return -1; } });
  const chats = async () => { await p.evaluate(() => go('tp-chat') ); return 0; };
  const names = async (page) => { await p.evaluate(pg => go(pg), page); await p.waitForTimeout(900); return p.evaluate(() => [...document.querySelectorAll('.zc-ri b')].map(x => x.textContent.replace(/private/i, '').trim())); };
  console.log('1. Mentor + student see each other automatically');
  await as(T1); const pgT = await p.evaluate(() => Object.keys(PAGES).filter(k => /chat|msg/.test(k)).join());
  console.log('   pages: ' + pgT);
  const tp = pgT.split(',').find(x => /^tp-/.test(x)), sp = pgT.split(',').find(x => /^sp-/.test(x));
  let n = await names(tp); ok(n.includes('Zara Ahmed') && n.includes('Omar Faruk'), 'mentor Ibrahim sees chats with both students (' + n.join(' | ') + ')');
  await as(ST1); n = await names(sp); ok(n.includes('Ibrahim'), 'student Zara sees a chat with Ibrahim (' + n.join(' | ') + ')');
  await as(T2); n = await names(tp); ok(!n.includes('Zara Ahmed'), 'the other mentor does not see Zara yet');
  console.log('2. A message in the new chat goes through');
  await as(T1); await names(tp);
  await p.evaluate(() => { document.querySelector('[data-room="dm:MEN-01|STU-1001"]').click(); }); await p.waitForTimeout(300);
  await p.fill('#zc-in', 'Hello Zara'); await p.click('#zc-send'); await p.waitForTimeout(800); await sync();
  await as(ST1); await names(sp); await p.evaluate(() => document.querySelector('[data-room="dm:MEN-01|STU-1001"]').click()); await p.waitForTimeout(300);
  ok(/Hello Zara/.test(await p.evaluate(() => document.getElementById('zc-ml').textContent)), 'the student reads it');
  console.log('3. Student moves to another mentor — the chat moves with them');
  await as(OWNER);
  await p.evaluate(() => { SCH.confirm = o => o.onOk('timing'); V9T.change('ENR-2001', 'MEN-02'); }); await p.waitForTimeout(400); await sync();
  await as(T1); n = await names(tp); ok(!n.includes('Zara Ahmed') && n.includes('Omar Faruk'), 'old mentor lost Zara, keeps Omar (' + n.join(' | ') + ')');
  await as(T2); n = await names(tp); ok(n.includes('Zara Ahmed'), 'new mentor Tanvir now has Zara (' + n.join(' | ') + ')');
  await as(ST1); n = await names(sp); ok(n.includes('Tanvir') && !n.includes('Ibrahim'), 'student now chats with Tanvir only (' + n.join(' | ') + ')');
  await p.evaluate(() => document.querySelector('[data-room="dm:MEN-02|STU-1001"]').click()); await p.waitForTimeout(300);
  await p.fill('#zc-in', 'Hi sir'); await p.click('#zc-send'); await p.waitForTimeout(800); await sync();
  await as(T2); await names(tp); await p.evaluate(() => document.querySelector('[data-room="dm:MEN-02|STU-1001"]').click()); await p.waitForTimeout(300);
  ok(/Hi sir/.test(await p.evaluate(() => document.getElementById('zc-ml').textContent)), 'new mentor receives the student’s message');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' ; '));
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); await b.close(); server.close(); process.exit(fail ? 1 : 0);
})();
