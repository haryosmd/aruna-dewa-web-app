import type { Wish } from '~/types/aruna'

/**
 * Contoh ucapan untuk dinding yang belum punya isi — demo, dan undangan yang baru terbit.
 *
 * Dinding kosong tidak menjual apa pun: tamu tidak tahu bentuk apa yang diharapkan
 * darinya, dan pasangan yang melihat pratinjau mengira fiturnya rusak. Ditandai jelas di
 * UI sebagai contoh, jadi tidak ada yang mengira ini ucapan sungguhan.
 *
 * Nama sengaja beragam bentuknya — bergelar, dua kata, panggilan keluarga, nama panjang
 * Minang — karena itulah yang benar-benar muncul di buku tamu pernikahan Indonesia, dan
 * itu yang menguji layout gelembungnya.
 */
export const sampleWishes: Wish[] = [
  { id: 'contoh-1', authorName: 'Bude Tatik sekeluarga', message: 'Selamat menempuh hidup baru, Nduk. Semoga jadi keluarga yang sakinah, mawaddah, warahmah.' },
  { id: 'contoh-2', authorName: 'dr. Yosi Susanti, Sp.OG', message: 'Turut berbahagia! Maaf belum bisa hadir karena jadwal jaga, doa terbaik dari jauh ya.' },
  { id: 'contoh-3', authorName: 'Rizky & Ayu', message: 'Akhirnya! Yang ditunggu-tunggu satu angkatan. Bahagia selalu kalian berdua.' },
  { id: 'contoh-4', authorName: 'Keluarga Besar Datuak Rajo Bandaro', message: 'Barakallahu lakuma wa baraka alaikuma wa jamaa bainakuma fi khair.' },
  { id: 'contoh-5', authorName: 'Pak Hendra — tetangga sebelah', message: 'Sudah kami saksikan dari kecil sampai hari ini. Selamat ya, Le. Bangga sekali.' },
  { id: 'contoh-6', authorName: 'Nadia', message: 'Semoga langgeng sampai kakek nenek, dan rumahnya selalu ramai tawa.' },
  { id: 'contoh-7', authorName: 'Tim Squad Kantor Lama', message: 'Kami datang rombongan ya, siap-siap piringnya ditambah. Selamat, bos!' },
  { id: 'contoh-8', authorName: 'Om Bambang & Tante Rina', message: 'Selamat menempuh hidup baru. Jaga satu sama lain, itu saja kuncinya.' },
  { id: 'contoh-9', authorName: 'Sasa', message: 'Nangis pas lihat undangannya. Bahagia banget buat kalian berdua 🤍' },
  { id: 'contoh-10', authorName: 'Kelompok Pengajian Ibu-Ibu RT 04', message: 'Semoga menjadi keluarga yang diberkahi dan dimudahkan segala urusannya.' },
  { id: 'contoh-11', authorName: 'Fajar Nugroho', message: 'Dari teman sekamar kos sampai jadi suami orang. Selamat, Jar. Bangga.' },
  { id: 'contoh-12', authorName: 'Mbak Winda sekeluarga', message: 'Maaf hanya bisa mengirim doa, semoga acaranya lancar dari awal sampai akhir.' },
  { id: 'contoh-13', authorName: 'Alumni SMA 3 angkatan 2014', message: 'Reuni dadakan di resepsi nih. Sampai ketemu di sana!' },
  { id: 'contoh-14', authorName: 'Eyang Putri', message: 'Eyang doakan rukun terus, saling menyayangi, dan segera diberi keturunan yang saleh.' },
]
