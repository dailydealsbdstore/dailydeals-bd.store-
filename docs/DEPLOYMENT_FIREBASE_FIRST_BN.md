# Daily Deals BD — Firebase-first সেটআপ (বাংলা)

## সিস্টেমটি কীভাবে কাজ করবে
- Business Koro API থেকে পণ্যের তালিকা **অ্যাডমিন নিজে Sync** করবেন। Sync করা পণ্য `products` collection-এ জমা হবে। ওয়েবসাইট পণ্য দেখানোর সময় শুধু Firestore পড়বে।
- নিজের পণ্য Admin Panel থেকে Manual Product Form দিয়ে যোগ করা যাবে। সেগুলোও `products` collection-এ থাকবে, কিন্তু `source: "manual"` হবে।
- সরবরাহকারীর cost price ও private pricing `product_private` collection-এ থাকবে; ক্রেতারা তা পড়তে পারবেন না।
- অর্ডার, payment status, customer delivery details, admin review, settings ও pricing — Firestore-এ থাকবে।
- Cloudflare Worker শুধু Business Koro-র API Key গোপন রাখবে, Sync-এর জন্য সরবরাহকারীর পণ্যের ডেটা এনে দেবে, এবং অ্যাডমিন অনুমোদিত অর্ডারের Business Koro অংশ পাঠাবে। Worker/D1 ওয়েবসাইটের মূল ডেটাবেস নয়।

## ধাপ ১ — Firebase Firestore একবার তৈরি/সেটআপ
1. [Firebase Console](https://console.firebase.google.com/) খুলে `dailydeals-bd` প্রজেক্ট নির্বাচন করুন।
2. **Build → Firestore Database** খুলুন। Database তৈরি না করা থাকলে **Create database** চাপুন। Production mode নির্বাচন করুন। Region বাছতে বললে `asia-south1 (Mumbai)` নিতে পারেন; region তৈরি হওয়ার পরে বদলানো যায় না। যদি Firestore আগে থেকেই তৈরি থাকে, নতুন database তৈরি করবেন না।
3. **Authentication → Users**-এ গিয়ে আপনার আগে থেকে তৈরি Admin user-এর `UID` কপি করুন। নতুন user বানানোর দরকার নেই, যদি সঠিক Admin user ইতিমধ্যে থাকে।
4. **Firestore Database → Data** খুলুন। `admins` collection তৈরি করুন (না থাকলে), Document ID হিসেবে ওই Admin UID দিন, এবং একটি field যোগ করুন: `role` (type: string, value: `admin`)।
5. **Firestore Database → Rules** খুলুন। এই প্যাকেজের root `firestore.rules` ফাইলের পুরো কোড কপি করে Rules editor-এ paste করে **Publish** চাপুন। এই Rules-এ UID hardcode করার দরকার নেই; Admin UID `admins/{UID}` document থেকে যাচাই হয়।

## ধাপ ২ — Business Koro Worker আপডেট
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → `dailydeals-bd-api` → **Edit code** খুলুন।
2. প্যাকেজের `worker/src/index.js` ফাইলের সম্পূর্ণ কোড দিয়ে Worker code প্রতিস্থাপন করুন, তারপর **Save and Deploy** চাপুন। Dashboard-এর editor যদি ফাইল structure নয়, একটিমাত্র editor দেখায়, তাহলে প্যাকেজের root-এ থাকা `worker-fixed.js`-এর সম্পূর্ণ কোড paste করুন।
3. আগের Worker settings বজায় রাখুন: Secret `BUSINESS_KORO_API_KEY`, Secret `ADMIN_UID` (আপনার Admin UID), variable `FIREBASE_PROJECT_ID` = `dailydeals-bd`, এবং `ALLOWED_ORIGINS` থাকলে সেটি। `BUSINESS_KORO_DOMAIN` আগে ব্যবহার করে থাকলে রাখুন।
4. নতুন Worker-এ D1 binding লাগে না। পুরোনো D1 database/binding Cloudflare থেকে মুছতে হবে না; শুধু নতুন কোড আর D1-তে লিখবে না।

## ধাপ ৩ — GitHub/Cloudflare Pages ওয়েবসাইট আপডেট
আপনার আগের repository ও Cloudflare Pages project-ই ব্যবহার করুন। প্যাকেজের `public/` ফোল্ডারের নিচের পরিবর্তিত ফাইলগুলো repository-তে একই path-এ প্রতিস্থাপন করুন:
- `public/firebase-config.js`
- `public/assets/common.js`
- `public/assets/store.js`
- `public/assets/product.js`
- `public/assets/cart.js`
- `public/assets/account.js`
- `public/assets/admin.js`
- `public/admin.html`

সાથે repository root-এর `firestore.rules` ফাইলটিও রাখুন (এটি GitHub-এ থাকলেই Rules publish হয়ে যায় না—Firebase Console-এ ধাপ ১-এ আলাদাভাবে Publish করতে হবে)। Commit করার পর Cloudflare Pages-এর deployment সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।

## ধাপ ৪ — প্রথম যাচাই
1. ওয়েবসাইটে হোমপেজ খুলুন। প্রথমবার Firestore-এ পণ্য না থাকলে product grid ফাঁকা থাকা স্বাভাবিক।
2. `/login.html` থেকে আপনার বিদ্যমান Admin user দিয়ে লগইন করুন, তারপর `/admin.html` খুলুন।
3. **প্রোডাক্ট → Business Koro থেকে সিঙ্ক করুন** চাপুন। সফল হলে Business Koro পণ্য Firestore `products`-এ জমা হবে এবং `product_private`-এ private cost/pricing থাকবে।
4. একই Admin Panel-এর Manual Product Form দিয়ে একটি নিজের পণ্য যোগ করে `ওয়েবসাইটে প্রকাশ করুন` টিক দিয়ে সংরক্ষণ করুন।
5. হোমপেজে পণ্য দেখা যাচ্ছে কিনা দেখুন; তারপর একটি COD test order জমা দিয়ে Admin Panel-এর **অর্ডার রিভিউ** পরীক্ষা করুন। প্রথম পরীক্ষায় Business Koro-তে বাস্তব অর্ডার পাঠানোর আগে যাচাই করুন যে অর্ডারের পণ্য ও দাম সঠিক।

## এই ভার্সনে যা আছে / সীমা
- Public website Firestore থেকে পণ্য পড়ে; প্রতিবার পেজ খুললে Business Koro product API call করে না।
- API product import হচ্ছে Admin Panel-এর একবারের manual Sync বাটন দিয়ে; স্বয়ংক্রিয় scheduled sync চালু নয়।
- Manual product-এর ছবি এখন সরাসরি image URL দিয়ে যোগ করতে হয়; Admin Panel থেকে ফাইল upload করার feature এই প্যাকেজে নেই।
- Business Koro API-তে অর্ডার পাঠানো হয় কেবল অ্যাডমিন Confirm করার পরে এবং শুধু `source: "businesskoro"` items। Manual products supplier API-তে পাঠানো হয় না।
- API response-এর product fields ও supplier order endpoint আপনার Business Koro account-এ live test না করা পর্যন্ত ১০০% যাচাই করা হয়েছে বলা যাবে না। প্রথমে ১টি test product/order দিয়ে পরীক্ষা করুন।
- Guest checkout-এর ক্ষেত্রে Firebase App Check / server-side spam protection ভবিষ্যতে যোগ করা যেতে পারে।
