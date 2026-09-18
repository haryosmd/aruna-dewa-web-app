/* Content remains visible without JS or GSAP. One observer owns each scene's motion. */
(() => {
  if (!window.gsap) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector('#motion-toggle');
  let userPaused = false;
  let cleanup = () => {};
  button.hidden = false;
  const mount = () => {
    cleanup();
    const disabled = reduced.matches || userPaused;
    button.textContent = disabled ? 'Aktifkan animasi' : 'Jeda animasi';
    button.setAttribute('aria-pressed', String(disabled));
    button.disabled = reduced.matches;
    if (reduced.matches) button.textContent = 'Gerak dikurangi';
    if (disabled) return;
    const loops = new Map();
    const visible = new Set();
    let frame = 0;
    let alive = true;
    const context = gsap.context(() => {
      for (const scene of document.querySelectorAll('.scene')) {
        loops.set(scene, [...scene.querySelectorAll('.sway')].map((el, i) => gsap.to(el, { rotation: i ? 1.5 : -1.5, duration: 5.5 + i, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true })));
      }
    });
    const observer = new IntersectionObserver(entries => {
      if (!alive) return;
      for (const entry of entries) {
        const scene = entry.target;
        if (entry.isIntersecting) {
          visible.add(scene);
          if (!scene.dataset.revealed) {
            scene.dataset.revealed = 'true';
            context.add(() => gsap.from(scene.querySelectorAll('.reveal'), { y: 18, opacity: .3, duration: 1.1, stagger: .09, ease: 'power2.out', clearProps: 'transform,opacity' }));
          }
        } else visible.delete(scene);
      }
      sync();
      scroll();
    }, { threshold: 0.02 });
    for (const scene of loops.keys()) observer.observe(scene);
    const sync = () => {
      for (const [scene, tweens] of loops) for (const tween of tweens) tween.paused(document.hidden || !visible.has(scene));
    };
    const scroll = () => {
      if (frame || document.hidden) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!alive) return;
        for (const scene of visible) {
          const r = scene.getBoundingClientRect();
          const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight));
          for (const layer of scene.querySelectorAll('.depth')) {
            // Individual translate preserves static CSS rotation and nested sway transforms.
            layer.style.translate = `0 ${progress * Number(layer.dataset.depth)}px`;
          }
        }
      });
    };
    const visibility = () => { sync(); scroll(); };
    addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    cleanup = () => {
      alive = false;
      observer.disconnect();
      removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', visibility);
      cancelAnimationFrame(frame);
      context.revert();
      document.querySelectorAll('.depth').forEach(el => el.style.removeProperty('translate'));
    };
  };
  button.addEventListener('click', () => { userPaused = !userPaused; mount(); });
  reduced.addEventListener('change', mount);
  addEventListener('pagehide', () => cleanup(), { once: true });
  mount();
})();
