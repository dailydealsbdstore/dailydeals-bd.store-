# Daily Deals BD — Firebase-first storefront

বাংলা deployment guide: [`docs/DEPLOYMENT_FIREBASE_FIRST_BN.md`](docs/DEPLOYMENT_FIREBASE_FIRST_BN.md)

## Architecture
- Firebase Authentication: customer/admin login.
- Firebase Firestore: public product catalogue, admin-only `product_private`, orders, store settings and customer order history.
- Cloudflare Worker: secure bridge to Business Koro only. It holds the Business Koro API key as a Cloudflare secret, fetches products only when the admin requests a sync, and submits supplier-product orders only after admin confirmation.
- Cloudflare Pages: static frontend.
- Cloudflare D1 is not the primary database for this version and the Worker does not require a D1 binding.

## Important
Do not deploy the previous D1-based worker fix. Use `worker/src/index.js` from this package. See the Bengali deployment guide for Firebase Rules, the `admins/{UID}` document, Worker deployment, and GitHub Pages file updates.
