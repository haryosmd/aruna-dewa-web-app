import type { CurrentAccount } from '@aruna/contracts/api'

export const useAuthStore = defineStore('auth', () => {
  const me = ref<CurrentAccount | null>(null)
  const loaded = ref(false)
  /** Kode sebab sesi terakhir berakhir, dibawa ke `/login` supaya ada kalimat penjelasnya. */
  const endedCode = ref<string | null>(null)
  const authApi = useAuthApi()
  const isOperator = computed(() => me.value?.user.role === 'r_7c91')

  async function load() {
    try { me.value = await authApi.me() } catch { me.value = null } finally { loaded.value = true }
    if (me.value) endedCode.value = null
  }
  /** Sekali per kunjungan. Plugin server sudah mengisinya sebelum middleware sempat bertanya. */
  async function loadOnce() { if (!loaded.value) await load() }
  /** Tidak ada cookie sesi sama sekali — tandai tanpa membayar satu round trip ke API. */
  function markSignedOut() { me.value = null; loaded.value = true }
  /** Sesi berakhir di tengah pemakaian; sebabnya disimpan, bukan dibuang diam-diam. */
  function endSession(code: unknown) { me.value = null; loaded.value = true; endedCode.value = sessionEndedReason(code) }
  /**
   * Sebab yang lama tidak boleh menjelaskan kegagalan yang baru. Dipanggil sebelum satu
   * percobaan masuk, supaya kode yang tersisa sesudahnya memang lahir dari percobaan itu.
   */
  function forgetEndedReason() { endedCode.value = null }
  /**
   * Nama baru ditambal di tempat, bukan lewat `load()` ulang: respons `PATCH` sudah membawa
   * akun lengkap, dan satu round trip tambahan berarti nama di header sempat tertinggal
   * beberapa ratus milidetik di belakang nama yang barusan disimpan orangnya.
   */
  async function updateProfile(name: string) {
    me.value = await authApi.updateProfile(name)
  }
  async function logout() {
    await authApi.logout()
    me.value = null
    endedCode.value = null
    await navigateTo('/')
  }
  return { me, loaded, endedCode, isOperator, load, loadOnce, markSignedOut, endSession, forgetEndedReason, updateProfile, logout }
})
