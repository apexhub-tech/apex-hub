/* LeadFlow CRM — sales side: pipeline, contacts, activities and reports.
   Shares its saved data with the public website (js/crm-data.js) and updates live when enquiries, bookings or proposal answers come in. */
Kit.login({ app: 'LeadFlow', key: 'crm', email: 'adam@apexstudio.agency', password: 'demo1234', name: 'Adam Nassar', role: 'Head of sales', accent: '#4C8DFF', clientUrl: 'crm.html', clientLabel: 'website' });
const tools = document.getElementById('tools');
const bell = Kit.bell(tools, db, { onOpen: (n) => { const d = n.deal && deal(n.deal); if (d) { router.go('pipeline'); openDeal(d); } } });
Kit.userMenu(tools, { key: 'crm', clientUrl: 'crm.html', clientLabel: 'website' });
document.getElementById('owner').innerHTML += OWNERS.map(([o]) => `<option>${o}</option>`).join('');
let fresh = new Set();

/* ---------- Pipeline ---------- */
function renderBoard() {
  const q = document.getElementById('search').value.toLowerCase(), ow = document.getElementById('owner').value;
  const vis = S.deals.filter((d) => d.stage !== 'lost' && (ow === 'all' || d.owner === ow) && (d.title + ' ' + contact(d.contact).company + ' ' + contact(d.contact).name).toLowerCase().includes(q));
  document.getElementById('board').innerHTML = STAGES.map(([id, label, c, p]) => {
    const ds = vis.filter((d) => d.stage === id), sum = ds.reduce((a, d) => a + d.value, 0);
    return `<section class="col" data-s="${id}" aria-label="${label}"><div class="col-head"><h2><i style="background:${c}"></i>${label}</h2><p>${ds.length} deals · ${k(sum)}${id !== 'won' ? ` · ${p * 100}%` : ''}</p></div>
      ${ds.map((d) => { const last = Math.max(d.created, ...d.acts.map((a) => a.ts)), rot = id !== 'won' && Date.now() - last > 10 * DAY;
        return `<button class="deal ${fresh.has(d.id) ? 'fresh' : ''}" draggable="true" data-id="${d.id}">${d.source === 'website' ? '<span class="web-tag">🌐 Website</span>' : ''}<h3>${Kit.esc(d.title)}</h3><p class="co">${Kit.esc(contact(d.contact).company)}</p>
          <div class="row"><span class="val">${k(d.value)}</span>${id === 'won' ? '<span class="due" style="color:var(--green)">Won ✓</span>' : dueBadge(nextAct(d))}${av(d.owner)}</div>${d.proposalStatus === 'changes' ? '<span class="rot">● Client asked for changes</span>' : rot ? '<span class="rot">● No activity for 10+ days</span>' : ''}</button>`; }).join('')}
      ${id === 'lead' ? '<button class="add-deal" data-add="1">+ Add deal</button>' : ''}</section>`;
  }).join('');
  const open = S.deals.filter((d) => !['won', 'lost'].includes(d.stage)), mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
  const won = S.deals.filter((d) => d.stage === 'won' && (d.closedAt || 0) >= mStart).reduce((a, d) => a + d.value, 0);
  document.getElementById('s-open').textContent = Kit.money(open.reduce((a, d) => a + d.value, 0)).replace('.00', '');
  document.getElementById('s-fc').textContent = Kit.money(open.reduce((a, d) => a + d.value * stageOf(d.stage)[3], 0)).replace('.00', '');
  document.getElementById('s-won').textContent = Kit.money(won).replace('.00', '');
  document.getElementById('s-pct').textContent = Math.round(won / 600) + '%';
  document.getElementById('s-bar').style.width = Math.min(100, won / 600) + '%';
  const late = S.deals.flatMap((d) => d.acts).filter((a) => !a.done && a.type !== 'note' && a.due < new Date().setHours(0, 0, 0, 0)).length;
  const ln = document.getElementById('late-n'); ln.hidden = !late; ln.textContent = late;
  const web = S.deals.filter((d) => d.source === 'website' && d.stage === 'lead' && !d.seen).length, wn = document.getElementById('web-n'); wn.hidden = !web; wn.textContent = web;
}
async function moveDeal(d, stage) {
  if (d.stage === stage) return;
  const prev = d.stage;
  if (stage === 'won') { d.closedAt = Date.now(); Kit.toast(`🎉 ${d.title} won — ${Kit.money(d.value)}`, { type: 'success', undo: () => { d.stage = prev; delete d.closedAt; save(); renderAll(); } }); }
  else Kit.toast(stage === 'proposal' ? `Moved to ${stageOf(stage)[1]} — the client can now review it on the website` : `Moved to ${stageOf(stage)[1]}`, { undo: () => { d.stage = prev; save(); renderAll(); } });
  d.stage = stage; d.seen = true; d.acts.push({ id: Kit.uid(), type: 'note', text: `Stage changed to ${stageOf(stage)[1]}`, ts: Date.now(), due: Date.now(), done: true });
  if (stage === 'proposal') { d.proposalStatus = 'sent'; d.proposalSent = Date.now(); }
  save(); renderAll();
}
const board = document.getElementById('board');
board.addEventListener('dragstart', (e) => { const c = e.target.closest('.deal'); if (!c) return; c.classList.add('dragging'); e.dataTransfer.setData('text/plain', c.dataset.id); });
board.addEventListener('dragend', (e) => { e.target.closest('.deal')?.classList.remove('dragging'); board.querySelectorAll('.col').forEach((c) => c.classList.remove('over')); });
board.addEventListener('dragover', (e) => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); board.querySelectorAll('.col').forEach((x) => x.classList.toggle('over', x === c)); });
board.addEventListener('drop', (e) => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); moveDeal(deal(e.dataTransfer.getData('text/plain')), c.dataset.s); });
board.addEventListener('click', (e) => { if (e.target.closest('[data-add]')) { dealForm(); return; } const c = e.target.closest('.deal'); if (c) openDeal(deal(c.dataset.id)); });
document.getElementById('search').addEventListener('input', renderBoard);
document.getElementById('owner').addEventListener('change', renderBoard);
document.getElementById('export').addEventListener('click', () => Kit.csv('leadflow-deals.csv', [['Deal', 'Company', 'Contact', 'Value', 'Stage', 'Owner', 'Expected close', 'Source', 'Lost reason'], ...S.deals.map((d) => [d.title, contact(d.contact).company, contact(d.contact).name, d.value, d.stage === 'lost' ? 'Lost' : stageOf(d.stage)[1], d.owner, d.close, d.source || 'manual', d.lostReason || ''])]));

