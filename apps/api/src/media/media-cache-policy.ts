export function mediaCachePolicy(isPublishedPublicAsset: boolean): { cacheControl: string; vary?: string } {
  return isPublishedPublicAsset ? { cacheControl: 'public, max-age=3600' } : { cacheControl: 'private, no-store', vary: 'Cookie' };
}
