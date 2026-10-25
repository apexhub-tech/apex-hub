/* IronPulse — member app: digital card, class booking with waitlists, online renewals and freeze requests.
   Data lives in gym-app-data.js; the front desk sees every booking and request live in gym-app-admin.html. */
const $ = (id) => document.getElementById(id);
const ME = 'apexhub:ironpulse-me';
let meId = null; try { meId = localStorage.getItem(ME); } catch (e) { /* storage blocked */ }
if (Kit.THUMB) meId = S.members[0].id;
const me = () => meId && mem(meId);

/* ---------- Sign in ---------- */
function showSignin() {
  $('signin').hidden = false; $('app').hidden = true;
  $('si-demo').innerHTML = '<small>Demo members</small>' + [S.members[0], S.members[2], S.members[1]].map((m) => `<button type="button" data-code="${m.code}">${m.code} · ${Kit.esc(m.name.split(' ')[0])} <em>${STL[status(m)]}</em></button>`).join('');
}
function signIn(code) {
  const m = S.members.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
  if (!m) { $('si-err').textContent = 'We couldn\'t find that code — check your card or ask the front desk.'; $('si-code').setAttribute('aria-invalid', 'true'); return; }
  meId = m.id; try { localStorage.setItem(ME, m.id); } catch (e) { /* ignore */ }
  if (!m.appUser) { m.appUser = true; save(); }
  $('signin').hidden = true; $('app').hidden = false; renderAll(); router.go('home');
}
$('si-form').addEventListener('submit', (e) => { e.preventDefault(); signIn($('si-code').value); });
$('si-code').addEventListener('input', () => { $('si-err').textContent = ''; $('si-code').removeAttribute('aria-invalid'); });
$('si-demo').addEventListener('click', (e) => { const b = e.target.closest('[data-code]'); if (b) signIn(b.dataset.code); });
$('out').addEventListener('click', () => { meId = null; try { localStorage.removeItem(ME); } catch (e) { /* ignore */ } showSignin(); });

/* ---------- Home ---------- */
// A deterministic QR-style pattern from the member code (for show — the desk scans the code)
const qr = (code) => { let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const cells = []; for (let i = 0; i < 121; i++) { h = (h * 1103515245 + 12345) >>> 0; const x = i % 11, y = Math.floor(i / 11), corner = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7); cells.push(corner ? 1 : (h >> 16) & 1); } return `<div class="qr" aria-hidden="true">${cells.map((c) => `<i class="${c ? 'on' : ''}"></i>`).join('')}</div>`; };
function renderHome() {
  const m = me(), s = status(m), monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const visitsMonth = m.visits.filter((v) => v >= monthStart).length, inToday = m.visits.some((v) => v >= today0());
  let streak = 0; for (let w = 0; w < 12; w++) { if (m.visits.some((v) => v > Date.now() - (w + 1) * 7 * DAY && v <= Date.now() - w * 7 * DAY)) streak++; else break; }
  $('mcard').innerHTML = `<div class="mc ${s}"><div class="mc-top"><span class="brand">IRON<b>PULSE</b></span><span class="tag t-${s}">${STL[s]}</span></div>${qr(m.code)}<b class="code">${m.code}</b><p>${PLANS[m.plan][0]} · valid until ${Kit.day(m.expires)}</p>
    ${['expired', 'frozen'].includes(s) ? `<button class="btn hot" data-go="account">${s === 'frozen' ? 'Membership frozen — see account' : 'Renew to get back in'}</button>` : inToday ? '<p class="in">✓ Checked in today</p>' : '<button class="btn hot" id="self">Check in now</button>'}</div>`;
  const booked = sessions().filter(({ c, date }) => book(c, date).in.includes(m.id) && classStart(c, date) > Date.now()).sort((a, b) => classStart(a.c, a.date) - classStart(b.c, b.date));
  $('stats').innerHTML = `<div><b>${visitsMonth}</b><span>visits this month</span></div><div><b>${streak}</b><span>week streak 🔥</span></div><div><b>${booked.length}</b><span>classes booked</span></div>`;
  $('next').innerHTML = booked.length ? `<ul class="cl">${clsItem(booked[0].c, booked[0].date)}</ul>` : '<p class="empty">No classes booked. <a href="#/classes">Find a class →</a></p>';
  const hrs = []; for (let h = 6; h <= 22; h += 2) hrs.push([h, S.members.reduce((a, x) => a + x.visits.filter((v) => v > Date.now() - 14 * DAY && Math.floor(new Date(v).getHours() / 2) * 2 === h).length, 0)]);
  const max = Math.max(1, ...hrs.map((x) => x[1])), nowH = Math.floor(new Date().getHours() / 2) * 2;
  $('busy').innerHTML = hrs.map(([h, v]) => `<div class="${h === nowH ? 'now' : ''}" title="${h}:00 — ${Math.round(v / max * 100)}% busy"><i style="height:${Math.max(6, v / max * 100)}%"></i><small>${h}</small></div>`).join('') + `<p>${inGym()} people training right now</p>`;
}
$('mcard').addEventListener('click', (e) => {
  if (e.target.closest('[data-go]')) { router.go('account'); return; }
  if (e.target.id !== 'self') return;
  const m = me(); m.visits.push(Date.now()); Kit.notify(db, `${m.name} checked in with the app`);
  renderAll(); Kit.toast('You\'re checked in — have a great session! 💪', { type: 'success' });
});

