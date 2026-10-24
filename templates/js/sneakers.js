/* DROP/01 — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const EU = ['40', '41', '42', '43', '44', '45'];
const P = [
  { id: 'dr01', name: 'Red Line Runner', price: 180, img: '1542291026-7eec264c27ff', options: [{ name: 'Size', values: ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49'], out: ['39', '44', '47', '49'] }], desc: 'DROP/01. Mesh upper, foam sole, reflective heel tab. 500 pairs worldwide.', limit: 1 },
  { id: 's1', name: 'Volt Trail', price: 170, img: '1606107557195-0e29a4b5b4aa', soldOut: true, desc: 'Trail runner with a grippy lug sole.' },
  { id: 's2', name: 'Pastel 90', price: 150, img: '1595950653106-6c9ebd614d3a', soldOut: true, desc: 'Retro runner in soft pastels.' },
  { id: 's3', name: 'Court Red', price: 160, img: '1600185365483-26d7a4cc7519', options: [{ name: 'Size', values: EU, out: ['40'] }], desc: 'Leather court classic with a red swoosh-style stripe.' },
  { id: 's4', name: 'Ghost Low', price: 140, img: '1608231387042-66d1773070a5', soldOut: true, desc: 'All-white perforated low-top.' },
  { id: 's5', name: 'Studio White', price: 140, img: '1600269452121-4f2416e55c28', options: [{ name: 'Size', values: EU }], desc: 'Minimal everyday sneaker in full-grain leather.' },
  { id: 's6', name: 'Maroon Plim', price: 90, img: '1525966222134-fcfa99b8ae77', options: [{ name: 'Size', values: EU, out: ['45'] }], desc: 'Canvas plimsoll with a vulcanised sole.' },
  { id: 's7', name: 'Box Fresh', price: 160, img: '1560769629-975ec94e6a86', soldOut: true, desc: 'White and orange runner, box-fresh.' },
];
const Shop = ShopKit.init({ key: 'drop01', products: P, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Cart', add: 'Add to cart' },
  promos: { DROPCREW: { pct: 5 } }, promoHint: 'Members: DROPCREW', returns: 'Free returns within 14 days, unworn',
  shipping: [{ id: 'std', label: 'Tracked delivery', note: '2–3 working days', price: 8, freeOver: 150 }, { id: 'exp', label: 'Express', note: 'Next day', price: 18 }],
  onChange: (s) => { document.getElementById('cart-n').textContent = s.count(); document.getElementById('wish-n').textContent = s.data.wish.length; renderShelf(); renderSizes(); } });
const $ = (id) => document.getElementById(id);
const notify = (() => { try { return JSON.parse(localStorage.getItem('apexhub:drop01-notify') || '[]'); } catch (e) { return []; } })();

let pick = null;
function renderSizes() {
  const dr = P[0], inCart = Shop.data.cart.some((l) => l.id === 'dr01');
  $('sizes').innerHTML = dr.options[0].values.map((s) => `<button class="size" aria-pressed="${s === pick}" ${dr.options[0].out.includes(s) ? 'disabled' : ''}>${s}</button>`).join('');
  $('cop').disabled = inCart || ended;
  $('cop').textContent = ended ? 'Drop closed' : inCart ? 'Secured — in your cart' : 'Cop now →';
}
$('sizes').addEventListener('click', (e) => { const b = e.target.closest('.size'); if (!b || b.disabled) return; pick = b.textContent; renderSizes(); });
$('cop').addEventListener('click', () => {
  if (!pick) { $('say').textContent = '→ Pick a size first'; return; }
  if (Shop.data.orders.some((o) => o.items.some((i) => i.id === 'dr01'))) { $('say').textContent = '→ One pair per customer — you already copped'; return; }
  Shop.add('dr01', { Size: pick }, 1, true); $('say').textContent = `→ Size ${pick} secured. 10 min to check out.`; hold = Date.now(); Shop.open('cart');
});
$('fit').addEventListener('click', () => Kit.modal({ title: 'Fit guide', body: '<p>Runs true to size. Wide feet: go half a size up.</p><p>EU 42 = UK 8 = US 9 = 26.5 cm.</p>' }));

// Cart hold: release the pair if checkout isn't done within 10 minutes
let hold = Shop.data.cart.some((l) => l.id === 'dr01') ? Date.now() : 0;
setInterval(() => {
  if (!hold) return;
  const left = 600 - Math.floor((Date.now() - hold) / 1000), line = Shop.data.cart.find((l) => l.id === 'dr01');
  if (!line) { hold = 0; $('say').textContent = ''; return; }
  if (left <= 0) { Shop.setQty('dr01', 0, line.opts); hold = 0; $('say').textContent = '→ Hold expired — your pair was released'; Kit.toast('Your 10-minute hold expired', { type: 'error' }); return; }
  $('say').textContent = `→ Pair held for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}, 1000);

// Countdown + live stock
let end = Date.now() + ((2 * 24 + 14) * 60 + 22) * 6e4, ended = false, stock = 138;
const pad = (x) => String(x).padStart(2, '0');
const tick = () => { const s = Math.max(0, Math.floor((end - Date.now()) / 1000)); $('d').textContent = pad(Math.floor(s / 86400)); $('h').textContent = pad(Math.floor(s % 86400 / 3600)); $('mi').textContent = pad(Math.floor(s % 3600 / 60)); $('s').textContent = pad(s % 60); if (!s && !ended) { ended = true; renderSizes(); } };
setInterval(tick, 1000); tick();
if (!Kit.THUMB) setInterval(() => { if (stock > 40 && Math.random() < .3) { stock--; $('left').textContent = `${stock} / 500 PAIRS LEFT`; $('left-bar').style.width = stock / 5 + '%'; } }, 4000);

let filter = 'all';
function renderShelf() {
  $('shelf').innerHTML = P.slice(1).concat(P[0]).filter((p) => filter === 'all' || (filter === 'out') === !!p.soldOut).map((p) => `<article class="shoe">
    <button class="sk-heart" data-wish="${p.id}" aria-pressed="${Shop.isWished(p.id)}" aria-label="Save ${p.name}">${Shop.isWished(p.id) ? '♥' : '♡'}</button>
    <button class="pic" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 500, 500)}" alt="${p.name}" loading="lazy"></button>
    <div class="row"><span>${p.name}</span>${p.soldOut ? '<span class="so">Sold out</span>' : `<span>$${p.price}</span>`}</div>
    ${p.soldOut ? `<button class="act notify" data-notify="${p.id}">${notify.includes(p.id) ? '✓ You\'ll be notified' : 'Notify me on restock'}</button>` : `<button class="act" data-qv="${p.id}">Choose size →</button>`}</article>`).join('');
}
document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderShelf(); });
$('shelf').addEventListener('click', (e) => {
  const w = e.target.closest('[data-wish]'); if (w) { Shop.toggleWish(w.dataset.wish); return; }
  const n = e.target.closest('[data-notify]');
  if (n) { const id = n.dataset.notify; if (notify.includes(id)) return; Kit.modal({ title: 'Get restock alerts', body: '<div class="kit-field"><label for="ne">Email</label><input id="ne" type="email" required autocomplete="email"></div><p>We\'ll email you once — no spam.</p>', onOpen: (d) => d.querySelector('#ne').focus(), actions: [{ label: 'Cancel' }, { label: 'Notify me', primary: true, submit: true, onClick: () => { notify.push(id); try { localStorage.setItem('apexhub:drop01-notify', JSON.stringify(notify)); } catch (er) { /* ignore */ } renderShelf(); Kit.toast('You\'re on the restock list', { type: 'success' }); } }] }); return; }
  const q = e.target.closest('[data-qv]'); if (q) { const p = P.find((x) => x.id === q.dataset.qv); if (p.soldOut) { Kit.toast(`${p.name} is sold out — tap "Notify me"`); return; } if (p.limit) { $('sz').scrollIntoView({ behavior: 'smooth' }); return; } Shop.quickView(p.id); }
});
$('cart-btn').addEventListener('click', () => Shop.open('cart'));
$('wish-btn').addEventListener('click', () => Shop.open('wish'));
renderShelf(); renderSizes();
