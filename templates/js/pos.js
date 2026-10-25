/* Tally POS — order-ahead page: browse the live menu, customise drinks, pay online and follow the order until pickup.
   Data lives in pos-data.js; the café sees each order in the staff register's online queue (pos-admin.html) instantly. */
const $ = (id) => document.getElementById(id);
const MINE = 'apexhub:pos-mine';
let bag = [], cat = 'All', mine = []; try { mine = JSON.parse(localStorage.getItem(MINE) || '[]'); } catch (e) { /* storage blocked */ }
const keepMine = () => { try { localStorage.setItem(MINE, JSON.stringify(mine)); } catch (e) { /* ignore */ } };

/* ---------- Menu ---------- */
function renderMenu() {
  const open = S.online;
  $('open-state').textContent = open ? `● Open · ready in ~${S.prepMins} min` : '● Online ordering paused';
  $('open-state').className = 'open' + (open ? '' : ' closed');
  $('wait').textContent = open ? `Current wait: about ${S.prepMins} minutes.` : 'Online ordering is paused right now — please order at the counter.';
  const cats = ['All', ...new Set(S.products.filter((p) => p.active).map((p) => p.cat))];
  $('cats').innerHTML = cats.map((c) => `<button class="cat" aria-pressed="${c === cat}" data-c="${Kit.esc(c)}">${Kit.esc(c)}</button>`).join('');
  $('grid').innerHTML = S.products.filter((p) => p.active && (cat === 'All' || p.cat === cat)).map((p) => {
    const out = p.stock <= 0, low = p.stock < 999 && p.stock > 0 && p.stock <= 5;
    return `<button class="prod card" data-id="${p.id}" ${out || !open ? 'disabled' : ''}><img src="${U(p.img, 400, 300)}" alt="" loading="lazy">${out ? '<span class="flag out">Sold out</span>' : low ? `<span class="flag">Only ${p.stock} left</span>` : ''}<b>${Kit.esc(p.name)}</b><span>${Kit.money(p.price)}${p.mods ? ' · customise' : ''}</span><i aria-hidden="true">+</i></button>`;
  }).join('');
  renderBag();
}
$('cats').addEventListener('click', (e) => { const b = e.target.closest('.cat'); if (b) { cat = b.dataset.c; renderMenu(); } });
function addLine(p, mods = '', extra = 0) {
  const inBag = bag.filter((l) => l.pid === p.id).reduce((a, l) => a + l.qty, 0);
  if (p.stock < 999 && inBag >= p.stock) { Kit.toast(`Sorry, only ${p.stock} ${p.name} left today`, { type: 'error' }); return; }
  const key = p.id + '|' + mods, l = bag.find((x) => x.key === key);
  if (l) l.qty++; else bag.push({ key, pid: p.id, name: p.name, unit: +(p.price + extra).toFixed(2), qty: 1, mods });
  renderBag(); Kit.toast(`${p.name} added`);
}
$('grid').addEventListener('click', (e) => {
  const b = e.target.closest('.prod'); if (!b || b.disabled) return; const p = prod(b.dataset.id);
  if (!p.mods) { addLine(p); return; }
  const seg = (name, opts, multi) => `<div class="kit-field"><span class="kit-label">${name}</span><div class="kit-seg" data-multi="${multi ? 1 : ''}">${opts.map(([o, pr], i) => `<button type="button" aria-pressed="${!multi && i === 1 ? 'true' : 'false'}" data-o="${o}" data-p="${pr}">${o}${pr ? ` +${Kit.money(pr)}` : ''}</button>`).join('')}</div></div>`;
  Kit.modal({ title: p.name, body: `<img src="${U(p.img, 600, 300)}" alt="" style="width:100%;aspect-ratio:2;object-fit:cover;border-radius:14px"><div class="mods">${seg('Size', COFFEE_MODS.size)}${seg('Milk', COFFEE_MODS.milk)}${seg('Extras', COFFEE_MODS.extra, true)}</div>`,
    onOpen: (d) => d.querySelectorAll('.kit-seg').forEach((g) => g.addEventListener('click', (ev) => { const x = ev.target.closest('button'); if (!x) return; if (g.dataset.multi) x.setAttribute('aria-pressed', x.getAttribute('aria-pressed') !== 'true'); else g.querySelectorAll('button').forEach((y) => y.setAttribute('aria-pressed', y === x)); })),
    actions: [{ label: 'Cancel' }, { label: `Add to order`, primary: true, onClick: (d) => { const on = [...d.querySelectorAll('button[aria-pressed="true"]')]; addLine(p, on.map((x) => x.dataset.o).join(', '), on.reduce((a, x) => a + +x.dataset.p, 0)); } }] });
});
const bagTotals = () => { const sub = bag.reduce((a, l) => a + l.qty * l.unit, 0), tax = sub * TAX; return { sub, tax, total: sub + tax }; };
function renderBag() {
  // Drop anything that sold out or was taken off sale while it sat in the bag
  const before = bag.length; bag = bag.filter((l) => { const p = prod(l.pid); return p && p.active && p.stock > 0; }); if (bag.length < before) Kit.toast('Something in your order just sold out and was removed', { type: 'error' });
  const t = bagTotals(), n = bag.reduce((a, l) => a + l.qty, 0);
  $('bag').innerHTML = bag.map((l, i) => `<li><div><b>${Kit.esc(l.name)}</b>${l.mods ? `<small>${Kit.esc(l.mods)}</small>` : ''}</div><div class="q"><button data-q="-1" data-i="${i}" aria-label="Remove one ${Kit.esc(l.name)}">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}" aria-label="Add one ${Kit.esc(l.name)}">+</button></div><span>${Kit.money(l.qty * l.unit)}</span></li>`).join('') || '<li class="empty">Your bag is empty. Tap a drink or pastry to add it.</li>';
  $('bag-tot').innerHTML = n ? `<div><span>Subtotal</span><span>${Kit.money(t.sub)}</span></div><div><span>Tax</span><span>${Kit.money(t.tax)}</span></div><div class="g"><span>Total</span><span>${Kit.money(t.total)}</span></div>` : '';
  $('checkout').disabled = !n || !S.online; $('checkout').textContent = n ? `Checkout · ${Kit.money(t.total)}` : 'Checkout';
  $('mbag').hidden = !n; $('mbag').textContent = `View order · ${n} item${n === 1 ? '' : 's'} · ${Kit.money(t.total)}`;
}
$('bag').addEventListener('click', (e) => {
  const b = e.target.closest('[data-q]'); if (!b) return; const l = bag[+b.dataset.i], p = prod(l.pid);
  if (+b.dataset.q > 0) { const inBag = bag.filter((x) => x.pid === l.pid).reduce((a, x) => a + x.qty, 0); if (p.stock < 999 && inBag >= p.stock) { Kit.toast(`Only ${p.stock} left`, { type: 'error' }); return; } l.qty++; } else if (--l.qty <= 0) bag.splice(+b.dataset.i, 1);
  renderBag();
});
$('mbag').addEventListener('click', () => document.querySelector('.bag').scrollIntoView({ behavior: 'smooth' }));

