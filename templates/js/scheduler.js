/* Postly — client review portal: approve posts, see what's coming, read the report and request new posts.
   Data lives in scheduler-data.js; the agency sees every approval and request live in scheduler-admin.html. */
const $ = (id) => document.getElementById(id);
const when = (ts) => new Date(ts).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' at ' + Kit.time(ts);
const tabs = {};
S.requests = S.requests || [];

function card(p, pv) {
  const lim = NETS[pv][2], txt = p.caption;
  return `<div class="pv-head"><i></i>${CLIENT.handle}</div>${pv === 'x' || pv === 'in' ? `<p>${Kit.esc(txt.slice(0, lim))}${txt.length > lim ? '<span class="cut"> …cut off</span>' : ''}</p><img src="${U(p.img, 700, 400)}" alt="" style="aspect-ratio:16/9">` : `<img src="${U(p.img, 700, pv === 'tt' ? 900 : 700)}" alt="" style="aspect-ratio:${pv === 'tt' ? '3/4' : '1'}"><p><b>${CLIENT.handle}</b> ${Kit.esc(txt)}</p>`}`;
}

/* ---------- Review ---------- */
function renderReview() {
  const list = S.posts.filter((p) => p.status === 'pending').sort((a, b) => a.at - b.at);
  $('rv-n').hidden = !list.length; $('rv-n').textContent = list.length;
  $('rv-sub').textContent = list.length ? `${list.length} post${list.length > 1 ? 's' : ''} from Apex Studio · the soonest goes live ${when(list[0].at)}` : 'You\'re all caught up.';
  $('approve-all').hidden = list.length < 2;
  $('review').innerHTML = list.map((p) => { const pv = tabs[p.id] && p.nets.includes(tabs[p.id]) ? tabs[p.id] : p.nets[0]; return `<article class="rv" data-id="${p.id}">
    <div class="preview"><div class="pv-tabs" role="tablist">${p.nets.map((n) => `<button type="button" role="tab" data-pv="${n}" aria-selected="${n === pv}">${NETS[n][0]}</button>`).join('')}</div><div class="pv-body">${card(p, pv)}</div></div>
    <div class="rv-side"><span class="st st-pending">Needs your approval</span><h3>Goes live ${when(p.at)}</h3><p>${dots(p.nets)}</p><p class="by">Drafted by ${p.author} at Apex Studio</p>
      <div class="kit-field"><label for="fb-${p.id}">Feedback (only needed if you want changes)</label><textarea id="fb-${p.id}" rows="3" placeholder="e.g. Can we use the croissant photo instead?"></textarea></div>
      <div class="rv-acts"><button class="btn" data-rej>Request changes</button><button class="btn primary" data-ok>Approve post</button></div></div></article>`; }).join('')
    || '<div class="empty-ok"><b>✨ Nothing to review</b><p>New posts from your agency will appear here — we\'ll email you too.</p><a class="btn" href="#/calendar">See upcoming posts</a></div>';
}
$('review').addEventListener('click', (e) => {
  const art = e.target.closest('.rv'); if (!art) return; const p = S.posts.find((x) => x.id === art.dataset.id);
  const t = e.target.closest('[data-pv]'); if (t) { tabs[p.id] = t.dataset.pv; renderReview(); return; }
  if (e.target.closest('[data-ok]')) {
    p.status = 'scheduled'; delete p.feedback; Kit.notify(db, `${CLIENT.contact} approved “${p.caption.slice(0, 40)}…”`, { post: p.id });
    renderAll(); Kit.toast(`Approved — it goes live ${when(p.at)}`, { type: 'success' });
  }
  if (e.target.closest('[data-rej]')) {
    const ta = art.querySelector('textarea'), fb = ta.value.trim();
    if (!fb) { ta.focus(); ta.setAttribute('aria-invalid', 'true'); Kit.toast('Tell the team what to change first', { type: 'error' }); return; }
    p.status = 'rejected'; p.feedback = fb; Kit.notify(db, `${CLIENT.contact} asked for changes: “${fb.slice(0, 60)}”`, { post: p.id });
    renderAll(); Kit.toast(`Feedback sent to ${p.author}`, { type: 'success' });
  }
});
$('review').addEventListener('input', (e) => { if (e.target.tagName === 'TEXTAREA') e.target.removeAttribute('aria-invalid'); });
$('approve-all').addEventListener('click', async () => {
  const list = S.posts.filter((p) => p.status === 'pending');
  if (!(await Kit.confirm(`Approve all ${list.length} posts?`, 'They\'ll be scheduled to go live at the times shown.', 'Approve all', false))) return;
  list.forEach((p) => { p.status = 'scheduled'; }); Kit.notify(db, `${CLIENT.contact} approved ${list.length} posts at once`);
  renderAll(); Kit.toast(`${list.length} posts approved`, { type: 'success' });
});

/* ---------- Upcoming ---------- */
function renderUpcoming() {
  const end = Date.now() + 14 * DAY, list = S.posts.filter((p) => p.at >= new Date().setHours(0, 0, 0, 0) && p.at < end && ['scheduled', 'pending', 'published', 'rejected'].includes(p.status)).sort((a, b) => a.at - b.at);
  let last = '';
  $('upcoming').innerHTML = list.map((p) => {
    const day = new Date(p.at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), h = day !== last ? `<p class="day-h">${day}</p>` : ''; last = day;
    return `${h}<div class="row"><img src="${U(p.img, 150, 150)}" alt="" loading="lazy"><div><b>${Kit.esc(p.caption)}</b><div class="meta">${Kit.time(p.at)} ${dots(p.nets)}<span class="st st-${p.status}">${p.status === 'rejected' ? 'Being revised' : STL[p.status]}</span></div></div>${p.status === 'pending' ? '<div class="acts"><a class="btn primary" href="#/review">Review</a></div>' : ''}</div>`;
  }).join('') || '<p class="kit-empty-state">Nothing planned yet — your agency will add posts soon.</p>';
}

