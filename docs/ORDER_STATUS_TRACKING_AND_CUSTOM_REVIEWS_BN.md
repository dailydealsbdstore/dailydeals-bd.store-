# Daily Deals BD — Order Status, Tracking ID ও Custom Review Setup

এই আপডেটে বর্তমান HTML/JS, Firebase/Firestore ও Cloudflare Pages গঠন রেখে অর্ডার ট্র্যাকিং এবং Admin-added review-তে ছবি যোগ করার ব্যবস্থা আছে।

## কীভাবে অর্ডার স্ট্যাটাস কাজ করবে

1. **Pending / প্রাথমিক যাচাই** — কাস্টমারের অর্ডার জমা হলে `pending_review` থাকবে।
2. **Confirmed / কনফার্মড** — Admin `কনফার্ম করুন` চাপলে `confirmed` হবে। Business Koro-তে পাঠানো আলাদা থাকবে।
3. **Shipped / কুরিয়ারে পাঠানো** — Admin অর্ডার কার্ডে কুরিয়ারের নাম, Tracking ID এবং ঐচ্ছিক Tracking URL দিয়ে `Shipped / কুরিয়ারে পাঠানো হয়েছে` চাপবেন। Tracking ID বাধ্যতামূলক। Business Koro-এর পণ্য থাকলে আগে Business Koro-তে পাঠানো হয়েছে বলে সিস্টেমে রেকর্ড থাকতে হবে।
4. **Delivered / সম্পন্ন** — পার্সেল কাস্টমারের হাতে পৌঁছালে `ডেলিভারড / সম্পন্ন` চাপবেন। ডেটায় `status: delivered` এবং `deliveredAt`/`completedAt` থাকবে।

কাস্টমার লগইন করে Account → My Orders-এ স্ট্যাটাস timeline, Courier, Tracking ID এবং দিলে Tracking URL দেখতে পাবে। Customer Account ও Admin order list Firestore `onSnapshot` ব্যবহার করে স্বয়ংক্রিয়ভাবে আপডেট হবে। অতিথি (guest) অর্ডারের ক্ষেত্রে বর্তমান সিস্টেমের মতো Account history-তে দেখাতে customer login প্রয়োজন; এই আপডেটে guest order tracking lookup যোগ করা হয়নি।

## Admin থেকে Tracking ID যোগ

1. GitHub/Cloudflare-এ কোড Deploy করার পরে Admin Panel খুলুন।
2. অর্ডারটি Pending হলে আগে `কনফার্ম করুন` করুন। Prepaid payment method হলে বর্তমান নিয়ম অনুযায়ী payment যাচাই করতে হবে।
3. Courier name এবং Tracking ID দিন। Tracking URL থাকলে সেটিও দিন (শুধু `https://` বা `http://` URL)।
4. `Shipped / কুরিয়ারে পাঠানো হয়েছে` চাপুন। পরে Tracking ID/URL সংশোধন করা যাবে।
5. কাস্টমারের হাতে পণ্য পৌঁছালে `ডেলিভারড / সম্পন্ন` চাপুন।

## Manual / Custom Review-তে ছবি যোগ

1. Admin Panel → Product Reviews খুলুন।
2. পণ্য, display name, 1–5 star rating, title এবং review text দিন।
3. ছবির HTTPS URL সরাসরি দিতে পারেন, অথবা Cloudinary configuration ঠিক থাকলে একটি image file আপলোড করুন।
4. `Admin-যোগ করা রিভিউ প্রকাশ করুন` চাপুন। পণ্যের পেজে লেখা ও ছবি দেখা যাবে।

**স্বচ্ছতার নোট:** Admin-যোগ করা রিভিউ পাবলিক পেজে `Admin-যোগ করা রিভিউ · ক্রেতা-যাচাইকৃত নয়` হিসেবে চিহ্নিত হয়। প্রকৃত ক্রেতা অনুমোদিত না হলে তাঁর নামে ক্রয়-অভিজ্ঞতা বানিয়ে বা যাচাইকৃত রিভিউ বলে উপস্থাপন করবেন না।

## Firebase Rules — এই পরিবর্তনটি প্রকাশ করতে হবে

`firestore.rules`-এ `validCustomerReview()` function-এর অনুমোদিত order status-এ `shipped` যোগ হয়েছে। Firebase Console → Firestore Database → Rules-এ বর্তমান Rules backup নিয়ে এই ZIP-এর `firestore.rules`-এর সঙ্গে মিলিয়ে প্রয়োজনীয় পরিবর্তন Publish করুন।

অর্ডার update permission নতুন করে খুলতে হয়নি: বর্তমান rules-এ order create/update/delete Admin-সীমাবদ্ধ রয়েছে। Admin-যোগ করা review-ও `isAdmin()` check-এর আওতায় থাকে; customer-submitted review-এর field list অপরিবর্তিত, তাই customer review documents-এ image field উন্মুক্ত করা হয়নি।

## Deploy করার নিরাপদ পদ্ধতি

1. GitHub Repository backup/commit করুন।
2. Full ZIP হলে পুরো ফাইলের সঙ্গে নিজের আগের কাস্টমাইজেশন তুলনা করুন। সাধারণত Patch ZIP-এর ফাইলগুলো একই path-এ Replace করাই নিরাপদ।
3. GitHub-এ Commit/Push করুন এবং Cloudflare Pages Production Deployment সফল হয়েছে কি না দেখুন।
4. Firebase Console-এ Rules পরিবর্তন Publish করুন (যদি live rules পুরোনো হয়)।
5. Browser-এ Admin এবং Customer Account-এ hard refresh দিন (`Ctrl+F5`)।

## Preview / Test checklist

- Test order Pending অবস্থায় দেখা যায়।
- Confirm করলে Admin এবং customer Account-এ status আপডেট হয়।
- Courier + Tracking ID ছাড়া Shipped হয় না।
- Tracking ID/URL জমা হলে customer account-এ দেখা যায় এবং URL খোলে।
- Delivered চাপলে final status ও timestamp দেখা যায়।
- Admin Review-তে image URL দিয়ে review জমা হয়, product page-এ image/label দেখা যায়।
- Cloudinary upload config না থাকলে image URL ব্যবহার করুন।

এই প্যাকেজে JavaScript syntax, HTML parsing এবং ZIP integrity যাচাই করা হয়েছে; live Firebase/Cloudflare project-এ end-to-end test চালানো হয়নি। প্রথমে একটি test order এবং test review দিয়ে যাচাই করুন।
