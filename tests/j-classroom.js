/* Worker J · Class status + Messages + no contact details for mentors (mock backend = same server code and policy)
   Run:  cd /home/claude/prod && MODE=mock python3 build.py && node tests/j-classroom.js */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8773, URL0 = 'http://localhost:' + PORT + '/';
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

  console.log('1. Mentor never receives a student\'s phone, Gmail or address');
  await as(T1);
  const st = await p.evaluate(() => STUDENTS.map(s => ({ id: s.id, phone: s.phone, gphone: s.gphone, gmail: s.gmail, address: s.address, name: s.name, guardian: s.guardian })));
  ok(st.length === 1 && st[0].id === 'STU-1001' && st[0].name === 'Ayaan Rahman', 'mentor sees only their own student');
  ok(!st[0].phone && !st[0].gphone && !st[0].gmail && !st[0].address, 'no phone, guardian phone, Gmail or address reached the mentor\'s browser');
  ok(await p.evaluate(() => SCH.SPORT.every(x => !x.gmail)), 'student-portal list without Gmail for the mentor');
  ok(await p.evaluate(() => !/01711000001|01811000001|ayaan\.student/.test(JSON.stringify([STUDENTS, SCH.SPORT, ENROL]))), 'the numbers are nowhere in the mentor\'s data');

  console.log('2. Class status: mentor starts and ends; office and students see it');
  ok(await p.evaluate(() => ROLES.Mentor.pages.includes('tp-live') && ROLES.Mentor.pages.includes('tp-chat')), 'mentor has Class status and Messages');
  await p.evaluate(() => go('tp-live')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!document.querySelector('#cx-root .cl-wrap')), 'Class status page opens for the mentor');
  await click();
  const bad = await p.evaluate(async g2 => { FTA.CLSLIVE.push({ id: g2 + '|x', gid: g2, status: 'On', link: '', date: TODAY, start: new Date().toISOString() }); await FTA.sync(); return !!FTA.mock.db().records['clslive\u0001' + g2 + '|x']; }, g2);
  ok(!bad, 'a mentor cannot start another mentor\'s class');
  await p.evaluate(g1 => FTA_CLASSROOM.startClass(g1, 'javascript:alert(1)'), g1);
  ok(await p.evaluate(() => FTA.CLSLIVE.filter(x => x.status === 'On').length === 0), 'a link that is not https is refused');
  await p.evaluate(g1 => FTA_CLASSROOM.startClass(g1, 'https://meet.google.com/abc-defg-hij'), g1);
  await p.evaluate(() => FTA.sync()); await p.waitForTimeout(300);
  const on = await p.evaluate(g1 => FTA.CLSLIVE.find(x => x.gid === g1 && x.status === 'On'), g1);
  const onS = on && await rec(p, 'clslive', on.id);
  ok(onS && onS.status === 'On' && onS.mentor === 'MEN-01' && onS.by === 'MEN-01' && onS.link === 'https://meet.google.com/abc-defg-hij', 'class started: saved on the server with the server\'s time');
  await p.evaluate(() => { ST.page = 'tp-live'; render(); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => /Running now/.test(document.getElementById('view').innerText) && !!document.querySelector('[data-cl="end"]')), 'mentor sees "Running now" with an End class button');
  ok(await p.evaluate(() => { const b = [...document.querySelectorAll('#sidenav .cl-nb.is-live')]; return b.length === 1 && b[0].textContent === '1'; }), 'menu shows 1 class running');

  await as(S1);
  ok(await p.evaluate(() => ROLES.Student.pages.includes('sp-live')), 'student has Class status');
  await p.evaluate(() => go('sp-live')); await p.waitForTimeout(500);
  const sj = await p.evaluate(() => { const a = document.querySelector('#cx-root a.btn.p'); return a ? a.getAttribute('href') : ''; });
  ok(sj === 'https://meet.google.com/abc-defg-hij', 'student sees the Join class button with the link while it runs');
  await click();
  const sEnd = await p.evaluate(async id => { const s = FTA.CLSLIVE.find(x => x.id === id); s.status = 'Off'; await FTA.sync(); return FTA.mock.db().records['clslive\u0001' + id].data.status; }, on.id);
  ok(sEnd === 'On', 'a student cannot end the class');
  await as(S2);
  ok(await p.evaluate(() => FTA.CLSLIVE.length === 0), 'a student of another class does not receive it');

  await as(OWNER);
  await p.evaluate(() => go('cx-live')); await p.waitForTimeout(500);
  const ov = await p.evaluate(() => ({ txt: document.getElementById('view').innerText, live: FTA_CLASSROOM.running().length }));
  ok(ov.live === 1 && /running now/i.test(ov.txt) && /Nusrat Jahan/.test(ov.txt), 'office board shows the running class and its mentor');
  await as(FM);
  ok(await p.evaluate(() => ROLES['Finance Manager'].pages.includes('cx-live') && !ROLES['Finance Manager'].pages.includes('cx-chat') && FTA.MSG.length === 0), 'Finance can watch Class status but has no Messages');

  await as(T1);
  await p.evaluate(id => FTA_CLASSROOM.endClass(id), on.id); await p.evaluate(() => FTA.sync()); await p.waitForTimeout(300);
  const offS = await rec(p, 'clslive', on.id);
  ok(offS.status === 'Off' && offS.end && offS.end >= offS.start, 'mentor ends the class; the end time is stamped');
  await as(S1);
  ok(await p.evaluate(id => { const s = FTA.CLSLIVE.find(x => x.id === id); return s && s.status === 'Off' && !s.link; }, on.id), 'after the class ends the student no longer receives the link');

  console.log('3. Messages: only inside the academy, office can read all');
  await as(T1);
  await click();
  const m1 = await p.evaluate(async g1 => {
    FTA.MSG.push({ id: 'M-a', room: 'g:' + g1, gid: g1, by: 'MEN-01', name: 'x', text: 'Homework: page 12', at: '2000-01-01T00:00:00Z' });
    FTA.MSG.push({ id: 'M-b', room: 'dm:MEN-01|STU-1001', by: 'MEN-01', text: 'Please revise chapter 2' });
    FTA.MSG.push({ id: 'M-c', room: 'dm:MEN-01|STU-1002', by: 'MEN-01', text: 'Hi Rafi' });
    FTA.MSG.push({ id: 'M-d', room: 'dm:MEN-01|U:office', by: 'MEN-01', text: 'Marks are ready' });
    await FTA.sync(); const d = FTA.mock.db().records; const g = k => d['msg\u0001' + k] && d['msg\u0001' + k].data;
    return { a: g('M-a'), b: g('M-b'), c: g('M-c'), d: g('M-d') };
  }, g1);
  ok(m1.a && m1.a.at > '2026' && m1.a.by === 'MEN-01' && m1.a.role === 'Mentor', 'class-group message saved; sender and time set by the server');
  ok(!!m1.b && !!m1.d, 'mentor → own student, mentor → office: saved');
  ok(!m1.c, 'mentor → another mentor\'s student: refused');
  await click();
  const forged = await p.evaluate(async () => { FTA.MSG.push({ id: 'M-e', room: 'dm:MEN-02|STU-1002', by: 'MEN-02', text: 'fake' }); await FTA.sync(); return !!FTA.mock.db().records['msg\u0001M-e']; });
  ok(!forged, 'nobody can write in someone else\'s chat');
  await click();
  const edit = await p.evaluate(async () => { const x = FTA.MSG.find(y => y.id === 'M-b'); x.text = 'changed'; await FTA.sync(); return FTA.mock.db().records['msg\u0001M-b'].data.text; });
  ok(edit === 'Please revise chapter 2', 'a sent message never changes');
  await p.evaluate(() => go('tp-chat')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!document.querySelector('#zc-wa .zc-ri') && /Ayaan Rahman/.test(document.getElementById('zc-side').innerText)), 'Messages page lists the class group and the student');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#zc-side .zc-ri')].find(x => /Ayaan/.test(x.innerText)); b && b.click(); }); await p.waitForTimeout(300);
  await p.fill('#zc-in', 'Typed from the page'); await p.click('#zc-send'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => Object.values(FTA.mock.db().records).some(r => r.collection === 'msg' && r.data.text === 'Typed from the page' && r.data.room === 'dm:MEN-01|STU-1001')), 'typing in the page and pressing Send saves the message');
  ok(await p.evaluate(() => /The academy office can read this chat/.test(document.getElementById('zc-main').innerText)), 'the chat says the office can read it');

  await as(S1);
  const sm = await p.evaluate(() => FTA.MSG.map(x => x.id).sort().join(','));
  ok(/M-a/.test(sm) && /M-b/.test(sm) && !/M-d/.test(sm), 'student receives the class group and their own chat, not the mentor–office chat (' + sm + ')');
  await click();
  const s2 = await p.evaluate(async () => { FTA.MSG.push({ id: 'M-f', room: 'dm:MEN-02|STU-1001', by: 'STU-1001', text: 'hello other mentor' }); FTA.MSG.push({ id: 'M-g', room: 'dm:MEN-01|STU-1001', by: 'STU-1001', text: 'Okay Miss' }); await FTA.sync(); const d = FTA.mock.db().records; return { f: !!d['msg\u0001M-f'], g: !!d['msg\u0001M-g'] }; });
  ok(!s2.f && s2.g, 'student writes to their own mentor, not to another mentor');
  await as(S2);
  ok(await p.evaluate(() => FTA.MSG.length === 0), 'another student receives none of it');

  await as(OWNER);
  ok(await p.evaluate(() => ['M-a', 'M-b', 'M-d', 'M-g'].every(id => FTA.MSG.some(x => x.id === id))), 'Owner can read every chat');
  /* the office answers a mentor and a student in the office chat (owner bug report 10 Nov) */
  await p.evaluate(() => go('cx-chat')); await p.waitForTimeout(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#zc-side .zc-ri')].find(x => x.dataset.room === 'dm:MEN-01|U:office'); b && b.click(); }); await p.waitForTimeout(300);
  await p.fill('#zc-in', 'Thanks, received'); await p.click('#zc-send'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => Object.values(FTA.mock.db().records).some(r => r.collection === 'msg' && r.data.room === 'dm:MEN-01|U:office' && r.data.text === 'Thanks, received' && r.data.by === 'U:office')), 'office replies to a mentor from the Messages page (saved)');
  await click();
  const os = await p.evaluate(async () => { FTA.MSG.push({ id: 'M-o2', room: 'dm:STU-1001|U:office', by: 'U:office', text: 'Your fee is received' }); await FTA.sync(); return !!FTA.mock.db().records['msg\u0001M-o2']; });
  ok(os, 'office writes to a student (saved)');
  await p.evaluate(() => go('cx-chat')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /Nusrat Jahan ↔ Ayaan Rahman|Ayaan Rahman ↔ Nusrat Jahan/.test(document.getElementById('zc-side').innerText)), 'private mentor–student chat is listed for the Owner');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#zc-side .zc-ri')].find(x => /↔/.test(x.innerText)); b && b.click(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('zc-in') && /Read only/.test(document.getElementById('zc-main').innerText)), 'Owner reads it read-only');
  await click();
  await p.evaluate(async () => { const i = FTA.MSG.findIndex(x => x.id === 'M-g'); FTA.MSG.splice(i, 1); await FTA.sync(); });
  ok(!(await rec(p, 'msg', 'M-g')), 'Owner can remove a message');
  await as(T1);
  ok(await p.evaluate(() => FTA.MSG.some(x => x.room === 'dm:MEN-01|U:office' && x.text === 'Thanks, received')), 'the mentor receives the office reply');
  await as(OWNER);
  await as(JA);
  ok(await p.evaluate(() => FTA.MSG.length === 0 && !ROLES['Junior Admin'].pages.includes('cx-chat') && ROLES['Junior Admin'].pages.includes('cx-live')), 'Junior Admin: Class status yes, private chats no');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  console.log(`\n${pass}/${pass + fail} passed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
