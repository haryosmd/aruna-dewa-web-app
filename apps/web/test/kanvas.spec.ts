import { describe, expect, it } from 'vitest'

import {
  arahDasar, arahDariPutar, bacaKanvas, hitungTempel, kunciSumbu, labelKeping, lapisBaru, putarUntukArah, terapkanKeping, terapkanTambahan, bisaDisuntingDiPanggung, gayaKeping, gayaTeks, layarKeCqw, normalSudut,
  slotDariKunci, sudutPutar, tandaGerak, tempel, tempelUkuran, ubahUkuran,
} from '../utils/kanvas'

/**
 * Fase 81 — geometri kanvas bebas. Diuji tanpa DOM karena overlay panggung hanya menerjemahkan
 * penunjuk ke fungsi-fungsi ini; yang salah di sini salah di setiap perangkat.
 */
describe('satuan: layar → cqw', () => {
  it('membagi skala pratinjau lalu lebar kolom render', () => {
    // 48px layar pada pratinjau 0,5 = 96px render; kolom 480 → 20cqw.
    expect(layarKeCqw(48, 0.5, 480)).toBeCloseTo(20)
    expect(layarKeCqw(39, 1, 390)).toBeCloseTo(10)
    expect(layarKeCqw(10, 0, 0)).toBe(0)
  })
})

describe('ubah ukuran dari pegangan', () => {
  const awal = { cx: 100, cy: 100, w: 80, h: 40 }

  it('pojok kanan-bawah: pojok kiri-atas diam', () => {
    const k = ubahUkuran(awal, 'se', 20, 10)
    expect(k.w).toBe(100)
    expect(k.h).toBe(50)
    expect(k.cx - k.w / 2).toBeCloseTo(60)
    expect(k.cy - k.h / 2).toBeCloseTo(80)
  })

  it('pojok kiri-atas: pojok kanan-bawah diam', () => {
    const k = ubahUkuran(awal, 'nw', -20, -10)
    expect(k.cx + k.w / 2).toBeCloseTo(140)
    expect(k.cy + k.h / 2).toBeCloseTo(120)
  })

  it('Shift mengunci rasio di pojok dan di sisi', () => {
    const pojok = ubahUkuran(awal, 'se', 40, 0, { rasio: true })
    expect(pojok.w / pojok.h).toBeCloseTo(2)
    expect(pojok.w).toBe(120)
    const sisi = ubahUkuran(awal, 'e', 40, 0, { rasio: true })
    expect(sisi.w / sisi.h).toBeCloseTo(2)
    // Sisi kanan: tetap berpusat vertikal.
    expect(sisi.cy).toBeCloseTo(100)
  })

  it('tanpa Shift: sisi hanya mengubah satu sumbu', () => {
    const k = ubahUkuran(awal, 'e', 40, 25)
    expect(k.h).toBe(40)
    expect(k.w).toBe(120)
  })

  it('tidak pernah lebih kecil dari batas minimum', () => {
    const k = ubahUkuran(awal, 'se', -500, -500, { min: 8 })
    expect(k.w).toBe(8)
    expect(k.h).toBe(8)
  })

  it('keping yang diputar 90°: menarik ke bawah memanjangkan sisi lebarnya', () => {
    const k = ubahUkuran(awal, 'e', 0, 20, { putar: 90 })
    expect(k.w).toBeCloseTo(100)
    expect(k.h).toBeCloseTo(40)
  })
})

describe('putar', () => {
  it('0° tegak ke atas, 90° ke kanan, Shift ke kelipatan 15°', () => {
    expect(sudutPutar(0, 0, 0, -10)).toBe(0)
    expect(sudutPutar(0, 0, 10, 0)).toBe(90)
    expect(sudutPutar(0, 0, -10, 0)).toBe(-90)
    expect(sudutPutar(0, 0, 10, -9, true) % 15).toBe(0)
  })

  it('normal ke −180…180', () => {
    expect(normalSudut(270)).toBe(-90)
    expect(normalSudut(-190)).toBe(170)
    expect(normalSudut(-180)).toBe(180)
    expect(normalSudut(-0)).toBe(0)
  })
})

