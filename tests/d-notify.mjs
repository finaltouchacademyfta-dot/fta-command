/* FTA · notifications end to end on the server: the real Netlify functions (api.mjs + notify-tick.mjs)
   against a fake Supabase (PostgREST in memory) and fake push services. Every message is DECRYPTED
   with the device's own key (independent library http_ece) to check who got what.
   ECE=<path to http_ece> node tests/d-notify.mjs */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ece = require(process.env.ECE || 'http_ece');
process.env.SUPABASE_URL = 'https://fake.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'; process.env.OWNER_EMAIL = 'owner@gmail.com'; process.env.URL = 'https://fta.netlify.app';

/* ---------- fake Supabase ---------- */
const T = { members: [], records: [], audit_log: [], app_settings: [], push_subs: [], push_queue: [], push_sent: [] };
const TOK = {}; let seq = 0, qid = 0;
const stamp = () => new Date(Date.UTC(2026, 9, 29, 10, 0, 0) + (++seq)).toISOString();
const PUSHED = []; const GONE = new Set(); let BUSY = false;
const val = v => v === 'null' ? null : v;
function cond(r, k, expr) {
  const i = expr.indexOf('.'), op = expr.slice(0, i), v = expr.slice(i + 1);
  if (op === 'eq') return String(r[k]) === v;
  if (op === 'gt') return r[k] != null && r[k] > v;
  if (op === 'lt') return r[k] != null && r[k] < v;
  if (op === 'is') return v === 'null' ? r[k] == null : String(r[k]) === v;
  if (op === 'in') { const list = v.replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, '')); return list.includes(String(r[k])); }
  throw new Error('op ' + op);
}
function orCond(r, v) { return v.replace(/^\(|\)$/g, '').split(',').some(part => { const j = part.indexOf('.'); return cond(r, part.slice(0, j), part.slice(j + 1)); }); }
globalThis.fetch = async (url, o = {}) => {
  const u = new URL(url), H = o.headers || {};
  const res = (st, body) => new Response(body == null || st === 204 ? null : JSON.stringify(body), { status: st });
  if (u.hostname.endsWith('fcm.googleapis.com') || u.hostname.endsWith('push.apple.com')) {
    if (GONE.has(u.href)) return new Response('', { status: 410 });
    if (BUSY) return new Response('', { status: 503 });
    PUSHED.push({ endpoint: u.href, headers: H, body: Buffer.from(o.body) }); return new Response('', { status: 201 });
  }
  if (u.hostname !== 'fake.supabase.co') throw new Error('unexpected fetch ' + url);
  if (H.apikey !== 'service-key') return res(401, {});
  if (u.pathname === '/auth/v1/user') { const e = TOK[(H.Authorization || '').replace('Bearer ', '')]; return e ? res(200, { email: e, email_confirmed_at: '2026-01-01' }) : res(401, {}); }
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/); const tbl = m && T[m[1]]; if (!tbl) return res(404, {});
  const F = []; let limit = 0;
  u.searchParams.forEach((v, k) => { if (['select', 'order', 'on_conflict'].includes(k)) return; if (k === 'limit') { limit = +v; return; } F.push([k, v]); });
  const match = r => F.every(([k, v]) => k === 'or' ? orCond(r, v) : cond(r, k, v));
  const method = o.method || 'GET';
  if (method === 'GET') { let rows = tbl.filter(match); const rg = H.Range; if (rg) { const [a, b] = rg.split('-').map(Number); rows = rows.slice(a, b + 1); } if (limit) rows = rows.slice(0, limit); return res(rg ? 206 : 200, rows); }
  if (method === 'POST') {
    const body = JSON.parse(o.body), rows = Array.isArray(body) ? body : [body], out = [], keys = (u.searchParams.get('on_conflict') || '').split(',').filter(Boolean), ignore = /ignore-duplicates/.test(H.Prefer || '');
    rows.forEach(r => {
      r = Object.assign({}, r); if (m[1] !== 'audit_log') r.updated_at = stamp(); if (m[1] === 'push_queue') { r.id = ++qid; r.created_at = stamp(); r.tries = r.tries || 0; r.claimed_at = r.claimed_at || null; } if (m[1] === 'push_sent') r.at = stamp();
      const i = keys.length ? tbl.findIndex(x => keys.every(k => x[k] === r[k])) : -1;
      if (i > -1) { if (ignore) return; tbl[i] = Object.assign({}, tbl[i], r); out.push(tbl[i]); } else { tbl.push(r); out.push(r); }
    });
    return res(201, /return=minimal/.test(H.Prefer || '') ? null : out);
  }
  if (method === 'PATCH') { const p = JSON.parse(o.body), out = []; tbl.forEach((r, i) => { if (match(r)) { tbl[i] = Object.assign({}, r, p); out.push(tbl[i]); } }); return res(200, /return=minimal/.test(H.Prefer || '') ? null : out); }
  if (method === 'DELETE') { for (let i = tbl.length - 1; i >= 0; i--) if (match(tbl[i])) tbl.splice(i, 1); return res(204); }
  return res(405, {});
};

