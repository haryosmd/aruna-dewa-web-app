import type { CurrentAccount, LoginBody, RegisterBody } from '@aruna/contracts/api'

/**
 * Jalur identitas. Tidak ada di daftar composable domain semula, tapi tanpanya tujuh
 * pemanggilan `/auth/*` tetap tersebar sebagai string path di lima halaman dan satu store —
 * dan itu persis kebiasaan yang hendak dihentikan fase ini.
 */
export function useAuthApi() {
  const { request } = useApi()

  const me = () => request<CurrentAccount>('/auth/me')
  const login = (body: LoginBody) => request<{ user: unknown }>('/auth/login', { method: 'POST', body })
  const register = (body: RegisterBody) => request<{ id: string; email: string; name: string }>('/auth/register', { method: 'POST', body })
  const logout = () => request<void>('/auth/logout', { method: 'POST' })
  const verifyEmail = (token: string) => request<{ verified: boolean }>('/auth/verify-email', { method: 'POST', body: { token } })
  const forgotPassword = (email: string) => request<{ accepted: boolean }>('/auth/forgot-password', { method: 'POST', body: { email } })
  const resetPassword = (token: string, password: string) => request<{ reset: boolean }>('/auth/reset-password', { method: 'POST', body: { token, password } })

  return { me, login, register, logout, verifyEmail, forgotPassword, resetPassword }
}
