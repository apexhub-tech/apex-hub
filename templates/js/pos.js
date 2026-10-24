/* Tally POS — behaviour */
const U = (id, w = 320, h = 240) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=65`;
const TAX = 0.10;
const COFFEE_MODS = { size: [['Small', 0], ['Medium', 0.5], ['Large', 1]], milk: [['Whole', 0], ['Oat', 0.6], ['Almond', 0.6], ['No milk', 0]], extra: [['Extra shot', 0.8], ['Vanilla syrup', 0.5], ['Decaf', 0]] };

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
  return { products, orders, cart: [], discount: null, customer: '', parked: [] };
}
const db = Kit.store('pos', seed);
const S = db.data;
const save = () => { db.save(); };
const prod = (id) => S.products.find((p) => p.id === id);
const nextNo = () => (S.orders.length ? Math.max(...S.orders.map((o) => o.no)) : 999) + 1;

/* ---------- Register ---------- */
let cat = 'All';
function renderCats() {
  const cats = ['All', ...new Set(S.products.map((p) => p.cat))];
  document.getElementById('cats').innerHTML = cats.map((c) => `<button class="cat" aria-pressed="${c === cat}" data-c="${Kit.esc(c)}">${Kit.esc(c)}</button>`).join('');
}
function renderItems() {
  const q = document.getElementById('q').value.toLowerCase();
  document.getElementById('items').innerHTML = S.products.filter((p) => p.active && (cat === 'All' || p.cat === cat) && p.name.toLowerCase().includes(q)).map((p) => {
    const stock = p.stock >= 999 ? '' : p.stock <= 0 ? '<span class="stock out">Sold out</span>' : p.stock <= 5 ? `<span class="stock low">${p.stock} left</span>` : '';
    return `<button class="item" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}><img src="${U(p.img)}" alt="" loading="lazy">${stock}<b>${Kit.esc(p.name)}</b><span class="p">${Kit.money(p.price)}</span></button>`;
  }).join('') || '<p class="kit-empty-state">No products match.</p>';
}
const lineTotal = (l) => l.qty * l.unit;
function totals() {
  const sub = S.cart.reduce((a, l) => a + lineTotal(l), 0);
  let disc = 0;
  if (S.discount) disc = S.discount.type === 'pct' ? sub * S.discount.value / 100 : Math.min(sub, S.discount.value);
  const tax = (sub - disc) * TAX;
  return { sub, disc, tax, total: sub - disc + tax };
}
function renderTicket() {
  document.getElementById('order-no').textContent = `Order #${nextNo()}`;
  document.getElementById('cust-btn').textContent = S.customer ? `Customer: ${S.customer}` : 'Add customer';
  document.getElementById('lines').innerHTML = S.cart.map((l, i) => `<li class="line"><b>${Kit.esc(l.name)}</b><span class="amt">${Kit.money(lineTotal(l))}</span>
    ${l.mods ? `<small>${Kit.esc(l.mods)}</small>` : ''}<div class="qty"><button data-q="-1" data-i="${i}" aria-label="Remove one ${Kit.esc(l.name)}">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}" aria-label="Add one ${Kit.esc(l.name)}">+</button><small style="margin-left:6px">${Kit.money(l.unit)} each</small></div></li>`).join('') || '<li class="empty">Tap a product to start an order.</li>';
  const t = totals();
  document.getElementById('t-sub').textContent = Kit.money(t.sub);
  document.getElementById('t-disc-row').hidden = !S.discount;
  if (S.discount) { document.getElementById('t-disc-lbl').textContent = `Discount (${S.discount.label})`; document.getElementById('t-disc').textContent = '−' + Kit.money(t.disc); }
  document.getElementById('t-tax').textContent = Kit.money(t.tax);
  document.getElementById('t-tot').textContent = Kit.money(t.total);
  const ch = document.getElementById('charge'); ch.textContent = `Charge ${Kit.money(t.total)}`; ch.disabled = !S.cart.length;
  document.getElementById('parked-n').textContent = S.parked.length ? `(${S.parked.length})` : '';
}
function addToCart(p, mods = '', extra = 0) {
  const inCart = S.cart.filter((l) => l.pid === p.id).reduce((a, l) => a + l.qty, 0);
  if (p.stock < 999 && inCart >= p.stock) { Kit.toast(`Only ${p.stock} ${p.name} in stock`, { type: 'error' }); return; }
  const key = p.id + '|' + mods;
  const l = S.cart.find((x) => x.key === key);
  if (l) l.qty++; else S.cart.push({ key, pid: p.id, name: p.name, unit: +(p.price + extra).toFixed(2), qty: 1, mods });
  save(); renderTicket();
}
function modifiers(p) {
  const seg = (name, opts, multi) => `<div class="kit-field"><span class="kit-label">${name}</span><div class="kit-seg" data-g="${name}" data-multi="${multi ? 1 : ''}">${opts.map(([o, pr], i) => `<button type="button" aria-pressed="${!multi && i === 1 ? 'true' : 'false'}" data-o="${o}" data-p="${pr}">${o}${pr ? ` +${Kit.money(pr)}` : ''}</button>`).join('')}</div></div>`;
  Kit.modal({ title: `${p.name} · ${Kit.money(p.price)}`, body: `<div class="mods">${seg('Size', COFFEE_MODS.size)}${seg('Milk', COFFEE_MODS.milk)}${seg('Extras', COFFEE_MODS.extra, true)}</div>`,
    onOpen: (d) => d.querySelectorAll('.kit-seg').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (g.dataset.multi) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      else g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    })),
    actions: [{ label: 'Cancel' }, { label: 'Add to order', primary: true, onClick: (d) => {
      const on = [...d.querySelectorAll('button[aria-pressed="true"]')];
      addToCart(p, on.map((b) => b.dataset.o).join(', '), on.reduce((a, b) => a + +b.dataset.p, 0));
    } }] });
}
document.getElementById('cats').addEventListener('click', (e) => { const b = e.target.closest('.cat'); if (!b) return; cat = b.dataset.c; renderCats(); renderItems(); });
document.getElementById('q').addEventListener('input', renderItems);
document.getElementById('items').addEventListener('click', (e) => { const b = e.target.closest('.item'); if (!b) return; const p = prod(b.dataset.id); p.mods ? modifiers(p) : addToCart(p); });
document.getElementById('lines').addEventListener('click', (e) => {
  const b = e.target.closest('[data-q]'); if (!b) return;
  const l = S.cart[+b.dataset.i], p = prod(l.pid);
  if (+b.dataset.q > 0) {
    const inCart = S.cart.filter((x) => x.pid === l.pid).reduce((a, x) => a + x.qty, 0);
    if (p && p.stock < 999 && inCart >= p.stock) { Kit.toast(`Only ${p.stock} in stock`, { type: 'error' }); return; }
    l.qty++;
  } else if (--l.qty <= 0) S.cart.splice(+b.dataset.i, 1);
  save(); renderTicket();
});
document.getElementById('clear').addEventListener('click', () => {
  if (!S.cart.length) return;
  const before = JSON.stringify([S.cart, S.discount, S.customer]);
  S.cart = []; S.discount = null; S.customer = ''; save(); renderTicket();
  Kit.toast('Order cleared', { undo: () => { [S.cart, S.discount, S.customer] = JSON.parse(before); save(); renderTicket(); } });
});
document.getElementById('cust-btn').addEventListener('click', () => {
  Kit.modal({ title: 'Customer', body: `<div class="kit-field"><label for="c-n">Name or phone</label><input id="c-n" value="${Kit.esc(S.customer)}" placeholder="e.g. Rami A."></div><p class="kit-hint">Customers earn loyalty points on every order.</p>`,
    onOpen: (d) => d.querySelector('#c-n').focus(),
    actions: [{ label: 'Remove', onClick: () => { S.customer = ''; save(); renderTicket(); } }, { label: 'Save', primary: true, onClick: (d) => { S.customer = d.querySelector('#c-n').value.trim(); save(); renderTicket(); } }] });
});
const CODES = { WELCOME10: { type: 'pct', value: 10, label: 'WELCOME10' }, STAFF20: { type: 'pct', value: 20, label: 'STAFF20' }, SAVE5: { type: 'amt', value: 5, label: 'SAVE5' } };
document.getElementById('disc-btn').addEventListener('click', () => {
  Kit.modal({ title: 'Apply a discount', body: `<div class="kit-field"><span class="kit-label">Quick discounts</span><div class="kit-seg" id="quick"><button type="button" data-v="5">5%</button><button type="button" data-v="10">10%</button><button type="button" data-v="15">15%</button><button type="button" data-v="25">25%</button></div></div>
    <div class="kit-field"><label for="code">Promo code</label><input id="code" placeholder="Try WELCOME10, STAFF20 or SAVE5" autocomplete="off"></div><p class="kit-hint" id="code-msg" role="alert"></p>`,
    onOpen: (d) => d.querySelector('#quick').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.discount = { type: 'pct', value: +b.dataset.v, label: b.dataset.v + '%' }; save(); renderTicket(); d.close(); Kit.toast(`${b.dataset.v}% discount applied`, { type: 'success' }); }),
    actions: [{ label: 'Remove discount', onClick: () => { S.discount = null; save(); renderTicket(); } }, { label: 'Apply code', primary: true, onClick: (d) => {
      const c = CODES[d.querySelector('#code').value.trim().toUpperCase()];
      if (!c) { d.querySelector('#code-msg').textContent = 'That code isn\'t valid. Check the spelling and try again.'; return false; }
      S.discount = { ...c }; save(); renderTicket(); Kit.toast(`Code ${c.label} applied`, { type: 'success' });
    } }] });
});
document.getElementById('park-btn').addEventListener('click', () => {
  if (S.cart.length) {
    S.parked.push({ cart: S.cart, discount: S.discount, customer: S.customer, ts: Date.now() });
    S.cart = []; S.discount = null; S.customer = ''; save(); renderTicket(); Kit.toast('Order parked — resume it any time');
    return;
  }
  if (!S.parked.length) { Kit.toast('No parked orders'); return; }
  Kit.modal({ title: 'Parked orders', body: `<ul class="rank">${S.parked.map((p, i) => `<li><span>${p.customer || 'Walk-in'} · ${p.cart.reduce((a, l) => a + l.qty, 0)} items · ${Kit.ago(p.ts)}</span><button type="button" class="link" data-i="${i}">Resume</button></li>`).join('')}</ul>`,
    onOpen: (d) => d.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const p = S.parked.splice(+b.dataset.i, 1)[0]; Object.assign(S, { cart: p.cart, discount: p.discount, customer: p.customer }); save(); renderTicket(); d.close(); }) });
});