/* ---------- Classes ---------- */
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLabel = (date) => { const d = new Date(date + 'T12:00'); return Kit.iso(d) === Kit.iso(new Date()) ? 'Today' : Kit.iso(d) === Kit.iso(Kit.addDays(new Date(), 1)) ? 'Tmrw' : DN[d.getDay()]; };
function clsItem(c, date) {
  const m = me(), b = book(c, date), mine = b.in.includes(m.id), waitPos = b.wait.indexOf(m.id) + 1, left = c.cap - b.in.length, start = classStart(c, date), past = start < Date.now(), soon = start - Date.now() < 2 * 36e5, ref = `${c.id}@${date}`;
  const can = ['active', 'soon'].includes(status(m));
  const btn = past ? '<span class="pill">Finished</span>' : mine ? `<button class="btn ghost sm" data-cancel="${ref}">${soon ? 'Late cancel' : 'Cancel'}</button>` : waitPos ? `<button class="btn ghost sm" data-leave="${ref}">Leave waitlist</button>` : !can ? '<span class="pill">Renew to book</span>' : left > 0 ? `<button class="btn hot sm" data-book="${ref}">Book</button>` : `<button class="btn sm" data-wait="${ref}">Join waitlist</button>`;
  return `<li class="ci ${mine ? 'mine' : ''} ${past ? 'past' : ''}"><time>${c.time}<small>${dayLabel(date)}</small></time><div class="grow"><b>${c.name}</b><small>Coach ${c.coach} · ${mine ? '✓ You\'re booked' : waitPos ? `#${waitPos} on waitlist` : left > 0 ? `${left} spot${left === 1 ? '' : 's'} left` : 'Full'}</small><div class="fill"><i class="${left <= 0 ? 'full' : ''}" style="width:${Math.min(100, b.in.length / c.cap * 100)}%"></i></div></div>${btn}</li>`;
}
let datePick = Kit.iso(new Date());
function renderClasses() {
  const days = nextDays().map(Kit.iso); if (!days.includes(datePick)) datePick = days[0];
  $('days').innerHTML = days.map((iso) => `<button role="tab" data-d="${iso}" aria-selected="${iso === datePick}"><small>${dayLabel(iso)}</small><b>${new Date(iso + 'T12:00').getDate()}</b></button>`).join('');
  $('classes').innerHTML = sessions().filter((s) => s.date === datePick).sort((a, b) => a.c.time.localeCompare(b.c.time)).map((s) => clsItem(s.c, s.date)).join('') || '<li class="empty">No classes this day.</li>';
}
$('days').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) { datePick = b.dataset.d; renderClasses(); } });
document.querySelector('.ph-body').addEventListener('click', async (e) => {
  const m = me(), get = (a) => { const [id, date] = e.target.closest(`[${a}]`).getAttribute(a).split('@'); const c = S.classes.find((x) => x.id === id); return [c, date, book(c, date)]; };
  const when = (c, date) => `${dayLabel(date) === 'Today' ? 'today' : new Date(date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${c.time}`;
  if (e.target.closest('[data-book]')) { const [c, date, b] = get('data-book'); if (b.in.length >= c.cap) { Kit.toast('Just filled up — join the waitlist instead', { type: 'error' }); renderAll(); return; } b.in.push(m.id); Kit.notify(db, `${m.name} booked ${c.name} (${when(c, date)}) in the app`, { cls: c.id, date }); renderAll(); Kit.toast(`Booked ${c.name} · ${when(c, date)}`, { type: 'success' }); }
  if (e.target.closest('[data-wait]')) { const [c, date, b] = get('data-wait'); b.wait.push(m.id); Kit.notify(db, `${m.name} joined the ${c.name} waitlist (${when(c, date)})`, { cls: c.id, date }); renderAll(); Kit.toast(`You're #${b.wait.length} on the waitlist — we'll book you automatically if a spot opens`); }
  if (e.target.closest('[data-leave]')) { const [, , b] = get('data-leave'); b.wait = b.wait.filter((x) => x !== m.id); save(); renderAll(); Kit.toast('Removed from the waitlist'); }
  if (e.target.closest('[data-cancel]')) {
    const [c, date, b] = get('data-cancel'), late = classStart(c, date) - Date.now() < 2 * 36e5;
    if (!(await Kit.confirm(`Cancel ${c.name}?`, late ? 'It starts in under 2 hours, so this counts as a late cancellation.' : 'Your spot goes to the next person on the waitlist.', 'Cancel booking'))) return;
    b.in = b.in.filter((x) => x !== m.id); let extra = '';
    if (b.wait.length) { const up = b.wait.shift(); b.in.push(up); extra = ` · ${mem(up).name} moved up from the waitlist`; }
    Kit.notify(db, `${m.name} cancelled ${c.name} (${when(c, date)})${late ? ' — late' : ''}${extra}`, { cls: c.id, date }); renderAll(); Kit.toast('Booking cancelled');
  }
});

