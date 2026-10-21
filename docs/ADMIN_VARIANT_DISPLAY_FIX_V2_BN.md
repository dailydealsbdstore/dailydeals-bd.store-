# Daily Deals BD — Admin Order Variant Display Fix V2

## এই আপডেট কেন
Checkout-এর order object-এ `color` ও `size` রাখা হয়, এবং WhatsApp message সেগুলো একই object থেকে পড়ে। Admin Panel-এ দেখা না যাওয়ার সাধারণ কারণ হলো live `/assets/admin.js` পুরোনো version/cache থেকে লোড হচ্ছে, অথবা item-এ variant property-র নাম আলাদা।

## কী পরিবর্তন হয়েছে
- `public/assets/admin.js`: order item-এর সরাসরি `color`/`size` ছাড়াও `variant`, `selectedVariant`, `options`, `variantOptions`, `attributes` এবং `colour`/`selectedSize` alias পড়তে পারে।
- `public/admin.html`: admin.js ও styles.css URL-এ version query যোগ করা হয়েছে, যাতে নতুন deployment-এ browser stale file পুনর্ব্যবহার না করে।
- `public/assets/styles.css`: নির্বাচিত variant-কে অর্ডারের পণ্যের নিচে স্পষ্টভাবে দেখায়।
- `public/assets/account.js` ও `public/account.html`: order history-তে একই robust variant reading ও asset cache-busting।

## Deploy করার নিয়ম
1. GitHub Repository-র backup/commit করে রাখুন।
2. ZIP-এর path বজায় রেখে ফাইলগুলো replace করুন; বিশেষ করে `public/admin.html`, `public/assets/admin.js`, `public/assets/styles.css`। `public/account.html` ও `public/assets/account.js`-ও একই প্যাকেজ থেকে আপডেট করুন।
3. GitHub-এ commit/push করুন এবং Cloudflare Pages deployment সফল হওয়া পর্যন্ত অপেক্ষা করুন।
4. Admin page খুলে `Ctrl+F5` চাপুন, তারপর নতুন test order-এ color/size যাচাই করুন।

## Firestore Rules
এই display-only fix-এর জন্য Firestore Rules পরিবর্তন প্রয়োজন নেই। Checkout যে `color` ও `size` item fields সংরক্ষণ করে, Admin Panel সেগুলো render করে। পুরোনো order document-এ variant field না থাকলে browser থেকে তা পুনরুদ্ধার করা সম্ভব নয়।

## যাচাইয়ের সীমা
JavaScript syntax ও ZIP integrity স্থানীয়ভাবে পরীক্ষা করা হবে। Live Firebase/Cloudflare-এ বাস্তব test order এখানে চালানো হয়নি; production publish-এর আগে একটি test order দিয়ে নিশ্চিত করুন।