/* ---------- Checkout ---------- */
function checkout() {
  if (!S.cart.length) return;
  const t = totals();
  let tip = 0, method = 'Card';
  Kit.modal({ title: 'Take payment', body: `
    <div class="pay-total"><b id="p-tot">${Kit.money(t.total)}</b><span id="p-sub">incl. ${Kit.money(t.tax)} tax</span></div>
    <div class="kit-field"><span class="kit-label">Tip</span><div class="kit-seg" id="tips">${[0, 10, 15, 20].map((p) => `<button type="button" data-t="${p}" aria-pressed="${p === 0}">${p ? p + '%' : 'No tip'}</button>`).join('')}</div></div>
    <div class="kit-field"><span class="kit-label">Payment method</span><div class="kit-seg" id="methods"><button type="button" aria-pressed="true" data-m="Card">Card / tap</button><button type="button" aria-pressed="false" data-m="Cash">Cash</button><button type="button" aria-pressed="false" data-m="Split">Split</button></div></div>
    <div id="cash" hidden><div class="kit-field"><label for="tender">Cash received</label><input id="tender" type="number" min="0" step="0.01" inputmode="decimal"></div><div class="kit-seg" id="quick-cash" style="margin-top:8px"></div><div class="change" id="change" style="margin-top:10px"></div></div>
    <div id="split" hidden><div class="kit-row"><div class="kit-field"><label for="sp-card">On card</label><input id="sp-card" type="number" min="0" step="0.01"></div><div class="kit-field"><label>On cash</label><input id="sp-cash" readonly></div></div></div>`,
    onOpen: (d) => {
      const grand = () => t.total + tip;
      const upd = () => {
        d.querySelector('#p-tot').textContent = Kit.money(grand());
        d.querySelector('#p-sub').textContent = `incl. ${Kit.money(t.tax)} tax${tip ? ` + ${Kit.money(tip)} tip` : ''}`;
        d.querySelector('#cash').hidden = method !== 'Cash'; d.querySelector('#split').hidden = method !== 'Split';
        const g = grand(), round = [Math.ceil(g), Math.ceil(g / 5) * 5, Math.ceil(g / 10) * 10, Math.ceil(g / 20) * 20].filter((v, i, a) => a.indexOf(v) === i);
        d.querySelector('#quick-cash').innerHTML = round.map((v) => `<button type="button" data-c="${v}">${Kit.money(v)}</button>`).join('');
        const ten = +d.querySelector('#tender').value || 0, ch = d.querySelector('#change');
        ch.className = 'change' + (ten < g ? ' short' : '');
        ch.innerHTML = ten < g ? `<span>Still due</span><span>${Kit.money(g - ten)}</span>` : `<span>Change due</span><span>${Kit.money(ten - g)}</span>`;
        const card = Math.min(+d.querySelector('#sp-card').value || 0, g); d.querySelector('#sp-cash').value = Kit.money(g - card);
      };
      d.querySelector('#tips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; d.querySelectorAll('#tips button').forEach((x) => x.setAttribute('aria-pressed', x === b)); tip = t.sub * +b.dataset.t / 100; upd(); });
      d.querySelector('#methods').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; d.querySelectorAll('#methods button').forEach((x) => x.setAttribute('aria-pressed', x === b)); method = b.dataset.m; upd(); });
      d.querySelector('#quick-cash').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; d.querySelector('#tender').value = b.dataset.c; upd(); });
      d.addEventListener('input', upd); upd();
    },
    actions: [{ label: 'Cancel' }, { label: 'Complete payment', primary: true, onClick: (d) => {
      const g = t.total + tip;
      if (method === 'Cash' && (+d.querySelector('#tender').value || 0) < g) { Kit.toast('Cash received is less than the total', { type: 'error' }); return false; }
      const tender = method === 'Cash' ? +d.querySelector('#tender').value : g;
      const o = { id: Kit.uid(), no: nextNo(), ts: Date.now(), items: S.cart.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, mods: l.mods, pid: l.pid })), sub: t.sub, disc: t.disc, tax: t.tax, tip, total: g, method, status: 'paid', customer: S.customer, tender };
      S.cart.forEach((l) => { const p = prod(l.pid); if (p && p.stock < 999) p.stock -= l.qty; });
      S.orders.push(o); S.cart = []; S.discount = null; S.customer = ''; save();
      renderAll(); receipt(o);
    } }] });
}
function receipt(o) {
  Kit.modal({ title: `Receipt · Order #${o.no}`, body: `<div class="receipt" id="rcpt"><div class="c"><b>TALLY CAFÉ</b><br>24 Harbour St · Main branch<br>${new Date(o.ts).toLocaleString()}</div><hr>
    ${o.items.map((i) => `<div class="r"><span>${i.qty}× ${Kit.esc(i.name)}${i.mods ? `<br>&nbsp;&nbsp;${Kit.esc(i.mods)}` : ''}</span><span>${Kit.money(i.qty * i.unit)}</span></div>`).join('')}<hr>
    <div class="r"><span>Subtotal</span><span>${Kit.money(o.sub)}</span></div>${o.disc ? `<div class="r"><span>Discount</span><span>−${Kit.money(o.disc)}</span></div>` : ''}
    <div class="r"><span>Tax</span><span>${Kit.money(o.tax)}</span></div>${o.tip ? `<div class="r"><span>Tip</span><span>${Kit.money(o.tip)}</span></div>` : ''}
    <div class="r"><b>TOTAL</b><b>${Kit.money(o.total)}</b></div><div class="r"><span>${o.method}</span><span>${Kit.money(o.tender || o.total)}</span></div>
    ${o.method === 'Cash' && o.tender > o.total ? `<div class="r"><span>Change</span><span>${Kit.money(o.tender - o.total)}</span></div>` : ''}
    ${o.status === 'refunded' ? '<hr><div class="c"><b>** REFUNDED **</b></div>' : ''}<hr><div class="c">Thank you! ${o.customer ? `+${Math.round(o.total)} points for ${Kit.esc(o.customer)}` : ''}</div></div>`,
    actions: [{ label: 'Print receipt', onClick: () => { window.print(); return false; } }, { label: 'Done', primary: true }] });
  if (o.status === 'paid' && Date.now() - o.ts < 3000) Kit.toast(`Payment of ${Kit.money(o.total)} complete`, { type: 'success' });
}
document.getElementById('charge').addEventListener('click', checkout);

