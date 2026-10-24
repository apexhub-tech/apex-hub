/* Forge — behaviour */
const PLANS = [['basic', 'Basic', 29, 23, ['Gym floor access', 'Locker room', '1 intro session'], 0], ['pro', 'Pro', 49, 39, ['Everything in Basic', 'Unlimited classes', 'Monthly body scan'], 1], ['elite', 'Elite', 99, 79, ['Everything in Pro', '4 PT sessions / month', 'Nutrition plan'], 0]];
const products = PLANS.map(([id, name, m]) => ({ id, name: `${name} membership`, price: m, img: '1517836357463-d25dfeac3438', hidden: true })).concat([{ id: 'join', name: 'Joining fee (waived online)', price: 0, img: '1689877020200-403d8542d95d', hidden: true }]);
const G = Kit.store('forge', () => ({ bookings: [], waitlist: [], member: null, pending: null, trial: null }));
const S = G.data;
const Shop = ShopKit.init({ key: 'forge-shop', products, img: (p, w, h) => `https://images.unsplash.com/photo-${p.img}?auto=format&fit=crop&w=${w}&h=${h}&q=70`, labels: { cart: 'Membership', checkout: 'Start membership', orderVerb: 'Membership' },
  shipping: [{ id: 'club', label: 'Collect your key fob at reception', note: 'Forge Harbour St · open 24/7', price: 0, pickup: true }], deliveryLabel: 'Start', returns: 'Cancel any time after the first month',
  promos: { FORGE1: { pct: 100 } }, statuses: ['Active', 'Active', 'Active', 'Active'],
  onChange: (s) => { const paid = s.data.orders.filter((o) => o.items.some((i) => PLANS.some((p) => p[0] === i.id))); if (S.pending && paid.length) { S.member = { ...S.pending, no: 'FG-' + (40210 + paid.length), since: Date.now() }; S.pending = null; G.save(); renderAll(); setTimeout(() => Kit.toast(`Welcome to Forge! Member no. ${S.member.no} — you can now book unlimited classes.`, { type: 'success', ms: 7000 }), 300); } } });
const $ = (id) => document.getElementById(id);

/* ---------- Classes ---------- */
const TYPES = ['All', 'Strength', 'HIIT', 'Boxing', 'Mobility'];
const CLASSES = [['06:30', 'HIIT Burn', 'HIIT', 'Sami', 45, 20, 'All levels'], ['07:30', 'Power Lifting', 'Strength', 'Rana', 60, 10, 'Intermediate'], ['09:00', 'Mobility Flow', 'Mobility', 'Hala', 45, 18, 'Beginner'], ['12:15', 'Lunch Express HIIT', 'HIIT', 'Ali', 30, 20, 'All levels'], ['17:30', 'Boxing Basics', 'Boxing', 'Tarek', 60, 16, 'Beginner'], ['18:30', 'Barbell Club', 'Strength', 'Rana', 60, 10, 'Advanced'], ['19:30', 'Fight Conditioning', 'Boxing', 'Tarek', 45, 14, 'Intermediate']];
let day = 0, type = 'All';
const date = (d) => Kit.iso(Kit.addDays(new Date(), d));
const base = (d, i, cap) => Math.min(cap, Math.floor(((d * 7 + i * 5) % 11) / 10 * cap) + (i === 5 ? cap - 1 : 2));
const booked = (d, c) => base(d, CLASSES.indexOf(c), c[5]) + S.bookings.filter((b) => b.date === date(d) && b.time === c[0] && !b.cancelled).length;
function renderClasses() {
  $('days').innerHTML = Array.from({ length: 7 }, (_, i) => { const d = Kit.addDays(new Date(), i); return `<button aria-pressed="${i === day}" data-d="${i}">${i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}<b>${d.getDate()}</b></button>`; }).join('');
  $('types').innerHTML = TYPES.map((t) => `<button class="chip" aria-pressed="${t === type}" data-t="${t}">${t}</button>`).join('');
  const nowT = new Date().toTimeString().slice(0, 5);
  $('classlist').innerHTML = CLASSES.filter((c) => type === 'All' || c[2] === type).map((c) => {
    const n = booked(day, c), full = n >= c[5], past = day === 0 && c[0] <= nowT, mine = S.bookings.find((b) => b.date === date(day) && b.time === c[0] && !b.cancelled), wl = S.waitlist.find((w) => w.date === date(day) && w.time === c[0]);
    return `<div class="cls ${mine ? 'mine' : ''}"><time>${c[0]}<small>${c[4]} min</small></time><div><h3>${c[1]}<span class="level">${c[6]}</span></h3><p>Coach ${c[3]} · Studio ${'ABCAB'[CLASSES.indexOf(c) % 5]}</p></div>
      <div class="spots"><b>${Math.max(0, c[5] - n)}</b> of ${c[5]} spots left<div class="bar"><i style="width:${Math.min(100, n / c[5] * 100)}%"></i></div></div>
      ${past ? '<button class="btn" disabled>Started</button>' : mine ? `<button class="btn ghost" data-cancel="${c[0]}">Booked ✓ · Cancel</button>` : wl ? '<button class="btn" disabled>On waitlist</button>' : full ? `<button class="btn ghost" data-wait="${c[0]}">Join waitlist</button>` : `<button class="btn" data-book="${c[0]}">Book</button>`}</div>`;
  }).join('') || '<p class="none">No classes of this type on this day.</p>';
}
$('days').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) { day = +b.dataset.d; renderClasses(); } });
$('types').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { type = b.dataset.t; renderClasses(); } });
$('classlist').addEventListener('click', async (e) => {
  const bk = e.target.closest('[data-book]'), wt = e.target.closest('[data-wait]'), cn = e.target.closest('[data-cancel]');
  const c = CLASSES.find((x) => x[0] === (bk || wt || cn || {}).dataset?.[bk ? 'book' : wt ? 'wait' : 'cancel']);
  if (!c) return;
  if (cn) { if (!(await Kit.confirm(`Cancel ${c[1]}?`, 'Your spot will go to the next person on the waitlist.', 'Cancel booking'))) return; S.bookings.find((b) => b.date === date(day) && b.time === c[0] && !b.cancelled).cancelled = true; G.save(); renderClasses(); Kit.toast('Booking cancelled'); return; }
  const allowed = S.member || (S.trial && S.trial.date === date(day));
  const go = (name) => { if (wt) { S.waitlist.push({ date: date(day), time: c[0], name }); G.save(); renderClasses(); Kit.toast(`You're on the waitlist for ${c[1]} — we'll text you if a spot opens`); return; } S.bookings.push({ date: date(day), time: c[0], name }); G.save(); renderClasses(); Kit.toast(`${c[1]} booked for ${day ? Kit.addDays(new Date(), day).toLocaleDateString('en-GB', { weekday: 'long' }) : 'today'} at ${c[0]}`, { type: 'success' }); };
  if (allowed) { go(S.member ? S.member.name : S.trial.name); return; }
  Kit.modal({ title: 'Members book for free', body: `<p>Classes are included in Pro and Elite memberships. Not a member yet? Book this class with a <b style="color:var(--kit-ink)">free day pass</b>.</p>`,
    actions: [{ label: 'See memberships', onClick: () => { location.hash = '#plans'; } }, { label: 'Use a free day pass', primary: true, onClick: () => { setTimeout(() => trial(date(day), () => go(S.trial.name))); } }] });
});

