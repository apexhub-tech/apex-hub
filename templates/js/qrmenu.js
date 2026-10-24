/* TableTap — behaviour */
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
  return { menu, tickets, tables, served: [], sales: 412.5, times: [11, 14, 9, 17, 12] };
}
const db = Kit.store('tabletap', seed), S = db.data, save = () => db.save();
const item = (id) => S.menu.find((x) => x.id === id);
let table = 7, sec = 'All', station = 'all', cart = [], lastBumped = null;

/* ---------- Guest phone ---------- */
document.getElementById('table').innerHTML = S.tables.map((t) => `<option value="${t.n}" ${t.n === table ? 'selected' : ''}>Table ${t.n}</option>`).join('');
document.getElementById('table').addEventListener('change', (e) => { table = +e.target.value; cart = []; renderPhone(); });
function renderPhone() {
  const secs = ['All', ...new Set(S.menu.map((d) => d.sec))];
  document.getElementById('chips').innerHTML = secs.map((s) => `<button class="chip" aria-pressed="${s === sec}" data-s="${s}">${s}</button>`).join('');
  document.getElementById('dishes').innerHTML = S.menu.filter((d) => sec === 'All' || d.sec === sec).map((d) => `<button class="dish" data-id="${d.id}" ${d.on ? '' : 'disabled'}>
    <div><h3>${Kit.esc(d.name)}${d.on ? (d.tag === 'pop' ? '<span class="tag t-pop">POPULAR</span>' : d.tag === 'veg' ? '<span class="tag t-veg">VEG</span>' : '') : '<span class="tag t-out">SOLD OUT</span>'}</h3><p>${Kit.esc(d.desc)}</p><b>${Kit.money(d.price)}</b></div>
    <img src="${U(d.img, 160, 160)}" alt="" loading="lazy"></button>`).join('');
  const n = cart.reduce((a, c) => a + c.qty, 0), sum = cart.reduce((a, c) => a + c.qty * c.price, 0);
  document.getElementById('send-l').textContent = n ? `Send ${n} item${n > 1 ? 's' : ''} to kitchen` : 'Add dishes';
  document.getElementById('send-t').textContent = Kit.money(sum);
  document.getElementById('send').disabled = !n;
  // My orders
  const mine = S.tickets.filter((t) => t.table === table).concat(S.served.filter((t) => t.table === table));
  const label = { new: 'Received', cook: 'Being prepared', ready: 'On its way', served: 'Served' };
  document.getElementById('p-orders').innerHTML = `<ul class="mine">${mine.map((t) => `<li><span class="kit-badge st s-${t.status}">${label[t.status]}</span><b>${Kit.time(t.ts)}</b><br>${t.items.map((i) => `${i.qty}× ${Kit.esc(i.name)}`).join('<br>')}</li>`).join('') || '<li class="kit-empty-state">No orders yet for this table.</li>'}</ul>`;
  // Bill
  const all = mine.flatMap((t) => t.items), sub = all.reduce((a, i) => a + i.qty * i.price, 0);
  document.getElementById('p-bill').innerHTML = all.length ? `<div class="bill-sum">${all.map((i) => `<div><span>${i.qty}× ${Kit.esc(i.name)}</span><span>${Kit.money(i.qty * i.price)}</span></div>`).join('')}
    <div><span>Service (10%)</span><span>${Kit.money(sub * .1)}</span></div><div class="g"><span>Total</span><span>${Kit.money(sub * 1.1)}</span></div></div>
    <button class="send" id="pay" style="margin-top:6px"><span>Pay or split the bill</span><span>${Kit.money(sub * 1.1)}</span></button>` : '<p class="kit-empty-state">Your bill is empty.</p>';
  const pay = document.getElementById('pay'); if (pay) pay.onclick = () => payBill(sub * 1.1);
}
document.querySelector('.ptabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('.ptabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
  document.getElementById('p-menu').style.display = b.dataset.p === 'menu' ? 'flex' : 'none';
  document.getElementById('p-orders').hidden = b.dataset.p !== 'orders'; document.getElementById('p-bill').hidden = b.dataset.p !== 'bill';
  document.querySelector('.cartbar').hidden = b.dataset.p !== 'menu';
});
document.getElementById('chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { sec = b.dataset.s; renderPhone(); } });
document.getElementById('dishes').addEventListener('click', (e) => {
  const b = e.target.closest('.dish'); if (!b || b.disabled) return;
  const d = item(b.dataset.id); let qty = 1;
  const extra = d.sec === 'Mains' ? `<div class="kit-field"><span class="kit-label">Cooking</span><div class="kit-seg" id="opt"><button type="button" aria-pressed="false">Mild</button><button type="button" aria-pressed="true">Regular</button><button type="button" aria-pressed="false">Spicy</button></div></div>` : '';
  Kit.modal({ title: d.name, body: `<img src="${U(d.img, 600, 300)}" alt="" style="width:100%;border-radius:12px;aspect-ratio:2;object-fit:cover"><p>${Kit.esc(d.desc)}</p>${extra}
    <div class="kit-field"><label for="note">Note for the kitchen</label><input id="note" placeholder="Allergies, no onion…" maxlength="60"></div>
    <div class="kit-seg" style="align-items:center"><button type="button" id="minus" aria-label="Less">−</button><b id="qty" style="min-width:24px;text-align:center">1</b><button type="button" id="plus" aria-label="More">+</button></div>`,
    onOpen: (dl) => {
      dl.querySelector('#plus').onclick = () => { qty++; dl.querySelector('#qty').textContent = qty; };
      dl.querySelector('#minus').onclick = () => { qty = Math.max(1, qty - 1); dl.querySelector('#qty').textContent = qty; };
      dl.querySelector('#opt')?.addEventListener('click', (ev) => { const o = ev.target.closest('button'); if (o) dl.querySelectorAll('#opt button').forEach((x) => x.setAttribute('aria-pressed', x === o)); });
    },
    actions: [{ label: 'Cancel' }, { label: `Add to order`, primary: true, onClick: (dl) => {
      const opt = dl.querySelector('#opt button[aria-pressed="true"]')?.textContent;
      const note = [opt && opt !== 'Regular' ? opt : '', dl.querySelector('#note').value.trim()].filter(Boolean).join(' · ');
      cart.push({ mid: d.id, name: d.name, price: d.price, station: d.station, qty, note }); renderPhone();
      Kit.toast(`${qty}× ${d.name} added`);
    } }] });
});
document.getElementById('send').addEventListener('click', () => {
  const t = { id: Kit.uid(), table, ts: Date.now(), status: 'new', items: cart.map((c) => ({ ...c, id: Kit.uid(), done: false })) };
  S.tickets.unshift(t); cart = []; save(); renderAll();
  Kit.toast(`Order sent to the kitchen for table ${table}`, { type: 'success' });
});
function payBill(total) {
  let people = 1, tipPct = 10;
  Kit.modal({ title: `Table ${table} · Pay the bill`, body: `
    <div class="kit-field"><span class="kit-label">Split between</span><div class="kit-seg" id="ppl">${[1, 2, 3, 4].map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === 1}">${n === 1 ? 'Just me' : n + ' people'}</button>`).join('')}</div></div>
    <div class="kit-field"><span class="kit-label">Add a tip for the team</span><div class="kit-seg" id="tip">${[0, 10, 15].map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === 10}">${n ? n + '%' : 'No tip'}</button>`).join('')}</div></div>
    <div class="pay-total" style="text-align:center"><b id="each" style="font-size:34px;display:block"></b><span class="kit-hint" id="each-l"></span></div>`,
    onOpen: (d) => {
      const upd = () => { const g = total * (1 + tipPct / 100); d.querySelector('#each').textContent = Kit.money(g / people); d.querySelector('#each-l').textContent = people > 1 ? `each · ${Kit.money(g)} total` : `total incl. ${tipPct}% tip`; };
      const seg = (id, set) => d.querySelector(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; d.querySelectorAll(id + ' button').forEach((x) => x.setAttribute('aria-pressed', x === b)); set(+b.dataset.n); upd(); });
      seg('#ppl', (n) => { people = n; }); seg('#tip', (n) => { tipPct = n; }); upd();
    },
    actions: [{ label: 'Cancel' }, { label: 'Pay with card / Apple Pay', primary: true, onClick: () => {
      const g = total * (1 + tipPct / 100);
      S.sales += g; S.served = S.served.filter((t) => t.table !== table); S.tickets = S.tickets.filter((t) => t.table !== table);
      const tb = S.tables.find((x) => x.n === table); tb.bill = false; save(); renderAll();
      Kit.toast(`Paid ${Kit.money(g)} — thank you!`, { type: 'success' });
    } }] });
}

/* ---------- Kitchen display ---------- */
const elapsed = (ts) => { const s = Math.floor((Date.now() - ts) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function renderKDS() {
  const list = S.tickets.filter((t) => station === 'all' || t.items.some((i) => i.station === station)).sort((a, b) => a.ts - b.ts);
  document.getElementById('tickets').innerHTML = list.map((t) => {
    const mins = (Date.now() - t.ts) / 6e4, cls = t.status === 'ready' ? 'ready' : mins > 15 ? 'late' : mins > 8 ? 'warn' : '';
    const items = t.items.filter((i) => station === 'all' || i.station === station);
    const next = { new: 'Start cooking', cook: 'Mark ready', ready: 'Served — bump' }[t.status];
    return `<article class="ticket ${cls}" data-t="${t.id}"><div class="t-h"><div><b>Table ${t.table}</b><small>${{ new: 'New', cook: 'Cooking', ready: 'Ready for pickup' }[t.status]} · ${Kit.time(t.ts)}</small></div><span class="timer" data-ts="${t.ts}">${elapsed(t.ts)}</span></div>
      <ul>${items.map((i) => `<li class="${i.done ? 'done' : ''}"><button data-i="${i.id}"><b>${i.qty}×</b><span>${Kit.esc(i.name)}</span>${i.note ? `<small>${Kit.esc(i.note)}</small>` : ''}${station === 'all' ? `<span class="stn">${i.station}</span>` : ''}</button></li>`).join('')}</ul>
      <button class="bump" data-bump="${t.id}">${next}</button></article>`;
  }).join('') || '<p class="kds-empty">All caught up — no open tickets.</p>';
  const open = S.tickets.length, avg = S.times.length ? Math.round(S.times.reduce((a, b) => a + b, 0) / S.times.length) : 0;
  document.getElementById('kds-sub').textContent = `${open} open · ${S.tickets.filter((t) => (Date.now() - t.ts) / 6e4 > 15 && t.status !== 'ready').length} running late`;
  document.getElementById('st-open').textContent = open; document.getElementById('st-avg').textContent = avg ? avg + ' min' : '—'; document.getElementById('st-sales').textContent = Kit.money(S.sales);
}
document.getElementById('tickets').addEventListener('click', (e) => {
  const it = e.target.closest('[data-i]');
  if (it) { const t = S.tickets.find((x) => x.id === it.closest('.ticket').dataset.t); const i = t.items.find((x) => x.id === it.dataset.i); i.done = !i.done; if (t.status === 'new') t.status = 'cook'; if (t.items.every((x) => x.done)) t.status = 'ready'; save(); renderAll(); return; }
  const b = e.target.closest('[data-bump]'); if (!b) return;
  const t = S.tickets.find((x) => x.id === b.dataset.bump);
  if (t.status === 'new') t.status = 'cook';
  else if (t.status === 'cook') { t.status = 'ready'; t.items.forEach((i) => { i.done = true; }); }
  else {
    S.tickets = S.tickets.filter((x) => x !== t); t.status = 'served'; S.served.push(t); S.times.push(Math.max(1, Math.round((Date.now() - t.ts) / 6e4)));
    lastBumped = t; Kit.toast(`Table ${t.table} served`, { undo: recall });
  }
  save(); renderAll();
});
function recall() { if (!lastBumped) { Kit.toast('Nothing to recall'); return; } S.served = S.served.filter((x) => x !== lastBumped); lastBumped.status = 'ready'; S.tickets.push(lastBumped); S.times.pop(); lastBumped = null; save(); renderAll(); }
document.getElementById('recall').addEventListener('click', recall);
document.querySelector('.stations').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('.stations button').forEach((x) => x.setAttribute('aria-pressed', x === b)); station = b.dataset.s; renderKDS(); });
setInterval(() => document.querySelectorAll('.timer').forEach((el) => {
  el.textContent = elapsed(+el.dataset.ts);
  const t = el.closest('.ticket'), m = (Date.now() - +el.dataset.ts) / 6e4;
  if (!t.classList.contains('ready')) { t.classList.toggle('warn', m > 8 && m <= 15); t.classList.toggle('late', m > 15); }
}), 1000);

/* ---------- Tables ---------- */
function tableState(n) {
  const t = S.tables.find((x) => x.n === n), open = S.tickets.filter((x) => x.table === n), served = S.served.filter((x) => x.table === n);
  if (t.bill) return ['bill', 'Bill requested'];
  if (open.length) return ['ordering', `${open.length} ticket${open.length > 1 ? 's' : ''} in kitchen`];
  if (served.length) return ['eating', 'Eating'];
  return ['free', 'Free'];
}
function renderTables() {
  document.getElementById('floor').innerHTML = S.tables.map((t) => { const [c, l] = tableState(t.n); return `<button class="tbl ${c}" data-n="${t.n}"><b>${t.n}</b><span>${t.seats} seats</span><span>${l}</span></button>`; }).join('');
}
document.getElementById('floor').addEventListener('click', (e) => {
  const b = e.target.closest('.tbl'); if (!b) return;
  const n = +b.dataset.n, t = S.tables.find((x) => x.n === n), items = S.tickets.concat(S.served).filter((x) => x.table === n).flatMap((x) => x.items), sum = items.reduce((a, i) => a + i.qty * i.price, 0) * 1.1;
  Kit.modal({ title: `Table ${n} · ${t.seats} seats`, body: items.length ? `<div class="bill-sum">${items.map((i) => `<div><span>${i.qty}× ${Kit.esc(i.name)}</span><span>${Kit.money(i.qty * i.price)}</span></div>`).join('')}<div class="g"><span>Total incl. service</span><span>${Kit.money(sum)}</span></div></div>` : '<p>No orders on this table.</p>',
    actions: [{ label: 'Open on guest phone', onClick: () => { table = n; document.getElementById('table').value = n; location.hash = '#/live'; renderPhone(); } },
      ...(items.length ? [{ label: `Mark paid ${Kit.money(sum)}`, primary: true, onClick: () => { S.sales += sum; S.tickets = S.tickets.filter((x) => x.table !== n); S.served = S.served.filter((x) => x.table !== n); t.bill = false; save(); renderAll(); Kit.toast(`Table ${n} paid and cleared`, { type: 'success' }); } }] : [])] });
});

/* ---------- Menu manager ---------- */
function renderMenu() {
  document.getElementById('mrows').innerHTML = S.menu.map((d) => `<tr><td><img src="${U(d.img, 88, 88)}" alt="" loading="lazy"><b>${Kit.esc(d.name)}</b></td><td>${d.sec}</td><td>${d.station === 'bar' ? 'Bar' : 'Kitchen'}</td>
    <td><input type="number" min="0.5" step="0.5" value="${d.price}" data-price="${d.id}" aria-label="${Kit.esc(d.name)} price"></td>
    <td><input type="checkbox" class="switch" data-on="${d.id}" ${d.on ? 'checked' : ''} aria-label="${Kit.esc(d.name)} available"></td></tr>`).join('');
}
document.getElementById('mrows').addEventListener('change', (e) => {
  const on = e.target.closest('[data-on]'); if (on) { const d = item(on.dataset.on); d.on = on.checked; save(); renderAll(); Kit.toast(d.on ? `${d.name} is back on the menu` : `${d.name} marked sold out`); }
  const p = e.target.closest('[data-price]'); if (p && +p.value > 0) { item(p.dataset.price).price = +p.value; save(); renderPhone(); Kit.toast('Price updated'); }
});

function renderAll() { renderPhone(); renderKDS(); renderTables(); renderMenu(); }
renderAll();
const router = Kit.router('live');
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Clears your test orders and menu changes.', 'Reset')) db.reset(); });
['live', 'tables', 'menu'].forEach((v, i) => Kit.key(String(i + 1), () => router.go(v), `Go to ${v}`));
Kit.key('r', recall, 'Recall last bumped ticket');
Kit.commands([{ label: 'Go to Live service', hint: '1', run: () => router.go('live') }, { label: 'Go to Tables', hint: '2', run: () => router.go('tables') }, { label: 'Go to Menu manager', hint: '3', run: () => router.go('menu') },
  { label: 'Recall last ticket', hint: 'R', run: recall }, { label: 'Kitchen station only', run: () => document.querySelector('.stations [data-s=kitchen]').click() }, { label: 'Bar station only', run: () => document.querySelector('.stations [data-s=bar]').click() }]);
if (Kit.THUMB) { cart = [{ mid: S.menu[2].id, name: 'Grill platter', price: 28, station: 'kitchen', qty: 1, note: '' }, { mid: S.menu[5].id, name: 'Iced latte', price: 4.5, station: 'bar', qty: 2, note: '' }]; renderPhone(); }
