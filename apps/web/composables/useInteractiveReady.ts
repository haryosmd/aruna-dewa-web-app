export function useInteractiveReady() {
  const ready = ref(false)
  onMounted(() => { ready.value = true })
  return ready
}
