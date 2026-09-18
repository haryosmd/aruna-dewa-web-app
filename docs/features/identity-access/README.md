# Identity and access

Status: implemented locally; API build and domain tests pass. Google OAuth requires configured credentials and Mailpit/SMTP remains an environment dependency.

Email/password authentication uses Argon2id. Access JWTs last 15 minutes and are tied to a database session. Refresh tokens are random, Argon2id-hashed, rotate on use, and a replay revokes every active session for that user. Mutations reject a mismatched Origin. The operator code exposed to clients is `r_7c91`; assignment is CLI-only and audited.

Routes: `/v1/auth/*`, `/auth/google/start`, and `/auth/google`.
