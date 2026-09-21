import type { gsap as GsapType } from 'gsap'

import type { Entrance, OrnamentMotion } from '~/utils/motion-score'

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
  drawSvg: (target: string | Element | Element[], options?: { duration?: number; start?: string; stagger?: number }) => void
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
  orchestrate: (section: Element, options?: {
    stagger?: number
    duration?: number
    start?: string
    /** Tata bahasa masuk yang diminta babak. Tetap kalah oleh `data-entrance` di markup. */
    grammar?: Entrance
    /** Perilaku keping `[data-iv-layer]` di section ini. */
    ornament?: OrnamentMotion
    /** Pengali durasi dan jarak dari partitur babak; pemanggil sudah mematoknya 0,6–1,4. */
    weight?: number
    /**
     * Lipat `[data-iv-reveal]` milik section ini ke dalam timeline section, alih-alih
     * memberi tiap node ScrollTrigger-nya sendiri. Node yang dilipat ditandai
     * `data-iv-reveal-folded` supaya pemanggil bisa mengecualikannya dari `revealUp`,
     * jadi `orchestrate()` harus dipanggil **sebelum** `revealUp()`.
     */
    reveal?: boolean
  }) => void
  /**
   * Menggeser keping mengikuti progres scroll SELURUH halaman, bukan progres section-nya.
   *
   * Satu ScrollTrigger dipakai bersama semua pemanggil di dalam satu context: tiap keping
   * jadi tween pada satu timeline ber-scrub yang membentang dari atas ke bawah scope.
   * Seratus ornamen yang melayang karena itu tetap **satu** entri di daftar trigger global;
   * memberi tiap keping trigger sendiri adalah cara tercepat menabrak kembali bug
   * `_triggers[i].end` yang dicatat di atas berkas ini.
   */
  drift: (target: string | Element | Element[], options?: { amount?: number; axis?: 'x' | 'y'; scrub?: number }) => void
  /**
   * Bentuk keluar dari siluetnya sendiri: rata gelap dan tanpa warna, lalu menyala
   * mengikuti scroll.
   *
   * Memakai `filter`, **tidak pernah `opacity`** — targetnya foto cover, yang biasanya
   * elemen LCP, dan elemen LCP tidak boleh pernah bening. Di-scrub, bukan di-tween sekali,
   * supaya tamu merasa merekalah yang menyalakannya.
   */
  silhouette: (target: string | Element | Element[], options?: { start?: string; end?: string; weight?: number }) => void
  /**
   * Transisi antar-babak. Yang dianimasikan adalah `band` — pita yang **sudah ada di
   * markup** dan sudah terbaca sebagai pembatas bab tanpa JS — bukan lapisan yang dibuat
   * JS lalu menelan section di bawahnya.
   *
   * Tidak satu pun ragamnya memaku halaman, jadi batas 1–2 `pin` per halaman di DESIGN.md
   * tetap utuh betapapun banyak babak yang diberi transisi.
   */
  segue: (
    band: Element,
    next: Element | null,
    options?: { kind?: 'dissolve' | 'veil' | 'wipe'; from?: 'top' | 'bottom'; scrub?: number },
  ) => void
  /** Menggerakkan sebuah titik menyusuri path SVG mengikuti scrub. */
  travelPath: (path: string | SVGPathElement, dot: string | Element, options?: { trigger?: Element | null; end?: string }) => void
  /**
   * Lebar **wadah** motion, bukan lebar viewport, dan diukur dengan `clientWidth`.
   *
   * Undangan mengukur dirinya sendiri (`.iv-root { container-type: inline-size }`), dan
   * editor merendernya di dalam `transform: scale()`. Pada pratinjau "Ponsel" yang
   * diperkecil, `getBoundingClientRect().width` mengembalikan 97px sementara container
   * query melihat 390px; `gsap.matchMedia()` lebih parah lagi — ia melihat viewport editor
   * 1440px dan berbohong dua kali lipat. `clientWidth` adalah satu-satunya dari ketiganya
   * yang menjawab lebar tata letak yang sama dengan yang dibaca CSS.
   */
  container: { width: number; narrow: boolean }
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
 * Anggaran jumlah ScrollTrigger untuk satu wadah motion.
 *
 * Setelah anggaran habis, permintaan gerakan berikutnya **dijatuhkan diam-diam** — dan itu
 * aman justru karena aturan markup keadaan-akhir: tidak ada `opacity: 0` di stylesheet,
 * jadi trigger yang tidak jadi dipasang berarti elemen yang sudah terbaca, bukan elemen
 * yang hilang. Properti itulah yang selama ini dibeli aturan tersebut, dan di sini ia
 * terbayar.
 *
 * **Kenapa angkanya selonggar ini.** `/i/demo` yang baru 12 section sudah memasang
 * **105** trigger (diukur, bukan diperkirakan): 41 di antaranya `[data-iv-reveal]`, yang
 * jumlahnya tumbuh mengikuti isi — dinding ucapan tiga puluh pesan dan galeri tiga puluh
 * foto menambahnya puluhan lagi. Anggaran ketat di sini karena itu bukan jaring pengaman
 * melainkan pembatas yang menggigit undangan yang hari ini baik-baik saja, dan yang mati
 * adalah gerakan di bagian bawah halaman — tempat yang paling jarang diperiksa orang.
 *
 * Jadi untuk sekarang ia murni penahan agar daftar trigger tidak tumbuh tanpa batas.
 * Angkanya diperketat **setelah** `orchestrate` bisa melipat `[data-iv-reveal]` ke dalam
 * timeline section-nya, karena saat itulah permintaannya benar-benar turun; memperketat
 * sebelum itu hanya memindahkan masalahnya jadi gerakan yang hilang.
 */
