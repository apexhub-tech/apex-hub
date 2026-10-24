/* Postly — behaviour */
const NETS = { ig: ['Instagram', '#E1306C', 2200], fb: ['Facebook', '#1877F2', 63206], in: ['LinkedIn', '#0A66C2', 3000], x: ['X', '#111', 280], tt: ['TikTok', '#00C2B8', 2200] };
const LIB = ['1414235077428-338989a2e8c0', '1623334044303-241021148842', '1601762603339-fd61e28b698a', '1466978913421-dad2ebd01d17', '1512568400610-62da28bc8a13', '1568901346375-23c9450c58cd', '1580870069867-74c57ee1bb07', '1505740420928-5e560c06d30e', '1605774337664-7a846e9cdf17', '1600334089648-b0d9d3028eb2'];
const TAGS = ['#smallbusiness', '#shoplocal', '#newmenu', '#autumn', '#behindthescenes', '#weekendvibes', '#giveaway', '#supportlocal'];
const BEST = ['09:00', '12:30', '18:00', '20:30'];
const U = (id, w = 400, h = 250) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=65`;
const DAY = 864e5;
function seed() {
  const now = new Date(), at = (d, t) => { const x = Kit.addDays(now, d); const [h, m] = t.split(':'); x.setHours(+h, +m, 0, 0); return x.getTime(); };
  let r = 9; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const P = (d, t, cap, nets, img, status, extra = {}) => ({ id: Kit.uid(), caption: cap, nets, img, at: at(d, t), status, author: extra.author || 'Maya', ...extra, stats: status === 'published' ? { reach: Math.round(800 + rnd() * 5200), likes: Math.round(40 + rnd() * 420), comments: Math.round(rnd() * 60), shares: Math.round(rnd() * 40), clicks: Math.round(rnd() * 120) } : null });
  const posts = [
    P(0, '18:00', 'New autumn menu is here! Come try our wood-fired specials this weekend. 🍂 #newmenu #shoplocal', ['ig', 'fb'], LIB[0], 'scheduled'),
    P(1, '09:00', 'Monday fuel: our flat white is back with oat milk at no extra cost ☕', ['ig'], LIB[4], 'scheduled'),
    P(2, '12:30', 'Fresh out of the oven every morning at 7. Who\'s grabbing one? 🥐', ['ig', 'fb', 'tt'], LIB[1], 'pending', { author: 'Jad' }),
    P(3, '19:00', 'Behind the scenes of our autumn campaign shoot 📸 #behindthescenes', ['ig', 'in'], LIB[2], 'pending', { author: 'Jad' }),
    P(4, '20:30', 'Friday night at the table with friends. Book now — 10% off for groups of 6+', ['fb'], LIB[3], 'draft'),
    P(5, '11:00', 'GIVEAWAY 🎁 Tag a friend you\'d bring for brunch. Winner announced Monday! #giveaway', ['ig', 'tt'], LIB[5], 'scheduled'),
  ];
  for (let d = 1; d <= 24; d++) if (rnd() < .7) posts.push(P(-d, BEST[Math.floor(rnd() * 4)], ['Weekend special is live 🔥', 'Meet the team behind your morning coffee', 'Our most-ordered dish this month 👇', '5 reasons locals love us', 'New arrivals just dropped', 'Thank you for 10k followers! 💜'][Math.floor(rnd() * 6)], [['ig'], ['ig', 'fb'], ['in'], ['ig', 'tt'], ['fb', 'x']][Math.floor(rnd() * 5)], LIB[Math.floor(rnd() * LIB.length)], 'published'));
  return { posts };
}
const db = Kit.store('postly', seed), S = db.data, save = () => db.save();
const dots = (nets) => `<span class="nets">${nets.map((n) => `<span class="dot" style="background:${NETS[n][1]}" title="${NETS[n][0]}">${n.toUpperCase()[0]}</span>`).join('')}</span>`;
const STL = { scheduled: 'Scheduled', pending: 'Needs approval', draft: 'Draft', published: 'Published', rejected: 'Changes requested' };
document.getElementById('q-net').innerHTML += Object.entries(NETS).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('');

/* ---------- Calendar ---------- */
let weekOff = 0;
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOff * 7); return d; };
function renderWeek() {
  const ws = weekStart();
  document.getElementById('w-label').textContent = `${Kit.day(ws)} – ${Kit.day(Kit.addDays(ws, 6))}`;
  document.getElementById('week').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = Kit.addDays(ws, i), s = d.getTime(), list = S.posts.filter((p) => p.at >= s && p.at < s + DAY && p.status !== 'rejected').sort((a, b) => a.at - b.at), today = Kit.iso(d) === Kit.iso(new Date());
    return `<div class="col ${today ? 'today' : ''}" data-day="${s}"><h3>${d.toLocaleDateString('en-GB', { weekday: 'short' })}<b>${d.getDate()}</b></h3>
      ${list.map((p) => `<button class="post ${p.status}" draggable="${p.status !== 'published'}" data-id="${p.id}"><img src="${U(p.img)}" alt="" loading="lazy"><div><span class="t"><span>${Kit.time(p.at)}</span>${dots(p.nets)}</span><p>${Kit.esc(p.caption)}</p></div></button>`).join('')}
      ${s + DAY > Date.now() ? `<button class="add-slot" data-new="${s}">+ Post</button>` : ''}</div>`;
  }).join('');
}
const week = document.getElementById('week');
week.addEventListener('dragstart', (e) => { const p = e.target.closest('.post'); if (!p) return; p.classList.add('dragging'); e.dataTransfer.setData('text/plain', p.dataset.id); });
week.addEventListener('dragend', () => week.querySelectorAll('.dragging,.over').forEach((x) => x.classList.remove('dragging', 'over')));
week.addEventListener('dragover', (e) => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); week.querySelectorAll('.col').forEach((x) => x.classList.toggle('over', x === c)); });
week.addEventListener('drop', (e) => {
  const c = e.target.closest('.col'); if (!c) return; e.preventDefault();
  const p = S.posts.find((x) => x.id === e.dataTransfer.getData('text/plain')); if (!p) return;
  const t = new Date(p.at), nd = new Date(+c.dataset.day); nd.setHours(t.getHours(), t.getMinutes());
  if (nd.getTime() < Date.now()) { Kit.toast('You can\'t schedule a post in the past', { type: 'error' }); renderAll(); return; }
  const old = p.at; p.at = nd.getTime(); save(); renderAll();
  Kit.toast(`Moved to ${nd.toLocaleDateString('en-GB', { weekday: 'long' })} ${Kit.time(nd)}`, { undo: () => { p.at = old; save(); renderAll(); } });
});
week.addEventListener('click', (e) => { const n = e.target.closest('[data-new]'); if (n) { const d = new Date(+n.dataset.new); d.setHours(18, 0); composer(null, Math.max(d.getTime(), Date.now() + 36e5)); return; } const p = e.target.closest('.post'); if (p) openPost(S.posts.find((x) => x.id === p.dataset.id)); });
document.getElementById('w-prev').addEventListener('click', () => { weekOff--; renderWeek(); });
document.getElementById('w-next').addEventListener('click', () => { weekOff++; renderWeek(); });
document.getElementById('w-today').addEventListener('click', () => { weekOff = 0; renderWeek(); });

/* ---------- Composer ---------- */
function composer(post, at) {
  const P = post ? JSON.parse(JSON.stringify(post)) : { id: null, caption: '', nets: ['ig', 'fb'], img: LIB[0], at: at || Date.now() + 2 * 36e5, status: 'scheduled', author: 'Maya' };
  let pv = P.nets[0] || 'ig';
  const dt = new Date(P.at);
  Kit.modal({ title: post ? 'Edit post' : 'Create post', wide: true, body: `<div class="comp"><div style="display:grid;gap:14px">
    <div class="kit-field"><span class="kit-label">Post to</span><div class="netpick" id="np">${Object.entries(NETS).map(([k, [n, c]]) => `<button type="button" data-n="${k}" aria-pressed="${P.nets.includes(k)}"><span class="dot" style="background:${c}">${k.toUpperCase()[0]}</span>${n}</button>`).join('')}</div></div>
    <div class="kit-field"><label for="cap">Caption</label><textarea id="cap" rows="5" placeholder="What do you want to share?">${Kit.esc(P.caption)}</textarea><div class="counters" id="cnt"></div></div>
    <div class="kit-field"><span class="kit-label">Suggested hashtags</span><div class="tags" id="tg">${TAGS.map((t) => `<button type="button">${t}</button>`).join('')}</div></div>
    <div class="kit-field"><span class="kit-label">Media library</span><div class="lib" id="lib">${LIB.map((id) => `<button type="button" data-img="${id}" aria-pressed="${id === P.img}"><img src="${U(id, 120, 120)}" alt=""></button>`).join('')}</div></div>
    <div class="kit-row"><div class="kit-field"><label for="pd">Date</label><input id="pd" type="date" value="${Kit.iso(dt)}" min="${Kit.iso(new Date())}"></div><div class="kit-field"><label for="pt">Time</label><input id="pt" type="time" value="${dt.toTimeString().slice(0, 5)}"></div></div>
    <div class="kit-field"><span class="kit-label">Best times for your audience</span><div class="best" id="best">${BEST.map((t) => `<button type="button" class="kit-btn">${t}</button>`).join('')}</div></div>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="appr" ${P.status === 'pending' ? 'checked' : ''}> Send to client for approval first</label>
    </div><div><span class="kit-label">Preview</span><div class="preview" style="margin-top:6px"><div class="pv-tabs" id="pvt" role="tablist"></div><div class="pv-body" id="pvb"></div></div></div></div>`,
    onOpen: (m) => {
      const cap = m.querySelector('#cap');
      const draw = () => {
        P.caption = cap.value;
        m.querySelector('#cnt').innerHTML = P.nets.map((n) => { const lim = NETS[n][2], len = P.caption.length; return `<span class="${len > lim ? 'over' : ''}">${NETS[n][0]} ${len}/${lim}</span>`; }).join(' · ') || '<span class="over">Pick at least one network</span>';
        if (!P.nets.includes(pv)) pv = P.nets[0];
        m.querySelector('#pvt').innerHTML = P.nets.map((n) => `<button type="button" role="tab" data-pv="${n}" aria-selected="${n === pv}">${NETS[n][0]}</button>`).join('');
        const lim = pv ? NETS[pv][2] : 0, txt = P.caption || 'Your caption will appear here…';
        m.querySelector('#pvb').innerHTML = pv ? `<div class="pv-head"><i></i>olive.and.ember <small style="color:var(--muted);font-weight:500">· ${Kit.time(new Date(`${m.querySelector('#pd').value}T${m.querySelector('#pt').value}`))}</small></div>${pv === 'x' || pv === 'in' ? `<p>${Kit.esc(txt.slice(0, lim))}${txt.length > lim ? '<span class="cut"> …cut off</span>' : ''}</p><img src="${U(P.img, 600, 340)}" alt="" style="aspect-ratio:16/9">` : `<img src="${U(P.img, 600, pv === 'tt' ? 800 : 600)}" alt="" style="aspect-ratio:${pv === 'tt' ? '3/4' : '1'}"><p><b>olive.and.ember</b> ${Kit.esc(txt.slice(0, 125))}${txt.length > 125 ? '<span class="cut">… more</span>' : ''}</p>`}<p class="kit-hint" style="margin-top:8px">♥ 0 · 💬 0 · ↗ 0</p>` : '<p class="kit-hint">Choose a network to preview.</p>';
      };
      m.querySelector('#np').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); P.nets = on ? [...P.nets, b.dataset.n] : P.nets.filter((x) => x !== b.dataset.n); draw(); });
      m.querySelector('#tg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (!cap.value.includes(b.textContent)) cap.value = (cap.value.trim() + ' ' + b.textContent).trim(); draw(); });
      m.querySelector('#lib').addEventListener('click', (e) => { const b = e.target.closest('[data-img]'); if (!b) return; P.img = b.dataset.img; m.querySelectorAll('#lib button').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); });
      m.querySelector('#best').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { m.querySelector('#pt').value = b.textContent; draw(); } });
      m.querySelector('#pvt').addEventListener('click', (e) => { const b = e.target.closest('[data-pv]'); if (b) { pv = b.dataset.pv; draw(); } });
      m.addEventListener('input', draw); draw(); cap.focus();
    },
    actions: [
      ...(post ? [{ label: 'Delete', danger: true, onClick: () => { const i = S.posts.indexOf(post); S.posts.splice(i, 1); save(); renderAll(); Kit.toast('Post deleted', { undo: () => { S.posts.splice(i, 0, post); save(); renderAll(); } }); } }] : []),
      { label: 'Save as draft', onClick: (m) => commit(m, 'draft') },
      { label: 'Publish now', onClick: (m) => commit(m, 'now') },
      { label: post ? 'Save changes' : 'Schedule', primary: true, onClick: (m) => commit(m, m.querySelector('#appr').checked ? 'pending' : 'scheduled') }] });
  function commit(m, mode) {
    const when = new Date(`${m.querySelector('#pd').value}T${m.querySelector('#pt').value}`).getTime();
    if (!P.caption.trim()) { Kit.toast('Write a caption first', { type: 'error' }); return false; }
    if (!P.nets.length) { Kit.toast('Pick at least one network', { type: 'error' }); return false; }
    const over = P.nets.filter((n) => P.caption.length > NETS[n][2]);
    if (over.length && mode !== 'draft') { Kit.toast(`Caption is too long for ${over.map((n) => NETS[n][0]).join(', ')}`, { type: 'error' }); return false; }
    if (mode !== 'draft' && mode !== 'now' && when < Date.now()) { Kit.toast('Pick a time in the future', { type: 'error' }); return false; }
    P.at = mode === 'now' ? Date.now() : when;
    P.status = mode === 'now' ? 'published' : mode;
    if (P.status === 'published') P.stats = { reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
    if (P.id) { const i = S.posts.findIndex((x) => x.id === P.id); S.posts[i] = P; } else { P.id = Kit.uid(); S.posts.push(P); }
    save(); renderAll();
    Kit.toast({ draft: 'Draft saved', now: `Published to ${P.nets.map((n) => NETS[n][0]).join(', ')}`, pending: 'Sent to the client for approval', scheduled: `Scheduled for ${new Date(P.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${Kit.time(P.at)}` }[mode], { type: 'success' });
  }
}
function openPost(p) {
  if (p.status !== 'published') { composer(p); return; }
  const s = p.stats;
  Kit.modal({ title: 'Published post', body: `<img src="${U(p.img, 700, 400)}" alt="" style="width:100%;border-radius:14px"><p style="color:var(--ink)">${Kit.esc(p.caption)}</p><p>${new Date(p.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · ${p.nets.map((n) => NETS[n][0]).join(', ')}</p>
    <div class="kpis" style="grid-template-columns:repeat(4,1fr)"><div class="kpi"><span>Reach</span><b>${Kit.num(s.reach)}</b></div><div class="kpi"><span>Likes</span><b>${s.likes}</b></div><div class="kpi"><span>Comments</span><b>${s.comments}</b></div><div class="kpi"><span>Shares</span><b>${s.shares}</b></div></div>`,
    actions: [{ label: 'Re-share as new post', onClick: () => { setTimeout(() => composer({ ...p, id: null, status: 'scheduled', at: Date.now() + 864e5 })); } }, { label: 'Close', primary: true }] });
}
document.getElementById('new').addEventListener('click', () => composer(null));

/* ---------- Queue ---------- */
function renderQueue() {
  const net = document.getElementById('q-net').value, st = document.getElementById('q-st').value;
  const list = S.posts.filter((p) => (net === 'all' || p.nets.includes(net)) && (st === 'upcoming' ? ['scheduled', 'pending', 'rejected'].includes(p.status) && p.at >= Date.now() - DAY : p.status === st)).sort((a, b) => st === 'published' ? b.at - a.at : a.at - b.at);
  document.getElementById('q-sub').textContent = `${list.length} posts`;
  let last = '';
  document.getElementById('queue').innerHTML = list.map((p) => {
    const day = new Date(p.at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), h = day !== last ? `<p class="day-h">${day}</p>` : ''; last = day;
    return `${h}<div class="row"><img src="${U(p.img, 150, 150)}" alt="" loading="lazy"><div><b>${Kit.esc(p.caption)}</b><div class="meta">${Kit.time(p.at)} ${dots(p.nets)}<span class="st st-${p.status}">${STL[p.status]}</span>${p.status === 'published' ? `<span>♥ ${p.stats.likes} · reach ${Kit.num(p.stats.reach)}</span>` : `<span>by ${p.author}</span>`}${p.feedback ? `<span style="color:var(--red)">“${Kit.esc(p.feedback)}”</span>` : ''}</div></div>
      <div class="acts">${p.status !== 'published' ? `<button class="link" data-edit="${p.id}">Edit</button><button class="link" data-now="${p.id}">Publish now</button>` : `<button class="link" data-edit="${p.id}">Insights</button>`}<button class="link" data-dup="${p.id}">Duplicate</button></div></div>`;
  }).join('') || '<p class="kit-empty-state">Nothing here yet — create a post to fill your queue.</p>';
}
document.getElementById('q-net').addEventListener('change', renderQueue);
document.getElementById('q-st').addEventListener('change', renderQueue);
document.getElementById('queue').addEventListener('click', (e) => {
  const find = (a) => S.posts.find((x) => x.id === e.target.closest(`[${a}]`).getAttribute(a));
  if (e.target.closest('[data-edit]')) openPost(find('data-edit'));
  if (e.target.closest('[data-now]')) { const p = find('data-now'); const prev = [p.status, p.at]; p.status = 'published'; p.at = Date.now(); p.stats = { reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }; save(); renderAll(); Kit.toast('Published', { type: 'success', undo: () => { [p.status, p.at] = prev; p.stats = null; save(); renderAll(); } }); }
  if (e.target.closest('[data-dup]')) { const p = find('data-dup'); composer({ ...JSON.parse(JSON.stringify(p)), id: null, status: 'scheduled', at: Date.now() + DAY, stats: null }); }
});

/* ---------- Approvals ---------- */
function renderApprovals() {
  const list = S.posts.filter((p) => p.status === 'pending').sort((a, b) => a.at - b.at);
  const n = document.getElementById('ap-n'); n.hidden = !list.length; n.textContent = list.length;
  document.getElementById('approvals').innerHTML = list.map((p) => `<li class="row"><img src="${U(p.img, 150, 150)}" alt=""><div><b>${Kit.esc(p.caption)}</b><div class="meta">Goes live ${new Date(p.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${Kit.time(p.at)} ${dots(p.nets)} <span>by ${p.author}</span></div></div>
    <div class="acts"><button class="btn" data-rej="${p.id}">Request changes</button><button class="btn primary" data-ok="${p.id}">Approve</button></div></li>`).join('') || '<li class="kit-empty-state">All caught up — nothing waiting for approval. ✨</li>';
}
document.getElementById('approvals').addEventListener('click', (e) => {
  const ok = e.target.closest('[data-ok]'); if (ok) { const p = S.posts.find((x) => x.id === ok.dataset.ok); p.status = 'scheduled'; delete p.feedback; save(); renderAll(); Kit.toast('Approved — the post is scheduled', { type: 'success', undo: () => { p.status = 'pending'; save(); renderAll(); } }); }
  const rj = e.target.closest('[data-rej]'); if (rj) { const p = S.posts.find((x) => x.id === rj.dataset.rej); Kit.modal({ title: 'Request changes', body: `<div class="kit-field"><label for="fb">What should the team change?</label><textarea id="fb" placeholder="e.g. Please use the croissant photo instead"></textarea></div>`, onOpen: (m) => m.querySelector('#fb').focus(), actions: [{ label: 'Cancel' }, { label: 'Send feedback', primary: true, onClick: (m) => { const t = m.querySelector('#fb').value.trim(); if (!t) return false; p.status = 'rejected'; p.feedback = t; save(); renderAll(); Kit.toast(`Feedback sent to ${p.author}`); } }] }); }
});

/* ---------- Analytics ---------- */
function renderAnalytics() {
  const pub = S.posts.filter((p) => p.status === 'published' && p.at > Date.now() - 30 * DAY && p.stats);
  const sum = (k) => pub.reduce((a, p) => a + p.stats[k], 0), reach = sum('reach'), eng = sum('likes') + sum('comments') + sum('shares');
  document.getElementById('a-reach').textContent = Kit.num(reach); document.getElementById('a-eng').textContent = (reach ? eng / reach * 100 : 0).toFixed(1) + '%';
  document.getElementById('a-posts').textContent = pub.length; document.getElementById('a-clicks').textContent = Kit.num(sum('clicks'));
  const days = []; for (let d = 13; d >= 0; d--) { const s = new Date().setHours(0, 0, 0, 0) - d * DAY; days.push({ label: new Date(s).getDate() + '', value: pub.filter((p) => p.at >= s && p.at < s + DAY).reduce((a, p) => a + p.stats.likes + p.stats.comments + p.stats.shares, 0) }); }
  Kit.line(document.getElementById('a-chart'), days);
  const hrs = ['09', '12', '15', '18', '21'], dn = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const score = (h, d) => { const base = { '09': .5, '12': .7, '15': .35, '18': .95, '21': .8 }[h]; return Math.min(1, base * (d >= 5 ? 1.1 : .9) + ((d * 7 + +h) % 5) / 20); };
  document.getElementById('a-heat').innerHTML = '<span></span>' + dn.map((d) => `<b style="text-align:center">${d}</b>`).join('') + hrs.map((h) => `<b>${h}:00</b>` + dn.map((_, d) => { const v = score(h, d); return `<span style="background:rgba(108,77,246,${(v * .85 + .08).toFixed(2)})" title="${h}:00 · ${Math.round(v * 100)}% of peak engagement"></span>`; }).join('')).join('');
  const top = pub.slice().sort((a, b) => (b.stats.likes + b.stats.comments * 3) - (a.stats.likes + a.stats.comments * 3)).slice(0, 3);
  document.getElementById('a-top').innerHTML = top.map((p, i) => `<li class="row"><img src="${U(p.img, 150, 150)}" alt=""><div><b>${i + 1}. ${Kit.esc(p.caption)}</b><div class="meta">${Kit.day(p.at)} ${dots(p.nets)} <span>reach ${Kit.num(p.stats.reach)} · ♥ ${p.stats.likes} · 💬 ${p.stats.comments}</span></div></div><div class="acts"><button class="link" data-reuse="${p.id}">Re-share</button></div></li>`).join('');
}
document.getElementById('a-top').addEventListener('click', (e) => { const b = e.target.closest('[data-reuse]'); if (b) { const p = S.posts.find((x) => x.id === b.dataset.reuse); composer({ ...JSON.parse(JSON.stringify(p)), id: null, status: 'scheduled', at: Date.now() + DAY, stats: null }); } });
document.getElementById('export').addEventListener('click', () => Kit.csv('postly-report.csv', [['Date', 'Networks', 'Caption', 'Reach', 'Likes', 'Comments', 'Shares', 'Clicks'], ...S.posts.filter((p) => p.status === 'published' && p.stats).map((p) => [new Date(p.at).toISOString(), p.nets.map((n) => NETS[n][0]).join('/'), p.caption, p.stats.reach, p.stats.likes, p.stats.comments, p.stats.shares, p.stats.clicks])]));

function renderAll() { renderWeek(); renderQueue(); renderApprovals(); renderAnalytics(); }
renderAll();
const router = Kit.router('calendar', (v) => { if (v === 'analytics') renderAnalytics(); });
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Removes your test posts.', 'Reset')) db.reset(); });
Kit.key('n', () => composer(null), 'Create post');
Kit.key('ArrowLeft', () => { if (!document.querySelector('[data-view=calendar]').hidden) { weekOff--; renderWeek(); } }, 'Previous week');
Kit.key('ArrowRight', () => { if (!document.querySelector('[data-view=calendar]').hidden) { weekOff++; renderWeek(); } }, 'Next week');
Kit.commands([{ label: 'Create post', hint: 'N', run: () => composer(null) }, { label: 'Go to Calendar', run: () => router.go('calendar') }, { label: 'Go to Queue', run: () => router.go('queue') }, { label: 'Review approvals', run: () => router.go('approvals') }, { label: 'Go to Analytics', run: () => router.go('analytics') }, { label: 'Show drafts', run: () => { router.go('queue'); document.getElementById('q-st').value = 'draft'; renderQueue(); } }, { label: 'Export analytics report', run: () => document.getElementById('export').click() }]);
