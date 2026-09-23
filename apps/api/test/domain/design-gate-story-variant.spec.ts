import { describe, expect, it } from 'vitest';

import { createDefaultDocument, storyVariants, type InvitationDocument } from '@aruna/contracts';

import { hasDesignChange } from '../../src/invitations/invitations.service';

/**
 * `story.variant` (fase 79) BUKAN perubahan desain, dan baris-baris di bawah yang menahannya
 * tetap begitu.
 *
 * Kalau ia dimasukkan ke `kanonikBagian` bersama `textStyles`/`background`/`motion`, akibatnya
 * bisa ditunjuk dan mahal: `restructureDocument` dan "Kembalikan ke preset awal" sama-sama
 * menulis `{ ...bawaan.data, ...lama.data }`, jadi keduanya PASTI menanam `variant: 'rel'` ke
 * draf lama yang belum punya kunci itu. Sidik jarinya berbalik dari absen ke `'rel'` pada
 * simpan pertama, dan setiap pelanggan tanpa add-on `design` terkunci — tidak bisa menyimpan
 * apa pun, dengan galat yang muncul jauh dari sebabnya. Itu cacat 73.1 kata per kata.
 *
 * Yang benar: wajah cerita adalah ISI yang dipilih pasangan, sederajat dengan memilih berapa
 * langkah ceritanya — bukan token desain yang dijual terpisah.
 */
const dengan = (variant: string): InvitationDocument => {
  const doc = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
  const story = doc.sections.find((section) => section.type === 'story')!;
  story.data = { ...story.data, variant };
  return doc;
};

describe('gerbang desain dan varian cerita', () => {
  it('berganti wajah cerita tidak menuntut add-on desain', () => {
    for (const variant of storyVariants) {
      expect(hasDesignChange(dengan('rel'), dengan(variant)), variant).toBe(false);
    }
  });

  it('draf lama yang BELUM punya kolomnya tidak berubah sidik jarinya saat kolomnya ditanam', () => {
    // Jalur yang paling mungkin terjadi di produksi: restrukturisasi atau reset preset menulis
    // bawaan `variant` ke draf yang lahir sebelum fase 79.
    const sebelum = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
    const story = sebelum.sections.find((section) => section.type === 'story')!;
    delete (story.data as Record<string, unknown>).variant;
    expect(hasDesignChange(sebelum, dengan('rel'))).toBe(false);
  });

  it('tapi gerak per bagian TETAP digerbangi — penjaga ini tidak boleh melonggarkan yang lain', () => {
    const dasar = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
    const bergerak = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
    const story = bergerak.sections.find((section) => section.type === 'story')!;
    story.data = { ...story.data, motion: 'iris' };
    expect(hasDesignChange(dasar, bergerak)).toBe(true);
  });
});
