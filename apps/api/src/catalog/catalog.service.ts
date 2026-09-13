import { Injectable } from '@nestjs/common';
import { catalog } from '@aruna/contracts';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
  async getCatalog() {
    const [packages, addons] = await Promise.all([
      this.prisma.package.findMany({ where: { active: true }, include: { features: { include: { feature: true } } }, orderBy: { price: 'asc' } }),
      this.prisma.addon.findMany({ where: { active: true, feature: { active: true } }, orderBy: { price: 'asc' } }),
    ]);
    return { packages: packages.map((item) => ({ id: item.id, name: item.name, price: item.price, features: item.features.filter(({ feature }) => feature.active).map(({ feature }) => feature.id) })), addons: addons.map((item) => ({ id: item.id, name: item.name, price: item.price })), templates: catalog.templates, sandbox: true };
  }
}
