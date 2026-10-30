# চাহিদার তালিকা — কোথায় আছে, কীভাবে যাচাই হয়েছে

শেষ যাচাই: ৩০ অক্টোবর ২০২৬ (notification আর অ্যাপ ইনস্টল যোগ করার পর আবার)। ভিত্তি হিসেবে আপনার `FTA_Command_Centre_Preview_v8.html` একটুও বদলানো হয়নি। সব নতুন কাজ তার উপরে আলাদা লেয়ার হিসেবে যোগ হয়েছে।

**পরীক্ষার ফলাফল**

| পরীক্ষা | কী দেখে | ফল |
|---|---|---|
| `tests/c-requirements.js` | প্রতিটা চাহিদা আসল স্ক্রিনে খুলে দেখে, FTA Premium থিমে | **49/49** |
| `tests/b-mock.js` | লগইন → Role → সেভ → রিলোড → অফলাইন → conflict, সব Role দিয়ে | **80/80** |
| `tests/b-function.mjs` | সার্ভার ফাংশন: token, অনুমতি, ভুল ডাটা আটকানো, ১০০০+ সারি | **18/18** |
| `tests/a-load / a-months / a-i18n / a-empty` | আসল তারিখ, খালি শুরু, ভাষা, হিসাব | সব OK |
| `tests/c-csp.js` | নিরাপত্তা নীতি (CSP) চালু রেখে কোনো error নেই | ০টা violation |
| `tests/d-webpush.mjs` | notification-এর encryption: অফিসিয়াল RFC 8291 test vector, আলাদা লাইব্রেরি দিয়ে খোলা, সই যাচাই | **25/25** |
| `tests/d-notify.mjs` | ১০ জন মানুষ, ১০টা ডিভাইস: কে কোন notification পায় (প্রতিটা মেসেজ ডিভাইসের key দিয়ে খুলে মেলানো), reminder, retry | **51/51** |
| `tests/e-push.js` | আসল ব্রাউজারে: Chrome-এর install যাচাই, আইকন, Turn on, পছন্দ, Send a test, ট্যাপ করলে ঠিক পেজ, sign-out | **38/38** |
| `tests/b-pg-check.sql` | আসল PostgreSQL 16-এ schema দুবার চালানো + notification টেবিলের নিরাপত্তা | পাস |
| আগের ২০টা v9 suite (ntest, mt, rtest, v9t … z-test) | আগে বানানো সব ফিচার এখনও কাজ করে কিনা | সব pass |

চালাতে: `PV=file://$PWD/site-demo/index.html node tests/c-requirements.js`

## ঢোকা ও অনুমতি

| # | চাহিদা | কোথায় | যাচাই |
|---|---|---|---|
| R01 | Owner, Admin, Junior Admin, Finance Manager, Teacher, Student — আলাদা Role | Access → Roles | c-req R01 |
| R02 | Owner Gmail দিয়ে কাউকে Role দেবে | Access → Logins & Codes → Add staff | R02 |
| R03 | Gmail (Google) দিয়ে লগইন | লগইন পেজ, `src/prod-data.js` | R03, b-mock |
| R04 | প্রতিটা Role-এর অনুমতি Owner বদলাতে পারবে | Access → Roles matrix | R04 |
| — | **অনুমতি সার্ভারেও যাচাই**, শুধু বোতাম লুকিয়ে নয় | `public/vendor/fta-policy.js`, `netlify/functions/api.mjs` | b-function, b-mock (Teacher/Student ফি পড়তে বা লিখতে পারে না) |
| — | ডাটাবেসে সরাসরি ঢোকা বন্ধ (RLS, কোনো policy নেই) | `supabase/schema.sql` | b-pg-check |
| — | ভুল আকারের ডাটা সার্ভার ফেরত দেয় (যেমন তারিখ ছাড়া পেমেন্ট) | fta-policy.js `shape()` | b-function |
| — | তালিকায় নেই এমন Gmail কিছুই দেখে না, Inactive করলে সাথে সাথে বন্ধ | api core `me()` | b-mock |
| — | প্রতিটা পরিবর্তনের audit লাইন (কে, কখন, কী) | `audit_log` টেবিল | b-function |

## শিক্ষক ও ছাত্র পোর্টাল

