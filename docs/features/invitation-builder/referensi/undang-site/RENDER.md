# Bagaimana referensi merendernya

Dibaca 2026-09-22 dari pohon DOM `https://arunadewa.undang.site/`.

## Dua belas bagian, enam elemen

Referensi **melebur** bagian-bagiannya saat merender. Seluruh elemen ber-`id` di halamannya:

| `<section id>` | kelas | bagian logis yang ditampungnya |
|---|---|---|
| `home` | `hero` | `opening-envelope` + `hero` |
| `welcome` | `welcome paper-section` | `couple` |
| `event` | `event-section paper-section` | `countdown` + `event` + `map` |
| `gallery` | `gallery-section paper-section` | `quote` + `gallery` |
| `gift` | `gift-section` | `gift` |
| `wishes` | `wishes paper-section` | `wishes` + `closing` |

Ditambah satu `<button id="seal-instruction" class="seal-callout">` — segel amplopnya.

**Kita 1:1**, satu bagian satu elemen, dan itu disengaja: rail editor menggulirkan panggung ke
bagian yang dipilih (`Stage.vue:43-60` lewat `sectionDomId`), dan ornamen dipasang per bagian
(`sectionOrnamentSlots`). Peleburan ala referensi akan membuat "klik Lokasi di rail" mendarat
di tengah blok bertiga. Jadi selisih ini **bukan** utang — ia keputusan, dan ini catatannya.

Konsekuensi yang perlu diingat kalau suatu hari kita ingin meniru tata letak "kertas" mereka:
`paper-section` adalah pembungkus visual bersama untuk tiga blok, bukan properti satu bagian.
Padanan kita adalah `background` per bagian (`sections.ts`, fase 72), yang harus diset tiga kali.

## Gerak

Semuanya CSS `@keyframes` (`envelope-open-3d`, `hero-zoom`, `dove-hover`, `wish-in`) — tanpa
GSAP, tanpa Framer. Kita memakai partitur GSAP per bagian (`utils/motion-score.ts`,
`useArunaMotion.ts`), dan **itu pembeda yang disengaja**: referensi hanya menggerakkan
amplopnya, kita menggerakkan tiap bagian saat ia masuk layar (`FASE-72.md:92`).

## Stack

Next.js App Router + Turbopack (RSC), Cloudflare di depan, Meta Pixel. Dokumen undangannya
datang dari payload RSC halaman, bentuknya dicatat di `../../FASE-72.md:33-40` — dan di sanalah
**dua sumbu** itu terlihat: `templateCode: 'hjydg'` (struktur) dan `themeId: 'blue-gold'`
(warna). Itu yang jadi dasar fase 74.
