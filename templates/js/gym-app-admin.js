/* IronPulse Staff — today, check-in, schedule, members, app requests and reports.
   Shares its saved data with the member app (js/gym-app-data.js) and updates live when members book or send requests. */
Kit.login({ app: 'IronPulse', key: 'ironpulse', email: 'desk@ironpulse.gym', password: 'demo1234', name: 'Rana Saleh', role: 'Gym manager', accent: '#FF3D5A', clientUrl: 'gym-app.html', clientLabel: 'member app' });
const tools = document.getElementById('tools');
const bell = Kit.bell(tools, db, { onOpen: (n) => { if (n.cls) { const c = S.classes.find((x) => x.id === n.cls); if (c) { router.go('schedule'); classModal(c, n.date); } } else router.go('requests'); } });
Kit.userMenu(tools, { key: 'ironpulse', clientUrl: 'gym-app.html', clientLabel: 'member app' });

/* ---------- Today ---------- */
function renderToday() {
  const active = S.members.filter((m) => ['active', 'soon'].includes(status(m)));
  document.getElementById('today-sub').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('inside').textContent = inGym();
  document.getElementById('k-active').textContent = active.length;
  document.getElementById('k-new').textContent = `+${S.members.filter((m) => m.joined > Date.now() - 30 * DAY).length} joined this month`;
  document.getElementById('k-checkins').textContent = S.members.reduce((a, m) => a + m.visits.filter((v) => v >= today0()).length, 0);
  const todayCls = S.classes.filter((c) => c.day === new Date().getDay()).sort((a, b) => a.time.localeCompare(b.time));
  const booked = todayCls.reduce((a, c) => a + book(c).in.length, 0), cap = todayCls.reduce((a, c) => a + c.cap, 0);
  document.getElementById('k-booked').textContent = `${booked}/${cap}`; document.getElementById('k-fill').textContent = cap ? Math.round(booked / cap * 100) + '% full' : 'no classes';
  document.getElementById('k-mrr').textContent = Kit.money(active.reduce((a, m) => a + PLANS[m.plan][1], 0)).replace('.00', '');
  const nowT = new Date().toTimeString().slice(0, 5);
  document.getElementById('t-classes').innerHTML = todayCls.map((c) => { const b = book(c), pct = b.in.length / c.cap * 100; return `<li><span class="av" style="width:56px">${c.time}</span><div class="grow"><b>${c.name}</b><small>Coach ${c.coach} · ${b.in.length}/${c.cap} booked${b.wait.length ? ` · ${b.wait.length} waiting` : ''}</small><div class="fill"><i class="${pct >= 100 ? 'full' : ''}" style="width:${Math.min(100, pct)}%"></i></div></div>${c.time < nowT ? '<span class="tag t-frozen">Done</span>' : `<button class="link" data-cls="${c.id}@${Kit.iso(new Date())}">Manage</button>`}</li>`; }).join('') || '<li>No classes today.</li>';
  const attention = S.members.filter((m) => ['soon', 'expired'].includes(status(m)) && m.expires > Date.now() - 20 * DAY).sort((a, b) => a.expires - b.expires).slice(0, 5);
  document.getElementById('t-expiring').innerHTML = attention.map((m) => `<li><span class="av">${initials(m.name)}</span><div class="grow"><b>${Kit.esc(m.name)}</b><small>${PLANS[m.plan][0]} · ${status(m) === 'expired' ? 'expired' : 'expires'} ${Kit.day(m.expires)}</small></div><button class="link" data-renew="${m.id}">Renew</button></li>`).join('') || '<li>All memberships are up to date.</li>';
  document.getElementById('t-app').innerHTML = S.notes.slice().reverse().slice(0, 5).map((n) => `<li><span class="av">📱</span><div class="grow"><b>${Kit.esc(n.text)}</b><small>${Kit.ago(n.ts)}</small></div></li>`).join('') || '<li>No app activity yet — bookings, renewals and requests from the member app show up here.</li>';
}
document.querySelector('[data-view=today]').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cls]'); if (c) { const [id, date] = c.dataset.cls.split('@'); classModal(S.classes.find((x) => x.id === id), date); }
  const r = e.target.closest('[data-renew]'); if (r) renew(mem(r.dataset.renew));
});

