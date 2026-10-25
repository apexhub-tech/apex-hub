/* Parcelo — customer tracking page. Data lives in tracking-data.js; merchants see every change live in tracking-admin.html. */
const $ = (id) => document.getElementById(id);
const fmt = (ts) => new Date(ts).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
let current = null;

/* ---------- Track a parcel ---------- */
$('hints').innerHTML = 'Try: ' + [S.ships[0], S.ships.find((s) => statusOf(s) === 'exception'), S.ships.find((s) => statusOf(s) === 'delivered')].filter(Boolean).map((s) => `<button type="button" data-try="${s.code}">${s.code}</button>`).join('');
$('hints').addEventListener('click', (e) => { const b = e.target.closest('[data-try]'); if (b) { $('code').value = b.dataset.try; show(); } });
$('track').addEventListener('submit', (e) => { e.preventDefault(); show(); });
function show() {
  const v = $('code').value.trim().toUpperCase(), err = $('err'), out = $('result');
  if (!/^(PCL|DHL|ARX)-\d{4}-\d{2}$/.test(v)) { err.textContent = 'That number doesn\'t look right — it should look like PCL-2048-77.'; out.innerHTML = ''; current = null; return; }
  const s = find(v);
  if (!s) { err.textContent = `We can't find ${v} yet. New labels can take up to 2 hours to appear.`; out.innerHTML = ''; current = null; return; }
  err.textContent = ''; current = s.id; renderResult(s, true);
  history.replaceState(null, '', `?code=${s.code}#/track`);
}
function renderResult(s, animate) {
  const st = statusOf(s), step = stepOf(s), out = $('result'), set = S.settings;
  const prog = st === 'delivered' ? 1 : Math.min(.95, (step + .5) / 4);
  out.innerHTML = `<div class="result box">
    <div class="res-head"><div><h2>${s.code}</h2><p>${s.carrier} · ${Kit.esc(set.store)} order ${s.order} → ${Kit.esc(s.customer)}, ${s.city}</p></div><div style="text-align:right"><span class="tag t-${st}">${LABEL[st]}</span><p class="eta" style="margin-top:8px">${etaText(s)}</p><p class="live-note">● Live — updates automatically</p></div></div>
    <div class="route"><svg viewBox="0 0 600 190" role="img" aria-label="Route from warehouse to your address, ${Math.round(prog * 100)}% complete">
      <path id="rp" d="M40 150 C 160 20, 260 190, 360 80 S 520 40, 560 60" fill="none" stroke="#000" stroke-width="4" stroke-dasharray="10 8"/>
      <circle cx="40" cy="150" r="12" fill="#FFD23F" stroke="#000" stroke-width="3"/><text x="22" y="182" font-size="13" font-weight="700" font-family="Space Grotesk">Warehouse</text>
      <circle cx="560" cy="60" r="12" fill="${st === 'delivered' ? '#3BCE7B' : '#fff'}" stroke="#000" stroke-width="3"/><text x="510" y="32" font-size="13" font-weight="700" font-family="Space Grotesk">You 🏠</text>
      <g id="van"><rect x="-18" y="-13" width="36" height="26" rx="6" fill="${st === 'exception' ? '#FF5C5C' : '#4D96FF'}" stroke="#000" stroke-width="3"/><text x="0" y="5" text-anchor="middle" font-size="14">🚚</text></g></svg></div>
    <ol class="steps">${FLOW.map(([k, l], i) => { const ev = s.events.find((e) => e.st === k); return `<li class="${st === 'exception' && i === step + 1 ? 'bad' : i < step || st === 'delivered' ? 'done' : i === step ? 'now' : ''}"><b>${st === 'exception' && i === step + 1 ? 'Problem' : l}</b>${ev ? Kit.day(ev.ts) + ' ' + Kit.time(ev.ts) : '—'}</li>`; }).join('')}</ol>
    <div class="two">
      <div><h3 style="font-size:22px;margin-bottom:14px">Tracking history</h3><ul class="timeline">${s.events.map((e) => `<li><b>${LABEL[e.st]}</b> · ${e.place}${e.note ? `<br><span style="color:#B00020;font-weight:600">${Kit.esc(e.note)}</span>` : ''}<small>${fmt(e.ts)}</small></li>`).join('')}</ul></div>
      <div class="prefs box">${st === 'delivered' ? `<h3>Delivered ✓</h3><p>Left: ${PREFS[s.pref].toLowerCase()}.</p><button class="btn w" id="problem">Report a problem</button>` : `
        <h3>Delivery options</h3>
        ${Object.entries(PREFS).filter(([k]) => k !== 'locker' || set.allowLocker).map(([k, l]) => `<label class="opt"><input type="radio" name="pref" value="${k}" ${s.pref === k ? 'checked' : ''}> ${l}</label>`).join('')}
        <label class="opt"><input type="checkbox" id="alerts" ${s.alerts ? 'checked' : ''}> Text me updates</label>
        ${set.allowReschedule || st === 'exception' ? `<button class="btn y" id="resched">${st === 'exception' ? 'Pick a new delivery day' : 'Change delivery day'}</button>` : ''}<button class="btn w" id="problem">Report a problem</button>`}
      </div>
    </div></div>`;
  const path = out.querySelector('#rp'), van = out.querySelector('#van');
  const place = (p) => { const pt = path.getPointAtLength(path.getTotalLength() * p); van.setAttribute('transform', `translate(${pt.x} ${pt.y})`); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || Kit.THUMB || !animate) place(prog); else { let p = 0; const t = setInterval(() => { p = Math.min(prog, p + .02); place(p); if (p >= prog) clearInterval(t); }, 16); }
  out.querySelectorAll('[name=pref]').forEach((r) => r.addEventListener('change', () => {
    s.pref = r.value; Kit.notify(db, `${s.customer} changed ${s.code} to “${PREFS[r.value]}”`, { ship: s.id });
    Kit.toast('Delivery preference saved — the driver has been told', { type: 'success' });
  }));
  const al = out.querySelector('#alerts'); if (al) al.addEventListener('change', () => { s.alerts = al.checked; save(); Kit.toast(al.checked ? 'You\'ll get SMS updates' : 'SMS updates turned off'); });
  const rs = out.querySelector('#resched'); if (rs) rs.addEventListener('click', () => reschedule(s));
  out.querySelector('#problem').addEventListener('click', () => report(s));
}
function report(s) {
  Kit.modal({ title: 'Report a problem', body: `<div class="kit-field"><label for="pr">What happened?</label><select id="pr"><option>Parcel is late</option><option>Parcel is damaged</option><option>Marked delivered but not received</option><option>Something else</option></select></div><div class="kit-field"><label for="pd">Details</label><textarea id="pd" placeholder="Anything that helps us sort it out"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send report', primary: true, onClick: (m) => {
      const kind = m.querySelector('#pr').value;
      S.issues.push({ id: Kit.uid(), code: s.code, kind, text: m.querySelector('#pd').value.trim(), ts: Date.now(), status: 'open' });
      Kit.notify(db, `Problem reported on ${s.code}: ${kind}`, { ship: s.id });
      Kit.toast('Thanks — our team will contact you within 24 hours', { type: 'success' });
    } }] });
}
function reschedule(s) {
  const days = Array.from({ length: 5 }, (_, i) => Kit.addDays(new Date(), i + 1));
  Kit.modal({ title: 'Choose a delivery day', body: `<div class="kit-seg" id="dd">${days.map((d, i) => `<button type="button" data-d="${d.getTime()}" aria-pressed="${i === 0}">${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div><div class="kit-seg" id="ds"><button type="button" aria-pressed="true">9:00–13:00</button><button type="button" aria-pressed="false">13:00–17:00</button><button type="button" aria-pressed="false">17:00–21:00</button></div>`,
    onOpen: (m) => ['#dd', '#ds'].forEach((g) => m.querySelector(g).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) m.querySelectorAll(g + ' button').forEach((x) => x.setAttribute('aria-pressed', x === b)); })),
    actions: [{ label: 'Cancel' }, { label: 'Confirm new day', primary: true, onClick: (m) => {
      s.eta = +m.querySelector('#dd [aria-pressed=true]').dataset.d; const slot = m.querySelector('#ds [aria-pressed=true]').textContent, dayName = new Date(s.eta).toLocaleDateString('en-GB', { weekday: 'long' });
      if (statusOf(s) === 'exception') s.events.unshift({ ts: Date.now(), st: 'in_transit', place: 'Regional depot', note: `Redelivery booked ${dayName} ${slot}` });
      else s.events.unshift({ ts: Date.now(), st: statusOf(s), place: s.events[0].place, note: `Delivery moved to ${dayName} ${slot}` });
      Kit.notify(db, `${s.customer} moved ${s.code} to ${dayName} ${slot}`, { ship: s.id });
      renderResult(s); renderMine(); Kit.toast('New delivery day confirmed', { type: 'success' });
    } }] });
}

