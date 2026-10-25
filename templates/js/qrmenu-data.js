/* TableTap — shared data for the guest menu (qrmenu.html) and the staff panel (qrmenu-admin.html).
   Both pages read and write the same saved store, so an order sent from a guest's phone lands on the kitchen display instantly. */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=65`;
function seed() {
  const menu = [
    ['Smoked hummus', 'Tahini, chilli butter, warm pita', 9, 'Starters', 'kitchen', '1653611540493-b3a896319fbf', 'veg'], ['Burrata & figs', 'Honey, toasted walnuts', 14, 'Starters', 'kitchen', '1784294460349-591c4cd81400', 'pop'],
    ['Grill platter', 'Lamb, chicken, kofta, saffron rice', 28, 'Mains', 'kitchen', '1771285119318-b342c3ecc51c', 'pop'], ['Sea bream', 'Wood-fired, herb salsa, lemon', 26, 'Mains', 'kitchen', '1467003909585-2f8a72700288', ''],
    ['Mezze for two', 'Six small plates to share', 24, 'Mains', 'kitchen', '1785734290864-eca98549d0b6', 'veg'], ['Iced latte', 'Double shot, cold milk', 4.5, 'Drinks', 'bar', '1461023058943-07fcbe16d735', ''],
    ['Fresh lemonade', 'Mint, crushed ice', 4, 'Drinks', 'bar', '1642647391072-6a2416f048e5', ''], ['Flat white', 'Single origin', 4, 'Drinks', 'bar', '1512568400610-62da28bc8a13', ''],
  ].map(([name, desc, price, sec, station, img, tag]) => ({ id: Kit.uid(), name, desc, price, sec, station, img, tag, on: true }));
  const now = Date.now(), m = (n) => menu[n];
  const line = (n, qty, note = '') => ({ id: Kit.uid(), mid: m(n).id, name: m(n).name, price: m(n).price, station: m(n).station, qty, note, done: false });
  const tickets = [
    { id: Kit.uid(), table: 3, ts: now - 16 * 6e4, status: 'cook', items: [line(2, 2, 'No onion'), line(0, 1)] },
    { id: Kit.uid(), table: 11, ts: now - 9 * 6e4, status: 'cook', items: [line(3, 1), line(5, 2)] },
    { id: Kit.uid(), table: 5, ts: now - 3 * 6e4, status: 'new', items: [line(4, 1, 'Extra pita'), line(6, 2)] },
    { id: Kit.uid(), table: 9, ts: now - 22 * 6e4, status: 'ready', items: [line(1, 2)] },
  ];
  const tables = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, seats: [2, 4, 4, 2, 6, 4, 2, 4, 2, 8, 4, 2][i], bill: i === 8, paid: [] }));
  return { menu, tickets, tables, served: [], sales: 412.5, times: [11, 14, 9, 17, 12], calls: [{ id: Kit.uid(), table: 4, kind: 'waiter', ts: now - 2 * 6e4, done: false }], notes: [] };
}
const db = Kit.store('tabletap', seed), S = db.data, save = () => db.save();
S.calls = S.calls || []; S.notes = S.notes || [];
const item = (id) => S.menu.find((x) => x.id === id);
const STATUS_GUEST = { new: 'Received', cook: 'Being prepared', ready: 'On its way', served: 'Served' };
const tableItems = (n) => S.tickets.concat(S.served).filter((x) => x.table === n).flatMap((x) => x.items);
