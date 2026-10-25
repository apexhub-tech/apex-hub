/* Ledgerly — client billing portal: see invoices, pay online, download PDFs and message the business.
   Data lives in invoices-data.js; the business sees payments and messages live in invoices-admin.html. */
const $ = (id) => document.getElementById(id);
const ME = 'apexhub:ledgerly-me';
let me = new URLSearchParams(location.search).get('client'); try { me = me || localStorage.getItem(ME); } catch (e) { /* storage blocked */ }
if (!S.clients.some((c) => c.id === me)) me = S.clients[0].id;
let viewing = null;
const mine = () => S.invoices.filter((v) => v.client === me && v.status !== 'draft').sort((a, b) => b.no - a.no);
const openOnes = () => mine().filter((v) => calc(v).balance > 0);

$('as').addEventListener('change', (e) => { me = e.target.value; try { localStorage.setItem(ME, me); } catch (er) { /* ignore */ } viewing = null; router.go('home'); renderAll(); });

/* ---------- Overview ---------- */
function renderHome() {
  const c = client(me), open = openOnes(), due = open.reduce((a, v) => a + calc(v).balance, 0);
  $('hello').textContent = `Hello, ${c.name}`;
  $('due').textContent = money(due); $('pay-all').hidden = open.length < 1; $('pay-all').textContent = open.length > 1 ? `Pay all ${open.length} invoices` : 'Pay now';
  $('open').innerHTML = open.map((v) => { const s = statusOf(v), b = calc(v).balance, late = Math.round((today0() - new Date(v.due).getTime()) / DAY);
    return `<button class="inv-card ${s}" data-v="${v.id}"><span class="num">#${v.no}</span><b class="num">${money(b)}</b><span class="status st-${s}">${LABEL[s]}</span><small>${s === 'overdue' ? `${late} day${late === 1 ? '' : 's'} overdue` : `Due ${Kit.day(v.due)}`} · ${Kit.esc(v.items[0].desc)}${v.items.length > 1 ? ` +${v.items.length - 1}` : ''}</small></button>`; }).join('')
    || '<div class="all-paid"><b>You\'re all paid up ✓</b><p>Thanks! New invoices will appear here and in your inbox.</p></div>';
  const pays = mine().flatMap((v) => v.payments.map((p) => ({ ...p, no: v.no }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  $('recent').innerHTML = pays.map((p) => `<tr><td>${Kit.day(p.date)}</td><td class="num">#${p.no}</td><td>${Kit.esc(p.method)}</td><td class="amt num">${money(p.amt)}</td></tr>`).join('') || '<tr><td class="kit-empty-state">No payments yet.</td></tr>';
}
$('open').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) openInvoice(b.dataset.v); });
$('pay-all').addEventListener('click', () => pay(openOnes()));

/* ---------- All invoices ---------- */
function renderAllList() {
  $('rows').innerHTML = mine().map((v) => { const s = statusOf(v), c = calc(v); return `<tr class="click" data-v="${v.id}"><td class="num">#${v.no}</td><td>${Kit.day(v.issued)}</td><td>${Kit.day(v.due)}</td><td><span class="status st-${s}">${LABEL[s]}</span></td><td class="amt num">${money(c.total)}</td><td class="amt num">${c.balance > 0 ? money(c.balance) : '—'}</td><td class="amt">${c.balance > 0 ? `<button class="act" data-pay="${v.id}">Pay</button>` : '<button class="act">View</button>'}</td></tr>`; }).join('')
    || '<tr><td colspan="7" class="kit-empty-state">No invoices yet.</td></tr>';
}
$('rows').addEventListener('click', (e) => { const p = e.target.closest('[data-pay]'); if (p) { pay([S.invoices.find((v) => v.id === p.dataset.pay)]); return; } const r = e.target.closest('[data-v]'); if (r) openInvoice(r.dataset.v); });
$('statement').addEventListener('click', () => Kit.csv(`${client(me).name.replace(/\W+/g, '-').toLowerCase()}-statement.csv`, [['Invoice', 'Issued', 'Due', 'Status', 'Total', 'Paid', 'Balance'], ...mine().map((v) => { const c = calc(v); return [v.no, v.issued, v.due, LABEL[statusOf(v)], c.total.toFixed(2), c.paid.toFixed(2), Math.max(0, c.balance).toFixed(2)]; })]));

