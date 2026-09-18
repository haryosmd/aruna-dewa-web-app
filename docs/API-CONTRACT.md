# Shared API contract

Base http://127.0.0.1:3001/v1, credentials include; access/refresh cookies HttpOnly. Mutations require Origin matching web origin. Errors {code,message,fieldErrors?,requestId}. API dates ISO strings.

GET /catalog -> {packages:[{id,name,price,features:string[]}],addons:[{id,name,price}],templates:[{id,name,version}],sandbox:true}
POST /auth/register {email,password,name}; POST /auth/login {email,password}; GET /auth/me -> {user:{id,email,name,role},invitations:[{id,slug,title,status}]}; POST /auth/logout; POST /auth/refresh. Satu sesi per akun: login baru mencabut sesi lama. `refresh` 401 membawa `code` — SESSION_REPLACED (masuk di perangkat lain), SESSION_REUSE (token dipakai ulang di luar tenggang; seluruh sesi dicabut), SESSION_EXPIRED, SESSION_INVALID — dan 503 SESSION_BUSY untuk rebutan sesaat, yang bukan alasan mengeluarkan orang. Google start /auth/google/start and callback /auth/google (outside /v1).
GET /invitations -> array; POST /invitations {title,slug,partner1,partner2,date?,venue?,address?,templateId?} -> invitation. GET /invitations/:id -> {id,slug,title,status,document,revision,features:string[],activeUntil?,publishedAt?}. PUT /invitations/:id/draft {document,revision} -> {document,revision}. POST /invitations/:id/publish -> {slug,publishedAt}. GET /invitations/:id/orders -> array. POST /invitations/:id/orders {packageId,addonIds:[]} -> {id,total,status,snapUrl?}; POST /orders/:id/checkout -> {snapUrl}. POST /invitations/:id/activate (operator only).
GET /invitations/:id/guests?q=&page=1 -> {items,total,page,pageSize}. POST same {displayName,phone?,group?,quota?} -> guest. PUT /invitations/:id/guests/:guestId {displayName,revision,...} -> guest. Guest {id,displayName,token,revision,phone?,group?,quota,rsvp?}. DELETE same.
POST /invitations/:id/imports/preview {text,format:'tsv'|'csv'} or multipart file -> {id,rows:[{row,displayName,phone?,group?,quota?,errors:string[],warnings:string[]}],validCount}. POST /invitations/:id/imports/:jobId/commit {idempotencyKey} -> {imported}. Sheets separate OAuth/Picker, backend receives selected spreadsheetId/range only.
GET /public/:slug -> {document,title,slug,publishedAt}; GET /public/:slug/guest?g=token -> {displayName,quota,rsvp?,events?} no-store; POST /public/:slug/rsvp {token,attendance:'yes'|'no',count,message?}; GET /public/:slug/wishes -> approved array. GET /invitations/:id/rsvps -> array; GET /invitations/:id/wishes -> array; PATCH /invitations/:id/wishes/:wishId {approved:boolean}.


## Validasi dan kode galat (sejak fase 13)

Semua endpoint ber-body divalidasi zod di batas controller; skemanya diekspor dari
`@aruna/contracts/api` dan dipakai kedua sisi. Body yang tidak lolos membalas **400**
`VALIDATION_FAILED` dengan `fieldErrors` (nama field → daftar pesan). `INVALID_DOCUMENT` tidak
lagi dipakai; dokumen undangan divalidasi lewat jalur yang sama.

`revision` pada `PUT /invitations/:id/draft` dan `PUT /invitations/:id/guests/:guestId`
**wajib ada** dan harus bilangan bulat non-negatif. Ketiadaannya dulu membuat tulisannya lolos
terhadap revisi apa pun. `addonIds` pada `POST /invitations/:id/orders` boleh dihilangkan dan
berarti daftar kosong.

Konflik revisi membalas **409** `REVISION_CONFLICT` beserta `current` — nilai terkini yang dipakai
UI untuk menawarkan penyelesaian. Sebelumnya field itu dibuang filter galat.

Batas laju membalas **429** `RATE_LIMITED` dengan `retryAfterSeconds`. Berlaku pada `login`,
`register`, `forgot-password` (dua ember: per (IP, email) dan per IP), `/auth/google/start`,
webhook Midtrans, dan tiga jalur tulis publik (`opened`, `rsvp`, `wishes`).
