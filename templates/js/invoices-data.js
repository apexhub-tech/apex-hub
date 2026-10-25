/* Ledgerly — shared data for the client billing portal (invoices.html) and the business admin (invoices-admin.html).
   Both pages read and write the same saved store, so an online payment shows up live for the business. */
const DAY = 864e5, today0 = () => new Date().setHours(0, 0, 0, 0);
function seed() {
  const clients = [['Bloom Café', 'lina@bloomcafe.com'], ['Urban Gym', 'karim@urbangym.com'], ['Smile Dental', 'sara@smiledental.com'], ['Nova Realty', 'omar@novarealty.com'], ['Luna Boutique', 'maya@lunaboutique.com'], ['Peak Motors', 'tarek@peakmotors.com']]
    .map(([name, email], i) => ({ id: 'cl' + i, name, email, address: `${12 + i * 7} Harbour Street, Suite ${i + 1}` }));
  const now = new Date(), d = (n) => Kit.iso(Kit.addDays(now, n));
  const inv = (no, ci, issued, terms, items, status, pays = [], extra = {}) => ({ id: Kit.uid(), no, client: 'cl' + ci, issued: d(issued), due: d(issued + terms), items: items.map(([desc, qty, rate]) => ({ id: Kit.uid(), desc, qty, rate })), tax: 10, disc: 0, notes: 'Thank you for your business. Bank transfer to IBAN XX00 0000 0000 0000.', status, payments: pays.map(([amt, ago, method]) => ({ amt, date: d(-ago), method })), rec: 'none', ...extra });
  const invoices = [
    inv(1042, 0, -150, 14, [['Website redesign', 1, 2400], ['Hosting (12 months)', 1, 240]], 'sent', [[2904, 140, 'Bank transfer']]),
    inv(1043, 1, -120, 14, [['Social media plan — month 1', 1, 900]], 'sent', [[990, 100, 'Card']]),
    inv(1044, 2, -90, 30, [['Booking system setup', 1, 3200], ['Training session', 2, 150]], 'sent', [[3850, 70, 'Bank transfer']]),
    inv(1045, 3, -65, 14, [['Brand identity', 1, 1800], ['Business cards (500)', 1, 120]], 'sent', [[2112, 40, 'Bank transfer']]),
    inv(1046, 4, -48, 14, [['E-commerce store build', 1, 4500]], 'sent', [[2000, 30, 'Card']]),
    inv(1047, 1, -40, 14, [['Social media plan — month 2', 1, 900], ['Reels editing', 4, 60]], 'sent'),
    inv(1048, 5, -20, 30, [['Ads campaign management', 1, 1500], ['Ad creatives', 6, 45]], 'sent', [], { rec: 'monthly' }),
    inv(1049, 0, -10, 14, [['Menu photography', 1, 650]], 'sent', [[715, 2, 'Card']]),
    inv(1050, 2, -3, 14, [['SEO — local package', 1, 700]], 'sent', [], { rec: 'monthly' }),
    inv(1051, 3, 0, 14, [['Property listing pages', 3, 350]], 'draft'),
    inv(1052, 0, -5, 14, [['Instagram content — October', 1, 600], ['Product photos', 10, 25]], 'sent'),
  ];
  return { clients, invoices, messages: [], notes: [] };
}
const db = Kit.store('ledgerly', seed), S = db.data, save = () => db.save();
S.messages = S.messages || []; S.notes = S.notes || [];
const BIZ = { name: 'Apex Hub Studio', email: 'billing@apexhub.info', address: '24 Harbour St' };
const client = (id) => S.clients.find((c) => c.id === id) || { name: 'Unknown client', email: '' };
const money = (n) => Kit.money(n);
const calc = (v) => { const sub = v.items.reduce((a, i) => a + (+i.qty || 0) * (+i.rate || 0), 0), disc = sub * (+v.disc || 0) / 100, tax = (sub - disc) * (+v.tax || 0) / 100, total = +(sub - disc + tax).toFixed(2), paid = v.payments.reduce((a, p) => a + p.amt, 0); return { sub, disc, tax, total, paid, balance: +(total - paid).toFixed(2) }; };
const statusOf = (v) => { if (v.status === 'draft') return 'draft'; const c = calc(v); if (c.balance <= 0) return 'paid'; if (new Date(v.due).getTime() < today0()) return 'overdue'; return c.paid > 0 ? 'partial' : 'sent'; };
const LABEL = { draft: 'Draft', sent: 'Sent', partial: 'Partly paid', overdue: 'Overdue', paid: 'Paid' };
const nextNo = () => Math.max(1000, ...S.invoices.map((v) => v.no)) + 1;
// The printable invoice, shared by the admin editor preview and the client portal
function invoiceDoc(v) {
  const c = calc(v), cl = client(v.client), s = statusOf(v);
  return `<div class="d-top"><div><h2>Invoice</h2><span class="num">#${v.no}</span></div><div style="text-align:right"><b>${BIZ.name}</b><br><span style="color:var(--muted)">${BIZ.address}<br>${BIZ.email}</span></div></div>
    <div class="meta"><div><span>Bill to</span><b>${Kit.esc(cl.name)}</b><br>${Kit.esc(cl.address || '')}<br>${Kit.esc(cl.email)}</div><div style="text-align:right"><span>Issued</span>${Kit.day(v.issued)}<span style="margin-top:8px">Due</span>${Kit.day(v.due)}</div></div>
    <table><thead><tr><th>Description</th><th class="amt">Qty</th><th class="amt">Rate</th><th class="amt">Amount</th></tr></thead><tbody>${v.items.map((i) => `<tr><td>${Kit.esc(i.desc) || '<span style="color:#bbb">Description</span>'}</td><td class="amt num">${i.qty}</td><td class="amt num">${money(i.rate)}</td><td class="amt num">${money(i.qty * i.rate)}</td></tr>`).join('')}</tbody></table>
    <div class="tot"><div><span>Subtotal</span><span class="num">${money(c.sub)}</span></div>${c.disc ? `<div><span>Discount ${v.disc}%</span><span class="num">−${money(c.disc)}</span></div>` : ''}<div><span>Tax ${v.tax}%</span><span class="num">${money(c.tax)}</span></div>
    ${c.paid ? `<div><span>Paid</span><span class="num">−${money(c.paid)}</span></div>` : ''}<div class="g"><span>${c.paid ? 'Balance due' : 'Total due'}</span><span class="num">${money(Math.max(0, c.balance))}</span></div></div>
    ${s === 'paid' ? '<p style="margin-top:18px;color:var(--green)"><span class="stamp">PAID</span></p>' : s === 'overdue' ? '<p style="margin-top:18px;color:var(--red)"><span class="stamp">OVERDUE</span></p>' : ''}
    ${v.notes ? `<p class="notes">${Kit.esc(v.notes)}</p>` : ''}${v.rec !== 'none' ? `<p class="notes">This invoice repeats ${v.rec}.</p>` : ''}`;
}
