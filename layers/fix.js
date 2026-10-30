/* ===== v9 fix layer (worker X) ===== */
const V9X = window.V9X = {};
/* table cells that hold only a date or an amount never wrap */
V9X.re = /^(\d{1,2}\s[A-Z][a-z]{2,8}\s\d{4}|[A-Z][a-z]{2,8}\s\d{4}|\d{4}-\d{2}(-\d{2})?|(−\s?)?(BDT|৳|Tk)\s?[\d,.০-৯]+|[\d,.]+%)$/;
V9X.scan = () => {
  if (!SCH.NEW()) return;
  document.querySelectorAll('td:not([data-v9x]),th:not([data-v9x])').forEach(c => { c.dataset.v9x = 1; const t = c.textContent.replace(/ /g, ' ').trim(); if (t.length && t.length <= 22 && V9X.re.test(t)) c.classList.add('v9x-nw'); });
};
V9X.mo = new MutationObserver(() => { cancelAnimationFrame(V9X.raf); V9X.raf = requestAnimationFrame(V9X.scan); });
V9X.mo.observe(document.body, { childList: true, subtree: true });
