import { createHash } from 'node:crypto';

export function normalizeUrl(raw, base) {
  try {
    const u = new URL(raw.trim().replace(/[,.]+$/, '').replaceAll('&amp;', '&'), base);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    return u.href;
  } catch { return null; }
}

export const blobIdentity = bytes => createHash('sha256').update(bytes).digest('hex');

export function detectType(b, mime = '') {
  const head = b.subarray(0, 512).toString().trim();
  if (/^<(?:!doctype html|html|head|body)/i.test(head)) return null;
  if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return 'jpg';
  if (/^GIF8[79]a/.test(head)) return 'gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(b.toString('ascii', 8, 32))) return 'avif';
  if (/<svg[\s>]/i.test(head)) return 'svg';
  if (b.toString('ascii', 0, 4) === 'wOF2') return 'woff2';
  if (b.toString('ascii', 0, 4) === 'wOFF') return 'woff';
  if (b.toString('ascii', 0, 4) === 'OTTO') return 'otf';
  if (b.length > 4 && b.readUInt32BE(0) === 0x00010000) return 'ttf';
  if (b.length > 36 && b.readUInt16LE(34) === 0x504c) return 'eot';
  if (mime.includes('text/css')) return 'css';
  if (/javascript/.test(mime)) return 'js';
  return null;
}

export function svgProblems(svg) {
  const errors = [];
  if (!/<svg[\s>]/i.test(svg) || !/viewBox\s*=/.test(svg)) errors.push('missing svg/viewBox');
  if (/<(?:script|foreignObject|image|iframe|object|embed|style|animate|set)\b/i.test(svg)) errors.push('active or embedded content');
  if (/\bon[a-z]+\s*=/i.test(svg)) errors.push('event attribute');
  if (/<!ENTITY|<!DOCTYPE/i.test(svg)) errors.push('XML entity/doctype');
  if (/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)) errors.push('external or raster reference');
  if (/url\(\s*["']?(?!#)[^)]/i.test(svg)) errors.push('external CSS reference');
  const ids = [...svg.matchAll(/\bid=["']([^"']+)/g)].map(m => m[1]);
  if (ids.length !== new Set(ids).size) errors.push('duplicate IDs');
  return errors;
}

export function extractCssUrls(css, base) {
  const values = [...css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)].map(m => m[1]);
  values.push(...[...css.matchAll(/@import\s+["']([^"']+)["']/g)].map(m => m[1]));
  return [...new Set(values.map(v => normalizeUrl(v, base)).filter(Boolean))];
}

export const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
