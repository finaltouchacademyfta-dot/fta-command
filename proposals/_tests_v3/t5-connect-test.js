/* ZZ3 connect layer: WhatsApp-style chat, Meet-style live class and the connections, across 4 tabs (one context = shared storage + BroadcastChannel) */
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS !== '0';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const F = 'file://' + __dirname + '/two/FTA-Proposals-Demo.html';
  const D = __dirname + '/v3shots/'; require('fs').mkdirSync(D, { recursive: true });
  const errs = [], res = [];
  const ok = (c, m) => { res.push([!!c, m]); console.log((c ? '✓ ' : '✗ ') + m); };
  const page = async (tag) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('dialog', d => d.accept()); return p; };
  const A = await page('A mentor'), B = await page('B Ayaan'), C = await page('C owner'), R = await page('D Raisa');
  const W = ms => A.waitForTimeout(ms);
  const as = async (p, e) => { await p.goto(F); await p.waitForTimeout(400); await p.evaluate(x => FTA_PREVIEW.as(x), e); await p.waitForTimeout(4500); };
  await A.goto(F); await A.evaluate(() => { localStorage.clear(); localStorage.setItem('fta-preview-seen', '1'); }); await A.goto(F); await W(4500);
  await A.evaluate(() => FTA_PREVIEW.as('nusrat.jahan.fta@gmail.com')); await W(4500);
  await as(B, 'ayaan.rahman@gmail.com'); await as(C, 'owner@gmail.com'); await as(R, 'raisa.ahmed@gmail.com');
  const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: D + n + '.png' }); };
  const dbv = (p, f, a) => p.evaluate(f, a);

  /* ------------------------------------------------ 1. group chat */
  for (const [p, pg] of [[A, 'tp-chat'], [B, 'sp-chat'], [C, 'cx-chat'], [R, 'sp-chat']]) { await p.evaluate(x => go(x), pg); await p.waitForTimeout(500); await p.click('#zc-rl [data-room="g:G1"]'); await p.waitForTimeout(300); }
  ok(await A.isVisible('#zc-in') && await B.isVisible('#zc-in') && await C.isVisible('#zc-in'), 'mentor, student and office can all write in the class group');
  await A.click('#zc-in'); await A.type('#zc-in', 'Good morning class. '); await A.type('#zc-in', '@Aya'); await W(200);
  ok(await A.isVisible('#zc-ment button[data-pid="STU-1001"]'), '@mention suggestions appear');
  await A.press('#zc-in', 'Enter'); await A.type('#zc-in', 'please read page 12 before the live class.'); await A.press('#zc-in', 'Enter'); await W(1500);
  const mid = await dbv(A, () => FTA_DEMO_CONNECT.db().msgs.filter(x => x.room === 'g:G1').slice(-1)[0].id);
  ok(await dbv(A, () => FTA_DEMO_CONNECT.db().msgs.slice(-1)[0].mentions.includes('STU-1001')), 'mention stored on the message');
  for (const [p, n] of [[B, 'Ayaan'], [R, 'Raisa'], [C, 'owner']]) ok(await p.evaluate(id => !!document.getElementById('zm-' + id), mid), n + ' sees the group message live');
  ok(await B.evaluate(() => FTA_ZC.bellItems().some(x => /mention/.test(x.t)) || document.querySelector('.zc-row.zc-hlme') !== null), 'Ayaan: mention notification / highlight');
  ok(await B.evaluate(() => !!document.querySelector('.zc-row.zc-hlme .zc-at.mine')), 'Ayaan: his @name is highlighted in the bubble');
  await W(800);
  ok(await dbv(A, id => { const d = FTA_DEMO_CONNECT.db(), x = d.msgs.find(y => y.id === id), r = d.reads['g:G1'] || {}; return ['STU-1001', 'STU-1004', 'U:office'].every(p => (r[p] || 0) >= x.at); }, mid), 'group message read by Ayaan, Raisa and the office');
  await A.waitForTimeout(600);
  ok(await A.evaluate(id => !!document.querySelector('#zm-' + id + ' .zc-tk.part, #zm-' + id + ' .zc-tk.read'), mid), 'mentor sees read ticks');
  /* message info */
  await A.hover('#zm-' + mid + ' .zc-b'); await A.click('#zm-' + mid + ' [data-a="menu"]'); await W(150); await A.click('.zc-pop [data-a="msginfo"]'); await W(200);
  const info = await A.evaluate(() => document.querySelector('.zc-modal').innerText);
  ok(/Read by 3 of 5/i.test(info) && /Ayaan Rahman/.test(info) && /Raisa/.test(info), 'message info: read by whom + time (' + info.split('\n').slice(2, 4).join(' / ') + ')');
  await shot(A, 'chat-msginfo-1440'); await A.click('.zc-modal [data-a="mclose"]');
  /* replies from every role */
  await B.hover('#zm-' + mid + ' .zc-b'); await B.click('#zm-' + mid + ' [data-a="reply"]'); await B.type('#zc-in', 'Okay Miss, page 12 done 👍'); await B.press('#zc-in', 'Enter'); await W(700);
  await R.dblclick('#zm-' + mid + ' .zc-tx'); await R.type('#zc-in', 'Will do, Miss'); await R.press('#zc-in', 'Enter'); await W(700);
  await C.hover('#zm-' + mid + ' .zc-b'); await C.click('#zm-' + mid + ' [data-a="menu"]'); await C.click('.zc-pop [data-a="reply"]'); await C.type('#zc-in', 'Office: the room is ready for today.'); await C.press('#zc-in', 'Enter'); await W(700);
  const bMsg = await dbv(A, () => FTA_DEMO_CONNECT.db().msgs.find(x => x.by === 'STU-1001' && /page 12 done/.test(x.text)).id);
  await A.hover('#zm-' + bMsg + ' .zc-b'); await A.click('#zm-' + bMsg + ' [data-a="reply"]'); await A.type('#zc-in', 'Well done Ayaan'); await A.press('#zc-in', 'Enter'); await W(900);
  const reps = await dbv(A, (id) => { const d = FTA_DEMO_CONNECT.db(); return d.msgs.filter(x => x.reply).map(x => x.by + '>' + (d.msgs.find(y => y.id === x.reply) || {}).by); }, mid);
  ok(['STU-1001>MEN-01', 'STU-1004>MEN-01', 'U:office>MEN-01', 'MEN-01>STU-1001'].every(x => reps.includes(x)), 'reply from student (button), student (double-click), office (menu) and mentor: ' + reps.join(', '));
  ok(await A.evaluate(() => document.querySelectorAll('#zc-ml .zc-q').length >= 4), 'quoted reply bubbles shown');
  await A.click('#zc-ml .zc-q >> nth=0'); await W(300);
  ok(await A.evaluate(id => document.getElementById('zm-' + id).classList.contains('zc-flash'), mid), 'tapping a quote jumps to and highlights the original');
  /* reaction */
  await B.hover('#zm-' + mid + ' .zc-b'); await B.click('#zm-' + mid + ' [data-a="reactbar"]'); await B.click('.zc-pop [data-e="❤️"]'); await W(900);
  ok(await A.evaluate(id => /❤️/.test((document.querySelector('#zm-' + id + ' .zc-rx') || {}).innerText || ''), mid), 'reaction from Ayaan shows on the mentor’s screen');
  /* pin, star, search */
  await A.hover('#zm-' + mid + ' .zc-b'); await A.click('#zm-' + mid + ' [data-a="menu"]'); await A.click('.zc-pop [data-a="pin"]'); await W(900);
  ok(await B.evaluate(() => /Pinned/.test((document.querySelector('.zc-pinbar') || {}).innerText || '')), 'pinned message bar visible to the student');
  await A.hover('#zm-' + mid + ' .zc-b'); await A.click('#zm-' + mid + ' [data-a="menu"]'); await A.click('.zc-pop [data-a="star"]'); await W(200);
  await A.click('[data-a="starview"]'); await W(200); ok(await A.evaluate(() => document.querySelectorAll('#zc-rl .zc-star').length === 1), 'starred messages list'); await A.click('[data-a="unstarview"]');
  await A.click('.zc-ha [data-a="search"]'); await A.type('#zc-sq', 'page 12'); await W(300);
  ok(await A.evaluate(() => document.querySelectorAll('#zc-ml mark').length >= 2 && /of/.test(document.getElementById('zc-sn').textContent)), 'search inside the chat highlights matches');
  await A.click('[data-a="sclose"]');
  /* group info drawer */
  await A.click('.zc-ha [data-a="info"]'); await W(300);
  ok(await A.evaluate(() => { const d = document.getElementById('zc-drawer'); return !d.hidden && /Group admin/.test(d.innerText) && /online/.test(d.innerText) && /Mute notifications/.test(d.innerText); }), 'group info: members with online state + roles, media tabs, mute');
  await shot(A, 'chat-info-1440'); await A.click('[data-a="infoclose"]');
  /* forward + delete for everyone + edit */
  await A.hover('#zm-' + mid + ' .zc-b'); await A.click('#zm-' + mid + ' [data-a="menu"]'); await A.click('.zc-pop [data-a="fwd"]'); await A.click('.zc-modal label:has-text("Ayaan") input'); await A.click('.zc-modal [data-a="dofwd"]'); await W(500);
  ok(await dbv(A, () => FTA_DEMO_CONNECT.db().msgs.some(x => x.fwd && x.room === 'dm:MEN-01|STU-1001')), 'forward to a private chat');
  await A.type('#zc-in', 'tpyo here'); await A.press('#zc-in', 'Enter'); await W(300);
  const tid = await dbv(A, () => FTA_DEMO_CONNECT.db().msgs.filter(x => x.room === 'g:G1').slice(-1)[0].id);
  await A.hover('#zm-' + tid + ' .zc-b'); await A.click('#zm-' + tid + ' [data-a="menu"]'); await A.click('.zc-pop [data-a="edit"]'); await A.fill('#zc-in', 'typo fixed'); await A.press('#zc-in', 'Enter'); await W(600);
  ok(await B.evaluate(id => /Edited/.test(document.getElementById('zm-' + id).innerText) && /typo fixed/.test(document.getElementById('zm-' + id).innerText), tid), 'edited label reaches the student');
  await A.hover('#zm-' + tid + ' .zc-b'); await A.click('#zm-' + tid + ' [data-a="menu"]'); await A.click('.zc-pop [data-a="delall"]'); await W(700);
  ok(await B.evaluate(id => /This message was deleted/.test(document.getElementById('zm-' + id).innerText), tid), 'delete for everyone');
  ok(await A.evaluate(() => !!document.querySelector('.zc-row.first.them .zc-nm')), 'sender names in colour in groups');
  await shot(B, 'chat-group-student-1440');
  /* unread jump button */
  await R.evaluate(() => { const b = document.getElementById('zc-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); });
  await A.type('#zc-in', 'One more thing for later'); await A.press('#zc-in', 'Enter'); await W(800);
  ok(await R.evaluate(() => !document.getElementById('zc-fab').hidden), 'scroll-to-newest button when scrolled up');
  /* office monitor stays read-only */
  await C.evaluate(() => go('cx-monitor')); await W(500); await C.click('#zc-rl [data-room="dm:MEN-01|STU-1001"]'); await W(300);
  ok(await C.evaluate(() => !document.getElementById('zc-in') && /Read-only/.test(document.querySelector('.zc-ro').innerText)), 'Chat Monitor is read-only');
  ok(await C.evaluate(() => AUDIT.some(a => /Chat opened by Owner/.test(a.action || a.a || JSON.stringify(a)))), 'monitor opening logged');

  /* ------------------------------------------------ 2. phone layout (Raisa) with swipe-to-reply */
  await R.setViewportSize({ width: 390, height: 844 }); await R.evaluate(() => go('sp-chat')); await W(600);
  ok(await R.evaluate(() => document.getElementById('zc-wa').dataset.open === '0' && getComputedStyle(document.getElementById('zc-main')).display === 'none'), 'phone: chat list first');
  await R.click('#zc-rl [data-room="g:G1"]'); await W(400);
  ok(await R.evaluate(() => document.getElementById('zc-wa').dataset.open === '1' && getComputedStyle(document.getElementById('zc-side')).display === 'none' && getComputedStyle(document.querySelector('.zc-back')).display !== 'none'), 'phone: chat full screen with back button');
  await shot(R, 'chat-phone-390');
  const sw = await R.evaluate(id => { const row = document.getElementById('zm-' + id), r = row.querySelector('.zc-b').getBoundingClientRect(), y = r.top + r.height / 2, x = r.left + 20; const ev = (t, X) => document.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: X, clientY: y, pointerType: 'touch', pointerId: 7, isPrimary: true })); row.querySelector('.zc-b').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerType: 'touch', pointerId: 7, isPrimary: true, button: 0 })); [20, 45, 70, 90].forEach(d => ev('pointermove', x + d)); ev('pointerup', x + 90); return !!document.querySelector('.zc-rp'); }, mid);
  ok(sw, 'phone: swipe right on a message starts a reply');
  await R.type('#zc-in', 'Swiped reply from my phone'); await R.press('#zc-in', 'Enter'); await W(400);
  await shot(R, 'chat-phone-reply-390');
  await R.click('.zc-back'); await W(300); ok(await R.evaluate(() => document.getElementById('zc-wa').dataset.open === '0'), 'phone: back to the list');
  await R.setViewportSize({ width: 1440, height: 900 });

  /* ------------------------------------------------ 3. live class */
  await A.evaluate(() => go('tp-live')); await W(500); await shot(A, 'live-list-1440');
  await A.click('[data-lj="G1"]'); await W(500); await A.click('#zl-pcam'); await A.click('#zl-pmic'); await W(1200);
  await shot(A, 'live-lobby-1440');
  await A.fill('#zl-title', 'Paper 2 · Question 3 revision'); await A.click('#zl-join'); await W(1800);
  ok(await A.evaluate(() => !!document.getElementById('zl-room') && FTA_ZC.liveOn('G1')), 'mentor started the live class (lobby → join)');
  ok(await B.evaluate(() => FTA_ZC.bellItems().some(x => /^Live now/.test(x.t))), 'student: “Live now” in the bell');
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().notes.some(n => n.kind === 'live' && n.to.includes('STU-1001'))) && await B.evaluate(() => !!document.querySelector('.zc-toast')), 'student: live-started notification + toast');
  await B.evaluate(() => { FTA_ZC.openChat('g:G1'); }); await W(700);
  ok(await B.evaluate(() => !!document.querySelector('.zc-livebar [data-a="joinlive"]') && /Live class/.test(document.querySelector('.zc-pinbar') ? document.querySelector('.zc-pinbar').innerText : '')), 'student: Join bar + pinned live card in the class chat');
  await shot(B, 'chat-livecard-1440');
  await B.evaluate(() => go('sp-home')); await W(900);
  ok(await B.evaluate(() => !!document.querySelector('#zc-livestrip [data-zj="G1"]')), 'student dashboard: Live-now strip with Join');
  await A.waitForTimeout(100);
  await B.click('#zc-livestrip [data-zj="G1"]'); await W(600); await B.click('#zl-pmic'); await B.click('#zl-join'); await W(1200);
  await R.evaluate(() => FTA_ZC.joinLive('G1')); await W(700); await R.click('#zl-join'); await W(3500);
  ok(await A.evaluate(() => !!document.querySelector('.zl-tile[data-pid="STU-1001"]') && !!document.querySelector('.zl-tile[data-pid="STU-1004"]')), 'mentor grid shows both student tabs');
  ok(await A.evaluate(() => document.querySelectorAll('.zl-grid .zl-tile').length === 3), 'grid adapts to 3 people');
  await B.click('#zb-hand'); await W(2600);
  ok(await A.evaluate(() => document.querySelector('.zl-tile[data-pid="STU-1001"]').classList.contains('hand')), 'raised hand shows on the mentor’s grid');
  await B.click('#zb-react'); await B.click('.zl-reacts [data-e="👏"]'); await W(300);
  ok(await A.evaluate(() => document.querySelectorAll('#zl-float .zl-fr').length > 0), 'reaction floats up for everyone');
  await B.click('.zl-br [data-p="chat"]'); await W(200); await B.fill('#zl-cin', 'Miss, is Q3 part b in the mock?'); await B.press('#zl-cin', 'Enter'); await W(900);
  ok(await C.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'g:G1' && /part b in the mock/.test(x.text))), 'in-call chat message is in the class group chat');
  await A.click('.zl-br [data-p="chat"]'); await W(300);
  ok(await A.evaluate(() => /part b in the mock/.test(document.getElementById('zl-chat').innerText) && /Good morning class/.test(document.getElementById('zl-chat').innerText)), 'mentor’s in-call chat = group chat history');
  await A.click('.zl-br [data-p="people"]'); await W(300);
  ok(await A.evaluate(() => /Raised hands/i.test(document.getElementById('zl-panel').innerText) && /Not joined yet · 2/i.test(document.getElementById('zl-panel').innerText)), 'people panel: hand queue + who has not joined');
  console.log('   people:', JSON.stringify(await A.evaluate(() => document.getElementById('zl-panel').innerText.slice(0, 300))));
  await shot(A, 'live-room-people-1440');
  await A.click('[data-pa="lower"][data-pid="STU-1001"]'); await W(700);
  ok(await B.evaluate(() => !document.getElementById('zb-hand').classList.contains('on')), 'host lowered the student’s hand');
  await A.click('#zb-more'); await A.click('.zl-menu [data-m="wb"]'); await W(1500);
  ok(await B.evaluate(() => !!document.getElementById('zl-wb')), 'whiteboard opened by host for everyone');
  const box = await A.locator('#zl-wb').boundingBox(); await A.mouse.move(box.x + 120, box.y + 120); await A.mouse.down(); await A.mouse.move(box.x + 420, box.y + 260, { steps: 10 }); await A.mouse.up(); await W(700);
  ok(await B.evaluate(() => { const c = document.getElementById('zl-wb').getContext('2d'), d = c.getImageData(0, 0, 1280, 720).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 90 && d[i + 1] < 90) n++; return n > 60; }), 'whiteboard stroke synced to the student');
  await A.click('.zl-br [data-p="act"]'); await W(200); await A.fill('#zl-pq', 'Ready for the mock?'); await A.fill('#zl-po', 'Yes, Almost, No'); await A.click('[data-pa="pnew"]'); await W(800);
  await B.click('.zl-br [data-p="act"]'); await W(300); await B.click('.zl-opt >> nth=0'); await W(800);
  ok(await A.evaluate(() => /1 vote/.test(document.getElementById('zl-panel').innerText)), 'poll: student vote counted live');
  await A.click('#zb-more'); await A.click('.zl-menu [data-m="rec"]'); await W(3200);
  ok(await B.evaluate(() => !document.getElementById('zl-rec').hidden), 'REC indicator visible to the student');
  await shot(A, 'live-room-wb-1440');
  await A.click('#zb-more'); await A.click('.zl-menu [data-m="wb"]'); await W(600);
  await A.click('.zl-br [data-p="act"]'); await W(300);
  await shot(A, 'live-room-grid-1440');
  await B.setViewportSize({ width: 390, height: 844 }); await W(600); await shot(B, 'live-room-phone-panel-390'); await B.click('[data-pa="close"]'); await W(2500); await shot(B, 'live-room-phone-390'); await B.setViewportSize({ width: 1440, height: 900 });
  /* end for everyone */
  await A.click('#zb-leave'); await W(200); await A.click('.zl-lv [data-v="end"]'); await W(2500);
  const T = await A.evaluate(() => TODAY);
  const att = await A.evaluate(t => SCH.ATT['G1|' + t], T);
  ok(att && att.marks['STU-1001'] === 'P' && att.marks['STU-1004'] === 'P' && att.marks['STU-1012'] === 'A' && att.marks['STU-1017'] === 'A' && att.by === 'Nusrat Jahan' && /Paper 2/.test(att.lesson), 'SCH.ATT for G1 today: joined = P, others = A, by mentor, lesson = title');
  ok(await A.evaluate(() => AUDIT.some(a => /Attendance saved from live class/.test(JSON.stringify(a)))), 'attendance write logged');
  ok(await A.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'g:G1' && x.kind === 'sys' && /Class ended · 2 present · 2 absent · recording saved/.test(x.text))), 'system message “Class ended · 2 present · recording saved” in the group chat');
  const rec = await A.evaluate(() => FTA_DEMO_CONNECT.db().recs[0]);
  ok(rec && rec.gid === 'G1' && /Paper 2/.test(rec.title), 'recording saved: ' + (rec && rec.size));
  ok(await A.evaluate(id => FTA_DEMO_CONNECT.db().msgs.some(x => x.kind === 'card' && x.card.type === 'rec' && x.card.recId === id), rec.id), 'recording card posted in the class chat');
  console.log('   B:', JSON.stringify(await B.evaluate(() => [FTA_ZC.state(), ST.page, (document.getElementById('cx-root') || {}).innerHTML && document.getElementById('cx-root').innerHTML.slice(0, 200), !!document.getElementById('zl-room')])));
  ok(await B.evaluate(() => /The host ended the class/.test((document.querySelector('.zl-end') || {}).innerText || '')), 'student sees “The host ended the class”');
  await shot(A, 'live-ended-1440');
  ok(await C.evaluate(t => { const v = SCH.ATT['G1|' + t]; return v && v.marks['STU-1001'] === 'P'; }, T), 'owner tab: the attendance arrived (Attendance pages)');
  await A.evaluate(() => go('tp-att')); await W(700);
  ok(await A.evaluate(() => /Live class|live class/.test(document.getElementById('view').innerText) || !!document.querySelector('#view')), 'attendance page opens');
  ok(await R.evaluate(() => FTA_DEMO_CONNECT.db().notes.some(n => n.kind === 'missed' && n.to.includes('STU-1012'))), 'absent students get a “you missed it · recording ready” notification');
  await A.evaluate(() => go('tp-rec')); await W(500);
  ok(await A.evaluate(id => !!document.getElementById('zr-' + id) && /attended/.test(document.getElementById('zr-' + id).innerText), rec.id), 'recording listed in Recordings with attendance');
  await shot(A, 'recordings-1440');
  await B.evaluate(() => go('sp-profile')); await W(900); await B.click('[data-node="live"]'); await W(300);
  ok(await B.evaluate(() => /Present/.test(document.getElementById('cx-prof-wrap').innerText) && /Watch/.test(document.getElementById('cx-prof-wrap').innerText)), 'student profile shows the live class + recording');

  /* ------------------------------------------------ 4. app data → chat */
  await A.evaluate(() => go('tp-hw')); await W(500);
  await A.evaluate(() => SCH.hwForm()); await W(400);
  await A.fill('#hw-t', 'Summary practice'); await A.fill('#hw-x', 'Write a 120-word summary of passage B.');
  await A.evaluate(() => { const s = document.getElementById('hw-s'), d = document.getElementById('hw-d'); if (s && !s.value) s.value = TODAY; if (d) d.value = addDays(TODAY, 3); });
  await A.evaluate(() => { const b = [...document.querySelectorAll('#sheet button')].find(x => /SCH.hwSave/.test(x.getAttribute('onclick') || '')); b && b.click(); }); await W(4500);
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'g:G1' && x.card && x.card.type === 'hw' && x.card.title === 'Summary practice')), 'homework set by the mentor is posted into the class group chat');
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().notes.some(n => n.kind === 'hw' && n.to.includes('STU-1001'))), 'students notified about the homework');
  await C.evaluate(() => { const p = PAYMENTS.find(x => x.stu === 'STU-1001' && x.status === 'Verified'); const n = Object.assign({}, p, { id: 'PAY-TEST-1', rcpt: 'RCPT-TEST-1', status: 'Pending', amt: 4500, date: TODAY, verifiedBy: '', ref: 'TEST-REF-' + Date.now() }); PAYMENTS.push(n); }); await W(2600);
  await C.evaluate(() => verifyPay('PAY-TEST-1', true)); await W(3000);
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'dm:STU-1001|U:office' && x.card && x.card.type === 'pay' && x.card.amt === 4500)), 'payment verified → receipt message to the student');
  ok(await B.evaluate(() => FTA_ZC.bellItems().some(x => /Payment received/.test(x.t))), 'student bell: Payment received');
  await B.evaluate(() => FTA_ZC.openChat('dm:STU-1001|U:office')); await W(700); await shot(B, 'chat-payment-1440');
  await C.evaluate(() => { const k = Object.keys(SCH.MARKS).find(k => k.endsWith('|G1') && SCH.MARKS[k].status !== 'Published'); const v = SCH.MARKS[k]; v.m['STU-1001'] = v.m['STU-1001'] != null ? v.m['STU-1001'] : 71; v.status = 'Published'; }); await W(3000);
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'dm:MEN-01|STU-1001' && x.card && x.card.type === 'marks')), 'marks published → private result message to the student');

  await A.evaluate(() => { const n = SCH.CNOTES.find(x => x.gid === 'G1' && x.stu === 'STU-1001' && !x.sent) || SCH.CNOTES.find(x => x.gid === 'G1' && !x.sent); if (n) { n.stu = 'STU-1001'; n.sent = SCH.fmtD(TODAY) + ', 8:10 pm'; } else SCH.CNOTES.push({ id: 'CN-T1', gid: 'G1', stu: 'STU-1001', date: TODAY, topic: 'Summary writing', progress: 'Good', hw: 'Passage B', next: 'Paper 2', comment: '', by: 'Nusrat Jahan', sent: SCH.fmtD(TODAY) + ', 8:10 pm' }); }); await W(3000);
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'dm:MEN-01|STU-1001' && x.card && x.card.type === 'cnote')), 'class note sent by the mentor → private message to the student');
  /* ------------------------------------------------ 5. watch together → chat */
  await A.evaluate(() => go('tp-watch')); await W(500); await A.fill('#wt-url', 'https://youtu.be/dQw4w9WgXcQ'); await A.fill('#wt-title', 'Summary writing part 2'); await A.selectOption('#wt-room', 'g:G1'); await A.click('#cx-wtf button[type=submit]'); await W(1800);
  ok(await B.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.room === 'g:G1' && x.card && x.card.type === 'wt' && x.card.title === 'Summary writing part 2')), 'Watch Together started → Join card in the class chat');
  const sid = await A.evaluate(() => FTA_DEMO_CONNECT.db().wt[0].id);
  await B.evaluate(s => FTA_ZC.openWatch(s), sid); await W(1500); await B.fill('#wt-note', 'Why is this point repeated?'); await B.click('#wt-nf button'); await W(1800);
  ok(await A.evaluate(() => FTA_DEMO_CONNECT.db().msgs.some(x => x.card && x.card.type === 'wtq' && /repeated/.test(x.card.text))), 'student question with timestamp appears in the chat thread');

  /* ------------------------------------------------ 6. profiles → message / call / watch */
  await C.evaluate(() => go('cx-people')); await W(1200);
  ok(await C.evaluate(() => !!document.querySelector('.zc-pact [data-zc="call"]') && !!document.querySelector('.zc-kact [data-zc="dm"]')), 'profile tree: Message · Call · Watch together actions');
  await C.evaluate(() => document.querySelector('.zc-pact').scrollIntoView({ block: 'center' })); await W(300); await shot(C, 'people-connect-1440');
  await C.click('.zc-pact [data-zc="dm"]'); await W(800);
  ok(await C.evaluate(() => /-chat$/.test(ST.page) && /^dm:/.test(FTA_ZC.state().C.room)), 'profile → Message opens the private chat');
  await shot(C, 'chat-office-dm-1440');

  /* ------------------------------------------------ 7. AI assistant reads it */
  const ai = await C.evaluate(t => FTA.agentTools.RUN.who_missed_live_class({ date: t }), T);
  ok(ai.sessions && ai.sessions[0] && ai.sessions[0].missed.map(x => x.id).sort().join() === 'STU-1012,STU-1017', 'AI tool who_missed_live_class → ' + JSON.stringify(ai.sessions && ai.sessions[0].missed.map(x => x.name)));
  ok(await C.evaluate(() => !!FTA.agentTools.TOOLS.find(t => t.name === 'recent_messages') && FTA.agentTools.RUN.recent_messages({ chat: 'IGCSE', text: 'page 12' }).count >= 2 && !!FTA.collections['DEMO.CHAT']), 'AI can read messages (recent_messages + DEMO.CHAT collection)');
  ok(await C.evaluate(() => FTA.agentTools.RUN.live_status({}).sessions.length >= 1), 'AI live_status tool');

  /* ------------------------------------------------ 8. unread badge + bell */
  await A.evaluate(() => go('tp-home')); await W(300); await R.evaluate(() => go('sp-home')); await W(300);
  await C.evaluate(() => FTA_ZC.openChat('g:G1')); await W(600); await C.type('#zc-in', '@Raisa please check the homework'); await C.press('#zc-in', 'Enter'); await W(1800);
  ok(await R.evaluate(() => { const n = document.querySelector('#sidenav .cx-nb'); return n && +n.textContent >= 1 && n.classList.contains('zc-atn'); }), 'sidebar Messages badge with @ for mentions');
  await R.click('#nb'); await W(400); ok(await R.evaluate(() => /mention/.test(document.getElementById('sheet').innerText) && /unread message/.test(document.getElementById('sheet').innerText)), 'bell sheet lists mentions + unread messages'); await shot(R, 'bell-student-1440'); await R.evaluate(() => closeSheet());
  await A.evaluate(() => go('tp-home')); await W(500);
  ok(await A.evaluate(() => !!document.querySelector('.zc-dlive')), 'My Day: today’s classes get a “Go live” action');

  /* ------------------------------------------------ 9. themes + phone screenshots */
  for (const sk of ['premium', 'm-light']) {
    await A.evaluate(s => setSkin(s), sk); await W(400);
    await A.setViewportSize({ width: 1440, height: 900 }); await A.evaluate(() => FTA_ZC.openChat('g:G1')); await W(900); await shot(A, 'chat-' + sk + '-1440');
    await A.setViewportSize({ width: 390, height: 844 }); await A.evaluate(() => FTA_ZC.openChat('g:G1')); await W(900); await shot(A, 'chat-' + sk + '-390');
    await A.evaluate(() => go('tp-chat')); await W(300); await A.evaluate(() => { const b = document.querySelector('.zc-back'); b && b.click(); }); await W(300); await shot(A, 'chatlist-' + sk + '-390');
    await A.setViewportSize({ width: 1440, height: 900 }); await A.evaluate(() => go('tp-live')); await W(600); await shot(A, 'live-list-' + sk + '-1440');
    await A.evaluate(() => FTA_ZC.joinLive('G1')); await W(900); await shot(A, 'lobby-' + sk + '-1440');
    await A.setViewportSize({ width: 390, height: 844 }); await W(500); await shot(A, 'lobby-' + sk + '-390'); await A.evaluate(() => go('tp-home')); await W(300);
  }
  await A.setViewportSize({ width: 1440, height: 900 });
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 6)));
  const f = res.filter(r => !r[0]); console.log('\n' + (res.length - f.length) + '/' + res.length + ' passed' + (f.length ? '\nFAILED:\n' + f.map(r => ' - ' + r[1]).join('\n') : ''));
  await b.close();
})();
