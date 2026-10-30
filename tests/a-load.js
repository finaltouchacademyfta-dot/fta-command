const { chromium } = require('playwright'); const L = require('./rlib');
(async () => {
  const b = await chromium.launch();
  for (const [url, mode] of [[process.env.PV, null], [process.env.PV, 'test-empty'], ['file:///home/claude/prod/site-mock/index.html', null]]) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    await L.setup(p); if (mode) await p.addInitScript(m => { window.FTA_MODE = m; }, mode);
    await p.goto(url); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ mode: window.FTA_MODE, today: TODAY, months: MONTHS.join(','), stu: STUDENTS.length, pay: PAYMENTS.length, users: USERS.map(u => u.name).join('|'), coll: window.FTA && FTA.collections ? Object.keys(FTA.collections).length : 0 }));
    console.log(JSON.stringify(r), errs.slice(0, 8));
    await p.close();
  }
  await b.close();
})();
