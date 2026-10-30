/* Worker A · clock / months / ids checks (test-empty mode on the demo build) */
const { chromium } = require('playwright'); const L = require('./rlib');
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  for (const today of ['', '2027-01-03', '2026-03-31']) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await L.setup(p);
    await p.addInitScript(t => { Object.defineProperty(window, 'FTA_MODE', { value: 'test-empty', writable: false }); if (t) window.FTA_TODAY = t; try { localStorage.clear(); } catch (e) { } }, today);
    await p.goto(L.FILE); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const o = {}; SCH.lgAs('Owner');
      o.today = TODAY; o.cur = CUR; o.months0 = MONTHS.join(',');
      const dh = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10); o.dhaka = dh;
      o.lm = periodRange('lm'); o.lm2 = periodRange('lm2'); o.ty = periodRange('ty');
      /* data arriving from the server that starts 3 months back */
      const ref = MONTHS, m3 = FTA.addM(CUR, -3);
      STUDENTS.push({ id: 'STU-1001', name: 'Test', guardian: '', phone: '', cls: '', board: '', joined: m3 + '-01', status: 'Active', notes: [] });
      INVOICES.push({ id: 'INV-' + m3.slice(0, 4) + '-0007', stu: 'STU-1001', month: m3, issue: m3 + '-01', due: m3 + '-10', status: 'Approved', items: [], adj: 0, adjNote: '', approvedBy: 'x' });
      PAYMENTS.push({ id: 'PAY-0041', rcpt: 'RCP-' + m3.slice(0, 4) + '-0041', stu: 'STU-1001', date: m3 + '-05', amt: 0, acct: 'ACC-CASH', status: 'Verified', alloc: [] });
      render();
      o.same = ref === MONTHS; o.months1 = MONTHS.join(','); o.start = START; o.close = Object.keys(CLOSE).sort().join(','); o.payroll = Object.keys(PAYROLL).sort().join(',');
      o.paySeq = paySeq; o.invSeq = invSeq;
      /* ids never reuse a number */
      PROGS.push({ id: 'PRG-07', name: 'x', fee: 0 }); o.nextPrg = 'PRG-' + String(FTA.n(PROGS, 'PRG-') + 1).padStart(2, '0');
      STUDENTS.push({ id: 'STU-1009', name: 'y', notes: [] }); o.nextStu = 'STU-' + String(1001 + FTA.n(STUDENTS, 'STU-', 1001));
      SCH.BIN.unshift({ id: 'BIN-1', item: { id: 'STU-1015' }, list: STUDENTS }); o.nextStuBin = 'STU-' + String(1001 + FTA.n(STUDENTS, 'STU-', 1001));
      o.binSer = JSON.stringify(FTA.collections['SCH.BIN'].serialize(SCH.BIN[0])); o.binBack = FTA.collections['SCH.BIN'].deserialize(JSON.parse(o.binSer)).list === STUDENTS;
      const pr = PAYROLL[CUR]; const it = { mentor: 'MEN-09', lines: [], gross: 10, bonus: 5, deduct: 3 }; pr.items.push(it); FTA.collections.PAYROLL.restore(JSON.parse(JSON.stringify(pr))); const copy = FTA.collections.PAYROLL.restore(JSON.parse(JSON.stringify(pr))); copy.items.find(x => x.mentor === 'MEN-09').gross = 20; o.net = copy.items.find(x => x.mentor === 'MEN-09').net;
      FTA.resetData(); o.afterReset = [MONTHS.join(','), STUDENTS.length, INVOICES.length, USERS.length, ACCOUNTS.length, MONTHS === ref].join('|');
      o.collNames = Object.keys(FTA.collections).length;
      return o;
    });
    const tag = '[' + (today || 'real clock') + '] ';
    ok(r.today === (today || r.dhaka), tag + 'TODAY = ' + r.today + (today ? '' : ' (Dhaka ' + r.dhaka + ')'));
    ok(r.months0 === r.cur, tag + 'MONTHS starts as [CUR] = ' + r.months0);
    ok(r.lm.months[0] < r.cur && r.lm2.months[0] < r.lm.months[0] && r.lm.to.slice(0, 7) === r.lm.months[0], tag + 'last month ' + r.lm.from + '…' + r.lm.to + ', before ' + r.lm2.from + '…' + r.lm2.to);
    ok(r.ty.from === r.cur.slice(0, 4) + '-01-01' && r.ty.months.every(m => m.startsWith(r.cur.slice(0, 4))), tag + 'this year from ' + r.ty.from + ' months ' + r.ty.months.join(','));
    ok(r.same && r.months1.split(',').length === 4, tag + 'MONTHS grew in place: ' + r.months1 + ' · START ' + r.start);
    ok(r.months1.split(',').every(m => r.close.includes(m)) && r.months1.split(',').every(m => r.payroll.includes(m)), tag + 'CLOSE ' + r.close + ' · PAYROLL ' + r.payroll);
    ok(r.paySeq === 41 && r.invSeq === 7, tag + 'counters follow the data: paySeq ' + r.paySeq + ' invSeq ' + r.invSeq);
    ok(r.nextPrg === 'PRG-08' && r.nextStu === 'STU-1010' && r.nextStuBin === 'STU-1016', tag + 'next ids ' + r.nextPrg + ' ' + r.nextStu + ' ' + r.nextStuBin + ' (bin)');
    ok(r.binBack && /"listName":"STUDENTS"/.test(r.binSer), tag + 'recycle bin entry round-trips: ' + r.binSer);
    ok(r.net === 22, tag + 'payroll net getter after JSON restore = ' + r.net);
    ok(/\|0\|0\|1\|4\|true$/.test(r.afterReset), tag + 'resetData again: ' + r.afterReset + ' · ' + r.collNames + ' collections');
    ok(!errs.length, tag + 'no page errors ' + errs.join(' | '));
    await p.close();
  }
  await b.close(); console.log(bad ? 'FAIL ' + bad : 'ALL OK');
})();
