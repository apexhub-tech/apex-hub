/* Lena Hart — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const PHOTOS = [
  ['1783440011581-d64a74ae0786', 'Sunset over a mountain lake', 'mountains', 1.25, 'Dolomites, 2024'], ['1544954617-f5c6b0d16164', 'Quiet shoreline', 'coast', .67, 'Algarve, 2023'],
  ['1533577083121-c9bd0b0f32fd', 'Forest waterfall', 'water', 1.4, 'Iceland, 2022'], ['1489493512598-d08130f49bea', 'Brown mountain ridges', 'mountains', .7, 'Atlas, 2023'],
  ['1604715686140-d5bef96c8b9d', 'Lake and meadow', 'water', .75, 'Bavaria, 2024'], ['1778147356071-c8f5a7287ea6', 'Hills and ocean at dusk', 'coast', 1.2, 'Big Sur, 2025'],
  ['1764957079953-82bab821af38', 'Stone bridge in the mountains', 'mountains', 1.3, 'Montenegro, 2024'], ['1534218238612-bace67b05bf2', 'Aerial view of a lake', 'water', .8, 'Finland, 2023'],
  ['1493962621260-74cc5a3baf89', 'Waterfalls under storm clouds', 'water', 1.1, 'Faroe Islands, 2022'], ['1584282479918-1ea22427dc0f', 'River through green trees', 'water', .66, 'Slovenia, 2024'],
];
const products = PHOTOS.map(([id, name, , , place], i) => ({ id: 'p' + i, name, img: id, price: 45, desc: `${place}. Signed and numbered, printed on archival paper. Edition of 50.`, details: ['Ships rolled in a tube, or framed and ready to hang', 'Edition of 50 · certificate of authenticity'],
  options: [{ name: 'Size', values: [['30 × 40 cm', 0], ['50 × 70 cm', 75], ['70 × 100 cm', 175]] }, { name: 'Paper', values: [['Matte fine art', 0], ['Glossy photo', 0], ['Metallic', 25]], preselect: true }, { name: 'Frame', values: [['No frame', 0], ['Oak', 90], ['Black', 90]], preselect: true }] }));
const Shop = ShopKit.init({ key: 'lenahart', products, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Cart', add: 'Add print to cart' },
  shipping: [{ id: 'std', label: 'Tracked shipping', note: 'Rolled prints 3–5 days, framed 7–10 days', price: 12, freeOver: 150 }, { id: 'exp', label: 'Express', note: '2–3 days', price: 29 }],
  promos: { STUDIO15: { pct: 15, min: 200 } }, promoHint: 'STUDIO15 — 15% off orders over $200', returns: '30-day returns on unframed prints',
  statuses: ['Order received', 'Printing & signing', 'Shipped', 'Delivered'], onChange: (s) => { document.getElementById('cart-btn').textContent = `Cart (${s.count()})`; } });
const $ = (id) => document.getElementById(id);

$('grid').innerHTML = PHOTOS.map(([id, cap, cat, r], i) => `<button class="shot" data-i="${i}" data-c="${cat}" aria-label="Open ${cap}"><img src="${U(id, 700, Math.round(700 * r))}" alt="${cap}" width="700" height="${Math.round(700 * r)}" loading="lazy"><span class="cap"><span>${cap}</span><span>Prints from $45</span></span></button>`).join('');
document.querySelectorAll('.filters [data-f]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.filters [data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  document.querySelectorAll('.shot').forEach((s) => { s.hidden = b.dataset.f !== 'all' && s.dataset.c !== b.dataset.f; });
}));

/* ---------- Lightbox ---------- */
const lb = $('lb'), img = $('lb-img');
let cur = 0, opener = null;
const visible = () => [...document.querySelectorAll('.shot:not([hidden])')].map((s) => +s.dataset.i);
const show = (i) => { cur = i; const [id, cap, , , place] = PHOTOS[i]; img.src = U(id, 1600, Math.round(1600 * PHOTOS[i][3])); img.alt = cap; $('lb-cap').textContent = `${cap} · ${place}`; const v = visible(); $('lb-n').textContent = `${v.indexOf(i) + 1} / ${v.length}`; };
const step = (d) => { const v = visible(); show(v[(v.indexOf(cur) + d + v.length) % v.length]); };
const close = () => { lb.classList.remove('open'); opener?.focus(); };
$('grid').addEventListener('click', (e) => { const s = e.target.closest('.shot'); if (!s) return; opener = s; show(+s.dataset.i); lb.classList.add('open'); lb.querySelector('.x').focus(); });
lb.querySelector('.x').addEventListener('click', close);
lb.querySelector('.prev').addEventListener('click', () => step(-1));
lb.querySelector('.next').addEventListener('click', () => step(1));
lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
$('lb-buy').addEventListener('click', () => { close(); Shop.quickView('p' + cur); });
let touchX = null;
lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => { if (touchX == null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); touchX = null; });
document.addEventListener('keydown', (e) => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
$('cart-btn').addEventListener('click', () => Shop.open('cart'));

/* ---------- Client proofing ---------- */
const proofDb = Kit.store('lenahart-proof', () => ({ picks: [], sent: false }));
const PR = proofDb.data;
$('proof-btn').addEventListener('click', () => Kit.modal({ title: 'Client gallery', body: `<p>Enter the access code from your email to see your private gallery.</p><div class="kit-field"><label for="pc">Access code</label><input id="pc" autocomplete="off" placeholder="e.g. AZURE-24" style="text-transform:uppercase"></div><p class="kit-hint">Demo code: <b>AZURE-24</b></p><p id="pc-err" style="color:#B3261E" role="alert"></p>`,
  onOpen: (d) => d.querySelector('#pc').focus(),
  actions: [{ label: 'Cancel' }, { label: 'Open gallery', primary: true, onClick: (d) => { if (d.querySelector('#pc').value.trim().toUpperCase() !== 'AZURE-24') { d.querySelector('#pc-err').textContent = 'That code doesn\'t match a gallery. Check your email and try again.'; return false; } setTimeout(proofing); } }] }));
function proofing() {
  const pics = PHOTOS.slice(0, 8);
  Kit.modal({ title: 'Azure Bay Resort · hotel shoot', wide: true, body: `<p>Choose your favourites for final editing — your package includes <b style="color:var(--kit-ink)">5 images</b>. Extra images are $60 each.</p><p id="pf-n" style="color:var(--kit-ink)"></p><div class="proof-grid" id="pg">${pics.map(([id, cap], i) => `<div class="proof"><img src="${U(id, 360, 360)}" alt="${cap}"><button type="button" data-p="${i}" aria-pressed="${PR.picks.includes(i)}" aria-label="Select ${cap}">♥</button><span>#${String(i + 1).padStart(3, '0')}</span></div>`).join('')}</div>${PR.sent ? '<p style="color:#1C7C3A">✓ Selection sent — Lena is editing your images.</p>' : ''}`,
    onOpen: (d) => {
      const upd = () => { const n = PR.picks.length; d.querySelector('#pf-n').textContent = `${n} selected${n > 5 ? ` · ${n - 5} extra × $60 = $${(n - 5) * 60}` : ''}`; };
      d.querySelector('#pg').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b || PR.sent) return; const i = +b.dataset.p, on = !PR.picks.includes(i); PR.picks = on ? [...PR.picks, i] : PR.picks.filter((x) => x !== i); b.setAttribute('aria-pressed', on); proofDb.save(); upd(); };
      upd();
    },
    actions: [{ label: 'Close' }, { label: PR.sent ? 'Selection sent' : 'Send my selection', primary: true, onClick: () => { if (PR.sent) return; if (!PR.picks.length) { Kit.toast('Select at least one image', { type: 'error' }); return false; } PR.sent = true; proofDb.save(); Kit.toast(`${PR.picks.length} images sent to Lena for editing — final files in 5 working days`, { type: 'success', ms: 6000 }); } }] });
}

/* ---------- Commission enquiry ---------- */
$('i-b').addEventListener('input', (e) => { $('i-bv').textContent = '$' + (+e.target.value).toLocaleString() + (+e.target.value >= 20000 ? '+' : ''); });
$('i-d').min = Kit.iso(new Date());
$('inq').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = $('i-n').value.trim(), em = $('i-e').value.trim(), m = $('i-m').value.trim(), msg = $('i-msg');
  if (n.length < 2) { msg.textContent = 'Please add your name.'; $('i-n').focus(); return; }
  if (!/^\S+@\S+\.\S+$/.test(em)) { msg.textContent = 'Please add an email like name@example.com.'; $('i-e').focus(); return; }
  if (m.length < 10) { msg.textContent = 'Tell me a little about the project (a sentence or two).'; $('i-m').focus(); return; }
  msg.textContent = `Thanks ${n.split(' ')[0]}! I'll reply to ${em} within two days.`; e.target.reset(); $('i-bv').textContent = '$3,000';
});
