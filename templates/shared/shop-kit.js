/* Apex Hub shop kit — a working storefront engine shared by the store and ordering templates.
   Needs app-kit.js (Kit) loaded first. Provides: product quick view with options, cart drawer,
   wishlist, promo codes, shipping/pickup choice, 3-step checkout with validation, order history.
   All state is saved in the visitor's browser (Kit.store). */
(function () {
  const ShopKit = {};
  const luhn = (n) => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };

  ShopKit.init = (cfg) => {
    const C = Object.assign({ currency: 'USD', labels: {}, promos: {}, taxRate: 0, shipping: [{ id: 'std', label: 'Standard delivery', note: '3–5 working days', price: 5, freeOver: 75 }], slots: null, onChange: () => {} }, cfg);
    const L = Object.assign({ cart: 'Cart', add: 'Add to cart', checkout: 'Checkout', item: 'item', empty: 'Your cart is empty.', orderVerb: 'Order' }, C.labels);
    const db = Kit.store('shop-' + C.key, () => ({ cart: [], wish: [], orders: [], promo: null }));
    const S = db.data, save = () => { db.save(); C.onChange(api); render(); };
    const prod = (id) => C.products.find((p) => p.id === id);
    const money = (n) => Kit.money(n);
    const optPrice = (p, opts) => (p.options || []).reduce((a, o) => { const v = (o.values.find((x) => (Array.isArray(x) ? x[0] : x) === opts[o.name])); return a + (Array.isArray(v) ? v[1] : 0); }, 0);
    const unit = (l) => { const p = prod(l.id); return p ? p.price + optPrice(p, l.opts) : 0; };
    const optText = (opts) => Object.entries(opts || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');

    /* ---------- Totals ---------- */
    function totals(shipId) {
      const sub = S.cart.reduce((a, l) => a + unit(l) * l.qty, 0);
      const pr = S.promo && C.promos[S.promo];
      const disc = pr ? (pr.pct ? sub * pr.pct / 100 : Math.min(sub, pr.amt || 0)) : 0;
      const ship = C.shipping.find((s) => s.id === shipId) || C.shipping[0];
      const shipCost = !S.cart.length ? 0 : (pr && pr.ship) || (ship.freeOver != null && sub - disc >= ship.freeOver) ? 0 : ship.price;
      const tax = (sub - disc) * C.taxRate;
      return { sub, disc, ship: shipCost, tax, total: sub - disc + shipCost + tax, shipOpt: ship };
    }

    /* ---------- Cart actions ---------- */
    const api = {
      cfg: C, data: S,
      count: () => S.cart.reduce((a, l) => a + l.qty, 0),
      isWished: (id) => S.wish.includes(id),
      add(id, opts = {}, qty = 1, silent) {
        const p = prod(id); if (!p) return;
        if (p.soldOut) { Kit.toast(`${p.name} is sold out`, { type: 'error' }); return; }
        const key = id + '|' + JSON.stringify(opts);
        const l = S.cart.find((x) => x.key === key);
        if (l) l.qty += qty; else S.cart.push({ key, id, opts, qty });
        save();
        if (!silent) Kit.toast(`${qty > 1 ? qty + '× ' : ''}${p.name} added to your ${L.cart.toLowerCase()}`, { type: 'success' });
      },
      toggleWish(id) {
        const on = !S.wish.includes(id);
        S.wish = on ? [...S.wish, id] : S.wish.filter((x) => x !== id); save();
        Kit.toast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
        return on;
      },
      qty(id, opts = {}) { const l = S.cart.find((x) => x.key === id + '|' + JSON.stringify(opts)); return l ? l.qty : 0; },
      setQty(id, qty, opts = {}) {
        const key = id + '|' + JSON.stringify(opts), i = S.cart.findIndex((x) => x.key === key);
        if (qty <= 0) { if (i > -1) S.cart.splice(i, 1); } else if (i > -1) S.cart[i].qty = qty; else S.cart.push({ key, id, opts, qty });
        save();
      },
      checkout: () => checkout(),
      refresh: () => save(), // call after changing api.data directly
      clear() { S.cart.splice(0); S.promo = null; save(); },
      open(tab = 'cart') { openDrawer(tab); },
      quickView, totals, money, orders: () => S.orders,
    };

    /* ---------- Quick view ---------- */
    function quickView(id) {
      const p = prod(id), sel = {}; let qty = 1;
      (p.options || []).forEach((o) => { if (o.values.length === 1 || o.preselect) sel[o.name] = Array.isArray(o.values[0]) ? o.values[0][0] : o.values[0]; });
      Kit.modal({ title: p.name, wide: true, body: `<div class="sk-qv"><img src="${C.img(p, 700, 700)}" alt="${Kit.esc(p.name)}"><div class="sk-qv-info">
        <p class="sk-qv-price"><b id="sk-price">${money(p.price)}</b>${p.was ? ` <s>${money(p.was)}</s>` : ''}</p>${p.rating ? `<p class="sk-stars">★ ${p.rating} · ${p.reviews || 0} reviews</p>` : ''}
        <p>${Kit.esc(p.desc || '')}</p>
        ${(p.options || []).map((o) => `<div class="kit-field"><span class="kit-label">${o.name}${sel[o.name] ? '' : ' · choose one'}</span><div class="kit-seg" data-opt="${Kit.esc(o.name)}">${o.values.map((v) => { const [n, pr] = Array.isArray(v) ? v : [v, 0]; const out = (o.out || []).includes(n); return `<button type="button" data-v="${Kit.esc(n)}" aria-pressed="${sel[o.name] === n}" ${out ? 'disabled title="Sold out"' : ''}>${n}${pr ? ` +${money(pr)}` : ''}${out ? ' ✕' : ''}</button>`; }).join('')}</div></div>`).join('')}
        <div class="kit-field"><span class="kit-label">Quantity</span><div class="kit-seg"><button type="button" id="sk-minus" aria-label="Less">−</button><b id="sk-qty" style="min-width:34px;text-align:center;align-self:center">1</b><button type="button" id="sk-plus" aria-label="More">+</button></div></div>
        ${p.details ? `<ul class="sk-details">${p.details.map((d) => `<li>${Kit.esc(d)}</li>`).join('')}</ul>` : ''}
        <p class="kit-hint">${C.shipping[0].freeOver != null ? `Free ${C.shipping[0].label.toLowerCase()} over ${money(C.shipping[0].freeOver)} · ` : ''}${C.returns || 'Easy 30-day returns'}</p></div></div>`,
        onOpen: (d) => {
          const upd = () => { d.querySelector('#sk-price').textContent = money((p.price + optPrice(p, sel)) * qty); d.querySelector('#sk-qty').textContent = qty; };
          d.querySelectorAll('[data-opt]').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; sel[g.dataset.opt] = b.dataset.v; g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); g.previousElementSibling.textContent = g.dataset.opt; upd(); }));
          d.querySelector('#sk-plus').onclick = () => { qty++; upd(); }; d.querySelector('#sk-minus').onclick = () => { qty = Math.max(1, qty - 1); upd(); };
          upd();
        },
        actions: [{ label: S.wish.includes(id) ? '♥ Saved' : '♡ Save', onClick: () => { api.toggleWish(id); } },
          { label: `${L.add}`, primary: true, onClick: () => {
            const missing = (p.options || []).filter((o) => !sel[o.name]).map((o) => o.name.toLowerCase());
            if (missing.length) { Kit.toast(`Please choose a ${missing.join(' and ')}`, { type: 'error' }); return false; }
            api.add(id, { ...sel }, qty);
          } }] });
    }

    /* ---------- Drawer ---------- */
    const drawer = document.createElement('aside');
    drawer.className = 'sk-drawer'; drawer.setAttribute('aria-label', L.cart); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true;
    drawer.innerHTML = `<header><div class="sk-tabs" role="tablist"><button role="tab" data-t="cart">${L.cart}</button><button role="tab" data-t="wish">Wishlist</button><button role="tab" data-t="orders">My orders</button></div><button class="kit-x" id="sk-close" aria-label="Close">×</button></header><div class="sk-body" id="sk-body"></div><footer id="sk-foot"></footer>`;
    const scrim = document.createElement('div'); scrim.className = 'sk-scrim';
    document.body.append(scrim, drawer);
    let tab = 'cart', opener = null;
    function openDrawer(t) { tab = t; opener = document.activeElement; drawer.classList.add('open'); scrim.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); drawer.inert = false; render(); drawer.querySelector('#sk-close').focus(); }
    function closeDrawer() { drawer.classList.remove('open'); scrim.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true; opener && opener.focus && opener.focus(); }
    drawer.querySelector('#sk-close').onclick = closeDrawer; scrim.onclick = closeDrawer;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open') && !document.querySelector('dialog[open]')) closeDrawer(); });
    drawer.querySelector('.sk-tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; render(); } };

    function render() {
      drawer.querySelectorAll('.sk-tabs button').forEach((b) => { b.setAttribute('aria-selected', b.dataset.t === tab); b.textContent = { cart: `${L.cart} (${api.count()})`, wish: `Wishlist (${S.wish.length})`, orders: 'My orders' }[b.dataset.t]; });
      const body = drawer.querySelector('#sk-body'), foot = drawer.querySelector('#sk-foot');
      if (tab === 'cart') {
        const t = totals(), free = C.shipping[0].freeOver;
        body.innerHTML = S.cart.length ? `${free != null && !(S.promo && C.promos[S.promo]?.ship) ? `<div class="sk-free">${t.sub - t.disc >= free ? '🎉 You\'ve unlocked free delivery' : `Spend ${money(free - (t.sub - t.disc))} more for free delivery`}<div><i style="width:${Math.min(100, (t.sub - t.disc) / free * 100)}%"></i></div></div>` : ''}
          <ul class="sk-lines">${S.cart.map((l, i) => { const p = prod(l.id); return `<li><img src="${C.img(p, 160, 160)}" alt=""><div><b>${Kit.esc(p.name)}</b>${optText(l.opts) ? `<small>${Kit.esc(optText(l.opts))}</small>` : ''}<div class="sk-qty"><button data-q="-1" data-i="${i}" aria-label="One less">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}" aria-label="One more">+</button><button class="sk-rm" data-rm="${i}">Remove</button></div></div><b>${money(unit(l) * l.qty)}</b></li>`; }).join('')}</ul>
          <div class="sk-promo"><input id="sk-code" placeholder="Promo code" aria-label="Promo code" value="${S.promo || ''}"><button class="kit-btn" id="sk-apply">${S.promo ? 'Remove' : 'Apply'}</button></div>${C.promoHint ? `<p class="kit-hint">${C.promoHint}</p>` : ''}`
          : `<div class="kit-empty-state"><p style="font-size:40px">🛍️</p><p>${L.empty}</p>${S.wish.length ? '<button class="kit-btn" data-goto="wish">See your wishlist</button>' : ''}</div>`;
        foot.innerHTML = S.cart.length ? `<div class="sk-sum"><span>Subtotal</span><span>${money(t.sub)}</span>${t.disc ? `<span>Discount (${S.promo})</span><span>−${money(t.disc)}</span>` : ''}<span>Delivery</span><span>${t.ship ? 'from ' + money(t.ship) : 'Free'}</span>${t.tax ? `<span>Tax</span><span>${money(t.tax)}</span>` : ''}<b>Total</b><b>${money(t.total)}</b></div><button class="kit-btn primary sk-go" id="sk-checkout">${L.checkout} · ${money(t.total)}</button>` : '';
      } else if (tab === 'wish') {
        body.innerHTML = S.wish.length ? `<ul class="sk-lines">${S.wish.map((id) => { const p = prod(id); return p ? `<li><img src="${C.img(p, 160, 160)}" alt=""><div><b>${Kit.esc(p.name)}</b><small>${money(p.price)}</small><div class="sk-qty"><button class="sk-rm" data-unwish="${id}">Remove</button></div></div><button class="kit-btn primary" data-qv="${id}">${p.options ? 'Choose' : 'Add'}</button></li>` : ''; }).join('')}</ul>` : '<div class="kit-empty-state"><p style="font-size:40px">♡</p><p>Tap the heart on any product to save it here.</p></div>';
        foot.innerHTML = '';
      } else {
        body.innerHTML = S.orders.length ? `<ul class="sk-orders">${S.orders.slice().reverse().map((o) => `<li><div><b>${L.orderVerb} ${o.no}</b><small>${new Date(o.ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · ${o.items.reduce((a, l) => a + l.qty, 0)} ${L.item}s</small><small>${Kit.esc(o.ship)}</small></div><div style="text-align:right"><b>${money(o.total)}</b><span class="kit-badge sk-st">${orderStatus(o)}</span></div></li>`).join('')}</ul>` : '<div class="kit-empty-state"><p style="font-size:40px">📦</p><p>Orders you place will appear here.</p></div>';
        foot.innerHTML = '';
      }
    }
    function orderStatus(o) { const m = (Date.now() - o.ts) / 6e4; return (C.statuses || ['Confirmed', 'Being prepared', 'On its way', 'Delivered'])[m < 2 ? 0 : m < 30 ? 1 : m < 24 * 60 ? 2 : 3]; }
    drawer.addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]'); if (q) { const l = S.cart[+q.dataset.i]; l.qty += +q.dataset.q; if (l.qty <= 0) S.cart.splice(+q.dataset.i, 1); save(); return; }
      const rm = e.target.closest('[data-rm]'); if (rm) { const i = +rm.dataset.rm, l = S.cart.splice(i, 1)[0]; save(); Kit.toast(`${prod(l.id).name} removed`, { undo: () => { S.cart.splice(i, 0, l); save(); } }); return; }
      const uw = e.target.closest('[data-unwish]'); if (uw) { S.wish = S.wish.filter((x) => x !== uw.dataset.unwish); save(); return; }
      const qv = e.target.closest('[data-qv]'); if (qv) { const p = prod(qv.dataset.qv); if (p.options) quickView(p.id); else api.add(p.id); return; }
      const g = e.target.closest('[data-goto]'); if (g) { tab = g.dataset.goto; render(); return; }
      if (e.target.closest('#sk-apply')) {
        if (S.promo) { S.promo = null; save(); return; }
        const code = drawer.querySelector('#sk-code').value.trim().toUpperCase();
        if (!C.promos[code]) { Kit.toast('That code isn\'t valid — check the spelling', { type: 'error' }); return; }
        const pr = C.promos[code]; if (pr.min && totals().sub < pr.min) { Kit.toast(`${code} needs a minimum order of ${money(pr.min)}`, { type: 'error' }); return; }
        S.promo = code; save(); Kit.toast(`${code} applied`, { type: 'success' }); return;
      }
      if (e.target.closest('#sk-checkout')) { closeDrawer(); checkout(); }
    });

    /* ---------- Checkout ---------- */
    function checkout() {
      if (!S.cart.length) return;
      const F = Object.assign({ email: '', name: '', phone: '', address: '', city: '', ship: C.shipping[0].id, slot: '', pay: 'card', card: '', exp: '', cvc: '', note: '' }, S.lastDetails || {}, { card: '', exp: '', cvc: '' });
      let step = 0, pk = null;
      const needsAddress = () => !(C.shipping.find((s) => s.id === F.ship) || {}).pickup;
      const field = (id, label, attrs = '', full) => `<div class="kit-field ${full ? 'sk-full' : ''}" data-f="${id}"><label for="sk-${id}">${label}</label><input id="sk-${id}" ${attrs} value="${Kit.esc(F[id])}"><span class="sk-err" role="alert"></span></div>`;
      const steps = ['Details', C.deliveryLabel || 'Delivery', 'Payment'];
      const d = Kit.modal({ title: L.checkout, wide: true, body: '<div id="sk-co"></div>', onOpen: (m) => draw(m),
        actions: [{ label: 'Back', onClick: (m) => { if (step === 0) return true; step--; draw(m); return false; } }, { label: 'Continue', primary: true, onClick: (m) => next(m) }] });
      function draw(m) {
        const t = totals(F.ship), box = m.querySelector('#sk-co');
        m.querySelectorAll('footer .kit-btn')[0].textContent = step ? 'Back' : 'Cancel';
        m.querySelectorAll('footer .kit-btn')[1].textContent = step === 2 ? (F.pay === 'card' ? `Pay ${money(t.total)}` : `Place ${L.orderVerb.toLowerCase()} · ${money(t.total)}`) : 'Continue';
        const summary = `<aside class="sk-co-sum"><b>${L.orderVerb} summary</b><ul>${S.cart.map((l) => `<li><span>${l.qty}× ${Kit.esc(prod(l.id).name)}${optText(l.opts) ? `<small>${Kit.esc(optText(l.opts))}</small>` : ''}</span><span>${money(unit(l) * l.qty)}</span></li>`).join('')}</ul>
          <div class="sk-sum"><span>Subtotal</span><span>${money(t.sub)}</span>${t.disc ? `<span>Discount</span><span>−${money(t.disc)}</span>` : ''}<span>${Kit.esc(t.shipOpt.label)}</span><span>${t.ship ? money(t.ship) : 'Free'}</span>${t.tax ? `<span>Tax</span><span>${money(t.tax)}</span>` : ''}<b>Total</b><b>${money(t.total)}</b></div></aside>`;
        let html = `<ol class="sk-steps">${steps.map((s, i) => `<li class="${i === step ? 'on' : i < step ? 'done' : ''}">${i < step ? '✓' : i + 1} ${s}</li>`).join('')}</ol><div class="sk-co"><div class="sk-co-main">`;
        if (step === 0) html += `<div class="sk-grid">${field('email', 'Email', 'type="email" autocomplete="email" required', true)}${field('name', 'Full name', 'autocomplete="name" required')}${field('phone', 'Mobile', 'type="tel" autocomplete="tel" required')}</div><p class="kit-hint">We'll send your receipt and ${L.orderVerb.toLowerCase()} updates here.</p>`;
        if (step === 1) {
          html += `<div class="kit-field"><span class="kit-label">${C.deliveryLabel || 'Delivery'} method</span><div class="sk-ship">${C.shipping.map((s) => { const free = s.freeOver != null && totals(s.id).sub - totals(s.id).disc >= s.freeOver; return `<label><input type="radio" name="sk-ship" value="${s.id}" ${F.ship === s.id ? 'checked' : ''}><span><b>${Kit.esc(s.label)}</b><small>${Kit.esc(s.note || '')}</small></span><b>${(S.promo && C.promos[S.promo]?.ship) || free || !s.price ? 'Free' : money(s.price)}</b></label>`; }).join('')}</div></div>`;
          if (C.slots) html += `<div class="kit-field"><span class="kit-label">${C.slots.label}</span><div class="kit-seg" id="sk-slots">${C.slots.list().map((s) => `<button type="button" aria-pressed="${F.slot === s}" data-s="${Kit.esc(s)}">${Kit.esc(s)}</button>`).join('')}</div><span class="sk-err" id="sk-slot-err" role="alert"></span></div>`;
          if (needsAddress()) html += `<div class="sk-grid">${field('address', 'Street address', 'autocomplete="street-address" required', true)}${field('city', 'City / area', 'autocomplete="address-level2" required')}</div>`;
          html += `<div class="kit-field"><label for="sk-note">Note ${C.noteLabel ? '(' + C.noteLabel + ')' : '(optional)'}</label><input id="sk-note" value="${Kit.esc(F.note)}"></div>`;
        }
        if (step === 2 && window.PayKit) html += '<div id="sk-paykit"></div>';
        else if (step === 2) html += `<div class="kit-field"><span class="kit-label">Payment</span><div class="kit-seg" id="sk-pay"><button type="button" data-p="card" aria-pressed="${F.pay === 'card'}">Card</button><button type="button" data-p="cash" aria-pressed="${F.pay === 'cash'}">${(C.shipping.find((s) => s.id === F.ship) || {}).pickup ? 'Pay in store' : 'Cash on delivery'}</button></div></div>
          ${F.pay === 'card' ? `<div class="sk-grid">${field('card', 'Card number', 'inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" maxlength="23"', true)}${field('exp', 'Expiry (MM/YY)', 'inputmode="numeric" placeholder="12/28" maxlength="5"')}${field('cvc', 'Security code', 'inputmode="numeric" placeholder="123" maxlength="4"')}</div><p class="sk-demo">🔒 Demo checkout — no real payment is taken. Use test card 4242 4242 4242 4242.</p>` : '<p class="kit-hint">Pay when you receive your order.</p>'}`;
        box.innerHTML = html + `</div>${summary}</div>`;
        box.querySelectorAll('input:not([type=radio])').forEach((i) => i.addEventListener('input', () => {
          const k = i.id.replace('sk-', '');
          if (k === 'card') { i.value = i.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim(); }
          if (k === 'exp') { i.value = i.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2'); }
          if (k === 'cvc') { i.value = i.value.replace(/\D/g, ''); }
          F[k] = i.value; const f = i.closest('[data-f]'); if (f && f.classList.contains('bad')) validate(f.dataset.f);
        }));
        box.querySelectorAll('input:not([type=radio])').forEach((i) => i.addEventListener('blur', () => { const f = i.closest('[data-f]'); if (f && i.value) validate(f.dataset.f); }));
        box.querySelectorAll('[name=sk-ship]').forEach((r) => r.addEventListener('change', () => { F.ship = r.value; draw(m); }));
        const sl = box.querySelector('#sk-slots'); if (sl) sl.onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) { F.slot = b.dataset.s; draw(m); } };
        const pay = box.querySelector('#sk-pay'); if (pay) pay.onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { F.pay = b.dataset.p; draw(m); } };
        // Full payment picker (cards, Thai and Myanmar QR/banking, transfer, cash) when PayKit is loaded
        const pkBox = box.querySelector('#sk-paykit'); pk = null;
        if (pkBox) pk = PayKit.picker(pkBox, { amount: t.total, cashLabel: (C.shipping.find((s) => s.id === F.ship) || {}).pickup ? 'Pay in store when you collect' : 'Cash on delivery',
          onChange: (api) => { m.querySelectorAll('footer .kit-btn')[1].textContent = api.paidNow() ? `Pay ${money(t.total)}` : `Place ${L.orderVerb.toLowerCase()} · ${money(t.total)}`; } });
        const first = box.querySelector('.sk-co-main input:not([type=radio])'); if (first && !first.value) first.focus();
      }
      const RULES = {
        email: [(v) => /^\S+@\S+\.\S+$/.test(v), 'Enter an email like name@example.com.'],
        name: [(v) => v.trim().length > 1, 'Enter your full name.'],
        phone: [(v) => /^\+?[\d\s()-]{7,}$/.test(v), 'Enter a phone number we can text, e.g. +00 555 0123.'],
        address: [(v) => v.trim().length > 4, 'Enter your street and house number.'],
        city: [(v) => v.trim().length > 1, 'Enter your city or area.'],
        card: [(v) => { const n = v.replace(/\s/g, ''); return n.length >= 13 && luhn(n); }, 'That card number isn\'t valid — check the digits.'],
        exp: [(v) => { const [mm, yy] = v.split('/').map(Number); if (!mm || mm > 12 || yy == null) return false; return new Date(2000 + yy, mm) > new Date(); }, 'Enter a future expiry date as MM/YY.'],
        cvc: [(v) => /^\d{3,4}$/.test(v), 'Enter the 3 or 4 digits on the back.'],
      };
      function validate(k) { const f = d.querySelector(`[data-f="${k}"]`); if (!f) return true; const ok = RULES[k][0](F[k] || ''); f.classList.toggle('bad', !ok); f.querySelector('.sk-err').textContent = ok ? '' : RULES[k][1]; return ok; }
      function next(m) {
        if (step === 2 && pk) { if (pk.validate()) return false; place(); return true; }
        const need = step === 0 ? ['email', 'name', 'phone'] : step === 1 ? (needsAddress() ? ['address', 'city'] : []) : F.pay === 'card' ? ['card', 'exp', 'cvc'] : [];
        const okAll = need.map(validate).every(Boolean);
        if (step === 1) { F.note = m.querySelector('#sk-note').value; if (C.slots && !F.slot) { m.querySelector('#sk-slot-err').textContent = `Choose a ${C.slots.label.toLowerCase()}.`; return false; } }
        if (!okAll) { const bad = m.querySelector('.bad input'); bad && bad.focus(); return false; }
        if (step < 2) { step++; draw(m); return false; }
        place(); return true;
      }
      function place() {
        const t = totals(F.ship), no = (C.orderPrefix || '#') + (1000 + S.orders.length + Math.floor(Math.random() * 90));
        const ship = t.shipOpt;
        const o = { no, ts: Date.now(), items: S.cart.map((l) => ({ ...l, name: prod(l.id).name, unit: unit(l) })), total: t.total, ship: `${ship.label}${F.slot ? ' · ' + F.slot : ''}${needsAddress() ? ' · ' + F.city : ''}`, pay: pk ? pk.summary() : F.pay, email: F.email };
        const paidNow = pk ? pk.paidNow() : F.pay === 'card';
        S.orders.push(o); S.lastDetails = { email: F.email, name: F.name, phone: F.phone, address: F.address, city: F.city };
        S.cart = []; S.promo = null; save();
        Kit.modal({ title: `${L.orderVerb} confirmed`, body: `<div class="sk-done"><span>✓</span><h3>Thank you, ${Kit.esc(F.name.split(' ')[0])}!</h3><p>${L.orderVerb} <b>${no}</b> is confirmed. A receipt is on its way to ${Kit.esc(F.email)}.</p>
          <div class="sk-sum" style="text-align:left"><span>${Kit.esc(ship.label)}</span><span>${Kit.esc(F.slot || ship.note || '')}</span><span>Payment</span><span>${Kit.esc(o.pay === 'card' ? 'Card' : o.pay === 'cash' ? 'Cash' : o.pay)}</span><b>${paidNow ? 'Total paid' : 'To pay'}</b><b>${money(t.total)}${paidNow ? '' : pk && pk.method().kind === 'bank' ? ' (slip received — confirming)' : ' (pay later)'}</b></div></div>`,
          actions: [{ label: 'View my orders', onClick: () => { setTimeout(() => openDrawer('orders')); } }, { label: 'Keep shopping', primary: true }] });
      }
    }

    render();
    queueMicrotask(() => C.onChange(api)); // after the page's own script has finished setting up
    return api;
  };
  window.ShopKit = ShopKit;
})();
