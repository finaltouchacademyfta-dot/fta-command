/* FTA · installable app + notifications in a real browser (mock build over http://localhost).
   MODE=mock python3 build.py && node tests/e-push.js
   · manifest, icons, background worker, Chrome's own installability check (no errors)
   · "Turn on" → device saved on the server; choices; "Send a test"
   · a notice reaches the student's device (and not a teacher's); tap opens the right screen
   · the background worker shows a pushed message with the FTA icon; a tap focuses the app
   · signing out removes the device
   The browser's push service is replaced by a stand-in (headless Chromium has none). */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8766, URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(s); });
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
async function ready(p) { await p.waitForFunction(() => window.FTA && (FTA.member && document.getElementById('fta-gate') && document.getElementById('fta-gate').hidden) || (document.getElementById('fta-gate') && !document.getElementById('fta-gate').hidden && !document.querySelector('#fta-gate .fg-spin')), null, { timeout: 30000 }); await p.waitForTimeout(500); }
/* switch person; newDevice = a different phone (its own push subscription and permission) */
async function as(p, email, q, newDevice) { await p.evaluate(async () => { if (window.FTA && FTA.sync && FTA.member) await FTA.sync(); }); await p.evaluate(([e, nd]) => { if (e) localStorage.setItem('fta-mock-session', e); else localStorage.removeItem('fta-mock-session'); if (nd) ['__fakesub', '__fakeperm', 'fta-push-ep', 'fta-push-later', 'fta-push-prefs'].forEach(k => localStorage.removeItem(k)); }, [email, newDevice]); await p.goto(URL0 + (q || '')); await ready(p); }
/* stand-in for the browser's push service: permission + a subscription with real-looking keys */
const FAKE_PUSH = () => {
  let perm = localStorage.getItem('__fakeperm') || 'default';
  try { Object.defineProperty(Notification, 'permission', { get: () => perm, configurable: true }); Notification.requestPermission = async () => { perm = window.__denyPush ? 'denied' : 'granted'; localStorage.setItem('__fakeperm', perm); return perm; }; } catch (e) { }
  /* one subscription per browser (like the real thing), kept across reloads */
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0)).buffer;
  const mk = j => ({ endpoint: j.ep, options: { applicationServerKey: unb(j.key) }, toJSON: () => ({ endpoint: j.ep, keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'Q'.repeat(22) } }), unsubscribe: async () => { localStorage.removeItem('__fakesub'); return true; } });
  if (window.PushManager) {
    PushManager.prototype.getSubscription = async function () { const j = JSON.parse(localStorage.getItem('__fakesub') || 'null'); return j ? mk(j) : null; };
    PushManager.prototype.subscribe = async function (o) { const k = o.applicationServerKey; const j = { ep: 'https://fcm.googleapis.com/fcm/send/' + (localStorage.getItem('fta-mock-session') || 'x').split('@')[0] + '-' + Math.random().toString(36).slice(2, 8), key: b64(k.buffer || k) }; localStorage.setItem('__fakesub', JSON.stringify(j)); return mk(j); };
  }
};
const db = p => p.evaluate(() => JSON.parse(localStorage.getItem('fta-mock-db') || '{}'));

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch({ channel: 'chromium' });          /* full Chromium (new headless): can show notifications */
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(FAKE_PUSH);
  const p = await ctx.newPage(); await R.setup(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|404/.test(m.text())) errs.push('console: ' + m.text()); });

  console.log('1. Installable app');
  await p.goto(URL0); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(URL0); await ready(p);
  const head = await p.evaluate(() => ({ man: document.querySelector('link[rel=manifest]').href, apple: document.querySelector('link[rel=apple-touch-icon]').href, title: document.title, cap: document.querySelector('meta[name=apple-mobile-web-app-capable]').content }));
  ok(/manifest\.webmanifest$/.test(head.man) && /apple-touch-icon\.png$/.test(head.apple) && head.cap === 'yes', 'manifest, iPhone icon and app-mode tags in the page');
  ok(head.title === 'Final Touch Academy · FTA' || head.title === 'Owner Portal · Final Touch Academy', 'browser tab / app title: ' + head.title);
  const man = await (await p.request.get(URL0 + 'manifest.webmanifest')).json();
  ok(man.name === 'Final Touch Academy' && man.short_name === 'FTA' && man.display === 'standalone' && man.start_url && man.background_color === '#08090B', 'manifest: name, short name, full-screen, premium colours');
  for (const ic of man.icons.concat(man.screenshots)) { const r = await p.request.get(URL0 + ic.src.slice(1)); ok(r.ok() && r.headers()['content-type'] === 'image/png', 'icon/screenshot ' + ic.src + (ic.purpose ? ' (' + ic.purpose + ')' : '')); }
  const swOk = await p.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise(x => setTimeout(() => x(null), 8000))]); return !!(r && r.active); });
  ok(swOk, 'background worker installed and active');
  const cdp = await ctx.newCDPSession(p);
  const inst = await cdp.send('Page.getInstallabilityErrors').catch(e => ({ err: e.message }));
  const ie = (inst.installabilityErrors || []).filter(e => e.errorId !== 'in-incognito');     /* the test browser is a private window; a normal window has no such error */
  ok(inst.installabilityErrors && ie.length === 0, 'Chrome’s installability check: no errors ' + JSON.stringify(ie));
  const am = await cdp.send('Page.getAppManifest');
  ok(!am.errors.length, 'Chrome parses the manifest without errors ' + JSON.stringify(am.errors));

  console.log('2. Owner turns notifications on');
  await p.fill('#fg-email', 'owner@gmail.com'); await p.click('#fg-go'); await ready(p);
  ok(await p.evaluate(() => !!document.querySelector('#view .fp-ban')), 'invitation bar on the first page');
  await p.screenshot({ path: path.join(__dirname, 'shots', 'e-banner.png') });
  await p.click('.fp-ban .btn.p'); await p.waitForTimeout(800);
  let d = await db(p); let subs = Object.values(d.subs || {});
  ok(subs.length === 1 && subs[0].email === 'owner@gmail.com' && /Chrome on/.test(subs[0].ua), 'device saved on the server for the owner (' + (subs[0] || {}).ua + ')');
  ok(await p.evaluate(() => !document.querySelector('#view .fp-ban')), 'invitation bar goes away');
  await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /On for this device/.test((document.querySelector('.fp-set') || {}).innerText || '')), 'Settings shows "On for this device"');
  await p.click('.fp-set .btn'); await p.waitForTimeout(300);
  const sh = await p.evaluate(() => ({ t: document.getElementById('sheet').innerText, cats: [...document.querySelectorAll('.fp-cat input')].map(i => i.dataset.cat) }));
  ok(/Notifications on this device/.test(sh.t) && /On/.test(sh.t) && sh.cats.join() === 'messages,office,money', 'device sheet: owner choices = messages, approvals, payments (' + sh.cats + ')');
  await p.screenshot({ path: path.join(__dirname, 'shots', 'e-sheet.png') });
  await p.click('.fp-cat:has(input[data-cat=money]) i'); await p.waitForTimeout(400);
  d = await db(p); ok(JSON.stringify(Object.values(d.subs)[0].prefs) === '{"off":["money"]}', 'turning "Payments to verify" off is saved for this device');
  await p.click('.fp-cat:has(input[data-cat=money]) i'); await p.waitForTimeout(400);
  await p.click('text=Send a test'); await p.waitForTimeout(500);
  d = await db(p); ok((d.pushed || []).some(x => x.email === 'owner@gmail.com' && x.payload.t === 'Notifications are on' && x.payload.u === '/?go=dashboard'), '"Send a test" goes to this device');
  await p.evaluate(() => closeSheet());
  await p.click('#nb'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .fp-foot')), 'the bell list ends with "Phone & laptop notifications"');
  await p.evaluate(() => closeSheet());

  console.log('3. A notice reaches the student’s device');
  await p.evaluate(async () => {
    const A = FTA.api;
    for (const m of [{ email: 'ayaan.student@gmail.com', role: 'Student', student_id: 'STU-1001', name: 'Ayaan' }, { email: 'nusrat.teacher@gmail.com', role: 'Mentor', mentor_id: 'MEN-01', name: 'Nusrat' }]) await A({ action: 'member', member: m });
    await A({ action: 'push', changes: [{ c: 'students', id: 'STU-1001', data: { id: 'STU-1001', name: 'Ayaan', status: 'Active', cls: 'Grade 9' }, base: null }, { c: 'mentors', id: 'MEN-01', data: { id: 'MEN-01', name: 'Nusrat Jahan', status: 'Active', gmail: 'nusrat.teacher@gmail.com' }, base: null },
      { c: 'sport', id: 'STU-1001', data: { stu: 'STU-1001', gmail: 'ayaan.student@gmail.com', status: 'Active' }, base: null }] });
  });
  await as(p, 'ayaan.student@gmail.com', '', true);
  ok(await p.evaluate(() => FTA.member.role === 'Student' && !!document.querySelector('#view .fp-ban')), 'student (own phone) sees the invitation');
  await p.evaluate(() => FTA.push.enable()); await p.waitForTimeout(600);
  await p.evaluate(() => FTA.push.open()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => [...document.querySelectorAll('.fp-cat input')].map(i => i.dataset.cat).join()) === 'notices,messages,homework,classes,exams', 'student choices: notices, messages, homework, classes, exams');
  await p.evaluate(() => closeSheet());
  await as(p, 'nusrat.teacher@gmail.com', '', true); await p.evaluate(() => FTA.push.enable()); await p.waitForTimeout(600);
  d = await db(p); ok(Object.values(d.subs).map(s => s.email).sort().join() === 'ayaan.student@gmail.com,nusrat.teacher@gmail.com,owner@gmail.com', 'three people, three devices on the server');
  await as(p, 'owner@gmail.com', '', true);
  ok(await p.evaluate(() => FTA.push.state()) === 'off', 'on a new device nobody is signed up silently');
  await p.evaluate(async () => { await FTA.api({ action: 'push', changes: [{ c: 'notices', id: 'NT-1', data: { id: 'NT-1', no: 'N-001', date: '2026-10-30', title: 'Eid holiday', body: 'Closed 6–9 June', circles: ['CI-STU'], status: 'Published', type: 'Holiday', seen: {}, acks: {} }, base: null }] }); });
  d = await db(p); const to = (d.pushed || []).filter(x => x.payload.u && /NT-1/.test(x.payload.u));
  ok(to.length === 1 && to[0].email === 'ayaan.student@gmail.com' && to[0].payload.t === 'New notice · Student Circle', 'the notice went to the student only (' + to.map(x => x.email) + ')');

  console.log('4. Tap → the right screen');
  await as(p, 'ayaan.student@gmail.com', '?go=sp-notices&nt=NT-1', true); await p.waitForTimeout(600);
  const at = await p.evaluate(() => ({ page: ST.page, sheet: !document.getElementById('ov').hidden && document.getElementById('sheet').innerText, url: location.search }));
  ok(at.page === 'sp-notices' && /Eid holiday/.test(at.sheet || ''), 'opens Notices with the notice itself (' + at.page + ')');
  ok(at.url === '', 'the link is removed from the address bar');
  await p.evaluate(() => closeSheet());
  await as(p, 'ayaan.student@gmail.com', '?go=payments'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => ST.page !== 'payments'), 'a link to a page the student may not open is ignored (permission still checked)');
  await as(p, 'ayaan.student@gmail.com', '?go=x%3Balert(1)'); await p.waitForTimeout(300);
  ok(errs.every(e => !/alert/.test(e)), 'a crafted link runs nothing');

  console.log('5. The background worker shows it with the FTA icon');
  await ctx.grantPermissions(['notifications'], { origin: URL0.slice(0, -1) });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  /* the push event exactly as the browser delivers it (headless Chromium has no push service to send through) */
  const delivered = await sw.evaluate(async () => { const P = []; self.dispatchEvent(Object.assign(new Event('push'), { data: { json: () => ({ t: 'New homework · English', b: 'Summary p.42 · due 2 Nov', u: '/?go=sp-cal', g: 'hw-1', c: 'homework', ts: Date.now() }), text: () => '' }, waitUntil: x => P.push(x) })); await Promise.all(P); return true; }).catch(e => (console.log('   ', e.message), false));
  await p.waitForTimeout(800);
  const shown = await sw.evaluate(async () => (await self.registration.getNotifications()).map(n => ({ t: n.title, b: n.body, icon: n.icon, badge: n.badge, tag: n.tag, u: n.data && n.data.u })));
  ok(delivered && shown.length === 1 && shown[0].t === 'New homework · English' && /notify-192\.png$/.test(shown[0].icon) && /badge-96\.png$/.test(shown[0].badge) && shown[0].u === '/?go=sp-cal', 'shown in the notification bar with the FTA icon ' + JSON.stringify(shown[0] || {}));
  const opened = p.waitForFunction(() => ST.page === 'sp-cal', null, { timeout: 5000 }).then(() => true).catch(() => false);
  await sw.evaluate(async () => { const [n] = await self.registration.getNotifications(); const P = []; self.dispatchEvent(Object.assign(new Event('notificationclick'), { notification: n, waitUntil: x => P.push(x) })); await Promise.all(P); });
  ok(await opened, 'tap → the open app jumps to the calendar');
  await sw.evaluate(async () => { const P = []; self.dispatchEvent(Object.assign(new Event('push'), { data: { json: () => ({ t: 'x', u: 'https://evil.example/', g: 'evil' }), text: () => '' }, waitUntil: x => P.push(x) })); await Promise.all(P); });
  await p.waitForTimeout(300);
  ok(await sw.evaluate(async () => (await self.registration.getNotifications()).every(n => n.data.u.charAt(0) === '/')), 'a message can only open FTA itself, never another site');

  console.log('6. Sign out removes this device');
  await p.evaluate(() => FTA.push.enable()); await p.waitForTimeout(600);
  d = await db(p); const before = Object.values(d.subs).filter(s => s.email === 'ayaan.student@gmail.com').length;
  await p.evaluate(() => SCH.signOut()); await ready(p);
  ok(before === 2, 'student has two devices before (' + before + ')');
  d = await db(p); ok(Object.values(d.subs).filter(s => s.email === 'ayaan.student@gmail.com').length === 1, 'signing out removes THIS device only; the student’s phone keeps working');
  ok(await p.evaluate(() => !localStorage.getItem('fta-push-ep') && !localStorage.getItem('__fakesub')), 'the browser’s subscription is cancelled too');

  console.log('7. Phone size');
  const ph = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await ph.addInitScript(FAKE_PUSH);
  const q = await ph.newPage(); await R.setup(q); q.on('pageerror', e => errs.push(e.message));
  await q.goto(URL0); await q.evaluate(() => localStorage.setItem('fta-mock-session', 'owner@gmail.com')); await q.goto(URL0); await ready(q);
  await q.evaluate(() => { localStorage.setItem('fta-mock-db', localStorage.getItem('fta-mock-db')); });
  const ban = await q.evaluate(() => { const e = document.querySelector('.fp-ban'); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, over: document.documentElement.scrollWidth > innerWidth, btns: [...e.querySelectorAll('.btn')].every(x => x.getBoundingClientRect().right <= innerWidth) }; });
  ok(ban && !ban.over && ban.btns, 'phone: invitation fits, no sideways scroll ' + JSON.stringify(ban));
  await q.screenshot({ path: path.join(__dirname, 'shots', 'e-phone.png') });
  await q.evaluate(() => FTA.push.open()); await q.waitForTimeout(300);
  ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone: device sheet fits');
  await q.screenshot({ path: path.join(__dirname, 'shots', 'e-phone-sheet.png') });

  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 5)));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
