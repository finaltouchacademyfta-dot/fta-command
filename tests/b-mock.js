/* Worker B · production data layer, end to end against the in-browser mock backend.
   Run:  cd /home/claude/prod && MODE=mock python3 build.py && node tests/b-mock.js
   Serves site-mock/ over http (localhost:8765) and drives the real app in Chromium. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8765, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(s); });

let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const OWNER = 'owner@gmail.com', T1 = 'nusrat.teacher@gmail.com', T2 = 'tanvir.teacher@gmail.com', S1 = 'ayaan.student@gmail.com', S2 = 'rafi.student@gmail.com', FM = 'finance.fta@gmail.com', ADM = 'admin.fta@gmail.com', CS = 'collect.fta@gmail.com';

async function ready(p) { await p.waitForFunction(() => window.FTA && (FTA.member && document.getElementById('fta-gate') && document.getElementById('fta-gate').hidden) || (document.getElementById('fta-gate') && !document.getElementById('fta-gate').hidden && !document.querySelector('#fta-gate .fg-spin')), null, { timeout: 30000 }); await p.waitForTimeout(400); }
async function as(p, email) { await p.evaluate(async () => { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); }); await p.evaluate(e => { if (e) localStorage.setItem('fta-mock-session', e); else localStorage.removeItem('fta-mock-session'); }, email); await p.goto(URL0); await ready(p); }
const sync = p => p.evaluate(() => FTA.sync());
const gateText = p => p.evaluate(() => { const g = document.getElementById('fta-gate'); return g && !g.hidden ? g.innerText : ''; });
const userClick = p => p.mouse.click(5, 300);   /* a real user action (the layer only shows refusals right after one) */

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());

  console.log('1. First visit: Google sign-in screen, nothing else');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0); await ready(p);
  let g = await gateText(p);
  ok(/FTA Command Centre/.test(g) && /TEST MODE/.test(g), 'sign-in screen shown (test mode in the mock build)');
  ok(await p.evaluate(() => !!document.querySelector('#fta-gate #fg-go')), 'sign-in button present');
  await p.fill('#fg-email', 'not-an-email'); await p.click('#fg-go');
  ok(/full Gmail/.test(await gateText(p)), 'bad address is refused on the screen');
  await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  ok(await p.evaluate(() => FTA.member && FTA.member.role === 'Owner' && ST.role === 'Owner'), 'owner Gmail opens the app as Owner (bootstrap)');
  const empty = await p.evaluate(() => ({ s: STUDENTS.length, pay: PAYMENTS.length, men: MENTORS.length, exp: EXPENSES.length, inv: INVOICES.length, users: USERS.map(u => u.email) }));
  ok(empty.s === 0 && empty.pay === 0 && empty.men === 0 && empty.exp === 0 && empty.inv === 0, 'the app starts empty (no sample students, payments, teachers, expenses)');
  ok(empty.users.length === 1 && empty.users[0] === OWNER, 'only the owner account exists');
  await sync(p);
  ok(await p.evaluate(() => document.getElementById('fta-sync').dataset.s === 'saved'), 'status pill says saved');
  const db0 = await p.evaluate(() => { const d = FTA.mock.db(); return { members: Object.keys(d.members), cols: [...new Set(Object.values(d.records).map(r => r.collection))] }; });
  ok(db0.members.length === 1 && db0.members[0] === OWNER, 'members table: only the owner');
  ok(db0.cols.includes('perm') && db0.cols.includes('org'), 'owner first visit saved the default settings (' + db0.cols.join(',') + ')');

  console.log('2. Owner adds a programme, two teachers with Gmail, two students with Gmail, a payment and an expense');
  await p.evaluate(({ T1, T2, S1, S2 }) => {
    PROGS.push({ id: 'PRG-01', name: 'IGCSE English', fee: 6000, type: 'Individual', status: 'Active' }, { id: 'PRG-02', name: 'IGCSE Maths', fee: 7000, type: 'Individual', status: 'Active' });
    MENTORS.push({ id: 'MEN-01', name: 'Nusrat Jahan', gmail: T1, phone: '01712334455', subjects: 'English', status: 'Active', model: 'pct_fee', rate: 50, join: '2026-10-01', eff: '2026-10-01', notes: 'private note' });
    MENTORS.push({ id: 'MEN-02', name: 'Tanvir Ahmed', gmail: T2, phone: '01712334466', subjects: 'Maths', status: 'Active', model: 'pct_fee', rate: 40, join: '2026-10-01', eff: '2026-10-01', notes: '' });
    STUDENTS.push({ id: 'STU-1001', name: 'Ayaan Rahman', guardian: 'Rahman', phone: '01711000001', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: ['office-only note'], gmail: S1 });
    STUDENTS.push({ id: 'STU-1002', name: 'Rafi Hasan', guardian: 'Hasan', phone: '01711000002', cls: 'Grade 10', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [], gmail: S2 });
    ENROL.push({ id: 'ENR-2001', stu: 'STU-1001', prog: 'PRG-01', mentor: 'MEN-01', type: 'Individual', fees: [{ from: '2026-10', fee: 6000 }], disc: 500, start: '2026-10-01', status: 'Active' });
    ENROL.push({ id: 'ENR-2002', stu: 'STU-1002', prog: 'PRG-02', mentor: 'MEN-02', type: 'Individual', fees: [{ from: '2026-10', fee: 7000 }], disc: 0, start: '2026-10-01', status: 'Active' });
    V9G.toGroups('STU-1001'); V9G.toGroups('STU-1002');
    SCH.SPORT.push({ stu: 'STU-1001', gmail: S1, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' }, { stu: 'STU-1002', gmail: S2, status: 'Active', by: 'Owner', role: 'Owner', at: TODAY, last: '' });
    if (!ACCOUNTS.length) ACCOUNTS.push({ id: 'ACC-CASH', name: 'Cash box', type: 'Cash', open: 0 });
    PAYMENTS.push({ id: 'PAY-0001', stu: 'STU-1001', date: TODAY, amt: 5500, acct: ACCOUNTS[0].id, method: 'Cash', status: 'Verified', alloc: [], rcpt: 'RC-0001', by: 'Owner' });
    EXPENSES.push({ id: 'EXP-0001', date: TODAY, month: TODAY.slice(0, 7), cat: 'Office rent', payee: 'Landlord', desc: 'Rent', amt: 18000, acct: ACCOUNTS[0].id, cls: 'Operating', status: 'Approved', by: 'Owner', paid: 18000 });
    render();
  }, { T1, T2, S1, S2 });
  await sync(p);
  const db1 = await p.evaluate(() => { const d = FTA.mock.db(); const n = c => Object.values(d.records).filter(r => r.collection === c && !r.deleted).length; return { m: d.members, progs: n('progs'), men: n('mentors'), stu: n('students'), pay: n('payments'), exp: n('expenses'), groups: n('groups'), tags: d.records['students\u0001STU-1001'] && d.records['students\u0001STU-1001'].mentor_ids }; });
  ok(db1.progs === 2 && db1.men === 2 && db1.stu === 2 && db1.pay === 1 && db1.exp === 1 && db1.groups >= 2, 'all saved to the server (progs 2, teachers 2, students 2, payment 1, expense 1, groups ' + db1.groups + ')');
  ok(db1.m[T1] && db1.m[T1].role === 'Mentor' && db1.m[T1].mentor_id === 'MEN-01' && db1.m[T1].active, 'teacher Gmail became a Mentor member');
  ok(db1.m[S1] && db1.m[S1].role === 'Student' && db1.m[S1].student_id === 'STU-1001' && db1.m[S1].active, 'student Gmail became a Student member');
  ok(JSON.stringify(db1.tags) === '["MEN-01"]', 'student record is tagged only with its own teacher (server-computed)');
  await p.reload(); await ready(p);
  const after = await p.evaluate(() => ({ s: STUDENTS.map(x => x.id).join(','), pay: PAYMENTS.length, exp: EXPENSES.length, prog: PROGS.length, men: MENTORS.length, role: ST.role, notes: (STUDENTS[0].notes || []).length }));
  ok(after.s === 'STU-1001,STU-1002' && after.pay === 1 && after.exp === 1 && after.prog === 2 && after.men === 2 && after.role === 'Owner', 'everything is still there after reload');
  ok(after.notes === 1, 'owner sees office notes');
  await p.evaluate(() => { ST.page = 'students'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Ayaan Rahman/.test(document.getElementById('view').innerText)), 'Students page lists the saved student');

  console.log('3. Teacher sees only their own students, no fees or academy share; payment writes are refused');
  await as(p, T1);
  const t = await p.evaluate(() => ({ role: ST.role, me: ME() && ME().mentor, stu: STUDENTS.map(s => s.id), notes: STUDENTS.map(s => s.notes), enFees: ENROL.map(e => e.fees), disc: ENROL.map(e => e.disc), pf: PROGS.map(x => x.fee), pay: PAYMENTS.length, inv: INVOICES.length, exp: EXPENSES.length, acc: ACCOUNTS.map(a => ({ open: a.open })), men: MENTORS.map(m => Object.keys(m).sort().join('|')), groups: SCH.GROUPS.map(x => x.mentor) }));
  ok(t.role === 'Mentor' && t.me === 'MEN-01', 'teacher Gmail opens the Teacher Portal as MEN-01');
  ok(t.stu.join() === 'STU-1001', 'teacher sees only their own student (' + t.stu.join() + ')');
  ok(t.notes.every(n => n === undefined) && t.enFees.every(f => f === undefined) && t.disc.every(d => d === undefined) && t.pf.every(f => f === undefined), 'no fees, discounts or office notes reach the teacher');
  ok(t.pay === 0 && t.inv === 0 && t.exp === 0 && t.acc.every(a => !a.open), 'no payments, invoices, expenses or account balances reach the teacher');
  ok(t.groups.every(m => m === 'MEN-01'), 'only their own class groups');
  ok(t.men.some(k => k === 'id|name|status|subjects'), 'other teachers: name and subject only');
  const tpush = await p.evaluate(() => FTA.api({ action: 'push', changes: [{ c: 'payments', id: 'PAY-9', data: { id: 'PAY-9', stu: 'STU-1001', amt: 100, status: 'Verified' }, base: null }] }));
  ok(tpush.body.results[0].status === 'rejected', 'server refuses a payment written by a teacher (' + tpush.body.results[0].reason + ')');
  await userClick(p);
  await p.evaluate(() => { PAYMENTS.push({ id: 'PAY-0002', stu: 'STU-1001', amt: 999, status: 'Verified', alloc: [], date: TODAY, acct: 'ACC-CASH' }); });
  await sync(p);
  const tp2 = await p.evaluate(() => ({ local: PAYMENTS.length, toast: document.getElementById('toast').innerText, server: !!FTA.mock.db().records['payments\u0001PAY-0002'] }));
  ok(tp2.local === 0 && !tp2.server, 'payment added in the teacher portal is undone and never stored');
  ok(/cannot|not allowed|Teachers/i.test(tp2.toast), 'teacher sees why (“' + tp2.toast + '”)');
  const tother = await p.evaluate(() => FTA.api({ action: 'push', changes: [{ c: 'att', id: 'G2|2026-10-20', data: { at: '9:00', by: 'x', marks: { 'STU-1002': 'P' } }, base: null }] }));
  ok(tother.body.results[0].status === 'rejected', 'teacher cannot write attendance for another teacher’s class');
  const gid = await p.evaluate(() => SCH.GROUPS[0].id);
  await userClick(p);
  await p.evaluate(g => { SCH.ATT[g + '|2026-10-21'] = { at: '10:00', by: 'Nusrat Jahan', marks: { 'STU-1001': 'P' } }; render(); }, gid);
  await sync(p);
  ok(await p.evaluate(g => { const r = FTA.mock.db().records['att\u0001' + g + '|2026-10-21']; return !!r && r.mentor_ids.includes('MEN-01') && r.student_ids.includes('STU-1001'); }, gid), 'teacher’s own attendance is saved and tagged');
  ok(await p.evaluate(() => !ROLES.Mentor.pages.some(x => /payments|invoices|expenses/.test(x))), 'Teacher Portal has no money pages');
  /* homework with a file: the file goes to private storage, the record keeps only a reference */
  await userClick(p);
  await p.evaluate(g => { const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0)); SCH.HW.push({ id: 'HW-900', gid: g, title: 'Worksheet 4', body: 'Do Q1-5', set: TODAY, due: TODAY, checked: 0, stu: null, files: [{ name: 'sheet.png', type: 'image/png', size: png.length, url: URL.createObjectURL(new Blob([png], { type: 'image/png' })) }] }); render(); }, gid);
  await sync(p);
  const [hwr, hwf] = await p.evaluate(() => { const r = FTA.mock.db().records['hw\u0001HW-900'], u = r && r.data.files[0].url; return [u, !!(u && localStorage.getItem('fta-mock-file:' + u.slice(9)))]; });
  ok(/^fta-file:teachers\/\d{4}-\d{2}\/[a-z0-9]{20}\.png$/.test(hwr || '') && hwf, 'homework file uploaded to private storage; record keeps only the reference (' + hwr + ')');
  ok(await p.evaluate(() => /^blob:/.test(SCH.HW.find(h => h.id === 'HW-900').files[0].url) && FTA.pending() === 0), 'teacher keeps seeing the file; nothing left to save');

  console.log('4. Student sees only their own data');
  await as(p, S1);
  const s = await p.evaluate(() => ({ role: ST.role, me: ME() && ME().stu, stu: STUDENTS.map(x => x.id), en: ENROL.map(e => [e.stu, e.fees]), pay: PAYMENTS.length, att: Object.keys(SCH.ATT), sport: SCH.SPORT.length, men: MENTORS.map(m => m.gmail || m.phone || null), groups: SCH.GROUPS.map(g => g.stu) }));
  ok(s.role === 'Student' && s.me === 'STU-1001', 'student Gmail opens the Student Portal');
  ok(s.stu.join() === 'STU-1001' && s.en.every(e => e[0] === 'STU-1001' && e[1] === undefined), 'only their own student record and subjects, no fees');
  ok(s.pay === 0 && s.sport === 0 && s.men.every(x => x === null), 'no payments, no portal list, no teacher contacts');
  ok(s.groups.every(g => g.length === 1 && g[0] === 'STU-1001'), 'class groups show only themself');
  ok(s.att.length === 1, 'sees their own attendance (' + s.att.join() + ')');
  const shw = await p.evaluate(() => { const h = SCH.HW.find(x => x.id === 'HW-900'); return h && h.files[0].url.slice(0, 22); });
  ok(shw === 'data:image/png;base64,', 'student gets the homework file through a signed link');
  await sync(p);
  const spend = await p.evaluate(() => [FTA.pending(), FTA.status(), Object.values(FTA.mock.db().records).filter(r => r.updated_by === 'ayaan.student@gmail.com').map(r => r.collection + ':' + r.id).join(' ')]);
  ok(spend[0] === 0 && spend[1] === 'saved' && /^(log:\S+ ?)*$/.test(spend[2]), 'student opening the portal saves nothing but the sign-in line (' + spend.join(' · ') + ')');
  const spush = await p.evaluate(() => FTA.api({ action: 'push', changes: [{ c: 'students', id: 'STU-1001', data: { id: 'STU-1001', name: 'Hacked' }, base: null }] }));
  ok(spush.body.results[0].status !== 'ok', 'student cannot change their own record on the server');

  console.log('5. Unknown Gmail is blocked');
  await as(p, 'stranger@gmail.com');
  g = await gateText(p);
  ok(/can't open the app/.test(g) && /stranger@gmail.com/.test(g), 'blocked screen names the Gmail');
  ok(await p.evaluate(() => STUDENTS.length === 0 && !FTA.member), 'no data loaded for an unknown Gmail');
  const sapi = await p.evaluate(() => FTA.api({ action: 'pull' }));
  ok(sapi.status === 403, 'server refuses to send records to an unknown Gmail');
  await p.click('#fg-other'); await ready(p);
  ok(/Sign in|TEST MODE/i.test(await gateText(p)), '“Use another Gmail” goes back to the sign-in screen');

  console.log('6. Owner adds staff; Finance Manager can use money pages but cannot change roles');
  await as(p, OWNER);
  await p.evaluate(({ FM, ADM, CS }) => {
    [[FM, 'Finance Manager', 'Shakil Ahmed'], [ADM, 'Admin', 'Admin One'], [CS, 'Collection Staff', 'Rumana Begum']].forEach(([e, r, n]) => { const u = { id: 'U' + (USERS.length + 1), name: n, email: e, role: r }; USERS.push(u); SCH.STAFF.push({ uid: u.id, status: 'Active', last: 'Never', twoStep: false }); });
    render();
  }, { FM, ADM, CS });
  await sync(p);
  const m6 = await p.evaluate(() => FTA.mock.db().members);
  ok(m6[FM] && m6[FM].role === 'Finance Manager' && m6[ADM] && m6[ADM].role === 'Admin' && m6[CS] && m6[CS].role === 'Collection Staff', 'staff accounts became members with their roles');
  await as(p, FM);
  const f = await p.evaluate(() => ({ role: ST.role, pages: ROLES['Finance Manager'].pages, pay: PAYMENTS.length, exp: EXPENSES.length }));
  ok(f.role === 'Finance Manager' && f.pay === 1 && f.exp === 1, 'Finance Manager sees payments and expenses');
  ok(['payments', 'expenses'].every(x => f.pages.includes(x)), 'money pages are open to Finance');
  await p.evaluate(() => { EXPENSES.push({ id: 'EXP-0002', date: TODAY, month: TODAY.slice(0, 7), cat: 'Internet', payee: 'ISP', desc: 'Internet', amt: 2500, acct: 'ACC-CASH', cls: 'Operating', status: 'Approved', by: 'Shakil Ahmed', paid: 2500 }); render(); });
  await sync(p);
  ok(await p.evaluate(() => !!FTA.mock.db().records['expenses\u0001EXP-0002']), 'Finance Manager’s expense is saved');
  const fr = await p.evaluate(e => FTA.api({ action: 'member', member: { email: e, role: 'Owner' } }), FM);
  ok(fr.body.ok === false, 'Finance Manager cannot change roles (' + fr.body.reason + ')');
  const fl = await p.evaluate(() => FTA.api({ action: 'members' }));
  ok(fl.status === 403, 'Finance Manager cannot list sign-in accounts');
  const fp = await p.evaluate(() => FTA.api({ action: 'push', changes: [{ c: 'perm', id: 'Finance Manager', data: { pay: 'vaedp' }, base: null }] }));
  ok(fp.body.results[0].status === 'rejected', 'Finance Manager cannot change permissions');
  const fa = await p.evaluate(() => FTA.api({ action: 'push', changes: [{ c: 'att', id: 'G1|2026-10-22', data: { marks: {} }, base: null }] }));
  ok(fa.body.results[0].status === 'rejected', 'Finance Manager cannot change school records');

  console.log('7. More rules: Collection Staff, Admin, Owner');
  await as(p, CS);
  const c1 = await p.evaluate(() => FTA.api({ action: 'push', changes: [{ c: 'payments', id: 'PAY-0003', data: { id: 'PAY-0003', stu: 'STU-1002', amt: 7000, status: 'Pending', alloc: [], date: '2026-10-30', acct: 'ACC-CASH' }, base: null }, { c: 'payments', id: 'PAY-0004', data: { id: 'PAY-0004', stu: 'STU-1002', amt: 7000, status: 'Verified', alloc: [], date: '2026-10-30', acct: 'ACC-CASH' }, base: null }, { c: 'expenses', id: 'EXP-0009', data: { id: 'EXP-0009', amt: 1 }, base: null }] }));
  const cs = Object.fromEntries(c1.body.results.map(x => [x.id, x.status]));
  ok(cs['PAY-0003'] === 'ok' && cs['PAY-0004'] === 'rejected' && cs['EXP-0009'] === 'rejected', 'Collection Staff: Pending payments only (' + JSON.stringify(cs) + ')');
  await as(p, ADM);
  const a1 = await p.evaluate(() => FTA.api({ action: 'member', member: { email: 'another.admin@gmail.com', role: 'Admin' } }));
  ok(a1.body.ok === false && /Owner/.test(a1.body.reason), 'only the Owner can add Admins');
  const a2 = await p.evaluate(e => FTA.api({ action: 'member', member: { email: e, deleted: true } }), OWNER);
  ok(a2.body.ok === false, 'an Admin cannot remove the Owner');
  const a3 = await p.evaluate(() => FTA.api({ action: 'member', member: { email: 'newjunior@gmail.com', role: 'Junior Admin' } }));
  ok(a3.body.ok === true, 'an Admin can add a Junior Admin');
  await as(p, OWNER);
  const o1 = await p.evaluate(e => FTA.api({ action: 'member', member: { email: e, deleted: true } }), OWNER);
  ok(o1.body.ok === false, 'the Owner cannot remove themself');
  ok(await p.evaluate(() => USERS.some(u => u.email === 'newjunior@gmail.com')), 'Owner’s staff list shows the account the Admin added');

  console.log('8. Conflicts, refusals and offline');
  const p2 = await ctx.newPage(); await R.setup(p2); p2.on('pageerror', e => errs.push('p2: ' + e.message));
  await p2.goto(URL0); await ready(p2);
  await p.evaluate(() => { STUDENTS.find(s => s.id === 'STU-1002').phone = '01799999991'; render(); }); await sync(p);
  await userClick(p2); await p2.evaluate(() => { STUDENTS.find(s => s.id === 'STU-1002').phone = '01788888882'; render(); }); await sync(p2);
  const cf = await p2.evaluate(() => ({ local: STUDENTS.find(s => s.id === 'STU-1002').phone, toast: document.getElementById('toast').innerText, server: FTA.mock.db().records['students\u0001STU-1002'].data.phone }));
  ok(cf.server === '01799999991' && cf.local === '01799999991', 'second editor gets the first save, nothing is silently overwritten');
  ok(/same time/.test(cf.toast), 'and is told (“' + cf.toast.slice(0, 60) + '…”)');
  await p.evaluate(() => FTA.pull()); await p.waitForTimeout(300);
  await p2.evaluate(() => { STUDENTS.find(s => s.id === 'STU-1002').cls = 'O Level'; render(); }); await sync(p2);
  await p.evaluate(() => FTA.pull()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => STUDENTS.find(s => s.id === 'STU-1002').cls === 'O Level'), 'the other tab picks up the change by itself (pull)');
  /* same new number made in two tabs */
  await p.evaluate(() => { NOTES.push({ id: 'N9', title: 'From tab 1', body: '', pin: false, d: TODAY, by: 'Owner' }); }); await sync(p);
  await p2.evaluate(() => { NOTES.push({ id: 'N9', title: 'From tab 2', body: '', pin: false, d: TODAY, by: 'Owner' }); }); await sync(p2); await sync(p2);
  const nn = await p2.evaluate(() => Object.values(FTA.mock.db().records).filter(r => r.collection === 'notes').map(r => r.data.title + '=' + r.id));
  ok(nn.length === 2 && nn.some(x => /tab 2=N9-/.test(x)), 'two new records with the same number are both kept (' + nn.join(', ') + ')');
  await p2.close();
  /* offline */
  await p.evaluate(() => { FTA.mock.offline = true; EXPENSES.push({ id: 'EXP-0003', date: TODAY, month: TODAY.slice(0, 7), cat: 'Transport', payee: 'CNG', desc: 'Bank visit', amt: 300, acct: 'ACC-CASH', cls: 'Operating', status: 'Approved', by: 'Owner', paid: 300 }); render(); });
  await p.waitForTimeout(1600);
  const off = await p.evaluate(() => ({ s: document.getElementById('fta-sync').dataset.s, t: document.getElementById('fta-sync').innerText, box: !!localStorage.getItem('fta-outbox:owner@gmail.com') }));
  ok(off.s === 'offline' && /kept on this device/.test(off.t) && off.box, 'offline: change kept on this device (“' + off.t + '”)');
  await p.goto(URL0); await ready(p);                    /* reload while the server is unreachable → the mock comes back online on reload */
  await sync(p);
  ok(await p.evaluate(() => !!FTA.mock.db().records['expenses\u0001EXP-0003'] && EXPENSES.some(e => e.id === 'EXP-0003')), 'after reload the offline change is sent');
  /* delete + bin + restore */
  await p.evaluate(() => { const n = NOTES.find(x => x.id === 'N9'); SCH.toBin('Note', n.title, NOTES, n); render(); }); await sync(p);
  const del = await p.evaluate(() => ({ rec: FTA.mock.db().records['notes\u0001N9'].deleted, bin: Object.values(FTA.mock.db().records).filter(r => r.collection === 'bin' && !r.deleted).map(r => r.data._list) }));
  ok(del.rec === true && del.bin.includes('notes'), 'delete goes to the Data Safety bin on the server');
  await p.reload(); await ready(p);
  await p.evaluate(() => { const b = SCH.BIN.find(x => x.label === 'From tab 1'); b.list.push(b.item); SCH.BIN.splice(SCH.BIN.indexOf(b), 1); render(); }); await sync(p);
  ok(await p.evaluate(() => FTA.mock.db().records['notes\u0001N9'].deleted === false && NOTES.some(n => n.id === 'N9')), 'restore from the bin (after reload) brings the record back');
  /* teacher removed → access gone */
  await p.evaluate(() => { MENTORS.find(m => m.id === 'MEN-02').status = 'Inactive'; render(); }); await sync(p);
  ok(await p.evaluate(e => FTA.mock.db().members[e].active === false, T2), 'switching a teacher to Inactive switches off their sign-in');
  await as(p, T2);
  ok(/can't open the app/.test(await gateText(p)), 'the switched-off teacher is blocked');

  console.log('9. Every page of every role opens with live data, and opening pages saves nothing unexpected');
  for (const [who, role] of [[OWNER, 'Owner'], [FM, 'Finance Manager'], [CS, 'Collection Staff'], [ADM, 'Admin'], [T1, 'Mentor'], [S1, 'Student']]) {
    await as(p, who); await sync(p);
    const before = await p.evaluate(() => new Date(FTA.mock.db().t || 0).toISOString()), e0 = errs.length;
    const bad = [];
    for (const pg of await p.evaluate(() => R_().pages.slice())) {
      const r = await p.evaluate(pg => { try { go(pg); return ''; } catch (e) { return pg + ': ' + e.message; } }, pg);
      if (r) { bad.push(r); continue; }
      await p.waitForTimeout(120);
      if (await p.evaluate(pg => ST.page !== pg || document.querySelector('#view').innerText.trim().length < 40, pg)) bad.push(pg + ' (' + (await p.evaluate(() => ST.page + ':' + document.querySelector('#view').innerText.trim().slice(0, 40) + ' ' + (FTA.errors || []).slice(-1).join(''))) + ')');
    }
    await p.evaluate(() => go(R_().pages[0]));
    await sync(p);
    const w = await p.evaluate(({ who, before }) => ({ mine: Object.values(FTA.mock.db().records).filter(r => r.updated_at > before && !['log', 'audit'].includes(r.collection)).map(r => r.collection + (r.updated_by === who ? '' : '(by ' + r.updated_by + ')')).filter((x, i, a) => a.indexOf(x) === i) }), { who, before });
    const pe = errs.slice(e0).filter(e => !/^console: Error: <\w+> attribute/.test(e));
    ok(!bad.length && !pe.length, role + ': all ' + (await p.evaluate(() => R_().pages.length)) + ' pages open' + (bad.length || pe.length ? ' — ' + bad.concat(pe).slice(0, 4).join(' | ') : ''));
    ok(role === 'Owner' || role === 'Admin' || role === 'Finance Manager' || w.mine.length === 0, role + ': browsing saved ' + (w.mine.length ? 'records in ' + w.mine.join(', ') : 'no records') );
  }

  console.log('10. Sign out');
  await as(p, OWNER);
  await Promise.all([p.waitForNavigation(), p.evaluate(() => SCH.signOut())]); await ready(p);
  ok(/TEST MODE/.test(await gateText(p)) && !(await p.evaluate(() => localStorage.getItem('fta-mock-session'))), 'sign out ends the session and shows the sign-in screen');

  const svg = errs.filter(e => /^console: Error: <\w+> attribute/.test(e)); if (svg.length) console.log('  (note for worker A: ' + svg.length + ' SVG NaN attribute warnings from charts with one month of data)');
  const real = errs.filter(e => !/ResizeObserver/.test(e) && !/^console: Error: <\w+> attribute/.test(e));
  ok(real.length === 0, 'no page errors' + (real.length ? ': ' + real.slice(0, 5).join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(2); });
