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
export function statusLabel(status) {
  const map = { pending_review:'রিভিউ বাকি', pending_payment:'পেমেন্ট যাচাই বাকি', payment_verified:'পেমেন্ট যাচাই হয়েছে', sending_businesskoro:'অর্ডার প্রসেস হচ্ছে', sent:'অর্ডার নিশ্চিত হয়েছে', partial_failed:'কিছু আইটেম পাঠানো যায়নি', failed:'সমস্যা হয়েছে', rejected:'বাতিল', merged_into:'অন্য অর্ডারের সঙ্গে যুক্ত', confirmed_manual:'ম্যানুয়াল অর্ডার অনুমোদিত', partially_fulfilled:'আংশিক পূরণ হয়েছে', payment_pending:'পেমেন্ট যাচাই বাকি', not_required:'প্রযোজ্য নয়', verified:'যাচাই হয়েছে', paid:'পেমেন্ট সম্পন্ন' };
  return map[status] || status || 'অজানা';
}
export function stockLabel(inStock) { return inStock ? 'স্টকে আছে' : 'স্টক শেষ'; }
export function itemCount(cart) { return cart.reduce((sum,item)=>sum+Number(item.qty||0),0); }
updateCartCount();
document.querySelectorAll('#year').forEach(el => el.textContent = String(new Date().getFullYear()));
