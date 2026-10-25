/* CarePoint — patient site: book, manage and view appointments.
   Data and rules live in clinic-data.js; staff see every change live in clinic-admin.html. */

/* ---------- Booking wizard ---------- */
const STEPS = ['Service', 'Doctor', 'Time', 'Details', 'Confirm'];
const blank = () => ({ service: null, doctor: 'any', date: null, time: null, patient: { name: '', phone: me(), email: '', notes: '', first: 'yes' } });
const me = () => { try { return localStorage.getItem('apexhub:carepoint-me') || ''; } catch (e) { return ''; } };
const rememberMe = (phone) => { try { localStorage.setItem('apexhub:carepoint-me', phone); } catch (e) { /* ignore */ } };
let step = 0, B = blank(), booked = null;
const body = document.getElementById('w-body');
function render() {
  document.getElementById('pill').textContent = S.settings.onlineBooking ? '✓ Same-day appointments available' : '⏸ Online booking is paused — please call us';
  document.getElementById('steps').innerHTML = STEPS.map((s, i) => `<li data-n="${i + 1}" class="${i === step ? 'on' : i < step ? 'done' : ''}">${i < step ? '✓ ' : ''}${s}</li>`).join('');
  document.getElementById('w-foot').hidden = !!booked || !S.settings.onlineBooking;
  document.getElementById('w-back').style.visibility = step ? 'visible' : 'hidden';
  const next = document.getElementById('w-next');
  if (!S.settings.onlineBooking) { body.innerHTML = '<div class="done-box"><div class="check">☎</div><h2>Online booking is paused</h2><p style="color:var(--muted)">Please call reception on +00 000 000 0000 and we\'ll find you a time.</p></div>'; return; }
  if (booked) { body.innerHTML = doneView(); return; }
  if (step === 0) {
    body.innerHTML = `<h2 id="w-title">What do you need?</h2><p>Choose a service — prices shown before you book.</p><div class="opts">${SERVICES.map((s) => `<button class="opt" data-sv="${s.id}" aria-pressed="${B.service === s.id}"><div class="grow"><b>${s.name}</b><small>${s.spec} · ${s.mins} min</small></div><span class="price">${Kit.money(s.price).replace('.00', '')}</span></button>`).join('')}</div>`;
    next.disabled = !B.service; next.textContent = 'Continue';
  } else if (step === 1) {
    const sv = service(B.service), docs = DOCTORS.filter((d) => d.spec === sv.spec);
    body.innerHTML = `<h2 id="w-title">Choose your doctor</h2><p>${sv.name}</p><div class="opts"><button class="opt" data-doc="any" aria-pressed="${B.doctor === 'any'}"><div class="grow"><b>First available doctor</b><small>Fastest option</small></div></button>
      ${docs.map((d) => { const n = nextFree(d.id); return `<button class="opt" data-doc="${d.id}" aria-pressed="${B.doctor === d.id}"><img src="${U(d.img, 104, 104)}" alt=""><div class="grow"><b>${d.name}</b><small>${d.spec} · ${d.yrs} yrs experience</small><small style="color:var(--green)">${n ? `Next: ${niceDate(n.date)} ${n.time}` : 'Fully booked'}</small></div></button>`; }).join('')}</div>`;
    next.disabled = false; next.textContent = 'Continue';
  } else if (step === 2) {
    const docs = B.doctor === 'any' ? DOCTORS.filter((d) => d.spec === service(B.service).spec) : [doctor(B.doctor)];
    const days = Array.from({ length: 14 }, (_, i) => Kit.iso(Kit.addDays(new Date(), i)));
    const slotsFor = (date) => [...new Set(docs.flatMap((d) => freeSlots(d.id, date)))].sort();
    if (!B.date || !slotsFor(B.date).length) B.date = days.find((d) => slotsFor(d).length) || days[0];
    const sl = slotsFor(B.date);
    body.innerHTML = `<h2 id="w-title">Pick a time</h2><p>${B.doctor === 'any' ? 'Any ' + service(B.service).spec.toLowerCase() + ' doctor' : doctor(B.doctor).name} · 30 min · book at least ${S.settings.minNotice} h ahead</p>
      <div class="dates" role="group" aria-label="Date">${days.map((d) => { const dt = new Date(d + 'T12:00'); return `<button class="date" data-date="${d}" aria-pressed="${d === B.date}" ${slotsFor(d).length ? '' : 'disabled'}><span>${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${dt.getDate()}</b><span>${slotsFor(d).length} free</span></button>`; }).join('')}</div>
      <div class="slots" role="group" aria-label="Time">${sl.map((t) => `<button class="slot" data-time="${t}" aria-pressed="${t === B.time}">${t}</button>`).join('') || '<p class="no-slots">No free times this day.</p>'}</div>`;
    next.disabled = !B.time || !sl.includes(B.time); next.textContent = 'Continue';
  } else if (step === 3) {
    const p = B.patient;
    body.innerHTML = `<h2 id="w-title">Your details</h2><p>We'll text you a confirmation${S.settings.reminders ? ' and a reminder the day before' : ''}.</p><form class="form" id="pf" novalidate>
      <div class="f" id="f-name"><label for="p-name">Full name</label><input id="p-name" autocomplete="name" value="${Kit.esc(p.name)}"><span class="err"></span></div>
      <div class="two"><div class="f" id="f-phone"><label for="p-phone">Mobile number</label><input id="p-phone" type="tel" autocomplete="tel" value="${Kit.esc(p.phone)}" placeholder="+00 555 0123"><span class="err"></span></div>
      <div class="f" id="f-email"><label for="p-email">Email (optional)</label><input id="p-email" type="email" autocomplete="email" value="${Kit.esc(p.email)}"><span class="err"></span></div></div>
      <div class="f"><label for="p-first">Have you visited us before?</label><select id="p-first"><option value="yes" ${p.first === 'yes' ? 'selected' : ''}>No, I'm a new patient</option><option value="no" ${p.first === 'no' ? 'selected' : ''}>Yes, I'm a returning patient</option></select></div>
      <div class="f"><label for="p-notes">Reason for visit (optional)</label><textarea id="p-notes">${Kit.esc(p.notes)}</textarea></div></form>`;
    next.disabled = false; next.textContent = 'Continue';
    const v = (id, ok, msg) => { const f = document.getElementById(id); const bad = !ok(f.querySelector('input').value.trim()); f.classList.toggle('bad', bad); f.querySelector('.err').textContent = bad ? msg : ''; return !bad; };
    const rules = [['f-name', (x) => x.length > 1, 'Please enter your full name.'], ['f-phone', (x) => /^\+?[\d\s-]{7,}$/.test(x), 'Please enter a mobile number like +00 555 0123.'], ['f-email', (x) => !x || /^\S+@\S+\.\S+$/.test(x), 'That email doesn\'t look right.']];
    rules.forEach(([id, ok, msg]) => body.querySelector(`#${id} input`).addEventListener('blur', (e) => { if (e.target.value) v(id, ok, msg); }));
    body.validate = () => rules.map(([id, ok, msg]) => v(id, ok, msg)).every(Boolean);
    body.querySelector('#p-name').focus();
  } else if (step === 4) {
    const d = doctor(resolveDoctor()), sv = service(B.service);
    body.innerHTML = `<h2 id="w-title">Confirm your appointment</h2><p>Please check everything is right.</p><div class="summary">
      <div><span>Service</span><b>${sv.name}</b></div><div><span>Doctor</span><b>${d.name}</b></div><div><span>When</span><b>${niceDate(B.date)} · ${B.time}</b></div>
      <div><span>Patient</span><b>${Kit.esc(B.patient.name)}</b></div><div><span>Mobile</span><b>${Kit.esc(B.patient.phone)}</b></div><div><span>Price</span><b>${Kit.money(sv.price)}</b></div></div>
      <p class="kit-hint" style="margin-top:12px">Free cancellation up to ${S.settings.cancelHours} hours before. Pay at the clinic.</p>`;
    next.textContent = 'Confirm booking';
  }
}
function resolveDoctor() { if (B.doctor !== 'any') return B.doctor; const d = DOCTORS.filter((x) => x.spec === service(B.service).spec).find((x) => freeSlots(x.id, B.date).includes(B.time)); return d && d.id; }
function doneView() {
  const a = booked, d = doctor(a.doctor);
  return `<div class="done-box"><div class="check">✓</div><h2>You're booked!</h2><p style="color:var(--muted)">${service(a.service).name} with ${d.name}<br><b style="color:var(--ink)">${niceDate(a.date)} at ${a.time}</b></p>
    <p style="color:var(--muted)">Your booking reference</p><span class="ref">${a.ref}</span><p class="kit-hint">A confirmation was sent to ${Kit.esc(a.patient.phone)}.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn ghost" id="ics">Add to calendar</button><a class="btn ghost" href="#/mine">My appointments</a><button class="btn" id="again">Book another</button></div></div>`;
}
body.addEventListener('click', (e) => {
  const sv = e.target.closest('[data-sv]'); if (sv) { if (B.service !== sv.dataset.sv) Object.assign(B, { doctor: 'any', date: null, time: null }); B.service = sv.dataset.sv; render(); return; }
  const dc = e.target.closest('[data-doc]'); if (dc) { B.doctor = dc.dataset.doc; B.date = null; B.time = null; render(); return; }
  const dt = e.target.closest('[data-date]'); if (dt) { B.date = dt.dataset.date; B.time = null; render(); return; }
  const tm = e.target.closest('[data-time]'); if (tm) { B.time = tm.dataset.time; render(); return; }
  if (e.target.closest('#ics')) { const a = booked; Kit.ics(`carepoint-${a.ref}.ics`, { title: `${service(a.service).name} — ${doctor(a.doctor).name}`, start: new Date(`${a.date}T${a.time}`), minutes: 30, location: 'CarePoint Clinic, 24 Harbour St' }); }
  if (e.target.closest('#again')) { booked = null; step = 0; B = blank(); render(); }
});
body.addEventListener('input', () => { if (step !== 3) return; const g = (id) => body.querySelector(id).value; Object.assign(B.patient, { name: g('#p-name').trim(), phone: g('#p-phone').trim(), email: g('#p-email').trim(), notes: g('#p-notes'), first: g('#p-first') }); });
document.getElementById('w-back').addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
document.getElementById('w-next').addEventListener('click', () => {
  if (step === 3 && !body.validate()) return;
  if (step === 4) {
    const doc = resolveDoctor();
    if (!doc || taken(doc, B.date, B.time)) { Kit.toast('Sorry — that time was just taken. Please pick another.', { type: 'error' }); step = 2; B.time = null; render(); return; }
    booked = { id: Kit.uid(), ref: refCode(), doctor: doc, service: B.service, date: B.date, time: B.time, status: 'booked', patient: { ...B.patient }, created: Date.now(), source: 'online', seen: false };
    S.appts.push(booked); rememberMe(B.patient.phone);
    Kit.notify(db, `New online booking: ${B.patient.name} · ${service(B.service).name} · ${niceDate(B.date)} ${B.time}`, { appt: booked.id });
    renderAll(); return;
  }
  step++; render();
});

function renderDocs() {
  document.getElementById('docs').innerHTML = DOCTORS.map((d) => { const n = nextFree(d.id); return `<article class="doc"><img src="${U(d.img, 500, 500)}" alt="${d.name}" loading="lazy"><h3>${d.name}</h3><span class="spec">${d.spec}</span><p>${d.yrs} years experience · ${S.days[d.id].map((x) => DAYNAMES[x]).join(', ')}</p><p class="next">${n ? `Next available: ${niceDate(n.date)} ${n.time}` : 'Fully booked'}</p></article>`; }).join('');
}

/* ---------- My appointments (by mobile number) ---------- */
function renderMine() {
  const m = document.getElementById('mine'), phone = me(), digits = phone.replace(/\D/g, '');
  if (!digits) {
    m.innerHTML = `<h1>My appointments</h1><p>Enter the mobile number you booked with to see all your visits.</p><form class="form" id="mf2" novalidate><div class="f"><label for="mine-p">Mobile number</label><input id="mine-p" type="tel" autocomplete="tel" placeholder="+00 555 0123"></div><p class="err" id="mine-err" style="color:var(--red);font-size:14px" role="alert"></p><button class="btn" type="submit">Show my appointments</button></form><p class="kit-hint" style="margin-top:14px">Demo: try <b>${Kit.esc(S.appts[0].patient.phone)}</b></p>`;
    m.querySelector('#mf2').addEventListener('submit', (e) => { e.preventDefault(); const v = m.querySelector('#mine-p').value.trim(); if (!/^\+?[\d\s-]{7,}$/.test(v)) { m.querySelector('#mine-err').textContent = 'Please enter the mobile number you booked with.'; return; } rememberMe(v); renderMine(); });
    return;
  }
  const mine = S.appts.filter((a) => a.patient.phone.replace(/\D/g, '') === digits).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const now = Kit.iso(new Date()) + new Date().toTimeString().slice(0, 5);
  const up = mine.filter((a) => a.date + a.time >= now && ['booked', 'checked'].includes(a.status)), past = mine.filter((a) => !up.includes(a)).reverse();
  const row = (a) => `<li class="ap"><div><b>${service(a.service).name}</b><span>${doctor(a.doctor).name} · ${niceDate(a.date)} ${a.time}</span></div><span class="tag t-${a.status}">${STATUS[a.status][0]}</span>${up.includes(a) ? `<button class="link" data-open="${a.id}">Manage</button>` : ''}</li>`;
  m.innerHTML = `<h1>My appointments</h1><p>${Kit.esc((mine[0] || {}).patient?.name || '')} · ${Kit.esc(phone)} · <button class="link" id="mine-out">Not you?</button></p>
    <h3 class="mh">Upcoming</h3><ul class="aps">${up.map(row).join('') || '<li class="ap"><span>No upcoming appointments. <a href="#/book">Book one</a></span></li>'}</ul>
    ${past.length ? `<h3 class="mh">Past visits</h3><ul class="aps">${past.slice(0, 8).map(row).join('')}</ul>` : ''}`;
  m.querySelector('#mine-out').onclick = () => { rememberMe(''); renderMine(); };
  m.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => { location.hash = '#/manage'; setTimeout(() => renderManage(S.appts.find((x) => x.id === b.dataset.open))); }; });
}

