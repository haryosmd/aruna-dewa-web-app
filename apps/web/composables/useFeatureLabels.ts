import {
  BookHeart, CalendarClock, CalendarDays, FileSpreadsheet, Gift, Heart, Images, ListChecks,
  Mail, MailCheck, Music4, Palette, Shirt, Sparkles, Timer, Users, Video,
  type LucideIcon,
} from 'lucide-vue-next'

const labels: Record<string, string> = {
  cover: 'Cover pembuka', couple: 'Informasi mempelai', events: 'Informasi acara', countdown: 'Hitung mundur', gallery: 'Galeri foto', guests: 'Tamu personal', imports: 'Impor spreadsheet', rsvp: 'RSVP', wishes: 'Ucapan', closing: 'Penutup', music: 'Musik', story: 'Cerita cinta', gift: 'Hadiah', rundown: 'Rundown', dresscode: 'Dresscode', video: 'Video dan live stream', design: 'Warna, font, dan urutan',
}

/**
 * Ikon per fitur, bukan satu centang seragam. Daftar fitur adalah alasan orang memilih
 * paket, jadi tiap baris pantas punya penanda yang bisa dikenali sekilas.
 */
const icons: Record<string, LucideIcon> = {
  cover: Mail, couple: Heart, events: CalendarDays, countdown: Timer, gallery: Images,
  guests: Users, imports: FileSpreadsheet, rsvp: MailCheck, wishes: Sparkles,
  closing: ListChecks, music: Music4, story: BookHeart, gift: Gift, rundown: CalendarClock,
  dresscode: Shirt, video: Video, design: Palette,
}

export function useFeatureLabels() {
  return {
    label: (feature: string) => labels[feature] ?? feature,
    icon: (feature: string) => icons[feature] ?? ListChecks,
  }
}
