// =====================================================================
// FTA · scheduled every 5 minutes (Netlify Scheduled Function).
//   · reminders: calendar events (their own "remind me" time), online exams
//     opening within 30 minutes, homework due tomorrow (evening)
//   · sends anything still waiting (e.g. a push service was busy)
//   · tidies old reminder keys
// No browser can call this; Netlify runs it on the schedule below.
// =====================================================================
import N from '../../public/vendor/fta-notify.js';
import { makeStore } from '../../server/store.mjs';

export default async () => {
  const store = makeStore(process.env);
  if (!store.ready) { console.log('notify-tick: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing'); return; }
  try {
    const q = await N.remind(store, Date.now());
    const r = await N.drain(store, 20000);
    if (new Date().getUTCMinutes() < 5) await store.cleanup();
    console.log('notify-tick: reminders ' + q.length + ', sent ' + r.sent + ', forgotten devices ' + (r.gone || 0));
  } catch (e) { console.error('notify-tick', e); }
};
export const config = { schedule: '*/5 * * * *' };
