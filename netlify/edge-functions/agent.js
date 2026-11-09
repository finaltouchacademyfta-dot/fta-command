// =====================================================================
// FTA Command Centre · FTA Assistant (AI agent) · server door
// POST /api/agent   header: Authorization: Bearer <Supabase access token>
//   body: { system, messages, tools }   →   Claude's answer, streamed (text/event-stream)
// GET  /api/agent   → { ready: true|false } (is the AI key set? never shows the key)
//
// · Only signed-in members whose role is in AGENT_ROLES (default: Owner) may use it — checked
//   here against the `members` table with the server key, never trusted from the browser.
// · The Anthropic key (ANTHROPIC_API_KEY) lives only in Netlify's environment variables.
// · The assistant never touches the database from here: every change it makes runs inside the
//   app in the Owner's browser and is saved through /api, where fta-policy.js checks it like any
//   other change (permissions are enforced on the server, not only in the screen).
// · An Edge Function (not a normal function) because Claude can think for longer than the 10 s
//   limit of normal functions; the answer is streamed, so the browser sees it word by word.
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
//   AGENT_MODEL (optional, default claude-sonnet-5-5), AGENT_ROLES (optional, default Owner)
// =====================================================================
const env = k => { try { return (globalThis.Netlify && Netlify.env.get(k)) || (globalThis.Deno && Deno.env.get(k)) || (globalThis.process && process.env[k]) || ''; } catch (e) { return ''; } };
const cleanUrl = u => { u = String(u || '').trim(); try { const x = new URL(u); return x.protocol === 'https:' ? x.origin : u.replace(/\/+$/, ''); } catch (e) { return u.replace(/\/+$/, ''); } };
const keyHeaders = k => { k = String(k || '').trim(); return /^sb_/.test(k) ? { apikey: k } : { apikey: k, Authorization: 'Bearer ' + k }; };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

const MAX_BODY = 900000;          /* characters in one request (conversation + app knowledge) */
const MAX_TOKENS = 8000;          /* longest single answer */
const PER_HOUR = 300;             /* model calls per person per hour (one task can take several) */
const HITS = new Map();
function limited(email) {
  const now = Date.now(), a = (HITS.get(email) || []).filter(t => now - t < 3600000);
  if (a.length >= PER_HOUR) { HITS.set(email, a); return true; }
  a.push(now); HITS.set(email, a); return false;
}

async function member(token) {
  const URL0 = cleanUrl(env('SUPABASE_URL')), KEY = String(env('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  if (!URL0 || !KEY) return { bad: 500, msg: 'The server is not set up yet (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' };
  if (!token) return { bad: 401, msg: 'Please sign in again' };
  const u = await fetch(URL0 + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + token } }).catch(() => null);
  if (!u || !u.ok) return { bad: 401, msg: 'Please sign in again' };
  const user = await u.json().catch(() => null);
  if (!user || !user.email || (user.email_confirmed_at == null && user.confirmed_at == null)) return { bad: 401, msg: 'Please sign in again' };
  const email = String(user.email).toLowerCase();
  const r = await fetch(URL0 + '/rest/v1/members?select=email,role,active&email=eq.' + encodeURIComponent(email), { headers: keyHeaders(KEY) }).catch(() => null);
  const rows = r && r.ok ? await r.json().catch(() => []) : [];
  const m = rows[0];
  if (!m || !m.active) return { bad: 403, msg: 'Your account is not active.' };
  const allowed = (env('AGENT_ROLES') || 'Owner').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(m.role)) return { bad: 403, msg: 'The assistant is only for: ' + allowed.join(', ') + '.' };
  return { email, role: m.role };
}

/* only what Claude needs, in the shape Claude expects; everything else from the browser is dropped */
function clean(body) {
  const system = typeof body.system === 'string' ? body.system.slice(0, 400000) : '';
  const tools = Array.isArray(body.tools) ? body.tools.slice(0, 64).filter(t => t && /^[a-zA-Z0-9_-]{1,64}$/.test(t.name || '') && t.input_schema && typeof t.input_schema === 'object')
    .map(t => ({ name: t.name, description: String(t.description || '').slice(0, 4000), input_schema: t.input_schema })) : [];
  const messages = Array.isArray(body.messages) ? body.messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && (typeof m.content === 'string' || Array.isArray(m.content))) : [];
  if (!messages.length || messages[0].role !== 'user') return null;
  if (tools.length) tools[tools.length - 1].cache_control = { type: 'ephemeral' };
  return { system: system ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : undefined, tools, messages };
}

export default async (req) => {
  const KEY = String(env('ANTHROPIC_API_KEY') || '').trim();
  if (req.method === 'GET') return json(200, { ready: !!KEY });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const text = await req.text();
  if (text.length > MAX_BODY) return json(413, { error: 'This conversation is too long. Start a new chat (the assistant keeps what it learned).' });
  let body; try { body = JSON.parse(text || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const who = await member((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  if (who.bad) return json(who.bad, { error: who.msg });
  if (!KEY) return json(503, { error: 'The AI key is not set yet: add ANTHROPIC_API_KEY in Netlify → Environment variables, then Trigger deploy.', setup: true });
  if (limited(who.email)) return json(429, { error: 'Too many requests this hour. Please wait a little.' });
  const c = clean(body); if (!c) return json(400, { error: 'Bad request' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env('AGENT_MODEL') || 'claude-sonnet-5-5', max_tokens: MAX_TOKENS, stream: true, ...c })
  }).catch(e => ({ ok: false, status: 502, text: async () => String(e && e.message || e) }));
  if (!r.ok) {
    const t = (await r.text().catch(() => '')).slice(0, 400);
    console.error('anthropic ' + r.status + ' ' + t);
    const msg = r.status === 401 ? 'Anthropic did not accept ANTHROPIC_API_KEY (check it in Netlify).' : r.status === 429 ? 'The AI is busy or the Anthropic credit limit was reached. Try again in a minute.' : r.status === 400 && /credit/i.test(t) ? 'The Anthropic account has no credit left (console.anthropic.com → Billing).' : r.status === 404 && /model/i.test(t) ? 'The AI model name is not available (AGENT_MODEL in Netlify).' : 'The AI could not answer (' + r.status + '). Please try again.';
    return json(502, { error: msg });
  }
  return new Response(r.body, { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
};
export const config = { path: '/api/agent' };
