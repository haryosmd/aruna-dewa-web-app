import type { MotionApi } from '~/composables/useArunaMotion'

import { resolveScore, type Entrance, type SectionRole, type ThemeMotion } from './motion-score'

/**
 * Koreografi undangan sebelum partitur ada.
 *
 * Dipindahkan apa adanya dari `Renderer.vue` — bukan ditulis ulang, bukan "kira-kira sama".
 * Tema yang belum punya `motion` menjalankan fungsi ini, sehingga sembilan tema yang sudah
 * terbit tidak bergeser satu frame pun sampai masing-masing dipindahkan ke partiturnya
 * sendiri dan dibandingkan satu per satu.
 *
 * Berkas ini dihapus setelah kesembilan tema punya partitur.
 */
export function playLegacyScore(
  api: Pick<MotionApi, 'gsap' | 'revealUp' | 'parallax' | 'drawSvg' | 'orchestrate'>,
): void {
  const { gsap, revealUp, parallax, drawSvg, orchestrate } = api

  // 70px terasa menyentak di layar pendek; 40 cukup untuk membuat foto terbaca sebagai jendela.
  parallax('[data-iv-parallax]', { distance: 40 })
  /*
   * Bagian ber-`data-iv-entrance="tanpa"` (fase 72) dilewati. Dokumen v1 tidak pernah punya
   * atribut itu, jadi untuk mereka pemilih ini identik dengan `[data-iv-reveal]` polos.
   */
  revealUp(`[data-iv-reveal]:not(${DIAM} [data-iv-reveal])`, { y: 26, stagger: 0.07 })

  /*
   * DrawSVG hanya bisa menggambar stroke. Sejak ornamen digambar bermassa, yang tersisa
   * untuk digambar tinggal detail bergaris bertanda `data-draw` — badan bentuknya diungkap
   * `orchestrate()` di bawah.
   */
  drawSvg('[data-iv-ornament] [data-draw] path, [data-iv-ornament] path[data-draw]', { duration: 1.8 })

  // Tile galeri bergantian bergerak lebih lambat, jadi kolomnya tidak naik serempak.
  parallax('[data-iv-gallery-slow]', { distance: 26 })

  /*
   * Koreografi per section: heading → foto → ladang ornamen. Inilah ritme yang membuat
   * referensi terbaca lebih kaya meski mesin motionnya hanya AOS — bukan pluginnya,
   * melainkan urutan dan jeda antar unsurnya.
   */
  gsap.utils.toArray<HTMLElement>('[data-iv-section]').forEach((section) => {
    if (section.dataset.ivEntrance === 'tanpa') return
    orchestrate(section, { stagger: 0.16, duration: 1.4, grammar: entranceOverride(section) })
  })

  // Rel timeline rundown tumbuh mengikuti scroll. Keadaan diam-nya scaleY(1) di CSS.
  gsap.utils.toArray<HTMLElement>('[data-iv-rail]').forEach((node) => {
    gsap.from(node, {
      scaleY: 0,
      transformOrigin: 'top center',
      ease: 'none',
      scrollTrigger: { trigger: node.parentElement ?? node, start: 'top 80%', end: 'bottom 70%', scrub: 0.5 },
    })
  })
}

/** Pemilih bagian yang memilih diam (fase 72). */
const DIAM = '[data-iv-entrance="tanpa"]'

/**
 * Penimpa tata bahasa masuk per bagian (fase 72): `section.data.motion` dipancarkan
 * `InvitationSection` sebagai `data-iv-entrance`. Nilai preset menimpa babak untuk bagian
 * itu saja; `tanpa` ditangani pemanggil (bagiannya dilewati sama sekali); yang lain
 * (`tema`, absen, nilai asing) mengembalikan `undefined` = ikut partitur.
 */
function entranceOverride(section: HTMLElement): Entrance | undefined {
  const nilai = section.dataset.ivEntrance
  return nilai === 'rise' || nilai === 'sweep' || nilai === 'iris' || nilai === 'silhouette' ? nilai : undefined
}

/**
 * Membaca babak dari DOM, bukan dari daftar section di dokumen.
 *
 * `Video.vue` (`v-if="url"`) dan `Rundown.vue` (`v-if="items.length"`) bisa merender NOL
 * elemen, jadi indeks daftar section tidak pernah cocok dengan indeks elemen. Membaca
 * `[data-iv-act]` dari DOM membuat section hantu hilang dengan sendirinya — termasuk dari
 * perhitungan posisi babak, sehingga kurva kepadatan mengukur halaman yang sungguh ada,
 * bukan halaman yang ada di dokumen.
 */
function bacaBabak(root: HTMLElement, score: ThemeMotion) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-iv-act]'))
    .filter(node => Boolean(node.dataset.ivAct))
  const acts = resolveScore(score, nodes.map(node => node.dataset.ivAct as SectionRole))

  let mulai = 0
  return acts.map((act) => {
    const milik = nodes.slice(mulai, mulai + act.span)
    mulai += act.span
    return { ...act, nodes: milik }
  })
}

