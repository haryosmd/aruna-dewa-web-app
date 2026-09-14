import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createOrderBodySchema, midtransWebhookBodySchema, type CreateOrderBody, type MidtransWebhookBody } from '@aruna/contracts/api';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { throttleLimits } from '../common/throttling.js';
import { zodBody } from '../common/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';

@Controller('v1')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get('invitations/:id/orders') @UseGuards(JwtAuthGuard) list(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.orders.list(user, id); }
  @Post('invitations/:id/orders') @UseGuards(JwtAuthGuard, OriginGuard) create(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body(zodBody(createOrderBodySchema)) body: CreateOrderBody) { return this.orders.create(user, id, body); }
  @Post('orders/:id/checkout') @UseGuards(JwtAuthGuard, OriginGuard) checkout(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.orders.checkout(user, id); }
  @Post('invitations/:id/activate') @UseGuards(JwtAuthGuard, OriginGuard) activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.orders.operatorActivate(user, id); }
  @Post('payments/midtrans/webhook') @HttpCode(200) @Throttle({ default: throttleLimits.webhook }) webhook(@Body(zodBody(midtransWebhookBodySchema)) body: MidtransWebhookBody) { return this.orders.applyWebhook(body); }
}
