/* FTA Assistant (AI agent) — end-to-end in the mock build with a scripted stand-in for Claude.
   The fake model answers /api/agent with real Anthropic-style streamed events, so the whole
   loop runs: tools → approval cards → the app's own forms → saved → verified → memory.
   MODE=mock python3 build.py && node tests/g-agent.js */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const R = require('./rlib.js');
const ROOT = path.join(__dirname, '..', 'site-mock'), PORT = 8777, URL0 = 'http://localhost:' + PORT + '/';
const server = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, URL0).pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
/* Anthropic streaming format */
function sse(blocks) {
  let out = ''; const ev = (t, o) => { out += 'event: ' + t + '\ndata: ' + JSON.stringify(Object.assign({ type: t }, o)) + '\n\n'; };
  ev('message_start', { message: { id: 'msg', type: 'message', role: 'assistant', content: [] } }); ev('ping', {});
  blocks.forEach((b, i) => {
    if (b.type === 'text') { ev('content_block_start', { index: i, content_block: { type: 'text', text: '' } }); const h = Math.ceil(b.text.length / 2); ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: b.text.slice(0, h) } }); ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: b.text.slice(h) } }); }
    else { ev('content_block_start', { index: i, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } }); const j = JSON.stringify(b.input); ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: j.slice(0, 7) } }); ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: j.slice(7) } }); }
    ev('content_block_stop', { index: i });
  });
  ev('message_delta', { delta: { stop_reason: blocks.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn' }, usage: { output_tokens: 9 } }); ev('message_stop', {});
  return out;
}
const T = (text) => ({ type: 'text', text }); let n = 0; const U = (name, input) => ({ type: 'tool_use', id: 'toolu_' + (++n), name, input });
(async () => {
  await new Promise(r => server.listen(PORT, r)); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } }); const p = await ctx.newPage(); await R.setup(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const Q = [], REQS = []; let mode = 'ok';
  await p.route('**/api/agent', async route => {
    const req = route.request(); let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) { }
    REQS.push({ body, auth: req.headers()['authorization'] });
    if (mode === 'down') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'The AI key is not set yet: add ANTHROPIC_API_KEY in Netlify.' }) });
    const next = Q.shift(); const blocks = typeof next === 'function' ? next(body) : next || [T('(no script)')];
    route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sse(blocks) });
  });
  const E = f => p.evaluate(f), E1 = (f, a) => p.evaluate(f, a);
  const lastResult = body => { const m = body.messages[body.messages.length - 1]; return Array.isArray(m.content) ? m.content.map(c => c.content).join('\n') : ''; };
  const ask = async (t, waitMs) => { await p.fill('#fa-q', t); await p.press('#fa-q', 'Enter'); await p.waitForTimeout(waitMs || 900); };
  const cards = () => E(() => [...document.querySelectorAll('#fa-log .fa-card')].map(c => ({ id: c.dataset.id, t: c.innerText })));
  const idle = () => p.waitForFunction(() => !FTA.agent.state.busy, null, { timeout: 20000 });
  await p.goto(URL0); await E(() => { localStorage.clear(); localStorage.setItem('fta-mock-session', 'owner@gmail.com'); }); await p.goto(URL0); await p.waitForTimeout(4000);

  console.log('1. the button and the panel (Owner only)');
  ok(await E(() => !!document.querySelector('#top #fa-btn')), 'Owner sees the AI button in the top bar');
  await p.click('#fa-btn'); await p.waitForTimeout(300);
  ok(await E(() => !document.getElementById('fa-panel').hidden && /Approve|approve/.test(document.getElementById('fa-panel').innerText)), 'panel opens with a welcome that explains approval');
  ok(await E(() => document.querySelectorAll('.fa-chip').length >= 3), 'suggestion chips');

  console.log('2. reading: knowledge, search, analysis');
  await E(() => { V8.progForm(); }); await p.fill('#pf-n', 'IGCSE English'); await p.fill('#pf-f', '5000'); await p.click('#sheet button:has-text("Add programme")'); await p.waitForTimeout(400);
  Q.push([U('app_overview', {}), U('find', { text: 'English' })]);
  Q.push(body => [T(/IGCSE English/.test(lastResult(body)) ? 'You have 1 programme: IGCSE English.' : 'not found')]);
  await ask('What programmes do we have?'); await idle();
  const r0 = REQS[0].body;
  ok(REQS[0].auth === 'Bearer mock', 'request is signed with the sign-in token');
  ok(/STUDENTS/.test(r0.system) && /PAYMENTS/.test(r0.system) && /studentForm/.test(r0.system) && /payForm/.test(r0.system) && /Pages:/.test(r0.system), 'system prompt carries the live app map (collections, forms, pages)');
  ok(r0.tools.length >= 20 && r0.tools.every(t => t.name && t.input_schema) && !r0.tools.some(t => 'read' in t), 'tools sent in Claude format (' + r0.tools.length + ')');
  ok(await E(() => /You have 1 programme: IGCSE English/.test(document.getElementById('fa-log').innerText)), 'answer streamed into the chat');
  ok(await E(() => document.querySelectorAll('.fa-step').length >= 2), 'steps shown (looking over the app, searching)');
  const tr = await E(() => { const T = FTA.agentTools.RUN; return { q: T.query({ collection: 'progs', where: [{ field: 'fee', op: 'gte', value: 1000 }], sum: ['fee'] }), d: T.describe_collection({ name: 'PROGS' }), m: T.money_summary({}), fns: T.list_app_functions({ filter: 'savePay' }), src: T.read_function_source({ name: 'savePay' }), src2: T.read_function_source({ name: 'V9._savePay' }), bad: T.read_function_source({ name: 'FTA.api' }) }; });
  ok(tr.q.total === 1 && tr.q.sums.fee === 5000, 'query with filter + sum');
  ok(tr.d.fields.fee && tr.d.kind === 'list', 'describe_collection gives fields');
  ok(typeof tr.m.dues_outstanding_all === 'number' && Array.isArray(tr.m.accounts), 'money_summary');
  ok(tr.fns.functions.some(f => /^savePay/.test(f)) && (tr.src.wraps || []).includes('V9._savePay') && /PAYMENTS\.push/.test(tr.src2.source), 'reads the app’s own functions and their code');
  ok(!!tr.bad.error, 'internal functions (FTA.api…) are not open to it');

  console.log('3. a change needs approval: new mentor through the app’s form');
  Q.push([T('I will add the mentor.'), U('fill_form', { summary: 'Add mentor Nusrat Jahan', form: 'SCH.menForm', fields: { 'mf-n': 'Nusrat Jahan', 'mf-e': 'nusrat.teacher@gmail.com', 'mf-p': '01711111111' }, button: 'Add' })]);
  Q.push(body => [T(/MENTORS MEN-/.test(lastResult(body)) ? 'Done: Nusrat Jahan added.' : 'failed: ' + lastResult(body).slice(0, 200))]);
  await ask('Nusrat Jahan ke mentor hisebe add koro, 01711111111, nusrat.teacher@gmail.com');
  let C = await cards();
  ok(C.length === 1 && /Nusrat Jahan/.test(C[0].t) && /Approve/.test(C[0].t), 'approval card shows what will be saved');
  ok((await E(() => MENTORS.length)) === 0, 'nothing saved before Approve');
  await p.click('#fa-log [data-ok]'); await idle();
  ok((await E(() => MENTORS.map(m => m.name).join())) === 'Nusrat Jahan' && await E(() => /nusrat.teacher@gmail.com/.test(document.querySelector('.fa-card').innerText)), 'after Approve: mentor saved by the app’s own form');
  ok(await E(() => /Done/.test(document.querySelector('.fa-card').innerText) && /Done: Nusrat Jahan added/.test(document.getElementById('fa-log').innerText)), 'card says Done, summary reported');
  ok(await E(() => AUDIT.some(a => /Assistant/.test(a.action) && /FTA Assistant/.test(a.detail))), 'activity log: “Approved by … via FTA Assistant”');

  console.log('4. student with subject + mentor, then a payment');
  Q.push([U('add_student', { summary: 'Add Ayaan Rahman, IGCSE English with Nusrat', name: 'Ayaan Rahman', phone: '01811111111', guardian: 'Karim Rahman', subjects: [{ programme: 'IGCSE English', mentor: 'Nusrat' }] })]);
  Q.push(body => [T(/STUDENTS STU-/.test(lastResult(body)) ? 'Ayaan added.' : 'fail ' + lastResult(body).slice(0, 300))]);
  await ask('Ayaan Rahman ke add koro, English, Nusrat er kache'); await p.click('#fa-log .fa-card:last-of-type [data-ok]').catch(() => { }); await idle();
  const st = await E(() => ({ s: STUDENTS.map(s => s.name + '|' + s.phone).join(), e: ENROL.map(e => e.mentor).join(), inv: INVOICES.length }));
  ok(st.s === 'Ayaan Rahman|01811111111' && st.e === 'MEN-01', 'student saved, linked to the mentor (' + st.s + ' / ' + st.e + ')');
  ok(st.inv >= 1, 'billed by the app (' + st.inv + ' invoice)');
  const sid = await E(() => STUDENTS[0].id);
  Q.push([U('fill_form', { summary: 'Ayaan pays 2,500 in cash', form: 'payForm', args: [sid], fields: { 'pf-a': 2500, 'pf-c': 'ACC-CASH' }, button: 'Save & verify' })]);
  Q.push(body => [T(/PAYMENTS PAY-/.test(lastResult(body)) ? 'Payment saved.' : 'fail ' + lastResult(body).slice(0, 300))]);
  await ask('Ayaan 2500 taka cash dise'); await p.click('#fa-log .fa-card:last-of-type [data-ok]'); await idle();
  ok((await E(() => PAYMENTS.map(x => x.amt + '|' + x.status + '|' + x.acct).join())) === '2500|Verified|ACC-CASH', 'payment saved and verified through payForm/savePay');
  const sum = await E1(id => FTA.agentTools.RUN.student_summary({ student: 'ayaan' }), sid);
  ok(sum.student && sum.enrolments[0].mentor === 'Nusrat Jahan' && sum.payments.length === 1 && typeof sum.total_due === 'number', 'student_summary: subjects, mentor, dues, payments');

  console.log('5. declining, Approve all, delete to the Recycle bin, settings');
  Q.push([U('delete_record', { summary: 'Delete Ayaan', collection: 'STUDENTS', id: sid, reason: 'test' })]);
  Q.push(body => [T(/did not approve/.test(lastResult(body)) ? 'OK, I left it.' : 'x')]);
  await ask('delete Ayaan'); await p.click('#fa-log .fa-card:last-of-type [data-no]'); await idle();
  ok((await E(() => STUDENTS.length)) === 1 && await E(() => /OK, I left it/.test(document.getElementById('fa-log').innerText)), 'Skip → nothing deleted, Claude is told');
  Q.push([U('update_record', { summary: 'Rename academy', collection: 'ORG', changes: { name: 'Final Touch Academy Dhaka' } }), U('create_record', { summary: 'Add a note', collection: 'NOTES', record: { title: 'Call Karim', text: 'about fees' } })]);
  Q.push([T('Both done.')]);
  await ask('rename the academy and add a note'); await p.waitForTimeout(300);
  ok(await E(() => !document.getElementById('fa-all').hidden && /Approve all \(2\)/.test(document.getElementById('fa-all').innerText)), '“Approve all (2)” for several changes');
  await p.click('#fa-allok'); await idle();
  ok((await E(() => ORG.name)) === 'Final Touch Academy Dhaka' && (await E(() => NOTES.some(x => x.title === 'Call Karim'))), 'both changes saved');
  Q.push([U('delete_record', { summary: 'Delete Ayaan', collection: 'students', id: sid, reason: 'left the academy' })]);
  Q.push(body => [T(/Recycle|removed/.test(lastResult(body)) ? 'Moved to the Recycle bin.' : 'x ' + lastResult(body).slice(0, 200))]);
  await ask('delete Ayaan'); await p.click('#fa-log .fa-card:last-of-type [data-ok]'); await idle();
  ok((await E(() => STUDENTS.length)) === 0 && (await E(() => SCH.BIN.some(x => /Ayaan/.test(x.label) && /left the academy/.test(x.label)))), 'student deleted the app’s way (Recycle bin, with the reason)');
  ok((await E(() => PAYMENTS.length + ENROL.length)) === 0, 'his subjects and payments went with him (restorable)');

  console.log('6. memory and learning');
  Q.push([U('remember', { text: 'bKash is our main collection account', kind: 'preference' })]);
  Q.push([T('Got it, I will remember.')]);
  await ask('mone rakho: bKash amader main collection account'); await idle();
  ok(await E(() => FTA.AGENTMEM.some(m => /bKash is our main/.test(m.text))), 'remembered (agentmem collection)');
  ok(await E(() => /Learned: bKash/.test(document.getElementById('fa-log').innerText)), 'shown as “Learned”');
  Q.push([T('ok')]); await ask('hi'); await idle();
  const last = REQS[REQS.length - 1].body;
  ok(/bKash is our main collection account/.test(last.system), 'what it learned goes into every later request');
  ok(/RECENT TASKS/.test(last.system) && /Delete Ayaan|Add mentor/.test(last.system), 'finished tasks are remembered as experience');
  await E(() => FTA.sync()); await p.waitForTimeout(500);
  ok(await E(() => { const db = JSON.parse(localStorage.getItem('fta-mock-db') || '{}'); return JSON.stringify(db).includes('bKash is our main collection account'); }), 'memory saved to the server (mock database)');
  ok(await E(() => { const s = FTA.agentTools.systemPrompt(); return !/\(shape\)/.test(s); }), 'internal app-shape note not shown as a memory');

  console.log('7. errors, history, other roles');
  mode = 'down'; await ask('hello'); await idle(); mode = 'ok';
  ok(await E(() => /ANTHROPIC_API_KEY/.test([...document.querySelectorAll('.fa-m.err')].pop().innerText)), 'server problem shown clearly');
  const nv = await E(() => FTA.agent.state.view.length);
  await p.reload(); await p.waitForTimeout(3500); await p.click('#fa-btn'); await p.waitForTimeout(300);
  ok((await E(() => FTA.agent.state.view.length)) === nv && await E(() => /Payment saved/.test(document.getElementById('fa-log').innerText)), 'chat history kept after reload');
  ok(await E(() => FTA.AGENTMEM.some(m => /bKash/.test(m.text))), 'memory loaded again from the server');
  Q.push([T('next')]); await ask('again'); await idle();
  const msgs = REQS[REQS.length - 1].body.messages;
  ok(msgs[0].role === 'user' && typeof msgs[0].content === 'string' && msgs.every((m, i) => i === 0 || m.role !== msgs[i - 1].role || Array.isArray(m.content)), 'conversation sent in a valid order');
  await E(() => { FTA.member = Object.assign({}, FTA.member, { role: 'Admin' }); }); await p.waitForTimeout(3300);
  ok(await E(() => !document.getElementById('fa-btn') && document.getElementById('fa-panel').hidden), 'not the Owner → no button, panel closed');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
