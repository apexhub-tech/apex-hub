/* Brightpath — learner app: my courses, catalog, lesson player with quizzes, progress, and questions to the instructor.
   Data lives in academy-data.js; the instructor studio (academy-admin.html) sees enrolments and questions live. */

/* ---------- Home ---------- */
function renderHome() {
  const st = streak(), left = Math.max(0, S.goal - weekDone());
  document.getElementById('h-streak').textContent = st; document.getElementById('h-xp').textContent = Kit.num(S.xp);
  document.getElementById('hi-sub').textContent = left ? `You're ${left} lesson${left > 1 ? 's' : ''} away from your weekly goal. Keep it up!` : 'Weekly goal reached — amazing work! 🎉';
  document.getElementById('me-xp').textContent = `⚡ ${Kit.num(S.xp)} XP · Level ${Math.floor(S.xp / 500) + 1}`;
  document.getElementById('me-streak').textContent = `🔥 ${st}-day streak`;
  const a = S.announcements[S.announcements.length - 1], fresh = S.questions.filter((q) => q.by === LEARNER.name && q.answer && !q.seen);
  document.getElementById('announce').innerHTML = (fresh.length ? `<a class="announce ans" href="#/questions"><b>💬 ${fresh.length === 1 ? 'Your instructor answered your question' : `${fresh.length} new answers from your instructor`}</b><span>Read →</span></a>` : '')
    + (a ? `<div class="announce"><b>📣 From your instructor</b><span>${Kit.esc(a.text)}</span><small>${Kit.ago(a.ts)}</small></div>` : '');
  const mine = Object.keys(S.enrolled).filter((cid) => course(cid));
  document.getElementById('my-courses').innerHTML = mine.map((cid) => { const c = course(cid), p = pct(cid); return `<article class="course"><img src="${U(c.img)}" alt="" loading="lazy"><div class="meta">${chip(c.cat)}<h3>${Kit.esc(c.title)}</h3><p class="info">${c.lessons.length} lessons · ${mins(c)} min</p><div class="prog"><div class="track"><i style="width:${p}%"></i></div>${p}%</div><button class="btn ${p === 100 ? 'soft' : ''}" data-go="${cid}">${p === 100 ? 'View certificate' : p ? 'Continue' : 'Start course'}</button></div></article>`; }).join('');
}
document.getElementById('my-courses').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (!b) return; if (pct(b.dataset.go) === 100) certificate(b.dataset.go); else openCourse(b.dataset.go); });

