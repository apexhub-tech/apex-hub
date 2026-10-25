/* Baan Saeng — Thai kitchen (Bangkok), à la carte. Config for the QR restaurant engine. */
window.QR = {
  key: 'baansaeng', name: 'Baan Saeng Thai Kitchen', short: 'Baan Saeng', localName: 'บ้านแสง · Thai home cooking', mark: '🌶', accent: '#0F766E',
  currency: 'THB', serviceRate: 0.10, taxRate: 0.07, taxLabel: 'VAT 7%', defaultTable: 4, guestUrl: 'thai.html', adminUrl: 'thai-admin.html',
  hero: '1761037994516-502ed10932b0',
  pitch: 'Scan, pick your spice level, and dishes go straight to the wok.',
  welcome: '', thanks: 'ขอบคุณค่ะ! Thank you — we hope to cook for you again soon.',
  staff: { email: 'kitchen@baansaeng.co.th', name: 'Nok Siriwan', role: 'Restaurant manager' },
  categories: [['starters', 'Starters'], ['curries', 'Soups & curries'], ['wok', 'Wok & noodles'], ['dessert', 'Dessert'], ['drinks', 'Drinks']],
  stations: { wok: 'Wok', curry: 'Curry & soup', cold: 'Salads & desserts', bar: 'Bar' },
  service: [['waiter', '🙋', 'Call staff'], ['water', '💧', 'Water'], ['rice', '🍚', 'More rice']],
  options: {
    spice: { label: 'Spice level', def: 1, choices: [['Not spicy', 0], ['Mild 🌶', 0], ['Medium 🌶🌶', 0], ['Thai hot 🌶🌶🌶', 0]] },
    protein: { label: 'Protein', def: 0, choices: [['Chicken', 0], ['Pork', 0], ['Shrimp', 40], ['Seafood', 60], ['Tofu', 0]] },
    rice: { label: 'Rice', def: 0, choices: [['Jasmine rice', 0], ['Sticky rice', 10], ['No rice', 0]] },
  },
  seed() {
    const M = (cat, name, local, desc, price, station, extra = {}) => ({ id: Kit.uid(), cat, name, local, desc, price, station, on: true, ...extra });
    const menu = [
      M('starters', 'Chicken satay', 'สะเต๊ะไก่', 'Turmeric chicken skewers, peanut sauce, ajad', 159, 'wok', { img: '1742808838159-1848c1a36209' }),
      M('starters', 'Crispy spring rolls', 'ปอเปี๊ยะทอด', 'Glass noodles, cabbage, sweet chilli dip', 129, 'wok', { img: '1768701544400-dfa8ca509d10', tags: ['veg'] }),
      M('starters', 'Yum mamuang', 'ยำมะม่วง', 'Green mango salad, cashews, dried shrimp', 149, 'cold', { img: '1582801205465-c0d029e85a1c', heat: 2, opts: ['spice'] }),
      M('curries', 'Tom yum goong', 'ต้มยำกุ้ง', 'Hot and sour river prawn soup, lemongrass, galangal', 229, 'curry', { img: '1761037994516-502ed10932b0', heat: 3, opts: ['spice'], tags: ['signature'] }),
      M('curries', 'Green curry', 'แกงเขียวหวาน', 'Coconut green curry, Thai eggplant, basil', 189, 'curry', { img: '1761315412830-2f59480377b0', heat: 2, opts: ['protein', 'spice', 'rice'] }),
      M('curries', 'Massaman beef', 'มัสมั่นเนื้อ', 'Slow-cooked beef, potato, roasted peanuts', 219, 'curry', { img: '1707056924965-2c687206af67', heat: 1, opts: ['rice'] }),
      M('wok', 'Pad thai', 'ผัดไทย', 'Rice noodles, tamarind, egg, peanuts, lime', 169, 'wok', { img: '1637806930600-37fa8892069d', opts: ['protein'], tags: ['signature'] }),
      M('wok', 'Khao pad', 'ข้าวผัด', 'Thai fried rice, egg, spring onion, lime', 149, 'wok', { img: '1603133872878-684f208fb84b', opts: ['protein'] }),
      M('wok', 'Pad kra pao', 'ผัดกะเพรา', 'Holy basil stir-fry with fried egg', 159, 'wok', { heat: 3, opts: ['protein', 'spice', 'rice'] }),
      M('dessert', 'Mango sticky rice', 'ข้าวเหนียวมะม่วง', 'Nam dok mai mango, coconut cream', 139, 'cold', { img: '1705234384751-84081009588e', tags: ['veg'] }),
      M('drinks', 'Thai iced tea', 'ชาเย็น', 'Cha yen with condensed milk', 79, 'bar', { img: '1583124252668-93a11eb64a5f' }),
      M('drinks', 'Fresh coconut', 'มะพร้าวน้ำหอม', 'Young Nam Hom coconut', 89, 'bar'),
      M('drinks', 'Singha beer', 'สิงห์', '620 ml bottle', 120, 'bar'),
    ];
    const tables = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, seats: [2, 4, 4, 4, 6, 2, 4, 8, 2, 4][i], session: null }));
    const now = Date.now(), find = (name) => menu.find((d) => d.name === name);
    const seat = (n, minsAgo, adults) => { tables[n - 1].session = { id: Kit.uid(), start: now - minsAgo * 6e4, adults, kids: 0, tier: null, tea: null, rounds: 0, bill: false }; return tables[n - 1].session; };
    const tickets = [], order = (s, n, minsAgo, status, items) => { s.rounds++; tickets.push({ id: Kit.uid(), table: n, session: s.id, round: s.rounds, ts: now - minsAgo * 6e4, status, items: items.map(([name, qty, opts = []]) => { const d = find(name); return { mid: d.id, name, qty, opts, price: d.price + (opts.includes('Shrimp') ? 40 : 0), free: false, station: d.station, note: '', done: status === 'served' }; }) }); };
    const a = seat(3, 38, 3); order(a, 3, 35, 'served', [['Chicken satay', 1], ['Tom yum goong', 1, ['Thai hot 🌶🌶🌶']], ['Thai iced tea', 3]]); order(a, 3, 9, 'cooking', [['Pad thai', 2, ['Shrimp']], ['Green curry', 1, ['Chicken', 'Medium 🌶🌶', 'Jasmine rice']]]);
    const b = seat(5, 22, 5); order(b, 5, 4, 'new', [['Massaman beef', 2, ['Jasmine rice']], ['Khao pad', 2, ['Pork']], ['Yum mamuang', 1, ['Mild 🌶']], ['Singha beer', 3]]);
    const d0 = new Date().setHours(11, 0, 0, 0), bills = [[2, 712, 2, 'PromptPay QR'], [7, 1268, 4, 'Mastercard •••• 4444'], [8, 2410, 7, 'SCB EASY'], [1, 455, 1, 'Cash']]
      .map(([table, total, heads, method], i) => ({ id: Kit.uid(), table, total, heads, tier: null, method, ts: Math.min(now - 3 * 36e5, d0 + i * 50 * 6e4), dishes: { 'Pad thai': heads, 'Tom yum goong': Math.ceil(heads / 2), 'Mango sticky rice': 1 } }));
    return { menu, tables, tickets, calls: [{ id: Kit.uid(), table: 3, kind: 'rice', ts: now - 2 * 6e4, done: false }], bills, notes: [] };
  },
};