/* ---------- Report ---------- */
function renderReport() {
  const { pub, sum, reach, eng } = pubStats();
  $('r-reach').textContent = Kit.num(reach); $('r-eng').textContent = (reach ? eng / reach * 100 : 0).toFixed(1) + '%';
  $('r-posts').textContent = pub.length; $('r-clicks').textContent = Kit.num(sum('clicks'));
  const days = []; for (let d = 13; d >= 0; d--) { const s = new Date().setHours(0, 0, 0, 0) - d * DAY; days.push({ label: new Date(s).getDate() + '', value: pub.filter((p) => p.at >= s && p.at < s + DAY).reduce((a, p) => a + p.stats.likes + p.stats.comments + p.stats.shares, 0) }); }
  Kit.line($('r-chart'), days);
  $('r-top').innerHTML = pub.slice().sort((a, b) => (b.stats.likes + b.stats.comments * 3) - (a.stats.likes + a.stats.comments * 3)).slice(0, 3)
    .map((p, i) => `<li class="row"><img src="${U(p.img, 150, 150)}" alt=""><div><b>${i + 1}. ${Kit.esc(p.caption)}</b><div class="meta">${Kit.day(p.at)} ${dots(p.nets)} <span>reach ${Kit.num(p.stats.reach)} · ♥ ${p.stats.likes} · 💬 ${p.stats.comments}</span></div></div></li>`).join('');
}
$('dl').addEventListener('click', () => Kit.csv('olive-and-ember-social-report.csv', [['Date', 'Networks', 'Caption', 'Reach', 'Likes', 'Comments', 'Shares', 'Clicks'], ...pubStats().pub.map((p) => [new Date(p.at).toISOString().slice(0, 10), p.nets.map((n) => NETS[n][0]).join('/'), p.caption, p.stats.reach, p.stats.likes, p.stats.comments, p.stats.shares, p.stats.clicks])]));

/* ---------- Requests ---------- */
let reqNets = ['ig', 'fb'];
const drawNets = () => { $('rq-nets').innerHTML = Object.entries(NETS).map(([k, [n, c]]) => `<button type="button" data-n="${k}" aria-pressed="${reqNets.includes(k)}"><span class="dot" style="background:${c}">${k.toUpperCase()[0]}</span>${n}</button>`).join(''); };
$('rq-nets').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; reqNets = reqNets.includes(b.dataset.n) ? reqNets.filter((x) => x !== b.dataset.n) : [...reqNets, b.dataset.n]; drawNets(); });
$('rq-date').min = Kit.iso(new Date());
$('req-form').addEventListener('submit', (e) => {
  e.preventDefault(); const idea = $('rq-idea').value.trim();
  if (!idea) { $('rq-idea').setAttribute('aria-invalid', 'true'); $('rq-idea').focus(); Kit.toast('Describe the post you\'d like', { type: 'error' }); return; }
  if (!reqNets.length) { Kit.toast('Pick at least one network', { type: 'error' }); return; }
  S.requests.push({ id: Kit.uid(), idea, when: $('rq-date').value, nets: reqNets.slice(), ts: Date.now(), status: 'open' });
  Kit.notify(db, `New post request from ${CLIENT.contact}: “${idea.slice(0, 50)}”`);
  $('rq-idea').value = ''; $('rq-date').value = ''; renderAll(); Kit.toast('Request sent — the team usually drafts it within a day', { type: 'success' });
});
$('rq-idea').addEventListener('input', () => $('rq-idea').removeAttribute('aria-invalid'));
function renderRequests() {
  const label = { open: ['Sent to agency', 'st-pending'], done: ['Drafted', 'st-scheduled'], declined: ['Declined', 'st-rejected'] };
  $('my-reqs').innerHTML = S.requests.slice().reverse().map((r) => { const post = r.post && S.posts.find((p) => p.id === r.post); return `<li class="mini"><div><b>${Kit.esc(r.idea)}</b><small>${Kit.ago(r.ts)} · ${r.nets.map((k) => NETS[k][0]).join(', ')}</small></div><span class="st ${label[r.status][1]}">${label[r.status][0]}</span>${post && post.status === 'pending' ? '<a class="link" href="#/review">Review draft →</a>' : ''}</li>`; }).join('')
    || '<li class="kit-empty-state">No requests yet.</li>';
}

/* ---------- Live sync, router ---------- */
function renderAll() { renderReview(); renderUpcoming(); renderReport(); renderRequests(); }
let pendingIds = new Set(S.posts.filter((p) => p.status === 'pending').map((p) => p.id));
Kit.sync(db, () => {
  S.requests = S.requests || [];
  const now = S.posts.filter((p) => p.status === 'pending'), added = now.filter((p) => !pendingIds.has(p.id));
  pendingIds = new Set(now.map((p) => p.id));
  renderAll();
  if (added.length) Kit.toast(`📬 ${added.length} new post${added.length > 1 ? 's' : ''} from Apex Studio to review`, { type: 'success', ms: 6000 });
});
drawNets(); renderAll();
const router = Kit.router('review', (v) => { if (v === 'report') renderReport(); });
$('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores the sample posts for both the client portal and agency workspace.', 'Reset')) db.reset(); });
Kit.commands([{ label: 'Posts to review', run: () => router.go('review') }, { label: 'Upcoming posts', run: () => router.go('calendar') }, { label: 'Monthly report', run: () => router.go('report') }, { label: 'Request a post', run: () => router.go('requests') }, { label: 'Agency sign-in', run: () => { location.href = 'scheduler-admin.html'; } }]);
