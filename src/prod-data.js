/* =====================================================================
   FTA Command Centre · production data layer (live app and mock build)
   · Sign in with Google (Supabase Auth). Only a Gmail on the academy's
     member list can open the app; its role comes from that list.
   · Loads the academy's records from the server (Netlify Function /api),
     fills the app, and saves every change back: debounced, batched,
     retried with backoff, kept on this device while offline.
   · The server checks every read and write (vendor/fta-policy.js);
     a refused change is undone here with a short message.
   · FTA_CONFIG.mock = true runs the same server code in the browser
     (vendor/fta-api-core.js on localStorage) for the automated tests.
   Never runs in the demo build.
   ===================================================================== */
(function () {
  'use strict';
  if (window.FTA_MODE === 'demo') return;
  const CFG = window.FTA_CONFIG || {}, MOCK = !!CFG.mock;
  const FTA = window.FTA = window.FTA || {};
  const API = CFG.apiUrl || '/api';
  const $id = x => document.getElementById(x);
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = f => { try { return f(); } catch (e) { return undefined; } };
  const say = (t, ms) => { try { toast(t); if (ms) { clearTimeout(toast.t); toast.t = setTimeout(() => { const e = $id('toast'); if (e) e.hidden = true; }, ms); } } catch (e) { } };
  const rid = () => Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } };
  const loadScript = src => new Promise((ok, no) => { if (document.querySelector('script[data-fta="' + src + '"]')) return ok(); const s = document.createElement('script'); s.src = src; s.dataset.fta = src; s.onload = ok; s.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(s); });

  /* =========================================================
     1. THE COLLECTIONS (what is saved, and where it lives in the app)
     kind: arr = list of records (key field), map = object of key → record,
     one = the whole value is one record. config = has built-in defaults
     that stay until the Owner saves their own.
     ========================================================= */
  const fillArr = a => v => { const t = a(); if (!t) return; t.length = 0; (Array.isArray(v) ? v : []).forEach(x => t.push(x)); };
  const fillObj = a => v => { const t = a(); if (!t) return; Object.keys(t).forEach(k => delete t[k]); Object.assign(t, v || {}); };
  const NET = { get() { return (this.gross || 0) + (this.bonus || 0) - (this.deduct || 0); }, enumerable: true, configurable: true };
  /* canonical collection name → where it lives. The names are the server's
     (vendor/fta-policy.js decides who may read and write each one). `v` is
     the variable name used by worker A's registry (FTA.collections, keyed by
     that name); when A's entry exists its getter and hooks are used. */
  const L = (c, v, get, o) => Object.assign({ c, v, kind: 'arr', key: 'id', get }, o || {});
  const M = (c, v, get, o) => Object.assign({ c, v, kind: 'map', get }, o || {});
  const O = (c, v, get, set, o) => Object.assign({ c, v, kind: 'one', get, set }, o || {});
  const TABLE = [
    /* people */
    L('students', 'STUDENTS', () => STUDENTS), L('enrol', 'ENROL', () => ENROL), L('mentors', 'MENTORS', () => MENTORS), L('progs', 'PROGS', () => PROGS), L('batches', 'BATCHES', () => BATCHES),
    L('sport', 'SCH.SPORT', () => SCH.SPORT, { key: 'stu' }), L('pend', 'SCH.PEND', () => SCH.PEND),
    /* money */
    L('invoices', 'INVOICES', () => INVOICES), L('payments', 'PAYMENTS', () => PAYMENTS), L('advapp', 'ADVAPP', () => ADVAPP), L('refunds', 'REFUNDS', () => REFUNDS),
    L('expenses', 'EXPENSES', () => EXPENSES), L('transfers', 'TRANSFERS', () => TRANSFERS), L('others', 'OTHERS', () => OTHERS), L('prpay', 'PRPAY', () => PRPAY),
    L('accounts', 'ACCOUNTS', () => ACCOUNTS, { config: true }), L('follow', 'FOLLOW', () => FOLLOW),
    M('payroll', 'PAYROLL', () => PAYROLL, { decode: run => { (run && run.items || []).forEach(it => { delete it.net; Object.defineProperty(it, 'net', NET); }); return run; } }),
    M('close', 'CLOSE', () => CLOSE), M('recon', 'RECON', () => RECON), M('bonus', 'BONUS', () => BONUS), M('deduct', 'DEDUCT', () => DEDUCT), M('adv', 'ADV', () => ADV),
    M('methods', 'METHOD', () => METHOD, { config: true }), M('budget', 'BUDGET', () => BUDGET), M('shares', 'V9S.SH', () => V9S.SH), M('mst', 'V9L.MST', () => V9L.MST),
    O('expcats', 'EXP_CATS', () => EXP_CATS, fillArr(() => EXP_CATS), { config: true }), O('paymethods', 'PAY_METHODS', () => PAY_METHODS, fillArr(() => PAY_METHODS), { config: true }),
    O('checks', 'CHECKS', () => CHECKS, fillArr(() => CHECKS), { config: true }), L('mstatus', 'V9L.ST', () => V9L.ST, { key: 'n', config: true }),
    /* school */
    L('classes', 'SCH.CLASSES', () => SCH.CLASSES), L('groups', 'SCH.GROUPS', () => SCH.GROUPS), L('rt', 'SCH.RT', () => SCH.RT), M('rout', 'SCH.ROUT', () => SCH.ROUT, { config: true }),
    M('att', 'SCH.ATT', () => SCH.ATT), M('attx', 'SCH.ATTX', () => SCH.ATTX), L('hw', 'SCH.HW', () => SCH.HW), L('exams', 'SCH.EXAMS', () => SCH.EXAMS), M('marks', 'SCH.MARKS', () => SCH.MARKS),
    L('cnotes', 'SCH.CNOTES', () => SCH.CNOTES), L('leave', 'SCH.LEAVE', () => SCH.LEAVE), L('snotices', 'SCH.NOTICES', () => SCH.NOTICES), M('topics', 'SCH.TOPICS', () => SCH.TOPICS, { config: true }),
    L('events', 'V8.EV', () => V8.EV), L('sreq', 'V8.SREQ', () => V8.SREQ), L('ox', 'V8.OX', () => V8.OX), L('qb', 'V8.QB', () => V8.QB), M('oxatt', 'V8.ATT', () => V8.ATT),
    M('subf', 'V8.SUBF', () => V8.SUBF), M('prr', 'V8.PRR', () => V8.PRR),
    /* notices and circles */
    L('notices', 'V8.NOTICES', () => V8.NOTICES), L('circles', 'V8.CIRCLES', () => V8.CIRCLES, { config: true }), L('req', 'V8.REQ', () => V8.REQ),
    /* settings */
    O('org', 'ORG', () => ORG, fillObj(() => ORG), { config: true }),
    M('perm', 'SCH.PERM', () => SCH.PERM, { config: true, after: () => Object.keys(ROLES).forEach(r => { if (SCH.PERM[r]) G(() => SCH.syncPages(r)); }) }),
    O('docset', 'DOCSET', () => DOCSET, v => { DOCSET = v; }), O('msgs', 'MSGSET', () => MSGSET, v => { MSGSET = v; }), O('ui', 'UISET', () => UISET, v => { UISET = v; }, { after: () => G(() => applyUI()) }),
    O('boards', 'V9H.BOARDS', () => V9H.BOARDS, fillArr(() => V9H.BOARDS), { config: true }), O('boards8', 'V8.BOARDS', () => V8.BOARDS, fillArr(() => V8.BOARDS), { config: true }),
    O('levels', 'V8.LEVELS', () => V8.LEVELS, fillArr(() => V8.LEVELS), { config: true }), O('classlist', 'CLASSES', () => CLASSES, fillArr(() => CLASSES), { config: true }),
    L('statuses', 'V8.STATUSES', () => V8.STATUSES, { key: 'k', config: true }),
    /* office */
    L('notes', 'NOTES', () => NOTES),
    L('bin', 'SCH.BIN', () => SCH.BIN, { newest: true, encode: b => { const o = Object.assign({}, b); delete o.list; delete o.restoreTo; delete o.listName; o._list = listName(b.list); return o; }, decode: b => { b.list = listByName(b._list || b.listName) || []; delete b._list; delete b.listName; return b; } }),
    L('log', 'SCH.LOG', () => SCH.LOG, { newest: true, append: true }), L('audit', 'AUDIT', () => AUDIT, { newest: true, append: true })
  ];
  /* sign-in accounts live in `members` (not here): USERS, SCH.STAFF; teacher codes (SCH.LOGINS) are not used with Google sign-in */
  const NOT_SAVED = ['USERS', 'SCH.STAFF', 'SCH.LOGINS', 'LISTS2'];
  if (!FTA.collections) FTA.collections = {};
  const AREG = Array.isArray(FTA.collections) ? {} : FTA.collections;
  const REG = TABLE.map(t => {
    const a = AREG[t.v];
    if (!a) return t;
    /* worker A's entry: its getter and its id / restore hooks, our names and kinds */
    return Object.assign({}, t, { get: () => { const v = G(a.get); return v === undefined ? G(t.get) : v; }, ensure: a.ensureIds || null,
      decode: t.decode || (a.restore ? d => a.restore(d) : null) });
  }).filter(t => G(t.get) !== undefined || t.kind === 'one');
  /* anything else A registered (and we did not name) is still saved, office-only */
  Object.keys(AREG).forEach(v => { if (NOT_SAVED.includes(v) || TABLE.some(t => t.v === v)) return; const a = AREG[v], c = 'x_' + v.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 28); if (!/^[a-z][a-z0-9_]{1,30}$/.test(c)) return;
    const kind = a.kind === 'list' ? 'arr' : a.kind === 'map' ? 'map' : 'one';
    REG.push(kind === 'one' ? { c, v, kind, get: a.get, set: a.kind === 'values' ? fillArr(a.get) : fillObj(a.get), config: true } : { c, v, kind, key: a.key || 'id', get: a.get, ensure: a.ensureIds || null }); });
  FTA.syncedCollections = REG.map(a => a.c);
  const BYC = {}; REG.forEach(a => BYC[a.c] = a);
  function listName(l) { const a = REG.find(x => x.kind === 'arr' && G(x.get) === l); return a ? a.c : ''; }
  function listByName(n) { const a = BYC[n] || REG.find(x => x.v === n); return a && a.kind === 'arr' ? G(a.get) : null; }

  /* ---------- records in and out ---------- */
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const wrap = v => isObj(v) ? v : { __v: v };
  const unwrap = d => isObj(d) && Object.keys(d).length === 1 && '__v' in d ? d.__v : d;
  function keyOf(a, it) {
    if (!it || typeof it !== 'object') return null;
    if (a.key === '_rid') { if (!it._rid) it._rid = rid(); return it._rid; }
    const k = it[a.key || 'id']; if (k != null && k !== '') return String(k);
    if (!it._rid) it._rid = rid(); return it._rid;
  }
  /* ---------- files: saved as "fta-file:<path>" in the private bucket, shown through signed links ---------- */
  const REFS = new Map();     /* what the app holds (blob:, big data:, signed link) → 'fta-file:<path>' */
  const FILES = new Map();    /* path → signed link */
  const NEEDUP = new Set();   /* local files not uploaded yet */
  const BIGDATA = 300000;
  let HELD = false;
  function rep(k, v) {
    if (typeof v !== 'string' || v.length < 12) return v;
    const c = v.charCodeAt(0); if (c !== 98 && c !== 100 && c !== 104) return v;   /* b(lob:) d(ata:) h(ttps:) */
    const r = REFS.get(v); if (r) return r;
    if (v.startsWith('blob:') || (v.length > BIGDATA && v.startsWith('data:'))) { NEEDUP.add(v); HELD = true; }
    return v;
  }
  const json = x => JSON.stringify(x, rep);
  const HOLD = new Set();     /* records waiting for their files to upload */
  /* every record of a collection as id → JSON text */
  function encodeAll(a) {
    if (a.ensure) G(a.ensure);
    const out = new Map(), v = G(a.get), pre = a.c + '\u0001'; HOLD.forEach(k => { if (k.startsWith(pre)) HOLD.delete(k); }); if (v == null) return out;
    const put = (k, x) => { HELD = false; out.set(k, json(x)); const hk = mk(a.c, k); if (HELD) HOLD.add(hk); else HOLD.delete(hk); };
    if (a.kind === 'arr') { if (Array.isArray(v)) v.forEach(it => { const k = keyOf(a, it); if (k != null && !out.has(k)) put(k, a.encode ? a.encode(it) : it); }); }
    else if (a.kind === 'map') Object.keys(v).forEach(k => { if (v[k] !== undefined) put(k, wrap(a.encode ? a.encode(v[k]) : v[k])); });
    else put('all', wrap(a.encode ? a.encode(v) : v));
    return out;
  }
  /* from the server: file references become links the browser can open */
  const unref = t => t.indexOf('"fta-file:') < 0 ? t : t.replace(/"fta-file:([a-z0-9\/._-]+)"/g, (m, p) => { const u = FILES.get(p); if (!u) return m; REFS.set(u, 'fta-file:' + p); return JSON.stringify(u); });
  const dec = (a, d) => { d = JSON.parse(unref(JSON.stringify(d))); return a.decode ? a.decode(d) : d; };
  const addFiles = f => { if (f) Object.keys(f).forEach(p => FILES.set(p, f[p])); };
  const UPLOADING = new Map();
  async function uploadFiles() {
    for (const v of [...NEEDUP]) {
      if (REFS.has(v)) { NEEDUP.delete(v); continue; }
      const st = UPLOADING.get(v); if (st && (st.busy || Date.now() < st.next)) continue;
      const rec = st || { tries: 0 }; rec.busy = true; UPLOADING.set(v, rec);
      try {
        const blob = await (await fetch(v)).blob();
        const r = await api({ action: 'upload', file: { type: blob.type || 'application/octet-stream', size: blob.size } });
        if (r.status !== 200) throw new Error(r.body.error || 'upload ' + r.status);
        if (!r.body.ok) { warn(r.body.reason || 'This file could not be saved'); REFS.set(v, ''); NEEDUP.delete(v); UPLOADING.delete(v); continue; }
        if (MOCK) await mockPut(r.body.path, blob);
        else { const { error } = await SB.storage.from('files').uploadToSignedUrl(r.body.path, r.body.token, blob, { contentType: blob.type || 'application/octet-stream', upsert: false }); if (error) throw error; }
        REFS.set(v, 'fta-file:' + r.body.path); FILES.set(r.body.path, v); NEEDUP.delete(v); UPLOADING.delete(v);
      } catch (e) { rec.busy = false; rec.tries++; rec.next = Date.now() + Math.min(60000, 2000 * Math.pow(2, rec.tries)); LASTERR = 'File upload: ' + (e && e.message || e); }
    }
  }
  const natural = (x, y) => { x = String(x); y = String(y); return x.length === y.length ? (x < y ? -1 : x > y ? 1 : 0) : x.localeCompare(y, 'en', { numeric: true }); };
  /* put one record into the app (data null = remove it) */
  function applyOne(a, id, data) {
    const v = G(a.get);
    if (a.kind === 'arr') {
      if (!Array.isArray(v)) return;
      const i = v.findIndex(it => keyOf(a, it) === id);
      if (data == null) { if (i > -1) v.splice(i, 1); return; }
      const d = dec(a, data); if (a.key === '_rid' && !d._rid) d._rid = id;
      if (i > -1) { const t = v[i]; Object.keys(t).forEach(k => { const ds = Object.getOwnPropertyDescriptor(t, k); if (ds && ds.configurable) delete t[k]; }); Object.defineProperties(t, Object.getOwnPropertyDescriptors(d)); }
      else v.push(d);
    } else if (a.kind === 'map') {
      if (!v) return;
      if (data == null) delete v[id]; else v[id] = unwrap(dec(a, data));
    } else {
      if (data == null) return;
      G(() => a.set(unwrap(dec(a, data))));
    }
  }
  function sortArr(a) { const v = G(a.get); if (a.kind !== 'arr' || !Array.isArray(v)) return; v.sort((x, y) => natural(keyOf(a, x), keyOf(a, y)) * (a.newest ? -1 : 1)); }

  /* =========================================================
     2. TALKING TO THE SERVER
     ========================================================= */
  let SB = null, MEMBER = null, EMAIL = '';
  async function token() {
    if (MOCK) return 'mock';
    const { data } = await SB.auth.getSession();
    return data && data.session ? data.session.access_token : '';
  }
  async function api(body) {
    if (MOCK) return mockApi(body);
    const t = await token(); if (!t) return { status: 401, body: { error: 'Please sign in again' } };
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body), cache: 'no-store', credentials: 'same-origin' });
    let j = {}; try { j = await r.json(); } catch (e) { }
    return { status: r.status, body: j || {} };
  }
  FTA.api = api;

  /* =========================================================
     3. THE MOCK BACKEND (tests): the same server code, on localStorage
     ========================================================= */
  const MDB = 'fta-mock-db', MSESS = 'fta-mock-session';
  const mock = {
    offline: false,
    db() { let d = null; try { d = JSON.parse(lsGet(MDB) || 'null'); } catch (e) { } return d || { members: {}, records: {}, audit: [], t: 0 }; },
    save(d) { lsSet(MDB, JSON.stringify(d)); },
    reset() { lsSet(MDB, null); lsSet(MSESS, null); },
    stamp(d) { const t = Math.max(Date.now(), (d.t || 0) + 1); d.t = t; return new Date(t).toISOString(); }
  };
  const mockStore = {
    getMember: async e => mock.db().members[e] || null,
    putMember: async m => { const d = mock.db(); const now = mock.stamp(d); d.members[m.email] = Object.assign({ created_at: now }, d.members[m.email] || {}, m, { updated_at: now }); mock.save(d); return d.members[m.email]; },
    delMember: async e => { const d = mock.db(); const m = d.members[e]; if (m && m.role === 'Owner' && !Object.values(d.members).some(x => x.email !== e && x.role === 'Owner' && x.active)) throw new Error('The academy must keep at least one active Owner'); delete d.members[e]; mock.save(d); },
    listMembers: async () => Object.values(mock.db().members).sort((a, b) => (a.role + a.email).localeCompare(b.role + b.email)),
    getRecord: async (c, id) => mock.db().records[c + '\u0001' + id] || null,
    allRecords: async c => Object.values(mock.db().records).filter(r => !c || r.collection === c).sort((a, b) => (a.collection + '\u0001' + a.id).localeCompare(b.collection + '\u0001' + b.id)),
    recordsSince: async iso => Object.values(mock.db().records).filter(r => r.updated_at > iso).sort((a, b) => a.updated_at < b.updated_at ? -1 : 1),
    putRecord: async r => { const d = mock.db(); const row = Object.assign({}, r, { updated_at: mock.stamp(d) }); d.records[r.collection + '\u0001' + r.id] = row; mock.save(d); return row; },
    audit: async row => { const d = mock.db(); d.audit.push(Object.assign({ at: new Date().toISOString() }, row)); mock.save(d); },
    signUpload: async path => ({ url: 'mock:' + path, token: 'mock' }),
    signDownload: async paths => { const o = {}; paths.forEach(p => { const u = lsGet('fta-mock-file:' + p); if (u) o[p] = u; }); return o; },
    /* notifications (tests): devices, queue and "sent" messages kept in the mock database */
    vapid: async () => ({ publicKey: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', privateKey: 'mock', subject: 'mailto:owner@gmail.com' }),
    getSub: async ep => (mock.db().subs || {})[ep] || null,
    putSub: async x => { const d = mock.db(); d.subs = d.subs || {}; const now = mock.stamp(d); d.subs[x.endpoint] = Object.assign({ created_at: now }, d.subs[x.endpoint] || {}, x, { updated_at: now }); mock.save(d); return d.subs[x.endpoint]; },
    delSub: async ep => { const d = mock.db(); if (d.subs) delete d.subs[ep]; mock.save(d); },
    delSubsFor: async e => { const d = mock.db(); Object.keys(d.subs || {}).forEach(k => { if (d.subs[k].email === e) delete d.subs[k]; }); mock.save(d); },
    mySubs: async e => Object.values(mock.db().subs || {}).filter(x => x.email === e),
    subsFor: async es => Object.values(mock.db().subs || {}).filter(x => es.indexOf(x.email) > -1),
    enqueue: async rows => { const d = mock.db(); d.queue = d.queue || []; rows.forEach(r => { d.qid = (d.qid || 0) + 1; d.queue.push(Object.assign({ id: d.qid, tries: 0, claimed_at: null }, r)); }); mock.save(d); },
    claimQueue: async n => { const d = mock.db(), t = Date.now(), out = (d.queue || []).filter(r => !r.claimed_at || r.claimed_at < t - 300e3).slice(0, n); out.forEach(r => { r.claimed_at = t; }); mock.save(d); return JSON.parse(JSON.stringify(out)); },
    doneQueue: async ids => { const d = mock.db(); d.queue = (d.queue || []).filter(r => ids.indexOf(r.id) < 0); mock.save(d); },
    retryQueue: async ids => { const d = mock.db(); (d.queue || []).forEach(r => { if (ids.indexOf(r.id) > -1) { r.claimed_at = Date.now() - 240e3; r.tries++; } }); mock.save(d); },
    sentOnce: async k => { const d = mock.db(); d.sent = d.sent || {}; if (d.sent[k]) return false; d.sent[k] = 1; mock.save(d); return true; },
    sendPush: async (sub, payload) => { const d = mock.db(); (d.pushed = d.pushed || []).push({ endpoint: sub.endpoint, email: sub.email, payload: JSON.parse(payload) }); mock.save(d); return { ok: true }; }
  };
  const mockPut = (path, blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => { lsSet('fta-mock-file:' + path, r.result); ok(); }; r.onerror = no; r.readAsDataURL(blob); });
  async function mockApi(body) {
    if (mock.offline) throw new TypeError('Failed to fetch (offline test)');
    const email = (lsGet(MSESS) || '').toLowerCase();
    if (!email) return { status: 401, body: { error: 'Please sign in again' } };
    const r = await window.FTAApiCore.handle(mockStore, email, JSON.parse(JSON.stringify(body)), { OWNER_EMAIL: CFG.ownerEmail || '' });
    return JSON.parse(JSON.stringify(r));
  }
  if (MOCK) FTA.mock = mock;

  /* =========================================================
     4. SCREENS: setup, sign in, blocked, loading
     ========================================================= */
  const LOGO = G(() => LOGO_FULL) || '';
  const GLOGO = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const CSS = `
#fta-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;
  background:radial-gradient(1200px 600px at 15% -10%,rgba(201,162,77,.16),transparent 60%),radial-gradient(900px 500px at 110% 110%,rgba(64,96,180,.18),transparent 60%),#0B1020;color:#EEF0F6;font-family:Manrope,system-ui,-apple-system,'Segoe UI',sans-serif}
#fta-gate[hidden]{display:none}
#fta-gate .fg-card{width:min(440px,100%);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025));border:1px solid rgba(201,162,77,.28);border-radius:22px;padding:34px 30px 26px;box-shadow:0 30px 80px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);text-align:center;backdrop-filter:blur(12px)}
#fta-gate .fg-logo{display:block;margin:0 auto 14px;max-width:220px;max-height:92px;object-fit:contain}
#fta-gate .fg-ey{display:block;font-size:11px;letter-spacing:.24em;color:#C9A24D;font-weight:700;margin-bottom:6px}
#fta-gate h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:32px;line-height:1.1;margin:0 0 8px;color:#fff}
#fta-gate p{margin:0 0 18px;color:#B8BFD3;font-size:14px;line-height:1.55}
#fta-gate .fg-btn{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:48px;border-radius:12px;border:1px solid #DADCE0;background:#fff;color:#1F1F1F;font:600 15px/1 Manrope,system-ui,sans-serif;cursor:pointer;transition:transform .15s,box-shadow .15s}
#fta-gate .fg-btn:hover{box-shadow:0 6px 22px rgba(0,0,0,.35);transform:translateY(-1px)}
#fta-gate .fg-btn:focus-visible,#fta-gate .fg-link:focus-visible,#fta-gate input:focus-visible{outline:3px solid #C9A24D;outline-offset:2px}
#fta-gate .fg-btn[disabled]{opacity:.6;cursor:wait;transform:none}
#fta-gate .fg-gold{background:linear-gradient(180deg,#D9B65F,#B88E35);border-color:#B88E35;color:#1A1405}
#fta-gate .fg-link{background:none;border:0;color:#C9A24D;font:600 14px Manrope,system-ui,sans-serif;cursor:pointer;margin-top:14px;padding:6px 10px;border-radius:8px}
#fta-gate .fg-foot{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#8E96AE;display:flex;gap:8px;align-items:center;justify-content:center}
#fta-gate .fg-mail{display:inline-block;margin:2px 0 16px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.07);color:#fff;font-weight:600;font-size:13px;word-break:break-all}
#fta-gate .fg-err{color:#FFB4A9;font-size:13px;min-height:18px;margin:10px 0 0}
#fta-gate .fg-steps{text-align:left;margin:0 0 6px;padding-left:20px;color:#C9CFDF;font-size:13.5px;line-height:1.7}
#fta-gate code{background:rgba(255,255,255,.08);padding:1px 6px;border-radius:6px;font-size:12.5px}
#fta-gate input{width:100%;box-sizing:border-box;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:#fff;padding:0 14px;font:500 15px Manrope,system-ui,sans-serif;margin-bottom:10px}
#fta-gate .fg-spin{width:34px;height:34px;border-radius:50%;border:3px solid rgba(201,162,77,.25);border-top-color:#C9A24D;margin:8px auto 14px;animation:fgspin .9s linear infinite}
#fta-gate .fg-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;color:#1A1405;background:#C9A24D;border-radius:6px;padding:2px 8px;margin-bottom:12px}
@keyframes fgspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#fta-gate .fg-spin{animation-duration:3s}#fta-gate .fg-btn{transition:none}}
#fta-sync{position:fixed;right:14px;bottom:14px;z-index:2147482000;display:flex;align-items:center;gap:8px;padding:7px 12px 7px 10px;border-radius:999px;font:600 12px/1 Manrope,system-ui,sans-serif;
  background:rgba(14,19,36,.88);color:#E7EAF3;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;backdrop-filter:blur(8px);transition:opacity .3s}
#fta-sync i{width:8px;height:8px;border-radius:50%;background:#3DD68C;box-shadow:0 0 0 3px rgba(61,214,140,.18)}
#fta-sync[data-s=saving] i{background:#C9A24D;box-shadow:0 0 0 3px rgba(201,162,77,.2);animation:fgpulse 1s ease-in-out infinite}
#fta-sync[data-s=offline] i{background:#9AA3B8;box-shadow:0 0 0 3px rgba(154,163,184,.2)}
#fta-sync[data-s=error] i{background:#FF6B5B;box-shadow:0 0 0 3px rgba(255,107,91,.2)}
#fta-sync[data-s=saved]{opacity:.72}
#fta-sync:hover{opacity:1}
@keyframes fgpulse{50%{opacity:.35}}
@media print{#fta-sync,#fta-gate{display:none!important}}
@media (max-width:640px){#fta-sync{bottom:calc(74px + env(safe-area-inset-bottom,0px));right:10px}}`;
  function gate(html) {
    let g = $id('fta-gate');
    if (!g) { const st = document.createElement('style'); st.id = 'fta-gate-css'; st.textContent = CSS; document.head.appendChild(st); g = document.createElement('div'); g.id = 'fta-gate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'fg-h'); document.body.appendChild(g); }
    g.innerHTML = `<div class="fg-card">${LOGO ? `<img class="fg-logo" src="${LOGO}" alt="Final Touch Academy">` : ''}<span class="fg-ey">FINAL TOUCH ACADEMY</span>${html}</div>`;
    g.hidden = false; const lg = $id('sc-login'); if (lg) lg.hidden = true;
    const f = g.querySelector('button,input'); if (f) setTimeout(() => f.focus(), 30);
    return g;
  }
  const ungate = () => { const g = $id('fta-gate'); if (g) g.hidden = true; };
  function loadingScreen(t) { gate(`<h1 id="fg-h">FTA Command Centre</h1><div class="fg-spin" role="status" aria-label="Loading"></div><p>${h(t || 'Opening your academy…')}</p>`); }
  function setupScreen() {
    gate(`<h1 id="fg-h">Almost ready</h1><p>This copy of the Command Centre is not connected to its database yet. The site owner adds these in <b>Netlify → Site configuration → Environment variables</b>, then redeploys:</p>
      <ol class="fg-steps"><li><code>SUPABASE_URL</code></li><li><code>SUPABASE_ANON_KEY</code></li><li><code>SUPABASE_SERVICE_ROLE_KEY</code> (secret)</li><li><code>OWNER_EMAIL</code> (the Owner's Gmail)</li></ol>
      <p>The README in the project explains each step.</p><div class="fg-foot">Nothing is saved until the setup is finished.</div>`);
  }
  function signInScreen(msg) {
    const test = MOCK ? `<span class="fg-tag">TEST MODE</span><input id="fg-email" type="email" autocomplete="email" placeholder="name@gmail.com" aria-label="Gmail"><button type="button" class="fg-btn fg-gold" id="fg-go">Continue (test sign-in)</button>` :
      `<button type="button" class="fg-btn" id="fg-go">${GLOGO}<span>Sign in with Google</span></button>`;
    gate(`<h1 id="fg-h">FTA Command Centre</h1><p>Office, finance, teachers and students in one place. Sign in with the Gmail the academy added for you.</p>${test}<p class="fg-err" id="fg-err" role="alert">${h(msg || '')}</p>
      <div class="fg-foot"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>Only Gmail accounts on the academy list can open the app.</div>`);
    const go = $id('fg-go'), em = $id('fg-email');
    const run = async () => {
      if (MOCK) { const e = (em.value || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) { $id('fg-err').textContent = 'Enter a full Gmail address.'; em.focus(); return; } lsSet(MSESS, e); return boot(); }
      go.disabled = true; $id('fg-err').textContent = '';
      const { error } = await SB.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
      if (error) { go.disabled = false; $id('fg-err').textContent = 'Google sign-in did not start: ' + error.message; }
    };
    go.onclick = run; if (em) em.onkeydown = e => { if (e.key === 'Enter') run(); };
  }
  function blockedScreen(email, why) {
    gate(`<h1 id="fg-h">This Gmail can't open the app</h1><span class="fg-mail">${h(email)}</span><p>${h(why || 'It is not on the academy list, or its access is switched off. Ask the Owner or an Admin to add this Gmail, then sign in again.')}</p>
      <button type="button" class="fg-btn" id="fg-other">${MOCK ? '' : GLOGO}<span>Use another Gmail</span></button>`);
    $id('fg-other').onclick = () => signOutNow();
  }
  function errorScreen(t) {
    gate(`<h1 id="fg-h">Could not open the app</h1><p>${h(t)}</p><button type="button" class="fg-btn fg-gold" id="fg-retry">Try again</button><button type="button" class="fg-link" id="fg-out">Sign out</button>`);
    $id('fg-retry').onclick = () => boot(); $id('fg-out').onclick = () => signOutNow();
  }

  /* =========================================================
     5. SIGN IN → WHO AM I → FILL THE APP
     ========================================================= */
  const OFFICE = ['Owner', 'Admin', 'Junior Admin', 'Finance Manager', 'Collection Staff', 'Viewer'];
  let STARTED = false;
  async function boot() {
    try { sessionStorage.removeItem('sc-in'); } catch (e) { }
    if (!MOCK && (!CFG.supabaseUrl || !CFG.supabaseAnonKey)) return setupScreen();
    loadingScreen();
    try {
      await loadScript('vendor/fta-policy.js');
      if (MOCK) { await loadScript('vendor/fta-notify.js'); await loadScript('vendor/fta-api-core.js'); }
      else if (!SB) {
        if (!window.supabase || !window.supabase.createClient) throw new Error('The sign-in library did not load. Check the connection and try again.');
        SB = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fta-auth' } });
        SB.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && STARTED) location.reload(); });
      }
    } catch (e) { return errorScreen(e.message); }
    let email = '';
    if (MOCK) email = (lsGet(MSESS) || '').toLowerCase();
    else {
      const { data, error } = await SB.auth.getSession();
      const p = new URLSearchParams(location.search);
      if (p.has('code') || p.has('error') || /access_token|error=/.test(location.hash)) history.replaceState(null, '', location.pathname);
      if (error) return signInScreen('Sign-in failed: ' + error.message);
      if (p.get('error_description')) return signInScreen(p.get('error_description'));
      email = data && data.session && data.session.user && data.session.user.email ? data.session.user.email.toLowerCase() : '';
    }
    if (!email) return signInScreen();
    EMAIL = email;
    let r;
    try { r = await api({ action: 'me' }); } catch (e) { return errorScreen('No connection to the server. Check the internet and try again.'); }
    if (r.status === 401) return signInScreen('Please sign in again.');
    if (r.status !== 200) return errorScreen(r.body.error || 'The server did not answer (' + r.status + ').');
    const m = r.body.member;
    if (!m) return blockedScreen(email);
    if (!G(() => ROLES[m.role])) return blockedScreen(email, 'The role “' + m.role + '” is not available in this version.');
    MEMBER = m; FTA.member = m;
    try { await start(m); } catch (e) { console.error(e); errorScreen('Something went wrong while opening the academy: ' + (e && e.message || e)); }
  }

  function googleName() { return G(() => SB && SB._lastUser && SB._lastUser.user_metadata.full_name) || ''; }
  async function start(m) {
    loadingScreen('Loading your academy…');
    if (typeof FTA.resetData === 'function') { try { FTA.resetData(); } catch (e) { console.warn('resetData', e); } }
    const pull = await api({ action: 'pull' });
    if (pull.status !== 200) throw new Error(pull.body.error || 'Could not load the records (' + pull.status + ')');
    addFiles(pull.body.files);
    hydrate(pull.body.records || [], m);
    CURSOR = pull.body.cursor || '';
    if (!MOCK) { const { data } = await SB.auth.getUser(); if (data && data.user) SB._lastUser = data.user; }
    await setIdentity(m);
    STARTED = true;
    replayOutbox();
    ungate();
    const u = USERS[0];
    G(() => SCH.enter(m.role, u));
    statusEl(); setStatus();
    hookApp();
    schedule(1500);
    setInterval(() => schedule(0), 5000);
    setInterval(() => pullSoon(), 30000);
    try { window.dispatchEvent(new CustomEvent('fta:started', { detail: { member: m } })); } catch (e) { }
    window.addEventListener('focus', () => pullSoon());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullSoon(); else saveOutbox(); });
    window.addEventListener('online', () => { BACKOFF = 0; schedule(0); pullSoon(); });
    window.addEventListener('offline', () => setStatus());
    window.addEventListener('pagehide', saveOutbox);
    window.addEventListener('beforeunload', e => { saveOutbox(); if (INFLIGHT || collectChanges().length) { e.preventDefault(); e.returnValue = ''; } });
  }

  /* who is signed in: USERS / ME() / SCH.STAFF for this role */
  let MBASE = new Map();
  async function setIdentity(m) {
    const name = m.name && m.name !== 'Owner' ? m.name : (googleName() || m.name || EMAIL.split('@')[0]);
    USERS.length = 0;
    if (m.role === 'Mentor') { const men = MENTORS.find(x => x.id === m.mentor_id) || {}; USERS.push({ id: 'me', name: men.name || name, email: EMAIL, role: 'Mentor', mentor: m.mentor_id }); }
    else if (m.role === 'Student') { const s = STUDENTS.find(x => x.id === m.student_id) || {}; USERS.push({ id: 'me', name: s.name || name, email: EMAIL, role: 'Student', stu: m.student_id }); }
    else USERS.push({ id: EMAIL, name, email: EMAIL, role: m.role });
    G(() => { SCH.STAFF.length = 0; });
    if (G(() => window.FTAPolicy.canListMembers(m))) await loadMembers();
    else { if (OFFICE.includes(m.role)) G(() => SCH.STAFF.push({ uid: EMAIL, status: 'Active', last: 'Now', twoStep: false })); MBASE = desiredMembers(); }
  }
  async function loadMembers() {
    const r = await api({ action: 'members' }); if (r.status !== 200) { MBASE = desiredMembers(); return; }
    const list = r.body.members || [], me = USERS[0];
    for (let i = USERS.length - 1; i >= 0; i--) if (USERS[i] !== me && OFFICE.includes(USERS[i].role)) USERS.splice(i, 1);
    G(() => { SCH.STAFF.length = 0; });
    list.filter(x => OFFICE.includes(x.role)).forEach(x => {
      let u = x.email === EMAIL ? me : null;
      if (!u) { u = { id: x.email, name: x.name || x.email.split('@')[0], email: x.email, role: x.role }; USERS.push(u); }
      else { u.role = x.role; if (x.name && x.name !== 'Owner') u.name = x.name; }
      G(() => SCH.STAFF.push({ uid: u.id, status: x.active ? 'Active' : 'Disabled', last: '—', twoStep: false }));
    });
    if (!list.some(x => x.email === EMAIL)) G(() => SCH.STAFF.push({ uid: me.id, status: 'Active', last: 'Now', twoStep: false }));
    MBASE = new Map(list.map(x => [x.email, norm(x)]));
  }

  /* ---------- fill the app from the server ---------- */
  const SNAP = {}, META = new Map();
  let CURSOR = '';
  const mk = (c, id) => c + '\u0001' + id;
  function hydrate(records, m) {
    const by = {}; records.forEach(r => (by[r.c] = by[r.c] || []).push(r));
    REG.forEach(a => {
      const recs = by[a.c] || [];
      if (!recs.length && (a.config || a.kind === 'one')) {
        /* nothing saved yet: keep the built-in defaults; the Owner's first visit saves them */
        SNAP[a.c] = m.role === 'Owner' && a.config ? new Map() : encodeAll(a); return;
      }
      const ids = new Set(recs.map(r => r.id));
      if (a.kind !== 'one') { const cur = encodeAll(a); cur.forEach((j, id) => { if (!ids.has(id)) applyOne(a, id, null); }); }
      recs.forEach(r => {
        /* a broken record (e.g. written before the shape checks existed) is set aside, not loaded, so one bad row cannot stop a page */
        const bad = r.data && G(() => window.FTAPolicy && window.FTAPolicy.shape(a.c, r.data));
        if (bad) { (FTA.skipped = FTA.skipped || []).push(a.c + '/' + r.id + ': ' + bad); return; }
        applyOne(a, r.id, r.data); META.set(mk(a.c, r.id), r.at);
      });
      sortArr(a);
      SNAP[a.c] = encodeAll(a);
    });
    afterChange(REG);
  }
  function afterChange(list) {
    list.forEach(a => { if (a.after) G(a.after); });
    G(() => { MOVES = movements(); });
    if (typeof FTA.afterHydrate === 'function') G(() => FTA.afterHydrate());
  }

  /* =========================================================
     6. SYNC: find what changed, send it, handle the answer
     ========================================================= */
  let TIMER = 0, INFLIGHT = false, BACKOFF = 0, NEXT_OK = 0, LAST_ACT = 0, STATE = 'saved', LASTERR = '';
  const APPEND = new Set(['log', 'audit']);
  function schedule(ms) { if (!STARTED) return; clearTimeout(TIMER); TIMER = setTimeout(tick, ms == null ? 700 : ms); }
  function collectChanges() {
    const out = [];
    REG.forEach(a => {
      const cur = encodeAll(a), snap = SNAP[a.c] || new Map();
      cur.forEach((j, id) => { if (snap.get(id) !== j && !HOLD.has(mk(a.c, id))) out.push({ c: a.c, id, data: JSON.parse(j), base: META.has(mk(a.c, id)) ? META.get(mk(a.c, id)) : null, _j: j }); });
      if (!APPEND.has(a.c) && a.kind !== 'one') snap.forEach((j, id) => { if (!cur.has(id)) out.push({ c: a.c, id, data: null, base: META.has(mk(a.c, id)) ? META.get(mk(a.c, id)) : null, _j: null }); });
    });
    return out;
  }
  FTA.pending = () => STARTED ? collectChanges().length + HOLD.size : 0;
  /* the local copy of the policy: changes this role may not make are not sent */
  function localCtx() { const all = c => { const a = BYC[c]; const v = a && G(a.get); return Array.isArray(v) ? v : []; }; return { get: (c, id) => all(c).find(x => x && x.id === id) || null, all }; }
  function precheck(ch) {
    const P = window.FTAPolicy; if (!P) return { ok: true };
    const old = SNAP[ch.c] && SNAP[ch.c].has(ch.id) ? { data: JSON.parse(SNAP[ch.c].get(ch.id)), deleted: false } : null;
    try { return P.write(MEMBER, ch.c, ch.id, ch.data, old, localCtx(), Date.now()); } catch (e) { return { ok: true }; }
  }
  const userActed = () => Date.now() - LAST_ACT < 4000;
  let lastWarn = 0;
  function warn(t) { if (Date.now() - lastWarn < 2500) return; lastWarn = Date.now(); say(t, 5200); }
  function snapSet(c, id, j) { if (!SNAP[c]) SNAP[c] = new Map(); if (j == null) SNAP[c].delete(id); else SNAP[c].set(id, j); }
  function encodeOne(a, id) { return encodeAll(a).get(id); }

  async function tick() {
    if (!STARTED || INFLIGHT) return;
    if (Date.now() < NEXT_OK) { schedule(NEXT_OK - Date.now()); return; }
    if (NEEDUP.size) { INFLIGHT = true; setStatus('saving'); try { await uploadFiles(); } finally { INFLIGHT = false; } if (NEEDUP.size) schedule(3000); }
    let changes = collectChanges(), touchedUI = false;
    /* local check first: refused here = never sent */
    changes = changes.filter(ch => {
      const w = precheck(ch); if (w.ok && !w.ignore) return true;
      const a = BYC[ch.c];
      if (w.ignore || !userActed()) { snapSet(ch.c, ch.id, ch._j); return false; }
      warn(w.reason || 'You cannot change this'); undo(a, ch); touchedUI = true; return false;
    });
    const mem = memberChanges();
    if (!changes.length && !mem.length) { if (touchedUI) rerender(); setStatus(); return; }
    INFLIGHT = true; setStatus('saving');
    try {
      for (let i = 0; i < changes.length; i += 150) {
        const part = changes.slice(i, i + 150);
        const r = await api({ action: 'push', changes: part.map(x => ({ c: x.c, id: x.id, data: x.data, base: x.base })) });
        if (r.status === 401) { STARTED = false; return signInScreen('Your sign-in expired. Sign in again; your changes are kept on this device.'); }
        if (r.status === 403) { saveOutbox(); STARTED = false; return blockedScreen(EMAIL); }
        if (r.status !== 200) throw new Error(r.body.error || 'Server error ' + r.status);
        const res = new Map((r.body.results || []).map(x => [mk(x.c, x.id), x]));
        part.forEach(ch => { if (handleResult(ch, res.get(mk(ch.c, ch.id)))) touchedUI = true; });
      }
      for (const mc of mem) await pushMember(mc);
      BACKOFF = 0; NEXT_OK = 0; LASTERR = ''; lsSet(outboxKey(), null);
      INFLIGHT = false; setStatus();
      if (touchedUI) rerender();
      if (collectChanges().length) schedule(300);
    } catch (e) {
      INFLIGHT = false; LASTERR = String(e && e.message || e);
      BACKOFF = Math.min(BACKOFF + 1, 7); const wait = Math.min(60000, 1000 * Math.pow(2, BACKOFF)) * (0.75 + Math.random() * 0.5);
      NEXT_OK = Date.now() + wait; saveOutbox(); setStatus(navigator.onLine === false || e instanceof TypeError ? 'offline' : 'error'); schedule(wait);
    }
  }
  /* returns true when the screen needs a redraw */
  function handleResult(ch, r) {
    const a = BYC[ch.c]; if (!r) return false;
    if (r.status === 'ok') {
      META.set(mk(ch.c, ch.id), r.at);
      if (r.data !== undefined && r.data !== null && ch.data !== null) { applyOne(a, ch.id, r.data); snapSet(ch.c, ch.id, encodeOne(a, ch.id)); return true; }
      snapSet(ch.c, ch.id, ch._j); return false;
    }
    if (r.status === 'conflict') {
      if (ch.base == null && a.kind === 'arr' && a.key !== '_rid' && ch.data) { rekey(a, ch.id); return true; }   /* two people made a new record with the same number: give ours a new one */
      META.set(mk(ch.c, ch.id), r.at); applyOne(a, ch.id, r.data == null ? null : r.data); snapSet(ch.c, ch.id, r.data == null ? null : encodeOne(a, ch.id));
      if (userActed()) warn('Someone else changed this at the same time' + (r.by ? ' (' + r.by + ')' : '') + '. Their version is shown; please check it and make your change again.');
      return true;
    }
    if (r.status === 'rejected') { if (userActed()) warn(r.reason || 'This change was not allowed'); if (r.at) META.set(mk(ch.c, ch.id), r.at); undo(a, ch, r.data); return true; }
    if (r.status === 'ignored') {
      if (APPEND.has(ch.c) || r.data === undefined) { snapSet(ch.c, ch.id, ch._j); return false; }
      applyOne(a, ch.id, r.data == null ? null : r.data); snapSet(ch.c, ch.id, r.data == null ? null : encodeOne(a, ch.id)); return true;
    }
    return false;   /* error: stays changed, sent again on the next try */
  }
  /* put back the last saved version (or the server's) */
  function undo(a, ch, server) {
    const prev = server !== undefined ? (server == null ? null : server) : (SNAP[ch.c] && SNAP[ch.c].has(ch.id) ? JSON.parse(SNAP[ch.c].get(ch.id)) : null);
    if (a.kind === 'one' && prev == null) { snapSet(ch.c, ch.id, ch._j); return; }
    applyOne(a, ch.id, prev); snapSet(ch.c, ch.id, prev == null ? null : encodeOne(a, ch.id));
    if (a.kind === 'arr') sortArr(a);
  }
  /* new number for a record (and every place that points to it) */
  function rekey(a, oldId) {
    const nid = oldId + '-' + rid().slice(-4), v = G(a.get); if (!Array.isArray(v)) return;
    const it = v.find(x => keyOf(a, x) === oldId); if (!it) return;
    const swap = o => { if (!o || typeof o !== 'object') return; Object.keys(o).forEach(k => { const d = Object.getOwnPropertyDescriptor(o, k); if (!d || !('value' in d)) return; if (o[k] === oldId) o[k] = nid; else if (typeof o[k] === 'object') swap(o[k]); }); };
    REG.forEach(b => {
      const val = G(b.get); if (val == null) return;
      if (b.kind === 'arr' && Array.isArray(val)) val.forEach(swap);
      else if (b.kind === 'map') Object.keys(val).forEach(k => { swap(val[k]); const parts = k.split('|'); if (parts.includes(oldId)) { const nk = parts.map(p => p === oldId ? nid : p).join('|'); val[nk] = val[k]; delete val[k]; } });
      else if (typeof val === 'object') swap(val);
    });
    it[a.key || 'id'] = nid;
  }
  function rerender() {
    const sheetOpen = $id('ov') && !$id('ov').hidden, typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (sheetOpen || typing) { NEED_RENDER = true; return; }
    NEED_RENDER = false; G(() => render());
  }
  let NEED_RENDER = false;

  /* ---------- read what others changed ---------- */
  let PULLING = false, PULL_T = 0;
  function pullSoon() { clearTimeout(PULL_T); PULL_T = setTimeout(pullNow, 250); }
  async function pullNow() {
    if (!STARTED || PULLING || INFLIGHT || document.visibilityState === 'hidden') return;
    if ($id('ov') && !$id('ov').hidden) return;           /* never while a form is open */
    PULLING = true;
    try {
      const since = CURSOR ? new Date(Date.parse(CURSOR) - 10000).toISOString() : '';
      const r = await api(since ? { action: 'pull', since } : { action: 'pull' });
      if (r.status === 401) { STARTED = false; return signInScreen('Your sign-in expired. Please sign in again.'); }
      if (r.status === 403) { STARTED = false; return blockedScreen(EMAIL); }
      if (r.status !== 200) return;
      if (r.body.member && (r.body.member.role !== MEMBER.role || r.body.member.mentor_id !== MEMBER.mentor_id || r.body.member.student_id !== MEMBER.student_id)) { say('Your access was changed by the office. Reloading…'); setTimeout(() => location.reload(), 1200); return; }
      addFiles(r.body.files);
      let changed = false; const touched = new Set();
      (r.body.records || []).forEach(x => {
        const a = BYC[x.c]; if (!a) return;
        const k = mk(x.c, x.id);
        if (!x.deleted && META.get(k) === x.at) return;                         /* already have it */
        const cur = encodeOne(a, x.id), snap = SNAP[x.c] && SNAP[x.c].get(x.id);
        if (cur !== snap) return;                                               /* we changed it too: the save will sort it out */
        if (x.deleted) { if (cur === undefined) return; if (APPEND.has(x.c)) return; applyOne(a, x.id, null); snapSet(x.c, x.id, null); META.delete(k); }
        else { applyOne(a, x.id, x.data); META.set(k, x.at); snapSet(x.c, x.id, encodeOne(a, x.id)); }
        changed = true; touched.add(a);
      });
      if (r.body.cursor && r.body.cursor > CURSOR) CURSOR = r.body.cursor;
      if (changed) { touched.forEach(sortArr); afterChange([...touched]); rerender(); }
      if (G(() => window.FTAPolicy.canListMembers(MEMBER)) && Date.now() - MLOADED > 60000 && !memberChanges().length) { MLOADED = Date.now(); await loadMembers(); }
    } catch (e) { /* offline: try again later */ } finally { PULLING = false; }
  }
  let MLOADED = Date.now();
  FTA.pull = pullNow;
  FTA.sync = () => new Promise(ok => { schedule(0); const t0 = Date.now(); const done = ok; ok = v => done(v); setTimeout(() => done(STATE), 25000); const w = () => (!INFLIGHT && !collectChanges().length && !HOLD.size && !memberChanges().length) || Date.now() < NEXT_OK ? ok(STATE) : setTimeout(w, 120); setTimeout(w, 60); });

  /* ---------- offline: keep unsent changes on this device ---------- */
  const outboxKey = () => 'fta-outbox:' + EMAIL;
  function saveOutbox() {
    if (!STARTED) return;
    const ch = collectChanges(); if (!ch.length) { lsSet(outboxKey(), null); return; }
    lsSet(outboxKey(), JSON.stringify({ at: Date.now(), changes: ch.map(x => ({ c: x.c, id: x.id, data: x.data, base: x.base })) }));
  }
  function replayOutbox() {
    let o = null; try { o = JSON.parse(lsGet(outboxKey()) || 'null'); } catch (e) { }
    if (!o || !Array.isArray(o.changes) || !o.changes.length) return;
    o.changes.forEach(ch => { const a = BYC[ch.c]; if (!a) return; applyOne(a, ch.id, ch.data); if (ch.base == null) META.delete(mk(ch.c, ch.id)); else META.set(mk(ch.c, ch.id), ch.base); });
    REG.forEach(sortArr); afterChange(REG);
    setTimeout(() => say(o.changes.length + ' change' + (o.changes.length > 1 ? 's' : '') + ' saved on this device while offline are being sent now.'), 1200);
  }

  /* =========================================================
     7. SIGN-IN ACCESS (members) follows the app:
     office staff (Staff accounts), teachers' Gmail (Teacher form),
     students' Gmail (Student Portal). Owner/Admin see the full list.
     ========================================================= */
  const norm = x => ({ email: String(x.email || '').toLowerCase(), role: x.role, name: x.name || '', mentor_id: x.mentor_id || null, student_id: x.student_id || null, active: x.active !== false });
  const okMail = e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e || '');
  const OFFSTAT = /inactive|left|disabled|removed|resigned|archived/i;
  function desiredMembers() {
    const d = new Map();
    (G(() => MENTORS) || []).forEach(m => { const e = String(m.gmail || '').trim().toLowerCase(); if (okMail(e) && /@gmail\.com$|@googlemail\.com$/.test(e)) d.set(e, norm({ email: e, role: 'Mentor', name: m.name, mentor_id: m.id, active: !OFFSTAT.test(m.status || '') })); });
    (G(() => SCH.SPORT) || []).forEach(p => { const e = String(p.gmail || '').trim().toLowerCase(); if (okMail(e)) d.set(e, norm({ email: e, role: 'Student', name: (G(() => stuOf(p.stu)) || {}).name || '', student_id: p.stu, active: p.status === 'Active' })); });
    (G(() => USERS) || []).forEach(u => { if (!OFFICE.includes(u.role) || !okMail(u.email)) return; const s = (G(() => SCH.STAFF) || []).find(x => x.uid === u.id); if (!s) return; d.set(String(u.email).toLowerCase(), norm({ email: u.email, role: u.role, name: u.name, active: s.status === 'Active' })); });
    return d;
  }
  const sameM = (a, b) => a && b && a.role === b.role && a.active === b.active && (a.mentor_id || null) === (b.mentor_id || null) && (a.student_id || null) === (b.student_id || null) && (a.name || '') === (b.name || '');
  function memberChanges() {
    if (!STARTED || !MEMBER) return [];
    const want = desiredMembers(), out = [];
    want.forEach((m, e) => { const b = MBASE.get(e); if (!sameM(m, b)) { if (e === EMAIL && b && (m.role !== b.role || !m.active)) return; if (MEMBER.role === 'Mentor' && b) return; out.push(m); } });
    MBASE.forEach((b, e) => { if (!want.has(e) && e !== EMAIL && b.role !== 'Owner') out.push(Object.assign({}, b, { deleted: true })); });
    /* only what this role may do; a change the server refused is not sent again */
    return out.filter(m => MREJ.get(m.email) !== JSON.stringify(m) && (G(() => window.FTAPolicy.memberWrite(MEMBER, m, MBASE.get(m.email) || null).ok) !== false || userActed()));
  }
  const MREJ = new Map();
  async function pushMember(m) {
    const r = await api({ action: 'member', member: m.deleted ? { email: m.email, deleted: true } : m });
    if (r.status !== 200) throw new Error(r.body.error || 'Server error ' + r.status);
    if (r.body.ok) { if (m.deleted) MBASE.delete(m.email); else MBASE.set(m.email, r.body.member ? norm(r.body.member) : m); return; }
    /* refused: say why, and show the real list again */
    warn(r.body.reason || 'This sign-in change was not allowed');
    MREJ.set(m.email, JSON.stringify(m));
    if (G(() => window.FTAPolicy.canListMembers(MEMBER))) { await loadMembers(); rerender(); }
  }

  /* =========================================================
     8. HOOKS INTO THE APP
     ========================================================= */
  function hookApp() {
    /* changes the app makes by itself while drawing a page (month list, payroll drafts …):
       a role that may not save them keeps them on screen only, without a message */
    const _render = render;
    render = function () {
      let pre = null; try { pre = new Set(collectChanges().map(x => x.c + '\u0001' + x.id + '\u0001' + x._j)); } catch (e) { }
      const r = _render.apply(this, arguments);
      try { if (pre) collectChanges().forEach(ch => { if (pre.has(ch.c + '\u0001' + ch.id + '\u0001' + ch._j)) return; const w = precheck(ch); if (!w.ok || w.ignore) snapSet(ch.c, ch.id, ch._j); }); } catch (e) { }
      schedule(); return r;
    };
    ['click', 'change', 'input', 'submit', 'keydown'].forEach(ev => document.addEventListener(ev, e => { if (e.isTrusted) LAST_ACT = Date.now(); schedule(ev === 'input' || ev === 'keydown' ? 1200 : 700); }, true));
    const ov = $id('ov');
    if (ov && window.MutationObserver) new MutationObserver(() => { if (ov.hidden) { schedule(300); if (NEED_RENDER) setTimeout(rerender, 50); pullSoon(); } }).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
  }
  /* sign in screen of the app → ours; sign out → Google sign out */
  async function signOutNow() {
    try { if (STARTED) { await Promise.race([FTA.sync(), new Promise(r => setTimeout(r, 4000))]); saveOutbox(); } } catch (e) { }
    /* this device stops getting this person's notifications (a shared phone or laptop) */
    try { if (typeof FTA.beforeSignOut === 'function') await Promise.race([FTA.beforeSignOut(), new Promise(r => setTimeout(r, 3000))]); } catch (e) { }
    STARTED = false;
    try { sessionStorage.removeItem('sc-in'); } catch (e) { }
    if (MOCK) lsSet(MSESS, null); else if (SB) { try { await SB.auth.signOut({ scope: 'local' }); } catch (e) { } }
    location.reload();
  }
  if (typeof SCH !== 'undefined') {
    SCH.showLogin = () => { if (STARTED) signOutNow(); else signInScreen(); };
    SCH.signOut = () => { G(() => SCH.log('Signed out', (ME() || {}).name || '', 'info')); G(() => closeSheet()); signOutNow(); };
  }
  FTA.signOut = signOutNow;

  /* ---------- the small "saved" pill ---------- */
  function statusEl() {
    let e = $id('fta-sync'); if (e) return e;
    e = document.createElement('button'); e.type = 'button'; e.id = 'fta-sync'; e.setAttribute('aria-live', 'polite');
    e.onclick = () => { BACKOFF = 0; NEXT_OK = 0; schedule(0); pullSoon(); };
    document.body.appendChild(e); return e;
  }
  function setStatus(s) {
    const e = $id('fta-sync'); if (!e) return;
    const n = STARTED ? collectChanges().length + HOLD.size : 0;
    if (!s) s = INFLIGHT ? 'saving' : navigator.onLine === false && n ? 'offline' : LASTERR && n ? 'error' : n ? 'saving' : 'saved';
    STATE = s;
    const t = { saved: 'All changes saved', saving: 'Saving…', offline: 'Offline · ' + n + ' change' + (n === 1 ? '' : 's') + ' kept on this device', error: 'Not saved yet · retrying' }[s];
    e.dataset.s = s; e.innerHTML = '<i></i><span>' + h(t) + '</span>';
    e.title = s === 'error' ? LASTERR + ' · click to try now' : s === 'offline' ? 'They are sent when the internet is back' : 'Click to check for updates';
  }
  FTA.status = () => STATE;

  /* go */
  const lg = $id('sc-login'); if (lg) lg.hidden = true;
  boot();
})();