| # | চাহিদা | যাচাই |
|---|---|---|
| R05 | Teacher portal: dashboard, routine, attendance, calendar, homework, notes | R05 |
| R06 | ছাত্র শিক্ষকের সাথে যুক্ত, শিক্ষক শুধু নিজের ছাত্র দেখে | R06, b-mock |
| R07 | Student portal: home, calendar, results, attendance | R07 |
| R20 | প্রতি ছাত্রের আলাদা routine | R20 |
| R21 | ছাত্রের ক্যালেন্ডার থেকে attendance (P / A / Late / Leave / No class + কারণ) | R21 |
| R22 | বাছাই করা ছাত্রদের homework, ছবি / ভিডিও / PDF সহ | R22 |
| R23 | ছাত্রের ক্যালেন্ডারে homework ও event; শিক্ষকের ক্যালেন্ডার Google Calendar-এর মতো | R23 |
| R24 | প্রতি ছাত্রের class note WhatsApp-এ পাঠানো | R24 |
| R25 | letterhead সহ progress report + কে পাঠাতে পারবে তার অনুমতি | R25 |
| R28 | শিক্ষক ফি ছাড়া ছাত্র যোগ করে, Owner approve করার সময় ফি বসায় | R28 |

## টাকা-পয়সা (QIT-এর মতো)

| # | চাহিদা | যাচাই |
|---|---|---|
| R08 | Payable / Paid / Pending ছাত্রের টাকায় | R08 |
| R09 | Payment Update dialog, Jan–Dec বছরের ছবি | R09 |
| R10 | Monthly payments, প্রতি মাসের status (নিজের বানানো status সহ) | R10 |
| R11 | পেমেন্ট edit ও delete | R11 |
| R12 | কার্ড থেকেই ছাত্রের status বদল | R12 |
| R13 | প্রতি ছাত্রে শিক্ষকের share % বদলানো যায় | R13 |
| R14 | খরচ এখন, টাকা পরে (pay-later) | R14 |
| R15 | অনেক অ্যাকাউন্ট, ফর্মের ভেতরেই "+" দিয়ে নতুন অ্যাকাউন্ট | R15 |
| — | মাসের তালিকা আসল তারিখ থেকে (Asia/Dhaka), শুধু কয়েক মাস নয় | a-months |

## সাধারণ

| # | চাহিদা | যাচাই |
|---|---|---|
| R16 | সব জায়গায় edit ও delete, কারণ লিখে; Recycle bin থেকে ফেরত আনা | R16, m9 |
| R17 | তালিকা ও ক্যাটাগরি Settings থেকে বদলানো যায় | R17 |
| R18 | ছাত্রের ফর্ম: ১২ মাসের টেবিল, একাধিক ফোন, subject → teacher, board, Gmail | R18 |
| R19 | Board ফাঁকা শুরু, ক্লিক করলে টিক-বক্সের সাজেশন | R19 |
| R26 | Notice Maker | R26 |
| R27 | Circle-এ join / leave, notice-এ কোন circle থেকে এসেছে দেখায় | R27 |
| R29 | Smart search, Ctrl K, প্রতিটা তালিকায় search bar | R29 |
| R30 | Programme যোগ / edit | R30 |
| R31 | মাস / বছর বাছাই ১৯৭৬–২১২৬ | R31 |
| R32 | Premium চার্ট (donut / bar) | R32 |
| R33 | 3D বক্সড আইকন + tooltip | R33 |
| R34 | ডেস্কটপে উইন্ডো মাঝখানে খোলে | R34 |
| W* | ৩৬০ / ৩৯০ / ৪১৪ / ৭৬৮ / ৮২০ / ১৪৪০ px — কোথাও পাশে স্ক্রল নেই, বোতাম কাটা নেই | W360–W1440, ফোন audit |

## থিম ও ভাষা

| # | চাহিদা | যাচাই |
|---|---|---|
| F1 / R36 | প্রথমবার খুললে **FTA Premium · dark · English** | F1, R36, c-csp |
| R35 | Settings থেকে বাংলা বা Mixed | R35, a-i18n |
| F2 | রিলোডের পরও বাছাই মনে থাকে | F2 |
| F3–F5, R37 | অন্য থিম বাছাই করা যায়, পুরনো থিমগুলোও কাজ করে, আবার Premium-এ ফেরা যায় | F3, F4, F5, R37 |

## ফোন ও ল্যাপটপে notification, অ্যাপ ইনস্টল

