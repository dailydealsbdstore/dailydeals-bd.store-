# Daily Deals BD — ফ্রি Cloudflare deployment (বাংলা)

এই ধাপগুলো ক্রমানুসারে করুন। একবারে সব settings বদলানোর দরকার নেই। আপনার বর্তমান GitHub Pages ডোমেইন চালু থাকুক; Cloudflare Pages ও Worker পরীক্ষা না করা পর্যন্ত Namecheap nameserver বদলাবেন না।

## পর্ব A — GitHub Repository-তে নতুন ফাইল আপলোড

1. ZIP extract করুন।
2. Repository `dailydealsbdstore/dailydeals-bd.store-` খুলুন।
3. পুরোনো `index.html`-এর demo content-সহ repository root-এ এই ZIP-এর `public/`, `worker/`, `.github/`, `.gitignore`, `README.md` এবং `docs/` ফাইল আপলোড/কমিট করুন। পুরোনো ডেমোর ফাইলের সঙ্গে মিশিয়ে duplicate project রাখবেন না।
4. Branch-এর নাম `main` রাখুন।

## পর্ব B — Cloudflare Pages-এ Frontend

1. Cloudflare account-এ লগইন করুন: https://dash.cloudflare.com/
2. **Workers & Pages → Create → Pages → Connect to Git** নির্বাচন করুন।
3. GitHub connect করে `dailydeals-bd.store-` repository নির্বাচন করুন।
4. Project name হিসেবে `dailydeals-bd-store` দিন (বা আপনার পছন্দের lowercase project name)। Production branch `main`।
5. Build command ফাঁকা রাখুন। Build output directory লিখুন `public`। Root directory ফাঁকা রাখুন।
6. Deploy করুন। প্রথমে `https://<project-name>.pages.dev` URL-এ পরীক্ষা করুন।

## পর্ব C — Cloudflare D1 database তৈরি

1. Cloudflare Dashboard → **Storage & databases → D1 SQL Database** (বা D1) → Create database।
2. Database name দিন `dailydeals-bd-db`।
3. Database ID কপি করুন।
4. GitHub Repository-এর `worker/wrangler.toml` ফাইলে `database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"` জায়গায় ওই ID বসিয়ে commit করুন।
5. Migration ফাইল `worker/migrations/0001_initial.sql` স্বয়ংক্রিয়ভাবে অর্ডার, settings ও product-pricing টেবিল তৈরি করবে।

## পর্ব D — Worker deploy করার GitHub access

GitHub Actions Worker deploy করবে। এর জন্য Cloudflare API Token এবং Account ID লাগবে; **Business Koro API Key আলাদা এবং GitHub Actions secret হিসেবে রাখার প্রয়োজন নেই**।

1. Cloudflare Dashboard → My Profile → API Tokens → Create Token। Workers scripts edit ও D1 edit করার প্রয়োজনীয় permission দিন। Token কাউকে পাঠাবেন না।
2. GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**-এ যোগ করুন:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. এরপর `worker/` ফাইলে পরিবর্তন commit করলে GitHub Actions Worker deploy ও D1 migration চালাবে। প্রথম deploy-এর workflow result দেখুন।

## পর্ব E — Worker-এ Business Koro API ও Admin UID

1. প্রথমে নিজের ওয়েবসাইটের `https://<project-name>.pages.dev/login.html` থেকে Google বা Email/Password দিয়ে নিজের অ্যাকাউন্ট তৈরি/লগইন করুন। Firebase Authentication → Users-এ আপনার account-এর **UID** কপি করুন।
2. Cloudflare Dashboard → **Workers & Pages → dailydeals-bd-api → Settings → Variables and Secrets**-এ যান।
3. Secret যোগ করুন:
   - Name: `BUSINESS_KORO_API_KEY`
   - Value: Business Koro থেকে তৈরি করা API Key
4. `ADMIN_UID` নামে variable/secret যোগ করুন এবং Firebase থেকে কপি করা UID দিন। এটি না দিলে Admin Panel-এ অনুমতি পাওয়া যাবে না।
5. `BUSINESS_KORO_DOMAIN` শুধু তখন সেট করুন, যখন Business Koro API Key তৈরির সময় domain restriction-এ `dailydeals-bd.store` দিয়েছিলেন। সেক্ষেত্রে value হবে `dailydeals-bd.store`; API Key-তে domain খালি রাখলে এটি blank-ই রাখুন।
6. `ALLOWED_ORIGINS`-এ আপনার Pages URL অবশ্যই যোগ করুন, যেমন `https://dailydeals-bd-store.pages.dev`, সঙ্গে custom domain `https://dailydeals-bd.store,https://www.dailydeals-bd.store`। Cloudflare Worker Settings থেকে value পরিবর্তন করা যায়।

