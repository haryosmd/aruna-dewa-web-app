/**
 * Google Picker untuk impor daftar tamu (fase 75).
 *
 * Sisi server sudah selesai sejak fase awal — `google-sheets.client.ts` memvalidasi
 * `spreadsheetId`/`range`/`accessToken`, memetakan 401/403/404, dan `imports.service.ts`
 * memeriksa izin di baris pertama. Yang hilang selama ini cuma bagian ini: cara mendapatkan
 * ketiga nilai itu dari pemilik berkasnya.
 *
 * **Scope `drive.file`, bukan `drive.readonly`.** Ia hanya memberi akses ke berkas yang
 * pemiliknya pilih sendiri lewat Picker, dan karena itu aplikasi ini tidak perlu melewati
 * verifikasi Google. `drive.readonly` akan membaca seluruh Drive seseorang untuk mengimpor satu
 * daftar tamu — jauh lebih dari yang dibutuhkan.
 *
 * **Token akses tidak pernah disimpan.** Ia lahir di browser, dipakai satu kali untuk satu
 * pratinjau, dan mati bersama tab. Server pun tidak menyimpannya.
 */

type PickerHasil = { spreadsheetId: string; range: string; accessToken: string }

/** Berapa baris yang diminta. Sepadan dengan batas impor 5.000 baris di kontrak. */
const RANGE = 'A1:Z5000'

/**
 * Permukaan `google.picker` yang benar-benar dipakai berkas ini — bukan `any`, dan bukan pula
 * paket tipe tambahan untuk enam simbol. Bentuknya sengaja minimal: apa yang tidak disebut di
 * sini memang tidak dipanggil.
 */
interface PickerNamespace {
  DocsView: new (viewId: unknown) => { setIncludeFolders: (v: boolean) => { setSelectFolderEnabled: (v: boolean) => unknown } }
  ViewId: { SPREADSHEETS: unknown }
  Action: { PICKED: string; CANCEL: string }
  PickerBuilder: new () => {
    setOAuthToken: (token: string) => PickerBuilderChain
  }
}
interface PickerBuilderChain {
  setDeveloperKey: (key: string) => PickerBuilderChain
  addView: (view: unknown) => PickerBuilderChain
  setCallback: (cb: (data: { action: string; docs?: { id: string }[] }) => void) => PickerBuilderChain
  build: () => { setVisible: (visible: boolean) => void }
}

declare global {
  interface Window {
    gapi?: { load: (name: string, cb: () => void) => void }
    google?: {
      picker?: PickerNamespace
      accounts?: { oauth2: { initTokenClient: (config: Record<string, unknown>) => { requestAccessToken: () => void } } }
    }
  }
}

function muatSkrip(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('Skrip Google tidak bisa dimuat. Periksa koneksi, lalu coba lagi.'))
    document.head.appendChild(el)
  })
}

export function useGoogleSheetPicker() {
  const config = useRuntimeConfig()
  const apiKey = String(config.public.googlePickerApiKey ?? '')
  const clientId = String(config.public.googlePickerClientId ?? '')

  /** Sumber kebenaran tunggal untuk "boleh ditampilkan": dipakai juga oleh `v-if` tombolnya. */
  const tersedia = computed(() => Boolean(apiKey && clientId))

  /** `null` = pemilik menutup Picker tanpa memilih. Itu bukan galat. */
  async function pilih(): Promise<PickerHasil | null> {
    if (!tersedia.value) throw new Error('Impor Google Sheets belum dikonfigurasi di lingkungan ini.')
    await Promise.all([muatSkrip('https://apis.google.com/js/api.js'), muatSkrip('https://accounts.google.com/gsi/client')])
    await new Promise<void>((resolve) => window.gapi!.load('picker', () => resolve()))

    const accessToken = await new Promise<string>((resolve, reject) => {
      const client = window.google!.accounts!.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (jawaban: { access_token?: string; error?: string }) => {
          if (jawaban.access_token) resolve(jawaban.access_token)
          else reject(new Error('Izin Google tidak diberikan, jadi daftar tamunya tidak bisa dibaca.'))
        },
      })
      client.requestAccessToken()
    })

    const picker = window.google?.picker
    if (!picker) throw new Error('Google Picker tidak tersedia. Muat ulang halaman, lalu coba lagi.')
    return new Promise<PickerHasil | null>((resolve) => {
      const view = new picker.DocsView(picker.ViewId.SPREADSHEETS).setIncludeFolders(true).setSelectFolderEnabled(false)
      new picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .addView(view)
        .setCallback((data) => {
          if (data.action === picker.Action.CANCEL) resolve(null)
          if (data.action !== picker.Action.PICKED) return
          const id = data.docs?.[0]?.id
          resolve(id ? { spreadsheetId: id, range: RANGE, accessToken } : null)
        })
        .build()
        .setVisible(true)
    })
  }

  return { tersedia, pilih }
}
