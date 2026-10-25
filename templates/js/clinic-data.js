/* CarePoint — shared data for the patient site (clinic.html) and the staff panel (clinic-admin.html).
   Both pages read and write the same saved store, so a booking made by a patient appears instantly for staff. */
const U = (id, w = 300, h = 300) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const DOCTORS = [
  { id: 'd1', name: 'Dr. Sara Haddad', spec: 'General practice', img: '1594824476967-48c8b964273f', yrs: 12 },
  { id: 'd2', name: 'Dr. Omar Nasser', spec: 'Dentistry', img: '1612349317150-e413f6a5b16d', yrs: 9 },
  { id: 'd3', name: 'Dr. Lina Farouk', spec: 'Dermatology', img: '1659353888906-adb3e0041693', yrs: 15 },
  { id: 'd4', name: 'Dr. Karim Mansour', spec: 'Pediatrics', img: '1622253692010-333f2da6031d', yrs: 8 },
];
const SERVICES = [
  { id: 's1', name: 'General consultation', spec: 'General practice', mins: 30, price: 45 }, { id: 's2', name: 'Annual check-up', spec: 'General practice', mins: 30, price: 80 },
  { id: 's3', name: 'Dental cleaning', spec: 'Dentistry', mins: 30, price: 60 }, { id: 's4', name: 'Skin check', spec: 'Dermatology', mins: 30, price: 70 },
  { id: 's5', name: 'Child wellness visit', spec: 'Pediatrics', mins: 30, price: 50 },
];
const DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = []; for (let h = 9; h < 17; h++) { HOURS.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`); }
const STATUS = { booked: ['Booked', 'a-booked'], checked: ['Checked in', 'a-checked'], done: ['Completed', 'a-done'], noshow: ['No-show', 'a-noshow'], cancelled: ['Cancelled', 'a-cancelled'] };
const service = (id) => SERVICES.find((s) => s.id === id), doctor = (id) => DOCTORS.find((d) => d.id === id);
const refCode = () => 'CP-' + Math.random().toString(36).slice(2, 6).toUpperCase();
const niceDate = (iso) => new Date(iso + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function seed() {
  const names = ['Rami Aziz', 'Maya Khoury', 'Jad Saleh', 'Lara Nassar', 'Nour Kassem', 'Tarek Issa', 'Hala Youssef', 'Fadi Rizk', 'Dana Karam', 'Ziad Haddad', 'Mira Saab', 'Elie Haddad'];
  const phones = names.map((_, i) => '+00 555 01' + (20 + i));
  const days = { d1: [1, 2, 3, 4], d2: [0, 1, 2, 3], d3: [2, 3, 4, 5, 6], d4: [0, 1, 2, 3, 4, 5, 6] };
  let r = 3; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const appts = [];
  for (let day = -21; day < 7; day++) {
    const date = Kit.iso(Kit.addDays(new Date(), day)), dow = Kit.addDays(new Date(), day).getDay();
    DOCTORS.filter((d) => days[d.id].includes(dow)).forEach((d) => {
      HOURS.forEach((t) => { if (rnd() < (day === 0 ? .45 : day < 0 ? .25 : .3)) {
        const sv = SERVICES.filter((s) => s.spec === d.spec), p = Math.floor(rnd() * names.length);
        appts.push({ id: Kit.uid(), ref: refCode(), doctor: d.id, service: sv[Math.floor(rnd() * sv.length)].id, date, time: t, status: day < 0 ? (rnd() < .08 ? 'noshow' : 'done') : 'booked', patient: { name: names[p], phone: phones[p], email: '' }, created: Date.now() + day * 864e5, source: rnd() < .6 ? 'online' : 'phone' });
      } });
    });
  }
  const nowT = new Date().toTimeString().slice(0, 5);
  appts.filter((a) => a.date === Kit.iso(new Date())).forEach((a, i) => { if (a.time < nowT) a.status = i % 7 === 3 ? 'noshow' : 'done'; });
  return { appts, days, away: [], notes: [], settings: { name: 'CarePoint Clinic', minNotice: 2, cancelHours: 24, reminders: true, onlineBooking: true } };
}
const db = Kit.store('carepoint', seed), S = db.data, save = () => db.save();
// Older saved demos may miss newer fields
S.days = S.days || seed().days; S.away = S.away || []; S.notes = S.notes || [];
S.settings = Object.assign({ name: 'CarePoint Clinic', minNotice: 2, cancelHours: 24, reminders: true, onlineBooking: true }, S.settings || {});

const worksOn = (docId, date) => S.days[docId].includes(new Date(date + 'T12:00').getDay()) && !S.away.some((x) => x.doc === docId && x.date === date);
const taken = (docId, date, time) => S.appts.some((a) => a.doctor === docId && a.date === date && a.time === time && a.status !== 'cancelled');
const tooSoon = (date, time) => new Date(`${date}T${time}`) < new Date(Date.now() + S.settings.minNotice * 36e5);
const isPast = (date, time) => new Date(`${date}T${time}`) < new Date();
const freeSlots = (docId, date, staff) => worksOn(docId, date) ? HOURS.filter((t) => !taken(docId, date, t) && (staff ? !isPast(date, t) : !tooSoon(date, t))) : [];
const nextFree = (docId) => { for (let i = 0; i < 14; i++) { const date = Kit.iso(Kit.addDays(new Date(), i)), s = freeSlots(docId, date); if (s.length) return { date, time: s[0] }; } return null; };
