# নিরাপদ প্যাচ — পরিবর্তনের সারাংশ

এই প্যাচে সাইটের layout, Firebase app config, storefront product loader, cart/checkout code বা Business Koro Worker বদলানো হয়নি।

1. `robots.txt` থেকে login/account/cart/admin-এর `Disallow` সরানো হয়েছে, কারণ এসব HTML-এ `noindex` ব্যবহার করলে Google crawl করে নির্দেশনাটি দেখতে পারবে।
2. `login.html`, `account.html`, `cart.html`-এ `noindex,follow` যোগ হয়েছে; `admin.html`-এ এটি আগে থেকেই ছিল।
3. Static sitemap-এ কেবল stable public URLs রাখা হয়েছে; product template URL-এ পণ্যের ID না থাকায় সেটি বাদ।
4. Product canonical এখন স্থির preferred domain-এ যায়, এবং Product JSON-LD-তে URL ও absolute image URLs অন্তর্ভুক্ত।
5. Analytics admin UI-তে duplicate GA4/GTM/Ads tag এড়াতে নির্দেশনা যোগ হয়েছে।
6. Root `firestore.rules` ব্যবহারকারীর আলাদা Rules upload-এর সঙ্গে align করা হয়েছে। আগের package rules backup: `docs/firestore.rules.original-package.bak`।

Google Search indexing, Firebase Rules publish, Cloudflare production deployment ও GA realtime data এখানে live-verified নয়। আগে preview deployment-এ পরীক্ষা করুন।
