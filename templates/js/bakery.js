/* Crumb & Co. — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const CAKE_IMG = { 'Chocolate fudge': '1626263468007-a9e0cf83f1ac', 'Vanilla berry': '1628661477251-7938a1a967cd', 'Rainbow layers': '1572095755818-8fd546d228a1' };
const P = [
  { id: 'b1', name: 'Butter croissant', price: 3.2, img: '1623334044303-241021148842', tags: ['Nut-free'], left: 14, desc: '72-hour laminated dough with French butter.', details: ['Contains: gluten, milk, egg'] },
  { id: 'b2', name: 'Chocolate cupcakes', price: 4.5, img: '1595144780677-6d0b5abbd089', tags: ['Nut-free'], left: 4, options: [{ name: 'Pack', values: [['Single', 0], ['Box of 4', 12.5], ['Box of 6', 19]], preselect: true }], desc: 'Dark chocolate sponge with whipped ganache.', details: ['Contains: gluten, milk, egg'] },
  { id: 'b3', name: 'Pastry box (6)', price: 16, img: '1591538519435-4578c3ba26d6', tags: [], left: 9, desc: 'Baker\'s choice of six of today\'s pastries.', details: ['Contains: gluten, milk, egg, nuts'] },
  { id: 'b4', name: 'Sourdough loaf', price: 6.5, img: '1613929231151-d7571591259e', tags: ['Vegan', 'Nut-free'], left: 11, options: [{ name: 'Slicing', values: ['Whole', 'Sliced'], preselect: true }], desc: 'Naturally leavened, 36-hour ferment.', details: ['Contains: gluten'] },
  { id: 'b5', name: 'Cinnamon rolls (4)', price: 11, img: '1783058890700-4aee307c36a9', tags: ['Nut-free'], left: 0, soldOut: true, desc: 'Brown-butter cinnamon swirls with cream-cheese glaze.', details: ['Contains: gluten, milk, egg'] },
  { id: 'b6', name: 'Raspberry tart', price: 5.8, img: '1762032313029-7d799c618eae', tags: ['Gluten-free'], left: 7, desc: 'Almond crust, vanilla custard, fresh raspberries.', details: ['Contains: milk, egg, nuts'] },
  { id: 'b7', name: 'Pastry selection', price: 18, img: '1767379755386-1b213fb63c07', tags: [], left: 5, desc: 'A sharing board of croissants, danishes and buns.', details: ['Contains: gluten, milk, egg'] },
  { id: 'b8', name: 'Chocolate cake slice', price: 5.2, img: '1626263468007-a9e0cf83f1ac', tags: ['Gluten-free', 'Nut-free'], left: 8, desc: 'Flourless chocolate cake, rich and fudgy.', details: ['Contains: milk, egg'] },
  { id: 'cake', name: 'Celebration cake', price: 0, img: '1626263468007-a9e0cf83f1ac', hidden: true, options: [
    { name: 'Size', values: [['6" · serves 8', 35], ['8" · serves 14', 48], ['10" · serves 22', 65]] }, { name: 'Flavour', values: [['Chocolate fudge', 0], ['Vanilla berry', 0], ['Rainbow layers', 6]] },
    { name: 'Candles', values: [['Yes', 3]] }, { name: 'Gold topper', values: [['Yes', 8]] }, { name: 'Cupcakes', values: [['Yes', 15]] }] },
];
const slots = () => { const out = [], now = new Date(), d0 = now.getHours() >= 14 ? 1 : 0; for (let d = d0; d < d0 + 2; d++) { const day = Kit.addDays(now, d); if (day.getDay() === 1) continue; ['9:00–11:00', '11:00–13:00', '15:00–17:00'].forEach((s) => { if (d || +s.split(':')[0] > now.getHours() + 1) out.push(`${d ? day.toLocaleDateString('en-GB', { weekday: 'short' }) : 'Today'} ${s}`); }); } return out.slice(0, 6); };
const Shop = ShopKit.init({ key: 'crumb', products: P, img: (p, w, h) => U(p.id === 'cake' ? CAKE_IMG[(Shop.data.cart.find((l) => l.id === 'cake') || { opts: {} }).opts.Flavour] || p.img : p.img, w, h), labels: { cart: 'Basket', add: 'Add to basket', orderVerb: 'Order' },
  promos: { CRUMB5: { amt: 5, min: 25 } }, promoHint: 'Try CRUMB5 ($5 off orders over $25)', returns: 'Freshly baked — collect the same day', deliveryLabel: 'Collection',
  shipping: [{ id: 'pick', label: 'Collect in store', note: '18 Baker\'s Row', price: 0, pickup: true }, { id: 'local', label: 'Local delivery', note: 'Within 5 km, same day', price: 6, freeOver: 40 }],
  slots: { label: 'Collection / delivery time', list: slots }, noteLabel: 'allergies or special requests', statuses: ['Received', 'Being baked', 'Ready for you', 'Collected'],
  onChange: (s) => { document.getElementById('bag').textContent = `Basket · ${s.count()}`; renderList(); } });
const $ = (id) => document.getElementById(id);

const now = new Date(), open = now.getDay() !== 1 && now.getHours() >= 7 && now.getHours() < 18;
$('open-now').innerHTML = open ? '<b>● Open now</b> · until 18:00' : 'Closed now · opens 7:00';
$('cutoff').textContent = now.getHours() < 14 ? `Order in the next ${13 - now.getHours()}h ${60 - now.getMinutes()}m for collection today` : 'Order now for collection tomorrow morning';

let diet = 'all';
function renderList() {
  $('list').innerHTML = P.filter((p) => !p.hidden && (diet === 'all' || p.tags.includes(diet))).map((p) => {
    const q = p.options ? 0 : Shop.qty(p.id);
    return `<article class="p">${p.soldOut ? '<span class="sold">Sold out today</span>' : ''}<button class="pic" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 400, 400)}" alt="${p.name}" loading="lazy"></button><h3>${p.name}</h3>
      <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join('')}</div>${!p.soldOut && p.left <= 5 ? `<p class="left">Only ${p.left} left today</p>` : ''}
      <div class="r"><b>$${p.price.toFixed(2)}</b>${p.soldOut ? '' : p.options ? `<button class="add" data-qv="${p.id}">Choose</button>` : q ? `<div class="qty"><button data-q="-1" data-id="${p.id}" aria-label="One less">−</button><b>${q}</b><button data-q="1" data-id="${p.id}" aria-label="One more">+</button></div>` : `<button class="add" data-q="1" data-id="${p.id}">Add</button>`}</div></article>`;
  }).join('') || '<p class="note">Nothing matches that filter today.</p>';
}
document.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; diet = b.dataset.f; document.querySelectorAll('.chips button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderList(); });
$('list').addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]');
  if (q) { const p = P.find((x) => x.id === q.dataset.id), n = Shop.qty(p.id) + +q.dataset.q; if (n > p.left) { Kit.toast(`Only ${p.left} left today`, { type: 'error' }); return; } Shop.setQty(p.id, n); if (+q.dataset.q > 0 && n === 1) Kit.toast(`${p.name} added`, { type: 'success' }); return; }
  const v = e.target.closest('[data-qv]'); if (v) { const p = P.find((x) => x.id === v.dataset.qv); if (p.soldOut) { Kit.toast('Sold out today — back tomorrow at 7am'); return; } Shop.quickView(p.id); }
});
$('bag').addEventListener('click', () => Shop.open('cart'));

// Cake builder → priced basket item
const f = $('builder'), d = $('date');
const first = Kit.addDays(new Date(), 2); if (first.getDay() === 1) first.setDate(first.getDate() + 1); d.valueAsDate = first; d.min = Kit.iso(first);
const cakeOpts = () => { const o = { Size: f.Size.value, Flavour: f.Flavour.value }; ['Candles', 'Gold topper', 'Cupcakes'].forEach((n) => { if (f[n].checked) o[n] = 'Yes'; }); const m = $('msg').value.trim(); if (m) o.Message = `"${m}"`; o['Collect on'] = new Date(d.value + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); return o; };
function update() {
  const cake = P.find((p) => p.id === 'cake'), o = cakeOpts();
  const rows = cake.options.filter((op) => o[op.name]).map((op) => { const v = op.values.find((x) => x[0] === o[op.name]); return [op.name === 'Size' || op.name === 'Flavour' ? o[op.name] : op.name, v[1]]; });
  $('pv-img').src = U(CAKE_IMG[o.Flavour], 600, 450);
  $('pv-list').innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><span>${b ? '$' + b : 'incl.'}</span></li>`).join('') + `<li><span>Collect</span><span>${o['Collect on']}</span></li>`;
  $('pv-msg').textContent = o.Message || 'No message yet'; $('msg-n').textContent = $('msg').value.length;
  $('pv-tot').textContent = '$' + rows.reduce((a, [, b]) => a + b, 0);
}
f.addEventListener('input', update); update();
f.addEventListener('submit', (e) => {
  e.preventDefault();
  if (new Date(d.value + 'T12:00').getDay() === 1) { Kit.toast('We\'re closed on Mondays — pick another day', { type: 'error' }); return; }
  if (d.value < d.min) { Kit.toast('Custom cakes need 48 hours — pick a later date', { type: 'error' }); return; }
  Shop.add('cake', cakeOpts()); Shop.open('cart');
});
Kit.key('b', () => Shop.open('cart'), 'Open basket');
renderList();
