# Daily Deals BD — SEO, Analytics ও Firestore rollout (বাংলা)

এই আপডেটটি মূল storefront-এর layout, cart, checkout flow, product schema, admin controls বা Firebase configuration প্রতিস্থাপন করে না। প্রাথমিক উদ্দেশ্য হলো SEO indexing hygiene, product canonical এবং repository-র Firestore Rules ফাইলকে ব্যবহারকারীর পাঠানো Rules-এর সঙ্গে সামঞ্জস্য করা।

## এই প্যাকেজে পরিবর্তন

- `public/robots.txt`: সব public route crawl করা যায়; নিচের non-search pages তাদের HTML-এর `noindex` দিয়ে বাদ থাকবে।
- `public/sitemap.xml`: শুধু নিশ্চিত, স্থায়ী canonical public pages আছে। `product.html`-এর ID ছাড়া template URL বাদ দেওয়া হয়েছে।
- `public/login.html`, `public/account.html`, `public/cart.html`: `noindex,follow` যোগ হয়েছে। `public/admin.html`-এ আগে থেকেই `noindex,nofollow` ছিল।
- `public/assets/product.js`: product canonical সবসময় `https://dailydeals-bd.store/product.html?id=...` হয়; বর্তমান Product JSON-LD-তে canonical URL যোগ হয়েছে এবং image URLs absolute করা হয়েছে।
- `public/admin.html`: GA4 বনাম GTM এবং Google Ads conversion-এর duplicate tag এড়ানোর জন্য ছোট নির্দেশনা যোগ হয়েছে।
- `public/privacy.html`: Analytics/ad tracking চালু থাকলে শর্তসাপেক্ষ disclosure যোগ হয়েছে। প্রকৃত ব্যবসার যোগাযোগ ও tracking/consent setup অনুযায়ী নীতিটি নিজে যাচাই করে সম্পূর্ণ করতে হবে।
- `firestore.rules`: ব্যবহারকারীর আলাদা আপলোড করা `firestore(3).rules`-এর কনটেন্ট এখানে রাখা হয়েছে। ZIP-এর আগের Rules ব্যাকআপ `docs/firestore.rules.original-package.bak` ফাইলে আছে।

## 1. Deploy করার নিরাপদ পদ্ধতি

1. GitHub repository-র বর্তমান branch/commit ব্যাকআপ রাখুন। ZIP-টি আগে আলাদা branch-এ পরীক্ষা করা ভালো।
2. এই ZIP-এর `public/` ও root `firestore.rules` ফাইলগুলি একই repository path-এ তুলনা করে নিন। পুরো repository অন্ধভাবে overwrite করবেন না।
3. Cloudflare Pages-এর Build output directory যদি `public` হয়, তাহলে HTML, `robots.txt` ও `sitemap.xml` সেই folder থেকে serve হচ্ছে নিশ্চিত করুন। Build command ও environment variable অকারণে পরিবর্তন করবেন না।
4. আগে একটি preview deployment পরীক্ষা করুন, তারপর production branch-এ merge করুন।
5. Deploy শেষে এই URL-গুলি খোলার চেষ্টা করুন:
   - `https://dailydeals-bd.store/`
   - `https://dailydeals-bd.store/robots.txt`
   - `https://dailydeals-bd.store/sitemap.xml`
   - `https://dailydeals-bd.store/login.html`
   - একটি প্রকৃত product URL: `https://dailydeals-bd.store/product.html?id=REAL_PRODUCT_ID`

## 2. Search Console

1. `https://search.google.com/search-console/` খুলুন।
2. `Domain` property হিসেবে `dailydeals-bd.store` যোগ করুন (scheme `https://` দেবেন না)।
3. Google-এর দেয়া TXT verification record Cloudflare DNS-এ যোগ করে Verify করুন। আগের DNS record মুছবেন না।
4. `Sitemaps`-এ `sitemap.xml` জমা দিন।
5. `URL Inspection` দিয়ে homepage এবং প্রকৃত product URL পরীক্ষা করুন; eligible হলে `Request Indexing` দিন। Request দিলেই index নিশ্চিত হয় না।

### Dynamic product sitemap সম্পর্কে

Products Firestore থেকে dynamically আসে এবং URL-এ `?id=...` থাকে। এই static sitemap সব Firestore product IDs নিজে থেকে জানে না, তাই ZIP-এ ভুয়া/template product URL ঢোকানো হয়নি। Homepage-এর crawlable product links থেকে Google product URLs আবিষ্কার করতে পারে, কিন্তু বড়/বাড়তে থাকা product catalogue-এর জন্য পরবর্তী ধাপে Cloudflare Pages Function/Worker বা deploy-time generated sitemap যোগ করা উচিত। সেটি করার আগে hosting routes ও Firestore public-product query আলাদাভাবে পরীক্ষা করতে হবে; এই প্যাচে সেটি ইচ্ছাকৃতভাবে যোগ করা হয়নি যাতে বর্তমান architecture অযথা না বদলায়।

## 3. GA4 অথবা GTM চালু করা

