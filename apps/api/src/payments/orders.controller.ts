import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { OrdersService } from './orders.service.js';

@Controller('v1')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get('invitations/:id/orders') @UseGuards(JwtAuthGuard) list(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.orders.list(user, id); }
  @Post('invitations/:id/orders') @UseGuards(JwtAuthGuard, OriginGuard) create(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { packageId: string; addonIds: string[] }) { return this.orders.create(user, id, body); }
  @Post('orders/:id/checkout') @UseGuards(JwtAuthGuard, OriginGuard) checkout(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.orders.checkout(user, id); }
  @Post('invitations/:id/activate') @UseGuards(JwtAuthGuard, OriginGuard) activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.orders.operatorActivate(user, id); }
  @Post('payments/midtrans/webhook') @HttpCode(200) webhook(@Body() body: { order_id: string; status_code: string; gross_amount: string; signature_key: string; transaction_status: string; transaction_id?: string; fraud_status?: string }) { return this.orders.applyWebhook(body); }
}
