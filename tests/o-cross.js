/* Worker O · every role, every connection (Owner ↔ Mentor ↔ Student) (mock backend = the same server code and policy as production)
   Run:  cd /home/claude/fta-command && MODE=mock python3 build.py && node tests/o-cross.js */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8783, URL0 = 'http://localhost:' + PORT + '/';
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


  const OWN = OWNER, ST1 = 'zara.student@gmail.com', ST2 = 'omar.student@gmail.com';
  const myList = () => p.evaluate(() => { const a = new Set(); SCH.myGroups().forEach(g => g.stu.forEach(x => a.add(x))); return [...a].filter(x => STUDENTS.find(s => s.id === x)).sort(); });
  const stuIds = () => p.evaluate(() => STUDENTS.map(s => s.id).sort());
  const hasBtn = () => p.evaluate(() => { go('tp-students'); return new Promise(r => setTimeout(() => r([...document.querySelectorAll('#view .btn')].some(b => /Add new student/.test(b.textContent))), 400)); });
  const rows = () => p.evaluate(() => { go('tp-students'); return new Promise(r => setTimeout(() => r([...document.querySelectorAll('#view tbody tr')].map(t => t.textContent.replace(/\s+/g, ' ').slice(0, 60))), 400)); });

  console.log('0. Setup (Owner, 2 mentors, 3 programmes)');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0);
  await p.waitForSelector('#fg-email', { timeout: 30000 }); await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  await p.evaluate(({ T1, T2 }) => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE Mathematics', fee: 6000, type: 'Individual', status: 'Active', subject: 'Maths' }, { id: 'PRG-02', name: 'IGCSE Chemistry', fee: 7000, type: 'Individual', status: 'Active', subject: 'Chemistry' }, { id: 'PRG-03', name: 'IGCSE Physics', fee: 7000, type: 'Individual', status: 'Active', subject: 'Physics' });
    MENTORS.push({ id: 'MEN-01', name: 'Ibrahim', gmail: T1, phone: '01712334455', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    MENTORS.push({ id: 'MEN-02', name: 'Tanvir', gmail: T2, phone: '01712334466', subjects: 'Chemistry', status: 'Active', model: 'pct_fee', rate: 40, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    render();
  }, { T1, T2 });
  await sync();

  console.log('1. Owner adds a student through the real form (mentor Ibrahim has no class yet)');
  await p.evaluate(() => { go('students'); studentForm(); }); await p.waitForTimeout(500);
  await p.fill('#nf-n', 'Zara Ahmed'); await p.fill('#nf-g', 'Ahmed'); await p.fill('#nf-p', '01711555001'); await p.fill('#nf-e', ST1);
  await p.evaluate(() => { V9H.F.subs['PRG-01'] = 'MEN-01'; V9H.sbDraw(); }); await p.waitForTimeout(200);
  await p.evaluate(() => saveStudent()); await p.waitForTimeout(900); await sync();
  const z = await p.evaluate(() => { const s = STUDENTS.find(x => x.name === 'Zara Ahmed'); return s && { id: s.id, enr: ENROL.filter(e => e.stu === s.id).map(e => e.mentor), grp: SCH.GROUPS.filter(g => g.stu.includes(s.id)).map(g => g.mentor) }; });
  ok(z && z.enr.join() === 'MEN-01', 'student saved with an enrolment to Ibrahim (' + (z && z.id) + ')');
  console.log('   owner side:', JSON.stringify(z));
  await setMember(ST1, { role: 'Student', student_id: z.id, name: 'Zara Ahmed' });

  console.log('2. Ibrahim signs in: My Students, Add-new-student button, profile tree');
  await as(T1);
  ok((await myList()).join() === z.id, 'Zara is in Ibrahim’s class list');
  ok((await rows()).some(t => /Zara/.test(t)), 'Zara is listed on the My Students page');
  ok(await hasBtn(), '“Add new student” button is on My Students');
  const tr = await p.evaluate(() => FTA_TREE.kidsOfMentor('MEN-01').map(k => k.pid));
  ok(tr.includes(z.id), 'profile tree shows Zara');

  console.log('3. A saved permission record from an older version must not hide the button');
  await as(OWNER);
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fta-mock-db')), m = Object.assign({}, SCH.PERM.Mentor); delete m.newstu; delete m.sportal; d.records['perm\u0001Mentor'] = { collection: 'perm', id: 'Mentor', data: m, deleted: false, mentor_ids: [], student_ids: [], updated_at: new Date(Date.now() + 5).toISOString(), updated_by: 'x' }; localStorage.setItem('fta-mock-db', JSON.stringify(d)); });
  await as(T1);
  ok(await p.evaluate(() => (SCH.PERM.Mentor.newstu || '').includes('a')), 'missing “add new students” is filled from the default');
  ok(await hasBtn(), 'button still there');
  await as(OWNER);
  await p.evaluate(() => { SCH.PERM.Mentor.newstu = ''; }); await sync();
  await as(T1);
  ok(!(await hasBtn()), 'but when the Owner switches it off on purpose, it is hidden');
  await as(OWNER); await p.evaluate(() => { SCH.PERM.Mentor.newstu = 'a'; }); await sync();

  console.log('4. The class list repairs itself (class record lost on the server)');
  await as(OWNER);
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fta-mock-db')); Object.keys(d.records).filter(k => k.startsWith('groups\u0001')).forEach(k => delete d.records[k]); localStorage.setItem('fta-mock-db', JSON.stringify(d)); });
  await as(T1);
  ok((await myList()).join() === z.id, 'Ibrahim’s class is rebuilt from the enrolment on sign-in');

  console.log('5. Student portal: own data only, mentor and subject');
  await as(ST1);
  const sp = await p.evaluate(() => ({ ids: STUDENTS.map(s => s.id), me: SCH.mySid && SCH.mySid(), g: SCH.prog(SCH.mySid()).G.map(g => g.name + '/' + SCH.mName(g.mentor)) }));
  ok(sp.ids.join() === z.id && sp.me === z.id, 'student sees only their own record');
  ok(sp.g.join() === 'IGCSE Mathematics/Ibrahim', 'student sees subject + mentor (' + sp.g.join() + ')');

  console.log('6. Owner enrols a second student by hand; only the right mentor gets them');
  await as(OWNER);
  await p.evaluate(() => { STUDENTS.push({ id: 'STU-2001', name: 'Omar Faruk', guardian: 'F', phone: '01711555002', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-11-01', status: 'Active', notes: [] }); ENROL.push({ id: 'ENR-3001', stu: 'STU-2001', prog: 'PRG-02', mentor: 'MEN-02', type: 'Individual', fees: [{ from: '2026-11', fee: 7000 }], disc: 0, start: '2026-11-01', status: 'Active' }); });
  await sync();
  await as(T2); ok((await myList()).join() === 'STU-2001', 'Tanvir (no class before) sees Omar'); ok((await rows()).some(t => /Omar/.test(t)), 'Omar is on Tanvir’s page');
  await as(T1); ok(!(await stuIds()).includes('STU-2001'), 'Ibrahim does not receive Omar');

  console.log('7. Owner moves Omar to Ibrahim → old mentor loses, new gains, student follows');
  await as(OWNER);
  await p.evaluate(() => { SCH.confirm = o => o.onOk('timing'); V9T.change('ENR-3001', 'MEN-01'); }); await p.waitForTimeout(300); await sync();
  await as(T2); ok(!(await stuIds()).includes('STU-2001') && (await myList()).length === 0, 'Tanvir lost Omar');
  await as(T1); ok((await myList()).includes('STU-2001'), 'Ibrahim gained Omar');

  console.log('8. Mentor adds a student → office approves → mentor sees them');
  await as(T1);
  await p.evaluate(() => { go('tp-students'); SCH.newStuForm(); }); await p.waitForTimeout(400);
  await p.fill('#ns-n', 'Mira Khan'); await p.fill('#ns-g', 'Khan'); await p.fill('#ns-p', '01911000003');
  await p.evaluate(() => SCH.newStuSave()); await p.waitForTimeout(600); await sync();
  const pid = await p.evaluate(() => (SCH.PEND.find(x => x.name === 'Mira Khan') || {}).id);
  ok(!!pid, 'request sent (' + pid + ')');
  await as(OWNER);
  await p.evaluate(id => SCH.pendDo(id, true), pid); await p.waitForTimeout(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.btn')].find(x => /^Approve$/.test(x.textContent.trim())); b && b.click(); }); await p.waitForTimeout(700); await sync();
  const mira = await p.evaluate(() => { const s = STUDENTS.find(x => x.name === 'Mira Khan'); return s && s.id; });
  ok(!!mira, 'office approved → student record (' + mira + ')');
  await as(T1); ok((await myList()).includes(mira), 'Mira appears in Ibrahim’s My Students after approval');
  await as(T2); ok(!(await stuIds()).includes(mira), 'Tanvir does not see Mira');

  console.log('9. Mentor attendance → Owner and Student see it');
  await as(T1);
  const gid = await p.evaluate(z => { const g = SCH.myGroups().find(x => x.stu.includes(z)); return g && g.id; }, z.id);
  await p.evaluate(([g, z]) => { SCH.ATT[g + '|2026-11-20'] = { at: '10:00', by: 'Ibrahim', marks: { [z]: 'P' }, lesson: 'Algebra', notes: {}, edited: false }; }, [gid, z.id]); await sync();
  await as(OWNER); ok(await p.evaluate(([g]) => !!SCH.ATT[g + '|2026-11-20'], [gid]), 'Owner sees the attendance log entry');
  await as(ST1); ok(await p.evaluate(([g, z]) => !!(SCH.ATT[g + '|2026-11-20'] || { marks: {} }).marks[z], [gid, z.id]), 'Student sees their own mark');
  await as(T2); ok(await p.evaluate(([g]) => !SCH.ATT[g + '|2026-11-20'], [gid]), 'the other mentor does not');

  console.log('10. Owner deletes a student → gone for mentor and student');
  await as(OWNER);
  await p.evaluate(id => { const i = STUDENTS.findIndex(s => s.id === id); STUDENTS.splice(i, 1); for (let k = ENROL.length - 1; k >= 0; k--) if (ENROL[k].stu === id) ENROL.splice(k, 1); SCH.GROUPS.forEach(g => { const k = g.stu.indexOf(id); if (k > -1) g.stu.splice(k, 1); }); }, 'STU-2001'); await sync();
  await as(T1); ok(!(await stuIds()).includes('STU-2001'), 'Ibrahim no longer sees the deleted student');

  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (errs.length ? ', ' + errs.length + ' page errors' : ''));
  errs.slice(0, 8).forEach(e => console.log('  ! ' + e.slice(0, 200)));
  await b.close(); server.close(); process.exit(fail || errs.length ? 1 : 0);
})();
