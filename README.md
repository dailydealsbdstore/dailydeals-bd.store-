# Daily Deals BD — নতুন ওয়েবসাইট

এই প্রজেক্টটি `dailydeals-bd.store`-এর জন্য নতুন করে তৈরি করা হয়েছে। এটি পুরোনো `final-main.zip` ডেমোর কোড কপি করে তৈরি নয়।

## কী আছে

- Responsive Bengali storefront ও পণ্যের তালিকা
- Business Koro Storefront API থেকে লাইভ product/stock data
- Server-side pricing: `costPrice + ৳৩০ packaging` + default percentage/fixed margin; product-level override
- ঢাকা সিটির ভিতরে ৳৮০ এবং বাইরে ৳১৩০ delivery (Admin settings থেকে পরিবর্তনযোগ্য)
- Cart, division/district/area dropdown, manual payment/COD এবং checkout
- অর্ডার প্রথমে স্থানীয় Cloudflare D1-তে `pending_review` হয়; Admin Confirm না করা পর্যন্ত Business Koro-তে যায় না
- Admin order review, item/customer/address edit, same-customer order merge, manual-payment verification, Business Koro submission result
- Firebase Email/Password ও Google sign-in; Facebook Login নেই
- Customer order history when signed in
- Cloudflare Pages (static UI) + Cloudflare Worker (secret API backend) + D1 (local order records)

## গুরুত্বপূর্ণ API সীমা

Business Koro-এর তোমার দেওয়া ডকুমেন্টেশনে `POST /orders` একটি `productId` নেয়; `quantity` উপেক্ষা করা হয়। তাই cart/merged order-এ একাধিক product/quantity থাকলে Worker প্রত্যেক unit-এর জন্য আলাদা Business Koro order request করে। Worker একবারে সর্বোচ্চ ৩৫ unit পাঠায়। অর্ডার partial হলে সফল unit-এর ফলাফল সংরক্ষণ করা হয়, যাতে পরের চেষ্টা সফল unit-গুলো আবার পাঠানোর চেষ্টা না করে।

`products` endpoint-এ `costPrice` ও `minimumSellingPrice` থাকে। `costPrice` কোনো public response-এ পাঠানো হয় না। Selling price কমপক্ষে Business Koro-এর `minimumSellingPrice.customerPaysDelivery` হবে, কারণ checkout-এ delivery customer pays ধরে পাঠানো হয়।

## ফোল্ডার

- `public/` — Cloudflare Pages-এর static site
- `worker/` — Cloudflare Worker API ও D1 migration
- `.github/workflows/deploy-worker.yml` — GitHub Actions থেকে Worker deploy
- `docs/DEPLOYMENT_BN.md` — ধাপে ধাপে বাংলায় deployment
- `docs/FEATURES_AND_LIMITS_BN.md` — ফিচার/সীমাবদ্ধতা ও যাচাই তালিকা

## এখনো যেগুলো সেট করতে হবে

1. Cloudflare D1 database তৈরি করে ID `worker/wrangler.toml`-এ বসাতে হবে।
2. Cloudflare-এ Worker Secrets: `BUSINESS_KORO_API_KEY`; Worker variable/secret: `ADMIN_UID` (নিজের Firebase UID)।
3. GitHub Actions Secrets: `CLOUDFLARE_API_TOKEN` ও `CLOUDFLARE_ACCOUNT_ID`।
4. `public/assets/common.js`-এ API_BASE অবশ্যই deployed Worker custom domain/URL-এ মিলতে হবে। ডিফল্ট: `https://api.dailydeals-bd.store`।
5. Firebase Authentication > Authorized domains-এ staging Pages domain ও পরে `dailydeals-bd.store` এবং `www.dailydeals-bd.store` যোগ করতে হবে।
6. Firebase sign-in provider-এ Email/Password এবং Google চালু থাকতে হবে। Facebook Login ব্যবহার করা হয়নি।

## সিকিউরিটি নোট

- Firebase Web Config public client config; এটি admin credential নয়। Security নির্ভর করে verified ID token, Worker-side `ADMIN_UID` এবং D1/Worker checks-এর ওপর।
- Business Koro API Key, Cloudflare API Token বা অন্য secret public code-এ দেবেন না।
- D1 order/customer data ব্যক্তিগত তথ্য। কেবল প্রয়োজনীয় তথ্য রাখুন; privacy/terms পাতার placeholder প্রকাশের আগে বাস্তব নীতি দিয়ে বদলান।
- Cloudinary-এর unsigned upload preset এই MVP-তে ব্যবহার করা হয়নি। প্রোডাক্টের ছবিগুলো Business Koro API থেকেই আসে। নিজস্ব banner upload পরে নিরাপদ signed upload হিসেবে যোগ করতে হবে।

## Local syntax checks

`node --input-type=module --check < public/assets/store.js` এবং অন্য JS ফাইল দিয়ে syntax check করা যায়। Worker deploy-এর আগে `worker` ফোল্ডারে `npm install` প্রয়োজন।
