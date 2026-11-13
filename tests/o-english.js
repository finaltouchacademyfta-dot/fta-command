/* FTA · English means English — reports, print frame, search, toasts, settings defaults, WhatsApp texts (12 Nov 2026) */
const { chromium } = require('playwright'); const R = require('./rlib.js');
const BN = /[ঀ-৲৴-৿৳]/;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); await R.setup(p);
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto((process.env.PV || 'file://' + require('path').join(__dirname, '..', 'site-demo', 'index.html')), { timeout: 120000 }); await p.evaluate(() => localStorage.setItem('fta-lang', 'en')); await p.reload({ timeout: 120000 }); await p.waitForTimeout(2500);
 const out = await p.evaluate(async () => {
  const BN = /[ঀ-৲৴-৿৳]/, res = [];
  const deep = root => { const o = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode.nodeValue.trim(); if (t && BN.test(t) && !/^(STYLE|SCRIPT)$/.test(w.currentNode.parentNode.nodeName)) o.push(t.slice(0, 80)); } return o; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // reports
  const keys = typeof REPORTS !== 'undefined' ? Object.keys(REPORTS) : [];
  const repKeys = ['dash','students','dues','payments','programmes','mentors','payroll','expenses','accounts','loans','reports','activity','notes','settings'];
  for (const k of repKeys) { try { go(k); await sleep(150); const btn = [...document.querySelectorAll('#view button')].find(b => /^Report$|Full Report/.test(b.innerText.trim())); if (!btn) continue; btn.click(); await sleep(250); const a4 = [...document.querySelectorAll('#sheet button')].find(b => /A4 preview/i.test(b.innerText)); if (a4) { a4.click(); await sleep(300); } const host = document.getElementById('fd-rep'); if (host && host.shadowRoot) deep(host.shadowRoot).forEach(t => res.push('report ' + k + ': ' + t)); const pr = [...document.querySelectorAll('#sheet button')].find(b => /Print/i.test(b.innerText)); if (pr) { window.print = () => {}; pr.click(); await sleep(600); const f = document.getElementById('fd-print'); if (f && f.contentDocument) deep(f.contentDocument.body).forEach(t => res.push('print ' + k + ': ' + t)); } closeSheet(); } catch (e) { res.push('ERR ' + k + ' ' + e.message); } }
  // search
  for (const q of ['stu','rep','men','inv','pro','e','a','not']) { const gs = document.getElementById('gs'); gs.value = q; gs.dispatchEvent(new Event('input', { bubbles: true })); await sleep(200); document.querySelectorAll('#gsug, .gs-r, [id*="gs"]').forEach(el => deep(el).forEach(t => res.push('search ' + q + ': ' + t))); }
  // toasts synchronously
  ['Reminder copy হয়েছে','Menu আগের ক্রমে ফিরেছে','মুছে ফেলা হয়েছে; পুরোনো record বদলায়নি','সব আসল লেখা ফিরে এসেছে','নতুন fee শুধু নতুন ভর্তিতে লাগবে','Amount ও তারিখ দিন','কারণ লিখুন','কী কথা হলো লিখুন'].forEach(t => { toast(t); const v = document.getElementById('toast').textContent; if (BN.test(v)) res.push('toast: ' + v); });
  // settings tabs
  go('settings'); for (const tab of ['org','docs','menu','dash','lists','text','lang','users']) { try { ST.setTab = tab; render(); await sleep(250); document.querySelectorAll('#view input, #view textarea').forEach(i => { if (BN.test(i.value)) res.push('settings ' + tab + ' value: ' + i.value.slice(0, 60)); }); document.querySelectorAll('#view [aria-label],#view [title]').forEach(el => ['aria-label','title'].forEach(a => { const v = el.getAttribute(a); if (v && BN.test(v)) res.push('settings ' + tab + ' ' + a + ': ' + v); })); document.querySelectorAll('#view *').forEach(el => { if (el.shadowRoot) deep(el.shadowRoot).forEach(t => res.push('settings ' + tab + ' shadow: ' + t)); }); } catch (e) { res.push('ERR settings ' + tab + ' ' + e.message); } }
  // wa links
  go('payments'); await sleep(300); document.querySelectorAll('a[href*="wa.me"]').forEach(a => { const tx = new URL(a.href).searchParams.get('text') || ''; if (BN.test(tx)) res.push('wa: ' + tx.slice(0, 60)); });
  go('students'); await sleep(300); document.querySelectorAll('a[href*="wa.me"]').forEach(a => { const tx = new URL(a.href).searchParams.get('text') || ''; if (BN.test(tx)) res.push('wa students: ' + tx.slice(0, 60)); });
  // bn mode still Bangla
  setLang('bn'); await sleep(400); go('dashboard'); await sleep(300); const bnOk = BN.test(document.getElementById('view').innerText); setLang('en'); await sleep(300);
  return { res: [...new Set(res)], bnOk };
 });
 let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
 ok(!out.res.length, 'English mode: no Bangla in reports, print, search, toasts, settings, WhatsApp texts' + (out.res.length ? ' → ' + out.res.slice(0, 8).join(' | ') : ''));
 ok(out.bnOk, 'Bangla mode still shows Bangla');
 ok(!errs.length, 'no page errors' + (errs.length ? ' → ' + errs.join(' | ') : ''));
 console.log(`\n${pass}/${pass + fail} passed`); await b.close(); process.exit(fail ? 1 : 0); })();