/* ---------- Catalog ---------- */
let cat = 'All';
function renderCatalog() {
  document.getElementById('cats').innerHTML = ['All', ...Object.keys(CAT)].map((c) => `<button class="pill" aria-pressed="${c === cat}" data-c="${c}">${c}</button>`).join('');
  const q = document.getElementById('cq').value.toLowerCase(), lvl = document.getElementById('lvl').value;
  document.getElementById('catalog').innerHTML = S.courses.filter((c) => c.published && (cat === 'All' || c.cat === cat) && (lvl === 'all' || c.level === lvl) && c.title.toLowerCase().includes(q)).map((c) => {
    const on = S.enrolled[c.id];
    return `<article class="course"><img src="${U(c.img)}" alt="" loading="lazy"><div class="meta">${chip(c.cat)}<h3>${Kit.esc(c.title)}</h3><p class="info">${c.level} · ${c.lessons.length} lessons · ${mins(c)} min</p>${on ? `<div class="prog"><div class="track"><i style="width:${pct(c.id)}%"></i></div>${pct(c.id)}%</div>` : ''}<button class="btn ${on ? 'soft' : ''}" data-enroll="${c.id}">${on ? 'Go to course' : 'Enroll for free'}</button></div></article>`;
  }).join('') || '<p class="kit-empty-state">No courses match your search.</p>';
}
document.getElementById('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; renderCatalog(); } });
document.getElementById('cq').addEventListener('input', renderCatalog);
document.getElementById('lvl').addEventListener('change', renderCatalog);
function enroll(id) { if (S.enrolled[id]) return; S.enrolled[id] = { done: [], notes: {}, scores: {}, last: course(id).lessons[0].id, since: Date.now() }; Kit.notify(db, `${LEARNER.name} enrolled in “${course(id).title}”`); Kit.toast(`Enrolled in ${course(id).title}`, { type: 'success' }); }
document.getElementById('catalog').addEventListener('click', (e) => { const b = e.target.closest('[data-enroll]'); if (!b) return; enroll(b.dataset.enroll); openCourse(b.dataset.enroll); });

/* ---------- Player ---------- */
let timer = null;
function openCourse(cid, lid) { S.current = cid; if (lid) S.enrolled[cid].last = lid; save(); location.hash = '#/learn'; renderLesson(); }
function renderLesson() {
  clearInterval(timer);
  const cid = S.current && S.enrolled[S.current] && course(S.current) ? S.current : Object.keys(S.enrolled).find((x) => course(x));
  if (!cid) { document.getElementById('lesson').innerHTML = '<p class="kit-empty-state">Enroll in a course to start learning.</p>'; document.getElementById('outline').innerHTML = ''; return; }
  const c = course(cid), e = S.enrolled[cid], idx = Math.max(0, c.lessons.findIndex((l) => l.id === e.last)), l = c.lessons[idx], done = e.done.includes(l.id);
  S.current = cid;
  document.getElementById('outline').innerHTML = `<h3>${Kit.esc(c.title)}</h3><div class="prog"><div class="track"><i style="width:${pct(cid)}%"></i></div>${pct(cid)}%</div><ol>${c.lessons.map((x, i) => `<li><button data-l="${x.id}" aria-current="${x.id === l.id}"><span class="tick ${e.done.includes(x.id) ? 'done' : ''}">${e.done.includes(x.id) ? '✓' : i + 1}</span><span>${Kit.esc(x.title)}<br><small>${x.type === 'quiz' ? '📝 Quiz' : x.type === 'video' ? '▶ Video' : '📖 Reading'} · ${x.mins} min</small></span></button></li>`).join('')}</ol>`;
  let media = '';
  if (l.type === 'video') media = `<div class="video"><img src="${U(c.img, 1000, 560)}" alt=""><button class="play" id="play" aria-label="Play lesson video">▶</button><div class="vbar"><button id="pp" aria-label="Play or pause">▶</button><div class="track" id="seek" role="slider" aria-label="Video progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><i id="vprog" style="width:${done ? 100 : 0}%"></i></div><span id="vtime">0:00 / ${l.mins}:00</span><button id="speed">1×</button></div></div>`;
  const content = l.type === 'quiz' ? quizHTML(l, e.scores[l.id]) : `<div class="text">${l.type === 'video' ? `<p>${l.body}</p>` : l.body}</div>`;
  document.getElementById('lesson').innerHTML = `<p class="crumbs"><a href="#/home">My learning</a> › ${Kit.esc(c.title)} › Lesson ${idx + 1} of ${c.lessons.length}</p>${media}<h1>${Kit.esc(l.title)}</h1>${content}
    ${l.type !== 'quiz' ? `<div class="notes" style="margin-top:20px"><label class="kit-label" for="note">My notes · saved automatically</label><textarea id="note" placeholder="Write down what you want to remember…">${Kit.esc(e.notes[l.id] || '')}</textarea></div>` : ''}
    <div class="lesson-foot"><button class="btn soft" id="prev" ${idx === 0 ? 'disabled' : ''}>← Previous</button>${l.type !== 'quiz' ? `<button class="btn" id="complete" ${!done && l.type === 'video' ? 'disabled title="Watch the video first"' : ''}>${done ? 'Next lesson →' : 'Mark complete +50 XP'}</button>` : ''}</div>
    <div class="qa" id="qa"></div>`;
  const go = (d) => { e.last = c.lessons[Math.min(c.lessons.length - 1, Math.max(0, idx + d))].id; save(); renderLesson(); };
  document.getElementById('prev').onclick = () => go(-1);
  const comp = document.getElementById('complete');
  if (comp) comp.onclick = () => { if (!e.done.includes(l.id)) complete(cid, l.id, 50); if (idx < c.lessons.length - 1) go(1); else renderLesson(); };
  const note = document.getElementById('note');
  if (note) note.addEventListener('input', () => { e.notes[l.id] = note.value; save(); });
  if (l.type === 'video') video(l, done, comp);
  if (l.type === 'quiz') quiz(cid, l);
  renderQA();
}
// Questions & answers for the current lesson — redrawn on live updates without restarting the video
function renderQA() {
  const box = document.getElementById('qa'); if (!box) return;
  const c = course(S.current); if (!c) return; const l = c.lessons.find((x) => x.id === S.enrolled[S.current].last) || c.lessons[0];
  const list = S.questions.filter((q) => q.lesson === l.id).sort((a, b) => a.ts - b.ts);
  const draft = box.querySelector('#ask')?.value || '';
  box.innerHTML = `<h3>Questions about this lesson</h3>${list.map((q) => `<div class="qa-item ${q.by === LEARNER.name ? 'mine' : ''}"><p><b>${Kit.esc(q.by === LEARNER.name ? 'You' : q.by)}</b> · ${Kit.ago(q.ts)}</p><p>${Kit.esc(q.text)}</p>${q.answer ? `<p class="ans"><b>Instructor:</b> ${Kit.esc(q.answer)}</p>` : '<p class="wait">Waiting for the instructor…</p>'}</div>`).join('') || '<p class="kit-hint">No questions yet — ask the first one.</p>'}
    <form class="ask" id="ask-form"><label class="kit-label" for="ask">Ask the instructor</label><textarea id="ask" rows="2" placeholder="What's unclear?">${Kit.esc(draft)}</textarea><button class="btn" type="submit">Post question</button></form>`;
  if (list.some((q) => q.by === LEARNER.name && q.answer && !q.seen)) { list.forEach((q) => { if (q.by === LEARNER.name && q.answer) q.seen = true; }); save(); renderHome(); renderMyQs(); }
  box.querySelector('#ask-form').addEventListener('submit', (ev) => {
    ev.preventDefault(); const t = box.querySelector('#ask').value.trim(); if (!t) { box.querySelector('#ask').focus(); return; }
    S.questions.push({ id: Kit.uid(), course: c.id, lesson: l.id, by: LEARNER.name, text: t, ts: Date.now(), answer: '' });
    Kit.notify(db, `New question on “${l.title}” from ${LEARNER.name}`, { q: S.questions[S.questions.length - 1].id });
    box.querySelector('#ask').value = ''; renderQA(); renderMyQs(); Kit.toast('Question posted — you\'ll get a notification when it\'s answered', { type: 'success' });
  });
}
function video(l, done, comp) {
  let pos = done ? 100 : 0, speed = 1, playing = false;
  const total = l.mins * 60, prog = document.getElementById('vprog'), time = document.getElementById('vtime'), pp = document.getElementById('pp'), big = document.getElementById('play');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const draw = () => { prog.style.width = pos + '%'; time.textContent = `${fmt(total * pos / 100)} / ${fmt(total)}`; document.getElementById('seek').setAttribute('aria-valuenow', Math.round(pos)); pp.textContent = playing ? '❚❚' : '▶'; big.hidden = playing || pos > 0; if (pos >= 100 && comp) { comp.disabled = false; comp.removeAttribute('title'); } };
  const toggle = () => { playing = !playing; clearInterval(timer); if (playing) timer = setInterval(() => { pos = Math.min(100, pos + 0.5 * speed); if (pos >= 100) { playing = false; clearInterval(timer); Kit.toast('Video finished — mark the lesson complete'); } draw(); }, 50); draw(); };
  big.onclick = toggle; pp.onclick = toggle;
  document.getElementById('speed').onclick = (e) => { speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; e.target.textContent = speed + '×'; };
  const seek = document.getElementById('seek');
  seek.onclick = (e) => { const r = seek.getBoundingClientRect(); pos = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)); draw(); };
  seek.onkeydown = (e) => { if (e.key === 'ArrowRight') pos = Math.min(100, pos + 5); if (e.key === 'ArrowLeft') pos = Math.max(0, pos - 5); draw(); };
  draw();
}
function quizHTML(l, prev) { return `<p style="color:var(--muted);margin-bottom:14px">${l.quiz.length} questions · pass with 70% or more to earn 100 XP.${prev != null ? ` Your best score: <b>${prev}%</b>` : ''}</p><form id="quiz">${l.quiz.map((q, i) => `<fieldset class="q" style="border:0"><b>${i + 1}. ${Kit.esc(q.q)}</b>${q.o.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}">${Kit.esc(o)}</label>`).join('')}</fieldset>`).join('')}<div class="lesson-foot"><span></span><button class="btn" type="submit">Check answers</button></div><div id="qres" aria-live="polite"></div></form>`; }
function quiz(cid, l) {
  const f = document.getElementById('quiz'), e = S.enrolled[cid];
  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (l.quiz.some((_, i) => !f.querySelector(`[name=q${i}]:checked`))) { Kit.toast('Answer every question first', { type: 'error' }); return; }
    let right = 0;
    l.quiz.forEach((q, i) => { f.querySelectorAll(`[name=q${i}]`).forEach((inp) => { const lab = inp.closest('label'); lab.classList.remove('right', 'wrong'); if (+inp.value === q.a) lab.classList.add('right'); else if (inp.checked) lab.classList.add('wrong'); }); if (+f.querySelector(`[name=q${i}]:checked`).value === q.a) right++; });
    const score = Math.round(right / l.quiz.length * 100), pass = score >= 70;
    e.scores[l.id] = Math.max(score, e.scores[l.id] || 0);
    if (pass && !e.done.includes(l.id)) complete(cid, l.id, 100);
    save();
    document.getElementById('qres').innerHTML = `<p class="score" style="background:${pass ? '#DDF6EE' : '#FFE1E6'}">${pass ? '🎉 Passed' : 'Not quite'} — ${right}/${l.quiz.length} correct (${score}%)</p><div class="lesson-foot"><button type="button" class="btn soft" id="retry">Try again</button>${pass ? `<button type="button" class="btn" id="qnext">${pct(cid) === 100 ? 'Get my certificate 🎓' : 'Continue'}</button>` : ''}</div>`;
    document.getElementById('retry').onclick = renderLesson;
    const qn = document.getElementById('qnext'); if (qn) qn.onclick = () => { if (pct(cid) === 100) certificate(cid); else { const c = course(cid), nxt = c.lessons.find((x) => !e.done.includes(x.id)); if (nxt) e.last = nxt.id; save(); renderLesson(); } };
  });
}
function complete(cid, lid, xp) {
  const e = S.enrolled[cid]; e.done.push(lid); S.xp += xp;
  const k = Kit.iso(new Date()); S.log[k] = (S.log[k] || 0) + 1; save(); renderAll();
  Kit.toast(`+${xp} XP · lesson complete`, { type: 'success' });
  if (pct(cid) === 100) { Kit.notify(db, `🎓 ${LEARNER.name} completed “${course(cid).title}”`); setTimeout(() => certificate(cid), 400); }
}
document.getElementById('outline').addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) { S.enrolled[S.current].last = b.dataset.l; save(); renderLesson(); } });

