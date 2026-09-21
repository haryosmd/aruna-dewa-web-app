import { BadRequestException, Controller, Get, Header, Param, Query, StreamableFile } from '@nestjs/common';
import { ShareCardService } from './share-card.service.js';

/**
 * `GET /v1/public/share-card/:slug.png?to=<nama>` — gambar pratinjau tautan WhatsApp/Open Graph.
 * Modul terpisah dari `public/` supaya `satori`/`resvg` dan cache PNG-nya tidak menumpang
 * service undangan publik yang dipakai setiap pembukaan halaman.
 */
@Controller('v1/public/share-card')
export class ShareCardController {
  constructor(private readonly shareCard: ShareCardService) {}

  // Parameternya `:file` lalu `.png` dilucuti sendiri: titik di dalam pola rute Express 5 tidak
  // aman dijadikan pemisah param, dan permintaan tanpa `.png` memang bukan gambar.
  @Get(':file')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=3600')
  async png(@Param('file') file: string, @Query('to') to?: string): Promise<StreamableFile> {
    if (!file.endsWith('.png')) throw new BadRequestException('Kartu bagikan hanya tersedia sebagai PNG');
    const buffer = await this.shareCard.render(file.slice(0, -'.png'.length), to);
    return new StreamableFile(buffer, { type: 'image/png', length: buffer.byteLength });
  }
}
