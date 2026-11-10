/* Worker M · one student, three subjects, three teachers: one Gmail, one portal (mock backend = same server code and policy)
   Run:  cd /home/claude/prod && MODE=mock python3 build.py && node tests/j-classroom.js */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8775, URL0 = 'http://localhost:' + PORT + '/';
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



  console.log('1. Office adds one student with 3 subjects and 3 teachers in one form');
  await as(OWNER);
  await p.evaluate(() => {
    PROGS.push({ id: 'PRG-03', name: 'IGCSE Physics', fee: 6500, type: 'Individual', status: 'Active', subject: 'Physics' });
    MENTORS.push({ id: 'MEN-03', name: 'Farhan Kabir', gmail: 'farhan.teacher@gmail.com', phone: '01712334477', subjects: 'Physics', status: 'Active', model: 'pct_fee', rate: 45, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    render();
  });
  await p.evaluate(() => FTA.sync());
  await p.evaluate(() => { go('students'); studentForm(); }); await p.waitForTimeout(500);
  await p.fill('#nf-n', 'Zara Ahmed'); await p.fill('#nf-g', 'Kamal Ahmed'); await p.fill('#nf-p', '01711000009'); await p.fill('#nf-c', 'Grade 10'); await p.fill('#nf-e', 'zara.student@gmail.com');
  await p.click('#v9h-sb'); await p.waitForTimeout(300);
  for (const n of ['IGCSE English', 'IGCSE Maths', 'IGCSE Physics']) await p.locator('#v9h-sbl label:has-text("' + n + '")').click();
  await p.click('#v9h-pop button:has-text("Done")'); await p.waitForTimeout(400);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#sheet select')].filter(s => s.offsetParent && [...s.options].some(o => /MEN-/.test(o.value))).map(s => ({ id: s.id, v: s.value, opts: [...s.options].map(o => o.value).join(',') })));
  console.log('     mentor pickers:', JSON.stringify(rows));
  /* pick the right teacher for each subject */
  await p.evaluate(() => { const want = { 'English': 'MEN-01', 'Maths': 'MEN-02', 'Physics': 'MEN-03' }; [...document.querySelectorAll('#sheet select')].filter(s => s.offsetParent && [...s.options].some(o => /MEN-/.test(o.value))).forEach(s => { const row = s.closest('div[class]'); let t = ''; for (let x = s; x && !t; x = x.parentElement) { const m = (x.innerText || '').match(/IGCSE (English|Maths|Physics)/); if (m && x.innerText.match(/IGCSE/g).length === 1) t = m[1]; } if (want[t]) { s.value = want[t]; s.dispatchEvent(new Event('change', { bubbles: true })); } }); });
  await p.evaluate(() => saveStudent()); await p.waitForTimeout(1200);
  await p.evaluate(() => { try { closeSheet(); } catch (e) { } }); await p.evaluate(() => FTA.sync());
  const z = await p.evaluate(() => { const s = STUDENTS.find(x => x.name === 'Zara Ahmed'); return { id: s.id, enr: ENROL.filter(e => e.stu === s.id).map(e => (PROGS.find(q => q.id === e.prog) || {}).name + '→' + e.mentor), grp: SCH.GROUPS.filter(g => (g.stu || []).includes(s.id)).map(g => g.name + '→' + g.mentor) }; });
  console.log('     ', JSON.stringify(z));
  ok(z.enr.length === 3 && new Set(z.enr.map(x => x.split('→')[1])).size === 3, 'one student, 3 enrolments, 3 different teachers');
  ok(z.grp.length === 3, 'she sits in 3 subject groups, one per teacher');
  const d0 = await p.evaluate(() => FTA.mock.db().members);
  ok(Object.values(d0).filter(m => m.student_id === z.id).length === 1, 'one Gmail = one student login (no extra Gmails needed)');

  console.log('2. Each teacher sees only their own subject with her');
  for (const [mail, subj, other] of [[T1, 'English', 'Physics'], [T2, 'Maths', 'English'], ['farhan.teacher@gmail.com', 'Physics', 'Maths']]) {
    await setMember('farhan.teacher@gmail.com', { role: 'Mentor', mentor_id: 'MEN-03', name: 'Farhan Kabir' });
    await as(mail);
    const v = await p.evaluate(id => ({ seen: STUDENTS.some(s => s.id === id), phone: (STUDENTS.find(s => s.id === id) || {}).phone, groups: SCH.GROUPS.filter(g => (g.stu || []).includes(id)).map(g => g.name), enr: ENROL.filter(e => e.stu === id).length }), z.id);
    ok(v.seen && !v.phone, mail.split('.')[0] + ': sees Zara (no phone)');
    ok(v.groups.length === 1 && new RegExp(subj).test(v.groups[0]), mail.split('.')[0] + ': only the ' + subj + ' class with her (' + v.groups.join(',') + ')');
    ok(v.enr <= 1, mail.split('.')[0] + ': not the other teachers\' enrolments (' + v.enr + ')');
  }

  console.log('3. Zara: one portal with all 3 subjects and all 3 teachers');
  await setMember('zara.student@gmail.com', { role: 'Student', student_id: z.id, name: 'Zara Ahmed' });
  await as('zara.student@gmail.com');
  const sv = await p.evaluate(() => ({ g: SCH.GROUPS.map(g => g.name + '→' + g.mentor), men: MENTORS.map(m => m.name) }));
  console.log('     ', JSON.stringify(sv));
  ok(sv.g.length === 3 && new Set(sv.g.map(x => x.split('→')[1])).size === 3, 'her portal shows all 3 subjects with their teachers');
  await p.evaluate(() => go('sp-chat')); await p.waitForTimeout(600);
  const chats = await p.evaluate(() => document.getElementById('zc-side').innerText);
  ok(/IGCSE English/.test(chats) && /IGCSE Physics/.test(chats), 'Messages: a class group for each subject');
  await p.fill('#zc-q', 'Farhan'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Farhan Kabir/.test(document.getElementById('zc-side').innerText)), 'she can start a private chat with each of her teachers');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  console.log(`\n${pass}/${pass + fail} passed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
