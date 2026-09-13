import { describe, expect, it } from 'vitest';
import { s3ConfigFromEnvironment } from '../../src/media/storage.js';

describe('S3 media configuration', () => {
  it('requires a complete S3 configuration instead of silently falling back to local disk', () => {
    expect(() => s3ConfigFromEnvironment({ S3_BUCKET: 'aruna-media' })).toThrow('S3_ENDPOINT');
  });

  it('accepts an S3-compatible endpoint and credentials', () => {
    expect(s3ConfigFromEnvironment({ S3_ENDPOINT: 'http://127.0.0.1:9000', S3_REGION: 'us-east-1', S3_BUCKET: 'aruna-media', S3_ACCESS_KEY_ID: 'access', S3_SECRET_ACCESS_KEY: 'secret' })).toMatchObject({ bucket: 'aruna-media', forcePathStyle: true });
  });
});
