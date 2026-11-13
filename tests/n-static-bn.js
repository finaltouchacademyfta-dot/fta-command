/* FTA · static check: every Bangla string written in the app's code must have an English
   translation (or be one of the Bangla-only dictionary values).
   Usage: PV=http://.. or BUILD=mock node tests/n-static-bn.js  → prints the untranslated strings */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const R = require('./rlib.js');
const BUILD = process.env.BUILD || 'mock', ROOT = path.join(__dirname, '..', BUILD === 'demo' ? 'site-demo' : 'site-mock'), PORT = 8890;
const URL0 = 'http://localhost:' + PORT + '/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
const BN = /[ঀ-৲৴-৿]/;

/* pull string literals and the static pieces of template literals out of the JS */
function literals(js) {
  const out = []; let i = 0; const n = js.length;
  while (i < n) {
    const c = js[i];
    if (c === '/' && js[i + 1] === '/') { const e = js.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = ''; while (j < n && js[j] !== c) { if (js[j] === '\\') { s += js[j + 1] === 'n' ? '\n' : js[j + 1]; j += 2; continue; } if (js[j] === '\n') break; s += js[j]; j++; }
      out.push(s); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, s = '', depth = 0;
      while (j < n) {
        if (js[j] === '\\') { s += js[j + 1]; j += 2; continue; }
        if (js[j] === '`') break;
        if (js[j] === '$' && js[j + 1] === '{') { s += '5'; depth = 1; j += 2; let q = null; while (j < n && depth) { const d = js[j]; if (q) { if (d === '\\') j++; else if (d === q) q = null; } else if (d === '"' || d === "'" || d === '`') q = d; else if (d === '{') depth++; else if (d === '}') depth--; j++; } continue; }
        s += js[j]; j++;
      }
      out.push(s); i = j + 1; continue;
    }
    i++;
  }
  return out;
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const vend = fs.readdirSync(path.join(ROOT, 'vendor')).filter(f => /^fta-.*\.js$/.test(f)).map(f => fs.readFileSync(path.join(ROOT, 'vendor', f), 'utf8'));
let pieces = new Set();
[...scripts, ...vend].forEach(js => literals(js).forEach(s => {
  if (!BN.test(s)) return;
  /* split HTML into its text runs; a plain string stays whole */
  const runs = /<[a-z/!]/i.test(s) ? s.replace(/<[^>]*>/g, '\u0001').split('\u0001') : [s];
  runs.forEach(r => { const t = r.replace(/\s+/g, ' ').trim(); if (t && BN.test(t)) pieces.add(t); });
}));
/* static markup in the HTML body */
html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, '\u0001').split('\u0001').forEach(r => { const t = r.replace(/\s+/g, ' ').trim(); if (t && BN.test(t)) pieces.add(t); });
pieces = [...pieces];

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch(); const p = await b.newPage(); await R.setup(p);
  await p.goto(URL0); await p.evaluate(() => { localStorage.setItem('fta-lang', 'en'); localStorage.setItem('fta-mock-session', 'owner@gmail.com'); }); await p.goto(URL0);
  await p.waitForFunction(() => typeof tr === 'function' && typeof I18N !== 'undefined', null, { timeout: 30000 }); await p.waitForTimeout(1500);
  const res = await p.evaluate(list => {
    const BN = /[ঀ-৲৴-৿]/;
    const bnOnly = new Set();
    try { I18N.bn.exact.forEach(v => bnOnly.add(I18N.norm(String(v)))); I18N.bn.tpl.forEach(t => bnOnly.add(I18N.norm(String(t.out)))); } catch (e) { }
    try { Object.values(EN2BN).forEach(v => bnOnly.add(I18N.norm(v))); } catch (e) { }
    try { BN_WORDS.forEach(w => bnOnly.add(I18N.norm(w[1]))); } catch (e) { }
    try { MON_BN.concat(MON_BN_S).forEach(m => bnOnly.add(m)); } catch (e) { }
    try { Object.values(I18N_DATA.bn || {}).forEach(v => bnOnly.add(I18N.norm(String(v)))); } catch (e) { }
    const old = LANG; LANG = 'en'; try { I18N_CACHE.clear(); } catch (e) { }
    const bad = [];
    list.forEach(s => { if (bnOnly.has(I18N.norm(s))) return; let o; try { o = tr(s); } catch (e) { o = s; } if (BN.test(o)) bad.push({ s, o }); });
    LANG = old; return bad;
  }, pieces);
  const OUT = process.env.OUT || path.join(__dirname, 'shots', 'static-bn.json');
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('Bangla pieces in code: ' + pieces.length + ' · without an English translation: ' + res.length + ' → ' + OUT);
  await b.close(); server.close(); process.exit(res.length ? 1 : 0);
})();
