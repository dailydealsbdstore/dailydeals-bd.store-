import { apiFetch, money, escapeHtml, addToCart, toast, updateCartCount } from './common.js';
const grid = document.querySelector('#productGrid');
const status = document.querySelector('#statusMessage');
const empty = document.querySelector('#emptyProducts');
const searchInput = document.querySelector('#searchInput');
const searchForm = document.querySelector('#searchForm');
const sortSelect = document.querySelector('#sortProducts');
const chips = document.querySelector('#categoryChips');
let allProducts = [];
let category = 'all';
let query = '';
function productImage(product) { const image = product.images?.[0]; return image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` : ''; }
function renderProducts() {
  let products = allProducts.filter(p => {
    const categoryName = String(p.category || p.categoryName || 'অন্যান্য');
    return (category === 'all' || categoryName === category) && `${p.name || ''} ${p.description || ''} ${categoryName}`.toLowerCase().includes(query.toLowerCase());
  });
  const sort = sortSelect?.value;
  if (sort === 'priceAsc') products.sort((a,b)=>a.price-b.price);
  if (sort === 'priceDesc') products.sort((a,b)=>b.price-a.price);
  if (sort === 'name') products.sort((a,b)=>String(a.name).localeCompare(String(b.name),'bn'));
  grid.innerHTML = products.map(p => `<article class="product-card">
    <a class="product-image" href="/product.html?id=${encodeURIComponent(p.id)}">${productImage(p)}<span class="product-placeholder" style="${p.images?.[0]?'display:none':''}">▧</span><span class="stock-pill ${p.inStock?'':'out'}">${p.inStock?'স্টকে আছে':'স্টক শেষ'}</span></a>
    <div class="product-content"><div class="product-category">${escapeHtml(p.category || p.categoryName || 'DAILY PICKS')}</div><a href="/product.html?id=${encodeURIComponent(p.id)}" class="product-title">${escapeHtml(p.name || 'পণ্য')}</a><p class="product-description">${escapeHtml(p.description || 'পণ্যের বিস্তারিত দেখতে ক্লিক করুন।')}</p><div class="product-price-row"><strong class="product-price">${money(p.price)}</strong><span class="price-label">বিক্রয়মূল্য</span></div><div class="product-buttons"><button class="product-buy" data-add="${escapeHtml(p.id)}" ${p.inStock?'':'disabled'}>${(p.variants||[]).some(v=>v.color||v.size)?'ভ্যারিয়েন্ট বাছুন':'কার্টে যোগ করুন'}</button><a class="product-more" aria-label="পণ্যের বিস্তারিত" href="/product.html?id=${encodeURIComponent(p.id)}">↗</a></div></div></article>`).join('');
  empty.classList.toggle('hidden', products.length > 0);
  if (products.length === 0 && allProducts.length) { empty.querySelector('h3').textContent='কোনো পণ্য পাওয়া যায়নি'; empty.querySelector('p').textContent='অন্য নাম দিয়ে খুঁজে দেখুন।'; }
}
function renderCategories() {
  const cats = [...new Set(allProducts.map(p=>p.category || p.categoryName).filter(Boolean))];
  chips.innerHTML = `<button class="chip ${category==='all'?'active':''}" data-category="all">সব পণ্য</button>` + cats.map(c=>`<button class="chip ${category===c?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
}
async function loadProducts() {
  status.classList.remove('hidden'); status.classList.remove('error'); status.innerHTML='<span class="spinner"></span> পণ্যের তালিকা লোড হচ্ছে...';
  try {
    const result = await apiFetch('/api/products');
    allProducts = Array.isArray(result.data) ? result.data : [];
    status.classList.add('hidden'); renderCategories(); renderProducts();
    if (!allProducts.length) { empty.classList.remove('hidden'); }
  } catch (error) {
    status.classList.remove('hidden'); status.classList.add('error'); status.textContent = `${error.message} API চালু হওয়ার পর পণ্য এখানে দেখা যাবে।`;
    empty.classList.add('hidden');
  }
}
grid.addEventListener('click', e => { const button=e.target.closest('[data-add]'); if (!button) return; const product=allProducts.find(p=>String(p.id)===button.dataset.add); if(product){if((product.variants||[]).some(v=>v.color||v.size)){location.href=`/product.html?id=${encodeURIComponent(product.id)}`;return;}addToCart(product);} });
chips.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;renderCategories();renderProducts();});
searchForm.addEventListener('submit',e=>{e.preventDefault();query=searchInput.value.trim();renderProducts();document.querySelector('#products').scrollIntoView({behavior:'smooth'});});
searchInput.addEventListener('input',()=>{query=searchInput.value.trim();renderProducts();}); sortSelect.addEventListener('change',renderProducts); document.querySelector('#mobileMenu')?.addEventListener('click',()=>document.querySelector('#products').scrollIntoView({behavior:'smooth'}));
updateCartCount(); loadProducts();
