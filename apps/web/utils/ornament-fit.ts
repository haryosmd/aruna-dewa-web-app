import type { OrnamentId } from './ornaments'
import { ambangBerat, ornamentMetrics } from './ornament-metrics'
import { themeOrnaments } from './theme'

/**
 * Seberapa cocok sebuah glyph dengan tema yang sedang dipakai — dan kenapa tidak, kalau tidak.
 *
 * Fase 59 membuka seluruh bank ke pemilih atas keputusan pemilik. Yang menggantikan larangan
 * lama bukan "tidak ada penjagaan", melainkan **penjagaan yang berubah jadi keterangan**:
 * pasangan tetap boleh memilih keping yang tidak seresep, tapi ia diberi tahu lebih dulu, dengan
 * kalimat, bukan dengan warna.
 *
 * Angkanya datang dari `ornament-metrics.ts` yang dibangkitkan `pnpm ornament:metrics` dari
 * gerbang forge yang sama yang menjaga kolam terkurasi. Itu disengaja: tanpa sumber yang sama,
 * lencana di browser akan jadi tebakan kedua yang bisa bertentangan dengan gerbang di Node.
 * `apps/web/test/ornament-metrics.spec.ts` menegakkan kesepakatannya — tiap anggota kolam
 * terkurasi wajib `fitOf().ok === true`.
 *
 * **Modul dasbor.** Tabel metriknya ~24 KB dan tidak punya urusan di bundel tamu;
 * `apps/web/test/editor-imports.spec.ts` menjaga batasnya.
 */

export type FitFlag = 'garis' | 'rel' | 'warna' | 'berat'

export interface Fit {
  /** Seresep dengan tema: ketebalan sama, punya lapisan garis, ikut palet. */
  ok: boolean
  flags: FitFlag[]
  /** Kalimat lencana. Kosong saat `ok`. Teks, tidak pernah warna saja. */
  ringkas: string
}

const kalimat: Record<FitFlag, string> = {
  garis: 'Ketebalan garis berbeda dari tema',
  rel: 'Tidak ikut animasi garis',
  warna: 'Warna tetap, tidak ikut palet kalian',
  berat: 'Berkas besar, menambah waktu muat tamu',
}

/**
 * Enam keping yang menentukan ketebalan garis sebuah tema.
 *
 * Bukan kesebelasnya: `bacaTema()` di `scripts/ornament-forge/verify.mjs` hanya memungut
 * `kategoriUnik` — frame, divider, corner, motif, symbol, seal — dan `gerbangKohesi` mengukur
 * persis keenam itu. Memakai himpunan yang berbeda di sini akan membuat lencana dan gerbang
 * menjawab pertanyaan yang berbeda pada tema yang sama.
 */
export function garisTema(templateId: string): number[] {
  const set = themeOrnaments(templateId)
  const dari = [set.frame, set.divider, set.corner, set.motif, set.symbol, set.seal]
  return [...new Set(dari.flatMap(glyph => ornamentMetrics[glyph]?.garis ?? []))].sort((a, b) => a - b)
}

function sama(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((nilai, i) => nilai === b[i])
}

export function fitOf(glyph: OrnamentId, templateId: string): Fit {
  const m = ornamentMetrics[glyph]
  const flags: FitFlag[] = []

  if (!m) {
    // Glyph yang ada di bank tapi tidak di tabel berarti tabelnya basi. Jangan mengarang
    // kecocokan; gerbang kesegaran yang seharusnya menangkap ini, bukan pemilih.
    return { ok: false, flags: [], ringkas: '' }
  }

  if (m.tetap) {
    /*
     * Aset referensi tidak pernah "cocok", dan ia juga tidak pernah dilaporkan `garis`.
     *
     * `garis`-nya kosong karena tidak terukur — mereka `<img>` ke berkas eksternal, bukan SFC
     * ber-`<svg>`. Melaporkan ketidakcocokan ketebalan yang tidak pernah diukur adalah cara
     * tercepat mengajari orang mengabaikan lencana.
     */
    flags.push('warna')
  } else {
    if (!sama(m.garis, garisTema(templateId))) flags.push('garis')
    if (!m.rel) flags.push('rel')
  }

  if (m.bytes > ambangBerat) flags.push('berat')

  return {
    ok: flags.length === 0,
    flags,
    ringkas: flags.map(f => kalimat[f]).join(' · '),
  }
}
