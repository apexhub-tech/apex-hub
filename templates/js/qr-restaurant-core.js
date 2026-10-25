/* QR restaurant engine — shared data and rules for the guest page (qr-restaurant.js) and staff panel (qr-restaurant-admin.js).
   Each restaurant supplies window.QR (menu, buffet tiers, tea, options, theme) in its own *-data.js file. */
const C = window.QR;
const db = Kit.store(C.key, C.seed), S = db.data, save = () => db.save();
S.calls = S.calls || []; S.notes = S.notes || []; S.bills = S.bills || []; S.tickets = S.tickets || [];
if (!S.buffet && C.buffet) S.buffet = C.buffet.tiers.map((t) => ({ id: t.id, price: t.price }));

const money = (n) => PayKit.fmt(n, C.currency);
const dish = (id) => S.menu.find((d) => d.id === id);
const table = (n) => S.tables.find((t) => t.n === n);
const tierOf = (id) => C.buffet && C.buffet.tiers.find((t) => t.id === id);
const tierIndex = (id) => C.buffet ? C.buffet.tiers.findIndex((t) => t.id === id) : 0;
const tierPrice = (id) => (S.buffet.find((t) => t.id === id) || tierOf(id)).price;
const STATUS = { new: 'Received', cooking: 'Preparing', served: 'Served' };
const optText = (opts) => (opts || []).filter(Boolean).join(' · ');
const dishPrice = (d, opts) => d.price + (opts || []).reduce((a, o) => a + (o && o.extra ? o.extra : 0), 0);

// Buffet timer: minutes left in a session (negative = overtime)
const minutesLeft = (s) => C.buffet ? C.buffet.minutes - (Date.now() - s.start) / 6e4 : Infinity;
const lastCall = (s) => C.buffet && minutesLeft(s) <= C.buffet.lastCall;

// Is a dish included in this session's buffet tier (free) or charged on top?
const included = (d, s) => C.buffet && d.tier != null && s && tierIndex(s.tier) >= d.tier;

// Everything on a table's bill for its current session
function bill(n) {
  const t = table(n), s = t.session; if (!s) return null;
  const tickets = S.tickets.filter((k) => k.session === s.id);
  const extras = [];
  tickets.forEach((k) => k.items.forEach((i) => { if (!i.free) extras.push(i); }));
  const lines = [];
  if (C.buffet) {
    const p = tierPrice(s.tier), tier = tierOf(s.tier);
    if (s.adults) lines.push([`${tier.name} buffet × ${s.adults} adult${s.adults > 1 ? 's' : ''}`, p * s.adults]);
    if (s.kids) lines.push([`${tier.name} buffet × ${s.kids} child${s.kids > 1 ? 'ren' : ''} (${Math.round(C.buffet.kidsFactor * 100)}%)`, Math.round(p * C.buffet.kidsFactor) * s.kids]);
  }
  if (C.tea && s.tea) lines.push([`${s.tea} tea × ${s.adults + (s.kids || 0)}`, C.tea.perPerson * (s.adults + (s.kids || 0))]);
  const merged = {};
  extras.forEach((i) => { const k = i.name + '|' + optText(i.opts); merged[k] = merged[k] || { name: i.name + (optText(i.opts) ? ` (${optText(i.opts)})` : ''), qty: 0, total: 0 }; merged[k].qty += i.qty; merged[k].total += i.qty * i.price; });
  Object.values(merged).forEach((m) => lines.push([`${m.qty}× ${m.name}`, m.total]));
  const sub = lines.reduce((a, l) => a + l[1], 0), service = Math.round(sub * C.serviceRate), tax = Math.round((sub + service) * C.taxRate);
  return { lines, sub, service, tax, total: sub + service + tax, heads: (s.adults || 0) + (s.kids || 0) };
}

// Start a dining session on a table (from the guest's phone or by staff)
function startSession(n, { adults = 2, kids = 0, tier = null, tea = null, by = 'guest' } = {}) {
  const t = table(n);
  t.session = { id: Kit.uid(), start: Date.now(), adults, kids, tier, tea, rounds: 0, bill: false };
  const what = C.buffet ? `${tierOf(tier).name} buffet · ${adults}+${kids} guests` : C.tea ? `${adults + kids} guests · ${tea} tea` : `${adults + kids} guests`;
  Kit.notify(db, `Table ${n} ${by === 'guest' ? 'started' : 'seated'}: ${what}`, { table: n });
}

// Close a session after payment and keep a sales record
function closeSession(n, method = 'Cash') {
  const t = table(n), b = bill(n); if (!t.session) return;
  const dishes = {};
  S.tickets.filter((k) => k.session === t.session.id).forEach((k) => k.items.forEach((i) => { dishes[i.name] = (dishes[i.name] || 0) + i.qty; }));
  S.bills.push({ id: Kit.uid(), table: n, ts: Date.now(), total: b.total, heads: b.heads, tier: t.session.tier, method, dishes });
  S.tickets = S.tickets.filter((k) => k.session !== t.session.id);
  S.calls.forEach((c) => { if (c.table === n) c.done = true; });
  t.session = null;
}