function dealForm(contactId) {
  Kit.modal({ title: 'New deal', body: `<div class="kit-field"><label for="nd-t">Deal title</label><input id="nd-t" required placeholder="e.g. Website + social media"></div>
    <div class="kit-row"><div class="kit-field"><label for="nd-c">Contact</label><select id="nd-c">${S.contacts.map((c) => `<option value="${c.id}" ${c.id === contactId ? 'selected' : ''}>${Kit.esc(c.name)} · ${Kit.esc(c.company)}</option>`).join('')}</select></div>
    <div class="kit-field"><label for="nd-v">Value (USD)</label><input id="nd-v" type="number" min="1" required value="2500"></div></div>
    <div class="kit-row"><div class="kit-field"><label for="nd-o">Owner</label><select id="nd-o">${OWNERS.map(([o]) => `<option>${o}</option>`).join('')}</select></div>
    <div class="kit-field"><label for="nd-d">Expected close</label><input id="nd-d" type="date" required value="${Kit.iso(Kit.addDays(new Date(), 21))}"></div></div>`,
    onOpen: (d) => d.querySelector('#nd-t').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Create deal', primary: true, submit: true, onClick: (d) => {
      const v = (s) => d.querySelector(s).value;
      S.deals.push({ id: Kit.uid(), title: v('#nd-t'), contact: v('#nd-c'), value: +v('#nd-v'), stage: 'lead', owner: v('#nd-o'), close: v('#nd-d'), created: Date.now(), acts: [{ id: Kit.uid(), type: 'call', text: 'First call', due: Date.now() + DAY, done: false, ts: Date.now() }] });
      save(); renderAll(); Kit.toast('Deal created with a first call scheduled for tomorrow', { type: 'success' });
    } }] });
}
document.getElementById('new-deal').addEventListener('click', () => dealForm());

