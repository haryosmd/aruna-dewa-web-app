import { describe, expect, it } from 'vitest';
import { allowedMediaTypes, formatBytes, galleryPhotoLimit, maxMediaBytes, mediaAccept, mediaKindOf, mediaRules } from '@aruna/contracts';

describe('aturan media', () => {
  it('hanya meloloskan empat jenis yang benar-benar didukung pemutar dan renderer', () => {
    expect([...allowedMediaTypes].sort()).toEqual(['audio/mpeg', 'image/jpeg', 'image/png', 'image/webp']);
    // GIF, AVIF, dan SVG dulu lolos `accept="image/*"` di editor lalu ditolak server.
    for (const rejected of ['image/gif', 'image/avif', 'image/svg+xml', 'audio/wav']) {
      expect(mediaKindOf(rejected)).toBeNull();
    }
  });

  it('mengenali jenis yang benar untuk tiap MIME yang diterima', () => {
    expect(mediaKindOf('image/webp')).toBe('image');
    expect(mediaKindOf('audio/mpeg')).toBe('audio');
  });

  it('menyusun accept dari MIME dan ekstensi sekaligus', () => {
    // Ekstensi wajib ikut: sebagian ponsel melaporkan .webp sebagai application/octet-stream,
    // dan accept yang hanya berisi MIME membuat berkasnya tidak bisa dipilih sama sekali.
    const accept = mediaAccept('image');
    expect(accept).toContain('image/webp');
    expect(accept).toContain('.webp');
    expect(accept).toContain('.jpeg');
    expect(mediaAccept('audio')).toBe('audio/mpeg,.mp3');
  });

  it('memakai batas per jenis, bukan satu angka 20 MB untuk keduanya', () => {
    expect(mediaRules.image.maxBytes).toBe(10 * 1024 * 1024);
    expect(maxMediaBytes).toBe(Math.max(mediaRules.image.maxBytes, mediaRules.audio.maxBytes));
  });

  it('menyebut ukuran dalam bahasa yang dibaca orang Indonesia', () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe('10,0 MB');
    expect(formatBytes(14_900_000)).toBe('14,2 MB');
    expect(formatBytes(900)).toBe('900 B');
  });

  it('menyimpan batas foto sebagai satu angka yang dibagi server dan editor', () => {
    expect(galleryPhotoLimit).toBe(15);
  });
});