/* ---------- Single invoice ---------- */
function openInvoice(id) {
  const v = S.invoices.find((x) => x.id === id); if (!v) return;
  viewing = id; v.viewed = Date.now(); save(); renderView(); router.go('view');
}
function renderView() {
  const v = viewing && S.invoices.find((x) => x.id === viewing); if (!v) return;
  const c = calc(v), s = statusOf(v);
  $('v-title').textContent = `Invoice #${v.no}`;
  $('doc').innerHTML = invoiceDoc(v);
  $('v-pay').hidden = c.balance <= 0;
  $('v-side').innerHTML = `<div class="pay-box"><span class="hint">${c.balance > 0 ? 'Amount due' : 'Paid in full'}</span><b class="num">${money(Math.max(0, c.balance))}</b><span class="status st-${s}">${LABEL[s]}</span>${c.balance > 0 ? `<p>Due ${Kit.day(v.due)}</p><button class="btn" data-pay>Pay ${money(c.balance)} by card</button>` : ''}</div>
    ${v.payments.length ? `<h3>Payments</h3><ul class="pays">${v.payments.map((p) => `<li><span>${Kit.day(p.date)} · ${Kit.esc(p.method)}</span><b class="num">${money(p.amt)}</b></li>`).join('')}</ul>` : ''}`;
}
$('v-side').addEventListener('click', (e) => { if (e.target.closest('[data-pay]')) pay([S.invoices.find((v) => v.id === viewing)]); });
$('v-pay').addEventListener('click', () => pay([S.invoices.find((v) => v.id === viewing)]));
$('v-print').addEventListener('click', () => window.print());
$('v-ask').addEventListener('click', () => message(viewing));

