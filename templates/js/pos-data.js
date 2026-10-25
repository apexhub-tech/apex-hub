/* Tally POS — shared data for the order-ahead page (pos.html) and the staff register (pos-admin.html).
   Both pages read and write the same saved store, so an online order rings up in the café's queue instantly and stock stays in sync. */
const U = (id, w = 320, h = 240) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=65`;
const TAX = 0.10;
const COFFEE_MODS = { size: [['Small', 0], ['Medium', 0.5], ['Large', 1]], milk: [['Whole', 0], ['Oat', 0.6], ['Almond', 0.6], ['No milk', 0]], extra: [['Extra shot', 0.8], ['Vanilla syrup', 0.5], ['Decaf', 0]] };
const FULFIL = { new: 'Order received', preparing: 'Being prepared', ready: 'Ready for pickup', collected: 'Collected', rejected: 'Cancelled' };

// Deterministic demo history so reports look alive
function seed() {
  const products = [
    ['Espresso', 2.5, 'Coffee', '1610632380989-680fe40816c6', 999, true], ['Cappuccino', 3.8, 'Coffee', '1541167760496-1628856ab772', 999, true],
    ['Flat white', 4.0, 'Coffee', '1512568400610-62da28bc8a13', 999, true], ['Americano', 3.2, 'Coffee', '1514432324607-a09d9b4aefdd', 999, true],
    ['Iced latte', 4.5, 'Cold drinks', '1461023058943-07fcbe16d735', 40, true], ['Iced americano', 3.9, 'Cold drinks', '1517701550927-30cf4ba1dba5', 35, true],
    ['Iced tea', 3.5, 'Cold drinks', '1642647391072-6a2416f048e5', 4, false], ['Croissant', 2.9, 'Bakery', '1623334044303-241021148842', 18, false],
    ['Cinnamon roll', 3.4, 'Bakery', '1783058890700-4aee307c36a9', 3, false], ['Sourdough loaf', 5.2, 'Bakery', '1613929231151-d7571591259e', 9, false],
    ['Chocolate cupcake', 3.6, 'Bakery', '1595144780677-6d0b5abbd089', 0, false],
  ].map(([name, price, cat, img, stock, mods]) => ({ id: Kit.uid(), name, price, cat, img, stock, mods, active: true }));
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const orders = [], now = new Date(), names = ['', '', 'Rami A.', 'Lara N.', '', 'Jad S.', 'Nour K.', ''];
  for (let day = 6; day >= 0; day--) {
    const count = day === 0 ? Math.min(34, 6 + now.getHours() * 2) : 28 + Math.floor(rnd() * 16);
    for (let i = 0; i < count; i++) {
      const t = new Date(now); t.setDate(t.getDate() - day);
      const maxH = day === 0 ? Math.max(7, now.getHours()) : 20;
      t.setHours(7 + Math.floor(rnd() * (maxH - 6)), Math.floor(rnd() * 60), 0, 0);
      if (t > now) t.setTime(now.getTime() - rnd() * 36e5);
      const items = []; const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const p = products[Math.floor(rnd() * 10)]; items.push({ name: p.name, qty: 1 + Math.floor(rnd() * 2), unit: p.price, mods: '' }); }
      const sub = items.reduce((a, x) => a + x.qty * x.unit, 0), tax = sub * TAX, tip = rnd() < .4 ? sub * .1 : 0;
      orders.push({ id: Kit.uid(), ts: t.getTime(), items, sub, disc: 0, tax, tip, total: sub + tax + tip, method: rnd() < .72 ? 'Card' : 'Cash', status: rnd() < .03 ? 'refunded' : 'paid', customer: names[Math.floor(rnd() * names.length)] });
    }
  }
  orders.sort((a, b) => a.ts - b.ts).forEach((o, i) => { o.no = 1000 + i; });
  // Two order-ahead pickups already in the café's queue
  [[4, 'Lara N.', 'preparing', [[2, 1, 'Large, Oat'], [7, 2, '']]], [1, 'Jad S.', 'new', [[4, 1, 'Medium, Whole'], [8, 1, '']]]].forEach(([ago, customer, fulfil, lines]) => {
    const items = lines.map(([i, qty, mods]) => ({ name: products[i].name, qty, unit: products[i].price + (mods.includes('Large') ? 1 : 0) + (mods.includes('Oat') ? .6 : 0) + (mods.includes('Medium') ? .5 : 0), mods, pid: products[i].id }));
    const sub = items.reduce((a, x) => a + x.qty * x.unit, 0), ts = now.getTime() - ago * 6e4;
    orders.push({ id: Kit.uid(), no: 1000 + orders.length, ts, items, sub, disc: 0, tax: sub * TAX, tip: 0, total: sub * (1 + TAX), method: 'Card', status: 'paid', customer, source: 'online', fulfil, pickup: ts + 12 * 6e4 });
  });
  return { products, orders, cart: [], discount: null, customer: '', parked: [], online: true, prepMins: 10, loyalty: { 'Rami A.': 120, 'Lara N.': 64, 'Nour K.': 210 }, notes: [] };
}
const db = Kit.store('pos', seed);
const S = db.data;
const save = () => { db.save(); };
S.notes = S.notes || []; S.loyalty = S.loyalty || {}; if (S.online === undefined) S.online = true; S.prepMins = S.prepMins || 10;
const prod = (id) => S.products.find((p) => p.id === id);
const nextNo = () => (S.orders.length ? Math.max(...S.orders.map((o) => o.no)) : 999) + 1;
const queue = () => S.orders.filter((o) => o.source === 'online' && ['new', 'preparing', 'ready'].includes(o.fulfil)).sort((a, b) => a.pickup - b.pickup);
