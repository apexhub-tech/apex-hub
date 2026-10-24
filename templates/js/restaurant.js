/* Olive & Ember — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const D = (id, sec, name, desc, price, diet, img) => ({ id, sec, name, desc, price, diet, img });
const MENU = [
  D('m1', 'Starters', 'Charred flatbread', 'Za\'atar, olive oil, whipped feta.', 8, ['V'], '1653611540493-b3a896319fbf'),
  D('m2', 'Starters', 'Smoked hummus', 'Chickpeas, tahini, chilli butter, warm pita.', 9, ['V'], '1653611540493-b3a896319fbf'),
  D('m3', 'Starters', 'Burrata & figs', 'Roasted figs, honey, toasted walnuts.', 14, ['V', 'GF'], '1784294460349-591c4cd81400'),
  D('m4', 'Starters', 'Grilled halloumi', 'Pomegranate, mint, lemon.', 11, ['V', 'GF'], '1784294460349-591c4cd81400'),
  D('m5', 'Mains', 'Lamb shoulder', '12-hour slow cooked, freekeh, yoghurt.', 28, [], '1771285119318-b342c3ecc51c'),
  D('m6', 'Mains', 'Whole sea bream', 'Wood-fired, herb salsa, charred lemon.', 26, ['GF'], '1467003909585-2f8a72700288'),
  D('m7', 'Mains', 'Chicken shish', 'Garlic toum, pickles, saffron rice.', 19, ['GF'], '1771285119318-b342c3ecc51c'),
  D('m8', 'Mains', 'Aubergine steak', 'Miso glaze, tahini, crispy chickpeas.', 17, ['V', 'VG', 'GF'], '1785734290864-eca98549d0b6'),
  D('m9', 'Desserts', 'Pistachio kunafa', 'Sweet cheese, orange blossom syrup.', 10, ['V'], '1583338917451-face2751d8d5'),
  D('m10', 'Desserts', 'Olive oil cake', 'Citrus, mascarpone cream.', 8, ['V'], '1626263468007-a9e0cf83f1ac'),
  D('m11', 'Desserts', 'Sorbet trio', 'Lemon, raspberry, mango.', 7, ['V', 'VG', 'GF'], '1762032313029-7d799c618eae'),
];
const products = MENU.map((m) => ({ ...m, details: m.diet.length ? [m.diet.map((x) => ({ V: 'Vegetarian', VG: 'Vegan', GF: 'Gluten-free' }[x])).join(' · ')] : undefined }));
products.push({ id: 'gift', name: 'Gift card', price: 0, img: '1783447036642-90a65ff85a0f', hidden: true, options: [{ name: 'Value', values: [['$50', 50], ['$100', 100], ['$150', 150]] }] });
const slots = () => { const n = new Date(), out = []; for (let m = 25; m <= 120; m += 15) { const t = new Date(n.getTime() + m * 6e4); t.setMinutes(Math.ceil(t.getMinutes() / 15) * 15); if (t.getHours() >= 12 && t.getHours() < 23) out.push(`Today ${Kit.time(t)}`); } return out.length ? [...new Set(out)].slice(0, 6) : ['Tomorrow 12:30', 'Tomorrow 13:00', 'Tomorrow 18:30']; };
const Shop = ShopKit.init({ key: 'olive-order', products, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Your order', add: 'Add to order', checkout: 'Checkout', orderVerb: 'Order', empty: 'Nothing here yet — add dishes from the menu.' },
  shipping: [{ id: 'collect', label: 'Collection', note: '24 Harbour Street · ready in 25 min', price: 0, pickup: true }, { id: 'deliver', label: 'Delivery', note: 'Within 5 km · 40–50 min', price: 3.5, freeOver: 45 }],
  slots: { label: 'Ready time', list: slots }, deliveryLabel: 'Collection or delivery', noteLabel: 'allergies or requests', promos: { EMBER10: { pct: 10, min: 30 } }, promoHint: 'EMBER10 — 10% off orders over $30',
  statuses: ['Order received', 'In the kitchen', 'Ready / on its way', 'Enjoy!'], returns: 'Cooked to order · packed to stay warm',
  onChange: (s) => { document.getElementById('bag-n').textContent = s.count() || ''; } });
const $ = (id) => document.getElementById(id);

/* ---------- Open now ---------- */
const now = new Date(), h = now.getHours(), closeH = [5, 6].includes(now.getDay()) ? 25 : now.getDay() === 0 ? 22 : 23;
$('status').innerHTML = h >= 12 && h < closeH ? `<b>● Open now</b> · until ${closeH > 24 ? '01:00' : closeH + ':00'}` : 'Closed · opens 12:00';

