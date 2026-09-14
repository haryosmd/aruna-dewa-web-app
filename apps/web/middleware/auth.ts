export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  await auth.loadOnce()
  if (auth.me) return
  // Sebab berakhirnya sesi ikut terbawa: tanpa ini, orang yang baru saja tertendang karena
  // login di perangkat lain mendarat di form login tanpa penjelasan apa pun.
  const reason = auth.endedCode ? `&reason=${auth.endedCode}` : ''
  return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}${reason}`)
})
