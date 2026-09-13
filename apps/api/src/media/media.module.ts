import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { MediaController, PrivateMediaController, PublicMediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
@Module({ imports: [CommonModule], controllers: [MediaController, PrivateMediaController, PublicMediaController], providers: [MediaService] }) export class MediaModule {}
