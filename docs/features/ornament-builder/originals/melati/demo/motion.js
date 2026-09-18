/*
 * Motion demo pack Ronce Melati.
 *
 * Angkanya bukan selera — semuanya dari `sources/canva/MOTION-DALAM.md`:
 *   ease masuk `power1.out`  — lima dari sembilan klip yang diukur, residual terkecil
 *   durasi masuk 0,9 s       — median segmen utama dibagi jumlah keping per adegan
 *   stagger 0,5 s            — `t50` klip botanical, dua selang berturut-turut
 *   seluruh gerak masuk < 2,5 s
 *
 * Konsekuensi yang mengikat, dan itu bagian pentingnya: dengan stagger 0,5 s dan durasi
 * 0,9 s, **empat keping** sudah memakan 2,4 detik. Jadi tiap adegan hanya boleh punya
 * empat keping ber-`reveal`; sisanya tampil tanpa tween. Batas itu dipaksakan di sini
 * (`REVEAL_BUDGET`), bukan diserahkan ke kedisiplinan penulis markup.
 *
 * Teks tidak pernah masuk daftar yang dianimasikan. Klip botanical mencatat densitas gerak
 * 0,00 di zona teksnya — pack ini mengikuti itu, dan bukan kebetulan bahwa aturan Aruna
 * (teks tercat sejak HTML awal) menghasilkan hal yang sama.
 *
 * Tanpa JS atau tanpa GSAP, halaman ini tetap lengkap dan terbaca.
 */
(() => {
  if (!window.gsap) return;

  const ENTER = { duration: 0.9, ease: 'power1.out', stagger: 0.5, travel: 16 };
  const SWAY = { degrees: 1.5, duration: 6, ease: 'sine.inOut' };
  const REVEAL_BUDGET = 4;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector('#motion-toggle');
  let userPaused = false;
  let cleanup = () => {};
  button.hidden = false;

  const mount = () => {
    cleanup();
    const disabled = reduced.matches || userPaused;
    button.setAttribute('aria-pressed', String(disabled));
    button.disabled = reduced.matches;
    button.textContent = reduced.matches
      ? 'Gerak dikurangi'
      : disabled ? 'Aktifkan animasi' : 'Jeda animasi';
    if (disabled) return;

    const scenes = [...document.querySelectorAll('.scene')];
    const loops = new Map();
    const visible = new Set();
    let frame = 0;
    let alive = true;

    const context = gsap.context(() => {
      for (const scene of scenes) {
        const swayers = [...scene.querySelectorAll('.sway')];
        loops.set(scene, swayers.map((el, i) => gsap.to(el, {
          rotation: i % 2 ? SWAY.degrees : -SWAY.degrees,
          duration: SWAY.duration + i * 0.4,
          ease: SWAY.ease,
          repeat: -1,
          yoyo: true,
          paused: true,
          transformOrigin: el.dataset.origin || '50% 100%',
        })));
      }
    });

    const sync = () => {
      for (const [scene, tweens] of loops) {
        const run = visible.has(scene) && !document.hidden;
        for (const tween of tweens) tween.paused(!run);
      }
    };

    const parallax = () => {
      if (frame || document.hidden) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!alive) return;
        for (const scene of visible) {
          const box = scene.getBoundingClientRect();
          const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (box.top + box.height / 2)) / innerHeight));
          for (const layer of scene.querySelectorAll('.depth')) {
            // `translate` terpisah supaya rotasi CSS statis dan sway bersarang tetap utuh.
            layer.style.translate = `0 ${progress * Number(layer.dataset.depth)}px`;
          }
        }
      });
    };

    const observer = new IntersectionObserver((entries) => {
      if (!alive) return;
      for (const entry of entries) {
        const scene = entry.target;
        if (!entry.isIntersecting) { visible.delete(scene); continue; }
        visible.add(scene);
        if (scene.dataset.revealed) continue;
        scene.dataset.revealed = 'true';
        const pieces = [...scene.querySelectorAll('.reveal')].slice(0, REVEAL_BUDGET);
        if (!pieces.length) continue;
        context.add(() => gsap.from(pieces, {
          y: ENTER.travel,
          opacity: 0.25,
          duration: ENTER.duration,
          ease: ENTER.ease,
          stagger: ENTER.stagger,
          clearProps: 'transform,opacity',
        }));
      }
      sync();
      parallax();
    }, { threshold: 0.02 });

    for (const scene of scenes) observer.observe(scene);

    const onVisibility = () => { sync(); parallax(); };
    addEventListener('scroll', parallax, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    cleanup = () => {
      alive = false;
      observer.disconnect();
      removeEventListener('scroll', parallax);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(frame);
      context.revert();
      for (const el of document.querySelectorAll('.depth')) el.style.removeProperty('translate');
      for (const scene of scenes) delete scene.dataset.revealed;
    };
  };

  button.addEventListener('click', () => { userPaused = !userPaused; mount(); });
  reduced.addEventListener('change', mount);
  addEventListener('pagehide', () => cleanup(), { once: true });
  mount();
})();
