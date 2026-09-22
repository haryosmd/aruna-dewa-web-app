import { describe, it, expect } from 'vitest'
import {
  catalog, createDefaultDocument, createEleganceSections, headlessSectionTypes, invitationDocumentSchema,
  isLiveStructureId, legacySectionTypes, liveStructureIds, sectionFeature, sectionFields, sectionMeta,
  structureById, structureIds, structures, v2SectionTypes, documentStructureId, documentThemeId,
  createLegacyDocument, templateIds, liveTemplateIds,
} from '../packages/contracts/src/index'

/*
 * Fase 74.8: "template" akhirnya bisa berarti STRUKTUR, bukan cuma tema.
 *
 * Irisan ini sengaja nol perubahan perilaku — `elegance.build` MENUNJUK `createEleganceSections`,
 * tidak menyalinnya — jadi yang diuji di sini adalah invariannya, bukan keluarannya. Invarian
 * pertama yang paling mahal kalau lepas: tiap bagian yang lahir menyala wajib tercakup
 * `baseFeatures`, kalau tidak setiap undangan baru di paket termurah gagal terbit (cacat 73.2).
 */
const mula = catalog.packages.find(item => item.id === 'mula')!

describe('registry struktur', () => {
  it('mendaftar tiap id, dan hanya elegance yang bisa dipilih', () => {
    expect([...structureIds].sort()).toEqual(['elegance', 'warisan'])
    expect([...liveStructureIds]).toEqual(['elegance'])
    expect(isLiveStructureId('elegance')).toBe(true)
    expect(isLiveStructureId('warisan')).toBe(false)
  })

  it('id tak dikenal jatuh ke elegance — dokumen rusak tetap bisa dibuka pemiliknya', () => {
    expect(structureById('tidak-ada').id).toBe('elegance')
    expect(structureById('warisan').id).toBe('warisan')
  })

  it('tiap struktur punya nama, tagline, dan pembangun', () => {
    for (const id of structureIds) {
      const struktur = structures[id]
      expect(struktur.name, id).toBeTruthy()
      expect(struktur.tagline, id).toBeTruthy()
      expect(typeof struktur.build, id).toBe('function')
      expect(struktur.sectionTypes.length, id).toBeGreaterThan(0)
    }
  })

  it('elegance memakai createEleganceSections apa adanya — bukan salinan yang bisa melenceng', () => {
    expect(structures.elegance.build).toBe(createEleganceSections)
  })

  it('warisan memakai tipe v1 dan elegance memakai tipe v2', () => {
    expect([...structures.warisan.sectionTypes]).toEqual([...legacySectionTypes])
    expect([...structures.elegance.sectionTypes]).toEqual([...v2SectionTypes])
  })
})

describe('invarian tiap struktur', () => {
  /*
   * Cacat 73.2, digeneralisasi. `gift` dulu lahir menyala padahal bukan fitur paket Mula, jadi
   * SETIAP undangan baru di paket termurah ditolak saat Publikasikan. Struktur kedua akan
   * melahirkan ulang bug itu tanpa penjaga ini.
   */
  it.each([...liveStructureIds])('%s: tiap bagian yang lahir menyala tercakup paket termurah', id => {
    const struktur = structures[id]
    const diluar = [...struktur.enabledByDefault].filter(type => !mula.features.includes(sectionFeature[type]!))
    expect(diluar, `bagian ini lahir menyala tapi bukan fitur paket Mula: ${diluar.join(', ')}`).toEqual([])
  })

  it.each([...liveStructureIds])('%s: keluaran build cocok dengan sectionTypes dan enabledByDefault', id => {
    const struktur = structures[id]
    const bagian = struktur.build({ partner1: 'Dea', partner2: 'Haryo' })
    expect(bagian.map(s => s.type)).toEqual([...struktur.sectionTypes])
    const menyala = bagian.filter(s => s.enabled).map(s => s.type).sort()
    expect(menyala).toEqual([...struktur.enabledByDefault].sort())
  })

  it.each([...structureIds])('%s: bagian wajib adalah bagian yang benar-benar ada di struktur', id => {
    const struktur = structures[id]
    for (const type of struktur.required) expect(struktur.sectionTypes, `${id}.${type}`).toContain(type)
    for (const type of struktur.required) expect(struktur.enabledByDefault, `${id}.${type} wajib tapi lahir mati`).toContain(type)
  })

  it.each([...liveStructureIds])('%s: tiap tipe punya kolom form dan label rail', id => {
    for (const type of structures[id].sectionTypes) {
      expect(sectionFields[type as keyof typeof sectionFields], `${id}.${type}`).toBeDefined()
      expect(sectionMeta[type as keyof typeof sectionMeta], `${id}.${type}`).toBeDefined()
    }
  })

  it.each([...structureIds])('%s: tiap tipe punya fitur paket yang menggerbanginya', id => {
    for (const type of structures[id].sectionTypes) expect(sectionFeature[type], `${id}.${type}`).toBeTruthy()
  })

  it.each([...structureIds])('%s: headless dibaca dari kontrak, bukan diketik ulang', id => {
    expect(structures[id].headless).toBe(headlessSectionTypes)
  })
})

