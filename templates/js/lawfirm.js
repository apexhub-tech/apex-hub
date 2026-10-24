/* Hale & Partners — behaviour */
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const AREAS = [['corp', 'Corporate law', 'Company formation, contracts, mergers and shareholder agreements.', 'from $450'], ['re', 'Real estate', 'Purchases, leases, title checks and property disputes.', 'from $600'], ['emp', 'Employment', 'Contracts, policies and representation in workplace disputes.', 'from $350'],
  ['fam', 'Family law', 'Divorce, custody and wills handled with discretion.', 'from $400'], ['ip', 'Intellectual property', 'Trademarks, copyright and brand protection.', 'from $500'], ['lit', 'Litigation', 'Commercial and civil cases from first letter to final ruling.', 'quoted per case']];
const LAWYERS = [['l1', 'Sara Hale', 'Managing partner · Corporate & IP', '1594824476967-48c8b964273f', ['corp', 'ip']], ['l2', 'Omar Nasser', 'Partner · Real estate & litigation', '1612349317150-e413f6a5b16d', ['re', 'lit']], ['l3', 'Lina Farouk', 'Senior associate · Family & employment', '1659353888906-adb3e0041693', ['fam', 'emp']]];
const FAQ = [['How much does a first consultation cost?', 'Your first 30-minute consultation is free. We\'ll tell you honestly whether we can help and what it would cost.'], ['Do you work on fixed fees?', 'Yes — most matters are quoted as a fixed fee up front, so there are no surprises. Litigation is quoted per stage.'], ['Can we meet online?', 'Absolutely. We meet clients in our office, by video call or by phone.'], ['How quickly will you reply?', 'We reply to every enquiry within one business day, and urgent matters the same day.'], ['Is what I tell you confidential?', 'Yes. Everything you share is protected by legal professional privilege from the very first call.'], ['Do you offer payment plans?', 'For family and employment matters we can split fixed fees into monthly payments.']];
const db = Kit.store('hale', () => ({ consults: [] }));
const S = db.data;
const $ = (id) => document.getElementById(id);

$('areas-grid').innerHTML = AREAS.map(([id, n, d, fee], i) => `<button class="area" data-area="${id}"><span class="n">0${i + 1}</span><h3>${n}</h3><p>${d}</p><span class="fee">Fixed fee ${fee} · Book →</span></button>`).join('');

