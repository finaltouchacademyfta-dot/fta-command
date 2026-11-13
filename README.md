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
| `ANTHROPIC_API_KEY` | *(ঐচ্ছিক)* AI এজেন্টের key — নিচে "FTA Assistant" অংশ দেখুন। গোপন — "Contains secret values" টিক দিন |

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
| Messages-এ নতুন message | private chat-এ অন্যজন; class group-এ সেই ক্লাসের ছাত্র ও mentor; Office chat-এ Owner আর Admin |
| Mentor **Start class** চাপল | সেই ক্লাসের ছাত্ররা (online হলে ট্যাপ করে Join) |
| রুটিনের ক্লাসের ১০ মিনিট আগে | সেই mentor ("Start class চাপুন") |
| রুটিনের সময়ের ১০ মিনিট পরেও ক্লাস শুরু হয়নি | সেই mentor আর Owner, Admin, Junior Admin |
| Mentor নতুন slot চাইল / অফিস উত্তর দিল | Owner, Admin, Junior Admin / সেই mentor |

**নিরাপত্তা:**
- কে কী পাবে তা সার্ভার ঠিক করে, অ্যাপের ব্যবহারকারী না। আর কেউ যে রেকর্ড দেখার অনুমতি পায় না, তার notification-ও পায় না। যেমন ছাত্র পেমেন্টের notification পায় না, এক শিক্ষক অন্য শিক্ষকের ক্লাসের কিছু পান না।
- প্রতিটা মেসেজ ওই ডিভাইসের জন্য আলাদা করে encrypt করা থাকে। Google বা Apple পৌঁছে দেয়, কিন্তু পড়তে পারে না।
- Sign out করলে ওই ডিভাইসে notification বন্ধ হয়। কাউকে Inactive করলে তার সব ডিভাইস সাথে সাথে বাদ পড়ে।
- সেটআপে কিছু লাগে না। notification সই করার key প্রথমবার নিজে থেকে তৈরি হয়ে সার্ভারে গোপনে থাকে। চাইলে নিজের key দিতে পারেন: Netlify-তে `VAPID_PUBLIC_KEY` আর `VAPID_PRIVATE_KEY`।
- অ্যাপ বন্ধ থাকা অবস্থার reminder যায় Netlify-র নির্ধারিত ফাংশন দিয়ে (`notify-tick`, প্রতি ৫ মিনিটে)। এটা শুধু Production deploy-এ চলে।

**iPhone:** iOS 16.4 বা নতুন লাগবে, আর আগে **Add to Home Screen** করে সেই আইকন থেকে খুলে notification চালু করতে হবে (Safari-র সাধারণ ট্যাবে Apple অনুমতি দেয় না)।

**ভাষা:** notification-এর লেখা এখন English-এ যায় (অ্যাপের ভেতরের সব বোতাম বাংলাতেও আছে)।

## FTA Assistant (AI এজেন্ট) — শুধু Owner

উপরের বারে ✦ **AI** বোতাম (শুধু Owner দেখেন)। বাংলা, English বা Banglish-এ যা চান লিখুন — যেমন "Nusrat Jahan কে mentor হিসেবে add করো, 017…", "Ayaan এর সব details দাও", "এই মাসে কত due আছে?", "Raisa 2500 টাকা bKash এ দিয়েছে"।

