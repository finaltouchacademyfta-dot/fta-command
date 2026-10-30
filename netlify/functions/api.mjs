// =====================================================================
// FTA Command Centre · the only door to the data (Netlify Function).
// POST /.netlify/functions/api   body: { action, ... }   header: Authorization: Bearer <Supabase access token>
// Environment (Netlify → Site configuration → Environment variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret, server only), OWNER_EMAIL, SITE_URL (optional, for CORS)
// No npm packages: plain fetch to Supabase REST (server/store.mjs), so the build needs nothing.
// Also: notifications to phones and laptops (Web Push, server/webpush.mjs); keys made automatically.
// =====================================================================
import core from '../../public/vendor/fta-api-core.js';

import { makeStore } from '../../server/store.mjs';

const store = makeStore(process.env);
const URL0 = store.url, KEY = store.key;
async function ownerEmail() {
  if (process.env.OWNER_EMAIL) return process.env.OWNER_EMAIL;
  return store.setting('owner_email');
}
async function whoIs(token) {
  if (!token) return null;
  const r = await fetch(URL0 + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u || !u.email || (u.email_confirmed_at == null && u.confirmed_at == null)) return null;
  return String(u.email).toLowerCase();
}
function reply(status, body, origin) {
  const allow = process.env.SITE_URL || process.env.URL || '';
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(allow && origin === allow ? { 'Access-Control-Allow-Origin': allow, Vary: 'Origin' } : {}) } });
}
export default async (req) => {
  const origin = req.headers.get('origin') || '';
  if (req.method !== 'POST') return reply(405, { error: 'POST only' }, origin);
  if (!URL0 || !KEY) return reply(500, { error: 'The server is not set up yet: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify.' }, origin);
  let body; try { const t = await req.text(); if (t.length > 6e6) return reply(413, { error: 'Too large' }, origin); body = JSON.parse(t || '{}'); } catch (e) { return reply(400, { error: 'Bad request' }, origin); }
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const email = await whoIs(token);
    if (!email) return reply(401, { error: 'Please sign in again' }, origin);
    const r = await core.handle(store, email, body, { OWNER_EMAIL: await ownerEmail() });
    return reply(r.status, r.body, origin);
  } catch (e) {
    console.error(e);
    return reply(500, { error: 'Server error. Please try again.' }, origin);
  }
};
export const config = { path: '/api' };
