import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { templates } from '@aruna/contracts'

import { ornamentBank, type OrnamentId } from '../../apps/web/utils/ornaments'
import { ornamentRamp, ornamentRampOnDark, rampStyle } from '../../apps/web/utils/ornament-palette'
import { themePresentation } from '../../apps/web/utils/theme'
// @ts-expect-error — mesin gerbang adalah JS polos di luar app, sengaja.
import { jalankan } from './verify.mjs'

/**
 * Lembar kontak ornamen — gerbang yang tidak bisa ditulis sebagai angka.
 *
 * **Kenapa berkas ini ada.** Fase 41 meninggalkan satu kalimat: *"delapan gerbang meloloskan
 * tujuh bingkai yang jelas rusak di layar. Gerbang mengukur kepadatan, kelengkungan, bobot,
 * keunikan — tidak satu pun bisa melihat poligon yang memotong dirinya sendiri."* Fase 42
 * menambahkan empat gerbang yang bisa melihat sebagian dari itu, dan gerbang pertama langsung
 * menemukan sepuluh bingkai bersimpul yang sudah dinyatakan selesai. Tapi gerbang hanya pernah
 * mengukur cacat yang **sudah pernah terjadi**; yang belum pernah terjadi tidak punya metrik.
 *
 * Jadi yang terakhir tetap mata. Berkas ini yang membuat memakai mata jadi murah: satu halaman,
 * seluruh bank, dikelompokkan per tema — karena pertanyaan pemilik ("ornamen dan bingkai tidak
 * cocok") hanya bisa dijawab dengan melihat sebelas glyph satu tema bersebelahan.
 *
 * Ia mengimpor `ornamentRamp` dan `themePresentation` yang **sungguhan**, bukan salinannya.
 * Lembar yang memakai warna sendiri akan berbohong tepat di bagian yang sedang diperiksa.
 */

const akar = fileURLToPath(new URL('../../', import.meta.url))
const keluar = akar + '.forge/'

/** `AR` dipakai sebagai inisial contoh; segel memang menerima prop `initials`. */
const INISIAL = 'AR'

/**
 * Mengubah template Vue sebuah ornamen jadi SVG statis.
 *
 * Hanya tiga bentuk dinamis yang ada di bank — diperiksa, bukan diasumsikan: `{{ initials }}`
 * (13 berkas), `v-for="x in [...]"` dengan `:transform`/`:x` (18 berkas), dan `v-if`. Kalau
 * suatu saat ada bentuk keempat, berkas ini harus diperluas, bukan dibiarkan diam-diam
 * merender ornamen yang lebih miskin daripada yang sebenarnya dikirim ke tamu.
 */
function keSvg(raw: string): string {
  const cocok = raw.match(/<svg[\s\S]*?<\/svg>/)
  if (!cocok) return ''
  let svg = cocok[0]

  // `v-for` pada elemen berkurung: ulangi seluruh blok untuk tiap nilai.
  svg = svg.replace(
    /<(\w+)([^>]*?)v-for="(\w+) in \[([^\]]*)\]"([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g,
    (_semua, tag, sebelum, nama, daftar, sesudah, ekor, anak) => {
      const nilai = daftar.split(',').map((v: string) => Number(v.trim()))
      const tutup = ekor === '/>'
      return nilai.map((v) => {
        const atribut = `${sebelum} ${sesudah}`
          .replace(/:key="[^"]*"/g, '')
          .replace(/:([\w-]+)="([^"]*)"/g, (_m: string, kunci: string, ekspresi: string) => {
            const hasil = new Function(nama, `return (${ekspresi})`)(v)
            return `${kunci}="${hasil}"`
          })
        return tutup ? `<${tag}${atribut}/>` : `<${tag}${atribut}>${anak}</${tag}>`
      }).join('')
    },
  )

  return svg
    .replace(/\{\{\s*initials\s*\}\}/g, INISIAL)
    .replace(/\sv-if="[^"]*"/g, '')
    .replace(/\s:key="[^"]*"/g, '')
}

