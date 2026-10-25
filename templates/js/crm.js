/* LeadFlow — public website: quote requests, discovery-call booking and online proposals.
   Data lives in crm-data.js; every enquiry lands in the sales pipeline (crm-admin.html) instantly. */
const $ = (id) => document.getElementById(id);
const ownerFor = () => OWNERS[S.deals.length % OWNERS.length][0];
let picked = new Set(['Website']);

/* ---------- Find or create the contact behind an enquiry ---------- */
function upsertContact(name, company, email, phone) {
  let c = S.contacts.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!c) { c = { id: Kit.uid(), name, company, email, phone: phone || '', tags: ['Website'] }; S.contacts.push(c); }
  return c;
}

/* ---------- Services & quote form ---------- */
const IMG = ['1600334089648-b0d9d3028eb2', '1505740420928-5e560c06d30e', '1601762603339-fd61e28b698a', '1605774337664-7a846e9cdf17', '1623334044303-241021148842', '1580870069867-74c57ee1bb07'];
$('services').innerHTML = SERVICES.map(([id, label, from], i) => `<article class="svc card"><img src="https://images.unsplash.com/photo-${IMG[i]}?auto=format&fit=crop&w=600&h=360&q=65" alt="" loading="lazy"><div><h3>${label}</h3><p>From ${Kit.money(from).replace('.00', '')}</p><button class="btn" data-svc="${id}">Get a quote</button></div></article>`).join('');
$('services').addEventListener('click', (e) => { const b = e.target.closest('[data-svc]'); if (!b) return; picked = new Set([b.dataset.svc]); drawPick(); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => $('q-name').focus(), 300); });
const drawPick = () => { $('q-svc').innerHTML = SERVICES.map(([id, label]) => `<button type="button" data-p="${id}" aria-pressed="${picked.has(id)}">${label}</button>`).join(''); };
$('q-svc').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; picked.has(b.dataset.p) ? picked.delete(b.dataset.p) : picked.add(b.dataset.p); drawPick(); });
const fields = ['q-name', 'q-co', 'q-email'];
fields.forEach((id) => $(id).addEventListener('blur', () => check(id)));
fields.forEach((id) => $(id).addEventListener('input', () => { $(id).removeAttribute('aria-invalid'); $('q-err').textContent = ''; }));
function check(id) { const el = $(id), ok = id === 'q-email' ? /^\S+@\S+\.\S+$/.test(el.value.trim()) : el.value.trim().length > 1; if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true'); return ok; }
$('quote').addEventListener('submit', (e) => {
  e.preventDefault();
  const bad = fields.filter((id) => !check(id));
  if (bad.length) { $('q-err').textContent = bad.includes('q-email') ? 'Please add an email we can reply to.' : 'Please fill in your name and business.'; $(bad[0]).focus(); return; }
  if (!picked.size) { $('q-err').textContent = 'Pick at least one service.'; return; }
  const c = upsertContact($('q-name').value.trim(), $('q-co').value.trim(), $('q-email').value.trim(), $('q-phone').value.trim());
  const svcs = SERVICES.filter((s) => picked.has(s[0])), value = svcs.reduce((a, s) => a + s[2], 0);
  const d = { id: Kit.uid(), title: svcs.map((s) => s[1]).join(' + '), contact: c.id, value, stage: 'lead', owner: ownerFor(), close: Kit.iso(Kit.addDays(new Date(), 30)), created: Date.now(), source: 'website', budget: $('q-budget').value, brief: $('q-brief').value.trim(),
    acts: [{ id: Kit.uid(), type: 'call', text: `Call back ${c.name} (website enquiry)`, due: Date.now() + 2 * 36e5, done: false, ts: Date.now() }] };
  S.deals.push(d);
  Kit.notify(db, `🌐 New website lead: ${c.company} — ${d.title} (${k(value)})`, { deal: d.id });
  try { localStorage.setItem('apexhub:crm-me', c.email); } catch (er) { /* ignore */ }
  $('quote').innerHTML = `<div class="thanks"><span class="tick">✓</span><h2>Thanks, ${Kit.esc(c.name.split(' ')[0])}!</h2><p>${d.owner} from our team will call you within 2 hours. Want to pick a time instead?</p><a class="btn primary big" href="#/book">Book a discovery call</a></div>`;
});

/* ---------- Book a call ---------- */
let bookDay = null, bookSlot = null;
function renderBook() {
  const slots = callSlots(), days = [...new Set(slots.map((t) => new Date(t).toDateString()))];
  if (!bookDay || !days.includes(bookDay)) bookDay = days[0];
  $('days').innerHTML = days.map((d) => `<button type="button" data-d="${d}" aria-pressed="${d === bookDay}"><small>${new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })}</small><b>${new Date(d).getDate()}</b></button>`).join('');
  $('slots').innerHTML = slots.filter((t) => new Date(t).toDateString() === bookDay).map((t) => `<button type="button" data-t="${t}" aria-pressed="${t === bookSlot}">${Kit.time(t)}</button>`).join('') || '<p class="fine">No times left this day.</p>';
  $('book-form').hidden = !bookSlot;
  if (bookSlot) $('b-when').textContent = `📅 ${new Date(bookSlot).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${Kit.time(bookSlot)} · 30 min video call`;
}
$('days').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) { bookDay = b.dataset.d; bookSlot = null; renderBook(); } });
$('slots').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { bookSlot = +b.dataset.t; renderBook(); $('b-name').focus(); } });
$('book-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('b-name').value.trim(), co = $('b-co').value.trim(), email = $('b-email').value.trim();
  if (!name || !co || !/^\S+@\S+\.\S+$/.test(email)) { ['b-name', 'b-co', 'b-email'].forEach((id) => { if (!$(id).value.trim() || (id === 'b-email' && !/^\S+@\S+\.\S+$/.test(email))) $(id).setAttribute('aria-invalid', 'true'); }); Kit.toast('Add your name, business and email to confirm', { type: 'error' }); return; }
  if (!callSlots().includes(bookSlot)) { Kit.toast('Sorry — that time was just taken. Pick another.', { type: 'error' }); bookSlot = null; renderBook(); return; }
  const c = upsertContact(name, co, email);
  let d = S.deals.find((x) => x.contact === c.id && !['won', 'lost'].includes(x.stage));
  if (!d) { d = { id: Kit.uid(), title: 'Discovery call', contact: c.id, value: 2500, stage: 'lead', owner: ownerFor(), close: Kit.iso(Kit.addDays(new Date(), 30)), created: Date.now(), source: 'website', acts: [] }; S.deals.push(d); }
  d.acts.push({ id: Kit.uid(), type: 'meeting', text: `Discovery call with ${name} (booked online)`, due: bookSlot, done: false, ts: Date.now() });
  Kit.notify(db, `📅 ${name} (${co}) booked a call for ${new Date(bookSlot).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${Kit.time(bookSlot)}`, { deal: d.id });
  const when = bookSlot; bookSlot = null; renderBook();
  Kit.modal({ title: 'You\'re booked ✓', body: `<p>${new Date(when).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${Kit.time(when)} with ${d.owner}.</p><p class="fine" style="margin-top:8px">A calendar invite and video link are on their way to ${Kit.esc(email)}.</p>`,
    actions: [{ label: 'Add to calendar', onClick: () => Kit.ics('apex-studio-call.ics', { title: 'Discovery call · Apex Studio', start: new Date(when), minutes: 30, location: 'Video call' }) }, { label: 'Done', primary: true }] });
});
['b-name', 'b-co', 'b-email'].forEach((id) => $(id).addEventListener('input', () => $(id).removeAttribute('aria-invalid')));

