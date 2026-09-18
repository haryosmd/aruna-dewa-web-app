# Operations

Status: local API and pg-boss worker are implemented. PostgreSQL and Mailpit are local runtime dependencies from Compose; no external provider success is claimed.

`pnpm --filter @aruna/api operator <user-id>` grants the audited internal operator role. The worker consumes `guest-import-report` and `payment-reconcile` queues. Payment reconciliation deliberately fails with an actionable message until a verified Midtrans status adapter is configured; it does not claim an unverified payment succeeded.

Media uploads validate MIME magic bytes, type, size, and generated storage keys. `MEDIA_PROVIDER=local` persists to the local adapter; `MEDIA_PROVIDER=s3` uses the AWS S3-compatible client and requires endpoint, region, bucket, access key, and secret. Buckets remain private: the API serves draft media only to members and serves public media only after its URL is referenced by the active published snapshot.