/* ---------- Orders ---------- */
function renderOrders() {
  const q = document.getElementById('oq').value.toLowerCase(), st = document.getElementById('ostatus').value;
  const list = S.orders.slice().reverse().filter((o) => (st === 'all' || o.status === st) && (String(o.no).includes(q) || (o.customer || '').toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q))));
  document.getElementById('ord-sub').textContent = `${list.length} of ${S.orders.length} orders`;
  document.getElementById('orows').innerHTML = list.slice(0, 80).map((o) => `<tr><td><b>#${o.no}</b></td><td>${Kit.day(o.ts)} · ${Kit.time(o.ts)}</td>
    <td>${Kit.esc(o.items.map((i) => `${i.qty}× ${i.name}`).join(', '))}</td><td>${Kit.esc(o.customer || '—')}</td><td>${o.method}</td>
    <td><span class="kit-badge ${o.status === 'paid' ? 'ok' : 'bad'}">${o.status === 'paid' ? 'Paid' : 'Refunded'}</span></td><td class="r"><b>${Kit.money(o.total)}</b></td>
    <td class="r"><button class="link" data-view-o="${o.id}">Receipt</button>${o.status === 'paid' ? `<button class="link" style="color:var(--red)" data-refund="${o.id}">Refund</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="kit-empty-state">No orders match your search.</td></tr>';
}
document.getElementById('oq').addEventListener('input', renderOrders);
document.getElementById('ostatus').addEventListener('change', renderOrders);
document.getElementById('orows').addEventListener('click', async (e) => {
  const v = e.target.closest('[data-view-o]'); if (v) { receipt(S.orders.find((o) => o.id === v.dataset.viewO)); return; }
  const r = e.target.closest('[data-refund]'); if (!r) return;
  const o = S.orders.find((x) => x.id === r.dataset.refund);
  if (!(await Kit.confirm(`Refund order #${o.no}?`, `${Kit.money(o.total)} will be returned by ${o.method.toLowerCase()} and the items restocked.`, `Refund ${Kit.money(o.total)}`))) return;
  o.status = 'refunded';
  o.items.forEach((i) => { const p = i.pid && prod(i.pid); if (p && p.stock < 999) p.stock += i.qty; });
  save(); renderAll(); Kit.toast(`Order #${o.no} refunded`, { type: 'success' });
});
document.getElementById('export').addEventListener('click', () => Kit.csv('tally-orders.csv', [['Order', 'Date', 'Items', 'Customer', 'Payment', 'Status', 'Subtotal', 'Discount', 'Tax', 'Tip', 'Total'],
  ...S.orders.map((o) => [o.no, new Date(o.ts).toISOString(), o.items.map((i) => `${i.qty}x ${i.name}`).join('; '), o.customer, o.method, o.status, o.sub.toFixed(2), o.disc.toFixed(2), o.tax.toFixed(2), o.tip.toFixed(2), o.total.toFixed(2)])]));

