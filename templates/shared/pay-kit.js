/* Apex Hub PayKit — payment methods for templates: international cards, Thailand (PromptPay, mobile banking, TrueMoney)
   and Myanmar (KBZPay, WavePay, AYA Pay, CB Pay, MPU). Demo only: nothing is charged.
   - PayKit.picker(el, { amount, cashLabel, onChange }) → { validate(), method(), summary() }
   - PayKit.checkout({ title, amount, onPaid })          → standalone payment modal
   - <section data-paykit></section>                     → "Ways to pay" section, rendered automatically */
(() => {
  const BRANDS = {
    visa: ['VISA', '#1A1F71', '#fff'], mc: ['Mastercard', '#EB001B', '#fff'], jcb: ['JCB', '#0E4C96', '#fff'], upi: ['UnionPay', '#D7182A', '#fff'], amex: ['AMEX', '#2E77BC', '#fff'],
    promptpay: ['PromptPay', '#1C3E8C', '#fff'], kplus: ['K PLUS', '#00A950', '#fff'], scb: ['SCB EASY', '#4E2A84', '#fff'], bbl: ['Bangkok Bank', '#1E4598', '#fff'],
    ktb: ['Krungthai NEXT', '#00A6E6', '#fff'], bay: ['Krungsri', '#FEC43B', '#4A3C00'], truemoney: ['TrueMoney', '#FF6A00', '#fff'],
    kbzpay: ['KBZPay', '#0B5FA8', '#fff'], wave: ['WavePay', '#FFD400', '#1F1F1F'], aya: ['AYA Pay', '#C8102E', '#fff'], cb: ['CB Pay', '#00427A', '#fff'],
    mpu: ['MPU', '#00843D', '#fff'], uab: ['UAB Pay', '#6C2C91', '#fff'],
    bank: ['Bank transfer', '#455063', '#fff'], cash: ['Cash', '#3B7A57', '#fff'],
  };
  const RATES = { USD: 1, THB: 35.8, MMK: 2100 }; // demo exchange rates per USD, for the "≈" hint only
  // Format an amount in the shop's own currency (USD, Thai baht or Myanmar kyat)
  const fmt = (n, cur = 'USD') => cur === 'THB' ? `฿${Math.round(n).toLocaleString('en-US')}` : cur === 'MMK' ? `${Math.round(n).toLocaleString('en-US')} Ks` : Kit.money(n);
  const badge = (k) => { const [n, bg, fg] = BRANDS[k]; return `<span class="pk-badge" style="background:${bg};color:${fg}">${k === 'mc' ? '<i class="pk-mc" aria-hidden="true"></i>' : ''}${n}</span>`; };
  const fx = (amount, from, to) => fmt(amount / RATES[from] * RATES[to], to);

  // Payment options a customer can pick, grouped by region
  const METHODS = [
    { id: 'card', region: 'intl', label: 'Credit / debit card', sub: 'Visa, Mastercard, JCB, UnionPay, AMEX', brands: ['visa', 'mc', 'jcb', 'upi', 'amex'], kind: 'card' },
    { id: 'promptpay', region: 'th', label: 'PromptPay QR', sub: 'Scan with any Thai banking app', brands: ['promptpay'], kind: 'qr', cur: 'THB' },
    { id: 'thbank', region: 'th', label: 'Thai mobile banking', sub: 'K PLUS, SCB EASY, Bangkok Bank, Krungthai, Krungsri', brands: ['kplus', 'scb', 'bbl', 'ktb', 'bay'], kind: 'app', cur: 'THB',
      apps: ['kplus', 'scb', 'bbl', 'ktb', 'bay'] },
    { id: 'truemoney', region: 'th', label: 'TrueMoney Wallet', sub: 'Pay with your TrueMoney balance', brands: ['truemoney'], kind: 'qr', cur: 'THB' },
    { id: 'kbzpay', region: 'mm', label: 'KBZPay', sub: 'Scan to pay in the KBZPay app', brands: ['kbzpay'], kind: 'qr', cur: 'MMK' },
    { id: 'wave', region: 'mm', label: 'WavePay', sub: 'Scan to pay in the WavePay app', brands: ['wave'], kind: 'qr', cur: 'MMK' },
    { id: 'mmwallet', region: 'mm', label: 'AYA Pay, CB Pay or UAB Pay', sub: 'Approve in your bank app', brands: ['aya', 'cb', 'uab'], kind: 'app', cur: 'MMK', apps: ['aya', 'cb', 'uab'] },
    { id: 'mpu', region: 'mm', label: 'MPU card', sub: 'Myanmar Payment Union debit card', brands: ['mpu'], kind: 'card', cur: 'MMK' },
    { id: 'bank', region: 'any', label: 'Bank transfer', sub: 'Transfer, then upload your slip', brands: ['bank'], kind: 'bank' },
    { id: 'cash', region: 'any', label: 'Cash', sub: 'Pay when you collect or receive it', brands: ['cash'], kind: 'cash' },
  ];
  const REGIONS = [['all', 'All'], ['th', '🇹🇭 Thailand'], ['mm', '🇲🇲 Myanmar'], ['intl', '🌐 International']];
  const ACCOUNTS = {
    th: [['Kasikornbank (KBank)', '123-4-56789-0', 'Apex Hub Co., Ltd.'], ['Siam Commercial Bank', '987-6-54321-0', 'Apex Hub Co., Ltd.']],
    mm: [['KBZ Bank', '0123 4567 8901 2345', 'Apex Hub Myanmar Ltd.'], ['AYA Bank', '2001 2345 6789', 'Apex Hub Myanmar Ltd.']],
    intl: [['SWIFT transfer · KBank', 'KASITHBK · 123-4-56789-0', 'Apex Hub Co., Ltd.']],
  };

  // Card brand from the number prefix
  const brandOf = (n) => /^4/.test(n) ? 'visa' : /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n) ? 'mc' : /^35/.test(n) ? 'jcb' : /^3[47]/.test(n) ? 'amex' : /^9505/.test(n) ? 'mpu' : /^62/.test(n) ? 'upi' : '';
  const luhn = (n) => { let s = 0; for (let i = 0; i < n.length; i++) { let d = +n[n.length - 1 - i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; } return s % 10 === 0; };

  // A deterministic QR-style pattern (demo — not a scannable payment code)
  function qr(seed) {
    let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const N = 25, cells = [];
    const finder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx0, fy0]) => x >= fx0 && x < fx0 + 7 && y >= fy0 && y < fy0 + 7);
    const finderOn = (x, y) => { for (const [fx0, fy0] of [[0, 0], [N - 7, 0], [0, N - 7]]) { const dx = x - fx0, dy = y - fy0; if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); } return false; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { h = Math.imul(h ^ (x * 31 + y), 16777619) >>> 0; const on = finder(x, y) ? finderOn(x, y) : (h >> 7) & 1; if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }
    return `<svg class="pk-qr-code" viewBox="-2 -2 ${N + 4} ${N + 4}" role="img" aria-label="Payment QR code (demo)"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><g fill="#111">${cells.join('')}</g></svg>`;
  }

  function picker(el, { amount = 0, currency = 'USD', cashLabel = 'Cash on delivery', onChange = () => {}, region = 'all', allowCash = true } = {}) {
    const money = (n) => fmt(n, currency);
    const S = { region, method: 'card', card: '', exp: '', cvc: '', holder: '', app: '', paid: false, slip: '', bankRegion: 'th', err: '' };
    let timer = null;
    const list = () => METHODS.filter((m) => (allowCash || m.id !== 'cash') && (S.region === 'all' || m.region === S.region || m.region === 'any'));
    const M = () => METHODS.find((m) => m.id === S.method);
    function detail() {
      const m = M(), local = m.cur && m.cur !== currency ? `<span class="pk-fx">≈ ${fx(amount, currency, m.cur)} at today's rate</span>` : '';
      if (m.kind === 'card') {
        const b = brandOf(S.card.replace(/\s/g, ''));
        return `<div class="pk-card"><div class="pk-f pk-full"><label for="pk-card">Card number</label><div class="pk-cardnum"><input id="pk-card" inputmode="numeric" autocomplete="off" placeholder="${m.id === 'mpu' ? '9505 0000 0000 0000' : '4242 4242 4242 4242'}" value="${S.card}" maxlength="23">${b ? badge(b) : ''}</div></div>
          <div class="pk-f"><label for="pk-exp">Expiry (MM/YY)</label><input id="pk-exp" inputmode="numeric" placeholder="12/28" maxlength="5" value="${S.exp}"></div><div class="pk-f"><label for="pk-cvc">Security code</label><input id="pk-cvc" inputmode="numeric" placeholder="123" maxlength="4" value="${S.cvc}"></div>
          <div class="pk-f pk-full"><label for="pk-holder">Name on card</label><input id="pk-holder" autocomplete="cc-name" value="${Kit.esc(S.holder)}"></div></div>
          <p class="pk-note">🔒 Secured with 3-D Secure. Demo: use ${m.id === 'mpu' ? 'any 16 digits starting 9505' : 'test card 4242 4242 4242 4242'} — nothing is charged.</p>${local}`;
      }
      if (m.kind === 'qr') return `<div class="pk-qr">${qr(m.id + amount)}<div><b>Scan to pay ${money(amount)}</b>${local}<ol><li>Open ${m.id === 'promptpay' ? 'any Thai banking app' : BRANDS[m.brands[0]][0]}</li><li>Scan this QR code</li><li>Confirm the amount and pay</li></ol>
          <p class="pk-timer">Code expires in <b id="pk-count">10:00</b></p><label class="pk-check"><input type="checkbox" id="pk-paid" ${S.paid ? 'checked' : ''}> I've completed the payment</label></div></div>`;
      if (m.kind === 'app') return `<p class="pk-lead">Choose your bank app — you'll approve ${money(amount)} there.</p>${local}<div class="pk-apps">${m.apps.map((a) => `<button type="button" data-app="${a}" aria-pressed="${S.app === a}">${badge(a)}</button>`).join('')}</div>
          ${S.app ? `<p class="pk-note">After you continue, ${BRANDS[S.app][0]} opens for you to approve the payment. Come back here when it says “Successful”.</p>` : ''}`;
      if (m.kind === 'bank') {
        const r = S.bankRegion;
        return `<div class="pk-tabs" role="tablist">${[['th', 'Thai banks'], ['mm', 'Myanmar banks'], ['intl', 'International']].map(([k, l]) => `<button type="button" role="tab" data-br="${k}" aria-selected="${r === k}">${l}</button>`).join('')}</div>
          <div class="pk-accts">${ACCOUNTS[r].map(([bank, no, name]) => `<div class="pk-acct"><span>${bank}<small>${name}</small></span><code>${no}</code><button type="button" class="pk-copy" data-copy="${no}">Copy</button></div>`).join('')}</div>
          <p class="pk-lead">Transfer <b>${money(amount)}</b>${r !== 'intl' && currency !== (r === 'th' ? 'THB' : 'MMK') ? ` (≈ ${fx(amount, currency, r === 'th' ? 'THB' : 'MMK')})` : ''} and use your phone number as the reference.</p>
          <div class="pk-f pk-full"><label for="pk-slip">Upload transfer slip</label><input id="pk-slip" type="file" accept="image/*,.pdf">${S.slip ? `<small class="pk-ok">✓ ${Kit.esc(S.slip)}</small>` : ''}</div><p class="pk-note">We confirm transfers within 1 business hour.</p>`;
      }
      return `<p class="pk-lead">${cashLabel}. Please have ${money(amount)} ready.</p>`;
    }
    function render() {
      clearInterval(timer);
      el.innerHTML = `<div class="pk"><div class="pk-tabs pk-regions" role="tablist" aria-label="Where are you paying from?">${REGIONS.map(([k, l]) => `<button type="button" role="tab" data-r="${k}" aria-selected="${S.region === k}">${l}</button>`).join('')}</div>
        <div class="pk-methods" role="radiogroup" aria-label="Payment method">${list().map((m) => `<label class="pk-method ${S.method === m.id ? 'on' : ''}"><input type="radio" name="pk-m" value="${m.id}" ${S.method === m.id ? 'checked' : ''}><span class="pk-mt"><b>${m.label}</b><small>${m.sub}</small></span><span class="pk-mb">${m.brands.slice(0, 3).map(badge).join('')}</span></label>`).join('')}</div>
        <div class="pk-detail">${detail()}</div><p class="pk-err" role="alert">${S.err}</p></div>`;
      wire(); onChange(api);
    }
    function wire() {
      el.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { S.region = b.dataset.r; if (!list().some((m) => m.id === S.method)) S.method = list()[0].id; S.err = ''; render(); });
      el.querySelectorAll('[name=pk-m]').forEach((r) => r.onchange = () => { S.method = r.value; S.paid = false; S.app = ''; S.err = ''; render(); });
      el.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => { S.app = b.dataset.app; S.err = ''; render(); });
      el.querySelectorAll('[data-br]').forEach((b) => b.onclick = () => { S.bankRegion = b.dataset.br; render(); });
      el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy).catch(() => {}); Kit.toast('Account number copied'); });
      const slip = el.querySelector('#pk-slip'); if (slip) slip.onchange = () => { S.slip = slip.files[0] ? slip.files[0].name : ''; S.err = ''; render(); };
      const paid = el.querySelector('#pk-paid'); if (paid) paid.onchange = () => { S.paid = paid.checked; S.err = ''; el.querySelector('.pk-err').textContent = ''; };
      [['card', (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()], ['exp', (v) => v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')], ['cvc', (v) => v.replace(/\D/g, '')], ['holder', (v) => v]].forEach(([k, f]) => {
        const i = el.querySelector('#pk-' + k); if (!i) return;
        i.oninput = () => { i.value = f(i.value); S[k] = i.value; i.closest('.pk-f').classList.remove('bad');
          if (k === 'card') { const b = brandOf(i.value.replace(/\s/g, '')), wrap = i.parentElement, old = wrap.querySelector('.pk-badge'); if (old) old.remove(); if (b) wrap.insertAdjacentHTML('beforeend', badge(b)); } };
      });
      const count = el.querySelector('#pk-count');
      if (count) { let left = 600; timer = setInterval(() => { if (!document.body.contains(count)) { clearInterval(timer); return; } left--; count.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (left <= 0) { clearInterval(timer); count.textContent = 'expired — refresh the code'; } }, 1000); }
    }
    function fail(msg, field) { S.err = msg; const e = el.querySelector('.pk-err'); if (e) e.textContent = msg; if (field) { const f = el.querySelector('#pk-' + field); if (f) { f.closest('.pk-f').classList.add('bad'); f.focus(); } } return msg; }
    function validate() {
      const m = M();
      if (m.kind === 'card') {
        const n = S.card.replace(/\s/g, '');
        if (m.id === 'mpu' ? !/^9505\d{12}$/.test(n) : !(n.length >= 13 && luhn(n))) return fail('That card number isn\'t valid — check the digits.', 'card');
        const [mm, yy] = S.exp.split('/').map(Number); if (!mm || mm > 12 || yy == null || new Date(2000 + yy, mm) <= new Date()) return fail('Enter a future expiry date as MM/YY.', 'exp');
        if (!/^\d{3,4}$/.test(S.cvc)) return fail('Enter the 3 or 4 digits on the back of the card.', 'cvc');
        if (S.holder.trim().length < 2) return fail('Enter the name shown on the card.', 'holder');
      }
      if (m.kind === 'qr' && !S.paid) return fail('Scan the QR code and pay, then tick “I\'ve completed the payment”.');
      if (m.kind === 'app' && !S.app) return fail('Choose which bank app you\'ll pay with.');
      if (m.kind === 'bank' && !S.slip) return fail('Upload your transfer slip so we can confirm it.', 'slip');
      S.err = ''; return null;
    }
    const api = {
      validate, method: () => M(),
      summary: () => { const m = M(); return m.kind === 'card' ? `${(BRANDS[brandOf(S.card.replace(/\s/g, ''))] || ['Card'])[0]} •••• ${S.card.replace(/\s/g, '').slice(-4)}` : m.kind === 'app' ? BRANDS[S.app][0] : m.label; },
      paidNow: () => !['bank', 'cash'].includes(M().kind),
      setAmount: (a) => { amount = a; render(); },
    };
    render();
    return api;
  }

  // Standalone payment modal for bookings, deposits and bills
  function checkout({ title = 'Payment', amount, currency = 'USD', note = '', cashLabel = 'Pay at the venue', allowCash = true, onPaid = () => {} }) {
    let p;
    Kit.modal({ title, wide: true, body: `${note ? `<p class="pk-lead">${note}</p>` : ''}<div id="pk-modal"></div>`,
      onOpen: (m) => { p = picker(m.querySelector('#pk-modal'), { amount, currency, cashLabel, allowCash }); },
      actions: [{ label: 'Cancel' }, { label: `Pay ${fmt(amount, currency)}`, primary: true, onClick: () => {
        if (p.validate()) return false;
        const info = { method: p.method().label, detail: p.summary(), paid: p.paidNow(), amount };
        Kit.toast(info.paid ? `Paid ${fmt(amount, currency)} with ${info.detail}` : `${info.detail} selected — we'll confirm it shortly`, { type: 'success' });
        onPaid(info);
      } }] });
  }

  // "Ways to pay" section for websites and stores
  function section(el) {
    const groups = [['🌐 International', ['visa', 'mc', 'jcb', 'upi', 'amex']], ['🇹🇭 Thailand', ['promptpay', 'kplus', 'scb', 'bbl', 'ktb', 'bay', 'truemoney']], ['🇲🇲 Myanmar', ['kbzpay', 'wave', 'aya', 'cb', 'mpu', 'uab']], ['Also', ['bank', 'cash']]];
    el.classList.add('pk-section');
    el.innerHTML = `<div class="pk-sec-in"><div class="pk-sec-head"><h2>${el.dataset.title || 'Pay your way'}</h2><p>${el.dataset.text || 'Cards, QR and mobile banking from Thailand and Myanmar — every payment is encrypted and confirmed instantly.'}</p></div>
      <div class="pk-groups">${groups.map(([g, ks]) => `<div class="pk-group"><span>${g}</span><div>${ks.map(badge).join('')}</div></div>`).join('')}</div>
      <ul class="pk-trust"><li>🔒 PCI-DSS secured card payments</li><li>⚡ PromptPay &amp; KBZPay QR confirmed in seconds</li><li>🧾 Instant e-receipt by email</li></ul></div>`;
  }

  window.PayKit = { picker, checkout, section, badge, fmt, METHODS, BRANDS };
  const auto = () => document.querySelectorAll('[data-paykit]').forEach(section);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
