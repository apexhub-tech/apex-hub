/* Parcelo Merchant — overview, shipments, customer issues, notifications and settings.
   Shares its saved data with the customer tracking page (js/tracking-data.js) and updates live when customers act. */
(() => {
  const $ = (id) => document.getElementById(id);
  Kit.login({ app: 'Parcelo', key: 'parcelo', email: 'ops@nordhem.store', password: 'demo1234', name: 'Nadia Karam', role: 'Operations lead · Nordhem', accent: '#111', clientUrl: 'tracking.html', clientLabel: 'customer tracking page' });
  const tools = $('tools');
  const bell = Kit.bell(tools, db, { onOpen: (n) => { const s = n.ship && S.ships.find((x) => x.id === n.ship); if (s) shipModal(s); else router.go('issues'); } });
  Kit.userMenu(tools, { key: 'parcelo', clientUrl: 'tracking.html', clientLabel: 'customer tracking page' });
  $('hello').textContent = Kit.user.name.split(' ')[0];
  const fmt = (ts) => new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const tag = (st) => `<span class="tag t-${st}">${LABEL[st]}</span>`;

  /* ---------- Overview ---------- */
  function renderOverview() {
    const counts = {}; S.ships.forEach((s) => { counts[statusOf(s)] = (counts[statusOf(s)] || 0) + 1; });
    const del7 = S.ships.filter((s) => statusOf(s) === 'delivered' && s.events[0].ts > Date.now() - 7 * DAY);
    $('k-transit').textContent = S.ships.filter((s) => ['picked_up', 'in_transit', 'out_for_delivery'].includes(statusOf(s))).length;
    $('k-del').textContent = del7.length; $('k-ex').textContent = counts.exception || 0;
    $('k-ontime').textContent = del7.length ? Math.round(del7.filter((s) => s.events[0].ts <= s.eta + DAY).length / del7.length * 100) + '%' : '—';
    const days = Array.from({ length: 7 }, (_, i) => Kit.addDays(new Date(), i - 6));
    Kit.bars($('chart'), days.map((d) => ({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }), value: S.ships.filter((s) => s.events.some((e) => e.st === 'delivered' && new Date(e.ts).toDateString() === d.toDateString())).length })));
    const att = [...S.ships.filter((s) => statusOf(s) === 'exception').map((s) => ({ ic: '⚠', text: `<b>${s.code}</b> — ${Kit.esc(s.events[0].note || 'Delivery problem')}`, sub: `${Kit.esc(s.customer)} · ${Kit.ago(s.events[0].ts)}`, ship: s.id })),
      ...S.issues.filter((i) => i.status === 'open').map((i) => ({ ic: '💬', text: `<b>${Kit.esc(i.kind)}</b> · ${i.code}`, sub: Kit.ago(i.ts), issue: 1 })),
      ...S.ships.filter((s) => !['delivered', 'exception'].includes(statusOf(s)) && s.eta < Date.now()).map((s) => ({ ic: '⏱', text: `<b>${s.code}</b> is past its ETA`, sub: `${s.carrier} · ${Kit.esc(s.customer)}`, ship: s.id }))];
    $('attention').innerHTML = att.slice(0, 6).map((a) => `<li><span class="ic">${a.ic}</span><div>${a.text}<small>${a.sub}</small></div>${a.ship ? `<button class="adm-link" data-ship="${a.ship}">Open</button>` : '<a class="adm-link" href="#/issues">View</a>'}</li>`).join('') || '<li>All clear — nothing needs you right now. 🎉</li>';
    $('activity').innerHTML = (S.notes || []).slice().reverse().slice(0, 6).map((n) => `<li><span class="ic">👤</span><div>${Kit.esc(n.text)}<small>${Kit.ago(n.ts)}</small></div></li>`).join('') || '<li>No customer activity yet. Changes customers make on the tracking page show up here instantly.</li>';
  }
  $('attention').addEventListener('click', (e) => { const b = e.target.closest('[data-ship]'); if (b) shipModal(S.ships.find((s) => s.id === b.dataset.ship)); });

  /* ---------- Shipments ---------- */
  let fstatus = 'all';
  $('carrier').innerHTML += Object.values(CARRIERS).map((c) => `<option>${c}</option>`).join('');
  function renderShipments() {
    const counts = { all: S.ships.length }; S.ships.forEach((s) => { counts[statusOf(s)] = (counts[statusOf(s)] || 0) + 1; });
    $('chips').innerHTML = [['all', 'All'], ...FLOW, ['exception', 'Problems']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${k === fstatus}">${l} · ${counts[k] || 0}</button>`).join('');
    const q = $('q').value.toLowerCase(), car = $('carrier').value;
    const list = S.ships.filter((s) => (fstatus === 'all' || statusOf(s) === fstatus) && (car === 'all' || s.carrier === car) && (s.code + s.order + s.customer).toLowerCase().includes(q)).sort((a, b) => (statusOf(b) === 'exception') - (statusOf(a) === 'exception') || b.events[0].ts - a.events[0].ts);
    $('sh-sub').textContent = `${list.length} of ${S.ships.length} shipments`;
    $('rows').innerHTML = list.map((s) => { const st = statusOf(s), p = st === 'delivered' ? 100 : Math.round(Math.max(0, stepOf(s)) / 4 * 100); return `<tr class="click" data-id="${s.id}" tabindex="0"><td><b>${s.code}</b></td><td>${s.order}</td><td>${Kit.esc(s.customer)}<br><small>${s.city}</small></td><td>${s.carrier}</td><td>${tag(st)}</td><td><div class="bar"><i style="width:${p}%;${st === 'exception' ? 'background:var(--red)' : st === 'delivered' ? 'background:var(--green)' : ''}"></i></div></td><td>${Kit.ago(s.events[0].ts)}<br><small>${s.events[0].place}</small></td><td>${etaText(s)}</td></tr>`; }).join('')
      || `<tr><td colspan="8"><div class="adm-empty">No shipments match.<br><button class="adm-link" id="clear">Clear filters</button></div></td></tr>`;
    const ex = counts.exception || 0; $('n-ex').hidden = !ex; $('n-ex').textContent = ex;
  }
  $('chips').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { fstatus = b.dataset.s; renderShipments(); } });
  $('q').addEventListener('input', () => { if (!location.hash.includes('shipments')) router.go('shipments'); renderShipments(); });
  $('carrier').addEventListener('change', renderShipments);
  $('rows').addEventListener('click', (e) => {
    if (e.target.id === 'clear') { fstatus = 'all'; $('q').value = ''; $('carrier').value = 'all'; renderShipments(); return; }
    const r = e.target.closest('[data-id]'); if (r) shipModal(S.ships.find((s) => s.id === r.dataset.id));
  });
  $('rows').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.id) shipModal(S.ships.find((s) => s.id === e.target.dataset.id)); });
  function advance(s) {
    const st = statusOf(s); if (st === 'delivered') return false;
    const i = stepOf(s) + 1;
    s.events.unshift({ ts: Date.now(), st: FLOW[i][0], place: PLACES[i], note: '' }); return true;
  }
  function shipModal(s) {
    const st = statusOf(s), issues = S.issues.filter((i) => i.code === s.code);
    Kit.modal({ title: `${s.code} · ${s.order}`, wide: true, body: `<div class="ship-meta"><div>Customer<b>${Kit.esc(s.customer)}</b>${Kit.esc(s.email || '')}</div><div>Status<b>${tag(st)}</b></div><div>ETA<b>${etaText(s)}</b></div><div>Carrier<b>${s.carrier}</b></div><div>Customer preference<b>${PREFS[s.pref]}</b></div><div>SMS updates<b>${s.alerts ? 'On' : 'Off'}</b></div></div>
      ${issues.length ? `<p style="margin-bottom:12px"><span class="adm-pill bad">${issues.length} customer report${issues.length > 1 ? 's' : ''}</span> ${issues.map((i) => Kit.esc(i.kind)).join(', ')}</p>` : ''}
      <ul class="timeline">${s.events.map((e) => `<li><b>${LABEL[e.st]}</b> · ${e.place}${e.note ? ` — <i>${Kit.esc(e.note)}</i>` : ''}<small>${fmt(e.ts)}</small></li>`).join('')}</ul>`,
      actions: [{ label: 'View as customer ↗', onClick: () => { window.open(`tracking.html?code=${s.code}`, '_blank'); } },
        ...(st === 'exception' ? [{ label: 'Resolve: rebook delivery', primary: true, onClick: () => { s.events.unshift({ ts: Date.now(), st: 'out_for_delivery', place: PLACES[3], note: 'Redelivery arranged by store' }); s.eta = Date.now() + 4 * H; save(); renderAll(); Kit.toast('Redelivery booked — customer notified by SMS', { type: 'success' }); } }] : []),
        ...(st !== 'delivered' && st !== 'exception' ? [{ label: 'Mark delivery problem', danger: true, onClick: () => { s.events.unshift({ ts: Date.now(), st: 'exception', place: s.events[0].place, note: 'Address not found' }); save(); renderAll(); Kit.toast('Marked as a delivery problem — customer asked to pick a new day'); } }, { label: 'Next status →', primary: true, onClick: () => { advance(s); save(); renderAll(); Kit.toast(`${s.code}: ${LABEL[statusOf(s)]} · customer page updated`); } }] : [])] });
  }
  $('sync').addEventListener('click', () => {
    const moving = S.ships.filter((s) => !['delivered', 'exception'].includes(statusOf(s)));
    const picked = moving.sort(() => Math.random() - .5).slice(0, Math.max(1, Math.ceil(moving.length / 3)));
    picked.forEach(advance); save(); renderAll();
    Kit.toast(picked.length ? `Synced 3 carriers · ${picked.length} shipments updated` : 'Everything is up to date', { type: 'success' });
  });
  const addShip = ({ order, customer, email, city, c }) => S.ships.push({ id: Kit.uid(), code: `${c}-${3000 + Math.floor(Math.random() * 6999)}-${String(10 + Math.floor(Math.random() * 89))}`, order, customer, email: email || '', city, carrier: CARRIERS[c], created: Date.now(), events: [{ ts: Date.now(), st: 'label_created', place: PLACES[0], note: '' }], eta: Date.now() + 3 * DAY, pref: 'door', alerts: true });
  $('new').addEventListener('click', () => Kit.modal({ title: 'New shipment', body: `<div class="kit-field"><label for="n-o">Order number</label><input id="n-o" value="#${1100 + S.ships.length}" required></div><div class="kit-field"><label for="n-c">Customer name</label><input id="n-c" required></div><div class="kit-field"><label for="n-e">Customer email</label><input id="n-e" type="email" required></div><div class="kit-field"><label for="n-city">Area</label><input id="n-city" value="City Centre" required></div><div class="kit-field"><label for="n-car">Carrier</label><select id="n-car">${Object.entries(CARRIERS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>`,
    onOpen: (m) => m.querySelector('#n-c').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Create label', primary: true, submit: true, onClick: (m) => { addShip({ order: m.querySelector('#n-o').value.trim(), customer: m.querySelector('#n-c').value.trim(), email: m.querySelector('#n-e').value.trim().toLowerCase(), city: m.querySelector('#n-city').value.trim(), c: m.querySelector('#n-car').value }); save(); renderAll(); const s = S.ships[S.ships.length - 1]; Kit.toast(`Label ${s.code} created — tracking link emailed`, { type: 'success' }); } }] }));
  $('import').addEventListener('click', () => Kit.modal({ title: 'Import shipments', body: `<p>Paste one shipment per line: <b>order, customer, city, carrier (PCL / DHL / ARX)</b></p><textarea id="csv" rows="6" style="width:100%">#1101, Sami Haddad, Marina, PCL\n#1102, Lea Karam, Old Town, DHL</textarea>`,
    actions: [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: (m) => {
      const lines = m.querySelector('#csv').value.split('\n').map((l) => l.split(',').map((x) => x.trim())).filter((l) => l.length >= 4 && CARRIERS[l[3].toUpperCase()]);
      if (!lines.length) { Kit.toast('No valid lines found — check the format', { type: 'error' }); return false; }
      lines.forEach(([order, customer, city, c]) => addShip({ order, customer, city, c: c.toUpperCase() }));
      save(); renderAll(); Kit.toast(`${lines.length} shipments imported — tracking links sent to customers`, { type: 'success' });
    } }] }));
  $('export').addEventListener('click', () => Kit.csv('parcelo-shipments.csv', [['Tracking', 'Order', 'Customer', 'City', 'Carrier', 'Status', 'Last update', 'ETA'], ...S.ships.map((s) => [s.code, s.order, s.customer, s.city, s.carrier, LABEL[statusOf(s)], new Date(s.events[0].ts).toISOString(), etaText(s)])]));

  /* ---------- Customer issues ---------- */
  let ifilter = 'open';
  function renderIssues() {
    const list = S.issues.filter((i) => i.status === ifilter).sort((a, b) => b.ts - a.ts), open = S.issues.filter((i) => i.status === 'open').length;
    $('n-is').hidden = !open; $('n-is').textContent = open;
    $('issues').innerHTML = list.map((i) => { const s = find(i.code); return `<article class="adm-card issue" data-i="${i.id}"><div><h3>${Kit.esc(i.kind)} · ${i.code}</h3><p>${s ? `${Kit.esc(s.customer)} · ${LABEL[statusOf(s)]} · ` : ''}${Kit.ago(i.ts)}</p></div><div class="acts">${s ? `<button class="adm-btn" data-open="${s.id}">Shipment</button>` : ''}${i.status === 'open' ? '<button class="adm-btn" data-reply>Reply</button><button class="adm-btn primary" data-resolve>Resolve</button>' : '<button class="adm-btn" data-reopen>Reopen</button>'}</div>${i.text ? `<p style="color:var(--kit-ink)">“${Kit.esc(i.text)}”</p>` : ''}${i.reply ? `<p>↳ You replied: ${Kit.esc(i.reply)}</p>` : ''}</article>`; }).join('')
      || `<div class="adm-card adm-empty">${ifilter === 'open' ? 'No open issues. Reports sent from the tracking page appear here.' : 'Nothing resolved yet.'}</div>`;
  }
  $('is-filter').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; ifilter = b.dataset.f; $('is-filter').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderIssues(); });
  $('issues').addEventListener('click', (e) => {
    const card = e.target.closest('[data-i]'); if (!card) return; const i = S.issues.find((x) => x.id === card.dataset.i);
    if (e.target.closest('[data-open]')) shipModal(S.ships.find((s) => s.id === e.target.closest('[data-open]').dataset.open));
    if (e.target.closest('[data-resolve]')) { i.status = 'resolved'; save(); renderAll(); Kit.toast('Issue resolved', { undo: () => { i.status = 'open'; save(); renderAll(); } }); }
    if (e.target.closest('[data-reopen]')) { i.status = 'open'; save(); renderAll(); }
    if (e.target.closest('[data-reply]')) Kit.modal({ title: `Reply about ${i.code}`, body: `<div class="kit-field"><label for="rp">Message to customer</label><textarea id="rp" required>Sorry about this — we've contacted the carrier and will update you within 24 hours.</textarea></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Send & resolve', primary: true, submit: true, onClick: (m) => { i.reply = m.querySelector('#rp').value.trim(); i.status = 'resolved'; save(); renderAll(); Kit.toast('Reply emailed to the customer', { type: 'success' }); } }] });
  });

  /* ---------- Notifications ---------- */
  const preview = (t) => t.replace('{name}', 'Lina').replace('{tracking}', 'PCL-2048-77').replace('{eta}', `${S.settings.windowStart}–${S.settings.windowEnd}`).replace('{store}', S.settings.store);
  function renderNotify() {
    $('notif').innerHTML = S.notify.map((n, i) => `<div class="adm-card"><div><b>${LABEL[n.st]}</b><br><small style="color:var(--kit-muted)">Sent when a parcel becomes “${LABEL[n.st].toLowerCase()}”</small></div><label><input type="checkbox" class="adm-switch" data-i="${i}" data-k="email" ${n.email ? 'checked' : ''}> Email</label><label><input type="checkbox" class="adm-switch" data-i="${i}" data-k="sms" ${n.sms ? 'checked' : ''}> SMS</label>
      <textarea data-i="${i}" aria-label="${LABEL[n.st]} message">${Kit.esc(n.msg)}</textarea><p class="kit-hint">Preview: ${Kit.esc(preview(n.msg))}</p><button class="adm-btn" data-test="${i}" style="justify-self:start">Send test to me</button></div>`).join('');
  }
  const nf = $('notif');
  nf.addEventListener('change', (e) => { const c = e.target.closest('input[data-k]'); if (c) { S.notify[+c.dataset.i][c.dataset.k] = c.checked; save(); Kit.toast('Notification settings saved'); } });
  nf.addEventListener('input', (e) => { const t = e.target.closest('textarea'); if (t) { S.notify[+t.dataset.i].msg = t.value; save(); t.parentElement.querySelector('.kit-hint').textContent = 'Preview: ' + preview(t.value); } });
  nf.addEventListener('click', (e) => { if (e.target.closest('[data-test]')) Kit.toast(`Test sent to ${Kit.user.email}`, { type: 'success' }); });

  /* ---------- Settings ---------- */
  function renderSettings() {
    const s = S.settings;
    $('settings').innerHTML = `
      <div><span><b>Store name</b><small>Shown on the tracking page and in messages.</small></span><input class="adm-field" data-set="store" value="${Kit.esc(s.store)}" aria-label="Store name"></div>
      <div><span><b>Let customers change the delivery day</b><small>Missed deliveries can always be rebooked.</small></span><input type="checkbox" class="adm-switch" data-set="allowReschedule" ${s.allowReschedule ? 'checked' : ''} aria-label="Let customers change the delivery day"></div>
      <div><span><b>Offer locker delivery</b><small>Adds “Parcelo locker” to the delivery options.</small></span><input type="checkbox" class="adm-switch" data-set="allowLocker" ${s.allowLocker ? 'checked' : ''} aria-label="Offer locker delivery"></div>
      <div><span><b>Delivery window</b><small>Shown to customers on delivery day.</small></span><span class="adm-tools"><input class="adm-field" type="time" data-set="windowStart" value="${s.windowStart}" aria-label="Window start"> – <input class="adm-field" type="time" data-set="windowEnd" value="${s.windowEnd}" aria-label="Window end"></span></div>`;
  }
  $('settings').addEventListener('change', (e) => { const k = e.target.dataset.set; if (!k) return; S.settings[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim() || S.settings[k]; save(); renderAll(); Kit.toast('Saved · the customer page is updated', { type: 'success' }); });

  /* ---------- Live sync, router ---------- */
  function renderAll() { renderOverview(); renderShipments(); renderIssues(); renderNotify(); renderSettings(); }
  Kit.sync(db, () => { renderAll(); bell.refresh(); });
  renderAll();
  const router = Kit.router('overview');
  $('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample shipments for both the customer page and merchant panel.', 'Reset')) db.reset(); });
  Kit.key('/', () => $('q').focus(), 'Search shipments');
  Kit.key('s', () => $('sync').click(), 'Sync carriers');
  Kit.key('n', () => { router.go('shipments'); $('new').click(); }, 'New shipment');
  Kit.commands([{ label: 'Overview', run: () => router.go('overview') }, { label: 'Shipments', run: () => router.go('shipments') }, { label: 'Show delivery problems', run: () => { router.go('shipments'); fstatus = 'exception'; renderShipments(); } }, { label: 'Customer issues', run: () => router.go('issues') },
    { label: 'Sync carriers', hint: 'S', run: () => $('sync').click() }, { label: 'New shipment', hint: 'N', run: () => { router.go('shipments'); $('new').click(); } }, { label: 'Import shipments', run: () => { router.go('shipments'); $('import').click(); } }, { label: 'Edit customer notifications', run: () => router.go('notify') }, { label: 'Open customer tracking page', run: () => window.open('tracking.html', '_blank') }, { label: 'Sign out', run: () => Kit.signOut('parcelo') }]);
})();