/* ---------- Inventory ---------- */
let lowOnly = false;
function renderInventory() {
  const q = document.getElementById('iq').value.toLowerCase();
  const tracked = S.products.filter((p) => p.stock < 999), low = tracked.filter((p) => p.stock <= 5);
  document.getElementById('inv-sub').textContent = `${S.products.length} products · ${low.length} need restocking`;
  const badge = document.getElementById('low-badge'); badge.hidden = !low.length; badge.textContent = low.length;
  document.getElementById('irows').innerHTML = S.products.filter((p) => p.name.toLowerCase().includes(q) && (!lowOnly || (p.stock < 999 && p.stock <= 5))).map((p) => {
    const st = p.stock >= 999 ? ['neutral', 'Not tracked'] : p.stock <= 0 ? ['bad', 'Out of stock'] : p.stock <= 5 ? ['warn', 'Low stock'] : ['ok', 'In stock'];
    return `<tr><td><img class="thumb" src="${U(p.img, 80, 80)}" alt="" loading="lazy"><b>${Kit.esc(p.name)}</b></td><td>${Kit.esc(p.cat)}</td><td class="r">${Kit.money(p.price)}</td>
    <td>${p.stock >= 999 ? '—' : `<span class="stepper"><button data-s="-1" data-id="${p.id}" aria-label="Decrease stock">−</button><b>${p.stock}</b><button data-s="1" data-id="${p.id}" aria-label="Increase stock">+</button></span>`}</td>
    <td><span class="kit-badge ${st[0]}">${st[1]}</span></td><td><input type="checkbox" class="switch" data-act="${p.id}" ${p.active ? 'checked' : ''} aria-label="${Kit.esc(p.name)} on sale"></td>
    <td class="r"><button class="link" data-edit="${p.id}">Edit</button>${p.stock < 999 ? `<button class="link" data-restock="${p.id}">Restock</button>` : ''}</td></tr>`;
  }).join('') || '<tr><td colspan="7" class="kit-empty-state">Nothing here — all stock levels look healthy.</td></tr>';
}
document.getElementById('iq').addEventListener('input', renderInventory);
document.getElementById('low-only').addEventListener('click', (e) => { lowOnly = !lowOnly; e.currentTarget.setAttribute('aria-pressed', lowOnly); e.currentTarget.classList.toggle('primary', lowOnly); renderInventory(); });
document.getElementById('irows').addEventListener('click', (e) => {
  const s = e.target.closest('[data-s]'); if (s) { const p = prod(s.dataset.id); p.stock = Math.max(0, p.stock + +s.dataset.s); save(); renderAll(); return; }
  const r = e.target.closest('[data-restock]'); if (r) { const p = prod(r.dataset.restock); const was = p.stock; p.stock += 24; save(); renderAll(); Kit.toast(`+24 ${p.name} received`, { type: 'success', undo: () => { p.stock = was; save(); renderAll(); } }); return; }
  const ed = e.target.closest('[data-edit]'); if (ed) productForm(prod(ed.dataset.edit));
});
document.getElementById('irows').addEventListener('change', (e) => { const a = e.target.closest('[data-act]'); if (!a) return; prod(a.dataset.act).active = a.checked; save(); renderAll(); Kit.toast(a.checked ? 'Product is back on sale' : 'Product hidden from the register'); });
function productForm(p) {
  const cats = [...new Set(S.products.map((x) => x.cat))];
  Kit.modal({ title: p ? `Edit ${p.name}` : 'Add product', body: `
    <div class="kit-field"><label for="pf-n">Name</label><input id="pf-n" required value="${Kit.esc(p?.name || '')}"></div>
    <div class="kit-row"><div class="kit-field"><label for="pf-p">Price</label><input id="pf-p" type="number" min="0.1" step="0.05" required value="${p?.price ?? ''}"></div>
    <div class="kit-field"><label for="pf-c">Category</label><select id="pf-c">${cats.map((c) => `<option ${c === p?.cat ? 'selected' : ''}>${Kit.esc(c)}</option>`).join('')}</select></div></div>
    <div class="kit-row"><div class="kit-field"><label for="pf-s">Stock</label><input id="pf-s" type="number" min="0" value="${p ? (p.stock >= 999 ? '' : p.stock) : 20}" placeholder="Leave empty to not track"></div>
    <div class="kit-field"><label for="pf-m">Drink options</label><select id="pf-m"><option value="0">None</option><option value="1" ${p?.mods ? 'selected' : ''}>Size, milk &amp; extras</option></select></div></div>`,
    onOpen: (d) => d.querySelector('#pf-n').focus(),
    actions: [...(p ? [{ label: 'Delete', danger: true, onClick: () => { const i = S.products.indexOf(p); S.products.splice(i, 1); save(); renderAll(); Kit.toast(`${p.name} deleted`, { undo: () => { S.products.splice(i, 0, p); save(); renderAll(); } }); } }] : []),
      { label: 'Cancel' }, { label: p ? 'Save changes' : 'Add product', primary: true, submit: true, onClick: (d) => {
        const v = (id) => d.querySelector(id).value;
        const data = { name: v('#pf-n').trim(), price: +v('#pf-p'), cat: v('#pf-c'), stock: v('#pf-s') === '' ? 999 : +v('#pf-s'), mods: v('#pf-m') === '1' };
        if (p) Object.assign(p, data); else S.products.push({ id: Kit.uid(), img: '1514432324607-a09d9b4aefdd', active: true, ...data });
        save(); renderAll(); Kit.toast(p ? 'Product updated' : `${data.name} added`, { type: 'success' });
      } }] });
}
document.getElementById('add-prod').addEventListener('click', () => productForm(null));