/* ---------- Consultation booking ---------- */
const businessDays = () => { const out = []; for (let i = 1; out.length < 8; i++) { const d = Kit.addDays(new Date(), i); if (d.getDay() % 6) out.push(Kit.iso(d)); } return out; };
const TIMES = ['09:30', '10:30', '11:30', '14:00', '15:00', '16:30'];
const busy = (lid, date, t) => S.consults.some((c) => c.lawyer === lid && c.date === date && c.time === t && !c.cancelled) || ((date.charCodeAt(9) + t.charCodeAt(1) + lid.charCodeAt(1)) % 3 === 0);
function nextFree(lid) { for (const d of businessDays()) for (const t of TIMES) if (!busy(lid, d, t)) return `${new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${t}`; return 'next week'; }
$('team-grid').innerHTML = LAWYERS.map(([id, n, r, img]) => `<article class="lawyer"><img src="${U(img, 600, 450)}" alt="${n}" loading="lazy"><div><h3>${n}</h3><span>${r}</span><span>Next free: ${nextFree(id)}</span><button class="btn navy" data-lawyer="${id}">Book with ${n.split(' ')[0]}</button></div></article>`).join('');
function book(preArea, preLawyer) {
  let area = preArea || 'corp', lawyer = preLawyer || LAWYERS.find((l) => l[4].includes(area))[0], date = businessDays()[0], time = null, mode = 'Video call';
  Kit.modal({ title: 'Book a free 30-minute consultation', wide: true, body: '<div id="bk"></div>', onOpen: (m) => {
    const draw = () => {
      const days = businessDays();
      m.querySelector('#bk').innerHTML = `<div class="kit-row"><div class="kit-field"><label for="bk-a">Practice area</label><select id="bk-a">${AREAS.map(([id, n]) => `<option value="${id}" ${id === area ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="kit-field"><label for="bk-l">Lawyer</label><select id="bk-l">${LAWYERS.filter((l) => l[4].includes(area)).map(([id, n]) => `<option value="${id}" ${id === lawyer ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
        <div class="kit-field"><span class="kit-label">Day</span><div class="kit-seg" id="bk-d">${days.map((d) => `<button type="button" data-d="${d}" aria-pressed="${d === date}">${new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</button>`).join('')}</div></div>
        <div class="kit-field"><span class="kit-label">Time</span><div class="kit-seg" id="bk-t">${TIMES.map((t) => `<button type="button" data-t="${t}" aria-pressed="${t === time}" ${busy(lawyer, date, t) ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>
        <div class="kit-field"><span class="kit-label">How would you like to meet?</span><div class="kit-seg" id="bk-m">${['Video call', 'Phone', 'In our office'].map((x) => `<button type="button" data-m="${x}" aria-pressed="${x === mode}">${x}</button>`).join('')}</div></div>
        <div class="kit-row"><div class="kit-field"><label for="bk-n">Full name</label><input id="bk-n" required autocomplete="name"></div><div class="kit-field"><label for="bk-e">Email</label><input id="bk-e" type="email" required autocomplete="email"></div></div>
        <div class="kit-field"><label for="bk-s">Briefly, what's it about?</label><textarea id="bk-s" placeholder="A few sentences is enough — no need to share confidential details yet."></textarea></div>`;
      m.querySelector('#bk-a').onchange = (e) => { area = e.target.value; lawyer = LAWYERS.find((l) => l[4].includes(area))[0]; time = null; draw(); };
      m.querySelector('#bk-l').onchange = (e) => { lawyer = e.target.value; time = null; draw(); };
      m.querySelector('#bk-d').onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) { date = b.dataset.d; time = null; draw(); } };
      m.querySelector('#bk-t').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b && !b.disabled) { time = b.dataset.t; draw(); } };
      m.querySelector('#bk-m').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { mode = b.dataset.m; draw(); } };
    };
    draw();
  }, actions: [{ label: 'Cancel' }, { label: 'Confirm consultation', primary: true, submit: true, onClick: (m) => {
    if (!time) { Kit.toast('Please choose a time', { type: 'error' }); return false; }
    const c = { ref: 'HP-' + Math.random().toString(36).slice(2, 6).toUpperCase(), area, lawyer, date, time, mode, name: m.querySelector('#bk-n').value.trim() };
    S.consults.push(c); db.save();
    const L = LAWYERS.find((l) => l[0] === lawyer);
    setTimeout(() => Kit.modal({ title: 'Consultation booked', body: `<p style="color:var(--kit-ink)"><b>${new Date(date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${time}</b> · ${mode} with ${L[1]}</p><p>Reference ${c.ref}. ${mode === 'Video call' ? 'A secure video link has been emailed to you.' : mode === 'Phone' ? `${L[1].split(' ')[0]} will call you at this time.` : 'Our office is at 40 Court Street, 3rd floor.'} You can upload documents below before the meeting.</p>`,
      actions: [{ label: 'Add to calendar', onClick: () => { Kit.ics(`hale-${c.ref}.ics`, { title: `Consultation with ${L[1]} (${mode})`, start: new Date(`${date}T${time}`), minutes: 30, location: mode === 'In our office' ? '40 Court Street' : mode }); return false; } }, { label: 'Done', primary: true }] }));
  } }] });
}
['book-top', 'book-hero'].forEach((id) => $(id).addEventListener('click', () => book()));
$('areas-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-area]'); if (b) book(b.dataset.area); });
$('team-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-lawyer]'); if (b) { const L = LAWYERS.find((l) => l[0] === b.dataset.lawyer); book(L[4][0], L[0]); } });

/* ---------- Case evaluation ---------- */
const QS = [['What is your matter about?', [['Starting or running a business', 'corp'], ['Buying, selling or renting property', 're'], ['A problem at work', 'emp'], ['Family, divorce or a will', 'fam'], ['Someone copied my brand or work', 'ip'], ['I\'m in, or facing, a dispute', 'lit']]],
  ['Is there a deadline or court date?', [['Yes, within 2 weeks', 3], ['Yes, within 2 months', 2], ['No deadline yet', 1]]],
  ['Have you received any legal letters?', [['Yes, from a lawyer or court', 2], ['Yes, from the other party', 1], ['No', 0]]],
  ['What outcome would you like?', [['Advice on my options', 'advice'], ['Documents drafted or checked', 'docs'], ['Someone to act for me', 'rep']]]];
