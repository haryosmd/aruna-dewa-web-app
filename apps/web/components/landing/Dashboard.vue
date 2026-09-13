<script setup lang="ts">
/**
 * Case-study dasbor.
 *
 * Sebelumnya bagian ini berupa tiruan dasbor yang digambar tangan. Tiruan berbohong
 * pelan-pelan: ia tidak ikut berubah saat dasbornya berubah, jadi setelah beberapa rilis
 * calon pembeli memutuskan berdasarkan layar yang tidak pernah ada. Sekarang isinya
 * tangkapan layar dasbor sungguhan, dibuat ulang lewat `pnpm capture:dashboard`.
 *
 * **Wajib diregenerasi setiap dasbor berubah** — prosedurnya di
 * `docs/features/landing-order/DASHBOARD-SHOWCASE.md`.
 */
const root = ref<HTMLElement | null>(null)

/**
 * Keadaan istirahatnya adalah daftar tegak biasa yang bisa dibaca seluruhnya. GSAP yang
 * menaikkannya jadi mockup ter-pin, dan hanya kalau ia benar-benar berjalan — pengunjung
 * yang meminta gerak minimal tetap mendapat kelima layar, bukan satu bidang kosong.
 */
const enhanced = ref(false)

const screens = [
  {
    id: 'ringkasan',
    title: 'Satu ruang untuk seluruh persiapan',
    body: 'Status draft, tautan publik, dan tombol terbit dalam satu layar. Yang dilihat tamu tidak berubah sampai kalian menekan Publikasikan.',
    callout: null,
  },
  {
    id: 'editor',
    title: 'Sunting sambil melihat hasilnya',
    body: 'Pilih bagian di kiri, isi di tengah, dan undangannya tersusun di kanan saat itu juga. Tidak ada simpan-lalu-tebak.',
    callout: { label: 'Pratinjau ikut berubah saat kalian mengetik', x: 79, y: 46 },
  },
  {
    id: 'tamu',
    title: 'Setiap tamu punya tautannya sendiri',
    body: 'Tempel daftar dari spreadsheet, tinjau dulu, baru simpan. Nama bergelar dan tanda baca tidak pernah rusak di tengah jalan.',
    callout: { label: 'Impor ditinjau dulu, bukan langsung ditelan', x: 62, y: 82 },
  },
  {
    id: 'rsvp',
    title: 'Konfirmasi dan doa berkumpul sendiri',
    body: 'Jawaban tamu masuk ke satu daftar yang bisa disaring, lengkap dengan jumlah kursi dan ucapan yang menunggu kalian tinjau.',
    callout: null,
  },
  {
    id: 'pesanan',
    title: 'Sekali bayar, tanpa langganan',
    body: 'Riwayat pesanan dan add-on yang aktif ada di sini. Tidak ada tagihan bulanan yang menunggu di belakang.',
    callout: null,
  },
] as const

useArunaMotion(root, ({ gsap, revealText, revealUp }) => {
  revealText('[data-dash-title]', { trigger: root.value })
  revealUp('[data-dash-intro]')

  const stage = root.value?.querySelector('[data-dash-stage]')
  const steps = gsap.utils.toArray<HTMLElement>('[data-dash-step]')
  if (!stage || steps.length < 2) return

  enhanced.value = true

  /*
   * Layar berikutnya baru dipadamkan setelah markup ditata ulang jadi tumpukan; satu
   * frame jeda supaya GSAP mengukur tinggi stage yang benar, bukan tinggi daftar tegak.
   */
  nextTick(() => {
    gsap.set(steps.slice(1), { opacity: 0 })

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'center center',
        end: () => `+=${steps.length * 68}%`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    })

    steps.forEach((step, at) => {
      if (at === 0) return
      timeline
        .to(steps[at - 1]!, { opacity: 0, duration: 0.45, ease: 'none' })
        .to(step, { opacity: 1, duration: 0.45, ease: 'none' }, '<')
    })
  })
})
</script>

