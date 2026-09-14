import { BadRequestException, type PipeTransform } from '@nestjs/common';

/**
 * Validasi di batas controller, satu pipe untuk semua body.
 *
 * `fieldErrors` sudah lama ada di tipe `ApiError` milik web tapi tak pernah ada yang
 * mengisinya, jadi tak pernah ada yang membacanya. Di sinilah ia akhirnya berisi sesuatu:
 * nama field → daftar pesan, bentuk yang sama dengan yang dipakai form di web.
 */

/** Cukup `safeParse`; sengaja tidak terikat ke satu versi zod tertentu. */
export interface ParsableSchema<Output> {
  safeParse(value: unknown): { success: true; data: Output } | { success: false; error: { flatten(): { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> } } };
}

export class ZodValidationPipe<Output> implements PipeTransform<unknown, Output> {
  constructor(private readonly schema: ParsableSchema<Output>) {}

  transform(value: unknown): Output {
    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;
    const { formErrors, fieldErrors } = parsed.error.flatten();
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: formErrors[0] ?? firstFieldMessage(fieldErrors) ?? 'Data yang dikirim tidak valid',
      fieldErrors,
    });
  }
}

function firstFieldMessage(fieldErrors: Record<string, string[] | undefined>): string | undefined {
  for (const messages of Object.values(fieldErrors)) {
    if (messages?.length) return messages[0];
  }
  return undefined;
}

/** Gula pemakaian: `@Body(zodBody(loginBodySchema)) body: LoginBody`. */
export function zodBody<Output>(schema: ParsableSchema<Output>): ZodValidationPipe<Output> {
  return new ZodValidationPipe(schema);
}