describe('documentStructureId', () => {
  it('membaca structureId kalau ada', () => {
    expect(documentStructureId({ schemaVersion: 2, structureId: 'warisan' })).toBe('warisan')
  })

  it('dokumen lama tanpa structureId diturunkan dari schemaVersion — perilaku sebelum fase 74', () => {
    expect(documentStructureId({ schemaVersion: 2 })).toBe('elegance')
    expect(documentStructureId({ schemaVersion: 1 })).toBe('warisan')
    expect(documentStructureId({})).toBe('warisan')
  })

  it('structureId asing diabaikan, bukan dipercaya', () => {
    expect(documentStructureId({ schemaVersion: 2, structureId: 'palsu' })).toBe('elegance')
  })
})

describe('ayat dan bismillah tetap di tempatnya', () => {
  /*
   * Bukan tes gaya. Keduanya isi bawaan yang diminta pemilik secara eksplisit, hidup di dalam
   * `createEleganceSections` yang kini ditunjuk `elegance.build` — dan justru karena ia ditunjuk
   * (bukan disalin), siapa pun yang "merapikan" pembangunnya nanti akan lewat sini.
   */
  it('quote membawa QS. Ar-Rum: 21 dan couple membawa bismillah', () => {
    const doc = createDefaultDocument('Dea', 'Haryo')
    const quote = doc.sections.find(s => s.type === 'quote')!
    expect(String(quote.data.subtitle)).toContain('Ar-Rum')
    expect(String(quote.data.title)).toContain('tanda-tanda kekuasaan-Nya')
    const couple = doc.sections.find(s => s.type === 'couple')!
    expect(String(couple.data.bismillah)).toContain('بِسْمِ')
    expect(invitationDocumentSchema.safeParse(doc).success).toBe(true)
  })
})

/*
 * Fase 74.9: dokumen akhirnya bisa MENGATAKAN tema dan strukturnya.
 *
 * Keduanya opsional, dan itu keputusan yang menahan seluruh irisan ini: tidak satu pun dokumen
 * lama ditulis ulang (revisi terbit dibaca, tidak pernah disimpan ulang), jadi absennya harus
 * berarti persis perilaku sebelum fase 74 — bukan galat, dan bukan nilai lain.
 */
describe('dua sumbu di dalam dokumen', () => {
  it('dokumen baru menulis templateId dan themeId dengan nilai yang SAMA', () => {
    const doc = createDefaultDocument('Dea', 'Haryo', 'aruna-sekar')
    expect(doc.templateId).toBe('aruna-sekar')
    expect(doc.themeId).toBe('aruna-sekar')
    expect(doc.structureId).toBe('elegance')
  })

  it('dokumen v1 lahir dengan struktur warisan', () => {
    const doc = createLegacyDocument('Dea', 'Haryo', 'aruna-pelita')
    expect(doc.structureId).toBe('warisan')
    expect(doc.themeId).toBe('aruna-pelita')
    expect(documentStructureId(doc)).toBe('warisan')
  })

  it('dokumen lama tanpa kedua kunci tetap lolos skema — tidak ada yang ditulis ulang', () => {
    const doc = createDefaultDocument('Dea', 'Haryo') as Record<string, unknown>
    delete doc.themeId
    delete doc.structureId
    const hasil = invitationDocumentSchema.safeParse(doc)
    expect(hasil.success).toBe(true)
    expect(documentStructureId(doc as { schemaVersion?: number })).toBe('elegance')
    expect(documentThemeId(doc as { templateId?: string })).toBe('aruna-bloom')
  })

  it('structureId asing DITOLAK skema — beda dari documentStructureId yang memaafkan', () => {
    // Skema menjaga apa yang boleh MASUK; `documentStructureId` menjaga apa yang sudah terlanjur
    // ada di basis data tetap bisa dibuka. Keduanya sengaja tidak sama ketatnya.
    const doc = { ...createDefaultDocument('Dea', 'Haryo'), structureId: 'palsu' }
    expect(invitationDocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('schemaVersion 3 tetap ditolak — fase 74 sengaja TIDAK menaikkannya', () => {
    const doc = { ...createDefaultDocument('Dea', 'Haryo'), schemaVersion: 3 }
    expect(invitationDocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('documentThemeId mengutamakan themeId, dan menerjemahkan id pensiun', () => {
    expect(documentThemeId({ templateId: 'aruna-bloom', themeId: 'aruna-pelita' })).toBe('aruna-pelita')
    expect(documentThemeId({ templateId: 'aruna-pelita' })).toBe('aruna-pelita')
    // `aruna-lumine` pensiun; ia harus keluar sebagai penggantinya, bukan apa adanya.
    expect(templateIds).toContain('aruna-lumine')
    expect(liveTemplateIds as readonly string[]).not.toContain('aruna-lumine')
    expect(liveTemplateIds as readonly string[]).toContain(documentThemeId({ themeId: 'aruna-lumine' }))
  })

  it('createDefaultDocument memakai struktur yang diminta untuk membangun bagiannya', () => {
    const doc = createDefaultDocument('Dea', 'Haryo', 'aruna-bloom', {}, 'warisan')
    expect(doc.structureId).toBe('warisan')
    expect(doc.sections.map(s => s.type)).toEqual([...structures.warisan.sectionTypes])
  })
})
