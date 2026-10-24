/* Nordhem — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const P = [
  { id: 'f1', name: 'Lounge Chair', price: 489, room: 'Reading', img: '1617364852223-75f57e78dc96', sw: [['Oak / black', '#B98B5E'], ['Walnut / black', '#5C4033']], ship: 'Ships in 3–5 days', desc: 'Steam-bent oak frame with a deep, padded leather seat.', details: ['W 72 × D 80 × H 76 cm', 'Solid FSC oak', 'Assembly: none needed'] },
  { id: 'f2', name: 'Oslo Dining Set', price: 1290, room: 'Dining', img: '1611269154421-4e27233ac5c7', sw: [['Natural oak', '#C9A27A'], ['Smoked oak', '#6B4F3A']], ship: 'Ships in 2–3 weeks', desc: 'Table for six with four chairs in solid oak.', details: ['Table 200 × 90 cm', 'Seats 6', 'Assembly: 40 min'] },
  { id: 'f3', name: 'Round Side Table', price: 210, room: 'Living', img: '1517705008128-361805f42e86', sw: [['White / oak', '#EDE7DD'], ['Black / oak', '#2B2620']], ship: 'Ships in 3–5 days', desc: 'A compact table with a lacquered top and oak legs.', details: ['Ø 50 × H 55 cm', 'Assembly: 5 min'] },
  { id: 'f4', name: 'Linen Sofa', price: 1590, room: 'Living', img: '1605774337664-7a846e9cdf17', sw: [['Stone grey', '#9C9A94'], ['Oat', '#D8CDB9'], ['Moss', '#4F5D46']], ship: 'Made to order · 4–6 weeks', fabric: true, desc: 'Deep three-seater with removable, washable linen covers.', details: ['W 220 × D 95 × H 80 cm', 'Feather & foam cushions', 'Washable covers'] },
  { id: 'f5', name: 'Wool Armchair', price: 640, room: 'Reading', img: '1759722667550-81316a23d723', sw: [['Charcoal', '#4A4A4A'], ['Sand', '#CDBFA6']], ship: 'Ships in 1–2 weeks', fabric: true, desc: 'Boucle wool armchair that hugs you back.', details: ['W 80 × D 85 × H 78 cm'] },
  { id: 'f6', name: 'Ceramic Vase', price: 49, room: 'Decor', img: '1653242370332-e332a8103763', sw: [['Chalk', '#F1EDE6'], ['Clay', '#B4775B']], ship: 'Ships in 1–2 days', desc: 'Hand-thrown stoneware, every one slightly different.', details: ['H 28 cm', 'Watertight glaze'] },
  { id: 'f7', name: 'Dining Bench', price: 360, room: 'Dining', img: '1772442363851-738a548f6c5c', sw: [['Natural oak', '#C9A27A']], ship: 'Ships in 1–2 weeks', desc: 'A long bench to match the Oslo table.', details: ['L 180 cm', 'Seats 3'] },
  { id: 'f8', name: 'Reading Chair', price: 520, room: 'Reading', img: '1763279934323-edb3735f6a6e', sw: [['Cream', '#EFE7D6'], ['Rust', '#A35D45']], ship: 'Ships in 1–2 weeks', fabric: true, desc: 'High-backed chair made for long afternoons.', details: ['W 70 × D 78 × H 98 cm'] },
].map((p) => ({ ...p, options: [{ name: 'Colour', values: p.sw.map((s) => s[0]) }] }));
const SAMPLES = [...new Set(P.filter((p) => p.fabric).flatMap((p) => p.sw.map((s) => s[0])))];
P.push({ id: 'sample', name: 'Fabric sample', price: 0, img: '1605774337664-7a846e9cdf17', hidden: true, options: [{ name: 'Colour', values: SAMPLES }] });
const weeks = () => Array.from({ length: 4 }, (_, i) => { const d = Kit.addDays(new Date(), 7 * (i + 1)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`; });
const Shop = ShopKit.init({ key: 'nordhem', products: P, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Bag', add: 'Add to bag' }, returns: '100-night trial · 10-year guarantee',
  promos: { HOME15: { pct: 15, min: 1000 } }, promoHint: 'HOME15 — 15% off orders over $1,000',
  shipping: [{ id: 'std', label: 'Kerbside delivery', note: 'To your front door', price: 49, freeOver: 500 }, { id: 'wg', label: 'White-glove delivery & assembly', note: 'Room of choice, packaging removed', price: 129 }, { id: 'pick', label: 'Collect from warehouse', note: 'Nordhem Depot, Green Valley', price: 0, pickup: true }],
  slots: { label: 'Delivery week', list: weeks }, statuses: ['Order placed', 'Being made', 'Scheduled for delivery', 'Delivered'],
  onChange: (s) => { document.getElementById('bag').textContent = `Bag (${s.count()})`; document.getElementById('wish-btn').textContent = `Saved (${s.data.wish.length})`; renderProducts(); } });
const $ = (id) => document.getElementById(id);
const chosen = {}; let room = null;

function renderProducts() {
  const s = $('sort').value;
  let list = P.filter((p) => !p.hidden && (!room || p.room === room));
  if (s === 'low') list.sort((a, b) => a.price - b.price); if (s === 'high') list.sort((a, b) => b.price - a.price);
  $('shop-h').textContent = room ? `${room === 'Reading' ? 'Reading nook' : room}` : 'Bestsellers'; $('show-all').hidden = !room;
  $('products').innerHTML = list.map((p) => { const c = chosen[p.id] || p.sw[0][0]; return `<article class="prod">
    <button class="sk-heart" data-wish="${p.id}" aria-pressed="${Shop.isWished(p.id)}" aria-label="Save ${p.name}">${Shop.isWished(p.id) ? '♥' : '♡'}</button>
    <button class="ph" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 600, 600)}" alt="${p.name}" loading="lazy"></button>
    <h3>${p.name}</h3><div class="line"><span>or $${Math.ceil(p.price / 12)}/mo</span><b>$${p.price.toLocaleString()}</b></div><p class="delivery">${p.ship}</p>
    <div class="sw" role="group" aria-label="${p.name} colour">${p.sw.map(([n, col]) => `<button style="background:${col}" aria-pressed="${n === c}" aria-label="${n}" data-sw="${p.id}" data-n="${n}"></button>`).join('')}<span>${c}</span></div>
    <div class="acts"><button class="add" data-add="${p.id}">Add to bag</button>${p.fabric ? `<button class="sample" data-sample="${p.id}">Free sample</button>` : ''}</div></article>`; }).join('');
}
$('products').addEventListener('click', (e) => {
  const s = e.target.closest('[data-sw]'); if (s) { chosen[s.dataset.sw] = s.dataset.n; renderProducts(); return; }
  const a = e.target.closest('[data-add]'); if (a) { const p = P.find((x) => x.id === a.dataset.add); Shop.add(p.id, { Colour: chosen[p.id] || p.sw[0][0] }); return; }
  const sm = e.target.closest('[data-sample]');
  if (sm) { const p = P.find((x) => x.id === sm.dataset.sample), c = chosen[p.id] || p.sw[0][0], have = Shop.data.cart.filter((l) => l.id === 'sample'); if (have.some((l) => l.opts.Colour === c)) { Kit.toast('That sample is already in your bag'); return; } if (have.length >= 3) { Kit.toast('You can order up to 3 free samples', { type: 'error' }); return; } Shop.add('sample', { Colour: c }); return; }
  const w = e.target.closest('[data-wish]'); if (w) { Shop.toggleWish(w.dataset.wish); return; }
  const q = e.target.closest('[data-qv]'); if (q) Shop.quickView(q.dataset.qv);
});
$('rooms').addEventListener('click', (e) => { const b = e.target.closest('[data-room]'); if (!b) return; room = room === b.dataset.room ? null : b.dataset.room; document.querySelectorAll('.room').forEach((x) => x.setAttribute('aria-pressed', x.dataset.room === room)); renderProducts(); $('shop').scrollIntoView({ behavior: 'smooth' }); });
$('show-all').addEventListener('click', () => { room = null; document.querySelectorAll('.room').forEach((x) => x.setAttribute('aria-pressed', 'false')); renderProducts(); });
$('sort').addEventListener('change', renderProducts);
$('bag').addEventListener('click', () => Shop.open('cart')); $('wish-btn').addEventListener('click', () => Shop.open('wish'));
$('pf').addEventListener('submit', (e) => { e.preventDefault(); const ok = /^\S+@\S+\.\S+$/.test($('pf-email').value.trim()); $('pf-msg').style.color = ok ? 'var(--moss)' : '#B3261E'; $('pf-msg').textContent = ok ? `Thanks! A designer will email your ${$('pf-room').value.toLowerCase()} plan within 48 hours.` : 'Please enter your email so we can send the plan.'; if (ok) e.target.reset(); });
renderProducts();
