import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { markOpenedBodySchema, publicRsvpBodySchema, publicWishBodySchema, type MarkOpenedBody, type PublicRsvpBody, type PublicWishBody } from '@aruna/contracts/api';
import { throttleLimits } from '../common/throttling.js';
import { zodBody } from '../common/zod-validation.pipe.js';
import { PublicService } from './public.service.js';

@Controller('v1/public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}
  @Get(':slug') invitation(@Param('slug') slug: string) { return this.publicService.invitation(slug); }
  @Get(':slug/guest') @Header('Cache-Control', 'no-store') guest(@Param('slug') slug: string, @Query('g') token: string | undefined) { return this.publicService.guest(slug, token); }
  @Post(':slug/opened') @Header('Cache-Control', 'no-store') @Throttle({ default: throttleLimits.publicWrite }) opened(@Param('slug') slug: string, @Body(zodBody(markOpenedBodySchema)) body: MarkOpenedBody) { return this.publicService.markOpened(slug, body.token); }
  @Post(':slug/rsvp') @Header('Cache-Control', 'no-store') @Throttle({ default: throttleLimits.publicWrite }) rsvp(@Param('slug') slug: string, @Body(zodBody(publicRsvpBodySchema)) body: PublicRsvpBody) { return this.publicService.rsvp(slug, body); }
  @Get(':slug/wishes') wishes(@Param('slug') slug: string) { return this.publicService.wishes(slug); }
  @Post(':slug/wishes') @Header('Cache-Control', 'no-store') @Throttle({ default: throttleLimits.publicWrite }) createWish(@Param('slug') slug: string, @Body(zodBody(publicWishBodySchema)) body: PublicWishBody) { return this.publicService.createWish(slug, body); }
}
