/* FTA · server set-up mistakes are named, not hidden behind "Please sign in again".
   Runs the real Netlify function against a fake Supabase that behaves like the real one for each key type.
   node tests/d-setup.mjs */
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const REF = 'ejvalajtbqfdberfwfux';
const SECRET = 'sb_secret_abcDEF1234567890', PUBL = 'sb_publishable_xyz';
const jwt = o => 'e30.' + Buffer.from(JSON.stringify(o)).toString('base64url') + '.sig';
const LEGACY_SR = jwt({ role: 'service_role', ref: REF }), LEGACY_ANON = jwt({ role: 'anon', ref: REF }), OTHER_SR = jwt({ role: 'service_role', ref: 'otherprojectref00000' });
let MODE = {}, SEEN = [];
/* a Supabase that accepts: the secret key ONLY in `apikey` (Bearer with a non-JWT → Invalid JWT), the service_role JWT, and rejects disabled legacy keys */
globalThis.fetch = async (url, o = {}) => {
  const u = new URL(url), H = o.headers || {}; SEEN.push({ path: u.pathname, H });
  const res = (s, b) => new Response(typeof b === 'string' ? b : JSON.stringify(b), { status: s });
  if (u.hostname !== REF + '.supabase.co') throw new TypeError('fetch failed');
  const k = H.apikey;
  const legacy = k === LEGACY_SR || k === LEGACY_ANON || k === OTHER_SR;
  if (!k) return res(401, { message: 'No API key found in request' });
  if (legacy && MODE.legacyOff) return res(401, { message: 'Legacy API keys are disabled', hint: 'Your legacy API keys (anon, service_role) were disabled' });
  if (![SECRET, PUBL, LEGACY_SR, LEGACY_ANON].includes(k)) return res(401, { message: 'Invalid API key' });
  if (u.pathname === '/auth/v1/user') return (H.Authorization || '') === 'Bearer user-token' ? res(200, { email: 'Owner@Gmail.com', email_confirmed_at: '2026-01-01' }) : res(401, { code: 401, msg: 'invalid JWT' });
  if (u.pathname === '/auth/v1/settings') return res(200, { external: { google: !MODE.googleOff, email: true } });
  if (u.pathname.startsWith('/rest/v1/')) {
    if (H.Authorization && /^Bearer sb_/.test(H.Authorization)) return res(401, { message: 'Invalid JWT' });       /* new keys must not go on Bearer */
    if (k === PUBL || k === LEGACY_ANON) return res(401, { code: '42501', message: 'permission denied for table members' });
    if (MODE.noTables) return res(404, { code: 'PGRST205', message: "Could not find the table 'public.members' in the schema cache" });
    if (/push_subs/.test(u.pathname) && MODE.noPush) return res(404, { code: 'PGRST205', message: 'no push_subs' });
    if (/members/.test(u.pathname)) return res(200, MODE.owner ? [{ email: 'owner@gmail.com' }] : []);
    return res(200, []);
  }
  return res(404, {});
};
async function run(env, mode) {
  MODE = mode || {}; SEEN = [];
  Object.assign(process.env, { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', OWNER_EMAIL: '', URL: 'https://finaltouchacademy.netlify.app' }, env);
  const m = await import('../netlify/functions/api.mjs?' + Math.random());
  const page = await (await m.default(new Request('https://x/api', { method: 'GET' }))).text();
  const me = await m.default(new Request('https://x/api', { method: 'POST', headers: { Authorization: 'Bearer user-token' }, body: '{"action":"me"}' }));
  return { page, me: { s: me.status, b: await me.json() } };
}
const U = 'https://' + REF + '.supabase.co';
console.log('the right set-up');
let r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SECRET, OWNER_EMAIL: 'owner@gmail.com' }, { owner: true });
ok(/Everything looks right/.test(r.page) && !r.page.includes(SECRET) && !r.page.includes('owner@gmail.com'), 'new Secret key: setup check all ✔, no key or Gmail shown');
ok(SEEN.filter(x => x.path.startsWith('/rest/')).every(x => x.H.apikey === SECRET && !x.H.Authorization), 'the Secret key goes only in `apikey` (Supabase rule), never as Bearer');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: LEGACY_SR, OWNER_EMAIL: 'owner@gmail.com' }, { owner: true });
ok(/Everything looks right/.test(r.page), 'old service_role key still works');
r = await run({ SUPABASE_URL: U + '/rest/v1/ ', SUPABASE_SERVICE_ROLE_KEY: ' ' + SECRET + ' ', OWNER_EMAIL: 'owner@gmail.com' }, { owner: true });
ok(/extra text/.test(r.page) && !/✖/.test(r.page), 'URL pasted with /rest/v1 and spaces around the key: fixed automatically, with a note');

console.log('the usual mistakes are named');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: PUBL, OWNER_EMAIL: 'owner@gmail.com' });
ok(/PUBLISHABLE key/.test(r.page) && /✖/.test(r.page), 'publishable key in the server variable → named');
ok(r.me.s === 500 && r.me.b.setup && /\/api/.test(r.me.b.error), 'sign-in shows a set-up message (not "sign in again"): ' + r.me.b.error);
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: LEGACY_ANON, OWNER_EMAIL: 'owner@gmail.com' });
ok(/ANON key/.test(r.page) && r.me.s === 500 && r.me.b.setup, 'anon key in the server variable → named, sign-in explains');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: LEGACY_SR, OWNER_EMAIL: 'owner@gmail.com' }, { legacyOff: true });
ok(/legacy keys are disabled/i.test(r.page) && /sb_secret_/.test(r.page), 'legacy keys switched off in Supabase → "use the new Secret key"');
ok(r.me.s === 500 && r.me.b.setup, 'and sign-in says it is a set-up problem');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: OTHER_SR, OWNER_EMAIL: 'owner@gmail.com' });
ok(/ANOTHER Supabase project/.test(r.page), 'key from another project → named');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_typo', OWNER_EMAIL: 'owner@gmail.com' });
ok(/refused the server key/.test(r.page) && r.me.s === 500, 'mistyped key → "Supabase refused the server key"');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SECRET, OWNER_EMAIL: 'owner@gmail.com' }, { noTables: true });
ok(/Tables are missing/.test(r.page), 'schema not run → "run supabase/schema.sql"');
ok(r.me.s === 500 && /schema\.sql/.test(r.me.b.error), 'and sign-in says so');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SECRET, OWNER_EMAIL: 'owner@gmail.com' }, { noPush: true, owner: true });
ok(/Notification tables missing/.test(r.page), 'old schema (no notification tables) → "run the newest schema.sql"');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SECRET, OWNER_EMAIL: 'owner@gmail.com' }, { googleOff: true, owner: true });
ok(/Google sign-in is OFF/.test(r.page), 'Google provider off → named');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SECRET });
ok(/OWNER_EMAIL is missing/.test(r.page), 'no OWNER_EMAIL → named');
r = await run({ SUPABASE_URL: 'https://wrongref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SECRET, OWNER_EMAIL: 'owner@gmail.com' });
ok(/Cannot reach/.test(r.page) && r.me.s === 500 && /SUPABASE_URL/.test(r.me.b.error), 'wrong address → named');
r = await run({ SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SECRET, OWNER_EMAIL: 'owner@gmail.com' }, { owner: true });
const bad = await (await import('../netlify/functions/api.mjs?' + Math.random())).default(new Request('https://x/api', { method: 'POST', headers: { Authorization: 'Bearer expired' }, body: '{"action":"me"}' }));
ok(bad.status === 401, 'a really expired sign-in still says "sign in again" (401)');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
