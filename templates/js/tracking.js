/* Parcelo — behaviour */
const DAY = 864e5, H = 36e5;
const FLOW = [['label_created', 'Label created'], ['picked_up', 'Picked up'], ['in_transit', 'In transit'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']];
const LABEL = Object.fromEntries([...FLOW, ['exception', 'Delivery problem']]);
const CARRIERS = { PCL: 'Parcelo Express', DHL: 'DHL', ARX: 'Aramex' };
const PLACES = ['Nordhem warehouse', 'Central sorting hub', 'Regional depot', 'Local delivery van', 'Your address'];
function seed() {
  const now = Date.now(), names = ['Lina Haddad', 'Karim Aziz', 'Maya Khoury', 'Jad Saleh', 'Rana Issa', 'Tarek Mansour', 'Hala Youssef', 'Nadim Rizk', 'Dana Karam', 'Ziad Haddad', 'Mira Saab', 'Elie Haddad'];
  const cities = ['City Centre', 'Old Town', 'Marina', 'Green Valley', 'West Hills', 'Business District'];
  let r = 4; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const ships = names.map((name, i) => {
    const pre = ['PCL', 'PCL', 'DHL', 'ARX'][i % 4], code = `${pre}-${2040 + i * 3}-${String(10 + Math.floor(rnd() * 89))}`;
    const created = now - (1 + Math.floor(rnd() * 5)) * DAY - Math.floor(rnd() * 10) * H, stage = i === 0 ? 3 : i === 5 ? -1 : [3, 7, 9, 10].includes(i) ? 4 : Math.floor(rnd() * 4);
    const events = []; const steps = stage === -1 ? 2 : stage;
    for (let s = 0; s <= steps; s++) events.push({ ts: created + s * (8 + rnd() * 10) * H, st: FLOW[s][0], place: PLACES[s], note: '' });
    if (stage === -1) events.push({ ts: created + 40 * H, st: 'exception', place: 'Local delivery van', note: 'Customer not home — no safe place' });
    events.forEach((e) => { if (e.ts > now) e.ts = now - rnd() * 3 * H; });
    return { id: Kit.uid(), code, order: '#' + (1040 + i), customer: name, city: cities[i % cities.length], carrier: CARRIERS[pre], created, events: events.sort((a, b) => b.ts - a.ts), eta: created + 4 * DAY, pref: 'door', alerts: true };
  });
  ships[0].code = 'PCL-2048-77'; ships[0].eta = now + 3 * H;
  const notify = [['picked_up', true, false, 'Hi {name}, your {store} order is on its way! Track it: parcelo.app/{tracking}'], ['out_for_delivery', true, true, '{name}, your parcel arrives today between {eta}. Not home? Change it in one tap.'], ['delivered', true, true, 'Delivered! Your {store} parcel {tracking} was left at your door.'], ['exception', true, true, 'We couldn\'t deliver {tracking}. Pick a new day: parcelo.app/{tracking}']]
    .map(([st, email, sms, msg]) => ({ st, email, sms, msg }));
  return { ships, notify };
}
const db = Kit.store('parcelo', seed), S = db.data, save = () => db.save();
const statusOf = (s) => s.events[0].st;
const stepOf = (s) => { const st = statusOf(s); return st === 'exception' ? FLOW.findIndex((f) => f[0] === s.events[1]?.st) : FLOW.findIndex((f) => f[0] === st); };
const etaText = (s) => statusOf(s) === 'delivered' ? 'Delivered ' + Kit.day(s.events[0].ts) : statusOf(s) === 'exception' ? 'Waiting for you' : new Date(s.eta).toDateString() === new Date().toDateString() ? 'Today 14:00–16:00' : new Date(s.eta).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const find = (code) => S.ships.find((s) => s.code === code.trim().toUpperCase());

/* ---------- Customer tracking ---------- */
document.getElementById('hints').innerHTML = 'Try: ' + [S.ships[0], S.ships.find((s) => statusOf(s) === 'exception'), S.ships.find((s) => statusOf(s) === 'delivered')].filter(Boolean).map((s) => `<button type="button" data-try="${s.code}">${s.code}</button>`).join('');
document.getElementById('hints').addEventListener('click', (e) => { const b = e.target.closest('[data-try]'); if (b) { document.getElementById('code').value = b.dataset.try; show(); } });
document.getElementById('track').addEventListener('submit', (e) => { e.preventDefault(); show(); });
function show() {
  const v = document.getElementById('code').value.trim().toUpperCase(), err = document.getElementById('err'), out = document.getElementById('result');
  if (!/^(PCL|DHL|ARX)-\d{4}-\d{2}$/.test(v)) { err.textContent = 'That number doesn\'t look right — it should look like PCL-2048-77.'; out.innerHTML = ''; return; }
  const s = find(v);
  if (!s) { err.textContent = `We can't find ${v} yet. New labels can take up to 2 hours to appear.`; out.innerHTML = ''; return; }
  err.textContent = ''; renderResult(s);
}
function renderResult(s) {
  const st = statusOf(s), step = stepOf(s), out = document.getElementById('result');
  const prog = st === 'delivered' ? 1 : Math.min(.95, (step + (st === 'exception' ? .5 : .5)) / 4);
  out.innerHTML = `<div class="result box">
    <div class="res-head"><div><h2>${s.code}</h2><p>${s.carrier} · Nordhem Store order ${s.order} → ${Kit.esc(s.customer)}, ${s.city}</p></div><div style="text-align:right"><span class="tag t-${st}">${LABEL[st]}</span><p class="eta" style="margin-top:8px">${etaText(s)}</p></div></div>
    <div class="route"><svg viewBox="0 0 600 190" role="img" aria-label="Route from warehouse to your address, ${Math.round(prog * 100)}% complete">
      <path id="rp" d="M40 150 C 160 20, 260 190, 360 80 S 520 40, 560 60" fill="none" stroke="#000" stroke-width="4" stroke-dasharray="10 8"/>
      <circle cx="40" cy="150" r="12" fill="#FFD23F" stroke="#000" stroke-width="3"/><text x="22" y="182" font-size="13" font-weight="700" font-family="Space Grotesk">Warehouse</text>
      <circle cx="560" cy="60" r="12" fill="${st === 'delivered' ? '#3BCE7B' : '#fff'}" stroke="#000" stroke-width="3"/><text x="510" y="32" font-size="13" font-weight="700" font-family="Space Grotesk">You 🏠</text>
      <g id="van"><rect x="-18" y="-13" width="36" height="26" rx="6" fill="${st === 'exception' ? '#FF5C5C' : '#4D96FF'}" stroke="#000" stroke-width="3"/><text x="0" y="5" text-anchor="middle" font-size="14">🚚</text></g></svg></div>
    <ol class="steps">${FLOW.map(([k, l], i) => `<li class="${st === 'exception' && i === step + 1 ? 'bad' : i < step || st === 'delivered' ? 'done' : i === step ? 'now' : ''}"><b>${st === 'exception' && i === step + 1 ? 'Problem' : l}</b>${s.events.find((e) => e.st === k) ? Kit.day(s.events.find((e) => e.st === k).ts) + ' ' + Kit.time(s.events.find((e) => e.st === k).ts) : '—'}</li>`).join('')}</ol>
    <div class="two">
      <div><h3 style="font-size:22px;margin-bottom:14px">Tracking history</h3><ul class="timeline">${s.events.map((e) => `<li><b>${LABEL[e.st]}</b> · ${e.place}${e.note ? `<br><span style="color:#B00020;font-weight:600">${Kit.esc(e.note)}</span>` : ''}<small>${new Date(e.ts).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></li>`).join('')}</ul></div>
      <div class="prefs box">${st === 'delivered' ? `<h3>Delivered ✓</h3><p>Left: ${{ door: 'at your front door', neighbour: 'with your neighbour', locker: 'in Parcelo locker #12' }[s.pref]}.</p><button class="btn w" id="problem">Report a problem</button>` : `
        <h3>Delivery options</h3>
        <label class="opt"><input type="radio" name="pref" value="door" ${s.pref === 'door' ? 'checked' : ''}> Leave at my door</label>
        <label class="opt"><input type="radio" name="pref" value="neighbour" ${s.pref === 'neighbour' ? 'checked' : ''}> Leave with a neighbour</label>
        <label class="opt"><input type="radio" name="pref" value="locker" ${s.pref === 'locker' ? 'checked' : ''}> Send to a Parcelo locker</label>
        <label class="opt"><input type="checkbox" id="alerts" ${s.alerts ? 'checked' : ''}> Text me updates</label>
        <button class="btn y" id="resched">${st === 'exception' ? 'Pick a new delivery day' : 'Change delivery day'}</button><button class="btn w" id="problem">Report a problem</button>`}
      </div>
    </div></div>`;
  const path = out.querySelector('#rp'), van = out.querySelector('#van');
  const place = (p) => { const pt = path.getPointAtLength(path.getTotalLength() * p); van.setAttribute('transform', `translate(${pt.x} ${pt.y})`); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || Kit.THUMB) place(prog); else { let p = 0; const t = setInterval(() => { p = Math.min(prog, p + .02); place(p); if (p >= prog) clearInterval(t); }, 16); }
  out.querySelectorAll('[name=pref]').forEach((r) => r.addEventListener('change', () => { s.pref = r.value; save(); Kit.toast('Delivery preference saved — the driver has been told', { type: 'success' }); }));
  const al = out.querySelector('#alerts'); if (al) al.addEventListener('change', () => { s.alerts = al.checked; save(); Kit.toast(al.checked ? 'You\'ll get SMS updates' : 'SMS updates turned off'); });
  const rs = out.querySelector('#resched'); if (rs) rs.addEventListener('click', () => reschedule(s));
  out.querySelector('#problem').addEventListener('click', () => Kit.modal({ title: 'Report a problem', body: `<div class="kit-field"><label for="pr">What happened?</label><select id="pr"><option>Parcel is late</option><option>Parcel is damaged</option><option>Marked delivered but not received</option><option>Something else</option></select></div><div class="kit-field"><label for="pd">Details</label><textarea id="pd"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send report', primary: true, onClick: () => { Kit.toast('Thanks — our team will contact you within 24 hours', { type: 'success' }); } }] }));
}
function reschedule(s) {
  const days = Array.from({ length: 5 }, (_, i) => Kit.addDays(new Date(), i + 1));
  Kit.modal({ title: 'Choose a delivery day', body: `<div class="kit-seg" id="dd">${days.map((d, i) => `<button type="button" data-d="${d.getTime()}" aria-pressed="${i === 0}">${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div><div class="kit-seg" id="ds"><button type="button" aria-pressed="true">9:00–13:00</button><button type="button" aria-pressed="false">13:00–17:00</button><button type="button" aria-pressed="false">17:00–21:00</button></div>`,
    onOpen: (m) => ['#dd', '#ds'].forEach((g) => m.querySelector(g).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) m.querySelectorAll(g + ' button').forEach((x) => x.setAttribute('aria-pressed', x === b)); })),
    actions: [{ label: 'Cancel' }, { label: 'Confirm new day', primary: true, onClick: (m) => {
      s.eta = +m.querySelector('#dd [aria-pressed=true]').dataset.d; const slot = m.querySelector('#ds [aria-pressed=true]').textContent;
      if (statusOf(s) === 'exception') s.events.unshift({ ts: Date.now(), st: 'in_transit', place: 'Regional depot', note: `Redelivery booked ${new Date(s.eta).toLocaleDateString('en-GB', { weekday: 'long' })} ${slot}` });
      else s.events.unshift({ ts: Date.now(), st: statusOf(s), place: s.events[0].place, note: `Delivery moved to ${new Date(s.eta).toLocaleDateString('en-GB', { weekday: 'long' })} ${slot}` });
      save(); renderAll(); renderResult(s); Kit.toast('New delivery day confirmed', { type: 'success' });
    } }] });
}

/* ---------- Merchant dashboard ---------- */
let fstatus = 'all';
document.getElementById('carrier').innerHTML += Object.values(CARRIERS).map((c) => `<option>${c}</option>`).join('');
function renderShipments() {
  const counts = { all: S.ships.length }; S.ships.forEach((s) => { counts[statusOf(s)] = (counts[statusOf(s)] || 0) + 1; });
  document.getElementById('chips').innerHTML = [['all', 'All'], ...FLOW, ['exception', 'Problems']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${k === fstatus}">${l} · ${counts[k] || 0}</button>`).join('');
  const q = document.getElementById('q').value.toLowerCase(), car = document.getElementById('carrier').value;
  const list = S.ships.filter((s) => (fstatus === 'all' || statusOf(s) === fstatus) && (car === 'all' || s.carrier === car) && (s.code + s.order + s.customer).toLowerCase().includes(q)).sort((a, b) => (statusOf(b) === 'exception') - (statusOf(a) === 'exception') || b.events[0].ts - a.events[0].ts);
  document.getElementById('rows').innerHTML = list.map((s) => { const st = statusOf(s), p = st === 'delivered' ? 100 : Math.round(Math.max(0, stepOf(s)) / 4 * 100); return `<tr data-id="${s.id}"><td><b>${s.code}</b></td><td>${s.order}</td><td>${Kit.esc(s.customer)}<br><small>${s.city}</small></td><td>${s.carrier}</td><td><span class="tag t-${st}">${LABEL[st]}</span></td><td><div class="bar"><i style="width:${p}%;${st === 'exception' ? 'background:var(--red)' : st === 'delivered' ? 'background:var(--green)' : ''}"></i></div></td><td>${Kit.ago(s.events[0].ts)}<br><small>${s.events[0].place}</small></td><td>${etaText(s)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="kit-empty-state">No shipments match.</td></tr>';
  const del7 = S.ships.filter((s) => statusOf(s) === 'delivered' && s.events[0].ts > Date.now() - 7 * DAY), ex = counts.exception || 0;
  document.getElementById('k-transit').textContent = S.ships.filter((s) => ['picked_up', 'in_transit', 'out_for_delivery'].includes(statusOf(s))).length;
  document.getElementById('k-del').textContent = del7.length; document.getElementById('k-ex').textContent = ex;
  document.getElementById('k-ontime').textContent = del7.length ? Math.round(del7.filter((s) => s.events[0].ts <= s.eta + DAY).length / del7.length * 100) + '%' : '—';
  const n = document.getElementById('ex-n'); n.hidden = !ex; n.textContent = ex;
}
document.getElementById('chips').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { fstatus = b.dataset.s; renderShipments(); } });
document.getElementById('q').addEventListener('input', renderShipments);
document.getElementById('carrier').addEventListener('change', renderShipments);
document.getElementById('rows').addEventListener('click', (e) => { const r = e.target.closest('[data-id]'); if (r) shipModal(S.ships.find((s) => s.id === r.dataset.id)); });
function advance(s) {
  const st = statusOf(s); if (st === 'delivered') return false;
  const i = st === 'exception' ? stepOf(s) + 1 : stepOf(s) + 1;
  s.events.unshift({ ts: Date.now(), st: FLOW[i][0], place: PLACES[i], note: '' }); return true;
}
function shipModal(s) {
  const st = statusOf(s);
  Kit.modal({ title: `${s.code} · ${s.order}`, wide: true, body: `<p>${Kit.esc(s.customer)} · ${s.city} · ${s.carrier} · <span class="tag t-${st}">${LABEL[st]}</span></p><p>Customer preference: <b>${{ door: 'Leave at door', neighbour: 'Neighbour', locker: 'Locker' }[s.pref]}</b> · SMS updates ${s.alerts ? 'on' : 'off'}</p>
    <ul class="timeline" style="margin-top:6px">${s.events.map((e) => `<li><b>${LABEL[e.st]}</b> · ${e.place}${e.note ? ` — <i>${Kit.esc(e.note)}</i>` : ''}<small>${new Date(e.ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</small></li>`).join('')}</ul>`,
    actions: [{ label: 'Open customer page', onClick: () => { location.hash = '#/track'; document.getElementById('code').value = s.code; setTimeout(show); } },
      ...(st === 'exception' ? [{ label: 'Resolve: rebook delivery', primary: true, onClick: () => { s.events.unshift({ ts: Date.now(), st: 'out_for_delivery', place: PLACES[3], note: 'Redelivery arranged by store' }); s.eta = Date.now() + 4 * H; save(); renderAll(); Kit.toast('Redelivery booked — customer notified by SMS', { type: 'success' }); } }] : []),
      ...(st !== 'delivered' && st !== 'exception' ? [{ label: 'Mark delivery problem', danger: true, onClick: () => { s.events.unshift({ ts: Date.now(), st: 'exception', place: s.events[0].place, note: 'Address not found' }); save(); renderAll(); Kit.toast('Marked as a delivery problem'); } }, { label: 'Next status →', primary: true, onClick: () => { advance(s); save(); renderAll(); Kit.toast(`${s.code}: ${LABEL[statusOf(s)]}`); } }] : [])] });
}
document.getElementById('sync').addEventListener('click', () => {
  const moving = S.ships.filter((s) => !['delivered', 'exception'].includes(statusOf(s)));
  const picked = moving.sort(() => Math.random() - .5).slice(0, Math.max(1, Math.ceil(moving.length / 3)));
  picked.forEach(advance); save(); renderAll();
  Kit.toast(picked.length ? `Synced 3 carriers · ${picked.length} shipments updated` : 'Everything is up to date', { type: 'success' });
});
document.getElementById('import').addEventListener('click', () => Kit.modal({ title: 'Import shipments', body: `<p>Paste one shipment per line: <b>order, customer, city, carrier (PCL / DHL / ARX)</b></p><textarea id="csv" rows="6">#1101, Sami Haddad, Marina, PCL\n#1102, Lea Karam, Old Town, DHL</textarea>`,
  actions: [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: (m) => {
    const lines = m.querySelector('#csv').value.split('\n').map((l) => l.split(',').map((x) => x.trim())).filter((l) => l.length >= 4 && CARRIERS[l[3].toUpperCase()]);
    if (!lines.length) { Kit.toast('No valid lines found — check the format', { type: 'error' }); return false; }
    lines.forEach(([order, customer, city, c]) => S.ships.push({ id: Kit.uid(), code: `${c.toUpperCase()}-${3000 + Math.floor(Math.random() * 6999)}-${String(10 + Math.floor(Math.random() * 89))}`, order, customer, city, carrier: CARRIERS[c.toUpperCase()], created: Date.now(), events: [{ ts: Date.now(), st: 'label_created', place: PLACES[0], note: '' }], eta: Date.now() + 3 * DAY, pref: 'door', alerts: true }));
    save(); renderAll(); Kit.toast(`${lines.length} shipments imported — tracking links sent to customers`, { type: 'success' });
  } }] }));
document.getElementById('export').addEventListener('click', () => Kit.csv('parcelo-shipments.csv', [['Tracking', 'Order', 'Customer', 'City', 'Carrier', 'Status', 'Last update', 'ETA'], ...S.ships.map((s) => [s.code, s.order, s.customer, s.city, s.carrier, LABEL[statusOf(s)], new Date(s.events[0].ts).toISOString(), etaText(s)])]));

/* ---------- Notifications ---------- */
function renderNotify() {
  document.getElementById('notif').innerHTML = S.notify.map((n, i) => `<div class="box"><div><b style="font:700 18px 'Space Grotesk',sans-serif">${LABEL[n.st]}</b><br><small>Sent when a parcel becomes "${LABEL[n.st].toLowerCase()}"</small></div><label class="switch"><input type="checkbox" data-i="${i}" data-k="email" ${n.email ? 'checked' : ''}> Email</label><label class="switch"><input type="checkbox" data-i="${i}" data-k="sms" ${n.sms ? 'checked' : ''}> SMS</label>
    <textarea data-i="${i}" aria-label="${LABEL[n.st]} message">${Kit.esc(n.msg)}</textarea><p class="kit-hint" style="grid-column:1/-1">Preview: ${Kit.esc(n.msg.replace('{name}', 'Lina').replace('{tracking}', 'PCL-2048-77').replace('{eta}', '14:00–16:00').replace('{store}', 'Nordhem'))}</p><button class="btn w" data-test="${i}" style="justify-self:start">Send test to me</button></div>`).join('');
}
const nf = document.getElementById('notif');
nf.addEventListener('change', (e) => { const c = e.target.closest('input[data-k]'); if (c) { S.notify[+c.dataset.i][c.dataset.k] = c.checked; save(); Kit.toast('Notification settings saved'); } });
nf.addEventListener('input', (e) => { const t = e.target.closest('textarea'); if (t) { S.notify[+t.dataset.i].msg = t.value; save(); t.parentElement.querySelector('.kit-hint').textContent = 'Preview: ' + t.value.replace('{name}', 'Lina').replace('{tracking}', 'PCL-2048-77').replace('{eta}', '14:00–16:00').replace('{store}', 'Nordhem'); } });
nf.addEventListener('click', (e) => { const b = e.target.closest('[data-test]'); if (b) Kit.toast('Test message sent to your phone and email', { type: 'success' }); });

function renderAll() { renderShipments(); renderNotify(); }
renderAll();
const router = Kit.router('track');
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Removes your test shipments and settings.', 'Reset')) db.reset(); });
Kit.key('/', () => { router.go('shipments'); setTimeout(() => document.getElementById('q').focus()); }, 'Search shipments');
Kit.key('s', () => document.getElementById('sync').click(), 'Sync carriers');
Kit.commands([{ label: 'Track a parcel', run: () => router.go('track') }, { label: 'Go to Shipments', run: () => router.go('shipments') }, { label: 'Show delivery problems', run: () => { router.go('shipments'); fstatus = 'exception'; renderShipments(); } }, { label: 'Sync carriers', hint: 'S', run: () => document.getElementById('sync').click() }, { label: 'Import shipments', run: () => { router.go('shipments'); document.getElementById('import').click(); } }, { label: 'Edit customer notifications', run: () => router.go('notify') }]);
if (Kit.THUMB) { document.getElementById('code').value = 'PCL-2048-77'; show(); }
