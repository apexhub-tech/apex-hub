/* FreshCart — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=65`;
const P = [
  ['g1', 'Vine tomatoes', '500 g · $4.98/kg', 2.49, 'veg', '1575218823251-f9d243b6f720', null, 98], ['g2', 'Cucumber & tomato pack', '1 kg', 3.20, 'veg', '1592924802543-809bfeee53fb', 3.99, 80],
  ['g3', 'Broccoli & oranges', 'Mixed · 1.2 kg', 4.10, 'fruit', '1610415946201-295954703dd9', null, 70], ['g4', 'Market veg box', 'Serves 4 · 6 kinds', 14.90, 'box', '1566385101042-1a0aa0c1268c', null, 95],
  ['g5', 'Harvest basket', 'Seasonal · 3 kg', 19.50, 'box', '1635774855717-0aec182f92cc', 23.00, 60], ['g6', 'Fresh greens mix', '400 g', 3.60, 'veg', '1597362925123-77861d3fbac7', null, 75],
  ['g7', 'Fruit & veg board', 'Party pack', 12.00, 'fruit', '1610348725531-843dff563e2c', null, 40], ['g8', 'Butter croissants', '4 pcs', 4.80, 'bakery', '1623334044303-241021148842', null, 90],
  ['g9', 'Sourdough loaf', '800 g', 5.20, 'bakery', '1613929231151-d7571591259e', null, 85], ['g10', 'Coffee beans', '250 g · single origin', 8.90, 'bakery', '1497515114629-f71d768fd07c', 10.50, 65],
  ['g11', 'Farmers stall pick', 'Mixed · 2 kg', 9.90, 'veg', '1573246123716-6b1782bfc499', null, 55], ['g12', 'Roots & greens', '1.5 kg', 6.40, 'veg', '1579113800032-c38bd7635818', null, 50],
].map(([id, name, unit, price, cat, img, was, pop]) => ({ id, name, unit, price, cat, img, was, pop, desc: unit, details: ['Sourced from local farms within 50 km', 'Delivered chilled'] }));
const CATS = [['all', 'All'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['bakery', 'Bakery & coffee'], ['box', 'Boxes']];
const MIN = 15;
const slotList = () => { const out = [], now = new Date(); out.push('Now · 30 min'); [[0, 18], [0, 20], [1, 9], [1, 12], [1, 17]].forEach(([d, h]) => { if (d || h > now.getHours() + 1) out.push(`${d ? 'Tomorrow' : 'Today'} ${h}:00–${h + 2}:00`); }); return out; };
const Shop = ShopKit.init({ key: 'freshcart', products: P, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Basket', add: 'Add to basket' },
  promos: { FRESH5: { amt: 5, min: 20 } }, promoHint: 'First order? Use FRESH5', returns: 'Freshness guaranteed or your money back',
  shipping: [{ id: 'del', label: 'Home delivery', note: 'To your door', price: 3.99, freeOver: 35 }, { id: 'pick', label: 'Click & collect', note: 'FreshCart Marina · free', price: 0, pickup: true }],
  slots: { label: 'Delivery time', list: slotList }, statuses: ['Order received', 'Being picked', 'Out for delivery', 'Delivered'], noteLabel: 'e.g. ring the bell twice',
  onChange: () => { renderGrid(); renderBasket(); } });
const $ = (id) => document.getElementById(id);

let cat = 'all';
function renderGrid() {
  $('cats').innerHTML = CATS.map(([k, l]) => `<button class="cat" aria-pressed="${k === cat}" data-c="${k}">${l}</button>`).join('');
  const q = $('q').value.trim().toLowerCase(), sort = $('sort').value;
  const KW = { g8: 'bread pastry', g9: 'bread', g10: 'drink', g4: 'vegetables', g5: 'fruit vegetables' };
  let list = P.filter((p) => (cat === 'all' || p.cat === cat) && (p.name + ' ' + p.unit + ' ' + (KW[p.id] || '') + ' ' + p.cat).toLowerCase().includes(q));
  list.sort(sort === 'low' ? (a, b) => a.price - b.price : sort === 'deal' ? (a, b) => (!!b.was) - (!!a.was) : (a, b) => b.pop - a.pop);
  $('count').textContent = `${list.length} products${q ? ` for "${q}"` : ''}`;
  $('grid').innerHTML = list.map((p) => { const n = Shop.qty(p.id); return `<article class="item">${p.was ? `<span class="deal">Save $${(p.was - p.price).toFixed(2)}</span>` : ''}<button class="pic" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 400, 400)}" alt="${p.name}" loading="lazy"></button><h3>${p.name}</h3><p class="u">${p.unit}</p>
    <div class="row"><span class="pr">$${p.price.toFixed(2)}${p.was ? `<s>$${p.was.toFixed(2)}</s>` : ''}</span>${n ? `<div class="step"><button data-d="-1" data-id="${p.id}" aria-label="Remove one ${p.name}">−</button><b>${n}</b><button data-d="1" data-id="${p.id}" aria-label="Add one ${p.name}">+</button></div>` : `<button class="plus" data-d="1" data-id="${p.id}" aria-label="Add ${p.name}">+</button>`}</div></article>`; }).join('') || '<p style="grid-column:1/-1;color:var(--muted);text-align:center;padding:30px">No products found. Try "bread" or "tomato".</p>';
}
function renderBasket() {
  const S = Shop.data, t = Shop.totals();
  $('bl').innerHTML = S.cart.map((l) => { const p = P.find((x) => x.id === l.id); return `<li><span>${l.qty} × ${p.name}</span><b>${Kit.money(p.price * l.qty)}</b></li>`; }).join('') || '<li class="empty">Your basket is empty.</li>';
  const after = t.sub - t.disc, left = Math.max(0, 35 - after);
  $('freebar').innerHTML = S.cart.length ? `${left ? `Add ${Kit.money(left)} more for free delivery` : '🎉 Free delivery unlocked'}<div><i style="width:${Math.min(100, after / 35 * 100)}%"></i></div>` : '';
  $('totals').innerHTML = S.cart.length ? `<span>Subtotal</span><span>${Kit.money(t.sub)}</span>${t.disc ? `<span>Promo ${S.promo}</span><span>−${Kit.money(t.disc)}</span>` : ''}<span>Delivery</span><span>${t.ship ? Kit.money(t.ship) : 'Free'}</span><b>Total</b><b>${Kit.money(t.total)}</b>` : '';
  $('tot').textContent = Kit.money(t.total);
  $('go').disabled = !S.cart.length || t.sub < MIN;
  $('min').textContent = S.cart.length && t.sub < MIN ? `Minimum order is ${Kit.money(MIN)} — add ${Kit.money(MIN - t.sub)} more` : '';
  const last = S.orders[S.orders.length - 1];
  $('again').hidden = !last; if (last) $('again-l').textContent = `Buy your last order again · ${last.items.length} products`;
}
$('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; renderGrid(); } });
$('q').addEventListener('input', renderGrid); $('sort').addEventListener('change', renderGrid);
$('grid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]'); if (b) { Shop.setQty(b.dataset.id, Shop.qty(b.dataset.id) + +b.dataset.d); return; }
  const v = e.target.closest('[data-qv]'); if (v) Shop.quickView(v.dataset.qv);
});
$('clear').addEventListener('click', () => { const before = JSON.stringify(Shop.data.cart); if (!Shop.data.cart.length) return; Shop.data.cart.splice(0); Shop.refresh(); Kit.toast('Basket cleared', { undo: () => { Shop.data.cart.push(...JSON.parse(before)); Shop.refresh(); } }); });
$('go').addEventListener('click', () => { const sub = document.querySelector('[name=subs]:checked').value; Shop.data.subs = sub; Shop.checkout(); });
$('again-btn').addEventListener('click', () => { const last = Shop.data.orders[Shop.data.orders.length - 1]; last.items.forEach((i) => Shop.setQty(i.id, Shop.qty(i.id) + i.qty)); Kit.toast('Your last order is back in the basket', { type: 'success' }); });
$('orders-btn').addEventListener('click', () => Shop.open('orders'));
$('addr').addEventListener('click', () => Kit.modal({ title: 'Delivery address', body: '<div class="kit-field"><label for="ad">Street address</label><input id="ad" value="24 Harbour St"></div><div class="kit-field"><label for="ar">Area</label><select id="ar"><option>Marina · 30 min</option><option>City Centre · 25 min</option><option>Old Town · 40 min</option><option>Green Valley · 55 min</option></select></div>',
  actions: [{ label: 'Cancel' }, { label: 'Save address', primary: true, onClick: (d) => { const [area, mins] = d.querySelector('#ar').value.split(' · '); $('addr-l').textContent = `Home · ${d.querySelector('#ad').value} ▾`; $('eta').textContent = `Delivery in ${mins}`; Kit.toast(`Delivering to ${area}`); } }] }));
Kit.key('/', () => $('q').focus(), 'Search products');
Kit.key('b', () => Shop.open('cart'), 'Open basket');
renderGrid(); renderBasket();
