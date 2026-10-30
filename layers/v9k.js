/* v9k · the menu uses the square emblem in the new skins so the logo sits crisp in its tile */
const V9K = window.V9K = {};
V9K.logo = () => { if (typeof LOGO_EM === 'undefined') return; const on = SCH.NEW(); document.querySelectorAll('#side .brand .logo img, #mlogo img').forEach(i => { const want = on ? LOGO_EM : LOGO_FULL; if (i.src !== want) i.src = want; }); };
V9K._render = render; render = function () { const r = V9K._render.apply(this, arguments); V9K.logo(); return r; };
V9K._setSkin = setSkin; setSkin = function () { const r = V9K._setSkin.apply(this, arguments); V9K.logo(); return r; };
V9K.logo();
