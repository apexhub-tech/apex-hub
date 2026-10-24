/* Blaze Burger — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const MEAL = { name: 'Make it a meal', values: [['Just the burger', 0], ['Meal: fries + drink', 3.5], ['Large meal', 4.5]], preselect: true };
const B = (id, name, desc, price, cal, img, extra = {}) => ({ id, name, desc, price, cal, img, cat: 'burger', options: [{ name: 'Patty', values: [['Single', 0], ['Double', 2.5]], preselect: true }, MEAL, { name: 'Cheese', values: [['Cheddar', 0], ['No cheese', 0], ['Extra cheese', 0.8]], preselect: true }], details: [`${cal} kcal (single, no meal)`], ...extra });
const P = [
  B('b1', 'Classic Blaze', 'Single patty, cheese, pickles, flame sauce.', 5.99, 640, '1568901346375-23c9450c58cd'),
  B('b2', 'Smoky BBQ', 'Bacon, onion rings, smoky BBQ glaze.', 7.99, 810, '1607013251379-e6eecfffe234', { isNew: 1 }),
  B('b3', 'Double Stack', 'Two patties, double cheese, special sauce.', 8.49, 920, '1572802419224-296b0aeee0d9'),
  B('b4', 'Garden Burger', 'Plant-based patty, fresh veg, vegan mayo.', 6.99, 520, '1571091718767-18b5b1457add', { details: ['520 kcal', 'Vegan'] }),
  { id: 's1', name: 'Crispy Fries', desc: 'Sea-salted and golden.', price: 2.99, cal: 340, cat: 'side', img: '1630384060421-cb20d0e0649d', options: [{ name: 'Size', values: [['Regular', 0], ['Large', 1]], preselect: true }] },
  { id: 's2', name: 'Loaded Fries', desc: 'Cheese sauce and jalapeños.', price: 4.49, cal: 560, cat: 'side', img: '1550259114-ad7188f0a967' },
  { id: 'd1', name: 'Iced Cola', desc: 'Free refills in store.', price: 1.99, cal: 210, cat: 'drink', img: '1549652127-2e5e59e86a7a', options: [{ name: 'Size', values: [['Medium', 0], ['Large', 0.5]], preselect: true }] },
  { id: 'd2', name: 'Iced Coffee', desc: 'Cold brew and milk.', price: 2.99, cal: 150, cat: 'drink', img: '1517701550927-30cf4ba1dba5' },
  { id: 'family', name: 'Family box', desc: '4 Classic Blaze burgers and 4 regular fries.', price: 24, cal: 3920, cat: 'deal', img: '1572802419224-296b0aeee0d9' },
  { id: 'free', name: 'Free reward burger', desc: 'Redeemed with 600 flames.', price: 0, cal: 640, cat: 'hidden', img: '1568901346375-23c9450c58cd' },
];
const TABS = [['all', 'Everything'], ['burger', 'Burgers'], ['side', 'Sides'], ['drink', 'Drinks'], ['deal', 'Deals']];
const stores = ['Harbour St', 'City Centre', 'Marina Mall'];
const pickupSlots = () => { const out = ['ASAP · 15 min']; const n = new Date(); for (let m = 30; m <= 90; m += 15) { const t = new Date(n.getTime() + m * 6e4); out.push(Kit.time(t)); } return out; };
const rewards = Kit.store('blaze-rewards', () => ({ flames: 240, store: 'Harbour St', counted: 0 }));
const R = rewards.data;
const Shop = ShopKit.init({ key: 'blaze', products: P, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Your order', add: 'Add to order', orderVerb: 'Order', empty: 'Your order is empty — pick something tasty!' },
  promos: { TWO4TEN: { amt: 3.98, min: 11 }, FREEFRIES: { amt: 2.99, min: 12 } }, promoHint: 'Deals: TWO4TEN, FREEFRIES',
  shipping: [{ id: 'pick', label: 'Pick up', note: 'Ready in 15 min', price: 0, pickup: true }, { id: 'drive', label: 'Drive-thru', note: 'Show your order number', price: 0, pickup: true }, { id: 'del', label: 'Delivery', note: '25–35 min', price: 2.49, freeOver: 20 }],
  slots: { label: 'When', list: pickupSlots }, deliveryLabel: 'Pick up or delivery', statuses: ['Order received', 'On the grill', 'Ready / on its way', 'Enjoy!'], returns: 'Made fresh when you order',
  onChange: (s) => { document.getElementById('bag').textContent = `Order · ${s.count()}`; syncFlames(s); } });
const $ = (id) => document.getElementById(id);

// Rewards: flames are earned on every completed order
function syncFlames(s) {
  const orders = s.data.orders;
  if (orders.length > R.counted) { orders.slice(R.counted).forEach((o) => { R.flames += Math.round(o.total * 10); if (o.items.some((i) => i.id === 'free')) R.flames -= 600; }); R.counted = orders.length; rewards.save(); }
  $('flames').textContent = `${R.flames} flames`;
  $('flames-bar').style.width = Math.min(100, R.flames / 6) + '%';
  $('flames-next').textContent = R.flames >= 600 ? 'Free burger unlocked!' : `${600 - R.flames} to a free burger`;
}
$('redeem').addEventListener('click', () => {
  if (R.flames < 600) { Kit.toast(`You need ${600 - R.flames} more flames`, { type: 'error' }); return; }
  if (Shop.data.cart.some((l) => l.id === 'free')) { Kit.toast('Your free burger is already in your order'); return; }
  Shop.add('free'); Shop.open('cart');
});

let tab = 'all';
function renderMenu() {
  $('tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${k === tab}" data-t="${k}">${l}</button>`).join('');
  $('items').innerHTML = P.filter((p) => p.cat !== 'hidden' && (tab === 'all' || p.cat === tab)).map((p) => `<article class="item">${p.isNew ? '<span class="new">NEW</span>' : ''}<button class="pic" data-qv="${p.id}" aria-label="Customise ${p.name}"><img src="${U(p.img, 400, 400)}" alt="${p.name}" loading="lazy"></button><h3>${p.name}</h3><p>${p.desc}</p><p class="cal">${p.cal} kcal</p>
    <div class="row"><span class="pr">$${p.price.toFixed(2)}</span><button class="add" data-add="${p.id}">${p.options && p.options.length > 1 ? 'Customise' : 'Add'}</button></div></article>`).join('');
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; renderMenu(); } });
$('items').addEventListener('click', (e) => {
  const a = e.target.closest('[data-add], [data-qv]'); if (!a) return;
  const p = P.find((x) => x.id === (a.dataset.add || a.dataset.qv));
  if (p.options || a.dataset.qv) Shop.quickView(p.id); else Shop.add(p.id);
});
$('deals').addEventListener('click', (e) => {
  const d = e.target.closest('[data-deal]'); if (!d) return;
  if (d.dataset.deal === 'family') { Shop.add('family'); return; }
  Shop.data.promo = d.dataset.deal; Shop.refresh(); Kit.toast(`${d.dataset.deal} will be applied at checkout (if your order qualifies)`, { type: 'success' });
});
$('bag').addEventListener('click', () => Shop.open('cart'));
$('store').addEventListener('click', () => Kit.modal({ title: 'Choose your restaurant', body: `<div class="kit-seg" id="st" style="flex-direction:column;align-items:stretch">${stores.map((s, i) => `<button type="button" aria-pressed="${s === R.store}" data-s="${s}">${s} · ${['0.4', '1.8', '3.2'][i]} km · open until ${['23:00', '01:00', '22:00'][i]}</button>`).join('')}</div>`,
  onOpen: (d) => d.querySelector('#st').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; R.store = b.dataset.s; rewards.save(); $('store-l').textContent = `${R.store} · open`; d.close(); Kit.toast(`Ordering from ${R.store}`); }) }));
$('store-l').textContent = `${R.store} · open`;
renderMenu();