## পর্ব F — Frontend API URL সেট করা

`public/assets/common.js` ফাইলে এই লাইন আছে:

`export const API_BASE = 'https://api.dailydeals-bd.store';`

Cloudflare Worker custom domain চালু হওয়ার আগে পরীক্ষা করতে চাইলে এটিকে আপনার Worker `workers.dev` URL করুন, যেমন `https://dailydeals-bd-api.<YOUR-SUBDOMAIN>.workers.dev`। Worker custom domain যুক্ত করার পর আবার `https://api.dailydeals-bd.store` করুন এবং commit করুন। Worker-এর `ALLOWED_ORIGINS`-এ Pages URL অন্তর্ভুক্ত থাকতে হবে।

## পর্ব G — Firebase Login domain

Firebase Console → Authentication → Settings → Authorized domains-এ যোগ করুন:

- আপনার Cloudflare Pages staging domain, যেমন `dailydeals-bd-store.pages.dev`
- `dailydeals-bd.store`
- `www.dailydeals-bd.store`

Authentication → Sign-in method-এ Email/Password ও Google enabled থাকতে হবে। Facebook Login প্রয়োজন নেই।

## পর্ব H — নিজের ডোমেইন চালু করা (সবশেষে)

Cloudflare Pages apex/root domain (`dailydeals-bd.store`) ব্যবহার করতে হলে সাধারণত `dailydeals-bd.store`-কে Cloudflare-এ site/zone হিসেবে যোগ করে Namecheap থেকে Cloudflare nameservers ব্যবহার করতে হবে। **আগে ইমেইল ব্যবহার করলে MX/TXT রেকর্ডের কপি নিশ্চিত করুন।**

1. Cloudflare → Add a site → `dailydeals-bd.store` → Free plan। Cloudflare যে দুইটি nameserver দেয় তা লিখে রাখুন।
2. Namecheap → Domain List → Manage → Nameservers → Custom DNS-এ Cloudflare-প্রদত্ত nameservers বসান। Nameserver propagation-এর সময় সাময়িক DNS বিরতি হতে পারে; তাই staging ও Worker পরীক্ষা করার আগে করবেন না।
3. Cloudflare Pages project → Custom domains → `dailydeals-bd.store` যোগ করুন; তারপর `www.dailydeals-bd.store` যোগ করতে পারেন।
4. Worker `dailydeals-bd-api` → Settings → Domains & Routes → Add Custom Domain-এ `api.dailydeals-bd.store` যুক্ত করুন।
5. `public/assets/common.js`-এ `API_BASE` সঠিক আছে তা নিশ্চিত করে Pages redeploy করুন।
6. Firebase Authorized Domains আপডেট এবং Google login পরীক্ষা করুন।

## Live test checklist

- `/api/health`-এ API ও D1 configured দেখা যায়।
- Homepage-এ Business Koro products লোড হয় এবং public response-এ `costPrice` থাকে না।
- স্টক শেষ পণ্য কার্টে যোগ করা যায় না; backend-ও stock পুনরায় যাচাই করে।
- Checkout order প্রথমে Admin review-তে আসে; Business Koro-তে সঙ্গে সঙ্গে পাঠানো হয় না।
- Prepaid manual payment রেফারেন্স না দিলে অর্ডার জমা হয় না; অ্যাডমিন verify না করা পর্যন্ত পাঠানো যায় না।
- COD অর্ডার review/confirm করা যায়।
- Merge করতে একই ফোন, ঠিকানা, delivery zone ও payment method লাগে; delivery একবারই হিসাব হয়।
- Confirm হলে Business Koro order IDs / failure reason Admin Panel-এ দেখা যায়।
- একই order পুনরায় confirm করলে ইতিমধ্যে successful unit আবার পাঠানো হয় না।
- `ADMIN_UID` ছাড়া অন্য account Admin APIs ব্যবহার করতে পারে না।
