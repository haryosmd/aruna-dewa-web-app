import { describe, expect, it } from 'vitest';

import { createDefaultDocument, templateAliases, templates, type InvitationDocument } from '@aruna/contracts';

import { hasDesignChange } from '../../src/invitations/invitations.service';

/**
 * Gerbang `design` dan tema yang dipensiunkan.
 *
 * Fase 48 menghapus delapan tema dari tiap pemilih. Tanpa pembebasan di bawah, pasangan tanpa
 * add-on `design` terkunci di tema yang tidak ada lagi: kami yang menghapus temanya, lalu
 * menagih mereka untuk keluar dari sana. Pembebasannya sempit dengan sengaja, dan dua tes
 * terakhir di berkas ini yang menjaga kesempitannya.
 */
const pensiun = Object.keys(templateAliases);
const hidup = templates[0]!;

/** Dokumen lama yang tersimpan, dengan id tema apa adanya — termasuk yang sudah pensiun. */
function tersimpan(templateId: string): unknown {
  return { ...createDefaultDocument('Aruna', 'Dewa'), templateId };
}

/** Dokumen yang dikirim editor setelah pasangan memilih tema lain. */
function dikirim(templateId: string): InvitationDocument {
  const preset = templates.find((t) => t.id === templateId) ?? hidup;
  return { ...createDefaultDocument('Aruna', 'Dewa'), templateId: preset.id, tokens: { ...preset.tokens } };
}

describe('gerbang design terhadap tema pensiun', () => {
  it.each(pensiun)('membebaskan perpindahan keluar dari %s', (id) => {
    expect(hasDesignChange(tersimpan(id), dikirim(hidup.id))).toBe(false);
  });

  it('tetap menggerbangi perubahan warna pada tema yang masih hidup', () => {
    const lama = tersimpan(hidup.id) as InvitationDocument;
    const baru = { ...dikirim(hidup.id), tokens: { ...hidup.tokens, primary: '#123456' } };
    expect(hasDesignChange(lama, baru)).toBe(true);
  });

  it('tetap menggerbangi urutan section pada tema yang masih hidup', () => {
    const lama = tersimpan(hidup.id) as InvitationDocument;
    const baru = dikirim(hidup.id);
    baru.sections = [baru.sections[1]!, baru.sections[0]!, ...baru.sections.slice(2)];
    expect(hasDesignChange(lama, baru)).toBe(true);
  });

  it('berhenti membebaskan begitu pasangan sudah pindah ke tema hidup', () => {
    // Pembebasan dibaca dari id LAMA, jadi ia habis sendiri sesudah satu perpindahan.
    const sudahPindah = tersimpan(hidup.id) as InvitationDocument;
    const gantiWarnaLagi = { ...dikirim(hidup.id), tokens: { ...hidup.tokens, background: '#ABCDEF' } };
    expect(hasDesignChange(sudahPindah, gantiWarnaLagi)).toBe(true);
  });

  it('menolak dokumen tersimpan yang bukan objek, seperti sebelumnya', () => {
    expect(hasDesignChange(null, dikirim(hidup.id))).toBe(true);
    expect(hasDesignChange('bukan dokumen', dikirim(hidup.id))).toBe(true);
  });
});
