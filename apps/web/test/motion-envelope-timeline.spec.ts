import { gsap } from 'gsap'
import { describe, expect, it } from 'vitest'

import type { EnvelopeSpeed } from '@aruna/contracts'
import { envelopeTempo, susunAmplop } from '../utils/motion-envelope'

/**
 * Timeline amplop dijalankan dengan GSAP sungguhan (fase 80).
 *
 * Tes tempo di `motion-envelope.spec.ts` hanya membaca angka tabel, dan justru karena itu
 * cacat fase 69.3 lolos: angka yang benar ditafsirkan GSAP sebagai waktu mutlak, sehingga
 * gerbang sudah transparan sebelum segelnya terbelah. Yang dijaga di sini adalah jadwal yang
 * benar-benar dihasilkan — kapan tiap bagian mulai dan selesai.
 */
function jadwal(speed: EnvelopeSpeed) {
  const s = { seal: {}, sealLeft: {}, sealRight: {}, flap: {}, card: {}, body: {}, root: {} }
  const tl = gsap.timeline({ paused: true })
  susunAmplop(tl as never, envelopeTempo[speed], s)
  const tweens = tl.getChildren(false, true, false) as gsap.core.Tween[]
  const cari = (target: object, prop: string) => {
    const tw = tweens.find(t => t.targets()[0] === target && prop in t.vars)
    if (!tw) throw new Error(`tidak ada tween ${prop}`)
    return { mulai: tw.startTime(), selesai: tw.startTime() + tw.totalDuration() }
  }
  return {
    segel: cari(s.seal, 'y'),
    belah: cari(s.sealLeft, 'xPercent'),
    flap: cari(s.flap, 'rotateX'),
    suratMuncul: cari(s.card, 'opacity'),
    suratNaik: cari(s.card, 'y'),
    badan: cari(s.body, 'opacity'),
    gerbang: cari(s.root, 'opacity'),
  }
}

describe.each(['cepat', 'sedang', 'pelan'] as const)('timeline amplop %s', (speed) => {
  const j = jadwal(speed)

  it('segel dulu, lalu terbelah, lalu flap, lalu surat', () => {
    expect(j.segel.mulai).toBe(0)
    expect(j.belah.mulai).toBeGreaterThan(j.segel.mulai)
    expect(j.flap.mulai).toBeGreaterThan(j.segel.selesai)
    expect(j.flap.mulai).toBeLessThan(j.belah.selesai) // tumpang tindih, bukan dua adegan
    expect(j.suratMuncul.mulai).toBeGreaterThan(j.flap.mulai)
    expect(j.suratMuncul.mulai).toBeLessThan(j.flap.selesai)
  })

  it('gerbang dan badan amplop baru pergi setelah surat berdiri', () => {
    expect(j.badan.mulai).toBeGreaterThanOrEqual(j.suratNaik.selesai)
    expect(j.gerbang.mulai).toBeGreaterThanOrEqual(j.suratNaik.selesai)
    expect(j.gerbang.selesai).toBeGreaterThanOrEqual(j.badan.selesai)
  })
})
