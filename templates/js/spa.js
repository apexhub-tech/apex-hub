/* Serenity — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const SVC = [
  ['s1', 'Massage', 'Deep tissue massage', 'Releases tension in back, neck and shoulders.', 60, 85, '1741522509438-a120c0bb5e88'], ['s2', 'Massage', 'Hot stone massage', 'Warm basalt stones melt away stress.', 75, 110, '1600334089648-b0d9d3028eb2'],
  ['s3', 'Facials', 'Glow facial', 'Cleanse, exfoliate and hydrate with organic oils.', 45, 70, '1515377905703-c4788e51af15'], ['s4', 'Facials', 'Express facial', 'A quick lunchtime refresh.', 30, 45, '1515377905703-c4788e51af15'],
  ['s5', 'Rituals', 'Aroma ritual', 'Full-body ritual with warm towels and candles.', 90, 120, '1620733723572-11c53f73a416'], ['s6', 'Rituals', 'Hand & arm ritual', 'Scrub, massage and mask for hands and arms.', 30, 40, '1757689314932-bec6e9c39e51'],
].map(([id, cat, name, desc, mins, price, img]) => ({ id, cat, name, desc, mins, price, img }));
const STAFF = [['any', 'Any therapist', 'Most availability'], ['t1', 'Hala', 'Massage & rituals', '1594824476967-48c8b964273f'], ['t2', 'Maya', 'Facials', '1659353888906-adb3e0041693'], ['t3', 'Karim', 'Massage', '1622253692010-333f2da6031d']];
const OPEN = 10 * 60, CLOSE = 20 * 60;
const db = Kit.store('serenity', () => {
  // Pre-booked appointments per therapist (demo) as [date, startMin, endMin]
  const busy = { t1: [], t2: [], t3: [] }; let r = 8; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let d = 0; d < 14; d++) Object.keys(busy).forEach((t) => { for (let i = 0; i < 4; i++) if (rnd() < .6) { const s = OPEN + Math.floor(rnd() * 18) * 30; busy[t].push([Kit.iso(Kit.addDays(new Date(), d)), s, s + 60 + Math.floor(rnd() * 2) * 30]); } });
  return { busy, mine: [] };
});
const D = db.data;
const Shop = ShopKit.init({ key: 'serenity-gift', products: [{ id: 'gift', name: 'Serenity gift card', price: 0, img: '1620733723572-11c53f73a416', desc: 'Sent by email with your personal message.', options: [{ name: 'Value', values: [['$50', 50], ['$85 · Deep tissue massage', 85], ['$120 · Aroma ritual', 120], ['$200', 200]] }, { name: 'Design', values: ['Blush', 'Sage', 'Candlelight'], preselect: true }] }],
  img: (p, w, h) => U(p.img, w, h), labels: { cart: 'Gift cards', add: 'Add gift card' }, shipping: [{ id: 'email', label: 'Email delivery', note: 'Sent instantly', price: 0, pickup: true }], deliveryLabel: 'Delivery', noteLabel: 'recipient email & message', returns: 'Valid 12 months on any treatment', statuses: ['Sent', 'Sent', 'Sent', 'Redeemed'],
  onChange: (s) => { if (s.count()) setTimeout(() => { if (!document.querySelector('dialog[open]') && !document.querySelector('.sk-drawer.open')) s.open('cart'); }, 60); } });
const $ = (id) => document.getElementById(id);
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

let step = 0, cat = 'All', B = { svc: [], staff: 'any', date: Kit.iso(new Date()), time: null, name: '', phone: '', email: '', notes: '' };
const mins = () => B.svc.reduce((a, id) => a + SVC.find((s) => s.id === id).mins, 0);
const price = () => B.svc.reduce((a, id) => a + SVC.find((s) => s.id === id).price, 0);
const canDo = (t, ids) => t === 'any' || ids.every((id) => (t === 't2') === (SVC.find((s) => s.id === id).cat === 'Facials') || (t === 't1' && SVC.find((s) => s.id === id).cat !== 'Facials'));
const free = (t, date, start, len) => !D.busy[t].some(([d, s, e]) => d === date && start < e && start + len > s) && !D.mine.some((m) => !m.cancelled && m.staff === t && m.date === date && start < m.start + m.len && start + len > m.start);
function slots(date) {
  const len = mins(), out = [], nowMin = date === Kit.iso(new Date()) ? new Date().getHours() * 60 + new Date().getMinutes() + 30 : 0;
  const team = B.staff === 'any' ? ['t1', 't2', 't3'].filter((t) => canDo(t, B.svc)) : [B.staff];
  for (let s = OPEN; s + len <= CLOSE; s += 30) { if (s < nowMin) continue; const who = team.find((t) => free(t, date, s, len)); if (who) out.push([s, who]); }
  return out;
}
function render() {
  $('steps').innerHTML = ['Treatments', 'Therapist', 'Time', 'Details'].map((s, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}">${i < step ? '✓ ' : ''}${s}</span>`).join('');
  const st = $('stage');
  if (step === 0) {
    st.innerHTML = `<div class="cats" role="group" aria-label="Category">${['All', 'Massage', 'Facials', 'Rituals'].map((c) => `<button class="cat" aria-pressed="${c === cat}" data-c="${c}">${c}</button>`).join('')}</div>
      ${SVC.filter((s) => cat === 'All' || s.cat === cat).map((s) => `<button class="svc" data-s="${s.id}" aria-pressed="${B.svc.includes(s.id)}"><img src="${U(s.img, 144, 144)}" alt=""><span><h3>${s.name}</h3><small>${s.desc}</small></span><span class="pr">$${s.price}<small>${s.mins} min</small><span class="tick">✓</span></span></button>`).join('')}`;
  } else if (step === 1) {
    st.innerHTML = `<h3 style="font-size:24px;margin-bottom:12px">Who would you like?</h3><div class="staff">${STAFF.map(([id, n, r, img]) => { const ok = canDo(id, B.svc); return `<button data-t="${id}" aria-pressed="${B.staff === id}" ${ok ? '' : 'disabled style="opacity:.4"'}>${img ? `<img src="${U(img, 112, 112)}" alt="">` : '<span class="any">✦</span>'}<b>${n}</b><small>${ok ? r : 'Not for these treatments'}</small></button>`; }).join('')}</div>`;
  } else if (step === 2) {
    if (!['t1', 't2', 't3'].some((t) => canDo(t, B.svc))) { st.innerHTML = '<h3 style="font-size:24px">Two therapists needed</h3><p class="empty" style="margin-top:8px">Facials and massages are done by different therapists. Please book them as two separate visits — go back and choose one type.</p>'; renderSummary(); $('next').disabled = true; return; }
    const days = Array.from({ length: 14 }, (_, i) => Kit.iso(Kit.addDays(new Date(), i)));
    if (!slots(B.date).length) B.date = days.find((d) => slots(d).length) || days[0];
    const sl = slots(B.date);
    st.innerHTML = `<h3 style="font-size:24px">Pick a time · ${mins()} min</h3><div class="dates" role="group" aria-label="Date">${days.map((d) => { const n = slots(d).length, dt = new Date(d + 'T12:00'); return `<button class="date" data-d="${d}" aria-pressed="${d === B.date}" ${n ? '' : 'disabled'}><span>${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${dt.getDate()}</b><span>${n ? n + ' free' : 'full'}</span></button>`; }).join('')}</div>
      <div class="slots" role="group" aria-label="Time">${sl.map(([s, who]) => `<button class="slot" data-time="${s}" data-who="${who}" aria-pressed="${B.time === s}">${fmt(s)}</button>`).join('') || '<p class="empty">No free times this day.</p>'}</div>`;
  } else {
    st.innerHTML = `<h3 style="font-size:24px;margin-bottom:12px">Your details</h3><div class="f"><label for="b-name">Full name</label><input id="b-name" autocomplete="name" value="${Kit.esc(B.name)}"><span class="err"></span></div><div class="f"><label for="b-phone">Mobile</label><input id="b-phone" type="tel" autocomplete="tel" value="${Kit.esc(B.phone)}"><span class="err"></span></div><div class="f"><label for="b-email">Email</label><input id="b-email" type="email" autocomplete="email" value="${Kit.esc(B.email)}"><span class="err"></span></div><div class="f"><label for="b-notes">Anything we should know? (optional)</label><textarea id="b-notes" placeholder="Pregnancy, allergies, pressure preference…">${Kit.esc(B.notes)}</textarea></div>`;
    st.querySelectorAll('input, textarea').forEach((i) => i.addEventListener('input', () => { B[i.id.slice(2)] = i.value; }));
  }
  renderSummary();
}
function renderSummary() {
  const list = B.svc.map((id) => SVC.find((s) => s.id === id)), who = STAFF.find((s) => s[0] === (B.who || B.staff));
  const ready = [B.svc.length, true, B.time != null, true][step];
  $('summary').innerHTML = `<h3>Your visit</h3><ul>${list.map((s) => `<li><span>${s.name} · ${s.mins} min</span><b>$${s.price}</b></li>`).join('') || '<li class="empty">Choose at least one treatment.</li>'}</ul>
    <div class="meta">${list.length ? `<span>⏱ ${mins()} min in total</span>` : ''}${step > 0 ? `<span>👤 ${who[1]}</span>` : ''}${B.time != null ? `<span>📅 ${new Date(B.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} at ${fmt(B.time)}</span>` : ''}</div>
    <div class="tot"><span>Total · pay at the spa</span><span>$${price()}</span></div>
    <div class="nav">${step ? '<button class="btn soft" id="back">Back</button>' : ''}<button class="btn" id="next" ${ready ? '' : 'disabled'}>${step === 3 ? 'Confirm booking' : 'Continue'}</button></div>
    <div class="mine" id="mine">${D.mine.filter((m) => !m.cancelled && m.date >= Kit.iso(new Date())).map((m) => `<div><b>Booked · ${m.ref}</b><br>${new Date(m.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${fmt(m.start)} · ${m.names}<br><button data-ics="${m.ref}">Add to calendar</button><button data-cancel="${m.ref}">Cancel</button></div>`).join('')}</div>`;
}
$('stage').addEventListener('click', (e) => {
  const c = e.target.closest('[data-c]'); if (c) { cat = c.dataset.c; render(); return; }
  const s = e.target.closest('[data-s]'); if (s) { const id = s.dataset.s; B.svc = B.svc.includes(id) ? B.svc.filter((x) => x !== id) : [...B.svc, id]; B.time = null; if (!canDo(B.staff, B.svc)) B.staff = 'any'; render(); return; }
  const t = e.target.closest('[data-t]'); if (t && !t.disabled) { B.staff = t.dataset.t; B.time = null; render(); return; }
  const d = e.target.closest('[data-d]'); if (d && !d.disabled) { B.date = d.dataset.d; B.time = null; render(); return; }
  const tm = e.target.closest('[data-time]'); if (tm) { B.time = +tm.dataset.time; B.who = tm.dataset.who; render(); }
});
$('summary').addEventListener('click', async (e) => {
  if (e.target.closest('#back')) { step--; render(); return; }
  if (e.target.closest('#next')) {
    if (step < 3) { step++; render(); return; }
    const rules = { name: [(v) => v.trim().length > 1, 'Please enter your full name.'], phone: [(v) => /^\+?[\d\s()-]{7,}$/.test(v), 'Please enter a mobile number so we can text a reminder.'], email: [(v) => /^\S+@\S+\.\S+$/.test(v), 'Please enter an email like name@example.com.'] };
    let ok = true; Object.entries(rules).forEach(([k, [f, msg]]) => { const el = $('b-' + k), bad = !f(el.value); el.nextElementSibling.textContent = bad ? msg : ''; if (bad && ok) { el.focus(); ok = false; } });
    if (!ok) return;
    if (!free(B.who, B.date, B.time, mins())) { Kit.toast('Sorry — that time was just taken. Please pick another.', { type: 'error' }); step = 2; B.time = null; render(); return; }
    const m = { ref: 'SR-' + Math.random().toString(36).slice(2, 6).toUpperCase(), date: B.date, start: B.time, len: mins(), staff: B.who, names: B.svc.map((id) => SVC.find((s) => s.id === id).name).join(' + '), total: price() };
    D.mine.push(m); db.save();
    Kit.modal({ title: 'You\'re booked 🌿', body: `<p style="color:var(--kit-ink)"><b>${m.names}</b><br>${new Date(m.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${fmt(m.start)} with ${STAFF.find((s) => s[0] === m.staff)[1]}</p><p>Reference ${m.ref}. Please arrive 10 minutes early. We'll text you a reminder the day before. Free cancellation up to 24 hours before.</p>`,
      actions: [{ label: 'Add to calendar', onClick: () => { Kit.ics(`serenity-${m.ref}.ics`, { title: `Serenity Spa · ${m.names}`, start: new Date(`${m.date}T${fmt(m.start)}`), minutes: m.len, location: 'Serenity Spa' }); return false; } }, { label: 'Done', primary: true }] });
    step = 0; B = { svc: [], staff: 'any', date: Kit.iso(new Date()), time: null, name: B.name, phone: B.phone, email: B.email, notes: '' }; render(); return;
  }
  const ic = e.target.closest('[data-ics]'); if (ic) { const m = D.mine.find((x) => x.ref === ic.dataset.ics); Kit.ics('serenity.ics', { title: `Serenity Spa · ${m.names}`, start: new Date(`${m.date}T${fmt(m.start)}`), minutes: m.len, location: 'Serenity Spa' }); return; }
  const cn = e.target.closest('[data-cancel]'); if (cn) { const m = D.mine.find((x) => x.ref === cn.dataset.cancel); if ((new Date(`${m.date}T${fmt(m.start)}`) - Date.now()) / 36e5 < 24) { Kit.toast('Cancellations within 24 hours — please call us', { type: 'error' }); return; } if (!(await Kit.confirm('Cancel this booking?', 'Your time will be released.', 'Cancel booking'))) return; m.cancelled = true; db.save(); render(); Kit.toast('Booking cancelled'); }
});
$('gift-btn').addEventListener('click', () => Shop.quickView('gift'));
render();