const hasil = jalankan() as { perGlyph: Record<string, string[]>, ukuran: Record<string, { bytes: number, subpath: number }> }

const temaDari: Record<string, string> = {}
for (const [id, p] of Object.entries(themePresentation)) {
  for (const g of Object.values(p.ornaments)) {
    if (typeof g === 'string') temaDari[g] = id
    else for (const l of g) temaDari[l] = id
  }
}

const gaya = (obj: Record<string, string>) =>
  Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';')

/**
 * Isi sebuah keping: SVG yang di-inline, atau `<img>` untuk entri beraset.
 *
 * Entri beraset datang dari `referenceOrnaments` — koleksi referensi pemilik yang tayang
 * sebagai berkas di `apps/web/public/ornaments/`, bukan sebagai komponen. `component`-nya
 * menunjuk `OrnamentReferenceAsset` yang memang tidak ada berkasnya, dan `Glyph.vue` sudah
 * memintasnya jadi `<img>`. Lembar ini belum tahu, jadi ia mati dengan ENOENT sebelum
 * menggambar satu kartu pun.
 *
 * Asetnya **tidak** di-inline sebagai data URI: 65 berkas berbobot 24 MB dengan PNG sampai
 * 1,9 MB, dan lembar ini sudah 4,9 MB. Ia dirujuk relatif, dan penyajinya yang diajari
 * mencarinya di akar repo.
 */
function isiKeping(entri: { component: string, asset?: string }): string {
  if (entri.asset) return `<img src="..${entri.asset.replace('/ornaments/', '/apps/web/public/ornaments/')}" alt="" loading="lazy">`
  return keSvg(readFileSync(`${akar}apps/web/components/ornament/${entri.component.replace(/^Ornament/, '')}.vue`, 'utf8'))
}

function kartu(id: string): string {
  const entri = ornamentBank[id as OrnamentId] as { component: string, asset?: string, category: string }
  const svg = isiKeping(entri)
  const gagal = hasil.perGlyph[id] ?? []
  const u = hasil.ukuran[id]
  const lencana = gagal.length
    ? `<span class="gagal">${gagal.join(' · ')}</span>`
    : '<span class="lulus">lolos</span>'
  return `<figure class="kartu">
    <div class="ukuran"><div class="s48">${svg}</div><div class="s120">${svg}</div><div class="s240">${svg}</div></div>
    <figcaption><b>${id}</b> <small>${entri.category} · ${u?.bytes ?? 0}B · ${u?.subpath ?? 0} sub</small><br>${lencana}</figcaption>
  </figure>`
}

const bagian: string[] = []
for (const t of templates) {
  const p = themePresentation[t.id]
  const terang = ornamentRamp(t.tokens, t.accent)
  const gelap = ornamentRampOnDark(t.accent, t.tokens.primary)
  const milik = Object.keys(ornamentBank).filter(id => temaDari[id] === t.id)
  bagian.push(`<section>
    <h2>${t.id} <small>${p.mood}</small></h2>
    <div class="palet">${Object.entries(terang).map(([k, v]) => `<span style="background:${v}">${k}<br>${v}</span>`).join('')}</div>
    <div class="dua">
      <div class="bidang terang" style="${gaya({ ...rampStyle(terang), background: t.tokens.background, color: t.tokens.primary })}">
        <h3>kertas</h3><div class="kisi">${milik.map(kartu).join('')}</div>
      </div>
      <div class="bidang gelap" style="${gaya({ ...rampStyle(gelap), background: t.tokens.primary, color: '#fffdf7' })}">
        <h3>bidang gelap</h3><div class="kisi">${milik.map(kartu).join('')}</div>
      </div>
    </div>
  </section>`)
}

const lepas = Object.keys(ornamentBank).filter(id => !temaDari[id])
const t0 = templates[0]!
bagian.push(`<section>
  <h2>tanpa tema <small>${lepas.length} glyph</small></h2>
  <div class="bidang terang" style="${gaya({ ...rampStyle(ornamentRamp(t0.tokens, t0.accent)), background: t0.tokens.background, color: t0.tokens.primary })}">
    <div class="kisi">${lepas.map(kartu).join('')}</div>
  </div>
</section>`)

