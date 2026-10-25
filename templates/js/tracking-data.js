/* Parcelo — shared data for the customer tracking page (tracking.html) and the merchant panel (tracking-admin.html).
   Both pages read and write the same saved store, so a status change by the merchant shows up live for the customer. */
const DAY = 864e5, H = 36e5;
const FLOW = [['label_created', 'Label created'], ['picked_up', 'Picked up'], ['in_transit', 'In transit'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']];
const LABEL = Object.fromEntries([...FLOW, ['exception', 'Delivery problem']]);
const CARRIERS = { PCL: 'Parcelo Express', DHL: 'DHL', ARX: 'Aramex' };
const PLACES = ['Nordhem warehouse', 'Central sorting hub', 'Regional depot', 'Local delivery van', 'Your address'];
const PREFS = { door: 'Leave at door', neighbour: 'With a neighbour', locker: 'Parcelo locker #12' };
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
    return { id: Kit.uid(), code, order: '#' + (1040 + i), customer: name, email: name.split(' ')[0].toLowerCase() + '@example.com', city: cities[i % cities.length], carrier: CARRIERS[pre], created, events: events.sort((a, b) => b.ts - a.ts), eta: created + 4 * DAY, pref: 'door', alerts: true };
  });
  ships[0].code = 'PCL-2048-77'; ships[0].eta = now + 3 * H;
  const notify = [['picked_up', true, false, 'Hi {name}, your {store} order is on its way! Track it: parcelo.app/{tracking}'], ['out_for_delivery', true, true, '{name}, your parcel arrives today between {eta}. Not home? Change it in one tap.'], ['delivered', true, true, 'Delivered! Your {store} parcel {tracking} was left at your door.'], ['exception', true, true, 'We couldn\'t deliver {tracking}. Pick a new day: parcelo.app/{tracking}']]
    .map(([st, email, sms, msg]) => ({ st, email, sms, msg }));
  const issues = [{ id: Kit.uid(), code: ships[2].code, kind: 'Parcel is late', text: 'It said Tuesday, still nothing.', ts: now - 5 * H, status: 'open' }];
  return { ships, notify, issues, notes: [], settings: { store: 'Nordhem', windowStart: '14:00', windowEnd: '16:00', allowReschedule: true, allowLocker: true } };
}
const db = Kit.store('parcelo', seed), S = db.data, save = () => db.save();
// Older saved demos may miss newer fields
S.issues = S.issues || []; S.notes = S.notes || [];
S.ships.forEach((s) => { if (s.email === undefined) s.email = s.customer.split(' ')[0].toLowerCase() + '@example.com'; });
S.settings = Object.assign({ store: 'Nordhem', windowStart: '14:00', windowEnd: '16:00', allowReschedule: true, allowLocker: true }, S.settings || {});

const statusOf = (s) => s.events[0].st;
const stepOf = (s) => { const st = statusOf(s); return st === 'exception' ? FLOW.findIndex((f) => f[0] === s.events[1]?.st) : FLOW.findIndex((f) => f[0] === st); };
const etaText = (s) => statusOf(s) === 'delivered' ? 'Delivered ' + Kit.day(s.events[0].ts) : statusOf(s) === 'exception' ? 'Waiting for you' : new Date(s.eta).toDateString() === new Date().toDateString() ? `Today ${S.settings.windowStart}–${S.settings.windowEnd}` : new Date(s.eta).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const find = (code) => S.ships.find((s) => s.code === code.trim().toUpperCase());
