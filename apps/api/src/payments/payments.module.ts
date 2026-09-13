import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { MidtransService } from './midtrans.service.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
@Module({ imports: [CommonModule], providers: [MidtransService, OrdersService], controllers: [OrdersController], exports: [OrdersService] }) export class PaymentsModule {}
