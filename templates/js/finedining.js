/* Maison Noir — behaviour */
const MENUS = {
  classic: [['I', 'Oyster & green apple', 'Cucumber, dill oil, frozen buttermilk', 'Champagne, Blanc de Blancs'], ['II', 'Beetroot, aged', 'Smoked yoghurt, rye crumb, blackcurrant', 'Riesling, Mosel'], ['III', 'Line-caught sea bass', 'Brown butter, celeriac, caviar', 'Chablis Premier Cru'], ['IV', 'Wagyu, ember-roasted', 'Black garlic, shallot, red wine jus', 'Pinot Noir, Burgundy'], ['V', 'Chocolate & hay', 'Hay-infused cream, cocoa nib, sea salt', 'Tawny Port, 20 years']],
  veg: [['I', 'Tomato water & basil', 'Heirloom tomatoes, olive oil snow', 'Champagne, Blanc de Blancs'], ['II', 'Beetroot, aged', 'Smoked yoghurt, rye crumb, blackcurrant', 'Riesling, Mosel'], ['III', 'Celeriac, salt-baked', 'Brown butter, hazelnut, truffle', 'Chablis Premier Cru'], ['IV', 'Wild mushroom', 'Black garlic, shallot, Madeira jus', 'Pinot Noir, Burgundy'], ['V', 'Chocolate & hay', 'Hay-infused cream, cocoa nib, sea salt', 'Tawny Port, 20 years']],
};
const P = [
  { id: 'deposit', name: 'Reservation deposit', price: 50, img: '1703793578040-07e1778b6b2c', hidden: true },
  { id: 'voucher', name: 'Maison Noir gift voucher', price: 0, img: '1731941465921-eb4285693713', desc: 'A printed or emailed voucher, valid 12 months.', options: [{ name: 'Value', values: [['$100', 100], ['$200', 200], ['Tasting for two · $370', 370], ['Tasting & wine for two · $560', 560]] }, { name: 'Delivery', values: ['Email', 'Printed card in a box'], preselect: true }] },
];
const Shop = ShopKit.init({ key: 'noir-dining', products: P, img: (p, w, h) => `https://images.unsplash.com/photo-${p.img}?auto=format&fit=crop&w=${w}&h=${h}&q=70`, labels: { cart: 'Basket', add: 'Add', checkout: 'Secure payment', orderVerb: 'Payment' },
  shipping: [{ id: 'none', label: 'No delivery needed', note: 'Confirmation by email', price: 0, pickup: true }], deliveryLabel: 'Confirmation', returns: 'Deposit refundable up to 48 hours before',
  statuses: ['Confirmed', 'Confirmed', 'Confirmed', 'Completed'], onChange: (s) => {
    syncBookings(s);
    // This page has no cart button: show the basket as soon as a voucher is added
    if (s.data.cart.some((l) => l.id === 'voucher')) setTimeout(() => { if (!document.querySelector('dialog[open]') && !document.querySelector('.sk-drawer.open')) s.open('cart'); }, 60);
  } });
const $ = (id) => document.getElementById(id);
const SEATS = 20, SEATINGS = ['18:30', '21:00'];

// Booked seats per date/seating (demo data pre-fills some evenings)
const db = Kit.store('noir-res', () => { const taken = {}; let r = 5; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 21; i++) SEATINGS.forEach((s, k) => { taken[Kit.iso(Kit.addDays(new Date(), i)) + ' ' + s] = Math.min(SEATS, Math.floor(rnd() * 14) + (k ? 6 : 2) + (i % 7 === 4 ? 8 : 0)); }); return { taken, mine: [], waitlist: [], pending: null }; });
const R = db.data;
const open = (iso) => [0, 3, 4, 5, 6].includes(new Date(iso + 'T12:00').getDay());
const firstOpen = () => { for (let i = 1; i < 14; i++) { const d = Kit.iso(Kit.addDays(new Date(), i)); if (open(d)) return d; } };
$('d').value = firstOpen(); $('d').min = Kit.iso(Kit.addDays(new Date(), 1));
let seating = null;

function renderMenu(v = 'classic') { $('courses').innerHTML = MENUS[v].map(([n, t, d, w]) => `<li><span class="n">${n}</span><div><h3>${t}</h3><p>${d}</p><p class="pair">Pairing · ${w}</p></div></li>`).join(''); }
document.querySelector('.menu-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; document.querySelectorAll('.menu-tabs button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderMenu(b.dataset.m); });

