import type { Invitation } from '~/types/aruna'

type Me = { user: { id: string; email: string; name: string; role: string }; invitations: Invitation[] }

export const useAuthStore = defineStore('auth', () => {
  const me = ref<Me | null>(null)
  const loaded = ref(false)
  const { request } = useApi()
  const isOperator = computed(() => me.value?.user.role === 'r_7c91')

  async function load() {
    try { me.value = await request<Me>('/auth/me') } catch { me.value = null } finally { loaded.value = true }
  }
  async function logout() { await request('/auth/logout', { method: 'POST' }); me.value = null; await navigateTo('/') }
  return { me, loaded, isOperator, load, logout }
})
