# FTA Command Centre — লাইভ করার গাইড

Final Touch Academy-র ম্যানেজমেন্ট অ্যাপ। এটা চলে তিনটা জিনিস দিয়ে:

| অংশ | কী করে | খরচ |
|---|---|---|
| **GitHub** | কোড রাখে | ফ্রি |
| **Netlify** | ওয়েবসাইট দেখায় আর `/api` নামের নিরাপদ সার্ভার ফাংশন চালায় | ফ্রি প্ল্যানে শুরু করা যায় |
| **Supabase** | ডাটাবেস (সব ছাত্র, পেমেন্ট, খরচ…) আর Google/Gmail লগইন | ফ্রি প্ল্যানে শুরু করা যায় |

> **নিরাপত্তা কীভাবে কাজ করে:** ব্রাউজার কখনো সরাসরি ডাটাবেসে হাত দেয় না। প্রতিটা পড়া আর লেখা যায় Netlify-র `/api` ফাংশন দিয়ে। ফাংশনটা আগে দেখে কে লগইন করেছে (Google), তারপর `members` তালিকা থেকে তার Role দেখে ঠিক করে সে কী দেখতে বা বদলাতে পারবে। শিক্ষক ফি দেখতে পায় না, ছাত্র শুধু নিজেরটা দেখে — বোতাম লুকিয়ে নয়, সার্ভারেই আটকানো। ডাটাবেসে Row Level Security চালু, বাইরের কেউ public key দিয়েও কিছু পড়তে পারবে না।

---

## ধাপ ১ — GitHub-এ কোড রাখা

1. <https://github.com> এ লগইন করে উপরে ডানে **+ → New repository**।
2. নাম দিন, যেমন `fta-command-centre`। **Private** বাছুন। **Create repository**।
3. এই ফোল্ডারের সব ফাইল আপলোড করুন (**uploading an existing file** লিংক → সব ফাইল আর ফোল্ডার টেনে ছাড়ুন → **Commit changes**)।
   - `site/` ফোল্ডারটা অবশ্যই থাকতে হবে — এটাই তৈরি করা ওয়েবসাইট।
   - `.env`, `config.js` কখনো আপলোড করবেন না (`.gitignore` এগুলো আটকে রাখে)।

কম্পিউটারে git থাকলে:
```bash
git init && git add . && git commit -m "FTA Command Centre"
git branch -M main
git remote add origin https://github.com/<আপনার-নাম>/fta-command-centre.git
git push -u origin main
```

## ধাপ ২ — Supabase প্রজেক্ট

1. <https://supabase.com> → **New project**। নাম `fta`, শক্ত একটা Database password দিন (কোথাও লিখে রাখুন), Region: **Singapore** (বাংলাদেশের কাছে)।
2. প্রজেক্ট তৈরি হলে বাঁ মেনু **SQL Editor → New query**।
3. এই ফোল্ডারের `supabase/schema.sql` ফাইল খুলে পুরো লেখা কপি করে পেস্ট করুন।
   - ফাইলের ভেতরে `owner@example.com` লেখাটা বদলে **আপনার নিজের Gmail** দিন।
4. **Run** চাপুন। নিচে "Success" দেখাবে। (আবার চালালেও ক্ষতি নেই।)
5. **Project Settings → API Keys** (আর **Data API**) থেকে তিনটা জিনিস কপি করে রাখুন:
   - **Project URL** — শুধু `https://abcd.supabase.co` (শেষে `/rest/v1` থাকলে বাদ দিন)
   - **Publishable key** (`sb_publishable_…`) — পুরনো প্রজেক্টে এর নাম **anon public**
   - **Secret key** (`sb_secret_…`) — পুরনো প্রজেক্টে এর নাম **service_role**। ⚠️ এটা গোপন। শুধু Netlify-র Environment variable-এ বসাবেন, আর কোথাও না।

## ধাপ ৩ — Google (Gmail) দিয়ে লগইন চালু করা

