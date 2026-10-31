// =====================================================================
// FTA Command Centre · the only door to the data (Netlify Function).
// POST /.netlify/functions/api   body: { action, ... }   header: Authorization: Bearer <Supabase access token>
// Environment (Netlify → Site configuration → Environment variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret, server only), OWNER_EMAIL, SITE_URL (optional, for CORS)
// No npm packages: plain fetch to Supabase REST (server/store.mjs), so the build needs nothing.
// GET /api (open it in a browser) = a setup check: Supabase address, server key, tables, Google
// sign-in, Owner Gmail — ✔ / ✖ with the fix. It never shows a key or an e-mail address.
// Also: notifications to phones and laptops (Web Push, server/webpush.mjs); keys made automatically.
// =====================================================================
import core from '../../public/vendor/fta-api-core.js';

import { makeStore, keyInfo, keyHeaders, cleanUrl } from '../../server/store.mjs';

const store = makeStore(process.env);
const URL0 = store.url, KEY = store.key;
async function ownerEmail() {
  if (process.env.OWNER_EMAIL) return process.env.OWNER_EMAIL;
  return store.setting('owner_email');
}
/* who is signing in · tells a bad sign-in (→ sign in again) apart from a server set-up mistake (→ say what to fix) */
async function whoIs(token) {
  if (!token) return { bad: 'token' };
  let r;
  try { r = await fetch(URL0 + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + token } }); }
  catch (e) { return { bad: 'setup', msg: 'The server cannot reach Supabase. Check SUPABASE_URL in Netlify.' }; }
  if (!r.ok) {
    const t = (await r.text().catch(() => '')).slice(0, 300);
    if (/api ?key|legacy|apikey|no api key|invalid key/i.test(t) || r.status === 404) return { bad: 'setup', msg: 'Supabase did not accept the server key (SUPABASE_SERVICE_ROLE_KEY) or address (SUPABASE_URL) in Netlify.' };
    return { bad: 'token' };
  }
  const u = await r.json().catch(() => null);
  if (!u || !u.email || (u.email_confirmed_at == null && u.confirmed_at == null)) return { bad: 'token' };
  return { email: String(u.email).toLowerCase() };
}

