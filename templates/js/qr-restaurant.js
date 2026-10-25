/* QR restaurant engine — guest page: what diners see after scanning the QR code on their table.
   Buffet tiers with a dining timer and per-round limits, à la carte options (spice, protein), dim sum tick sheet and tea,
   live order status, service calls and paying the bill (cards, PromptPay, KBZPay…) via PayKit. */
(() => {
  const $ = (id) => document.getElementById(id);
  const app = $('qr-app');
  let n = +(new URLSearchParams(location.search).get('table') || C.defaultTable);
  if (!table(n)) n = C.defaultTable;
  let tab = 'menu', cat = C.categories[0][0], cart = [], setup = { adults: 2, kids: 0, tier: C.buffet ? C.buffet.tiers[1].id : null, tea: C.tea ? C.tea.teas[0] : null };

  app.innerHTML = `<div class="qr-stage">
    <aside class="qr-note"><span class="qr-ico" aria-hidden="true"></span><h1>${C.pitch}</h1><p>Orders, service calls and payments go straight to the staff panel — open it in another tab to watch them arrive live.</p>
      <label for="qr-table"><b>Demo: you're sitting at</b></label><select id="qr-table">${S.tables.map((t) => `<option value="${t.n}" ${t.n === n ? 'selected' : ''}>Table ${t.n}</option>`).join('')}</select></aside>
    <div class="qr-phone" aria-label="${C.name} guest menu"><div class="qr-screen">
      <header class="qr-head" style="background-image:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.75)),url(https://images.unsplash.com/photo-${C.hero}?auto=format&fit=crop&w=800&h=360&q=70)">
        <div class="qr-head-top"><span class="qr-pill" id="qr-pill"></span><span class="qr-timer" id="qr-timer" hidden></span></div>
        <div><h2>${C.name}</h2><p class="qr-local">${C.localName}</p></div>
        <div class="qr-svc" id="qr-svc"></div></header>
      <div class="qr-body" id="qr-body"></div>
      <div class="qr-cartbar" id="qr-cartbar"></div>
    </div></div></div>
    <p class="qr-foot">Powered by TableTap · <a href="${C.adminUrl}">Staff sign-in</a> · <button class="kit-reset" id="qr-reset">Reset demo</button></p>`;

  $('qr-table').addEventListener('change', (e) => { n = +e.target.value; cart = []; tab = 'menu'; history.replaceState(null, '', `?table=${n}`); render(); });
  $('qr-reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Clears test orders for both the guest menu and staff panel.', 'Reset')) db.reset(); });

  const session = () => table(n).session;
  const needsSetup = () => !session() && (C.buffet || C.tea);
  const itemsInCart = () => cart.reduce((a, c) => a + c.qty, 0);
  const roundCap = () => { const s = session(); return C.buffet && s ? C.buffet.perRound * (s.adults + s.kids) : Infinity; };
  const freeInCart = () => cart.filter((c) => c.free).reduce((a, c) => a + c.qty, 0);

  /* ---------- Header: table, timer, service buttons ---------- */
  function renderHead() {
    const s = session();
    $('qr-pill').textContent = `Table ${n}${s ? ` · ${s.adults + s.kids} guests` : ''}`;
    const tm = $('qr-timer'); tm.hidden = !(C.buffet && s);
    if (C.buffet && s) {
      const left = minutesLeft(s);
      tm.textContent = left > 0 ? `⏱ ${Math.floor(left)}:${String(Math.floor((left % 1) * 60)).padStart(2, '0')} left` : `⏱ Time's up`;
      tm.className = 'qr-timer' + (left <= C.buffet.lastCall ? ' warn' : '');
    }
    const open = S.calls.filter((c) => c.table === n && !c.done).map((c) => c.kind);
    $('qr-svc').innerHTML = s ? C.service.map(([k, ic, label]) => `<button type="button" data-call="${k}" ${open.includes(k) ? 'disabled' : ''}>${ic} ${open.includes(k) ? 'On the way' : label}</button>`).join('') : '';
  }
  $('qr-svc').addEventListener('click', (e) => {
    const b = e.target.closest('[data-call]'); if (!b) return; const [, , label] = C.service.find((x) => x[0] === b.dataset.call);
    S.calls.push({ id: Kit.uid(), table: n, kind: b.dataset.call, ts: Date.now(), done: false });
    Kit.notify(db, `Table ${n}: ${label}`, { table: n }); render(); Kit.toast(`${label} — a staff member is coming`, { type: 'success' });
  });

  /* ---------- Welcome: buffet tier / headcount / tea before ordering ---------- */
  function renderSetup() {
    const heads = setup.adults + setup.kids;
    const step = (k, label, min) => `<div class="qr-step"><span>${label}</span><div><button type="button" data-dec="${k}" aria-label="Fewer ${label.toLowerCase()}" ${setup[k] <= min ? 'disabled' : ''}>−</button><b>${setup[k]}</b><button type="button" data-inc="${k}" aria-label="More ${label.toLowerCase()}">+</button></div></div>`;
    let total = 0, html = `<div class="qr-welcome"><h3>${C.welcome}</h3>`;
    if (C.buffet) {
      const kidsP = (t) => Math.round(tierPrice(t.id) * C.buffet.kidsFactor);
      html += `<div class="qr-tiers" role="radiogroup" aria-label="Buffet">${C.buffet.tiers.map((t) => `<label class="qr-tier ${setup.tier === t.id ? 'on' : ''}" style="--tier:${t.color}"><input type="radio" name="tier" value="${t.id}" ${setup.tier === t.id ? 'checked' : ''}><span><b>${t.name}</b><small>${t.desc}</small></span><em>${money(tierPrice(t.id))}<small>/adult</small></em></label>`).join('')}</div>
        <p class="qr-rule">⏱ ${C.buffet.minutes} min dining · last order ${C.buffet.lastCall} min before · up to ${C.buffet.perRound} dishes per person each round · kids (4–11) ${Math.round(C.buffet.kidsFactor * 100)}%</p>`;
      total = tierPrice(setup.tier) * setup.adults + kidsP(tierOf(setup.tier)) * setup.kids;
    }
    html += `<div class="qr-steps">${step('adults', 'Adults', 1)}${step('kids', C.buffet ? 'Kids (4–11)' : 'Children', 0)}</div>`;
    if (C.tea) { html += `<div class="qr-teas"><span>Choose your tea · ${money(C.tea.perPerson)} per person, free refills</span><div>${C.tea.teas.map((t) => `<button type="button" data-tea="${t}" aria-pressed="${setup.tea === t}">${t}</button>`).join('')}</div></div>`; total = C.tea.perPerson * heads; }
    html += `<button class="qr-cta" id="qr-start">${C.buffet ? `Start dining · ${money(total)}` : `Start ordering · tea ${money(total)}`}</button><p class="qr-small">You pay at the end of your meal. ${C.buffet ? 'Food waste over 100 g may be charged.' : ''}</p></div>`;
    $('qr-body').innerHTML = html; $('qr-cartbar').innerHTML = '';
  }
  $('qr-body').addEventListener('change', (e) => { if (e.target.name === 'tier') { setup.tier = e.target.value; renderSetup(); } });

  /* ---------- Menu ---------- */
  function renderMenu() {
    const s = session();
    const tabs = `<div class="qr-tabs" role="tablist">${[['menu', 'Menu'], ['orders', 'My orders'], ['bill', 'Bill']].map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}${k === 'orders' && S.tickets.some((t) => s && t.session === s.id && t.status !== 'served') ? ' •' : ''}</button>`).join('')}</div>`;
    if (tab !== 'menu') return tabs;
    const chips = `<div class="qr-chips" role="group" aria-label="Menu section">${C.categories.map(([k, l]) => `<button class="qr-chip" data-cat="${k}" aria-pressed="${cat === k}">${l}</button>`).join('')}</div>`;
    const list = S.menu.filter((d) => d.cat === cat).map((d) => {
      const inc = included(d, s), locked = C.buffet && d.tier != null && s && !inc;
      const inCart = cart.filter((c) => c.mid === d.id).reduce((a, c) => a + c.qty, 0);
      const price = C.buffet && d.tier != null ? (inc ? '<span class="qr-inc">Included</span>' : `<span class="qr-lock">${tierOf(C.buffet.tiers[d.tier].id).name} buffet</span>`) : `<b>${money(d.price)}</b>`;
      const quick = C.quickAdd && !d.opts?.length && d.on && !locked;
      return `<article class="qr-dish ${d.on ? '' : 'out'} ${locked ? 'locked' : ''}" data-id="${d.id}"><div class="qr-dish-txt"><h4>${d.name}${d.tags?.includes('signature') ? ' <span class="qr-tag sig">★ Signature</span>' : ''}${d.tags?.includes('veg') ? ' <span class="qr-tag veg">Veg</span>' : ''}</h4><p class="qr-local-sm">${d.local || ''}</p><p>${d.desc}</p>${d.heat ? `<span class="qr-heat" title="Spice level">${'🌶'.repeat(d.heat)}</span>` : ''}<div class="qr-price">${d.on ? price : '<span class="qr-out">Sold out</span>'}</div></div>
        <div class="qr-dish-img">${d.img ? `<img src="https://images.unsplash.com/photo-${d.img}?auto=format&fit=crop&w=200&h=200&q=65" alt="" loading="lazy">` : ''}${quick ? `<div class="qr-qty">${inCart ? `<button type="button" data-minus="${d.id}" aria-label="One less ${d.name}">−</button><b>${inCart}</b>` : ''}<button type="button" data-plus="${d.id}" aria-label="Add ${d.name}">+</button></div>` : d.on && !locked ? `<button type="button" class="qr-add" data-open="${d.id}" aria-label="Add ${d.name}">+</button>` : ''}</div></article>`;
    }).join('');
    return tabs + chips + `<div class="qr-list">${list}</div>`;
  }

  // Dish details: options (spice, protein, size…), quantity, kitchen note
  function openDish(d) {
    const s = session(); let qty = 1; const sel = {};
    (d.opts || []).forEach((g) => { sel[g] = C.options[g].def ?? 0; });
    Kit.modal({ title: d.name, body: `${d.img ? `<img class="qr-modal-img" src="https://images.unsplash.com/photo-${d.img}?auto=format&fit=crop&w=600&h=320&q=70" alt="">` : ''}<p class="qr-local-sm">${d.local || ''}</p><p>${d.desc}</p>
      ${(d.opts || []).map((g) => `<div class="kit-field"><span class="kit-label">${C.options[g].label}</span><div class="kit-seg" data-g="${g}" style="flex-wrap:wrap">${C.options[g].choices.map(([l, x], i) => `<button type="button" data-i="${i}" aria-pressed="${sel[g] === i}">${l}${x ? ` +${money(x)}` : ''}</button>`).join('')}</div></div>`).join('')}
      <div class="kit-field"><label for="qr-note">Note for the kitchen</label><input id="qr-note" maxlength="60" placeholder="Allergies, no coriander…"></div>
      <div class="kit-seg" style="align-items:center"><button type="button" id="qr-m" aria-label="Less">−</button><b id="qr-q" style="min-width:28px;text-align:center">1</b><button type="button" id="qr-p" aria-label="More">+</button></div>`,
      onOpen: (m) => {
        m.querySelectorAll('[data-g]').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; sel[g.dataset.g] = +b.dataset.i; g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
        m.querySelector('#qr-p').onclick = () => { qty++; m.querySelector('#qr-q').textContent = qty; };
        m.querySelector('#qr-m').onclick = () => { qty = Math.max(1, qty - 1); m.querySelector('#qr-q').textContent = qty; };
      },
      actions: [{ label: 'Cancel' }, { label: 'Add to order', primary: true, onClick: (m) => {
        const opts = (d.opts || []).map((g) => { const [label, extra] = C.options[g].choices[sel[g]]; return { label, extra }; });
        const note = m.querySelector('#qr-note').value.trim();
        if (!addToCart(d, qty, opts, note)) return false;
      } }] });
  }
  function addToCart(d, qty, opts = [], note = '') {
    const s = session(), free = included(d, s);
    if (free && freeInCart() + qty > roundCap()) { Kit.toast(`Each round is up to ${roundCap()} buffet dishes for your table — send this round first`, { type: 'error' }); return false; }
    const key = d.id + '|' + JSON.stringify(opts) + '|' + note, line = cart.find((c) => c.key === key);
    if (line) line.qty += qty; else cart.push({ key, mid: d.id, name: d.name, qty, opts: opts.map((o) => o.label), price: free ? 0 : dishPrice(d, opts), free, station: d.station, note });
    render(); return true;
  }

  function renderCartBar() {
    const s = session(), count = itemsInCart(), sum = cart.reduce((a, c) => a + c.qty * c.price, 0);
    if (tab !== 'menu' || !count) { $('qr-cartbar').innerHTML = ''; return; }
    const blocked = C.buffet && s && minutesLeft(s) <= 0;
    $('qr-cartbar').innerHTML = `${C.buffet && s ? `<p class="qr-round">Round ${s.rounds + 1} · ${freeInCart()}/${roundCap()} buffet dishes${lastCall(s) ? ' · last order!' : ''}</p>` : ''}
      <button class="qr-send" id="qr-send" ${blocked ? 'disabled' : ''}><span>${blocked ? 'Dining time is over' : `Send ${count} item${count > 1 ? 's' : ''} to the kitchen`}</span><span>${sum ? money(sum) : C.buffet ? 'Included' : ''}</span></button>`;
  }

  /* ---------- My orders ---------- */
  function renderOrders() {
    const s = session(); if (!s) return '<p class="qr-empty">No orders yet.</p>';
    const mine = S.tickets.filter((t) => t.session === s.id).sort((a, b) => b.ts - a.ts), step = { new: 1, cooking: 2, served: 3 };
    return `<ul class="qr-orders">${mine.map((t) => `<li><div class="qr-o-head"><b>${C.buffet ? `Round ${t.round}` : 'Order'} · ${Kit.time(t.ts)}</b><span class="qr-st s-${t.status}">${STATUS[t.status]}</span></div><div class="qr-bar">${[1, 2, 3].map((i) => `<i class="${i <= step[t.status] ? 'on' : ''}"></i>`).join('')}</div>${t.items.map((i) => `<p>${i.qty}× ${i.name}${i.opts.length ? ` <small>${optText(i.opts)}</small>` : ''}${i.note ? ` <small>“${Kit.esc(i.note)}”</small>` : ''}</p>`).join('')}</li>`).join('') || '<li class="qr-empty">Nothing ordered yet — pick something from the menu.</li>'}</ul>`;
  }

  /* ---------- Bill ---------- */
  function renderBill() {
    const b = bill(n); if (!b) return '<p class="qr-empty">Your bill is empty.</p>';
    return `<div class="qr-bill">${b.lines.map(([l, v]) => `<div><span>${l}</span><span>${money(v)}</span></div>`).join('') || '<div><span>Nothing yet</span><span></span></div>'}
      <div class="sub"><span>Subtotal</span><span>${money(b.sub)}</span></div><div class="sub"><span>Service charge ${Math.round(C.serviceRate * 100)}%</span><span>${money(b.service)}</span></div><div class="sub"><span>${C.taxLabel}</span><span>${money(b.tax)}</span></div>
      <div class="g"><span>Total</span><span>${money(b.total)}</span></div>${b.heads > 1 ? `<p class="qr-small">${money(Math.ceil(b.total / b.heads))} each if split ${b.heads} ways</p>` : ''}</div>
      <button class="qr-cta" id="qr-pay">Pay ${money(b.total)} now</button><button class="qr-cta ghost" id="qr-askbill" ${table(n).session.bill ? 'disabled' : ''}>${table(n).session.bill ? '✓ Staff is bringing the bill' : 'Ask staff for the bill'}</button>`;
  }

  /* ---------- Render + events ---------- */
  function render() {
    renderHead();
    if (needsSetup()) { renderSetup(); return; }
    $('qr-body').innerHTML = tab === 'menu' ? renderMenu() : renderMenu() + (tab === 'orders' ? renderOrders() : renderBill());
    renderCartBar();
  }
  app.addEventListener('click', (e) => {
    const t = e.target;
    const dec = t.closest('[data-dec]'), inc = t.closest('[data-inc]'), tea = t.closest('[data-tea]');
    if (dec) { setup[dec.dataset.dec]--; renderSetup(); return; }
    if (inc) { setup[inc.dataset.inc] = Math.min(20, setup[inc.dataset.inc] + 1); renderSetup(); return; }
    if (tea) { setup.tea = tea.dataset.tea; renderSetup(); return; }
    if (t.closest('#qr-start')) { startSession(n, setup); render(); Kit.toast(C.buffet ? `Enjoy! Your ${C.buffet.minutes} minutes start now` : 'Welcome! Your tea is on its way', { type: 'success' }); return; }
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; render(); return; }
    const ch = t.closest('[data-cat]'); if (ch) { cat = ch.dataset.cat; render(); return; }
    const op = t.closest('[data-open]'); if (op) { openDish(dish(op.dataset.open)); return; }
    const pl = t.closest('[data-plus]'); if (pl) { addToCart(dish(pl.dataset.plus), 1); return; }
    const mi = t.closest('[data-minus]'); if (mi) { const line = cart.find((c) => c.mid === mi.dataset.minus); if (line && --line.qty <= 0) cart = cart.filter((c) => c !== line); render(); return; }
    if (t.closest('#qr-send')) { send(); return; }
    if (t.closest('#qr-pay')) { pay(); return; }
    if (t.closest('#qr-askbill')) { table(n).session.bill = true; S.calls.push({ id: Kit.uid(), table: n, kind: 'bill', ts: Date.now(), done: false }); Kit.notify(db, `🧾 Table ${n} asked for the bill`, { table: n }); render(); }
  });

  function send() {
    if (!session()) startSession(n, { adults: 2 }); // à la carte: the first order opens the table
    const s = session();
    if (C.buffet && minutesLeft(s) <= 0) { Kit.toast('Your dining time is over — ask staff to add time', { type: 'error' }); return; }
    const gone = cart.filter((c) => !dish(c.mid).on); if (gone.length) { cart = cart.filter((c) => dish(c.mid).on); Kit.toast(`Sorry — ${gone.map((g) => g.name).join(', ')} just sold out`, { type: 'error' }); render(); return; }
    s.rounds++;
    S.tickets.push({ id: Kit.uid(), table: n, session: s.id, round: s.rounds, ts: Date.now(), status: 'new', items: cart.map((c) => ({ mid: c.mid, name: c.name, qty: c.qty, opts: c.opts, price: c.price, free: c.free, station: c.station, note: c.note, done: false })) });
    Kit.notify(db, `Table ${n} sent ${C.buffet ? `round ${s.rounds}` : 'an order'} · ${itemsInCart()} items`, { table: n });
    cart = []; tab = 'orders'; render(); Kit.toast('Sent to the kitchen — follow it under “My orders”', { type: 'success' });
  }
  function pay() {
    const b = bill(n);
    PayKit.checkout({ title: `Table ${n} · Pay the bill`, amount: b.total, currency: C.currency, note: `${b.heads} guests · includes ${Math.round(C.serviceRate * 100)}% service and ${C.taxLabel}`, cashLabel: 'Pay cash to your server',
      onPaid: (info) => {
        Kit.notify(db, `💳 Table ${n} paid ${money(b.total)} · ${info.detail}`, { table: n });
        closeSession(n, info.detail); save(); tab = 'menu'; cart = []; render();
        Kit.modal({ title: 'Thank you!', body: `<div class="qr-thanks"><span>🙏</span><p>${C.thanks}</p></div>`, actions: [{ label: 'Done', primary: true }] });
      } });
  }

  // Live updates from the staff panel
  let statuses = '';
  const snap = () => { const s = session(); return s ? JSON.stringify(S.tickets.filter((t) => t.session === s.id).map((t) => t.status)) : 'none'; };
  Kit.sync(db, () => {
    const before = statuses; statuses = snap(); render();
    if (before && before !== statuses && statuses !== 'none') Kit.toast(statuses.includes('served') && !before.includes('served') ? '🍽️ Your food is on its way!' : '👩‍🍳 The kitchen started on your order');
  });
  setInterval(renderHead, 1000);
  statuses = snap(); render();
  if (Kit.THUMB && !session()) { startSession(n, setup); tab = 'menu'; render(); }
})();