function certificate(cid) {
  const c = course(cid);
  Kit.modal({ title: 'Certificate of completion', wide: true, body: `<div class="cert"><span style="font-size:42px">🎓</span><p style="letter-spacing:.2em;text-transform:uppercase;font-weight:700">Brightpath Academy certifies that</p><span class="name">${LEARNER.name}</span><p>has successfully completed</p><h2>${Kit.esc(c.title)}</h2><p class="kit-hint">${c.lessons.length} lessons · issued ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · ID BP-${cid.toUpperCase()}-${Date.now().toString(36).slice(-5).toUpperCase()}</p></div>`,
    actions: [{ label: 'Print / save as PDF', onClick: () => { window.print(); return false; } }, { label: 'Share on LinkedIn', onClick: () => { Kit.toast('Certificate link copied for LinkedIn'); return false; } }, { label: 'Done', primary: true }] });
}

/* ---------- Progress ---------- */
const BADGES = [['🔥', 'Streak 7', () => streak() >= 7], ['📚', 'First course', () => Object.keys(S.enrolled).some((c) => pct(c) === 100)], ['⚡', '1,000 XP', () => S.xp >= 1000], ['🧠', 'Quiz ace', () => Object.values(S.enrolled).some((e) => Object.values(e.scores).some((s) => s === 100))], ['🗓️', 'Goal crusher', () => weekDone() >= S.goal], ['🚀', '3 courses', () => Object.keys(S.enrolled).length >= 3]];
function renderProgress() {
  const cells = []; for (let d = 34; d >= 0; d--) { const n = S.log[Kit.iso(Kit.addDays(new Date(), -d))] || 0; cells.push(`<span class="${n >= 3 ? 'l3' : n === 2 ? 'l2' : n ? 'l1' : ''}" title="${Kit.day(Kit.addDays(new Date(), -d))}: ${n} lessons"></span>`); }
  document.getElementById('heat').innerHTML = cells.join('');
  document.getElementById('goal').innerHTML = [3, 5, 7, 10].map((g) => `<button class="pill" aria-pressed="${g === S.goal}" data-g="${g}">${g} / week</button>`).join('');
  const wd = weekDone(); document.getElementById('goal-txt').textContent = `${wd} of ${S.goal} lessons this week`; document.getElementById('goal-bar').style.width = Math.min(100, wd / S.goal * 100) + '%';
  document.getElementById('badges').innerHTML = BADGES.map(([i, n, ok]) => `<div style="text-align:center;font-size:12px;font-weight:700"><div class="badge ${ok() ? 'on' : ''}" title="${n}">${i}</div>${n}</div>`).join('');
  const done = Object.keys(S.enrolled).filter((c) => course(c) && pct(c) === 100);
  document.getElementById('certs').innerHTML = done.length ? done.map((c) => `<button class="btn soft" data-cert="${c}" style="margin:0 8px 8px 0">🎓 ${Kit.esc(course(c).title)}</button>`).join('') : '<p style="color:var(--muted)">Finish a course to earn your first certificate.</p>';
}
document.getElementById('goal').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) { S.goal = +b.dataset.g; save(); renderAll(); } });
document.getElementById('certs').addEventListener('click', (e) => { const b = e.target.closest('[data-cert]'); if (b) certificate(b.dataset.cert); });