let qi = 0, ans = [];
function renderEval() {
  const box = $('eval');
  if (qi < QS.length) {
    box.innerHTML = `<span class="label">Free case check · question ${qi + 1} of ${QS.length}</span><h3 style="margin-top:8px">${QS[qi][0]}</h3><div class="prog"><i style="width:${qi / QS.length * 100}%"></i></div><div class="q-opts">${QS[qi][1].map(([l], k) => `<button data-k="${k}">${l}</button>`).join('')}</div>${qi ? '<button class="kit-reset" id="ev-back" style="margin-top:12px">← Back</button>' : ''}`;
    return;
  }
  const [area, deadline, letters, goal] = ans, score = deadline + letters, A = AREAS.find((a) => a[0] === area), L = LAWYERS.find((l) => l[4].includes(area));
  const urg = score >= 4 ? ['u-high', 'Urgent — speak to us today'] : score >= 2 ? ['u-med', 'Act soon — book this week'] : ['u-low', 'No rush — plan ahead'];
  box.innerHTML = `<div class="result"><span class="label">Your result</span><h3>${A[1]}</h3><span class="urg ${urg[0]}">${urg[1]}</span>
    <p style="color:var(--muted)">Based on your answers, ${L[1]} is the best fit. ${goal === 'advice' ? 'A single advice session usually covers this.' : goal === 'docs' ? 'Most document work is done on a fixed fee within 5 working days.' : 'We\'ll set out a staged plan and fixed price per stage.'} Typical fee: <b style="color:var(--navy)">${A[3]}</b>.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="ev-book">Book with ${L[1].split(' ')[0]}</button><button class="btn navy" id="ev-again">Start again</button></div></div>`;
  $('ev-book').onclick = () => book(area, L[0]); $('ev-again').onclick = () => { qi = 0; ans = []; renderEval(); };
}
$('eval').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { ans[qi] = QS[qi][1][+b.dataset.k][1]; qi++; renderEval(); return; } if (e.target.closest('#ev-back')) { qi--; renderEval(); } });

/* ---------- FAQ search ---------- */
function renderFaq() { const q = $('faq-q').value.toLowerCase(); $('faq-list').innerHTML = FAQ.filter(([a, b]) => (a + b).toLowerCase().includes(q)).map(([a, b], i) => `<details ${i === 0 && !q ? 'open' : ''}><summary>${a}</summary><p>${b}</p></details>`).join('') || `<p style="padding:18px 0;color:var(--muted)">No answer found — <button class="kit-reset" onclick="document.getElementById('book-top').click()">ask us directly</button>.</p>`; }
$('faq-q').addEventListener('input', renderFaq);

/* ---------- Document upload (client-side only) ---------- */
let files = [];
function addFiles(list) {
  for (const f of list) {
    if (files.length >= 5) { Kit.toast('You can attach up to 5 files', { type: 'error' }); break; }
    if (f.size > 10 * 1024 * 1024) { Kit.toast(`${f.name} is over 10 MB`, { type: 'error' }); continue; }
    if (!/\.(pdf|docx?|jpe?g|png)$/i.test(f.name)) { Kit.toast(`${f.name}: please use PDF, Word or an image`, { type: 'error' }); continue; }
    files.push({ name: f.name, size: f.size });
  }
  renderFiles();
}
function renderFiles() { $('files').innerHTML = files.map((f, i) => `<li><span>📎 ${Kit.esc(f.name)} · ${(f.size / 1024 / 1024).toFixed(2)} MB</span><button data-rm="${i}">Remove</button></li>`).join(''); $('send-files').disabled = !files.length; }
$('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
$('files').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { files.splice(+b.dataset.rm, 1); renderFiles(); } });
$('send-files').addEventListener('click', () => { const n = files.length; files = []; renderFiles(); Kit.toast(`${n} document${n > 1 ? 's' : ''} shared securely with your lawyer`, { type: 'success' }); });

renderEval(); renderFaq();
