// Logo intro: plays the "Draw & sweep" Lottie on first load, then flies the mark into the nav logo.
// The <head> script adds .intro-on to <html> when the intro should play.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('intro-on')) { document.getElementById('intro')?.remove(); return; }

  const intro = document.getElementById('intro');
  const box = document.getElementById('intro-logo');
  const navMark = document.querySelector('.brand svg');
  const skipBtn = document.getElementById('intro-skip');
  // Mark bounds inside the 820x680 Lottie composition (from the traced logo)
  const COMP_W = 820, MARK = { x: 258, y: 81, w: 304, h: 302 };
  let anim = null, done = false;

  const finish = () => {
    if (done) return; done = true;
    try { sessionStorage.setItem('apexhub:intro-seen', '1'); } catch (e) { /* storage blocked */ }
    root.classList.remove('intro-on', 'intro-landing');
    intro.remove();
    if (anim) anim.destroy();
  };

  // Shrink and move the logo box so the drawn mark lands exactly on the nav mark
  const fly = () => {
    if (done || intro.classList.contains('flying')) return;
    if (anim) anim.goToAndStop(anim.totalFrames - 1, true);
    const from = box.getBoundingClientRect(), to = navMark.getBoundingClientRect();
    const s = from.width / COMP_W;                 // composition px -> screen px
    const k = to.width / (MARK.w * s);             // scale so the mark matches the nav mark size
    const dx = to.left - from.left - MARK.x * s * k;
    const dy = to.top - from.top - MARK.y * s * k;
    intro.classList.add('flying');
    box.style.transition = 'transform .95s cubic-bezier(.65, 0, .35, 1)';
    box.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
    setTimeout(() => root.classList.add('intro-landing'), 450);
    // Only the box's own transform ends the flight (child layer fades also fire transitionend)
    box.addEventListener('transitionend', (e) => { if (e.target === box && e.propertyName === 'transform') finish(); });
    setTimeout(finish, 1400); // fallback if transitionend never fires
  };

  skipBtn.addEventListener('click', fly);
  intro.addEventListener('click', (e) => { if (e.target !== skipBtn) fly(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fly(); });

  // If the player library can't load (offline, blocked CDN), just show the page
  const start = () => {
    if (!window.lottie) { finish(); return; }
    anim = window.lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: true, path: 'assets/logo-intro.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
    anim.addEventListener('complete', () => setTimeout(fly, 250));
    anim.addEventListener('data_failed', finish);
  };
  if (window.lottie) start(); else window.addEventListener('load', start, { once: true });
  setTimeout(() => { if (!anim || !anim.isLoaded) finish(); }, 5000); // never trap visitors behind a stuck intro
})();