/* ---------- Check-in ---------- */
const ci = document.getElementById('ci');
function findMembers(q) { q = q.trim().toLowerCase(); if (q.length < 2) return []; return S.members.filter((m) => m.code.toLowerCase() === q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)).slice(0, 5); }
ci.addEventListener('input', () => {
  const list = findMembers(ci.value);
  document.getElementById('suggest').innerHTML = list.map((m) => `<li><button data-m="${m.id}"><span class="av">${initials(m.name)}</span><span style="flex:1"><b>${Kit.esc(m.name)}</b><br><small style="color:var(--muted)">${m.code} · ${PLANS[m.plan][0]}</small></span><span class="tag t-${status(m)}">${STL[status(m)]}</span></button></li>`).join('');
});
ci.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const l = findMembers(ci.value); if (l.length) checkIn(l[0]); else result(null); } });
document.getElementById('suggest').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) checkIn(mem(b.dataset.m)); });
function checkIn(m) {
  ci.value = ''; document.getElementById('suggest').innerHTML = '';
  const st = status(m);
  if (st === 'expired' || st === 'frozen') { result(m, st); return; }
  if (m.visits.some((v) => Date.now() - v < 30 * 6e4)) { result(m, 'dup'); return; }
  m.visits.push(Date.now()); save(); renderAll(); result(m, 'ok');
}
function result(m, st) {
  const box = document.getElementById('ci-result');
  if (!m) { box.innerHTML = `<div class="result bad"><h2>Member not found</h2><p>Check the code on the card, or search by name.</p></div>`; return; }
  if (st === 'ok' || st === 'dup') {
    const todayCls = S.classes.filter((c) => c.day === new Date().getDay() && book(c).in.includes(m.id));
    box.innerHTML = `<div class="result ok"><span class="av" style="width:64px;height:64px;font-size:22px">${initials(m.name)}</span><h2>${st === 'dup' ? 'Already checked in' : 'Welcome, ' + Kit.esc(m.name.split(' ')[0]) + '!'}</h2><p>${PLANS[m.plan][0]} plan · valid until ${Kit.day(m.expires)} · visit #${m.visits.length} this period</p>${status(m) === 'soon' ? `<p style="color:var(--amber)">Membership expires ${Kit.day(m.expires)} — offer a renewal.</p>` : ''}${todayCls.length ? `<p style="color:var(--cyan)">Booked today: ${todayCls.map((c) => c.time + ' ' + c.name).join(', ')}</p>` : ''}</div>`;
    if (st === 'ok') Kit.toast(`${m.name} checked in`, { type: 'success', undo: () => { m.visits.pop(); save(); renderAll(); box.innerHTML = ''; } });
  } else {
    box.innerHTML = `<div class="result bad"><h2>${st === 'frozen' ? 'Membership frozen' : 'Membership expired'}</h2><p>${Kit.esc(m.name)} · ${m.code} · ${st === 'frozen' ? 'Unfreeze to allow entry.' : 'Expired on ' + Kit.day(m.expires) + '.'}</p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn hot" id="ci-fix">${st === 'frozen' ? 'Unfreeze' : 'Renew 1 month'}</button><button class="btn" id="ci-day">Sell day pass $10</button></div></div>`;
    document.getElementById('ci-fix').onclick = () => { if (st === 'frozen') m.frozen = false; else renewBy(m, 1); save(); checkIn(m); };
    document.getElementById('ci-day').onclick = () => { Kit.toast('Day pass sold — $10', { type: 'success' }); m.visits.push(Date.now()); save(); renderAll(); box.innerHTML = `<div class="result ok"><h2>Day pass · enjoy your workout!</h2></div>`; };
  }
}
function renderQuick() { document.getElementById('quick').innerHTML = '<span class="kit-hint" style="width:100%">Demo codes:</span>' + [S.members[0], S.members[1], S.members[2], S.members.find((m) => m.frozen)].filter(Boolean).map((m) => `<button data-code="${m.code}">${m.code} · ${STL[status(m)]}</button>`).join(''); }
document.getElementById('quick').addEventListener('click', (e) => { const b = e.target.closest('[data-code]'); if (b) checkIn(S.members.find((m) => m.code === b.dataset.code)); });

