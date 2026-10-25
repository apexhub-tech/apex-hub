/* QR restaurant engine — shared data and rules for the guest page (qr-restaurant.js) and staff panel (qr-restaurant-admin.js).
   Each restaurant supplies window.QR (menu, buffet tiers, tea, options, theme) in its own *-data.js file. */
const C = window.QR;
const db = Kit.store(C.key, C.seed), S = db.data, save = () => db.save();
S.calls = S.calls || []; S.notes = S.notes || []; S.bills = S.bills || []; S.tickets = S.tickets || [];
if (!S.buffet && C.buffet) S.buffet = C.buffet.tiers.map((t) => ({ id: t.id, price: t.price }));
// Visits saved before table PINs existed get one now
if (S.tables.filter((t) => t.session && !t.session.pin).map((t) => { t.session.pin = String(Math.floor(1000 + Math.random() * 9000)); t.session.devices = []; }).length && !Kit.THUMB) save();

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

/* ---------- Table access: staff-seated visits, table PIN, per-phone tokens ----------
   A printed table QR only says which table it is. Ordering needs the PIN staff give the party when seating them;
   each phone that enters it is recorded on that visit. Paying, closing or changing the PIN shuts every phone out.
   (In this demo the checks run in the browser; a live system must enforce them on the server.) */
const genPin = () => String(Math.floor(1000 + Math.random() * 9000));
const DEVICE = (() => { const k = 'apexhub:qr-device'; let id = null; try { id = localStorage.getItem(k); if (!id) { id = Kit.uid() + Kit.uid(); localStorage.setItem(k, id); } } catch (e) { id = 'nostore-' + Kit.uid(); } return id; })();
const JOINS_KEY = `apexhub:${C.key}:joins`;
const joins = () => { try { return JSON.parse(localStorage.getItem(JOINS_KEY) || '{}'); } catch (e) { return {}; } };
const saveJoin = (n, sessionId) => { const j = joins(); j[n] = sessionId; try { localStorage.setItem(JOINS_KEY, JSON.stringify(j)); } catch (e) { /* storage blocked */ } };
// This phone may order on table n only if it joined the table's current visit and staff haven't removed it
const joined = (n) => { const s = table(n).session; return !!s && joins()[n] === s.id && s.devices.some((d) => d.id === DEVICE); };
// Did this phone belong to a visit on table n that has since been paid or closed?
const closedVisit = (n) => { const id = joins()[n], s = table(n).session; return !!id && (!s || s.id !== id) ? S.bills.find((b) => b.session === id) || { closed: true } : null; };
function joinTable(n, pin) {
  const s = table(n).session; if (!s || pin !== s.pin) return false;
  if (!s.devices.some((d) => d.id === DEVICE)) s.devices.push({ id: DEVICE, ts: Date.now() });
  saveJoin(n, s.id); Kit.notify(db, `📱 A phone joined table ${n} (${s.devices.length} on this table)`, { table: n });
  return true;
}
// New PIN for a table: every phone currently on it has to re-enter the new one
function changePin(n) { const s = table(n).session; if (!s) return; s.pin = genPin(); s.devices = []; save(); return s.pin; }

// Start a dining visit on a table — done by staff when they seat the party
function startSession(n, { adults = 2, kids = 0, tier = null, tea = null, by = 'staff' } = {}) {
  const t = table(n);
  t.session = { id: Kit.uid(), start: Date.now(), adults, kids, tier, tea, rounds: 0, bill: false, pin: genPin(), devices: [] };
  const what = C.buffet ? `${tierOf(tier).name} buffet · ${adults}+${kids} guests` : C.tea ? `${adults + kids} guests · ${tea} tea` : `${adults + kids} guests`;
  Kit.notify(db, `Table ${n} ${by === 'guest' ? 'started' : 'seated'}: ${what}`, { table: n });
}

// Close a session after payment and keep a sales record
function closeSession(n, method = 'Cash') {
  const t = table(n), b = bill(n); if (!t.session) return;
  const dishes = {};
  S.tickets.filter((k) => k.session === t.session.id).forEach((k) => k.items.forEach((i) => { dishes[i.name] = (dishes[i.name] || 0) + i.qty; }));
  S.bills.push({ id: Kit.uid(), session: t.session.id, table: n, ts: Date.now(), total: b.total, heads: b.heads, tier: t.session.tier, method, dishes });
  S.tickets = S.tickets.filter((k) => k.session !== t.session.id);
  S.calls.forEach((c) => { if (c.table === n) c.done = true; });
  t.session = null;
}
