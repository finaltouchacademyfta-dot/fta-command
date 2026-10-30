// =====================================================================
// FTA · Web Push sender with Node's own crypto (no npm packages).
//   RFC 8291  message encryption (aes128gcm)  ·  RFC 8292  VAPID sign-in
//   RFC 8030  delivery (TTL, Urgency, Topic)
// The message is encrypted for the one device, so the push service
// (Google, Apple, Mozilla, Microsoft) can carry it but never read it.
// =====================================================================
import crypto from 'node:crypto';

const b64u = buf => Buffer.from(buf).toString('base64url');
const unb64u = s => Buffer.from(String(s || ''), 'base64url');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

/* only real browser push services: our server never posts to any other address (no SSRF) */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^[a-z0-9.-]+\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/, /^[a-z0-9.-]+\.push\.apple\.com$/, /^[a-z0-9.-]+\.notify\.windows\.com$/, /^[a-z0-9.-]+\.push\.microsoft\.com$/];
export function pushHostOk(endpoint) {
  try { const u = new URL(endpoint); return u.protocol === 'https:' && !u.port && PUSH_HOSTS.some(r => r.test(u.hostname)); } catch (e) { return false; }
}

/* ---------- VAPID keys: P-256, public as 65-byte uncompressed point (base64url) ---------- */
export function makeVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const j = publicKey.export({ format: 'jwk' }), d = privateKey.export({ format: 'jwk' }).d;
  return { publicKey: b64u(Buffer.concat([Buffer.from([4]), unb64u(j.x), unb64u(j.y)])), privateKey: d };
}
function privateKeyObject(pub, d) {
  const p = unb64u(pub); if (p.length !== 65 || p[0] !== 4) throw new Error('bad VAPID public key');
  return crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d, x: b64u(p.subarray(1, 33)), y: b64u(p.subarray(33)) }, format: 'jwk' });
}
export function vapidHeader(endpoint, vapid, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject || 'mailto:admin@example.com' }));
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key: privateKeyObject(vapid.publicKey, vapid.privateKey), dsaEncoding: 'ieee-p1363' });
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + vapid.publicKey;
}

/* ---------- RFC 8291 encryption ---------- */
export function encrypt(payload, p256dh, authSecret, opts = {}) {
  const ua = unb64u(p256dh), auth = unb64u(authSecret);
  if (ua.length !== 65 || ua[0] !== 4) throw new Error('bad subscription key');
  if (auth.length !== 16) throw new Error('bad subscription auth');
  const ecdh = crypto.createECDH('prime256v1');
  if (opts.asPrivate) ecdh.setPrivateKey(opts.asPrivate); else ecdh.generateKeys();
  const asPub = ecdh.getPublicKey(), secret = ecdh.computeSecret(ua);
  const salt = opts.salt || crypto.randomBytes(16);
  const ikm = hmac(hmac(auth, secret), Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const plain = Buffer.concat([Buffer.from(payload), Buffer.from([2])]);      // one record, last-record delimiter
  if (plain.length > 3993) throw new Error('payload too large');
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head[20] = 65;
  return Buffer.concat([head, asPub, body]);
}

/* ---------- send one message to one device ---------- */
// returns { ok, gone, status }  · gone = the device turned notifications off / uninstalled: forget it
export async function sendPush(sub, payload, vapid, opts = {}) {
  if (!pushHostOk(sub.endpoint)) return { ok: false, gone: true, status: 0 };
  const body = encrypt(typeof payload === 'string' ? payload : JSON.stringify(payload), sub.p256dh, sub.auth);
  const headers = { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm', TTL: String(opts.ttl || 86400), Urgency: opts.urgency || 'normal', Authorization: vapidHeader(sub.endpoint, vapid) };
  if (opts.topic && /^[A-Za-z0-9_-]{1,32}$/.test(opts.topic)) headers.Topic = opts.topic;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), opts.timeout || 8000);
  try {
    const r = await (opts.fetch || fetch)(sub.endpoint, { method: 'POST', headers, body, signal: ctl.signal, redirect: 'error' });
    return { ok: r.status >= 200 && r.status < 300, gone: r.status === 404 || r.status === 410, status: r.status };
  } catch (e) { return { ok: false, gone: false, status: 0 }; } finally { clearTimeout(t); }
}
