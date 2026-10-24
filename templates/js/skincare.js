/* Glow Lab — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const P = [
  ['k1', 'Hydra Serum', 'Hyaluronic acid · 30 ml', 32, 'dry sensitive', '1608571423902-eed4a5ad8108', 'Bestseller', 4.9, 2140, 'serum'],
  ['k2', 'Clear Toner', 'Niacinamide · 150 ml', 24, 'oily', '1620916297397-a4a5402a3c6c', null, 4.7, 860, 'toner'],
  ['k3', 'Calm Cream', 'Ceramides · 50 ml', 38, 'sensitive dry', '1785581778868-79100f7fe56c', 'New', 4.8, 412, 'moist'],
  ['k4', 'Body Lotion', 'Shea · 250 ml', 19, 'dry oily sensitive', '1620916566398-39f1143ab7be', null, 4.6, 990, 'body'],
  ['k5', 'Night Mask Set', 'Repair · 5 masks', 45, 'dry', '1552046122-03184de85e08', 'Set', 4.8, 230, 'mask'],
  ['k6', 'Serum Trio', 'Vitamin C, retinol, peptides', 69, 'oily dry', '1787569499510-ef18cc7ba7a5', 'Save 20%', 4.9, 310, 'serum'],
  ['k7', 'Daily Cleanser', 'Gentle foam · 150 ml', 18, 'oily sensitive', '1619451427882-6aaaded0cc61', null, 4.5, 1580, 'cleanse'],
  ['k8', 'Glow Duo', 'Serum + moisturiser', 52, 'dry sensitive', '1580870069867-74c57ee1bb07', 'Gift', 4.9, 520, 'moist'],
].map(([id, name, sub, price, skin, img, tag, rating, reviews, step]) => ({ id, name, sub, price, skin, img, tag, rating, reviews, step, desc: `${sub}. Dermatologist-tested, fragrance-free and suitable for ${skin.split(' ').join(', ')} skin.`, details: ['Vegan & cruelty-free', 'Recyclable glass packaging'],
  options: [{ name: 'Purchase', values: [['One-time', 0], ['Subscribe · every 2 months −15%', -Math.round(price * .15 * 100) / 100]], preselect: true }] }));
const Shop = ShopKit.init({ key: 'glowlab', products: P, img: (p, w, h) => U(p.img, w, Math.round(h * 1.25)), labels: { cart: 'Bag', add: 'Add to bag' },
  promos: { GLOW10: { pct: 10 }, ROUTINE: { pct: 10, min: 60 } }, promoHint: 'Try GLOW10', returns: 'Love it or your money back within 60 days',
  shipping: [{ id: 'std', label: 'Standard delivery', note: '2–4 days · free samples included', price: 4.5, freeOver: 40 }, { id: 'exp', label: 'Express delivery', note: 'Next day', price: 9 }],
  onChange: (s) => { document.getElementById('bag').textContent = `Bag · ${s.count()}`; document.getElementById('wish-btn').textContent = `♡ ${s.data.wish.length}`; renderGrid(); } });
const $ = (id) => document.getElementById(id);
let skin = 'all';

function renderGrid() {
  $('grid').innerHTML = P.filter((p) => skin === 'all' || p.skin.split(' ').includes(skin)).map((p) => `<article class="prod">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
    <button class="sk-heart" data-wish="${p.id}" aria-pressed="${Shop.isWished(p.id)}" aria-label="Save ${p.name}">${Shop.isWished(p.id) ? '♥' : '♡'}</button>
    <button class="ph" data-qv="${p.id}" aria-label="View ${p.name}"><img src="${U(p.img, 500, 625)}" alt="${p.name}" loading="lazy"></button>
    <h3>${p.name}</h3><p class="for">${p.sub}</p><p class="rating">★ ${p.rating} · ${p.reviews.toLocaleString()} reviews</p>
    <div class="row"><span class="pr">$${p.price}<small>or $${(p.price * .85).toFixed(2)} subscribed</small></span><button class="add" data-add="${p.id}">Add</button></div></article>`).join('');
}
document.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; skin = b.dataset.s; document.querySelectorAll('.chips button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderGrid(); });
$('grid').addEventListener('click', (e) => {
  const a = e.target.closest('[data-add]'); if (a) { Shop.add(a.dataset.add, { Purchase: 'One-time' }); return; }
  const w = e.target.closest('[data-wish]'); if (w) { Shop.toggleWish(w.dataset.wish); return; }
  const q = e.target.closest('[data-qv]'); if (q) Shop.quickView(q.dataset.qv);
});
$('bag').addEventListener('click', () => Shop.open('cart')); $('wish-btn').addEventListener('click', () => Shop.open('wish'));

/* ---------- Routine quiz ---------- */
const Q = [
  ['How does your skin feel by midday?', [['Tight or flaky', 'dry'], ['Shiny, especially the T-zone', 'oily'], ['Easily red or itchy', 'sensitive']]],
  ['What\'s your main goal?', [['Hydration & glow', 'glow'], ['Fewer breakouts', 'clear'], ['Calm & soothe', 'calm']]],
  ['How long is your routine?', [['3 steps, keep it simple', 3], ['5 steps, I love it', 5]]],
];
function quiz() {
  const ans = []; let i = 0;
  Kit.modal({ title: 'Find your routine', body: '<div id="qz"></div>', onOpen: (d) => {
    const draw = () => {
      const [q, opts] = Q[i];
      d.querySelector('#qz').innerHTML = `<div class="quiz-prog"><i style="width:${(i / Q.length) * 100}%"></i></div><p class="step-n">Question ${i + 1} of ${Q.length}</p><h3 style="font-size:22px">${q}</h3><div class="quiz-opts">${opts.map(([l], k) => `<button type="button" data-k="${k}">${l}</button>`).join('')}</div>${i ? '<button type="button" class="kit-reset" id="qback">← Back</button>' : ''}`;
      d.querySelector('.quiz-opts').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; ans[i] = opts[+b.dataset.k][1]; if (++i < Q.length) draw(); else { d.close(); showRoutine(ans); } };
      const back = d.querySelector('#qback'); if (back) back.onclick = () => { i--; draw(); };
    };
    draw();
  } });
}
function showRoutine([type, goal, steps]) {
  const pick = (step) => P.filter((p) => p.step === step).sort((a, b) => (b.skin.includes(type) - a.skin.includes(type)) || b.rating - a.rating)[0];
  const order = steps === 3 ? ['cleanse', goal === 'clear' ? 'toner' : 'serum', 'moist'] : ['cleanse', 'toner', 'serum', 'moist', 'mask'];
  const items = order.map(pick).filter(Boolean), names = { cleanse: 'Cleanse', toner: 'Tone', serum: 'Treat', moist: 'Moisturise', mask: 'Weekly mask' };
  const total = items.reduce((a, p) => a + p.price, 0);
  const r = $('result'); r.hidden = false;
  r.innerHTML = `<p class="step-n">Your ${type} skin routine · goal: ${{ glow: 'hydration & glow', clear: 'fewer breakouts', calm: 'calm & soothe' }[goal]}</p><h2>${items.length} steps, made for you</h2>
    <div class="routine">${items.map((p) => `<div><img src="${U(p.img, 128, 128)}" alt=""><span><span class="step-n">${names[p.step]}</span><b style="display:block">${p.name}</b><small>$${p.price} · ★ ${p.rating}</small></span></div>`).join('')}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn" id="add-routine">Add routine to bag · $${total} → $${(total * .9).toFixed(2)}</button><button class="btn soft" id="retake">Retake quiz</button><span style="color:var(--muted);font-size:14px">10% off applied automatically with code ROUTINE</span></div>`;
  $('add-routine').onclick = () => { items.forEach((p) => Shop.add(p.id, { Purchase: 'One-time' }, 1, true)); if (Shop.totals().sub >= 60) Shop.data.promo = 'ROUTINE'; Shop.refresh(); Kit.toast('Your routine is in your bag', { type: 'success' }); Shop.open('cart'); };
  $('retake').onclick = quiz;
  r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('start-quiz').addEventListener('click', quiz);
$('nav-quiz').addEventListener('click', (e) => { e.preventDefault(); quiz(); });
renderGrid();