/* ---------- My deliveries ---------- */
const ME = 'apexhub:parcelo-me';
let me = ''; try { me = localStorage.getItem(ME) || ''; } catch (e) { /* storage blocked */ }
$('mine-email').value = me;
$('mine-form').addEventListener('submit', (e) => { e.preventDefault(); me = $('mine-email').value.trim().toLowerCase(); try { localStorage.setItem(ME, me); } catch (er) { /* ignore */ } renderMine(); });
function renderMine() {
  const list = me ? S.ships.filter((s) => s.email === me).sort((a, b) => b.created - a.created) : [];
  $('mine-list').innerHTML = !me ? '' : list.length ? list.map((s) => { const st = statusOf(s); return `<button class="box parcel" data-code="${s.code}"><span><b>${s.code}</b><small>Order ${s.order} · ${s.carrier}</small></span><span class="tag t-${st}">${LABEL[st]}</span><span class="eta-s">${etaText(s)}</span></button>`; }).join('')
    : `<div class="box kit-empty-state">No parcels for ${Kit.esc(me)} yet. Check the email on your order confirmation.</div>`;
}
$('mine-list').addEventListener('click', (e) => { const b = e.target.closest('[data-code]'); if (b) { $('code').value = b.dataset.code; router.go('track'); show(); } });