function openDeal(d) {
  const c = contact(d.contact);
  if (!d.seen) { d.seen = true; save(); renderBoard(); }
  const prop = proposalOf(d);
  const body = () => `
    <div class="stepper" role="group" aria-label="Stage">${STAGES.slice(0, 4).map(([id, l], i) => `<button type="button" data-stage="${id}" class="${STAGES.findIndex((s) => s[0] === d.stage) >= i || d.stage === 'won' ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${d.stage === 'lost' ? `<p style="color:var(--red)">Lost · ${Kit.esc(d.lostReason)}</p>` : ''}
    ${d.source === 'website' ? `<p class="web-note">🌐 Website enquiry${d.brief ? ` — “${Kit.esc(d.brief)}”` : ''}${d.budget ? ` · Budget: ${Kit.esc(d.budget)}` : ''}</p>` : ''}
    ${['proposal', 'nego', 'won'].includes(d.stage) ? `<div class="prop-box"><b>Proposal</b> · ${k(prop.items.reduce((a, i) => a + i[1], 0))} · ${d.proposalStatus === 'accepted' ? '<span style="color:var(--green)">Accepted online ✓</span>' : d.proposalStatus === 'changes' ? `<span style="color:var(--red)">Changes requested: “${Kit.esc(d.changeNote || '')}”</span>` : d.proposalViewed ? `Viewed ${Kit.ago(d.proposalViewed)}` : 'Not viewed yet'}<a class="link" href="crm.html?proposal=${d.id}#/proposal" target="_blank" rel="noopener">Client view ↗</a></div>` : ''}
    <div class="kit-row"><div class="kit-field"><label for="dd-v">Value</label><input id="dd-v" type="number" value="${d.value}"></div><div class="kit-field"><label for="dd-c">Expected close</label><input id="dd-c" type="date" value="${d.close}"></div></div>
    <div class="kit-row"><div class="kit-field"><label for="dd-o">Owner</label><select id="dd-o">${OWNERS.map(([o]) => `<option ${o === d.owner ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
    <div class="kit-field"><span class="kit-label">Contact</span><p style="color:var(--ink)">${Kit.esc(c.name)} · ${Kit.esc(c.company)}<br><span class="kit-hint">${Kit.esc(c.email)} · ${Kit.esc(c.phone)}</span></p></div></div>
    <div class="kit-field"><span class="kit-label">Add activity</span><div class="kit-row" style="grid-template-columns:auto 1fr auto auto"><select id="na-t" aria-label="Activity type"><option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">📅 Meeting</option><option value="note">📝 Note</option></select>
      <input id="na-x" placeholder="What needs to happen?" aria-label="Activity"><input id="na-d" type="date" value="${Kit.iso(Kit.addDays(new Date(), 1))}" aria-label="Due date"><button type="button" class="kit-btn primary" id="na-add">Add</button></div></div>
    <div class="kit-field"><span class="kit-label">Timeline</span><ul class="timeline">${d.acts.slice().sort((a, b) => b.ts - a.ts).map((a) => `<li><b>${TYPES[a.type]} ${Kit.esc(a.text)}</b> ${a.type !== 'note' ? (a.done ? '<span class="due">Done</span>' : `<button type="button" class="link" data-done="${a.id}">Mark done</button>`) : ''}<br><small>${a.type === 'note' ? Kit.ago(a.ts) : `Due ${new Date(a.due).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}</small></li>`).join('') || '<li><small>No activity yet.</small></li>'}</ul></div>`;
  Kit.modal({ title: d.title, wide: true, body: body(),
    onOpen: (m) => {
      const rebind = () => {
        m.querySelector('.stepper').onclick = (e) => { const b = e.target.closest('[data-stage]'); if (b) { moveDeal(d, b.dataset.stage); m.querySelector('.kit-m-body').innerHTML = body(); rebind(); } };
        m.querySelector('#na-add').onclick = () => {
          const text = m.querySelector('#na-x').value.trim(); if (!text) { m.querySelector('#na-x').focus(); return; }
          const type = m.querySelector('#na-t').value;
          d.acts.push({ id: Kit.uid(), type, text, due: new Date(m.querySelector('#na-d').value).getTime(), done: type === 'note', ts: Date.now() });
          save(); renderAll(); m.querySelector('.kit-m-body').innerHTML = body(); rebind(); Kit.toast('Activity added');
        };
        m.querySelectorAll('[data-done]').forEach((b) => { b.onclick = () => { d.acts.find((a) => a.id === b.dataset.done).done = true; save(); renderAll(); m.querySelector('.kit-m-body').innerHTML = body(); rebind(); }; });
      };
      rebind();
    },
    actions: [
      { label: 'Delete', danger: true, onClick: () => { const i = S.deals.indexOf(d); S.deals.splice(i, 1); save(); renderAll(); Kit.toast('Deal deleted', { undo: () => { S.deals.splice(i, 0, d); save(); renderAll(); } }); } },
      { label: 'Mark lost', onClick: () => { lost(d); } },
      { label: 'Mark won 🎉', primary: true, onClick: (m) => { saveFields(m); moveDeal(d, 'won'); } },
      { label: 'Save', onClick: (m) => { saveFields(m); Kit.toast('Deal saved'); } },
    ] });
  function saveFields(m) { d.value = +m.querySelector('#dd-v').value || d.value; d.close = m.querySelector('#dd-c').value; d.owner = m.querySelector('#dd-o').value; save(); renderAll(); }
}
function lost(d) {
  Kit.modal({ title: `Why was "${d.title}" lost?`, body: `<div class="kit-seg" id="rs" style="flex-direction:column;align-items:stretch">${LOST.map((r, i) => `<button type="button" aria-pressed="${i === 0}">${r}</button>`).join('')}</div>`,
    onOpen: (m) => m.querySelector('#rs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) m.querySelectorAll('#rs button').forEach((x) => x.setAttribute('aria-pressed', x === b)); }),
    actions: [{ label: 'Cancel' }, { label: 'Mark as lost', danger: true, onClick: (m) => { const prev = d.stage; d.stage = 'lost'; d.closedAt = Date.now(); d.lostReason = m.querySelector('#rs [aria-pressed="true"]').textContent; save(); renderAll(); Kit.toast('Deal marked as lost', { undo: () => { d.stage = prev; save(); renderAll(); } }); } }] });
}

/* ---------- Contacts ---------- */
let sort = ['name', 1];
function renderContacts() {
  const q = document.getElementById('c-search').value.toLowerCase();
  const rows = S.contacts.map((c) => { const ds = S.deals.filter((d) => d.contact === c.id); return { c, value: ds.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((a, d) => a + d.value, 0), last: Math.max(0, ...ds.flatMap((d) => d.acts.map((a) => a.ts))) }; })
    .filter(({ c }) => (c.name + c.company + c.email + c.tags.join()).toLowerCase().includes(q))
    .sort((a, b) => { const [key, dir] = sort; const va = key === 'value' || key === 'last' ? a[key] : a.c[key].toLowerCase(), vb = key === 'value' || key === 'last' ? b[key] : b.c[key].toLowerCase(); return (va > vb ? 1 : va < vb ? -1 : 0) * dir; });
  document.getElementById('c-sub').textContent = `${rows.length} contacts`;
  document.getElementById('c-rows').innerHTML = rows.map(({ c, value, last }) => `<tr data-c="${c.id}"><td><b>${Kit.esc(c.name)}</b></td><td>${Kit.esc(c.company)}</td><td>${Kit.esc(c.email)}</td><td>${c.tags.map((t) => `<span class="tag" style="background:#262B3A">${Kit.esc(t)}</span>`).join('')}</td><td>${value ? k(value) : '—'}</td><td>${last ? Kit.ago(last) : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="kit-empty-state">No contacts match.</td></tr>';
  document.querySelectorAll('th [data-sort]').forEach((b) => { if (b.dataset.sort === sort[0]) b.setAttribute('aria-sort', sort[1] > 0 ? 'ascending' : 'descending'); else b.setAttribute('aria-sort', 'none'); });
}
document.querySelector('[data-view=contacts] thead').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; sort = [b.dataset.sort, sort[0] === b.dataset.sort ? -sort[1] : 1]; renderContacts(); });
document.getElementById('c-search').addEventListener('input', renderContacts);
document.getElementById('c-rows').addEventListener('click', (e) => {
  const r = e.target.closest('[data-c]'); if (!r) return; const c = contact(r.dataset.c), ds = S.deals.filter((d) => d.contact === c.id);
  Kit.modal({ title: c.name, body: `<p>${Kit.esc(c.company)} · ${Kit.esc(c.email)} · ${Kit.esc(c.phone)}</p><div class="kit-field"><span class="kit-label">Deals</span><ul class="timeline">${ds.map((d) => `<li><b>${Kit.esc(d.title)}</b> · ${k(d.value)}<br><small>${d.stage === 'lost' ? 'Lost' : stageOf(d.stage)[1]}</small></li>`).join('') || '<li><small>No deals yet.</small></li>'}</ul></div>`,
    actions: [{ label: 'Close' }, { label: '+ New deal', primary: true, onClick: () => { setTimeout(() => dealForm(c.id)); } }] });
});
document.getElementById('new-contact').addEventListener('click', () => Kit.modal({ title: 'Add contact', body: `<div class="kit-row"><div class="kit-field"><label for="nc-n">Full name</label><input id="nc-n" required></div><div class="kit-field"><label for="nc-c">Company</label><input id="nc-c" required></div></div>
  <div class="kit-row"><div class="kit-field"><label for="nc-e">Email</label><input id="nc-e" type="email" required></div><div class="kit-field"><label for="nc-p">Phone</label><input id="nc-p" type="tel"></div></div><div class="kit-field"><label for="nc-t">Tag</label><input id="nc-t" placeholder="e.g. Restaurant"></div>`,
  onOpen: (d) => d.querySelector('#nc-n').focus(),
  actions: [{ label: 'Cancel' }, { label: 'Add contact', primary: true, submit: true, onClick: (d) => {
    const v = (s) => d.querySelector(s).value.trim();
    if (S.contacts.some((c) => c.email.toLowerCase() === v('#nc-e').toLowerCase())) { Kit.toast('A contact with this email already exists', { type: 'error' }); return false; }
    S.contacts.push({ id: Kit.uid(), name: v('#nc-n'), company: v('#nc-c'), email: v('#nc-e'), phone: v('#nc-p'), tags: v('#nc-t') ? [v('#nc-t')] : [] }); save(); renderAll(); Kit.toast('Contact added', { type: 'success' });
  } }] }));

