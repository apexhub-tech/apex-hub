/* Ledgerly Admin — invoices, editor, clients, client messages and reports.
   Shares its saved data with the client billing portal (js/invoices-data.js) and updates live when clients pay or write in. */
const $ = (id) => document.getElementById(id);
Kit.login({ app: 'Ledgerly', key: 'ledgerly', email: 'owner@apexhub.studio', password: 'demo1234', name: 'Hadi Mansour', role: 'Owner · Apex Hub Studio', accent: '#111', clientUrl: 'invoices.html', clientLabel: 'client portal' });
const bell = Kit.bell($('tools'), db, { onOpen: (n) => { if (n.inv) { const v = S.invoices.find((x) => x.id === n.inv); if (v) edit(v.id); } else router.go('messages'); } });
Kit.userMenu($('tools'), { key: 'ledgerly', clientUrl: 'invoices.html', clientLabel: 'client portal' });

/* ---------- List ---------- */
let filter = 'all'; const picked = new Set();
const FILTERS = [['all', 'All'], ['draft', 'Drafts'], ['open', 'Outstanding'], ['overdue', 'Overdue'], ['paid', 'Paid']];
const match = (v, f) => { const s = statusOf(v); return f === 'all' || (f === 'open' ? ['sent', 'partial', 'overdue'].includes(s) : s === f); };
function renderList() {
  $('tabs').innerHTML = FILTERS.map(([id, l]) => `<button class="tab" role="tab" aria-selected="${id === filter}" data-f="${id}">${l}<span>${S.invoices.filter((v) => match(v, id)).length}</span></button>`).join('');
  const q = $('q').value.toLowerCase();
  const list = S.invoices.filter((v) => match(v, filter) && (String(v.no).includes(q) || client(v.client).name.toLowerCase().includes(q))).sort((a, b) => b.no - a.no);
  $('rows').innerHTML = list.map((v) => { const s = statusOf(v), c = calc(v), days = Math.round((today0() - new Date(v.due).getTime()) / DAY), online = v.payments.some((p) => p.online);
    return `<tr class="click" data-id="${v.id}"><td><input type="checkbox" data-pick="${v.id}" ${picked.has(v.id) ? 'checked' : ''} aria-label="Select invoice ${v.no}"></td><td class="num">#${v.no}</td><td><b>${Kit.esc(client(v.client).name)}</b>${v.rec !== 'none' ? `<span class="rec">↻ ${v.rec}</span>` : ''}${v.viewed ? `<br><small style="color:var(--muted)">Viewed ${Kit.ago(v.viewed)}</small>` : ''}</td>
      <td>${Kit.day(v.issued)}</td><td>${Kit.day(v.due)}${s === 'overdue' ? `<br><small class="red">${days} days late</small>` : ''}</td><td><span class="status st-${s}">${LABEL[s]}</span>${online ? '<br><small style="color:var(--green)">Paid online</small>' : ''}</td>
      <td class="amt num">${money(c.total)}</td><td class="amt num">${c.balance > 0 ? money(c.balance) : '—'}</td>
      <td class="amt" style="white-space:nowrap">${s === 'draft' ? `<button class="act" data-a="send" data-id="${v.id}">Send</button>` : ''}${['sent', 'partial', 'overdue'].includes(s) ? `<button class="act" data-a="pay" data-id="${v.id}">Record payment</button>` : ''}${s === 'overdue' ? `<button class="act" data-a="remind" data-id="${v.id}">Remind</button>` : ''}<button class="act" data-a="dup" data-id="${v.id}" title="Duplicate">⧉</button></td></tr>`; }).join('') || '<tr><td colspan="9" class="kit-empty-state">No invoices here.</td></tr>';
  const open = S.invoices.filter((v) => ['sent', 'partial', 'overdue'].includes(statusOf(v)));
  $('s-out').textContent = money(open.reduce((a, v) => a + calc(v).balance, 0));
  $('s-over').textContent = money(open.filter((v) => statusOf(v) === 'overdue').reduce((a, v) => a + calc(v).balance, 0));
  const since = today0() - 30 * DAY;
  $('s-paid').textContent = money(S.invoices.flatMap((v) => v.payments).filter((p) => new Date(p.date).getTime() >= since).reduce((a, p) => a + p.amt, 0));
  const paidInv = S.invoices.filter((v) => statusOf(v) === 'paid' && v.payments.length);
  $('s-days').textContent = paidInv.length ? Math.round(paidInv.reduce((a, v) => a + (new Date(v.payments[v.payments.length - 1].date) - new Date(v.issued)) / DAY, 0) / paidInv.length) + ' days' : '—';
  $('bulk').hidden = !picked.size; $('bulk-n').textContent = `${picked.size} selected`;
  $('all').checked = list.length > 0 && list.every((v) => picked.has(v.id));
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; renderList(); } });
$('q').addEventListener('input', renderList);
$('all').addEventListener('change', (e) => { document.querySelectorAll('[data-pick]').forEach((c) => { e.target.checked ? picked.add(c.dataset.pick) : picked.delete(c.dataset.pick); }); renderList(); });
$('rows').addEventListener('click', (e) => {
  const pk = e.target.closest('[data-pick]'); if (pk) { pk.checked ? picked.add(pk.dataset.pick) : picked.delete(pk.dataset.pick); renderList(); return; }
  const a = e.target.closest('[data-a]');
  if (a) { const v = S.invoices.find((x) => x.id === a.dataset.id);
    if (a.dataset.a === 'send') send(v);
    if (a.dataset.a === 'pay') payment(v);
    if (a.dataset.a === 'remind') Kit.toast(`Reminder with a pay link sent to ${client(v.client).email}`, { type: 'success' });
    if (a.dataset.a === 'dup') { const c = JSON.parse(JSON.stringify(v)); Object.assign(c, { id: Kit.uid(), no: nextNo(), status: 'draft', payments: [], issued: Kit.iso(new Date()), due: Kit.iso(Kit.addDays(new Date(), 14)), viewed: null }); S.invoices.push(c); save(); renderAll(); Kit.toast(`Duplicated as draft #${c.no}`); }
    return; }
  const r = e.target.closest('tr[data-id]'); if (r) edit(r.dataset.id);
});
function send(v) { v.status = 'sent'; save(); renderAll(); Kit.toast(`Invoice #${v.no} emailed to ${client(v.client).email} with a pay link`, { type: 'success' }); }
function payment(v) {
  const c = calc(v);
  Kit.modal({ title: `Record payment · #${v.no}`, body: `<p>${Kit.esc(client(v.client).name)} · balance <b class="num">${money(c.balance)}</b></p>
    <div class="kit-row"><div class="kit-field"><label for="p-a">Amount</label><input id="p-a" type="number" min="0.01" step="0.01" max="${c.balance}" value="${c.balance}" required></div><div class="kit-field"><label for="p-d">Date</label><input id="p-d" type="date" value="${Kit.iso(new Date())}" required></div></div>
    <div class="kit-field"><label for="p-m">Method</label><select id="p-m"><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Cheque</option></select></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Record payment', primary: true, submit: true, onClick: (d) => {
      const amt = +d.querySelector('#p-a').value; if (amt <= 0 || amt > c.balance + 0.001) { Kit.toast('Enter an amount up to the balance due', { type: 'error' }); return false; }
      v.payments.push({ amt, date: d.querySelector('#p-d').value, method: d.querySelector('#p-m').value }); save(); renderAll();
      Kit.toast(calc(v).balance <= 0 ? `#${v.no} is fully paid` : `Partial payment recorded — ${money(calc(v).balance)} left`, { type: 'success', undo: () => { v.payments.pop(); save(); renderAll(); } });
    } }] });
}
$('b-send').addEventListener('click', () => { picked.forEach((id) => { const v = S.invoices.find((x) => x.id === id); if (v.status === 'draft') v.status = 'sent'; }); save(); Kit.toast(`${picked.size} invoices sent`); picked.clear(); renderAll(); });
$('b-paid').addEventListener('click', () => { picked.forEach((id) => { const v = S.invoices.find((x) => x.id === id), c = calc(v); if (c.balance > 0) { v.status = 'sent'; v.payments.push({ amt: c.balance, date: Kit.iso(new Date()), method: 'Bank transfer' }); } }); save(); Kit.toast(`${picked.size} invoices marked paid`); picked.clear(); renderAll(); });
$('b-del').addEventListener('click', async () => {
  if (!(await Kit.confirm(`Delete ${picked.size} invoices?`, 'They will be removed from your records and the client portal.', 'Delete'))) return;
  const removed = S.invoices.filter((v) => picked.has(v.id)); S.invoices = S.invoices.filter((v) => !picked.has(v.id)); picked.clear(); save(); renderAll();
  Kit.toast(`${removed.length} invoices deleted`, { undo: () => { S.invoices.push(...removed); save(); renderAll(); } });
});
$('b-clear').addEventListener('click', () => { picked.clear(); renderList(); });
$('export').addEventListener('click', () => Kit.csv('ledgerly-invoices.csv', [['Number', 'Client', 'Issued', 'Due', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'], ...S.invoices.map((v) => { const c = calc(v); return [v.no, client(v.client).name, v.issued, v.due, LABEL[statusOf(v)], c.sub.toFixed(2), c.tax.toFixed(2), c.total.toFixed(2), c.paid.toFixed(2), c.balance.toFixed(2)]; })]));

/* ---------- Editor ---------- */
let draft = null;
function edit(id) {
  const src = id && S.invoices.find((v) => v.id === id);
  draft = src ? JSON.parse(JSON.stringify(src)) : { id: null, no: nextNo(), client: S.clients[0].id, issued: Kit.iso(new Date()), due: Kit.iso(Kit.addDays(new Date(), 14)), items: [{ id: Kit.uid(), desc: '', qty: 1, rate: 0 }], tax: 10, disc: 0, notes: 'Thank you for your business. Bank transfer to IBAN XX00 0000 0000 0000.', status: 'draft', payments: [], rec: 'none' };
  $('ed-title').textContent = src ? `Invoice #${draft.no}` : 'New invoice';
  $('e-client').innerHTML = S.clients.map((c) => `<option value="${c.id}" ${c.id === draft.client ? 'selected' : ''}>${Kit.esc(c.name)}</option>`).join('');
  $('e-no').value = '#' + draft.no; $('e-issued').value = draft.issued; $('e-due').value = draft.due; $('e-tax').value = draft.tax; $('e-disc').value = draft.disc; $('e-notes').value = draft.notes; $('e-rec').value = draft.rec;
  $('ed-send').textContent = draft.status === 'draft' ? 'Save & send' : 'Save changes';
  $('ed-save').hidden = draft.status !== 'draft';
  renderItems(); preview(); location.hash = '#/edit';
  setTimeout(() => (src ? null : $('e-items').querySelector('input'))?.focus());
}
function renderItems() {
  $('e-items').innerHTML = draft.items.map((i) => `<tr data-i="${i.id}"><td><input data-k="desc" value="${Kit.esc(i.desc)}" placeholder="What did you do?" aria-label="Description"></td><td><input data-k="qty" type="number" min="0" step="0.5" value="${i.qty}" class="num" aria-label="Quantity"></td><td><input data-k="rate" type="number" min="0" step="1" value="${i.rate}" class="num" aria-label="Rate"></td><td class="amt num" data-amt>${money(i.qty * i.rate)}</td><td><button type="button" class="rm" aria-label="Remove line">×</button></td></tr>`).join('');
}
$('e-items').addEventListener('input', (e) => { const tr = e.target.closest('tr'), it = draft.items.find((x) => x.id === tr.dataset.i); it[e.target.dataset.k] = e.target.dataset.k === 'desc' ? e.target.value : +e.target.value; tr.querySelector('[data-amt]').textContent = money(it.qty * it.rate); preview(); });
$('e-items').addEventListener('click', (e) => { if (!e.target.closest('.rm')) return; if (draft.items.length === 1) { Kit.toast('An invoice needs at least one line'); return; } draft.items = draft.items.filter((x) => x.id !== e.target.closest('tr').dataset.i); renderItems(); preview(); });
$('e-add').addEventListener('click', () => { draft.items.push({ id: Kit.uid(), desc: '', qty: 1, rate: 0 }); renderItems(); preview(); [...$('e-items').querySelectorAll('[data-k=desc]')].pop().focus(); });
$('ed-form').addEventListener('input', (e) => {
  if (e.target.closest('#e-items')) return;
  draft.client = $('e-client').value; draft.issued = $('e-issued').value; draft.tax = +$('e-tax').value; draft.disc = +$('e-disc').value; draft.notes = $('e-notes').value; draft.rec = $('e-rec').value;
  if (e.target.id === 'e-terms' || e.target.id === 'e-issued') { draft.due = Kit.iso(Kit.addDays(new Date($('e-issued').value), +$('e-terms').value)); $('e-due').value = draft.due; } else draft.due = $('e-due').value;
  preview();
});
$('ed-form').addEventListener('change', () => $('ed-form').dispatchEvent(new Event('input')));
function preview() { $('doc').innerHTML = invoiceDoc(draft); }
function commit(send) {
  if (!draft.items.some((i) => i.desc.trim() && i.qty * i.rate > 0)) { Kit.toast('Add at least one line item with a description and price', { type: 'error' }); return; }
  if (send && draft.status === 'draft') draft.status = 'sent';
  if (draft.id) { const i = S.invoices.findIndex((v) => v.id === draft.id); const live = S.invoices[i]; draft.payments = live.payments; draft.viewed = live.viewed; S.invoices[i] = draft; } else { draft.id = Kit.uid(); S.invoices.push(draft); }
  save(); renderAll(); location.hash = '#/invoices';
  Kit.toast(send ? `Invoice #${draft.no} sent to ${client(draft.client).email}` : `Draft #${draft.no} saved`, { type: 'success' });
}
$('ed-save').addEventListener('click', () => commit(false));
$('ed-send').addEventListener('click', () => commit(true));
$('ed-print').addEventListener('click', () => window.print());
$('ed-cancel').addEventListener('click', () => { location.hash = '#/invoices'; });
$('new').addEventListener('click', () => edit(null));

/* ---------- Clients ---------- */
function renderClients() {
  $('c-rows').innerHTML = S.clients.map((c) => { const inv = S.invoices.filter((v) => v.client === c.id && v.status !== 'draft'); return `<tr><td><b>${Kit.esc(c.name)}</b><br><small style="color:var(--muted)">${Kit.esc(c.address)}</small></td><td>${Kit.esc(c.email)}</td><td class="amt num">${inv.length}</td><td class="amt num">${money(inv.reduce((a, v) => a + calc(v).total, 0))}</td><td class="amt num">${money(inv.reduce((a, v) => a + Math.max(0, calc(v).balance), 0))}</td><td class="amt" style="white-space:nowrap"><button class="act" data-portal="${c.id}">Portal link</button><button class="act" data-inv="${c.id}">New invoice</button></td></tr>`; }).join('');
}
$('c-rows').addEventListener('click', (e) => {
  const p = e.target.closest('[data-portal]'); if (p) { const url = new URL(`invoices.html?client=${p.dataset.portal}`, location.href).href; navigator.clipboard?.writeText(url).catch(() => {}); Kit.toast('Client portal link copied', { type: 'success' }); return; }
  const b = e.target.closest('[data-inv]'); if (!b) return; edit(null); draft.client = b.dataset.inv; $('e-client').value = b.dataset.inv; preview();
});
$('new-client').addEventListener('click', () => Kit.modal({ title: 'Add client', body: `<div class="kit-field"><label for="nc-n">Business name</label><input id="nc-n" required></div><div class="kit-field"><label for="nc-e">Billing email</label><input id="nc-e" type="email" required></div><div class="kit-field"><label for="nc-a">Address</label><input id="nc-a"></div>`,
  onOpen: (d) => d.querySelector('#nc-n').focus(),
  actions: [{ label: 'Cancel' }, { label: 'Add client', primary: true, submit: true, onClick: (d) => { S.clients.push({ id: Kit.uid(), name: d.querySelector('#nc-n').value.trim(), email: d.querySelector('#nc-e').value.trim(), address: d.querySelector('#nc-a').value.trim() }); save(); renderAll(); Kit.toast('Client added', { type: 'success' }); } }] }));

/* ---------- Messages ---------- */
function renderMessages() {
  const open = S.messages.filter((m) => !m.replied).length; $('m-n').hidden = !open; $('m-n').textContent = open;
  $('msgs').innerHTML = S.messages.slice().reverse().map((m) => { const v = m.inv && S.invoices.find((x) => x.id === m.inv); return `<article class="msg ${m.replied ? '' : 'new'}" data-m="${m.id}"><header><b>${Kit.esc(client(m.client).name)}</b>${v ? ` · about <button class="act" data-open="${v.id}">#${v.no}</button>` : ''}<small>${Kit.ago(m.ts)}</small></header><p>${Kit.esc(m.text)}</p>${m.replied ? `<p class="reply">↳ ${Kit.esc(m.replied)}</p>` : '<button class="btn line" data-reply>Reply</button>'}</article>`; }).join('')
    || '<p class="kit-empty-state">No messages yet. Clients can ask questions about an invoice from their portal.</p>';
}
$('msgs').addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]'); if (o) { edit(o.dataset.open); return; }
  if (!e.target.closest('[data-reply]')) return; const m = S.messages.find((x) => x.id === e.target.closest('[data-m]').dataset.m);
  Kit.modal({ title: `Reply to ${client(m.client).name}`, body: `<p style="margin-bottom:10px">“${Kit.esc(m.text)}”</p><div class="kit-field"><label for="rp">Your reply</label><textarea id="rp" required></textarea></div>`, onOpen: (d) => d.querySelector('#rp').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Send reply', primary: true, submit: true, onClick: (d) => { m.replied = d.querySelector('#rp').value.trim(); save(); renderAll(); Kit.toast(`Reply sent — ${client(m.client).name} sees it in their portal`, { type: 'success' }); } }] });
});

/* ---------- Reports ---------- */
function renderReports() {
  const pays = S.invoices.flatMap((v) => v.payments), months = [];
  for (let i = 5; i >= 0; i--) { const m = new Date(); m.setDate(1); m.setMonth(m.getMonth() - i); months.push({ label: m.toLocaleDateString('en-GB', { month: 'short' }), value: pays.filter((p) => { const d = new Date(p.date); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); }).reduce((a, p) => a + p.amt, 0) }); }
  Kit.bars($('r-chart'), months, { format: money });
  const open = S.invoices.filter((v) => ['sent', 'partial', 'overdue'].includes(statusOf(v))), late = (v) => Math.floor((today0() - new Date(v.due).getTime()) / DAY);
  const buckets = [['Not yet due', (v) => late(v) <= 0], ['1–30 days', (v) => late(v) > 0 && late(v) <= 30], ['31–60 days', (v) => late(v) > 30 && late(v) <= 60], ['60+ days', (v) => late(v) > 60]].map(([l, f]) => [l, open.filter(f).reduce((a, v) => a + calc(v).balance, 0)]);
  const max = Math.max(1, ...buckets.map((b) => b[1]));
  $('r-aging').innerHTML = buckets.map(([l, v]) => `<div><span>${l}</span><i style="width:${Math.max(2, v / max * 100)}%"></i><b class="num" style="text-align:right">${money(v)}</b></div>`).join('');
  const by = {}; S.invoices.forEach((v) => { by[v.client] = (by[v.client] || 0) + calc(v).paid; });
  $('r-top').innerHTML = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v], i) => `<tr><td class="num" style="width:30px">${i + 1}</td><td>${Kit.esc(client(c).name)}</td><td class="amt num">${money(v)}</td></tr>`).join('');
  const billed = S.invoices.filter((v) => v.status !== 'draft').reduce((a, v) => a + calc(v).total, 0), paid = S.invoices.reduce((a, v) => a + calc(v).paid, 0);
  $('r-rate').textContent = Math.round(paid / Math.max(1, billed) * 100) + '%';
}

function renderAll() { renderList(); renderClients(); renderMessages(); renderReports(); }
Kit.sync(db, () => { renderAll(); bell.refresh(); });
renderAll();
const router = Kit.router('invoices', (v) => { if (v === 'edit' && !draft) location.hash = '#/invoices'; if (v === 'reports') renderReports(); });
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample invoices for both the admin and client portal.', 'Reset')) db.reset(); });
Kit.key('n', () => edit(null), 'New invoice');
Kit.key('/', () => { router.go('invoices'); setTimeout(() => $('q').focus()); }, 'Search invoices');
Kit.commands([{ label: 'New invoice', hint: 'N', run: () => edit(null) }, { label: 'Show overdue invoices', run: () => { router.go('invoices'); filter = 'overdue'; renderList(); } }, { label: 'Show drafts', run: () => { router.go('invoices'); filter = 'draft'; renderList(); } },
  { label: 'Go to Clients', run: () => router.go('clients') }, { label: 'Client messages', run: () => router.go('messages') }, { label: 'Go to Reports', run: () => router.go('reports') }, { label: 'Add client', run: () => { router.go('clients'); $('new-client').click(); } }, { label: 'Export invoices to CSV', run: () => $('export').click() }, { label: 'Open client portal', run: () => window.open('invoices.html', '_blank') }, { label: 'Sign out', run: () => Kit.signOut('ledgerly') }]);
