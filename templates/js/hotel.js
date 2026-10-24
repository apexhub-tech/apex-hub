/* Azure Bay — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const ROOMS = [
  { id: 'classic', name: 'Classic Room', base: 240, cap: 2, units: 14, size: 32, bed: 'King or twin', view: 'Garden view', img: '1618773928121-c32242e63f39', img2: '1629140727571-9b5c6f6267b4', amen: ['Rain shower', 'Nespresso machine', 'Balcony'] },
  { id: 'garden', name: 'Garden Suite', base: 380, cap: 3, units: 8, size: 48, bed: 'King + sofa bed', view: 'Private terrace', img: '1611892440504-42a792e24d32', img2: '1631049307264-da0ec9d70304', amen: ['Outdoor shower', 'Terrace', 'Bathtub'] },
  { id: 'villa', name: 'Bay Villa', base: 720, cap: 5, units: 3, size: 90, bed: '2 bedrooms', view: 'Sea view', img: '1781572725438-ac8c41476752', img2: '1551882547-ff40c63fe5fa', amen: ['Plunge pool', 'Butler service', 'Kitchenette'] },
];
const RATES = [['flex', 'Room only · free cancellation', 'Cancel free until 48 h before arrival', 1], ['bb', 'Breakfast included · free cancellation', 'Daily breakfast buffet for every guest', 1.12], ['nr', 'Non-refundable · save 10%', 'Pay now, no changes or refunds', .9]];
const EXTRAS = [['transfer', 'Airport transfer (each way)', 45], ['spa', 'Spa ritual for two', 160], ['late', 'Late check-out (16:00)', 50], ['dinner', 'Sunset dinner on the beach', 220]];
const products = [{ id: 'stay', name: 'Stay', price: 0, img: ROOMS[0].img, hidden: true }, ...EXTRAS.map(([id, name, price]) => ({ id, name, price, img: '1551882547-ff40c63fe5fa', hidden: true }))];
const H = Kit.store('azure-hotel', () => {
  // Rooms already sold per night (demo), keyed by room + date
  const sold = {}; let r = 3; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 60; i++) { const d = Kit.iso(Kit.addDays(new Date(), i)), wk = [5, 6].includes(new Date(d + 'T12:00').getDay()); ROOMS.forEach((rm) => { sold[rm.id + d] = Math.min(rm.units, Math.floor(rnd() * rm.units * (wk ? 1.1 : .75))); }); }
  return { sold, stays: [], pending: null, stayPrice: 0, stayName: 'Stay' };
});
const S = H.data;
products[0].price = S.stayPrice; products[0].name = S.stayName;
const Shop = ShopKit.init({ key: 'azure', products, img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Your stay', add: 'Add', checkout: 'Complete booking', orderVerb: 'Booking', item: 'item' },
  shipping: [{ id: 'none', label: 'Confirmation by email', note: 'Pay the balance at the hotel', price: 0, pickup: true }], deliveryLabel: 'Arrival details', noteLabel: 'arrival time or special requests',
  promos: { DIRECT5: { pct: 5 } }, promoHint: 'Booking direct? Use DIRECT5', returns: 'Best price guaranteed when you book direct', statuses: ['Confirmed', 'Confirmed', 'Confirmed', 'Completed'],
  onChange: (s) => sync(s) });
const $ = (id) => document.getElementById(id);

const today = new Date(); $('in').valueAsDate = Kit.addDays(today, 14); $('out').valueAsDate = Kit.addDays(today, 17); $('in').min = Kit.iso(today);
const nightsList = () => { const a = new Date($('in').value + 'T12:00'), b = new Date($('out').value + 'T12:00'), out = []; for (let d = new Date(a); d < b; d.setDate(d.getDate() + 1)) out.push(Kit.iso(d)); return out; };
const nightly = (rm, d) => Math.round(rm.base * ([5, 6].includes(new Date(d + 'T12:00').getDay()) ? 1.2 : 1) * (new Date(d).getMonth() === 11 ? 1.25 : 1));
const avail = (rm, nights) => Math.min(...nights.map((d) => rm.units - (S.sold[rm.id + d] || 0)));

function search(scroll) {
  const nights = nightsList(), guests = +$('ad').value + +$('ch').value;
  if (!nights.length) { $('nights').textContent = 'Check-out must be after check-in.'; $('results').innerHTML = ''; return; }
  if (nights.length > 21) { $('nights').textContent = 'For stays over 21 nights, please contact our reservations team.'; return; }
  $('nights').textContent = `${nights.length} night${nights.length > 1 ? 's' : ''} · ${guests} guest${guests > 1 ? 's' : ''} · ${new Date(nights[0] + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date($('out').value + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  $('results').innerHTML = ROOMS.map((rm) => {
    const left = avail(rm, nights), fits = guests <= rm.cap, total = nights.reduce((a, d) => a + nightly(rm, d), 0);
    return `<article class="room"><button data-room="${rm.id}" aria-label="See photos of ${rm.name}"><img src="${U(rm.img, 760, 600)}" alt="${rm.name}" loading="lazy">${left > 0 && left <= 2 && fits ? `<span class="left">Only ${left} left</span>` : ''}</button>
      <div class="room-body"><h3>${rm.name}</h3><div class="facts"><span>${rm.size} m²</span><span>${rm.bed}</span><span>${rm.view}</span><span>Sleeps ${rm.cap}</span></div>
      <div class="avail-strip">${nights.slice(0, 7).map((d) => `<span class="${[5, 6].includes(new Date(d + 'T12:00').getDay()) ? 'hi' : ''}">${new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' })} $${nightly(rm, d)}</span>`).join('')}${nights.length > 7 ? '<span>…</span>' : ''}</div>
      ${!fits ? `<p class="sold-out">Sleeps up to ${rm.cap} — choose a larger room or book two.</p>` : left <= 0 ? '<p class="sold-out">Sold out for these dates — try moving your dates by a day.</p>' : `<div class="rates">${RATES.map(([rid, l, note, m]) => { const p = Math.round(total * m + (rid === 'bb' ? 0 : 0)); return `<div class="rate"><span><b>${l}</b><small>${note}</small></span><span class="pr">${rid === 'nr' ? `<s>$${total.toLocaleString()}</s> ` : ''}<b>$${p.toLocaleString()}</b><small>$${Math.round(p / nights.length)} / night · taxes incl.</small></span><button class="btn" data-book="${rm.id}" data-rate="${rid}">Select</button></div>`; }).join('')}</div>`}</div></article>`;
  }).join('');
  if (scroll) $('rooms').scrollIntoView({ behavior: 'smooth' });
}
$('book').addEventListener('submit', (e) => { e.preventDefault(); search(true); });
['in', 'out'].forEach((id) => $(id).addEventListener('change', () => { if ($('out').value <= $('in').value) $('out').value = Kit.iso(Kit.addDays(new Date($('in').value + 'T12:00'), 1)); }));

$('results').addEventListener('click', (e) => {
  const ph = e.target.closest('[data-room]');
  if (ph) { const rm = ROOMS.find((r) => r.id === ph.dataset.room); Kit.modal({ title: rm.name, wide: true, body: `<div class="kit-row"><img src="${U(rm.img, 700, 500)}" alt="" style="width:100%;aspect-ratio:7/5;object-fit:cover"><img src="${U(rm.img2, 700, 500)}" alt="" style="width:100%;aspect-ratio:7/5;object-fit:cover"></div><p>${rm.size} m² · ${rm.bed} · ${rm.view} · sleeps ${rm.cap}</p><p>${rm.amen.join(' · ')} · air conditioning · minibar · robes &amp; slippers</p>` }); return; }
  const b = e.target.closest('[data-book]'); if (!b) return;
  const rm = ROOMS.find((r) => r.id === b.dataset.book), rate = RATES.find((r) => r[0] === b.dataset.rate), nights = nightsList();
  const total = Math.round(nights.reduce((a, d) => a + nightly(rm, d), 0) * rate[3]);
  const picked = new Set();
  Kit.modal({ title: 'Make it special', body: `<p>${rm.name} · ${rate[1]} · ${nights.length} nights · <b style="color:var(--kit-ink)">$${total.toLocaleString()}</b></p><div class="kit-field"><span class="kit-label">Add extras (optional)</span><div class="kit-seg" id="ex" style="flex-direction:column;align-items:stretch">${EXTRAS.map(([id, n, p]) => `<button type="button" data-x="${id}" aria-pressed="false" style="justify-content:space-between;display:flex;align-items:center">${n}<span>+$${p}</span></button>`).join('')}</div></div>`,
    onOpen: (d) => d.querySelector('#ex').addEventListener('click', (ev) => { const x = ev.target.closest('[data-x]'); if (!x) return; const on = x.getAttribute('aria-pressed') !== 'true'; x.setAttribute('aria-pressed', on); on ? picked.add(x.dataset.x) : picked.delete(x.dataset.x); }),
    actions: [{ label: 'Back' }, { label: 'Continue to guest details', primary: true, onClick: () => {
      S.stayPrice = total; S.stayName = `${rm.name} · ${nights.length} night${nights.length > 1 ? 's' : ''}`; products[0].price = total; products[0].name = S.stayName; products[0].img = rm.img;
      S.pending = { room: rm.id, rate: rate[0], nights, guests: +$('ad').value + +$('ch').value }; H.save();
      Shop.clear(); Shop.add('stay', { Dates: `${new Date(nights[0] + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date($('out').value + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, Rate: rate[1].split(' · ')[0], Guests: String(S.pending.guests) }, 1, true);
      picked.forEach((x) => Shop.add(x, {}, 1, true));
      setTimeout(() => Shop.checkout(), 50);
    } }] });
});

// A completed payment turns the pending selection into a confirmed stay
function sync(s) {
  const paid = s.data.orders.filter((o) => o.items.some((i) => i.id === 'stay'));
  if (S.pending && paid.length > S.stays.length) { const p = S.pending; p.nights.forEach((d) => { S.sold[p.room + d] = (S.sold[p.room + d] || 0) + 1; }); S.stays.push({ ...p, ref: paid[paid.length - 1].no, total: paid[paid.length - 1].total }); S.pending = null; H.save(); if ($('results').innerHTML) search(); }
  const box = $('mystays'), mine = S.stays.filter((x) => !x.cancelled);
  box.hidden = !mine.length;
  box.innerHTML = `<p class="kicker">My stays</p><ul>${mine.map((x) => { const rm = ROOMS.find((r) => r.id === x.room); return `<li><span><b>${rm.name}</b> · ${new Date(x.nights[0] + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · ${x.nights.length} nights · ref ${x.ref}</span><span>${x.rate === 'nr' ? '<small>Non-refundable</small>' : `<button data-cancel="${x.ref}">Cancel for free</button>`}</span></li>`; }).join('')}</ul>`;
}
$('mystays').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cancel]'); if (!b) return;
  const x = S.stays.find((y) => y.ref === b.dataset.cancel);
  if ((new Date(x.nights[0] + 'T14:00') - Date.now()) / 36e5 < 48) { Kit.toast('Free cancellation ended 48 hours before arrival — please call us', { type: 'error' }); return; }
  if (!(await Kit.confirm('Cancel this stay?', 'You\'ll get a full refund within 5 working days.', 'Cancel stay'))) return;
  x.cancelled = true; x.nights.forEach((d) => { S.sold[x.room + d]--; }); H.save(); sync(Shop); if ($('results').innerHTML) search(); Kit.toast('Stay cancelled — refund on its way');
});
$('nav-stays').addEventListener('click', () => { if (!S.stays.some((x) => !x.cancelled)) { Kit.toast('No stays booked yet'); return; } $('mystays').scrollIntoView({ behavior: 'smooth' }); });
search();
