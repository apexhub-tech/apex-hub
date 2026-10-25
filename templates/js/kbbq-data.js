/* Seoul Ember — Korean BBQ buffet (Bangkok). Config for the QR restaurant engine. */
window.QR = {
  key: 'seoulember', name: 'Seoul Ember K-BBQ', short: 'Seoul Ember', localName: '서울 엠버 · Korean BBQ buffet', mark: '🔥', accent: '#E8452C',
  currency: 'THB', serviceRate: 0.10, taxRate: 0.07, taxLabel: 'VAT 7%', defaultTable: 6, guestUrl: 'kbbq.html', adminUrl: 'kbbq-admin.html',
  hero: '1780082755456-3a72460270ea',
  pitch: 'Scan, choose your buffet, grill — order every round from your phone.',
  welcome: 'Choose your buffet', thanks: '감사합니다! Thank you for grilling with us — see you again soon.',
  staff: { email: 'floor@seoulember.co.th', name: 'Ji-woo Park', role: 'Floor manager' },
  buffet: { minutes: 100, lastCall: 15, perRound: 3, kidsFactor: 0.5, tiers: [
    { id: 'classic', name: 'Classic', price: 499, color: '#9CA3AF', desc: 'Pork, chicken, banchan, stews' },
    { id: 'signature', name: 'Signature', price: 699, color: '#E8452C', desc: '+ Beef bulgogi, LA galbi, shrimp' },
    { id: 'hanwoo', name: 'Hanwoo Premium', price: 999, color: '#C9A227', desc: '+ Wagyu chadol, ribeye, bingsu' }] },
  categories: [['meat', 'BBQ meats'], ['sides', 'Sides & stews'], ['drinks', 'Drinks'], ['dessert', 'Dessert']],
  stations: { grill: 'Meat counter', kitchen: 'Kitchen', bar: 'Bar' },
  service: [['waiter', '🙋', 'Call staff'], ['grill', '🔥', 'Change grill'], ['water', '💧', 'Water refill']],
  options: { spice: { label: 'Spice level', def: 1, choices: [['Mild', 0], ['Medium 🌶', 0], ['Hot 🌶🌶', 0]] } },
  seed() {
    const M = (cat, name, local, desc, extra) => ({ id: Kit.uid(), cat, name, local, desc, price: 0, on: true, station: cat === 'drinks' ? 'bar' : cat === 'meat' ? 'grill' : 'kitchen', ...extra });
    const menu = [
      M('meat', 'Samgyeopsal pork belly', '삼겹살', 'Thick-cut pork belly, sesame salt and ssamjang', { tier: 0, img: '1677029969065-c9f4003a9ad5', tags: ['signature'] }),
      M('meat', 'Spicy pork bulgogi', '제육볶음', 'Gochujang-marinated pork shoulder', { tier: 0, heat: 2, img: '1773903447504-7408156f5502' }),
      M('meat', 'Chicken galbi', '닭갈비', 'Soy-garlic chicken thigh', { tier: 0 }),
      M('meat', 'Beef bulgogi', '불고기', 'Sweet soy beef with pear and onion', { tier: 1, img: '1772498181580-068f0744ad17' }),
      M('meat', 'LA galbi short ribs', 'LA 갈비', 'Cross-cut marinated beef short ribs', { tier: 1, img: '1759150595639-d128196ab6b3', tags: ['signature'] }),
      M('meat', 'Garlic butter shrimp', '새우구이', 'Head-on tiger prawns', { tier: 1, img: '1597577616046-acedbd9af8c8' }),
      M('meat', 'Wagyu chadol', '와규 차돌', 'Paper-thin wagyu brisket, 10-second grill', { tier: 2, img: '1709433420574-7e8b97952eed', tags: ['signature'] }),
      M('meat', 'Hanwoo ribeye', '한우 등심', 'Korean beef ribeye, sea salt', { tier: 2 }),
      M('sides', 'Banchan refill', '반찬', 'Kimchi, pickled radish, bean sprouts, fish cake', { tier: 0, img: '1708388064278-707e85eaddc0' }),
      M('sides', 'Lettuce & perilla wraps', '쌈', 'For wrapping grilled meat', { tier: 0, tags: ['veg'] }),
      M('sides', 'Kimchi jjigae', '김치찌개', 'Kimchi stew with pork and tofu', { tier: 0, heat: 2, img: '1760228865341-675704c22a5b' }),
      M('sides', 'Steamed egg', '계란찜', 'Fluffy egg custard in a hot pot', { tier: 0, tags: ['veg'] }),
      M('sides', 'Japchae', '잡채', 'Glass noodles, vegetables, sesame', { tier: 0, img: '1583032015879-e5022cb87c3b' }),
      M('sides', 'Tteokbokki', '떡볶이', 'Rice cakes in gochujang sauce', { tier: 0, heat: 2, img: '1747228469541-f0e7f56e7ec7', opts: ['spice'] }),
      M('sides', 'Bibimbap', '비빔밥', 'Rice, vegetables, egg, gochujang', { tier: 1, img: '1741295017668-c8132acd6fc0' }),
      M('drinks', 'Chamisul soju', '참이슬', '360 ml bottle', { price: 320, img: '1776241954969-55025a3f26ff' }),
      M('drinks', 'Cass beer', '카스', '500 ml bottle', { price: 150 }),
      M('drinks', 'Makgeolli', '막걸리', 'Sparkling rice wine, 750 ml', { price: 280 }),
      M('drinks', 'Soft drink', '', 'Coke, Sprite or soda water', { price: 45 }),
      M('drinks', 'Iced barley tea', '보리차', 'Free refills', { tier: 0 }),
      M('dessert', 'Vanilla soft serve', '', 'With honey crunch', { tier: 0 }),
      M('dessert', 'Injeolmi bingsu', '인절미 빙수', 'Shaved milk ice, roasted soybean, rice cake', { tier: 2 }),
    ];
    const tables = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, seats: [4, 4, 6, 2, 4, 4, 8, 4, 2, 6, 4, 4][i], session: null }));
    const now = Date.now(), find = (name) => menu.find((d) => d.name === name);
    const seat = (n, minsAgo, adults, kids, tier) => { tables[n - 1].session = { id: Kit.uid(), start: now - minsAgo * 6e4, adults, kids, tier, tea: null, rounds: 0, bill: false }; return tables[n - 1].session; };
    const tickets = [], order = (s, n, minsAgo, status, items) => { s.rounds++; tickets.push({ id: Kit.uid(), table: n, session: s.id, round: s.rounds, ts: now - minsAgo * 6e4, status, items: items.map(([name, qty]) => { const d = find(name); return { mid: d.id, name, qty, opts: [], price: d.tier != null ? 0 : d.price, free: d.tier != null, station: d.station, note: '', done: status === 'served' }; }) }); };
    const a = seat(2, 52, 4, 0, 'signature'); order(a, 2, 48, 'served', [['Samgyeopsal pork belly', 4], ['LA galbi short ribs', 4], ['Banchan refill', 2], ['Chamisul soju', 2]]); order(a, 2, 6, 'cooking', [['Beef bulgogi', 3], ['Garlic butter shrimp', 2], ['Kimchi jjigae', 1]]);
    const b = seat(5, 91, 2, 1, 'hanwoo'); order(b, 5, 85, 'served', [['Wagyu chadol', 3], ['Hanwoo ribeye', 2], ['Steamed egg', 1]]);
    const c = seat(8, 14, 6, 2, 'classic'); order(c, 8, 2, 'new', [['Samgyeopsal pork belly', 6], ['Spicy pork bulgogi', 4], ['Lettuce & perilla wraps', 2], ['Cass beer', 4]]);
    const d0 = new Date().setHours(11, 30, 0, 0), bills = [[3, 1650, 3, 'signature', 'PromptPay QR'], [9, 1150, 2, 'classic', 'Visa •••• 4242'], [1, 4820, 6, 'hanwoo', 'K PLUS'], [4, 1890, 3, 'signature', 'Cash']]
      .map(([table, total, heads, tier, method], i) => ({ id: Kit.uid(), table, total, heads, tier, method, ts: Math.min(now - 3 * 36e5, d0 + i * 40 * 6e4), dishes: { 'Samgyeopsal pork belly': heads * 2, 'Beef bulgogi': tier === 'classic' ? 0 : heads } }));
    return { menu, tables, tickets, calls: [{ id: Kit.uid(), table: 5, kind: 'grill', ts: now - 3 * 6e4, done: false }], bills, notes: [] };
  },
};
