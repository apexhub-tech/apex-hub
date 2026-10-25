/* Golden Lotus — Cantonese dim sum house (Yangon). Config for the QR restaurant engine. */
window.QR = {
  key: 'goldenlotus', name: 'Golden Lotus Dim Sum', short: 'Golden Lotus', localName: '金莲点心 · Cantonese tea house, Yangon', mark: '莲', accent: '#B91C1C',
  currency: 'MMK', serviceRate: 0.05, taxRate: 0.05, taxLabel: 'Commercial tax 5%', defaultTable: 3, guestUrl: 'dimsum.html', adminUrl: 'dimsum-admin.html',
  hero: '1559667709-eabb5b50117a', quickAdd: true,
  pitch: 'Scan, choose your tea, then tick dim sum like an order sheet — baskets arrive fresh from the steamers.',
  welcome: 'Welcome to yum cha', thanks: '多谢! Thank you for having tea with us.',
  staff: { email: 'manager@goldenlotus.com.mm', name: 'Daw Mya Thandar', role: 'Restaurant manager' },
  tea: { perPerson: 2500, teas: ['Jasmine', 'Pu-erh', 'Oolong', 'Chrysanthemum'] },
  categories: [['steamed', 'Steamed'], ['fried', 'Fried & baked'], ['rice', 'Rice & noodles'], ['sweet', 'Sweet']],
  stations: { steam: 'Steamers', fry: 'Fryer & oven', wok: 'Wok' },
  service: [['refill', '🫖', 'Refill tea'], ['waiter', '🙋', 'Call staff'], ['box', '🥡', 'Takeaway box']],
  options: { chili: { label: 'Chili oil', def: 1, choices: [['None', 0], ['On the side', 0], ['Extra', 0]] } },
  seed() {
    const M = (cat, name, local, desc, price, station, extra = {}) => ({ id: Kit.uid(), cat, name, local, desc, price, station, on: true, ...extra });
    const menu = [
      M('steamed', 'Har gow', '虾饺', 'Crystal shrimp dumplings · 4 pcs', 7500, 'steam', { img: '1657939728877-df03de19f9fe', tags: ['signature'] }),
      M('steamed', 'Siu mai', '烧卖', 'Pork and shrimp, flying-fish roe · 4 pcs', 6500, 'steam', { img: '1604632910793-c0601f361b34' }),
      M('steamed', 'Xiao long bao', '小笼包', 'Soup dumplings, black vinegar · 6 pcs', 8500, 'steam', { img: '1762418967889-10abec43c325', tags: ['signature'] }),
      M('steamed', 'Char siu bao', '叉烧包', 'BBQ pork buns · 3 pcs', 5500, 'steam', { img: '1602143249253-9805c88841ac' }),
      M('steamed', 'Chili oil wontons', '红油抄手', 'Sichuan chili oil, black vinegar · 8 pcs', 6000, 'steam', { img: '1769773662105-bf0b664921d6', heat: 2, opts: ['chili'] }),
      M('steamed', 'Cheung fun', '肠粉', 'Rice noodle rolls with shrimp, sweet soy', 7000, 'steam'),
      M('fried', 'Spring rolls', '春卷', 'Pork and vegetable · 4 pcs', 5000, 'fry', { img: '1695712641569-05eee7b37b6d' }),
      M('fried', 'Taro puffs', '芋角', 'Crisp taro, savoury pork filling · 3 pcs', 5500, 'fry'),
      M('rice', 'Yangzhou fried rice', '扬州炒饭', 'Char siu, shrimp, egg', 9500, 'wok', { img: '1512058564366-18510be2db19' }),
      M('rice', 'Beef chow fun', '干炒牛河', 'Wok-fried flat rice noodles', 11000, 'wok'),
      M('sweet', 'Egg tarts', '蛋挞', 'Flaky pastry, silky custard · 3 pcs', 4500, 'fry', { img: '1637273483570-10e72651892e', tags: ['veg'] }),
      M('sweet', 'Mango pudding', '芒果布丁', 'With evaporated milk', 4000, 'fry', { tags: ['veg'] }),
    ];
    const tables = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, seats: [4, 4, 6, 4, 8, 10, 4, 2, 6, 4, 12, 4][i], session: null }));
    const now = Date.now(), find = (name) => menu.find((d) => d.name === name);
    const seat = (n, minsAgo, adults, kids, tea) => { tables[n - 1].session = { id: Kit.uid(), start: now - minsAgo * 6e4, adults, kids, tier: null, tea, rounds: 0, bill: false }; return tables[n - 1].session; };
    const tickets = [], order = (s, n, minsAgo, status, items) => { s.rounds++; tickets.push({ id: Kit.uid(), table: n, session: s.id, round: s.rounds, ts: now - minsAgo * 6e4, status, items: items.map(([name, qty]) => { const d = find(name); return { mid: d.id, name, qty, opts: [], price: d.price, free: false, station: d.station, note: '', done: status === 'served' }; }) }); };
    const a = seat(5, 41, 6, 2, 'Pu-erh'); order(a, 5, 38, 'served', [['Har gow', 2], ['Siu mai', 2], ['Char siu bao', 2]]); order(a, 5, 7, 'cooking', [['Xiao long bao', 2], ['Spring rolls', 1], ['Yangzhou fried rice', 1]]);
    const b = seat(11, 18, 10, 0, 'Jasmine'); order(b, 11, 3, 'new', [['Har gow', 3], ['Cheung fun', 2], ['Taro puffs', 2], ['Beef chow fun', 2], ['Egg tarts', 3]]);
    const d0 = new Date().setHours(8, 0, 0, 0), bills = [[2, 48300, 3, 'KBZPay'], [7, 61950, 4, 'WavePay'], [9, 98700, 6, 'MPU •••• 0123'], [1, 31500, 2, 'Cash'], [6, 152250, 9, 'AYA Pay']]
      .map(([table, total, heads, method], i) => ({ id: Kit.uid(), table, total, heads, tier: null, method, ts: Math.min(now - 3 * 36e5, d0 + i * 45 * 6e4), dishes: { 'Har gow': heads, 'Xiao long bao': Math.ceil(heads / 2), 'Egg tarts': Math.ceil(heads / 3) } }));
    return { menu, tables, tickets, calls: [{ id: Kit.uid(), table: 5, kind: 'refill', ts: now - 60 * 1000, done: false }], bills, notes: [] };
  },
};