/* ---------- Checkout ---------- */
function slots() { const out = [], first = new Date(Date.now() + S.prepMins * 6e4); first.setMinutes(Math.ceil(first.getMinutes() / 5) * 5, 0, 0); for (let i = 0; i < 8; i++) out.push(first.getTime() + i * 15 * 6e4); return out; }
$('checkout').addEventListener('click', () => {
  if (!S.online) return; const t = bagTotals(), sl = slots();
  let who = ''; try { who = localStorage.getItem('apexhub:pos-name') || ''; } catch (e) { /* ignore */ }
  Kit.modal({ title: 'Checkout', body: `<div class="kit-row"><div class="kit-field"><label for="co-n">Name for the order</label><input id="co-n" value="${Kit.esc(who)}" autocomplete="name" required></div><div class="kit-field"><label for="co-p">Mobile (for the “ready” text)</label><input id="co-p" type="tel" autocomplete="tel"></div></div>
    <div class="kit-field"><span class="kit-label">Pickup time</span><div class="kit-seg wrap" id="co-t">${sl.map((s, i) => `<button type="button" data-t="${s}" aria-pressed="${i === 0}">${i === 0 ? `ASAP · ${Kit.time(s)}` : Kit.time(s)}</button>`).join('')}</div></div>
    <div class="kit-field"><label for="co-note">Note for the barista (optional)</label><input id="co-note" placeholder="e.g. Extra hot please"></div>
    <div class="kit-field"><label for="co-card">Card</label><input id="co-card" value="4242 4242 4242 4242" inputmode="numeric"></div>
    <p class="kit-hint">Demo checkout — test card pre-filled, nothing is charged. You'll earn ${Math.round(t.total)} reward points.</p>`,
    onOpen: (d) => { d.querySelector('#co-t').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) d.querySelectorAll('#co-t button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }); (who ? d.querySelector('#co-p') : d.querySelector('#co-n')).focus(); },
    actions: [{ label: 'Back' }, { label: `Pay ${Kit.money(t.total)}`, primary: true, submit: true, onClick: (d) => {
      const name = d.querySelector('#co-n').value.trim(); if (!name) { Kit.toast('Add a name so we can call your order', { type: 'error' }); return false; }
      if (d.querySelector('#co-card').value.replace(/\D/g, '').length < 15) { Kit.toast('That card number looks too short', { type: 'error' }); return false; }
      // Re-check stock at the moment of payment — the café may have sold the last one
      const short = bag.find((l) => { const p = prod(l.pid); return !p || !p.active || (p.stock < 999 && p.stock < bag.filter((x) => x.pid === l.pid).reduce((a, x) => a + x.qty, 0)); });
      if (short) { Kit.toast(`Sorry — ${short.name} just sold out. Please update your order.`, { type: 'error' }); renderMenu(); return; }
      const o = { id: Kit.uid(), no: nextNo(), ts: Date.now(), items: bag.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit, mods: l.mods, pid: l.pid })), sub: t.sub, disc: 0, tax: t.tax, tip: 0, total: t.total, method: 'Card', status: 'paid', customer: name, phone: d.querySelector('#co-p').value.trim(), note: d.querySelector('#co-note').value.trim(), source: 'online', fulfil: 'new', pickup: +d.querySelector('#co-t [aria-pressed=true]').dataset.t };
      bag.forEach((l) => { const p = prod(l.pid); if (p && p.stock < 999) p.stock -= l.qty; });
      S.loyalty[name] = (S.loyalty[name] || 0) + Math.round(o.total);
      S.orders.push(o); mine.unshift(o.id); keepMine(); try { localStorage.setItem('apexhub:pos-name', name); } catch (e) { /* ignore */ }
      Kit.notify(db, `🛍️ New online order #${o.no} from ${name} · pickup ${Kit.time(o.pickup)}`);
      bag = []; renderAll(); router.go('track'); Kit.toast(`Order #${o.no} placed — we'll text you when it's ready`, { type: 'success' });
    } }] });
});

