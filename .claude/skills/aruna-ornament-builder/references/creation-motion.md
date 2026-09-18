# Creation and motion

## SVG

Draw original geometry informed by the cultural form and composition, not a near-exact trace of a competitor's distinctive artwork. Use a stable viewBox, coherent group names (`data-layer`), and glyph-prefixed IDs. Use `currentColor` and a second opacity value for the existing Aruna vector style. `data-mass` identifies filled silhouettes; `data-draw` is reserved for meaningful strokes. Filled shapes cannot be revealed with DrawSVG.

Use path/group geometry, not embedded rasters. Validate XML in the browser, reject scripts/event handlers/foreignObject/external URLs/entities, and test duplicate IDs when several copies render together. Prefix IDs per instance for reusable components. Keep buildings rigid: reveal or translate the whole form, never bend the roof for sway.

## Raster

Use the available imagegen skill/tool for original watercolor or other detailed cutouts. Ask for actual transparent alpha, clean margins and no text/watermark. Save selected outputs in the pack; preserve generation prompts and tool provenance. Inspect against light and dark backgrounds and verify alpha numerically. Some viewers expose hidden RGB even in transparent pixels; check a proper alpha-composited browser rendering before mistaking that for a painted background.

Convert selected PNG to WebP using the project's `sharp`, retaining alpha. Keep the source PNG. Conversion/resizing is mechanical asset preparation, not raster-to-vector conversion. If image generation is unavailable, report the limitation and keep the raster deliverable pending; do not replace requested illustrations with unrelated placeholders.

## Motion recipes

- Reveal: opacity plus 12–18 px vertical travel, roughly 1.1 s, `power2.out`, light staggering.
- Flora sway: about ±1.5°, 5–7 s, `sine.inOut`, origin at stem attachment. At most two dominant ambient actors per view.
- Parallax: bounded 8–16 px layer translation, separate parent from the sway element so transforms compose.
- Motif/background: static or extremely restrained; preserve text contrast.

These are defaults to adapt to the actual shape, not mandatory universal timings. Use GSAP already installed in the project. Pause ambient loops offscreen and while the document is hidden; remove observers/listeners on teardown. Respect live changes to `prefers-reduced-motion` and provide static readable content before JS runs. Decorative layers use `aria-hidden`, empty image alt, and cannot intercept controls.

Keep the original pack demo local and offline. Use system fonts unless properly sourced fonts are included. Verify 360/768/1440 widths, no overflow, control usability, all images loaded, no-JS and reduced-motion fallback. If integration is requested later, extend existing registry/rendering behavior and its tests rather than routing around it.