describe('tempel garis tengah', () => {
  it('menarik dalam ambang, melepas di luarnya', () => {
    expect(tempel(197, 195, 4)).toEqual({ nilai: 195, kena: true })
    expect(tempel(200, 195, 4)).toEqual({ nilai: 200, kena: false })
  })
})

describe('lapis', () => {
  const daftar = [{ kunci: 'a' }, { kunci: 'b', lapis: 2 }, { kunci: 'c', lapis: -1 }]
  it('hanya keping yang dipindah yang mendapat lapis baru', () => {
    expect(lapisBaru(daftar, 'a', 'depan')).toBe(3)
    expect(lapisBaru(daftar, 'a', 'belakang')).toBe(-2)
    expect(lapisBaru(daftar, 'b', 'naik')).toBe(3)
    expect(lapisBaru(daftar, 'b', 'turun')).toBe(1)
  })
  it('tetap di dalam batas skema', () => {
    expect(lapisBaru([{ kunci: 'a', lapis: 40 }, { kunci: 'b', lapis: 40 }], 'a', 'depan')).toBe(40)
    expect(lapisBaru([{ kunci: 'a', lapis: -20 }], 'a', 'turun')).toBe(-20)
  })
})

describe('menulis kanvas', () => {
  it('patch undefined menghapus kunci; keping kosong dan kanvas kosong dibuang', () => {
    const satu = terapkanKeping(undefined, 'o:corner:tl', { x: 3 })
    expect(satu).toEqual({ keping: { 'o:corner:tl': { x: 3 } } })
    expect(terapkanKeping(satu, 'o:corner:tl', { x: undefined })).toBeUndefined()
    expect(terapkanKeping(satu, 'o:corner:tl', null)).toBeUndefined()
  })
  it('tambahan: ubah dan hapus', () => {
    const awal = { tambahan: [{ id: 't-1', glyph: 'corner-kawung', x: 50, y: 20, lebar: 24 }] }
    expect(terapkanTambahan(awal, 't-1', { x: 60 })!.tambahan![0]!.x).toBe(60)
    expect(terapkanTambahan(awal, 't-1', null)).toBeUndefined()
  })
})

describe('gaya keping', () => {
  it('memakai properti transform individual, bukan transform', () => {
    const gaya = gayaKeping({ x: 4, y: -2, putar: 30, skala: 1.5, cerminX: true, opasitas: 0.5, lapis: 3 })
    expect(gaya).toEqual({ translate: '4cqw -2cqw', rotate: '30deg', scale: '-1.5 1.5', opacity: '0.5', zIndex: '3' })
    expect(gaya.transform).toBeUndefined()
  })
  it('skalaY terpisah untuk resize tanpa Shift', () => {
    expect(gayaKeping({ skala: 2, skalaY: 1.2 }).scale).toBe('2 1.2')
  })
  it('keping tanpa ubahan tidak menulis apa pun; tersembunyi bawaan bisa dimunculkan', () => {
    expect(gayaKeping(undefined)).toEqual({})
    expect(gayaKeping(undefined, false)).toEqual({ display: 'none' })
    expect(gayaKeping({ tampil: true }, false)).toEqual({})
  })
  it('teks bergeser lewat left/top, tidak lewat transform (GSAP menganimasikan judul)', () => {
    expect(gayaTeks({ x: 2, y: 3 })).toEqual({ left: '2cqw', top: '3cqw' })
  })
})

