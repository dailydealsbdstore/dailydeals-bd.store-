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


## 2026-10-25 — অর্ডার স্ট্যাটাস ট্র্যাকিং ও রিভিউ ছবি
- Order status: pending, confirmed, shipped, delivered/completed; courier, Tracking ID ও optional tracking URL।
- Customer Account ও Admin orders-এ Firestore onSnapshot live updates।
- Admin-যোগ করা রিভিউতে image URL/Cloudinary upload এবং product page-এ ছবি প্রদর্শন। Admin-added review স্পষ্টভাবে buyer-verified নয় বলে label করা হয়।
- Firestore rules customer review eligibility-তে shipped status যোগ।

## 2026-10-25 — Order lifecycle, live tracking & custom review images
- Customer order lifecycle display: Pending → Confirmed → Shipped → Delivered/Completed, with current stage timestamps where available.
- Admin order list and signed-in customer order history now use Firestore onSnapshot listeners for live updates.
- Admin can enter Courier, required Tracking ID, and optional Tracking URL, mark shipped, update tracking details, and mark delivered.
- Admin-created published reviews can optionally include an HTTPS image URL or Cloudinary upload; public product pages display the image.
- Admin-added reviews are labelled as not buyer-verified to avoid misrepresenting them as verified customer reviews.
- Firestore rules: customer review eligibility now recognizes shipped orders.
