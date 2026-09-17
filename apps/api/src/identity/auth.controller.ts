import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  updateProfileBodySchema,
  verifyEmailBodySchema,
  type ChangePasswordBody,
  type ForgotPasswordBody,
  type LoginBody,
  type RegisterBody,
  type ResetPasswordBody,
  type UpdateProfileBody,
  type VerifyEmailBody,
} from '@aruna/contracts/api';
import { AuthService } from './auth.service.js';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { IdentityRateLimit, forgiveIdentityAttempt, identityRateLimits } from '../common/rate-limit.js';
import { readSessionCookie } from '../common/session-cookie.js';
import { zodBody } from '../common/zod-validation.pipe.js';
import { sessionContext } from './session-context.js';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') @UseGuards(OriginGuard) @IdentityRateLimit(identityRateLimits.register)
  async register(@Body(zodBody(registerBodySchema)) body: RegisterBody) { return this.auth.register(body); }

  @Post('login')
  @UseGuards(OriginGuard)
  @IdentityRateLimit(identityRateLimits.login)
  async login(@Body(zodBody(loginBodySchema)) body: LoginBody, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = await this.auth.login(body.email, body.password, response, sessionContext(request));
    // Hanya percobaan yang gagal yang membebani ember; `login` yang lolos mengembalikan jatahnya.
    forgiveIdentityAttempt(request);
    return { user };
  }

  @Post('refresh')
  @UseGuards(OriginGuard)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return { user: await this.auth.refresh(readSessionCookie(request, 'aruna_refresh'), response) };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(OriginGuard)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(readSessionCookie(request, 'aruna_refresh'), response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) { return this.auth.currentAccount(user.sub); }

  @Patch('me')
  @UseGuards(JwtAuthGuard, OriginGuard)
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body(zodBody(updateProfileBodySchema)) body: UpdateProfileBody) {
    return this.auth.updateProfile(user.sub, body.name);
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, OriginGuard)
  @IdentityRateLimit(identityRateLimits.changePassword)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body(zodBody(changePasswordBodySchema)) body: ChangePasswordBody): Promise<void> {
    await this.auth.changePassword(user.sub, user.sid, body.currentPassword, body.newPassword);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async sessions(@CurrentUser() user: AuthenticatedUser) { return this.auth.sessionHistory(user.sub, user.sid); }

  @Post('resend-verification')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, OriginGuard)
  @IdentityRateLimit(identityRateLimits.forgotPassword)
  async resendVerification(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auth.resendVerification(user.sub);
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