/* ---------- My questions ---------- */
function renderMyQs() {
  const mine = S.questions.filter((q) => q.by === LEARNER.name).sort((a, b) => b.ts - a.ts), unseen = mine.filter((q) => q.answer && !q.seen).length;
  const n = document.getElementById('qa-n'); n.hidden = !unseen; n.textContent = unseen;
  document.getElementById('my-qs').innerHTML = mine.map((q) => { const c = course(q.course), l = c && c.lessons.find((x) => x.id === q.lesson); return `<div class="qa-item mine"><p><b>${c ? Kit.esc(c.title) : 'Course'}</b> · ${l ? Kit.esc(l.title) : ''} · ${Kit.ago(q.ts)}</p><p>${Kit.esc(q.text)}</p>${q.answer ? `<p class="ans"><b>Instructor:</b> ${Kit.esc(q.answer)}</p>` : '<p class="wait">Waiting for the instructor…</p>'}${c && l ? `<button class="btn soft" data-open="${q.course}" data-lesson="${q.lesson}">Open lesson</button>` : ''}</div>`; }).join('')
    || '<p class="kit-empty-state">You haven\'t asked anything yet. Every lesson has an “Ask the instructor” box at the bottom.</p>';
}
document.getElementById('my-qs').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) { enroll(b.dataset.open); openCourse(b.dataset.open, b.dataset.lesson); } });

