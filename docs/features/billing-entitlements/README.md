# Billing and entitlements

Status: implemented locally; database-backed catalog seed, order snapshot, sandbox checkout and signed Midtrans webhook are ready. A real Midtrans sandbox server key is required to produce a Snap URL.

The API computes totals from active database catalog rows. It never accepts a browser-provided total. Webhooks verify signature and gross amount, record provider event IDs once, activate entitlements atomically, reject capture unless fraud status is `accept`, and revoke the order entitlement on refund. Operator activation requires the server-side operator role and writes an audit event.
