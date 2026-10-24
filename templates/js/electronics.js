/* Voltix — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const P = [
  { id: 'a1', name: 'Studio Pro', cat: 'audio', price: 299, img: '1505740420928-5e560c06d30e', tag: 'New', rating: 4.8, reviews: 412, specs: { Type: 'Over-ear', Battery: '40 h', 'Noise cancelling': '−35 dB', Weight: '250 g', Connectivity: 'Bluetooth 5.3' }, options: [{ name: 'Colour', values: ['Silver', 'Midnight', 'Sand'] }] },
  { id: 'a2', name: 'Pulse Buds', cat: 'audio', price: 149, img: '1618366712010-f4ae9c647dcb', rating: 4.6, reviews: 980, specs: { Type: 'In-ear', Battery: '24 h with case', 'Noise cancelling': '−28 dB', Weight: '5 g each', Connectivity: 'Bluetooth 5.3' }, options: [{ name: 'Colour', values: ['Black', 'White'] }] },
  { id: 'w1', name: 'Watch S2', cat: 'wear', price: 249, img: '1546868871-7041f2a55e12', rating: 4.7, reviews: 530, specs: { Display: '1.9" AMOLED', Battery: '7 days', GPS: 'Dual-band', 'Water resistance': '50 m', Sensors: 'Heart rate, SpO2' }, options: [{ name: 'Size', values: [['41 mm', 0], ['45 mm', 30]] }, { name: 'Band', values: ['Black sport', 'Grey loop'] }] },
  { id: 'c1', name: 'Ultrabook 14', cat: 'comp', price: 1299, img: '1595303526913-c7037797ebe7', tag: 'Best seller', rating: 4.9, reviews: 221, specs: { Display: '14" 2.8K', Chip: 'M-series 10-core', Memory: '16 GB', Battery: '18 h', Weight: '1.3 kg' }, options: [{ name: 'Storage', values: [['512 GB', 0], ['1 TB', 200], ['2 TB', 600]] }, { name: 'Colour', values: ['Space grey', 'Silver'] }] },
  { id: 'a3', name: 'Creator Kit', cat: 'audio', price: 389, img: '1615655406736-b37c4fabf923', rating: 4.5, reviews: 88, specs: { Type: 'USB mic + interface', Battery: '—', 'Noise cancelling': '—', Weight: '1.1 kg', Connectivity: 'USB-C' } },
  { id: 'w2', name: 'Watch Sport', cat: 'wear', price: 179, img: '1579586337278-3befd40fd17a', rating: 4.4, reviews: 302, specs: { Display: '1.6" LCD', Battery: '10 days', GPS: 'Single-band', 'Water resistance': '50 m', Sensors: 'Heart rate' }, options: [{ name: 'Band', values: ['Black', 'Red'] }] },
  { id: 'a4', name: 'Classic Wired', cat: 'audio', price: 89, was: 119, img: '1583394838336-acd977736f90', tag: 'Deal', rating: 4.3, reviews: 640, specs: { Type: 'Over-ear', Battery: 'No battery needed', 'Noise cancelling': 'Passive', Weight: '280 g', Connectivity: '3.5 mm' } },
  { id: 'c2', name: 'Travel Set', cat: 'comp', price: 899, img: '1468495244123-6c6c332eeece', rating: 4.6, reviews: 74, specs: { Display: '11" tablet', Chip: 'A-series', Memory: '8 GB', Battery: '10 h', Weight: '0.5 kg' } },
].map((p) => ({ ...p, desc: Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(' · '), details: ['2-year warranty', '30-day returns', 'Free 2-day delivery'] }));
const Shop = ShopKit.init({ key: 'voltix', products: P, img: (p, w, h) => U(p.img, w, h), promos: { VOLT10: { pct: 10, min: 200 } }, promoHint: 'Try VOLT10 (10% off $200+)', returns: '2-year warranty · 30-day returns', taxRate: 0.08,
  shipping: [{ id: 'std', label: 'Free 2-day delivery', note: 'Tracked & insured', price: 0 }, { id: 'exp', label: 'Next-day delivery', note: 'Order by 8pm', price: 15 }, { id: 'store', label: 'Pick up in store', note: 'Ready in 1 hour', price: 0, pickup: true }],
  onChange: (s) => { document.getElementById('cart-n').textContent = s.count() || ''; document.getElementById('wish-n').textContent = s.data.wish.length || ''; renderGrid(); } });
const $ = (id) => document.getElementById(id);
let cat = 'all'; const cmp = [];

function renderGrid() {
  const q = $('q').value.toLowerCase(), s = $('sort').value;
  let list = P.filter((p) => (cat === 'all' || p.cat === cat) && (p.name + p.desc).toLowerCase().includes(q));
  if (s === 'low') list.sort((a, b) => a.price - b.price); if (s === 'high') list.sort((a, b) => b.price - a.price); if (s === 'rate') list.sort((a, b) => b.rating - a.rating);
  $('grid').innerHTML = list.map((p) => `<article class="prod">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}<button class="sk-heart" data-wish="${p.id}" aria-pressed="${Shop.isWished(p.id)}" aria-label="Save ${p.name}">${Shop.isWished(p.id) ? '♥' : '♡'}</button>
    <button class="pic" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 500, 500)}" alt="${p.name}" loading="lazy"></button><h3>${p.name}</h3><p class="sp">${Object.values(p.specs).slice(0, 3).join(' · ')}</p><p class="stars">★ ${p.rating} <span style="color:var(--muted)">(${p.reviews})</span></p>
    <label class="cmp"><input type="checkbox" data-cmp="${p.id}" ${cmp.includes(p.id) ? 'checked' : ''}> Compare</label>
    <div class="row"><span class="pr">$${p.price}${p.was ? ` <s style="color:var(--muted);font-size:14px;font-weight:500">$${p.was}</s>` : ''}<small>or $${Math.ceil(p.price / 12)}/mo</small></span><button class="add" data-add="${p.id}" aria-label="Add ${p.name} to cart">+</button></div></article>`).join('') || '<p style="color:var(--muted)">No products match.</p>';
}
function renderCbar() {
  $('cbar').hidden = !cmp.length;
  $('cbar-imgs').innerHTML = cmp.map((id) => `<img src="${U(P.find((p) => p.id === id).img, 80, 80)}" alt="">`).join('');
  $('cbar-n').textContent = `${cmp.length}/3 selected`; $('cbar-go').disabled = cmp.length < 2;
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.sk-drawer, dialog')) return; // the cart drawer handles its own buttons
  const qv = e.target.closest('[data-qv]'); if (qv) { Shop.quickView(qv.dataset.qv); return; }
  const a = e.target.closest('[data-add]'); if (a) { const p = P.find((x) => x.id === a.dataset.add); if (p.options) Shop.quickView(p.id); else Shop.add(p.id); return; }
  const w = e.target.closest('[data-wish]'); if (w) Shop.toggleWish(w.dataset.wish);
});
$('grid').addEventListener('change', (e) => { const c = e.target.closest('[data-cmp]'); if (!c) return; if (c.checked) { if (cmp.length >= 3) { c.checked = false; Kit.toast('You can compare up to 3 products'); return; } cmp.push(c.dataset.cmp); } else cmp.splice(cmp.indexOf(c.dataset.cmp), 1); renderCbar(); });
$('cbar-x').addEventListener('click', () => { cmp.splice(0); renderCbar(); renderGrid(); });
$('cbar-go').addEventListener('click', () => {
  const items = cmp.map((id) => P.find((p) => p.id === id)), keys = [...new Set(items.flatMap((p) => Object.keys(p.specs)))];
  const cheapest = Math.min(...items.map((p) => p.price)), top = Math.max(...items.map((p) => p.rating));
  Kit.modal({ title: 'Compare products', wide: true, body: `<div style="overflow-x:auto"><table class="ctable"><tr><th></th>${items.map((p) => `<td><img src="${U(p.img, 280, 280)}" alt=""><br><b>${p.name}</b></td>`).join('')}</tr>
    <tr><th>Price</th>${items.map((p) => `<td class="${p.price === cheapest ? 'best' : ''}">$${p.price}</td>`).join('')}</tr><tr><th>Rating</th>${items.map((p) => `<td class="${p.rating === top ? 'best' : ''}">★ ${p.rating}</td>`).join('')}</tr>
    ${keys.map((k) => `<tr><th>${k}</th>${items.map((p) => `<td>${p.specs[k] || '—'}</td>`).join('')}</tr>`).join('')}
    <tr><th></th>${items.map((p) => `<td><button class="kit-btn primary" data-cadd="${p.id}">Add to cart</button></td>`).join('')}</tr></table></div>`,
    onOpen: (d) => d.addEventListener('click', (e) => { const b = e.target.closest('[data-cadd]'); if (b) { d.close(); const p = P.find((x) => x.id === b.dataset.cadd); setTimeout(() => (p.options ? Shop.quickView(p.id) : Shop.add(p.id))); } }) });
});
$('depts').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; document.querySelectorAll('#depts button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderGrid(); });
$('q').addEventListener('input', renderGrid); $('sort').addEventListener('change', renderGrid);
$('cart-btn').addEventListener('click', () => Shop.open('cart')); $('wish-btn').addEventListener('click', () => Shop.open('wish'));
Kit.key('/', () => $('q').focus(), 'Search products');
renderGrid();