function renderAll() { renderHome(); renderCatalog(); renderProgress(); renderMyQs(); }
let answered = S.questions.filter((q) => q.answer).length, announced = S.announcements.length;
Kit.sync(db, () => {
  renderAll();
  if (!document.querySelector('[data-view=learn]').hidden) { const c = course(S.current); if (!c || !S.enrolled[S.current]) renderLesson(); else { renderQA(); } }
  const a = S.questions.filter((q) => q.answer).length;
  if (a > answered && S.questions.some((q) => q.by === LEARNER.name && q.answer && !q.seen)) Kit.toast('💬 Your instructor answered your question', { type: 'success', ms: 6000 });
  if (S.announcements.length > announced) Kit.toast(`📣 ${S.announcements[S.announcements.length - 1].text}`, { ms: 7000 });
  answered = a; announced = S.announcements.length;
});
renderAll();
const router = Kit.router('home', (v) => { if (v === 'learn') renderLesson(); else clearInterval(timer); if (v === 'questions') { S.questions.forEach((q) => { if (q.by === LEARNER.name && q.answer) q.seen = true; }); save(); renderAll(); } });
document.getElementById('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores courses, progress and questions for both the learner app and instructor studio.', 'Reset')) db.reset(); });
Kit.key('l', () => router.go('learn'), 'Continue lesson');
Kit.key('b', () => router.go('catalog'), 'Browse courses');
Kit.commands([{ label: 'Continue my lesson', hint: 'L', run: () => router.go('learn') }, { label: 'Browse courses', hint: 'B', run: () => router.go('catalog') }, { label: 'View progress & badges', run: () => router.go('progress') }, { label: 'My questions', run: () => router.go('questions') }, { label: 'Instructor sign-in', run: () => { location.href = 'academy-admin.html'; } },
  ...S.courses.filter((c) => c.published).map((c) => ({ label: `Open course: ${c.title}`, run: () => { enroll(c.id); openCourse(c.id); } }))]);