function renderSeatings() {
  const date = $('d').value, g = +$('g').value;
  if (!open(date)) { $('seatings').innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">We\'re closed on Mondays and Tuesdays — please choose another evening.</p>'; seating = null; renderSum(); return; }
  $('seatings').innerHTML = SEATINGS.map((s) => { const left = SEATS - (R.taken[date + ' ' + s] || 0), full = left < g; return `<button class="seat" data-s="${s}" aria-pressed="${s === seating}" ${full ? 'data-full="1"' : ''}><b>${s}</b><small>${full ? (left ? `Only ${left} seat${left > 1 ? 's' : ''} left · join waitlist` : 'Fully booked · join waitlist') : left <= 4 ? `Last ${left} seats` : `${left} seats available`}</small></button>`; }).join('');
  if (seating && SEATS - (R.taken[date + ' ' + seating] || 0) < g) seating = null;
  renderSum();
}
function renderSum() {
  const g = +$('g').value, pair = document.querySelector('[name=pair]:checked').value, pp = pair === 'Wine pairing' ? 95 : pair === 'none' ? 0 : 60;
  $('sum').innerHTML = seating ? `${new Date($('d').value + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${seating} · ${g} guest${g > 1 ? 's' : ''}<br>Estimated bill <b>$${(185 + pp) * g}</b> · deposit today <b>$${50 * g}</b>` : 'Choose a seating to continue.';
  $('book').disabled = !seating;
}
$('seatings').addEventListener('click', (e) => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  if (b.dataset.full) { waitlist(b.dataset.s); return; }
  seating = b.dataset.s; renderSeatings();
});
['d', 'g'].forEach((id) => $(id).addEventListener('change', () => { seating = null; renderSeatings(); }));
document.querySelectorAll('[name=pair]').forEach((r) => r.addEventListener('change', renderSum));
function waitlist(s) {
  Kit.modal({ title: `Waitlist · ${s}`, body: `<p>We'll text you the moment a table for ${$('g').value} opens up on ${new Date($('d').value + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.</p><div class="kit-field"><label for="wl-n">Name</label><input id="wl-n" required autocomplete="name"></div><div class="kit-field"><label for="wl-p">Mobile</label><input id="wl-p" type="tel" required autocomplete="tel"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Join waitlist', primary: true, submit: true, onClick: () => { R.waitlist.push({ date: $('d').value, s, g: +$('g').value }); db.save(); Kit.toast(`You're #${R.waitlist.filter((w) => w.date === $('d').value && w.s === s).length} on the waitlist — we'll text you`, { type: 'success' }); } }] });
}
$('book').addEventListener('click', () => {
  const g = +$('g').value, pair = document.querySelector('[name=pair]:checked').value;
  R.pending = { date: $('d').value, s: seating, g, menu: $('menu-v').value, pair: pair === 'none' ? '' : pair, diet: $('diet').value.trim(), occ: $('occ').checked };
  db.save();
  Shop.clear();
  Shop.add('deposit', { Date: new Date(R.pending.date + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), Seating: seating, Menu: R.pending.menu }, g, true);
  Shop.checkout();
});
// When the deposit payment completes, the reservation is confirmed
function syncBookings(s) {
  const paid = s.data.orders.filter((o) => o.items.some((i) => i.id === 'deposit'));
  if (R.pending && paid.length > R.mine.length) {
    const p = R.pending, key = p.date + ' ' + p.s; R.taken[key] = (R.taken[key] || 0) + p.g;
    R.mine.push({ ...p, ref: paid[paid.length - 1].no }); R.pending = null; db.save(); seating = null; renderSeatings();
    setTimeout(() => Kit.toast('Your table is reserved — see you soon', { type: 'success' }), 300);
  }
  $('mine').innerHTML = R.mine.filter((m) => !m.cancelled && m.date >= Kit.iso(new Date())).map((m) => `<div class="mine"><span class="k">Your reservation · ${m.ref}</span><span>${new Date(m.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${m.s} · ${m.g} guests · ${m.menu}${m.pair ? ' · ' + m.pair : ''}</span>${m.diet ? `<span style="color:var(--muted)">Dietary: ${Kit.esc(m.diet)}</span>` : ''}<span style="display:flex;gap:16px"><button data-ics="${m.ref}">Add to calendar</button><button data-cancel="${m.ref}">Cancel reservation</button></span></div>`).join('');
}
$('mine').addEventListener('click', async (e) => {
  const ic = e.target.closest('[data-ics]'); if (ic) { const m = R.mine.find((x) => x.ref === ic.dataset.ics); Kit.ics('maison-noir.ics', { title: `Maison Noir · ${m.g} guests`, start: new Date(`${m.date}T${m.s}`), minutes: 180, location: 'Maison Noir' }); return; }
  const c = e.target.closest('[data-cancel]'); if (!c) return;
  const m = R.mine.find((x) => x.ref === c.dataset.cancel), hrs = (new Date(`${m.date}T${m.s}`) - Date.now()) / 36e5;
  if (!(await Kit.confirm('Cancel your reservation?', hrs > 48 ? `Your $${50 * m.g} deposit will be refunded in full.` : 'Cancellations within 48 hours forfeit the deposit.', 'Cancel reservation'))) return;
  m.cancelled = true; R.taken[m.date + ' ' + m.s] -= m.g; db.save(); syncBookings(Shop); renderSeatings(); Kit.toast(hrs > 48 ? 'Cancelled — deposit refunded' : 'Reservation cancelled');
});
const gift = () => { Shop.clear(); Shop.quickView('voucher'); };
$('gift').addEventListener('click', gift); $('nav-gift').addEventListener('click', gift);
renderMenu(); renderSeatings();