**ক) Google Cloud-এ**
1. <https://console.cloud.google.com> → উপরে প্রজেক্ট বাছাই → **New Project** (নাম `FTA`)।
2. **APIs & Services → OAuth consent screen** → User type **External** → অ্যাপের নাম `Final Touch Academy`, আপনার Gmail → Save।
   - **Publish app** চাপুন (না চাপলে শুধু test user-রা লগইন করতে পারবে)।
3. **Credentials → Create credentials → OAuth client ID** → Application type **Web application**।
4. **Authorized redirect URIs**-এ দিন: `https://<আপনার-প্রজেক্ট>.supabase.co/auth/v1/callback`
5. **Create** → **Client ID** আর **Client secret** কপি করুন।

**খ) Supabase-এ**
1. **Authentication → Sign In / Providers → Google** → Enable → Client ID আর Client secret পেস্ট → Save।
2. **Authentication → URL Configuration**:
   - **Site URL**: আপনার Netlify ঠিকানা (ধাপ ৪-এর পরে পাবেন, যেমন `https://fta-command-centre.netlify.app`)
   - **Redirect URLs**-এ একই ঠিকানা যোগ করুন (নিজের ডোমেইন থাকলে সেটাও)।

## ধাপ ৪ — Netlify-তে ওয়েবসাইট চালু

1. <https://app.netlify.com> → **Add new site → Import an existing project → GitHub** → আপনার repository বাছুন।
2. Build settings নিজে থেকেই `netlify.toml` থেকে আসবে (Publish: `site`, Build command: `node tools/make-config.mjs`)। কিছু বদলাবেন না।
3. **Site configuration → Environment variables → Add a variable** — এই চারটা দিন:

| নাম | মান |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | **Publishable** key (`sb_publishable_…`) বা পুরনো anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** key (`sb_secret_…`) বা পুরনো service_role key (গোপন — "Contains secret values" টিক দিন)। **দুটো key উল্টো বসাবেন না।** |
| `OWNER_EMAIL` | আপনার Gmail (ধাপ ২-এ যেটা দিয়েছেন) |

4. **Deploys → Trigger deploy → Deploy site**। ১–২ মিনিটে শেষ হবে।
5. পাওয়া ঠিকানাটা (যেমন `https://xxxx.netlify.app`) Supabase-এর **URL Configuration**-এ বসান (ধাপ ৩খ)।
6. **যাচাই:** ব্রাউজারে `https://<আপনার-সাইট>.netlify.app/api` খুলুন। সব লাইনে ✔ থাকলে সার্ভার ঠিক আছে। কোনো লাইনে ✖ থাকলে সেখানেই লেখা থাকে কী ঠিক করতে হবে। এই পাতায় কোনো key বা Gmail দেখায় না।

## ধাপ ৫ — প্রথমবার ঢোকা (Owner)

1. ওয়েবসাইট খুলে **Sign in with Google** → আপনার Gmail বাছুন।
2. আপনি নিজে থেকেই **Owner** হয়ে যাবেন। অ্যাপ খালি অবস্থায় খুলবে।
3. শুরুর কাজ, এই ক্রমে:
   1. **Settings → Look & brand**: একাডেমির নাম, ঠিকানা, ফোন, লোগো।
   2. **Settings → Lists & categories**: অ্যাকাউন্ট (Cash, ব্যাংক, bKash…), খরচের ক্যাটাগরি, Board।
   3. **Programmes & Enrolments → Add programme**: subject আর মাসিক ফি।
   4. **Teacher Dashboards → Add teacher**: নাম আর **Gmail** — সেই Gmail দিয়ে শিক্ষক নিজের Teacher Portal-এ ঢুকবেন।
   5. **Students → New student**: তথ্য, **Gmail**, subject আর শিক্ষক — ছাত্র নিজের Student Portal-এ ঢুকবে, আর শিক্ষকের Dashboard-এ নিজে থেকে চলে আসবে।
   6. **Access → Logins & Codes → Add staff**: Admin, Finance Manager, Junior Admin, Collection Staff — Gmail আর Role দিন।

যার Gmail তালিকায় নেই, সে লগইন করলে "Ask the Owner to add your Gmail" দেখবে — কিছুই দেখতে পাবে না। কাউকে বাদ দিতে Inactive করুন, সাথে সাথে তার ঢোকা বন্ধ।