- **নিজে খুঁজে নেয়, নিজে পরিকল্পনা করে।** দেখা/খোঁজা/হিসাব সঙ্গে সঙ্গে করে। কিছু **বদলানোর আগে একটা কার্ড দেখায়** — আপনি **Approve** দিলে তবেই সেভ হয় (কয়েকটা হলে **Approve all**)। না চাইলে **Skip**।
- কাজ করে অ্যাপের **নিজের form আর function দিয়েই** (New student, payment, expense, mentor, programme, staff, transfer, notice… সব), তাই invoice নম্বর, fee, mentor link, receipt, Recycle bin, Activity log, notification — সব নিয়ম আগের মতোই চলে। Activity log-এ লেখা থাকে "Approved by … via FTA Assistant"।
- মুছলে **Recycle bin**-এ যায় (৩০ দিনের মধ্যে ফেরত আনা যায়), কারণসহ।
- পুরো অ্যাপ চালু অবস্থায় পড়ে নেয় (সব পেজ, ডাটা, form, function, অনুমতি) — তাই **নতুন ফিচার যোগ হলে এজেন্ট নিজেই সেটা চিনে নেয়**, এজেন্ট বদলাতে হয় না।
- **শেখে আর মনে রাখে:** আপনি যা শেখাবেন ("মনে রাখো: bKash আমাদের মূল account") আর আপনার সংশোধন — Supabase-এ সেভ থাকে (শুধু Owner দেখতে পারে)। 💡 বোতামে দেখা যায় কী শিখেছে; "ভুলে যাও …" বললে মুছে ফেলে। শেষ করা কাজগুলোও মনে রাখে।
- নিরাপত্তা: AI-এর key থাকে শুধু Netlify-তে। `/api/agent` শুধু Owner-কে ঢুকতে দেয় (সার্ভারে যাচাই)। এজেন্টের প্রতিটা পরিবর্তন `/api` দিয়ে সেভ হয়, যেখানে সার্ভার আবার অনুমতি যাচাই করে। রেকর্ডের ভেতরের লেখা (notice, note) কে নির্দেশ হিসেবে মানে না।
- গোপনীয়তা: প্রশ্নের উত্তর দিতে দরকারি ডাটা (নাম, ফোন, টাকার হিসাব) Anthropic-এর Claude-এর কাছে যায়। Anthropic API-র ডাটা ডিফল্টভাবে মডেল ট্রেনিংয়ে ব্যবহার হয় না।

**চালু করতে (একবার):**
1. https://console.anthropic.com → Sign up → **Billing**-এ কিছু credit কিনুন → **API Keys → Create Key** → কপি করুন (`sk-ant-…`)।
2. Netlify → **Project configuration → Environment variables → Add a variable**: নাম `ANTHROPIC_API_KEY`, মান = সেই key। (ঐচ্ছিক: `AGENT_MODEL`, ডিফল্ট `claude-sonnet-5-5`)
3. **Deploys → Trigger deploy**। তারপর `https://my.finaltouch.academy/api/agent` খুললে `{"ready":true}` দেখাবে।

খরচ: প্রতিটা প্রশ্নে কয়েক সেন্ট পর্যন্ত (কাজ যত বড়, তত বেশি)। console.anthropic.com-এ খরচের সীমা (limit) বেঁধে দিতে পারেন।

## থিম ও ভাষা

- প্রথমবার খুললে **Premium Light ("Onyx & Gold")** থিম আর **English** দিয়ে খোলে (৯ নভেম্বর ২০২৬-এ Owner-এর অনুমোদিত ডিজাইন)। FTA Premium (dark) সহ বাকি থিম 🎨 থেকে বাছা যায়।
- যে কেউ উপরের 🎨 বোতাম থেকে থিম, আর **Settings → Language** থেকে বাংলা বা Mixed বাছতে পারবে। বাছাই নিজের ব্রাউজারে মনে থাকে।

**English মানে শুধু English (১২ নভেম্বর ২০২৬):**
- English বাছাই থাকলে অ্যাপের কোথাও বাংলা আসে না। এর মধ্যে আছে page, popup, toast, tooltip, search, report ও print, WhatsApp-এর লেখা, Settings-এর ডিফল্ট লেখা।
- টাকা দেখায় "BDT"।
- বাংলা আসে শুধু বাংলা বা মিশ্র বাছলে।
- এগুলো দেখে `src/ui/zz9-english.js`।

