import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanSvg } from './svg.mjs'
import sharp from 'sharp'

test('metadata cleanup preserves paint, geometry and referenced definitions', async () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><metadata>Canva editor</metadata><defs><clipPath id="canva-42"><path d="M0 0H30V40H0Z"/></clipPath></defs><g clip-path="url(#canva-42)" opacity="0.6"><path fill="#483534" d="M0 0H40V40H0Z"/></g></svg>'
  const result = cleanSvg(source, { ink: '#3c2e24' })
  assert.doesNotMatch(result, /canva|metadata/i)
  assert.match(result, /opacity="0.6"/)
  assert.match(result, /fill="#483534"/)
  assert.deepEqual(await sharp(Buffer.from(source)).raw().toBuffer(), await sharp(Buffer.from(result)).raw().toBuffer())
})

test('reference color replaces currentColor without changing transparency or paths', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path opacity="0.32" d="M0 0H20V20Z"/></svg>'
  const result = cleanSvg(source, { ink: '#3c2e24', opacity: 0.55 })
  assert.doesNotMatch(result, /currentColor/)
  assert.match(result, /#3c2e24/)
  assert.match(result, /opacity="0.32"/)
  assert.match(result, /opacity="0.55"/)
  assert.match(result, /d="M0 0H20V20Z"/)
})

test('unsafe SVG and bitmap wrappers are rejected', () => {
  for (const body of ['<script>alert(1)</script>', '<image href="data:image/png;base64,AAAA"/>', '<path onclick="x()"/>', '<use href="https://example.com/a.svg#x"/>', '<foreignObject/>']) {
    assert.throws(() => cleanSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">${body}</svg>`))
  }
})
