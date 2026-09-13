export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.loaded) await auth.load()
  // Bawa tujuan lengkap beserta query-nya, supaya paket yang sudah dipilih di landing
  // tidak hilang saat pengunjung dialihkan untuk masuk.
  if (!auth.me) return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
})
