/* IronPulse — shared data for the member app (gym-app.html) and the staff panel (gym-app-admin.html).
   Both pages read and write the same saved store, so a class booked in the app shows up live at the front desk. */
const DAY = 864e5;
const PLANS = { student: ['Student', 19], basic: ['Basic', 29], pro: ['Pro', 49], elite: ['Elite', 99] };
const TIMETABLE = [[1, '06:30', 'HIIT Burn', 'Sami', 20], [1, '18:00', 'Boxing Basics', 'Tarek', 16], [2, '07:00', 'Power Lifting', 'Rana', 10], [2, '19:00', 'Yoga Flow', 'Hala', 18], [3, '06:30', 'HIIT Burn', 'Sami', 20], [3, '12:15', 'Spin Express', 'Ali', 20],
  [3, '18:30', 'Boxing Basics', 'Tarek', 16], [4, '07:00', 'Mobility', 'Hala', 14], [4, '19:00', 'Power Lifting', 'Rana', 10], [5, '06:30', 'HIIT Burn', 'Sami', 20], [5, '17:30', 'Spin Express', 'Ali', 20], [6, '10:00', 'Bootcamp', 'Sami', 24], [0, '10:00', 'Yoga Flow', 'Hala', 18]];
function seed() {
  const first = ['Rami', 'Maya', 'Jad', 'Lara', 'Nour', 'Tarek', 'Hala', 'Fadi', 'Dana', 'Ziad', 'Mira', 'Elie', 'Karim', 'Sara', 'Omar', 'Rana', 'Ali', 'Lina', 'Joe', 'Yara'], last = ['Aziz', 'Khoury', 'Saleh', 'Nassar', 'Kassem', 'Issa', 'Youssef', 'Rizk'];
  let r = 11; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const now = Date.now(), planKeys = Object.keys(PLANS);
  const members = Array.from({ length: 48 }, (_, i) => {
    const exp = now + Math.round((rnd() * 70 - 12)) * DAY, visits = [];
    const freq = rnd(); for (let dd = 0; dd < 21; dd++) if (rnd() < freq * .7) { const t = new Date(now - dd * DAY); t.setHours(6 + Math.floor(rnd() * 15), Math.floor(rnd() * 60)); if (t.getTime() < now) visits.push(t.getTime()); }
    return { id: Kit.uid(), code: 'IP-' + (1001 + i), name: `${first[i % 20]} ${last[Math.floor(rnd() * 8)]}`, phone: '+00 555 02' + String(10 + i), plan: planKeys[Math.floor(rnd() * 4)], frozen: rnd() < .06, expires: exp, joined: now - Math.floor(rnd() * 330) * DAY, visits: visits.sort() };
  });
  members[0].expires = now + 40 * DAY; members[0].frozen = false; members[1].expires = now - 5 * DAY; members[2].expires = now + 3 * DAY; members[2].frozen = false;
  const classes = TIMETABLE.map(([day, time, name, coach, cap]) => ({ id: Kit.uid(), day, time, name, coach, cap }));
  const bookings = {}, monday = Kit.addDays(new Date(), -((new Date().getDay() + 6) % 7));
  classes.forEach((c) => { const date = Kit.iso(Kit.addDays(monday, (c.day + 6) % 7)); const n = Math.floor(c.cap * (.4 + rnd() * .65)); bookings[c.id + '@' + date] = { in: members.slice(0).sort(() => rnd() - .5).slice(0, Math.min(n, c.cap)).map((m) => m.id), wait: [], attended: [] }; });
  return { members, classes, bookings, requests: [], notes: [] };
}
const db = Kit.store('ironpulse', seed), S = db.data, save = () => db.save();
S.requests = S.requests || []; S.notes = S.notes || [];
const mem = (id) => S.members.find((m) => m.id === id);
const status = (m) => m.frozen ? 'frozen' : m.expires < Date.now() ? 'expired' : m.expires < Date.now() + 7 * DAY ? 'soon' : 'active';
const STL = { active: 'Active', soon: 'Expires soon', frozen: 'Frozen', expired: 'Expired' };
const initials = (n) => n.split(' ').map((x) => x[0]).join('');
const weekStart = () => Kit.addDays(new Date(new Date().setHours(0, 0, 0, 0)), -((new Date().getDay() + 6) % 7));
const dateFor = (c) => Kit.iso(Kit.addDays(weekStart(), (c.day + 6) % 7));
// Bookings are per class per date, so members can book any of the next 7 days
const book = (c, date = dateFor(c)) => { const k = c.id + '@' + date; return S.bookings[k] || (S.bookings[k] = { in: [], wait: [], attended: [] }); };
const classStart = (c, date = dateFor(c)) => new Date(`${date}T${c.time}`).getTime();
const nextDays = (n = 7) => Array.from({ length: n }, (_, i) => Kit.addDays(new Date(today0()), i));
// Every class session in the next 7 days as { c, date }
const sessions = () => nextDays().flatMap((d) => S.classes.filter((c) => c.day === d.getDay()).map((c) => ({ c, date: Kit.iso(d) })));
const inGym = () => S.members.filter((m) => m.visits.some((v) => Date.now() - v < 90 * 6e4)).length;
const today0 = () => new Date().setHours(0, 0, 0, 0);
function renewBy(m, months) { const base = Math.max(Date.now(), m.expires); const d = new Date(base); d.setMonth(d.getMonth() + months); m.expires = d.getTime(); m.frozen = false; }
const RENEW = [[1, 'Month', 1], [3, '3 months', .95], [12, 'Year', .85]];