describe('membaca kanvas dari dokumen', () => {
  it('membuang keping rusak satu per satu, bukan seluruh kanvas', () => {
    const k = bacaKanvas({ kanvas: { keping: { 'o:corner:tl': { x: 3 }, 'o:corner:br': { skala: 99 }, 'asing': { x: 1 } } } })
    expect(k.keping).toEqual({ 'o:corner:tl': { x: 3 } })
  })
  it('glyph yang salah kategori untuk slotnya dibuang', () => {
    const k = bacaKanvas({ kanvas: { keping: { 'o:corner:tl': { glyph: 'seal-kayon', x: 1 } } } })
    expect(k.keping['o:corner:tl']).toEqual({ x: 1 })
  })
  it('data tanpa kanvas → kosong', () => {
    expect(bacaKanvas({})).toEqual({ keping: {}, tambahan: [] })
    expect(bacaKanvas(null)).toEqual({ keping: {}, tambahan: [] })
  })
  it('slot dari kunci', () => {
    expect(slotDariKunci('o:corner:tl')).toBe('corner')
    expect(slotDariKunci('t:title')).toBeNull()
    expect(slotDariKunci('o:bukan:tl')).toBeNull()
  })
})

describe('kunci', () => {
  it('terkunci = tidak bisa disunting di panggung', () => {
    expect(bisaDisuntingDiPanggung({ terkunci: true })).toBe(false)
    expect(bisaDisuntingDiPanggung({})).toBe(true)
    expect(bisaDisuntingDiPanggung(undefined)).toBe(true)
  })
})

describe('tanda tangan gerak', () => {
  it('berubah karena gerak, tidak karena geseran', () => {
    const dasar = [{ data: { motion: 'iris', kanvas: { keping: { 'o:corner:tl': { x: 1 } } } } }]
    const digeser = [{ data: { motion: 'iris', kanvas: { keping: { 'o:corner:tl': { x: 9 } } } } }]
    const digerakkan = [{ data: { motion: 'iris', kanvas: { keping: { 'o:corner:tl': { x: 1, gerak: 'mekar' } } } } }]
    expect(tandaGerak(dasar)).toBe(tandaGerak(digeser))
    expect(tandaGerak(dasar)).not.toBe(tandaGerak(digerakkan))
    expect(tandaGerak([{ data: { motion: 'rise' } }])).not.toBe(tandaGerak([{ data: { motion: 'silhouette' } }]))
  })
})

describe('empat arah sudut', () => {
  it('putaran relatif terhadap putaran dasar pojoknya', () => {
    expect(putarUntukArah('tl', 'kanan-atas')).toBe(90)
    expect(putarUntukArah('br', 'kiri-atas')).toBe(180)
    expect(putarUntukArah('akad-br', 'kanan-bawah')).toBe(0)
    expect(putarUntukArah('tr', 'kiri-bawah')).toBe(180)
  })
  it('membaca arah balik, dan miring = null', () => {
    expect(arahDariPutar('tl')).toBe('kiri-atas')
    expect(arahDariPutar('br')).toBe('kanan-bawah')
    expect(arahDariPutar('tl', 90)).toBe('kanan-atas')
    expect(arahDariPutar('tl', 30)).toBeNull()
  })
})

describe('nama keping', () => {
  it('slot + posisi, teks lewat label kolom, tambahan', () => {
    expect(labelKeping('o:corner:tl')).toBe('Sudut · kiri atas')
    expect(labelKeping('o:corner:akad-br')).toBe('Sudut · akad kanan bawah')
    expect(labelKeping('o:layer:ladang-0')).toBe('Ladang · 1')
    expect(labelKeping('o:seal:segel')).toBe('Segel')
    expect(labelKeping('t:title', k => (k === 'title' ? 'Judul' : undefined))).toBe('Judul')
    expect(labelKeping('a:t-1')).toBe('Ornamen tambahan')
  })
})

/*
 * Seret ala Figma (fase 81 lanjutan): Shift mengunci sumbu, smart guide menempel ke tepi dan tengah
 * objek di sekitar, dan jarak seimbang antar-objek.
 */
describe('Shift mengunci sumbu', () => {
  it('mendatar, tegak, dan diagonal 45° dari arah dominan', () => {
    expect(kunciSumbu(60, 8)).toEqual({ dx: 60, dy: 0, sumbu: 'x' })
    expect(kunciSumbu(-5, 40)).toEqual({ dx: 0, dy: 40, sumbu: 'y' })
    const miring = kunciSumbu(30, -34)
    expect(miring.sumbu).toBe('diagonal')
    expect(Math.abs(miring.dx)).toBe(Math.abs(miring.dy))
    expect(Math.sign(miring.dx)).toBe(1)
    expect(Math.sign(miring.dy)).toBe(-1)
  })
})

