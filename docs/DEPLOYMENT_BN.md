# দৈনন্দিন Deploy নির্দেশনা — Firebase-first সংস্করণ

এই প্রকল্পে পুরোনো D1-কেন্দ্রিক সেটআপ নির্দেশনা আর প্রযোজ্য নয়। নতুন সঠিক নির্দেশনা এখানে:

**[`DEPLOYMENT_FIREBASE_FIRST_BN.md`](DEPLOYMENT_FIREBASE_FIRST_BN.md)**

এই সংস্করণের নকশা:
- পণ্যের তালিকা `products` Firestore collection-এ থাকে।
- Business Koro-এর product data Admin Panel-এর Sync বোতাম থেকে Firestore-এ জমা হয়।
- ম্যানুয়াল পণ্যও Firestore-এ থাকে।
- অর্ডার, প্রাইসিং ও স্টোর সেটিংস Firestore-এ থাকে।
- Cloudflare Worker শুধুমাত্র Business Koro API-এর secure bridge; D1 primary database নয়।

পুরোনো D1 migration চালাবেন না, এবং আগের D1-based Worker Fix deploy করবেন না। আপনার Cloudflare account-এ আগে থেকে তৈরি D1 Database মুছতে হবে না; নতুন Worker এটি ব্যবহার করে না।