/* ---------- My bookings ---------- */
function renderMine() {
  const m = me(), mine = sessions().filter(({ c, date }) => book(c, date).in.includes(m.id) || book(c, date).wait.includes(m.id)).sort((a, b) => classStart(a.c, a.date) - classStart(b.c, b.date));
  $('mine').innerHTML = mine.map((s) => clsItem(s.c, s.date)).join('') || '<li class="empty">Nothing booked in the next 7 days. <a href="#/classes">Browse classes →</a></li>';
  $('visits').innerHTML = m.visits.slice().reverse().slice(0, 8).map((v) => `<li><span>${new Date(v).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>${Kit.time(v)}</b></li>`).join('') || '<li>No visits yet.</li>';
}

/* ---------- Account ---------- */
function renderAccount() {
  const m = me(), s = status(m);
  $('acct').innerHTML = `<div><span>Plan</span><b>${PLANS[m.plan][0]} · ${Kit.money(PLANS[m.plan][1])}/month</b></div><div><span>Status</span><b><span class="tag t-${s}">${STL[s]}</span></b></div><div><span>Valid until</span><b>${Kit.day(m.expires)}</b></div><div><span>Member since</span><b>${Kit.day(m.joined)}</b></div><div><span>Mobile</span><b>${Kit.esc(m.phone)}</b></div>`;
  $('reqs').innerHTML = S.requests.filter((r) => r.member === m.id).slice().reverse().map((r) => `<li><span>${r.kind === 'freeze' ? `Freeze ${r.weeks} weeks` : `Switch to ${PLANS[r.plan][0]}`}</span><b class="rq-${r.status}">${{ open: 'Waiting for the gym', approved: 'Approved ✓', declined: 'Declined' }[r.status]}</b></li>`).join('') || '<li>No requests.</li>';
  $('freeze').disabled = m.frozen || S.requests.some((r) => r.member === m.id && r.status === 'open' && r.kind === 'freeze');
}
$('renew').addEventListener('click', () => {
  const m = me();
  Kit.modal({ title: 'Renew membership', body: `<p>${PLANS[m.plan][0]} plan · ${status(m) === 'expired' ? 'expired' : 'valid until'} ${Kit.day(m.expires)}</p><div class="kit-seg" id="rn">${RENEW.map(([n, l, off], i) => `<button type="button" data-n="${n}" aria-pressed="${i === 0}">${l}${off < 1 ? ` −${Math.round((1 - off) * 100)}%` : ''}</button>`).join('')}</div><p id="rn-p" class="price"></p><div class="kit-field"><label for="rn-card">Card</label><input id="rn-card" value="4242 4242 4242 4242" inputmode="numeric"></div><p class="kit-hint">Demo checkout — test card pre-filled, nothing is charged.</p>`,
    onOpen: (d) => { const upd = () => { const n = +d.querySelector('#rn [aria-pressed=true]').dataset.n, off = RENEW.find((x) => x[0] === n)[2]; d.querySelector('#rn-p').textContent = Kit.money(PLANS[m.plan][1] * n * off); }; d.querySelector('#rn').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { d.querySelectorAll('#rn button').forEach((x) => x.setAttribute('aria-pressed', x === b)); upd(); } }); upd(); },
    actions: [{ label: 'Cancel' }, { label: 'Pay & renew', primary: true, onClick: (d) => {
      const n = +d.querySelector('#rn [aria-pressed=true]').dataset.n, total = d.querySelector('#rn-p').textContent;
      renewBy(m, n); Kit.notify(db, `${m.name} renewed online for ${n === 1 ? '1 month' : n === 12 ? '1 year' : n + ' months'} (${total})`);
      renderAll(); Kit.toast(`Renewed until ${Kit.day(m.expires)} — receipt sent by SMS`, { type: 'success' });
    } }] });
});
$('freeze').addEventListener('click', () => Kit.modal({ title: 'Request a freeze', body: '<p>Pause your membership while you\'re away — the days are added back to your plan.</p><div class="kit-seg" id="fw"><button type="button" data-w="1" aria-pressed="false">1 week</button><button type="button" data-w="2" aria-pressed="true">2 weeks</button><button type="button" data-w="4" aria-pressed="false">4 weeks</button></div><div class="kit-field"><label for="fz-n">Reason (optional)</label><input id="fz-n" placeholder="e.g. Travelling"></div>',
  onOpen: (d) => d.querySelector('#fw').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) d.querySelectorAll('#fw button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }),
  actions: [{ label: 'Cancel' }, { label: 'Send request', primary: true, onClick: (d) => { const m = me(), weeks = +d.querySelector('#fw [aria-pressed=true]').dataset.w; S.requests.push({ id: Kit.uid(), member: m.id, kind: 'freeze', weeks, note: d.querySelector('#fz-n').value.trim(), ts: Date.now(), status: 'open' }); Kit.notify(db, `${m.name} asked to freeze for ${weeks} week${weeks > 1 ? 's' : ''}`); renderAll(); Kit.toast('Request sent — the gym usually replies within a few hours', { type: 'success' }); } }] }));