describe('smart guide', () => {
  const kotak = (kiri: number, atas: number, lebar: number, tinggi: number) => ({ kiri, atas, kanan: kiri + lebar, bawah: atas + tinggi })

  it('tepi kiri menempel ke tepi kiri sasaran dalam ambang', () => {
    const hasil = hitungTempel(kotak(103, 300, 40, 40), [kotak(100, 100, 80, 30)], 4)
    expect(hasil.dx).toBe(-3)
    expect(hasil.garis.some(g => g.sumbu === 'x' && g.posisi === 100)).toBe(true)
  })

  it('tengah menempel ke tengah', () => {
    // Tengah keping 142, tengah sasaran 140.
    const hasil = hitungTempel(kotak(122, 300, 40, 40), [kotak(100, 100, 80, 30)], 4)
    expect(hasil.dx).toBe(-2)
    expect(hasil.garis.find(g => g.sumbu === 'x')!.posisi).toBe(140)
  })

  it('di luar ambang tidak menempel dan tidak menggambar garis', () => {
    const hasil = hitungTempel(kotak(110, 300, 40, 40), [kotak(100, 100, 80, 30)], 4)
    expect(hasil.dx).toBe(0)
    expect(hasil.garis.filter(g => g.sumbu === 'x')).toEqual([])
  })

  it('sumbu tegak juga: bawah ke bawah', () => {
    const hasil = hitungTempel(kotak(400, 97, 40, 40), [kotak(100, 100, 80, 40)], 4)
    expect(hasil.dy).toBe(3)
  })

  it('garis membentang dari keping ke sasaran, bukan selebar layar', () => {
    const hasil = hitungTempel(kotak(100, 300, 40, 40), [kotak(100, 100, 80, 30)], 4)
    const garis = hasil.garis.find(g => g.sumbu === 'x' && g.posisi === 100)!
    expect(garis.dari).toBe(100)
    expect(garis.ke).toBe(340)
  })

  it('jarak seimbang: celah ke tetangga sama dengan celah antar-tetangga', () => {
    // A [0–40], B [60–100] → celah 20. Keping di 118 → celah B–keping 18, ditempel jadi 20.
    const hasil = hitungTempel(kotak(118, 0, 40, 40), [kotak(0, 0, 40, 40), kotak(60, 0, 40, 40)], 4)
    expect(hasil.dx).toBe(2)
    expect(hasil.jarak.length).toBe(2)
    expect(hasil.jarak.every(j => Math.round(j.panjang) === 20)).toBe(true)
  })
})