/* ---------- Reports ---------- */
function renderReports() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const today = S.orders.filter((o) => o.ts >= start.getTime()), paid = today.filter((o) => o.status === 'paid'), refunds = today.filter((o) => o.status === 'refunded');
  const sales = paid.reduce((a, o) => a + o.total, 0);
  const ystart = start.getTime() - 864e5, ysales = S.orders.filter((o) => o.ts >= ystart && o.ts < start.getTime() && o.status === 'paid').reduce((a, o) => a + o.total, 0);
  document.getElementById('k-sales').textContent = Kit.money(sales);
  const diff = ysales ? Math.round((sales / ysales - 1) * 100) : 0;
  const kd = document.getElementById('k-sales-d'); kd.textContent = `${diff >= 0 ? '+' : ''}${diff}% vs yesterday`; kd.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('k-orders').textContent = paid.length;
  document.getElementById('k-avg').textContent = Kit.money(paid.length ? sales / paid.length : 0);
  document.getElementById('k-ref').textContent = Kit.money(refunds.reduce((a, o) => a + o.total, 0));
  document.getElementById('k-ref-n').textContent = `${refunds.length} refunded`;
  const hours = []; for (let h = 7; h <= 21; h++) hours.push({ label: h + ':00', value: paid.filter((o) => new Date(o.ts).getHours() === h).reduce((a, o) => a + o.total, 0) });
  Kit.bars(document.getElementById('ch-hour'), hours.filter((_, i) => i % 1 === 0), { format: Kit.money });
  const week = []; for (let d = 6; d >= 0; d--) { const s = start.getTime() - d * 864e5; week.push({ label: new Date(s).toLocaleDateString('en-GB', { weekday: 'short' }), value: S.orders.filter((o) => o.ts >= s && o.ts < s + 864e5 && o.status === 'paid').reduce((a, o) => a + o.total, 0) }); }
  Kit.line(document.getElementById('ch-week'), week, { format: Kit.money });
  const tally = {}; paid.forEach((o) => o.items.forEach((i) => { tally[i.name] = (tally[i.name] || 0) + i.qty; }));
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6), max = top[0]?.[1] || 1;
  document.getElementById('top').innerHTML = top.map(([n, q]) => `<li><span>${Kit.esc(n)}</span><b>${q} sold</b><div class="bar"><i style="width:${q / max * 100}%"></i></div></li>`).join('') || '<li class="kit-empty-state">No sales yet today.</li>';
  const mix = {}; paid.forEach((o) => { mix[o.method] = (mix[o.method] || 0) + o.total; });
  document.getElementById('pay-mix').innerHTML = Object.entries(mix).map(([m, v]) => `<li><span>${m}</span><b>${Kit.money(v)} · ${Math.round(v / sales * 100)}%</b><div class="bar"><i style="width:${v / sales * 100}%"></i></div></li>`).join('') || '<li class="kit-empty-state">No payments yet.</li>';
}