## অ্যাপ হিসেবে ইনস্টল (FTA লোগো দিয়ে)

সাইটটা একটা ইনস্টল করা যায় এমন অ্যাপ (PWA)। ইনস্টল করলে হোম স্ক্রিনে / ডেস্কটপে **FTA-র সোনালি লোগো** থাকবে, আর ব্রাউজারের ঠিকানার বার ছাড়া পুরো স্ক্রিনে Premium থিমে খুলবে।

| ডিভাইস | কীভাবে |
|---|---|
| Android (Chrome) | সাইট খুললে নিচে **Install** আসে, অথবা অ্যাপের ভেতরে **Install app** বোতাম, অথবা ⋮ মেনু → **Install app** |
| Windows / Mac (Chrome বা Edge) | ঠিকানার বারের ডান পাশে ইনস্টল আইকন, অথবা অ্যাপের ভেতরে **Install app** |
| iPhone / iPad (Safari) | **Share** ⎋ → **Add to Home Screen** → হোম স্ক্রিনের FTA আইকন থেকে খুলুন |

প্রতিবার নতুন deploy করলে ইনস্টল করা অ্যাপও নিজে থেকে নতুন ভার্সন পায়।

## ফোন ও ল্যাপটপে নোটিফিকেশন

অ্যাপ বন্ধ থাকলেও ফোন বা ল্যাপটপের notification bar-এ **Final Touch Academy**-র নামে আর লোগো দিয়ে মেসেজ আসবে। ট্যাপ করলে অ্যাপ ঠিক সেই পেজে খোলে।

**চালু করা:** লগইনের পর প্রথম পেজে "Get FTA notifications on this device" → **Turn on** → ব্রাউজারে **Allow**। পরে বদলাতে: উপরের 🔔 → নিচে **Phone & laptop notifications** (অফিসের জন্য **Settings**-এও আছে)। প্রতিটা ডিভাইস আলাদা — ফোনে চালু করলে ফোনে, ল্যাপটপে চালু করলে ল্যাপটপে আসে। কোন ধরনের notification আসবে, প্রতিটা ডিভাইসে আলাদা করে বাছা যায়।

**কে কী পায়:**

| ঘটনা | কে পায় |
|---|---|
| Notice publish হলো | সেই circle-এর সদস্যরা (Student / Teacher / Guardian / নিয়মের circle / হাতে বাছা) |
| কাউকে circle-এ যোগ করা হলো | সেই মানুষ |
| ছাত্র বা শিক্ষক মেসেজ / join request পাঠাল, বা reply দিল | Owner, Admin, Junior Admin |
| অফিস reply দিল / approve / decline করল | যে পাঠিয়েছিল |
| নতুন বা বদলানো homework | সেই ক্লাসের (বা বাছাই করা) ছাত্ররা; অফিস দিলে ক্লাসের শিক্ষকও |
| Homework কাল জমা | ছাত্ররা, আগের দিন সন্ধ্যায় |
| Class note পাঠানো হলো | সেই ছাত্র (বা পুরো ক্লাস) |
| Absent বা Late দেওয়া হলো | শুধু সেই ছাত্র |
| Event / extra class / meeting | বাছাই করা ছাত্ররা আর শিক্ষক; event-এর "remind" সময়ে আবার মনে করানো |
| Routine বদলাল | সেই ক্লাসের ছাত্র ও শিক্ষক |
| Marks / progress report / exam result publish | সেই ছাত্ররা |
| Online exam ঘোষণা, খোলার ৩০ মিনিট আগে | সেই ছাত্ররা |
| ছাত্র exam জমা দিল | যে শিক্ষক খাতা দেখবেন |
| শিক্ষক নতুন ছাত্র / subject change / leave পাঠাল, marks জমা দিল | অফিস (approve-এর জন্য); উত্তর গেলে সেই শিক্ষক |
| নতুন Pending payment | Owner, Admin, Finance Manager |

