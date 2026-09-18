# Accuracy-led image-to-SVG reconstruction

Use this route when the user supplies screenshots, image files, an ornament gallery, or a source SVG and asks to rebuild it accurately for the ornament bank. The deliverable must say whether it is a preserved source vector, a traced reconstruction, or a raster cutout. Do not promise pixel-perfect 1:1 conversion from a lossy raster.

## 1. Classify the evidence before drawing

1. Inspect the supplied asset at native dimensions and record its SHA-256, source URL or user-provided location, dimensions, alpha, and any editor metadata. If a live page is supplied, inspect its DOM, CSS, network assets, and downloadable SVG before working from its screenshot.
2. Prefer the highest-fidelity source in this order: user-provided/downloaded SVG, original transparent raster, full-resolution screenshot, then a cropped or compressed screenshot.
3. Categorize each ornament independently:
   - **source-vector:** paths, groups, fills, gradients, masks, and transforms are available. Preserve them and clean only unsafe/editor-specific markup.
   - **reconstructed-vector:** the visible source is raster but the shape is line art, a flat silhouette, or other geometry that can be honestly redrawn as paths.
   - **raster-cutout:** photographic, painterly, floral, jewelry, people, textured, or anti-aliased artwork whose visual detail would materially change when traced. Keep transparent PNG and optional alpha-preserving WebP.
   - **unresolved:** coverage, crop, or source quality prevents a dependable reconstruction. State the gap rather than inventing missing geometry.

When one visual item mixes media, split it into a vector layer plus a raster cutout only if the layers can be separated without changing the appearance. Otherwise preserve it as one raster-cutout.

## 2. Preserve or build the correct medium

### Source SVG

- Preserve original path data, shape order, transforms, fill rules, stroke joins/caps, gradients, masks, clipping, and viewBox. Do not run an optimizer that merges shapes, converts colors, drops cream fills, or alters transforms until its render has been compared.
- Remove scripts, event handlers, external references, foreignObject, and editor-only metadata as appropriate for the destination. Give reusable IDs a per-asset prefix and preserve the pre-clean source file or a recorded source checksum outside the production artifact.
- A `Canva`, exporter, or editor identifier is provenance evidence only. It neither proves Canva ownership nor turns the asset into an original. Keep source URL/file, access or license status, author/owner if known, extraction date, and source checksum in `catalog.json` provenance.
- Do not embed a raster into an SVG. If the source is already raster, create a raster-cutout instead.

### Reconstructed vector

- Establish the reference coordinate system from the unscaled image. Trace the silhouette first, then major interior structure, then fine scrollwork. Use discrete named groups (`data-layer`) for silhouette, interior linework, fills, and accents.
- Preserve asymmetry, negative space, line weight, open/closed contours, overlap order, and cropping. Avoid a generic culturally similar substitute.
- Match the reference palette before applying any Aruna theme token. A cream fill, gray shadow, translucent wash, or multi-tone stroke is part of the target artwork; do not collapse it to `currentColor` merely to make theming convenient.
- Apply no automatic recolor. A theme-tint variation is a separately named variant, alongside the source-palette master.

### Raster cutout

- Keep the original transparent PNG as the master. Crop only transparent margins deliberately, preserve native pixels, and generate WebP only as an additional delivery variant retaining alpha.
- Composite it on the intended page background for review. Do not interpret hidden RGB in fully transparent pixels as an opaque background.

## 3. Calibrate color from the actual reference

Use the reference screenshot's rendered colors as the baseline, including the page background used to judge anti-aliased edges. Sample multiple representative regions: primary dark linework, each meaningful fill, accent/shadow, and background. Record sampled hex/RGBA values and whether values are estimated because compression or blending prevented an exact read.

If an original SVG is present, compare its native paint values with the rendered screenshot. Preserve native values where they render to the intended reference; otherwise record the CSS, opacity, blend, or background factor that explains the difference. Do not replace a reference palette with theme colors to make a gallery uniform.

## 4. Compare before accepting

Render the candidate and reference at the same pixel dimensions, in the same coordinate space, with the same background. Compare all of the following:

- **Alignment:** common anchor points and bounds. Report max and mean displacement in pixels, measured only where anchors are identifiable.
- **Silhouette:** an alpha/edge overlay and a difference view. Report the percentage of the compared opaque area that differs, its threshold, and whether anti-aliasing was excluded.
- **Color:** swatches or region samples, with per-channel or DeltaE measurement where a flat-color region permits it. State every non-flat or blended region that was visually judged instead.
- **Light and dark review:** show the asset over both light and dark backgrounds. This catches lost cream fills, invisible linework, and fringe alpha that a single cream screenshot hides.

Save the reference render, candidate render, blend overlay, and difference image with the pack's comparison evidence. Inspect them at 100% scale; metrics cannot excuse visibly wrong spacing, layers, or color.

Use bounds that fit the evidence. For example, a clean source-vector copy may target zero geometry deviation after cleanup; a manual trace may report its observed anchors and alpha-difference percentage instead of declaring "1:1". Do not invent universal pixel, percentage, or DeltaE thresholds. Lossy screenshots, resampling, unknown fonts, transparency, and anti-aliasing make exact numerical equivalence unavailable.

## 5. Bank handoff

For every asset, keep the catalog format documented in `catalog.md` and include:

- the classification above and the truthfully named `provenance.creationKind` / method;
- reference source/location, source checksum, date accessed, metadata observation, and ownership or license status when known;
- source-palette master and separately named derived palette variants;
- editable SVG layer names for vectors, or PNG/WebP alpha variants for raster-cutouts;
- comparison artifact paths plus the measurements, conditions, and limitations used in acceptance.

Only register assets in the Aruna ornament bank when the request authorizes integration. Preserve source/derived status in the catalog; never label a copied source vector or reconstruction as an original merely because its metadata has been removed.

## Acceptance language

Use specific language in the final report. Examples: “Preserved source SVG geometry; rendered comparison shows no observed geometry change at 2× review,” “Manual vector reconstruction; max measured anchor displacement 1.6 px at 1024 px render,” or “Raster-native floral cutout retained as alpha PNG to avoid loss of painted detail.” Do not state “identical,” “perfect 1:1,” or “original” without evidence that supports those terms.

## Existing fixed-reference bank

For this collection, use `scripts/ornament-reference/build.mjs` and `scripts/ornament-reference/verify.mjs`. Masters and provenance are in `packs/referensi/`; the generated registry `apps/web/utils/ornament-reference.ts` joins `ornamentBank`. `OrnamentGlyph` passes the asset URL to `ReferenceAsset.vue`, preserving fixed palette and isolating SVG IDs with an image document. Do not feed these into the theme-ramp importer. Keep original canvas margins when the reference includes them: trimming roses or buildings changes their apparent scale and anchor. Preserve both this skill copy and its matching `.codex`/`.claude` copy when updating this workflow.
