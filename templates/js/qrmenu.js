/* TableTap — guest menu: browse, order to the kitchen, follow order status live, call a waiter and pay or split the bill.
   Data lives in qrmenu-data.js; staff see orders and calls instantly in qrmenu-admin.html. */
const $ = (id) => document.getElementById(id);
let table = +(new URLSearchParams(location.search).get('table') || 7), sec = 'All', cart = [];
if (!S.tables.some((t) => t.n === table)) table = 7;

$('table').innerHTML = S.tables.map((t) => `<option value="${t.n}" ${t.n === table ? 'selected' : ''}>Table ${t.n}</option>`).join('');
$('table').addEventListener('change', (e) => { table = +e.target.value; cart = []; history.replaceState(null, '', `?table=${table}`); renderPhone(); });

function renderPhone() {
  $('tbl-pill').textContent = `Table ${table}`;
  const secs = ['All', ...new Set(S.menu.map((d) => d.sec))];
  $('chips').innerHTML = secs.map((s) => `<button class="chip" aria-pressed="${s === sec}" data-s="${s}">${s}</button>`).join('');
  $('dishes').innerHTML = S.menu.filter((d) => sec === 'All' || d.sec === sec).map((d) => `<button class="dish" data-id="${d.id}" ${d.on ? '' : 'disabled'}>
    <div><h3>${Kit.esc(d.name)}${d.on ? (d.tag === 'pop' ? '<span class="tag t-pop">POPULAR</span>' : d.tag === 'veg' ? '<span class="tag t-veg">VEG</span>' : '') : '<span class="tag t-out">SOLD OUT</span>'}</h3><p>${Kit.esc(d.desc)}</p><b>${Kit.money(d.price)}</b></div>
    <img src="${U(d.img, 160, 160)}" alt="" loading="lazy"></button>`).join('');
  // Dishes that sold out while sitting in the cart are dropped
  const before = cart.length; cart = cart.filter((c) => item(c.mid) && item(c.mid).on); if (cart.length < before) Kit.toast('Sorry — something in your order just sold out and was removed', { type: 'error' });
  cart.forEach((c) => { c.price = item(c.mid).price; });
  const n = cart.reduce((a, c) => a + c.qty, 0), sum = cart.reduce((a, c) => a + c.qty * c.price, 0);
  $('send-l').textContent = n ? `Send ${n} item${n > 1 ? 's' : ''} to kitchen` : 'Add dishes';
  $('send-t').textContent = Kit.money(sum); $('send').disabled = !n;
  // My orders
  const mine = S.tickets.filter((t) => t.table === table).concat(S.served.filter((t) => t.table === table)).sort((a, b) => b.ts - a.ts), active = mine.filter((t) => t.status !== 'served').length;
  $('o-n').hidden = !active; $('o-n').textContent = active;
  const step = { new: 1, cook: 2, ready: 3, served: 4 };
  $('p-orders').innerHTML = `<ul class="mine">${mine.map((t) => `<li><span class="kit-badge st s-${t.status}">${STATUS_GUEST[t.status]}</span><b>${Kit.time(t.ts)}</b><div class="osteps">${['Received', 'Cooking', 'On its way', 'Served'].map((l, i) => `<i class="${i < step[t.status] ? 'on' : ''}" title="${l}"></i>`).join('')}</div>${t.items.map((i) => `<span class="oline ${i.done ? 'ok' : ''}">${i.qty}× ${Kit.esc(i.name)}${i.note ? ` <small>${Kit.esc(i.note)}</small>` : ''}</span>`).join('')}</li>`).join('') || '<li class="kit-empty-state">No orders yet for this table.</li>'}</ul>`;
  // Bill
  const all = tableItems(table), sub = all.reduce((a, i) => a + i.qty * i.price, 0), tb = S.tables.find((x) => x.n === table);
  $('p-bill').innerHTML = all.length ? `<div class="bill-sum">${all.map((i) => `<div><span>${i.qty}× ${Kit.esc(i.name)}</span><span>${Kit.money(i.qty * i.price)}</span></div>`).join('')}
    <div><span>Service (10%)</span><span>${Kit.money(sub * .1)}</span></div><div class="g"><span>Total</span><span>${Kit.money(sub * 1.1)}</span></div></div>
    <button class="send" id="pay" style="margin-top:6px"><span>Pay or split the bill</span><span>${Kit.money(sub * 1.1)}</span></button>${tb.bill ? '<p class="kit-hint" style="margin-top:10px">✓ A waiter is bringing the card machine.</p>' : ''}` : '<p class="kit-empty-state">Your bill is empty.</p>';
  const pay = $('pay'); if (pay) pay.onclick = () => payBill(sub * 1.1);
  const open = S.calls.find((c) => c.table === table && !c.done && c.kind === 'waiter');
  $('call').textContent = open ? '✓ Waiter on the way' : '🙋 Call waiter'; $('call').disabled = !!open;
  $('ask-bill').textContent = tb.bill ? '✓ Bill requested' : '🧾 Ask for the bill'; $('ask-bill').disabled = tb.bill || !all.length;
}
document.querySelector('.ptabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('.ptabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
  $('p-menu').style.display = b.dataset.p === 'menu' ? 'flex' : 'none';
  $('p-orders').hidden = b.dataset.p !== 'orders'; $('p-bill').hidden = b.dataset.p !== 'bill';
  document.querySelector('.cartbar').hidden = b.dataset.p !== 'menu';
});
const showTab = (p) => document.querySelector(`.ptabs [data-p=${p}]`).click();
$('chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { sec = b.dataset.s; renderPhone(); } });
$('dishes').addEventListener('click', (e) => {
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
    actions: [{ label: 'Cancel' }, { label: 'Add to order', primary: true, onClick: (dl) => {
      const opt = dl.querySelector('#opt button[aria-pressed="true"]')?.textContent;
      const note = [opt && opt !== 'Regular' ? opt : '', dl.querySelector('#note').value.trim()].filter(Boolean).join(' · ');
      cart.push({ mid: d.id, name: d.name, price: d.price, station: d.station, qty, note }); renderPhone();
      Kit.toast(`${qty}× ${d.name} added`);
    } }] });
});
$('send').addEventListener('click', () => {
  const t = { id: Kit.uid(), table, ts: Date.now(), status: 'new', items: cart.map((c) => ({ ...c, id: Kit.uid(), done: false })) };
  S.tickets.unshift(t); cart = [];
  Kit.notify(db, `Table ${table} ordered ${t.items.reduce((a, i) => a + i.qty, 0)} item${t.items.length > 1 ? 's' : ''}`, { table });
  renderPhone(); showTab('orders'); Kit.toast('Order sent — follow it live under “My orders”', { type: 'success' });
});
$('call').addEventListener('click', () => { S.calls.push({ id: Kit.uid(), table, kind: 'waiter', ts: Date.now(), done: false }); Kit.notify(db, `🙋 Table ${table} is calling a waiter`, { table }); renderPhone(); Kit.toast('A waiter is on the way', { type: 'success' }); });
$('ask-bill').addEventListener('click', () => { S.tables.find((x) => x.n === table).bill = true; S.calls.push({ id: Kit.uid(), table, kind: 'bill', ts: Date.now(), done: false }); Kit.notify(db, `🧾 Table ${table} asked for the bill`, { table }); renderPhone(); Kit.toast('Bill requested — or pay right here in the Bill tab', { type: 'success' }); });
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
      S.tables.find((x) => x.n === table).bill = false; S.calls.forEach((c) => { if (c.table === table) c.done = true; });
      Kit.notify(db, `💳 Table ${table} paid ${Kit.money(g)} on their phone (${tipPct}% tip)`, { table });
      renderPhone(); Kit.toast(`Paid ${Kit.money(g)} — thank you!`, { type: 'success' });
    } }] });
}

