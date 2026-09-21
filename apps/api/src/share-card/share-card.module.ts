import { Module } from '@nestjs/common';
import { ShareCardController } from './share-card.controller.js';
import { ShareCardService } from './share-card.service.js';

@Module({ controllers: [ShareCardController], providers: [ShareCardService] })
export class ShareCardModule {}
