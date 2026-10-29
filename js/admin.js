/* Apex Hub agency dashboard — leads from the website form, projects board, clients & plans, invoices,
   template demand and settings. Demo data lives in localStorage; the landing page's contact form drops
   enquiries into 'apexhub:agency-inbox', which this page picks up live. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const DAY = 864e5, now = Date.now(), ago = (d) => now - d * DAY, ahead = (d) => now + d * DAY;
  const PLANS = { budget: 'Budget', premium: 'Premium', diamond: 'Diamond' };
  const STAGES = { new: 'New', contacted: 'Contacted', proposal: 'Proposal sent', won: 'Won', lost: 'Lost' };
  const STAGE_PILL = { new: 'info', contacted: '', proposal: 'warn', won: 'ok', lost: 'bad' };
  const PSTAGES = { brief: 'Brief', design: 'Design', build: 'Build', review: 'Client review', live: 'Live' };
  const SERVICES = ['Full package (Budget / Premium / Diamond)', 'Website', 'SaaS / ready-made template', 'Digital marketing plan', 'Graphic design', 'Video editing', 'Content creation', 'Not sure yet'];
  // First-guess deal size per service, used when a lead arrives from the website
  const ESTIMATE = { 'Full package (Budget / Premium / Diamond)': 8400, Website: 2500, 'SaaS / ready-made template': 1800, 'Digital marketing plan': 3600, 'Graphic design': 900, 'Video editing': 1200, 'Content creation': 1500, 'Not sure yet': 1500 };
  const INBOX = 'apexhub:agency-inbox';

  /* ---------- Demo data ---------- */
  function seed() {
    const team = [
      { id: 'maya', name: 'Maya Haddad', role: 'Founder · Strategy' },
      { id: 'omar', name: 'Omar Farouk', role: 'Lead developer' },
      { id: 'lina', name: 'Lina Aziz', role: 'Design lead' },
      { id: 'jad', name: 'Jad Nassar', role: 'Video & content' },
    ];
    const L = (name, email, service, message, source, status, owner, days, value) => ({ id: Kit.uid(), name, email, service, message, source, status, owner, ts: ago(days), value: value || ESTIMATE[service], notes: '' });
    const leads = [
      L('Sara Mansour', 'sara@olivegrove.co', SERVICES[0], 'We are opening a second branch in spring and need a website, socials and a menu that staff can update.', 'Website form', 'new', 'maya', 0.08),
      L('Daniel Kim', 'daniel@seoulember.kr', SERVICES[2], 'Interested in the Korean BBQ QR ordering for 22 tables. Can it handle two buffet tiers and a 90-minute limit?', 'Template: Korean BBQ buffet', 'new', 'omar', 0.6),
      L('Nadia Rahman', 'nadia@petalandpine.com', SERVICES[6], 'Looking for 12 posts a month for our flower studio.', 'Website form', 'new', 'jad', 1.3),
      L('Ploy Srisuk', 'ploy@baanthai.th', SERVICES[2], 'Thai restaurant, 14 tables. We need PromptPay at the table.', 'Template: Thai restaurant', 'contacted', 'omar', 2),
      L('Chen Wei', 'chen@goldendragon.hk', SERVICES[2], 'Dim sum house — the tick-sheet QR idea is exactly what we want.', 'Template: Dim sum restaurant', 'contacted', 'omar', 2.6),
      L('Lea Fournier', 'lea@studiolea.fr', SERVICES[4], 'Rebrand for a ceramics studio: logo, packaging, business cards.', 'Instagram', 'contacted', 'lina', 3.2),
      L('Aung Min', 'aung@yangonbites.mm', SERVICES[1], 'Restaurant website with online ordering. Customers mostly pay with KBZPay and Wave.', 'Website form', 'proposal', 'maya', 4.5, 3200),
      L('Olivia Grant', 'olivia@nestliving.com', SERVICES[0], 'Furniture brand, want the store template plus ads.', 'Template: Furniture store', 'proposal', 'maya', 5.4),
      L('Marco Bianchi', 'marco@forma-fit.it', SERVICES[2], 'Two gym locations, class booking and memberships.', 'Template: Gym management', 'proposal', 'omar', 6.8),
      L('Hana Yusuf', 'hana@glowlab.com', SERVICES[3], 'Skincare brand launching online.', 'Referral', 'won', 'maya', 12, 7128),
      L('Tom Becker', 'tom@beckerlaw.de', SERVICES[1], 'Law firm site, 3 practice areas.', 'Template: Law firm', 'lost', 'jad', 15),
      L('Ravi Patel', 'ravi@quickcart.in', SERVICES[5], 'Promo video for our grocery app launch.', 'Website form', 'won', 'jad', 22),
      L('Emma Lindqvist', 'emma@nordicbakes.se', SERVICES[2], 'Bakery pre-orders and cake builder.', 'Template: Bakery online ordering', 'lost', 'lina', 30),
      L('Felix Osei', 'felix@kickvault.com', SERVICES[2], 'Sneaker drops with countdowns.', 'Template: Sneaker drop store', 'contacted', 'lina', 40),
      L('Mina Park', 'mina@hanokstay.kr', SERVICES[1], 'Boutique hotel, rooms and availability.', 'Template: Hotel & resort', 'lost', 'maya', 55),
    ];
    leads[10].lostReason = 'Went with an in-house developer';
    const C = (name, contact, email, plan, billing, days, industry, status = 'active') => ({ id: Kit.uid(), name, contact, email, plan, billing, since: ago(days), industry, status });
    const clients = [
      C('Harbor Coffee Co.', 'Jonas Weber', 'jonas@harborcoffee.com', 'diamond', 'monthly', 200, 'Food & drink'),
      C('Studio Kaze', 'Yuki Sato', 'yuki@studiokaze.jp', 'budget', 'monthly', 185, 'Creative & media', 'paused'),
      C('Peak Performance Gym', 'Alex Moreno', 'alex@peakgym.com', 'premium', 'monthly', 165, 'Fitness'),
      C('Lumen Dental', 'Iris Novak', 'iris@lumendental.com', 'budget', 'yearly', 140, 'Health & beauty'),
      C('Urban Thread', 'Kofi Mensah', 'kofi@urbanthread.co', 'premium', 'monthly', 112, 'Fashion'),
      C('Mekong Kitchen', 'Linh Tran', 'linh@mekongkitchen.vn', 'budget', 'monthly', 80, 'Food & drink'),
      C('Northwind Realty', 'Sam Carter', 'sam@northwindrealty.com', 'diamond', 'yearly', 52, 'Real estate'),
      C('QuickCart', 'Ravi Patel', 'ravi@quickcart.in', 'budget', 'monthly', 21, 'Retail'),
      C('Glow Lab Skincare', 'Hana Yusuf', 'hana@glowlab.com', 'premium', 'yearly', 11, 'Health & beauty'),
    ];
    const by = (n) => clients.find((c) => c.name === n).id;
    const P = (client, name, type, stage, due, progress, owner, value) => ({ id: Kit.uid(), client: by(client), name, type, stage, due: ahead(due), progress, owner, value });
    const projects = [
      P('Mekong Kitchen', 'QR menu setup', 'SaaS', 'brief', 21, 10, 'omar', 499),
      P('Glow Lab Skincare', 'November content calendar', 'Content creation', 'brief', 18, 0, 'jad', 0),
      P('Lumen Dental', 'Booking site refresh', 'Website', 'design', 14, 35, 'lina', 499),
      P('Glow Lab Skincare', 'Skincare store launch', 'Online store', 'build', 9, 60, 'lina', 1299),
      P('Urban Thread', 'Autumn campaign videos', 'Video editing', 'build', 5, 50, 'jad', 0),
      P('Northwind Realty', 'Listings site + search ads', 'Website', 'build', -1, 75, 'maya', 2999),
      P('Harbor Coffee Co.', 'Rewards & order-ahead app', 'SaaS', 'review', 3, 90, 'omar', 2999),
      P('QuickCart', 'Launch promo video', 'Video editing', 'review', 2, 85, 'jad', 1200),
      P('Peak Performance Gym', 'Member app rollout', 'SaaS', 'live', -12, 100, 'omar', 1299),
    ];
    const S = { team, leads, clients, projects, invoices: [], log: [], notes: [], next: 1001, rr: 0,
      prices: { budget: 299, premium: 699, diamond: 1499 }, settings: { autoAssign: true, toastLeads: true, overdueAlerts: true } };
    // Six months of subscription invoices, plus setup fees for new clients
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m); d.setHours(9, 0, 0, 0);
      clients.forEach((c) => {
        if (c.since > d.getTime() + 27 * DAY) return;
        if (c.status === 'paused' && m < 2) return;
        // This month's run went out a few days ago; three clients haven't paid it yet
        const issued = m ? d.getTime() : Math.max(d.getTime(), ago(3)), paid = m > 0 || !['Urban Thread', 'Mekong Kitchen', 'Northwind Realty'].includes(c.name);
        S.invoices.push({ id: Kit.uid(), no: 'AH-' + S.next++, client: c.id, item: `${PLANS[c.plan]} plan · ${d.toLocaleDateString('en-GB', { month: 'long' })}`, amount: monthly(S, c), issued, due: issued + 14 * DAY, paid: paid ? Math.min(Date.now(), issued + 2 * DAY) : null });
      });
    }
    S.invoices.filter((i) => i.client === by('Urban Thread') && i.issued < ago(20)).pop().paid = null; // last month's, now overdue
    S.invoices.push({ id: Kit.uid(), no: 'AH-' + S.next++, client: by('Glow Lab Skincare'), item: 'Premium setup · one-time', amount: 1299, issued: ago(10), due: ahead(4), paid: ago(8) });
    S.invoices.push({ id: Kit.uid(), no: 'AH-' + S.next++, client: by('QuickCart'), item: 'Launch promo video', amount: 1200, issued: ago(3), due: ahead(11), paid: null });
    S.log = [
      { text: 'Glow Lab Skincare paid AH-' + (S.next - 2), ts: ago(8) },
      { text: 'Proposal sent to Marco Bianchi', ts: ago(6.5) },
      { text: 'Harbor Coffee app moved to Client review', ts: ago(1.5) },
      { text: 'New lead: Daniel Kim (Korean BBQ buffet)', ts: ago(0.6) },
      { text: 'New lead: Sara Mansour', ts: ago(0.08) },
    ];
    // Calendar: client meetings, internal plans and fixed deadlines (project and invoice due dates are added automatically)
    const at = (days, h, m = 0) => { const d = new Date(now + days * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
    const E = (title, type, days, time, minutes, cl, owner, location, notes = '') => ({ id: Kit.uid(), title, type, start: at(days, time ? time[0] : 0, time ? time[1] : 0), allDay: !time, minutes, client: cl ? by(cl) : '', owner, location, notes });
    S.events = [
      E('Team planning', 'plan', -2, [9, 30], 60, '', 'maya', 'Office'),
      E('Kick-off call', 'meeting', 0, [15, 0], 45, 'Glow Lab Skincare', 'maya', 'Google Meet', 'Walk through the store launch plan and content calendar.'),
      E('Design review', 'meeting', 1, [11, 0], 60, 'Lumen Dental', 'lina', 'Studio'),
      E('Proposal follow-up: Marco Bianchi', 'meeting', 2, [16, 30], 30, '', 'omar', 'Phone'),
      E('Monthly report call', 'meeting', 3, [10, 0], 30, 'Harbor Coffee Co.', 'maya', 'Zoom'),
      E('Shoot day: autumn campaign', 'plan', 4, [9, 0], 480, 'Urban Thread', 'jad', 'On location'),
      E('November content plan', 'plan', 6, null, 60, 'Glow Lab Skincare', 'jad', ''),
      E('Strategy workshop', 'meeting', 9, [14, 0], 120, 'Northwind Realty', 'maya', 'Client office'),
      E('Quarterly tax filing', 'deadline', 12, null, 60, '', 'maya', ''),
      E('Renew domains & hosting', 'deadline', 17, null, 60, '', 'omar', ''),
    ];
    // Books: running costs for the last six months, plus a few one-offs. Paid invoices count as income on their own.
    S.ledger = [];
    const X = (kind, item, category, amount, date, repeat = false, cl = '') => { if (date <= now) S.ledger.push({ id: Kit.uid(), kind, item, category, amount, date, repeat, client: cl ? by(cl) : '' }); };
    for (let m = 5; m >= 0; m--) {
      const day = (n) => { const d = new Date(); d.setMonth(d.getMonth() - m, n); d.setHours(12, 0, 0, 0); return d.getTime(); };
      X('out', 'Office rent', 'Office & rent', 900, day(1), true);
      X('out', 'Hosting & software tools', 'Software & hosting', 420, day(2), true);
      X('out', 'Meta & Google ads', 'Advertising', 350 + (5 - m) * 40, day(15), true);
      X('out', 'Freelance developer', 'Freelancers & salaries', 1800, day(25), true);
    }
    const back = (n, d) => { const x = new Date(); x.setMonth(x.getMonth() - n, d); x.setHours(12, 0, 0, 0); return x.getTime(); };
    X('out', 'Camera lens for shoots', 'Equipment', 1150, back(3, 9));
    X('out', 'Accountant · quarterly fee', 'Taxes & fees', 300, back(1, 20));
    X('in', 'Logo design · walk-in client', 'One-off project', 450, back(2, 12));
    X('in', 'Brand workshop', 'Consulting', 600, back(0, 1), false, 'Northwind Realty');
    return S;
  }
  // A clean start: same team, prices and settings, but no leads, clients, projects, invoices or activity
  function blank() { return { ...seed(), leads: [], clients: [], projects: [], invoices: [], events: [], ledger: [], log: [], notes: [], next: 1001, rr: 0 }; }
  function monthly(S, c) { const p = S.prices[c.plan]; return c.billing === 'yearly' ? Math.round(p * 0.85) : p; }

  /* ---------- Where the data lives ----------
     With server.py running, the dashboard signs in against it and keeps its data there, so leads from the
     website reach every signed-in browser. Opened as plain static files, it falls back to this browser's storage. */
  const LOGIN = { app: 'Apex Hub', key: 'agency', email: 'admin@apexhub.info', password: 'demo1234', name: 'Maya Haddad', role: 'Founder · Admin', accent: '#B3FF00', clientUrl: 'index.html', clientLabel: 'website' };
  const online = !Kit.THUMB && await fetch('/api/health', { cache: 'no-store' }).then((r) => r.ok).catch(() => false);
  let token = null;
  async function api(method, path, body) {
    const r = await fetch(path, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body && JSON.stringify(body) });
    if (r.status === 401) { Kit.signOut('agency'); throw new Error('Signed out'); }
    if (!r.ok && r.status !== 409) throw new Error('Server error ' + r.status);
    return { status: r.status, ...(await r.json()) };
  }
  async function serverStore() {
    let { rev, data } = await api('GET', '/api/agency');
    if (!data) { data = seed(); rev = (await api('PUT', '/api/agency', { rev, data })).rev; }
    let timer = 0, sending = null, waiting = false;
    const store = { key: 'server', data, onRemote: () => {}, onInbox: () => {},
      save() { waiting = true; clearTimeout(timer); timer = setTimeout(push, 250); },
      async reset(next = seed()) { await api('PUT', '/api/agency', { data: next, force: true }); location.hash = ''; location.reload(); } };
    const replace = (next) => { Object.keys(store.data).forEach((k) => { delete store.data[k]; }); Object.assign(store.data, next); };
    async function push() {
      if (sending) await sending;
      waiting = false;
      sending = api('PUT', '/api/agency', { rev, data: store.data }).then((r) => {
        rev = r.rev;
        if (r.status === 409) { replace(r.data); store.onRemote(); Kit.toast('Someone else saved at the same moment, so the dashboard reloaded their version. Please redo your last change.', { ms: 8000 }); }
      }).catch((e) => { if (e.message !== 'Signed out') { Kit.toast('Can\'t reach the server. Retrying your last change…'); waiting = true; timer = setTimeout(push, 4000); } })
        .finally(() => { sending = null; });
    }
    // Live updates: another browser saved, or the website queued a new enquiry
    const live = new EventSource('/api/events?token=' + encodeURIComponent(token));
    live.addEventListener('agency', async (e) => {
      if (+e.data <= rev || waiting || sending) return;
      const r = await api('GET', '/api/agency');
      if (r.rev > rev && !waiting && !sending) { rev = r.rev; replace(r.data); store.onRemote(); }
    });
    live.addEventListener('inbox', () => store.onInbox());
    const status = (up) => { const tag = $('tools').querySelector('.kit-live'); tag.classList.toggle('off', !up); tag.textContent = up ? 'Live' : 'Reconnecting…'; };
    live.onerror = () => status(false);
    live.onopen = () => status(true);
    return store;
  }
  if (online) {
    // A remembered sign-in only counts while the server still accepts its token
    const saved = Kit.authToken('agency');
    const me = saved && await fetch('/api/me', { headers: { Authorization: 'Bearer ' + saved } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!me) Kit.clearAuth('agency');
    token = await Kit.login({ ...LOGIN, password: '', verify: async (email, password) => {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!r.ok) return null;
      const u = await r.json(); Kit.user = { name: u.name, role: u.role, email }; return u.token;
    } });
    if (me) Kit.user = { name: me.name, role: me.role, email: me.email };
  } else Kit.login(LOGIN);
  const db = online ? await serverStore() : Kit.store('agency', seed), S = db.data, save = () => db.save();
  // Data saved before the calendar and books existed has no lists for them yet
  const fill = () => { S.events = S.events || []; S.ledger = S.ledger || []; };
  fill();
  const dayKey = (ts) => Kit.iso(new Date(ts));
  const person = (id) => S.team.find((t) => t.id === id) || { name: 'Unassigned', id: '' };
  const initials = (n) => n.split(' ').map((x) => x[0]).join('').slice(0, 2);
  const client = (id) => S.clients.find((c) => c.id === id) || { name: 'Unknown client' };
  const mrr = () => S.clients.filter((c) => c.status === 'active').reduce((a, c) => a + monthly(S, c), 0);
  const invState = (i) => i.paid ? 'paid' : i.due < Date.now() ? 'overdue' : 'sent';
  const log = (text) => { S.log.push({ text, ts: Date.now() }); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); };
  const q = () => $('q').value.trim().toLowerCase();
  const hit = (...xs) => !q() || xs.some((x) => String(x || '').toLowerCase().includes(q()));
  const barList = (el, rows, fmt = Kit.num) => { const max = Math.max(1, ...rows.map((r) => r[1])); el.innerHTML = rows.map(([l, v]) => `<li><span>${Kit.esc(l)}</span><b>${fmt(v)}</b><i style="--w:${(v / max) * 100}%"></i></li>`).join('') || '<li class="adm-empty">Nothing yet</li>'; };

  const bell = Kit.bell($('tools'), db, { onOpen: (n) => { if (n.lead) openLead(n.lead); } });
  Kit.userMenu($('tools'), { key: 'agency', clientUrl: 'index.html', clientLabel: 'website' });

  /* ---------- Website enquiries ---------- */
  // Move anything the contact form queued into the leads list, assign an owner and ring the bell
  async function pullInbox() {
    let items = [];
    if (online) items = (await api('POST', '/api/inbox/take').catch(() => ({ items: [] }))).items;
    else try { items = JSON.parse(localStorage.getItem(INBOX) || '[]'); localStorage.removeItem(INBOX); } catch (e) { return; }
    items.forEach((x) => {
      const sellers = S.team.filter((t) => t.id !== 'jad');
      const owner = S.settings.autoAssign ? sellers[S.rr++ % sellers.length].id : '';
      const lead = { id: Kit.uid(), name: x.name, email: x.email, service: x.service || 'Not sure yet', message: x.message || '', source: x.source || 'Website form', status: 'new', owner, ts: x.ts || Date.now(), value: ESTIMATE[x.service] || 1500, notes: '' };
      S.leads.push(lead);
      log(`New lead: ${lead.name}${lead.source.startsWith('Template: ') ? ` (${lead.source.slice(10)})` : ''}`);
      if (S.settings.toastLeads) Kit.notify(db, `New enquiry from ${lead.name} · ${lead.service}`, { lead: lead.id });
    });
    if (items.length) { save(); renderAll(); bell.refresh(); }
  }
  if (online) {
    db.onRemote = () => { renderAll(); bell.refresh(); };
    db.onInbox = pullInbox;
    $('tools').querySelector('.kit-live').title = 'Connected to the Apex Hub server';
  } else {
    window.addEventListener('storage', (e) => { if (e.key === INBOX && e.newValue) pullInbox(); });
    Kit.sync(db, () => { renderAll(); bell.refresh(); });
    const tag = $('tools').querySelector('.kit-live');
    tag.textContent = 'This browser only'; tag.classList.add('local'); tag.title = 'Run server.py to share leads and data between browsers';
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    const h = new Date().getHours();
    $('hello').textContent = `Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}, ${Kit.user.name.split(' ')[0]}`;
    $('today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const active = S.clients.filter((c) => c.status === 'active'), newClients = active.filter((c) => c.since > ago(30));
    $('k-mrr').textContent = Kit.money(mrr());
    $('k-mrr-d').textContent = newClients.length ? `+${Kit.money(newClients.reduce((a, c) => a + monthly(S, c), 0))} from ${newClients.length} new this month` : `${active.length} active clients`;
    $('k-mrr-d').className = newClients.length ? 'up' : '';
    const open = S.leads.filter((l) => !['won', 'lost'].includes(l.status));
    $('k-pipe').textContent = Kit.money(open.reduce((a, l) => a + (+l.value || 0), 0));
    const fresh = S.leads.filter((l) => l.status === 'new').length;
    $('k-pipe-d').textContent = `${open.length} open leads · ${fresh} new`; $('k-pipe-d').className = fresh ? 'up' : '';
    const live = S.projects.filter((p) => p.stage !== 'live'), late = live.filter((p) => p.due < Date.now());
    $('k-proj').textContent = live.length;
    $('k-proj-d').textContent = late.length ? `${late.length} past due date` : 'All on schedule'; $('k-proj-d').className = late.length ? 'bad' : '';
    const unpaid = S.invoices.filter((i) => !i.paid), overdue = unpaid.filter((i) => invState(i) === 'overdue');
    $('k-due').textContent = Kit.money(unpaid.reduce((a, i) => a + i.amount, 0));
    $('k-due-d').textContent = overdue.length ? `${overdue.length} overdue · ${Kit.money(overdue.reduce((a, i) => a + i.amount, 0))}` : `${unpaid.length} awaiting payment`; $('k-due-d').className = overdue.length ? 'bad' : '';

    const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - 5 + i); return d; });
    Kit.bars($('c-rev'), months.map((d, i) => { const end = months[i + 1] ? months[i + 1].getTime() : Infinity; return { label: d.toLocaleDateString('en-GB', { month: 'short' }), value: S.invoices.filter((x) => x.paid && x.paid >= d.getTime() && x.paid < end).reduce((a, x) => a + x.amount, 0) }; }), { format: Kit.money });

    const todo = [], tomorrowEnd = Kit.addDays(new Date(), 2).setHours(0, 0, 0, 0);
    S.events.filter((e) => e.type === 'meeting' && e.start > Date.now() - 36e5 && e.start < tomorrowEnd).sort((a, b) => a.start - b.start)
      .forEach((e) => todo.push(['hot', e.title, `${dayKey(e.start) === dayKey(Date.now()) ? 'Today' : 'Tomorrow'} ${hhmm(e.start)}${e.client ? ' · ' + client(e.client).name : ''}`, `ev:${e.id}`]));
    S.leads.filter((l) => l.status === 'new').sort((a, b) => b.ts - a.ts).forEach((l) => todo.push(['hot', `Reply to ${l.name}`, `${l.service} · ${Kit.ago(l.ts)}`, `lead:${l.id}`]));
    overdue.forEach((i) => todo.push(['bad', `Chase ${i.no} · ${client(i.client).name}`, `${Kit.money(i.amount)} was due ${Kit.day(i.due)}`, `inv:${i.id}`]));
    live.filter((p) => p.due < ahead(4)).sort((a, b) => a.due - b.due).forEach((p) => todo.push([p.due < Date.now() ? 'bad' : '', `${p.name}`, `${client(p.client).name} · ${p.due < Date.now() ? 'overdue since' : 'due'} ${Kit.day(p.due)} · ${PSTAGES[p.stage]}`, `proj:${p.id}`]));
    $('todo').innerHTML = todo.slice(0, 7).map(([cls, t, s, go]) => `<li class="${cls}"><span></span><button data-open="${go}">${Kit.esc(t)}<small>${Kit.esc(s)}</small></button></li>`).join('') || '<li><span></span><div>Nothing waiting — nice.<small>New enquiries and overdue invoices show up here.</small></div></li>';

    const svc = {}; S.leads.filter((l) => l.ts > ago(90)).forEach((l) => { const k = l.service.startsWith('Full package') ? 'Full package' : l.service; svc[k] = (svc[k] || 0) + 1; });
    barList($('c-svc'), Object.entries(svc).sort((a, b) => b[1] - a[1]));
    $('feed').innerHTML = S.log.slice(-7).reverse().map((x) => `<li><span></span><div>${Kit.esc(x.text)}<small>${Kit.ago(x.ts)}</small></div></li>`).join('');
  }
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]'); if (o) { const [k, id] = o.dataset.open.split(':'); ({ lead: openLead, inv: openInvoice, proj: openProject, client: openClient, ev: openEvent, led: openEntry })[k](id); return; }
    const g = e.target.closest('[data-go]'); if (g) router.go(g.dataset.go);
  });

  /* ---------- Leads ---------- */
  let stage = 'open';
  function renderLeads() {
    const counts = { open: S.leads.filter((l) => !['won', 'lost'].includes(l.status)).length, all: S.leads.length };
    Object.keys(STAGES).forEach((k) => { counts[k] = S.leads.filter((l) => l.status === k).length; });
    const tabs = { open: 'Open', ...STAGES, all: 'All' };
    $('l-stage').innerHTML = Object.entries(tabs).map(([k, v]) => `<button type="button" data-stage="${k}" aria-pressed="${k === stage}">${v}<small>${counts[k]}</small></button>`).join('');
    const rows = S.leads.filter((l) => (stage === 'all' || (stage === 'open' ? !['won', 'lost'].includes(l.status) : l.status === stage)) && hit(l.name, l.email, l.service, l.source, l.message)).sort((a, b) => b.ts - a.ts);
    $('l-rows').innerHTML = rows.map((l) => `<tr class="click" data-open="lead:${l.id}" tabindex="0"><td><b>${Kit.esc(l.name)}</b><small>${Kit.esc(l.email)}</small></td><td>${Kit.esc(l.service.replace(' (Budget / Premium / Diamond)', ''))}</td><td>${Kit.esc(l.source)}</td>
      <td><span class="adm-pill ${STAGE_PILL[l.status]}">${STAGES[l.status]}</span></td><td class="num">${Kit.money(l.value)}</td><td>${l.owner ? `<span class="av" title="${Kit.esc(person(l.owner).name)}">${initials(person(l.owner).name)}</span>` : '—'}</td><td>${Kit.ago(l.ts)}</td></tr>`).join('')
      || `<tr><td colspan="7" class="adm-empty">${q() ? 'No leads match your search.' : 'No leads in this stage.'} <button class="adm-link" data-stage="all">Show all leads</button></td></tr>`;
    const n = S.leads.filter((l) => l.status === 'new').length; $('n-leads').hidden = !n; $('n-leads').textContent = n;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-stage]'); if (b) { stage = b.dataset.stage; if (b.classList.contains('adm-link')) $('q').value = ''; renderLeads(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('tr[data-open]')) e.target.click(); });

  const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${Kit.esc(v)}</option>`).join('');
  const teamOpts = (sel) => `<option value="">Unassigned</option>` + S.team.map((t) => `<option value="${t.id}"${t.id === sel ? ' selected' : ''}>${Kit.esc(t.name)}</option>`).join('');

  function openLead(id) {
    const l = S.leads.find((x) => x.id === id); if (!l) return;
    const subject = encodeURIComponent(`Your enquiry with Apex Hub — ${l.service.replace(' (Budget / Premium / Diamond)', '')}`);
    Kit.modal({ title: l.name, wide: true, body: `
      <div class="lead-meta"><div>Email<b><a class="adm-link" href="mailto:${Kit.esc(l.email)}?subject=${subject}">${Kit.esc(l.email)}</a></b></div><div>Received<b>${new Date(l.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</b></div><div>Service<b>${Kit.esc(l.service)}</b></div><div>Source<b>${Kit.esc(l.source)}</b></div></div>
      ${l.message ? `<div class="kit-field"><span class="kit-label">Message</span><p class="lead-msg">${Kit.esc(l.message)}</p></div>` : ''}
      <div class="kit-row"><div class="kit-field"><label for="ls">Stage</label><select id="ls">${opts(STAGES, l.status)}</select></div><div class="kit-field"><label for="lo">Owner</label><select id="lo">${teamOpts(l.owner)}</select></div><div class="kit-field"><label for="lv">Estimated value (USD)</label><input id="lv" type="number" min="0" step="1" value="${+l.value || 0}"></div></div>
      <div class="kit-field"><label for="ln">Internal notes</label><textarea id="ln" placeholder="Call notes, budget, timeline…">${Kit.esc(l.notes || '')}</textarea></div>`,
    actions: [
      ...(l.status !== 'won' ? [{ label: 'Convert to client', onClick: () => { setTimeout(() => convert(l)); } }] : []),
      { label: 'Cancel' },
      { label: 'Save lead', primary: true, onClick: (m) => {
        const was = l.status;
        l.status = m.querySelector('#ls').value; l.owner = m.querySelector('#lo').value; l.value = Math.max(0, +m.querySelector('#lv').value || 0); l.notes = m.querySelector('#ln').value.trim();
        if (was !== l.status) log(`${l.name} moved to ${STAGES[l.status]}`);
        save(); renderAll(); Kit.toast('Lead saved', { type: 'success' });
      } },
    ] });
  }
  function newLead() {
    Kit.modal({ title: 'New lead', body: `<div class="kit-row"><div class="kit-field"><label for="nn">Name</label><input id="nn" required autocomplete="off"></div><div class="kit-field"><label for="ne">Email</label><input id="ne" type="email" required autocomplete="off"></div></div>
      <div class="kit-row"><div class="kit-field"><label for="ns">Service</label><select id="ns">${SERVICES.map((s) => `<option>${Kit.esc(s)}</option>`).join('')}</select></div><div class="kit-field"><label for="nsrc">Source</label><select id="nsrc"><option>Phone call</option><option>Referral</option><option>Instagram</option><option>Facebook</option><option>LinkedIn</option><option>Walk-in</option></select></div></div>
      <div class="kit-field"><label for="nm">What do they need?</label><textarea id="nm"></textarea></div>`,
    onOpen: (m) => m.querySelector('#nn').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Add lead', primary: true, submit: true, onClick: (m) => {
      const service = m.querySelector('#ns').value;
      const l = { id: Kit.uid(), name: m.querySelector('#nn').value.trim(), email: m.querySelector('#ne').value.trim(), service, message: m.querySelector('#nm').value.trim(), source: m.querySelector('#nsrc').value, status: 'new', owner: Kit.user && S.team[0].id, ts: Date.now(), value: ESTIMATE[service], notes: '' };
      S.leads.push(l); log(`New lead: ${l.name} (added by hand)`); save(); stage = 'open'; renderAll(); router.go('leads'); Kit.toast(`${l.name} added`, { type: 'success' });
    } }] });
  }
  // Won lead → client on a plan, a kick-off project and the setup invoice
  function convert(l) {
    const guess = l.service.startsWith('Full package') ? 'premium' : 'budget';
    Kit.modal({ title: `Convert ${l.name} to a client`, body: `
      <div class="kit-field"><label for="cn">Business name</label><input id="cn" required value="${Kit.esc((l.email.split('@')[1] || '').split('.')[0].replace(/^\w/, (c) => c.toUpperCase()))}"></div>
      <div class="kit-row"><div class="kit-field"><label for="cp">Plan</label><select id="cp">${opts(PLANS, guess)}</select></div><div class="kit-field"><label for="cb">Billing</label><select id="cb"><option value="monthly">Monthly</option><option value="yearly">Yearly (15% off)</option></select></div></div>
      <div class="kit-row"><div class="kit-field"><label for="cj">First project</label><input id="cj" value="${Kit.esc(l.service.replace(' (Budget / Premium / Diamond)', '').replace('SaaS / ready-made template', l.source.startsWith('Template: ') ? l.source.slice(10) + ' setup' : 'Template setup'))}"></div><div class="kit-field"><label for="cs">Setup fee (USD)</label><input id="cs" type="number" min="0" step="1" value="${({ budget: 499, premium: 1299, diamond: 2999 })[guess]}"></div></div>
      <label class="kit-check"><input type="checkbox" id="ci" checked> Send the setup invoice now</label>`,
    actions: [{ label: 'Cancel' }, { label: 'Create client', primary: true, submit: true, onClick: (m) => {
      const c = { id: Kit.uid(), name: m.querySelector('#cn').value.trim(), contact: l.name, email: l.email, plan: m.querySelector('#cp').value, billing: m.querySelector('#cb').value, since: Date.now(), industry: '', status: 'active' };
      const fee = Math.max(0, +m.querySelector('#cs').value || 0);
      S.clients.push(c);
      S.projects.push({ id: Kit.uid(), client: c.id, name: m.querySelector('#cj').value.trim() || 'Kick-off', type: l.service.includes('SaaS') ? 'SaaS' : l.service.replace(' (Budget / Premium / Diamond)', ''), stage: 'brief', due: ahead(30), progress: 0, owner: l.owner || 'maya', value: fee });
      if (fee && m.querySelector('#ci').checked) S.invoices.push({ id: Kit.uid(), no: 'AH-' + S.next++, client: c.id, item: `${PLANS[c.plan]} setup · one-time`, amount: fee, issued: Date.now(), due: ahead(14), paid: null });
      l.status = 'won'; log(`${c.name} signed up on ${PLANS[c.plan]} (${c.billing})`);
      save(); renderAll(); Kit.toast(`${c.name} is now a client · ${Kit.money(monthly(S, c))}/mo`, { type: 'success' });
    } }] });
  }

  /* ---------- Projects ---------- */
  function renderProjects() {
    const who = $('p-owner').value;
    const list = S.projects.filter((p) => (who === 'all' || p.owner === who) && hit(p.name, client(p.client).name, p.type));
    const late = S.projects.filter((p) => p.stage !== 'live' && p.due < Date.now()).length;
    $('p-sub').textContent = `${S.projects.filter((p) => p.stage !== 'live').length} in progress${late ? ` · ${late} past due` : ''} · drag cards between stages`;
    $('board').innerHTML = Object.entries(PSTAGES).map(([k, v]) => { const cards = list.filter((p) => p.stage === k).sort((a, b) => a.due - b.due); return `<section class="col" data-col="${k}" aria-label="${v}"><h2>${v}<span>${cards.length}</span></h2>
      ${cards.map((p) => { const over = p.stage !== 'live' && p.due < Date.now(); return `<button class="card" draggable="true" data-open="proj:${p.id}" data-id="${p.id}"><small>${Kit.esc(client(p.client).name)}</small><b>${Kit.esc(p.name)}</b><small>${Kit.esc(p.type)}</small><span class="prog" aria-label="${p.progress}% done"><i style="width:${p.progress}%"></i></span><span class="row"><span class="${over ? 'late' : ''}">${p.stage === 'live' ? 'Launched' : (over ? 'Overdue · ' : 'Due ') + Kit.day(p.due)}</span><span class="av" title="${Kit.esc(person(p.owner).name)}">${initials(person(p.owner).name)}</span></span></button>`; }).join('')}</section>`; }).join('');
    $('n-proj').hidden = !late; $('n-proj').textContent = late;
  }
  $('p-owner').innerHTML += S.team.map((t) => `<option value="${t.id}">${Kit.esc(t.name)}</option>`).join('');
  $('p-owner').onchange = renderProjects;
  let dragId = null;
  $('board').addEventListener('dragstart', (e) => { const c = e.target.closest('.card'); if (!c) return; dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  $('board').addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.col.over, .card.dragging').forEach((x) => x.classList.remove('over', 'dragging')); });
  $('board').addEventListener('dragover', (e) => { const col = e.target.closest('.col'); if (!col || !dragId) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach((x) => x !== col && x.classList.remove('over')); col.classList.add('over'); });
  $('board').addEventListener('drop', (e) => { const col = e.target.closest('.col'); if (!col || !dragId) return; e.preventDefault(); moveProject(S.projects.find((p) => p.id === dragId), col.dataset.col); });
  function moveProject(p, to) {
    if (!p || p.stage === to) return;
    const from = p.stage; p.stage = to; if (to === 'live') p.progress = 100;
    log(`${p.name} moved to ${PSTAGES[to]}`); save(); renderAll();
    Kit.toast(`${p.name} → ${PSTAGES[to]}`, { undo: () => { p.stage = from; save(); renderAll(); } });
  }
  function projectForm(p) {
    return `<div class="kit-row"><div class="kit-field"><label for="pn">Project</label><input id="pn" required value="${Kit.esc(p.name || '')}"></div><div class="kit-field"><label for="pc">Client</label><select id="pc">${S.clients.map((c) => `<option value="${c.id}"${c.id === p.client ? ' selected' : ''}>${Kit.esc(c.name)}</option>`).join('')}</select></div></div>
      <div class="kit-row"><div class="kit-field"><label for="pst">Stage</label><select id="pst">${opts(PSTAGES, p.stage)}</select></div><div class="kit-field"><label for="pow">Owner</label><select id="pow">${teamOpts(p.owner)}</select></div><div class="kit-field"><label for="pd">Due date</label><input id="pd" type="date" value="${Kit.iso(new Date(p.due || ahead(21)))}"></div></div>
      <div class="kit-row"><div class="kit-field"><label for="pt">Type</label><input id="pt" value="${Kit.esc(p.type || 'Website')}"></div><div class="kit-field"><label for="pp">Progress · <output id="ppo">${p.progress || 0}%</output></label><input id="pp" type="range" min="0" max="100" step="5" value="${p.progress || 0}"></div></div>`;
  }
  const readProject = (m, p) => Object.assign(p, { name: m.querySelector('#pn').value.trim(), client: m.querySelector('#pc').value, stage: m.querySelector('#pst').value, owner: m.querySelector('#pow').value, due: new Date(m.querySelector('#pd').value + 'T12:00').getTime() || ahead(21), type: m.querySelector('#pt').value.trim(), progress: +m.querySelector('#pp').value });
  const rangeLive = (m) => m.querySelector('#pp').addEventListener('input', (e) => { m.querySelector('#ppo').textContent = e.target.value + '%'; });
  function openProject(id) {
    const p = S.projects.find((x) => x.id === id); if (!p) return;
    Kit.modal({ title: p.name, wide: true, body: projectForm(p), onOpen: rangeLive, actions: [
      { label: 'Delete', danger: true, onClick: () => { setTimeout(async () => { if (await Kit.confirm(`Delete "${p.name}"?`, 'The project card is removed from the board. Invoices stay.', 'Delete project')) { S.projects = S.projects.filter((x) => x !== p); save(); renderAll(); Kit.toast('Project deleted'); } }); } },
      { label: 'Cancel' },
      { label: 'Save project', primary: true, submit: true, onClick: (m) => { const was = p.stage; readProject(m, p); if (was !== p.stage) log(`${p.name} moved to ${PSTAGES[p.stage]}`); save(); renderAll(); Kit.toast('Project saved', { type: 'success' }); } },
    ] });
  }
  // Projects and invoices belong to a client, so on an empty dashboard start by adding one
  function needClient() {
    if (S.clients.length) return false;
    Kit.toast('Add a client first. Projects and invoices belong to a client.');
    openClient(null);
    return true;
  }
  function newProject() {
    if (needClient()) return;
    const p = { id: Kit.uid(), stage: 'brief', progress: 0, owner: 'maya', client: S.clients[0].id, value: 0 };
    Kit.modal({ title: 'New project', wide: true, body: projectForm(p), onOpen: (m) => { rangeLive(m); m.querySelector('#pn').focus(); }, actions: [{ label: 'Cancel' }, { label: 'Add project', primary: true, submit: true, onClick: (m) => { S.projects.push(readProject(m, p)); log(`New project: ${p.name}`); save(); renderAll(); router.go('projects'); } }] });
  }

  /* ---------- Clients & plans ---------- */
  function renderClients() {
    const active = S.clients.filter((c) => c.status === 'active');
    $('c-sub').textContent = `${active.length} active · ${Kit.money(mrr())} MRR · ${Kit.money(mrr() * 12)} a year`;
    $('plans').innerHTML = Object.entries(PLANS).map(([k, v]) => { const cs = active.filter((c) => c.plan === k); return `<div class="adm-card plan ${k}"><span>${v} · ${Kit.money(S.prices[k])}/mo</span><b>${Kit.money(cs.reduce((a, c) => a + monthly(S, c), 0))}</b><small>${cs.length} client${cs.length === 1 ? '' : 's'} · ${cs.filter((c) => c.billing === 'yearly').length} yearly</small></div>`; }).join('');
    const rows = S.clients.filter((c) => hit(c.name, c.contact, c.email, c.industry)).sort((a, b) => (a.status === b.status ? b.since - a.since : a.status === 'active' ? -1 : 1));
    $('c-rows').innerHTML = rows.map((c) => { const open = S.projects.filter((p) => p.client === c.id && p.stage !== 'live').length; return `<tr class="click" data-open="client:${c.id}" tabindex="0"><td><b>${Kit.esc(c.name)}</b><small>${Kit.esc(c.contact)} · ${Kit.esc(c.email)}</small></td><td>${PLANS[c.plan]}</td><td>${c.billing === 'yearly' ? 'Yearly' : 'Monthly'}</td><td class="num">${c.status === 'active' ? Kit.money(monthly(S, c)) : '—'}</td><td>${new Date(c.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</td><td>${open || '—'}</td><td><span class="adm-pill ${c.status === 'active' ? 'ok' : 'warn'}">${c.status === 'active' ? 'Active' : 'Paused'}</span></td></tr>`; }).join('')
      || '<tr><td colspan="7" class="adm-empty">No clients match your search.</td></tr>';
  }
  function openClient(id) {
    const c = S.clients.find((x) => x.id === id) || { id: Kit.uid(), name: '', contact: '', email: '', plan: 'budget', billing: 'monthly', since: Date.now(), industry: '', status: 'active', isNew: true };
    const isNew = !!c.isNew; delete c.isNew;
    const paid = S.invoices.filter((i) => i.client === c.id && i.paid).reduce((a, i) => a + i.amount, 0);
    Kit.modal({ title: isNew ? 'Add client' : c.name, wide: true, body: `
      ${isNew ? '' : `<div class="lead-meta"><div>Lifetime billed<b>${Kit.money(paid)}</b></div><div>Client since<b>${new Date(c.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</b></div></div>`}
      <div class="kit-row"><div class="kit-field"><label for="cn">Business</label><input id="cn" required value="${Kit.esc(c.name)}"></div><div class="kit-field"><label for="ci">Industry</label><input id="ci" value="${Kit.esc(c.industry)}"></div></div>
      <div class="kit-row"><div class="kit-field"><label for="cc">Contact</label><input id="cc" value="${Kit.esc(c.contact)}"></div><div class="kit-field"><label for="ce">Email</label><input id="ce" type="email" value="${Kit.esc(c.email)}"></div></div>
      <div class="kit-row"><div class="kit-field"><label for="cp">Plan</label><select id="cp">${Object.entries(PLANS).map(([k, v]) => `<option value="${k}"${k === c.plan ? ' selected' : ''}>${v} · ${Kit.money(S.prices[k])}/mo</option>`).join('')}</select></div><div class="kit-field"><label for="cb">Billing</label><select id="cb">${opts({ monthly: 'Monthly', yearly: 'Yearly (15% off)' }, c.billing)}</select></div><div class="kit-field"><label for="cst">Status</label><select id="cst">${opts({ active: 'Active', paused: 'Paused' }, c.status)}</select></div></div>`,
    onOpen: (m) => isNew && m.querySelector('#cn').focus(),
    actions: [{ label: 'Cancel' }, { label: isNew ? 'Add client' : 'Save client', primary: true, submit: true, onClick: (m) => {
      const was = c.plan;
      Object.assign(c, { name: m.querySelector('#cn').value.trim(), industry: m.querySelector('#ci').value.trim(), contact: m.querySelector('#cc').value.trim(), email: m.querySelector('#ce').value.trim(), plan: m.querySelector('#cp').value, billing: m.querySelector('#cb').value, status: m.querySelector('#cst').value });
      if (isNew) { S.clients.push(c); log(`New client: ${c.name} on ${PLANS[c.plan]}`); } else if (was !== c.plan) log(`${c.name} ${S.prices[c.plan] > S.prices[was] ? 'upgraded' : 'moved'} to ${PLANS[c.plan]}`);
      save(); renderAll(); Kit.toast(isNew ? `${c.name} added` : 'Client saved', { type: 'success' });
    } }] });
  }

  /* ---------- Invoices ---------- */
  let invFilter = 'unpaid';
  function renderInvoices() {
    const st = { unpaid: (i) => !i.paid, overdue: (i) => invState(i) === 'overdue', paid: (i) => !!i.paid, all: () => true };
    const labels = { unpaid: 'Unpaid', overdue: 'Overdue', paid: 'Paid', all: 'All' };
    $('i-filter').innerHTML = Object.entries(labels).map(([k, v]) => `<button type="button" data-inv="${k}" aria-pressed="${k === invFilter}">${v}<small>${S.invoices.filter(st[k]).length}</small></button>`).join('');
    const unpaid = S.invoices.filter((i) => !i.paid);
    $('i-sub').textContent = `${Kit.money(unpaid.reduce((a, i) => a + i.amount, 0))} outstanding across ${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'}`;
    const rows = S.invoices.filter((i) => st[invFilter](i) && hit(i.no, client(i.client).name, i.item)).sort((a, b) => b.issued - a.issued);
    const pill = { paid: ['ok', 'Paid'], overdue: ['bad', 'Overdue'], sent: ['info', 'Sent'] };
    $('i-rows').innerHTML = rows.map((i) => { const s = invState(i); return `<tr class="click" data-open="inv:${i.id}" tabindex="0"><td><b>${i.no}</b></td><td>${Kit.esc(client(i.client).name)}</td><td>${Kit.esc(i.item)}</td><td class="num">${Kit.money(i.amount)}</td><td>${Kit.day(i.issued)}</td><td>${Kit.day(i.due)}</td><td><span class="adm-pill ${pill[s][0]}">${pill[s][1]}</span></td><td>${i.paid ? '' : `<button class="adm-link" data-pay="${i.id}">Mark paid</button>`}</td></tr>`; }).join('')
      || '<tr><td colspan="8" class="adm-empty">No invoices here.</td></tr>';
    const od = S.invoices.filter(st.overdue).length; $('n-inv').hidden = !od; $('n-inv').textContent = od;
  }
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-inv]'); if (f) { invFilter = f.dataset.inv; renderInvoices(); return; }
    const p = e.target.closest('[data-pay]'); if (p) { e.stopPropagation(); markPaid(S.invoices.find((i) => i.id === p.dataset.pay)); }
  }, true);
  function markPaid(i) {
    i.paid = Date.now(); log(`${client(i.client).name} paid ${i.no}`); save(); renderAll();
    Kit.toast(`${i.no} marked paid · ${Kit.money(i.amount)}`, { undo: () => { i.paid = null; save(); renderAll(); } });
  }
  function openInvoice(id) {
    const i = S.invoices.find((x) => x.id === id); if (!i) return;
    const c = client(i.client);
    const subject = encodeURIComponent(`Invoice ${i.no} from Apex Hub — ${Kit.money(i.amount)}`), body = encodeURIComponent(`Hi ${(c.contact || '').split(' ')[0]},\n\nA friendly reminder that invoice ${i.no} (${i.item}) for ${Kit.money(i.amount)} was due on ${Kit.day(i.due)}.\n\nThanks,\nApex Hub`);
    Kit.modal({ title: `Invoice ${i.no}`, body: `<div class="lead-meta"><div>Client<b>${Kit.esc(c.name)}</b></div><div>Amount<b>${Kit.money(i.amount)}</b></div><div>Item<b>${Kit.esc(i.item)}</b></div><div>Status<b>${({ paid: `Paid ${Kit.day(i.paid)}`, overdue: `Overdue since ${Kit.day(i.due)}`, sent: `Due ${Kit.day(i.due)}` })[invState(i)]}</b></div></div>
      ${!i.paid && c.email ? `<a class="adm-btn" href="mailto:${Kit.esc(c.email)}?subject=${subject}&body=${body}">Email a payment reminder</a>` : ''}`,
    actions: [{ label: 'Close' }, ...(i.paid ? [] : [{ label: 'Mark paid', primary: true, onClick: () => markPaid(i) }])] });
  }
  function newInvoice() {
    if (needClient()) return;
    Kit.modal({ title: 'New invoice', body: `<div class="kit-field"><label for="ic">Client</label><select id="ic">${S.clients.map((c) => `<option value="${c.id}">${Kit.esc(c.name)}</option>`).join('')}</select></div>
      <div class="kit-field"><label for="it">For</label><input id="it" required placeholder="e.g. Extra landing page"></div>
      <div class="kit-row"><div class="kit-field"><label for="ia">Amount (USD)</label><input id="ia" type="number" min="1" step="1" required></div><div class="kit-field"><label for="id">Due in</label><select id="id"><option value="7">7 days</option><option value="14" selected>14 days</option><option value="30">30 days</option></select></div></div>`,
    onOpen: (m) => m.querySelector('#it').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Create invoice', primary: true, submit: true, onClick: (m) => {
      const i = { id: Kit.uid(), no: 'AH-' + S.next++, client: m.querySelector('#ic').value, item: m.querySelector('#it').value.trim(), amount: Math.round(+m.querySelector('#ia').value), issued: Date.now(), due: ahead(+m.querySelector('#id').value), paid: null };
      S.invoices.push(i); log(`${i.no} sent to ${client(i.client).name}`); save(); invFilter = 'unpaid'; renderAll(); router.go('invoices'); Kit.toast(`${i.no} created`, { type: 'success' });
    } }] });
  }
  // Raise this month's subscription invoice for every active client that doesn't have one yet
  async function billMonth() {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const month = start.toLocaleDateString('en-GB', { month: 'long' });
    const todo = S.clients.filter((c) => c.status === 'active' && !S.invoices.some((i) => i.client === c.id && i.issued >= start.getTime() && i.item.includes(' plan · ')));
    if (!S.clients.some((c) => c.status === 'active')) { Kit.toast('No active clients to bill yet'); return; }
    if (!todo.length) { Kit.toast(`Every active client already has a ${month} invoice`); return; }
    if (!await Kit.confirm(`Bill ${todo.length} client${todo.length === 1 ? '' : 's'} for ${month}?`, `Creates ${todo.length} subscription invoice${todo.length === 1 ? '' : 's'} totalling ${Kit.money(todo.reduce((a, c) => a + monthly(S, c), 0))}, due in 14 days.`, 'Create invoices', false)) return;
    todo.forEach((c) => S.invoices.push({ id: Kit.uid(), no: 'AH-' + S.next++, client: c.id, item: `${PLANS[c.plan]} plan · ${month}`, amount: monthly(S, c), issued: Date.now(), due: ahead(14), paid: null }));
    log(`${todo.length} ${month} subscription invoices sent`); save(); invFilter = 'unpaid'; renderAll();
  }

  /* ---------- Calendar ---------- */
  const KINDS = { meeting: 'Meetings', plan: 'Plans', deadline: 'Deadlines' };
  const EVT = { meeting: 'Client meeting', plan: 'Plan', deadline: 'Deadline' };
  const LENGTHS = { 15: '15 min', 30: '30 min', 45: '45 min', 60: '1 hour', 90: '1.5 hours', 120: '2 hours', 240: 'Half day', 480: 'Full day' };
  const calTypes = { meeting: true, plan: true, deadline: true };
  const calMonth = new Date(); calMonth.setDate(1); calMonth.setHours(0, 0, 0, 0);
  const hhmm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const when = (x) => (x.allDay ? 'All day' : hhmm(x.ts));
  // Everything with a date: your own events, plus project and unpaid invoice due dates
  function calItems() {
    const out = S.events.map((e) => ({ kind: e.type, ts: e.start, allDay: e.allDay, title: e.title, sub: [e.client && client(e.client).name, e.location].filter(Boolean).join(' · '), open: `ev:${e.id}` }));
    S.projects.filter((p) => p.stage !== 'live').forEach((p) => out.push({ kind: 'deadline', ts: p.due, allDay: true, title: `${p.name} due`, sub: `${client(p.client).name} · ${PSTAGES[p.stage]}`, open: `proj:${p.id}` }));
    S.invoices.filter((i) => !i.paid).forEach((i) => out.push({ kind: 'deadline', ts: i.due, allDay: true, title: `${i.no} payment due`, sub: `${client(i.client).name} · ${Kit.money(i.amount)}`, open: `inv:${i.id}` }));
    return out.filter((x) => calTypes[x.kind] && hit(x.title, x.sub))
      .sort((a, b) => dayKey(a.ts).localeCompare(dayKey(b.ts)) || (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.ts - b.ts);
  }
  const chip = (x) => `<button type="button" class="chip is-${x.kind}" data-open="${x.open}" title="${Kit.esc(`${when(x)} · ${x.title}${x.sub ? ' · ' + x.sub : ''}`)}">${x.allDay ? '' : `<span>${hhmm(x.ts)}</span> `}${Kit.esc(x.title)}</button>`;
  function renderCalendar() {
    const items = calItems(), byDay = {};
    items.forEach((x) => { (byDay[dayKey(x.ts)] = byDay[dayKey(x.ts)] || []).push(x); });
    $('k-month').textContent = calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    $('k-types').innerHTML = Object.entries(KINDS).map(([k, v]) => `<button type="button" class="kt is-${k}" data-ktype="${k}" aria-pressed="${calTypes[k]}">${v}</button>`).join('');
    const lead = (calMonth.getDay() + 6) % 7, days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const start = Kit.addDays(calMonth, -lead), today = dayKey(Date.now());
    $('k-grid').innerHTML = [...Array(Math.ceil((lead + days) / 7) * 7)].map((_, i) => {
      const d = Kit.addDays(start, i), k = Kit.iso(d), list = byDay[k] || [];
      const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + (list.length ? `, ${list.length} item${list.length === 1 ? '' : 's'}` : '');
      return `<div class="cal-day${d.getMonth() !== calMonth.getMonth() ? ' out' : ''}${k === today ? ' today' : ''}" data-day="${k}"><button type="button" class="cal-n" data-day-open="${k}" aria-label="${label}">${d.getDate()}</button>${list.slice(0, 3).map(chip).join('')}${list.length > 3 ? `<button type="button" class="cal-more" data-day-open="${k}">+${list.length - 3} more</button>` : ''}</div>`;
    }).join('');
    // Agenda: today and the next two weeks
    const from = new Date().setHours(0, 0, 0, 0), to = from + 14 * DAY;
    const up = items.filter((x) => x.ts >= from && x.ts < to);
    let last = '';
    $('k-agenda').innerHTML = up.map((x) => {
      const k = dayKey(x.ts), head = k === last ? '' : `<li class="ag-day">${k === today ? 'Today' : k === dayKey(from + DAY) ? 'Tomorrow' : new Date(x.ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</li>`;
      last = k;
      return `${head}<li><button type="button" class="ag-item is-${x.kind}" data-open="${x.open}"><span></span><div>${Kit.esc(x.title)}<small>${when(x)}${x.sub ? ' · ' + Kit.esc(x.sub) : ''}</small></div></button></li>`;
    }).join('') || `<li class="adm-empty">${q() ? 'Nothing matches your search.' : 'Nothing in the next two weeks.'} <button type="button" class="adm-link" data-new-event="${today}">Add an event</button></li>`;
    const weekEnd = from + 7 * DAY, week = items.filter((x) => x.ts >= from && x.ts < weekEnd);
    const meet = week.filter((x) => x.kind === 'meeting').length, dl = week.filter((x) => x.kind === 'deadline').length;
    $('k-sub').textContent = `Next 7 days: ${meet} meeting${meet === 1 ? '' : 's'} · ${dl} deadline${dl === 1 ? '' : 's'}`;
    const now2 = Date.now(), todayMeet = S.events.filter((e) => e.type === 'meeting' && dayKey(e.start) === today && e.start > now2 - 36e5).length;
    $('n-cal').hidden = !todayMeet; $('n-cal').textContent = todayMeet;
  }
  const shiftMonth = (n) => { calMonth.setMonth(calMonth.getMonth() + n); renderCalendar(); };
  $('k-prev').onclick = () => shiftMonth(-1);
  $('k-next').onclick = () => shiftMonth(1);
  $('k-today').onclick = () => { const t = new Date(); calMonth.setFullYear(t.getFullYear(), t.getMonth(), 1); renderCalendar(); };
  $('k-new').onclick = () => newEvent();
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-ktype]'); if (t) { calTypes[t.dataset.ktype] = !calTypes[t.dataset.ktype]; renderCalendar(); return; }
    const n = e.target.closest('[data-new-event]'); if (n) { newEvent(n.dataset.newEvent); return; }
    if (e.target.closest('[data-open]')) return;
    const d = e.target.closest('[data-day-open], .cal-day'); if (d) openDay(d.dataset.dayOpen || d.dataset.day);
  });
  // A day with things on it opens its list; an empty day goes straight to a new event
  function openDay(k) {
    const list = calItems().filter((x) => dayKey(x.ts) === k);
    if (!list.length) { newEvent(k); return; }
    const d = Kit.modal({ title: new Date(k + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), body: `<ul class="agenda">${list.map((x) => `<li><button type="button" class="ag-item is-${x.kind}" data-open="${x.open}"><span></span><div>${Kit.esc(x.title)}<small>${when(x)}${x.sub ? ' · ' + Kit.esc(x.sub) : ''}</small></div></button></li>`).join('')}</ul>`,
      actions: [{ label: 'Close' }, { label: 'Add event', primary: true, onClick: () => { setTimeout(() => newEvent(k)); } }] });
    d.addEventListener('click', (e) => { if (e.target.closest('[data-open]')) d.close(); });
  }
  function eventForm(e) {
    return `<div class="kit-field"><label for="et">Title</label><input id="et" required value="${Kit.esc(e.title)}" placeholder="e.g. Kick-off call" autocomplete="off"></div>
      <div class="kit-row"><div class="kit-field"><label for="ey">Type</label><select id="ey">${opts(EVT, e.type)}</select></div><div class="kit-field"><label for="ec">Client</label><select id="ec"><option value="">No client</option>${S.clients.map((c) => `<option value="${c.id}"${c.id === e.client ? ' selected' : ''}>${Kit.esc(c.name)}</option>`).join('')}</select></div></div>
      <div class="kit-row"><div class="kit-field"><label for="ed">Date</label><input id="ed" type="date" required value="${dayKey(e.start)}"></div><div class="kit-field"><label for="eh">Time</label><input id="eh" type="time" value="${e.allDay ? '' : hhmm(e.start)}" aria-describedby="eh-hint"><small class="hint" id="eh-hint">Leave empty for all day</small></div><div class="kit-field"><label for="em">Length</label><select id="em">${opts(LENGTHS, String(e.minutes))}</select></div></div>
      <div class="kit-row"><div class="kit-field"><label for="eo">Who's going</label><select id="eo">${teamOpts(e.owner)}</select></div><div class="kit-field"><label for="el">Where</label><input id="el" value="${Kit.esc(e.location)}" placeholder="Zoom link, office, phone…"></div></div>
      <div class="kit-field"><label for="en">Notes</label><textarea id="en" placeholder="Agenda, what to prepare…">${Kit.esc(e.notes)}</textarea></div>`;
  }
  function readEvent(m, e) {
    const time = m.querySelector('#eh').value;
    return Object.assign(e, { title: m.querySelector('#et').value.trim(), type: m.querySelector('#ey').value, client: m.querySelector('#ec').value, start: new Date(`${m.querySelector('#ed').value}T${time || '00:00'}`).getTime() || e.start, allDay: !time, minutes: +m.querySelector('#em').value, owner: m.querySelector('#eo').value, location: m.querySelector('#el').value.trim(), notes: m.querySelector('#en').value.trim() });
  }
  function newEvent(k) {
    const start = k ? new Date(k + 'T10:00') : new Date(Math.ceil(Date.now() / 36e5) * 36e5);
    const e = { id: Kit.uid(), title: '', type: 'meeting', client: '', start: start.getTime(), allDay: false, minutes: 30, owner: S.team[0] ? S.team[0].id : '', location: '', notes: '' };
    Kit.modal({ title: 'New event', wide: true, body: eventForm(e), onOpen: (m) => m.querySelector('#et').focus(), actions: [{ label: 'Cancel' }, { label: 'Add event', primary: true, submit: true, onClick: (m) => {
      readEvent(m, e); S.events.push(e);
      log(`${EVT[e.type]} added: ${e.title}${e.client ? ` with ${client(e.client).name}` : ''}`);
      const d = new Date(e.start); calMonth.setFullYear(d.getFullYear(), d.getMonth(), 1);
      save(); renderAll(); Kit.toast(`${e.title} · ${Kit.day(e.start)}${e.allDay ? '' : ' ' + hhmm(e.start)}`, { type: 'success' });
    } }] });
  }
  function openEvent(id) {
    const e = S.events.find((x) => x.id === id); if (!e) return;
    Kit.modal({ title: e.title, wide: true, body: eventForm(e), actions: [
      { label: 'Delete', danger: true, onClick: () => { setTimeout(async () => { if (await Kit.confirm(`Delete "${e.title}"?`, 'The event is removed from the calendar.', 'Delete event')) { S.events = S.events.filter((x) => x !== e); save(); renderAll(); Kit.toast('Event deleted'); } }); } },
      ...(e.allDay ? [] : [{ label: 'Add to my calendar', onClick: () => { Kit.ics(`${e.title.replace(/[^\w]+/g, '-').toLowerCase()}.ics`, { title: e.title, start: new Date(e.start), minutes: e.minutes, location: e.location }); return false; } }]),
      { label: 'Cancel' },
      { label: 'Save event', primary: true, submit: true, onClick: (m) => { readEvent(m, e); save(); renderAll(); Kit.toast('Event saved', { type: 'success' }); } },
    ] });
  }

  /* ---------- Income & expenses ---------- */
  // Paid invoices are income automatically; everything else (cash jobs, costs) is recorded in S.ledger
  const EXP_CATS = ['Software & hosting', 'Freelancers & salaries', 'Advertising', 'Office & rent', 'Equipment', 'Taxes & fees', 'Other'];
  const INC_CATS = ['One-off project', 'Consulting', 'Cash or bank transfer', 'Other'];
  const PERIODS = { month: 'This month', last: 'Last month', quarter: 'Last 3 months', year: 'This year', all: 'All time' };
  let finPeriod = 'month', finFilter = 'all';
  $('f-period').innerHTML = opts(PERIODS, finPeriod);
  $('f-period').onchange = (e) => { finPeriod = e.target.value; renderFinance(); };
  function periodRange(p) {
    const m = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n, 1); d.setHours(0, 0, 0, 0); return d.getTime(); };
    return { month: [m(0), Infinity], last: [m(-1), m(0)], quarter: [m(-2), Infinity], year: [new Date(new Date().getFullYear(), 0, 1).getTime(), Infinity], all: [0, Infinity] }[p];
  }
  const entries = () => [
    ...S.invoices.filter((i) => i.paid).map((i) => ({ kind: 'in', ts: i.paid, item: `${i.no} · ${i.item}`, cat: 'Client payments', client: i.client, amount: i.amount, open: `inv:${i.id}` })),
    ...S.ledger.map((x) => ({ kind: x.kind, ts: x.date, item: x.item, cat: x.category, client: x.client, amount: x.amount, repeat: x.repeat, open: `led:${x.id}` })),
  ];
  const total = (list, kind) => list.filter((x) => x.kind === kind).reduce((a, x) => a + x.amount, 0);
  // Two bars per month: income (accent) and expenses (muted)
  function pairBars(el, rows) {
    const H = 45, max = Math.max(1, ...rows.flatMap((r) => [r.in, r.out])), w = 100 / rows.length, h = (v) => (v / max) * (H - 4);
    el.innerHTML = `<svg class="kit-chart pair" viewBox="0 0 100 ${H}" preserveAspectRatio="none" role="img" aria-label="Income and expenses for the last six months">
      ${rows.map((r, i) => `<rect class="in" x="${i * w + w * 0.14}" y="${H - h(r.in)}" width="${w * 0.34}" height="${h(r.in)}" rx="1"><title>${r.label} income: ${Kit.money(r.in)}</title></rect><rect class="out" x="${i * w + w * 0.52}" y="${H - h(r.out)}" width="${w * 0.34}" height="${h(r.out)}" rx="1"><title>${r.label} expenses: ${Kit.money(r.out)}</title></rect>`).join('')}
      </svg><div class="kit-axis">${rows.map((r) => `<span>${r.label}</span>`).join('')}</div><p class="legend"><span class="in">Income</span><span class="out">Expenses</span></p>`;
  }
  function renderFinance() {
    const [from, to] = periodRange(finPeriod), all = entries(), inP = all.filter((x) => x.ts >= from && x.ts < to);
    const inc = total(inP, 'in'), out = total(inP, 'out'), net = inc - out;
    $('f-sub').textContent = `${PERIODS[finPeriod]} · ${net >= 0 ? 'profit' : 'loss'} of ${Kit.money(Math.abs(net))}`;
    $('f-k-in').textContent = Kit.money(inc);
    const nIn = inP.filter((x) => x.kind === 'in').length, nOut = inP.filter((x) => x.kind === 'out').length;
    $('f-k-in-d').textContent = `${nIn} payment${nIn === 1 ? '' : 's'} received`;
    $('f-k-out').textContent = Kit.money(out);
    $('f-k-out-d').textContent = `${nOut} expense${nOut === 1 ? '' : 's'}`;
    $('f-k-net').textContent = (net < 0 ? '−' : '') + Kit.money(Math.abs(net));
    $('f-k-net-d').textContent = net >= 0 ? 'Income minus expenses' : 'Spending more than earning'; $('f-k-net-d').className = net < 0 ? 'bad' : net > 0 ? 'up' : '';
    $('f-k-margin').textContent = inc ? `${Math.round((net / inc) * 100)}%` : '—';
    $('f-k-margin-d').textContent = inc ? `Kept ${Kit.money(Math.max(0, net))} of every ${Kit.money(inc)}` : 'No income in this period';
    const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i, 1); d.setHours(0, 0, 0, 0); return d; });
    pairBars($('f-chart'), months.map((d, i) => { const end = months[i + 1] ? months[i + 1].getTime() : Infinity, list = all.filter((x) => x.ts >= d.getTime() && x.ts < end); return { label: d.toLocaleDateString('en-GB', { month: 'short' }), in: total(list, 'in'), out: total(list, 'out') }; }));
    const cats = {}; inP.filter((x) => x.kind === 'out').forEach((x) => { cats[x.cat] = (cats[x.cat] || 0) + x.amount; });
    $('f-cat-h').textContent = `Expenses by category · ${PERIODS[finPeriod].toLowerCase()}`;
    barList($('f-cat'), Object.entries(cats).sort((a, b) => b[1] - a[1]), Kit.money);
    const labels = { all: 'All', in: 'Income', out: 'Expenses' };
    $('f-filter').innerHTML = Object.entries(labels).map(([k, v]) => `<button type="button" data-fin="${k}" aria-pressed="${k === finFilter}">${v}<small>${k === 'all' ? inP.length : inP.filter((x) => x.kind === k).length}</small></button>`).join('');
    const rows = inP.filter((x) => (finFilter === 'all' || x.kind === finFilter) && hit(x.item, x.cat, x.client && client(x.client).name)).sort((a, b) => b.ts - a.ts);
    $('f-rows').innerHTML = rows.map((x) => `<tr class="click" data-open="${x.open}" tabindex="0"><td>${Kit.day(x.ts)}</td><td><b>${Kit.esc(x.item)}</b>${x.repeat ? '<small>Repeats monthly</small>' : ''}</td><td>${Kit.esc(x.cat)}</td><td>${x.client ? Kit.esc(client(x.client).name) : '—'}</td><td class="num amt ${x.kind}">${x.kind === 'in' ? '+' : '−'}${Kit.money(x.amount)}</td></tr>`).join('')
      || `<tr><td colspan="5" class="adm-empty">${q() ? 'Nothing matches your search.' : `No income or expenses recorded for ${PERIODS[finPeriod].toLowerCase()}.`} <button type="button" class="adm-link" data-new-entry="out">Add an expense</button></td></tr>`;
  }
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-fin]'); if (f) { finFilter = f.dataset.fin; renderFinance(); return; }
    const n = e.target.closest('[data-new-entry]'); if (n) newEntry(n.dataset.newEntry);
  });
  const newEntry = (kind) => entryModal({ id: Kit.uid(), kind, item: '', category: '', amount: '', date: Date.now(), repeat: false, client: '' }, true);
  const openEntry = (id) => { const x = S.ledger.find((y) => y.id === id); if (x) entryModal(x, false); };
  function entryModal(x, isNew) {
    const income = x.kind === 'in', cats = income ? INC_CATS : EXP_CATS, verb = income ? 'Record income' : 'Add expense';
    Kit.modal({ title: isNew ? verb : x.item, body: `
      <div class="kit-field"><label for="xi">Description</label><input id="xi" required value="${Kit.esc(x.item)}" placeholder="${income ? 'e.g. Logo design paid in cash' : 'e.g. Figma subscription'}" autocomplete="off"></div>
      <div class="kit-row"><div class="kit-field"><label for="xa">Amount (USD)</label><input id="xa" type="number" min="0.01" step="0.01" required value="${x.amount}"></div><div class="kit-field"><label for="xd">Date</label><input id="xd" type="date" required value="${dayKey(x.date)}"></div></div>
      <div class="kit-row"><div class="kit-field"><label for="xc">Category</label><select id="xc">${cats.map((c) => `<option${c === x.category ? ' selected' : ''}>${Kit.esc(c)}</option>`).join('')}</select></div><div class="kit-field"><label for="xl">Client</label><select id="xl"><option value="">No client</option>${S.clients.map((c) => `<option value="${c.id}"${c.id === x.client ? ' selected' : ''}>${Kit.esc(c.name)}</option>`).join('')}</select></div></div>
      ${income ? '' : `<label class="kit-check"><input type="checkbox" id="xr"${x.repeat ? ' checked' : ''}> Repeats every month</label>`}`,
    onOpen: (m) => isNew && m.querySelector('#xi').focus(),
    actions: [
      ...(isNew ? [] : [{ label: 'Delete', danger: true, onClick: () => { setTimeout(async () => { if (await Kit.confirm(`Delete "${x.item}"?`, `This ${income ? 'income' : 'expense'} entry is removed from your books.`, 'Delete entry')) { S.ledger = S.ledger.filter((y) => y !== x); save(); renderAll(); Kit.toast('Entry deleted'); } }); } }]),
      { label: 'Cancel' },
      { label: isNew ? verb : 'Save entry', primary: true, submit: true, onClick: (m) => {
        Object.assign(x, { item: m.querySelector('#xi').value.trim(), amount: Math.round(+m.querySelector('#xa').value * 100) / 100, date: new Date(m.querySelector('#xd').value + 'T12:00').getTime() || Date.now(), category: m.querySelector('#xc').value, client: m.querySelector('#xl').value, repeat: !income && m.querySelector('#xr').checked });
        if (isNew) { S.ledger.push(x); log(`${income ? 'Income' : 'Expense'}: ${x.item} · ${Kit.money(x.amount)}`); }
        save(); renderAll(); Kit.toast(isNew ? `${income ? 'Income recorded' : 'Expense added'} · ${Kit.money(x.amount)}` : 'Entry saved', { type: 'success' });
      } },
    ] });
  }
  // Copy each repeating expense into this month, once
  async function addRecurring() {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const month = start.toLocaleDateString('en-GB', { month: 'long' }), latest = {};
    S.ledger.filter((x) => x.kind === 'out' && x.repeat).forEach((x) => { const k = x.item + '|' + x.category; if (!latest[k] || x.date > latest[k].date) latest[k] = x; });
    const todo = Object.values(latest).filter((x) => x.date < start.getTime());
    if (!Object.keys(latest).length) { Kit.toast('No repeating expenses yet. Tick "Repeats every month" when you add one.', { ms: 5000 }); return; }
    if (!todo.length) { Kit.toast(`Every repeating expense is already in ${month}`); return; }
    if (!await Kit.confirm(`Add ${todo.length} expense${todo.length === 1 ? '' : 's'} for ${month}?`, `${todo.map((x) => x.item).join(', ')} · ${Kit.money(todo.reduce((a, x) => a + x.amount, 0))} in total.`, 'Add expenses', false)) return;
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    todo.forEach((x) => { const d = new Date(start); d.setDate(Math.min(new Date(x.date).getDate(), last)); d.setHours(12); S.ledger.push({ ...x, id: Kit.uid(), date: d.getTime() }); });
    log(`${todo.length} monthly expenses added for ${month}`); save(); finPeriod = 'month'; $('f-period').value = 'month'; renderAll();
  }
  $('f-in').onclick = () => newEntry('in'); $('f-out').onclick = () => newEntry('out'); $('f-rec').onclick = addRecurring;
  $('f-export').onclick = () => { const [from, to] = periodRange(finPeriod); Kit.csv(`apexhub-income-expenses-${finPeriod}.csv`, [['Date', 'Type', 'Description', 'Category', 'Client', 'Amount'], ...entries().filter((x) => x.ts >= from && x.ts < to).sort((a, b) => a.ts - b.ts).map((x) => [Kit.iso(new Date(x.ts)), x.kind === 'in' ? 'Income' : 'Expense', x.item, x.cat, x.client ? client(x.client).name : '', x.kind === 'in' ? x.amount : -x.amount])]); };

  /* ---------- Template demand ---------- */
  function renderTemplates() {
    const rows = TEMPLATES.map(([type, file, name, , , industry]) => { const ls = S.leads.filter((l) => l.source === 'Template: ' + name); return { type, file, name, industry, n: ls.length, last: Math.max(0, ...ls.map((l) => l.ts)), won: ls.filter((l) => l.status === 'won').length }; });
    barList($('t-top'), rows.filter((r) => r.n).sort((a, b) => b.n - a.n).slice(0, 6).map((r) => [r.name, r.n]));
    const kinds = {}; rows.forEach((r) => { kinds[KIND[r.type]] = (kinds[KIND[r.type]] || 0) + r.n; });
    barList($('t-kind'), Object.entries(kinds).sort((a, b) => b[1] - a[1]));
    $('t-rows').innerHTML = rows.filter((r) => hit(r.name, r.industry, KIND[r.type])).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((r) => `<tr><td><b>${Kit.esc(r.name)}</b></td><td>${KIND[r.type]}</td><td>${Kit.esc(r.industry)}</td><td class="num">${r.n || '—'}${r.won ? ` <span class="adm-pill ok">${r.won} won</span>` : ''}</td><td>${r.last ? Kit.ago(r.last) : '—'}</td>
      <td>${SIDES[r.file] ? `<a class="adm-link" href="templates/${r.file}.html" target="_blank" rel="noopener">${Kit.esc(SIDES[r.file][0])}</a> · <a class="adm-link" href="templates/${r.file}-admin.html" target="_blank" rel="noopener">${Kit.esc(SIDES[r.file][1])}</a>` : `<a class="adm-link" href="templates/${r.file}.html" target="_blank" rel="noopener">Open ↗</a>`}</td></tr>`).join('');
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    $('s-prices').innerHTML = Object.entries(PLANS).map(([k, v]) => `<label>${v}<input class="adm-field" type="number" min="1" step="1" data-price="${k}" value="${S.prices[k]}" aria-label="${v} monthly price in USD"></label>`).join('');
    $('s-team').innerHTML = S.team.map((t) => { const open = S.leads.filter((l) => l.owner === t.id && !['won', 'lost'].includes(l.status)).length, proj = S.projects.filter((p) => p.owner === t.id && p.stage !== 'live').length; return `<li><span class="av">${initials(t.name)}</span><div>${Kit.esc(t.name)}<small>${Kit.esc(t.role)}</small></div><span class="num">${open} leads · ${proj} projects</span></li>`; }).join('');
    const sw = [['autoAssign', 'Auto-assign website leads', 'Share new enquiries in turn between Maya, Omar and Lina.'], ['toastLeads', 'Notify on new enquiries', 'Ring the bell and show a toast when the contact form is sent.'], ['overdueAlerts', 'Overdue invoice badge', 'Show the overdue count next to Invoices in the sidebar.']];
    $('s-switches').innerHTML = sw.map(([k, t, d]) => `<div><label for="sw-${k}"><b>${t}</b><small>${d}</small></label><input class="adm-switch" type="checkbox" id="sw-${k}" data-set="${k}"${S.settings[k] ? ' checked' : ''}></div>`).join('');
    if (!S.settings.overdueAlerts) $('n-inv').hidden = true;
  }
  document.addEventListener('change', (e) => {
    const p = e.target.closest('[data-price]');
    if (p) { const v = Math.round(+p.value); if (v > 0) { S.prices[p.dataset.price] = v; log(`${PLANS[p.dataset.price]} price set to ${Kit.money(v)}/mo`); save(); renderAll(); Kit.toast(`${PLANS[p.dataset.price]} plan now ${Kit.money(v)}/mo · MRR ${Kit.money(mrr())}`); } else p.value = S.prices[p.dataset.price]; }
    const s = e.target.closest('[data-set]'); if (s) { S.settings[s.dataset.set] = s.checked; save(); renderAll(); }
  });

  /* ---------- Wiring ---------- */
  function renderAll() { fill(); renderOverview(); renderLeads(); renderProjects(); renderCalendar(); renderClients(); renderInvoices(); renderFinance(); renderTemplates(); renderSettings(); }
  const router = Kit.router('overview', () => window.scrollTo(0, 0));
  $('q').addEventListener('input', () => { renderLeads(); renderProjects(); renderCalendar(); renderClients(); renderInvoices(); renderFinance(); renderTemplates(); });
  $('q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; e.target.dispatchEvent(new Event('input')); e.target.blur(); } });
  $('o-new').onclick = newLead; $('l-new').onclick = newLead; $('p-new').onclick = newProject; $('c-new').onclick = () => openClient(null); $('i-new').onclick = newInvoice; $('i-run').onclick = billMonth;
  // Replace everything: on the server for every signed-in browser, or in this browser's storage when static
  const replaceAll = (next) => { if (online) return db.reset(next); try { localStorage.setItem('apexhub:agency', JSON.stringify(next)); } catch (e) { /* storage blocked */ } location.hash = ''; location.reload(); };
  const clearAll = async () => { if (await Kit.confirm('Clear all data?', 'Every lead, client, project, invoice, calendar event, income and expense entry is deleted. Team, prices and settings go back to their defaults.', 'Clear all data')) replaceAll(blank()); };
  const loadSample = async () => { if (await Kit.confirm('Load sample data?', 'Everything on the dashboard is replaced with the sample leads, clients, projects and invoices.', 'Load sample data')) replaceAll(seed()); };
  $('reset').onclick = clearAll;
  $('l-export').onclick = () => Kit.csv('apexhub-leads.csv', [['Name', 'Email', 'Service', 'Source', 'Stage', 'Value', 'Owner', 'Received', 'Message'], ...S.leads.map((l) => [l.name, l.email, l.service, l.source, STAGES[l.status], l.value, person(l.owner).name, new Date(l.ts).toISOString(), l.message])]);
  $('c-export').onclick = () => Kit.csv('apexhub-clients.csv', [['Client', 'Contact', 'Email', 'Plan', 'Billing', 'MRR', 'Since', 'Status'], ...S.clients.map((c) => [c.name, c.contact, c.email, PLANS[c.plan], c.billing, c.status === 'active' ? monthly(S, c) : 0, Kit.iso(new Date(c.since)), c.status])]);
  $('i-export').onclick = () => Kit.csv('apexhub-invoices.csv', [['Invoice', 'Client', 'For', 'Amount', 'Issued', 'Due', 'Paid'], ...S.invoices.map((i) => [i.no, client(i.client).name, i.item, i.amount, Kit.iso(new Date(i.issued)), Kit.iso(new Date(i.due)), i.paid ? Kit.iso(new Date(i.paid)) : ''])]);
  Kit.key('/', () => $('q').focus(), 'Search');
  Kit.key('n', newLead, 'New lead');
  const views = [['1', 'overview', 'Overview'], ['2', 'leads', 'Leads'], ['3', 'projects', 'Projects'], ['4', 'calendar', 'Calendar'], ['5', 'clients', 'Clients & plans'], ['6', 'invoices', 'Invoices'], ['7', 'finance', 'Income & expenses'], ['8', 'templates', 'Templates'], ['9', 'settings', 'Settings']];
  views.forEach(([k, v, l]) => Kit.key(k, () => router.go(v), `Go to ${l}`));
  Kit.commands([...views.map(([k, v, l]) => ({ label: `Go to ${l}`, hint: k, run: () => router.go(v) })),
    { label: 'New lead', hint: 'N', run: newLead }, { label: 'New project', run: newProject }, { label: 'Add client', run: () => openClient(null) }, { label: 'New invoice', run: newInvoice }, { label: 'Bill this month', run: billMonth },
    { label: 'New event (meeting, plan or deadline)', run: () => newEvent() }, { label: 'Add expense', run: () => newEntry('out') }, { label: 'Record income', run: () => newEntry('in') }, { label: 'Add monthly expenses', run: addRecurring },
    { label: 'Open the website', run: () => window.open('index.html', '_blank') }, { label: 'Clear all data', run: clearAll }, { label: 'Load sample data', run: loadSample }]);
  setInterval(renderOverview, 60000); // keep "x min ago" fresh
  renderAll();
  pullInbox();
})();
