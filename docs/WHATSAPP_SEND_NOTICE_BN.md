# Daily Deals BD — WhatsApp 2-Second Redirect Reminder

## কী পরিবর্তন হয়েছে

- Checkout-এ অর্ডার Firestore-এ সফলভাবে সংরক্ষিত হওয়ার পর একটি ছোট popup প্রায় ২ সেকেন্ড দেখাবে।
- popup-এ লেখা থাকবে যে দ্রুত উত্তর পেতে WhatsApp-এ তৈরি করা অর্ডারের মেসেজটি অবশ্যই Send করতে হবে।
- popup-এর **এখনই WhatsApp-এ যান** বাটন চাপলে সঙ্গে সঙ্গে WhatsApp খুলবে; বাটন না চাপলেও ২ সেকেন্ড পর স্বয়ংক্রিয়ভাবে WhatsApp খোলার চেষ্টা হবে।
- WhatsApp-এ আগের মতো সম্পূর্ণ pre-filled order message যাবে—অর্ডার নম্বর, গ্রাহকের তথ্য, পণ্য, রং, সাইজ, quantity, coupon/discount, delivery charge এবং total-সহ।
- WhatsApp-এ **Send** চাপতে গ্রাহককেই হবে; ওয়েবসাইট নিজে থেকে মেসেজ পাঠাতে পারে না।
- WhatsApp number Store Settings-এ না থাকলে আগের fallback confirmation দেখা যাবে।
- Notification বা Firebase paid plan যোগ করা হয়নি। Checkout, Firestore order schema, Firestore Rules, Business Koro Worker/API পরিবর্তন করা হয়নি।

## কোন ফাইল বদলেছে

- `public/cart.html` — ২-সেকেন্ড popup markup, styling এবং cart.js cache version।
- `public/assets/cart.js` — existing WhatsApp message রেখে ২-সেকেন্ড auto-redirect এবং immediate CTA।

## Deploy

1. বর্তমান GitHub Repository backup রাখুন।
2. ZIP থেকে এই দুই ফাইল একই path-এ replace করুন।
3. GitHub-এ commit/push করে Cloudflare Pages Deployment সফল হতে দিন।
4. Checkout পেজে `Ctrl + F5` করুন।
5. একটি test order দিয়ে নিশ্চিত করুন: order Admin/Firestore-এ আসে, popup দুই সেকেন্ড দেখা যায়, WhatsApp খোলে এবং pre-filled message-এ সব variant/details আছে। WhatsApp-এ Send গ্রাহককেই চাপতে হবে।
