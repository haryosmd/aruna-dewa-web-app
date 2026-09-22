import { sectionTypes } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { terapkanMotionDokumen,
  groupActs,
  resolveAct,
  resolveScore,
  sectionRole,
  type SectionRole,
  type ThemeMotion,
} from '../utils/motion-score'

const dasar: ThemeMotion = {
  entrance: 'rise',
  ornament: 'bloom',
  density: 'steady',
  segue: { kind: 'none' },
}

describe('peran section', () => {
  it('memberi peran pada setiap tipe section yang ada di kontrak', () => {
    // Tipe section baru tidak boleh lolos tanpa peran: tanpa ini ia akan diam-diam
    // jatuh ke babak tetangganya dan partiturnya salah tanpa satu pun galat.
    for (const type of sectionTypes) expect(sectionRole[type]).toBeTruthy()
  })
})

describe('pengelompokan babak', () => {
  it('menggabungkan section berurutan yang sama perannya jadi satu babak', () => {
    const acts = groupActs(['overture', 'information', 'information', 'information', 'coda'])
    expect(acts.map(a => a.role)).toEqual(['overture', 'information', 'coda'])
    expect(acts[1]!.span).toBe(3)
  })

  it('memecah babak ketika peran lain menyela di tengahnya', () => {
    const acts = groupActs(['information', 'showcase', 'information'])
    expect(acts).toHaveLength(3)
    expect(acts.map(a => a.span)).toEqual([1, 1, 1])
  })

  it('membentang dari 0 sampai 1, berapa pun jumlah babaknya', () => {
    const acts = groupActs(['overture', 'introduction', 'showcase', 'coda'])
    expect(acts[0]!.at).toBe(0)
    expect(acts[acts.length - 1]!.at).toBe(1)
  })

  it('menaruh babak tunggal di pangkal kurva, bukan membaginya dengan nol', () => {
    const acts = groupActs(['overture'])
    expect(acts).toHaveLength(1)
    expect(acts[0]!.at).toBe(0)
    expect(Number.isNaN(acts[0]!.at)).toBe(false)
  })

  it('tidak menghasilkan babak apa pun untuk halaman kosong', () => {
    expect(groupActs([])).toEqual([])
  })
})

describe('kurva kepadatan', () => {
  const beratDi = (density: ThemeMotion['density'], roles: SectionRole[]) =>
    resolveScore({ ...dasar, density }, roles).map(a => a.weight)

  const roles: SectionRole[] = ['overture', 'introduction', 'showcase', 'coda']

  it('steady memberi bobot yang sama pada seluruh halaman', () => {
    expect(beratDi('steady', roles)).toEqual([1, 1, 1, 1])
  })

  it('crescendo menaik dari pembuka ke penutup', () => {
    const w = beratDi('crescendo', roles)
    expect(w[0]!).toBeLessThan(w[w.length - 1]!)
    expect([...w]).toEqual([...w].sort((a, b) => a - b))
  })

  it('ebb menurun dari pembuka ke penutup', () => {
    const w = beratDi('ebb', roles)
    expect(w[0]!).toBeGreaterThan(w[w.length - 1]!)
  })

  it('arch memuncak di tengah, bukan di ujung', () => {
    const w = beratDi('arch', ['overture', 'introduction', 'showcase', 'response', 'coda'])
    const puncak = w.indexOf(Math.max(...w))
    expect(puncak).toBeGreaterThan(0)
    expect(puncak).toBeLessThan(w.length - 1)
  })
})