function renderAll() { renderCats(); renderItems(); renderTicket(); renderOrders(); renderInventory(); renderReports(); }
renderAll();
const router = Kit.router('register', (v) => { if (v === 'reports') renderReports(); });
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo data?', 'This removes your test orders and product changes.', 'Reset')) db.reset(); });

Kit.key('/', () => { router.go('register'); setTimeout(() => document.getElementById('q').focus()); }, 'Search products');
Kit.key('c', checkout, 'Charge current order');
Kit.key('d', () => document.getElementById('disc-btn').click(), 'Apply discount');
['register', 'orders', 'inventory', 'reports'].forEach((v, i) => Kit.key(String(i + 1), () => router.go(v), `Go to ${v}`));
Kit.commands([
  { label: 'Go to Register', hint: '1', run: () => router.go('register') }, { label: 'Go to Orders', hint: '2', run: () => router.go('orders') },
  { label: 'Go to Inventory', hint: '3', run: () => router.go('inventory') }, { label: 'Go to Reports', hint: '4', run: () => router.go('reports') },
  { label: 'Charge current order', hint: 'C', run: checkout }, { label: 'Apply discount', hint: 'D', run: () => document.getElementById('disc-btn').click() },
  { label: 'Park / resume order', run: () => document.getElementById('park-btn').click() }, { label: 'Add product', run: () => { router.go('inventory'); productForm(null); } },
  { label: 'Export orders to CSV', run: () => document.getElementById('export').click() },
]);
if (Kit.THUMB) { addToCart(S.products[1], 'Medium, Oat', 1.1); addToCart(S.products[7]); }