/* ---------- Free trial pass ---------- */
function trial(forDate, then) {
  if (S.trial) { showPass(); then && S.trial.date === forDate && then(); return; }
  Kit.modal({ title: 'Free day pass', body: `<div class="kit-row"><div class="kit-field"><label for="t-n">Full name</label><input id="t-n" required autocomplete="name"></div><div class="kit-field"><label for="t-p">Mobile</label><input id="t-p" type="tel" required autocomplete="tel"></div></div><div class="kit-field"><label for="t-d">Which day?</label><input id="t-d" type="date" value="${forDate || date(0)}" min="${date(0)}" max="${date(13)}" required></div><p>One free pass per person. Bring photo ID.</p>`,
    onOpen: (d) => d.querySelector('#t-n').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Get my pass', primary: true, submit: true, onClick: (d) => { S.trial = { name: d.querySelector('#t-n').value.trim(), date: d.querySelector('#t-d').value, code: 'TRY-' + Math.random().toString(36).slice(2, 6).toUpperCase() }; G.save(); renderAll(); setTimeout(() => { showPass(); then && S.trial.date === forDate && then(); }); } }] });
}
function showPass() {
  const seed = [...S.trial.code].reduce((a, c) => a + c.charCodeAt(0), 0);
  Kit.modal({ title: 'Your day pass', body: `<div class="pass"><span>Show this at reception</span><div class="qr" aria-hidden="true">${Array.from({ length: 100 }, (_, i) => `<i class="${((i * 7 + seed) % 3) ? '' : 'o'}"></i>`).join('')}</div><span class="code">${S.trial.code}</span><b>${Kit.esc(S.trial.name)}</b><span>Valid ${new Date(S.trial.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · all classes &amp; gym floor</span></div>`,
    actions: [{ label: 'Add to calendar', onClick: () => { Kit.ics('forge-day-pass.ics', { title: 'Forge free day pass', start: new Date(S.trial.date + 'T07:00'), minutes: 60, location: 'Forge Harbour St' }); return false; } }, { label: 'Done', primary: true }] });
}
$('trial').addEventListener('click', () => trial());

/* ---------- Program quiz ---------- */
$('quiz').addEventListener('click', () => {
  const Q = [['What\'s your main goal?', [['Get stronger', 'strength'], ['Lose fat & get fit', 'cond'], ['A plan just for me', 'pt']]], ['How experienced are you?', [['New to training', 0], ['Some experience', 1], ['Training for years', 2]]], ['How often can you train?', [['2 days a week', 2], ['3–4 days', 4], ['5+ days', 5]]]];
  const a = []; let i = 0;
  Kit.modal({ title: 'Find my program', body: '<div id="qz"></div>', onOpen: (d) => {
    const draw = () => { d.querySelector('#qz').innerHTML = `<p>Question ${i + 1} of 3</p><h3 style="font-size:28px;margin:6px 0 14px">${Q[i][0]}</h3><div class="kit-seg" style="flex-direction:column;align-items:stretch">${Q[i][1].map(([l], k) => `<button type="button" data-k="${k}" style="min-height:50px">${l}</button>`).join('')}</div>`;
      d.querySelector('.kit-seg').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; a[i] = Q[i][1][+b.dataset.k][1]; if (++i < 3) draw(); else { d.close(); result(); } }; };
    draw();
  } });
  function result() {
    const prog = a[0], plan = a[2] >= 4 || prog === 'pt' ? (prog === 'pt' ? 'elite' : 'pro') : 'basic', names = { strength: 'Strength', cond: 'Conditioning', pt: 'Personal training' };
    document.querySelectorAll('.prog').forEach((p) => p.classList.toggle('rec', p.dataset.p === prog));
    Kit.modal({ title: `We recommend: ${names[prog]}`, body: `<p>${a[1] === 0 ? 'Start with our 4-week foundations block — a coach will teach you the basics.' : a[1] === 1 ? 'Join the main program and progress each week with tracked lifts.' : 'Jump into the advanced block with heavier weekly targets.'}</p><p>Training ${a[2]} days a week fits the <b style="color:var(--kit-ink)">${PLANS.find((p) => p[0] === plan)[1]}</b> membership best.</p>`,
      actions: [{ label: 'See classes', onClick: () => { location.hash = '#classes'; } }, { label: `Join ${PLANS.find((p) => p[0] === plan)[1]}`, primary: true, onClick: () => { setTimeout(() => join(plan)); } }] });
  }
});

/* ---------- Membership ---------- */
let bill = 'm';
function renderPlans() {
  $('plancards').innerHTML = PLANS.map(([id, n, m, y, feats, hot]) => `<article class="plan ${hot ? 'hot' : ''}"><h3>${n}</h3><div class="p">$${bill === 'm' ? m : y}<small>/mo${bill === 'y' ? ' · billed yearly' : ''}</small></div><ul>${feats.map((f) => `<li>${f}</li>`).join('')}<li>No joining fee online</li></ul>${S.member && S.member.plan === id ? '<button class="btn" disabled>Your plan ✓</button>' : `<button class="btn ${hot ? '' : 'ghost'}" data-join="${id}">${S.member ? 'Switch to ' + n : 'Choose ' + n}</button>`}</article>`).join('');
}
document.querySelector('.toggle').addEventListener('click', (e) => { const b = e.target.closest('[data-b]'); if (!b) return; bill = b.dataset.b; document.querySelectorAll('.toggle button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderPlans(); });
$('plancards').addEventListener('click', (e) => { const b = e.target.closest('[data-join]'); if (b) join(b.dataset.join); });
function join(id) {
  const [, n, m, y] = PLANS.find((p) => p[0] === id), price = bill === 'm' ? m : y * 12;
  if (S.member) { S.member.plan = id; G.save(); renderAll(); Kit.toast(`Switched to ${n} from your next billing date`, { type: 'success' }); return; }
  Kit.modal({ title: `Join ${n}`, body: `<p>${bill === 'm' ? `$${m} per month, cancel any time after month one.` : `$${y * 12} for 12 months ($${y}/mo).`} No joining fee when you join online.</p><div class="kit-field"><label for="j-n">Full name (for your member card)</label><input id="j-n" required autocomplete="name"></div><div class="kit-field"><label for="j-s">Start date</label><input id="j-s" type="date" value="${date(0)}" min="${date(0)}" max="${date(30)}"></div>`,
    onOpen: (d) => d.querySelector('#j-n').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Continue to payment', primary: true, submit: true, onClick: (d) => {
      S.pending = { plan: id, name: d.querySelector('#j-n').value.trim(), start: d.querySelector('#j-s').value, bill }; G.save();
      products.find((p) => p.id === id).price = price; products.find((p) => p.id === id).name = `${n} membership · ${bill === 'm' ? 'first month' : '12 months'}`;
      Shop.clear(); Shop.add(id, {}, 1, true); Shop.add('join', {}, 1, true); setTimeout(() => Shop.checkout(), 50);
    } }] });
}

function renderAll() {
  $('member').innerHTML = S.member ? `<b>${S.member.no}</b>${Kit.esc(S.member.name)} · ${PLANS.find((p) => p[0] === S.member.plan)[1]}` : S.trial ? `<b>Day pass</b>${new Date(S.trial.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} · <button class="kit-reset" id="show-pass">show pass</button>` : '';
  const sp = $('show-pass'); if (sp) sp.onclick = showPass;
  $('trial').textContent = S.trial ? 'Show my day pass' : 'Get a free day pass';
  renderClasses(); renderPlans();
}
renderAll();
