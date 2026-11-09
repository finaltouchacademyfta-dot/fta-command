/* FTA Assistant server door (netlify/edge-functions/agent.js) with fake Supabase + fake Anthropic.
   node tests/d-agent.mjs */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, '.tmp-agent.mjs'); writeFileSync(tmp, readFileSync(join(here, '..', 'netlify', 'edge-functions', 'agent.js'), 'utf8'));
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const ENV = { SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x', ANTHROPIC_API_KEY: '' };
globalThis.Netlify = { env: { get: k => ENV[k] } };
const USERS = { tok_owner: 'boss@gmail.com', tok_admin: 'admin@gmail.com', tok_off: 'old@gmail.com', tok_mentor: 'teacher@gmail.com' };
const MEMBERS = { 'boss@gmail.com': { role: 'Owner', active: true }, 'admin@gmail.com': { role: 'Admin', active: true }, 'old@gmail.com': { role: 'Owner', active: false }, 'teacher@gmail.com': { role: 'Mentor', active: true } };
let LAST = null, ANTH = { status: 200 };
globalThis.fetch = async (url, o = {}) => {
  url = String(url); const H = o.headers || {};
  if (url.endsWith('/auth/v1/user')) { const t = (H.Authorization || '').replace('Bearer ', ''); return USERS[t] ? new Response(JSON.stringify({ email: USERS[t].toUpperCase(), email_confirmed_at: 'x' }), { status: 200 }) : new Response('{}', { status: 401 }); }
  if (url.includes('/rest/v1/members')) { const e = decodeURIComponent(url.split('email=eq.')[1] || ''); const m = MEMBERS[e]; return new Response(JSON.stringify(m ? [Object.assign({ email: e }, m)] : []), { status: 200 }); }
  if (url === 'https://api.anthropic.com/v1/messages') { LAST = { headers: H, body: JSON.parse(o.body) }; if (ANTH.status !== 200) return new Response(ANTH.text || '{}', { status: ANTH.status }); return new Response('event: message_start\ndata: {"type":"message_start"}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }); }
  throw new Error('unexpected fetch ' + url);
};
const { default: handler, config } = await import(tmp + '?' + Date.now());
unlinkSync(tmp);
const body = { system: 'You are FTA Assistant', tools: [{ name: 'find', description: 'search', input_schema: { type: 'object', properties: {} }, read: true }, { name: 'bad name!', input_schema: {} }], messages: [{ role: 'user', content: 'hi' }], model: 'claude-opus-hack', max_tokens: 999999 };
const call = (tok, b = body, method = 'POST') => handler(new Request('https://x/api/agent', { method, headers: tok ? { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' } : {}, body: method === 'POST' ? (typeof b === 'string' ? b : JSON.stringify(b)) : undefined }));
const J = async r => { try { return await r.json(); } catch (e) { return {}; } };

ok(config.path === '/api/agent', 'served at /api/agent');
let r = await call(null, null, 'GET'); ok(r.status === 200 && (await J(r)).ready === false, 'GET: not ready without the AI key (key never shown)');
r = await call(null, null, 'PUT'); ok(r.status === 405, 'only POST');
r = await call(null); ok(r.status === 401, 'no sign-in → 401');
r = await call('tok_bad'); ok(r.status === 401, 'bad token → 401');
r = await call('tok_mentor'); ok(r.status === 403 && /Owner/.test((await J(r)).error), 'Mentor → 403');
r = await call('tok_admin'); ok(r.status === 403, 'Admin → 403 (Owner only by default)');
r = await call('tok_off'); ok(r.status === 403, 'deactivated Owner → 403');
r = await call('tok_owner'); ok(r.status === 503 && /ANTHROPIC_API_KEY/.test((await J(r)).error), 'Owner without AI key → clear set-up message');
ENV.ANTHROPIC_API_KEY = 'sk-ant-test';
r = await call(null, null, 'GET'); ok((await J(r)).ready === true, 'GET: ready once the key is set');
r = await call('tok_owner');
ok(r.status === 200 && /event-stream/.test(r.headers.get('content-type')) && /message_start/.test(await r.text()), 'Owner → Claude’s stream passed through');
ok(LAST.headers['x-api-key'] === 'sk-ant-test' && LAST.headers['anthropic-version'], 'key sent only to Anthropic, from the server');
ok(LAST.body.model === 'claude-sonnet-5-5' && LAST.body.max_tokens === 8000 && LAST.body.stream === true, 'model and size decided by the server, not the browser');
ok(LAST.body.tools.length === 1 && !('read' in LAST.body.tools[0]) && LAST.body.tools[0].cache_control, 'tools cleaned (bad names dropped, extra fields removed, cached)');
ok(Array.isArray(LAST.body.system) && LAST.body.system[0].text === 'You are FTA Assistant' && LAST.body.system[0].cache_control, 'system prompt cached');
ENV.AGENT_MODEL = 'claude-opus-5-5'; await call('tok_owner'); ok(LAST.body.model === 'claude-opus-5-5', 'AGENT_MODEL changes the model'); delete ENV.AGENT_MODEL;
ENV.AGENT_ROLES = 'Owner, Admin'; r = await call('tok_admin'); ok(r.status === 200, 'AGENT_ROLES can let Admin in'); delete ENV.AGENT_ROLES;
r = await call('tok_owner', 'x'.repeat(950000)); ok(r.status === 413, 'too long → 413');
r = await call('tok_owner', '{bad'); ok(r.status === 400, 'bad JSON → 400');
r = await call('tok_owner', { messages: [{ role: 'assistant', content: 'x' }] }); ok(r.status === 400, 'must start with the Owner’s message');
ANTH = { status: 401, text: '{"error":{"message":"invalid x-api-key"}}' }; r = await call('tok_owner'); ok(r.status === 502 && /ANTHROPIC_API_KEY/.test((await J(r)).error), 'wrong AI key → explained');
ANTH = { status: 400, text: '{"error":{"message":"Your credit balance is too low"}}' }; r = await call('tok_owner'); ok(/credit/.test((await J(r)).error), 'no credit → explained');
ANTH = { status: 200 };
let last; for (let i = 0; i < 300; i++) last = await call('tok_owner'); ok(last.status === 429, 'rate limit per hour');
/* the assistant's memory in the shared access policy: Owner only, read and write */
const { createRequire } = await import('node:module'); const P = createRequire(import.meta.url)('../public/vendor/fta-policy.js');
const rec = { collection: 'agentmem', id: 'AM-1', data: { id: 'AM-1', text: 'secret rule' } };
ok(P.read({ role: 'Owner', active: true }, rec) && !P.read({ role: 'Admin', active: true }, rec) && !P.read({ role: 'Mentor', active: true, mentor_id: 'MEN-01' }, rec) && !P.read({ role: 'Student', active: true, student_id: 'STU-1001' }, rec), 'policy: only the Owner can read the memory');
ok(P.write({ role: 'Owner', active: true }, 'agentmem', 'AM-1', rec.data, null).ok && !P.write({ role: 'Admin', active: true }, 'agentmem', 'AM-1', rec.data, null).ok && !P.write({ role: 'Mentor', active: true, mentor_id: 'MEN-01' }, 'agentmem', 'AM-1', rec.data, null).ok, 'policy: only the Owner can change the memory');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
