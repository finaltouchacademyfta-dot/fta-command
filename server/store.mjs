// =====================================================================
// FTA · the Supabase store used by the Netlify functions (server only).
// Talks to Supabase REST with the service-role key; nothing here runs in
// the browser. Shared by netlify/functions/api.mjs and notify-tick.mjs.
// =====================================================================
import { makeVapidKeys, sendPush } from './webpush.mjs';

/* the project address, even if pasted with a path or spaces (…supabase.co/rest/v1/ → …supabase.co) */
export function cleanUrl(u) { u = String(u || '').trim(); try { const x = new URL(u); return x.protocol === 'https:' ? x.origin : u.replace(/\/+$/, ''); } catch (e) { return u.replace(/\/+$/, ''); } }
/* what kind of Supabase key this is (never returns the key itself) */
export function keyInfo(k) {
  k = String(k || '').trim();
  if (!k) return { kind: 'missing' };
  if (/^sb_secret_/.test(k)) return { kind: 'secret' };
  if (/^sb_publishable_/.test(k)) return { kind: 'publishable' };
  try { const p = JSON.parse(Buffer.from(k.split('.')[1] || '', 'base64url').toString('utf8')); return { kind: p.role === 'service_role' ? 'legacy-service' : p.role === 'anon' ? 'legacy-anon' : 'unknown', ref: p.ref || '' }; } catch (e) { return { kind: 'unknown' }; }
}
/* headers for the server key: new secret keys (sb_secret_…) go ONLY in `apikey` (Supabase rule);
   the older service_role JWT also goes in Authorization, as before */
export function keyHeaders(k) { k = String(k || '').trim(); return /^sb_/.test(k) ? { apikey: k } : { apikey: k, Authorization: 'Bearer ' + k }; }