/* ---------- Proposal ---------- */
let propId = new URLSearchParams(location.search).get('proposal');
function renderProposal() {
  const d = propId && deal(propId);
  if (!d || !['proposal', 'nego', 'won'].includes(d.stage)) {
    let me = ''; try { me = localStorage.getItem('apexhub:crm-me') || ''; } catch (e) { /* ignore */ }
    const sample = S.deals.find((x) => x.stage === 'proposal');
    $('prop').innerHTML = `<h1 class="pg">Your proposal</h1><p class="lead">Enter the email we sent your proposal to.</p><form class="card find" id="find" novalidate><div class="kit-field"><label for="f-email">Email</label><input id="f-email" type="email" value="${Kit.esc(me)}" required></div><button class="btn primary" type="submit">Open proposal</button>${sample ? `<p class="fine">Demo: <button type="button" class="linkish" data-demo="${contact(sample.contact).email}">${contact(sample.contact).email}</button></p>` : ''}</form>`;
    return;
  }
  if (!d.proposalViewed) { d.proposalViewed = Date.now(); Kit.notify(db, `👀 ${contact(d.contact).company} opened their proposal`, { deal: d.id }); }
  const c = contact(d.contact), p = proposalOf(d), total = p.items.reduce((a, i) => a + i[1], 0), accepted = d.stage === 'won' || d.proposalStatus === 'accepted';
  $('prop').innerHTML = `<article class="card doc"><header><div><span class="eyebrow">Proposal for ${Kit.esc(c.company)}</span><h1>${Kit.esc(d.title)}</h1><p class="fine">Prepared by ${d.owner} · Apex Studio · valid until ${Kit.day(p.valid)}</p></div>${accepted ? '<span class="stamp">ACCEPTED</span>' : ''}</header>
    <table><tbody>${p.items.map(([t, v]) => `<tr><td>${Kit.esc(t)}</td><td class="amt">${Kit.money(v)}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="amt">${Kit.money(total)}</td></tr></tbody></table>
    <ul class="incl"><li>Kick-off workshop and project plan</li><li>Weekly progress updates</li><li>50% to start, 50% on launch</li></ul>
    ${accepted ? `<p class="ok">✓ Accepted${d.signedBy ? ` by ${Kit.esc(d.signedBy)}` : ''}. ${d.owner} will be in touch to schedule the kick-off.</p>`
      : d.proposalStatus === 'changes' ? `<p class="warn">You asked for changes: “${Kit.esc(d.changeNote)}”. ${d.owner} will send an updated proposal.</p>`
      : `<div class="sign"><div class="kit-field"><label for="sig">Type your full name to accept</label><input id="sig" placeholder="${Kit.esc(c.name)}"></div><label class="chk"><input type="checkbox" id="agree"> I agree to the terms above</label><div class="acts"><button class="btn" id="changes">Request changes</button><button class="btn primary big" id="accept">Accept proposal</button></div></div>`}
  </article>`;
}
$('prop').addEventListener('submit', (e) => {
  e.preventDefault(); const em = $('f-email').value.trim().toLowerCase(), c = S.contacts.find((x) => x.email.toLowerCase() === em);
  const d = c && S.deals.filter((x) => x.contact === c.id && ['proposal', 'nego', 'won'].includes(x.stage)).sort((a, b) => b.created - a.created)[0];
  if (!d) { Kit.toast('We couldn\'t find a proposal for that email yet', { type: 'error' }); return; }
  propId = d.id; history.replaceState(null, '', `?proposal=${d.id}#/proposal`); renderProposal();
});
$('prop').addEventListener('click', (e) => {
  const demo = e.target.closest('[data-demo]'); if (demo) { $('f-email').value = demo.dataset.demo; $('find').requestSubmit(); return; }
  const d = propId && deal(propId); if (!d) return;
  if (e.target.id === 'accept') {
    const sig = $('sig').value.trim();
    if (sig.length < 3) { $('sig').setAttribute('aria-invalid', 'true'); $('sig').focus(); Kit.toast('Type your name to sign', { type: 'error' }); return; }
    if (!$('agree').checked) { Kit.toast('Tick the box to agree to the terms', { type: 'error' }); return; }
    d.proposalStatus = 'accepted'; d.signedBy = sig; d.stage = 'won'; d.closedAt = Date.now();
    d.acts.push({ id: Kit.uid(), type: 'note', text: `Proposal accepted online by ${sig}`, ts: Date.now(), due: Date.now(), done: true });
    Kit.notify(db, `🎉 ${contact(d.contact).company} accepted “${d.title}” — ${k(d.value)}`, { deal: d.id });
    renderProposal(); Kit.toast('Proposal accepted — welcome aboard!', { type: 'success' });
  }
  if (e.target.id === 'changes') Kit.modal({ title: 'What should we change?', body: '<div class="kit-field"><label for="chg">Your note</label><textarea id="chg" required placeholder="e.g. Can we start with the website and add the store later?"></textarea></div>', onOpen: (m) => m.querySelector('#chg').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Send to the team', primary: true, submit: true, onClick: (m) => {
      d.proposalStatus = 'changes'; d.changeNote = m.querySelector('#chg').value.trim(); if (d.stage === 'proposal') d.stage = 'nego';
      d.acts.push({ id: Kit.uid(), type: 'call', text: `Revise proposal: ${d.changeNote}`, due: Date.now() + DAY, done: false, ts: Date.now() });
      Kit.notify(db, `✏️ ${contact(d.contact).company} asked for changes to their proposal`, { deal: d.id });
      renderProposal(); Kit.toast('Sent — we\'ll update your proposal within a day', { type: 'success' });
    } }] });
});
$('prop').addEventListener('input', (e) => { if (e.target.id === 'sig') e.target.removeAttribute('aria-invalid'); });

/* ---------- Live sync, router ---------- */
function renderAll() { renderBook(); if (!$('prop').querySelector('#find')) renderProposal(); }
Kit.sync(db, renderAll);
drawPick(); renderBook(); renderProposal();
const router = Kit.router('home', (v) => { if (v === 'proposal') renderProposal(); if (v === 'book') renderBook(); });
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample deals for both the website and the CRM.', 'Reset')) db.reset(); });
Kit.commands([{ label: 'Get a quote', run: () => { router.go('home'); $('q-name').focus(); } }, { label: 'Book a discovery call', run: () => router.go('book') }, { label: 'View my proposal', run: () => router.go('proposal') }, { label: 'Team sign-in', run: () => { location.href = 'crm-admin.html'; } }]);
