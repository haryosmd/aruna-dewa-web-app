import { PrismaClient } from '@prisma/client';
import { catalog } from '@aruna/contracts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const featureId of new Set([...catalog.packages.flatMap((item) => item.features), ...catalog.addons.map((item) => item.id)])) {
    await prisma.feature.upsert({ where: { id: featureId }, update: { active: true, name: featureId }, create: { id: featureId, name: featureId } });
  }
  for (const item of catalog.packages) {
    await prisma.package.upsert({ where: { id: item.id }, update: { name: item.name, price: item.price, active: true }, create: { id: item.id, name: item.name, price: item.price } });
    for (const featureId of item.features) await prisma.packageFeature.upsert({ where: { packageId_featureId: { packageId: item.id, featureId } }, update: {}, create: { packageId: item.id, featureId } });
    // Upsert saja tidak cukup saat sebuah fitur naik ke paket yang lebih tinggi: barisnya
    // akan tertinggal dan paket lama tetap membuka fitur yang seharusnya sudah pindah.
    await prisma.packageFeature.deleteMany({ where: { packageId: item.id, featureId: { notIn: item.features } } });
  }
  for (const item of catalog.addons) await prisma.addon.upsert({ where: { id: item.id }, update: { featureId: item.id, name: item.name, price: item.price, active: true }, create: { id: item.id, featureId: item.id, name: item.name, price: item.price } });
}

main().finally(() => prisma.$disconnect());