const triggerBudget = 240

/**
 * Ambang wadah sempit, sama dengan `@container (min-width: 40rem)` yang sudah dipakai
 * galeri dan gift — supaya JS dan CSS tidak pernah berpindah gigi di titik yang berbeda.
 */
const narrowWidth = 640

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
  let teardown: (() => void) | undefined

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

    const root = scope.value
    if (!root) return

    const narrowOf = () => root.clientWidth < narrowWidth
    let bucket = narrowOf()

    /**
     * Split yang dibuat context ini, dicatat supaya bisa dilepas sendiri.
     *
     * `revealText` menyisipkan pembungkus `.split-line-wrap` lewat DOM biasa, bukan lewat
     * gsap, jadi `ctx.revert()` tidak menyentuhnya. Tanpa catatan ini, context yang
     * dibangun ulang saat lebar berganti bucket akan membungkus baris yang sudah
     * terbungkus — dan barisnya jadi kacau tanpa satu pun galat di konsol.
     */
    let splits: { revert: () => void }[] = []

    let triggers = 0
    const canTrigger = () => { triggers += 1; return triggers <= triggerBudget }

    const build = () => {
      triggers = 0
      splits = []
      /**
       * Jam scroll global: satu timeline ber-scrub untuk seluruh halaman, dibuat malas pada
       * panggilan `drift()` pertama dan dipakai bersama semua pemanggil berikutnya. Hidup di
       * dalam `build()` supaya ia mati bersama context-nya saat lebar berganti bucket.
       */
      let clock: ReturnType<Gsap['timeline']> | undefined
      const scrollClock = (scrub: number) => {
        if (clock) return clock
        if (!canTrigger()) return undefined
        clock = gsap.timeline({
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub },
        })
        return clock
      }

      ctx = gsap.context(() => {
      const api: MotionApi = {
        gsap,
        container: { width: root.clientWidth, narrow: bucket },

        revealText(target, { delay = 0, stagger = 0.09, trigger } = {}) {
          const node = typeof target === 'string' ? document.querySelector(target) : target
          if (!node) return

          // Teks yang sudah lama terbaca tidak boleh disembunyikan lagi demi gerakan masuk.
          if (!trigger && motionLatency > revealBudget) return
          if (trigger && !canTrigger()) return

          if (!SplitText) {
            gsap.from(node, { opacity: 0, y: 24, duration: 0.7, delay, ease: 'power3.out' })
            return
          }

          const split = new SplitText(node, { type: 'lines', linesClass: 'split-line' })
          splits.push(split)
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
            if (!canTrigger()) return
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
            if (!canTrigger()) return
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
          const paths = resolveNodes(target) as unknown as SVGElement[]

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
            if (!canTrigger()) return
            gsap.fromTo(
              members,
              { drawSVG: '0%' },
              { drawSVG: '100%', duration, stagger, ease: 'power2.inOut', scrollTrigger: { trigger: owner, start, toggleActions: 'play none none none' } },
            )
          })
        },

        bloomIn(target, { origin = 'bottom center', stagger = 0.14, duration = 1.35, start = 'top 88%' } = {}) {
          resolveNodes(target).forEach((node, index) => {
            if (!canTrigger()) return
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
            if (!canTrigger()) return
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

        orchestrate(section, { stagger = 0.16, duration = 1.35, start = 'top 78%', grammar, ornament, weight = 1, reveal = false } = {}) {
          const pick = (selector: string) => gsap.utils.toArray<HTMLElement>(section.querySelectorAll(selector))
          const heading = pick('[data-iv-lead]')
          const photo = pick('[data-iv-photo]')
          const layers = pick('[data-iv-layer]')
          const frames = pick('[data-iv-photo-frame]')

          /*
           * Hanya `[data-iv-reveal]` yang berada di satu tinggi layar pertama section yang
           * dilipat. Melipat node yang 2000px di bawah trigger membuat seluruh isi section
           * panjang — dinding ucapan tiga puluh pesan — menyala sekaligus begitu tepi
           * atasnya tersentuh, dan itu lebih buruk daripada trigger per node.
           */
          const folded: HTMLElement[] = []
          if (reveal) {
            const top = section.getBoundingClientRect().top
            for (const node of pick('[data-iv-reveal]')) {
              if (node.getBoundingClientRect().top - top >= window.innerHeight) continue
              node.dataset.ivRevealFolded = ''
              folded.push(node)
            }
          }

          if (!heading.length && !photo.length && !layers.length && !frames.length && !folded.length) return
          if (!canTrigger()) return

          // Pemanggil sudah mematok bobotnya; patok lagi di sini supaya primitif ini tetap
          // benar kalau suatu saat dipanggil dari tempat yang belum mematoknya.
          const w = Math.min(1.4, Math.max(0.6, weight))
          duration *= w
          stagger *= w

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
              iris: { x: 0, y: 0, scale: 1.06 },
            } as const
            const names = Object.keys(entrances) as (keyof typeof entrances)[]

            /*
             * Tata bahasa babak memilih dari tabel yang sama, tapi menyempitkannya jadi satu
             * karakter alih-alih memutar keempatnya. `silhouette` sengaja jatuh ke `rise` di
             * sini: penggelapannya dikerjakan primitif `silhouette()`, yang ber-scrub sendiri,
             * dan menumpuk keduanya pada foto yang sama membuat gerakan masuknya bertabrakan
             * dengan scrub-nya.
             */
            const fromGrammar = (index: number): keyof typeof entrances => {
              if (grammar === 'sweep') return index % 2 === 0 ? 'sweep-left' : 'sweep-right'
              if (grammar === 'iris') return 'iris'
              if (grammar === 'rise' || grammar === 'silhouette') return 'rise'
              return names[index % names.length]!
            }

            photo.forEach((node, index) => {
              const declared = node.closest<HTMLElement>('[data-entrance]')?.dataset.entrance
              const key = (declared && declared in entrances ? declared : fromGrammar(index)) as keyof typeof entrances
              timeline.from(
                node,
                { ...entrances[key], opacity: 0, duration, ease: 'power2.out' },
                index === 0 ? (heading.length ? '-=0.45' : 0) : `<${stagger}`,
              )
            })
          }
          /*
           * Ornamen pembingkai foto, di timeline yang SAMA dan tumpang tindih dengan fotonya.
           *
           * Aturan 6 DESIGN.md menuntut rentang scroll yang sama, bukan gerakan kedua yang
           * berdiri sendiri — jadi ini `'<0.12'` terhadap tween foto terakhir, bukan
           * ScrollTrigger sendiri. Bedanya terasa: bingkai yang punya trigger sendiri akan
           * mengatup lagi setelah fotonya selesai, dan pada cover setinggi satu layar
           * (`--iv-layar-h`, bawaan 92svh — fase 74.2) jaraknya
           * cukup jauh untuk terbaca sebagai dua kejadian terpisah.
           *
           * `transformOrigin` sengaja TIDAK disentuh. Menggeser origin ke pojok memang
           * membuat sudut terbaca tumbuh dari situ, tapi `.iv-portrait-corner--br` dibalik
           * `transform: rotate(180deg)` lewat CSS — dan memutar 180° mengelilingi pojok,
           * bukan mengelilingi pusat, memindahkan keping itu sejauh lebarnya sendiri keluar
           * dari fotonya. Skala berpusat pada 0,88 memberi rasa mengatup yang sama tanpa
           * menukar sistem koordinat milik CSS.
           */
          if (frames.length) {
            timeline.from(frames, {
              scale: 0.88,
              opacity: 0,
              duration: duration * 0.9,
              stagger: stagger * 0.5,
              ease: 'expo.out',
            }, photo.length ? '<0.12' : (heading.length ? '-=0.45' : 0))
          }
          /*
           * Ornamen masuk paling akhir dan dari jangkarnya sendiri: mekar dari bawah,
           * untaian dari atas. Itulah ritme yang membuat referensi terbaca lebih kaya
           * meski hanya memakai AOS.
           *
           * `draw` dan `drift` sengaja tidak punya gerakan masuk di sini: keduanya
           * dikerjakan primitif sendiri yang ber-scrub (`drawSvg`, `drift`), dan menumpuk
           * gerakan masuk di atas scrub membuat keping bergerak dua kali dari dua sumber.
           */
          if (layers.length && ornament !== 'draw' && ornament !== 'drift') {
            // `cascade` memaksa SELURUH keping jatuh dari atas, bukan hanya yang slotnya
            // kebetulan `cascade` — itulah bedanya partitur ronce dari partitur mekar.
            const jatuh = (index: number) => ornament === 'cascade' || layers[index]?.dataset.layerSlot === 'cascade'
            timeline.from(layers, {
              scaleX: (index: number) => (jatuh(index) ? 1 : 0.5),
              y: (index: number) => (jatuh(index) ? -40 * w : 0),
              rotate: (index: number) => (ornament === 'cascade' ? (index % 2 === 0 ? -3 : 3) : 0),
              opacity: 0,
              transformOrigin: (index: number) => {
                if (jatuh(index)) return 'top center'
                return layers[index]?.dataset.layerSlot === 'crown' ? 'top center' : 'bottom center'
              },
              duration: duration * 1.15,
              stagger,
              ease: 'expo.out',
            }, '-=0.9')
          }

          /*
           * Reveal yang dilipat masuk paling akhir dan sebagai satu gerakan berjenjang,
           * bukan sebagai puluhan trigger yang kebetulan bertetangga. Inilah yang membayar
           * kembali trigger yang dipinjam `drift` dan `segue`.
           */
          if (folded.length) {
            timeline.from(folded, {
              opacity: 0,
              y: 26 * w,
              duration: duration * 0.62,
              stagger: Math.min(0.08, 0.5 / folded.length),
              ease: 'power3.out',
            }, heading.length || photo.length ? '-=0.7' : 0)
          }
        },

        drift(target, { amount = 10, axis = 'y', scrub = 0.8 } = {}) {
          const nodes = resolveNodes(target)
          if (!nodes.length) return
          const tl = scrollClock(scrub)
          if (!tl) return

          const prop = axis === 'x' ? 'xPercent' : 'yPercent'
          const jarak = Math.min(18, Math.max(0, amount)) / 2
          if (!jarak) return

          nodes.forEach((node, index) => {
            // Arah berselang: kalau semua keping bergeser searah, halaman terbaca seperti
            // satu lembar yang melorot, bukan seperti kedalaman.
            const arah = index % 2 === 0 ? 1 : -1
            tl.fromTo(
              node,
              { [prop]: -jarak * arah },
              { [prop]: jarak * arah, ease: 'none', duration: 1 },
              0,
            )
          })
        },

        silhouette(target, { start = 'top 85%', end = 'top 38%', weight = 1 } = {}) {
          resolveNodes(target).forEach((node) => {
            /*
             * Foto yang sudah lama tercat tidak boleh digelapkan lagi demi gerakan masuk —
             * alasan yang sama persis dengan `revealBudget` pada `revealText`, kecuali di
             * sini yang berkedip adalah elemen LCP halaman. Yang di bawah lipatan belum
             * pernah terlihat, jadi tidak ada yang bisa berkedip di sana.
             */
            const terlihat = node.getBoundingClientRect().top < window.innerHeight
            if (terlihat && motionLatency > revealBudget) return
            if (!canTrigger()) return

            gsap.fromTo(
              node,
              { filter: 'grayscale(1) brightness(0.3) contrast(1.12)' },
              {
                filter: 'grayscale(0) brightness(1) contrast(1)',
                ease: 'none',
                scrollTrigger: { trigger: node.parentElement ?? node, start, end, scrub: 0.6 * weight },
              },
            )
          })
        },

        segue(band, next, { kind = 'dissolve', from = 'bottom', scrub = 0.7 } = {}) {
          const shape = band.querySelector<HTMLElement>('.iv-segue-shape, .iv-segue-rule')

          if (kind === 'dissolve') {
            if (!shape || !canTrigger()) return
            gsap.fromTo(
              shape,
              { scaleX: 0.3, opacity: 0.25 },
              {
                scaleX: 1, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: band, start: 'top 92%', end: 'bottom 62%', scrub },
              },
            )
            return
          }

          if (kind === 'veil') {
            if (!shape || !canTrigger()) return
            /*
             * Pita menutup lalu membuka lagi: `yoyo` di atas scrub, bukan dua tween, supaya
             * menggulir balik mengembalikannya persis ke tempatnya.
             */
            gsap.fromTo(
              shape,
              { scaleY: 0.34, yPercent: from === 'top' ? -18 : 18 },
              {
                scaleY: 1.9, yPercent: 0, ease: 'none',
                scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub },
              },
            )
            return
          }

          /*
           * `wipe` memotong section BERIKUTNYA, jadi ia hanya boleh dipasang untuk section
           * yang saat setup masih di bawah lipatan.
           *
           * Section yang sudah tercat tidak boleh di-clip: itu persis kegagalan "judul
           * hilang lalu datang lagi" yang dijaga `revealBudget`, kecuali yang hilang di
           * sini satu section penuh. Tanpa penjaga ini, undangan yang dibuka langsung di
           * tengah halaman — tautan ber-anchor, atau pemulihan posisi scroll oleh browser —
           * kehilangan section yang seharusnya sudah terlihat.
           */
          if (!next) return
          if (next.getBoundingClientRect().top <= window.innerHeight) return
          if (!canTrigger()) return

          gsap.fromTo(
            next,
            { clipPath: from === 'top' ? 'inset(38% 0% 0% 0%)' : 'inset(0% 0% 38% 0%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
              scrollTrigger: { trigger: band, start: 'top 86%', end: 'bottom 48%', scrub },
            },
          )
        },

        travelPath(path, dot, { trigger, end = 'bottom 60%' } = {}) {
          if (!MotionPathPlugin) return
          const line = typeof path === 'string' ? document.querySelector<SVGPathElement>(path) : path
          const marker = typeof dot === 'string' ? document.querySelector(dot) : dot
          if (!line || !marker) return
          if (!canTrigger()) return

          gsap.to(marker, {
            motionPath: { path: line, align: line, alignOrigin: [0.5, 0.5] },
            ease: 'none',
            scrollTrigger: { trigger: trigger ?? line, start: 'top 76%', end, scrub: 0.6 },
          })
        },

        countUp(target, to, { duration = 1.4, format = (value: number) => String(Math.round(value)) } = {}) {
          if (!canTrigger()) return
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
      }, root)
    }

    build()

    const teardownCtx = () => {
      ctx?.revert()
      ctx = undefined
      splits.forEach((split) => { try { split.revert() } catch { /* sudah terlepas bersama DOM-nya */ } })
      splits = []
    }

    /*
     * Urutan refresh: font dulu, gambar sesudahnya, lebar terakhir. Urutannya memang
     * bergantung.
     *
     * Heading undangan `clamp(2.1rem, 7cqw, 3.4rem)` berganti tinggi begitu font display
     * tiba, dan setiap `start: 'top 78%'` yang sudah dihitung sebelum itu meleset sepanjang
     * halaman. Sebelum ini tidak ada satu pun `ScrollTrigger.refresh()` di repo.
     */
    let refreshTimer = 0
    const queueRefresh = () => {
      window.clearTimeout(refreshTimer)
      // Galeri dua puluh foto `loading="lazy"` tidak boleh memicu dua puluh refresh.
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120)
    }

    /*
     * `document.fonts.ready` dibalap timeout, bukan ditunggu saja: fase 18 menemukan ia
     * **tidak pernah resolve** di WebKit ketika satu `@font-face` gagal — `FontFaceSet`
     * membeku dan seluruh janjinya ikut menggantung. Refresh yang telat masih berguna;
     * refresh yang tidak pernah datang tidak.
     */
    void Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]).then(() => ScrollTrigger.refresh()).catch(() => {})

    const pending = gsap.utils.toArray<HTMLImageElement>(root.querySelectorAll('img')).filter(img => !img.complete)
    pending.forEach((img) => {
      img.addEventListener('load', queueRefresh)
      img.addEventListener('error', queueRefresh)
    })

    /*
     * Bucket lebar diawasi, bukan dibaca sekali. Pratinjau editor berpindah
     * Ponsel↔Laptop tanpa me-remount Renderer, jadi context yang dibangun untuk 390px
     * akan terus berjalan di 1280px. `gsap.matchMedia()` tidak bisa menggantikannya: ia
     * mendengarkan viewport, dan viewport editor tidak pernah berubah.
     */
    let resizeTimer = 0
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        const next = narrowOf()
        if (next === bucket) { ScrollTrigger.refresh(); return }
        bucket = next
        teardownCtx()
        build()
      }, 150)
    })
    observer.observe(root)

    teardown = () => {
      observer.disconnect()
      window.clearTimeout(resizeTimer)
      window.clearTimeout(refreshTimer)
      pending.forEach((img) => {
        img.removeEventListener('load', queueRefresh)
        img.removeEventListener('error', queueRefresh)
      })
      teardownCtx()
    }
  })

  onBeforeUnmount(() => { teardown?.(); ctx?.revert() })
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
