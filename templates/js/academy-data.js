/* Brightpath — shared data for the learner app (academy.html) and the instructor studio (academy-admin.html).
   Both pages read and write the same saved store: courses published in the studio appear for learners, and learner questions reach the instructor live. */
const U = (id, w = 600, h = 375) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const CAT = { Marketing: ['#E7E0FF', '#5B3FE0'], Design: ['#FFE3EE', '#C2185B'], Business: ['#DDF6EE', '#13866A'], Video: ['#FFF1D1', '#9A6B00'] };
const IMGS = ['1758873268364-15bef4162221', '1487017159836-4e23ece2e4cf', '1762784574847-16c5100cd1ff', '1758691736843-90f58dce465e'];
const L = (title, mins, type, body, quiz) => ({ title, mins, type, body, quiz });
const SEED_COURSES = [
  { id: 'c1', title: 'Social media for small business', cat: 'Marketing', level: 'Beginner', img: IMGS[0], lessons: [
    L('Why social media matters', 6, 'video', 'Most customers check a business on Instagram or Google before they visit. In this lesson you\'ll see how three local shops doubled their walk-ins.'),
    L('Choosing the right platforms', 8, 'reading', '<p>You don\'t need to be everywhere. Pick the 2 platforms where your customers already spend time:</p><ul><li><b>Instagram</b> — food, fashion, beauty, fitness</li><li><b>Facebook</b> — local services, events, older audiences</li><li><b>LinkedIn</b> — B2B, professional services</li><li><b>TikTok</b> — young audiences, entertaining brands</li></ul>'),
    L('Writing captions that sell', 12, 'video', 'Hook in the first line, one clear message, and a call to action. We rewrite 5 real captions together.'),
    L('Planning a content calendar', 18, 'reading', '<p>Plan a month at a time using the 4-1-1 rule: four helpful posts, one promotional post and one personal post.</p><p>Batch your photos in one afternoon to save hours every week.</p>'),
    L('Reels: hooks in 3 seconds', 9, 'video', 'Movement, a bold text overlay and a question in the first three seconds keep people watching.'),
    L('Quiz: Module 1', 5, 'quiz', '', [
      { q: 'How many platforms should a small business start with?', o: ['All of them', '1–2 where customers already are', 'Only TikTok'], a: 1 },
      { q: 'In the 4-1-1 rule, how many posts are promotional?', o: ['Four', 'One', 'None'], a: 1 },
      { q: 'Where should the hook in a caption go?', o: ['The first line', 'The hashtags', 'The last line'], a: 0 }]) ] },
  { id: 'c2', title: 'Canva & graphic basics', cat: 'Design', level: 'Beginner', img: IMGS[1], lessons: [
    L('Tour of Canva', 7, 'video', 'Set up a brand kit with your logo, colours and fonts so every design stays on-brand.'),
    L('Layout & hierarchy', 10, 'reading', '<p>Make one thing biggest. Use alignment and spacing to group related items, and keep text to two fonts at most.</p>'),
    L('Designing a promo post', 14, 'video', 'Build a sale announcement from scratch with a clear headline, offer and button.'),
    L('Quiz: Design basics', 4, 'quiz', '', [
      { q: 'How many fonts should one design usually use?', o: ['Up to 2', '5 or more', 'As many as possible'], a: 0 },
      { q: 'What does a brand kit store?', o: ['Passwords', 'Logo, colours and fonts', 'Customer emails'], a: 1 }]) ] },
  { id: 'c3', title: 'Pricing your services', cat: 'Business', level: 'Intermediate', img: IMGS[2], lessons: [
    L('Cost-plus vs value pricing', 11, 'video', 'When to charge for your time and when to charge for the result you create.'),
    L('Building three packages', 9, 'reading', '<p>Offer Budget, Premium and Diamond packages. Most customers pick the middle one, so make it your best value.</p>'),
    L('Quiz: Pricing', 4, 'quiz', '', [{ q: 'Which package do most customers choose?', o: ['The cheapest', 'The middle one', 'The most expensive'], a: 1 }]) ] },
  { id: 'c4', title: 'Editing reels on your phone', cat: 'Video', level: 'Beginner', img: IMGS[3], lessons: [
    L('Shooting vertical video', 6, 'video', 'Lighting, framing and sound with just a phone.'),
    L('Cutting to the beat', 8, 'video', 'Use beat markers so every cut lands on the music.'),
    L('Captions & covers', 7, 'reading', '<p>80% of people watch without sound. Always add captions and design a cover that matches your grid.</p>') ] },
  { id: 'c5', title: 'Google Business Profile', cat: 'Marketing', level: 'Beginner', img: IMGS[0], lessons: [
    L('Claiming your profile', 5, 'video', 'Verify your business and fill in every field.'), L('Getting more reviews', 9, 'reading', '<p>Ask at the right moment, make it one tap with a QR code and always reply to reviews.</p>') ] },
  { id: 'c6', title: 'Email marketing that converts', cat: 'Marketing', level: 'Intermediate', img: IMGS[1], lessons: [
    L('Building your list', 8, 'video', 'Turn website visitors and walk-ins into subscribers.'), L('Writing a welcome series', 12, 'reading', '<p>Send three emails over the first week: welcome, your story, and a first-purchase offer.</p>') ] },
].map((c) => ({ ...c, published: true, lessons: c.lessons.map((l, i) => ({ ...l, id: c.id + 'l' + i })) }));

