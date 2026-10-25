# নিরাপদ প্যাচ — পরিবর্তনের সারাংশ

এই প্যাচে সাইটের layout, Firebase app config, storefront product loader, cart/checkout code বা Business Koro Worker বদলানো হয়নি।

1. `robots.txt` থেকে login/account/cart/admin-এর `Disallow` সরানো হয়েছে, কারণ এসব HTML-এ `noindex` ব্যবহার করলে Google crawl করে নির্দেশনাটি দেখতে পারবে।
2. `login.html`, `account.html`, `cart.html`-এ `noindex,follow` যোগ হয়েছে; `admin.html`-এ এটি আগে থেকেই ছিল।
3. Static sitemap-এ কেবল stable public URLs রাখা হয়েছে; product template URL-এ পণ্যের ID না থাকায় সেটি বাদ।
4. Product canonical এখন স্থির preferred domain-এ যায়, এবং Product JSON-LD-তে URL ও absolute image URLs অন্তর্ভুক্ত।
5. Analytics admin UI-তে duplicate GA4/GTM/Ads tag এড়াতে নির্দেশনা যোগ হয়েছে।
6. Root `firestore.rules` ব্যবহারকারীর আলাদা Rules upload-এর সঙ্গে align করা হয়েছে। আগের package rules backup: `docs/firestore.rules.original-package.bak`।

Google Search indexing, Firebase Rules publish, Cloudflare production deployment ও GA realtime data এখানে live-verified নয়। আগে preview deployment-এ পরীক্ষা করুন।


## 2026-10-25 — Business Koro update/pricing, confirm flow, mobile search
- Added separate Update Products flow with optional Update Pricing checkbox.
- Initial Sync now imports only new supplier products to protect existing custom values.
- Business Koro product selling price can be manually edited.
- Confirm and supplier submission are separate actions; Messenger details action removed.
- Added admin product search and restored storefront search visibility on mobile.


## 2026-10-25 — Validation refinements
- Make supplier stock status resilient when the API returns quantity/availability but omits the legacy `inStock` flag.
- Fix newline separation when loading multiple image URLs into the supplier-product edit form.
- Cache-bust shared CSS on storefront/admin/customer pages and admin JavaScript.
- Added a Bengali deploy/test guide for the Business Koro product update, separate order confirmation and mobile search changes.

- Align Business Koro Worker payment validation so COD and `contact_after_order` can be submitted after admin approval, while prepaid methods still require payment verification.