/* ---------- Schedule ---------- */
let weekOff = 0;
function renderWeek() {
  const nowT = new Date().toTimeString().slice(0, 5), ws = Kit.addDays(weekStart(), weekOff * 7);
  document.getElementById('w-label').textContent = `${Kit.day(ws)} – ${Kit.day(Kit.addDays(ws, 6))}`;
  document.getElementById('week').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d, i) => {
    const date = Kit.addDays(ws, i), iso = Kit.iso(date), isToday = iso === Kit.iso(new Date()), past = date < new Date(today0());
    return `<div class="day ${isToday ? 'today' : ''}"><h3>${date.toLocaleDateString('en-GB', { weekday: 'short' })}<b>${date.getDate()}</b></h3>${S.classes.filter((c) => c.day === d).sort((a, b) => a.time.localeCompare(b.time)).map((c) => { const b = book(c, iso), pct = b.in.length / c.cap * 100; return `<button class="cls ${past || (isToday && c.time < nowT) ? 'past' : ''}" data-cls="${c.id}@${iso}"><time>${c.time}</time><b>${c.name}</b><small>${c.coach} · ${b.in.length}/${c.cap}${b.wait.length ? ` +${b.wait.length} wait` : ''}</small><div class="fill"><i class="${pct >= 100 ? 'full' : ''}" style="width:${Math.min(100, pct)}%"></i></div></button>`; }).join('')}</div>`;
  }).join('');
}
document.getElementById('week').addEventListener('click', (e) => { const b = e.target.closest('[data-cls]'); if (!b) return; const [id, date] = b.dataset.cls.split('@'); classModal(S.classes.find((c) => c.id === id), date); });
document.getElementById('w-prev').onclick = () => { weekOff--; renderWeek(); };
document.getElementById('w-next').onclick = () => { weekOff++; renderWeek(); };
document.getElementById('w-now').onclick = () => { weekOff = 0; renderWeek(); };
function classModal(c, date = dateFor(c)) {
  const draw = (m) => {
    const b = book(c, date);
    m.querySelector('.kit-m-body').innerHTML = `<p>${new Date(date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} · ${c.time} · Coach ${c.coach} · <b style="color:var(--ink)">${b.in.length}/${c.cap}</b> booked</p>
      <div class="kit-field"><label for="add-m">Book a member</label><div class="kit-row" style="grid-template-columns:1fr auto"><select id="add-m"><option value="">Choose member…</option>${S.members.filter((x) => !b.in.includes(x.id) && !b.wait.includes(x.id) && ['active', 'soon'].includes(status(x))).sort((x, y) => x.name.localeCompare(y.name)).map((x) => `<option value="${x.id}">${Kit.esc(x.name)} · ${x.code}</option>`).join('')}</select><button type="button" class="kit-btn primary" id="add-go">${b.in.length >= c.cap ? 'Add to waitlist' : 'Book'}</button></div></div>
      <div class="kit-field"><span class="kit-label">Class list · tick to mark attendance</span><ul class="roster">${b.in.map((id) => { const x = mem(id); return x ? `<li><label><input type="checkbox" data-att="${id}" ${b.attended.includes(id) ? 'checked' : ''}>${Kit.esc(x.name)} <small style="color:var(--muted)">${x.code}</small></label><button type="button" class="link red" data-rm="${id}">Cancel</button></li>` : ''; }).join('') || '<li>No bookings yet.</li>'}</ul></div>
      ${b.wait.length ? `<div class="kit-field"><span class="kit-label">Waitlist · moves up automatically when someone cancels</span><ul class="roster">${b.wait.map((id, i) => `<li><span>${i + 1}. ${Kit.esc(mem(id).name)}</span><button type="button" class="link red" data-rmw="${id}">Remove</button></li>`).join('')}</ul></div>` : ''}`;
  };
  Kit.modal({ title: c.name, wide: true, body: '', onOpen: (m) => {
    draw(m); openClass = () => draw(m);
    m.addEventListener('click', (e) => {
      const b = book(c, date);
      if (e.target.closest('#add-go')) { const id = m.querySelector('#add-m').value; if (!id) return; if (b.in.length >= c.cap) { b.wait.push(id); Kit.toast(`${mem(id).name} added to the waitlist`); } else { b.in.push(id); Kit.toast(`${mem(id).name} booked`, { type: 'success' }); } save(); renderAll(); draw(m); }
      const rm = e.target.closest('[data-rm]'); if (rm) { b.in = b.in.filter((x) => x !== rm.dataset.rm); b.attended = b.attended.filter((x) => x !== rm.dataset.rm); let msg = `${mem(rm.dataset.rm).name} cancelled`; if (b.wait.length) { const up = b.wait.shift(); b.in.push(up); msg += ` · ${mem(up).name} moved up from the waitlist`; } save(); renderAll(); draw(m); Kit.toast(msg); }
      const rw = e.target.closest('[data-rmw]'); if (rw) { b.wait = b.wait.filter((x) => x !== rw.dataset.rmw); save(); renderAll(); draw(m); }
    });
    m.addEventListener('change', (e) => { const a = e.target.closest('[data-att]'); if (!a) return; const b = book(c, date); if (a.checked) b.attended.push(a.dataset.att); else b.attended = b.attended.filter((x) => x !== a.dataset.att); save(); });
  }, onClose: () => { openClass = null; }, actions: [{ label: 'Delete class', danger: true, onClick: async () => { if (!(await Kit.confirm(`Delete ${c.name}?`, 'It will be removed from the weekly timetable and the member app.', 'Delete'))) return false; S.classes = S.classes.filter((x) => x !== c); save(); renderAll(); } }, { label: 'Done', primary: true }] });
}
let openClass = null;
document.getElementById('add-class').addEventListener('click', () => Kit.modal({ title: 'Add a weekly class', body: `<div class="kit-row"><div class="kit-field"><label for="nc-n">Class name</label><input id="nc-n" required placeholder="e.g. Kettlebells"></div><div class="kit-field"><label for="nc-c">Coach</label><input id="nc-c" required></div></div>
  <div class="kit-row"><div class="kit-field"><label for="nc-d">Day</label><select id="nc-d">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}</option>`).join('')}</select></div><div class="kit-field"><label for="nc-t">Time</label><input id="nc-t" type="time" value="18:00" required></div></div><div class="kit-field"><label for="nc-cap">Capacity</label><input id="nc-cap" type="number" min="1" max="60" value="16" required></div>`,
  onOpen: (d) => d.querySelector('#nc-n').focus(),
  actions: [{ label: 'Cancel' }, { label: 'Add class', primary: true, submit: true, onClick: (d) => { const v = (s) => d.querySelector(s).value; S.classes.push({ id: Kit.uid(), name: v('#nc-n'), coach: v('#nc-c'), day: +v('#nc-d'), time: v('#nc-t'), cap: +v('#nc-cap') }); save(); renderAll(); Kit.toast('Class added — members can book it in the app now', { type: 'success' }); } }] }));

/* ---------- Members ---------- */
function renderMembers() {
  const q = document.getElementById('m-q').value.toLowerCase(), st = document.getElementById('m-st').value;
  const list = S.members.filter((m) => (st === 'all' || status(m) === st) && (m.name + m.code + m.phone).toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById('m-sub').textContent = `${list.length} of ${S.members.length} members`;
  document.getElementById('m-rows').innerHTML = list.map((m) => { const s = status(m), v30 = m.visits.filter((v) => v > Date.now() - 30 * DAY).length, last = m.visits[m.visits.length - 1];
    return `<tr data-m="${m.id}"><td><div style="display:flex;align-items:center;gap:10px"><span class="av">${initials(m.name)}</span><b>${Kit.esc(m.name)}</b></div></td><td>${m.code}</td><td>${PLANS[m.plan][0]} · $${PLANS[m.plan][1]}</td><td><span class="tag t-${s}">${STL[s]}</span></td><td>${Kit.day(m.expires)}</td><td>${v30}</td><td>${last ? Kit.ago(last) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="kit-empty-state">No members match.</td></tr>';
}
document.getElementById('m-q').addEventListener('input', renderMembers);
document.getElementById('m-st').addEventListener('change', renderMembers);
document.getElementById('m-rows').addEventListener('click', (e) => { const r = e.target.closest('[data-m]'); if (r) memberModal(mem(r.dataset.m)); });
function renew(m) {
  Kit.modal({ title: `Renew ${m.name}`, body: `<p>${PLANS[m.plan][0]} plan · currently ${status(m) === 'expired' ? 'expired' : 'valid until'} ${Kit.day(m.expires)}</p><div class="kit-seg" id="rn">${RENEW.map(([n, l, off], i) => `<button type="button" data-n="${n}" aria-pressed="${i === 0}">${l}${off < 1 ? ` −${Math.round((1 - off) * 100)}%` : ''}</button>`).join('')}</div><p id="rn-p" style="font-size:20px;color:var(--ink)"></p>`,
    onOpen: (d) => { const upd = () => { const n = +d.querySelector('#rn [aria-pressed=true]').dataset.n, off = RENEW.find((x) => x[0] === n)[2]; d.querySelector('#rn-p').textContent = `Total ${Kit.money(PLANS[m.plan][1] * n * off)}`; }; d.querySelector('#rn').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { d.querySelectorAll('#rn button').forEach((x) => x.setAttribute('aria-pressed', x === b)); upd(); } }); upd(); },
    actions: [{ label: 'Cancel' }, { label: 'Take payment & renew', primary: true, onClick: (d) => { const n = +d.querySelector('#rn [aria-pressed=true]').dataset.n, old = m.expires; renewBy(m, n); save(); renderAll(); Kit.toast(`${m.name} renewed until ${Kit.day(m.expires)}`, { type: 'success', undo: () => { m.expires = old; save(); renderAll(); } }); } }] });
}
function memberModal(m) {
  const s = status(m), byWeek = [3, 2, 1, 0].map((w) => ({ label: w ? `${w}w ago` : 'This wk', value: m.visits.filter((v) => v > Date.now() - (w + 1) * 7 * DAY && v <= Date.now() - w * 7 * DAY).length }));
  Kit.modal({ title: `${m.name} · ${m.code}`, wide: true, body: `<div class="kit-row"><div><p>Status: <span class="tag t-${s}">${STL[s]}</span></p><p>Plan: <b style="color:var(--ink)">${PLANS[m.plan][0]}</b> · ${Kit.money(PLANS[m.plan][1])}/month</p><p>Valid until: <b style="color:var(--ink)">${Kit.day(m.expires)}</b></p><p>Member since ${Kit.day(m.joined)} · ${Kit.esc(m.phone)}</p>${m.appUser ? '<p style="color:var(--cyan)">📱 Uses the member app</p>' : ''}</div><div><span class="kit-label">Visits per week</span><div id="mv"></div></div></div>
    <div class="kit-field"><label for="mp">Change plan</label><select id="mp">${Object.entries(PLANS).map(([k, [n, p]]) => `<option value="${k}" ${k === m.plan ? 'selected' : ''}>${n} · $${p}/month</option>`).join('')}</select></div>`,
    onOpen: (d) => { Kit.bars(d.querySelector('#mv'), byWeek); d.querySelector('#mp').addEventListener('change', (e) => { const old = m.plan; m.plan = e.target.value; save(); renderAll(); Kit.toast(`Plan changed to ${PLANS[m.plan][0]}`, { undo: () => { m.plan = old; save(); renderAll(); } }); }); },
    actions: [{ label: 'Delete', danger: true, onClick: async () => { if (!(await Kit.confirm(`Delete ${m.name}?`, 'Their visit history will be removed.', 'Delete'))) return false; const i = S.members.indexOf(m); S.members.splice(i, 1); save(); renderAll(); Kit.toast('Member deleted', { undo: () => { S.members.splice(i, 0, m); save(); renderAll(); } }); } },
      { label: m.frozen ? 'Unfreeze' : 'Freeze', onClick: () => { m.frozen = !m.frozen; if (!m.frozen) m.expires += 14 * DAY; save(); renderAll(); Kit.toast(m.frozen ? 'Membership frozen' : 'Unfrozen — 2 weeks added to make up for the freeze'); } },
      { label: 'Check in now', onClick: () => { location.hash = '#/checkin'; setTimeout(() => checkIn(m)); } }, { label: 'Renew', primary: true, onClick: () => { setTimeout(() => renew(m)); } }] });
}
document.getElementById('m-add').addEventListener('click', () => Kit.modal({ title: 'New member', body: `<div class="kit-row"><div class="kit-field"><label for="nm-n">Full name</label><input id="nm-n" required></div><div class="kit-field"><label for="nm-p">Mobile</label><input id="nm-p" type="tel" required></div></div><div class="kit-field"><label for="nm-pl">Plan</label><select id="nm-pl">${Object.entries(PLANS).map(([k, [n, p]]) => `<option value="${k}" ${k === 'pro' ? 'selected' : ''}>${n} · $${p}/month</option>`).join('')}</select></div>`,
  onOpen: (d) => d.querySelector('#nm-n').focus(),
  actions: [{ label: 'Cancel' }, { label: 'Create & take first payment', primary: true, submit: true, onClick: (d) => {
    const code = 'IP-' + (Math.max(...S.members.map((m) => +m.code.slice(3))) + 1), exp = new Date(); exp.setMonth(exp.getMonth() + 1);
    S.members.push({ id: Kit.uid(), code, name: d.querySelector('#nm-n').value.trim(), phone: d.querySelector('#nm-p').value.trim(), plan: d.querySelector('#nm-pl').value, frozen: false, expires: exp.getTime(), joined: Date.now(), visits: [] });
    save(); renderAll(); Kit.toast(`Welcome aboard! Member code ${code} — they can sign in to the app with it`, { type: 'success' });
  } }] }));