/* ---------- Menu ---------- */
let sec = 'Starters';
function renderMenu() {
  $('tabs').innerHTML = ['Starters', 'Mains', 'Desserts'].map((s) => `<button class="tab" role="tab" aria-selected="${s === sec}" data-s="${s}">${s}</button>`).join('');
  const diet = [...document.querySelectorAll('.diet input:checked')].map((i) => i.value);
  $('dishes').innerHTML = MENU.filter((m) => m.sec === sec && diet.every((d) => m.diet.includes(d))).map((m) => `<div class="dish"><h3>${m.name}${m.diet.map((d) => `<span class="d" title="${{ V: 'Vegetarian', VG: 'Vegan', GF: 'Gluten-free' }[d]}">${d}</span>`).join('')}</h3><span class="price">$${m.price}</span><button class="add" data-add="${m.id}" aria-label="Add ${m.name} to order">+</button><p>${m.desc}</p></div>`).join('') || '<p class="none">No dishes match these filters in this section.</p>';
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { sec = b.dataset.s; renderMenu(); } });
document.querySelector('.diet').addEventListener('change', renderMenu);
$('dishes').addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (b) Shop.add(b.dataset.add); });
$('bag').addEventListener('click', () => Shop.open('cart'));

/* ---------- Reservations with live availability ---------- */
const TABLES = { Indoor: 8, Terrace: 5, Bar: 3 };
const TIMES = ['12:30', '13:00', '13:30', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
const db = Kit.store('olive-bookings', () => {
  // Busy demo: pre-fill some tables over the next week
  const out = []; let r = 2; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let d = 0; d < 7; d++) TIMES.forEach((t) => Object.entries(TABLES).forEach(([area, n]) => { const taken = Math.floor(rnd() * (t >= '19:00' && t <= '20:30' ? n + 1 : n * .6)); for (let i = 0; i < taken; i++) out.push({ date: Kit.iso(Kit.addDays(new Date(), d)), time: t, area, guests: 2, demo: true }); }));
  return { bookings: out };
});
const B = db.data;
$('r-guests').innerHTML = Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}" ${i === 1 ? 'selected' : ''}>${i + 1} guest${i ? 's' : ''}</option>`).join('');
$('r-date').valueAsDate = new Date(); $('r-date').min = Kit.iso(new Date());
let time = null;
const left = (date, t, area) => TABLES[area] - B.bookings.filter((b) => b.date === date && b.time === t && b.area === area && !b.cancelled).length;
function renderTimes() {
  const date = $('r-date').value, area = $('r-area').value, nowT = new Date().toTimeString().slice(0, 5), isToday = date === Kit.iso(new Date());
  if (time && (left(date, time, area) <= 0)) time = null;
  $('times').innerHTML = TIMES.map((t) => { const l = left(date, t, area), past = isToday && t <= nowT; return `<button type="button" class="time" data-t="${t}" aria-pressed="${t === time}" ${l <= 0 || past ? 'disabled' : ''}>${t}<small>${past ? 'passed' : l <= 0 ? 'full' : l === 1 ? 'last table' : l + ' tables'}</small></button>`; }).join('');
  const free = TIMES.filter((t) => left(date, t, area) > 0 && !(isToday && t <= nowT)).length;
  $('r-msg').textContent = free ? '' : `${area} is fully booked on this day — try another seating area or date, or join the waitlist.`;
}
function renderMine() {
  const mine = B.bookings.filter((b) => b.mine && !b.cancelled && b.date >= Kit.iso(new Date()));
  $('mybookings').innerHTML = mine.map((b, i) => `<div class="mybook"><b>Your booking · ${b.ref}</b><span>${new Date(b.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${b.time} · ${b.guests} guests · ${b.area}</span><button data-cancel="${b.ref}">Cancel booking</button></div>`).join('');
}
$('times').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b || b.disabled) return; time = b.dataset.t; renderTimes(); });
['r-date', 'r-area', 'r-guests'].forEach((id) => $(id).addEventListener('change', renderTimes));
$('mybookings').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cancel]'); if (!b) return;
  if (!(await Kit.confirm('Cancel this booking?', 'Your table will be released for other guests.', 'Cancel booking'))) return;
  B.bookings.find((x) => x.ref === b.dataset.cancel).cancelled = true; db.save(); renderMine(); renderTimes(); Kit.toast('Booking cancelled — we hope to see you soon');
});
$('res-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('r-name').value.trim(), phone = $('r-phone').value.trim();
  if (!time) { $('r-msg').textContent = 'Please pick one of the available times.'; return; }
  if (name.length < 2) { $('r-msg').textContent = 'Please add the name for the booking.'; $('r-name').focus(); return; }
  if (!/^\+?[\d\s()-]{7,}$/.test(phone)) { $('r-msg').textContent = 'Please add a mobile number so we can confirm by SMS.'; $('r-phone').focus(); return; }
  const bk = { ref: 'OE-' + Math.random().toString(36).slice(2, 6).toUpperCase(), date: $('r-date').value, time, area: $('r-area').value, guests: +$('r-guests').value, name, phone, occasion: $('r-occ').value, mine: true };
  B.bookings.push(bk); db.save(); time = null; renderTimes(); renderMine(); $('res-form').reset(); $('r-date').value = bk.date; $('r-guests').value = 2;
  Kit.modal({ title: 'Table booked!', body: `<p style="color:var(--kit-ink)"><b>${new Date(bk.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${bk.time}</b><br>${bk.guests} guests · ${bk.area}${bk.occasion ? ' · ' + bk.occasion + ' 🎉' : ''}</p><p>Reference <b>${bk.ref}</b>. We've texted a confirmation to ${Kit.esc(bk.phone)}. Please arrive within 15 minutes of your time.</p>`,
    actions: [{ label: 'Add to calendar', onClick: () => { Kit.ics(`olive-ember-${bk.ref}.ics`, { title: `Dinner at Olive & Ember (${bk.guests})`, start: new Date(`${bk.date}T${bk.time}`), minutes: 120, location: '24 Harbour Street' }); return false; } }, { label: 'Done', primary: true }] });
});

