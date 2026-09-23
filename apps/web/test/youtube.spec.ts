import { describe, expect, it } from 'vitest'
import { youtubeEmbed, youtubeId, youtubeThumb } from '../utils/youtube'

/*
 * Penjaga fase 79. `youtubeId` memutuskan alamat apa yang dimuat halaman tamu atas nama mereka,
 * jadi yang diuji di sini bukan hanya "bentuk yang dikenali" tapi juga — dan terutama — bentuk
 * yang HARUS ditolak.
 */

const ID = 'dQw4w9WgXcQ'

describe('youtubeId mengenali bentuk tautan yang dipakai orang', () => {
  it.each([
    ['watch biasa', `https://www.youtube.com/watch?v=${ID}`],
    ['watch tanpa www', `https://youtube.com/watch?v=${ID}`],
    ['watch dengan parameter lain', `https://www.youtube.com/watch?v=${ID}&t=42s&list=PLabc`],
    ['tautan pendek', `https://youtu.be/${ID}`],
    ['tautan pendek dengan ?si= dari tombol Bagikan', `https://youtu.be/${ID}?si=AbCdEf123`],
    ['sematan', `https://www.youtube.com/embed/${ID}`],
    ['siaran langsung', `https://www.youtube.com/live/${ID}`],
    ['shorts', `https://www.youtube.com/shorts/${ID}`],
    ['jalur /v/ lama', `https://www.youtube.com/v/${ID}`],
    ['ponsel', `https://m.youtube.com/watch?v=${ID}`],
    ['music', `https://music.youtube.com/watch?v=${ID}`],
    ['nocookie', `https://www.youtube-nocookie.com/embed/${ID}`],
    ['host huruf besar', `https://WWW.YouTube.COM/watch?v=${ID}`],
    ['http, bukan https', `http://www.youtube.com/watch?v=${ID}`],
    ['berspasi di ujung', `  https://youtu.be/${ID}  `],
  ])('%s', (_nama, url) => {
    expect(youtubeId(url)).toBe(ID)
  })
})

describe('youtubeId menolak yang bukan video YouTube', () => {
  it.each([
    ['kosong', ''],
    ['bukan URL sama sekali', 'dQw4w9WgXcQ'],
    // Host yang lolos `endsWith('youtube.com')` yang ceroboh. Ini alasan HOST berbentuk himpunan.
    ['host yang menyamar', `https://evil-youtube.com/watch?v=${ID}`],
    ['host bersubdomain penipu', `https://youtube.com.penipu.id/watch?v=${ID}`],
    ['domain lain', `https://notyoutube.com/watch?v=${ID}`],
    ['skema javascript', 'javascript:alert(1)'],
    ['skema data', 'data:text/html,<script>alert(1)</script>'],
    ['playlist, bukan video', 'https://www.youtube.com/playlist?list=PLabcdefghij'],
    ['halaman kanal', 'https://www.youtube.com/@arunadewa'],
    ['watch tanpa v', 'https://www.youtube.com/watch?t=42'],
    ['id sepuluh karakter', 'https://youtu.be/dQw4w9WgXc'],
    ['id dua belas karakter', 'https://youtu.be/dQw4w9WgXcQQ'],
    ['id berkarakter di luar charset', 'https://youtu.be/dQw4w9WgXc$'],
    ['siaran Vimeo', 'https://vimeo.com/123456789'],
  ])('%s', (_nama, url) => {
    expect(youtubeId(url)).toBe('')
  })

  it('tautan non-YouTube tetap dipegang pemanggil, bukan dibuang di sini', () => {
    // Bagian Video menjatuhkan URL apa pun yang menghasilkan '' ke tautan keluar yang lama.
    expect(youtubeId('https://siaran.gerejaku.id/live')).toBe('')
  })
})

describe('alamat yang dibangun', () => {
  it('sampul memakai hqdefault, karena maxresdefault 404 untuk video yang tidak pernah HD', () => {
    expect(youtubeThumb(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
    expect(youtubeThumb(ID)).not.toContain('maxres')
  })

  it('sematan selalu lewat -nocookie, dan selalu https', () => {
    const embed = youtubeEmbed(ID)
    expect(embed.startsWith(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(true)
    expect(embed).toContain('autoplay=1')
  })
})
