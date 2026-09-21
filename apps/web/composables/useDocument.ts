import { createDefaultDocument, dateParts } from '@aruna/contracts'
import type { InvitationDocument, Section } from '~/types/aruna'

/**
 * The showcase document behind `/i/demo` and the landing-page previews.
 * It turns every optional section on, because a demo that hides half the product
 * is not a demo.
 *
 * Sejak fase 72 dokumennya v2 (struktur Elegance): kata-kata sudah ada di `data` tiap bagian
 * dari `createDefaultDocument()`, jadi yang diisi di sini hanya yang tidak bisa ditebak
 * bawaan — foto, rekening, orang tua, unduh mantu, dan bagian ekstra beserta isinya.
 */
function buildDemo(): InvitationDocument {
  const weddingDay = new Date()
  weddingDay.setMonth(weddingDay.getMonth() + 4)
  weddingDay.setHours(9, 0, 0, 0)
  const iso = weddingDay.toISOString()
  const t = dateParts(iso)

  const document = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', {
    date: iso, venue: 'Pendopo Aruna', address: 'Jl. Kaliurang KM 9, Sleman, Yogyakarta', mapUrl: 'https://maps.google.com/?q=Sleman+Yogyakarta',
  })
  const at = (id: string) => document.sections.find(section => section.id === id) as Section
  const isi = (id: string, data: Record<string, unknown>) => { at(id).data = { ...at(id).data, ...data } }

  isi('opening-envelope', { ornamentIntensity: 'seimbang' })
  isi('hero', { imageUrl: '/images/hero.webp' })
  isi('couple', {
    subtitle: 'Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami bermaksud menyelenggarakan resepsi pernikahan putra-putri kami.',
    brideParents: 'Bapak Sutrisno Hadi & Ibu Ratna Prameswari', groomParents: 'Bapak Anandika Wijaya & Ibu Sari Dewi',
    imageUrl: '/images/couple.webp',
  })
  isi('countdown', { backgroundImageUrl: '/images/venue.webp' })
  isi('event', { akadTime: '09.00 WIB', receptionTime: '11.00 — 14.00 WIB' })
  at('unduh-mantu').enabled = true
  isi('unduh-mantu', {
    subtitle: `${t.day}, ${String(Number(t.date) + 7).padStart(2, '0')} ${t.monthYear}`,
    address: 'Kediaman keluarga mempelai pria\nJl. Melati No. 12, Kotagede, Yogyakarta',
    mapUrl: 'https://maps.google.com/?q=Kotagede+Yogyakarta',
  })
  isi('quote', { imageUrl: '/images/rings.webp' })
  isi('gallery', { imageUrls: ['/images/couple.webp', '/images/rings.webp', '/images/venue.webp', '/images/hero.webp'] })
  isi('gift', {
    bank1: 'Bank BCA', account1: '8720 114 556', holder1: 'a.n. Dewa Anandika',
    hasSecondAccount: true, bank2: 'Bank Mandiri', account2: '1370 0099 8877', holder2: 'a.n. Aruna Prameswari',
  })
  isi('closing', { imageUrl: '/images/venue.webp' })

  at('story').enabled = true
  isi('story', {
    title: 'Dari satu percakapan panjang',
    text: 'Empat tahun, tiga kota, dan satu keputusan yang ternyata sudah kami ambil jauh sebelum diucapkan.',
    image: '/images/rings.webp',
    steps: [
      { id: 's1', title: 'Perpustakaan kecil, 2022', text: 'Berdebat soal buku yang ternyata sama-sama belum selesai dibaca. Perdebatannya tidak selesai sampai hari ini.', image: '/images/couple.webp', side: 'kiri' },
      { id: 's2', title: 'Pesan yang tidak pernah habis', text: 'Beda kota selama dua tahun. Yang tersisa hanya kabar tiap malam — dan ternyata itu cukup.', image: '/images/rings.webp', side: 'kanan' },
      { id: 's3', title: 'Perjalanan pertama', text: 'Naik kereta pagi tanpa rencana pulang. Di sanalah kami sadar sedang merencanakan hal yang sama.', image: '/images/venue.webp', side: 'kiri' },
      { id: 's4', title: 'Dan akhirnya, ya', text: 'Bukan lamaran besar. Hanya satu pertanyaan di dapur, dan satu jawaban yang sudah lama siap.', image: '/images/hero.webp', side: 'kanan' },
    ],
  })

  at('rundown').enabled = true
  isi('rundown', {
    items: [
      { id: 'r1', time: '08.30', title: 'Tamu mulai berdatangan', description: 'Penerima tamu menyambut di pendopo depan.' },
      { id: 'r2', time: '09.00', title: 'Akad nikah', description: 'Mohon sudah menempati kursi lima menit sebelumnya.' },
      { id: 'r3', time: '10.00', title: 'Sesi foto keluarga', description: 'Keluarga inti terlebih dahulu, lalu tamu undangan.' },
      { id: 'r4', time: '11.00', title: 'Resepsi dan ramah tamah', description: 'Hidangan prasmanan dibuka di sisi timur.' },
      { id: 'r5', time: '14.00', title: 'Acara selesai' },
    ],
  })

  at('dresscode').enabled = true
  isi('dresscode', {
    text: 'Silakan kenakan yang paling nyaman dalam nuansa ini. Tidak perlu baru — yang penting Anda hadir.',
    attire: ['attire-batik', 'attire-kebaya', 'attire-jas', 'attire-dress'],
    // Nama warna wajib ditulis: bundaran tanpa label tidak mengatakan apa pun kepada
    // tamu yang buta warna atau yang membaca lewat pembaca layar.
    colors: [
      { hex: '#E8DCC8', name: 'Krem' },
      { hex: '#B4694A', name: 'Terakota' },
      { hex: '#7A8B6F', name: 'Sage' },
      { hex: '#8A6A3B', name: 'Kunir tua' },
      { hex: '#4A4038', name: 'Cokelat arang' },
    ],
  })

  return document
}

export const fallbackDocument = buildDemo()
