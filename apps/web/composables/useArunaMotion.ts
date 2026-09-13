import type { gsap as GsapType } from 'gsap'

type Gsap = typeof GsapType
type Ctx = ReturnType<Gsap['context']>


export type MotionApi = {
  gsap: Gsap
  /** Reveal a heading line by line behind a mask. Falls back to a fade when SplitText is unavailable. */
  revealText: (target: string | Element, options?: { delay?: number; stagger?: number; trigger?: Element | null }) => void
  /** Fade-and-rise elements as they enter the viewport. */
  revealUp: (target: string | Element | Element[], options?: { y?: number; stagger?: number; start?: string }) => void
  /** Move an element slower or faster than the page while its container scrolls. */
  parallax: (target: string | Element, options?: { distance?: number; scrub?: number | boolean }) => void
  /** Trace an SVG stroke as it scrolls into view. */
  drawSvg: (target: string | Element, options?: { duration?: number; start?: string; stagger?: number }) => void
  /** Count a number up when it enters the viewport. */
  countUp: (target: Element, to: number, options?: { duration?: number; format?: (value: number) => string }) => void
  /**
   * Menumbuhkan bentuk berisi dari sebuah titik jangkar — mekar dari tengah ke tepi.
   * Pengganti `drawSvg` untuk ornamen bermassa, yang tidak punya stroke untuk digambar.
   */
  bloomIn: (target: string | Element | Element[], options?: { origin?: string; stagger?: number; duration?: number; start?: string }) => void
  /** Jatuh dan bergoyang halus dari tepi atas, berurutan. */
  cascadeIn: (target: string | Element | Element[], options?: { stagger?: number; distance?: number; start?: string }) => void
  /**
   * Koreografi satu section: heading dulu, lalu foto, lalu ladang ornamen.
   * Satu timeline berjangkar section, bukan sekumpulan tween yang kebetulan bertetangga.
   */
  orchestrate: (section: Element, options?: { stagger?: number; duration?: number; start?: string }) => void
  /** Menggerakkan sebuah titik menyusuri path SVG mengikuti scrub. */
  travelPath: (path: string | SVGPathElement, dot: string | Element, options?: { trigger?: Element | null; end?: string }) => void
}

/*
 * Kenapa tidak ada `once: true` di berkas ini.
 *
 * `once: true` membuat ScrollTrigger **membunuh dirinya sendiri** begitu ia menyala.
 * Saat halaman mount, semua elemen yang kebetulan sudah berada di viewport menyala
 * seketika — jadi trigger-trigger itu menghapus diri dari daftar global GSAP tepat
 * ketika trigger berikutnya sedang dipasang dan sedang menyusuri daftar yang sama.
 * `ScrollTrigger.init()` membaca `_triggers[i].end` tanpa penjaga null, sehingga satu
 * lubang saja melempar `Cannot read properties of undefined (reading 'end')` dan
 * **seluruh** motion halaman itu gagal dipasang.
 *
 * Gejalanya sempat lama tidak terlihat karena hanya muncul pada navigasi klien dengan
 * banyak trigger sekaligus — menekan "Buka demo" dari landing — bukan saat undangan
 * dibuka langsung. `toggleActions: 'play none none none'` memberi perilaku yang sama
 * persis bagi pengunjung (maju sekali, tidak pernah mundur) tanpa menghapus trigger,
 * jadi daftarnya tetap stabil selama pemasangan.
 */

/**
 * Anggaran kedip untuk gerakan masuk yang tidak digerbangi scroll.
 *
 * `revealText` membungkus tiap barisnya dengan `.split-line-wrap { overflow: hidden }` lalu
 * mendorongnya keluar sebelum memasukkannya kembali — tapi pembungkus itu baru dibuat
 * setelah `import('gsap')` selesai, sementara teksnya sendiri sudah dirender server dan
 * sudah dicat. Kalau modulnya tiba dalam beberapa frame, yang terlihat tamu adalah satu
 * gerakan masuk. Kalau ia tiba terlambat, yang terlihat adalah judul yang **hilang lalu
 * datang lagi** — dan untuk judul hero landing, yang hilang itu elemen LCP-nya.
 *
 * 200ms ≈ 12 frame: longgar untuk sambungan wajar (modul motion biasanya sudah
 * ter-modulepreload dan tiba di bawah 50ms), ketat untuk sambungan lambat, di mana keadaan
 * istirahat yang sudah terbaca jelas lebih baik daripada animasi yang menghapusnya.
 *
 * Hanya berlaku untuk gerakan masuk seketika. Yang digerbangi `trigger` tetap berjalan:
 * elemen di bawah lipatan belum pernah terlihat, jadi tidak ada yang bisa berkedip.
 */
