/* =====================================================================
   FTA Command Centre · API core (one copy, used by the Netlify Function and
   by the in-browser mock backend). It never trusts the browser: it looks up
   the signed-in Gmail in `members`, checks every read and write with
   FTAPolicy, computes the teacher/student tags itself, refuses silent
   overwrites (optimistic concurrency), and writes an audit line per change.
   store = { getMember(email), countOwners(), putMember(m), delMember(email), listMembers(),
             getRecord(c,id), allRecords(c?), recordsSince(iso), putRecord(r) -> r, audit(row) }
   ===================================================================== */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./fta-policy.js'), require('./fta-notify.js')); else root.FTAApiCore = factory(root.FTAPolicy, root.FTANotify); })(typeof self !== 'undefined' ? self : this, function (P, N) {
  'use strict';
  const MAX_BATCH = 200;
  function ctxFor(store, cache) {
    const all = async c => { if (!cache[c]) cache[c] = (await store.allRecords(c)).filter(r => !r.deleted).map(r => r.data); return cache[c]; };
    return { pre: async () => { await all('groups'); await all('enrol'); await all('ox'); }, get: (c, id) => (cache[c] || []).find(x => x && x.id === id) || null, all: c => cache[c] || [] };
  }
  async function me(store, email, env) {
    email = String(email || '').toLowerCase();
    let m = await store.getMember(email);
    const owner = String((env && env.OWNER_EMAIL) || '').toLowerCase();
    if (owner && email === owner && (!m || m.role !== 'Owner' || !m.active)) {
      m = Object.assign({}, m || {}, { email, role: 'Owner', active: true, name: (m && m.name) || 'Owner', created_by: 'bootstrap' });
      await store.putMember(m); await store.audit({ email, action: 'owner-bootstrap', collection: 'members', record_id: email });
    }
    return m && m.active ? m : null;
  }
  async function handle(store, email, body, env) {
    const now = Date.now();
    if (!email) return { status: 401, body: { error: 'Please sign in again' } };
    const m = await me(store, email, env);
    const a = body && body.action;
    if (a === 'me') return { status: 200, body: { member: m } };
    if (!m) return { status: 403, body: { error: 'This Gmail is not on the academy list. Ask the Owner to add it.' } };
    if (a === 'pull') {
      const rows = body.since ? await store.recordsSince(body.since) : await store.allRecords();
      const out = []; let max = body.since || '';
      rows.forEach(r => { if (r.updated_at > max) max = r.updated_at; if (r.deleted) { if (body.since) out.push({ c: r.collection, id: r.id, deleted: true, at: r.updated_at }); return; } const d = P.read(m, r); if (d != null) out.push({ c: r.collection, id: r.id, data: d, at: r.updated_at }); else if (body.since) out.push({ c: r.collection, id: r.id, deleted: true, at: r.updated_at }); });
      const files = await signRefs(store, out);
      return { status: 200, body: { records: out, cursor: max, member: m, files } };
    }
    if (a === 'push') {
      const FIRST = { groups: 0, enrol: 1, ox: 2 }, rank = c => FIRST[c] !== undefined ? FIRST[c] : 9;
      const list = (body.changes || []).slice(0, MAX_BATCH).map((x, i) => [x, i]).sort((a, b) => rank(a[0].c) - rank(b[0].c) || a[1] - b[1]).map(x => x[0]);
      const cache = {}, ctx = ctxFor(store, cache); await ctx.pre();
      const res = [], moved = { stu: new Set(), gid: new Set() }, done = [];
      for (const ch of list) {
        const c = String(ch.c || ''), id = String(ch.id || ''), data = ch.data === undefined ? null : ch.data;
        try {
          const old = await store.getRecord(c, id);
          /* 1. may this person make this change at all? */
          const w = P.write(m, c, id, data, old, ctx, now);
          if (!w.ok) { res.push({ c, id, status: 'rejected', reason: w.reason, data: old && !old.deleted ? P.read(m, old) : null, at: old && old.updated_at }); continue; }
          /* 2. did someone else change it since this person last saw it? (never overwrite silently) */
          if (old && !old.deleted && ch.base !== undefined && ch.base !== old.updated_at && !w.ignore) {
            if (!(ch.base === null && data && JSON.stringify(old.data) === JSON.stringify(data))) { const d = P.read(m, old); res.push({ c, id, status: 'conflict', data: d, at: old.updated_at, by: old.updated_by }); continue; }
          }
          if (w.ignore) { res.push({ c, id, status: 'ignored', data: old && !old.deleted ? P.read(m, old) : null, at: old && old.updated_at }); continue; }
          const del = w.data == null, tg = del ? { mentor_ids: (old && old.mentor_ids) || [], student_ids: (old && old.student_ids) || [] } : P.tags(c, id, w.data, ctx);
          const row = await store.putRecord({ collection: c, id, data: del ? (old ? old.data : {}) : w.data, deleted: del, mentor_ids: tg.mentor_ids, student_ids: tg.student_ids, updated_by: m.email });
          if (cache[c]) { const i = cache[c].findIndex(x => x && x.id === id); if (del) { if (i > -1) cache[c].splice(i, 1); } else if (i > -1) cache[c][i] = w.data; else cache[c].push(w.data); }
          if (c === 'groups' || c === 'enrol') { [old && old.data, w.data].forEach(d => { if (!d) return; (d.stu ? [].concat(d.stu) : []).forEach(x => moved.stu.add(x)); }); if (c === 'groups') moved.gid.add(id); }
          await store.audit({ email: m.email, role: m.role, action: del ? 'delete' : old && !old.deleted ? 'update' : 'create', collection: c, record_id: id });
          res.push({ c, id, status: 'ok', at: row.updated_at, data: w.merged ? P.read(m, row) : undefined });
          if (N && N.watched(c) && !del) done.push({ c, id, prev: old && !old.deleted ? old.data : null, next: w.data, tg });
        } catch (e) { res.push({ c, id, status: 'error', reason: String(e && e.message || e).slice(0, 200) }); }
      }
      if (moved.stu.size || moved.gid.size) { try { await retag(store, ctx, moved); } catch (e) { /* tags are refreshed again on the next change */ } }
      /* notifications: queued for every person concerned, then sent at once (leftovers go out on the next scheduled run) */
      if (N && done.length && store.enqueue) { try { const q = await N.plan(store, m, done, cache); if (q.length) await N.drain(store, 3500); } catch (e) { /* a notification problem must never block a save */ } }
      return { status: 200, body: { results: res } };
    }
    if (a === 'upload') {
      /* a signed, one-time upload slot in the private `files` bucket; the record that uses the
         file is checked like any other record, and only people who may read that record get a link */
      if (!store.signUpload) return { status: 501, body: { error: 'File storage is not set up' } };
      if (m.role === 'Viewer') return { status: 403, body: { error: 'Viewers cannot upload files' } };
      const f = body.file || {}, size = +f.size || 0, type = String(f.type || '').toLowerCase();
      if (!size || size > MAX_FILE) return { status: 200, body: { ok: false, reason: 'Files can be up to 25 MB' } };
      if (!FILE_TYPES.test(type)) return { status: 200, body: { ok: false, reason: 'This file type is not allowed' } };
      const ext = (EXT[type] || (type.split('/')[1] || 'bin').replace(/[^a-z0-9]/g, '').slice(0, 8));
      const path = (m.role === 'Student' ? 'students/' : m.role === 'Mentor' ? 'teachers/' : 'office/') + new Date(now).toISOString().slice(0, 7) + '/' + rnd() + '.' + ext;
      const t = await store.signUpload(path, type);
      await store.audit({ email: m.email, role: m.role, action: 'file-upload', collection: 'files', record_id: path });
      return { status: 200, body: { ok: true, path, token: t.token, url: t.url } };
    }
    if (a === 'members') { if (!P.canListMembers(m)) return { status: 403, body: { error: 'Not allowed' } }; return { status: 200, body: { members: await store.listMembers() } }; }
    if (a === 'member') {
      const t = body.member || {}, email2 = String(t.email || '').toLowerCase(), prev = await store.getMember(email2);
      const w = P.memberWrite(m, Object.assign({}, t, { email: email2 }), prev);
      if (!w.ok) return { status: 200, body: { ok: false, reason: w.reason } };
      if ((t.deleted || t.active === false) && store.delSubsFor) { try { await store.delSubsFor(email2); } catch (e) { } }   /* no notifications to removed people */
      if (t.deleted) { await store.delMember(email2); await store.audit({ email: m.email, role: m.role, action: 'member-remove', collection: 'members', record_id: email2 }); return { status: 200, body: { ok: true } }; }
      if (prev && prev.active && m.role === 'Mentor') return { status: 200, body: { ok: true, member: prev } };
      const row = Object.assign({}, prev || {}, pick(w.data, ['email', 'role', 'name', 'mentor_id', 'student_id', 'active']), { created_by: (prev && prev.created_by) || m.email });
      if (row.active === undefined) row.active = true;
      await store.putMember(row); await store.audit({ email: m.email, role: m.role, action: prev ? 'member-update' : 'member-add', collection: 'members', record_id: email2 });
      return { status: 200, body: { ok: true, member: row } };
    }
    /* ---------- notifications on this device ---------- */
    if (/^push/.test(a || '')) {
      if (!N || !store.putSub) return { status: 501, body: { error: 'Notifications are not set up on the server' } };
      if (a === 'pushKey') { const v = await store.vapid(); return { status: 200, body: { key: v.publicKey } }; }
      if (a === 'pushSub') {
        const s = body.sub || {}, bad = N.subOk(s); if (bad) return { status: 200, body: { ok: false, reason: bad } };
        const mine = (await store.mySubs(m.email)).filter(x => x.endpoint !== s.endpoint).sort((x, y) => String(x.updated_at || '').localeCompare(String(y.updated_at || '')));
        for (const x of mine.slice(0, Math.max(0, mine.length - 9))) await store.delSub(x.endpoint);          /* at most 10 devices per person */
        const prev = await store.getSub(s.endpoint);
        await store.putSub({ endpoint: s.endpoint, email: m.email, p256dh: s.keys.p256dh, auth: s.keys.auth, prefs: N.cleanPrefs(body.prefs || (prev && prev.email === m.email ? prev.prefs : {})), ua: String(body.ua || '').slice(0, 200), fails: 0 });
        if (!prev || prev.email !== m.email) await store.audit({ email: m.email, role: m.role, action: 'push-on', collection: 'devices', record_id: String(body.ua || '').slice(0, 60) });
        return { status: 200, body: { ok: true } };
      }
      const own = async () => { const x = await store.getSub(String(body.endpoint || '')); return x && x.email === m.email ? x : null; };
      if (a === 'pushOff') { const x = await own(); if (x) await store.delSub(x.endpoint); return { status: 200, body: { ok: true } }; }
      if (a === 'pushPrefs') { const x = await own(); if (!x) return { status: 200, body: { ok: false, reason: 'This device is not signed up for notifications' } }; await store.putSub(Object.assign({}, x, { prefs: N.cleanPrefs(body.prefs) })); return { status: 200, body: { ok: true } }; }
      if (a === 'pushMine') return { status: 200, body: { devices: (await store.mySubs(m.email)).map(x => ({ ua: x.ua, since: x.created_at, last: x.last_ok, prefs: N.cleanPrefs(x.prefs), me: x.endpoint === body.endpoint })) } };
      if (a === 'pushTest') {
        const x = await own(); if (!x) return { status: 200, body: { ok: false, reason: 'Turn notifications on for this device first' } };
        const v = await store.vapid(), p = N.payload({ c: 'test', cat: 'office', title: 'Notifications are on', body: 'Final Touch Academy will let you know here.', tag: 'test' }, m);
        const r = await store.sendPush(x, JSON.stringify(p), v, { urgency: 'high' });
        if (r.gone) await store.delSub(x.endpoint);
        return { status: 200, body: { ok: !!r.ok, reason: r.ok ? '' : r.gone ? 'This device turned notifications off. Turn them on again.' : 'The push service did not answer. Try again in a minute.' } };
      }
    }
    return { status: 400, body: { error: 'Unknown action' } };
  }
  /* a class group or enrolment changed: refresh who may see the records that depend on it */
  async function retag(store, ctx, moved) {
    const same = (a, b) => JSON.stringify((a || []).slice().sort()) === JSON.stringify((b || []).slice().sort());
    const jobs = [['students', r => moved.stu.has(r.id)], ['sport', r => moved.stu.has(r.data && r.data.stu)], ['prr', r => moved.stu.has(String(r.id).split('|')[0])]];
    if (moved.gid.size) ['att', 'attx', 'marks', 'hw', 'cnotes', 'rt', 'pend', 'ox', 'oxatt'].forEach(c => jobs.push([c, r => { const d = r.data || {}, ids = [].concat(d.gid || [], d.gids || [], String(r.id).split('|')); return ids.some(g => moved.gid.has(g)); }]));
    for (const [c, hit] of jobs) {
      for (const r of await store.allRecords(c)) {
        if (r.deleted || !hit(r)) continue;
        const tg = P.tags(c, r.id, r.data, ctx);
        if (same(tg.mentor_ids, r.mentor_ids) && same(tg.student_ids, r.student_ids)) continue;
        await store.putRecord({ collection: c, id: r.id, data: r.data, deleted: false, mentor_ids: tg.mentor_ids, student_ids: tg.student_ids, updated_by: r.updated_by });
      }
    }
  }
  const MAX_FILE = 25 * 1024 * 1024;
  const FILE_TYPES = /^(image\/(png|jpe?g|webp|gif|heic|heif)|application\/pdf|audio\/[a-z0-9.+-]+|video\/(mp4|webm|quicktime|x-m4v)|application\/(msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.ms-excel|vnd\.ms-powerpoint)|text\/plain)$/;
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'text/plain': 'txt' };
  function rnd() { let r = ''; const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; const a = new Uint8Array(20); (typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : require('crypto').webcrypto).getRandomValues(a); a.forEach(x => r += c[x % 36]); return r; }
  /* links (valid 3 days) for every file the person may see in the records they received */
  async function signRefs(store, out) {
    if (!store.signDownload) return {};
    const paths = new Set();
    out.forEach(r => { if (r.data) (JSON.stringify(r.data).match(/"fta-file:[a-z0-9\/._-]+"/g) || []).forEach(x => paths.add(x.slice(10, -1))); });
    if (!paths.size) return {};
    const list = [...paths], files = {};
    for (let i = 0; i < list.length; i += 100) Object.assign(files, await store.signDownload(list.slice(i, i + 100), 3 * 86400));
    return files;
  }
  function pick(o, ks) { const r = {}; ks.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; }
  return { handle, me, retag };
});
