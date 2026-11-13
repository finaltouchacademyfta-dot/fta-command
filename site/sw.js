/* =====================================================================
   FTA · background worker (service worker)
   · shows notifications from Final Touch Academy, even when the app is closed
   · a tap opens the app on the right screen
   · keeps the app shell, so the installed app opens fast (and opens offline)
   It never stores academy data: /api and Supabase are never cached.
   ===================================================================== */
'use strict';
const V = '7b7f639534a9';
const SHELL = 'fta-shell-' + V, ASSETS = 'fta-assets-v1';
const PRE = ['/', '/manifest.webmanifest', '/config.js', '/vendor/supabase.js', '/vendor/fta-policy.js', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/notify-192.png', '/icons/badge-96.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    const old = keys.filter(k => k.startsWith('fta-shell-') && k !== SHELL);
    return Promise.all(old.map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => old.length
      /* a new version was installed while the old page is open: the page offers a one-tap reload */
      ? self.clients.matchAll({ type: 'window' }).then(list => list.forEach(c => c.postMessage({ type: 'fta-updated', v: V })))
      : null);
  }));
});

/* ---------- loading ---------- */
const sameOrigin = u => u.origin === self.location.origin;
async function networkFirst(req, key, ms) {
  const c = await caches.open(SHELL);
  try {
    const r = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms || 5000))]);
    if (r && r.ok && r.type === 'basic') c.put(key || req, r.clone());
    return r;
  } catch (e) { return (await c.match(key || req)) || (await caches.match('/')) || Response.error(); }
}
/* the app page: shown at once from this device, refreshed in the background (a new deploy also brings a new worker, which tells the page) */
async function shellFirst(e, req) {
  const c = await caches.open(SHELL), hit = await c.match('/');
  const net = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') c.put('/', r.clone()); return r; }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await Promise.race([net, new Promise(ok => setTimeout(() => ok(null), 8000))])) || (await net) || Response.error();
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(ASSETS), hit = await c.match(req);
  const net = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (!sameOrigin(u)) return;                      /* Supabase, fonts: straight to the network */
  if (u.pathname === '/api' || u.pathname.startsWith('/.netlify/')) return;    /* academy data is never cached */
  if (req.mode === 'navigate') { e.respondWith(u.pathname === '/' || u.pathname === '/index.html' ? shellFirst(e, req) : networkFirst(req, '/', 6000)); return; }
  if (u.pathname === '/config.js') { e.respondWith(networkFirst(req)); return; }
  if (/^\/(vendor|icons|brand)\//.test(u.pathname) || u.pathname === '/manifest.webmanifest') { e.respondWith(staleWhileRevalidate(req)); return; }
});

/* ---------- notifications ---------- */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { t: 'Final Touch Academy', b: e.data ? e.data.text() : '' }; }
  const title = String(d.t || 'Final Touch Academy').slice(0, 80);
  const opts = {
    body: String(d.b || 'You have a new update').slice(0, 240),
    icon: '/icons/notify-192.png', badge: '/icons/badge-96.png',
    tag: String(d.g || 'fta').slice(0, 64), renotify: true,
    timestamp: +d.ts || Date.now(), lang: 'en', dir: 'auto',
    data: { u: typeof d.u === 'string' && d.u.charAt(0) === '/' && d.u.charAt(1) !== '/' ? d.u : '/' },
    vibrate: d.r ? [120, 60, 120, 60, 200] : [100, 50, 100]
  };
  e.waitUntil(Promise.all([
    self.registration.showNotification(title, opts),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ type: 'fta-push', c: d.c }))),
    self.navigator && self.navigator.setAppBadge ? self.registration.getNotifications().then(n => self.navigator.setAppBadge(n.length).catch(() => { })).catch(() => { }) : null
  ]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.u) || '/', self.location.origin);
  if (!sameOrigin(url)) return;                                               /* only ever opens this app */
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = list.find(c => sameOrigin(new URL(c.url)));
    if (win) { await win.focus().catch(() => { }); win.postMessage({ type: 'fta-open', u: url.pathname + url.search }); }
    else await self.clients.openWindow(url.href);
    if (self.navigator && self.navigator.setAppBadge) { const n = await self.registration.getNotifications(); (n.length ? self.navigator.setAppBadge(n.length) : self.navigator.clearAppBadge()).catch(() => { }); }
  })());
});
/* the browser renewed this device's address: tell the open app so it re-registers with the server */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try { const o = e.oldSubscription && e.oldSubscription.options; if (o) await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: o.applicationServerKey }); } catch (x) { }
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); list.forEach(c => c.postMessage({ type: 'fta-resub' }));
  })());
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'fta-skip-waiting') self.skipWaiting(); });
