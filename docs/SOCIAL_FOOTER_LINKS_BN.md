# Daily Deals BD — Social Footer Update (বাংলা)

## কী যোগ হয়েছে
- সব customer-facing public page-এর footer-এ Facebook, Instagram, TikTok ও WhatsApp-এর clickable icon/button যোগ করা হয়েছে।
- Facebook: https://www.facebook.com/getdailydealsbd
- Instagram: https://www.instagram.com/dailydealsbd.shop/
- TikTok: https://www.tiktok.com/@daily__deals__bd
- WhatsApp: https://wa.me/8801619401469 (বাংলাদেশ নম্বর 01619401469-কে international format-এ রূপান্তর করা হয়েছে)।
- নতুন আলাদা stylesheet `public/assets/social-footer.css` ব্যবহার করা হয়েছে; existing theme/layout CSS পরিবর্তন করা হয়নি।
- `public/admin.html`, Firestore Rules, checkout logic, Worker এবং WhatsApp redirect logic পরিবর্তন করা হয়নি।

## Deploy
1. Backup নিন।
2. Patch ZIP ব্যবহার করলে একই relative path-এ ফাইলগুলো GitHub-এ যোগ/প্রতিস্থাপন করুন।
3. `public/assets/social-footer.css` আপলোড করুন এবং সংশ্লিষ্ট customer-facing HTML ফাইলগুলো আপডেট করুন।
4. Commit/Push করে Cloudflare Pages deployment সফল হতে দিন।
5. `Ctrl + F5` দিয়ে homepage, product, cart, account, login, privacy ও terms পেজে footer icon পরীক্ষা করুন।

## নোট
এই পরিবর্তনের জন্য Firebase বা Cloudflare Worker configuration পরিবর্তন দরকার নেই। WhatsApp লিংকটি আপনার দেওয়া ফোন নম্বর ব্যবহার করে।