describe('penyelesaian babak', () => {
  it('mewarisi nilai tema untuk peran yang tidak ditimpa', () => {
    const act = resolveAct(dasar, { role: 'coda', at: 1, span: 1 })
    expect(act.entrance).toBe('rise')
    expect(act.ornament).toBe('bloom')
    expect(act.segue).toEqual({ kind: 'none' })
  })

  it('memakai penimpaan peran ketika ada', () => {
    const score: ThemeMotion = {
      ...dasar,
      acts: { showcase: { entrance: 'silhouette', ornament: 'drift', segue: { kind: 'dissolve' } } },
    }
    const act = resolveAct(score, { role: 'showcase', at: 0.5, span: 1 })
    expect(act.entrance).toBe('silhouette')
    expect(act.ornament).toBe('drift')
    expect(act.segue).toEqual({ kind: 'dissolve' })
  })

  it('mematok bobot supaya satu babak tidak bisa jauh lebih lambat dari tetangganya', () => {
    const rendah = resolveAct({ ...dasar, acts: { coda: { weight: 0.01 } } }, { role: 'coda', at: 1, span: 1 })
    const tinggi = resolveAct({ ...dasar, acts: { coda: { weight: 99 } } }, { role: 'coda', at: 1, span: 1 })
    expect(rendah.weight).toBe(0.6)
    expect(tinggi.weight).toBe(1.4)
  })

  it('mematok drift supaya keping tidak pernah meninggalkan section-nya', () => {
    expect(resolveAct({ ...dasar, drift: 90 }, { role: 'coda', at: 1, span: 1 }).drift).toBe(18)
    expect(resolveAct({ ...dasar, drift: -5 }, { role: 'coda', at: 1, span: 1 }).drift).toBe(0)
    expect(resolveAct(dasar, { role: 'coda', at: 1, span: 1 }).drift).toBe(0)
  })

  it('tidak pernah memaku kecuali babaknya memintanya', () => {
    expect(resolveAct(dasar, { role: 'showcase', at: 0.5, span: 1 }).pin).toBe(false)
    const score: ThemeMotion = { ...dasar, acts: { showcase: { pin: true } } }
    expect(resolveAct(score, { role: 'showcase', at: 0.5, span: 1 }).pin).toBe(true)
  })

  it('mengalikan penimpaan bobot dengan kurva, bukan menggantikannya', () => {
    // `crescendo` di penutup bernilai 1,28; ditimpa 0,5 hasilnya 0,64 — bukan 0,5.
    const score: ThemeMotion = { ...dasar, density: 'crescendo', acts: { coda: { weight: 0.5 } } }
    const act = resolveScore(score, ['overture', 'coda']).at(-1)!
    expect(act.weight).toBeCloseTo(0.64, 2)
  })
})

describe('partitur satu halaman', () => {
  it('menerjemahkan urutan section sungguhan jadi babak berurutan', () => {
    const urutan = ['cover', 'couple', 'events', 'countdown', 'gallery', 'rsvp', 'closing'] as const
    const acts = resolveScore(dasar, urutan.map(t => sectionRole[t]))
    expect(acts.map(a => a.role)).toEqual([
      'overture', 'introduction', 'information', 'showcase', 'response', 'coda',
    ])
    // `events` + `countdown` menyatu jadi satu babak informasi.
    expect(acts[2]!.span).toBe(2)
  })

  it('mengikuti urutan yang dipilih pasangan, bukan urutan bawaan', () => {
    const acts = resolveScore(dasar, (['gallery', 'cover', 'closing'] as const).map(t => sectionRole[t]))
    expect(acts.map(a => a.role)).toEqual(['showcase', 'overture', 'coda'])
  })
})

describe('terapkanMotionDokumen (fase 69)', () => {
  const tema = { entrance: 'sweep', ornament: 'drift', density: 'crescendo', segue: { kind: 'dissolve' } } as const

  it('tanpa pilihan mengembalikan partitur tema apa adanya — termasuk undefined', () => {
    expect(terapkanMotionDokumen(tema, undefined)).toBe(tema)
    expect(terapkanMotionDokumen(undefined, undefined)).toBeUndefined()
  })

  it('menimpa hanya tata bahasa masuk, sisanya milik tema', () => {
    expect(terapkanMotionDokumen(tema, 'iris')).toEqual({ ...tema, entrance: 'iris' })
  })

  it('memberi tema lama partitur minimal hanya saat pasangan memilih', () => {
    expect(terapkanMotionDokumen(undefined, 'rise')).toEqual({ entrance: 'rise', ornament: 'bloom', density: 'steady', segue: { kind: 'none' } })
  })
})
