# Worker C · theme patches. Each (old, new) must match the app source exactly once.
PATCHES = [
    # no eval: run handler strings as inline handlers (allowed by 'unsafe-inline'; lets the CSP drop 'unsafe-eval')
    ("  try { new Function('v', onch)(v); } catch (e) { }\n};",
     "  try { __ftaRun(onch, v); } catch (e) { }\n};"),
    ("const run = () => { XC.tipHide(); new Function(g.dataset.go)(); };",
     "const run = () => { XC.tipHide(); __ftaRun(g.dataset.go); };"),
    ("try { new Function(go)(); } catch (e) { console.error(e); } };",
     "try { __ftaRun(go); } catch (e) { console.error(e); } };"),
    # Premium Light / Premium Dark / FTA Premium light: keep the person's saved light/dark mode after a reload
    # (the engine forced every "midnight" visit back to dark)
    ("if (SCH.NEWSKINS.includes(sk)) { SCH.useIcons(true); SCH._setTheme(SCH.DARKS.includes(sk) ? 'dark' : 'light'); } render(); })();",
     "if (SCH.NEWSKINS.includes(sk)) { SCH.useIcons(true); let t0 = ''; try { t0 = localStorage.getItem('fta-demo-theme') || ''; } catch (e) { } SCH._setTheme(sk === 'midnight' && (t0 === 'light' || t0 === 'dark') ? t0 : (SCH.DARKS.includes(sk) ? 'dark' : 'light')); } render(); })();"),
]
# __ftaRun is defined in prod-theme.js (runs at load, before any click can call it)
