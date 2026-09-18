---
name: aruna-ornament-builder
description: Hunt and audit wedding ornament references, identify rendered fonts and motion, curate culturally grounded original SVG and transparent raster packs, and prepare local theme previews for Aruna Dewa. Use for ornament hunting, recreation, collections, and theme briefs such as Sunda, Bali, Batak, or vintage.
---

# Aruna Ornament Builder

Work from the Aruna-dewa repository root. Read `AGENTS.md`, `DESIGN.md`, and the current `docs/features/ornament-builder/README.md`. Preserve unrelated changes. This skill creates research archives and original packs; installing a theme into the application is a separate scope unless the user requests it.

## Choose the route

- **URL / inspect / font audit:** read [audit.md](references/audit.md). Collect page, CSS, network and rendered-font evidence. Generate the local gallery and report.
- **Theme / cultural brief / ornament hunting:** read [curation.md](references/curation.md). Search authoritative cultural references, inspect existing catalogs, identify gaps, and choose a coherent set.
- **Recreate / SVG / cutout:** read [creation-motion.md](references/creation-motion.md). Author real vector paths or generate transparent raster imagery; keep original provenance separate from reference downloads.
- **Compose / animate / new theme pack:** use the same creation reference, existing catalog and `DESIGN.md`. Deliver an offline local preview and metadata, then verify it at mobile and desktop sizes.

For a brief spanning routes, continue through the required routes without asking for repeated permission. Ask only when an unresolved choice materially changes the output (for example true 3D versus layered 2.5D). Do not invent cultural meanings or claim exact font use from a CSS family declaration.

## Outputs and boundaries

- Research: `docs/features/ornament-builder/sources/<site>/`; binary blobs are shared by SHA-256. Keep docs gitignored. Competitor assets never become production files or original-pack members.
- Originals: `docs/features/ornament-builder/originals/<pack>/` with `catalog.json`, editable SVGs, alpha PNG/WebP, cultural/source notes, and a demo when requested.
- Record actual failures and incomplete coverage. Do not describe a broken download, fallback font, generated raster, or untested motion as verified.
- Catalog v1 fields and integration mapping are in [catalog.md](references/catalog.md). Reuse `ornamentBank`, `themePresentation`, and `useArunaMotion` when integration is requested, rather than creating another renderer.
- SVGs must remain editable paths/groups. Never put a bitmap into an SVG wrapper and call it vector recreation. Font identification does not establish licensing, and a Canva-like appearance does not establish Canva provenance.

## Helpers

Run from the repository root with `rtk proxy`. Scripts use existing Node dependencies (`@playwright/test`, `sharp`; `@axe-core/playwright` for demo checks), not a hidden API service.

```sh
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/collect.mjs https://example.org/invitation/
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/report.mjs
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/recommend.mjs --theme sunda --style botanical
rtk proxy node .claude/skills/aruna-ornament-builder/scripts/validate.mjs docs/features/ornament-builder/originals/sunda
rtk proxy node --test .claude/skills/aruna-ornament-builder/scripts/core.test.mjs
```

The collector defaults to the eight seed URLs only when no URLs are supplied. `--out <directory>` changes the research destination. It opens the invitation and scrolls without submitting RSVP or payment forms. Browser/network permissions follow the environment's approval mechanism. Inaccessible/login-protected sources must be reported; do not silently substitute a different page.

## Done means evidenced

Verify file signatures, checksums, SVG safety and unique IDs, alpha, font declarations versus rendered glyphs, complete failure inventory, local links, responsive layout, readable static fallback, reduced motion, and offscreen pause. Show the user the gallery/demo and the shortest useful instructions for invoking this skill again.