const total = Object.keys(ornamentBank).length
const gagalJml = Object.keys(hasil.perGlyph).length
const html = `<!doctype html><meta charset="utf-8"><title>Lembar kontak ornamen</title>
<style>
  body{font:13px/1.5 ui-sans-serif,system-ui;margin:0;background:#15161a;color:#e8e6e1}
  header{padding:16px 20px;position:sticky;top:0;background:#15161a;border-bottom:1px solid #333;z-index:2}
  h2{margin:28px 20px 8px;font-size:15px}h2 small{font-weight:400;opacity:.6}
  h3{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.55}
  .palet{display:flex;gap:6px;margin:0 20px 10px}
  .palet span{flex:1;padding:6px 8px;font-size:10px;color:#000;text-shadow:0 0 6px #fff9;border-radius:4px}
  .dua{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 20px}
  @media(max-width:900px){.dua{grid-template-columns:1fr}}
  .bidang{padding:14px;border-radius:8px}
  .kisi{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
  .kartu{margin:0;background:#ffffff14;border-radius:6px;padding:8px;outline:1px solid #8884}
  .ukuran{display:flex;align-items:flex-end;gap:10px;justify-content:center;min-height:200px}
  .s48 svg,.s48 img{width:40px;height:auto}.s120 svg,.s120 img{width:76px;height:auto}.s240 svg,.s240 img{width:190px;height:auto}
  .ukuran img{display:block;object-fit:contain}
  figcaption{margin-top:8px;font-size:10px;line-height:1.35;opacity:.9;word-break:break-all}
  figcaption small{opacity:.6}
  .gagal{color:#ff9d8a}.lulus{color:#8ad6a0}
</style>
<header><b>Lembar kontak ornamen</b> — ${total} glyph, ${gagalJml} gagal gerbang.
Dibangkitkan <code>pnpm ornament:sheet</code>. Lihat pada 375px dan 1440px, dua bidang.</header>
${bagian.join('\n')}
`

mkdirSync(keluar, { recursive: true })
writeFileSync(keluar + 'ornament-sheet.html', html)
console.log(`${keluar}ornament-sheet.html — ${total} glyph, ${gagalJml} gagal gerbang`)

/**
 * Menyajikan lembar lewat HTTP kalau dipanggil `--sajikan`.
 *
 * `file://` ditolak panel browser, dan lembar ini tidak ada gunanya kalau tidak bisa dibuka.
 * Sepuluh baris di sini lebih murah daripada dependensi server statis.
 */
if (process.argv.includes('--sajikan')) {
  const { createServer } = await import('node:http')
  const port = 4173
  createServer((req, res) => {
    const nama = (req.url ?? '/').split('?')[0] === '/' ? 'ornament-sheet.html' : (req.url ?? '').slice(1)
    // Berkasnya dibaca LEBIH DULU, baru headernya ditulis. Urutan sebaliknya membuat
    // permintaan `/favicon.ico` yang wajar menjatuhkan seluruh server dengan
    // ERR_HTTP_HEADERS_SENT — dan servernya memang sempat jatuh begitu.
    let isi: Buffer
    // Dua akar: lembarnya sendiri di `.forge/`, dan aset referensi yang dirujuk relatif ke
    // akar repo. Tanpa yang kedua tiap `<img>` keping referensi menjawab 404.
    try { isi = readFileSync(keluar + nama) }
    catch {
      try { isi = readFileSync(akar + nama.replace(/^(\.\.\/)+/, '')) }
      catch { res.writeHead(404); res.end('tidak ada'); return }
    }
    const jenis = nama.endsWith('.html') ? 'text/html; charset=utf-8'
      : nama.endsWith('.svg') ? 'image/svg+xml'
        : nama.endsWith('.png') ? 'image/png'
          : nama.endsWith('.webp') ? 'image/webp'
            : 'text/plain'
    res.writeHead(200, { 'content-type': jenis })
    res.end(isi)
  }).listen(port, '127.0.0.1', () => console.log(`lembar kontak: http://127.0.0.1:${port}/`))
}
