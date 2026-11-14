/* FTA · fixed size on phones: block pinch-zoom (iOS Safari ignores user-scalable). No visual change. */
(function () {
  'use strict';
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();
