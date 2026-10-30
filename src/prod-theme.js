/* =====================================================================
   prod-theme · FTA Premium is the default look of the live app.
   "FTA Premium" now runs on the new design engine (all new features,
   3D cards, charts, dialogs) with FTA Premium's own colours and fonts:
   skin = midnight engine, palette = premium (html[data-palette]).
   First visit: FTA Premium · dark · English. A person's own choice of
   theme, mode and language is remembered in their browser.
   ===================================================================== */
/* run an inline-handler string without eval (keeps the CSP free of 'unsafe-eval') */
window.__ftaRun = function (code, v) {
  var b = document.createElement('button');
  window.__ftaArg = v;
  b.setAttribute('onclick', '(function(v){' + code + '\n}).call(window,window.__ftaArg)');
  b.click(); window.__ftaArg = undefined;
};
(function () {
  const R = document.documentElement, KEY = 'fta-palette';
  const get = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const put = v => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { } };
  const paint = () => { const p = get(); if (p && SCH.NEW()) R.dataset.palette = p; else delete R.dataset.palette; };
  window.FTA_PALETTE = { get, paint };
  /* setSkin('premium') → new engine + premium palette; any other theme clears the palette */
  const _setSkin = setSkin;
  setSkin = function (k) {
    if (k === 'premium') { put('premium'); const dark = R.dataset.theme !== 'light'; return _setSkin.call(this, dark ? 'm-dark' : 'm-light'), paint(); }
    put(''); const r = _setSkin.apply(this, arguments); paint(); return r;
  };
  const _applyTheme = applyTheme; applyTheme = function () { const r = _applyTheme.apply(this, arguments); paint(); return r; };
  const _setTheme = setTheme; setTheme = function () { const r = _setTheme.apply(this, arguments); paint(); return r; };
  /* theme picker: FTA Premium is "on" when the palette is on; Premium Dark/Light only without it */
  const _themeSheet = themeSheet;
  themeSheet = function () {
    const r = _themeSheet.apply(this, arguments), p = get() === 'premium', sk = skinKey(), th = R.dataset.theme;
    document.querySelectorAll('#sheet .sk').forEach(b => {
      const m = (b.getAttribute('onclick') || '').match(/setSkin\('([^']+)'\)/); if (!m) return; const k = m[1];
      if (k === 'premium') b.classList.toggle('on', p);
      else if (k === 'm-dark' || k === 'm-light') b.classList.toggle('on', !p && sk === 'midnight' && th === (k === 'm-dark' ? 'dark' : 'light'));
      else if (p) b.classList.remove('on');
    });
    return r;
  };
  /* switching the theme from code must not leave the theme picker open (setSkin refreshes the picker) */
  function quiet(f) { const ov = document.getElementById('ov'), was = !!(ov && !ov.hidden); f(); if (!was && typeof closeSheet === 'function') { try { closeSheet(); } catch (e) { } } }
  /* first visit (nothing saved yet): FTA Premium, dark, English */
  let first = false; try { first = !localStorage.getItem('fta-skin') && !localStorage.getItem(KEY); } catch (e) { }
  if (first) {
    try { localStorage.setItem('fta-demo-theme', 'dark'); if (!localStorage.getItem('fta-lang')) localStorage.setItem('fta-lang', 'en'); } catch (e) { }
    if (typeof LANG !== 'undefined' && LANG !== 'en' && typeof setLang === 'function') setLang('en');
    quiet(() => { setTheme('dark'); setSkin('premium'); });
  } else paint();
  /* the old FTA Premium skin key (saved by earlier versions) opens the new FTA Premium */
  if (skinKey() === 'premium') quiet(() => setSkin('premium'));
  /* keep the palette across every render (render wrappers may rewrite the root dataset) */
  const _render = render; render = function () { const r = _render.apply(this, arguments); paint(); return r; };
})();
