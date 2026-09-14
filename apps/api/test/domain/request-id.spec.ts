import { describe, expect, it } from 'vitest';
import { safeRequestId } from '../../src/common/http-exception.filter.js';

describe('x-request-id dari luar', () => {
  it('memakai nilai kiriman kalau bentuknya masuk akal', () => {
    expect(safeRequestId('req-42_ab.9')).toBe('req-42_ab.9');
  });

  it('menolak muatan CRLF yang dulu membuat setHeader melempar di dalam filter', () => {
    const forged = safeRequestId('a\r\nx-admin: 1');
    expect(forged).not.toContain('\r');
    expect(forged).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it('menolak nilai kosong, kepanjangan, dan berkarakter aneh', () => {
    for (const hostile of ['', 'x'.repeat(65), 'req 42', 'req/42', '<script>']) {
      expect(safeRequestId(hostile)).toMatch(/^[0-9a-f-]{36}$/u);
    }
    expect(safeRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/u);
  });
});
