# Audit a public invitation

1. Normalize URL punctuation; retain meaningful queries. Use `collect.mjs` to record source HTML, rendered HTML, cover/full screenshots, external CSS/JS, image attributes/srcset/lazy sources, computed backgrounds/masks/pseudo-elements, inline SVG, @font-face files and network results.
2. Open the visible invitation cover and scroll to load later sections. The helper samples 390×844, up to 45 scroll steps, three CSS discovery rounds and 20 MB per archived asset. Broaden these limits only when evidence shows missing relevant content; report every excluded/uncollected URL. It is not an exhaustive website crawler.
3. `report.mjs` emits an index, site galleries, font JSON and reports. Images include photos/icons as well as ornaments; visually curate candidates rather than treating every image as a decorative asset. Raw SVG/CSS/JS are stored with `.txt`; gallery thumbnails are rasterized so third-party code stays inert.
4. Match typography at three levels: stylesheet declaration; computed family/weight/style/size; CDP `CSS.getPlatformFontsForNode` with positive glyphCount. The last is rendered-font evidence, only for the sampled nodes. A fallback can differ from the first declared family. Record source font URLs and license status separately.
5. For inspect trouble, inspect external scripts and test contextmenu cancellation. Record actual handler behavior and source URL. Do not equate generic `contextmenu` strings in jQuery with a blocker. Synthetic events cannot establish every trusted-keyboard or docked-DevTools behavior.
6. Report named animations, duration/easing, transforms, origins, layers and sampled phases. A transform is not proof of a scroll trigger; trace the matching selector in JS/CSS if the trigger matters. Keep unknown values unknown.

The seed sites load Bisdev Browser Protection. The September 2026 capture showed canceled contextmenu events and handlers that prevent F12 and several DevTools shortcuts. Recheck on later runs rather than assuming unchanged behavior. No Canva origin was established.

Media bodies and third-party embedded documents are outside ornament scope; retain their discovery/status without claiming they were archived. Preserve HTTP failures and invalid-file responses. Hash-based storage permits re-running without duplicate bodies.
