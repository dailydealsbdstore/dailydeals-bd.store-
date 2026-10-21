import { auth } from '/firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

// Worker is only the secure bridge to Business Koro. Product and order data live in Firestore.
export const API_BASE = 'https://dailydeals-bd-api.dailydealsbd-store.workers.dev';
export const money = (value) => new Intl.NumberFormat('bn-BD', { style:'currency', currency:'BDT', maximumFractionDigits:0 }).format(Number(value || 0));
export const formatDate = (value) => {
  try {
    const date = value && typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('bn-BD',{dateStyle:'medium',timeStyle:'short'}).format(date);
  } catch { return value || ''; }
};
export const escapeHtml = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeSearchText(value='') {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('bn-BD')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function editDistanceWithin(a, b, maxDistance) {
  const aa=Array.from(a), bb=Array.from(b);
  if (Math.abs(aa.length-bb.length)>maxDistance) return false;
  if (aa.length>bb.length) return editDistanceWithin(b,a,maxDistance);
  let prev=Array.from({length:aa.length+1},(_,i)=>i);
  for(let j=1;j<=bb.length;j++){
    const cur=[j]; let rowMin=j;
    for(let i=1;i<=aa.length;i++){
      const val=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(aa[i-1]===bb[j-1]?0:1));
      cur[i]=val; if(val<rowMin)rowMin=val;
    }
    if(rowMin>maxDistance)return false; prev=cur;
  }
  return prev[aa.length]<=maxDistance;
}
/** Friendly storefront/admin search: substring, prefix, and small typos are tolerated. */
export function fuzzySearchMatch(query, values=[]) {
  const q=normalizeSearchText(query);
  if(!q)return true;
  const corpus=normalizeSearchText(Array.isArray(values)?values.join(' '):values);
  if(!corpus)return false;
  if(corpus.includes(q))return true;
  const queryTokens=q.split(' ').filter(Boolean);
  const corpusTokens=[...new Set(corpus.split(' ').filter(Boolean))];
  return queryTokens.every(token=>{
    if(corpus.includes(token))return true;
    const tolerance=token.length>=8?2:token.length>=4?1:0;
    return corpusTokens.some(word=>word.startsWith(token) || (tolerance>0 && Math.abs(word.length-token.length)<=tolerance && editDistanceWithin(token,word,tolerance)));
  });
}
export const toast = (message) => { const node = document.querySelector('#toast'); if (!node) { alert(message); return; } node.textContent = message; node.classList.add('show'); clearTimeout(window.__ddToastTimer); window.__ddToastTimer = setTimeout(()=>node.classList.remove('show'), 3000); };
export function setMessage(node, message, type='') { if (!node) return; node.textContent = message; node.className = `form-message ${type}`.trim(); }
export function getCart() { try { const value = JSON.parse(localStorage.getItem('dd-cart') || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
export function saveCart(cart) { localStorage.setItem('dd-cart', JSON.stringify(cart)); updateCartCount(); }
export function updateCartCount() { const count = getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0); document.querySelectorAll('#cartCount').forEach(el => el.textContent = String(count)); }
export function addToCart(product, qty=1, variant={}) {
  const cart = getCart(); const key = `${product.id}|${variant.color || ''}|${variant.size || ''}`; const found = cart.find(item => item.key === key);
  const entry = { key, id:String(product.id), source:product.source || 'manual', sourceProductId:product.sourceProductId || null, name:product.name || 'পণ্য', image:(product.images || [])[0] || '', price:Number(product.price || 0), qty, variant };
  if (found) { found.qty = Math.min(20, Number(found.qty || 1) + qty); Object.assign(found, {source:entry.source, sourceProductId:entry.sourceProductId, name:entry.name, image:entry.image, price:entry.price}); }
  else cart.push(entry);
  saveCart(cart); toast('পণ্য কার্টে যোগ হয়েছে');
}
export function buyNow(product, qty=1, variant={}) {
  // Keep the customer's existing normal cart untouched; direct checkout uses a temporary single-item session cart.
  const entry = { key: `${product.id}|${variant.color || ''}|${variant.size || ''}`, id:String(product.id), source:product.source || 'manual', sourceProductId:product.sourceProductId || null, name:product.name || 'পণ্য', image:(product.images || [])[0] || '', price:Number(product.price || 0), qty:Math.max(1,Math.min(20,Number(qty)||1)), variant };
  sessionStorage.setItem('dd-buy-now-item', JSON.stringify(entry));
  location.href = '/cart.html?buyNow=1';
}

export async function apiFetch(path, options={}) {
  const headers = new Headers(options.headers || {}); headers.set('Accept','application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  if (auth.currentUser) { try { headers.set('Authorization', `Bearer ${await auth.currentUser.getIdToken()}`); } catch {} }
  let response;
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers, mode:'cors' }); }
  catch { throw new Error('Business Koro সংযোগে সমস্যা হয়েছে। Worker-এর URL ও Secrets যাচাই করুন।'); }
  let data = {}; try { data = await response.json(); } catch {}
  if (!response.ok) { const error = new Error(data.error || data.message || `রিকোয়েস্ট ব্যর্থ হয়েছে (${response.status})`); error.data = data; error.status = response.status; throw error; }
  return data;
}
export function watchAuth(callback) { return onAuthStateChanged(auth, callback); }
export async function logout() { await signOut(auth); }
function accountPromptNode(){
  let root=document.getElementById('ddAccountPrompt');
  if(root)return root;
  root=document.createElement('div');root.id='ddAccountPrompt';root.hidden=true;
  root.innerHTML=`<div class="dd-account-backdrop" data-account-dismiss></div><section class="dd-account-dialog" role="dialog" aria-modal="true" aria-labelledby="ddAccountTitle"><button type="button" class="dd-account-close" aria-label="বন্ধ করুন" data-account-dismiss>×</button><div class="dd-account-icon">DD</div><h2 id="ddAccountTitle">Daily Deals BD-তে অ্যাকাউন্ট খুলুন</h2><p id="ddAccountPromptText">অ্যাকাউন্ট খুললে আপনার অর্ডার ও কুপনের সুবিধা সহজে ব্যবহার করতে পারবেন। চাইলে এখনই বন্ধ করে শপিং চালিয়ে যেতে পারেন।</p><a class="btn btn-primary" id="ddRegisterLink" href="/login.html?mode=register">অ্যাকাউন্ট খুলুন</a><a class="dd-account-login" id="ddLoginLink" href="/login.html">আগে অ্যাকাউন্ট আছে? লগইন করুন</a></section>`;
  const style=document.createElement('style');style.textContent=`#ddAccountPrompt{position:fixed;inset:0;z-index:99999}#ddAccountPrompt[hidden]{display:none!important}.dd-account-backdrop{position:absolute;inset:0;background:rgba(13,25,48,.55);backdrop-filter:blur(3px)}.dd-account-dialog{position:relative;top:50%;transform:translateY(-50%);width:min(92vw,440px);margin:auto;padding:28px 24px 24px;background:#fff;border:1px solid #e5eaf2;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.22);text-align:center;color:#18345f}.dd-account-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:16px;background:#ffbf00;color:#0646ae;font-weight:900;font-size:20px;margin:0 auto 14px}.dd-account-dialog h2{font-size:1.4rem;margin:0 0 10px}.dd-account-dialog p{color:#64748b;line-height:1.65;margin:0 0 18px}.dd-account-dialog .btn{display:inline-flex;justify-content:center;text-decoration:none;padding:12px 20px;border-radius:12px}.dd-account-close{position:absolute;right:12px;top:8px;border:0;background:transparent;font-size:30px;line-height:1;color:#64748b;cursor:pointer}.dd-account-login{display:block;margin-top:14px;color:#0646ae;text-decoration:underline;font-size:.92rem}@media(max-width:480px){.dd-account-dialog{padding:24px 18px 20px}}`;
  document.head.appendChild(style);document.body.appendChild(root);
  root.addEventListener('click',e=>{if(e.target.closest('[data-account-dismiss]')){root.hidden=true;try{sessionStorage.setItem('dd-account-prompt-dismissed','1')}catch{}}});
  return root;
}
export function showAccountPrompt(reason='অ্যাকাউন্ট খুললে কুপন ও অর্ডার হিস্টোরি ব্যবহার করতে পারবেন।'){
  if(auth.currentUser)return;
  const root=accountPromptNode(),next=location.pathname+location.search;
  const register=root.querySelector('#ddRegisterLink'),login=root.querySelector('#ddLoginLink');
  register.href=`/login.html?mode=register&next=${encodeURIComponent(next)}`;
  login.href=`/login.html?next=${encodeURIComponent(next)}`;
  root.querySelector('#ddAccountPromptText').textContent=reason;
  root.hidden=false;
}
function maybeOfferAccount(){
  const path=location.pathname;
  const eligible=['/','/index.html','/product.html','/cart.html'].includes(path);
  if(!eligible)return;
  onAuthStateChanged(auth,user=>{
    if(user){const existing=document.getElementById('ddAccountPrompt');if(existing)existing.hidden=true;return;}
    try{if(sessionStorage.getItem('dd-account-prompt-dismissed')==='1')return;}catch{}
    window.setTimeout(()=>{try{if(sessionStorage.getItem('dd-account-prompt-dismissed')==='1'||auth.currentUser)return;}catch{}showAccountPrompt();},1300);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maybeOfferAccount,{once:true});else maybeOfferAccount();
export function statusLabel(status) {
  const map = { pending_review:'রিভিউ বাকি', pending_payment:'পেমেন্ট যাচাই বাকি', payment_verified:'পেমেন্ট যাচাই হয়েছে', sending_businesskoro:'অর্ডার প্রসেস হচ্ছে', sent:'অর্ডার নিশ্চিত হয়েছে', partial_failed:'কিছু আইটেম পাঠানো যায়নি', failed:'সমস্যা হয়েছে', rejected:'বাতিল', merged_into:'অন্য অর্ডারের সঙ্গে যুক্ত', confirmed_manual:'ম্যানুয়াল অর্ডার অনুমোদিত', partially_fulfilled:'আংশিক পূরণ হয়েছে', payment_pending:'পেমেন্ট যাচাই বাকি', not_required:'প্রযোজ্য নয়', verified:'যাচাই হয়েছে', paid:'পেমেন্ট সম্পন্ন' };
  return map[status] || status || 'অজানা';
}
export function stockLabel(inStock) { return inStock ? 'স্টকে আছে' : 'স্টক শেষ'; }
export function itemCount(cart) { return cart.reduce((sum,item)=>sum+Number(item.qty||0),0); }
updateCartCount();
document.querySelectorAll('#year').forEach(el => el.textContent = String(new Date().getFullYear()));
