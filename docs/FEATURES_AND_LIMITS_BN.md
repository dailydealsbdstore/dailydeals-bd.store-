# Daily Deals BD — ফিচার ও সীমাবদ্ধতা

## MVP-তে অন্তর্ভুক্ত

- Bengali, mobile-first storefront
- Business Koro live product/stock feed (Worker থেকে)
- Public product payload থেকে costPrice বাদ
- Default pricing rules: costPrice + ৳৩০ packaging; default % বা fixed profit; product-level override
- Business Koro `minimumSellingPrice.customerPaysDelivery`-এর নিচে মূল্য না দেখানো/অর্ডার না পাঠানো
- Delivery fee: Dhaka city ৳৮০, outside Dhaka city ৳১৩০ (server setting)
- Required customer name, Bangladesh mobile, division, district, area dropdown, full address, delivery zone
- Manual payments: COD / bKash / Nagad / bank transfer; non-COD transaction reference required; Admin must verify before submit
- Local order review before Business Koro; edit customer details/items; merge same customer orders
- Admin Confirm submits each product unit separately because supplied Business Koro endpoint accepts one `productId` and ignores `quantity`
- Firebase Email/Password and Google login; no Facebook Login
- D1 order history linked to authenticated Firebase UID when logged in

## Known limitations / not yet wired

1. Business Koro documentation supplied to us only shows product list, order create, and order status endpoints. It does not show product creation/update, account management, stock editing, or a webhook. The storefront therefore does not try to modify supplier product/stock data; stock is read-only and rechecked before submit.
2. Supplied order schema accepts one `productId`; cart quantity N is submitted as N order requests. A merge is one local package/group in the Admin Panel but may become multiple supplier orders. Confirm one-item/multi-unit test orders first with Business Koro support.
3. The code has order submission result tracking, but no external gateway, courier API, SMS, email delivery, or WhatsApp notification has been configured.
4. Firebase Auth is used; account/order records are in D1. The Admin Panel lists orders and pricing, not a full Firebase user management console.
5. Cloudinary upload is not connected yet; supplier product images come from Business Koro. Use signed upload later if own product/banner image upload is needed.
6. SEO baseline includes titles, descriptions, canonical URLs, robots.txt and sitemap. Product detail is client-rendered from query ID; to index every product strongly, add server-rendered or pre-generated individual product URLs in a later SEO phase.
7. Privacy and terms pages are drafts; fill in actual store contact, returns/refunds, data retention, and legal details before launch.
8. Google Analytics, Meta Pixel, Search Console verification, Google Ads conversion ID are not installed because tracking IDs were not supplied. Search Console can be configured after the domain goes live.
9. Manual payment verification is by admin review. The website does not verify bKash/Nagad/bank transactions automatically. For verified prepaid orders, the Worker includes `deliveryChargeCollectionMode: CUSTOMER_PAID_RESELLER_UPFRONT` because the website checkout total includes delivery; COD orders omit this field.
10. No paid subscription is intentionally integrated, but Cloudflare/Firebase/business API quotas, domain renewal, and possible provider policy changes still apply.

## Operational cautions

- Do not paste any secrets into HTML, frontend JavaScript, or public repository: `BUSINESS_KORO_API_KEY`, Cloudflare API token, OAuth secrets.
- `ADMIN_UID` must exactly match the Firebase user UID of the owner. Changing the email alone does not grant admin privileges.
- The static product cache is approximately 60 seconds; stock is force-refreshed before Business Koro submission.
- Current confirm cap is 35 individual product units per request to stay below external-request limits; larger orders need splitting.
