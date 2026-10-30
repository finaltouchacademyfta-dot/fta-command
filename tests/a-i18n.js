const { chromium } = require('playwright'); const L = require('./rlib');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); await L.setup(p);
  await p.addInitScript(() => { Object.defineProperty(window, 'FTA_MODE', { value: 'test-empty', writable: false }); });
  await p.goto(L.FILE); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const o = []; const t = (lang, k) => { const old = LANG; LANG = lang; const v = i18nGet(k, 0); LANG = old; return v; };
    [['en', 'October closing বাকি'], ['bn', 'October closing বাকি'], ['en', 'নতুন ভর্তি (Sep–Oct)'], ['en', 'নতুন ভর্তি (Oct–Nov)'], ['en', 'Recurring খরচের draft · December'], ['en', 'শেষ sync: 29 Oct 2026, 14:05'], ['bn', 'Live · cloud sync'], ['en', 'advance এর চেয়ে বেশি refund এর আগে invoice থেকে allocation সরাতে হবে'], ['bn', 'Add a student first'], ['en', 'December draft'], ['bn', 'December draft']].forEach(([l, k]) => o.push(l + ' | ' + k + ' → ' + t(l, k)));
    return o.join('\n'); });
  console.log(r); await b.close();
})();
