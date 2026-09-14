import type { Invitation } from '~/types/aruna'

type Me = { user: { id: string; email: string; name: string; role: string }; invitations: Invitation[] }

export const useAuthStore = defineStore('auth', () => {
  const me = ref<Me | null>(null)
  const loaded = ref(false)
  /** Kode sebab sesi terakhir berakhir, dibawa ke `/login` supaya ada kalimat penjelasnya. */
  const endedCode = ref<string | null>(null)
  const { request } = useApi()
  const isOperator = computed(() => me.value?.user.role === 'r_7c91')

  async function load() {
    try { me.value = await request<Me>('/auth/me') } catch { me.value = null } finally { loaded.value = true }
    if (me.value) endedCode.value = null
  }
  /** Sekali per kunjungan. Plugin server sudah mengisinya sebelum middleware sempat bertanya. */
  async function loadOnce() { if (!loaded.value) await load() }
  /** Tidak ada cookie sesi sama sekali — tandai tanpa membayar satu round trip ke API. */
  function markSignedOut() { me.value = null; loaded.value = true }
  /** Sesi berakhir di tengah pemakaian; sebabnya disimpan, bukan dibuang diam-diam. */
  function endSession(code: unknown) { me.value = null; loaded.value = true; endedCode.value = sessionEndedReason(code) }
  async function logout() {
    await request('/auth/logout', { method: 'POST' })
    me.value = null
    endedCode.value = null
    await navigateTo('/')
  }
  return { me, loaded, endedCode, isOperator, load, loadOnce, markSignedOut, endSession, logout }
})