**সব ডিভাইসে ঠিকঠাক:**
- `src/ui/zz9-fit.css` আর `src/ui/zz9-fit.js` স্ক্রিনে যা আছে মেপে নিয়ে মানিয়ে নেয়।
- বড় অঙ্ক এক লাইনে থাকে, কার্ডে না ধরলে একটু ছোট হয়। শব্দ মাঝখান থেকে ভাঙে না।
- "…" দিয়ে কাটা লেখা পুরো দেখায়।
- চওড়া টেবিল কার্ডের ভেতরে স্ক্রল হয়।
- ছোট ফোনে Box size এমনভাবে সীমিত থাকে যাতে কিছু স্ক্রিনের বাইরে না যায়।

**পরীক্ষা:**
- `tests/n-audit.js` প্রতিটা role-এ প্রতিটা page খোলে আর প্রতিটা নিরাপদ বাটন চাপে। এটা চলে ৩২০–১৯২০px-এ, বাংলা লেখা, বক্সের বাইরে যাওয়া লেখা আর JS error খোঁজে।
- `tests/n-static-bn.js` কোডের প্রতিটা বাংলা লেখার English আছে কিনা দেখে।
- `tests/o-english.js` দেখে report, print, search, toast আর settings-এ বাংলা আছে কিনা।

## Receipt Maker, Profiles আর My Profile

- **Receipt Maker** (Students → Receipt Maker): যেকারও জন্য Payment receipt আর Salary slip। নম্বর `FTA-2026-0001` / `FTA-SAL-2026-0001` — সার্ভার নিশ্চিত করে যে একই নম্বর দুইবার কখনো হবে না (দুজন একসাথে Save করলে দ্বিতীয়জন বার্তা পায় "Press Save again")। Issue করা কাগজ আর বদলানো যায় না, মোছা যায় না — শুধু **VOID** (Owner / Admin / Finance), কে কখন করল সার্ভার নিজে লিখে রাখে। ইন্টারনেট ছাড়া Issue হয় না (নম্বর সার্ভার দেয়)।
  - কে কী পারে (Access → Roles-এ বদলানো যায়): Owner / Admin / Finance — সব; Junior Admin — receipt বানানো; Collection Staff — receipt বানানো (void নয়); Viewer — শুধু দেখা ও প্রিন্ট। Salary slip — Owner, Admin, Finance (আর যার Payroll অনুমতি আছে)। Mentor / Student কিছুই দেখে না।
- **Profiles** (Owner / Admin / Junior Admin): Mentor → তার Student → ক্লাস, এক গাছে। Mentor-এর নিজের যোগ করা slot এখানে **Approve / Decline** হয়।
- **My Profile** (Mentor / Student): নিজের Profile Tree। Mentor নিজে বদলাতে পারে: phone, address, bio, qualifications, specialties, availability, preferred students, salary account, photo, আর নতুন slot-এর অনুরোধ। Student: photo, address, About me। বাকি সব অফিস বদলায় — সার্ভারও এটাই যাচাই করে।
- **Class status** (Connect → Class status; Mentor ও Student-এর মেনুতেও): Mentor ক্লাস শুরুতে **Start class**, শেষে **End class** চাপে — সময় সার্ভার লেখে। Office আজকের রুটিন অনুযায়ী দেখে: কোনটা চলছে, কোনটা শেষ, কোনটা ১০ মিনিট পার হয়েও শুরু হয়নি। Online ক্লাসে mentor নিজের Meet / Zoom লিংক দেয়; student **Join class** বোতাম দেখে শুধু ক্লাস চলার সময়। কোনো ভিডিও সার্ভিস বা খরচ নেই।
- **Messages**: class group আর private chat — mentor ↔ নিজের student, যে কেউ ↔ Office। Owner / Admin সব chat পড়তে পারেন (mentor–student chat শুধু পড়া যায়) আর দরকারে মুছতে পারেন। পাঠানো message বদলানো যায় না। ৬ মাস পর সার্ভার নিজে মুছে ফেলে।
- **নম্বর লুকানো**: Mentor-এর ব্রাউজারে student-এর phone, guardian phone, Gmail, address কখনো পৌঁছায় না (সার্ভারের নিয়ম)। Student-ও mentor-এর নম্বর পায় না।
- Watch Together আর Recordings নেই (Owner-এর সিদ্ধান্ত: কোনো paid সার্ভিস নয়)।
- নতুন কোনো Supabase টেবিল লাগে না: সব `records` টেবিলেই থাকে (`rcpt`, `rcsal`, `rcset`, `slotreq`, `clslive`, `msg`)।