/* ---------- Tracking ---------- */
function renderTrack() {
  const list = mine.map((id) => S.orders.find((o) => o.id === id)).filter(Boolean), active = list.filter((o) => ['new', 'preparing', 'ready'].includes(o.fulfil));
  $('track-n').hidden = !active.length; $('track-n').textContent = active.length;
  const steps = ['new', 'preparing', 'ready', 'collected'];
  $('orders').innerHTML = list.map((o) => { const i = steps.indexOf(o.fulfil); return `<article class="card order ${o.fulfil}"><header><div><h2>Order #${o.no}</h2><p>${Kit.esc(o.customer)} · pickup ${Kit.time(o.pickup)} · ${Kit.money(o.total)}</p></div><span class="st">${FULFIL[o.fulfil]}</span></header>
    ${o.fulfil === 'rejected' ? '<p class="bad">The café couldn\'t make this order — your card has been refunded.</p>' : `<ol class="steps">${['Received', 'Preparing', 'Ready for pickup', 'Collected'].map((l, k) => `<li class="${k <= i ? 'on' : ''} ${k === i ? 'now' : ''}">${l}</li>`).join('')}</ol>`}
    ${o.fulfil === 'ready' ? '<p class="ready">☕ Your order is waiting on the pickup shelf — show this screen or say your name.</p>' : ''}
    <ul>${o.items.map((it) => `<li>${it.qty}× ${Kit.esc(it.name)}${it.mods ? ` <small>${Kit.esc(it.mods)}</small>` : ''}</li>`).join('')}</ul>
    ${['collected', 'rejected'].includes(o.fulfil) ? `<button class="cta sm ghost" data-again="${o.id}">Order again</button>` : ''}</article>`; }).join('')
    || '<div class="card empty-big"><b>No orders yet</b><p>Orders you place on this device show up here with live status.</p><a class="cta sm" href="#/menu">Start an order</a></div>';
}
$('orders').addEventListener('click', (e) => {
  const b = e.target.closest('[data-again]'); if (!b) return; const o = S.orders.find((x) => x.id === b.dataset.again);
  o.items.forEach((it) => { const p = prod(it.pid); if (p && p.active && p.stock > 0) bag.push({ key: it.pid + '|' + it.mods, pid: it.pid, name: it.name, unit: it.unit, qty: it.qty, mods: it.mods }); });
  router.go('menu'); renderBag(); Kit.toast('Added your last order to the bag');
});

