/* Apex Hub landing page — behaviour */
// Header border on scroll
const header = document.querySelector('.header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
const links = document.getElementById('nav-links');
const setMenu = (open) => {
  links.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
};
menuBtn.addEventListener('click', () => setMenu(!links.classList.contains('open')));
links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

// Template gallery — one entry per page in templates/
const TEMPLATES = [
  // [type, file, name, features, design style, industry]
  ['saas', 'clinic', 'Clinic booking system', 'Clinics, salons, services', 'Clean medical', 'Health & beauty'],
  ['saas', 'pos', 'POS & inventory', 'Retail, cafés, restaurants', 'App dashboard', 'Food & drink'],
  ['saas', 'qrmenu', 'QR menu & table ordering', 'Guest phone + kitchen display', 'Split-screen demo', 'Food & drink'],
  ['saas', 'crm', 'CRM & leads', 'Sales teams, agencies', 'Dark kanban', 'Business services'],
  ['saas', 'invoices', 'Invoicing & billing', 'Freelancers, agencies, shops', 'Swiss minimal', 'Business services'],
  ['saas', 'academy', 'Online academy', 'Courses, schools, coaches', 'Claymorphism', 'Education'],
  ['saas', 'gym-app', 'Gym management', 'Gyms, studios, clubs', 'Dark neon', 'Fitness'],
  ['saas', 'scheduler', 'Social media scheduler', 'Brands, creators, agencies', 'Glassmorphism', 'Creative & media'],
  ['saas', 'tracking', 'Delivery tracking', 'Couriers, stores, logistics', 'Neubrutalism', 'Logistics'],
  ['web', 'restaurant', 'Mediterranean restaurant', 'Menu tabs & reservations', 'Warm editorial', 'Food & drink'],
  ['web', 'fastfood', 'Fast food restaurant', 'Deals, menu & rewards', 'Fast-food chain', 'Food & drink'],
  ['web', 'coffee', 'Coffee shop chain', 'Drink sizes, rewards & store finder', 'Café chain', 'Food & drink'],
  ['web', 'finedining', 'Fine dining restaurant', 'Tasting menu & seatings', 'Noir luxury', 'Food & drink'],
  ['web', 'hotel', 'Hotel & resort', 'Rooms & availability', 'Luxury editorial', 'Hotels & travel'],
  ['web', 'realestate', 'Real estate listings', 'Search & saved homes', 'Corporate navy', 'Real estate'],
  ['web', 'fitness', 'Fitness club', 'Programs & memberships', 'Bold sports', 'Fitness'],
  ['web', 'spa', 'Spa & salon', 'Treatments & booking', 'Soft UI', 'Health & beauty'],
  ['web', 'lawfirm', 'Law firm', 'Practice areas & consultations', 'Corporate trust', 'Business services'],
  ['web', 'portfolio', 'Photography portfolio', 'Gallery & lightbox', 'Minimal gallery', 'Creative & media'],
  ['store', 'store', 'Fashion online store', 'Cart & filters', 'Monochrome fashion', 'Fashion'],
  ['store', 'sneakers', 'Sneaker drop store', 'Countdown & size picker', 'Brutalist streetwear', 'Fashion'],
  ['store', 'bakery', 'Bakery online ordering', 'Cake builder & pick-up', 'Artisan bakery', 'Food & drink'],
  ['store', 'grocery', 'Grocery delivery', 'Basket & delivery slots', 'Vibrant app-like', 'Food & drink'],
  ['store', 'electronics', 'Electronics store', 'Cart drawer & categories', 'Sleek tech dark', 'Electronics'],
  ['store', 'furniture', 'Furniture store', 'Rooms & colour swatches', 'Scandinavian', 'Home & living'],
  ['store', 'skincare', 'Skincare & beauty store', 'Skin-type routine finder', 'Pastel beauty', 'Health & beauty'],
];
const KIND = { saas: 'SaaS', web: 'Website', store: 'Online store' };
const PAGE = 9;
const esc = (s) => s.replace(/&/g, '&amp;');
const grid = document.getElementById('tpl-grid');
grid.innerHTML = TEMPLATES.map(([cat, file, name, sub, style, ind]) => `
      <article class="tpl" data-cat="${cat}" data-ind="${esc(ind)}">
        <a class="tpl-shot" href="templates/${file}.html" target="_blank" rel="noopener" aria-label="Open live preview of the ${esc(name)} template">
          <iframe data-src="templates/${file}.html?thumb" title="${esc(name)} template preview" loading="lazy" tabindex="-1" aria-hidden="true"></iframe>
          <span class="tpl-style">${style}</span>
        </a>
        <div class="tpl-info">
          <div><h3>${esc(name)}</h3><span>${KIND[cat]} · ${esc(ind)} · ${esc(sub)}</span></div>
          <a href="templates/${file}.html" target="_blank" rel="noopener" aria-label="Open live preview of the ${esc(name)} template"><svg aria-hidden="true"><use href="#i-up-right"/></svg></a>
        </div>
      </article>`).join('');

const filters = document.querySelectorAll('.filter');
const tpls = [...grid.querySelectorAll('.tpl')];
const moreBtn = document.getElementById('tpl-more');
const subBar = document.getElementById('tpl-industries');
let filter = 'all', industry = 'all', expanded = false;
const inType = (t) => filter === 'all' || t.dataset.cat === filter;
// Second row: the industries available in the current type, with counts
function renderIndustries() {
  const counts = {};
  tpls.filter(inType).forEach((t) => { counts[t.dataset.ind] = (counts[t.dataset.ind] || 0) + 1; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  subBar.innerHTML = [['all', 'All industries', total], ...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, k, n])]
    .map(([k, label, n]) => `<button class="sub" type="button" data-ind="${esc(k)}" aria-pressed="${k === industry}">${esc(label)} <span>${n}</span></button>`).join('');
}
function showTemplates() {
  const match = tpls.filter((t) => inType(t) && (industry === 'all' || t.dataset.ind === industry));
  tpls.forEach((t) => { t.hidden = true; });
  match.forEach((t, i) => {
    t.hidden = !expanded && i >= PAGE;
    const f = t.querySelector('iframe');
    if (!t.hidden && !f.src) f.src = f.dataset.src; // load previews only once visible
  });
  moreBtn.hidden = expanded || match.length <= PAGE;
  moreBtn.firstChild.textContent = `Show all ${match.length} templates `;
  fitThumbs();
}
filters.forEach((btn) => btn.addEventListener('click', () => {
  filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  filter = btn.dataset.filter; industry = 'all'; renderIndustries(); showTemplates(); syncCategories();
}));
subBar.addEventListener('click', (e) => {
  const b = e.target.closest('.sub'); if (!b) return;
  industry = b.dataset.ind; renderIndustries(); showTemplates(); syncCategories();
});

// "Websites by category" cards open the gallery filtered to that industry
const catCards = [...document.querySelectorAll('.cat[data-type]')];
const note = document.getElementById('tpl-note');
const countFor = (type, ind) => tpls.filter((t) => (type === 'all' || t.dataset.cat === type) && (ind === 'all' || t.dataset.ind === ind)).length;
catCards.forEach((c) => {
  const n = countFor(c.dataset.type, c.dataset.ind);
  c.querySelector('div').insertAdjacentHTML('beforeend', `<em class="cat-count">${n} template${n === 1 ? '' : 's'} →</em>`);
});
function syncCategories() {
  const active = catCards.find((c) => c.dataset.type === filter && c.dataset.ind === industry);
  catCards.forEach((c) => c.setAttribute('aria-pressed', String(c === active)));
  note.hidden = !active;
  if (active) note.innerHTML = `Showing <b>${active.dataset.label}</b> templates · ${countFor(filter, industry)} designs <button type="button" class="note-clear">Show all templates</button>`;
}
catCards.forEach((c) => c.addEventListener('click', (e) => {
  e.preventDefault();
  filter = c.dataset.type; industry = c.dataset.ind; expanded = false;
  filters.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  renderIndustries(); showTemplates(); syncCategories();
  document.getElementById('templates').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', '#templates');
}));
note.addEventListener('click', (e) => {
  if (!e.target.closest('.note-clear')) return;
  filter = 'all'; industry = 'all';
  filters.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
  renderIndustries(); showTemplates(); syncCategories();
});
renderIndustries();
moreBtn.addEventListener('click', () => { expanded = true; showTemplates(); });


// Scale each 1280px-wide template preview to its card
const fitThumbs = () => document.querySelectorAll('.tpl-shot').forEach((el) => {
  if (el.clientWidth) el.style.setProperty('--s', el.clientWidth / 1280);
});
if ('ResizeObserver' in window) new ResizeObserver(fitThumbs).observe(document.querySelector('.tpl-grid'));
window.addEventListener('resize', fitThumbs);
showTemplates();

// "Use this template" links arrive as ?template=Name#contact
const picked = new URLSearchParams(location.search).get('template');
if (picked) {
  document.getElementById('f-service').value = 'SaaS / ready-made template';
  document.getElementById('f-msg').value = `I'd like to use the ${picked} template for my business.`;
}

// Package buttons preselect the service
document.querySelectorAll('[data-plan]').forEach((a) => a.addEventListener('click', () => {
  document.getElementById('f-service').value = 'Full package (Budget / Premium / Diamond)';
  const msg = document.getElementById('f-msg');
  const bill = document.querySelector('.bill[aria-pressed="true"]').dataset.bill === 'y' ? 'yearly' : 'monthly';
  msg.value = `I'm interested in the ${a.dataset.plan} package (${bill} billing).`;
}));

// Monthly / yearly prices
document.querySelectorAll('.bill').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.bill').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('.price b').forEach((p) => { p.textContent = '$' + p.dataset[b.dataset.bill]; });
  document.querySelectorAll('.price span').forEach((s) => { s.textContent = b.dataset.bill === 'y' ? '/month, billed yearly' : '/month'; });
}));

