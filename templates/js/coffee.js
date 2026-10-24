/* Daily Grind — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const DRINK_OPTS = [{ name: 'Size', values: [['Short', -0.4], ['Tall', 0], ['Grande', 0.5], ['Venti', 0.9]], preselect: false }, { name: 'Milk', values: [['Whole', 0], ['Oat', 0.6], ['Almond', 0.6], ['Skimmed', 0]] }, { name: 'Extra shot', values: [['No', 0], ['+1 shot', 0.8], ['+2 shots', 1.6]], preselect: true }, { name: 'Syrup', values: [['None', 0], ['Vanilla', 0.5], ['Caramel', 0.5], ['Hazelnut', 0.5]], preselect: true }];
const P = [
  { id: 'c1', cat: 'Hot', name: 'Maple Oat Latte', desc: 'Espresso, oat milk, maple', price: 4.2, img: '1512568400610-62da28bc8a13', seasonal: 1 },
  { id: 'c2', cat: 'Cold', name: 'Cinnamon Cold Brew', desc: 'Slow-steeped 18 hours', price: 4.6, img: '1562447457-579fc34967fb', seasonal: 1 },
  { id: 'c3', cat: 'Hot', name: 'Classic Cappuccino', desc: 'Rich, velvety foam', price: 3.8, img: '1541167760496-1628856ab772' },
  { id: 'c4', cat: 'Cold', name: 'Iced Caramel', desc: 'Espresso over ice', price: 4.4, img: '1461023058943-07fcbe16d735' },
  { id: 'c5', cat: 'Hot', name: 'Flat White', desc: 'Ristretto & micro-foam', price: 3.9, img: '1777013486360-699af7c80ff3' },
  { id: 'c6', cat: 'Cold', name: 'Iced Americano', desc: 'Bold and refreshing', price: 3.5, img: '1517701550927-30cf4ba1dba5' },
  { id: 'f1', cat: 'Food', name: 'Butter Croissant', desc: 'Baked fresh each morning', price: 3.2, img: '1623334044303-241021148842', options: [{ name: 'Warm it up?', values: ['Yes please', 'No thanks'] }] },
  { id: 'f2', cat: 'Food', name: 'Cinnamon Roll', desc: 'Cream-cheese glaze', price: 3.6, img: '1783058890700-4aee307c36a9', options: [{ name: 'Warm it up?', values: ['Yes please', 'No thanks'] }] },
  { id: 'free', cat: 'hidden', name: 'Reward drink (free)', desc: 'Redeemed with 150 stars', price: 0, img: '1512568400610-62da28bc8a13', options: [{ name: 'Drink', values: ['Maple Oat Latte', 'Classic Cappuccino', 'Iced Caramel', 'Flat White'] }, DRINK_OPTS[0], DRINK_OPTS[1]] },
].map((p) => ({ ...p, options: p.options || DRINK_OPTS, details: p.cat === 'Food' ? ['Contains gluten, milk, egg'] : ['Made with 100% Arabica, ethically sourced'] }));
const STORES = [['Harbour Street', '24 Harbour St · 0.4 km', 6.5, 22], ['City Centre', 'Main Square 3 · 1.1 km', 7, 23], ['Old Town', 'Market Lane 12 · 2.3 km', 7, 20], ['Business District', 'Tower B, ground floor · 3.0 km', 6, 19], ['Marina Walk', 'Pier 5 · 4.2 km', 8, 24]];
const isOpen = ([, , o, c]) => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= o && h < c; };
const loyalty = Kit.store('grind-loyalty', () => ({ stars: 96, counted: 0, store: 'Harbour Street' }));
const L = loyalty.data;
const slots = () => { const n = new Date(), out = ['Ready in 5 min']; for (let m = 15; m <= 60; m += 15) out.push(Kit.time(new Date(n.getTime() + m * 6e4))); return out; };
const Shop = ShopKit.init({ key: 'grind', products: P, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Your order', add: 'Add to order', orderVerb: 'Order', empty: 'Nothing here yet — pick a drink!' },
  shipping: [{ id: 'pick', label: 'Pick up in store', note: 'Skip the queue', price: 0, pickup: true }, { id: 'dt', label: 'Drive-thru', note: 'Harbour Street & Marina only', price: 0, pickup: true }],
  slots: { label: 'Pickup time', list: slots }, deliveryLabel: 'Pickup', noteLabel: 'name for the cup', statuses: ['Order received', 'Being made', 'Ready at the counter', 'Picked up'], returns: 'Made to order · not right? We\'ll remake it',
  onChange: (s) => { document.getElementById('bag').textContent = `Order (${s.count()})`; syncStars(s); } });
const $ = (id) => document.getElementById(id);

function syncStars(s) {
  const orders = s.data.orders;
  if (orders.length > L.counted) { orders.slice(L.counted).forEach((o) => { L.stars += Math.round(o.total * 2); if (o.items.some((i) => i.id === 'free')) L.stars -= 150; }); if (orders.length > L.counted) Kit.toast(`You earned ${Math.round(orders[orders.length - 1].total * 2)} stars ⭐`); L.counted = orders.length; loyalty.save(); }
  $('stars-l').textContent = L.stars >= 150 ? `${L.stars} stars · free drink ready!` : `${L.stars} / 150 stars to a free drink`;
  $('stars-bar').style.width = Math.min(100, L.stars / 1.5) + '%';
}
$('redeem').addEventListener('click', () => { if (L.stars < 150) { Kit.toast(`${150 - L.stars} more stars to go — keep sipping!`); return; } if (Shop.data.cart.some((l) => l.id === 'free')) { Kit.toast('Your free drink is already in your order'); return; } Shop.quickView('free'); });

let cat = 'All';
function renderMenu() {
  $('cats').innerHTML = ['All', 'Hot', 'Cold', 'Food'].map((c) => `<button class="cat" aria-pressed="${c === cat}" data-c="${c}">${c}</button>`).join('');
  $('drinks').innerHTML = P.filter((p) => p.cat !== 'hidden' && (cat === 'All' || p.cat === cat)).map((p) => `<article class="drink"><button class="cup" data-qv="${p.id}" aria-label="Customise ${p.name}"><img src="${U(p.img, 400, 400)}" alt="${p.name}" loading="lazy"></button>${p.seasonal ? '<span class="seasonal">Seasonal</span>' : ''}<h3>${p.name}</h3><p>${p.desc}</p><span class="pr">from $${(p.price + (p.cat === 'Food' ? 0 : -0.4)).toFixed(2)}</span><button class="btn o" data-qv="${p.id}" style="min-height:42px">Customise</button></article>`).join('');
}
$('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; renderMenu(); } });
$('drinks').addEventListener('click', (e) => { const b = e.target.closest('[data-qv]'); if (b) Shop.quickView(b.dataset.qv); });
$('bag').addEventListener('click', () => Shop.open('cart'));

function renderStores(q = '') {
  $('store-l').textContent = L.store;
  $('list').innerHTML = STORES.filter((s) => (s[0] + s[1]).toLowerCase().includes(q.toLowerCase())).map((s) => `<li class="${s[0] === L.store ? 'sel' : ''}"><div><b>${s[0]}</b><span>${s[1]}</span><span class="${isOpen(s) ? 'open' : 'closed'}">${isOpen(s) ? `Open · until ${s[3] === 24 ? 'midnight' : s[3] + ':00'}` : `Closed · opens ${String(s[2]).replace('.5', ':30')}${String(s[2]).includes('.') ? '' : ':00'}`}</span></div><button class="btn ${s[0] === L.store ? '' : 'o'}" data-store="${s[0]}" ${isOpen(s) ? '' : 'disabled title="Closed now"'} style="min-height:40px">${s[0] === L.store ? 'Selected' : 'Order here'}</button></li>`).join('') || '<li>No stores found nearby.</li>';
}
$('s').addEventListener('input', (e) => renderStores(e.target.value));
$('list').addEventListener('click', (e) => { const b = e.target.closest('[data-store]'); if (!b || b.disabled) return; L.store = b.dataset.store; loyalty.save(); renderStores($('s').value); Kit.toast(`Pickup set to ${L.store}`, { type: 'success' }); });
renderMenu(); renderStores();