**নিরাপত্তা:**
- কে কী পাবে তা সার্ভার ঠিক করে, অ্যাপের ব্যবহারকারী না। আর কেউ যে রেকর্ড দেখার অনুমতি পায় না, তার notification-ও পায় না। যেমন ছাত্র পেমেন্টের notification পায় না, এক শিক্ষক অন্য শিক্ষকের ক্লাসের কিছু পান না।
- প্রতিটা মেসেজ ওই ডিভাইসের জন্য আলাদা করে encrypt করা থাকে। Google বা Apple পৌঁছে দেয়, কিন্তু পড়তে পারে না।
- Sign out করলে ওই ডিভাইসে notification বন্ধ হয়। কাউকে Inactive করলে তার সব ডিভাইস সাথে সাথে বাদ পড়ে।
- সেটআপে কিছু লাগে না। notification সই করার key প্রথমবার নিজে থেকে তৈরি হয়ে সার্ভারে গোপনে থাকে। চাইলে নিজের key দিতে পারেন: Netlify-তে `VAPID_PUBLIC_KEY` আর `VAPID_PRIVATE_KEY`।
- অ্যাপ বন্ধ থাকা অবস্থার reminder যায় Netlify-র নির্ধারিত ফাংশন দিয়ে (`notify-tick`, প্রতি ৫ মিনিটে)। এটা শুধু Production deploy-এ চলে।

**iPhone:** iOS 16.4 বা নতুন লাগবে, আর আগে **Add to Home Screen** করে সেই আইকন থেকে খুলে notification চালু করতে হবে (Safari-র সাধারণ ট্যাবে Apple অনুমতি দেয় না)।

**ভাষা:** notification-এর লেখা এখন English-এ যায় (অ্যাপের ভেতরের সব বোতাম বাংলাতেও আছে)।

## থিম ও ভাষা

- প্রথমবার খুললে **FTA Premium** থিম আর **English** দিয়ে খোলে।
- যে কেউ উপরের 🎨 বোতাম থেকে থিম, আর **Settings → Language** থেকে বাংলা বা Mixed বাছতে পারবে। বাছাই নিজের ব্রাউজারে মনে থাকে।

## ব্যাকআপ

- Supabase **Database → Backups**: Free প্ল্যানে প্রতিদিনের ব্যাকআপ ৭ দিন থাকে (Pro প্ল্যানে বেশি)।
- নিজের কপি: Supabase **Table Editor → records → Export to CSV** — মাসে একবার নামিয়ে রাখুন।
- অ্যাপের ভেতরে মুছে ফেলা জিনিস **Recycle bin**-এ ৩০ দিন থাকে।

## নিজের ডোমেইন (যেমন `app.finaltouch.academy`)

Netlify **Domain management → Add a domain** → যে DNS রেকর্ড দেখায় তা ডোমেইন কোম্পানিতে বসান। HTTPS নিজে থেকেই চালু হয়। নতুন ঠিকানাটা Supabase **URL Configuration**-এ যোগ করতে ভুলবেন না।

## পরে আপডেট করা

কোড বদলালে (`src/` বা `layers/`), কম্পিউটারে:
```bash
python3 build.py          # site/ নতুন করে তৈরি
git add . && git commit -m "update" && git push
```
Netlify নিজে থেকে নতুন ভার্সন চালু করে দেয়। ডাটা হারায় না।

পরীক্ষার জন্য:
```bash
MODE=demo python3 build.py   # নমুনা ডাটাসহ ডেমো (site-demo/)
MODE=mock python3 build.py   # সার্ভার ছাড়া পুরো লগইন আর সেভ পরীক্ষা (site-mock/)
node tests/b-mock.js         # এন্ড-টু-এন্ড পরীক্ষা
node tests/b-function.mjs    # সার্ভার ফাংশনের পরীক্ষা
node tests/e-push.js         # ইনস্টল + notification (ব্রাউজারে)
ECE=<http_ece ফোল্ডার> node tests/d-notify.mjs   # কে কোন notification পায় (সার্ভারে, encrypt করা মেসেজ খুলে মিলিয়ে দেখে)
```

## সমস্যা হলে