document.getElementById('m-export').addEventListener('click', () => Kit.csv('ironpulse-members.csv', [['Code', 'Name', 'Phone', 'Plan', 'Monthly price', 'Status', 'Expires', 'Visits (30d)'], ...S.members.map((m) => [m.code, m.name, m.phone, PLANS[m.plan][0], PLANS[m.plan][1], STL[status(m)], Kit.iso(new Date(m.expires)), m.visits.filter((v) => v > Date.now() - 30 * DAY).length])]));

/* ---------- App requests ---------- */
function renderRequests() {
  const open = S.requests.filter((r) => r.status === 'open'), n = document.getElementById('rq-n'); n.hidden = !open.length; n.textContent = open.length;
  document.getElementById('reqs').innerHTML = S.requests.slice().reverse().map((r) => { const m = mem(r.member); if (!m) return ''; return `<li class="${r.status}" data-r="${r.id}"><span class="av">${initials(m.name)}</span><div class="grow"><b>${Kit.esc(m.name)} · ${r.kind === 'freeze' ? `Freeze for ${r.weeks} weeks` : `Switch to ${PLANS[r.plan][0]}`}</b><small>${m.code} · ${PLANS[m.plan][0]} · ${Kit.ago(r.ts)}${r.note ? ` · “${Kit.esc(r.note)}”` : ''}</small></div>${r.status === 'open' ? '<button class="btn" data-no>Decline</button><button class="btn hot" data-yes>Approve</button>' : `<span class="tag ${r.status === 'approved' ? 't-active' : 't-expired'}">${r.status === 'approved' ? 'Approved' : 'Declined'}</span>`}</li>`; }).join('')
    || '<li>No requests yet. Members can ask to freeze or change plan from the app.</li>';
}
document.getElementById('reqs').addEventListener('click', (e) => {
  const li = e.target.closest('[data-r]'); if (!li) return; const r = S.requests.find((x) => x.id === li.dataset.r), m = mem(r.member);
  if (e.target.closest('[data-yes]')) {
    if (r.kind === 'freeze') { m.frozen = true; m.expires += r.weeks * 7 * DAY; } else m.plan = r.plan;
    r.status = 'approved'; save(); renderAll(); Kit.toast(`Approved — ${m.name} sees it in the app`, { type: 'success' });
  }
  if (e.target.closest('[data-no]')) { r.status = 'declined'; save(); renderAll(); Kit.toast('Request declined', { undo: () => { r.status = 'open'; save(); renderAll(); } }); }
});

