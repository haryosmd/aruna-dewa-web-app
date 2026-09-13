import { buildGuestUrl } from '@aruna/contracts'

export function useGuestLink() {
  const config = useRuntimeConfig()
  const build = (slug: string, displayName: string, token?: string) => {
    return buildGuestUrl(config.public.webBase, slug, displayName, token)
  }
  return { build }
}
