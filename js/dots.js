/* Hero dot field: clusters of points slowly turning in 3D, drawn on #hero-dots.
   Only runs when the theme shows the canvas; pauses off-screen and draws one still frame for reduced motion. */
(() => {
  const canvas = document.getElementById('hero-dots');
  if (!canvas || getComputedStyle(canvas).display === 'none') return;
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#B3FF00';

  // Points live in a 3D box (-1..1); clusters and vertical streaks echo a "data cloud"
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const pts = [];
  for (let c = 0; c < 14; c++) {
    const cx = rand(-1.2, 1.2), cy = rand(-0.6, 0.5), cz = rand(-1, 1), spread = rand(0.05, 0.16), n = Math.round(rand(30, 70));
    for (let i = 0; i < n; i++) pts.push({ x: cx + gauss() * spread, y: cy + gauss() * spread, z: cz + gauss() * spread, hot: Math.random() < 0.04 });
  }
  for (let s = 0; s < 22; s++) { // vertical streaks
    const x = rand(-1.3, 1.3), z = rand(-1, 1), top = rand(-0.8, 0), len = rand(0.2, 0.7);
    for (let i = 0; i < 18; i++) pts.push({ x: x + gauss() * 0.01, y: top + (i / 18) * len, z, hot: false });
  }
  for (let i = 0; i < 260; i++) pts.push({ x: rand(-1.5, 1.5), y: rand(-0.9, 0.8), z: rand(-1, 1), hot: Math.random() < 0.02 });
  pts.forEach((p) => { p.tw = rand(0, Math.PI * 2); });

  let w = 0, h = 0, dpr = 1, raf = 0, visible = true;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    const a = t * 0.00004, cos = Math.cos(a), sin = Math.sin(a), scale = Math.max(w, h * 1.6) * 0.42, cam = 2.6;
    for (const p of pts) {
      const x = p.x * cos - p.z * sin, z = p.x * sin + p.z * cos + cam; // turn around the vertical axis
      const k = scale / z, sx = w / 2 + x * k, sy = h * 0.4 + p.y * k;
      if (sx < -4 || sx > w + 4 || sy < -4 || sy > h + 4) continue;
      const depth = Math.max(0, Math.min(1, (cam + 1.2 - z) / 2.4)); // nearer = brighter
      const alpha = (0.25 + depth * 0.7) * (0.75 + 0.25 * Math.sin(t * 0.002 + p.tw));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.hot ? accent : '#EFFFEB';
      const r = (p.hot ? 1.6 : 0.6 + depth * 0.9);
      ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
    }
    ctx.globalAlpha = 1;
  };
  const loop = (t) => { draw(t); raf = visible ? requestAnimationFrame(loop) : 0; };
  size();
  if (still) { draw(0); window.addEventListener('resize', () => { size(); draw(0); }); return; }
  window.addEventListener('resize', size);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(canvas);
  raf = requestAnimationFrame(loop);
})();