/* ---------- Activities ---------- */
function renderActs() {
  const type = document.getElementById('a-type').value, today = new Date().setHours(0, 0, 0, 0);
  const all = S.deals.filter((d) => d.stage !== 'lost').flatMap((d) => d.acts.filter((a) => a.type !== 'note' && (type === 'all' || a.type === type)).map((a) => ({ a, d })));
  const groups = [['Overdue', ({ a }) => !a.done && a.due < today, 'late'], ['Today', ({ a }) => !a.done && a.due >= today && a.due < today + DAY], ['Upcoming', ({ a }) => !a.done && a.due >= today + DAY], ['Completed', ({ a }) => a.done]];
  document.getElementById('acts').innerHTML = groups.map(([label, f, cls]) => { const list = all.filter(f).sort((x, y) => x.a.due - y.a.due); return list.length ? `<div class="act-group"><h2 class="${cls || ''}">${label} · ${list.length}</h2>${list.map(({ a, d }) => `<div class="act ${a.done ? 'done' : ''}"><input type="checkbox" data-a="${a.id}" ${a.done ? 'checked' : ''} aria-label="Mark ${Kit.esc(a.text)} done"><span class="ic">${TYPES[a.type]}</span><div><b>${Kit.esc(a.text)}</b><small>${Kit.esc(d.title)} · ${Kit.esc(contact(d.contact).company)} · due ${Kit.day(a.due)}${a.type === 'meeting' && new Date(a.due).getHours() ? ' ' + Kit.time(a.due) : ''}</small></div><button class="link" data-open="${d.id}">Open deal</button></div>`).join('')}</div>` : ''; }).join('') || '<p class="kit-empty-state">No activities.</p>';
}
document.getElementById('a-type').addEventListener('change', renderActs);
document.getElementById('acts').addEventListener('change', (e) => { const c = e.target.closest('[data-a]'); if (!c) return; const a = S.deals.flatMap((d) => d.acts).find((x) => x.id === c.dataset.a); a.done = c.checked; save(); renderAll(); if (c.checked) Kit.toast('Nice — activity completed', { type: 'success', undo: () => { a.done = false; save(); renderAll(); } }); });
document.getElementById('acts').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openDeal(deal(b.dataset.open)); });

