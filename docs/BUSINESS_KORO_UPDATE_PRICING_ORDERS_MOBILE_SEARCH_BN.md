# Daily Deals BD — Business Koro Update, Order Confirmation ও Mobile Search

এই আপডেটটি বর্তমান HTML/JS + Cloudflare Pages + Firebase Firestore প্রকল্পের জন্য। বিদ্যমান product page, cart/checkout, Firestore order data, WhatsApp details এবং Business Koro Worker route অক্ষত রেখে পরিবর্তন করা হয়েছে। Production-এ দেওয়ার আগে backup নিন।

## কী বদলেছে

1. **নতুন পণ্য Sync:** Business Koro থেকে কেবল নতুন supplier product যোগ করে। আগে থেকে থাকা supplier product-এর price বা manual custom values আবার overwrite করে না।
2. **Update Products:** আগে থেকে import করা supplier product-এর stock/status, supplier metadata ও variants আপডেট করে। নতুন supplier ID পাওয়া গেলে সেটি report-এ জানায়; নতুন পণ্য যোগ করতে `নতুন পণ্য Sync` ব্যবহার করুন।
3. **Update Pricing checkbox:** ডিফল্টে unticked। টিক না দিলে বর্তমান selling price অক্ষত থাকে। টিক দিলে সংরক্ষিত product/business pricing rule অনুযায়ী দাম পুনরায় হিসাব হয়। Cost Price না পেলে ওই পণ্যের price বদলানো হয় না, তবে stock/status update চলতে পারে।
4. **Supplier product-এর manual edit:** Admin Panel থেকে title, category, description, image URLs ও selling price সম্পাদনা করা যায়। title/description/category/images `adminOverrides`-এ রাখা হয়, তাই Update Products এগুলো বদলানোর আগে custom override দেখে। Stock ও variants supplier Update Products দিয়ে আপডেট হয়। Update Pricing টিক দিলে manual selling price-ও সংরক্ষিত pricing rule দিয়ে পুনরায় হিসাব হবে—এটি প্রত্যাশিত। একাধিক image URL edit করার সময় newline ঠিকভাবে রাখা হয়।
5. **Order actions:** `কনফার্ম করুন` status-কে `confirmed` করে; এটি নিজে Business Koro-তে order পাঠায় না। `Business Koro-তে পাঠান` আলাদা action। Messenger details action বাদ। Cancel ও WhatsApp details আছে। Supplier send ব্যর্থ হলে customer confirmation status আলাদা থাকে এবং retry করা যায়।
6. **Customer-visible confirmation:** লগইন করা customer-এর My Account → My Orders-এ `অর্ডার নিশ্চিত হয়েছে` status দেখা যাবে। Guest order account page-এ দেখানোর জন্য login/guest-order tracking-এর আলাদা ব্যবস্থা প্রয়োজন; এই update guest tracking যোগ করে না।
7. **Mobile product search:** storefront-এর header search mobile width-এ দৃশ্যমান। Admin product catalogue-এ name/Product ID/category search আছে। Cache-busting URL update করা হয়েছে যাতে পুরনো CSS/JS ব্যবহার হওয়ার সম্ভাবনা কমে।
8. **Worker payment flow:** `contact_after_order` এবং COD—দুটিকে supplier submission-এর ক্ষেত্রে no-prepayment/contact-on-order path হিসেবে বিবেচনা করা হয়। Prepaid methods-এর জন্য payment verification প্রয়োজন। Worker source ও dashboard-compatible `worker-fixed.js` সমন্বয় করা হয়েছে।

## নিরাপদে Deploy করার ধাপ

1. বর্তমান GitHub Repository-এর Backup/ZIP নিন।
2. Patch ZIP ব্যবহার করলে path বজায় রেখে ফাইলগুলো একই জায়গায় replace করুন। Full Project ZIP দিয়ে পুরো repository overwrite করার আগে আপনার নিজস্ব ফাইল/secret বাদ পড়ছে না কি না যাচাই করুন।
3. GitHub commit/push করুন। Cloudflare Pages build output directory আগের মতোই রাখুন (সাধারণত `public`)।
4. Worker আলাদা করে deploy হয় হলে `worker/src/index.js`-এর পরিবর্তন deploy করুন। যদি Cloudflare Dashboard-এ `worker-fixed.js` কপি করে deploy করেন, একই Worker update সেখানে দিন। `BUSINESS_KORO_API_KEY`, `ADMIN_UID`, `FIREBASE_PROJECT_ID` Worker Secrets/vars অক্ষত রাখুন।
5. Cloudflare Pages deployment সফল হওয়ার পর মোবাইল browser-এ cache refresh করুন। Storefront-এ search field, category filter, product view ও cart পরীক্ষা করুন। Admin Panel-এ product search পরীক্ষা করুন।
6. Test supplier product নিয়ে `নতুন পণ্য Sync`, তারপর unticked `Update Products` চালিয়ে দেখুন price আগের মতো থাকে কি না, stock/variant update হয় কি না। এরপর checkbox tick করলে pricing rule অনুযায়ী price বদলায় কি না পরীক্ষা করুন। Live product price বদলানোর আগে backup বা একটি test product ব্যবহার করুন।
7. Admin Panel-এ test order তৈরি করুন। `কনফার্ম করুন` দিলে Business Koro-তে পাঠানো ছাড়াই customer account status আপডেট হয় কি না দেখুন। এরপর supplier order পাঠানোর জন্য আলাদা করে Business Koro action ব্যবহার করুন। বাস্তব customer বা paid supplier order দিয়ে পরীক্ষা করবেন না।

## Firestore Rules

এই package-এ `firestore.rules` আছে। এতে customer review-এর order-status allowlist-এ `confirmed` অন্তর্ভুক্ত। Firebase Console-এর active Rules-এ status আগে থেকেই থাকলে পরিবর্তনের দরকার নেই। না থাকলে বর্তমান Rules backup নিয়ে root-এর `firestore.rules`-এর সঙ্গে তুলনা করে Firestore → Rules থেকে publish করুন। আপনার live rules-এ custom changes থাকলে অন্ধভাবে overwrite করবেন না। Rules update না করলে review/confirmed status সম্পর্কিত কিছু আচরণে permission error হতে পারে; Admin-only order confirmation নিজে `isAdmin()` অনুমতির ওপর নির্ভর করে।

## যাচাইয়ের সীমা

এই প্যাকেজে JavaScript syntax, HTML basic parse, local asset references এবং ZIP integrity পরীক্ষা করা হয়েছে। Live Firebase, Cloudflare production, Business Koro credentials এবং real order end-to-end এখানে চালিয়ে যাচাই করা হয়নি। Production-এ যাওয়ার আগে Preview/test deployment এবং controlled test order ব্যবহার করুন।
