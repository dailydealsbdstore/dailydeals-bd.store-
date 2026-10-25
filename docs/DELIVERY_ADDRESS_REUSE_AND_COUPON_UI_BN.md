# Daily Deals BD — Saved Delivery Addresses ও Coupon Product Picker Fix

## কী পরিবর্তন হয়েছে

1. লগইন করা গ্রাহক চেকআউটে আগের ডেলিভারি ঠিকানা বেছে নিতে পারবেন। তালিকায় অ্যাকাউন্টে সেভ করা ঠিকানা এবং একই অ্যাকাউন্টের আগের অর্ডারের ঠিকানা থাকবে।
2. `নতুন ঠিকানা লিখুন` নির্বাচন করে নতুন তথ্য দেওয়া যাবে।
3. `এই ডেলিভারি তথ্য আমার অ্যাকাউন্টে সেভ করুন` টিক থাকলে সফল অর্ডারের পরে ঠিকানাটি `users/{uid}.deliveryAddresses`-এ সেভ হবে। সর্বশেষ ৫টি আলাদা ঠিকানা রাখা হবে। সেভ ব্যর্থ হলেও অর্ডার ও WhatsApp checkout থামবে না।
4. Coupon Admin-এর `কোন পণ্যে কুপন প্রযোজ্য?` তালিকায় checkbox ১৬×১৬ px নির্দিষ্ট করা হয়েছে, যাতে পণ্যের নাম স্বাভাবিকভাবে অনুভূমিকভাবে দেখা যায়।
5. `firestore.rules`-এ শুধু নিজস্ব user profile-এ সর্বোচ্চ ৫টি delivery address save/update করার অনুমতি ও field validation যোগ হয়েছে। Coupon usage, order status, tracking ও reviews-এর আগের আপডেটগুলো রাখা হয়েছে।

## ফাইল পরিবর্তন

- `public/cart.html`
- `public/assets/cart.js`
- `public/admin.html`
- `firestore.rules`

## GitHub/Cloudflare Pages Deploy

1. বর্তমান GitHub repository এবং Firebase Rules-এর backup রাখুন।
2. Patch ZIP Extract করে একই path-এর ফাইলগুলো replace করুন, অথবা Full Project ZIP-এর সঙ্গে নিজের কাস্টম পরিবর্তনগুলো মিলিয়ে নিন।
3. GitHub-এ Commit/Push করুন এবং Cloudflare Pages deployment সফল হতে দিন।
4. Firebase Console → Firestore Database → Rules-এ বর্তমান Rules backup করে project-এর আপডেট হওয়া root `firestore.rules` ফাইলের সঙ্গে মিলিয়ে Publish করুন। Rules publish না করলে user profile-এ delivery address save/update permission-denied হতে পারে।

## কীভাবে পরীক্ষা করবেন

1. একটি customer account-এ login করে checkout খুলুন।
2. প্রথমবার নতুন ঠিকানা দিয়ে `এই ডেলিভারি তথ্য আমার অ্যাকাউন্টে সেভ করুন` টিক রেখে test order দিন।
3. একই account দিয়ে আবার checkout খুলুন। saved delivery address dropdown থেকে ঠিকানাটি নির্বাচন করা যাবে; সর্বশেষ saved address স্বয়ংক্রিয়ভাবেও ফর্মে আসবে।
4. অন্য ঠিকানা দিতে dropdown-এ `নতুন ঠিকানা লিখুন` নির্বাচন করুন।
5. একই account-এর পুরোনো অর্ডার থাকলে সেভ করা ঠিকানা ছাড়াও history address dropdown-এ পাওয়া যাবে (duplicate address একবারই দেখানো হবে)।
6. Admin → Coupons → “কোন পণ্যে কুপন প্রযোজ্য?” দেখুন। checkbox ছোট থাকবে এবং product name স্বাভাবিকভাবে দেখাবে।

## গুরুত্বপূর্ণ নোট

- Save addresses কেবল login করা গ্রাহকের জন্য। Guest checkout আগের মতো চলবে; guest address account-এ save হবে না।
- সর্বশেষ ৫টি আলাদা address profile-এ রাখা হয়। এর বাইরে পুরোনো order-এর ঠিকানা তাদের অর্ডার history-তে থাকে, এবং যতগুলো আগের অর্ডার query ফলাফলে আসে সেখান থেকেও বেছে নেওয়া যায়।
- Firebase Rules ও live Cloudflare/Firebase runtime এখানে end-to-end পরীক্ষা করা হয়নি। Deploy-এর পর test order দিয়ে যাচাই করুন।
