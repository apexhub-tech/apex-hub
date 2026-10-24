/* CarePoint — behaviour */
const U = (id, w = 300, h = 300) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const DOCTORS = [
  { id: 'd1', name: 'Dr. Sara Haddad', spec: 'General practice', img: '1594824476967-48c8b964273f', days: [1, 2, 3, 4], yrs: 12 },
  { id: 'd2', name: 'Dr. Omar Nasser', spec: 'Dentistry', img: '1612349317150-e413f6a5b16d', days: [0, 1, 2, 3], yrs: 9 },
  { id: 'd3', name: 'Dr. Lina Farouk', spec: 'Dermatology', img: '1659353888906-adb3e0041693', days: [2, 3, 4, 5, 6], yrs: 15 },
  { id: 'd4', name: 'Dr. Karim Mansour', spec: 'Pediatrics', img: '1622253692010-333f2da6031d', days: [0, 1, 2, 3, 4, 5, 6], yrs: 8 },
];
const SERVICES = [
  { id: 's1', name: 'General consultation', spec: 'General practice', mins: 30, price: 45 }, { id: 's2', name: 'Annual check-up', spec: 'General practice', mins: 30, price: 80 },
  { id: 's3', name: 'Dental cleaning', spec: 'Dentistry', mins: 30, price: 60 }, { id: 's4', name: 'Skin check', spec: 'Dermatology', mins: 30, price: 70 },
  { id: 's5', name: 'Child wellness visit', spec: 'Pediatrics', mins: 30, price: 50 },
];
const HOURS = []; for (let h = 9; h < 17; h++) { HOURS.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`); }
const service = (id) => SERVICES.find((s) => s.id === id), doctor = (id) => DOCTORS.find((d) => d.id === id);
const refCode = () => 'CP-' + Math.random().toString(36).slice(2, 6).toUpperCase();
function seed() {
  const names = ['Rami Aziz', 'Maya Khoury', 'Jad Saleh', 'Lara Nassar', 'Nour Kassem', 'Tarek Issa', 'Hala Youssef', 'Fadi Rizk', 'Dana Karam', 'Ziad Haddad', 'Mira Saab', 'Elie Haddad'];
  let r = 3; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const appts = [];
  for (let day = 0; day < 7; day++) {
    const date = Kit.iso(Kit.addDays(new Date(), day)), dow = Kit.addDays(new Date(), day).getDay();
    DOCTORS.filter((d) => d.days.includes(dow)).forEach((d) => {
      HOURS.forEach((t) => { if (rnd() < (day === 0 ? .45 : .3)) {
        const sv = SERVICES.filter((s) => s.spec === d.spec);
        appts.push({ id: Kit.uid(), ref: refCode(), doctor: d.id, service: sv[Math.floor(rnd() * sv.length)].id, date, time: t, status: 'booked', patient: { name: names[Math.floor(rnd() * names.length)], phone: '+00 555 01' + Math.floor(10 + rnd() * 89), email: '' }, created: Date.now() });
      } });
    });
  }
  // Today's past appointments are already seen
  const nowT = new Date().toTimeString().slice(0, 5);
  appts.filter((a) => a.date === Kit.iso(new Date())).forEach((a, i) => { if (a.time < nowT) a.status = i % 7 === 3 ? 'noshow' : 'done'; });
  return { appts };
}
const db = Kit.store('carepoint', seed), S = db.data, save = () => db.save();
const taken = (docId, date, time) => S.appts.some((a) => a.doctor === docId && a.date === date && a.time === time && a.status !== 'cancelled');
const isPast = (date, time) => new Date(`${date}T${time}`) < new Date();
const freeSlots = (docId, date) => { const dow = new Date(date + 'T12:00').getDay(), d = doctor(docId); if (!d.days.includes(dow)) return []; return HOURS.filter((t) => !taken(docId, date, t) && !isPast(date, t)); };
const nextFree = (docId) => { for (let i = 0; i < 14; i++) { const date = Kit.iso(Kit.addDays(new Date(), i)), s = freeSlots(docId, date); if (s.length) return { date, time: s[0] }; } return null; };
const niceDate = (iso) => new Date(iso + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/* ---------- Booking wizard ---------- */
const STEPS = ['Service', 'Doctor', 'Time', 'Details', 'Confirm'];
let step = 0, B = { service: null, doctor: 'any', date: null, time: null, patient: { name: '', phone: '', email: '', notes: '', first: 'yes' } }, booked = null;
const body = document.getElementById('w-body');
function render() {
  document.getElementById('steps').innerHTML = STEPS.map((s, i) => `<li data-n="${i + 1}" class="${i === step ? 'on' : i < step ? 'done' : ''}">${i < step ? '✓ ' : ''}${s}</li>`).join('');
  document.getElementById('w-foot').hidden = !!booked;
  document.getElementById('w-back').style.visibility = step ? 'visible' : 'hidden';
  const next = document.getElementById('w-next');
  if (booked) { body.innerHTML = doneView(); return; }
  if (step === 0) {
    body.innerHTML = `<h2 id="w-title">What do you need?</h2><p>Choose a service — prices shown before you book.</p><div class="opts">${SERVICES.map((s) => `<button class="opt" data-sv="${s.id}" aria-pressed="${B.service === s.id}"><div class="grow"><b>${s.name}</b><small>${s.spec} · ${s.mins} min</small></div><span class="price">${Kit.money(s.price).replace('.00', '')}</span></button>`).join('')}</div>`;
    next.disabled = !B.service; next.textContent = 'Continue';
  } else if (step === 1) {
    const sv = service(B.service), docs = DOCTORS.filter((d) => d.spec === sv.spec);
    body.innerHTML = `<h2 id="w-title">Choose your doctor</h2><p>${sv.name}</p><div class="opts"><button class="opt" data-doc="any" aria-pressed="${B.doctor === 'any'}"><div class="grow"><b>First available doctor</b><small>Fastest option</small></div></button>
      ${docs.map((d) => { const n = nextFree(d.id); return `<button class="opt" data-doc="${d.id}" aria-pressed="${B.doctor === d.id}"><img src="${U(d.img, 104, 104)}" alt=""><div class="grow"><b>${d.name}</b><small>${d.spec} · ${d.yrs} yrs experience</small><small style="color:var(--green)">${n ? `Next: ${niceDate(n.date)} ${n.time}` : 'Fully booked'}</small></div></button>`; }).join('')}</div>`;
    next.disabled = false;
  } else if (step === 2) {
    const docs = B.doctor === 'any' ? DOCTORS.filter((d) => d.spec === service(B.service).spec) : [doctor(B.doctor)];
    const days = Array.from({ length: 14 }, (_, i) => Kit.iso(Kit.addDays(new Date(), i)));
    const slotsFor = (date) => [...new Set(docs.flatMap((d) => freeSlots(d.id, date)))].sort();
    if (!B.date || !slotsFor(B.date).length) B.date = days.find((d) => slotsFor(d).length) || days[0];
    const sl = slotsFor(B.date);
    body.innerHTML = `<h2 id="w-title">Pick a time</h2><p>${B.doctor === 'any' ? 'Any ' + service(B.service).spec.toLowerCase() + ' doctor' : doctor(B.doctor).name} · 30 min</p>
      <div class="dates" role="group" aria-label="Date">${days.map((d) => { const dt = new Date(d + 'T12:00'); return `<button class="date" data-date="${d}" aria-pressed="${d === B.date}" ${slotsFor(d).length ? '' : 'disabled'}><span>${dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${dt.getDate()}</b><span>${slotsFor(d).length} free</span></button>`; }).join('')}</div>
      <div class="slots" role="group" aria-label="Time">${sl.map((t) => `<button class="slot" data-time="${t}" aria-pressed="${t === B.time}">${t}</button>`).join('') || '<p class="no-slots">No free times this day.</p>'}</div>`;
    next.disabled = !B.time || !sl.includes(B.time);
  } else if (step === 3) {
    const p = B.patient;
    body.innerHTML = `<h2 id="w-title">Your details</h2><p>We'll text you a confirmation and a reminder the day before.</p><form class="form" id="pf" novalidate>
      <div class="f" id="f-name"><label for="p-name">Full name</label><input id="p-name" autocomplete="name" value="${Kit.esc(p.name)}"><span class="err"></span></div>
      <div class="two"><div class="f" id="f-phone"><label for="p-phone">Mobile number</label><input id="p-phone" type="tel" autocomplete="tel" value="${Kit.esc(p.phone)}" placeholder="+00 555 0123"><span class="err"></span></div>
      <div class="f" id="f-email"><label for="p-email">Email (optional)</label><input id="p-email" type="email" autocomplete="email" value="${Kit.esc(p.email)}"><span class="err"></span></div></div>
      <div class="f"><label for="p-first">Have you visited us before?</label><select id="p-first"><option value="yes" ${p.first === 'yes' ? 'selected' : ''}>No, I'm a new patient</option><option value="no" ${p.first === 'no' ? 'selected' : ''}>Yes, I'm a returning patient</option></select></div>
      <div class="f"><label for="p-notes">Reason for visit (optional)</label><textarea id="p-notes">${Kit.esc(p.notes)}</textarea></div></form>`;
    next.disabled = false;
    const v = (id, ok, msg) => { const f = document.getElementById(id); const bad = !ok(f.querySelector('input').value.trim()); f.classList.toggle('bad', bad); f.querySelector('.err').textContent = bad ? msg : ''; return !bad; };
    body.querySelector('#p-name').addEventListener('blur', () => v('f-name', (x) => x.length > 1, 'Please enter your full name.'));
    body.querySelector('#p-phone').addEventListener('blur', () => v('f-phone', (x) => /^\+?[\d\s-]{7,}$/.test(x), 'Please enter a mobile number like +00 555 0123.'));
    body.querySelector('#p-email').addEventListener('blur', () => v('f-email', (x) => !x || /^\S+@\S+\.\S+$/.test(x), 'That email doesn\'t look right.'));
    body.validate = () => [v('f-name', (x) => x.length > 1, 'Please enter your full name.'), v('f-phone', (x) => /^\+?[\d\s-]{7,}$/.test(x), 'Please enter a mobile number like +00 555 0123.'), v('f-email', (x) => !x || /^\S+@\S+\.\S+$/.test(x), 'That email doesn\'t look right.')].every(Boolean);
    body.querySelector('#p-name').focus();
  } else if (step === 4) {
    const d = doctor(resolveDoctor()), sv = service(B.service);
    body.innerHTML = `<h2 id="w-title">Confirm your appointment</h2><p>Please check everything is right.</p><div class="summary">
      <div><span>Service</span><b>${sv.name}</b></div><div><span>Doctor</span><b>${d.name}</b></div><div><span>When</span><b>${niceDate(B.date)} · ${B.time}</b></div>
      <div><span>Patient</span><b>${Kit.esc(B.patient.name)}</b></div><div><span>Mobile</span><b>${Kit.esc(B.patient.phone)}</b></div><div><span>Price</span><b>${Kit.money(sv.price)}</b></div></div>
      <p class="kit-hint" style="margin-top:12px">Free cancellation up to 24 hours before. Pay at the clinic.</p>`;
    next.textContent = 'Confirm booking';
  }
}
function resolveDoctor() { if (B.doctor !== 'any') return B.doctor; const d = DOCTORS.filter((x) => x.spec === service(B.service).spec).find((x) => freeSlots(x.id, B.date).includes(B.time)); return d && d.id; }
function doneView() {
  const a = booked, d = doctor(a.doctor);
  return `<div class="done-box"><div class="check">✓</div><h2>You're booked!</h2><p style="color:var(--muted)">${service(a.service).name} with ${d.name}<br><b style="color:var(--ink)">${niceDate(a.date)} at ${a.time}</b></p>
    <p style="color:var(--muted)">Your booking reference</p><span class="ref">${a.ref}</span><p class="kit-hint">A confirmation was sent to ${Kit.esc(a.patient.phone)}.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn ghost" id="ics">Add to calendar</button><a class="btn ghost" href="#/manage">Manage booking</a><button class="btn" id="again">Book another</button></div></div>`;
}
body.addEventListener('click', (e) => {
  const sv = e.target.closest('[data-sv]'); if (sv) { if (B.service !== sv.dataset.sv) Object.assign(B, { doctor: 'any', date: null, time: null }); B.service = sv.dataset.sv; render(); return; }
  const dc = e.target.closest('[data-doc]'); if (dc) { B.doctor = dc.dataset.doc; B.date = null; B.time = null; render(); return; }
  const dt = e.target.closest('[data-date]'); if (dt) { B.date = dt.dataset.date; B.time = null; render(); return; }
  const tm = e.target.closest('[data-time]'); if (tm) { B.time = tm.dataset.time; render(); return; }
  if (e.target.closest('#ics')) { const a = booked; Kit.ics(`carepoint-${a.ref}.ics`, { title: `${service(a.service).name} — ${doctor(a.doctor).name}`, start: new Date(`${a.date}T${a.time}`), minutes: 30, location: 'CarePoint Clinic, 24 Harbour St' }); }
  if (e.target.closest('#again')) { booked = null; step = 0; B = { service: null, doctor: 'any', date: null, time: null, patient: { name: '', phone: '', email: '', notes: '', first: 'yes' } }; render(); }
});
body.addEventListener('input', () => { if (step !== 3) return; const g = (id) => body.querySelector(id).value; Object.assign(B.patient, { name: g('#p-name').trim(), phone: g('#p-phone').trim(), email: g('#p-email').trim(), notes: g('#p-notes'), first: g('#p-first') }); });
document.getElementById('w-back').addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
document.getElementById('w-next').addEventListener('click', () => {
  if (step === 3 && !body.validate()) return;
  if (step === 4) {
    const doc = resolveDoctor();
    if (!doc || taken(doc, B.date, B.time)) { Kit.toast('Sorry — that time was just taken. Please pick another.', { type: 'error' }); step = 2; B.time = null; render(); return; }
    booked = { id: Kit.uid(), ref: refCode(), doctor: doc, service: B.service, date: B.date, time: B.time, status: 'booked', patient: { ...B.patient }, created: Date.now() };
    S.appts.push(booked); save(); renderDocs(); renderStaff(); render(); return;
  }
  step++; render();
});