describe('tempel saat mengubah ukuran (fase 82)', () => {
  // Sasaran: tepi kiri 200, tengah 240, kanan 280; atas 0, bawah 40.
  const sasaran = [{ kiri: 200, atas: 0, kanan: 280, bawah: 40 }]
  // Keping 40×40 di (100–140, 100–140), pegangan kanan ditarik sampai tepi kanannya 198.
  const ditarik = { cx: 149, cy: 120, w: 98, h: 40 }

  it('tepi yang ditarik menempel, tepi seberang diam', () => {
    const { kotak, garis } = tempelUkuran(ditarik, 'e', sasaran, { ambang: 4 })
    expect(kotak.cx + kotak.w / 2).toBe(200)
    expect(kotak.cx - kotak.w / 2).toBe(100)
    expect(kotak.h).toBe(40)
    expect(garis).toEqual([{ sumbu: 'x', posisi: 200, dari: 0, ke: 140 }])
  })

  it('di luar ambang tidak menempel', () => {
    const jauh = { cx: 146, cy: 120, w: 92, h: 40 } // tepi kanan 192
    expect(tempelUkuran(jauh, 'e', sasaran, { ambang: 4 })).toEqual({ kotak: jauh, garis: [] })
  })

  it('hanya tepi yang bergerak: tepi kiri yang diam tidak ikut dicari', () => {
    // Tepi kiri 201 (1px dari 200) tapi yang ditarik pegangan kanan, jauh dari apa pun.
    const kotak = { cx: 301, cy: 120, w: 200, h: 40 }
    expect(tempelUkuran(kotak, 'e', sasaran, { ambang: 4 }).kotak).toBe(kotak)
  })

  it('Shift di pojok: sumbu dengan koreksi terkecil menang, rasio tetap, pojok seberang diam', () => {
    // Pojok kiri-atas di (100,100), ditarik ke kanan-bawah; kanan 197 (koreksi 3), bawah tidak dekat apa pun.
    const kotak = { cx: 148.5, cy: 148.5, w: 97, h: 97 }
    const hasil = tempelUkuran(kotak, 'se', [{ kiri: 200, atas: 500, kanan: 260, bawah: 560 }], { rasio: true, ambang: 4 })
    expect(hasil.kotak.w).toBe(100)
    expect(hasil.kotak.h).toBe(100)
    expect(hasil.kotak.cx - hasil.kotak.w / 2).toBe(100)
    expect(hasil.kotak.cy - hasil.kotak.h / 2).toBe(100)
  })

  it('Shift di pegangan sisi: sumbu lain tumbuh dari pusatnya', () => {
    const hasil = tempelUkuran(ditarik, 'e', sasaran, { rasio: true, ambang: 4 })
    expect(hasil.kotak.w).toBe(100)
    expect(hasil.kotak.h).toBeCloseTo(40 * 100 / 98)
    expect(hasil.kotak.cy).toBe(120)
  })

  it('putar 90°: pegangan kanan lokal menarik tepi bawah di layar', () => {
    // Lokal 98×40, diputar 90° → di layar 40 lebar × 98 tinggi: atas 120, bawah 218; sasaran bawah 220.
    const kotak = { cx: 120, cy: 169, w: 98, h: 40 }
    const hasil = tempelUkuran(kotak, 'e', [{ kiri: 0, atas: 180, kanan: 50, bawah: 220 }], { putar: 90, ambang: 4 })
    expect(hasil.kotak.cy + hasil.kotak.w / 2).toBe(220)
    expect(hasil.kotak.cy - hasil.kotak.w / 2).toBe(120)
    expect(hasil.kotak.h).toBe(40)
  })

  it('keping miring tidak menempel', () => {
    expect(tempelUkuran(ditarik, 'e', sasaran, { putar: 30, ambang: 4 }).kotak).toBe(ditarik)
  })

  it('tidak menempel bila hasilnya di bawah ukuran minimum', () => {
    // Pegangan kiri ditarik sampai tepi kirinya 277 (3px dari 280), lebar 14: menempel berarti lebar 11.
    const kotak = { cx: 284, cy: 120, w: 14, h: 40 }
    expect(tempelUkuran(kotak, 'w', sasaran, { ambang: 4, min: 12 }).kotak).toBe(kotak)
  })
})

describe('arah bawaan keping untuk pratinjau Lapisan (fase 82)', () => {
  it('tanpa transform bawaan → tidak ada arah', () => {
    expect(arahDasar('none')).toBeUndefined()
    expect(arahDasar('')).toBeUndefined()
    expect(arahDasar('matrix(1, 0, 0, 1, 12, 8)')).toBeUndefined()
  })

  it('putar 180° (simbol bawah, sudut kanan-bawah): geser dibuang', () => {
    expect(arahDasar('matrix(-1, 0, 0, -1, 12, 8)')).toBe('matrix(-1, 0, 0, -1, 0, 0)')
  })

  it('putar 180° + cermin (keping ladang) dan skala dinormalkan', () => {
    expect(arahDasar('matrix(1.6, 0, 0, -1.6, 0, 0)')).toBe('matrix(1, 0, 0, -1, 0, 0)')
    expect(arahDasar('matrix(0, 2, -2, 0, 5, 5)')).toBe('matrix(0, 1, -1, 0, 0, 0)')
  })

  it('matrix3d tidak ditebak', () => {
    expect(arahDasar('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)')).toBeUndefined()
  })
})