$('plan').addEventListener('click', () => { const m = me(); Kit.modal({ title: 'Change plan', body: `<div class="kit-seg" id="pl" style="flex-direction:column;align-items:stretch">${Object.entries(PLANS).map(([k, [n, p]]) => `<button type="button" data-p="${k}" aria-pressed="${k === m.plan}" ${k === m.plan ? 'disabled' : ''}>${n} · ${Kit.money(p)}/month${k === m.plan ? ' (current)' : ''}</button>`).join('')}</div>`,
  onOpen: (d) => d.querySelector('#pl').addEventListener('click', (e) => { const b = e.target.closest('button:not([disabled])'); if (b) d.querySelectorAll('#pl button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }),
  actions: [{ label: 'Cancel' }, { label: 'Request change', primary: true, onClick: (d) => { const sel = d.querySelector('#pl [aria-pressed=true]:not([disabled])'); if (!sel) { Kit.toast('Pick a new plan first', { type: 'error' }); return false; } S.requests.push({ id: Kit.uid(), member: m.id, kind: 'plan', plan: sel.dataset.p, ts: Date.now(), status: 'open' }); Kit.notify(db, `${m.name} asked to switch to ${PLANS[sel.dataset.p][0]}`); renderAll(); Kit.toast('Request sent to the front desk', { type: 'success' }); } }] }); });

/* ---------- Live sync, router ---------- */
function renderAll() {
  const m = me(); if (!m) { showSignin(); return; }
  $('hi').textContent = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  $('hi-name').textContent = m.name.split(' ')[0]; $('hi-av').textContent = initials(m.name);
  renderHome(); renderClasses(); renderMine(); renderAccount();
}
let lastState = '';
const snapshot = () => { const m = me(); return m ? JSON.stringify([status(m), m.plan, S.requests.filter((r) => r.member === m.id).map((r) => r.status), sessions().filter(({ c, date }) => book(c, date).in.includes(m.id)).map(({ c, date }) => c.id + date)]) : ''; };
Kit.sync(db, () => {
  const before = lastState; renderAll(); lastState = snapshot();
  if (before && before !== lastState) Kit.toast('🔔 Your membership or bookings were updated by the gym', { ms: 5000 });
});
const router = Kit.router('home', () => { const b = document.querySelector('.ph-body'); if (b) b.scrollTop = 0; });
if (me()) { $('app').hidden = false; renderAll(); } else showSignin();
lastState = snapshot();
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample members and classes for both the member app and staff panel.', 'Reset')) db.reset(); });
Kit.commands([{ label: 'Home', run: () => router.go('home') }, { label: 'Book a class', run: () => router.go('classes') }, { label: 'My bookings', run: () => router.go('mine') }, { label: 'Membership & renewals', run: () => router.go('account') }, { label: 'Staff sign-in', run: () => { location.href = 'gym-app-admin.html'; } }]);