/* ---------- GET /api : the setup check ---------- */
let LAST = null;
async function diagnose() {
  if (LAST && Date.now() - LAST.t < 20000) return LAST.text;
  const L = [], add = (ok, en, bn) => L.push((ok === true ? '✔ ' : ok === false ? '✖ ' : 'ℹ ') + en + (bn ? '\n    ' + bn : ''));
  const raw = String(process.env.SUPABASE_URL || '').trim(), k = keyInfo(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const m = /^https:\/\/([a-z0-9]{15,30})\.supabase\.co$/.exec(URL0), ref = m ? m[1] : '';
  /* 1. address */
  if (!raw) add(false, 'SUPABASE_URL is missing in Netlify.', 'Netlify → Environment variables-এ SUPABASE_URL দিন (যেমন https://abcd.supabase.co)।');
  else if (cleanUrl(raw) !== raw.replace(/\/+$/, '')) add(true, 'SUPABASE_URL had extra text after .supabase.co — the server uses ' + URL0 + ' (better: remove the extra part in Netlify).', 'SUPABASE_URL-এর শেষে বাড়তি অংশ আছে; শুধু https://xxxx.supabase.co রাখুন।');
  else add(true, 'SUPABASE_URL: ' + URL0);
  /* 2. key type */
  const KT = { missing: [false, 'SUPABASE_SERVICE_ROLE_KEY is missing in Netlify.', 'Supabase → Project Settings → API Keys → Secret key (sb_secret_…) কপি করে Netlify-তে SUPABASE_SERVICE_ROLE_KEY নামে দিন।'],
    publishable: [false, 'SUPABASE_SERVICE_ROLE_KEY holds the PUBLISHABLE key. It must be the SECRET key (sb_secret_…).', 'এখানে ভুল key বসেছে (publishable)। Supabase → API Keys → Secret key দিন, তারপর Trigger deploy।'],
    'legacy-anon': [false, 'SUPABASE_SERVICE_ROLE_KEY holds the ANON key. It must be the service_role key or the new Secret key (sb_secret_…).', 'এখানে anon key বসেছে। service_role বা Secret key (sb_secret_…) দিন, তারপর Trigger deploy।'],
    secret: [true, 'Server key type: Secret key (sb_secret_…) ✓'], 'legacy-service': [true, 'Server key type: service_role ✓'],
    unknown: [false, 'SUPABASE_SERVICE_ROLE_KEY does not look like a Supabase key (copy it again, without spaces).', 'key ঠিকমতো কপি হয়নি — আবার কপি করে বসান (আগে-পরে ফাঁকা জায়গা ছাড়া)।'] };
  add(...KT[k.kind]);
  if (k.kind === 'legacy-service' && ref && k.ref && k.ref !== ref) add(false, 'The service_role key belongs to ANOTHER Supabase project (' + k.ref + '), not ' + ref + '.', 'key আর URL দুটো আলাদা প্রজেক্টের। একই প্রজেক্ট থেকে দুটোই নিন।');
  /* 3. the key against the database */
  if (URL0 && KEY) {
    const H = keyHeaders(KEY), get = async p => { try { const r = await fetch(URL0 + p, { headers: H }); return { s: r.status, t: (await r.text()).slice(0, 300) }; } catch (e) { return { s: 0, t: String(e.message || e) }; } };
    const a = await get('/rest/v1/members?select=email&limit=1');
    if (a.s === 200) add(true, 'Server key works with the database; tables found.');
    else if (a.s === 0) add(false, 'Cannot reach ' + URL0 + ' — check SUPABASE_URL.', 'Supabase-এর ঠিকানা ভুল।');
    else if (/PGRST205|42P01|does not exist|schema cache/i.test(a.t)) add(false, 'Tables are missing: run supabase/schema.sql in Supabase → SQL Editor.', 'Supabase → SQL Editor-এ schema.sql চালান।');
    else if (a.s === 401 && /legacy/i.test(a.t)) add(false, 'Supabase says legacy keys are disabled for this project. Use the new Secret key (sb_secret_…) in SUPABASE_SERVICE_ROLE_KEY.', 'এই প্রজেক্টে পুরনো key বন্ধ। নতুন Secret key (sb_secret_…) দিন।');
    else if (a.s === 401 || a.s === 403) add(false, 'Supabase refused the server key (' + a.s + '): ' + a.t.replace(/\s+/g, ' ').slice(0, 140), 'key ভুল, অন্য প্রজেক্টের, বা কপি করতে গিয়ে কেটে গেছে। Secret key আবার কপি করে বসান, তারপর Trigger deploy।');
    else add(false, 'Database answered ' + a.s + ': ' + a.t.replace(/\s+/g, ' ').slice(0, 140));
    if (a.s === 200) {
      const p = await get('/rest/v1/push_subs?select=endpoint&limit=1');
      add(p.s === 200, p.s === 200 ? 'Notification tables found.' : 'Notification tables missing: run the newest supabase/schema.sql again (safe to re-run).', p.s === 200 ? '' : 'নতুন schema.sql আবার চালান (আগের ডাটা নষ্ট হয় না)।');
      const o = await get('/rest/v1/members?select=email&role=eq.Owner&active=eq.true');
      let n = 0; try { n = JSON.parse(o.t).length; } catch (e) { }
      add(n > 0 ? true : null, n > 0 ? 'Owner account exists.' : 'No Owner yet: the first sign-in with OWNER_EMAIL becomes the Owner.');
    }
    const g = await get('/auth/v1/settings');
    let ext = null; try { ext = JSON.parse(g.t).external; } catch (e) { }
    if (g.s === 200 && ext) add(!!ext.google, ext.google ? 'Google sign-in is on in Supabase.' : 'Google sign-in is OFF: Supabase → Authentication → Sign In / Providers → Google → Enable.', ext.google ? '' : 'Supabase-এ Google provider চালু করুন।');
  }
  /* 4. Owner Gmail */
  const ow = String(process.env.OWNER_EMAIL || '').trim();
  add(!!ow && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(ow), ow ? 'OWNER_EMAIL is set' + (ow !== ow.toLowerCase() ? ' (capital letters are fine; it is compared in lower case)' : '') + '.' : 'OWNER_EMAIL is missing in Netlify.', ow ? '' : 'Netlify-তে OWNER_EMAIL = আপনার Gmail দিন।');
  const bad = L.filter(x => x.startsWith('✖')).length;
  const text = 'FTA Command Centre · server setup check\n' + (bad ? '✖ ' + bad + ' thing(s) to fix — after fixing, Netlify → Deploys → Trigger deploy, then open this page again.\n  ' + bad + 'টা জিনিস ঠিক করতে হবে। ঠিক করে Trigger deploy দিন, তারপর এই পেজ আবার খুলুন।' : '✔ Everything looks right. / সব ঠিক আছে।') + '\n\n' + L.join('\n') + '\n';
  LAST = { t: Date.now(), text }; return text;
}
function reply(status, body, origin) {
  const allow = process.env.SITE_URL || process.env.URL || '';
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(allow && origin === allow ? { 'Access-Control-Allow-Origin': allow, Vary: 'Origin' } : {}) } });
}
export default async (req) => {
  const origin = req.headers.get('origin') || '';
  if (req.method === 'GET') return new Response(await diagnose(), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
  if (req.method !== 'POST') return reply(405, { error: 'POST only' }, origin);
  if (!URL0 || !KEY) return reply(500, { error: 'The server is not set up yet: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify.' }, origin);
  let body; try { const t = await req.text(); if (t.length > 6e6) return reply(413, { error: 'Too large' }, origin); body = JSON.parse(t || '{}'); } catch (e) { return reply(400, { error: 'Bad request' }, origin); }
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const who = await whoIs(token);
    if (who.bad === 'setup') { console.error('setup: ' + who.msg); return reply(500, { error: who.msg + ' Open ' + (process.env.URL || '') + '/api in the browser to see what to fix.', setup: true }, origin); }
    if (!who.email) return reply(401, { error: 'Please sign in again' }, origin);
    const email = who.email;
    const r = await core.handle(store, email, body, { OWNER_EMAIL: await ownerEmail() });
    return reply(r.status, r.body, origin);
  } catch (e) {
    console.error(e);
    const m = String(e && e.message || '');
    if (/^db (401|403)/.test(m)) return reply(500, { error: 'Supabase refused the server key (SUPABASE_SERVICE_ROLE_KEY in Netlify). Open ' + (process.env.URL || '') + '/api in the browser to see what to fix.', setup: true }, origin);
    if (/^db 404|PGRST205|42P01/.test(m)) return reply(500, { error: 'The database tables are missing: run supabase/schema.sql in Supabase → SQL Editor. Open /api to check.', setup: true }, origin);
    return reply(500, { error: 'Server error. Please try again.' }, origin);
  }
};
export const config = { path: '/api' };
