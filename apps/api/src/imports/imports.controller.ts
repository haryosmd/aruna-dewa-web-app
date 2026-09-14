import { Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { googleSheetsPreviewBodySchema, type GoogleSheetsPreviewBody } from '@aruna/contracts/api';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { zodBody } from '../common/zod-validation.pipe.js';
import { MAX_IMPORT_BYTES } from './import-parser.js';
import { ImportsService } from './imports.service.js';

@Controller('v1/invitations/:invitationId/imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post('file-preview')
  @UseGuards(OriginGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1 } }))
  filePreview(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @UploadedFile() file: Express.Multer.File) {
    return this.imports.previewFile(user, invitationId, file);
  }

  @Post('google-sheets-preview')
  @UseGuards(OriginGuard)
  googleSheetsPreview(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Body(zodBody(googleSheetsPreviewBodySchema)) body: GoogleSheetsPreviewBody) {
    return this.imports.previewGoogleSheet(user, invitationId, body);
  }
}
