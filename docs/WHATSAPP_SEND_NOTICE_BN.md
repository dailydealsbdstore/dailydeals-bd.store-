# Daily Deals BD — WhatsApp Send Reminder

## কী পরিবর্তন হয়েছে

- ওয়েবসাইটে অর্ডার Firestore-এ সংরক্ষিত হওয়ার পরে আগের মতো সঙ্গে সঙ্গে WhatsApp-এ redirect করা হবে না।
- Checkout পেজে আগে একটি পরিষ্কার বাংলা নির্দেশনা দেখাবে: অর্ডারটি ওয়েবসাইটে সংরক্ষিত, কিন্তু WhatsApp-এ অর্ডারের মেসেজ পৌঁছাতে গ্রাহককে WhatsApp খুলে **Send** চাপতে হবে।
- `WhatsApp খুলুন ও মেসেজ পাঠান` বাটন চাপলে pre-filled order message নতুন tab/window-তে খুলবে। গ্রাহককে WhatsApp-এর ভিতরে Send চাপতে হবে।
- গ্রাহক `Send` না চাপলে ওয়েবসাইট থেকে তা নিশ্চিত করা সম্ভব নয়; তবে Firestore-এ তৈরি হওয়া অর্ডারটি Admin Panel-এ থাকবে।
- WhatsApp নম্বর Store Settings-এ না থাকলে বিদ্যমান fallback confirmation দেখাবে।

## কোন ফাইল বদলেছে

- `public/cart.html` — checkout JS cache-busting version এবং notice-এর responsive style।
- `public/assets/cart.js` — auto-redirect সরিয়ে notice ও WhatsApp CTA।

## Deploy

1. বর্তমান GitHub Repository-এর backup রাখুন।
2. ZIP Extract করে এই দুটি ফাইল একই path-এ replace করুন।
3. Commit/Push করুন এবং Cloudflare Pages deployment সফল হতে দিন।
4. Checkout পেজে hard refresh (`Ctrl + F5`) করুন।
5. একটি test order দিয়ে যাচাই করুন: order Firestore/Admin-এ আসছে, notice দেখা যাচ্ছে, button WhatsApp খুলছে এবং pre-filled message-এ customer ও product details আছে। WhatsApp-এ Send button গ্রাহককেই চাপতে হবে।

Firestore Rules, Firebase plan, Worker, Business Koro API এবং product/cart schema পরিবর্তন করা হয়নি।