function renderDocs() {
  document.getElementById('docs').innerHTML = DOCTORS.map((d) => { const n = nextFree(d.id); return `<article class="doc"><img src="${U(d.img, 500, 500)}" alt="${d.name}" loading="lazy"><h3>${d.name}</h3><span class="spec">${d.spec}</span><p>${d.yrs} years experience · ${d.days.length} days a week</p><p class="next">${n ? `Next available: ${niceDate(n.date)} ${n.time}` : 'Fully booked'}</p></article>`; }).join('');
}

/* ---------- Manage booking ---------- */
function renderManage(found) {
  const m = document.getElementById('manage');
  if (!found) {
    m.innerHTML = `<h1>Manage your booking</h1><p>Enter your booking reference and the mobile number you booked with.</p><form class="form" id="mf" novalidate>
      <div class="f"><label for="m-ref">Booking reference</label><input id="m-ref" placeholder="CP-XXXX" style="text-transform:uppercase" required></div>
      <div class="f"><label for="m-phone">Mobile number</label><input id="m-phone" type="tel" required></div><p class="err" id="m-err" style="color:var(--red);font-size:14px" role="alert"></p>
      <button class="btn" type="submit">Find my booking</button></form>${S.appts.filter((a) => a.created > Date.now() - 864e5 * 30 && a.patient.email !== undefined && a.status === 'booked').slice(-1).map((a) => `<p class="kit-hint" style="margin-top:14px">Demo: try <b>${a.ref}</b> with <b>${Kit.esc(a.patient.phone)}</b></p>`).join('')}`;
    m.querySelector('#mf').addEventListener('submit', (e) => {
      e.preventDefault();
      const ref = m.querySelector('#m-ref').value.trim().toUpperCase(), ph = m.querySelector('#m-phone').value.replace(/\D/g, '');
      const a = S.appts.find((x) => x.ref === ref && x.patient.phone.replace(/\D/g, '') === ph);
      if (!a) { m.querySelector('#m-err').textContent = 'We couldn\'t find a booking with those details. Check the reference in your confirmation SMS.'; return; }
      renderManage(a);
    });
    return;
  }
  const a = found, d = doctor(a.doctor), cancelled = a.status === 'cancelled';
  m.innerHTML = `<h1>${service(a.service).name}</h1><p>Reference ${a.ref}</p><div class="summary"><div><span>Doctor</span><b>${d.name}</b></div><div><span>When</span><b>${niceDate(a.date)} · ${a.time}</b></div><div><span>Patient</span><b>${Kit.esc(a.patient.name)}</b></div><div><span>Status</span><b style="color:${cancelled ? 'var(--red)' : 'var(--green)'}">${cancelled ? 'Cancelled' : 'Confirmed'}</b></div></div>
    ${cancelled ? '' : `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn" id="m-res">Reschedule</button><button class="btn ghost" id="m-ics">Add to calendar</button><button class="btn ghost" id="m-cancel" style="color:var(--red)">Cancel appointment</button></div>`}
    <button class="link" id="m-back" style="margin-top:14px">← Look up another booking</button>`;
  m.querySelector('#m-back').onclick = () => renderManage();
  if (cancelled) return;
  m.querySelector('#m-ics').onclick = () => Kit.ics(`carepoint-${a.ref}.ics`, { title: `${service(a.service).name} — ${d.name}`, start: new Date(`${a.date}T${a.time}`), minutes: 30, location: 'CarePoint Clinic' });
  m.querySelector('#m-cancel').onclick = async () => { if (!(await Kit.confirm('Cancel this appointment?', `${niceDate(a.date)} at ${a.time} with ${d.name}. The time will be offered to other patients.`, 'Cancel appointment'))) return; a.status = 'cancelled'; save(); renderAll(); renderManage(a); Kit.toast('Appointment cancelled — we\'ve sent you a confirmation'); };
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
    actions: [{ label: 'Keep current time' }, { label: 'Move appointment', primary: true, onClick: () => { if (!time) { Kit.toast('Pick a new time first', { type: 'error' }); return false; } const old = [a.date, a.time]; a.date = date; a.time = time; save(); renderAll(); after && after(); Kit.toast(`Moved to ${niceDate(date)} at ${time}`, { type: 'success', undo: () => { [a.date, a.time] = old; save(); renderAll(); after && after(); } }); } }] });
}

/* ---------- Staff dashboard ---------- */
let day = Kit.iso(new Date());
const STATUS = { booked: ['Booked', 'a-booked'], checked: ['Checked in', 'a-checked'], done: ['Completed', 'a-done'], noshow: ['No-show', 'a-noshow'], cancelled: ['Cancelled', 'a-cancelled'] };
function renderStaff() {
  document.getElementById('d-label').textContent = new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const dow = new Date(day + 'T12:00').getDay(), list = S.appts.filter((a) => a.date === day && a.status !== 'cancelled');
  const cal = document.getElementById('cal');
  cal.style.gridTemplateColumns = `70px repeat(${DOCTORS.length}, minmax(150px, 1fr))`;
  let html = '<div class="cal-h"></div>' + DOCTORS.map((d) => `<div class="cal-h"><img src="${U(d.img, 60, 60)}" alt=""><span>${d.name.replace('Dr. ', '')}<small>${d.spec}</small></span></div>`).join('');
  HOURS.forEach((t) => {
    html += `<div class="tcell">${t.endsWith(':00') ? t : ''}</div>`;
    DOCTORS.forEach((d) => {
      const a = list.find((x) => x.doctor === d.id && x.time === t), off = !d.days.includes(dow);
      html += `<div class="ccell ${off ? 'off' : ''}" data-doc="${d.id}" data-t="${t}">${a ? `<button class="appt ${STATUS[a.status][1]}" data-a="${a.id}"><b>${Kit.esc(a.patient.name)}</b>${service(a.service).name}</button>` : ''}</div>`;
    });
  });
  cal.innerHTML = html;
  if (day === Kit.iso(new Date())) {
    const n = new Date(), mins = (n.getHours() - 9) * 60 + n.getMinutes();
    if (mins > 0 && mins < 8 * 60) { const line = document.createElement('div'); line.className = 'now-line'; line.style.top = (cal.querySelector('.cal-h').offsetHeight + mins / 30 * 44) + 'px'; cal.appendChild(line); }
  }
  const working = DOCTORS.filter((d) => d.days.includes(dow)).length * HOURS.length;
  document.getElementById('k-all').textContent = list.length;
  document.getElementById('k-in').textContent = list.filter((a) => ['checked', 'done'].includes(a.status)).length;
  document.getElementById('k-ns').textContent = list.filter((a) => a.status === 'noshow').length;
  document.getElementById('k-util').textContent = working ? Math.round(list.length / working * 100) + '%' : '—';
  const waiting = list.filter((a) => a.status === 'checked').sort((a, b) => (a.checkedAt || 0) - (b.checkedAt || 0));
  document.getElementById('wait').innerHTML = waiting.map((a) => `<li><span><b>${Kit.esc(a.patient.name)}</b><small>${doctor(a.doctor).name} · ${a.time}</small></span><span class="mins">${Math.max(0, Math.round((Date.now() - (a.checkedAt || Date.now())) / 6e4))} min</span></li>`).join('') || '<li><small>Nobody waiting.</small></li>';
  const nowT = new Date().toTimeString().slice(0, 5);
  document.getElementById('upnext').innerHTML = list.filter((a) => a.status === 'booked' && (day !== Kit.iso(new Date()) || a.time >= nowT)).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 5)
    .map((a) => `<li><span><b>${a.time} · ${Kit.esc(a.patient.name)}</b><small>${doctor(a.doctor).name}</small></span><button class="link" data-checkin="${a.id}">Check in</button></li>`).join('') || '<li><small>No more appointments.</small></li>';
}
function apptModal(a) {
  const d = doctor(a.doctor), sv = service(a.service), st = STATUS[a.status][0];
  const acts = [];
  if (a.status === 'booked') acts.push({ label: 'Mark no-show', onClick: () => setStatus(a, 'noshow') }, { label: 'Reschedule', onClick: () => { setTimeout(() => reschedule(a)); } }, { label: 'Check in', primary: true, onClick: () => setStatus(a, 'checked') });
  if (a.status === 'checked') acts.push({ label: 'Complete visit', primary: true, onClick: () => setStatus(a, 'done') });
  if (['noshow', 'done'].includes(a.status)) acts.push({ label: 'Undo status', onClick: () => setStatus(a, 'booked') });
  Kit.modal({ title: a.patient.name, body: `<div class="summary"><div><span>Status</span><b>${st}</b></div><div><span>Service</span><b>${sv.name} · ${Kit.money(sv.price)}</b></div><div><span>Doctor</span><b>${d.name}</b></div><div><span>When</span><b>${niceDate(a.date)} · ${a.time}</b></div><div><span>Mobile</span><b>${Kit.esc(a.patient.phone)}</b></div><div><span>Reference</span><b>${a.ref}</b></div></div>${a.patient.notes ? `<p>Reason: ${Kit.esc(a.patient.notes)}</p>` : ''}`,
    actions: [{ label: 'Close' }, ...acts] });
}
function setStatus(a, s) { const prev = a.status; a.status = s; if (s === 'checked') a.checkedAt = Date.now(); save(); renderStaff(); Kit.toast(`${a.patient.name}: ${STATUS[s][0].toLowerCase()}`, { undo: () => { a.status = prev; save(); renderStaff(); } }); }
document.getElementById('cal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (b) { apptModal(S.appts.find((x) => x.id === b.dataset.a)); return; }
  const c = e.target.closest('.ccell'); if (!c || c.classList.contains('off') || c.children.length) return;
  if (isPast(day, c.dataset.t)) { Kit.toast('That time has passed'); return; }
  const d = doctor(c.dataset.doc);
  Kit.modal({ title: `Walk-in · ${d.name} · ${c.dataset.t}`, body: `<div class="kit-field"><label for="w-n">Patient name</label><input id="w-n" required></div><div class="kit-field"><label for="w-p">Mobile</label><input id="w-p" type="tel" required></div><div class="kit-field"><label for="w-s">Service</label><select id="w-s">${SERVICES.filter((s) => s.spec === d.spec).map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>`,
    onOpen: (m) => m.querySelector('#w-n').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Book', primary: true, submit: true, onClick: (m) => { S.appts.push({ id: Kit.uid(), ref: refCode(), doctor: d.id, service: m.querySelector('#w-s').value, date: day, time: c.dataset.t, status: 'booked', patient: { name: m.querySelector('#w-n').value, phone: m.querySelector('#w-p').value, email: '' }, created: Date.now() }); save(); renderAll(); Kit.toast('Appointment booked', { type: 'success' }); } }] });
});
document.getElementById('upnext').addEventListener('click', (e) => { const b = e.target.closest('[data-checkin]'); if (b) setStatus(S.appts.find((x) => x.id === b.dataset.checkin), 'checked'); });
document.getElementById('d-prev').addEventListener('click', () => { day = Kit.iso(Kit.addDays(new Date(day + 'T12:00'), -1)); renderStaff(); });
document.getElementById('d-next').addEventListener('click', () => { day = Kit.iso(Kit.addDays(new Date(day + 'T12:00'), 1)); renderStaff(); });
document.getElementById('d-today').addEventListener('click', () => { day = Kit.iso(new Date()); renderStaff(); });
document.getElementById('export').addEventListener('click', () => Kit.csv(`carepoint-${day}.csv`, [['Time', 'Doctor', 'Patient', 'Mobile', 'Service', 'Status', 'Reference'], ...S.appts.filter((a) => a.date === day).sort((a, b) => a.time.localeCompare(b.time)).map((a) => [a.time, doctor(a.doctor).name, a.patient.name, a.patient.phone, service(a.service).name, STATUS[a.status][0], a.ref])]));
setInterval(() => { if (!document.querySelector('[data-view=staff]').hidden) renderStaff(); }, 60000);

function renderAll() { render(); renderDocs(); renderStaff(); }
renderAll();
const router = Kit.router('book', (v) => { if (v === 'manage') renderManage(); if (v === 'staff') renderStaff(); });
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Removes your test bookings.', 'Reset')) db.reset(); });
Kit.key('t', () => { router.go('staff'); day = Kit.iso(new Date()); renderStaff(); }, 'Staff dashboard · today');
Kit.key('ArrowLeft', () => { if (!document.querySelector('[data-view=staff]').hidden) document.getElementById('d-prev').click(); }, 'Previous day (staff)');
Kit.key('ArrowRight', () => { if (!document.querySelector('[data-view=staff]').hidden) document.getElementById('d-next').click(); }, 'Next day (staff)');
Kit.commands([{ label: 'Book an appointment', run: () => router.go('book') }, { label: 'Manage a booking', run: () => router.go('manage') }, { label: 'Open staff dashboard', hint: 'T', run: () => router.go('staff') }, { label: 'Export today\'s appointments', run: () => { router.go('staff'); document.getElementById('export').click(); } }]);
if (Kit.THUMB) { B.service = 's1'; step = 2; render(); }