/* ---------- Rewards ---------- */
$('pts').addEventListener('submit', (e) => {
  e.preventDefault(); const n = $('pts-name').value.trim(), key = Object.keys(S.loyalty).find((k) => k.toLowerCase() === n.toLowerCase());
  if (!key) { $('pts-out').innerHTML = '<p class="bad">We couldn\'t find that name. Points are added automatically on your first order.</p>'; return; }
  const p = S.loyalty[key];
  $('pts-out').innerHTML = `<div class="pts-card"><b>${p}</b><span>points · ${Kit.esc(key)}</span><div class="meter"><i style="width:${Math.min(100, p % 100)}%"></i></div><small>${p >= 100 ? `🎉 ${Math.floor(p / 100)} free drink${p >= 200 ? 's' : ''} ready to claim at the counter` : `${100 - p} points to your next free drink`}</small></div>`;
});

/* ---------- Live sync, router ---------- */
function renderAll() { renderMenu(); renderTrack(); }
let states = JSON.stringify(mine.map((id) => S.orders.find((o) => o.id === id)?.fulfil));
Kit.sync(db, () => {
  renderAll();
  const now = mine.map((id) => S.orders.find((o) => o.id === id));
  const ns = JSON.stringify(now.map((o) => o?.fulfil));
  if (ns !== states) { const ch = now.find((o) => o && o.fulfil === 'ready' && !JSON.parse(states).includes('ready')); Kit.toast(ch ? `☕ Order #${ch.no} is ready for pickup!` : '🔔 Your order status changed', { type: 'success', ms: 6000 }); }
  states = ns;
});
renderAll();
const router = Kit.router('menu', (v) => { if (v === 'track') renderTrack(); });
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the menu and orders for both this page and the staff register.', 'Reset')) { mine = []; keepMine(); db.reset(); } });
Kit.commands([{ label: 'Order', run: () => router.go('menu') }, { label: 'My orders', run: () => router.go('track') }, { label: 'Rewards', run: () => router.go('rewards') }, { label: 'Staff sign-in', run: () => { location.href = 'pos-admin.html'; } }]);
if (Kit.THUMB) { addLine(S.products[1], 'Medium, Oat', 1.1); addLine(S.products[7]); }
