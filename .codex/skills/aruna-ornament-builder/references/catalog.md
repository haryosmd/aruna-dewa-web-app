# Catalog v1 and integration

`catalog.json` is a local artifact contract, not a backend API. Top-level fields: `schemaVersion: 1`, pack `id`, `name`, `scope`, palette, fonts, composition, and `assets`.

Each asset contains:

| Field | Meaning |
|---|---|
| `id`, `name`, `category`, `tags` | Stable identity, role, culture/theme/style search |
| `culturalRole` | Cultural architecture/instrument, common material, original decoration or companion flora |
| `provenance` | Creation kind/method, reference URLs, checked date; generation prompt record where relevant |
| `usage` | `original-local-demo` or explicitly `production-approved`; research remains in separate source manifests |
| `style` | Palette and rendering medium |
| `layers`, `anchor` | Editable groups/cutout plane and intended attachment |
| `motion` | Preset, amplitude/unit, duration, easing, reduced-motion fallback, rigid flag |
| `variants` | Relative path, format, dimensions, byte count, SHA-256, alpha |

Use `validate.mjs <pack>` after editing. Research manifests additionally track source page, asset URL, download status, timestamp, MIME, local content-addressed path and dimensions. A failed or unsupported response has no usable local asset reference.

## Mapping to Aruna Dewa, only when requested

- SVG entries become components under `apps/web/components/ornament/` and records in `apps/web/utils/ornaments.ts`: component, name, category, ratio, and layer slot if applicable.
- Compose via `themePresentation`/`themeOrnaments()` in `apps/web/utils/theme.ts`; use the existing `InvitationOrnamentField` and motion composable. Frame/divider/corner/motif/symbol/seal identity must follow `DESIGN.md`.
- Raster cutouts need an explicit renderer extension: current ornament glyphs are SVG components. Do not silently register PNG as a Vue SVG component. Background tiles similarly stay outside glyph/DrawSVG handling.
- Adding an actual template ID requires examining `packages/contracts` and theme tests. This pack does not alter them.
- Keep competitor downloads out of `apps/web/public`; promote only selected originals or licensed assets with recorded source/license. Identify/source fonts independently of competitor font binaries.