/* ---------- Manage booking ---------- */
function renderManage(found) {
  const m = document.getElementById('manage');
  if (!found) {
    m.innerHTML = `<h1>Manage your booking</h1><p>Enter your booking reference and the mobile number you booked with.</p><form class="form" id="mf" novalidate>
      <div class="f"><label for="m-ref">Booking reference</label><input id="m-ref" placeholder="CP-XXXX" style="text-transform:uppercase" required></div>
      <div class="f"><label for="m-phone">Mobile number</label><input id="m-phone" type="tel" required></div><p class="err" id="m-err" style="color:var(--red);font-size:14px" role="alert"></p>
      <button class="btn" type="submit">Find my booking</button></form>${S.appts.filter((a) => a.status === 'booked' && a.date >= Kit.iso(new Date())).slice(-1).map((a) => `<p class="kit-hint" style="margin-top:14px">Demo: try <b>${a.ref}</b> with <b>${Kit.esc(a.patient.phone)}</b></p>`).join('')}`;
    m.querySelector('#mf').addEventListener('submit', (e) => {
      e.preventDefault();
      const ref = m.querySelector('#m-ref').value.trim().toUpperCase(), ph = m.querySelector('#m-phone').value.replace(/\D/g, '');
      const a = S.appts.find((x) => x.ref === ref && x.patient.phone.replace(/\D/g, '') === ph);
      if (!a) { m.querySelector('#m-err').textContent = 'We couldn\'t find a booking with those details. Check the reference in your confirmation SMS.'; return; }
      renderManage(a);
    });
    return;
  }
  const a = found, d = doctor(a.doctor), closed = ['cancelled', 'done', 'noshow'].includes(a.status);
  const hoursLeft = (new Date(`${a.date}T${a.time}`) - Date.now()) / 36e5, late = hoursLeft < S.settings.cancelHours;
  m.innerHTML = `<h1>${service(a.service).name}</h1><p>Reference ${a.ref}</p><div class="summary"><div><span>Doctor</span><b>${d.name}</b></div><div><span>When</span><b>${niceDate(a.date)} · ${a.time}</b></div><div><span>Patient</span><b>${Kit.esc(a.patient.name)}</b></div><div><span>Status</span><b style="color:${a.status === 'cancelled' ? 'var(--red)' : 'var(--green)'}">${STATUS[a.status][0]}</b></div></div>
    ${closed ? '' : late ? `<p class="kit-hint" style="margin-top:14px">Changes within ${S.settings.cancelHours} hours of the appointment need a phone call: +00 000 000 0000.</p>` : `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn" id="m-res">Reschedule</button><button class="btn ghost" id="m-ics">Add to calendar</button><button class="btn ghost" id="m-cancel" style="color:var(--red)">Cancel appointment</button></div>`}
    <button class="link" id="m-back" style="margin-top:14px">← Look up another booking</button>`;
  m.querySelector('#m-back').onclick = () => renderManage();
  if (closed || late) return;
  m.querySelector('#m-ics').onclick = () => Kit.ics(`carepoint-${a.ref}.ics`, { title: `${service(a.service).name} — ${d.name}`, start: new Date(`${a.date}T${a.time}`), minutes: 30, location: 'CarePoint Clinic' });
  m.querySelector('#m-cancel').onclick = async () => {
    if (!(await Kit.confirm('Cancel this appointment?', `${niceDate(a.date)} at ${a.time} with ${d.name}. The time will be offered to other patients.`, 'Cancel appointment'))) return;
    a.status = 'cancelled'; Kit.notify(db, `Cancelled online: ${a.patient.name} · ${niceDate(a.date)} ${a.time} (${d.name})`, { appt: a.id }); renderAll(); renderManage(a); Kit.toast('Appointment cancelled — we\'ve sent you a confirmation');
  };
  m.querySelector('#m-res').onclick = () => reschedule(a, () => renderManage(a));
}
function reschedule(a, after) {
  const days = Array.from({ length: 14 }, (_, i) => Kit.iso(Kit.addDays(new Date(), i))).filter((x) => freeSlots(a.doctor, x).length);
  let date = days[0], time = null;
  Kit.modal({ title: `Reschedule with ${doctor(a.doctor).name}`, wide: true, body: `<div class="dates" id="rd"></div><div class="slots" id="rs"></div>`,
    onOpen: (m) => {
      const draw = () => {
        m.querySelector('#rd').innerHTML = days.map((x) => { const dt = new Date(x + 'T12:00'); return `<button type="button" class="date" data-d="${x}" aria-pressed="${x === date}"><span>${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${dt.getDate()}</b><span>${freeSlots(a.doctor, x).length} free</span></button>`; }).join('');
        m.querySelector('#rs').innerHTML = freeSlots(a.doctor, date).map((t) => `<button type="button" class="slot" data-t="${t}" aria-pressed="${t === time}">${t}</button>`).join('');
      };
      m.addEventListener('click', (e) => { const d = e.target.closest('[data-d]'); if (d) { date = d.dataset.d; time = null; draw(); } const t = e.target.closest('[data-t]'); if (t) { time = t.dataset.t; draw(); } });
      draw();
    },
    actions: [{ label: 'Keep current time' }, { label: 'Move appointment', primary: true, onClick: () => {
      if (!time) { Kit.toast('Pick a new time first', { type: 'error' }); return false; }
      const old = `${niceDate(a.date)} ${a.time}`; a.date = date; a.time = time;
      Kit.notify(db, `Rescheduled online: ${a.patient.name} moved from ${old} to ${niceDate(date)} ${time}`, { appt: a.id });
      renderAll(); after && after(); Kit.toast(`Moved to ${niceDate(date)} at ${time}`, { type: 'success' });
    } }] });
}

function renderAll() { render(); renderDocs(); if (!document.querySelector('[data-view=mine]').hidden) renderMine(); }
renderAll();
// Staff changes (doctor days, away dates, settings, bookings) update this page live
Kit.sync(db, () => { renderAll(); });
Kit.router('book', (v) => { if (v === 'manage') renderManage(); if (v === 'mine') renderMine(); });
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Removes test bookings for both the patient site and the staff panel.', 'Reset')) db.reset(); });
Kit.commands([{ label: 'Book an appointment', run: () => { location.hash = '#/book'; } }, { label: 'My appointments', run: () => { location.hash = '#/mine'; } }, { label: 'Manage a booking', run: () => { location.hash = '#/manage'; } }, { label: 'Staff sign-in', run: () => { location.href = 'clinic-admin.html'; } }]);
if (Kit.THUMB) { B.service = 's1'; step = 2; render(); }