<template>
  <section id="dashboard" ref="root" class="section grain bg-surface">
    <div class="shell grid gap-12">
      <header class="grid max-w-2xl gap-5">
        <p class="eyebrow" data-dash-intro>Ruang persiapan</p>
        <h2 data-dash-title class="font-display text-display-2 font-semibold text-ink">
          Dasbornya seperti ini. Bukan gambar contoh.
        </h2>
        <p data-dash-intro class="text-body-lg text-ink-muted">
          Kelima layar di bawah adalah tangkapan layar dasbor yang sungguhan, diambil ulang
          setiap kali produknya berubah. Yang kalian lihat di sini adalah yang kalian dapat.
        </p>
      </header>

      <div class="dash" :data-enhanced="enhanced ? 'true' : 'false'">
        <div data-dash-stage class="dash-stage">
          <figure v-for="screen in screens" :key="screen.id" data-dash-step class="dash-step">
            <!-- Chrome jendela: memberi konteks "ini aplikasi", tanpa meniru merek peramban mana pun. -->
            <div class="dash-window">
              <div class="dash-bar" aria-hidden="true">
                <span class="dash-dot" /><span class="dash-dot" /><span class="dash-dot" />
                <span class="dash-url">arunadewa.id/dashboard</span>
              </div>

              <div class="dash-shot">
                <img
                  :src="`/dashboard/${screen.id}-desktop.webp`"
                  :alt="`Layar ${screen.title.toLowerCase()} di dasbor Aruna Dewa`"
                  width="2160"
                  height="1350"
                  loading="lazy"
                  decoding="async"
                >
                <span
                  v-if="screen.callout"
                  class="dash-callout"
                  :style="{ left: `${screen.callout.x}%`, top: `${screen.callout.y}%` }"
                >{{ screen.callout.label }}</span>
              </div>
            </div>

            <!-- Potret mobile: produknya mobile-first, dan tamu hampir selalu membuka dari HP. -->
            <img
              :src="`/dashboard/${screen.id}-mobile.webp`"
              :alt="`Layar yang sama di layar ponsel`"
              width="585"
              height="1266"
              loading="lazy"
              decoding="async"
              class="dash-phone"
            >

            <figcaption class="dash-caption">
              <h3 class="m-0 font-display text-h3 font-semibold text-ink">{{ screen.title }}</h3>
              <p class="m-0 text-[0.9375rem] text-ink-muted">{{ screen.body }}</p>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
 * Dua tata letak dalam satu markup.
 *
 * Bawaan (`data-enhanced="false"`) adalah daftar tegak: kelima layar terbaca berurutan
 * tanpa JavaScript sama sekali. Setelah GSAP berjalan, kelimanya ditumpuk pada satu sel
 * grid dan section-nya dipaku, jadi layar berganti mengikuti scroll.
 */
.dash-stage { display: grid; gap: 4rem; }
.dash-step { margin: 0; display: grid; gap: 1.25rem; }

.dash[data-enhanced='true'] .dash-stage {
  gap: 0;
  grid-template-areas: 'stack';
}
.dash[data-enhanced='true'] .dash-step { grid-area: stack; }

/* ── Jendela ────────────────────────────────────────────────────────────────── */
.dash-window {
  overflow: hidden;
  border-radius: 0.9rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  box-shadow: var(--shadow-float, 0 30px 60px -30px rgb(23 17 13 / 0.35));
}
.dash-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-3);
}
.dash-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: var(--color-border-strong);
}
.dash-url {
  margin-left: 0.75rem;
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: var(--color-ink-subtle);
}

.dash-shot { position: relative; }
.dash-shot img { display: block; width: 100%; height: auto; }

/*
 * Callout menyorot satu hal per layar. Diberi `aria-hidden`? Tidak — kalimatnya
 * informasi sungguhan, dan pembaca layar berhak membacanya bersama caption.
 */
.dash-callout {
  position: absolute;
  transform: translate(-50%, -50%);
  max-width: 13rem;
  padding: 0.4rem 0.7rem;
  border-radius: 0.5rem;
  background: var(--color-ink);
  color: var(--color-ink-inverse);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  box-shadow: 0 10px 24px -12px rgb(23 17 13 / 0.6);
}

/* ── Potret ponsel ──────────────────────────────────────────────────────────── */
.dash-phone {
  display: none;
  width: 9rem;
  height: auto;
  border-radius: 1.1rem;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lift, 0 20px 40px -24px rgb(23 17 13 / 0.4));
}
@media (min-width: 64rem) {
  .dash-step {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'window phone'
      'caption phone';
    align-items: start;
    gap: 1.25rem 2rem;
  }
  .dash-window { grid-area: window; }
  .dash-phone { grid-area: phone; display: block; align-self: center; }
  .dash-caption { grid-area: caption; }
}

.dash-caption { display: grid; gap: 0.4rem; max-width: 44rem; }
</style>
