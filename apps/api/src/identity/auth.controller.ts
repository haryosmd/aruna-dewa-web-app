import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  type ForgotPasswordBody,
  type LoginBody,
  type RegisterBody,
  type ResetPasswordBody,
  type VerifyEmailBody,
} from '@aruna/contracts/api';
import { AuthService } from './auth.service.js';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { IdentityRateLimit, identityRateLimits } from '../common/rate-limit.js';
import { zodBody } from '../common/zod-validation.pipe.js';
import { sessionContext } from './session-context.js';
import { PrismaService } from '../database/prisma.service.js';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly prisma: PrismaService) {}

  @Post('register') @UseGuards(OriginGuard) @IdentityRateLimit(identityRateLimits.register)
  async register(@Body(zodBody(registerBodySchema)) body: RegisterBody) { return this.auth.register(body); }

  @Post('login')
  @UseGuards(OriginGuard)
  @IdentityRateLimit(identityRateLimits.login)
  async login(@Body(zodBody(loginBodySchema)) body: LoginBody, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return { user: await this.auth.login(body.email, body.password, response, sessionContext(request)) };
  }

  @Post('refresh')
  @UseGuards(OriginGuard)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return { user: await this.auth.refresh(request.cookies?.aruna_refresh as string | undefined, response) };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(OriginGuard)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(request.cookies?.aruna_refresh as string | undefined, response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.sub }, include: { memberships: { include: { invitation: true } } } });
    return { user: { id: account.id, email: account.email, name: account.name, role: account.role === 'OPERATOR' ? 'r_7c91' : 'user' }, invitations: account.memberships.map(({ invitation }) => ({ id: invitation.id, slug: invitation.slug, title: invitation.title, status: invitation.status })) };
  }

  @Post('verify-email')
  @UseGuards(OriginGuard)
  async verifyEmail(@Body(zodBody(verifyEmailBodySchema)) body: VerifyEmailBody) { await this.auth.verifyEmail(body.token); return { verified: true }; }

  @Post('forgot-password')
  @UseGuards(OriginGuard)
  @IdentityRateLimit(identityRateLimits.forgotPassword)
  async forgotPassword(@Body(zodBody(forgotPasswordBodySchema)) body: ForgotPasswordBody) { await this.auth.issuePasswordReset(body.email); return { accepted: true }; }

  @Post('reset-password')
  @UseGuards(OriginGuard)
  async resetPassword(@Body(zodBody(resetPasswordBodySchema)) body: ResetPasswordBody) { await this.auth.resetPassword(body.token, body.password); return { reset: true }; }
}
