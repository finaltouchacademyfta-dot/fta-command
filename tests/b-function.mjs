/* Worker B · the Netlify Function (netlify/functions/api.mjs) against a fake Supabase
   (PostgREST + Auth answered in memory). Checks the HTTP layer: token check, CORS,
   POST only, PostgREST query strings, pagination, owner bootstrap, push/pull. */
process.env.SUPABASE_URL = 'https://fake.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'; process.env.OWNER_EMAIL = 'owner@gmail.com'; process.env.URL = 'https://fta.netlify.app';
const T = { members: [], records: [], audit_log: [] }, TOKENS = { 'tok-owner': 'owner@gmail.com', 'tok-t1': 't1@gmail.com', 'tok-x': 'x@gmail.com' };
let seq = 0; const stamp = () => new Date(Date.UTC(2026, 9, 29, 10, 0, 0, ++seq)).toISOString().replace('Z', '+00:00');
const seen = [];
globalThis.fetch = async (url, o = {}) => {
  const u = new URL(url), H = o.headers || {}; seen.push((o.method || 'GET') + ' ' + u.pathname + u.search);
  const res = (st, body, h) => new Response(body == null ? '' : JSON.stringify(body), { status: st, headers: h || {} });
  if (H.apikey !== 'service-key') return res(401, { message: 'no key' });
  if (u.pathname === '/auth/v1/user') { const e = TOKENS[(H.Authorization || '').replace('Bearer ', '')]; return e ? res(200, { email: e, email_confirmed_at: '2026-01-01' }) : res(401, {}); }
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/); if (!m) return res(404);
  const tbl = T[m[1]]; if (!tbl) return res(404);
  const filt = []; u.searchParams.forEach((v, k) => { if (['select', 'order', 'on_conflict'].includes(k)) return; const [op, ...rest] = v.split('.'); filt.push([k, op, rest.join('.')]); });
  const match = r => filt.every(([k, op, v]) => op === 'eq' ? String(r[k]) === v : op === 'gt' ? r[k] > v : true);
  if (!o.method || o.method === 'GET') {
    let rows = tbl.filter(match); const rg = H.Range; if (rg) { const [a, b] = rg.split('-').map(Number); rows = rows.slice(a, b + 1); }
    return res(rg ? 206 : 200, rows);
  }
  if (o.method === 'POST') {
    const body = JSON.parse(o.body), rows = Array.isArray(body) ? body : [body], out = [];
    const keys = (u.searchParams.get('on_conflict') || '').split(',').filter(Boolean);
    rows.forEach(r => { r = Object.assign({}, r); if (m[1] !== 'audit_log') r.updated_at = stamp(); const i = keys.length ? tbl.findIndex(x => keys.every(k => x[k] === r[k])) : -1; if (i > -1) tbl[i] = Object.assign({}, tbl[i], r); else tbl.push(r); out.push(i > -1 ? tbl[i] : r); });
    return res(201, /return=minimal/.test(H.Prefer || '') ? null : out);
  }
  if (o.method === 'DELETE') { for (let i = tbl.length - 1; i >= 0; i--) if (match(tbl[i])) tbl.splice(i, 1); return res(204); }
  return res(405);
};
const fn = (await import('../netlify/functions/api.mjs')).default, cfg = (await import('../netlify/functions/api.mjs')).config;
const call = async (tok, body, method = 'POST', origin = 'https://fta.netlify.app') => { const r = await fn(new Request('https://fta.netlify.app/api', { method, headers: Object.assign({ 'Content-Type': 'application/json', Origin: origin }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: method === 'POST' ? JSON.stringify(body) : undefined })); return { s: r.status, b: await r.json(), h: r.headers }; };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
ok(cfg.path === '/api', 'served at /api');
ok((await call(null, { action: 'me' }, 'GET')).s === 405, 'GET is refused (POST only)');
ok((await call(null, { action: 'me' })).s === 401, 'no token → 401');
ok((await call('tok-bad', { action: 'me' })).s === 401, 'bad token → 401');
const x = await call('tok-x', { action: 'pull' }); ok(x.s === 403, 'unknown Gmail → 403 on pull');
const me = await call('tok-owner', { action: 'me' }); ok(me.b.member && me.b.member.role === 'Owner' && T.members.length === 1, 'owner Gmail is bootstrapped as Owner');
ok(me.h.get('access-control-allow-origin') === 'https://fta.netlify.app' && me.h.get('cache-control') === 'no-store', 'CORS only for the site, no-store');
ok(!(await call('tok-owner', { action: 'me' }, 'POST', 'https://evil.example')).h.get('access-control-allow-origin'), 'no CORS header for another site');
const add = await call('tok-owner', { action: 'member', member: { email: 't1@gmail.com', role: 'Mentor', mentor_id: 'MEN-01', name: 'T1' } }); ok(add.b.ok && T.members.some(m => m.email === 't1@gmail.com'), 'owner adds a teacher');
const p1 = await call('tok-owner', { action: 'push', changes: [{ c: 'groups', id: 'G1', data: { id: 'G1', mentor: 'MEN-01', stu: ['STU-1001'] }, base: null }, { c: 'students', id: 'STU-1001', data: { id: 'STU-1001', name: 'A', notes: ['x'] }, base: null }, { c: 'students', id: 'STU-1002', data: { id: 'STU-1002', name: 'B' }, base: null }, { c: 'payments', id: 'PAY-1', data: { id: 'PAY-1', stu: 'STU-1001', amt: 5, date: '2026-10-30', acct: 'ACC-CASH', alloc: [] }, base: null }] });
ok(p1.b.results.every(r => r.status === 'ok'), 'owner push: all ok');
ok(JSON.stringify(T.records.find(r => r.id === 'STU-1001').mentor_ids) === '["MEN-01"]', 'tags computed on the server');
for (let i = 0; i < 1100; i++) T.records.push({ collection: 'log', id: 'L' + String(i).padStart(5, '0'), data: { i }, mentor_ids: [], student_ids: [], deleted: false, updated_at: stamp() });
const all = await call('tok-owner', { action: 'pull' }); ok(all.b.records.length === 1104, 'pull pages through more than 1000 rows (' + all.b.records.length + ')');
const t1 = await call('tok-t1', { action: 'pull' }); ok(t1.b.records.map(r => r.id).join() === 'G1,STU-1001' && !t1.b.records[1].data.notes, 'teacher pull: own group and student only, no notes');
const tp = await call('tok-t1', { action: 'push', changes: [{ c: 'payments', id: 'PAY-2', data: { id: 'PAY-2' }, base: null }] }); ok(tp.b.results[0].status === 'rejected', 'teacher payment push rejected');
const since = await call('tok-owner', { action: 'pull', since: all.b.cursor }); ok(since.b.records.length === 0, 'pull since cursor: nothing new');
const base = T.records.find(r => r.id === 'STU-1002').updated_at;
await call('tok-owner', { action: 'push', changes: [{ c: 'students', id: 'STU-1002', data: { id: 'STU-1002', name: 'B2' }, base }] });
const cf = await call('tok-owner', { action: 'push', changes: [{ c: 'students', id: 'STU-1002', data: { id: 'STU-1002', name: 'B3' }, base }] }); ok(cf.b.results[0].status === 'conflict' && cf.b.results[0].data.name === 'B2', 'stale base → conflict with the current version');
ok(seen.some(q => /records\?collection=eq\.students&id=eq\.STU-1002/.test(q)) && seen.some(q => /on_conflict=collection,id/.test(q)) && T.audit_log.length > 3, 'PostgREST queries and audit lines as expected');
const big = await fn(new Request('https://fta.netlify.app/api', { method: 'POST', headers: { Authorization: 'Bearer tok-owner' }, body: 'x'.repeat(6e6 + 10) })); ok(big.status === 413, 'over 6 MB → 413');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
