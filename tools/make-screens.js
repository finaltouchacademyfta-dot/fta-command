// Screenshots for the install dialog (Chrome shows them when someone installs FTA).
// node tools/make-screens.js   (needs Playwright; uses the demo build with sample data)
const { chromium } = require('playwright'); const path = require('path');
let L = { setup: async () => { } }; try { L = require('../tests/rlib'); } catch (e) { }
const FILE = 'file://' + path.join(__dirname, '..', 'site-demo', 'index.html'), OUT = path.join(__dirname, '..', 'public', 'icons');
(async () => {
  const b = await chromium.launch();
  for (const [name, vp, scale] of [['screen-wide.png', { width: 1280, height: 800 }, 1], ['screen-phone.png', { width: 390, height: 844 }, 2]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: scale, isMobile: scale > 1, hasTouch: scale > 1 });
    await L.setup(p); await p.goto(FILE); await p.waitForTimeout(1500);
    await p.evaluate(() => { try { SCH.enter('Owner', USERS[0]); } catch (e) { } try { go(R_().pages[0]); } catch (e) { } window.scrollTo(0, 0); });
    await p.waitForTimeout(3600); await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; }); await p.screenshot({ path: path.join(OUT, name) }); await p.close(); console.log('icons/' + name);
  }
  await b.close();
})();
