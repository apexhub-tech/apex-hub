/* Apex Hub app kit — shared building blocks for the SaaS templates.
   Saved data (localStorage), router, modals, confirm, toasts with undo,
   command palette (Ctrl/⌘+K), keyboard shortcuts, CSV + calendar export and small SVG charts.
   Each app themes it through the --kit-* CSS variables (see app-kit.css). */
(function () {
  const THUMB = location.search.includes('thumb');
  const Kit = { THUMB };

  Kit.uid = () => Math.random().toString(36).slice(2, 9);
  Kit.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Kit.money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  Kit.num = (n) => new Intl.NumberFormat('en-US').format(n || 0);
  Kit.day = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  Kit.time = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  Kit.ago = (ts) => {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  };
  Kit.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  Kit.iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  /* ---------- Saved data ---------- */
  // Returns { data, save(), reset() }. Previews (?thumb) always use fresh seed data and never write.
  Kit.store = (key, seed) => {
    const k = 'apexhub:' + key;
    let data = null;
    if (!THUMB) { try { data = JSON.parse(localStorage.getItem(k)); } catch (e) { data = null; } }
    const fresh = !data;
    if (fresh) data = seed();
    const api = {
      key: k, data,
      save() { if (THUMB) return; try { localStorage.setItem(k, JSON.stringify(data)); } catch (e) { /* storage blocked: keep working in memory */ } },
      reset() { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } location.hash = ''; location.reload(); },
    };
    // Save seed data straight away so a client page and its admin page (other tab) share the same records
    if (fresh) api.save();
    return api;
  };

  /* ---------- Live sync between tabs (client site ↔ admin panel) ---------- */
  // When another tab saves the same store, refresh this tab's data in place and call onChange.
  Kit.sync = (db, onChange) => {
    if (THUMB) return;
    window.addEventListener('storage', (e) => {
      if (e.key !== db.key || e.newValue == null) return;
      let next; try { next = JSON.parse(e.newValue); } catch (er) { return; }
      Object.keys(db.data).forEach((key) => { delete db.data[key]; });
      Object.assign(db.data, next);
      onChange && onChange();
    });
  };

  /* ---------- Notifications (client actions → admin bell) ---------- */
  Kit.notify = (db, text, extra = {}) => {
    db.data.notes = db.data.notes || [];
    db.data.notes.push({ id: Kit.uid(), text, ts: Date.now(), read: false, ...extra });
    if (db.data.notes.length > 60) db.data.notes.splice(0, db.data.notes.length - 60);
    db.save();
  };
  // Bell button with unread badge and dropdown. Call .refresh() after data changes; new notes also toast.
  Kit.bell = (mount, db, { onOpen } = {}) => {
    const wrap = document.createElement('div');
    wrap.className = 'kit-bell';
    wrap.innerHTML = `<button type="button" class="kit-bell-btn" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><b hidden></b></button>
      <div class="kit-bell-panel" hidden><header><b>Notifications</b><button type="button" class="kit-reset" data-all>Mark all read</button></header><ul></ul></div>`;
    mount.appendChild(wrap);
    const btn = wrap.querySelector('.kit-bell-btn'), panel = wrap.querySelector('.kit-bell-panel'), badge = btn.querySelector('b');
    let seen = new Set((db.data.notes || []).map((n) => n.id));
    const render = () => {
      const notes = (db.data.notes || []).slice().reverse(), unread = notes.filter((n) => !n.read).length;
      badge.hidden = !unread; badge.textContent = unread > 9 ? '9+' : unread;
      btn.setAttribute('aria-label', `Notifications, ${unread} unread`);
      panel.querySelector('ul').innerHTML = notes.slice(0, 20).map((n) => `<li class="${n.read ? '' : 'unread'}" data-id="${n.id}"><span>${Kit.esc(n.text)}</span><small>${Kit.ago(n.ts)}</small></li>`).join('') || '<li class="kit-empty-state">You\'re all caught up.</li>';
    };
    const refresh = () => {
      (db.data.notes || []).forEach((n) => { if (!seen.has(n.id)) { seen.add(n.id); Kit.toast(`🔔 ${n.text}`, { ms: 6000 }); } });
      render();
    };
    const toggle = (open) => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => toggle(panel.hidden));
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) toggle(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { toggle(false); btn.focus(); } });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-all]')) { (db.data.notes || []).forEach((n) => { n.read = true; }); db.save(); render(); return; }
      const li = e.target.closest('li[data-id]'); if (!li) return;
      const n = db.data.notes.find((x) => x.id === li.dataset.id); n.read = true; db.save(); render(); toggle(false);
      onOpen && onOpen(n);
    });
    render();
    return { refresh };
  };

  /* ---------- Demo staff sign-in for admin panels ---------- */
  // Shows a sign-in screen until the demo credentials are entered. Previews (?thumb) skip it.
  // Pass verify(email, password) → token or null to check against a server instead (it throws when the
  // server can't be reached). Returns a promise of the saved token once signed in.
  const authKey = (key) => 'apexhub-auth:' + key;
  Kit.authToken = (key) => { try { return sessionStorage.getItem(authKey(key)) || localStorage.getItem(authKey(key)); } catch (e) { return null; } };
  Kit.clearAuth = (key) => { try { sessionStorage.removeItem(authKey(key)); localStorage.removeItem(authKey(key)); } catch (e) { /* ignore */ } };
  Kit.login = ({ app, key, email, password, name, role, accent, clientUrl, clientLabel = 'client site', verify }) => new Promise((resolve) => {
    const store = authKey(key);
    Kit.user = { name, role, email };
    if (THUMB) { resolve(''); return; }
    if (Kit.authToken(key)) { resolve(Kit.authToken(key)); return; }
    document.documentElement.classList.add('kit-locked');
    const o = document.createElement('div');
    o.className = 'kit-login';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'kit-login-h');
    o.innerHTML = `<form class="kit-login-card" novalidate>
      <span class="kit-login-logo" style="background:${accent || 'var(--kit-accent)'}">${Kit.esc(app[0])}</span>
      <h1 id="kit-login-h">Sign in to ${Kit.esc(app)}</h1><p>Staff &amp; admin access</p>
      <div class="kit-field"><label for="kl-e">Work email</label><input id="kl-e" type="email" autocomplete="username" required></div>
      <div class="kit-field"><label for="kl-p">Password</label><div class="kit-pw"><input id="kl-p" type="password" autocomplete="current-password" required><button type="button" class="kit-reset" id="kl-show" aria-label="Show password">Show</button></div></div>
      <p class="kit-login-err" id="kl-err" role="alert"></p>
      <label class="kit-check"><input type="checkbox" id="kl-r"> Keep me signed in on this device</label>
      <button class="kit-btn primary" type="submit">Sign in</button>
      ${password ? `<div class="kit-login-demo"><b>Demo account</b><span>${Kit.esc(email)} · ${Kit.esc(password)}</span><button type="button" class="kit-btn" id="kl-demo">Use demo account</button></div>` : ''}
      <p class="kit-login-foot"><button type="button" class="kit-reset" id="kl-forgot">Forgot password?</button>${clientUrl ? ` · <a href="${clientUrl}">Go to the ${Kit.esc(clientLabel)}</a>` : ''}</p>
    </form>`;
    document.body.appendChild(o);
    const f = o.querySelector('form'), e = o.querySelector('#kl-e'), p = o.querySelector('#kl-p'), err = o.querySelector('#kl-err');
    e.focus();
    o.querySelector('#kl-show').onclick = (ev) => { const show = p.type === 'password'; p.type = show ? 'text' : 'password'; ev.target.textContent = show ? 'Hide' : 'Show'; };
    if (password) o.querySelector('#kl-demo').onclick = () => { e.value = email; p.value = password; f.requestSubmit(); };
    o.querySelector('#kl-forgot').onclick = () => Kit.toast(verify ? 'Ask the account owner to reset your password on the server.' : 'In a live app this emails a reset link. Use the demo account below.');
    const go = o.querySelector('button[type="submit"]');
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      let token = '1';
      if (verify) {
        go.disabled = true; err.textContent = '';
        try { token = await verify(e.value.trim().toLowerCase(), p.value); } catch (er) { token = undefined; }
        go.disabled = false;
        if (token === undefined) { err.textContent = 'Couldn\'t reach the server. Check it\'s running, then try again.'; return; }
      } else if (e.value.trim().toLowerCase() !== email || p.value !== password) token = null;
      if (!token) { err.textContent = `That email and password don't match.${password ? ' Try the demo account below.' : ''}`; p.select(); return; }
      try { (o.querySelector('#kl-r').checked ? localStorage : sessionStorage).setItem(store, token); } catch (er) { /* storage blocked */ }
      o.remove(); document.documentElement.classList.remove('kit-locked');
      Kit.toast(`Welcome back, ${Kit.user.name.split(' ')[0]}`, { type: 'success' });
      resolve(token);
    });
  });
  Kit.signOut = (key) => { Kit.clearAuth(key); location.reload(); };

  // Avatar button with a menu: name, role, link to the client site, shortcuts, sign out
  Kit.userMenu = (mount, { key, clientUrl, clientLabel = 'client site' }) => {
    const u = Kit.user || { name: 'Admin', role: 'Owner' };
    const w = document.createElement('div');
    w.className = 'kit-user';
    w.innerHTML = `<button type="button" class="kit-user-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu for ${Kit.esc(u.name)}">${Kit.esc(u.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</button>
      <div class="kit-user-panel" hidden><b>${Kit.esc(u.name)}</b><small>${Kit.esc(u.role || '')}</small>
      ${clientUrl ? `<a href="${clientUrl}" target="_blank" rel="noopener">Open ${Kit.esc(clientLabel)} ↗</a>` : ''}<button type="button" data-k="help">Keyboard shortcuts</button><button type="button" data-k="out">Sign out</button></div>`;
    mount.appendChild(w);
    const b = w.querySelector('.kit-user-btn'), p = w.querySelector('.kit-user-panel');
    const t = (open) => { p.hidden = !open; b.setAttribute('aria-expanded', String(open)); };
    b.onclick = () => t(p.hidden);
    document.addEventListener('click', (e) => { if (!w.contains(e.target)) t(false); });
    p.addEventListener('click', (e) => { const k = e.target.closest('[data-k]'); if (!k) return; t(false); if (k.dataset.k === 'out') Kit.signOut(key); else Kit.help(); });
  };

  /* ---------- Router: <section data-view="x">, links with data-nav="x" ---------- */
  Kit.router = (fallback, onChange) => {
    const go = () => {
      const want = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
      const view = document.querySelector(`[data-view="${want}"]`) ? want : fallback;
      document.querySelectorAll('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== view; });
      document.querySelectorAll('[data-nav]').forEach((a) => {
        if (a.dataset.nav === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      onChange && onChange(view);
    };
    window.addEventListener('hashchange', go);
    go();
    return { go: (v) => { location.hash = '#/' + v; } };
  };

  /* ---------- Toasts ---------- */
  let toasts;
  Kit.toast = (msg, opts = {}) => {
    if (THUMB) return;
    if (!toasts) {
      toasts = document.createElement('div');
      toasts.className = 'kit-toasts';
      toasts.setAttribute('role', 'status');
      toasts.setAttribute('aria-live', 'polite');
      document.body.appendChild(toasts);
    }
    const t = document.createElement('div');
    t.className = 'kit-toast' + (opts.type ? ' kit-' + opts.type : '');
    t.innerHTML = `<span>${Kit.esc(msg)}</span>`;
    if (opts.undo) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Undo';
      b.onclick = () => { opts.undo(); t.remove(); };
      t.appendChild(b);
    }
    toasts.appendChild(t);
    const ms = opts.ms || (opts.undo ? 6000 : 3500);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 300);
  };

  /* ---------- Modal ---------- */
  // actions: [{ label, primary, danger, submit, onClick(dialog) → return false to keep it open }]
  Kit.modal = ({ title, body, actions = [], wide, onOpen, onClose }) => {
    const d = document.createElement('dialog');
    d.className = 'kit-modal' + (wide ? ' wide' : '');
    d.innerHTML = `<form method="dialog" novalidate><header><h2>${Kit.esc(title)}</h2>
      <button class="kit-x" value="cancel" formnovalidate aria-label="Close">×</button></header>
      <div class="kit-m-body">${body}</div><footer></footer></form>`;
    const form = d.querySelector('form'), foot = d.querySelector('footer');
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kit-btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '');
      b.textContent = a.label;
      b.onclick = () => {
        if (a.submit && !form.reportValidity()) return;
        if (a.onClick && a.onClick(d) === false) return;
        d.close();
      };
      foot.appendChild(b);
    });
    if (!actions.length) foot.remove();
    form.addEventListener('submit', (e) => { // Enter key = primary action
      if (e.submitter && e.submitter.classList.contains('kit-x')) return;
      e.preventDefault();
      const p = foot.querySelector('.primary'); if (p) p.click();
    });
    document.body.appendChild(d);
    d.addEventListener('close', () => { onClose && onClose(d); d.remove(); });
    d.showModal();
    onOpen && onOpen(d);
    return d;
  };
  Kit.confirm = (title, text, label = 'Confirm', danger = true) => new Promise((res) => {
    let ok = false;
    Kit.modal({ title, body: `<p>${Kit.esc(text)}</p>`, actions: [
      { label: 'Cancel' },
      { label, primary: !danger, danger, onClick: () => { ok = true; } },
    ], onClose: () => res(ok) });
  });

  /* ---------- Keyboard shortcuts + command palette ---------- */
  const keys = [], commands = [];
  const typing = (e) => /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
  Kit.key = (key, run, label) => keys.push({ key, run, label });
  Kit.commands = (list) => commands.push(...list);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Kit.palette(); return; }
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === '?') { e.preventDefault(); Kit.help(); return; }
    const k = keys.find((x) => x.key === e.key);
    if (k) { e.preventDefault(); k.run(); }
  });
  Kit.palette = () => {
    if (document.querySelector('.kit-palette[open]')) return;
    const d = Kit.modal({ title: 'Go to or do anything', body: `
      <input class="kit-input" id="kit-q" placeholder="Type a command…" autocomplete="off" aria-label="Search commands">
      <ul class="kit-cmds" id="kit-cmds" role="listbox"></ul>` });
    d.classList.add('kit-palette');
    const q = d.querySelector('#kit-q'), ul = d.querySelector('#kit-cmds');
    let sel = 0, shown = [];
    const draw = () => {
      const t = q.value.toLowerCase();
      shown = commands.filter((c) => c.label.toLowerCase().includes(t)).slice(0, 9);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      ul.innerHTML = shown.map((c, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}">${Kit.esc(c.label)}${c.hint ? `<kbd>${Kit.esc(c.hint)}</kbd>` : ''}</li>`).join('') || '<li class="kit-empty">No matching commands</li>';
    };
    const run = (i) => { const c = shown[i]; if (c) { d.close(); c.run(); } };
    q.addEventListener('input', () => { sel = 0; draw(); });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    ul.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) run(+li.dataset.i); });
    draw(); q.focus();
  };
  Kit.help = () => Kit.modal({ title: 'Keyboard shortcuts', body: `<ul class="kit-keys">
    <li><kbd>Ctrl</kbd> + <kbd>K</kbd><span>Command palette</span></li>
    ${keys.map((k) => `<li><kbd>${Kit.esc(k.key)}</kbd><span>${Kit.esc(k.label)}</span></li>`).join('')}
    <li><kbd>?</kbd><span>Show this help</span></li></ul>` });

  /* ---------- Files ---------- */
  const download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  Kit.csv = (name, rows) => {
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    download(name, rows.map((r) => r.map(cell).join(',')).join('\n'), 'text/csv');
    Kit.toast(`Exported ${rows.length - 1} rows to ${name}`);
  };
  Kit.ics = (name, { title, start, minutes = 30, location = '' }) => {
    const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const end = new Date(start.getTime() + minutes * 6e4);
    download(name, ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apex Hub//Templates//EN', 'BEGIN:VEVENT',
      `UID:${Kit.uid()}@apexhub`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:${title}`, `LOCATION:${location}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
  };

  /* ---------- Charts (SVG, colour from CSS currentColor) ---------- */
  Kit.bars = (el, data, { height = 180, format = (v) => v } = {}) => {
    const max = Math.max(1, ...data.map((d) => d.value)), w = 100 / data.length;
    el.innerHTML = `<svg class="kit-chart" viewBox="0 0 100 ${height / 4}" preserveAspectRatio="none" role="img" aria-label="Bar chart">
      ${data.map((d, i) => { const h = (d.value / max) * (height / 4 - 6); return `<rect x="${i * w + w * 0.18}" y="${height / 4 - h}" width="${w * 0.64}" height="${h}" rx="1"><title>${Kit.esc(d.label)}: ${Kit.esc(format(d.value))}</title></rect>`; }).join('')}
      </svg><div class="kit-axis">${data.map((d) => `<span>${Kit.esc(d.label)}</span>`).join('')}</div>`;
  };
  Kit.line = (el, data, { height = 160, format = (v) => v } = {}) => {
    const max = Math.max(1, ...data.map((d) => d.value)), H = height / 4, n = data.length - 1 || 1;
    const pts = data.map((d, i) => [(i / n) * 100, H - 3 - (d.value / max) * (H - 8)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
    el.innerHTML = `<svg class="kit-chart kit-line" viewBox="0 0 100 ${H}" preserveAspectRatio="none" role="img" aria-label="Line chart">
      <path d="${path} L100 ${H} L0 ${H} Z" class="area"/><path d="${path}" class="stroke" vector-effect="non-scaling-stroke"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="0.9"><title>${Kit.esc(data[i].label)}: ${Kit.esc(format(data[i].value))}</title></circle>`).join('')}
      </svg><div class="kit-axis">${data.map((d) => `<span>${Kit.esc(d.label)}</span>`).join('')}</div>`;
  };

  window.Kit = Kit;
})();
