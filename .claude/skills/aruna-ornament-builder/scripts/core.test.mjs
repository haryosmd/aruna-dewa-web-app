import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, detectType, blobIdentity, svgProblems, extractCssUrls } from './core.mjs';

test('normalizes supplied punctuation without dropping signed asset queries', () => {
  assert.equal(normalizeUrl('https://example.org/theme/,.', 'https://example.org'), 'https://example.org/theme/');
  assert.equal(normalizeUrl('../leaf.png?v=2&x=3', 'https://example.org/css/a.css'), 'https://example.org/leaf.png?v=2&x=3');
  assert.equal(normalizeUrl('javascript:alert(1)', 'https://example.org'), null);
});
test('rejects an HTML error page masquerading as a PNG', () => {
  assert.equal(detectType(Buffer.from('<!doctype html><h1>403 Forbidden</h1>'), 'image/png'), null);
  assert.equal(detectType(Buffer.from([137,80,78,71,13,10,26,10]), 'image/png'), 'png');
});
test('content addressing deduplicates identical bytes', () => {
  assert.equal(blobIdentity(Buffer.from('same')), blobIdentity(Buffer.from('same')));
  assert.notEqual(blobIdentity(Buffer.from('same')), blobIdentity(Buffer.from('changed')));
});
test('rejects active SVG and embedded rasters but accepts local gradient references', () => {
  assert.ok(svgProblems('<svg><script>alert(1)</script></svg>').length);
  assert.ok(svgProblems('<svg onload="x()"><image href="data:image/png;base64,a"/></svg>').length);
  assert.ok(svgProblems('<svg><path fill="url(https://bad.test/a)"/></svg>').length);
  assert.deepEqual(svgProblems('<svg viewBox="0 0 10 10"><defs><linearGradient id="a"/></defs><path fill="url(#a)" d="M0 0H10V10Z"/></svg>'), []);
});
test('discovers CSS backgrounds, font sources and imports relative to stylesheet', () => {
  assert.deepEqual(extractCssUrls('@import "base.css"; .a::before{background:url(../leaf.webp)} @font-face{src:url("font.woff2")}', 'https://example.org/css/theme.css'), ['https://example.org/leaf.webp','https://example.org/css/font.woff2','https://example.org/css/base.css']);
});
