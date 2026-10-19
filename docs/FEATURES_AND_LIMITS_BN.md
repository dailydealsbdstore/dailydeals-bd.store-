# Daily Deals BD — ফিচার ও সীমাবদ্ধতা

## আছে
- Firebase Firestore থেকে public product listing.
- Admin Panel থেকে Business Koro product catalogue manual sync.
- Admin Panel থেকে manual product add/edit/publish/hide/delete; এসব পণ্য Firestore-এ থাকে।
- Supplier cost/private pricing `product_private` collection-এ; Firestore Rules অনুযায়ী শুধু Admin পড়তে পারবেন।
- Cost + packaging + percentage/fixed/custom price controls.
- Firestore-এ checkout orders, manual-payment verification, Admin review, merging same-customer orders, order status.
- Admin confirm করলে শুধু Business Koro-sourced items Worker দিয়ে supplier API-তে পাঠানো হয়। Manual items supplier API-তে যায় না।
- Dhaka city/outside delivery defaults ৳80/৳130.

## সীমাবদ্ধতা
- Product sync Admin Panel থেকে manual action; scheduled/background sync নেই।
- Manual product image এখন image URL দিয়ে যোগ করতে হয়; file upload/storage feature নেই।
- Business Koro API key browser code-এ নেই; Cloudflare Worker Secret-এ থাকে।
- Worker এই সংস্করণে D1-কে ব্যবহার করে না; Firebase Firestore primary database.
- Business Koro API live product schema এবং live order response অবশ্যই প্রথম test order দিয়ে যাচাই করতে হবে।
- Free-tier limits, Firestore read/write quotas, and supplier API limits apply. API response/data changes can require a code adjustment.
