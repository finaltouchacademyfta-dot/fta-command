// Serves site-mock with the production security headers and reports any CSP violation
// or page error while signing in and walking the main pages.   node tests/c-csp.js
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', process.env.SITE || 'site-mock');
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' https://abcd.supabase.co wss://abcd.supabase.co; worker-src 'self' blob:; frame-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; manifest-src 'self'";
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) f = path.join(ROOT, 'index.html');
  r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const url = 'http://127.0.0.1:' + srv.address().port + '/'; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const bad = []; p.on('console', m => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) bad.push('CSP: ' + t.slice(0, 220)); });
  p.on('pageerror', e => bad.push('ERR: ' + e.message.slice(0, 200)));
  await p.goto(url); await p.waitForTimeout(2500);
  const info = await p.evaluate(async () => { const o = { skin: document.documentElement.dataset.skin, palette: document.documentElement.dataset.palette, theme: document.documentElement.dataset.theme, lang: typeof LANG !== 'undefined' ? LANG : '?', run: typeof window.__ftaRun };
    try { if (window.FTA_TEST && FTA_TEST.signIn) await FTA_TEST.signIn('owner@gmail.com'); } catch (e) { o.signErr = String(e); }
    for (const pg of ['dashboard', 'students', 'payments', 'invoices', 'settings', 'expenses']) { try { go(pg); } catch (e) { o['go_' + pg] = String(e).slice(0, 80); } }
    try { themeSheet(); const c = [...document.querySelectorAll('#sheet .sk')].find(x => /setSkin\('premium'\)/.test(x.getAttribute('onclick') || '')); if (c) c.click(); closeSheet(); } catch (e) { o.sheet = String(e).slice(0, 80); }
    return o; });
  await p.waitForTimeout(800); console.log(JSON.stringify(info)); console.log(bad.length ? bad.join('\n') : 'no CSP violations, no page errors');
  await b.close(); srv.close(); process.exit(bad.length ? 1 : 0);
});
