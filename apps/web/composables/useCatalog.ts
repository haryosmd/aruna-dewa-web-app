import type { CatalogResponse } from '@aruna/contracts/api'

/**
 * Katalog paket dan add-on. Diambil di tiga berkas — landing, wizard `/order`, dan editor —
 * dan isinya sama untuk semua orang, jadi satu kunci `useAsyncData` cukup untuk seluruh sesi.
 */
export function useCatalog() {
  const { request } = useApi()
  const fetchCatalog = () => request<CatalogResponse>('/catalog')
  return { fetchCatalog, catalog: () => useAsyncData('catalog', fetchCatalog) }
}