/* ---------- Reports ---------- */
function renderReports() {
  const active = S.members.filter((m) => ['active', 'soon'].includes(status(m)));
  document.getElementById('r-mrr').textContent = Kit.money(active.reduce((a, m) => a + PLANS[m.plan][1], 0)).replace('.00', '');
  document.getElementById('r-visits').textContent = (active.reduce((a, m) => a + m.visits.filter((v) => v > Date.now() - 30 * DAY).length, 0) / Math.max(1, active.length)).toFixed(1);
  document.getElementById('r-risk').textContent = active.filter((m) => !m.visits.some((v) => v > Date.now() - 14 * DAY)).length;
  document.getElementById('r-churn').textContent = S.members.filter((m) => status(m) === 'expired' && m.expires > Date.now() - 30 * DAY).length;
  const hours = []; for (let h = 6; h <= 21; h++) hours.push({ label: String(h), value: S.members.reduce((a, m) => a + m.visits.filter((v) => v > Date.now() - 7 * DAY && new Date(v).getHours() === h).length, 0) });
  Kit.bars(document.getElementById('ch-hours'), hours);
  const days = []; for (let d = 13; d >= 0; d--) { const s = today0() - d * DAY; days.push({ label: new Date(s).getDate() + '', value: S.members.reduce((a, m) => a + m.visits.filter((v) => v >= s && v < s + DAY).length, 0) }); }
  Kit.line(document.getElementById('ch-new'), days);
  document.getElementById('r-plans').innerHTML = Object.entries(PLANS).map(([k, [n, p]]) => { const c = active.filter((m) => m.plan === k).length; return `<li><div class="grow"><b>${n}</b><small>${c} members · ${Kit.money(c * p).replace('.00', '')}/month</small><div class="fill"><i style="width:${c / Math.max(1, active.length) * 100}%"></i></div></div><b>${Math.round(c / Math.max(1, active.length) * 100)}%</b></li>`; }).join('');
}

