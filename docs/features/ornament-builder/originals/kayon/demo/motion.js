/**
 * Motion demo pack Kayon.
 *
 * Nilainya datang dari pengukuran di sources/canva-cokelat-krem/motion/measurements.json:
 *   - reveal berurutan: power1.out, 0,9 s, stagger 0,5 s
 *   - gestur tunggal : sine.inOut, 0,30 s
 * Tiga hal yang bukan hiasan dan diuji verify.mjs: keadaan akhir tetap terbaca tanpa JS,
 * prefers-reduced-motion tidak menjalankan tween sama sekali, dan tween ambient berhenti
 * ketika adegannya keluar layar.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  var tombol = document.getElementById('jeda')
  var status = document.getElementById('status-motion')
  var ambient = []
  var dijeda = false

  if (!window.gsap) {
    if (status) status.textContent = 'GSAP tidak termuat — halaman tetap terbaca dalam keadaan akhir.'
    return
  }
  if (reduce.matches) {
    if (tombol) { tombol.disabled = true; tombol.setAttribute('aria-disabled', 'true') }
    if (status) status.textContent = 'Gerak dimatikan: sistem meminta reduced motion.'
    return
  }

  gsap.set('.js-reveal', { opacity: 0, y: 14 })
  var pengamat = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return
      var keping = e.target.querySelectorAll('.js-reveal')
      var target = keping.length ? keping : [e.target]
      gsap.to(target, { opacity: 1, y: 0, duration: 0.9, ease: 'power1.out', stagger: 0.5 })
      pengamat.unobserve(e.target)
    })
  }, { rootMargin: '0px 0px -12% 0px' })
  document.querySelectorAll('.sel, .kartu').forEach(function (n) { pengamat.observe(n) })

  document.querySelectorAll('.js-sway').forEach(function (n, i) {
    ambient.push(gsap.to(n, {
      y: '+=9', rotation: 1.2, duration: 6, ease: 'sine.inOut',
      yoyo: true, repeat: -1, delay: i * 0.5, transformOrigin: '50% 10%',
    }))
  })

  // Jeda offscreen: tween ambient tidak boleh terus berjalan saat adegannya tak terlihat.
  var adegan = document.querySelector('[data-scene]')
  if (adegan) {
    new IntersectionObserver(function (entries) {
      var terlihat = entries[0].isIntersecting
      ambient.forEach(function (t) { terlihat && !dijeda ? t.resume() : t.pause() })
      document.body.dataset.ambient = terlihat && !dijeda ? 'jalan' : 'jeda'
    }, { threshold: 0.05 }).observe(adegan)
  }

  if (tombol) {
    tombol.addEventListener('click', function () {
      dijeda = !dijeda
      tombol.setAttribute('aria-pressed', String(dijeda))
      ambient.forEach(function (t) { dijeda ? t.pause() : t.resume() })
      document.body.dataset.ambient = dijeda ? 'jeda' : 'jalan'
      status.textContent = dijeda ? 'Gerak ambient dijeda.' : 'Gerak ambient jalan.'
    })
  }
  document.body.dataset.ambient = 'jalan'
})()
