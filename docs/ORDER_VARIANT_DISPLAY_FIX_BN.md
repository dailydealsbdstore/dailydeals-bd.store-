# Daily Deals BD — Order Variant Display Fix (বাংলা)

## কী ঠিক করা হয়েছে
- Admin Panel-এর Order Review তালিকায় প্রতিটি অর্ডার আইটেমের নিচে গ্রাহকের নির্বাচিত রং ও সাইজ দেখাবে।
- Admin থেকে WhatsApp/Messenger-এ পাঠানো অর্ডার ডিটেইলস মেসেজে রং ও সাইজ যোগ হবে।
- Customer Account-এর order history-তেও সংরক্ষিত রং/সাইজ দেখা যাবে।
- বর্তমান checkout code আগেই `items[].color` ও `items[].size` Firestore-এর order document-এ সংরক্ষণ করে; সেটি পরিবর্তন করা হয়নি।

## বদলানো ফাইল
- `public/assets/admin.js`
- `public/assets/account.js`
- `public/assets/styles.css`

## Firestore Rules
এই UI পরিবর্তনের জন্য Firestore Rules পরিবর্তন দরকার নেই। Checkout-এর বিদ্যমান order item-এ `color` এবং `size` field সংরক্ষণ হয়; Admin Panel ইতিমধ্যেই order document পড়ছে। Rules বদলালে অপ্রয়োজনীয় ঝুঁকি হতে পারে।

## পুরোনো অর্ডার সম্পর্কে
কোনো পুরোনো order document-এ যদি রং/সাইজ সংরক্ষিতই না থাকে, UI সেই তথ্য অনুমান করে বের করতে পারবে না। তবে order document-এ `color` বা `size` থাকলে নতুন Admin Panel সেগুলো দেখাবে।

## Deploy করার নিরাপদ ধাপ
1. GitHub Repository-এর বর্তমান অবস্থা/commit backup রাখুন।
2. ZIP extract করুন এবং একই path-এ উপরের ৩টি ফাইল আপডেট করুন। `firebase-config.js`, Firestore Rules, Worker secrets/config, বা অন্য ফাইল বদলানোর প্রয়োজন নেই।
3. GitHub-এ commit/push করুন এবং Cloudflare Pages Preview/Deployment সফল হয়েছে কি না দেখুন।
4. Admin Panel reload করে নতুন একটি test order দিন—যেমন রং `Jet Black`, সাইজ `XL`।
5. Admin Panel → Order Review-এ পণ্যের নিচে `নির্বাচিত: রং: Jet Black · সাইজ: XL` দেখুন।
6. WhatsApp/Messenger details button চাপলে মেসেজেও একই variant আছে কি না পরীক্ষা করুন।
7. সব ঠিক থাকলে Production deployment ব্যবহার করুন।

## যাচাই
- `admin.js` এবং `account.js` JavaScript syntax check পাস করেছে।
- পূর্ণ live Firebase/Cloudflare end-to-end পরীক্ষা করা হয়নি। তাই Production-এ দেওয়ার আগে test order দিয়ে যাচাই করুন।