## দ্রুত খোলা

- দ্বিতীয়বার থেকে অ্যাপ এই ডিভাইসে রাখা শেষ কপি থেকে সাথে সাথে খোলে, তারপর চুপচাপ সার্ভারের সাথে মিলিয়ে নেয় (নতুন/মোছা রেকর্ড, role বদল, Gmail বাদ পড়া — সব ধরা পড়ে)। Sign out করলে কপি মুছে যায়।
- নতুন ভার্সন deploy হলে নিচে "A new version of the app is ready · Reload" আসে।

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
node tests/h-speed.js        # দ্রুত খোলা (ডিভাইসের কপি), role বদল, sign-out, update banner
node tests/i-phase1.js       # Receipt Maker, Profiles / My Profile, slot request — সার্ভারের অনুমতিসহ
node tests/j-classroom.js    # Class status, Messages, mentor-এর কাছে নম্বর না যাওয়া
node tests/b-function.mjs    # সার্ভার ফাংশনের পরীক্ষা
node tests/e-push.js         # ইনস্টল + notification (ব্রাউজারে)
node tests/g-agent.js        # AI এজেন্ট: খোঁজা, approval card, form দিয়ে সেভ, মেমরি (নকল AI দিয়ে)
node tests/d-agent.mjs       # /api/agent: শুধু Owner, key সার্ভারে, সীমা
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
| AI প্যানেলে "The AI key is not set yet" | Netlify-তে `ANTHROPIC_API_KEY` দিয়ে Trigger deploy |
| AI: "no credit left" / "busy" | console.anthropic.com → Billing-এ credit যোগ করুন / এক মিনিট পরে আবার |
| AI: "not installed on the server yet" | `netlify/edge-functions/` ফোল্ডারটা GitHub-এ আপলোড হয়েছে কিনা দেখুন |

## ফোল্ডারের মানচিত্র

```
site/                   তৈরি করা ওয়েবসাইট (Netlify এটাই দেখায়)
netlify/functions/api.mjs  নিরাপদ সার্ভার ফাংশন (/api)
netlify/functions/notify-tick.mjs  প্রতি ৫ মিনিটে: reminder আর বাকি notification পাঠানো
netlify/edge-functions/agent.js  AI এজেন্টের দরজা (/api/agent): শুধু Owner, Claude-এর সাথে কথা বলে
server/                 Supabase-এ লেখা-পড়া আর Web Push (encrypt + পাঠানো)
public/sw.js            অ্যাপের background worker: notification দেখানো, দ্রুত খোলা
public/manifest.webmanifest, public/icons/  অ্যাপের নাম, FTA লোগোর আইকন
public/vendor/          supabase.js, html2canvas, অনুমতির নিয়ম (fta-policy.js), কে কোন notification পাবে (fta-notify.js)
supabase/schema.sql     ডাটাবেস টেবিল আর নিরাপত্তা
tools/make-config.mjs   deploy-এর সময় config.js আর নিরাপত্তা হেডার তৈরি করে
tools/make-icons.py     লোগো থেকে অ্যাপ আইকন (লোগো বদলালে আবার চালান)
layers/                 আপনার v8 ডেমো (অপরিবর্তিত) + v9 লেয়ারগুলো
src/ui/                 অনুমোদিত ডিজাইন (Onyx & Gold), Profiles / My Profile, Profile Tree, Receipt Maker, Class status + Messages (classroom.js)
src/                    প্রোডাকশন লেয়ার (তারিখ, খালি ডাটা, থিম, ডাটা সেভ, AI এজেন্ট prod-agent.js)
build.py                সব জোড়া লাগিয়ে site/ তৈরি করে
tests/                  স্বয়ংক্রিয় পরীক্ষা
docs/requirements-checklist.md  আপনার সব চাহিদার তালিকা আর কোথায় আছে
```
