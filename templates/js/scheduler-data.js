/* Postly — shared data for the client review portal (scheduler.html) and the agency workspace (scheduler-admin.html).
   Both pages read and write the same saved store, so a client approval shows up live for the agency. */
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
  const requests = [{ id: Kit.uid(), idea: 'Our new brunch menu starts this Saturday — eggs shakshuka, labneh toast and fresh juices', when: Kit.iso(Kit.addDays(now, 4)), nets: ['ig', 'fb'], ts: Date.now() - 5 * 36e5, status: 'open' }];
  return { posts, requests, notes: [] };
}
const db = Kit.store('postly', seed), S = db.data, save = () => db.save();
S.notes = S.notes || [];
const CLIENT = { name: 'Olive & Ember', handle: 'olive.and.ember', contact: 'Rania Saad' };
const dots = (nets) => `<span class="nets">${nets.map((n) => `<span class="dot" style="background:${NETS[n][1]}" title="${NETS[n][0]}">${n.toUpperCase()[0]}</span>`).join('')}</span>`;
const STL = { scheduled: 'Scheduled', pending: 'Needs approval', draft: 'Draft', published: 'Published', rejected: 'Changes requested' };
const pubStats = (days = 30) => { const pub = S.posts.filter((p) => p.status === 'published' && p.at > Date.now() - days * DAY && p.stats), sum = (k) => pub.reduce((a, p) => a + p.stats[k], 0); return { pub, sum, reach: sum('reach'), eng: sum('likes') + sum('comments') + sum('shares') }; };