/* ---------- Reports ---------- */
function renderReports() {
  const won = S.deals.filter((d) => d.stage === 'won'), lostD = S.deals.filter((d) => d.stage === 'lost');
  document.getElementById('r-win').textContent = Math.round(won.length / Math.max(1, won.length + lostD.length) * 100) + '%';
  document.getElementById('r-avg').textContent = k(Math.round(won.reduce((a, d) => a + d.value, 0) / Math.max(1, won.length)));
  document.getElementById('r-days').textContent = Math.round(won.reduce((a, d) => a + ((d.closedAt || Date.now()) - d.created) / DAY, 0) / Math.max(1, won.length)) + ' days';
  const web = S.deals.filter((d) => d.source === 'website');
  document.getElementById('r-web').textContent = `${web.length} · ${k(web.reduce((a, d) => a + d.value, 0))}`;
  const months = []; for (let i = 5; i >= 0; i--) { const dt = new Date(); dt.setMonth(dt.getMonth() - i, 1); const h = S.hist.find((x) => x.month === i); months.push({ label: dt.toLocaleDateString('en-GB', { month: 'short' }), value: i === 0 ? won.filter((d) => new Date(d.closedAt).getMonth() === dt.getMonth()).reduce((a, d) => a + d.value, 0) : (h ? h.value : 0) }); }
  Kit.bars(document.getElementById('r-chart'), months, { format: Kit.money });
  const lb = OWNERS.map(([o, c]) => [o, c, won.filter((d) => d.owner === o).reduce((a, d) => a + d.value, 0), S.deals.filter((d) => d.owner === o && !['won', 'lost'].includes(d.stage)).length]).sort((a, b) => b[2] - a[2]);
  document.getElementById('r-leader').innerHTML = lb.map(([o, c, v, n], i) => `<li>${i === 0 ? '🏆' : `<span style="width:20px;text-align:center;color:var(--muted)">${i + 1}</span>`}${av(o)}<span>${o}<br><small style="color:var(--muted)">${n} open deals</small></span><b>${k(v)} won</b></li>`).join('');
  const reached = (i) => S.deals.filter((d) => d.stage === 'lost' ? false : STAGES.findIndex((s) => s[0] === d.stage) >= i).length + (i === 0 ? lostD.length : 0);
  const top = reached(0);
  document.getElementById('r-funnel').innerHTML = STAGES.map(([, l, c], i) => { const n = reached(i); return `<div><span>${l}</span><span class="f" style="width:${Math.max(4, n / top * 100)}%;background:${c}"></span><b>${n} · ${Math.round(n / top * 100)}%</b></div>`; }).join('');
  const rs = {}; lostD.forEach((d) => { rs[d.lostReason] = (rs[d.lostReason] || 0) + 1; });
  document.getElementById('r-reasons').innerHTML = Object.entries(rs).sort((a, b) => b[1] - a[1]).map(([r, n]) => `<li><span>${Kit.esc(r)}</span><b>${n}</b></li>`).join('') || '<li class="kit-empty-state">No lost deals 🎉</li>';
}

