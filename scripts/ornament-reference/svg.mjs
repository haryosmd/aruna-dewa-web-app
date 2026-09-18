/** Clean the known local ornament exports without simplifying their geometry. */
export function cleanSvg(raw, { ink = '#3c2e24', opacity = 1, colors = {}, maskOpacity, solidShadow = false } = {}) {
  if (/<(?:script|image|foreignObject|style)\b|\son\w+\s*=|<!ENTITY|<!DOCTYPE/i.test(raw)
    || /(?:href\s*=\s*["'](?!#)|url\(\s*["']?(?!#)[\w:/])/i.test(raw)) {
    throw new Error('Expected a self-contained vector SVG without active content or bitmap images')
  }
  let svg = raw
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(metadata|title|desc)\b[^>]*>[^]*?<\/\1>/g, '')
    .replace(/\s(?:aria-labelledby|aria-describedby|role|data-[\w-]+)="[^"]*"/g, '')
    .replace(/currentColor/g, ink)
    .replace(/(fill|stroke)="(#[a-f\d]+)"/gi, (all, attr, hex) => `${attr}="${colors[hex.toLowerCase()] ?? hex}"`)
  const ids = new Map([...svg.matchAll(/\bid="([^"]+)"/g)].map((m, i) => [m[1], `o${i + 1}`]))
  svg = svg.replace(/\bid="([^"]+)"/g, (_, id) => `id="${ids.get(id)}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => {
      if (!ids.has(id)) throw new Error(`Unresolved SVG definition: ${id}`)
      return `url(#${ids.get(id)})`
    })
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, (_, attr, id) => {
      if (!ids.has(id)) throw new Error(`Unresolved SVG reference: ${id}`)
      return `${attr}="#${ids.get(id)}"`
    })
  svg = svg.replace(/<svg\b[^>]*>/, root => root
    .replace(/\s(?:width|height|zoomAndPan|version)="[^"]*"/g, ''))
  if (maskOpacity !== undefined) svg = svg.replace(/<mask\b[^>]*>[^]*?<\/mask>/g,
    mask => mask.replace(/fill-opacity="0.1"/g, `fill-opacity="${maskOpacity}"`))
  if (solidShadow) svg = svg.replace(/ opacity="0.7"/g, ' opacity="1"')
  if (opacity !== 1) svg = svg.replace(/(<svg\b[^>]*>)/, `$1<g opacity="${opacity}">`).replace('</svg>', '</g></svg>')
  if (!/viewBox="[-\d. eE+]+"/.test(svg)) throw new Error('SVG needs a viewBox')
  return svg.trim() + '\n'
}