/* ---------- Gift cards & events ---------- */
$('gift').addEventListener('click', () => Shop.quickView('gift'));
$('event').addEventListener('click', () => Kit.modal({ title: 'Private dining enquiry', body: `<div class="kit-row"><div class="kit-field"><label for="ev-n">Name</label><input id="ev-n" required autocomplete="name"></div><div class="kit-field"><label for="ev-e">Email</label><input id="ev-e" type="email" required autocomplete="email"></div></div>
  <div class="kit-row"><div class="kit-field"><label for="ev-d">Date</label><input id="ev-d" type="date" required min="${Kit.iso(new Date())}"></div><div class="kit-field"><label for="ev-g">Guests</label><input id="ev-g" type="number" min="9" max="24" value="12" required></div></div>
  <div class="kit-field"><label for="ev-t">Type of event</label><select id="ev-t"><option>Birthday</option><option>Company dinner</option><option>Wedding rehearsal</option><option>Other</option></select></div><div class="kit-field"><label for="ev-m">Anything else?</label><textarea id="ev-m"></textarea></div>`,
  actions: [{ label: 'Cancel' }, { label: 'Send enquiry', primary: true, submit: true, onClick: (d) => { if (+d.querySelector('#ev-g').value < 9 || +d.querySelector('#ev-g').value > 24) { Kit.toast('Private dining is for 9 to 24 guests', { type: 'error' }); return false; } Kit.toast('Thanks! Our events team will reply within one day with a sample menu and price.', { type: 'success', ms: 6000 }); } }] }));

renderMenu(); renderTimes(); renderMine();