/* ---------- Pay by card (demo checkout) ---------- */
function pay(list) {
  list = list.filter((v) => v && calc(v).balance > 0); if (!list.length) return;
  const total = list.reduce((a, v) => a + calc(v).balance, 0);
  Kit.modal({ title: `Pay ${money(total)}`, body: `<p class="hint" style="margin-bottom:12px">${list.map((v) => `#${v.no}`).join(', ')} · ${Kit.esc(client(me).name)}</p>
    <div class="kit-field"><label for="c-num">Card number</label><input id="c-num" inputmode="numeric" autocomplete="off" value="4242 4242 4242 4242" required></div>
    <div class="kit-row"><div class="kit-field"><label for="c-exp">Expiry</label><input id="c-exp" placeholder="MM / YY" value="12 / 29" required></div><div class="kit-field"><label for="c-cvc">CVC</label><input id="c-cvc" inputmode="numeric" value="123" required></div></div>
    <div class="kit-field"><label for="c-name">Name on card</label><input id="c-name" value="${Kit.esc(client(me).name)}" required></div>
    <p class="hint">Demo checkout — test card pre-filled, nothing is charged.</p>`,
    actions: [{ label: 'Cancel' }, { label: `Pay ${money(total)}`, primary: true, submit: true, onClick: (m) => {
      const digits = m.querySelector('#c-num').value.replace(/\D/g, '');
      if (digits.length < 15) { Kit.toast('That card number looks too short — check and try again', { type: 'error' }); return false; }
      const last4 = digits.slice(-4);
      list.forEach((v) => { v.payments.push({ amt: calc(v).balance, date: Kit.iso(new Date()), method: `Card •••• ${last4}`, online: true }); });
      Kit.notify(db, `${client(me).name} paid ${money(total)} online (${list.map((v) => '#' + v.no).join(', ')})`, { inv: list[0].id });
      renderAll(); Kit.toast(`Payment of ${money(total)} received — receipt emailed to ${client(me).email}`, { type: 'success', ms: 6000 });
    } }] });
}

/* ---------- Account & messages ---------- */
function renderAccount() {
  const c = client(me);
  $('a-name').value = c.name; $('a-email').value = c.email; $('a-addr').value = c.address || '';
  const th = S.messages.filter((m) => m.client === me);
  $('thread').innerHTML = th.slice().reverse().map((m) => { const v = m.inv && S.invoices.find((x) => x.id === m.inv); return `<article class="msg"><header><b>You</b>${v ? ` · about #${v.no}` : ''}<small>${Kit.ago(m.ts)}</small></header><p>${Kit.esc(m.text)}</p>${m.replied ? `<p class="reply"><b>Apex Hub Studio:</b> ${Kit.esc(m.replied)}</p>` : '<p class="hint">Waiting for a reply — usually within a working day.</p>'}</article>`; }).join('')
    || '<p class="hint">No messages yet. Questions about an invoice? Send one here.</p>';
}
$('acct').addEventListener('submit', (e) => {
  e.preventDefault(); const em = $('a-email').value.trim();
  if (!/^\S+@\S+\.\S+$/.test(em)) { $('a-email').setAttribute('aria-invalid', 'true'); Kit.toast('Enter a valid email so invoices reach you', { type: 'error' }); return; }
  const c = client(me); c.email = em; c.address = $('a-addr').value.trim();
  Kit.notify(db, `${c.name} updated their billing details`); Kit.toast('Billing details saved', { type: 'success' });
});
$('a-email').addEventListener('input', () => $('a-email').removeAttribute('aria-invalid'));
function message(invId) {
  const v = invId && S.invoices.find((x) => x.id === invId);
  Kit.modal({ title: v ? `Question about #${v.no}` : 'New message', body: `<div class="kit-field"><label for="msg">Message</label><textarea id="msg" required placeholder="${v ? 'e.g. Can we split this into two payments?' : 'How can we help?'}"></textarea></div>`, onOpen: (m) => m.querySelector('#msg').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Send message', primary: true, submit: true, onClick: (m) => {
      const text = m.querySelector('#msg').value.trim();
      S.messages.push({ id: Kit.uid(), client: me, inv: v ? v.id : null, text, ts: Date.now() });
      Kit.notify(db, `New message from ${client(me).name}${v ? ` about #${v.no}` : ''}`);
      renderAll(); Kit.toast('Message sent — you\'ll see the reply under Account', { type: 'success' });
    } }] });
}
$('new-msg').addEventListener('click', () => message(null));

/* ---------- Live sync, router ---------- */
function renderAll() {
  $('as').innerHTML = S.clients.map((c) => `<option value="${c.id}" ${c.id === me ? 'selected' : ''}>${Kit.esc(c.name)}</option>`).join('');
  renderHome(); renderAllList(); renderView(); renderAccount();
}
let known = new Set(mine().map((v) => v.id)), replies = S.messages.filter((m) => m.replied).length;
Kit.sync(db, () => {
  S.messages = S.messages || [];
  const fresh = mine().filter((v) => !known.has(v.id)); known = new Set(mine().map((v) => v.id));
  const r = S.messages.filter((m) => m.replied).length;
  renderAll();
  if (fresh.length) Kit.toast(`🧾 New invoice #${fresh[0].no} from Apex Hub Studio`, { type: 'success', ms: 6000 });
  if (r > replies) Kit.toast('💬 Apex Hub Studio replied to your message', { type: 'success', ms: 6000 });
  replies = r;
});
renderAll();
const router = Kit.router('home', (v) => { if (v === 'view' && !viewing) location.hash = '#/all'; });
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample invoices for both the client portal and business admin.', 'Reset')) db.reset(); });
Kit.commands([{ label: 'Overview', run: () => router.go('home') }, { label: 'All invoices', run: () => router.go('all') }, { label: 'Pay outstanding balance', run: () => pay(openOnes()) }, { label: 'Message Apex Hub Studio', run: () => message(null) }, { label: 'Business sign-in', run: () => { location.href = 'invoices-admin.html'; } }]);
