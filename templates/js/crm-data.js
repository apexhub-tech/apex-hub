/* LeadFlow — shared data for the public website (crm.html) and the sales CRM (crm-admin.html).
   Both pages read and write the same saved store, so a website enquiry lands in the pipeline instantly. */
const STAGES = [['lead', 'New lead', '#9AA1B5', .1], ['contact', 'Contacted', '#4C8DFF', .3], ['proposal', 'Proposal sent', '#F2B13C', .6], ['nego', 'Negotiation', '#B07CFF', .8], ['won', 'Won', '#2FBF71', 1]];
const OWNERS = [['Adam', '#4C8DFF'], ['Sara', '#E0587C'], ['Omar', '#2FBF71']];
const TYPES = { call: '📞', email: '✉️', meeting: '📅', note: '📝' };
const LOST = ['Price too high', 'Went with a competitor', 'No budget right now', 'No response'];
const SERVICES = [['Website', 'Website design & build', 3500], ['Store', 'Online store', 6500], ['Social', 'Social media management', 1200], ['Brand', 'Brand identity', 2500], ['Video', 'Video & content', 1800], ['Software', 'Custom software / SaaS', 9000]];
const DAY = 864e5;
function seed() {
  const now = Date.now();
  const contacts = [['Lina Haddad', 'Bloom Café', 'Restaurant'], ['Karim Aziz', 'Urban Gym', 'Fitness'], ['Dr. Sara Nasser', 'Smile Dental', 'Health'], ['Omar Farouk', 'Nova Realty', 'Real estate'], ['Maya Khoury', 'Luna Boutique', 'Retail'],
    ['Jad Saleh', 'FreshMart', 'Retail'], ['Rana Issa', 'Bean There', 'Restaurant'], ['Tarek Mansour', 'Peak Motors', 'Automotive'], ['Hala Youssef', 'Serenity Spa', 'Health'], ['Nadim Rizk', 'Keystone Homes', 'Real estate']]
    .map(([name, company, tag], i) => ({ id: 'c' + i, name, company, email: name.split(' ').pop().toLowerCase().replace('.', '') + '@' + company.toLowerCase().replace(/\s/g, '') + '.com', phone: '+00 555 01' + String(10 + i), tags: [tag] }));
  const d = (title, ci, value, stage, owner, closeIn, ageDays, acts, extra = {}) => ({ id: Kit.uid(), title, contact: 'c' + ci, value, stage, owner, close: Kit.iso(new Date(now + closeIn * DAY)), created: now - ageDays * DAY,
    acts: acts.map(([type, text, dueIn, done]) => ({ id: Kit.uid(), type, text, due: now + dueIn * DAY, done: !!done, ts: now - Math.abs(dueIn) * DAY })), ...extra });
  const deals = [
    d('Website redesign', 0, 4200, 'lead', 'Adam', 20, 3, [['call', 'Intro call with Lina', 1]]),
    d('Social media plan', 1, 1800, 'lead', 'Sara', 25, 9, [['email', 'Send case studies', -2]]),
    d('Booking system', 2, 6500, 'contact', 'Omar', 14, 12, [['meeting', 'Demo of booking template', 0], ['note', 'Wants WhatsApp reminders', -4, 1]]),
    d('Brand identity', 3, 3000, 'contact', 'Adam', 18, 15, [['call', 'Follow up on brief', -1]]),
    d('E-commerce store', 4, 9800, 'proposal', 'Sara', 7, 21, [['email', 'Send revised proposal', 2], ['meeting', 'Kick-off workshop', -6, 1]]),
    d('Promo video series', 5, 2700, 'proposal', 'Omar', 10, 26, []),
    d('Spa website + ads', 8, 5400, 'nego', 'Sara', 4, 30, [['call', 'Agree on final price', 1]]),
    d('Listings portal', 9, 12500, 'nego', 'Adam', 9, 34, [['meeting', 'Contract review', 3]]),
    d('POS rollout', 6, 12400, 'won', 'Omar', -3, 40, [['note', 'Signed for 3 branches', -3, 1]], { closedAt: now - 3 * DAY }),
    d('Ads campaign', 7, 15000, 'won', 'Adam', -9, 50, [], { closedAt: now - 9 * DAY }),
    d('Menu photography', 0, 1200, 'lost', 'Sara', -12, 30, [], { closedAt: now - 12 * DAY, lostReason: 'Price too high' }),
    d('Gym app', 1, 7800, 'lost', 'Omar', -20, 45, [], { closedAt: now - 20 * DAY, lostReason: 'Went with a competitor' }),
  ];
  // Historical wins for the 6-month chart
  const hist = [8200, 14100, 11600, 19800, 16400].map((v, i) => ({ month: 5 - i, value: v }));
  return { contacts, deals, hist, notes: [] };
}
const db = Kit.store('crm', seed), S = db.data, save = () => db.save();
S.notes = S.notes || [];
const contact = (id) => S.contacts.find((c) => c.id === id);
const deal = (id) => S.deals.find((x) => x.id === id);
const stageOf = (id) => STAGES.find((s) => s[0] === id);
const ownerColor = (o) => (OWNERS.find((x) => x[0] === o) || [, '#666'])[1];
const av = (o) => `<span class="av" style="background:${ownerColor(o)}" title="${o}">${o[0]}</span>`;
const k = (n) => '$' + (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : n);
const nextAct = (dl) => dl.acts.filter((a) => !a.done && a.type !== 'note').sort((a, b) => a.due - b.due)[0];
const dueBadge = (a) => {
  if (!a) return '<span class="due late">No next step</span>';
  const days = Math.floor((new Date(a.due).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
  return `<span class="due ${days < 0 ? 'late' : days === 0 ? 'today' : ''}">${TYPES[a.type]} ${days < 0 ? `${-days}d overdue` : days === 0 ? 'Today' : `In ${days}d`}</span>`;
};
// A proposal is built from the deal value unless the sales team wrote one
const proposalOf = (d) => d.proposal || { items: [[d.title, Math.round(d.value * .8)], ['Project management, training & 30 days support', d.value - Math.round(d.value * .8)]], valid: d.close };
// Discovery-call slots: weekdays 10:00–16:00 on the hour, next 7 days, minus booked meetings
const callSlots = () => { const taken = new Set(S.deals.flatMap((d) => d.acts).filter((a) => a.type === 'meeting' && !a.done).map((a) => a.due)); const out = []; for (let i = 1; i <= 7; i++) { const dt = Kit.addDays(new Date(), i); if ([0, 6].includes(dt.getDay())) continue; for (let h = 10; h <= 16; h += 2) { const t = new Date(dt); t.setHours(h, 0, 0, 0); if (!taken.has(t.getTime())) out.push(t.getTime()); } } return out; };