1. GA4: `https://analytics.google.com/` → Admin → Data streams → Web stream থেকে Measurement ID (`G-...`) নিন।
2. Admin Panel → `Analytics / Ads` → `Google Analytics / Google Tag Manager code` ঘরে Google থেকে পাওয়া **পূর্ণ official GA4 Google tag snippet** অথবা **পূর্ণ GTM head snippet**—একটি পদ্ধতি দিন, দুটো নয়।
3. Save করে public homepage নতুন tab-এ খুলুন; GA4 Realtime report-এ event আসছে কি না যাচাই করুন। কখনো browser consent/ad blocker ও data delay প্রভাব ফেলতে পারে।
4. Google Ads conversion সরাসরি চালালে Google-এর প্রয়োজনীয় base tag ও conversion setup দুটোই সম্পূর্ণ আছে কি না যাচাই করুন। GTM দিয়ে conversion চালালে GTM container-এর মধ্যে tag/trigger configure করুন; একই conversion দ্বিতীয় ঘরে আবার বসাবেন না।
5. Admin Panel-এ API key, secret, password বা private token paste করবেন না। `settings/site` public-read হওয়ায় সেখানে রাখা tracking snippets সবাই দেখতে পারে—এটি স্বাভাবিক।
6. Google Ad Manager/GPT আলাদা সেবা; বর্তমান ফর্মে Ad Manager-এর জন্য আলাদা full GPT + ad-slot implementation নেই। শুধু GA/GTM snippet ঘরে GPT code paste করলে পূর্ণ Ad Manager setup হবে না।
8. বর্তমান `tracking.js` snippet-এর `<script>` tag চালায়; GTM-এর দ্বিতীয় `<noscript><iframe ...></iframe></noscript>` fallback body-তে ঢোকায় না। সাধারণ JavaScript-enabled browser-এ head snippet চলতে পারে, কিন্তু official GTM no-JavaScript fallback সম্পূর্ণ করতে হলে আলাদা body insertion সমর্থন যোগ করতে হবে।
7. Tracking সক্রিয় থাকলে Privacy Policy-তে বাস্তব tag, ব্যবহার, cookies/identifiers এবং প্রযোজ্য consent ব্যবস্থা সঠিকভাবে বর্ণনা করুন।

## 4. Firestore Rules নিয়ে সতর্কতা

Root `firestore.rules` এখন ব্যবহারকারীর পাঠানো পূর্ণ Rules। GitHub-এ ফাইল আপডেট/commit করলে Firebase Rules নিজে থেকে Publish হয় না; Firebase Console → Firestore Database → Rules-এ আলাদাভাবে Publish করতে হয়। Publish-এর আগে বর্তমানে Firebase Console-এ থাকা live rules কপি করে সংরক্ষণ করুন।

এই Rules বর্তমান ZIP-এর checkout field (`totalQuantity`, `productIds`, `contact_after_order`, `pending_contact`), coupons, reviews, user profile ও private pricing-এর সঙ্গে বেশি সামঞ্জস্যপূর্ণ। তবে production-এ Rules পরিবর্তনের আগে অন্তত নিচের test করুন:

- Public homepage থেকে `active == true` products query সফল হয়।
- Admin products, `product_private`, orders, coupons, reviews ও settings লোড করতে পারেন।
- Guest order (coupon ছাড়া) জমা হয়।
- Logged-in order এবং বৈধ coupon order পরীক্ষা হয়; invalid/expired coupon block হয়।
- গ্রাহক নিজের account/order দেখতে পারেন, অন্য গ্রাহকের order পড়তে পারেন না।
- নিজের qualifying order-এর জন্য customer review pending অবস্থায় জমা হয়; public-এ শুধু published review দেখা যায়।
- Admin review publish/hide, store settings save এবং tracking snippet save করতে পারেন।
- `settings/store`-এ পুরোনো `pricingMode`, `profitValue`, `packagingCost` থাকলে Admin-এর legacy migration শেষ হয় এবং sensitive pricing আর public read করা যায় না।

কোনো test ব্যর্থ হলে live rules-এ তাড়াহুড়ো করে পরিবর্তন না করে আগের backup restore করুন এবং failing operation-এর console error অনুযায়ী সংশোধন করুন।

### Coupon ও guest checkout-এর বর্তমান আচরণ

এই Rules-এ coupon payload থাকলে customer-কে authenticated হতে হয়; তাই guest checkout coupon ব্যবহার করলে Rules প্রত্যাখ্যান করবে। Coupon ছাড়া guest order অনুমোদিত। এটি Rules-এর বর্তমান explicit policy—guest coupon দরকার হলে আগে abuse/usage-limit handling নিয়ে সিদ্ধান্ত নিয়ে পরে Rules ও validation একসাথে বদলাতে হবে।

## 5. গুরুত্বপূর্ণ সীমাবদ্ধতা / পরবর্তী নিরাপত্তা কাজ

Firestore Rules-এ order totals-এর গাণিতিক সামঞ্জস্য যাচাই করা হয়েছে, কিন্তু rules-এর বর্তমান `validNewOrder()` প্রতিটি `items[]` line-এর `productId`, `unitPrice`, `qty` এবং বর্তমান Firestore product price/stock-এর সঙ্গে server-side মিল যাচাই করে না। Browser-এর code নিজে নির্ভরযোগ্য security boundary নয়। তাই Business Koro বা delivery confirmation-এর আগে Admin-কে live product price/stock এবং submitted order-এর line items পুনরায় যাচাই করতে হবে। দীর্ঘমেয়াদি সমাধান হলো server-side order validation/creation endpoint (Cloudflare Worker বা Cloud Function) এবং idempotency/rate limiting—এটি আলাদা করে test না করে এই ZIP-এ checkout architecture পরিবর্তন করা হয়নি।

এই প্যাকেজে automated live Firebase, Cloudflare deployment বা Google indexing test চালানো হয়নি; URL deployment, Firestore Rules publish এবং analytics event production access আপনার অ্যাকাউন্টে যাচাই করতে হবে।