const revealBudget = 200

/**
 * Single entry point for GSAP. Registers the plugins once, scopes every tween to
 * the component that asked for it, and reverts on unmount.
 *
 * When the visitor prefers reduced motion the setup callback never runs, so every
 * element keeps the resting state it was authored with. Markup must therefore be
 * readable without JavaScript: no `opacity: 0` in the stylesheet.
 */
export function useArunaMotion(
  scope: Ref<HTMLElement | null>,
  setup: (api: MotionApi) => void,
) {
  let ctx: Ctx | undefined

  onMounted(async () => {
    if (!scope.value) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const requestedAt = performance.now()
    const [{ gsap }, { ScrollTrigger }, splitMod, drawMod, pathMod] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('gsap/SplitText').catch(() => null),
      import('gsap/DrawSVGPlugin').catch(() => null),
      import('gsap/MotionPathPlugin').catch(() => null),
    ])
    const motionLatency = performance.now() - requestedAt

    const SplitText = splitMod?.SplitText
    const DrawSVGPlugin = drawMod?.DrawSVGPlugin
    const MotionPathPlugin = pathMod?.MotionPathPlugin
    gsap.registerPlugin(ScrollTrigger)
    if (SplitText) gsap.registerPlugin(SplitText)
    if (DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin)
    if (MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin)



    /** Satu penerjemah target untuk primitif baru: selector, satu node, atau daftar node. */
    const resolveNodes = (target: string | Element | Element[]): HTMLElement[] =>
      typeof target === 'string'
        ? gsap.utils.toArray<HTMLElement>(target)
        : (Array.isArray(target) ? target : [target]) as HTMLElement[]

    ctx = gsap.context(() => {
      const api: MotionApi = {
        gsap,

        revealText(target, { delay = 0, stagger = 0.09, trigger } = {}) {
          const node = typeof target === 'string' ? document.querySelector(target) : target
          if (!node) return

          // Teks yang sudah lama terbaca tidak boleh disembunyikan lagi demi gerakan masuk.
          if (!trigger && motionLatency > revealBudget) return

          if (!SplitText) {
            gsap.from(node, { opacity: 0, y: 24, duration: 0.7, delay, ease: 'power3.out' })
            return
          }

          const split = new SplitText(node, { type: 'lines', linesClass: 'split-line' })
          // Each line needs its own clipping parent so the text can slide out from under it.
          split.lines.forEach((line) => {
            const wrap = document.createElement('span')
            wrap.className = 'split-line-wrap'
            wrap.style.display = 'block'
            line.parentNode?.insertBefore(wrap, line)
            wrap.appendChild(line)
          })

          gsap.from(split.lines, {
            yPercent: 108,
            duration: 0.95,
            delay,
            stagger,
            ease: 'expo.out',
            ...(trigger ? { scrollTrigger: { trigger, start: 'top 80%', toggleActions: 'play none none none' } } : {}),
          })
        },

        revealUp(target, { y = 28, stagger = 0.08, start = 'top 86%' } = {}) {
          const nodes = typeof target === 'string' ? gsap.utils.toArray<HTMLElement>(target) : ([] as HTMLElement[]).concat(target as HTMLElement[])
          nodes.forEach((node, index) => {
            gsap.from(node, {
              opacity: 0,
              y,
              duration: 0.8,
              delay: (index % 4) * stagger,
              ease: 'power3.out',
              scrollTrigger: { trigger: node, start, toggleActions: 'play none none none' },
            })
          })
        },

        parallax(target, { distance = 90, scrub = 1 } = {}) {
          const nodes = typeof target === 'string' ? gsap.utils.toArray<HTMLElement>(target) : [target as HTMLElement]
          nodes.forEach((node) => {
            gsap.fromTo(
              node,
              { yPercent: -distance / 20 },
              { yPercent: distance / 20, ease: 'none', scrollTrigger: { trigger: node.parentElement ?? node, start: 'top bottom', end: 'bottom top', scrub } },
            )
          })
        },

        /*
         * Satu ScrollTrigger per `<svg>` pemiliknya, bukan per path.
         *
         * Dulu tiap path dipakai sebagai trigger-nya sendiri. Sebuah `<path>` bukan kotak
         * layout: rect-nya bisa benar-benar nol, dan ScrollTrigger yang `end`-nya nol
         * membuat GSAP memanggil `refresh()` rekursif sambil menyusuri daftar trigger
         * global dengan indeks yang sudah tidak cocok — `Cannot read properties of
         * undefined (reading 'end')`, yang menggagalkan **seluruh** pemasangan motion
         * halaman itu. Mengelompokkan per SVG sekaligus memangkas jumlah trigger dan
         * membuat satu ornamen tergambar sebagai satu gerakan, bukan sepuluh yang
         * kebetulan bersamaan.
         */
        drawSvg(target, { duration = 1.6, start = 'top 82%', stagger = 0.06 } = {}) {
          if (!DrawSVGPlugin) return
          const paths = typeof target === 'string' ? gsap.utils.toArray<SVGElement>(target) : [target as SVGElement]

          const byOwner = new Map<Element, SVGElement[]>()
          for (const path of paths) {
            const owner = (path as SVGGraphicsElement).ownerSVGElement ?? path.closest('svg')
            if (!owner) continue
            const bucket = byOwner.get(owner)
            if (bucket) bucket.push(path)
            else byOwner.set(owner, [path])
          }

          byOwner.forEach((members, owner) => {
            // SVG yang belum punya kotak tidak akan pernah memicu apa pun; melewatinya
            // menjaga daftar trigger tetap bersih dari entri ber-`end` nol.
            if (!(owner as HTMLElement).getBoundingClientRect().height) return
            gsap.fromTo(
              members,
              { drawSVG: '0%' },
              { drawSVG: '100%', duration, stagger, ease: 'power2.inOut', scrollTrigger: { trigger: owner, start, toggleActions: 'play none none none' } },
            )
          })
        },

        bloomIn(target, { origin = 'bottom center', stagger = 0.14, duration = 1.35, start = 'top 88%' } = {}) {
          resolveNodes(target).forEach((node, index) => {
            gsap.from(node, {
              // Skala, bukan clip-path: ornamen bermassa sudah punya siluetnya sendiri, dan
              // clip-path pada SVG beranak banyak jauh lebih mahal untuk dianimasikan.
              scaleX: 0.42,
              scaleY: 0.72,
              opacity: 0,
              transformOrigin: origin,
              duration,
              delay: (index % 3) * stagger,
              ease: 'expo.out',
              scrollTrigger: { trigger: node.parentElement ?? node, start, toggleActions: 'play none none none' },
            })
          })
        },

        cascadeIn(target, { stagger = 0.12, distance = 46, start = 'top 88%' } = {}) {
          resolveNodes(target).forEach((node, index) => {
            gsap.from(node, {
              y: -distance,
              rotate: index % 2 === 0 ? -4 : 4,
              opacity: 0,
              transformOrigin: 'top center',
              duration: 1.2,
              delay: (index % 4) * stagger,
              ease: 'power3.out',
              scrollTrigger: { trigger: node.parentElement ?? node, start, toggleActions: 'play none none none' },
            })
          })
        },

        orchestrate(section, { stagger = 0.16, duration = 1.35, start = 'top 78%' } = {}) {
          const pick = (selector: string) => gsap.utils.toArray<HTMLElement>(section.querySelectorAll(selector))
          const heading = pick('[data-iv-lead]')
          const photo = pick('[data-iv-photo]')
          const layers = pick('[data-iv-layer]')
          if (!heading.length && !photo.length && !layers.length) return

          const timeline = gsap.timeline({ scrollTrigger: { trigger: section, start, toggleActions: 'play none none none' } })

          if (heading.length) {
            timeline.from(heading, { y: 26, opacity: 0, duration: duration * 0.7, stagger: stagger * 0.5, ease: 'power3.out' })
          }
          if (photo.length) {
            /*
             * Foto tidak lagi masuk dengan satu reveal seragam. Arah, jarak, dan skalanya
             * dipilih dari `data-entrance` bila section menentukannya, dan kalau tidak,
             * dari indeksnya — deterministik, jadi render server dan klien tetap sepakat,
             * tapi cukup berbeda supaya undangan panjang tidak terbaca sebagai satu efek
             * yang diulang sepuluh kali.
             */
            const entrances = {
              rise: { x: 0, y: 36, scale: 1.04 },
              'sweep-left': { x: -46, y: 0, scale: 1.06 },
              'sweep-right': { x: 46, y: 0, scale: 1.06 },
              iris: { x: 0, y: 0, scale: 1.12 },
            } as const
            const names = Object.keys(entrances) as (keyof typeof entrances)[]

            photo.forEach((node, index) => {
              const declared = node.closest<HTMLElement>('[data-entrance]')?.dataset.entrance
              const key = (declared && declared in entrances ? declared : names[index % names.length]) as keyof typeof entrances
              timeline.from(
                node,
                { ...entrances[key], opacity: 0, duration, ease: 'power2.out' },
                index === 0 ? (heading.length ? '-=0.45' : 0) : `<${stagger}`,
              )
            })
          }
          if (layers.length) {
            /*
             * Ornamen masuk paling akhir dan dari jangkarnya sendiri: mekar dari bawah,
             * untaian dari atas. Itulah ritme yang membuat referensi terbaca lebih kaya
             * meski hanya memakai AOS.
             */
            timeline.from(layers, {
              scaleX: (index: number) => (layers[index]?.dataset.layerSlot === 'cascade' ? 1 : 0.5),
              y: (index: number) => (layers[index]?.dataset.layerSlot === 'cascade' ? -40 : 0),
              opacity: 0,
              transformOrigin: (index: number) => {
                const slot = layers[index]?.dataset.layerSlot
                if (slot === 'cascade') return 'top center'
                if (slot === 'crown') return 'top center'
                return 'bottom center'
              },
              duration: duration * 1.15,
              stagger,
              ease: 'expo.out',
            }, '-=0.9')
          }
        },

        travelPath(path, dot, { trigger, end = 'bottom 60%' } = {}) {
          if (!MotionPathPlugin) return
          const line = typeof path === 'string' ? document.querySelector<SVGPathElement>(path) : path
          const marker = typeof dot === 'string' ? document.querySelector(dot) : dot
          if (!line || !marker) return

          gsap.to(marker, {
            motionPath: { path: line, align: line, alignOrigin: [0.5, 0.5] },
            ease: 'none',
            scrollTrigger: { trigger: trigger ?? line, start: 'top 76%', end, scrub: 0.6 },
          })
        },

        countUp(target, to, { duration = 1.4, format = (value: number) => String(Math.round(value)) } = {}) {
          const state = { value: 0 }
          gsap.to(state, {
            value: to,
            duration,
            ease: 'power2.out',
            scrollTrigger: { trigger: target, start: 'top 90%', toggleActions: 'play none none none' },
            onUpdate: () => { target.textContent = format(state.value) },
          })
        },
      }

      setup(api)
    }, scope.value)


  })

  onBeforeUnmount(() => { ctx?.revert() })
}

/**
 * Timeline yang dipicu interaksi, bukan scroll — misalnya amplop yang dibuka saat diketuk.
 *
 * Tetap satu pintu ke GSAP seperti `useArunaMotion`: plugin dimuat sekali, setiap tween
 * dikurung dalam context komponen, dan semuanya dibersihkan saat komponen dilepas.
 * `play` mengembalikan `false` ketika pengunjung meminta gerak minimal, sehingga pemanggil
 * bisa langsung melompat ke keadaan akhir.
 */
export function useArunaTimeline(scope: Ref<HTMLElement | null>) {
  let ctx: Ctx | undefined
  onBeforeUnmount(() => { ctx?.revert() })

  async function play(build: (gsap: Gsap) => void): Promise<boolean> {
    if (!scope.value) return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false

    const { gsap } = await import('gsap')
    ctx = gsap.context(() => { build(gsap) }, scope.value)
    return true
  }

  return { play }
}
