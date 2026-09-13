import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { PublicService } from './public.service.js';

@Controller('v1/public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}
  @Get(':slug') invitation(@Param('slug') slug: string) { return this.publicService.invitation(slug); }
  @Get(':slug/guest') @Header('Cache-Control', 'no-store') guest(@Param('slug') slug: string, @Query('g') token: string | undefined) { return this.publicService.guest(slug, token); }
  @Post(':slug/opened') @Header('Cache-Control', 'no-store') opened(@Param('slug') slug: string, @Body() body: { token: string }) { return this.publicService.markOpened(slug, body?.token); }
  @Post(':slug/rsvp') @Header('Cache-Control', 'no-store') rsvp(@Param('slug') slug: string, @Body() body: { token: string; attendance: 'yes' | 'no'; count?: number; message?: string; eventId?: string }) { return this.publicService.rsvp(slug, body); }
  @Get(':slug/wishes') wishes(@Param('slug') slug: string) { return this.publicService.wishes(slug); }
  @Post(':slug/wishes') @Header('Cache-Control', 'no-store') createWish(@Param('slug') slug: string, @Body() body: { token: string; message: string }) { return this.publicService.createWish(slug, body); }
}
