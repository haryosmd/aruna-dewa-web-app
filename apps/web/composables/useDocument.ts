import { createDefaultDocument } from '@aruna/contracts'
import type { InvitationDocument, Section } from '~/types/aruna'

/**
 * The showcase document behind `/i/demo` and the landing-page previews.
 * It turns every optional section on, because a demo that hides half the product
 * is not a demo.
 */
function buildDemo(): InvitationDocument {
  const document = createDefaultDocument('Aruna', 'Dewa')
  const at = (id: string) => document.sections.find(section => section.id === id) as Section

  const weddingDay = new Date()
  weddingDay.setMonth(weddingDay.getMonth() + 4)
  weddingDay.setHours(9, 0, 0, 0)
  const iso = weddingDay.toISOString()
  const readable = formatLongDate(weddingDay)

  at('cover').data = {
    title: 'Aruna & Dewa',
    subtitle: 'Undangan pernikahan',
    image: '/images/hero.webp',
    layout: 'arch-potret',
    ornamentIntensity: 'seimbang',
  }

  at('couple').data = {
    partner1: 'Aruna',
    partner2: 'Dewa',
    description: 'Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami bermaksud menyelenggarakan resepsi pernikahan putra-putri kami.',
    image: '/images/couple.webp',
  }

  at('events').data = {
    events: [
      { id: 'ceremony', name: 'Akad Nikah', date: readable, time: '09.00 WIB', venue: 'Pendopo Aruna', address: 'Jl. Kaliurang KM 9, Sleman, Yogyakarta', mapUrl: 'https://maps.google.com/?q=Sleman+Yogyakarta', public: true },
      { id: 'reception', name: 'Resepsi', date: readable, time: '11.00 — 14.00 WIB', venue: 'Pendopo Aruna', address: 'Jl. Kaliurang KM 9, Sleman, Yogyakarta', mapUrl: 'https://maps.google.com/?q=Sleman+Yogyakarta', public: true },
    ],
    venueIllustration: 'venue-pendopo',
  }

  at('countdown').data = { date: iso }

  at('gallery').data = {
    images: ['/images/couple.webp', '/images/rings.webp', '/images/venue.webp', '/images/hero.webp'],
    motion: 'tema',
  }

  at('story').enabled = true
  at('story').data = {
    title: 'Dari satu percakapan panjang',
    text: 'Empat tahun, tiga kota, dan satu keputusan yang ternyata sudah kami ambil jauh sebelum diucapkan.',
    image: '/images/rings.webp',
    steps: [
      { id: 's1', title: 'Perpustakaan kecil, 2022', text: 'Berdebat soal buku yang ternyata sama-sama belum selesai dibaca. Perdebatannya tidak selesai sampai hari ini.', image: '/images/couple.webp', side: 'kiri' },
      { id: 's2', title: 'Pesan yang tidak pernah habis', text: 'Beda kota selama dua tahun. Yang tersisa hanya kabar tiap malam — dan ternyata itu cukup.', image: '/images/rings.webp', side: 'kanan' },
      { id: 's3', title: 'Perjalanan pertama', text: 'Naik kereta pagi tanpa rencana pulang. Di sanalah kami sadar sedang merencanakan hal yang sama.', image: '/images/venue.webp', side: 'kiri' },
      { id: 's4', title: 'Dan akhirnya, ya', text: 'Bukan lamaran besar. Hanya satu pertanyaan di dapur, dan satu jawaban yang sudah lama siap.', image: '/images/hero.webp', side: 'kanan' },
    ],
  }

  at('rundown').enabled = true
  at('rundown').data = {
    items: [
      { id: 'r1', time: '08.30', title: 'Tamu mulai berdatangan', description: 'Penerima tamu menyambut di pendopo depan.' },
      { id: 'r2', time: '09.00', title: 'Akad nikah', description: 'Mohon sudah menempati kursi lima menit sebelumnya.' },
      { id: 'r3', time: '10.00', title: 'Sesi foto keluarga', description: 'Keluarga inti terlebih dahulu, lalu tamu undangan.' },
      { id: 'r4', time: '11.00', title: 'Resepsi dan ramah tamah', description: 'Hidangan prasmanan dibuka di sisi timur.' },
      { id: 'r5', time: '14.00', title: 'Acara selesai' },
    ],
  }

  at('dresscode').enabled = true
  at('dresscode').data = {
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
  }

  at('gift').enabled = true
  at('gift').data = {
    title: 'Hadiah untuk kami',
    note: 'Doa restu Anda sudah lebih dari cukup. Bila ingin berbagi tanda kasih, kami menerimanya dengan senang hati.',
    accounts: [
      { id: 'g1', bankId: 'bca', bankLabel: 'BCA', number: '8720 114 556', holder: 'Dewa Anandika', owner: 'cpp' },
      { id: 'g2', bankId: 'mandiri', bankLabel: 'Mandiri', number: '1370 0099 8877', holder: 'Aruna Prameswari', owner: 'cpw' },
      { id: 'g3', bankId: 'bsi', bankLabel: 'BSI', number: '7011 2233 44', holder: 'Sutrisno Hadi', owner: '' },
      { id: 'g4', bankId: 'jago', bankLabel: 'Jago', number: '1088 7766 5544', holder: 'Aruna Prameswari', owner: '' },
    ],
    address: 'Jl. Kaliurang KM 9, Sleman',
  }

  at('closing').data = { text: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.' }

  return document
}

export const fallbackDocument = buildDemo()