/**
 * `[data-iv-act]` mendarat di root tiap komponen section lewat fallthrough atribut — dan
 * root itu tidak selalu `[data-iv-section]` itu sendiri. `Countdown.vue` dan `Closing.vue`
 * ber-root `<InvitationSection>`, jadi atributnya sampai ke `<section>`; `Rsvp.vue` dan
 * `Story.vue` ber-root `<div>` pembungkus, jadi ia mendarat di div itu.
 */
const sectionDari = (node: HTMLElement): HTMLElement | null =>
  node.matches('[data-iv-section]') ? node : node.querySelector<HTMLElement>('[data-iv-section]')

/**
 * Pemain partitur.
 *
 * Urutannya bukan selera: `orchestrate()` dipanggil **sebelum** `revealUp()`, karena
 * `orchestrate({ reveal: true })` menandai node yang sudah dilipat ke timeline section
 * dengan `data-iv-reveal-folded`, dan `revealUp()` mengecualikannya. Dibalik, tiap node
 * yang terlipat akan dapat dua gerakan masuk dari dua sumber sekaligus.
 */
export function playScore(api: MotionApi, plan: { root: HTMLElement, score: ThemeMotion, compact: boolean }): void {
  const { gsap, revealUp, parallax, drawSvg, orchestrate, drift, silhouette, segue, container } = api
  const babak = bacaBabak(plan.root, plan.score)
  if (!babak.length) return

  /*
   * Pratinjau editor melewati drift dan transisi. Jam scroll global tidak punya arti di
   * dalam div ber-`transform: scale()` yang men-scroll sendiri, dan menambah trigger ke
   * editor yang sudah berat tidak membeli apa pun.
   */
  const kaya = !plan.compact && !container.narrow

  for (const act of babak) {
    for (const node of act.nodes) {
      const section = sectionDari(node)
      if (!section) continue

      /*
       * Bagian yang memilih diam (fase 72) tidak mendapat gerakan masuk sama sekali: bukan
       * orchestrate, bukan reveal sisa di bawah — `revealUp` di bawah mengecualikannya lewat
       * pemilih. Drift dan segue tetap milik partitur tema, karena keduanya bukan "masuk".
       */
      if (section.dataset.ivEntrance === 'tanpa') continue
      const entrance = entranceOverride(section) ?? act.entrance

      orchestrate(section, {
        grammar: entrance,
        ornament: act.ornament,
        weight: act.weight,
        reveal: true,
        stagger: 0.16,
        duration: 1.4,
      })

      if (act.ornament === 'draw') {
        drawSvg(gsap.utils.toArray<SVGElement>(section.querySelectorAll('[data-iv-ornament] [data-draw] path, [data-iv-ornament] path[data-draw]')), { duration: 1.8 * act.weight })
      }

      if (act.ornament === 'drift' && kaya && act.drift) {
        drift(gsap.utils.toArray<HTMLElement>(section.querySelectorAll('[data-iv-layer]')), { amount: act.drift })
      }

      if (entrance === 'silhouette') {
        silhouette(gsap.utils.toArray<HTMLElement>(section.querySelectorAll('[data-iv-photo]')), { weight: act.weight })
      }
    }
  }

  // Sisa reveal yang tidak terlipat — isi jauh di bawah tepi section panjang.
  revealUp(`[data-iv-reveal]:not([data-iv-reveal-folded]):not(${DIAM} [data-iv-reveal])`, { y: 26, stagger: 0.07 })

  /*
   * Jarak parallax dipatok di sini, bukan di data tema: DESIGN.md mematoknya 40 untuk
   * undangan, dan aturan itu tidak boleh bisa dilanggar dari `theme.ts`.
   */
  const bobotTengah = babak.reduce((jumlah, act) => jumlah + act.weight, 0) / babak.length
  parallax('[data-iv-parallax]', { distance: Math.min(40, 32 * bobotTengah) })
  parallax('[data-iv-gallery-slow]', { distance: Math.min(40, 26 * bobotTengah) })

  if (kaya) {
    const pita = Array.from(plan.root.querySelectorAll<HTMLElement>('[data-iv-segue]'))
    for (const band of pita) {
      const kind = band.dataset.segueKind
      if (kind !== 'veil' && kind !== 'wipe' && kind !== 'dissolve') continue
      /*
       * `wipe` mahal dan nyaris tak terlihat pada pita setinggi 1,5rem di wadah sempit,
       * jadi di sana ia turun ke `veil` — yang murni `transform` dan karena itu murah di
       * ponsel, sekaligus tetap menyapukan siluet ornamennya. Yang turun bentuknya, bukan
       * ada-tidaknya transisi.
       */
      segue(band, band.nextElementSibling, {
        kind,
        from: band.dataset.segueFrom === 'top' ? 'top' : 'bottom',
      })
    }
  }

  // Rel timeline rundown tumbuh mengikuti scroll. Keadaan diam-nya scaleY(1) di CSS.
  gsap.utils.toArray<HTMLElement>('[data-iv-rail]').forEach((node) => {
    gsap.from(node, {
      scaleY: 0,
      transformOrigin: 'top center',
      ease: 'none',
      scrollTrigger: { trigger: node.parentElement ?? node, start: 'top 80%', end: 'bottom 70%', scrub: 0.5 },
    })
  })
}