// Package comparison — [feature, Budget, Premium, Diamond]; true = included, false = not included
const COMPARE = [
  ['Website', [
    ['Pages', '5', '12', 'Unlimited'],
    ['Design', 'Ready-made template', 'Custom design', 'Fully custom + animations'],
    ['Mobile-friendly & fast', true, true, true],
    ['Domain, hosting & SSL (1st year)', true, true, true],
    ['Edit content yourself (CMS)', true, true, true],
    ['Online store', false, 'Up to 100 products', 'Unlimited products'],
    ['Online booking / reservations', false, true, true],
    ['Design revisions', '2 rounds', '5 rounds', 'Unlimited'],
    ['Delivery time', '7 days', '14 days', '21–30 days'],
  ]],
  ['Software & SaaS', [
    ['Ready-made SaaS template', false, '1 template, branded', 'Any templates'],
    ['Custom features & integrations', false, '2 integrations', 'Custom build'],
    ['Admin dashboard & staff accounts', false, true, true],
  ]],
  ['Digital marketing (monthly)', [
    ['Social media platforms', '2', '3', '5'],
    ['Posts per month', '12', '20', '30'],
    ['Paid ads management', false, '1 platform', 'All platforms'],
    ['SEO', 'Basic on-page', 'Local SEO + 10 keywords', 'Full SEO + 25 keywords'],
    ['Google Business Profile', false, true, true],
    ['Email & WhatsApp campaigns', false, false, true],
  ]],
  ['Graphics & branding', [
    ['Logo', 'Refresh', 'New logo', 'Full brand identity'],
    ['Brand guidelines', false, 'Brand kit', 'Full guidelines'],
    ['Graphic designs per month', '10', '20', '40'],
  ]],
  ['Video & content', [
    ['Edited reels per month', false, '4', '10'],
    ['Promo video', false, '1 per quarter', '1 per month'],
    ['Photo & video shoot', false, false, 'Monthly'],
    ['Captions & content calendar', true, true, true],
    ['Website & blog copywriting', false, '2 articles / month', '4 articles / month'],
  ]],
  ['Support & reporting', [
    ['Performance reports', 'Monthly', 'Bi-weekly', 'Weekly + live dashboard'],
    ['Strategy calls', false, 'Bi-weekly', 'Weekly'],
    ['Support', 'Email · 48h', 'WhatsApp · 24h', 'Dedicated manager · same day'],
  ]],
];
const cell = (v) => v === true ? '<td><span class="yes" aria-label="Included">✓</span></td>'
  : v === false ? '<td><span class="no" aria-label="Not included">—</span></td>' : `<td>${v}</td>`;
