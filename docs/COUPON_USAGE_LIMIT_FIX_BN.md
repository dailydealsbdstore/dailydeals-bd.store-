# Daily Deals BD — Coupon Usage Limit Fix (বাংলা)

এই আপডেটে কুপনের ব্যবহারসীমা অর্ডার প্লেস হওয়ার সময়ই রিজার্ভ/গণনা হয়। Admin কনফার্ম করার জন্য অপেক্ষা করে না।

## কী পরিবর্তন হয়েছে

- Checkout-এ কুপন ব্যবহার করে অর্ডার দিলে Firestore `runTransaction`-এর মাধ্যমে একই atomic transaction-এ `orders/{orderId}` তৈরি হয় এবং `coupons/{couponId}.usedCount` এক করে বাড়ে।
- নতুন কুপন অর্ডারে `couponCounted: true` থাকে, তাই Admin পরে অর্ডার কনফার্ম করলে একই ব্যবহার দ্বিতীয়বার গণনা হয় না। পুরোনো অর্ডারগুলোতে এই field না থাকলে আগের compatibility path এখনও কাজ করে।
- Usage limit শেষ হলে counter শেষবার বাড়ানোর একই transaction-এ কুপনের `active` মান `false` হয়; তবুও গ্রাহক সীমা-শেষ হওয়া কুপন পড়তে পারবে যাতে নির্দিষ্ট “ব্যবহারের সীমা শেষ” বার্তা দেখানো যায়। Checkout-এ কুপন প্রয়োগ/অর্ডার প্লেস বন্ধ হয়। Concurrent checkout-এ একই শেষ slot ব্যবহার করতে চাইলেও Firestore transaction conflict-এর পর নতুন counter পুনরায় পরীক্ষা করে.
- নির্দিষ্ট পণ্যের coupon হলে order-এ অন্তত একটি target product থাকতে হবে; qualifying cart-এ কুপন প্রযোজ্য না হলে order transaction প্রত্যাখ্যাত হয়। একই অর্ডারে target product একাধিক ইউনিট থাকলেও Usage Limit একবারই গণনা হয়—এটি per-order usage, per-unit usage নয়।
- Admin Panel-এ coupon usage live update হবে: `ব্যবহার X / Limit · বাকি Y`; সীমা পূর্ণ হলে `ব্যবহারসীমা শেষ` দেখাবে।
- Usage Limit ফাঁকা থাকলে unlimited। Admin form অনুযায়ী `0` নয়, ফাঁকা বা ১+ পূর্ণসংখ্যা ব্যবহার করুন। সীমা শেষ হলে coupon-এর active flag স্বয়ংক্রিয়ভাবে বন্ধ হবে; Admin প্রয়োজন হলে Usage Limit বাড়িয়ে আবার চালু করতে পারবেন।

## খুব গুরুত্বপূর্ণ: Firestore Rules Publish করতে হবে

এই fix কেবল `cart.js` দিয়ে কাজ করে না। `firestore.rules`-এ coupon counter increment এবং order creation একই atomic write-এ বাঁধা হয়েছে, যাতে browser থেকে order তৈরি করে counter বাড়ানো বাদ দেওয়া না যায়।

1. Firebase Console → Firestore Database → Rules খুলুন।
2. বর্তমান Rules-এর backup কপি রাখুন।
3. এই ZIP-এর root `firestore.rules` ফাইলটি খুলুন। এটি আগের Order Status/Tracking ও Review Rules-সহ সম্পূর্ণ combined Rules ফাইল।
4. বর্তমান Rules-এর সঙ্গে মিলিয়ে নিশ্চিত হয়ে সম্পূর্ণ ফাইলটি Rules editor-এ বসিয়ে **Publish** করুন। অন্য প্রজেক্টের/ভিন্ন live Rules থাকলে সরাসরি অন্ধভাবে replace করবেন না; আগে তুলনা করুন।
5. তারপর GitHub-এ `public/assets/cart.js`, `public/assets/admin.js` এবং `firestore.rules` commit/push করে Cloudflare Pages deploy করুন। Firebase Console-এ Rules publish আলাদা কাজ; GitHub-এ ফাইল রাখলেই live Firestore Rules বদলায় না।

## পরীক্ষা করার তালিকা

1. Admin-এ একটি test coupon তৈরি করুন; Usage Limit-এ ছোট পরীক্ষামূলক সংখ্যা দিন, যেমন 2। আসল প্রচারাভিযানের কুপন নিয়ে পরীক্ষা করবেন না।
2. লগইন করা customer দিয়ে target product-এর অর্ডারে কুপন ব্যবহার করে অর্ডার দিন। অর্ডার সফল হওয়ার পরই Admin-এ Used Count 1 বাড়া এবং Remaining 1 কমা উচিত।
3. আরেকটি যোগ্য অর্ডার দিন; Used Count limit-এ পৌঁছালে Remaining 0 এবং `ব্যবহারসীমা শেষ` দেখাবে।
4. একই কোড দিয়ে পরের checkout-এ কুপন ব্যবহার করতে গেলে error দেখাতে হবে; তবু order submit বা counter increment হবে না।
5. Product-specific coupon হলে target product ছাড়া cart-এ কুপন প্রয়োগ হবে না। target item-সহ অর্ডার হলেই একবার usage গণনা হবে।
6. কোনো কুপন ছাড়া normal order, WhatsApp redirect, Admin confirmation, Business Koro submission এবং Order History স্বাভাবিক আছে কি না পরীক্ষা করুন।

## কাউন্টার কীভাবে হিসাব হয়

`usageLimit` হলো মোট অনুমোদিত ব্যবহার সংখ্যা; `usedCount` হলো ইতোমধ্যে অর্ডারে ব্যবহার হওয়া সংখ্যা। অবশিষ্ট ব্যবহার = `max(usageLimit - usedCount, 0)`। উদাহরণ: Limit 5, Used 3 হলে বাকি 2। `usageLimit` field নিজে প্রতি অর্ডারে কমানো হয় না; count বাড়ে এবং Admin UI-তে remaining count কমে—এতে concurrent checkout-এ সীমা enforce করা যায়।

## পুরোনো pending coupon orders

এই deploy-এর আগে তৈরি অর্ডারগুলোতে `couponCounted` field না থাকলে সেগুলো legacy path হিসেবে চিহ্নিত হবে; Admin confirmation-এর সময় usage count হবে। নতুন অর্ডারগুলো আর confirmation পর্যন্ত অপেক্ষা করবে না।

## বিলিং ও নিরাপত্তা

- Firebase Cloud Functions/Blaze plan যোগ করা হয়নি।
- Coupon usage increment এবং order creation সরাসরি Firestore atomic transaction-এ করা হয়।
- নতুন client permission শুধু একই transaction-এ যাচাইকৃত coupon usage-এর জন্য; customer coupon-এর discount, active status, limit বা অন্য setting পরিবর্তন করতে পারবে না।
