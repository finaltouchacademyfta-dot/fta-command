/* Worker L · per-student class times (routine by student, Class status by student) (mock backend = same server code and policy)
   Run:  cd /home/claude/prod && MODE=mock python3 build.py && node tests/j-classroom.js */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8774, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = http.createServer((q, s) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(s);
});
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const OWNER = 'owner@gmail.com', T1 = 'nusrat.teacher@gmail.com', T2 = 'tanvir.teacher@gmail.com', S1 = 'ayaan.student@gmail.com', S2 = 'rafi.student@gmail.com', FM = 'finance.fta@gmail.com', JA = 'junior.fta@gmail.com';
const ready = p => p.waitForFunction(() => document.documentElement.classList.contains('fta-on') && window.FTA && FTA.member && window.FTA_CLASSROOM, null, { timeout: 30000 });
const rec = (p, c, id) => p.evaluate(([c, id]) => { const r = FTA.mock.db().records[c + '\u0001' + id]; return r && !r.deleted ? r.data : null; }, [c, id]);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404|beforeunload/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  const as = async email => { await p.evaluate(async () => { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); }); await p.evaluate(e => localStorage.setItem('fta-mock-session', e), email); await p.reload(); await ready(p); await p.waitForTimeout(500); };
  const click = () => p.mouse.click(5, 300);
  const setMember = (e, patch) => p.evaluate(([e, patch]) => { const d = JSON.parse(localStorage.getItem('fta-mock-db')); d.members[e] = Object.assign(d.members[e] || { email: e, created_at: new Date().toISOString() }, { email: e, active: true }, patch); localStorage.setItem('fta-mock-db', JSON.stringify(d)); }, [e, patch]);

  console.log('0. Setup');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0);
  await p.waitForSelector('#fg-email', { timeout: 30000 }); await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  await p.evaluate(({ T1, T2, S1, S2 }) => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE English', fee: 6000, type: 'Individual', status: 'Active' }, { id: 'PRG-02', name: 'IGCSE Maths', fee: 7000, type: 'Individual', status: 'Active' });
    MENTORS.push({ id: 'MEN-01', name: 'Nusrat Jahan', gmail: T1, phone: '01712334455', subjects: 'English', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    MENTORS.push({ id: 'MEN-02', name: 'Tanvir Ahmed', gmail: T2, phone: '01712334466', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 40, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    STUDENTS.push({ id: 'STU-1001', name: 'Ayaan Rahman', guardian: 'Rahman', phone: '01711000001', gphone: '01811000001', address: 'Savar', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [], gmail: S1 });
    STUDENTS.push({ id: 'STU-1002', name: 'Rafi Hasan', guardian: 'Hasan', phone: '01711000002', cls: 'Grade 10', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [], gmail: S2 });
    ENROL.push({ id: 'ENR-2001', stu: 'STU-1001', prog: 'PRG-01', mentor: 'MEN-01', type: 'Individual', fees: [{ from: '2026-10', fee: 6000 }], disc: 0, start: '2026-10-01', status: 'Active' });
    ENROL.push({ id: 'ENR-2002', stu: 'STU-1002', prog: 'PRG-02', mentor: 'MEN-02', type: 'Individual', fees: [{ from: '2026-10', fee: 7000 }], disc: 0, start: '2026-10-01', status: 'Active' });
    V9G.toGroups('STU-1001'); V9G.toGroups('STU-1002');
    SCH.SPORT.push({ stu: 'STU-1001', gmail: S1, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' }, { stu: 'STU-1002', gmail: S2, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' });
    render();
  }, { T1, T2, S1, S2 });
  await p.evaluate(() => FTA.sync());
  await setMember(FM, { role: 'Finance Manager' }); await setMember(JA, { role: 'Junior Admin' });
  const g1 = await p.evaluate(() => (SCH.GROUPS.find(g => g.mentor === 'MEN-01') || {}).id), g2 = await p.evaluate(() => (SCH.GROUPS.find(g => g.mentor === 'MEN-02') || {}).id);
  ok(!!g1 && !!g2, 'two classes (' + g1 + ', ' + g2 + ')');
  const nav = await p.evaluate(() => FLAT.map(f => f[0]));
  ok(nav.includes('cx-live') && nav.includes('cx-chat') && nav.includes('cx-people'), 'office menu: Profiles, Class status, Messages');
  ok(await p.evaluate(() => (NAV.find(g => g[0] === 'Connect') || [0, []])[1].map(x => x[0]).join(',')) === 'cx-people,cx-live,cx-chat', 'they sit together under "Connect"');


  console.log('1. Mentor sets class times by student');
  await as(T1);
  await p.evaluate(() => go('tp-routine')); await p.waitForTimeout(600);
  const c1 = await p.evaluate(() => { const c = document.querySelector('.st-card'); return c ? c.innerText : ''; });
  ok(/My students’ class times/.test(c1) && /Ayaan Rahman/.test(c1) && /No class time yet/.test(c1), 'My Routine lists my students, with "No class time yet"');
  ok(!/Rafi Hasan/.test(c1), 'another mentor\'s student is not listed');
  await p.click('.st-card button:has-text("Set time")'); await p.waitForTimeout(400);
  const dow = await p.evaluate(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]);
  await p.check('.v9j-dpick input[value="' + dow + '"]');
  await p.fill('#v9j-a', '17:30'); await p.selectOption('#st-dur', '45');
  ok(await p.evaluate(() => document.getElementById('v9j-b').value) === '18:15', 'Duration 45 min fills the end time (17:30 → 18:15)');
  await p.click('#v9h-pop button:has-text("Save")'); await p.waitForTimeout(500);
  await p.evaluate(() => { try { closeSheet(); } catch (e) { } }); await p.waitForTimeout(400);
  await p.evaluate(() => FTA.sync());
  const rt = await p.evaluate(() => Object.values(FTA.mock.db().records).filter(r => r.collection === 'rt' && !r.deleted).map(r => r.data));
  ok(rt.length === 1 && rt[0].stu && rt[0].stu[0] === 'STU-1001' && rt[0].start === '17:30' && rt[0].end === '18:15', 'saved on the server as Ayaan\'s own time');
  await p.evaluate(() => go('tp-routine')); await p.waitForTimeout(500);
  const wk = await p.evaluate(() => document.querySelector('.rt-wk').innerText);
  ok(/Ayaan Rahman · IGCSE English/.test(wk), 'the weekly routine shows the student\'s name on the session');
  ok(await p.evaluate(() => /Change/.test(document.querySelector('.st-card').innerText) && !/No class time yet/.test(document.querySelector('.st-card').innerText)), 'the list now shows the time');
  await p.evaluate(() => { const b = [...document.querySelectorAll('.rt-it')].find(x => /Ayaan/.test(x.innerText)); b && b.click(); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => /Change class day · Ayaan Rahman/.test((document.getElementById('v9h-pop') || {}).innerText || '')), 'tapping the session opens Ayaan\'s own time, not the general form');
  await p.evaluate(() => V9H.popClose()); await p.waitForTimeout(200);

  console.log('2. Class status by student');
  await p.evaluate(() => go('tp-live')); await p.waitForTimeout(500);
  const row = await p.evaluate(() => { const r = document.querySelector('#cx-root .cl-row'); return r ? r.innerText : ''; });
  ok(/Ayaan Rahman/.test(row) && /IGCSE English/.test(row), 'today\'s row is titled with the student\'s name (' + row.replace(/\s+/g, ' ').slice(0, 80) + ')');
  await p.click('#cx-root [data-cl="start"][data-stu="STU-1001"]'); await p.waitForTimeout(400); await p.evaluate(() => FTA.sync());
  const sess = await p.evaluate(() => Object.values(FTA.mock.db().records).filter(r => r.collection === 'clslive').map(r => r.data));
  ok(sess.length === 1 && sess[0].stu && sess[0].stu.join() === 'STU-1001' && sess[0].status === 'On', 'the class started for Ayaan only (saved with the student)');
  await as(S1);
  ok(await p.evaluate(() => FTA.CLSLIVE.some(x => x.status === 'On')), 'Ayaan sees his class running');
  await p.evaluate(() => go('sp-live')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /Running now/.test(document.getElementById('view').innerText)), 'Ayaan\'s Class status says Running now');

  console.log('3. Office: new student goes straight to class times; office list per teacher');
  await as(OWNER);
  await p.evaluate(() => { go('students'); studentForm(); }); await p.waitForTimeout(500);
  await p.fill('#nf-n', 'Nabila Karim'); await p.fill('#nf-c', 'Grade 8');
  await p.click('#v9h-sb'); await p.waitForTimeout(300); await p.locator('#v9h-sbl label:has-text("IGCSE English")').click(); await p.click('#v9h-pop button:has-text("Done")'); await p.waitForTimeout(300);
  await p.evaluate(() => saveStudent()); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => /STUDENT ROUTINE/.test((document.getElementById('sheet') || {}).innerText || '') && /Nabila Karim/.test(document.getElementById('sheet').innerText)), 'after Save the office lands on Nabila\'s class times');
  await p.evaluate(() => { try { closeSheet(); } catch (e) { } SCH.RS.by = 'men'; SCH.RS.men = 'MEN-01'; go('ac-routine'); }); await p.waitForTimeout(600);
  const oc = await p.evaluate(() => (document.querySelector('.st-card') || {}).innerText || '');
  ok(/Students’ class times · Nusrat Jahan/.test(oc) && /Nabila Karim/.test(oc) && /Ayaan Rahman/.test(oc), 'office routine (teacher view) lists that teacher\'s students and their times');

  console.log('4. Server rules');
  await as(T2);
  await click();
  const bad = await p.evaluate(async () => { SCH.RT.push({ id: 'RT-X', day: 'Sat', start: '10:00', end: '11:00', gid: 'G1', mentor: 'MEN-01', stu: ['STU-1001'], title: '', place: '', note: '' }); await FTA.sync(); return !!FTA.mock.db().records['rt\u0001RT-X']; });
  ok(!bad, 'a mentor cannot set times for another mentor\'s student');
  await as(S2);
  ok(await p.evaluate(() => !FTA.CLSLIVE.length && !SCH.RT.some(e => e.stu && e.stu.includes('STU-1001'))), 'another student sees neither Ayaan\'s time nor his class');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  console.log(`\n${pass}/${pass + fail} passed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
