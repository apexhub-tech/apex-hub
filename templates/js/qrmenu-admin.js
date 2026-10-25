/* TableTap Staff — kitchen display, service calls, floor plan and menu manager.
   Shares its saved data with the guest menu (js/qrmenu-data.js) and updates live when guests order, call or pay. */
const $ = (id) => document.getElementById(id);
Kit.login({ app: 'TableTap', key: 'tabletap', email: 'floor@oliveandember.com', password: 'demo1234', name: 'Karim Saad', role: 'Floor manager · Olive & Ember', accent: '#FF6B2C', clientUrl: 'qrmenu.html', clientLabel: 'guest menu' });
const bell = Kit.bell($('tools'), db, { onOpen: (n) => router.go(/call|bill|paid/i.test(n.text) ? 'calls' : 'kitchen') });
Kit.userMenu($('tools'), { key: 'tabletap', clientUrl: 'qrmenu.html', clientLabel: 'guest menu' });
let station = 'all', lastBumped = null, known = new Set(S.tickets.map((t) => t.id));

/* ---------- Kitchen display ---------- */
const elapsed = (ts) => { const s = Math.floor((Date.now() - ts) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function renderKDS(fresh = new Set()) {
  const list = S.tickets.filter((t) => station === 'all' || t.items.some((i) => i.station === station)).sort((a, b) => a.ts - b.ts);
  $('tickets').innerHTML = list.map((t) => {
    const mins = (Date.now() - t.ts) / 6e4, cls = t.status === 'ready' ? 'ready' : mins > 15 ? 'late' : mins > 8 ? 'warn' : '';
    const items = t.items.filter((i) => station === 'all' || i.station === station);
    const next = { new: 'Start cooking', cook: 'Mark ready', ready: 'Served — bump' }[t.status];
    return `<article class="ticket ${cls} ${fresh.has(t.id) ? 'fresh' : ''}" data-t="${t.id}"><div class="t-h"><div><b>Table ${t.table}</b><small>${{ new: 'New', cook: 'Cooking', ready: 'Ready for pickup' }[t.status]} · ${Kit.time(t.ts)}</small></div><span class="timer" data-ts="${t.ts}">${elapsed(t.ts)}</span></div>
      <ul>${items.map((i) => `<li class="${i.done ? 'done' : ''}"><button data-i="${i.id}"><b>${i.qty}×</b><span>${Kit.esc(i.name)}</span>${i.note ? `<small>${Kit.esc(i.note)}</small>` : ''}${station === 'all' ? `<span class="stn">${i.station}</span>` : ''}</button></li>`).join('')}</ul>
      <button class="bump" data-bump="${t.id}">${next}</button></article>`;
  }).join('') || '<p class="kds-empty">All caught up — no open tickets.</p>';
  const open = S.tickets.length, avg = S.times.length ? Math.round(S.times.reduce((a, b) => a + b, 0) / S.times.length) : 0;
  $('kds-sub').textContent = `${open} open · ${S.tickets.filter((t) => (Date.now() - t.ts) / 6e4 > 15 && t.status !== 'ready').length} running late`;
  $('st-open').textContent = open; $('st-avg').textContent = avg ? avg + ' min' : '—'; $('st-sales').textContent = Kit.money(S.sales);
}
$('tickets').addEventListener('click', (e) => {
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
function recall() { if (!lastBumped) { Kit.toast('Nothing to recall'); return; } S.served = S.served.filter((x) => x.id !== lastBumped.id); lastBumped.status = 'ready'; S.tickets.push(lastBumped); S.times.pop(); lastBumped = null; save(); renderAll(); }
$('recall').addEventListener('click', recall);
document.querySelector('.stations').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('.stations button').forEach((x) => x.setAttribute('aria-pressed', x === b)); station = b.dataset.s; renderKDS(); });
setInterval(() => document.querySelectorAll('.timer').forEach((el) => {
  el.textContent = elapsed(+el.dataset.ts);
  const t = el.closest('.ticket'), m = (Date.now() - +el.dataset.ts) / 6e4;
  if (!t.classList.contains('ready')) { t.classList.toggle('warn', m > 8 && m <= 15); t.classList.toggle('late', m > 15); }
}), 1000);

/* ---------- Service calls ---------- */
function renderCalls() {
  const open = S.calls.filter((c) => !c.done).sort((a, b) => a.ts - b.ts);
  $('c-n').hidden = !open.length; $('c-n').textContent = open.length;
  $('calls').innerHTML = open.map((c) => `<li class="call ${c.kind}" data-c="${c.id}"><span class="ic">${c.kind === 'bill' ? '🧾' : '🙋'}</span><div><b>Table ${c.table}</b><small>${c.kind === 'bill' ? 'Asked for the bill' : 'Calling a waiter'} · ${Kit.ago(c.ts)}</small></div>${c.kind === 'bill' ? '<button class="recall dark" data-open>Open bill</button>' : ''}<button class="send small" data-done>Done</button></li>`).join('')
    || '<li class="kit-empty-state">No one is waiting. Calls from guests\' phones appear here instantly with a notification.</li>';
}
$('calls').addEventListener('click', (e) => {
  const li = e.target.closest('[data-c]'); if (!li) return; const c = S.calls.find((x) => x.id === li.dataset.c);
  if (e.target.closest('[data-done]')) { c.done = true; save(); renderAll(); Kit.toast(`Table ${c.table} handled`, { undo: () => { c.done = false; save(); renderAll(); } }); }
  if (e.target.closest('[data-open]')) openTable(c.table);
});

/* ---------- Tables ---------- */
function tableState(n) {
  const t = S.tables.find((x) => x.n === n), open = S.tickets.filter((x) => x.table === n), served = S.served.filter((x) => x.table === n);
  if (t.bill) return ['bill', 'Bill requested'];
  if (open.length) return ['ordering', `${open.length} ticket${open.length > 1 ? 's' : ''} in kitchen`];
  if (served.length) return ['eating', 'Eating'];
  return ['free', 'Free'];
}
function renderTables() {
  $('floor').innerHTML = S.tables.map((t) => { const [c, l] = tableState(t.n), call = S.calls.some((x) => x.table === t.n && !x.done && x.kind === 'waiter'); return `<button class="tbl ${c}" data-n="${t.n}"><b>${t.n}${call ? ' <span class="ring">🙋</span>' : ''}</b><span>${t.seats} seats</span><span>${l}</span></button>`; }).join('');
}
function openTable(n) {
  const t = S.tables.find((x) => x.n === n), items = tableItems(n), sum = items.reduce((a, i) => a + i.qty * i.price, 0) * 1.1;
  Kit.modal({ title: `Table ${n} · ${t.seats} seats`, body: (items.length ? `<div class="bill-sum">${items.map((i) => `<div><span>${i.qty}× ${Kit.esc(i.name)}</span><span>${Kit.money(i.qty * i.price)}</span></div>`).join('')}<div class="g"><span>Total incl. service</span><span>${Kit.money(sum)}</span></div></div>` : '<p>No orders on this table.</p>') + `<p class="kit-hint" style="margin-top:10px">QR link: <code>qrmenu.html?table=${n}</code></p>`,
    actions: [{ label: 'Open guest menu ↗', onClick: () => { window.open(`qrmenu.html?table=${n}`, '_blank'); } },
      ...(items.length ? [{ label: `Mark paid ${Kit.money(sum)}`, primary: true, onClick: () => { S.sales += sum; S.tickets = S.tickets.filter((x) => x.table !== n); S.served = S.served.filter((x) => x.table !== n); t.bill = false; S.calls.forEach((c) => { if (c.table === n) c.done = true; }); save(); renderAll(); Kit.toast(`Table ${n} paid and cleared`, { type: 'success' }); } }] : [])] });
}
$('floor').addEventListener('click', (e) => { const b = e.target.closest('.tbl'); if (b) openTable(+b.dataset.n); });

/* ---------- Menu manager ---------- */
function renderMenu() {
  $('mrows').innerHTML = S.menu.map((d) => `<tr><td><img src="${U(d.img, 88, 88)}" alt="" loading="lazy"><b>${Kit.esc(d.name)}</b></td><td>${d.sec}</td><td>${d.station === 'bar' ? 'Bar' : 'Kitchen'}</td>
    <td><input type="number" min="0.5" step="0.5" value="${d.price}" data-price="${d.id}" aria-label="${Kit.esc(d.name)} price"></td>
    <td><input type="checkbox" class="switch" data-on="${d.id}" ${d.on ? 'checked' : ''} aria-label="${Kit.esc(d.name)} available"></td></tr>`).join('');
}
$('mrows').addEventListener('change', (e) => {
  const on = e.target.closest('[data-on]'); if (on) { const d = item(on.dataset.on); d.on = on.checked; save(); renderAll(); Kit.toast(d.on ? `${d.name} is back on guests' menus` : `${d.name} marked sold out on every phone`); }
  const p = e.target.closest('[data-price]'); if (p && +p.value > 0) { item(p.dataset.price).price = +p.value; save(); Kit.toast('Price updated on the guest menu'); }
});

function renderAll(fresh) { renderKDS(fresh); renderCalls(); renderTables(); renderMenu(); }
Kit.sync(db, () => {
  const fresh = new Set(S.tickets.filter((t) => !known.has(t.id)).map((t) => t.id)); known = new Set(S.tickets.map((t) => t.id));
  renderAll(fresh); bell.refresh();
});
renderAll();
const router = Kit.router('kitchen');
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Clears test orders and menu changes for both the staff panel and guest menu.', 'Reset')) db.reset(); });
['kitchen', 'calls', 'tables', 'menu'].forEach((v, i) => Kit.key(String(i + 1), () => router.go(v), `Go to ${v}`));
Kit.key('r', recall, 'Recall last bumped ticket');
Kit.commands([{ label: 'Kitchen display', hint: '1', run: () => router.go('kitchen') }, { label: 'Service calls', hint: '2', run: () => router.go('calls') }, { label: 'Tables', hint: '3', run: () => router.go('tables') }, { label: 'Menu manager', hint: '4', run: () => router.go('menu') },
  { label: 'Recall last ticket', hint: 'R', run: recall }, { label: 'Kitchen station only', run: () => document.querySelector('.stations [data-s=kitchen]').click() }, { label: 'Bar station only', run: () => document.querySelector('.stations [data-s=bar]').click() }, { label: 'Open guest menu', run: () => window.open('qrmenu.html', '_blank') }, { label: 'Sign out', run: () => Kit.signOut('tabletap') }]);