function renderAll() { renderToday(); renderWeek(); renderMembers(); renderRequests(); renderReports(); renderQuick(); }
Kit.sync(db, () => { renderAll(); bell.refresh(); if (openClass) openClass(); });
renderAll();
const router = Kit.router('today', (v) => { if (v === 'checkin') setTimeout(() => ci.focus()); if (v === 'reports') renderReports(); });
setInterval(() => { document.getElementById('inside').textContent = inGym(); }, 30000);
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample members and classes for both the staff panel and member app.', 'Reset')) db.reset(); });
Kit.key('c', () => router.go('checkin'), 'Open check-in');
Kit.key('n', () => { router.go('members'); document.getElementById('m-add').click(); }, 'New member');
['today', 'checkin', 'schedule', 'members', 'requests', 'reports'].forEach((v, i) => Kit.key(String(i + 1), () => router.go(v), `Go to ${v}`));
Kit.commands([{ label: 'Check in a member', hint: 'C', run: () => router.go('checkin') }, { label: 'New member', hint: 'N', run: () => { router.go('members'); document.getElementById('m-add').click(); } }, { label: 'Add a class', run: () => { router.go('schedule'); document.getElementById('add-class').click(); } },
  { label: 'Show expiring memberships', run: () => { router.go('members'); document.getElementById('m-st').value = 'soon'; renderMembers(); } }, { label: 'Show expired members', run: () => { router.go('members'); document.getElementById('m-st').value = 'expired'; renderMembers(); } },
  { label: 'App requests', hint: '5', run: () => router.go('requests') }, { label: 'Go to Schedule', hint: '3', run: () => router.go('schedule') }, { label: 'Go to Reports', hint: '6', run: () => router.go('reports') }, { label: 'Export members', run: () => document.getElementById('m-export').click() },
  { label: 'Open member app', run: () => window.open('gym-app.html', '_blank') }, { label: 'Sign out', run: () => Kit.signOut('ironpulse') }]);