/* ---------- Live sync ---------- */
let statuses = JSON.stringify(S.tickets.filter((t) => t.table === table).map((t) => t.status));
Kit.sync(db, () => {
  renderPhone();
  const now = S.tickets.filter((t) => t.table === table);
  const ns = JSON.stringify(now.map((t) => t.status));
  if (ns !== statuses && now.some((t) => t.status === 'ready')) Kit.toast('🍽️ Your food is on its way!', { type: 'success', ms: 6000 });
  else if (ns !== statuses && now.some((t) => t.status === 'cook')) Kit.toast('👩‍🍳 The kitchen started on your order');
  statuses = ns;
});
renderPhone();
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Clears test orders for both the guest menu and staff panel.', 'Reset')) db.reset(); });
Kit.commands([{ label: 'Menu', run: () => showTab('menu') }, { label: 'My orders', run: () => showTab('orders') }, { label: 'Bill', run: () => showTab('bill') }, { label: 'Call a waiter', run: () => $('call').click() }, { label: 'Staff sign-in', run: () => { location.href = 'qrmenu-admin.html'; } }]);
if (Kit.THUMB) { cart = [{ mid: S.menu[2].id, name: 'Grill platter', price: 28, station: 'kitchen', qty: 1, note: '' }, { mid: S.menu[5].id, name: 'Iced latte', price: 4.5, station: 'bar', qty: 2, note: '' }]; renderPhone(); }
