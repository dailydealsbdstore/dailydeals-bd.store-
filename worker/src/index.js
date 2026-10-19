import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_SETTINGS = {
  pricingMode: 'percent',
  profitValue: 20,
  packagingCost: 30,
  deliveryInsideDhaka: 80,
  deliveryOutsideDhaka: 130,
  paymentInstructions: '',
  storeName: 'Daily Deals BD',
};
const FIREBASE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

function json(data, status = 200, extra = {}) { return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } }); }
function fail(message, status = 400, details = undefined) { return json({ error: message, ...(details ? { details } : {}) }, status); }
function safeParse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function nowIso() { return new Date().toISOString(); }
function orderNumber() { const day = new Date().toISOString().slice(0,10).replaceAll('-',''); return `DDB-${day}-${crypto.randomUUID().slice(0,6).toUpperCase()}`; }
function normalizeDigits(input='') { return String(input).replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d))); }
function normalizePhone(input='') { return normalizeDigits(input).replace(/[\s()-]/g, ''); }
function validatePhone(input='') { const p = normalizePhone(input); return /^(?:\+?88)?01[3-9]\d{8}$/.test(p); }
function fullAddress(order) { return [order.customerAddress, order.customerArea, order.customerDistrict, order.customerDivision].filter(Boolean).join(', '); }
function calcPrice(product, settings, override) {
  const cost = Number(product.costPrice);
  if (!Number.isFinite(cost) || cost < 0) throw new Error(`পণ্যের costPrice পাওয়া যায়নি: ${product.name || product.id}`);
  const packaging = Number(settings.packagingCost ?? 30);
  const basePrice = cost + packaging;
  const mode = override?.mode || settings.pricingMode || 'percent';
  const value = Number(override?.value ?? settings.profitValue ?? 20);
  let configured;
  if (mode === 'fixed') configured = basePrice + Math.max(0, value);
  else if (mode === 'custom') configured = Math.max(0, Number(override?.custom_price ?? override?.customPrice ?? value));
  else configured = basePrice * (1 + Math.max(0, value) / 100);
  const minimum = Math.max(basePrice, Number(product.minimumSellingPrice?.customerPaysDelivery ?? basePrice));
  const price = Math.ceil(Math.max(configured, minimum));
  return { basePrice: Math.ceil(basePrice), price, mode, value, minPrice: Math.ceil(minimum), costPrice: cost, packagingCost: packaging, estimatedProfit: price - basePrice, minimumPriceApplied: price > configured };
}
function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return origin;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith('.pages.dev') && host.startsWith('dailydeals-bd-store')) return origin;
  } catch {}
  return '';
}
function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  return origin ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'Content-Type,Authorization', 'access-control-max-age': '86400', 'vary': 'Origin' } : {};
}
async function authUser(request, env, required = false) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { if (required) throw new Error('এই কাজের জন্য লগইন করতে হবে।'); return null; }
  try {
    const project = env.FIREBASE_PROJECT_ID || 'dailydeals-bd';
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, { issuer: `https://securetoken.google.com/${project}`, audience: project });
    if (!payload.sub || typeof payload.sub !== 'string') throw new Error('Invalid user');
    return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : '', name: typeof payload.name === 'string' ? payload.name : '' };
  } catch {
    throw new Error('লগইন সেশন যাচাই করা যায়নি। আবার লগইন করুন।');
  }
}
async function requireAdmin(request, env) {
  const user = await authUser(request, env, true);
  const adminIds = String(env.ADMIN_UID || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!adminIds.length || !adminIds.includes(user.uid)) throw new Error('এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই। Cloudflare Worker-এ সঠিক ADMIN_UID সেট করুন।');
  return user;
}
async function getSettings(env) {
  const fallback = { ...DEFAULT_SETTINGS };
  if (!env.DB) return fallback;
  try {
    const row = await env.DB.prepare('SELECT value_json FROM store_settings WHERE id = 1').first();
    return row?.value_json ? { ...fallback, ...safeParse(row.value_json, {}) } : fallback;
  } catch { return fallback; }
}
async function getPricingOverrides(env) {
  const map = new Map();
  try { const rows = await env.DB.prepare('SELECT product_id, mode, value, custom_price FROM product_pricing').all(); for (const r of rows.results || []) map.set(String(r.product_id), r); } catch {}
  return map;
}
function businessKoroHeaders(env) {
  const headers = { 'x-api-key': env.BUSINESS_KORO_API_KEY || '', 'content-type': 'application/json', 'accept': 'application/json' };
  if (env.BUSINESS_KORO_DOMAIN) headers['x-domain'] = env.BUSINESS_KORO_DOMAIN;
  return headers;
}
async function fetchBusinessProducts(env, force = false) {
  if (!env.BUSINESS_KORO_API_KEY) throw new Error('Business Koro API Key এখনো Cloudflare Worker Secret হিসেবে সেট করা হয়নি।');
  if (!force && env.DB) {
    try {
      const cached = await env.DB.prepare('SELECT payload_json, expires_at FROM api_cache WHERE cache_key = ?').bind('business-products-v1').first();
      if (cached && Number(cached.expires_at) > Math.floor(Date.now() / 1000)) return safeParse(cached.payload_json, null);
    } catch {}
  }
  const response = await fetch('https://api.businesskoro.com/api/v1/storefront/products', { method: 'GET', headers: businessKoroHeaders(env) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || body.error || `Business Koro API error (${response.status})`);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  const data = Array.isArray(body.data) ? body.data : null;
  if (!data) throw new Error('Business Koro API থেকে প্রোডাক্ট তালিকা বোঝা যায়নি।');
  const bundle = { data, deliveryCharges: body.deliveryCharges || null, fetchedAt: nowIso() };
  if (env.DB) { try { await env.DB.prepare('INSERT INTO api_cache (cache_key,payload_json,expires_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,expires_at=excluded.expires_at,updated_at=excluded.updated_at').bind('business-products-v1',JSON.stringify(bundle),Math.floor(Date.now()/1000)+60,nowIso()).run(); } catch {} }
  return bundle;
}
async function productPayload(product, settings, override) {
  const priceInfo = calcPrice(product, settings, override);
  return {
    id: String(product.id), name: product.name || 'পণ্য', description: product.description || '',
    images: Array.isArray(product.images) ? product.images.filter(v => typeof v === 'string').slice(0, 10) : [],
    price: priceInfo.price, inStock: product.inStock === true,
    variants: Array.isArray(product.variants) ? product.variants.map(v => ({ color: v.color || null, size: v.size || null, inStock: v.inStock === true })) : [],
    category: product.category || product.categoryName || null,
  };
}
function productAdminPayload(product, settings, override) {
  const info = calcPrice(product, settings, override);
  return { id: String(product.id), name: product.name || 'পণ্য', description: product.description || '', images: product.images || [], inStock: product.inStock === true,
    suggestedPrice: Number(product.suggestedPrice || 0), costPrice: info.costPrice, packagingCost: info.packagingCost, basePrice: info.basePrice,
    minimumSellingPrice: product.minimumSellingPrice || {}, variants: product.variants || [], pricingMode: info.mode, profitValue: info.value, customPrice: Number(override?.custom_price || 0), price: info.price,
    estimatedProfit: info.estimatedProfit, minimumPriceApplied: info.minimumPriceApplied, category: product.category || product.categoryName || null };
}
async function dbReady(env) {
  if (!env.DB) throw new Error('Cloudflare D1 Database binding (DB) কনফিগার হয়নি।');
}
function rowToOrder(row) {
  return { id: row.id, orderNumber: row.order_number, customerUid: row.customer_uid, customerEmail: row.customer_email, customerName: row.customer_name,
    customerPhone: row.customer_phone, customerDivision: row.customer_division, customerDistrict: row.customer_district, customerArea: row.customer_area,
    customerAddress: row.customer_address, deliveryZone: row.delivery_zone, customerNote: row.customer_note, items: safeParse(row.items_json, []),
    subtotal: Number(row.subtotal), deliveryCharge: Number(row.delivery_charge), total: Number(row.total), paymentMethod: row.payment_method,
    paymentReference: row.payment_reference, paymentStatus: row.payment_status, status: row.status, isMerged: Boolean(row.is_merged),
    mergedInto: row.merged_into, sourceOrderIds: safeParse(row.source_order_ids_json, []), businessSubmission: safeParse(row.business_submission_json, {}),
    adminNote: row.admin_note, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function fetchOrder(env, id) { return await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first(); }
async function route(request, env, ctx) {
  const url = new URL(request.url); const path = url.pathname;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  if (!path.startsWith('/api/')) return fail('API endpoint পাওয়া যায়নি।', 404);
  if (request.method === 'GET' && path === '/api/health') return json({ ok: true, project: 'dailydeals-bd-api', firebaseProjectConfigured: Boolean(env.FIREBASE_PROJECT_ID), businessKoroConfigured: Boolean(env.BUSINESS_KORO_API_KEY), databaseBound: Boolean(env.DB), adminConfigured: Boolean(env.ADMIN_UID) });
  if (request.method === 'GET' && path === '/api/settings/public') { const s = await getSettings(env); return json({ settings: { deliveryInsideDhaka: s.deliveryInsideDhaka, deliveryOutsideDhaka: s.deliveryOutsideDhaka, paymentInstructions: s.paymentInstructions, storeName: s.storeName } }); }

  if (request.method === 'GET' && path === '/api/products') {
    try { const [bundle, settings, overrides] = await Promise.all([fetchBusinessProducts(env), getSettings(env), getPricingOverrides(env)]); const data = [];
      for (const p of bundle.data) { if (!p?.id) continue; try { data.push(await productPayload(p, settings, overrides.get(String(p.id)))); } catch {} }
      return json({ data, fetchedAt: bundle.fetchedAt, deliveryCharges: undefined });
    } catch (e) { return fail(e.message || 'প্রোডাক্ট লোড করা যায়নি।', e.status || 502); }
  }

  if (request.method === 'POST' && path === '/api/orders') {
    try {
      await dbReady(env);
      const body = await request.json();
      const customerName = String(body.customerName || '').trim(); const phone = normalizePhone(body.customerPhone || '');
      const division = String(body.customerDivision || '').trim(); const district = String(body.customerDistrict || '').trim(); const area = String(body.customerArea || '').trim();
      const address = String(body.customerAddress || '').trim(); const zone = String(body.deliveryZone || ''); const paymentMethod = String(body.paymentMethod || 'cod'); const paymentReference = String(body.paymentReference || '').trim();
      if (customerName.length < 2 || customerName.length > 100) return fail('সঠিক কাস্টমার নাম দিন।');
      if (!validatePhone(phone)) return fail('বাংলাদেশি মোবাইল নম্বর সঠিকভাবে লিখুন।');
      if (!division || !district || !area || !address) return fail('বিভাগ, জেলা, এলাকা ও সম্পূর্ণ ঠিকানা দিতে হবে।');
      if (address.length > 500 || area.length > 200) return fail('ঠিকানার দৈর্ঘ্য বেশি হয়ে গেছে।');
      if (!['dhaka_city','outside_dhaka_city'].includes(zone)) return fail('ডেলিভারি জোন নির্বাচন করুন।');
      if (!['cod','bkash','nagad','bank'].includes(paymentMethod)) return fail('পেমেন্ট পদ্ধতি সঠিক নয়।');
      if (paymentMethod !== 'cod' && !paymentReference) return fail('ম্যানুয়াল পেমেন্টের Transaction Reference দিতে হবে।');
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) return fail('একটি অর্ডারে ১ থেকে ২০ ধরনের পণ্য নির্বাচন করুন।');
      const units = body.items.reduce((n, i) => n + Number(i.qty || 0), 0); if (!Number.isInteger(units) || units < 1 || units > 35) return fail('একটি অর্ডারে মোট পণ্যের পরিমাণ সর্বোচ্চ ৩৫টি হতে পারবে।');
      const [user, bundle, settings, overrides] = await Promise.all([authUser(request, env, false), fetchBusinessProducts(env), getSettings(env), getPricingOverrides(env)]);
      const map = new Map(bundle.data.map(p => [String(p.id), p])); const items=[]; let subtotal=0; let priceChanged=false;
      for (const input of body.items) {
        const product = map.get(String(input.productId || ''));
        if (!product) return fail('একটি পণ্য Business Koro তালিকায় পাওয়া যায়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন.');
        if (product.inStock !== true) return fail(`${product.name || 'একটি পণ্য'} এখন স্টকে নেই।`);
        const qty = Number(input.qty || 1); if (!Number.isInteger(qty) || qty < 1 || qty > 20) return fail('পণ্যের পরিমাণ সঠিক নয়।');
        const color = String(input.color || '').trim(); const size = String(input.size || '').trim();
        const variants = Array.isArray(product.variants) ? product.variants : [];
        if (variants.some(v => v.color || v.size) && !color && !size) return fail(`${product.name || 'পণ্য'}-এর রং/সাইজ নির্বাচন করুন।`);
        if ((color || size) && !variants.some(v => (!color || v.color === color) && (!size || v.size === size) && v.inStock === true)) return fail(`${product.name || 'পণ্য'}-এর নির্বাচিত রং/সাইজ স্টকে নেই।`);
        let info; try { info = calcPrice(product, settings, overrides.get(String(product.id))); } catch (e) { return fail(e.message); }
        const shownPrice=Number(input.displayedPrice); if(!Number.isFinite(shownPrice)||shownPrice!==info.price)priceChanged=true;
        const item = { productId: String(product.id), name: String(product.name || 'পণ্য'), image: Array.isArray(product.images) ? (product.images[0] || '') : '', qty,
          unitPrice: info.price, color, size };
        items.push(item); subtotal += info.price * qty;
      }
      const deliveryCharge = zone === 'dhaka_city' ? Number(settings.deliveryInsideDhaka) : Number(settings.deliveryOutsideDhaka);
      const total = subtotal + deliveryCharge; if(priceChanged) return json({error:'এক বা একাধিক পণ্যের দাম আপডেট হয়েছে। নতুন দাম দেখে আবার অর্ডার জমা দিন।',priceChanged:true,updatedItems:items,subtotal,deliveryCharge,total},409); const id = crypto.randomUUID(); const number = orderNumber(); const timestamp=nowIso();
      const paymentStatus = paymentMethod === 'cod' ? 'not_required' : 'pending';
      await env.DB.prepare(`INSERT INTO orders (id,order_number,customer_uid,customer_email,customer_name,customer_phone,customer_division,customer_district,customer_area,customer_address,delivery_zone,customer_note,items_json,subtotal,delivery_charge,total,payment_method,payment_reference,payment_status,status,is_merged,merged_into,source_order_ids_json,business_submission_json,admin_note,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_review',0,NULL,'[]','{}','',?,?)`).bind(id,number,user?.uid || null,String(body.email || user?.email || '').trim().slice(0,140),customerName,phone,division,district,area,address,String(body.deliveryZone),String(body.customerNote || '').trim().slice(0,500),JSON.stringify(items),subtotal,deliveryCharge,total,paymentMethod,paymentReference,paymentStatus,timestamp,timestamp).run();
      return json({ ok: true, id, orderNumber: number, subtotal, deliveryCharge, total, status:'pending_review', message:'অর্ডার রিভিউয়ের জন্য জমা হয়েছে।' }, 201);
    } catch (e) { return fail(e.message || 'অর্ডার জমা করা যায়নি।', e.status || 500); }
  }

  if (request.method === 'GET' && path === '/api/my/orders') {
    try { await dbReady(env); const user=await authUser(request,env,true); const rows=await env.DB.prepare('SELECT * FROM orders WHERE customer_uid = ? AND merged_into IS NULL ORDER BY created_at DESC LIMIT 50').bind(user.uid).all(); return json({data:(rows.results||[]).map(rowToOrder)}); }
    catch(e){ return fail(e.message, e.message.includes('লগইন')?401:500); }
  }

  if (path.startsWith('/api/admin/')) {
    let admin;
    try { await dbReady(env); admin=await requireAdmin(request,env); }
    catch(e){ return fail(e.message, e.message.includes('লগইন')||e.message.includes('অ্যাডমিন অনুমতি')?403:500); }
    if (request.method === 'GET' && path === '/api/admin/me') return json({ ok:true, uid:admin.uid, email:admin.email, name:admin.name });
    if (request.method === 'GET' && path === '/api/admin/settings') return json({ settings: await getSettings(env) });
    if (request.method === 'PATCH' && path === '/api/admin/settings') {
      const body=await request.json(); const current=await getSettings(env); const next={...current};
      for (const key of ['pricingMode','profitValue','packagingCost','deliveryInsideDhaka','deliveryOutsideDhaka','paymentInstructions','storeName']) if (body[key] !== undefined) next[key]=body[key];
      if (!['percent','fixed'].includes(next.pricingMode)) return fail('ডিফল্ট প্রাইসিং নিয়ম সঠিক নয়।');
      for (const key of ['profitValue','packagingCost','deliveryInsideDhaka','deliveryOutsideDhaka']) { const n=Number(next[key]); if(!Number.isFinite(n)||n<0||n>1000000) return fail(`${key} সঠিক নয়।`); next[key]=n; }
      if (Number(next.packagingCost)!==30) return fail('এই পরিকল্পনায় প্রতি পণ্যের প্যাকেজিং খরচ ৳৩০ নির্ধারিত।');
      next.paymentInstructions=String(next.paymentInstructions||'').slice(0,2000); next.storeName=String(next.storeName||'Daily Deals BD').slice(0,100);
      await env.DB.prepare('INSERT INTO store_settings (id,value_json,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').bind(JSON.stringify(next),nowIso()).run();
      return json({ok:true,settings:next});
    }
    if (request.method === 'GET' && path === '/api/admin/products') {
      try { const [bundle,settings,overrides]=await Promise.all([fetchBusinessProducts(env),getSettings(env),getPricingOverrides(env)]); return json({data:bundle.data.filter(p=>p?.id).map(p=>{try{return productAdminPayload(p,settings,overrides.get(String(p.id)));}catch{return {id:String(p.id),name:p.name||'পণ্য',error:'Cost price missing'};}})}); }
      catch(e){return fail(e.message,e.status||502);}
    }
    if (request.method === 'POST' && path === '/api/admin/pricing') {
      const body=await request.json(); const productId=String(body.productId||'').trim(); const mode=String(body.mode||''); const value=Number(body.value||0); const customPrice=Number(body.customPrice||0);
      if(!productId||!['percent','fixed','custom'].includes(mode)||!Number.isFinite(value)||value<0||value>1000000||!Number.isFinite(customPrice)||customPrice<0) return fail('প্রাইসিং তথ্য সঠিক নয়।');
      await env.DB.prepare('INSERT INTO product_pricing (product_id,mode,value,custom_price,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET mode=excluded.mode,value=excluded.value,custom_price=excluded.custom_price,updated_at=excluded.updated_at').bind(productId,mode,value,customPrice,nowIso()).run();
      return json({ok:true});
    }
    if (request.method === 'GET' && path === '/api/admin/orders') {
      const status = url.searchParams.get('status') || 'review'; let sql='SELECT * FROM orders WHERE merged_into IS NULL';
      if(status==='review') sql += " AND status IN ('pending_review','pending_payment','payment_verified','partial_failed','failed')";
      else if(status==='sent') sql += " AND status = 'sent'";
      else if(status==='failed') sql += " AND status IN ('partial_failed','failed')";
      sql += ' ORDER BY created_at DESC LIMIT 200'; const rows=await env.DB.prepare(sql).all(); return json({data:(rows.results||[]).map(rowToOrder)});
    }
    if (request.method === 'POST' && path === '/api/admin/orders/merge') {
      const body=await request.json(); const ids=[...new Set((Array.isArray(body.orderIds)?body.orderIds:[]).map(String))];
      if(ids.length<2||ids.length>20) return fail('কমপক্ষে ২টি এবং সর্বোচ্চ ২০টি অর্ডার নির্বাচন করুন।');
      const rows=[]; for(const id of ids){const row=await fetchOrder(env,id);if(!row)return fail('একটি অর্ডার পাওয়া যায়নি।');rows.push(row);}
      if(rows.some(r=>r.merged_into||!['pending_review','payment_verified'].includes(r.status))) return fail('শুধু রিভিউ বাকি বা পেমেন্ট যাচাই হওয়া অর্ডার Merge করা যাবে।');
      const first=rows[0]; const equalKeys=['customer_phone','customer_district','customer_division','customer_area','customer_address','delivery_zone','payment_method'];
      if(rows.some(r=>equalKeys.some(k=>String(r[k])!==String(first[k])))) return fail('Merge করতে সব অর্ডারের ফোন, ঠিকানা, ডেলিভারি জোন ও পেমেন্ট পদ্ধতি এক হতে হবে।');
      const mergedItems=[];let subtotal=0;
      for(const row of rows){const items=safeParse(row.items_json,[]);for(const item of items){const key=[item.productId,item.unitPrice,item.color||'',item.size||''].join('|');const old=mergedItems.find(x=>[x.productId,x.unitPrice,x.color||'',x.size||''].join('|')===key);if(old)old.qty+=Number(item.qty||1);else mergedItems.push({...item});}subtotal+=Number(row.subtotal||0);}
      const settings=await getSettings(env);const deliveryCharge=first.delivery_zone==='dhaka_city'?Number(settings.deliveryInsideDhaka):Number(settings.deliveryOutsideDhaka);const total=subtotal+deliveryCharge;const id=crypto.randomUUID();const number=orderNumber();const timestamp=nowIso();
      const refs=rows.map(r=>`${r.order_number}: ${r.payment_reference||'রেফারেন্স নেই'}`).join(' | ');
      const paymentStatus=first.payment_method==='cod'?'not_required':'pending';
      const oldPaidTotal=rows.reduce((sum,r)=>sum+Number(r.total||0),0);
      const mergeAdminNote=first.payment_method==='cod'?'Admin merge':`Merged from ${rows.length} orders. Re-verify manual payment before supplier submission. Prior order totals: ${oldPaidTotal}; merged payable total: ${total}; difference: ${oldPaidTotal-total}. Check references/refund/extra collection manually.`;
      const statements=[env.DB.prepare(`INSERT INTO orders (id,order_number,customer_uid,customer_email,customer_name,customer_phone,customer_division,customer_district,customer_area,customer_address,delivery_zone,customer_note,items_json,subtotal,delivery_charge,total,payment_method,payment_reference,payment_status,status,is_merged,merged_into,source_order_ids_json,business_submission_json,admin_note,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_review',1,NULL,?,'{}',?,?,?)`).bind(id,number,rows.every(r=>r.customer_uid===first.customer_uid)?first.customer_uid:null,first.customer_email,first.customer_name,first.customer_phone,first.customer_division,first.customer_district,first.customer_area,first.customer_address,first.delivery_zone,rows.map(r=>r.customer_note).filter(Boolean).join(' | ').slice(0,500),JSON.stringify(mergedItems),subtotal,deliveryCharge,total,first.payment_method,refs,paymentStatus,JSON.stringify(ids),mergeAdminNote,timestamp,timestamp)];
      for(const row of rows)statements.push(env.DB.prepare("UPDATE orders SET merged_into=?,status='merged_into',updated_at=? WHERE id=? AND merged_into IS NULL").bind(id,timestamp,row.id));
      await env.DB.batch(statements); return json({ok:true,id,orderNumber:number,total,mergedCount:rows.length});
    }
    const editMatch=path.match(/^\/api\/admin\/orders\/([^/]+)\/edit$/);
    if (request.method === 'POST' && editMatch) {
      const id=decodeURIComponent(editMatch[1]); const row=await fetchOrder(env,id); if(!row)return fail('অর্ডার পাওয়া যায়নি।',404);
      if(row.merged_into || !['pending_review','payment_verified'].includes(row.status)) return fail('শুধু পাঠানোর আগে রিভিউ অর্ডার সম্পাদনা করা যাবে।');
      const body=await request.json();
      const customerName=String(body.customerName ?? row.customer_name).trim(); const phone=normalizePhone(body.customerPhone ?? row.customer_phone);
      const division=String(body.customerDivision ?? row.customer_division).trim(); const district=String(body.customerDistrict ?? row.customer_district).trim(); const area=String(body.customerArea ?? row.customer_area).trim(); const address=String(body.customerAddress ?? row.customer_address).trim(); const zone=String(body.deliveryZone ?? row.delivery_zone);
      const note=String(body.customerNote ?? row.customer_note).trim().slice(0,500);
      if(customerName.length<2||!validatePhone(phone)||!division||!district||!area||!address||address.length>500||!['dhaka_city','outside_dhaka_city'].includes(zone)) return fail('নাম, ফোন, ঠিকানা বা ডেলিভারি জোন সঠিক নয়।');
      const hasItems=Array.isArray(body.items); let items=safeParse(row.items_json,[]); let subtotal=Number(row.subtotal);
      if(hasItems){
        if(!body.items.length||body.items.length>20)return fail('একটি অর্ডারে ১ থেকে ২০ ধরনের পণ্য থাকতে হবে।');
        const units=body.items.reduce((n,i)=>n+Number(i.qty||0),0);if(!Number.isInteger(units)||units<1||units>35)return fail('একটি অর্ডারে সর্বোচ্চ ৩৫টি ইউনিট থাকতে পারবে।');
        const [bundle,settings,overrides]=await Promise.all([fetchBusinessProducts(env,true),getSettings(env),getPricingOverrides(env)]);const byId=new Map(bundle.data.map(p=>[String(p.id),p]));items=[];subtotal=0;
        for(const input of body.items){const p=byId.get(String(input.productId||''));if(!p||p.inStock!==true)return fail('নির্বাচিত একটি পণ্য এখন স্টকে নেই।');const qty=Number(input.qty||1);if(!Number.isInteger(qty)||qty<1||qty>20)return fail('পণ্যের পরিমাণ সঠিক নয়।');const color=String(input.color||'').trim(),size=String(input.size||'').trim();const variants=Array.isArray(p.variants)?p.variants:[];if(variants.some(v=>v.color||v.size)&&!color&&!size)return fail(`${p.name||'পণ্য'}-এর রং/সাইজ নির্বাচন করুন।`);if((color||size)&&!variants.some(v=>(!color||v.color===color)&&(!size||v.size===size)&&v.inStock===true))return fail(`${p.name||'পণ্য'}-এর ভ্যারিয়েন্ট স্টকে নেই।`);const pricing=calcPrice(p,settings,overrides.get(String(p.id)));items.push({productId:String(p.id),name:String(p.name||'পণ্য'),image:Array.isArray(p.images)?p.images[0]||'':'',qty,unitPrice:pricing.price,color,size});subtotal+=pricing.price*qty;}
      }
      const settings=await getSettings(env);const delivery=zone==='dhaka_city'?Number(settings.deliveryInsideDhaka):Number(settings.deliveryOutsideDhaka);const paymentStatus=row.payment_method==='cod'?'not_required':'pending';const newStatus='pending_review';const timestamp=nowIso();
      await env.DB.prepare(`UPDATE orders SET customer_name=?,customer_phone=?,customer_division=?,customer_district=?,customer_area=?,customer_address=?,delivery_zone=?,customer_note=?,items_json=?,subtotal=?,delivery_charge=?,total=?,payment_status=?,status=?,business_submission_json='{}',updated_at=? WHERE id=?`).bind(customerName,phone,division,district,area,address,zone,note,JSON.stringify(items),subtotal,delivery,subtotal+delivery,paymentStatus,newStatus,timestamp,id).run();
      return json({ok:true,message:'অর্ডার আপডেট হয়েছে। পেমেন্ট থাকলে পুনরায় যাচাই করতে হবে.'});
    }
    const match=path.match(/^\/api\/admin\/orders\/([^/]+)\/(confirm|payment\/verify|reject|note|status)$/);
    if (request.method === 'POST' && match) {
      const id=decodeURIComponent(match[1]);const action=match[2];const row=await fetchOrder(env,id);if(!row)return fail('অর্ডার পাওয়া যায়নি।',404);if(row.merged_into)return fail('এই অর্ডারটি অন্য অর্ডারের সঙ্গে Merge করা হয়েছে।');
      if(action==='payment/verify') { if(row.payment_method==='cod')return fail('COD অর্ডারে অগ্রিম পেমেন্ট যাচাই প্রয়োজন নেই।'); if(row.payment_status==='verified')return json({ok:true,message:'পেমেন্ট আগেই যাচাই হয়েছে।'});const ts=nowIso();await env.DB.prepare("UPDATE orders SET payment_status='verified',status='payment_verified',updated_at=? WHERE id=?").bind(ts,id).run();return json({ok:true}); }
      if(action==='reject'){const body=await request.json().catch(()=>({}));await env.DB.prepare("UPDATE orders SET status='rejected',admin_note=?,updated_at=? WHERE id=?").bind(String(body.reason||'অ্যাডমিন বাতিল করেছেন').slice(0,1000),nowIso(),id).run();return json({ok:true});}
      if(action==='note'){const body=await request.json();await env.DB.prepare('UPDATE orders SET admin_note=?,updated_at=? WHERE id=?').bind(String(body.note||'').slice(0,1000),nowIso(),id).run();return json({ok:true});}
      if(action==='status') {
        const submission=safeParse(row.business_submission_json,{});const entries=Object.entries(submission).filter(([key,value])=>value?.status==='sent'&&value?.businessOrderId);
        if(!entries.length)return fail('Business Koro response-এ Order ID পাওয়া যায়নি। status endpoint কল করার মতো ID নেই।');
        let checked=0,errors=0;
        for(const [key,value] of entries){try{const response=await fetch(`https://api.businesskoro.com/api/v1/storefront/orders/${encodeURIComponent(value.businessOrderId)}`,{method:'GET',headers:businessKoroHeaders(env)});const body=await response.json().catch(()=>({}));if(response.ok){value.businessStatus=body.status||body.data?.status||body.order?.status||body.data?.order?.status||'API response পেয়েছে';value.statusCheckedAt=nowIso();checked++;}else{value.statusCheckError=body.message||body.error||`HTTP ${response.status}`;errors++;}}catch(e){value.statusCheckError='স্ট্যাটাস যাচাই করা যায়নি';errors++;}}
        await env.DB.prepare('UPDATE orders SET business_submission_json=?,updated_at=? WHERE id=?').bind(JSON.stringify(submission),nowIso(),id).run();return json({ok:errors===0,checked,errors,order:rowToOrder(await fetchOrder(env,id)),message:errors?'কিছু আইটেমের স্ট্যাটাস যাচাই হয়নি।':'Business Koro status refresh সম্পন্ন।'});
      }
      if(action==='confirm') {
        if(!['pending_review','payment_verified','partial_failed','failed'].includes(row.status))return fail('এই অর্ডার এখন Confirm করা যাবে না।');
        if(row.payment_method!=='cod'&&row.payment_status!=='verified')return fail('Business Koro-তে পাঠানোর আগে ম্যানুয়াল পেমেন্ট যাচাই করুন।');
        const itemList=safeParse(row.items_json,[]); const count=itemList.reduce((s,i)=>s+Number(i.qty||0),0);if(count<1||count>35)return fail('এই অর্ডারে সর্বোচ্চ ৩৫টি ইউনিট Business Koro-তে একসঙ্গে পাঠানো যাবে। বেশি হলে অর্ডার ভাগ করে নিন।');
        const [bundle,confirmSettings]=await Promise.all([fetchBusinessProducts(env,true),getSettings(env)]);const live=new Map(bundle.data.map(p=>[String(p.id),p]));const submissions=safeParse(row.business_submission_json,{});let orderNo=0;let failed=0;let success=0;const sentHashes=new Set(Object.values(submissions).filter(v=>v?.status==='sent').map(v=>v.hash).filter(Boolean));
        for(let i=0;i<itemList.length;i++){const item=itemList[i];const qty=Number(item.qty||1);for(let q=0;q<qty;q++){const key=`${i}:${q}`;if(submissions[key]?.status==='sent'){success++;continue;}const product=live.get(String(item.productId));if(!product||product.inStock!==true){submissions[key]={status:'failed',message:'পণ্যটি বর্তমানে Business Koro-তে স্টকে নেই।'};failed++;continue;}
          const minimum=Math.max(Number(product.costPrice||0)+Number(confirmSettings.packagingCost||30),Number(product.minimumSellingPrice?.customerPaysDelivery||0));if(Number(item.unitPrice)<minimum){submissions[key]={status:'failed',message:`মূল্য এখন Business Koro-এর ন্যূনতম বিক্রয়মূল্যের চেয়ে কম (${minimum})। কাস্টমারের সঙ্গে মূল্য নিশ্চিত করে নতুন অর্ডার করুন।`};failed++;continue;}
          const payload={productId:String(item.productId),customerName:row.customer_name,customerPhone:row.customer_phone,customerAddress:fullAddress(row),customerDivision:row.customer_division,customerDistrict:row.customer_district,customerArea:row.customer_area,sellingPrice:Number(item.unitPrice),deliveryChargePaidByCustomer:true,customerNote:row.customer_note||''};if(row.payment_method!=='cod')payload.deliveryChargeCollectionMode='CUSTOMER_PAID_RESELLER_UPFRONT';if(item.color)payload.color=item.color;if(item.size)payload.size=item.size;
          const hash=[payload.customerPhone,payload.productId,payload.sellingPrice,payload.customerAddress,payload.color||'',payload.size||''].join('|');if(sentHashes.has(hash))payload.allowDuplicate=true;
          orderNo++;try{const response=await fetch('https://api.businesskoro.com/api/v1/storefront/orders',{method:'POST',headers:businessKoroHeaders(env),body:JSON.stringify(payload)});const b=await response.json().catch(()=>({}));
            if(response.ok && b.duplicate!==false && b.success!==false && b.error===undefined){const bId=b.orderId||b.id||b.data?.id||b.data?.orderId||b.data?.order?.id||null;submissions[key]={status:'sent',businessOrderId:bId,duplicate:Boolean(b.duplicate),hash,message:b.message||'Sent'};sentHashes.add(hash);success++;}
            else{submissions[key]={status:'failed',message:b.message||b.error||`Business Koro API error ${response.status}`,httpStatus:response.status};failed++;}
          }catch(e){submissions[key]={status:'failed',message:'Business Koro API-তে সংযোগ ব্যর্থ হয়েছে; পুনরায় যাচাই করে চেষ্টা করুন।'};failed++;}
          await env.DB.prepare('UPDATE orders SET business_submission_json=?,updated_at=? WHERE id=?').bind(JSON.stringify(submissions),nowIso(),id).run();
        }}
        const nextStatus=failed===0?'sent':success>0?'partial_failed':'failed';const ts=nowIso();await env.DB.prepare('UPDATE orders SET status=?,business_submission_json=?,updated_at=? WHERE id=?').bind(nextStatus,JSON.stringify(submissions),ts,id).run();
        const final=await fetchOrder(env,id);return json({ok:failed===0,status:nextStatus,successCount:success,failedCount:failed,order:rowToOrder(final),message:failed===0?'Business Koro-তে অর্ডার পাঠানো হয়েছে.':success>0?'কিছু পণ্য পাঠানো হয়েছে, কিছুতে সমস্যা হয়েছে। সফল আইটেম পুনরায় পাঠানো হবে না।':'অর্ডার পাঠানো যায়নি; সমস্যা দেখে সংশোধন করুন।'},failed===0?200:207);
      }
    }
    return fail('Admin API endpoint পাওয়া যায়নি।',404);
  }
  return fail('API endpoint পাওয়া যায়নি।',404);
}

export default {
  async fetch(request, env, ctx) {
    const headers = corsHeaders(request, env);
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        const response = await route(request, env, ctx);
        const merged = new Headers(response.headers);
        for (const [key,value] of Object.entries(headers)) merged.set(key,value);
        merged.set('x-content-type-options','nosniff');
        merged.set('referrer-policy','strict-origin-when-cross-origin');
        merged.set('content-security-policy',"default-src 'none'; frame-ancestors 'none'");
        return new Response(response.body,{status:response.status,statusText:response.statusText,headers:merged});
      }
      return fail('এই Worker শুধু API endpoint পরিচালনা করে।',404, { path:url.pathname });
    } catch (e) { return json({ error: e.message || 'অজানা সার্ভার সমস্যা হয়েছে।' }, 500, headers); }
  }
};
