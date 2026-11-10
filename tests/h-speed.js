/* Worker H · fast opening (device snapshot) + update banner, against the mock build.
   Run:  cd /home/claude/prod && MODE=mock python3 build.py && node tests/h-speed.js
   Checks: splash paints first · second open comes from the device copy with no loading screen ·
   changes made elsewhere (new + deleted records) arrive a moment later · a role change is noticed ·
   sign-out wipes the device copy · the "new version" banner works · fonts never block. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8771, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = http.createServer((q, s) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(s);
});
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const OWNER = 'owner@gmail.com';
const ready = p => p.waitForFunction(() => document.documentElement.classList.contains('fta-on') && window.FTA && FTA.member, null, { timeout: 30000 });
const gateWatch = () => {   /* records every time the full-screen loading / sign-in card is shown */
  window.__gateShown = []; window.__t0 = performance.now();
  new MutationObserver(() => { const g = document.getElementById('fta-gate'); if (g && !g.hidden) { const t = g.innerText.slice(0, 40); if (window.__gateShown[window.__gateShown.length - 1] !== t) window.__gateShown.push(t); } if (document.documentElement.classList.contains('fta-on') && !window.__tOn) window.__tOn = performance.now() - window.__t0; })
    .observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
};
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());

  console.log('1. Page shell: splash first, fonts and picture library never block');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const iBoot = html.indexOf('id="fta-boot"'), iBody = html.indexOf('<body');
  ok(iBoot > iBody && iBoot - iBody < 200, 'splash is the first thing inside <body>');
  ok(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+media="print" onload="this\.media='all'">/.test(html), 'Google Fonts load without blocking the first paint');
  ok(/<script src="vendor\/html2canvas\.min\.js" defer><\/script>/.test(html), 'picture library is deferred');
  ok(/<link id="fd-fonts" rel="stylesheet" href="[^"]+">/.test(html), 'print window keeps its own (waited-for) font link');

  console.log('2. First visit: sign in, add data, the device copy is written');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('fta-snap-on', '1'); }); await p.goto(URL0);
  await p.waitForSelector('#fg-email', { timeout: 30000 });
  ok(await p.evaluate(() => !document.getElementById('fta-boot')), 'splash is gone once the sign-in screen is up');
  await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  ok(await p.evaluate(() => FTA.member.role === 'Owner' && !FTA.openedFromCache), 'owner signed in (normal first open, not from the device copy)');
  await p.evaluate(() => {
    STUDENTS.push({ id: 'STU-1001', name: 'Ayaan Rahman', guardian: 'Rahman', phone: '01711000001', cls: 'Grade 9', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [] });
    STUDENTS.push({ id: 'STU-1002', name: 'Rafi Hasan', guardian: 'Hasan', phone: '01711000002', cls: 'Grade 10', board: 'Cambridge', beh: 'good', joined: '2026-10-01', status: 'Active', notes: [] });
    render();
  });
  await p.evaluate(() => FTA.sync()); await p.evaluate(() => FTA.cacheNow && FTA.cacheNow());
  const snap = await p.evaluate(() => new Promise(res => { const q = indexedDB.open('fta-cache'); q.onsuccess = () => { try { const t = q.result.transaction('snap').objectStore('snap').getAll(); t.onsuccess = () => res(t.result); t.onerror = () => res(null); } catch (e) { res(null); } }; q.onerror = () => res(null); }));
  ok(Array.isArray(snap) && snap.length === 1 && snap[0].email === OWNER, 'one device copy, for this Gmail only');
  ok(snap && snap[0] && JSON.stringify(snap[0]).includes('STU-1002'), 'device copy holds the saved records');

  console.log('3. Second open: straight into the app from the device copy');
  await p.addInitScript(gateWatch);
  await p.reload(); await ready(p);
  const o2 = await p.evaluate(() => ({ cache: FTA.openedFromCache, stu: STUDENTS.map(s => s.id).join(','), gate: window.__gateShown, t: window.__tOn }));
  ok(o2.cache === true, 'opened from the device copy');
  ok(o2.stu === 'STU-1001,STU-1002', 'data is there at once (' + o2.stu + ')');
  ok(o2.gate.length === 0, 'no loading / sign-in screen was shown (' + JSON.stringify(o2.gate) + ')');
  console.log('     app ready after ' + Math.round(o2.t || 0) + ' ms');

  console.log('4. Changes made on another device arrive a moment later');
  const p2 = await ctx.newPage(); await R.setup(p2); p2.on('dialog', d => d.accept());
  await p2.goto(URL0); await ready(p2);
  await p2.evaluate(() => {
    STUDENTS.push({ id: 'STU-1003', name: 'Nabila Karim', guardian: 'Karim', phone: '01711000003', cls: 'Grade 8', board: 'Cambridge', beh: 'good', joined: '2026-10-02', status: 'Active', notes: [] });
    const i = STUDENTS.findIndex(s => s.id === 'STU-1002'); if (i >= 0) STUDENTS.splice(i, 1); render();
  });
  await p2.evaluate(() => FTA.sync()); await p2.close();
  await p.reload(); await ready(p);
  const first = await p.evaluate(() => ({ cache: FTA.openedFromCache, stu: STUDENTS.map(s => s.id).join(',') }));
  ok(first.cache === true, 'opens instantly from the device copy (then checks the server)');
  await p.waitForFunction(() => STUDENTS.some(s => s.id === 'STU-1003') && !STUDENTS.some(s => s.id === 'STU-1002'), null, { timeout: 15000 }).catch(() => { });
  const later = await p.evaluate(() => STUDENTS.map(s => s.id).join(','));
  ok(later === 'STU-1001,STU-1003', 'new student added and deleted student removed after the background check (' + later + ')');
  await p.evaluate(() => { ST.page = 'students'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Nabila Karim/.test(document.getElementById('view').innerText) && !/Rafi Hasan/.test(document.getElementById('view').innerText)), 'Students page shows the fresh list');

  console.log('5. A local change made while the background check runs is never overwritten');
  await p.evaluate(() => FTA.cacheNow && FTA.cacheNow());
  await p.reload(); await ready(p);
  await p.evaluate(() => { const s = STUDENTS.find(x => x.id === 'STU-1001'); if (s) s.phone = '01799999999'; });
  await p.waitForTimeout(2500); await p.evaluate(() => FTA.sync());
  const ph = await p.evaluate(() => ({ local: (STUDENTS.find(x => x.id === 'STU-1001') || {}).phone, server: (Object.values(FTA.mock.db().records).find(r => r.collection === 'students' && r.id === 'STU-1001') || { data: {} }).data.phone }));
  ok(ph.local === '01799999999' && ph.server === '01799999999', 'typed change kept and saved (' + ph.local + ' / ' + ph.server + ')');

  console.log('6. Role changed by the owner elsewhere: noticed on the next open');
  const ADM = 'admin.fta@gmail.com';
  const setMember = (e, patch) => p.evaluate(([e, patch]) => { const d = JSON.parse(localStorage.getItem('fta-mock-db')); d.members[e] = Object.assign(d.members[e] || { email: e, created_at: new Date().toISOString() }, patch); localStorage.setItem('fta-mock-db', JSON.stringify(d)); }, [e, patch]);
  await setMember(ADM, { email: ADM, role: 'Admin', active: true, name: 'Office Admin' });
  await p.evaluate(e => localStorage.setItem('fta-mock-session', e), ADM);
  await p.reload(); await ready(p);
  ok(await p.evaluate(() => FTA.member.role === 'Admin'), 'second Gmail (Admin) opens');
  await p.evaluate(() => FTA.cacheNow && FTA.cacheNow()); await p.waitForTimeout(300);
  await setMember(ADM, { role: 'Finance Manager' });
  await p.reload();
  await p.waitForFunction(() => window.FTA && FTA.member && FTA.member.role === 'Finance Manager' && document.documentElement.classList.contains('fta-on'), null, { timeout: 20000 }).catch(() => { });
  ok(await p.evaluate(() => FTA.member && FTA.member.role === 'Finance Manager' && ST.role === 'Finance Manager'), 'the app re-opened with the new role (Finance Manager)');

  console.log('7. Removed Gmail: the device copy cannot be used to open the app');
  await p.evaluate(() => FTA.cacheNow && FTA.cacheNow()); await p.waitForTimeout(300);
  await setMember(ADM, { active: false });
  await p.reload(); await p.waitForTimeout(3000);
  const blk = await p.evaluate(() => { const g = document.getElementById('fta-gate'); return { gate: g && !g.hidden ? g.innerText : '', data: (window.STUDENTS || []).length + (window.PAYMENTS || []).length, member: !!(window.FTA && FTA.member) }; });
  ok(/can.t open/i.test(blk.gate) && blk.data === 0 && !blk.member, 'blocked screen shown, no academy data in the page (' + blk.gate.replace(/\s+/g, ' ').slice(0, 60) + ')');
  const left = await p.evaluate(e => new Promise(res => { const q = indexedDB.open('fta-cache'); q.onsuccess = () => { try { const t = q.result.transaction('snap').objectStore('snap').get(e); t.onsuccess = () => res(t.result ? 1 : 0); } catch (x) { res(0); } }; q.onerror = () => res(0); }), ADM);
  ok(left === 0, 'device copy for that Gmail wiped');
  await p.evaluate(e => localStorage.setItem('fta-mock-session', e), OWNER);
  await p.reload(); await ready(p);

  console.log('8. Sign out wipes the device copy');
  await p.evaluate(() => FTA.cacheNow && FTA.cacheNow());
  await p.evaluate(async () => { const f = window.FTA && (FTA.signOut || FTA.signOutNow); if (f) await f(); }).catch(() => { });   /* sign-out reloads the page */
  await p.waitForTimeout(1500); await p.waitForLoadState('load').catch(() => { });
  const left2 = await p.evaluate(() => new Promise(res => { const q = indexedDB.open('fta-cache'); q.onsuccess = () => { try { const t = q.result.transaction('snap').objectStore('snap').getAll(); t.onsuccess = () => res(t.result.length); } catch (e) { res(0); } }; q.onerror = () => res(0); }));
  ok(left2 === 0, 'nothing left on the device after sign-out');

  console.log('9. "New version ready" banner');
  await p.goto(URL0); await p.waitForSelector('#fg-email', { timeout: 30000 }); await p.fill('#fg-email', OWNER); await p.click('#fg-go'); await ready(p);
  await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'fta-updated', v: 'x' } })));
  await p.waitForTimeout(200);
  const ban = await p.evaluate(() => { const b = document.getElementById('fta-upd'); return b ? b.innerText : ''; });
  ok(/new version/i.test(ban) && /Reload/.test(ban), 'banner shows with a Reload button');
  await p.click('#fta-upd button[aria-label="Later"]');
  ok(await p.evaluate(() => !document.getElementById('fta-upd')), '"×" closes it without reloading');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''));
  console.log(`\n${pass}/${pass + fail} passed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
