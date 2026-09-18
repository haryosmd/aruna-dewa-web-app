import { PrismaClient, type Prisma } from '@prisma/client';
import { isLiveTemplateId, resolveTemplateId, templateById, templateAliases } from '@aruna/contracts';

/**
 * Migrasi draft yang masih memakai id tema pensiun.
 *
 * **Kenapa ini perlu padahal alias sudah ada.** `resolveTemplateId()` membuat undangan ber-id
 * pensiun tetap MERENDER — itu jaring pengamannya, dan ia bekerja tanpa skrip ini. Yang tidak
 * bisa dilakukan alias: membuat draftnya koheren. Draft ber-id pensiun membawa `tokens` milik
 * tema yang sudah tidak ada, jadi pasangan melihat palet lama di bawah wajah tema baru, dan
 * editor menandai temanya "tidak tersedia" selamanya.
 *
 * **`PublishedRevision.document` sengaja TIDAK disentuh.** Itu yang sedang dibaca tamu detik
 * ini; menulisinya mengubah wajah undangan hidup tanpa persetujuan pasangan. Alias membuatnya
 * tetap merender apa adanya, dan ia berpindah sendiri saat pasangan menerbitkan ulang — pada
 * saat yang ia pilih sendiri, bukan pada saat kami menjalankan skrip.
 *
 * **Idempoten.** Hanya menyentuh baris yang `templateId`-nya ada di `templateAliases`; jalan
 * kedua kalinya tidak menemukan apa pun.
 *
 *   pnpm --filter @aruna/database migrate:templates            # uji kering, bawaan
 *   pnpm --filter @aruna/database migrate:templates -- --apply # menulis
 */

const prisma = new PrismaClient();

interface Dokumen {
  templateId?: unknown;
  tokens?: Record<string, unknown>;
  [key: string]: unknown;
}

function bacaDokumen(nilai: Prisma.JsonValue | null): Dokumen | null {
  if (!nilai || typeof nilai !== 'object' || Array.isArray(nilai)) return null;
  return nilai as Dokumen;
}

async function main(): Promise<void> {
  const tulis = process.argv.includes('--apply');
  const pensiun = Object.keys(templateAliases);
  if (!pensiun.length) {
    console.log('Tidak ada id tema pensiun. Tidak ada yang perlu dimigrasi.');
    return;
  }

  const rows = await prisma.invitation.findMany({ select: { id: true, slug: true, draftDocument: true, draftRevision: true } });
  const terdampak: { id: string; slug: string; dari: string; ke: string; revision: number }[] = [];

  for (const row of rows) {
    const doc = bacaDokumen(row.draftDocument);
    const dari = typeof doc?.templateId === 'string' ? doc.templateId : '';
    // Diukur terhadap `isLiveTemplateId`, bukan terhadap daftar alias: id yang tidak dikenal
    // sama sekali juga harus ikut dibetulkan, dan `resolveTemplateId` sudah tahu tujuannya.
    if (!dari || isLiveTemplateId(dari)) continue;
    terdampak.push({ id: row.id, slug: row.slug, dari, ke: resolveTemplateId(dari), revision: row.draftRevision });
  }

  console.log(`${rows.length} undangan diperiksa · ${terdampak.length} draft memakai id pensiun`);
  for (const item of terdampak) console.log(`  ${item.slug.padEnd(28)} ${item.dari} → ${item.ke}`);

  if (!terdampak.length) return;
  if (!tulis) {
    console.log('\nUji kering. Jalankan ulang dengan --apply untuk menulis.');
    return;
  }

  let ditulis = 0;
  for (const item of terdampak) {
    const preset = templateById(item.ke);
    if (!preset) continue;
    const row = await prisma.invitation.findUnique({ where: { id: item.id }, select: { draftDocument: true } });
    const doc = bacaDokumen(row?.draftDocument ?? null);
    if (!doc) continue;
    const berikut = { ...doc, templateId: preset.id, tokens: { ...preset.tokens } };
    /*
     * Difilter `draftRevision` yang dibaca di atas: kalau pasangan menyimpan draft di antara
     * pembacaan dan penulisan, baris ini dilewati alih-alih menimpa pekerjaannya. Bentuk
     * kegagalan yang sama pernah tayang di fase 13 — `updateMany` tanpa filter revisi.
     */
    const hasil = await prisma.invitation.updateMany({
      where: { id: item.id, draftRevision: item.revision },
      data: { draftDocument: berikut as Prisma.InputJsonValue, draftRevision: { increment: 1 } },
    });
    if (hasil.count) ditulis += 1;
    else console.warn(`  dilewati (draft berubah saat migrasi berjalan): ${item.slug}`);
  }
  console.log(`\n${ditulis} draft ditulis ulang. Revisi terbit tidak disentuh.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
