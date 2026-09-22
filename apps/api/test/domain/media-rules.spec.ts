import { describe, expect, it } from 'vitest';
import { allowedMediaTypes, catalog, formatBytes, galleryPhotoLimitFor, maxGalleryPhotoLimit, maxMediaBytes, mediaAccept, mediaKindOf, mediaKinds, mediaRules, ornamentAssetLimit, packagePhotoLimits } from '@aruna/contracts';

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

  /*
   * Sampai fase 75 ini satu angka untuk semua (`galleryPhotoLimit === 15`), padahal katalog sudah
   * menjanjikan 15/30/60 lewat `photoLimit` yang tidak dibaca siapa pun.
   */
  it('batas foto mengikuti paket, dan katalog membaca angkanya dari sumber yang sama', () => {
    expect(galleryPhotoLimitFor('mula')).toBe(15);
    expect(galleryPhotoLimitFor('mekar')).toBe(30);
    expect(galleryPhotoLimitFor('purnama')).toBe(60);
    // Katalog tidak boleh menyimpan angka keduanya sendiri.
    for (const pack of catalog.packages) expect(pack.photoLimit).toBe(galleryPhotoLimitFor(pack.id));
  });

  it('paket yang tidak dikenali dan draft tanpa pesanan memakai angka paket termurah, bukan tak terbatas', () => {
    const termurah = Math.min(...Object.values(packagePhotoLimits));
    for (const nilai of [null, undefined, '', 'entah', 'MULA']) expect(galleryPhotoLimitFor(nilai)).toBe(termurah);
    expect(termurah).toBe(15);
  });

  /*
   * Plafon dipakai cap statis zod, yang tidak bisa tahu paketnya. Kalau paket teratas dinaikkan
   * tanpa plafonnya ikut, dokumen paket teratas akan ditolak skemanya sendiri — dan gejalanya
   * muncul sebagai "dokumen tidak valid", jauh dari katalog yang baru diubah.
   */
  it('plafon sama dengan paket tertinggi, dan diturunkan bukan ditulis tangan', () => {
    expect(maxGalleryPhotoLimit).toBe(Math.max(...catalog.packages.map((pack) => pack.photoLimit)));
    expect(maxGalleryPhotoLimit).toBe(60);
  });

  it('tiap paket katalog punya kuotanya, tidak ada yang diam-diam jatuh ke bawaan', () => {
    for (const pack of catalog.packages) expect(Object.keys(packagePhotoLimits)).toContain(pack.id);
  });

  it('ornamen (fase 69) adalah jenis ketiga: raster transparan, kecil, dan SVG tetap di luar', () => {
    expect(mediaKinds.sort()).toEqual(['audio', 'image', 'ornament']);
    expect([...mediaRules.ornament.mimeTypes]).toEqual(['image/png', 'image/webp']);
    expect(mediaRules.ornament.maxBytes).toBeLessThan(mediaRules.image.maxBytes);
    expect(mediaAccept('ornament')).not.toContain('svg');
    // PNG tetap "image" bagi penebak MIME: jenis ornamen dinyatakan klien lewat `?jenis=`, bukan ditebak.
    expect(mediaKindOf('image/png')).toBe('image');
    expect(ornamentAssetLimit).toBeGreaterThan(0);
  });
});
