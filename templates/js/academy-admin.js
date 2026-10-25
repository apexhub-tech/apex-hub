/* Brightpath Studio — instructor side: overview, courses & lessons, learners, Q&A and announcements.
   Shares its saved data with the learner app (js/academy-data.js) and updates live when learners enrol, finish lessons or ask questions. */
(() => {
  const $ = (id) => document.getElementById(id);
  Kit.login({ app: 'Brightpath Studio', key: 'brightpath', email: 'coach@brightpath.academy', password: 'demo1234', name: 'Layla Haddad', role: 'Lead instructor', accent: '#6C4DF6', clientUrl: 'academy.html', clientLabel: 'learner app' });
  const bell = Kit.bell($('tools'), db, { onOpen: (n) => router.go(n.q ? 'qa' : 'overview') });
  Kit.userMenu($('tools'), { key: 'brightpath', clientUrl: 'academy.html', clientLabel: 'learner app' });
  $('hello').textContent = Kit.user.name.split(' ')[0];

  // Everyone who learns here: the seeded learners plus the signed-in learner from the app
  const learners = () => [...S.students.map((s) => ({ ...s, progress: Object.fromEntries(Object.entries(s.prog).map(([c, n]) => [c, course(c) ? Math.min(100, Math.round(n / course(c).lessons.length * 100)) : 0])) })),
    { id: 'me', name: LEARNER.name, email: LEARNER.email, joined: Date.now() - 60 * 864e5, active: Math.max(0, ...Object.keys(S.log).map((d) => new Date(d + 'T12:00').getTime())), progress: Object.fromEntries(Object.keys(S.enrolled).filter((c) => course(c)).map((c) => [c, pct(c)])), live: true }];

  /* ---------- Overview ---------- */
  function renderOverview() {
    const ls = learners(), enrols = ls.flatMap((l) => Object.values(l.progress)), open = S.questions.filter((q) => !q.answer).length;
    $('k-learners').textContent = ls.length; $('k-new').textContent = `${ls.filter((l) => l.joined > Date.now() - 30 * 864e5).length} new this month`;
    $('k-enrol').textContent = enrols.length; $('k-comp').textContent = enrols.length ? Math.round(enrols.filter((p) => p === 100).length / enrols.length * 100) + '%' : '—';
    $('k-qa').textContent = open; $('n-qa').hidden = !open; $('n-qa').textContent = open;
    Kit.bars($('ch-enrol'), S.courses.map((c) => ({ label: c.title.split(' ')[0], value: ls.filter((l) => c.id in l.progress).length })));
    $('feed').innerHTML = S.notes.slice().reverse().slice(0, 7).map((n) => `<li><span>🎓</span><div>${Kit.esc(n.text)}<small>${Kit.ago(n.ts)}</small></div></li>`).join('') || '<li>No learner activity yet — enrolments, completions and questions show up here live.</li>';
  }

  /* ---------- Courses ---------- */
  function renderCourses() {
    const ls = learners();
    $('c-grid').innerHTML = S.courses.map((c) => `<article class="adm-card cc ${c.published ? '' : 'draft'}" data-c="${c.id}"><img src="${U(c.img, 480, 260)}" alt=""><div class="cc-body">${chip(c.cat)}<h3>${Kit.esc(c.title)}</h3><p>${c.level} · ${c.lessons.length} lessons · ${mins(c)} min · ${ls.filter((l) => c.id in l.progress).length} learners</p>
      <label class="pub"><input type="checkbox" class="adm-switch" data-pub ${c.published ? 'checked' : ''}> ${c.published ? 'Published' : 'Draft — hidden from learners'}</label>
      <div class="adm-tools"><button class="adm-btn" data-edit>Edit lessons</button></div></div></article>`).join('');
  }
  $('c-grid').addEventListener('change', (e) => { if (!e.target.matches('[data-pub]')) return; const c = course(e.target.closest('[data-c]').dataset.c); c.published = e.target.checked; save(); renderAll(); Kit.toast(c.published ? `“${c.title}” is live in the learner app` : `“${c.title}” hidden from the catalog`, { type: 'success' }); });
  $('c-grid').addEventListener('click', (e) => { if (e.target.closest('[data-edit]')) editCourse(course(e.target.closest('[data-c]').dataset.c)); });
  function editCourse(c) {
    const draw = (m) => {
      m.querySelector('#le-list').innerHTML = c.lessons.map((l, i) => `<li data-l="${l.id}"><span class="num">${i + 1}</span><span class="grow"><b>${Kit.esc(l.title)}</b><small>${l.type} · ${l.mins} min</small></span><button type="button" class="adm-link" data-up ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button type="button" class="adm-link" data-down ${i === c.lessons.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button type="button" class="adm-link" data-del aria-label="Delete lesson" style="color:#C53030">✕</button></li>`).join('');
    };
    Kit.modal({ title: 'Edit course', wide: true, body: `<div class="kit-row"><div class="kit-field"><label for="ce-t">Title</label><input id="ce-t" value="${Kit.esc(c.title)}"></div><div class="kit-field"><label for="ce-l">Level</label><select id="ce-l"><option ${c.level === 'Beginner' ? 'selected' : ''}>Beginner</option><option ${c.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option></select></div></div>
      <span class="kit-label">Lessons</span><ol class="le-list" id="le-list"></ol>
      <div class="kit-row" style="grid-template-columns:1fr 120px 90px auto;align-items:end"><div class="kit-field"><label for="nl-t">New lesson</label><input id="nl-t" placeholder="Lesson title"></div><div class="kit-field"><label for="nl-y">Type</label><select id="nl-y"><option value="video">Video</option><option value="reading">Reading</option></select></div><div class="kit-field"><label for="nl-m">Minutes</label><input id="nl-m" type="number" min="1" value="8"></div><button type="button" class="kit-btn primary" id="nl-add">Add</button></div>`,
      onOpen: (m) => {
        draw(m);
        m.querySelector('#le-list').addEventListener('click', (e) => {
          const li = e.target.closest('[data-l]'); if (!li) return; const i = c.lessons.findIndex((l) => l.id === li.dataset.l);
          if (e.target.closest('[data-up]') && i > 0) [c.lessons[i - 1], c.lessons[i]] = [c.lessons[i], c.lessons[i - 1]];
          if (e.target.closest('[data-down]') && i < c.lessons.length - 1) [c.lessons[i + 1], c.lessons[i]] = [c.lessons[i], c.lessons[i + 1]];
          if (e.target.closest('[data-del]')) { if (c.lessons.length === 1) { Kit.toast('A course needs at least one lesson', { type: 'error' }); return; } c.lessons.splice(i, 1); }
          save(); draw(m); renderAll();
        });
        m.querySelector('#nl-add').addEventListener('click', () => {
          const t = m.querySelector('#nl-t').value.trim(); if (!t) { m.querySelector('#nl-t').focus(); return; }
          const type = m.querySelector('#nl-y').value;
          c.lessons.push({ id: c.id + 'l' + Kit.uid().slice(0, 5), title: t, mins: +m.querySelector('#nl-m').value || 5, type, body: type === 'reading' ? '<p>Lesson notes coming soon.</p>' : 'Video lesson.' });
          m.querySelector('#nl-t').value = ''; save(); draw(m); renderAll(); Kit.toast('Lesson added — learners see it now', { type: 'success' });
        });
      },
      actions: [{ label: 'Close' }, { label: 'Save details', primary: true, onClick: (m) => { c.title = m.querySelector('#ce-t').value.trim() || c.title; c.level = m.querySelector('#ce-l').value; save(); renderAll(); Kit.toast('Course saved', { type: 'success' }); } }] });
  }
  const newCourse = () => Kit.modal({ title: 'New course', body: `<div class="kit-field"><label for="nc-t">Title</label><input id="nc-t" required placeholder="e.g. Running Meta ads on a small budget"></div><div class="kit-row"><div class="kit-field"><label for="nc-c">Category</label><select id="nc-c">${Object.keys(CAT).map((k) => `<option>${k}</option>`).join('')}</select></div><div class="kit-field"><label for="nc-l">Level</label><select id="nc-l"><option>Beginner</option><option>Intermediate</option></select></div></div><p class="kit-hint">It starts as a draft so you can add lessons before publishing.</p>`,
    onOpen: (m) => m.querySelector('#nc-t').focus(),
    actions: [{ label: 'Cancel' }, { label: 'Create draft', primary: true, submit: true, onClick: (m) => { const id = 'c' + Kit.uid().slice(0, 6); const c = { id, title: m.querySelector('#nc-t').value.trim(), cat: m.querySelector('#nc-c').value, level: m.querySelector('#nc-l').value, img: IMGS[S.courses.length % IMGS.length], published: false, lessons: [{ id: id + 'l0', title: 'Welcome & course overview', mins: 4, type: 'video', body: 'What you\'ll learn in this course.' }] }; S.courses.push(c); save(); renderAll(); router.go('courses'); setTimeout(() => editCourse(c)); } }] });
  $('new-course').onclick = newCourse; $('o-new').onclick = newCourse;

  /* ---------- Learners ---------- */
  function renderLearners() {
    const keep = $('l-course').value;
    $('l-course').innerHTML = '<option value="all">All courses</option>' + S.courses.map((c) => `<option value="${c.id}">${Kit.esc(c.title)}</option>`).join('');
    $('l-course').value = course(keep) ? keep : 'all';
    const cf = $('l-course').value, q = $('q').value.toLowerCase();
    const list = learners().filter((l) => (cf === 'all' || cf in l.progress) && (l.name + l.email).toLowerCase().includes(q)).sort((a, b) => b.active - a.active);
    $('l-sub').textContent = `${list.length} learner${list.length === 1 ? '' : 's'}`;
    $('l-rows').innerHTML = list.map((l) => { const ps = cf === 'all' ? Object.values(l.progress) : [l.progress[cf]], avg = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
      return `<tr><td><b>${Kit.esc(l.name)}</b>${l.live ? ' <span class="adm-pill info">Live demo learner</span>' : ''}<br><small>${Kit.esc(l.email)}</small></td><td>${Object.keys(l.progress).length}</td><td><div class="lp"><i style="width:${avg}%"></i></div><small>${avg}%${ps.filter((p) => p === 100).length ? ` · ${ps.filter((p) => p === 100).length} completed` : ''}</small></td><td>${Kit.day(l.joined)}</td><td>${l.active ? Kit.ago(l.active) : '—'}</td></tr>`; }).join('')
      || '<tr><td colspan="5"><div class="adm-empty">No learners match.</div></td></tr>';
  }
  $('l-course').addEventListener('change', renderLearners);
  $('q').addEventListener('input', () => { if (!location.hash.includes('learners')) router.go('learners'); renderLearners(); });
  $('l-export').onclick = () => Kit.csv('brightpath-learners.csv', [['Name', 'Email', 'Courses', 'Average progress'], ...learners().map((l) => { const ps = Object.values(l.progress); return [l.name, l.email, ps.length, ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) + '%' : '0%']; })]);

  /* ---------- Q&A ---------- */
  let qf = 'open';
  function renderQA() {
    const list = S.questions.filter((q) => (qf === 'open' ? !q.answer : !!q.answer)).sort((a, b) => b.ts - a.ts);
    $('qa-list').innerHTML = list.map((q) => { const c = course(q.course), l = c && c.lessons.find((x) => x.id === q.lesson); return `<article class="adm-card qa-card" data-q="${q.id}"><p class="meta"><b>${Kit.esc(q.by)}</b> · ${c ? Kit.esc(c.title) : ''}${l ? ` › ${Kit.esc(l.title)}` : ''} · ${Kit.ago(q.ts)}</p><p class="qt">${Kit.esc(q.text)}</p>
      ${q.answer ? `<p class="qa-ans"><b>You:</b> ${Kit.esc(q.answer)}</p><button class="adm-link" data-edit>Edit answer</button>` : `<form class="qa-form"><label class="sr" for="a-${q.id}">Your answer</label><textarea id="a-${q.id}" class="adm-field" rows="2" placeholder="Write an answer…"></textarea><button class="adm-btn primary" type="submit">Post answer</button></form>`}</article>`; }).join('')
      || `<div class="adm-card adm-empty">${qf === 'open' ? 'All caught up — no unanswered questions. 🎉' : 'No answered questions yet.'}</div>`;
  }
  $('qa-f').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; qf = b.dataset.f; $('qa-f').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderQA(); });
  $('qa-list').addEventListener('submit', (e) => {
    e.preventDefault(); const card = e.target.closest('[data-q]'), q = S.questions.find((x) => x.id === card.dataset.q), t = card.querySelector('textarea').value.trim();
    if (!t) { card.querySelector('textarea').focus(); return; }
    q.answer = t; q.answeredAt = Date.now(); q.seen = false; save(); renderAll(); Kit.toast(`Answer posted — ${q.by} is notified`, { type: 'success' });
  });
  $('qa-list').addEventListener('click', (e) => { if (!e.target.closest('[data-edit]')) return; const q = S.questions.find((x) => x.id === e.target.closest('[data-q]').dataset.q);
    Kit.modal({ title: 'Edit answer', body: `<div class="kit-field"><label for="ea">Answer</label><textarea id="ea">${Kit.esc(q.answer)}</textarea></div>`, actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: (m) => { q.answer = m.querySelector('#ea').value.trim() || q.answer; save(); renderAll(); } }] }); });

  /* ---------- Announcements ---------- */
  function renderAnnounce() {
    $('an-list').innerHTML = S.announcements.slice().reverse().map((a) => `<li><span>📣</span><div>${Kit.esc(a.text)}<small>${Kit.ago(a.ts)}</small></div><button class="adm-link" data-del="${a.id}">Delete</button></li>`).join('') || '<li>No announcements yet.</li>';
  }
  $('an-form').addEventListener('submit', (e) => { e.preventDefault(); const t = $('an-text').value.trim(); if (!t) { $('an-text').focus(); return; } S.announcements.push({ id: Kit.uid(), text: t, ts: Date.now() }); $('an-text').value = ''; save(); renderAll(); Kit.toast('Posted — it\'s on every learner\'s home screen', { type: 'success' }); });
  $('an-list').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (!b) return; const i = S.announcements.findIndex((a) => a.id === b.dataset.del), old = S.announcements[i]; S.announcements.splice(i, 1); save(); renderAll(); Kit.toast('Announcement removed', { undo: () => { S.announcements.splice(i, 0, old); save(); renderAll(); } }); });

  function renderAll() { renderOverview(); renderCourses(); renderLearners(); renderQA(); renderAnnounce(); }
  Kit.sync(db, () => { renderAll(); bell.refresh(); });
  renderAll();
  const router = Kit.router('overview');
  $('reset').addEventListener('click', async () => { if (await Kit.confirm('Reset demo?', 'Restores courses, learners and questions for both the studio and learner app.', 'Reset')) db.reset(); });
  Kit.key('/', () => $('q').focus(), 'Search learners');
  Kit.commands([{ label: 'Overview', run: () => router.go('overview') }, { label: 'Courses', run: () => router.go('courses') }, { label: 'New course', run: newCourse }, { label: 'Learners', run: () => router.go('learners') }, { label: 'Answer questions', run: () => router.go('qa') }, { label: 'Post an announcement', run: () => { router.go('announce'); setTimeout(() => $('an-text').focus()); } }, { label: 'Open learner app', run: () => window.open('academy.html', '_blank') }, { label: 'Sign out', run: () => Kit.signOut('brightpath') }]);
})();
