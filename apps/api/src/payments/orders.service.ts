import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOrderBody, MidtransWebhookBody } from '@aruna/contracts/api';
import { Prisma } from '@aruna/database';
import { PrismaService } from '../database/prisma.service.js';
import { MembershipService } from '../common/membership.service.js';
import { assertOperator, isOperator, type AuthenticatedUser } from '../common/auth.js';
import { MidtransService } from './midtrans.service.js';
import { decideCheckoutRecovery } from './checkout-recovery.js';
import { entitlementGrants, featuresFromSnapshot, paymentStatusFor, shouldActivate } from './payment-activation.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService, private readonly midtrans: MidtransService) {}

  async create(user: AuthenticatedUser, invitationId: string, input: CreateOrderBody) {
    await this.memberships.requireInvitationRole(user, invitationId, 'OWNER');
    if (new Set(input.addonIds).size !== input.addonIds.length) throw new BadRequestException('Add-on duplikat tidak diizinkan');
    const packagePlan = await this.prisma.package.findFirst({ where: { id: input.packageId, active: true }, include: { features: { include: { feature: true } } } });
    if (!packagePlan) throw new BadRequestException('Paket tidak tersedia');
    if (packagePlan.features.some(({ feature }) => !feature.active)) throw new BadRequestException('Paket memiliki fitur yang belum tersedia; minta operator memperbarui katalog');
    const addons = await this.prisma.addon.findMany({ where: { id: { in: input.addonIds }, active: true, feature: { active: true } } });
    if (addons.length !== input.addonIds.length) throw new BadRequestException('Satu atau lebih add-on tidak tersedia');
    const included = new Set(packagePlan.features.map((feature) => feature.featureId));
    if (addons.some((addon) => included.has(addon.featureId))) throw new BadRequestException('Add-on sudah termasuk di paket');
    const total = packagePlan.price + addons.reduce((sum, addon) => sum + addon.price, 0);
    const order = await this.prisma.order.create({ data: { invitationId, userId: user.sub, total, status: 'PENDING', priceSnapshot: { package: { id: packagePlan.id, name: packagePlan.name, price: packagePlan.price }, addons: addons.map((addon) => ({ id: addon.id, featureId: addon.featureId, name: addon.name, price: addon.price })), features: [...included, ...addons.map((addon) => addon.featureId)] }, items: { create: [{ packageId: packagePlan.id, name: packagePlan.name, price: packagePlan.price }, ...addons.map((addon) => ({ addonId: addon.id, name: addon.name, price: addon.price }))] } } });
    return { id: order.id, total: order.total, status: order.status, snapUrl: order.snapUrl };
  }

  async checkout(user: AuthenticatedUser, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { invitation: true } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    await this.memberships.requireInvitationRole(user, order.invitationId, 'OWNER');
    if (order.status !== 'PENDING') throw new BadRequestException('Pesanan tidak dapat dibayar pada status saat ini');
    // Operator menembus gerbang pembayaran: pesanan langsung lunas tanpa Midtrans, dan setiap
    // pemakaiannya tercatat di audit log.
    if (isOperator(user)) return this.activateWithoutPayment(user, order);
    if (order.snapUrl) return { snapUrl: order.snapUrl };
    const customer = await this.prisma.user.findUniqueOrThrow({ where: { id: user.sub } });
    const midtransOrderId = `aruna-${order.id}`;
    const claimed = await this.prisma.order.updateMany({ where: { id: order.id, status: 'PENDING', snapUrl: null, midtransOrderId: null }, data: { midtransOrderId } });
    if (!claimed.count) {
      const current = await this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { snapUrl: true } });
      const decision = decideCheckoutRecovery({ providerOrderId: midtransOrderId, snapUrl: current.snapUrl, providerStatus: await this.midtrans.transactionStatus(midtransOrderId) });
      if (decision.kind === 'reuse') return { snapUrl: decision.snapUrl };
      if (decision.kind === 'await-status') throw new BadRequestException('Checkout sedang diproses. Coba lagi dalam beberapa saat.');
    }
    const snapUrl = await this.midtrans.createSnapTransaction({ orderId: midtransOrderId, grossAmount: order.total, customer: { email: customer.email, name: customer.name } });
    await this.prisma.order.update({ where: { id: order.id }, data: { midtransOrderId, snapUrl } });
    return { snapUrl };
  }

  /**
   * Menandai pesanan lunas tanpa melewati gerbang pembayaran. Hanya dipakai operator,
   * dan memberi entitlement yang sama persis dengan pesanan berbayar biasa.
   */
  private async activateWithoutPayment(operator: AuthenticatedUser, order: { id: string; invitationId: string; priceSnapshot: unknown; activatedAt: Date | null }) {
    if (order.activatedAt) return { paid: true as const, alreadyActive: true };
    const grants = entitlementGrants({ invitationId: order.invitationId, orderId: order.id, features: featuresFromSnapshot(order.priceSnapshot) });
    await this.prisma.$transaction(async (tx) => {
      await tx.entitlement.createMany({ data: grants, skipDuplicates: true });
      await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', activatedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: operator.sub, invitationId: order.invitationId, action: 'OPERATOR_CHECKOUT_BYPASS', targetType: 'Order', targetId: order.id, metadata: { features: grants.map((grant) => grant.featureId) } } });
    });
    return { paid: true as const, alreadyActive: false };
  }

  async list(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId);
    return this.prisma.order.findMany({ where: { invitationId }, orderBy: { createdAt: 'desc' }, select: { id: true, total: true, status: true, snapUrl: true, createdAt: true, activatedAt: true } });
  }

  async applyWebhook(notification: MidtransWebhookBody) {
    if (!this.midtrans.verifySignature(notification)) throw new BadRequestException('Signature Midtrans tidak valid');
    const order = await this.prisma.order.findUnique({ where: { midtransOrderId: notification.order_id } });
    if (!order) throw new NotFoundException('Order Midtrans tidak ditemukan');
    const grossAmount = parseRupiah(notification.gross_amount);
    if (grossAmount !== order.total) throw new BadRequestException('Nominal Midtrans tidak cocok dengan snapshot pesanan');
    const providerEventId = notification.transaction_id ?? `${notification.order_id}:${notification.transaction_status}:${notification.status_code}`;
    return this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.paymentEvent.findUnique({ where: { providerEventId } });
      if (duplicate) return { accepted: true, duplicate: true };
      const status = paymentStatusFor(notification.transaction_status, notification.fraud_status);
      await tx.paymentEvent.create({ data: { providerEventId, orderId: order.id, status, grossAmount, payload: notification as unknown as Prisma.InputJsonValue, verifiedAt: new Date() } });
      if (status === 'REFUNDED') {
        // Mencabut akses adalah peristiwa yang sama pentingnya dengan memberikannya; aktivasi
        // tepat di bawah sini menulis audit sejak dulu, pencabutan tidak pernah.
        const revoked = await tx.entitlement.updateMany({ where: { orderId: order.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
        await tx.auditEvent.create({ data: { invitationId: order.invitationId, action: 'PAYMENT_REFUNDED', targetType: 'Order', targetId: order.id, metadata: { providerEventId, revoked: revoked.count } } });
        return { accepted: true, duplicate: false };
      }
      if (!shouldActivate(status, order.activatedAt)) return { accepted: true, duplicate: false };
      const grants = entitlementGrants({ invitationId: order.invitationId, orderId: order.id, features: featuresFromSnapshot(order.priceSnapshot) });
      await tx.entitlement.createMany({ data: grants, skipDuplicates: true });
      await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', activatedAt: new Date() } });
      await tx.auditEvent.create({ data: { invitationId: order.invitationId, action: 'PAYMENT_ACTIVATED', targetType: 'Order', targetId: order.id, metadata: { providerEventId } } });
      return { accepted: true, duplicate: false };
    });
  }

  async operatorActivate(operator: AuthenticatedUser, invitationId: string) {
    // Cek role dulu: requireInvitationRole meloloskan operator lebih awal, jadi kalau urutannya
    // terbalik pemanggil non-operator menerima pesan "bukan anggota" alih-alih "butuh operator".
    assertOperator(operator);
    await this.memberships.requireInvitationRole(operator, invitationId);
    const features = await this.prisma.feature.findMany({ where: { active: true }, select: { id: true } });
    await this.prisma.$transaction(async (tx) => {
      await tx.entitlement.createMany({ data: features.map((feature) => ({ invitationId, featureId: feature.id })), skipDuplicates: true });
      await tx.auditEvent.create({ data: { actorId: operator.sub, invitationId, action: 'OPERATOR_ACTIVATION', targetType: 'Invitation', targetId: invitationId } });
    });
    return { activated: true };
  }
}

function parseRupiah(value: string): number { const amount = Number(value); if (!Number.isInteger(amount) || amount < 0) throw new BadRequestException('Nominal Midtrans tidak valid'); return amount; }
