/* =====================================================================
   FTA · notifications on this device + the installable app
   · registers the background worker (sw.js) so the app can be installed
     from Chrome / Edge / Safari with the FTA logo and opens like an app
   · "Turn on notifications": asks the browser, signs the device up with
     the server (only the server decides what each person receives)
   · per-device choices (notices, homework, replies …), "Send a test"
   · a tap on a notification opens the right screen
   · signing out removes this device, so a shared phone stops getting them
   ===================================================================== */
(function () {
  'use strict';
  if (window.FTA_MODE === 'demo') return;
  const FTA = window.FTA = window.FTA || {};
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const ls = { get: k => G(() => localStorage.getItem(k)), set: (k, v) => G(() => v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v)) };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = t => G(() => toast(typeof tr === 'function' ? tr(t) : t));
  const ua = navigator.userAgent || '';
  const IOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const STANDALONE = () => G(() => matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const SECURE = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const HAS_SW = 'serviceWorker' in navigator && SECURE;
  const HAS_PUSH = HAS_SW && 'PushManager' in window && 'Notification' in window;
  const BELL = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/></svg>';
  const APP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 7v7m-3-3 3 3 3-3"/></svg>';
  const CAT = {
    notices: ['Notices & circles', 'New notices from the academy'], messages: ['Messages & replies', 'Replies to your messages and requests'],
    homework: ['Homework', 'New or changed homework, due tomorrow'], classes: ['Classes & attendance', 'Class notes, routine, events, absent / late'],
    exams: ['Exams & results', 'Online exams, marks, progress reports'], office: ['Approvals', 'New students, leave, marks and notices to check'],
    money: ['Payments to verify', 'New payments waiting for verification']
  };
  const catsFor = r => r === 'Student' ? ['notices', 'messages', 'homework', 'classes', 'exams'] : r === 'Mentor' ? ['notices', 'messages', 'homework', 'classes', 'exams', 'office'] : ['Owner', 'Admin', 'Finance Manager'].indexOf(r) > -1 ? ['messages', 'office', 'money'] : ['messages', 'office'];

  /* Bangla for the new words (the app's own translator does the rest; Mixed keeps English) */
  G(() => {
    const B = {
      'Notifications on this device': 'এই ডিভাইসে নোটিফিকেশন', 'Turn on notifications': 'নোটিফিকেশন চালু করুন', 'Turn off': 'বন্ধ করুন', 'Send a test': 'পরীক্ষা পাঠান', 'Not now': 'এখন না',
      'On': 'চালু', 'Off': 'বন্ধ', 'Blocked': 'আটকানো', 'Not available': 'নেই', 'What to send here': 'এখানে কী কী আসবে', 'Install the FTA app': 'FTA অ্যাপ ইনস্টল করুন', 'Install app': 'অ্যাপ ইনস্টল',
      'Get FTA notifications on this device': 'এই ডিভাইসে FTA-র নোটিফিকেশন পান', 'Notices, homework, replies and reminders — even when the app is closed.': 'নোটিশ, হোমওয়ার্ক, উত্তর আর রিমাইন্ডার — অ্যাপ বন্ধ থাকলেও।',
      'Notices & circles': 'নোটিশ ও সার্কেল', 'Messages & replies': 'মেসেজ ও উত্তর', 'Homework': 'হোমওয়ার্ক', 'Classes & attendance': 'ক্লাস ও হাজিরা', 'Exams & results': 'পরীক্ষা ও ফলাফল', 'Approvals': 'অনুমোদন', 'Payments to verify': 'যাচাইয়ের পেমেন্ট',
      'Phone & laptop notifications': 'ফোন ও ল্যাপটপে নোটিফিকেশন', 'Open': 'খুলুন', 'App': 'অ্যাপ'
    };
    if (typeof EN2BN !== 'undefined') Object.keys(B).forEach(k => { if (!EN2BN[k]) EN2BN[k] = B[k]; if (typeof BN2EN !== 'undefined' && !BN2EN[B[k]]) BN2EN[B[k]] = k; });
  });

  /* ---------- 1. the background worker and the browser colour ---------- */
  let REG = null;
  if (HAS_SW) window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(r => { REG = r; }).catch(e => console.warn('FTA: service worker', e && e.message));
    navigator.serviceWorker.addEventListener('message', e => {
      const d = e.data || {};
      if (d.type === 'fta-push') G(() => FTA.pull && FTA.pull());
      if (d.type === 'fta-open' && typeof d.u === 'string') openLink(d.u.split('?')[1] || '');
      if (d.type === 'fta-resub') resync();
    });
  });
  const meta = (n, c) => { let m = document.querySelector('meta[name="' + n + '"]'); if (!m) { m = document.createElement('meta'); m.name = n; document.head.appendChild(m); } if (m.content !== c) m.content = c; };
  function paintBar() { const c = G(() => getComputedStyle(document.body).backgroundColor); if (c && c !== 'rgba(0, 0, 0, 0)') meta('theme-color', c); }
  G(() => new MutationObserver(() => setTimeout(paintBar, 60)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin', 'data-palette', 'class'] }));
  window.addEventListener('load', () => setTimeout(paintBar, 300));

  /* ---------- 2. install (Chrome / Edge / Android: one tap; iPhone: Add to Home Screen) ---------- */
  let PROMPT = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PROMPT = e; refresh(); });
  window.addEventListener('appinstalled', () => { PROMPT = null; say('FTA app installed'); refresh(); });
  async function install() {
    if (PROMPT) { const p = PROMPT; PROMPT = null; p.prompt(); G(async () => { await p.userChoice; refresh(); }); return; }
    sheetHelp();
  }
  function installHelp() {
    if (STANDALONE()) return '';
    if (IOS) return 'On iPhone or iPad: tap <strong>Share</strong> <span aria-hidden="true">⎋</span> → <strong>Add to Home Screen</strong>. Open FTA from the Home Screen icon' + (HAS_PUSH ? '' : ' — notifications work only from there (iOS 16.4 or newer)') + '.';
    if (PROMPT) return '';
    return 'In Chrome or Edge: open the browser menu (⋮) → <strong>Install app</strong> / <strong>Add to Home screen</strong>.';
  }
  function sheetHelp() { G(() => sheet('APP', 'Install the FTA app', `<div class="fp-help">${installHelp() || 'FTA is already installed on this device.'}</div>`)); }

  /* ---------- 3. this device's notifications ---------- */
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; };
  const same = (buf, s) => { if (!buf) return false; const a = new Uint8Array(buf), b = b64(s); return a.length === b.length && a.every((x, i) => x === b[i]); };
  function deviceName() {
    const os = /Android/.test(ua) ? 'Android' : IOS ? (/iPad/.test(ua) || navigator.maxTouchPoints > 1 && /Mac/.test(ua) ? 'iPad' : 'iPhone') : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux|CrOS/.test(ua) ? 'Linux' : 'Device';
    const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return (STANDALONE() ? 'FTA app · ' : '') + br + ' on ' + os;
  }
  const PK = 'fta-push-prefs', EK = 'fta-push-ep';
  const prefs = () => { const p = G(() => JSON.parse(ls.get(PK) || 'null')); return p && Array.isArray(p.off) ? p : { off: [] }; };
  function state() {
    if (!HAS_PUSH) return IOS && !STANDALONE() ? 'ios' : 'none';
    if (Notification.permission === 'denied') return 'blocked';
    return Notification.permission === 'granted' && ls.get(EK) ? 'on' : 'off';
  }
  async function reg() { if (REG) return REG; REG = await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('The app’s background worker did not start. Reload the page and try again.')), 8000))]); return REG; }
  async function subscribe() {
    const k = await FTA.api({ action: 'pushKey' }); if (k.status !== 200 || !k.body.key) throw new Error((k.body && k.body.error) || 'The server could not start notifications');
    const r = await reg(); let sub = await r.pushManager.getSubscription();
    if (sub && !same(sub.options && sub.options.applicationServerKey, k.body.key)) { await G(() => sub.unsubscribe()); sub = null; }
    if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.body.key) });
    const res = await FTA.api({ action: 'pushSub', sub: sub.toJSON(), ua: deviceName(), prefs: prefs() });
    if (res.status !== 200 || !res.body.ok) throw new Error((res.body && (res.body.reason || res.body.error)) || 'The server did not accept this device');
    ls.set(EK, sub.endpoint); return sub;
  }
  let BUSY = false;
  async function enable() {
    if (BUSY) return; if (!HAS_PUSH) { sheetHelp(); return; }
    BUSY = true;
    try {
      const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (p !== 'granted') { say(p === 'denied' ? 'Notifications are blocked for this site. Allow them in the browser’s site settings, then try again.' : 'Notifications were not turned on'); return; }
      await subscribe(); ls.set('fta-push-later', null); say('Notifications are on for this device');
    } catch (e) { say(e && e.message || 'Could not turn notifications on'); console.warn('FTA push', e); } finally { BUSY = false; refresh(); }
  }
  async function disable(quiet) {
    const ep = ls.get(EK); ls.set(EK, null);
    try { const r = await reg(); const s = await r.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) { }
    if (ep) await G(() => FTA.api({ action: 'pushOff', endpoint: ep }));
    if (!quiet) { say('Notifications are off for this device'); refresh(); }
  }
  async function test() { const r = await FTA.api({ action: 'pushTest', endpoint: ls.get(EK) }); say(r.body && r.body.ok ? 'Sent. It should appear in a few seconds.' : (r.body && (r.body.reason || r.body.error)) || 'Could not send'); if (r.body && /off/.test(r.body.reason || '')) { ls.set(EK, null); refresh(); } }
  async function setCat(c, on) {
    const p = prefs(); p.off = p.off.filter(x => x !== c); if (!on) p.off.push(c); ls.set(PK, JSON.stringify(p));
    const ep = ls.get(EK); if (ep) { const r = await FTA.api({ action: 'pushPrefs', endpoint: ep, prefs: p }); if (!(r.body && r.body.ok)) say((r.body && r.body.reason) || 'Not saved'); }
  }
  /* after sign-in: keep the server's copy of this device fresh (new key, renewed address, other person on this device) */
  async function resync() {
    if (!HAS_PUSH || Notification.permission !== 'granted' || !ls.get(EK)) return;
    try { await subscribe(); } catch (e) { console.warn('FTA push resync', e && e.message); }
  }
  FTA.beforeSignOut = () => ls.get(EK) ? disable(true) : Promise.resolve();      /* nothing to do when this device never turned them on */
  FTA.push = { enable, disable, test, setCat, state, install, open: () => openSheet() };

  /* ---------- 4. the screens ---------- */
  const role = () => (FTA.member && FTA.member.role) || G(() => ST.role) || '';
  const PILL = { on: ['On', 'p-ok'], off: ['Off', 'p-n'], blocked: ['Blocked', 'p-bad'], none: ['Not available', 'p-n'], ios: ['Off', 'p-n'] };
  function body() {
    const s = state(), p = prefs(), cats = catsFor(role());
    const why = s === 'blocked' ? 'This browser blocks notifications for FTA. Open the site settings (the lock icon next to the address) → Notifications → Allow, then come back.'
      : s === 'none' ? 'This browser cannot show notifications. Use Chrome, Edge, Firefox or Safari (on iPhone: the installed FTA app).'
        : s === 'ios' ? installHelp() : s === 'on' ? 'FTA notifications arrive here, even when the app is closed.' : 'Notices, homework, replies and reminders — even when the app is closed.';
    return `<div class="fp-sheet">
      <div class="fp-head">${BELL}<div class="grow"><b>Notifications on this device</b><small>${esc(deviceName())}</small></div><span class="pill ${PILL[s][1]}" id="fp-state">${PILL[s][0]}</span></div>
      <p class="fp-why">${why}</p>
      <div class="fp-acts">${s === 'on' ? `<button type="button" class="btn" onclick="FTA.push.test()">Send a test</button><button type="button" class="btn" onclick="FTA.push.disable()">Turn off</button>` : s === 'off' ? `<button type="button" class="btn p" id="fp-on" onclick="FTA.push.enable()">${BELL}Turn on notifications</button>` : ''}</div>
      ${s === 'on' || s === 'off' ? `<h3 class="fp-h3">What to send here</h3><div class="fp-cats">${cats.map(c => `<label class="fp-cat"><span class="grow"><b>${CAT[c][0]}</b><small>${CAT[c][1]}</small></span><input type="checkbox" role="switch" data-cat="${c}" ${p.off.indexOf(c) < 0 ? 'checked' : ''} onchange="FTA.push.setCat('${c}', this.checked)"><i aria-hidden="true"></i></label>`).join('')}</div>` : ''}
      ${STANDALONE() ? '' : `<div class="fp-app">${APP}<div class="grow"><b>Install the FTA app</b><small>${PROMPT ? 'Opens full screen with the FTA logo, like any other app.' : installHelp()}</small></div>${PROMPT ? '<button type="button" class="btn p" onclick="FTA.push.install()">Install app</button>' : ''}</div>`}
    </div>`;
  }
  function openSheet() { G(() => sheet('DEVICE', 'Phone & laptop notifications', body())); }
  function refresh() {
    const s = document.getElementById('sheet'), ov = document.getElementById('ov');
    if (s && ov && !ov.hidden && s.querySelector('.fp-sheet')) s.querySelector('.fp-sheet').outerHTML = body();
    banner();
  }
  /* the invitation on the first page (until turned on, or "Not now" for a week) */
  function banner() {
    const v = document.querySelector('#view'); if (!v || !FTA.member) return;
    const old = v.querySelector('.fp-ban'), s = state(), later = +(ls.get('fta-push-later') || 0) > Date.now();
    const first = G(() => ST.page === R_().pages[0]);
    const want = first && !later && (s === 'off' || s === 'ios' || (!STANDALONE() && PROMPT && s === 'on'));
    if (!want) { if (old) old.remove(); return; }
    const html = `<div class="v9j-bar fp-ban" role="region" aria-label="Notifications">${BELL}<div class="grow"><b>${s === 'on' ? 'Install the FTA app' : 'Get FTA notifications on this device'}</b><small>${s === 'ios' ? installHelp() : s === 'on' ? 'Opens full screen with the FTA logo, like any other app.' : 'Notices, homework, replies and reminders — even when the app is closed.'}</small></div>
      <div class="row fp-bb">${s === 'off' ? `<button type="button" class="btn p" onclick="FTA.push.enable()">${BELL}Turn on</button>` : ''}${PROMPT ? `<button type="button" class="btn${s === 'off' ? '' : ' p'}" onclick="FTA.push.install()">${APP}Install app</button>` : ''}<button type="button" class="btn" onclick="localStorage.setItem('fta-push-later', Date.now() + 7 * 864e5); this.closest('.fp-ban').remove()">Not now</button></div></div>`;
    if (old) { if (old.__h === html) return; old.remove(); }
    const host = v.querySelector('.page') || v; host.insertAdjacentHTML('afterbegin', html); host.firstElementChild.__h = html;
  }
  /* Settings (office) gets a permanent entry; everyone gets one at the bottom of the bell list */
  function hookPages() {
    if (typeof PAGES === 'undefined' || !PAGES.settings || PAGES.settings.__fp) return;
    const f = PAGES.settings; PAGES.settings = function () { const r = f.apply(this, arguments); G(() => { const pg = document.querySelector('#view .page') || document.querySelector('#view'); if (pg && !pg.querySelector('.fp-set')) pg.insertAdjacentHTML('afterbegin', `<div class="v9j-bar fp-set">${BELL}<div class="grow"><b>Phone & laptop notifications</b><small>${state() === 'on' ? 'On for this device' : 'Off for this device'} · install the FTA app</small></div><button type="button" class="btn p" onclick="FTA.push.open()">Open</button></div>`); }); return r; };
    PAGES.settings.__fp = 1;
  }
  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('#nb')) return;
    setTimeout(() => { const s = document.getElementById('sheet'); if (!s || s.querySelector('.fp-foot') || !/NOTIFICATIONS/i.test((s.querySelector('.sh small') || {}).textContent || '')) return; s.insertAdjacentHTML('beforeend', `<button type="button" class="alert fp-foot" onclick="FTA.push.open()"><span class="ic">${BELL}</span><div><b>Phone & laptop notifications</b><div class="sub">${state() === 'on' ? 'On for this device · change what comes here' : 'Get these on this phone or laptop, even when FTA is closed'}</div></div></button>`); }, 0);
  });

  /* ---------- 5. opening the right screen from a notification ---------- */
  function openLink(qs) {
    const q = new URLSearchParams(qs || ''), p = q.get('go'); if (!p) return false;
    if (!/^[a-z][a-z0-9-]{1,30}$/.test(p) || typeof PAGES === 'undefined' || !PAGES[p]) return false;
    G(() => closeSheet());
    const tab = q.get('tab'); if (tab === 'inbox') G(() => { V8.NT.tab = 'inbox'; });
    G(() => go(p));                                                     /* go() still checks the person's permission */
    const nt = q.get('nt'); if (nt && /^[A-Za-z0-9_-]{1,60}$/.test(nt)) setTimeout(() => G(() => V8.ntOpen(nt)), 80);
    return true;
  }
  function cleanUrl() {
    const u = new URL(location.href); let ch = false;
    ['go', 'nt', 'tab', 'source'].forEach(k => { if (u.searchParams.has(k)) { u.searchParams.delete(k); ch = true; } });
    if (ch) history.replaceState(history.state, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
  }

  /* ---------- 6. the app icon's number (installed app) ---------- */
  function badge() { if (!('setAppBadge' in navigator) || !FTA.member) return; const n = G(() => notifs().length) || 0; G(() => (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => { })); }

  /* ---------- start ---------- */
  window.addEventListener('fta:started', () => {
    hookPages();
    const qs = location.search.slice(1); cleanUrl(); if (qs) setTimeout(() => openLink(qs), 120);
    resync();
    const v = document.querySelector('#view'); if (v) new MutationObserver(() => { clearTimeout(banner.t); banner.t = setTimeout(banner, 120); }).observe(v, { childList: true });
    setTimeout(banner, 300); setInterval(badge, 15000); setTimeout(badge, 2000);
  });
})();