function renderAll() { renderBoard(); renderContacts(); renderActs(); renderReports(); }
let known = new Set(S.deals.map((d) => d.id));
Kit.sync(db, () => {
  S.deals.forEach((d) => { if (!known.has(d.id)) fresh.add(d.id); }); known = new Set(S.deals.map((d) => d.id));
  renderAll(); bell.refresh(); setTimeout(() => { fresh.clear(); }, 4000);
});
renderAll();
const router = Kit.router('pipeline', (v) => { if (v === 'reports') renderReports(); });
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample deals for both the CRM and website.', 'Reset')) db.reset(); });
Kit.key('n', () => dealForm(), 'New deal');
Kit.key('/', () => { router.go('pipeline'); setTimeout(() => document.getElementById('search').focus()); }, 'Search deals');
['pipeline', 'contacts', 'activities', 'reports'].forEach((v, i) => Kit.key(String(i + 1), () => router.go(v), `Go to ${v}`));
Kit.commands([{ label: 'New deal', hint: 'N', run: () => dealForm() }, { label: 'Add contact', run: () => { router.go('contacts'); document.getElementById('new-contact').click(); } },
  { label: 'Go to Pipeline', hint: '1', run: () => router.go('pipeline') }, { label: 'Go to Contacts', hint: '2', run: () => router.go('contacts') }, { label: 'Go to Activities', hint: '3', run: () => router.go('activities') }, { label: 'Go to Reports', hint: '4', run: () => router.go('reports') },
  { label: 'Export deals to CSV', run: () => document.getElementById('export').click() }, ...OWNERS.map(([o]) => ({ label: `Show ${o}'s deals`, run: () => { router.go('pipeline'); document.getElementById('owner').value = o; renderBoard(); } })),
  { label: 'Open website', run: () => window.open('crm.html', '_blank') }, { label: 'Sign out', run: () => Kit.signOut('crm') }]);