/* ---------- Help ---------- */
const FAQ = [['When will my parcel arrive?', 'The date at the top of your tracking page is updated live by the carrier. On delivery day you get a 2-hour window by SMS.'], ['Can I change where it\'s left?', 'Yes — pick a delivery option on the tracking page any time before it\'s out for delivery.'], ['I missed my delivery', 'Open your tracking page and choose “Pick a new delivery day”. Redelivery is free.'], ['It says delivered but I can\'t find it', 'Check with neighbours and your safe place, then use “Report a problem” — we\'ll investigate within 24 hours.']];
$('faq').innerHTML = FAQ.map(([q, a]) => `<details class="box"><summary>${q}</summary><p>${a}</p></details>`).join('');
$('contact').addEventListener('click', () => Kit.modal({ title: 'Message support', body: `<div class="kit-field"><label for="c-code">Tracking number (optional)</label><input id="c-code" value="${current ? S.ships.find((x) => x.id === current).code : ''}"></div><div class="kit-field"><label for="c-msg">Message</label><textarea id="c-msg" required></textarea></div>`,
  actions: [{ label: 'Cancel' }, { label: 'Send message', primary: true, submit: true, onClick: (m) => { const code = m.querySelector('#c-code').value.trim().toUpperCase(); S.issues.push({ id: Kit.uid(), code: code || '—', kind: 'Support message', text: m.querySelector('#c-msg').value.trim(), ts: Date.now(), status: 'open' }); Kit.notify(db, `New support message${code ? ' about ' + code : ''}`); Kit.toast('Message sent — we\'ll reply by email', { type: 'success' }); } }] }));

/* ---------- Live updates, router ---------- */
function renderAll() { $('store-name').textContent = S.settings.store; renderMine(); if (current) { const s = S.ships.find((x) => x.id === current); if (s) renderResult(s); } }
Kit.sync(db, () => {
  const before = current && $('result').querySelector('.tag')?.textContent;
  renderAll();
  const after = current && $('result').querySelector('.tag')?.textContent;
  if (before && after && before !== after) Kit.toast(`📦 Update: your parcel is now “${after}”`, { type: 'success', ms: 6000 });
});
renderAll();
const router = Kit.router('track');
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample shipments for both the customer page and merchant panel.', 'Reset')) db.reset(); });
Kit.key('/', () => { router.go('track'); setTimeout(() => $('code').focus()); }, 'Track a parcel');
Kit.commands([{ label: 'Track a parcel', run: () => router.go('track') }, { label: 'My deliveries', run: () => router.go('mine') }, { label: 'Help & FAQ', run: () => router.go('help') }, { label: 'Merchant sign-in', run: () => { location.href = 'tracking-admin.html'; } }]);
const qcode = new URLSearchParams(location.search).get('code');
if (qcode) { $('code').value = qcode; show(); } else if (Kit.THUMB) { $('code').value = 'PCL-2048-77'; show(); }
