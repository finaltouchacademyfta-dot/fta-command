// FTA · Web Push crypto check: our encryption must decrypt with an independent library (http_ece),
// our VAPID token must verify, and only real push services are accepted.
//   NODE_PATH=<dir with http_ece> node tests/d-webpush.mjs
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { encrypt, vapidHeader, makeVapidKeys, pushHostOk, sendPush } from '../server/webpush.mjs';
const require = createRequire(import.meta.url);
const ece = require(process.env.ECE || 'http_ece');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// a browser subscription: device key pair + 16-byte auth secret
const dev = crypto.createECDH('prime256v1'); dev.generateKeys();
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: dev.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') };
for (const msg of ['hello', JSON.stringify({ title: 'New notice', body: 'ছুটির নোটিশ · Eid holiday', url: '/?n=x' }), 'x'.repeat(3000)]) {
  const body = encrypt(msg, sub.p256dh, sub.auth);
  const out = ece.decrypt(body, { version: 'aes128gcm', privateKey: dev, authSecret: sub.auth });
  ok(out.toString() === msg, 'round trip ' + msg.length);
}
ok((() => { try { encrypt('x'.repeat(4000), sub.p256dh, sub.auth); return false; } catch (e) { return true; } })(), 'oversize refused');
// RFC 8291 appendix A test vector
{
  const r = encrypt('When I grow up, I want to be a watermelon', 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', 'BTBZMqHH6r4Tts7J_aSIgg', { asPrivate: Buffer.from('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', 'base64url'), salt: Buffer.from('DGv6ra1nlYgDCS1FRnbzlw', 'base64url') });
  ok(r.toString('base64url') === 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN', 'RFC 8291 test vector');
}
// VAPID: header verifies with the public key, audience is the push service origin
const v = makeVapidKeys(); v.subject = 'mailto:owner@gmail.com';
const h = vapidHeader(sub.endpoint, v); const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);
ok(m && m[4] === v.publicKey, 'k= is the public key');
const claims = JSON.parse(Buffer.from(m[2], 'base64url'));
ok(claims.aud === 'https://fcm.googleapis.com' && claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 86400 && claims.sub === 'mailto:owner@gmail.com', 'claims');
const pub = Buffer.from(v.publicKey, 'base64url');
const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
ok(crypto.verify('sha256', Buffer.from(m[1] + '.' + m[2]), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(m[3], 'base64url')), 'signature verifies');
// web-push library agrees the keys are valid P-256 VAPID keys
try { const wp = require(process.env.WP || 'web-push'); wp.setVapidDetails('mailto:owner@gmail.com', v.publicKey, v.privateKey); ok(true, ''); const d = wp.generateRequestDetails({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, 'hi', { vapidDetails: { subject: 'mailto:a@b.co', publicKey: v.publicKey, privateKey: v.privateKey } }); ok(/vapid t=/.test(d.headers.Authorization), 'web-push accepts our keys'); } catch (e) { ok(false, 'web-push rejects our keys: ' + e.message); }
// only real push services
for (const [u, want] of [['https://fcm.googleapis.com/fcm/send/x', true], ['https://web.push.apple.com/abc', true], ['https://updates.push.services.mozilla.com/wpush/v2/x', true], ['https://wns2-par02p.notify.windows.com/w/?token=x', true],
  ['http://fcm.googleapis.com/x', false], ['https://evil.com/fcm.googleapis.com', false], ['https://fcm.googleapis.com.evil.com/x', false], ['https://169.254.169.254/latest', false], ['https://fcm.googleapis.com:8443/x', false], ['javascript:alert(1)', false]])
  ok(pushHostOk(u) === want, 'host ' + u);
// delivery: headers and status handling (fake fetch)
let seen; const fake = st => async (url, o) => { seen = { url, o }; return { status: st }; };
let r = await sendPush(sub, { title: 't' }, v, { fetch: fake(201), topic: 'notice-1', urgency: 'high' });
ok(r.ok && !r.gone, '201 ok'); ok(seen.o.headers['Content-Encoding'] === 'aes128gcm' && seen.o.headers.TTL === '86400' && seen.o.headers.Urgency === 'high' && seen.o.headers.Topic === 'notice-1' && seen.o.redirect === 'error', 'headers');
r = await sendPush(sub, 'x', v, { fetch: fake(410) }); ok(r.gone, '410 gone');
r = await sendPush(sub, 'x', v, { fetch: fake(429) }); ok(!r.ok && !r.gone, '429 retry later');
r = await sendPush({ ...sub, endpoint: 'https://evil.com/x' }, 'x', v, { fetch: fake(201) }); ok(!r.ok && r.gone, 'evil endpoint never contacted');
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