| দেখাচ্ছে | কী করবেন |
|---|---|
| **যেকোনো লগইন সমস্যা** | প্রথমে `https://<আপনার-সাইট>.netlify.app/api` খুলুন — ✖ লাইনগুলো ঠিক করে **Trigger deploy** |
| Google থেকে ফিরে "Please sign in again" বা "Supabase did not accept the server key" | `SUPABASE_SERVICE_ROLE_KEY`-এ **Secret key** (`sb_secret_…`) আছে কিনা দেখুন — publishable / anon key নয়, অন্য প্রজেক্টের নয়, আগে-পরে ফাঁকা জায়গা নেই। ঠিক করে Trigger deploy |
| "The server is not set up yet" | Netlify-তে `SUPABASE_URL` আর `SUPABASE_SERVICE_ROLE_KEY` আছে কিনা দেখুন → Trigger deploy |
| Deploy ব্যর্থ, log-এ "make-config: …KEY is the PUBLISHABLE / ANON key" | দুটো key উল্টো বসেছে — ঠিক জায়গায় বসান |
| Google লগইনের পর আবার লগইন পেজ | Supabase **URL Configuration**-এ Site URL আর Redirect URL ঠিক আছে কিনা |
| "redirect_uri_mismatch" | Google Cloud-এ redirect URI ঠিক `https://<প্রজেক্ট>.supabase.co/auth/v1/callback` কিনা |
| "This Gmail is not on the academy list" | Owner তার Gmail যোগ করেননি, বা Inactive করা |
| নিজে Owner হচ্ছেন না | `OWNER_EMAIL` আর schema-র Gmail হুবহু আপনার Gmail কিনা (ছোট হাতের অক্ষরে) |
| "Offline · changes kept on this device" | ইন্টারনেট ফিরলে নিজে থেকে সেভ হবে, পেজ বন্ধ করবেন না |
| Notification আসছে না | 🔔 → Phone & laptop notifications → **Send a test**। "Blocked" দেখালে ঠিকানার বারের 🔒 → Notifications → Allow। ফোনের Settings-এ Chrome / FTA-র notification চালু আছে কিনা দেখুন |
| iPhone-এ Turn on বোতাম নেই | আগে Add to Home Screen করে সেই আইকন থেকে খুলুন |
| Reminder আসছে না | Netlify → Logs → Functions → `notify-tick` চলছে কিনা দেখুন (Production deploy-এ চলে) |
| deploy ব্যর্থ: "missing environment variable" | ধাপ ৪-এর চারটা variable দিন |

## ফোল্ডারের মানচিত্র

```
site/                   তৈরি করা ওয়েবসাইট (Netlify এটাই দেখায়)
netlify/functions/api.mjs  নিরাপদ সার্ভার ফাংশন (/api)
netlify/functions/notify-tick.mjs  প্রতি ৫ মিনিটে: reminder আর বাকি notification পাঠানো
server/                 Supabase-এ লেখা-পড়া আর Web Push (encrypt + পাঠানো)
public/sw.js            অ্যাপের background worker: notification দেখানো, দ্রুত খোলা
public/manifest.webmanifest, public/icons/  অ্যাপের নাম, FTA লোগোর আইকন
public/vendor/          supabase.js, html2canvas, অনুমতির নিয়ম (fta-policy.js), কে কোন notification পাবে (fta-notify.js)
supabase/schema.sql     ডাটাবেস টেবিল আর নিরাপত্তা
tools/make-config.mjs   deploy-এর সময় config.js আর নিরাপত্তা হেডার তৈরি করে
tools/make-icons.py     লোগো থেকে অ্যাপ আইকন (লোগো বদলালে আবার চালান)
layers/                 আপনার v8 ডেমো (অপরিবর্তিত) + v9 লেয়ারগুলো
src/                    প্রোডাকশন লেয়ার (তারিখ, খালি ডাটা, থিম, ডাটা সেভ)
build.py                সব জোড়া লাগিয়ে site/ তৈরি করে
tests/                  স্বয়ংক্রিয় পরীক্ষা
docs/requirements-checklist.md  আপনার সব চাহিদার তালিকা আর কোথায় আছে
```