document.getElementById('cmp-body').innerHTML = COMPARE.map(([group, rows]) =>
  `<tr class="group"><td colspan="4">${esc(group)}</td></tr>` +
  rows.map(([f, ...v]) => `<tr><th scope="row" style="font-weight:500">${esc(f)}</th>${v.map(cell).join('')}</tr>`).join('')).join('');
const cmpBtn = document.getElementById('cmp-toggle'), cmpWrap = document.getElementById('cmp-wrap');
cmpBtn.addEventListener('click', () => {
  const open = cmpWrap.hidden;
  cmpWrap.hidden = !open;
  cmpBtn.setAttribute('aria-expanded', String(open));
  cmpBtn.textContent = open ? 'Hide comparison' : 'Show full comparison';
});

// Scroll reveal
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { rootMargin: '0px 0px -8% 0px' }) : null;
document.querySelectorAll('.reveal').forEach((el) => io ? io.observe(el) : el.classList.add('in'));

// Form: validate on blur, clear errors on input
const form = document.getElementById('lead-form');
const rules = {
  'f-name': (v) => v.trim() ? '' : 'Please add your name so we know who to reply to.',
  'f-email': (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter an email like name@company.com.'
};
const check = (id) => {
  const input = document.getElementById(id);
  const msg = rules[id](input.value);
  document.getElementById(id + '-err').textContent = msg;
  input.closest('.field').classList.toggle('invalid', !!msg);
  input.setAttribute('aria-invalid', String(!!msg));
  return !msg;
};
Object.keys(rules).forEach((id) => {
  const input = document.getElementById(id);
  input.setAttribute('aria-describedby', id + '-err');
  input.addEventListener('blur', () => { if (input.value) check(id); });
  input.addEventListener('input', () => { if (input.closest('.field').classList.contains('invalid')) check(id); });
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = Object.keys(rules).map(check).every(Boolean);
  if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }
  // TODO: send to your backend / form service here
  document.getElementById('form-ok').classList.add('show');
  form.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();
