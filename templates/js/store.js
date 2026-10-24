/* NOIR Studio — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const APP = ['XS', 'S', 'M', 'L', 'XL'];
const P = [
  { id: 'p1', name: 'Tailored suit', dept: 'men', cat: 'Outerwear', price: 229, img: '1613915617430-8ab0fd7c6baf', badge: 'New', isNew: 1, rating: 4.8, reviews: 64, colours: ['#3A3A3A', '#1F2A44'], options: [{ name: 'Colour', values: ['Charcoal', 'Navy'] }, { name: 'Size', values: APP, out: ['XS'] }], desc: 'A sharp two-piece in Italian wool blend with a soft shoulder.', details: ['80% wool, 20% polyester', 'Regular fit', 'Dry clean only'] },
  { id: 'p2', name: 'Classic trench coat', dept: 'women', cat: 'Outerwear', price: 189, img: '1601762603339-fd61e28b698a', rating: 4.9, reviews: 112, colours: ['#8E8A82'], options: [{ name: 'Size', values: APP, out: ['XL'] }], desc: 'Water-repellent cotton gabardine with a removable belt.', details: ['100% cotton', 'Relaxed fit', 'Machine wash cold'] },
  { id: 'p3', name: 'Essential tee', dept: 'men', cat: 'Tops', price: 29, img: '1552393700-42696fb89bfa', rating: 4.6, reviews: 340, colours: ['#111', '#fff', '#7D7D7D'], options: [{ name: 'Colour', values: ['Black', 'White', 'Grey'] }, { name: 'Size', values: APP }], desc: 'Heavyweight organic cotton tee that holds its shape.', details: ['100% organic cotton, 220gsm', 'Boxy fit'] },
  { id: 'p4', name: 'Wool coat', dept: 'women', cat: 'Outerwear', price: 63, was: 90, img: '1592833578500-1082e18665a3', badge: '-30%', rating: 4.7, reviews: 48, colours: ['#111'], options: [{ name: 'Size', values: APP, out: ['S', 'M'] }], desc: 'Double-faced wool coat in a long, straight cut.', details: ['70% wool', 'Fully lined'] },
  { id: 'p5', name: 'Denim & sneakers set', dept: 'men', cat: 'Shoes', price: 99, img: '1544441893-675973e31985', badge: 'New', isNew: 1, rating: 4.5, reviews: 21, colours: ['#2E4A7A', '#fff'], options: [{ name: 'Size', values: ['40', '41', '42', '43', '44'], out: ['44'] }], desc: 'Leather low-tops with a cushioned sole.', details: ['Full-grain leather', 'Rubber sole'] },
  { id: 'p6', name: 'Linen shirt', dept: 'women', cat: 'Tops', price: 59, img: '1613461920867-9ea115fee900', isNew: 1, rating: 4.4, reviews: 37, colours: ['#5B8BC9', '#E8D7B5', '#B6513A'], options: [{ name: 'Colour', values: ['Blue', 'Sand', 'Rust'] }, { name: 'Size', values: APP }], desc: 'Breathable European linen with mother-of-pearl buttons.', details: ['100% linen', 'Relaxed fit'] },
  { id: 'p7', name: 'Long overcoat', dept: 'women', cat: 'Outerwear', price: 210, img: '1668952135120-7d997b1b3778', rating: 4.9, reviews: 89, colours: ['#C7A27C'], options: [{ name: 'Size', values: APP, out: ['XS', 'XL'] }], desc: 'Camel overcoat cut from a cashmere-touch blend.', details: ['Wool & cashmere blend', 'Two front pockets'] },
  { id: 'p8', name: 'Chelsea boots', dept: 'men', cat: 'Shoes', price: 149, img: '1479064555552-3ef4979f8908', rating: 4.7, reviews: 76, colours: ['#7B4B2A'], options: [{ name: 'Size', values: ['40', '41', '42', '43', '44', '45'], out: ['40'] }], desc: 'Hand-finished suede boots with elastic sides.', details: ['Suede upper', 'Goodyear welted sole'] },
];
const Shop = ShopKit.init({ key: 'noir', products: P, img: (p, w, h) => U(p.img, w, Math.round(h * 1.2)), labels: { cart: 'Bag', add: 'Add to bag' },
  promos: { NOIR10: { pct: 10 }, FREESHIP: { ship: true } }, promoHint: 'Try NOIR10 or FREESHIP',
  shipping: [{ id: 'std', label: 'Standard delivery', note: '3–5 working days', price: 6, freeOver: 75 }, { id: 'exp', label: 'Express delivery', note: 'Next working day', price: 14 }, { id: 'store', label: 'Collect in store', note: 'Ready in 2 hours · 12 Market Lane', price: 0, pickup: true }],
  onChange: (s) => { document.getElementById('cart-n').textContent = s.count() || ''; document.getElementById('wish-n').textContent = s.data.wish.length || ''; renderGrid(); } });

let dept = 'all', cat = 'All';
const $ = (id) => document.getElementById(id);
function filtered() {
  const size = $('size').value, max = +$('max').value, sort = $('sort').value;
  let list = P.filter((p) => (dept === 'all' || (dept === 'new' ? p.isNew : p.dept === dept)) && (cat === 'All' || p.cat === cat) && p.price <= max && (!size || p.options.some((o) => o.name === 'Size' && o.values.includes(size) && !(o.out || []).includes(size))));
  if (sort === 'low') list.sort((a, b) => a.price - b.price); if (sort === 'high') list.sort((a, b) => b.price - a.price); if (sort === 'rate') list.sort((a, b) => b.rating - a.rating); if (sort === 'new') list.sort((a, b) => (b.isNew || 0) - (a.isNew || 0));
  return list;
}
function renderGrid() {
  $('cats').innerHTML = ['All', 'Outerwear', 'Tops', 'Shoes'].map((c) => `<button class="chip" aria-pressed="${c === cat}" data-cat="${c}">${c}</button>`).join(' ');
  const list = filtered();
  $('result-n').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  $('max-l').textContent = '$' + $('max').value;
  $('clear').hidden = cat === 'All' && !$('size').value && $('max').value === '250';
  $('grid').innerHTML = list.map((p) => `<article class="product">
    ${p.badge ? `<span class="badge ${p.was ? 'sale' : ''}">${p.badge}</span>` : ''}<button class="sk-heart" data-wish="${p.id}" aria-pressed="${Shop.isWished(p.id)}" aria-label="Save ${p.name}">${Shop.isWished(p.id) ? '♥' : '♡'}</button>
    <button class="pimg" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 600, 800)}" alt="${p.name}" loading="lazy"></button>
    <button class="quick" data-qv="${p.id}">Quick add</button>
    <div class="pinfo"><div><b>${p.name}</b><span class="stars">★ ${p.rating} (${p.reviews})</span><div class="swatches">${p.colours.map((c) => `<i style="background:${c}"></i>`).join('')}</div></div><b>${p.was ? `<s>$${p.was}</s>` : ''}$${p.price}</b></div></article>`).join('') || '<p class="none">No products match these filters. <button class="link" data-reset>Clear filters</button></p>';
}
$('depts').addEventListener('click', (e) => { const b = e.target.closest('[data-dept]'); if (!b) return; dept = b.dataset.dept; document.querySelectorAll('[data-dept]').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderGrid(); });
document.querySelector('.toolbar').addEventListener('click', (e) => { const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; renderGrid(); } });
['size', 'max', 'sort'].forEach((id) => $(id).addEventListener('input', renderGrid));
const clearAll = () => { cat = 'All'; $('size').value = ''; $('max').value = 250; renderGrid(); };
$('clear').addEventListener('click', clearAll);
$('grid').addEventListener('click', (e) => {
  if (e.target.closest('[data-reset]')) { clearAll(); return; }
  const w = e.target.closest('[data-wish]'); if (w) { Shop.toggleWish(w.dataset.wish); return; }
  const q = e.target.closest('[data-qv]'); if (q) Shop.quickView(q.dataset.qv);
});
$('cart-btn').addEventListener('click', () => Shop.open('cart'));
$('wish-btn').addEventListener('click', () => Shop.open('wish'));

// Live search suggestions
$('search').addEventListener('input', () => {
  const q = $('search').value.trim().toLowerCase();
  $('suggest').innerHTML = q.length < 2 ? '' : (P.filter((p) => (p.name + ' ' + p.cat).toLowerCase().includes(q)).slice(0, 5).map((p) => `<li><button data-qv="${p.id}"><img src="${U(p.img, 88, 108)}" alt=""><span><b>${p.name}</b><br><small>$${p.price}</small></span></button></li>`).join('') || '<li style="padding:10px;color:var(--muted)">No results — try "coat" or "boots"</li>');
});
$('suggest').addEventListener('click', (e) => { const b = e.target.closest('[data-qv]'); if (b) { Shop.quickView(b.dataset.qv); $('search').value = ''; $('suggest').innerHTML = ''; } });
document.addEventListener('click', (e) => { if (!e.target.closest('.searchbox')) $('suggest').innerHTML = ''; });

$('size-guide').addEventListener('click', () => Kit.modal({ title: 'Size guide', body: `<table class="size-table"><thead><tr><th>Size</th><th>Chest (cm)</th><th>Waist (cm)</th><th>Hips (cm)</th></tr></thead><tbody>${[['XS', 82, 66, 88], ['S', 88, 72, 94], ['M', 94, 78, 100], ['L', 100, 84, 106], ['XL', 106, 90, 112]].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Between sizes? Size up for outerwear, down for knitwear.</p>` }));
$('news').addEventListener('submit', (e) => { e.preventDefault(); const v = $('news-e').value.trim(); $('news-m').textContent = /^\S+@\S+\.\S+$/.test(v) ? 'You\'re in! Your code NOIR10 is on its way.' : 'Please enter an email like name@example.com.'; if (/^\S+@\S+\.\S+$/.test(v)) $('news-e').value = ''; });
Kit.key('/', () => $('search').focus(), 'Search products');
Kit.key('b', () => Shop.open('cart'), 'Open bag');
renderGrid();