/* ---------- people and devices ---------- */
const api = (await import('../netlify/functions/api.mjs')).default;
const tick = (await import('../netlify/functions/notify-tick.mjs'));
const call = async (who, body) => { const r = await api(new Request('https://fta.netlify.app/api', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://fta.netlify.app', Authorization: 'Bearer tok-' + who }, body: JSON.stringify(body) })); return { s: r.status, b: await r.json() }; };
const P = {
  owner: ['Owner'], admin: ['Admin'], fin: ['Finance Manager'], junior: ['Junior Admin'], staff: ['Collection Staff'],
  t1: ['Mentor', 'MEN-01'], t2: ['Mentor', 'MEN-02'], s1: ['Student', 'STU-1001'], s2: ['Student', 'STU-1002'], s3: ['Student', 'STU-1003']
};
Object.keys(P).forEach(k => { TOK['tok-' + k] = k + '@gmail.com'; });
const DEV = {};
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
await call('owner', { action: 'me' });
for (const [k, [role, id]] of Object.entries(P)) if (k !== 'owner') await call('owner', { action: 'member', member: { email: k + '@gmail.com', role, name: k, mentor_id: role === 'Mentor' ? id : undefined, student_id: role === 'Student' ? id : undefined } });
ok(T.members.length === 10, 'ten people on the academy list');
const key = await call('s1', { action: 'pushKey' });
ok(/^[A-Za-z0-9_-]{87}$/.test(key.b.key) && T.app_settings.some(r => r.key === 'vapid'), 'signing key made automatically, kept on the server');
ok((await call('t1', { action: 'pushKey' })).b.key === key.b.key, 'same key for everyone');
for (const k of Object.keys(P)) {
  const e = crypto.createECDH('prime256v1'); e.generateKeys(); const auth = crypto.randomBytes(16);
  DEV[k] = { ecdh: e, auth, endpoint: 'https://fcm.googleapis.com/fcm/send/' + k };
  const r = await call(k, { action: 'pushSub', sub: { endpoint: DEV[k].endpoint, keys: { p256dh: e.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } }, ua: 'Test ' + k });
  if (!r.b.ok) console.log(k, r.b);
}
ok(T.push_subs.length === 10, 'every person turned notifications on (' + T.push_subs.length + ')');
ok((await call('s1', { action: 'pushSub', sub: { endpoint: 'https://evil.example/x', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } } })).b.ok === false, 'a non-push-service address is refused');
ok((await call('s1', { action: 'pushSub', sub: { endpoint: 'http://fcm.googleapis.com/x', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } } })).b.ok === false, 'plain http refused');
await call('s2', { action: 'pushOff', endpoint: DEV.s1.endpoint }); ok(T.push_subs.some(s => s.endpoint === DEV.s1.endpoint), 'nobody can switch off someone else’s device');

/* who got what (decrypting each message with the device key) */
function inbox() {
  const got = {}; PUSHED.splice(0).forEach(p => {
    const k = Object.keys(DEV).find(x => DEV[x].endpoint === p.endpoint);
    const j = JSON.parse(ece.decrypt(p.body, { version: 'aes128gcm', privateKey: DEV[k].ecdh, authSecret: DEV[k].auth.toString('base64url') }).toString());
    (got[k] = got[k] || []).push(Object.assign(j, { _h: p.headers }));
  }); return got;
}
const who = g => Object.keys(g).sort().join(',');
const push = (by, changes) => call(by, { action: 'push', changes: changes.map(([c, id, data]) => ({ c, id, data, base: (T.records.find(r => r.collection === c && r.id === id) || {}).updated_at || null })) });

/* ---------- the academy ---------- */
await push('owner', [
  ['mentors', 'MEN-01', { id: 'MEN-01', name: 'Nusrat Jahan', status: 'Active' }], ['mentors', 'MEN-02', { id: 'MEN-02', name: 'Mahmud Alam', status: 'Active' }],
  ['students', 'STU-1001', { id: 'STU-1001', name: 'Ayaan', status: 'Active', cls: 'Grade 9' }], ['students', 'STU-1002', { id: 'STU-1002', name: 'Raisa', status: 'Active', cls: 'Grade 10' }], ['students', 'STU-1003', { id: 'STU-1003', name: 'Tahmid', status: 'Active', cls: 'A Level (AS)' }],
  ['groups', 'G1', { id: 'G1', name: 'English · G9-10', mentor: 'MEN-01', stu: ['STU-1001', 'STU-1002'] }], ['groups', 'G2', { id: 'G2', name: 'Physics · AS', mentor: 'MEN-02', stu: ['STU-1003'] }],
  ['circles', 'CI-IGCSE', { id: 'CI-IGCSE', name: 'IGCSE & O Level Circle', kind: 'rule', rule: { who: 'students', cls: ['Grade 9', 'Grade 10', 'O Level'] } }]
]);
ok(Object.keys(inbox()).length === 0, 'setting up people and classes sends nothing');

console.log('notices');
await push('owner', [['notices', 'NT-1', { id: 'NT-1', title: 'Eid holiday: academy closed 6–9 June', circles: ['CI-STU'], status: 'Published', type: 'Holiday', seen: {} }]]);
let g = inbox(); ok(who(g) === 's1,s2,s3', 'Student Circle notice → every student, not teachers, not the sender (' + who(g) + ')');
ok(g.s1 && g.s1[0].t === 'New notice · Student Circle' && /Eid holiday/.test(g.s1[0].b) && g.s1[0].u === '/?go=sp-notices&nt=NT-1', 'text and tap-to-open link');
ok(g.s1 && g.s1[0]._h.Authorization.startsWith('vapid t=') && g.s1[0]._h['Content-Encoding'] === 'aes128gcm' && g.s1[0]._h.Urgency === 'high', 'signed, encrypted, urgent for a closure');
await push('owner', [['notices', 'NT-2', { id: 'NT-2', title: 'Staff meeting Friday', circles: ['CI-TEACH'], status: 'Published', type: 'Meeting', seen: {} }]]);
g = inbox(); ok(who(g) === 't1,t2' && g.t1[0].u === '/?go=tp-notices&nt=NT-2', 'Teacher Circle notice → teachers only (' + who(g) + ')');
await push('owner', [['notices', 'NT-3', { id: 'NT-3', title: 'Mock exams', circles: ['CI-IGCSE'], status: 'Published', type: 'Exam', seen: {} }]]);
g = inbox(); ok(who(g) === 's1,s2', 'rule circle (Grade 9/10) → only those students (' + who(g) + ')');
await push('owner', [['notices', 'NT-4', { id: 'NT-4', title: 'Draft', circles: ['CI-STU'], status: 'Draft', seen: {} }]]);
ok(!Object.keys(inbox()).length, 'a draft notice sends nothing');
await push('s1', [['notices', 'NT-1', { id: 'NT-1', title: 'Eid holiday: academy closed 6–9 June', circles: ['CI-STU'], status: 'Published', type: 'Holiday', seen: { 'stu:STU-1001': 'now' } }]]);
ok(!Object.keys(inbox()).length, 'a student reading a notice sends nothing again');

console.log('homework, class notes, attendance');
await push('t1', [['hw', 'HW-1', { id: 'HW-1', gid: 'G1', title: 'Summary writing p.42', due: '2026-11-02', status: 'Open', by: 'MEN-01' }]]);
g = inbox(); ok(who(g) === 's1,s2' && /New homework · English/.test(g.s1[0].t) && /due 2 Nov/.test(g.s1[0].b) && g.s1[0].u === '/?go=sp-cal', 'class homework → that class only (' + who(g) + ')');
await push('t1', [['hw', 'HW-2', { id: 'HW-2', gid: 'G1', stu: ['STU-1002'], title: 'Extra practice', due: '2026-11-03', status: 'Open', by: 'MEN-01' }]]);
g = inbox(); ok(who(g) === 's2', 'homework for chosen students → only them (' + who(g) + ')');
await push('t2', [['hw', 'HW-3', { id: 'HW-3', gid: 'G1', title: 'sneaky', status: 'Open' }]]);
g = inbox(); ok(!g.s1 && !g.s2, 'a teacher cannot send homework to another teacher’s class');
await push('t1', [['cnotes', 'CN-1', { id: 'CN-1', gid: 'G1', stu: 'STU-1001', date: '2026-10-29', topic: 'Inference questions', hw: 'p.42', sent: '' }]]);
ok(!Object.keys(inbox()).length, 'class note saved but not sent → nothing');
await push('t1', [['cnotes', 'CN-1', { id: 'CN-1', gid: 'G1', stu: 'STU-1001', date: '2026-10-29', topic: 'Inference questions', hw: 'p.42', sent: '29 Oct, 7:12 pm' }]]);
g = inbox(); ok(who(g) === 's1' && /Class note/.test(g.s1[0].t), 'class note sent → that student');
await push('t1', [['att', 'G1|2026-10-29', { at: 'now', by: 'Nusrat', marks: { 'STU-1001': 'P', 'STU-1002': 'A' } }]]);
g = inbox(); ok(who(g) === 's2' && g.s2[0].t === 'Marked absent' && g.s2[0].u === '/?go=sp-att', 'absent → that student only (' + who(g) + ')');

console.log('messages and replies');
await push('s1', [['req', 'RQ-1', { id: 'RQ-1', notice: 'NT-1', from: 'stu:STU-1001', type: 'message', msg: 'Will online classes run during Eid?', status: 'New', thread: [] }]]);
g = inbox(); ok(who(g) === 'admin,junior,owner' && g.owner[0].t === 'New message from Ayaan' && g.owner[0].u === '/?go=nc-notices&tab=inbox', 'student message → the office inbox (' + who(g) + ')');
await push('owner', [['req', 'RQ-1', { id: 'RQ-1', notice: 'NT-1', from: 'stu:STU-1001', type: 'message', msg: 'Will online classes run during Eid?', status: 'Replied', thread: [{ by: 'Owner', at: 'now', t: 'Yes, on Zoom at the usual time.' }] }]]);
g = inbox(); ok(who(g) === 's1' && g.s1[0].t === 'The office replied' && /Zoom/.test(g.s1[0].b), 'office reply → that student only (' + who(g) + ')');
await push('t1', [['req', 'RQ-2', { id: 'RQ-2', notice: 'NT-2', from: 'men:MEN-01', type: 'message', msg: 'I will be 10 minutes late', status: 'New', thread: [] }]]);
g = inbox(); ok(who(g) === 'admin,junior,owner' && /Nusrat Jahan/.test(g.owner[0].t), 'teacher message → office');
await push('admin', [['req', 'RQ-2', { id: 'RQ-2', notice: 'NT-2', from: 'men:MEN-01', type: 'message', msg: 'I will be 10 minutes late', status: 'Replied', thread: [{ by: 'Admin', at: 'now', t: 'Noted, thanks' }] }]]);
g = inbox(); ok(who(g) === 't1', 'admin reply → that teacher (' + who(g) + ')');

console.log('office and money');
await push('t1', [['pend', 'NEW-1', { id: 'NEW-1', name: 'Nabil', by: 'MEN-01', status: 'Pending', gid: 'G1' }]]);
g = inbox(); ok(who(g) === 'admin,junior,owner' && /New student from Nusrat/.test(g.owner[0].t), 'teacher adds a student → office approval');
await push('owner', [['pend', 'NEW-1', { id: 'NEW-1', name: 'Nabil', by: 'MEN-01', status: 'Approved', gid: 'G1' }]]);
g = inbox(); ok(who(g) === 't1' && g.t1[0].t === 'New student approved', 'approval → that teacher');
await push('staff', [['payments', 'PAY-1', { id: 'PAY-1', stu: 'STU-1001', date: '2026-10-29', amt: 4500, alloc: [], status: 'Pending', method: 'bKash' }]]);
g = inbox(); ok(who(g) === 'admin,fin,owner' && g.fin[0].t === 'Payment to verify' && /Ayaan · ৳4,500/.test(g.fin[0].b), 'payment to verify → Owner, Admin, Finance; never the student (' + who(g) + ')');
await push('t1', [['marks', 'EX1|G1', { status: 'Submitted', m: { 'STU-1001': 40, 'STU-1002': 35 } }]]);
g = inbox(); ok(who(g) === 'admin,junior,owner', 'marks submitted → office approval');
await push('owner', [['marks', 'EX1|G1', { status: 'Published', m: { 'STU-1001': 40, 'STU-1002': 35 } }]]);
g = inbox(); ok(who(g) === 's1,s2' && g.s1[0].u === '/?go=sp-results', 'marks published → those students only (' + who(g) + ')');

console.log('choices, devices, safety');
await call('s2', { action: 'pushPrefs', endpoint: DEV.s2.endpoint, prefs: { off: ['homework', 'bogus'] } });
ok(JSON.stringify(T.push_subs.find(s => s.email === 's2@gmail.com').prefs) === '{"off":["homework"]}', 'device choices saved (unknown kinds dropped)');
await push('t1', [['hw', 'HW-4', { id: 'HW-4', gid: 'G1', title: 'Vocabulary', due: '2026-11-04', status: 'Open', by: 'MEN-01' }]]);
g = inbox(); ok(who(g) === 's1', 'homework turned off on Raisa’s phone → only Ayaan (' + who(g) + ')');
GONE.add(DEV.s3.endpoint);
await push('owner', [['notices', 'NT-5', { id: 'NT-5', title: 'Fees reminder', circles: ['CI-STU'], status: 'Published', seen: {} }]]);
g = inbox(); ok(!T.push_subs.some(s => s.email === 's3@gmail.com'), 'an uninstalled device (410) is forgotten');
await push('owner', [['hw', 'HW-5', { id: 'HW-5', gid: 'G1', title: 'a', status: 'Open' }], ['hw', 'HW-6', { id: 'HW-6', gid: 'G1', title: 'b', status: 'Open' }], ['hw', 'HW-7', { id: 'HW-7', gid: 'G1', title: 'c', status: 'Open' }], ['hw', 'HW-8', { id: 'HW-8', gid: 'G1', title: 'd', status: 'Open' }]]);
g = inbox(); ok(g.s1 && g.s1.length === 1 && g.s1[0].t === '4 new updates', 'four at once → one tidy notification');
ok(g.t1 && g.t1.length === 1, 'the class teacher hears when the office sets homework');
BUSY = true;
await push('owner', [['notices', 'NT-6', { id: 'NT-6', title: 'Results day', circles: ['CI-TEACH'], status: 'Published', seen: {} }]]);
ok(!PUSHED.length && T.push_queue.length === 2, 'push service busy → kept in the queue (' + T.push_queue.length + ')');
BUSY = false; T.push_queue.forEach(r => { r.claimed_at = new Date(Date.now() - 6 * 60e3).toISOString(); });
await tick.default(); g = inbox(); ok(who(g) === 't1,t2' && !T.push_queue.length, 'the 5-minute run delivers it later (' + who(g) + ')');
ok(tick.config.schedule === '*/5 * * * *', 'runs every 5 minutes');
const test = await call('t2', { action: 'pushTest', endpoint: DEV.t2.endpoint }); g = inbox(); ok(test.b.ok && g.t2 && g.t2[0].t === 'Notifications are on' && g.t2[0].u === '/?go=tp-home', '"Send a test" reaches this device');
const mine = await call('t2', { action: 'pushMine', endpoint: DEV.t2.endpoint }); ok(mine.b.devices.length === 1 && mine.b.devices[0].me && !('auth' in mine.b.devices[0]) && !('endpoint' in mine.b.devices[0]), 'my devices list hides the keys');
await call('owner', { action: 'member', member: { email: 't2@gmail.com', role: 'Mentor', mentor_id: 'MEN-02', name: 't2', active: false } });
ok(!T.push_subs.some(s => s.email === 't2@gmail.com'), 'deactivated teacher’s devices are removed at once');
await push('owner', [['notices', 'NT-7', { id: 'NT-7', title: 'x', circles: ['CI-TEACH'], status: 'Published', seen: {} }]]);
g = inbox(); ok(who(g) === 't1', 'nothing more reaches a removed person');
await call('s1', { action: 'pushOff', endpoint: DEV.s1.endpoint }); ok(!T.push_subs.some(s => s.email === 's1@gmail.com'), 'turning off on a device (or signing out) removes it');

console.log('reminders');
const dh = ms => new Date(ms + 6 * 3600e3).toISOString();
const now = Date.now(), in40 = dh(now + 40 * 60e3);
await call('s1', { action: 'pushSub', sub: { endpoint: DEV.s1.endpoint, keys: { p256dh: DEV.s1.ecdh.getPublicKey().toString('base64url'), auth: DEV.s1.auth.toString('base64url') } } });
await push('t1', [['events', 'EV-1', { id: 'EV-1', mentor: 'MEN-01', title: 'Extra class · summary writing', date: in40.slice(0, 10), start: in40.slice(11, 16), allDay: false, repeat: 'none', stu: ['STU-1001'], place: 'Zoom', remind: '1h' }]]);
g = inbox(); ok(who(g) === 's1' && /^New · Extra class/.test(g.s1[0].t), 'new event → the chosen student (teacher who made it is not told)');
await tick.default(); g = inbox(); ok(who(g) === 's1,t1' && /at /.test(g.s1[0].t) && g.s1[0]._h.Urgency === 'high', 'reminder 1 hour before → student and teacher (' + who(g) + ')');
await tick.default(); ok(!Object.keys(inbox()).length, 'a reminder is sent only once');
const tomorrow = dh(now + 864e5).slice(0, 10);
await push('t1', [['hw', 'HW-9', { id: 'HW-9', gid: 'G1', title: 'Essay draft', due: tomorrow, status: 'Open', by: 'MEN-01' }]]); inbox();
await tick.default(); g = inbox(); const evening = +dh(now).slice(11, 13) >= 17;
ok(evening ? (g.s1 && g.s1.some(x => x.t === 'Homework due tomorrow') && !(g.s2 || []).some(x => x.t === 'Homework due tomorrow')) : !g.s1, evening ? 'homework due tomorrow → reminder in the evening (Raisa turned homework off)' : 'homework reminder waits for the evening');
const ox0 = dh(now + 20 * 60e3).slice(0, 16);
await push('owner', [['ox', 'OX-1', { id: 'OX-1', title: 'Physics quiz', gids: ['G2'], open: ox0, status: 'Draft' }]]); inbox();
await push('owner', [['ox', 'OX-1', { id: 'OX-1', title: 'Physics quiz', gids: ['G2'], open: ox0, status: 'Scheduled' }]]);
g = inbox(); ok(!g.s1 && !g.s2, 'exam for another class is not sent to these students');

{ /* fixed clock: 6 pm Dhaka, homework due the next day */
  const N = require('../public/vendor/fta-notify.js'), { makeStore } = await import('../server/store.mjs'), st = makeStore(process.env);
  const eve = Date.parse(dh(now).slice(0, 10) + 'T18:00:00+06:00'), due = dh(eve + 864e5).slice(0, 10);
  await push('t1', [['hw', 'HW-10', { id: 'HW-10', gid: 'G1', title: 'Poem analysis', due, status: 'Open', by: 'MEN-01' }]]); inbox();
  const q = await N.remind(st, eve); await N.drain(st, 5000); g = inbox();
  ok(g.s1 && g.s1.some(x => x.t === 'Homework due tomorrow' && /Poem/.test(x.b)) && !(g.s2 || []).length, 'evening reminder: homework due tomorrow → Ayaan (Raisa turned homework off) (' + who(g) + ')');
  ok(!(await N.remind(st, eve + 600e3)).some(r => /Poem/.test(r.payload.b)), 'the homework reminder is not repeated');
}
console.log('safety: what a teacher of another class sees');
ok(!PUSHED.length, 'queue empty');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