| চাহিদা | কোথায় | যাচাই |
|---|---|---|
| ফোন বা ল্যাপটপ যেকোনো ডিভাইসে notification bar-এ FTA-র নামে মেসেজ | `public/sw.js`, `src/prod-push.js` | e-push §5 (FTA আইকন আর badge সহ দেখায়) |
| Circle notice → শুধু সেই circle-এর সদস্য | `public/vendor/fta-notify.js` | d-notify: Student / Teacher / নিয়মের circle |
| অন্য সব notice, circle-এ যোগ হওয়া | fta-notify | d-notify |
| ছাত্রের homework (নতুন, বদলানো, কাল জমা) | fta-notify, `notify-tick` | d-notify (সন্ধ্যার reminder সহ) |
| শিক্ষক বা অফিস reply দিলে → যে মেসেজ পাঠিয়েছিল | fta-notify `req` | d-notify: ছাত্র → অফিস → ছাত্র, শিক্ষক → অফিস → শিক্ষক |
| বাকি সব জায়গা: class note, absent / late, event, routine, marks, progress report, online exam, approval, payment verify | fta-notify | d-notify |
| যে রেকর্ড দেখার অনুমতি নেই, তার notification যায় না | `resolve()` প্রতিটা প্রাপকের জন্য `FTAPolicy.read` চালায় | d-notify: ছাত্র পেমেন্টের notification পায় না, অন্য শিক্ষকের ক্লাসে homework পাঠানো যায় না |
| প্রতি ডিভাইসে কী আসবে বাছাই | 🔔 → Phone & laptop notifications, Settings | d-notify, e-push |
| ট্যাপ করলে ঠিক পেজ খোলে (অনুমতি তবুও যাচাই হয়) | prod-push `openLink` | e-push §4 |
| Google থেকে link / shortcut install করলে FTA লোগো দিয়ে Premium অ্যাপ হিসেবে খোলে | `manifest.webmanifest`, `public/icons/`, `sw.js` | e-push §1: Chrome-এর installability check-এ কোনো error নেই |
| iPhone | apple-touch-icon, app-mode meta, Add to Home Screen নির্দেশনা | e-push §1 |
| Sign out / Inactive → ডিভাইস বাদ | prod-push, api core | e-push §6, d-notify |
| বাইরের কোনো সার্ভারে মেসেজ পাঠানো যায় না, শুধু আসল push service-এ | `server/webpush.mjs`, `fta-notify subOk` | d-webpush, d-notify |

## লাইভ ও নিরাপত্তা

| চাহিদা | কোথায় | যাচাই |
|---|---|---|
| GitHub → Netlify hosting | `netlify.toml`, `README.md` | make-config পরীক্ষা |
| খালি শুরু, শুধু Owner-এর অ্যাকাউন্ট | `src/prod-fix.js`, `OWNER_EMAIL` | a-load (`stu 0, users Owner`) |
| নিরাপত্তা হেডার: HSTS, frame বন্ধ, nosniff, Referrer, Permissions, COOP / CORP | `netlify.toml` | — |
| Content-Security-Policy, শুধু নিজের Supabase-এ সংযোগ, `unsafe-eval` নেই | `tools/make-config.mjs` → `_headers` | c-csp |
| গোপন key শুধু সার্ভারে, ব্রাউজারে কখনো না | api.mjs, `.gitignore` | কোড পর্যালোচনা |
| ফাইল private bucket-এ, ছোট সময়ের লিংক দিয়ে খোলে | `files` bucket, `signDownload` | b-function |
| অফলাইনে কাজ রাখে, নেট ফিরলে নিজে সেভ করে; দুজন একসাথে বদলালে conflict ধরে | `src/prod-data.js` | b-mock |
| ভাঙা ডাটা এলে পেজ ক্র্যাশ করে না, ওই রেকর্ড বাদ দেয় | prod-data `hydrate()` | b-mock |

## জানা সীমা (সৎভাবে)

- **`'unsafe-inline'`**: আপনার মূল ডেমোর সব বোতাম `onclick` দিয়ে লেখা, তাই CSP-তে এটা রাখতে হয়েছে। বাকি সব সংযোগ বন্ধ, আর `eval` পুরোপুরি বাদ।
- **Notification-এর লেখা** এখন English-এ যায়। অ্যাপের ভেতরের নতুন বোতামগুলো বাংলাতেও আছে।
- **iPhone-এ notification** চায় iOS 16.4 বা নতুন, আর Home Screen-এ যোগ করা FTA আইকন থেকে খোলা অ্যাপ। এটা Apple-এর নিয়ম।
- **আসল Google / Apple push service** পর্যন্ত পাঠানো এখানে পরীক্ষা করা যায়নি (এই পরিবেশে ইন্টারনেট বন্ধ)। তার বদলে encryption অফিসিয়াল RFC test vector-এর সাথে হুবহু মিলেছে, আর আলাদা একটা লাইব্রেরি দিয়ে খুলে যাচাই হয়েছে। deploy-এর পর **Send a test** দিয়ে এক ক্লিকে দেখা যাবে।
- **WhatsApp পাঠানো** খোলে `wa.me` লিংক। মেসেজ আপনার নিজের WhatsApp থেকে যায়; WhatsApp Business API যুক্ত নয়।
- **ব্যাকআপ**: Supabase Free প্ল্যানে ৭ দিনের দৈনিক ব্যাকআপ থাকে; এর বেশি চাইলে মাসে একবার CSV export করে রাখুন বা Pro প্ল্যান নিন।
- **আসল Google লগইন ও Supabase** শুধু আপনার প্রজেক্টে deploy করার পরেই চালানো যায়। এখানে সেটা হুবহু একই সার্ভার কোড দিয়ে "mock" মোডে পরীক্ষা করা হয়েছে (b-mock, b-function)।
