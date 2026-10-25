/* CarePoint Staff — front desk, appointments, patients, doctors and booking rules.
   Shares its saved data with the patient site (js/clinic-data.js), and updates live when patients book in another tab. */
(() => {
  const $ = (id) => document.getElementById(id);
  Kit.login({ app: 'CarePoint', key: 'carepoint', email: 'admin@carepoint.health', password: 'demo1234', name: 'Sara Haddad', role: 'Clinic manager', clientUrl: 'clinic.html', clientLabel: 'patient site' });
  const tools = $('tools');
  const bell = Kit.bell(tools, db, { onOpen: (n) => { const a = n.appt && S.appts.find((x) => x.id === n.appt); if (a) { day = a.date; router.go('desk'); renderDesk(); apptModal(a); } } });
  Kit.userMenu(tools, { key: 'carepoint', clientUrl: 'clinic.html', clientLabel: 'patient site' });

  const today = () => Kit.iso(new Date());
  const pill = (s) => `<span class="adm-pill ${{ booked: 'info', checked: 'warn', done: 'ok', noshow: 'bad', cancelled: '' }[s]}">${STATUS[s][0]}</span>`;
  const findAppt = (id) => S.appts.find((x) => x.id === id);
  let fresh = new Set();

  /* ---------- Front desk ---------- */
  let day = today();
  function renderDesk() {
    $('d-label').textContent = new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const list = S.appts.filter((a) => a.date === day && a.status !== 'cancelled'), cal = $('cal');
    cal.style.gridTemplateColumns = `70px repeat(${DOCTORS.length}, minmax(150px, 1fr))`;
    let html = '<div class="cal-h"></div>' + DOCTORS.map((d) => `<div class="cal-h"><img src="${U(d.img, 60, 60)}" alt=""><span>${d.name.replace('Dr. ', '')}<small>${worksOn(d.id, day) ? d.spec : 'Off today'}</small></span></div>`).join('');
    HOURS.forEach((t) => {
      html += `<div class="tcell">${t.endsWith(':00') ? t : ''}</div>`;
      DOCTORS.forEach((d) => {
        const a = list.find((x) => x.doctor === d.id && x.time === t), off = !worksOn(d.id, day);
        html += `<div class="ccell ${off && !a ? 'off' : ''}" data-doc="${d.id}" data-t="${t}">${a ? `<button class="appt ${STATUS[a.status][1]} ${fresh.has(a.id) ? 'fresh' : ''}" data-a="${a.id}" aria-label="${Kit.esc(a.patient.name)}, ${t}, ${STATUS[a.status][0]}"><b>${Kit.esc(a.patient.name)}</b>${service(a.service).name}${a.source === 'online' ? '<span class="web">WEB</span>' : ''}</button>` : ''}</div>`;
      });
    });
    cal.innerHTML = html;
    if (day === today()) {
      const n = new Date(), mins = (n.getHours() - 9) * 60 + n.getMinutes();
      if (mins > 0 && mins < 8 * 60) { const line = document.createElement('div'); line.className = 'now-line'; line.style.top = (cal.querySelector('.cal-h').offsetHeight + mins / 30 * 44) + 'px'; cal.appendChild(line); }
    }
    const working = DOCTORS.filter((d) => worksOn(d.id, day)).length * HOURS.length;
    $('k-all').textContent = list.length;
    $('k-online').textContent = list.length ? `${list.filter((a) => a.source === 'online').length} booked online` : '';
    $('k-in').textContent = list.filter((a) => ['checked', 'done'].includes(a.status)).length;
    $('k-ns').textContent = list.filter((a) => a.status === 'noshow').length;
    $('k-util').textContent = working ? Math.round(list.length / working * 100) + '%' : '—';
    const waiting = list.filter((a) => a.status === 'checked').sort((a, b) => (a.checkedAt || 0) - (b.checkedAt || 0));
    $('wait').innerHTML = waiting.map((a) => `<li><span><b>${Kit.esc(a.patient.name)}</b><small>${doctor(a.doctor).name} · ${a.time}</small></span><span class="mins">${Math.max(0, Math.round((Date.now() - (a.checkedAt || Date.now())) / 6e4))} min</span></li>`).join('') || '<li><small>Nobody waiting.</small></li>';
    const nowT = new Date().toTimeString().slice(0, 5);
    $('upnext').innerHTML = list.filter((a) => a.status === 'booked' && (day !== today() || a.time >= nowT)).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 5)
      .map((a) => `<li><span><b>${a.time} · ${Kit.esc(a.patient.name)}</b><small>${doctor(a.doctor).name}</small></span><button class="adm-link" data-checkin="${a.id}">Check in</button></li>`).join('') || '<li><small>No more appointments.</small></li>';
    const recent = S.appts.filter((a) => a.source === 'online' && a.created && a.created <= Date.now()).sort((a, b) => b.created - a.created).slice(0, 5);
    $('feed').innerHTML = recent.map((a) => `<li><span>${a.status === 'cancelled' ? '✕' : '✓'}</span><div>${Kit.esc(a.patient.name)} ${a.status === 'cancelled' ? 'cancelled' : 'booked'} ${service(a.service).name}<small>${niceDate(a.date)} ${a.time} · ${Kit.ago(a.created)}</small></div></li>`).join('') || '<li>No online bookings yet.</li>';
  }

  function apptModal(a) {
    const d = doctor(a.doctor), sv = service(a.service);
    const acts = [];
    if (a.status === 'booked') acts.push({ label: 'Cancel booking', onClick: () => { setTimeout(() => cancelAppt(a)); } }, { label: 'Mark no-show', onClick: () => setStatus(a, 'noshow') }, { label: 'Reschedule', onClick: () => { setTimeout(() => reschedule(a)); } }, { label: 'Check in', primary: true, onClick: () => setStatus(a, 'checked') });
    if (a.status === 'checked') acts.push({ label: 'Complete visit', primary: true, onClick: () => setStatus(a, 'done') });
    if (['noshow', 'done', 'cancelled'].includes(a.status)) acts.push({ label: 'Restore to booked', onClick: () => setStatus(a, 'booked') });
    const history = S.appts.filter((x) => x.patient.phone === a.patient.phone && x.id !== a.id).length;
    Kit.modal({ title: a.patient.name, body: `<div class="summary"><div><span>Status</span>${pill(a.status)}</div><div><span>Service</span><b>${sv.name} · ${Kit.money(sv.price)}</b></div><div><span>Doctor</span><b>${d.name}</b></div><div><span>When</span><b>${niceDate(a.date)} · ${a.time}</b></div><div><span>Mobile</span><b>${Kit.esc(a.patient.phone)}</b></div>${a.patient.email ? `<div><span>Email</span><b>${Kit.esc(a.patient.email)}</b></div>` : ''}<div><span>Booked</span><b>${a.source === 'online' ? 'Online' : 'By staff / phone'}</b></div><div><span>Reference</span><b>${a.ref}</b></div><div><span>Other visits</span><b>${history}</b></div></div>${a.patient.notes ? `<p style="margin-top:12px">Reason: ${Kit.esc(a.patient.notes)}</p>` : ''}`,
      actions: [{ label: 'Close' }, ...acts] });
  }
  function setStatus(a, s) {
    const prev = a.status; a.status = s; if (s === 'checked') a.checkedAt = Date.now(); save(); renderAll();
    Kit.toast(`${a.patient.name}: ${STATUS[s][0].toLowerCase()}`, { undo: () => { a.status = prev; save(); renderAll(); } });
  }
  async function cancelAppt(a) {
    if (!(await Kit.confirm(`Cancel ${a.patient.name}'s booking?`, `${niceDate(a.date)} at ${a.time} with ${doctor(a.doctor).name}. ${S.settings.reminders ? 'The patient gets an SMS.' : ''}`, 'Cancel booking'))) return;
    setStatus(a, 'cancelled');
  }
  function reschedule(a) {
    let date = a.date, time = null;
    const draw = (m) => {
      const slots = freeSlots(a.doctor, date, true);
      m.querySelector('#rs-slots').innerHTML = slots.length ? slots.map((t) => `<button type="button" class="adm-btn" data-t="${t}" aria-pressed="${t === time}">${t}</button>`).join('') : `<p class="adm-empty" style="padding:12px">${worksOn(a.doctor, date) ? 'Fully booked' : doctor(a.doctor).name + ' is off'} on this day.</p>`;
    };
    Kit.modal({ title: `Reschedule ${a.patient.name}`, body: `<div class="kit-field"><label for="rs-d">New date</label><input id="rs-d" type="date" value="${date}" min="${today()}"></div><p style="font-size:13px;margin:8px 0">Free times with ${doctor(a.doctor).name}</p><div id="rs-slots" class="adm-tools"></div>`,
      onOpen: (m) => {
        draw(m);
        m.querySelector('#rs-d').addEventListener('change', (e) => { date = e.target.value; time = null; draw(m); });
        m.querySelector('#rs-slots').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { time = b.dataset.t; draw(m); } });
      },
      actions: [{ label: 'Keep current time' }, { label: 'Move appointment', primary: true, onClick: () => {
        if (!time) { Kit.toast('Pick a new time first', { type: 'error' }); return false; }
        const old = [a.date, a.time]; a.date = date; a.time = time; save(); day = date; renderAll();
        Kit.toast(`Moved to ${niceDate(date)} at ${time}`, { type: 'success', undo: () => { [a.date, a.time] = old; save(); renderAll(); } });
      } }] });
  }
  $('cal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (b) { apptModal(findAppt(b.dataset.a)); return; }
    const c = e.target.closest('.ccell'); if (!c || c.classList.contains('off') || c.children.length) return;
    if (isPast(day, c.dataset.t)) { Kit.toast('That time has passed'); return; }
    const d = doctor(c.dataset.doc);
    Kit.modal({ title: `Walk-in · ${d.name} · ${c.dataset.t}`, body: `<div class="kit-field"><label for="w-n">Patient name</label><input id="w-n" required autocomplete="off"></div><div class="kit-field"><label for="w-p">Mobile</label><input id="w-p" type="tel" required></div><div class="kit-field"><label for="w-s">Service</label><select id="w-s">${SERVICES.filter((s) => s.spec === d.spec).map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div><label class="kit-check"><input type="checkbox" id="w-in" checked> Check in now</label>`,
      onOpen: (m) => {
        const n = m.querySelector('#w-n'), p = m.querySelector('#w-p'); n.focus();
        // Returning patient: fill the mobile from past visits
        n.addEventListener('change', () => { const past = S.appts.find((x) => x.patient.name.toLowerCase() === n.value.trim().toLowerCase()); if (past && !p.value) p.value = past.patient.phone; });
      },
      actions: [{ label: 'Cancel' }, { label: 'Book walk-in', primary: true, submit: true, onClick: (m) => {
        const now = m.querySelector('#w-in').checked && day === today();
        S.appts.push({ id: Kit.uid(), ref: refCode(), doctor: d.id, service: m.querySelector('#w-s').value, date: day, time: c.dataset.t, status: now ? 'checked' : 'booked', checkedAt: now ? Date.now() : undefined, patient: { name: m.querySelector('#w-n').value.trim(), phone: m.querySelector('#w-p').value.trim(), email: '' }, created: Date.now(), source: 'walk-in' });
        save(); renderAll(); Kit.toast('Walk-in booked', { type: 'success' });
      } }] });
  });
  $('upnext').addEventListener('click', (e) => { const b = e.target.closest('[data-checkin]'); if (b) setStatus(findAppt(b.dataset.checkin), 'checked'); });
  const shift = (n) => { day = Kit.iso(Kit.addDays(new Date(day + 'T12:00'), n)); renderDesk(); };
  $('d-prev').onclick = () => shift(-1); $('d-next').onclick = () => shift(1); $('d-today').onclick = () => { day = today(); renderDesk(); };
  const exportRows = (list, name) => Kit.csv(name, [['Date', 'Time', 'Doctor', 'Patient', 'Mobile', 'Service', 'Source', 'Status', 'Reference'], ...list.map((a) => [a.date, a.time, doctor(a.doctor).name, a.patient.name, a.patient.phone, service(a.service).name, a.source || '', STATUS[a.status][0], a.ref])]);
  $('export').onclick = () => exportRows(S.appts.filter((a) => a.date === day).sort((a, b) => a.time.localeCompare(b.time)), `carepoint-${day}.csv`);

  /* ---------- Appointments table ---------- */
  $('ap-doc').innerHTML += DOCTORS.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
  let query = '';
  function apptList() {
    const r = $('ap-range').value, st = $('ap-status').value, dc = $('ap-doc').value, t = today(), wk = Kit.iso(Kit.addDays(new Date(), 7)), q = query.toLowerCase();
    return S.appts.filter((a) => (r === 'all' || (r === 'today' && a.date === t) || (r === 'upcoming' && a.date >= t) || (r === 'week' && a.date >= t && a.date <= wk) || (r === 'past' && a.date < t))
      && (st === 'all' || a.status === st) && (dc === 'all' || a.doctor === dc)
      && (!q || a.patient.name.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q) || a.patient.phone.includes(q)))
      .sort((a, b) => (r === 'past' ? -1 : 1) * (a.date + a.time).localeCompare(b.date + b.time));
  }
  function renderAppts() {
    const list = apptList();
    $('ap-sub').textContent = `${list.length} appointment${list.length === 1 ? '' : 's'}${query ? ` matching “${query}”` : ''}`;
    $('ap-rows').innerHTML = list.slice(0, 200).map((a) => `<tr class="click" data-a="${a.id}" tabindex="0"><td>${niceDate(a.date)}</td><td>${a.time}</td><td><b>${Kit.esc(a.patient.name)}</b><br><small>${Kit.esc(a.patient.phone)}</small></td><td>${service(a.service).name}</td><td>${doctor(a.doctor).name}</td><td>${a.source === 'online' ? 'Online' : a.source === 'walk-in' ? 'Walk-in' : 'Phone'}</td><td>${pill(a.status)}</td><td><code>${a.ref}</code></td></tr>`).join('')
      || `<tr><td colspan="8"><div class="adm-empty">No appointments match these filters.<br><button class="adm-link" id="ap-clear">Clear filters</button></div></td></tr>`;
    const unseen = S.appts.filter((a) => a.seen === false && a.status === 'booked').length;
    $('n-new').hidden = !unseen; $('n-new').textContent = unseen;
  }
  ['ap-range', 'ap-status', 'ap-doc'].forEach((id) => $(id).addEventListener('change', renderAppts));
  $('ap-rows').addEventListener('click', (e) => {
    if (e.target.id === 'ap-clear') { $('ap-range').value = 'all'; $('ap-status').value = 'all'; $('ap-doc').value = 'all'; query = ''; $('gsearch').value = ''; renderAppts(); return; }
    const tr = e.target.closest('[data-a]'); if (tr) apptModal(findAppt(tr.dataset.a));
  });
  $('ap-rows').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.a) apptModal(findAppt(e.target.dataset.a)); });
  $('ap-export').onclick = () => exportRows(apptList(), 'carepoint-appointments.csv');

  /* ---------- Patients ---------- */
  function patients() {
    const map = new Map(), t = today();
    S.appts.forEach((a) => {
      const p = map.get(a.patient.phone) || { name: a.patient.name, phone: a.patient.phone, visits: 0, noshow: 0, last: '', next: '', spent: 0 };
      if (a.status === 'done') { p.visits++; p.spent += service(a.service).price; if (a.date > p.last) p.last = a.date; }
      if (a.status === 'noshow') p.noshow++;
      if (a.status === 'booked' && a.date >= t && (!p.next || a.date < p.next)) p.next = a.date;
      map.set(a.patient.phone, p);
    });
    return [...map.values()];
  }
  function renderPatients() {
    const q = query.toLowerCase(), sort = $('pt-sort').value;
    const list = patients().filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone.includes(q));
    list.sort({ name: (a, b) => a.name.localeCompare(b.name), visits: (a, b) => b.visits - a.visits, recent: (a, b) => b.last.localeCompare(a.last), noshow: (a, b) => b.noshow - a.noshow }[sort]);
    $('pt-sub').textContent = `${list.length} patient${list.length === 1 ? '' : 's'}`;
    $('pt-rows').innerHTML = list.map((p) => `<tr class="click" data-p="${Kit.esc(p.phone)}" tabindex="0"><td><b>${Kit.esc(p.name)}</b></td><td>${Kit.esc(p.phone)}</td><td>${p.visits}</td><td>${p.noshow ? `<span class="adm-pill ${p.noshow > 1 ? 'bad' : 'warn'}">${p.noshow}</span>` : '0'}</td><td>${p.last ? niceDate(p.last) : '—'}</td><td>${p.next ? niceDate(p.next) : '—'}</td><td>${Kit.money(p.spent)}</td></tr>`).join('')
      || '<tr><td colspan="7"><div class="adm-empty">No patients found.</div></td></tr>';
  }
  $('pt-sort').addEventListener('change', renderPatients);
  const openPatient = (phone) => {
    const visits = S.appts.filter((a) => a.patient.phone === phone).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    Kit.modal({ title: visits[0].patient.name, wide: true, body: `<p style="margin-bottom:12px">${Kit.esc(phone)} · ${visits.length} bookings</p><div class="adm-table-wrap"><table class="adm-table" style="min-width:0"><tbody>${visits.map((a) => `<tr><td>${niceDate(a.date)} ${a.time}</td><td>${service(a.service).name}</td><td>${doctor(a.doctor).name}</td><td>${pill(a.status)}</td></tr>`).join('')}</tbody></table></div>`,
      actions: [{ label: 'Close' }, { label: 'Book follow-up', primary: true, onClick: () => { const n = nextFree(visits[0].doctor); if (!n) { Kit.toast('No free slots in the next two weeks', { type: 'error' }); return; } S.appts.push({ ...visits[0], id: Kit.uid(), ref: refCode(), date: n.date, time: n.time, status: 'booked', created: Date.now(), source: 'phone' }); save(); renderAll(); Kit.toast(`Follow-up booked ${niceDate(n.date)} at ${n.time}`, { type: 'success' }); } }] });
  };
  $('pt-rows').addEventListener('click', (e) => { const tr = e.target.closest('[data-p]'); if (tr) openPatient(tr.dataset.p); });
  $('pt-rows').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.p) openPatient(e.target.dataset.p); });

  /* ---------- Doctors ---------- */
  function renderDoctors() {
    const t = today(), wk = Kit.iso(Kit.addDays(new Date(), 7));
    $('docs').innerHTML = DOCTORS.map((d) => {
      const week = S.appts.filter((a) => a.doctor === d.id && a.date >= t && a.date < wk && a.status !== 'cancelled').length, nf = nextFree(d.id);
      const away = S.away.filter((x) => x.doc === d.id && x.date >= t).sort((a, b) => a.date.localeCompare(b.date));
      return `<article class="adm-card doc-card" data-doc="${d.id}"><header><img src="${U(d.img, 120, 120)}" alt=""><div><b>${d.name}</b><small>${d.spec} · ${d.yrs} yrs</small></div></header>
        <div><small>Working days</small><div class="daychips">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<button type="button" data-day="${i}" aria-pressed="${S.days[d.id].includes(i)}">${DAYNAMES[i]}</button>`).join('')}</div></div>
        <div><small>Time off</small><div class="away">${away.map((x) => `<span>${niceDate(x.date)}<button type="button" data-unaway="${x.date}" aria-label="Remove time off on ${niceDate(x.date)}">×</button></span>`).join('')}<button type="button" class="adm-link" data-away>+ Add day off</button></div></div>
        <div class="doc-stats"><span><b>${week}</b>bookings next 7 days</span><span><b>${nf ? `${niceDate(nf.date)} ${nf.time}` : '—'}</b>next free (patients)</span></div></article>`;
    }).join('');
  }
  $('docs').addEventListener('click', async (e) => {
    const card = e.target.closest('[data-doc]'); if (!card) return; const id = card.dataset.doc;
    const dayBtn = e.target.closest('[data-day]');
    if (dayBtn) {
      const n = +dayBtn.dataset.day, on = S.days[id].includes(n);
      if (on && S.days[id].length === 1) { Kit.toast('A doctor needs at least one working day', { type: 'error' }); return; }
      S.days[id] = on ? S.days[id].filter((x) => x !== n) : [...S.days[id], n];
      save(); renderAll(); Kit.toast(`${doctor(id).name} ${on ? 'no longer works' : 'now works'} ${DAYNAMES[n]}s`); return;
    }
    const un = e.target.closest('[data-unaway]');
    if (un) { S.away = S.away.filter((x) => !(x.doc === id && x.date === un.dataset.unaway)); save(); renderAll(); return; }
    if (e.target.closest('[data-away]')) {
      Kit.modal({ title: `Day off · ${doctor(id).name}`, body: `<div class="kit-field"><label for="aw-d">Date</label><input id="aw-d" type="date" min="${today()}" value="${Kit.iso(Kit.addDays(new Date(), 1))}" required></div><p style="font-size:13px" id="aw-hint"></p>`,
        onOpen: (m) => { const inp = m.querySelector('#aw-d'), hint = () => { const n = S.appts.filter((a) => a.doctor === id && a.date === inp.value && a.status === 'booked').length; m.querySelector('#aw-hint').textContent = n ? `⚠ ${n} booked patient${n > 1 ? 's' : ''} on this day will need rescheduling.` : 'Patients won’t be able to book this day.'; }; inp.addEventListener('input', hint); hint(); },
        actions: [{ label: 'Cancel' }, { label: 'Block day', primary: true, submit: true, onClick: (m) => { const date = m.querySelector('#aw-d').value; if (!S.away.some((x) => x.doc === id && x.date === date)) S.away.push({ doc: id, date }); save(); renderAll(); Kit.toast(`${niceDate(date)} blocked for ${doctor(id).name}`, { type: 'success' }); } }] });
    }
  });

  /* ---------- Settings ---------- */
  function renderSettings() {
    const s = S.settings;
    $('settings').innerHTML = `
      <div><span><b>Online booking</b><small>Let patients book from the website. Turn off to take phone bookings only.</small></span><input type="checkbox" class="adm-switch" data-set="onlineBooking" ${s.onlineBooking ? 'checked' : ''} aria-label="Online booking"></div>
      <div><span><b>SMS reminders</b><small>Text patients 24 hours before their visit.</small></span><input type="checkbox" class="adm-switch" data-set="reminders" ${s.reminders ? 'checked' : ''} aria-label="SMS reminders"></div>
      <div><span><b>Minimum notice</b><small>How soon patients can book online.</small></span><select class="adm-field" data-set="minNotice" aria-label="Minimum notice">${[0, 1, 2, 4, 24].map((h) => `<option value="${h}" ${s.minNotice === h ? 'selected' : ''}>${h ? h + ' hour' + (h > 1 ? 's' : '') : 'None'}</option>`).join('')}</select></div>
      <div><span><b>Cancellation window</b><small>Patients can't cancel or move online within this time.</small></span><select class="adm-field" data-set="cancelHours" aria-label="Cancellation window">${[2, 12, 24, 48].map((h) => `<option value="${h}" ${s.cancelHours === h ? 'selected' : ''}>${h} hours</option>`).join('')}</select></div>
      <div><span><b>Clinic name</b><small>Shown on confirmations.</small></span><input class="adm-field" data-set="name" value="${Kit.esc(s.name)}" aria-label="Clinic name"></div>`;
  }
  $('settings').addEventListener('change', (e) => {
    const k = e.target.dataset.set; if (!k) return;
    S.settings[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.tagName === 'SELECT' ? +e.target.value : e.target.value.trim() || 'CarePoint Clinic';
    save(); Kit.toast('Saved · the patient site is updated', { type: 'success' });
  });

  /* ---------- Search, live sync, router ---------- */
  $('gsearch').addEventListener('input', (e) => { query = e.target.value.trim(); const v = (location.hash.match(/^#\/(\w+)/) || [])[1]; if (v !== 'patients') router.go('appts'); if (!query) $('ap-range').value = 'upcoming'; else $('ap-range').value = 'all'; renderAppts(); renderPatients(); });
  Kit.key('/', () => $('gsearch').focus(), 'Search');

  function renderAll() { renderDesk(); renderAppts(); renderPatients(); renderDoctors(); renderSettings(); }
  let known = new Set(S.appts.map((a) => a.id));
  Kit.sync(db, () => {
    S.appts.forEach((a) => { if (!known.has(a.id)) fresh.add(a.id); }); known = new Set(S.appts.map((a) => a.id));
    renderAll(); bell.refresh(); setTimeout(() => { fresh.clear(); }, 4000);
  });
  renderAll();
  const router = Kit.router('desk', (v) => {
    if (v === 'appts') { S.appts.forEach((a) => { if (a.seen === false) a.seen = true; }); save(); renderAppts(); }
  });
  setInterval(() => { if (!document.querySelector('[data-view=desk]').hidden) renderDesk(); }, 60000);
  $('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample appointments for both the patient site and staff panel.', 'Reset')) db.reset(); });

  Kit.key('t', () => { router.go('desk'); day = today(); renderDesk(); }, 'Front desk · today');
  Kit.key('ArrowLeft', () => { if (!document.querySelector('[data-view=desk]').hidden) shift(-1); }, 'Previous day');
  Kit.key('ArrowRight', () => { if (!document.querySelector('[data-view=desk]').hidden) shift(1); }, 'Next day');
  Kit.commands([
    { label: 'Front desk', hint: 'T', run: () => router.go('desk') }, { label: 'Appointments', run: () => router.go('appts') }, { label: 'Patients', run: () => router.go('patients') },
    { label: 'Doctors & availability', run: () => router.go('doctors') }, { label: 'Booking settings', run: () => router.go('settings') },
    { label: 'Export today\'s appointments', run: () => { day = today(); $('export').click(); } }, { label: 'Open patient site', run: () => window.open('clinic.html', '_blank') },
    { label: 'Sign out', run: () => Kit.signOut('carepoint') },
  ]);
  if (Kit.THUMB) { day = today(); renderDesk(); }
})();
