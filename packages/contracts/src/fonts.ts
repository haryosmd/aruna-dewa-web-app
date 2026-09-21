/** `dm-sans` is retained so documents written before the theme system still validate. */
export const fontChoices = ['cormorant', 'italiana', 'fraunces', 'jost', 'jakarta', 'instrument', 'charm', 'great-vibes', 'parisienne', 'pinyon', 'allura', 'dm-sans'] as const
export type FontChoice = (typeof fontChoices)[number]