function seed() {
  const today = Kit.iso(new Date()), log = {};
  let r = 5; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let d = 1; d < 35; d++) if (rnd() < .55 || d < 12) log[Kit.iso(Kit.addDays(new Date(), -d))] = 1 + Math.floor(rnd() * 3);
  // Other learners (the instructor sees them; the learner app is signed in as Nour)
  const names = ['Rami Aziz', 'Maya Khoury', 'Jad Saleh', 'Lara Nassar', 'Tarek Issa', 'Hala Youssef', 'Fadi Rizk', 'Dana Karam', 'Ziad Haddad', 'Mira Saab', 'Elie Haddad', 'Sara Mansour', 'Omar Farouk', 'Yara Kassem'];
  const students = names.map((name, i) => {
    const prog = {}; SEED_COURSES.forEach((c) => { if (rnd() < .45) prog[c.id] = Math.min(c.lessons.length, Math.floor(rnd() * (c.lessons.length + 2))); });
    return { id: 's' + i, name, email: name.split(' ')[0].toLowerCase() + '@example.com', joined: Date.now() - Math.floor(rnd() * 120) * 864e5, active: Date.now() - Math.floor(rnd() * 20) * 864e5, prog };
  });
  const questions = [{ id: Kit.uid(), course: 'c1', lesson: 'c1l2', by: 'Maya Khoury', text: 'Should hashtags go in the caption or the first comment?', ts: Date.now() - 26 * 36e5, answer: '' },
    { id: Kit.uid(), course: 'c2', lesson: 'c2l1', by: 'Jad Saleh', text: 'Is it OK to use a third font just for numbers?', ts: Date.now() - 50 * 36e5, answer: 'Keep it to two — use a bold weight of your body font for numbers instead.', answeredAt: Date.now() - 40 * 36e5 }];
  return { courses: SEED_COURSES, enrolled: { c1: { done: ['c1l0', 'c1l1', 'c1l2'], notes: { c1l2: 'Hook → message → call to action.' }, scores: {}, last: 'c1l3' }, c2: { done: ['c2l0'], notes: {}, scores: {}, last: 'c2l1' }, c3: { done: [], notes: {}, scores: {}, last: 'c3l0' } },
    xp: 1240, log, goal: 5, current: 'c1', lastDay: today, students, questions, announcements: [{ id: Kit.uid(), text: 'New course coming soon: “Running Meta ads on a small budget”. Enroll early for a 20% discount!', ts: Date.now() - 3 * 864e5 }], notes: [] };
}
const db = Kit.store('brightpath', seed), S = db.data, save = () => db.save();
// Older saved demos may miss newer fields
S.courses = S.courses || SEED_COURSES; S.students = S.students || seed().students; S.questions = S.questions || []; S.announcements = S.announcements || []; S.notes = S.notes || [];
const LEARNER = { name: 'Nour Kassem', email: 'nour@example.com' };
const course = (id) => S.courses.find((c) => c.id === id);
const pct = (cid) => { const e = S.enrolled[cid], c = course(cid); return e && c ? Math.round(e.done.filter((d) => c.lessons.some((l) => l.id === d)).length / c.lessons.length * 100) : 0; };
const streak = () => { let n = 0; for (let d = 0; d < 365; d++) { const k = Kit.iso(Kit.addDays(new Date(), -d)); if (S.log[k]) n++; else if (d > 0) break; } return n; };
const weekDone = () => { let n = 0; for (let d = 0; d < 7; d++) n += S.log[Kit.iso(Kit.addDays(new Date(), -d))] || 0; return n; };
const chip = (c) => `<span class="chip" style="background:${(CAT[c] || CAT.Marketing)[0]};color:${(CAT[c] || CAT.Marketing)[1]}">${c}</span>`;
const mins = (c) => c.lessons.reduce((a, l) => a + l.mins, 0);
