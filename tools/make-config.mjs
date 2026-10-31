#!/usr/bin/env node
// =====================================================================
// FTA Command Centre · build step for Netlify (no npm packages needed).
//   node tools/make-config.mjs
// Reads the Netlify environment variables and writes
//   site/config.js   window.FTA_CONFIG for the browser (public values only)
//   site/_headers    the Content-Security-Policy, locked to YOUR Supabase project
// Needed environment variables (Netlify → Site configuration → Environment variables):
//   SUPABASE_URL        https://xxxx.supabase.co           (public)
//   SUPABASE_ANON_KEY   the "anon public" key               (public, safe in the browser)
//   OWNER_EMAIL         the Owner's Gmail                   (public)
//   SUPABASE_SERVICE_ROLE_KEY  secret · used ONLY by the Netlify functions, never written here
//                              (the new "Secret key" sb_secret_… or the older service_role key)
// Local check:  SUPABASE_URL=https://abc.supabase.co SUPABASE_ANON_KEY=x OWNER_EMAIL=me@gmail.com node tools/make-config.mjs
// =====================================================================
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, process.env.FTA_OUT || 'site');
const env = k => (process.env[k] || '').trim();
const fail = m => { console.error('\n✖ make-config: ' + m + '\n'); process.exit(1); };

const rawUrl = env('SUPABASE_URL');
let url = rawUrl.replace(/\/+$/, '');
try { const u0 = new URL(rawUrl); if (u0.protocol === 'https:' && u0.origin !== url) { console.warn('⚠ make-config: SUPABASE_URL had extra text after the address; using ' + u0.origin); url = u0.origin; } } catch (e) { }
const anon = env('SUPABASE_ANON_KEY');
const owner = env('OWNER_EMAIL').toLowerCase();
const api = env('FTA_API_URL') || '/api';

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'OWNER_EMAIL'].filter(k => !env(k));
if (missing.length) fail('missing environment variable(s): ' + missing.join(', ') + '\n  Netlify → Site configuration → Environment variables → add them, then "Trigger deploy".');
let origin;
try { const u = new URL(url); if (u.protocol !== 'https:') throw 0; origin = u.origin; } catch (e) { fail('SUPABASE_URL must look like https://abcd1234.supabase.co (got "' + url + '")'); }
if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(owner)) fail('OWNER_EMAIL is not a valid e-mail address');
if (env('SUPABASE_SERVICE_ROLE_KEY') && anon === env('SUPABASE_SERVICE_ROLE_KEY')) fail('SUPABASE_ANON_KEY is the service_role key. Use the "anon public" key; the service_role key must stay secret.');
try { // a Supabase key is a JWT: refuse a service_role key in the browser config
  const p = JSON.parse(Buffer.from(anon.split('.')[1] || '', 'base64url').toString('utf8') || '{}');
  if (p.role === 'service_role') fail('SUPABASE_ANON_KEY is a service_role key. Use the "anon public" key.');
} catch (e) { /* new-style publishable keys (sb_publishable_…) are not JWTs; that is fine */ }
if (/^sb_secret_/.test(anon)) fail('SUPABASE_ANON_KEY is a secret key. Use the publishable / anon key.');
// the server key: catch the usual copy mistakes at deploy time, with the fix in plain words
{
  const sk = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!sk) fail('SUPABASE_SERVICE_ROLE_KEY is missing. Supabase → Project Settings → API Keys → Secret key (sb_secret_…) → add it in Netlify (mark it secret), then "Trigger deploy".');
  if (/^sb_publishable_/.test(sk)) fail('SUPABASE_SERVICE_ROLE_KEY is the PUBLISHABLE key. Put the SECRET key (sb_secret_…) there instead.');
  if (!/^sb_secret_/.test(sk)) {
    let role = '', ref = '';
    try { const p = JSON.parse(Buffer.from(sk.split('.')[1] || '', 'base64url').toString('utf8')); role = p.role || ''; ref = p.ref || ''; } catch (e) { }
    if (role === 'anon') fail('SUPABASE_SERVICE_ROLE_KEY is the ANON key. Put the service_role key or the new Secret key (sb_secret_…) there instead.');
    if (role && role !== 'service_role') fail('SUPABASE_SERVICE_ROLE_KEY is not a service key (role "' + role + '").');
    if (!role) fail('SUPABASE_SERVICE_ROLE_KEY does not look like a Supabase key. Copy the Secret key (sb_secret_…) again, without spaces.');
    const pr = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(url);
    if (pr && ref && pr[1] !== ref) fail('SUPABASE_SERVICE_ROLE_KEY belongs to another Supabase project (' + ref + '), but SUPABASE_URL is ' + pr[1] + '. Take both from the same project.');
  }
}
if (!existsSync(join(OUT, 'index.html'))) fail(OUT + '/index.html not found. Commit the built site/ folder (python3 build.py) before deploying.');

const cfg = { supabaseUrl: url, supabaseAnonKey: anon, ownerEmail: owner, apiUrl: api };
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'config.js'), '/* generated at deploy by tools/make-config.mjs — do not commit */\nwindow.FTA_CONFIG = Object.freeze(' + JSON.stringify(cfg, null, 2) + ');\n');

// Content-Security-Policy. Notes:
//  · script-src needs 'unsafe-inline' because the app is one HTML file with inline
//    handlers; there is NO 'unsafe-eval' (the build removed every new Function / eval).
//  · connect-src is locked to this one Supabase project (auth) + this site (API function).
const ws = origin.replace(/^https:/, 'wss:');
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  `connect-src 'self' ${origin} ${ws}`,
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests"
].join('; ');
writeFileSync(join(OUT, '_headers'), '# generated at deploy by tools/make-config.mjs\n/*\n  Content-Security-Policy: ' + csp + '\n');

console.log('✔ make-config: wrote ' + join(OUT, 'config.js') + ' and _headers');
console.log('  Supabase: ' + origin + '   Owner: ' + owner + '   API: ' + api);
