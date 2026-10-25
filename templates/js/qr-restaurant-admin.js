/* QR restaurant engine — staff panel: floor plan with buffet timers, kitchen display by station, service calls,
   menu & buffet pricing, and today's sales. Updates live as guests order from their phones. */
(() => {
  const $ = (id) => document.getElementById(id);
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
  $('qr-admin').innerHTML = `<div class="adm">
    <aside class="adm-side" aria-label="Staff navigation"><div class="adm-brand"><i>${C.mark}</i><div>${C.short}<small>Staff</small></div></div>
      <a href="#/floor" data-nav="floor">${icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')}<span>Floor</span><b class="n" id="n-floor" hidden></b></a>
      <a href="#/kitchen" data-nav="kitchen">${icon('<path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9V21H6Z"/><path d="M6 17h12"/>')}<span>Kitchen</span><b class="n" id="n-kds" hidden></b></a>
      <a href="#/calls" data-nav="calls">${icon('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>')}<span>Service calls</span><b class="n" id="n-calls" hidden></b></a>
      <a href="#/menu" data-nav="menu">${icon('<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M8 7h8M8 11h6"/>')}<span>Menu &amp; prices</span></a>
      <a href="#/sales" data-nav="sales">${icon('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>')}<span>Today</span></a>
      <div class="foot"><span><kbd>Ctrl</kbd> <kbd>K</kbd> · <kbd>?</kbd></span><a href="${C.guestUrl}" target="_blank" rel="noopener">Guest menu ↗</a><button class="kit-reset" id="reset" style="text-align:left;padding:0">Reset demo data</button></div></aside>
    <div class="adm-main"><header class="adm-top"><label class="adm-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" placeholder="Find a table or dish ( / )" aria-label="Find a table or dish"></label><div class="kit-admin-tools" id="tools"><span class="kit-live">Live</span></div></header>
      <section class="adm-view" data-view="floor"><div class="adm-head"><div><h1>Floor</h1><p id="floor-sub"></p></div><div class="adm-tools"><span class="legend"><i class="l-free"></i>Free <i class="l-dining"></i>Dining <i class="l-warn"></i>${C.buffet ? 'Last order / overtime' : 'Waiting'} <i class="l-bill"></i>Bill</span></div></div><div class="floor" id="floor"></div></section>
      <section class="adm-view" data-view="kitchen" hidden><div class="adm-head"><div><h1>Kitchen display</h1><p id="kds-sub"></p></div><div class="adm-tools"><div class="kit-seg" id="stations"></div></div></div><div class="kds" id="kds"></div></section>
      <section class="adm-view" data-view="calls" hidden><div class="adm-head"><div><h1>Service calls</h1><p>Requests from guests' phones, oldest first.</p></div></div><ul class="calls" id="calls"></ul></section>
      <section class="adm-view" data-view="menu" hidden><div class="adm-head"><div><h1>Menu &amp; prices</h1><p>Sold-out and price changes reach guests' phones instantly.</p></div></div>${C.buffet ? '<div class="tiers-admin" id="tiers"></div>' : ''}<div class="adm-card adm-table-wrap"><table class="adm-table"><thead><tr><th>Dish</th><th>Section</th><th>Station</th><th>${C.buffet ? 'Buffet tier / price' : 'Price'}</th><th>Available</th></tr></thead><tbody id="menu-rows"></tbody></table></div></section>
      <section class="adm-view" data-view="sales" hidden><div class="adm-head"><div><h1>Today</h1><p>Closed bills and tables still dining.</p></div><button class="adm-btn" id="export">Export bills</button></div>
        <div class="adm-kpis"><div class="adm-kpi adm-card"><span>Revenue</span><b id="k-rev"></b><em id="k-open"></em></div><div class="adm-kpi adm-card"><span>Guests served</span><b id="k-covers"></b></div><div class="adm-kpi adm-card"><span>Average per guest</span><b id="k-avg"></b></div><div class="adm-kpi adm-card"><span>Tables now</span><b id="k-tables"></b></div></div>
        <div class="adm-grid2"><div class="adm-card adm-panel"><h2>${C.buffet ? 'Buffet tier mix' : 'Payment methods'}</h2><ul class="bars" id="mix"></ul></div><div class="adm-card adm-panel"><h2>Most ordered</h2><ul class="bars" id="top"></ul></div></div></section>
    </div></div>`;

  Kit.login({ app: C.short, key: C.key, email: C.staff.email, password: 'demo1234', name: C.staff.name, role: C.staff.role, accent: C.accent, clientUrl: C.guestUrl, clientLabel: 'guest menu' });
  const bell = Kit.bell($('tools'), db, { onOpen: (x) => { if (x.table) openTable(x.table); } });
  Kit.userMenu($('tools'), { key: C.key, clientUrl: C.guestUrl, clientLabel: 'guest menu' });
  let station = 'all', fresh = new Set(), known = new Set(S.tickets.map((t) => t.id));

  /* ---------- Floor ---------- */
  function tableState(t) {
    const s = t.session; if (!s) return ['free', 'Free'];
    if (s.bill || S.calls.some((c) => c.table === t.n && c.kind === 'bill' && !c.done)) return ['bill', 'Bill requested'];
    if (C.buffet) { const left = minutesLeft(s); if (left <= 0) return ['warn', `Overtime ${Math.ceil(-left)} min`]; if (left <= C.buffet.lastCall) return ['warn', `Last order · ${Math.ceil(left)} min`]; return ['dining', `${Math.ceil(left)} min left`]; }
    const waiting = S.tickets.filter((k) => k.session === s.id && k.status !== 'served').length;
    return waiting ? ['warn', `${waiting} order${waiting > 1 ? 's' : ''} cooking`] : ['dining', `Dining · ${Math.round((Date.now() - s.start) / 6e4)} min`];
  }
  function renderFloor() {
    const q = $('q').value.trim();
    const busy = S.tables.filter((t) => t.session), heads = busy.reduce((a, t) => a + t.session.adults + t.session.kids, 0);
    $('floor-sub').textContent = `${busy.length} of ${S.tables.length} tables dining · ${heads} guests`;
    $('floor').innerHTML = S.tables.filter((t) => !q || String(t.n) === q).map((t) => {
      const [cls, label] = tableState(t), s = t.session, calls = S.calls.filter((c) => c.table === t.n && !c.done);
      const prog = C.buffet && s ? Math.min(100, (Date.now() - s.start) / 6e4 / C.buffet.minutes * 100) : 0;
      return `<button class="tbl t-${cls}" data-t="${t.n}"><span class="tbl-n">${t.n}</span><span class="tbl-seats">${t.seats} seats</span>
        <b>${label}</b>${s ? `<small>${s.adults + s.kids} guests${s.tier ? ' · ' + tierOf(s.tier).name : ''}${s.tea ? ' · ' + s.tea : ''}</small>` : ''}
        ${C.buffet && s ? `<span class="tbl-prog"><i style="width:${prog}%"></i></span>` : ''}${calls.length ? `<span class="tbl-call">${calls.map((c) => (C.service.find((x) => x[0] === c.kind) || ['', '🧾'])[1]).join(' ')}</span>` : ''}</button>`;
    }).join('');
    const alerts = S.tables.filter((t) => ['warn', 'bill'].includes(tableState(t)[0])).length; $('n-floor').hidden = !alerts; $('n-floor').textContent = alerts;
  }
  $('floor').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) openTable(+b.dataset.t); });
  function openTable(n) {
    const t = table(n), s = t.session;
    if (!s) {
      let tier = C.buffet ? C.buffet.tiers[1].id : null, tea = C.tea ? C.tea.teas[0] : null;
      Kit.modal({ title: `Seat table ${n}`, body: `<div class="kit-row"><div class="kit-field"><label for="sa">Adults</label><input id="sa" type="number" min="1" max="${t.seats + 2}" value="2"></div><div class="kit-field"><label for="sk">Kids</label><input id="sk" type="number" min="0" max="10" value="0"></div></div>
        ${C.buffet ? `<div class="kit-field"><span class="kit-label">Buffet</span><div class="kit-seg" id="st">${C.buffet.tiers.map((x) => `<button type="button" data-v="${x.id}" aria-pressed="${x.id === tier}">${x.name} · ${money(tierPrice(x.id))}</button>`).join('')}</div></div>` : ''}
        ${C.tea ? `<div class="kit-field"><span class="kit-label">Tea</span><div class="kit-seg" id="st">${C.tea.teas.map((x) => `<button type="button" data-v="${x}" aria-pressed="${x === tea}">${x}</button>`).join('')}</div></div>` : ''}`,
        onOpen: (m) => m.querySelector('#st')?.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; if (C.buffet) tier = b.dataset.v; else tea = b.dataset.v; m.querySelectorAll('#st button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }),
        actions: [{ label: 'Cancel' }, { label: 'Seat guests', primary: true, onClick: (m) => { startSession(n, { adults: Math.max(1, +m.querySelector('#sa').value || 1), kids: Math.max(0, +m.querySelector('#sk').value || 0), tier, tea, by: 'staff' }); renderAll(); Kit.toast(`Table ${n} seated${C.buffet ? ` — ${C.buffet.minutes} min timer started` : ''}`, { type: 'success' }); } }] });
      return;
    }
    const b = bill(n), tickets = S.tickets.filter((k) => k.session === s.id);
    Kit.modal({ title: `Table ${n} · ${s.adults + s.kids} guests`, wide: true, body: `<p class="kit-hint">Seated ${Kit.time(s.start)}${s.tier ? ` · ${tierOf(s.tier).name} buffet` : ''}${s.tea ? ` · ${s.tea} tea` : ''}${C.buffet ? ` · ${tableState(t)[1]}` : ''} · QR: <code>${C.guestUrl}?table=${n}</code></p>
      <div class="bill-box">${b.lines.map(([l, v]) => `<div><span>${l}</span><span>${money(v)}</span></div>`).join('')}<div><span>Service ${Math.round(C.serviceRate * 100)}% + ${C.taxLabel}</span><span>${money(b.service + b.tax)}</span></div><div class="g"><span>Total</span><span>${money(b.total)}</span></div></div>
      <p class="kit-hint" style="margin-top:10px">${tickets.length} order${tickets.length === 1 ? '' : 's'} · ${tickets.reduce((a, k) => a + k.items.reduce((x, i) => x + i.qty, 0), 0)} dishes</p>`,
      actions: [...(C.buffet ? [{ label: '+15 min', onClick: () => { s.start += 15 * 6e4; save(); renderAll(); Kit.toast(`Added 15 minutes to table ${n}`); } }] : []),
        { label: 'Take payment', onClick: () => { setTimeout(() => PayKit.checkout({ title: `Table ${n} · ${money(b.total)}`, amount: b.total, currency: C.currency, cashLabel: 'Cash at the counter', onPaid: (info) => { closeSession(n, info.detail); save(); renderAll(); Kit.toast(`Table ${n} paid and cleared`, { type: 'success' }); } })); } },
        { label: 'Close table (paid cash)', primary: true, onClick: () => { closeSession(n, 'Cash'); save(); renderAll(); Kit.toast(`Table ${n} cleared — ${money(b.total)} cash`, { type: 'success' }); } }] });
  }

  /* ---------- Kitchen display ---------- */
  $('stations').innerHTML = [['all', 'All'], ...Object.entries(C.stations)].map(([k, l]) => `<button type="button" data-s="${k}" aria-pressed="${k === station}">${l}</button>`).join('');
  $('stations').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; station = b.dataset.s; $('stations').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderKDS(); });
  const elapsed = (ts) => { const m = Math.floor((Date.now() - ts) / 6e4), s = Math.floor((Date.now() - ts) / 1000) % 60; return `${m}:${String(s).padStart(2, '0')}`; };
  function renderKDS() {
    const open = S.tickets.filter((t) => t.status !== 'served' && (station === 'all' || t.items.some((i) => i.station === station))).sort((a, b) => a.ts - b.ts);
    $('kds-sub').textContent = `${open.length} open ticket${open.length === 1 ? '' : 's'} · ${S.tickets.filter((t) => t.status === 'served').length} served today`;
    $('kds').innerHTML = open.map((t) => { const mins = (Date.now() - t.ts) / 6e4, items = t.items.filter((i) => station === 'all' || i.station === station);
      return `<article class="tk ${mins > 15 ? 'late' : mins > 8 ? 'slow' : ''} ${fresh.has(t.id) ? 'fresh' : ''}" data-k="${t.id}"><header><b>Table ${t.table}</b><span>${C.buffet ? `Round ${t.round} · ` : ''}<span class="tm" data-ts="${t.ts}">${elapsed(t.ts)}</span></span></header>
        <ul>${items.map((i, x) => `<li class="${i.done ? 'done' : ''}"><button type="button" data-i="${t.items.indexOf(i)}"><b>${i.qty}×</b> ${i.name}${i.opts.length ? `<small>${optText(i.opts)}</small>` : ''}${i.note ? `<small class="nt">“${Kit.esc(i.note)}”</small>` : ''}${station === 'all' ? `<em>${C.stations[i.station]}</em>` : ''}</button></li>`).join('')}</ul>
        <button class="bump" data-bump>${t.status === 'new' ? 'Start' : 'Served ✓'}</button></article>`; }).join('') || '<p class="adm-empty">All caught up — no open tickets.</p>';
    const n = S.tickets.filter((t) => t.status === 'new').length; $('n-kds').hidden = !n; $('n-kds').textContent = n;
  }
  $('kds').addEventListener('click', (e) => {
    const card = e.target.closest('[data-k]'); if (!card) return; const t = S.tickets.find((k) => k.id === card.dataset.k);
    const li = e.target.closest('[data-i]'); if (li) { const i = t.items[+li.dataset.i]; i.done = !i.done; if (t.status === 'new') t.status = 'cooking'; if (t.items.every((x) => x.done)) t.status = 'served'; save(); renderAll(); return; }
    if (e.target.closest('[data-bump]')) { const prev = t.status; t.status = t.status === 'new' ? 'cooking' : 'served'; if (t.status === 'served') t.items.forEach((i) => { i.done = true; }); save(); renderAll(); if (t.status === 'served') Kit.toast(`Table ${t.table} served`, { undo: () => { t.status = prev; save(); renderAll(); } }); }
  });
  setInterval(() => document.querySelectorAll('.tm').forEach((el) => { el.textContent = elapsed(+el.dataset.ts); }), 1000);

  /* ---------- Service calls ---------- */
  function renderCalls() {
    const open = S.calls.filter((c) => !c.done).sort((a, b) => a.ts - b.ts);
    $('n-calls').hidden = !open.length; $('n-calls').textContent = open.length;
    $('calls').innerHTML = open.map((c) => { const [, ic, label] = C.service.find((x) => x[0] === c.kind) || ['bill', '🧾', 'Bill requested']; return `<li class="adm-card call" data-c="${c.id}"><span class="ic">${ic}</span><div><b>Table ${c.table}</b><small>${label} · ${Kit.ago(c.ts)}</small></div>${c.kind === 'bill' ? '<button class="adm-btn" data-open>Open bill</button>' : ''}<button class="adm-btn primary" data-done>Done</button></li>`; }).join('')
      || '<li class="adm-empty">No one is waiting. Requests from guests\' phones appear here instantly.</li>';
  }
  $('calls').addEventListener('click', (e) => { const li = e.target.closest('[data-c]'); if (!li) return; const c = S.calls.find((x) => x.id === li.dataset.c);
    if (e.target.closest('[data-done]')) { c.done = true; save(); renderAll(); Kit.toast(`Table ${c.table} handled`, { undo: () => { c.done = false; save(); renderAll(); } }); }
    if (e.target.closest('[data-open]')) openTable(c.table); });

  /* ---------- Menu & prices ---------- */
  function renderMenu() {
    if (C.buffet) $('tiers').innerHTML = C.buffet.tiers.map((t) => `<div class="adm-card tier-card" style="--tier:${t.color}"><b>${t.name}</b><small>${t.desc}</small><label>Adult price <input class="adm-field" type="number" min="1" data-tier="${t.id}" value="${tierPrice(t.id)}"></label></div>`).join('');
    const q = $('q').value.trim().toLowerCase();
    $('menu-rows').innerHTML = S.menu.filter((d) => !q || (d.name + d.local).toLowerCase().includes(q)).map((d) => `<tr><td><div class="dish-cell">${d.img ? `<img src="https://images.unsplash.com/photo-${d.img}?auto=format&fit=crop&w=80&h=80&q=60" alt="">` : ''}<span><b>${d.name}</b><small>${d.local || ''}</small></span></div></td><td>${(C.categories.find((c) => c[0] === d.cat) || [, d.cat])[1]}</td><td>${C.stations[d.station]}</td>
      <td>${C.buffet && d.tier != null ? `<span class="adm-pill" style="background:${C.buffet.tiers[d.tier].color}22">${C.buffet.tiers[d.tier].name}+</span>` : `<input class="adm-field price" type="number" min="0" step="any" data-price="${d.id}" value="${d.price}" aria-label="${d.name} price">`}</td>
      <td><input type="checkbox" class="adm-switch" data-on="${d.id}" ${d.on ? 'checked' : ''} aria-label="${d.name} available"></td></tr>`).join('');
  }
  $('menu-rows').addEventListener('change', (e) => {
    const on = e.target.closest('[data-on]'); if (on) { const d = dish(on.dataset.on); d.on = on.checked; save(); renderAll(); Kit.toast(d.on ? `${d.name} is back on guests' menus` : `${d.name} marked sold out on every phone`); }
    const p = e.target.closest('[data-price]'); if (p && +p.value > 0) { dish(p.dataset.price).price = +p.value; save(); Kit.toast('Price updated on the guest menu'); }
  });
  if (C.buffet) $('tiers').addEventListener('change', (e) => { const i = e.target.closest('[data-tier]'); if (!i || !(+i.value > 0)) return; S.buffet.find((t) => t.id === i.dataset.tier).price = +i.value; save(); Kit.toast(`${tierOf(i.dataset.tier).name} buffet is now ${money(+i.value)} per adult`, { type: 'success' }); });

  /* ---------- Today ---------- */
  function renderSales() {
    const d0 = new Date().setHours(0, 0, 0, 0), bills = S.bills.filter((b) => b.ts >= d0), rev = bills.reduce((a, b) => a + b.total, 0), covers = bills.reduce((a, b) => a + b.heads, 0);
    const open = S.tables.filter((t) => t.session); const openRev = open.reduce((a, t) => a + bill(t.n).total, 0);
    $('k-rev').textContent = money(rev); $('k-open').textContent = open.length ? `+ ${money(openRev)} on open tables` : '';
    $('k-covers').textContent = covers; $('k-avg').textContent = covers ? money(rev / covers) : '—'; $('k-tables').textContent = `${open.length}/${S.tables.length}`;
    const bar = (rows) => { const max = Math.max(1, ...rows.map((r) => r[1])); return rows.map(([l, v, t]) => `<li><span>${l}</span><b>${t ?? v}</b><i style="width:${v / max * 100}%"></i></li>`).join('') || '<li class="adm-empty">No closed bills yet today.</li>'; };
    if (C.buffet) $('mix').innerHTML = bar(C.buffet.tiers.map((t) => { const h = bills.filter((b) => b.tier === t.id).reduce((a, b) => a + b.heads, 0); return [t.name, h, `${h} guests`]; }));
    else { const m = {}; bills.forEach((b) => { m[b.method] = (m[b.method] || 0) + b.total; }); $('mix').innerHTML = bar(Object.entries(m).map(([k, v]) => [k, v, money(v)])); }
    const dishes = {}; bills.forEach((b) => Object.entries(b.dishes || {}).forEach(([k, v]) => { dishes[k] = (dishes[k] || 0) + v; })); S.tickets.forEach((t) => t.items.forEach((i) => { dishes[i.name] = (dishes[i.name] || 0) + i.qty; }));
    $('top').innerHTML = bar(Object.entries(dishes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, v, `${v} ordered`]));
  }
  $('export').onclick = () => Kit.csv(`${C.key}-bills.csv`, [['Time', 'Table', 'Guests', 'Buffet', 'Payment', 'Total'], ...S.bills.map((b) => [new Date(b.ts).toISOString(), b.table, b.heads, b.tier ? tierOf(b.tier).name : '', b.method, b.total])]);

  function renderAll() { renderFloor(); renderKDS(); renderCalls(); renderMenu(); renderSales(); }
  Kit.sync(db, () => { S.tickets.forEach((t) => { if (!known.has(t.id)) fresh.add(t.id); }); known = new Set(S.tickets.map((t) => t.id)); renderAll(); bell.refresh(); setTimeout(() => fresh.clear(), 5000); });
  renderAll();
  setInterval(renderFloor, 15000);
  $('q').addEventListener('input', () => { renderFloor(); renderMenu(); });
  const router = Kit.router('floor');
  $('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores tables, orders and menu for both the staff panel and guest menu.', 'Reset')) db.reset(); });
  Kit.key('/', () => $('q').focus(), 'Find a table or dish');
  ['floor', 'kitchen', 'calls', 'menu', 'sales'].forEach((v, i) => Kit.key(String(i + 1), () => router.go(v), `Go to ${v}`));
  Kit.commands([{ label: 'Floor', hint: '1', run: () => router.go('floor') }, { label: 'Kitchen display', hint: '2', run: () => router.go('kitchen') }, { label: 'Service calls', hint: '3', run: () => router.go('calls') }, { label: 'Menu & prices', hint: '4', run: () => router.go('menu') }, { label: 'Today\'s sales', hint: '5', run: () => router.go('sales') },
    { label: 'Open guest menu', run: () => window.open(C.guestUrl, '_blank') }, { label: 'Sign out', run: () => Kit.signOut(C.key) }]);
})();
