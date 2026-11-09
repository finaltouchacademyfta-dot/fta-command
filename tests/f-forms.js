/* FTA · adding people in an EMPTY academy (live start): student without a subject, "New mentor",
   student ↔ mentor link (teacher dashboard), double click = one student, duplicate asks first,
   compact student card. MODE=mock python3 build.py && node tests/f-forms.js */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8771, URL0 = 'http://localhost:' + PORT + '/';
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
(async () => {
  await new Promise(r => server.listen(PORT, r)); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); await R.setup(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const toast = () => p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText : ''; });
  const E = f => p.evaluate(f);
  const setOct = v => p.evaluate(v => { const now = new Date(TODAY + 'T00:00:00'), lbl = now.toLocaleString('en-US', { month: 'long' }) + ' ' + now.getFullYear(); const r = [...document.querySelectorAll('#sheet tr')].find(x => x.innerText.includes(lbl)); const i = r.querySelector('input[type=number]'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  await p.goto(URL0); await E(() => { localStorage.clear(); localStorage.setItem('fta-mock-session', 'owner@gmail.com'); }); await p.goto(URL0); await p.waitForTimeout(4000);

  console.log('1. empty academy: student without a subject');
  await E(() => { go('students'); studentForm(); }); await p.waitForTimeout(400);
  ok(await E(() => !!document.getElementById('fx-noprog')), 'form says "No subjects yet" with an Add a subject button');
  await p.fill('#nf-n', 'Rafi'); await setOct('5000'); await p.click('#sheet button:has-text("Save")'); await p.waitForTimeout(500);
  ok((await E(() => STUDENTS.length)) === 0 && /No subjects yet/.test(await toast()), 'fee typed without a subject → explained, nothing half-saved');
  await setOct('0'); await p.click('#sheet button:has-text("Save")'); await p.waitForTimeout(1200);
  ok((await E(() => STUDENTS.map(s => s.name).join())) === 'Rafi' && await E(() => document.getElementById('ov').hidden), 'no fee → student saved, form closed');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2));

  console.log('2. mentors');
  await E(() => go('mentors')); await p.waitForTimeout(400);
  ok(await E(() => !!document.getElementById('fx-newmen')), 'Mentors page has "New mentor"');
  await p.click('#fx-newmen'); await p.waitForTimeout(400);
  ok(/Google/.test(await E(() => document.getElementById('sheet').innerText)), 'mentor form says teachers sign in with Google');
  await p.fill('#mf-n', 'Nusrat Jahan'); await p.fill('#mf-e', 'nusrat.teacher@gmail.com'); await p.fill('#mf-p', '01711111111'); await p.click('#sheet button:has-text("Add")'); await p.waitForTimeout(700);
  ok((await E(() => MENTORS.map(m => m.name).join())) === 'Nusrat Jahan', 'mentor added ' + await toast() + ' ' + await E(() => [...document.querySelectorAll('#sheet button')].map(b => b.innerText.trim()).join('/')));
  await E(() => V8.progForm()); await p.waitForTimeout(300); await p.fill('#pf-n', 'IGCSE English'); await p.fill('#pf-sub', 'English'); await p.fill('#pf-f', '5000'); await p.click('#sheet button:has-text("Add programme")'); await p.waitForTimeout(500);

  console.log('3. student linked to the mentor');
  await E(() => { go('students'); studentForm(); }); await p.waitForTimeout(400);
  ok(await E(() => !document.getElementById('fx-noprog')), 'no "No subjects" note once a subject exists');
  await p.fill('#nf-n', 'jubayer hossain'); await p.fill('#nf-p', '01851987261');
  await p.click('#v9h-sb'); await p.waitForTimeout(250); await E(() => { document.querySelector('#v9h-sbl input[type=checkbox]').click(); V9H.sbApply(); }); await p.waitForTimeout(300);
  ok(/MENTOR/i.test(await E(() => document.querySelector('#v9h-sl .v9h-sr').innerText)) && (await E(() => { const s = document.querySelector('#v9h-sl select'); return s.options[s.selectedIndex].text; })) === 'Nusrat Jahan', 'subject row shows "Mentor ▾ Nusrat Jahan"');
  await p.click('#sheet button:has-text("Save")'); await p.click('#sheet button:has-text("Save")', { timeout: 800 }).catch(() => { }); await p.waitForTimeout(1500);
  ok((await E(() => STUDENTS.filter(s => /jubayer/i.test(s.name)).length)) === 1, 'double click on Save → one student');
  ok((await E(() => ENROL.map(e => e.mentor).join())) === 'MEN-01' && (await E(() => INVOICES.filter(i => i.month === TODAY.slice(0, 7)).map(i => invNet(i)).join())) === '5000', 'enrolment with the mentor; this month billed 5,000');
  await E(() => { go('students'); studentForm(); }); await p.waitForTimeout(400); await p.fill('#nf-n', 'Jubayer Hossain'); await p.fill('#nf-p', '01851-987261');
  await p.click('#sheet button:has-text("Save")'); await p.waitForTimeout(400);
  ok((await E(() => STUDENTS.length)) === 2 && /already a student/.test(await toast()), 'same name + phone → asks first');
  await p.click('#sheet button:has-text("Save")'); await p.waitForTimeout(800);
  ok((await E(() => STUDENTS.length)) === 3, 'Save again → added on purpose');

  console.log('4. compact card');
  await E(() => { closeSheet(); go('students'); }); await p.waitForTimeout(500);
  const card = await E(() => { const c = [...document.querySelectorAll('.qc')].find(x => /jubayer/i.test(x.innerText)); const bx = c.querySelector('.qbx').getBoundingClientRect(), a = c.querySelector('.qc-a').getBoundingClientRect(); return { box: Math.round(bx.height), acts: Math.round(a.height), order: [...c.querySelectorAll('.qc-a .btn')].sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top || x.getBoundingClientRect().left - y.getBoundingClientRect().left).map(x => (x.innerText.trim() || 'del')).join(',') }; });
  ok(card.box <= 130 && card.acts <= 130, 'money boxes and buttons are compact (' + card.box + 'px / ' + card.acts + 'px)');
  ok(['Update,View,Payment,del,Monthly payments', 'Update,View,Payment,Monthly payments,del'].includes(card.order), 'button order (approved design may wrap the last two): ' + card.order);
  await E(() => SCH.enterTeacherPreview('MEN-01')); await p.waitForTimeout(400);
  ok(/jubayer/i.test(await E(() => V8.myStudents().map(s => s.name).join())), 'the student is on the teacher’s dashboard');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2));
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
