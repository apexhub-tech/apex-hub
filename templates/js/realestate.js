/* Keystone Homes — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const AREAS = { 'West Hills': [120, 140, 3200], 'City Centre': [300, 260, 4100], 'Marina': [470, 180, 4800], 'Business District': [360, 380, 3900], 'Green Valley': [140, 420, 2600], 'Old Town': [240, 330, 2900] };
const AGENTS = [['Sara Haddad', '1594824476967-48c8b964273f'], ['Omar Nasser', '1612349317150-e413f6a5b16d'], ['Lina Farouk', '1659353888906-adb3e0041693']];
const HOMES = [
  { id: 'h1', t: 'Villa', d: 'sale', title: 'Modern villa with pool', loc: 'West Hills', price: 420000, beds: 4, baths: 3, area: 320, img: '1613977257363-707ba9348227', img2: '1706808849780-7a04fbac83ef', img3: '1757524503555-b62633f47670', days: 2, year: 2019, parking: 2 },
  { id: 'h2', t: 'Apartment', d: 'rent', title: 'Bright 2-bed, fully furnished', loc: 'City Centre', price: 1150, beds: 2, baths: 1, area: 95, img: '1522708323590-d24dbb6b0267', img2: '1560448204-e02f11c3d0e2', img3: '1484154218962-a197022b5858', days: 5, year: 2015, parking: 1 },
  { id: 'h3', t: 'Apartment', d: 'sale', title: 'Penthouse with fireplace', loc: 'Marina', price: 365000, beds: 3, baths: 2, area: 180, img: '1757524503555-b62633f47670', img2: '1759691555393-60cd5355d840', img3: '1774311237295-a65a4c1ff38a', days: 1, year: 2021, parking: 2 },
  { id: 'h4', t: 'Office', d: 'rent', title: 'Sunlit studio office', loc: 'Business District', price: 2400, beds: 0, baths: 2, area: 210, img: '1613575831056-0acd5da8f085', img2: '1493809842364-78817add7ffb', img3: '1497366754035-f200968a6e72', days: 12, year: 2012, parking: 4 },
  { id: 'h5', t: 'Villa', d: 'rent', title: 'Family villa near schools', loc: 'Green Valley', price: 2900, beds: 5, baths: 4, area: 410, img: '1580587771525-78b9dba3b914', img2: '1706808849777-96e0d7be3bb7', img3: '1586023492125-27b2c045efd7', days: 8, year: 2010, parking: 3 },
  { id: 'h6', t: 'Apartment', d: 'sale', title: 'Cosy studio apartment', loc: 'Old Town', price: 89000, beds: 1, baths: 1, area: 48, img: '1502672260266-1c1ef2d93688', img2: '1586023492125-27b2c045efd7', img3: '1484154218962-a197022b5858', days: 20, year: 1998, parking: 0 },
  { id: 'h7', t: 'Villa', d: 'sale', title: 'Glass house at dusk', loc: 'West Hills', price: 980000, beds: 5, baths: 5, area: 520, img: '1757524492552-d47a66a2b63e', img2: '1748063578185-3d68121b11ff', img3: '1774311237295-a65a4c1ff38a', days: 3, year: 2023, parking: 3 },
  { id: 'h8', t: 'Apartment', d: 'rent', title: 'Garden-view 3-bed', loc: 'Marina', price: 2100, beds: 3, baths: 2, area: 140, img: '1759691555393-60cd5355d840', img2: '1560448204-e02f11c3d0e2', img3: '1757524503555-b62633f47670', days: 6, year: 2018, parking: 1 },
].map((h, i) => ({ ...h, agent: AGENTS[i % 3], xy: [AREAS[h.loc][0] + (i % 3) * 22 - 20, AREAS[h.loc][1] + (i % 2) * 26 - 12] }));
const db = Kit.store('keystone', () => ({ saved: [], alerts: [], viewings: [] }));
const S = db.data, save = () => db.save();
const $ = (id) => document.getElementById(id);
const money = (h) => h.d === 'rent' ? `$${h.price.toLocaleString()}<small>/mo</small>` : `$${h.price.toLocaleString()}`;
const short = (h) => h.d === 'rent' ? `$${(h.price / 1000).toFixed(1)}k` : `$${h.price >= 1e6 ? (h.price / 1e6).toFixed(1) + 'M' : Math.round(h.price / 1000) + 'k'}`;
let deal = 'all', view = 'list', savedOnly = false; const cmp = [];
$('areas').innerHTML = Object.keys(AREAS).map((a) => `<option value="${a}">`).join('');
$('v-a').innerHTML = Object.keys(AREAS).map((a) => `<option>${a}</option>`).join('');

function results() {
  const q = $('s-q').value.trim().toLowerCase(), type = $('s-type').value, beds = +$('s-beds').value, max = +$('s-max').value, sort = $('sort').value;
  let list = HOMES.filter((h) => (!savedOnly || S.saved.includes(h.id)) && (deal === 'all' || h.d === deal) && (!q || (h.loc + ' ' + h.title).toLowerCase().includes(q)) && (type === 'all' || h.t === type) && h.beds >= beds && (!max || (max < 10000 ? h.d === 'rent' && h.price <= max : h.d === 'sale' && h.price <= max)));
  list.sort(sort === 'low' ? (a, b) => a.price - b.price : sort === 'high' ? (a, b) => b.price - a.price : sort === 'size' ? (a, b) => b.area - a.area : (a, b) => a.days - b.days);
  return list;
}
function render() {
  const list = results();
  $('count').textContent = savedOnly ? `Saved homes (${list.length})` : `${list.length} ${list.length === 1 ? 'home' : 'homes'} ${deal === 'rent' ? 'for rent' : deal === 'sale' ? 'for sale' : 'found'}`;
  $('saved-btn').textContent = `♡ Saved (${S.saved.length})`;
  $('list').innerHTML = list.map((h) => `<article class="home" data-id="${h.id}"><button class="pic" data-open="${h.id}" aria-label="Open ${h.title}"><span class="type ${h.days <= 3 ? 'new' : ''}">${h.days <= 3 ? 'New' : h.d === 'rent' ? 'For rent' : 'For sale'}</span><img src="${U(h.img, 700, 440)}" alt="${h.title} in ${h.loc}" loading="lazy"></button>
    <button class="sk-heart" data-save="${h.id}" aria-pressed="${S.saved.includes(h.id)}" aria-label="Save ${h.title}">${S.saved.includes(h.id) ? '♥' : '♡'}</button>
    <div class="hbody"><div class="price">${money(h)}</div><h3>${h.title}</h3><div class="loc">📍 ${h.loc} · listed ${h.days === 1 ? 'yesterday' : h.days + ' days ago'}</div>
    <div class="specs">${h.beds ? `<span>🛏 ${h.beds} beds</span>` : '<span>🏢 Office</span>'}<span>🛁 ${h.baths} baths</span><span>📐 ${h.area} m²</span></div>
    <label class="cmp"><input type="checkbox" data-cmp="${h.id}" ${cmp.includes(h.id) ? 'checked' : ''}> Compare</label></div></article>`).join('') || `<div class="empty">${savedOnly ? 'No saved homes yet — tap ♡ on any listing.' : 'No homes match. Try a wider area or higher budget.'}</div>`;
  $('layout').classList.toggle('map-on', view === 'map'); $('map').hidden = view !== 'map';
  if (view === 'map') drawMap(list);
  $('cmp-go').hidden = cmp.length < 2; $('cmp-go').textContent = `Compare (${cmp.length})`;
}
function drawMap(list) {
  $('map').innerHTML = `<svg viewBox="0 0 600 520" role="img" aria-label="Map of results">
    <rect width="600" height="520" fill="#E8EEF3"/><path d="M420 0 C 460 120, 540 160, 600 170 L600 0Z" fill="#B9D7EA"/><path d="M0 470 C 140 440, 300 500, 600 460 L600 520 L0 520Z" fill="#CFE5C9"/>
    <path d="M0 260 L600 300 M300 0 L280 520 M60 80 L560 420" stroke="#fff" stroke-width="10" fill="none"/>
    ${Object.entries(AREAS).map(([n, [x, y]]) => `<text x="${x}" y="${y - 36}" text-anchor="middle" font-size="12" font-weight="700" fill="#5E6A80" font-family="Manrope">${n}</text>`).join('')}
    ${list.map((h) => `<g class="pin" data-pin="${h.id}" transform="translate(${h.xy[0]} ${h.xy[1]})" tabindex="0" role="button" aria-label="${h.title}, ${short(h)}"><rect x="-30" y="-14" width="60" height="28" rx="14"/><text text-anchor="middle" y="5">${short(h)}</text></g>`).join('')}</svg>`;
}
const hl = (id) => { document.querySelectorAll('.home, .pin').forEach((x) => x.classList.toggle('hl', (x.dataset.id || x.dataset.pin) === id)); };
$('map').addEventListener('mouseover', (e) => { const p = e.target.closest('[data-pin]'); if (p) hl(p.dataset.pin); });
$('map').addEventListener('click', (e) => { const p = e.target.closest('[data-pin]'); if (p) openHome(p.dataset.pin); });
$('map').addEventListener('keydown', (e) => { const p = e.target.closest('[data-pin]'); if (p && e.key === 'Enter') openHome(p.dataset.pin); });
$('list').addEventListener('mouseover', (e) => { const h = e.target.closest('.home'); if (h && view === 'map') hl(h.dataset.id); });
$('list').addEventListener('click', (e) => {
  const s = e.target.closest('[data-save]'); if (s) { toggleSave(s.dataset.save); return; }
  const o = e.target.closest('[data-open]'); if (o) openHome(o.dataset.open);
});
$('list').addEventListener('change', (e) => { const c = e.target.closest('[data-cmp]'); if (!c) return; if (c.checked) { if (cmp.length >= 3) { c.checked = false; Kit.toast('Compare up to 3 homes'); return; } cmp.push(c.dataset.cmp); } else cmp.splice(cmp.indexOf(c.dataset.cmp), 1); render(); });
function toggleSave(id) { const on = !S.saved.includes(id); S.saved = on ? [...S.saved, id] : S.saved.filter((x) => x !== id); save(); render(); Kit.toast(on ? 'Saved — we\'ll tell you if the price drops' : 'Removed from saved homes'); }
$('search').addEventListener('submit', (e) => { e.preventDefault(); savedOnly = false; render(); });
['s-type', 's-beds', 's-max', 'sort'].forEach((id) => $(id).addEventListener('change', render));
$('deal').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (!b) return; deal = b.dataset.d; document.querySelectorAll('#deal button').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); });
document.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; view = b.dataset.v; document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); });
$('saved-btn').addEventListener('click', () => { savedOnly = !savedOnly; render(); $('count').scrollIntoView({ behavior: 'smooth' }); });

function monthly(price, depPct, rate, years) { const p = price * (1 - depPct / 100), r = rate / 1200, n = years * 12; return r ? p * r / (1 - Math.pow(1 + r, -n)) : p / n; }
function openHome(id) {
  const h = HOMES.find((x) => x.id === id), est = h.d === 'sale' ? monthly(h.price, 20, 5.5, 25) : 0;
  Kit.modal({ title: h.title, wide: true, body: `<div class="gal"><img src="${U(h.img, 900, 600)}" alt="${h.title}"><div><img src="${U(h.img2, 450, 340)}" alt=""><img src="${U(h.img3, 450, 340)}" alt=""></div></div>
    <p style="color:var(--kit-ink);font-size:26px;font-weight:800">${money(h)} ${est ? `<small style="font-size:14px;color:var(--muted);font-weight:500">· est. $${Math.round(est).toLocaleString()}/mo with 20% down</small>` : ''}</p><p>📍 ${h.loc} · listed ${h.days} days ago · ${h.d === 'rent' ? 'Available now · 12-month lease' : 'Freehold'}</p>
    <div class="facts"><div><span>Bedrooms</span><b>${h.beds || '—'}</b></div><div><span>Bathrooms</span><b>${h.baths}</b></div><div><span>Size</span><b>${h.area} m²</b></div><div><span>Built</span><b>${h.year}</b></div><div><span>Parking</span><b>${h.parking}</b></div><div><span>Price / m²</span><b>$${h.d === 'sale' ? Math.round(h.price / h.area).toLocaleString() : (h.price / h.area).toFixed(1)}</b></div><div><span>Area avg / m²</span><b>$${AREAS[h.loc][2].toLocaleString()}</b></div><div><span>Views</span><b>${120 + h.days * 37}</b></div></div>
    <p>A ${h.t.toLowerCase()} in ${h.loc} with ${h.beds ? h.beds + ' bedrooms, ' : ''}${h.baths} bathrooms and ${h.area} m² of space. Close to schools, shops and transport. Viewings available 7 days a week.</p>
    <div class="agent"><img src="${U(h.agent[1], 104, 104)}" alt=""><span><b style="color:var(--kit-ink)">${h.agent[0]}</b><br><span class="kit-hint">Keystone agent · replies in ~1 hour</span></span></div>`,
    actions: [{ label: S.saved.includes(id) ? '♥ Saved' : '♡ Save', onClick: () => { toggleSave(id); } }, { label: 'Message agent', onClick: () => { setTimeout(() => contact(h)); } }, { label: 'Book a viewing', primary: true, onClick: () => { setTimeout(() => viewing(h)); } }] });
}
function viewing(h) {
  const days = Array.from({ length: 6 }, (_, i) => Kit.addDays(new Date(), i + 1)); let day = 0, time = null;
  const taken = (d, t) => S.viewings.some((v) => v.id === h.id && v.date === Kit.iso(days[d]) && v.time === t) || ((d * 7 + t.length + h.days) % 5 === 0);
  Kit.modal({ title: `View ${h.title}`, body: `<div class="kit-field"><span class="kit-label">Day</span><div class="kit-seg" id="vd">${days.map((d, i) => `<button type="button" data-d="${i}" aria-pressed="${i === 0}">${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div></div><div class="kit-field"><span class="kit-label">Time</span><div class="kit-seg" id="vt"></div></div>
    <div class="kit-row"><div class="kit-field"><label for="v-n">Name</label><input id="v-n" required autocomplete="name"></div><div class="kit-field"><label for="v-p">Mobile</label><input id="v-p" type="tel" required autocomplete="tel"></div></div><div class="kit-seg" id="vk"><button type="button" aria-pressed="true">In person</button><button type="button" aria-pressed="false">Video tour</button></div>`,
    onOpen: (m) => {
      const drawT = () => { m.querySelector('#vt').innerHTML = ['10:00', '11:30', '13:00', '15:30', '17:00', '18:30'].map((t) => `<button type="button" data-t="${t}" aria-pressed="${t === time}" ${taken(day, t) ? 'disabled' : ''}>${t}</button>`).join(''); };
      m.querySelector('#vd').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; day = +b.dataset.d; time = null; m.querySelectorAll('#vd button').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawT(); };
      m.querySelector('#vt').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b || b.disabled) return; time = b.dataset.t; drawT(); };
      m.querySelector('#vk').onclick = (e) => { const b = e.target.closest('button'); if (b) m.querySelectorAll('#vk button').forEach((x) => x.setAttribute('aria-pressed', x === b)); };
      drawT();
    },
    actions: [{ label: 'Cancel' }, { label: 'Request viewing', primary: true, submit: true, onClick: (m) => {
      if (!time) { Kit.toast('Pick a time first', { type: 'error' }); return false; }
      const v = { id: h.id, date: Kit.iso(days[day]), time, kind: m.querySelector('#vk [aria-pressed=true]').textContent }; S.viewings.push(v); save();
      Kit.toast(`${v.kind} booked for ${days[day].toLocaleDateString('en-GB', { weekday: 'long' })} at ${time} — ${h.agent[0]} will confirm by SMS`, { type: 'success', ms: 6000 });
    } }] });
}
function contact(h) {
  Kit.modal({ title: `Message ${h.agent[0]}`, body: `<div class="kit-row"><div class="kit-field"><label for="c-n">Name</label><input id="c-n" required autocomplete="name"></div><div class="kit-field"><label for="c-e">Email</label><input id="c-e" type="email" required autocomplete="email"></div></div><div class="kit-field"><label for="c-m">Message</label><textarea id="c-m">Hi ${h.agent[0].split(' ')[0]}, I'm interested in "${h.title}". Is it still available?</textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send message', primary: true, submit: true, onClick: () => { Kit.toast('Message sent — agents usually reply within an hour', { type: 'success' }); } }] });
}
$('cmp-go').addEventListener('click', () => {
  const items = cmp.map((id) => HOMES.find((h) => h.id === id)), row = (l, f) => `<tr><th>${l}</th>${items.map((h) => `<td>${f(h)}</td>`).join('')}</tr>`;
  Kit.modal({ title: 'Compare homes', wide: true, body: `<div style="overflow-x:auto"><table class="ctable"><tr><th></th>${items.map((h) => `<td><img src="${U(h.img, 360, 225)}" alt=""><br><b>${h.title}</b></td>`).join('')}</tr>${row('Price', money)}${row('Area', (h) => h.loc)}${row('Bedrooms', (h) => h.beds || '—')}${row('Bathrooms', (h) => h.baths)}${row('Size', (h) => h.area + ' m²')}${row('Built', (h) => h.year)}${row('Parking', (h) => h.parking)}</table></div>` });
});
$('alert').addEventListener('click', () => Kit.modal({ title: 'Save this search', body: `<p>${$('count').textContent}${$('s-q').value ? ' in ' + Kit.esc($('s-q').value) : ''}</p><div class="kit-field"><label for="a-e">Email me at</label><input id="a-e" type="email" required autocomplete="email"></div><div class="kit-seg" id="af"><button type="button" aria-pressed="true">Instantly</button><button type="button" aria-pressed="false">Daily</button><button type="button" aria-pressed="false">Weekly</button></div>`,
  onOpen: (m) => m.querySelector('#af').onclick = (e) => { const b = e.target.closest('button'); if (b) m.querySelectorAll('#af button').forEach((x) => x.setAttribute('aria-pressed', x === b)); },
  actions: [{ label: 'Cancel' }, { label: 'Create alert', primary: true, submit: true, onClick: (m) => { S.alerts.push({ q: $('s-q').value, deal, at: Date.now() }); save(); Kit.toast(`Alert saved — ${m.querySelector('#af [aria-pressed=true]').textContent.toLowerCase()} emails`, { type: 'success' }); } }] }));
$('list-btn').addEventListener('click', () => $('v-book').click());

function mc() { const m = monthly(+$('mc-p').value, +$('mc-d').value, +$('mc-r').value, +$('mc-t').value); $('mc-out').innerHTML = `<b>$${Math.round(m).toLocaleString()}/mo</b>Loan $${Math.round(+$('mc-p').value * (1 - $('mc-d').value / 100)).toLocaleString()} · total interest $${Math.round(m * $('mc-t').value * 12 - +$('mc-p').value * (1 - $('mc-d').value / 100)).toLocaleString()}`; }
['mc-p', 'mc-d', 'mc-r', 'mc-t'].forEach((id) => $(id).addEventListener('input', mc));
function val() { const v = AREAS[$('v-a').value][2] * +$('v-s').value; $('v-out').innerHTML = `<b style="color:var(--navy)">$${Math.round(v * .93 / 1000)}k – $${Math.round(v * 1.07 / 1000)}k</b>Based on ${$('v-a').value} sales in the last 12 months`; }
['v-a', 'v-s'].forEach((id) => $(id).addEventListener('input', val));
$('v-book').addEventListener('click', () => Kit.modal({ title: 'Book a free valuation', body: `<div class="kit-row"><div class="kit-field"><label for="vb-n">Name</label><input id="vb-n" required autocomplete="name"></div><div class="kit-field"><label for="vb-p">Mobile</label><input id="vb-p" type="tel" required autocomplete="tel"></div></div><div class="kit-field"><label for="vb-a">Property address</label><input id="vb-a" required autocomplete="street-address"></div>`,
  actions: [{ label: 'Cancel' }, { label: 'Book valuation', primary: true, submit: true, onClick: () => { Kit.toast('Thanks! A local agent will call you today to arrange a visit.', { type: 'success' }); } }] }));
render(); mc(); val();