export function makeStore(env = process.env) {
  const URL0 = cleanUrl(env.SUPABASE_URL);
  const KEY = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const H = { ...keyHeaders(KEY), 'Content-Type': 'application/json' };
  const enc = encodeURIComponent;
  const inList = a => '(' + a.map(x => '"' + String(x).replace(/["\\]/g, '') + '"').join(',') + ')';

  async function rest(path, opt = {}) {
    const r = await fetch(URL0 + '/rest/v1/' + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
    if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  async function pageAll(path) {
    const out = []; let from = 0; const step = 1000;
    for (;;) {
      const r = await fetch(URL0 + '/rest/v1/' + path, { headers: { ...H, Range: from + '-' + (from + step - 1), 'Range-Unit': 'items' } });
      if (!r.ok && r.status !== 206) throw new Error('db ' + r.status + ' ' + (await r.text()).slice(0, 200));
      const rows = await r.json(); out.push(...rows); if (rows.length < step) break; from += step;
    }
    return out;
  }
  async function setting(k) { try { const r = await rest('app_settings?key=eq.' + enc(k) + '&select=value'); return (r[0] || {}).value || ''; } catch (e) { return ''; } }
  let VAPID = null;

  const store = {
    ready: !!(URL0 && KEY), url: URL0, key: KEY, setting,
    getMember: async e => ((await rest('members?email=eq.' + enc(e) + '&select=*')) || [])[0] || null,
    putMember: async m => (await rest('members?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(m) }))[0],
    delMember: async e => rest('members?email=eq.' + enc(e), { method: 'DELETE' }),
    listMembers: async () => rest('members?select=*&order=role,email'),
    getRecord: async (c, id) => ((await rest('records?collection=eq.' + enc(c) + '&id=eq.' + enc(id) + '&select=*')) || [])[0] || null,
    allRecords: async c => pageAll('records?select=*&order=collection,id' + (c ? '&collection=eq.' + enc(c) : '')),
    recordsSince: async iso => pageAll('records?select=*&order=updated_at&updated_at=gt.' + enc(iso)),
    putRecord: async r => (await rest('records?on_conflict=collection,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(r) }))[0],
    /* private bucket `files`: one-time upload slots and short-lived download links */
    signUpload: async path => {
      const r = await fetch(URL0 + '/storage/v1/object/upload/sign/files/' + path.split('/').map(enc).join('/'), { method: 'POST', headers: H, body: '{}' });
      if (!r.ok) throw new Error('storage ' + r.status + ' ' + (await r.text()).slice(0, 200));
      const j = await r.json(), u = new URL(URL0 + '/storage/v1' + j.url);
      return { url: u.toString(), token: u.searchParams.get('token') };
    },
    signDownload: async (paths, expiresIn) => {
      const r = await fetch(URL0 + '/storage/v1/object/sign/files', { method: 'POST', headers: H, body: JSON.stringify({ expiresIn, paths }) });
      if (!r.ok) return {};
      const out = {}; (await r.json()).forEach(x => { if (x && x.signedURL && !x.error) out[x.path] = URL0 + '/storage/v1' + x.signedURL; });
      return out;
    },
    audit: async row => { try { await rest('audit_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); } catch (e) { /* never block a save on the audit line */ } },

    /* ---------- notifications ---------- */
    /* signing keys: from Netlify env if given, otherwise made once and kept (server-only) in app_settings */
    vapid: async () => {
      if (VAPID) return VAPID;
      const subject = 'mailto:' + ((env.OWNER_EMAIL || (await setting('owner_email')) || 'admin@example.com').trim());
      if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) return (VAPID = { publicKey: env.VAPID_PUBLIC_KEY.trim(), privateKey: env.VAPID_PRIVATE_KEY.trim(), subject });
      let v = await setting('vapid');
      if (!v) {
        const k = makeVapidKeys();
        await rest('app_settings?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ key: 'vapid', value: JSON.stringify(k) }) });
        v = await setting('vapid');                       /* whoever wrote first wins; everyone uses the same keys */
      }
      const k = JSON.parse(v); return (VAPID = { publicKey: k.publicKey, privateKey: k.privateKey, subject });
    },
    getSub: async ep => ((await rest('push_subs?endpoint=eq.' + enc(ep) + '&select=*')) || [])[0] || null,
    putSub: async s => (await rest('push_subs?on_conflict=endpoint', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(s) }))[0],
    delSub: async ep => rest('push_subs?endpoint=eq.' + enc(ep), { method: 'DELETE' }),
    delSubsFor: async e => rest('push_subs?email=eq.' + enc(e), { method: 'DELETE' }),
    mySubs: async e => rest('push_subs?email=eq.' + enc(e) + '&select=*&order=updated_at'),
    subsFor: async emails => emails.length ? rest('push_subs?select=*&email=in.' + enc(inList(emails))) : [],
    enqueue: async rows => { for (let i = 0; i < rows.length; i += 500) await rest('push_queue', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows.slice(i, i + 500)) }); },
    /* a retried row is claimable again about a minute later (not in the same run) */
    /* claim waiting rows atomically (a second runner gets only the rows nobody claimed); stale claims are picked up again after 5 minutes */
    claimQueue: async n => {
      const stale = new Date(Date.now() - 5 * 60e3).toISOString(), open = 'or=' + enc('(claimed_at.is.null,claimed_at.lt.' + stale + ')');
      const ids = (await rest('push_queue?select=id&' + open + '&order=created_at&limit=' + n)).map(r => r.id);
      if (!ids.length) return [];
      return rest('push_queue?id=in.(' + ids.join(',') + ')&' + open, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ claimed_at: new Date().toISOString() }) });
    },
    doneQueue: async ids => rest('push_queue?id=in.(' + ids.map(Number).join(',') + ')', { method: 'DELETE' }),
    retryQueue: async ids => { for (const id of ids) { const r = (await rest('push_queue?id=eq.' + Number(id) + '&select=tries'))[0]; if (r) await rest('push_queue?id=eq.' + Number(id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ claimed_at: new Date(Date.now() - 4 * 60e3).toISOString(), tries: (r.tries || 0) + 1 }) }); } },
    /* true the first time a key is seen (reminders are sent once) */
    sentOnce: async key => ((await rest('push_sent?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ key }) })) || []).length > 0,
    sendPush: async (sub, payload, vapid, opts) => {
      const r = await sendPush(sub, payload, vapid, opts);
      try { if (r.ok) await rest('push_subs?endpoint=eq.' + enc(sub.endpoint), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_ok: new Date().toISOString(), fails: 0 }) }); } catch (e) { }
      return r;
    },
    /* housekeeping: old reminder keys, stuck queue rows */
    cleanup: async () => {
      try { await rest('push_sent?at=lt.' + enc(new Date(Date.now() - 40 * 864e5).toISOString()), { method: 'DELETE' }); } catch (e) { }
      try { await rest('push_queue?created_at=lt.' + enc(new Date(Date.now() - 2 * 864e5).toISOString()), { method: 'DELETE' }); } catch (e) { }
    }
  };
  return store;
}
