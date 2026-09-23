# Shared API contract

Base http://127.0.0.1:3001/v1, credentials include; access/refresh cookies HttpOnly. Mutations require Origin matching web origin. Errors {code,message,fieldErrors?,requestId}. API dates ISO strings.

GET /catalog -> {packages:[{id,name,price,features:string[]}],addons:[{id,name,price}],templates:[{id,name,version}],sandbox:true}
POST /auth/register {email,password,name}; POST /auth/login {email,password}; GET /auth/me -> {user:{id,email,name,role},invitations:[{id,slug,title,status}]}; POST /auth/logout; POST /auth/refresh. Satu sesi per akun: login baru mencabut sesi lama. `refresh` 401 membawa `code` — SESSION_REPLACED (masuk di perangkat lain), SESSION_REUSE (token dipakai ulang di luar tenggang; seluruh sesi dicabut), SESSION_EXPIRED, SESSION_INVALID — dan 503 SESSION_BUSY untuk rebutan sesaat, yang bukan alasan mengeluarkan orang. Google start /auth/google/start and callback /auth/google (outside /v1).
GET /invitations -> [{id,slug,title,status,publishedAt,updatedAt}] — **tanpa yang `ARCHIVED`**, di kedua cabang (operator maupun bukan); arsip hanya terlihat di `/bo`. `publishedAt` berarti "terakhir terbit", bukan "sedang terbit" — yang menjawab itu `status`. POST /invitations {title,slug,partner1,partner2,date?,venue?,address?,templateId?} -> invitation. GET /invitations/:id -> {id,slug,title,status,document,revision,features:string[],photoLimit,activeUntil?,publishedAt?}. `photoLimit` = kuota foto galeri paket (15/30/60); editor memakainya apa adanya supaya angkanya tidak pernah beda dengan yang ditolak API. PUT /invitations/:id/draft {document,revision} -> {document,revision}. POST /invitations/:id/publish -> {slug,publishedAt}. GET /invitations/:id/revisions -> [{revision,publishedAt,isActive}] (maks 50, terbaru dulu; VIEWER boleh, dan **tanpa `document`** — isinya baru diambil saat dipulihkan). POST /invitations/:id/revisions/restore {revision,draftRevision} -> {document,revision}: menulis snapshot itu ke **draft**, bukan ke revisi terbit, lewat jalur `PUT /draft` yang sama — jadi gerbang desain dan `409 REVISION_CONFLICT` tetap berlaku, dan dokumen v1 dipulihkan sebagai v1 (editor yang memigrasi, seperti fase 72). GET /invitations/:id/orders -> array. POST /invitations/:id/orders {packageId,addonIds:[]} -> {id,total,status,snapUrl?}; POST /orders/:id/checkout -> {snapUrl}. POST /invitations/:id/activate (operator only).

Siklus hidup (fase 78). POST /invitations/:id/unpublish -> {status} (EDITOR): `status` kembali `DRAFT` sehingga `/public/:slug` berhenti menyajikannya, sementara `activeRevisionId`, riwayat revisi, dan `publishedAt` **dipertahankan** — "terbitkan lagi" karena itu satu klik, bukan satu pemulihan. POST /invitations/:id/archive -> {status} (OWNER): `status` jadi `ARCHIVED`, lalu di detik yang sama seluruh `PublishedRevision` **kecuali yang aktif** dibuang berikut aset yang tidak dirujuk draf (berkasnya di storage, bukan cuma barisnya); undangan hilang dari `GET /invitations`, dan tiga puluh hari kemudian penyapu retensi memusnahkannya. POST /invitations/:id/restore -> {status} (operator only): `ARCHIVED` → `DRAFT`. DELETE /invitations/:id -> {deleted} (operator only): permanen; berkas storage dihapus lebih dulu, `activeRevisionId` di-null-kan (kunci asingnya melingkar dengan `PublishedRevision.invitationId`, jadi tanpa langkah itu Postgres menolak), lalu barisnya — `AuditEvent` sengaja `onDelete: SetNull` sehingga jejaknya bertahan.

GET /bo/invitations?q=&status=&page=1 -> {items:[{id,slug,title,status,ownerEmail,guestCount,createdAt,updatedAt,publishedAt}],total,page,pageSize} (operator only, 403 `Akses operator diperlukan` untuk yang lain). Satu-satunya daftar yang memperlihatkan `ARCHIVED`. `q` mencari judul, slug, dan email pemilik. **Tanpa `document`**: 25 dokumen undangan penuh per halaman adalah muatan tanpa pembaca. Backoffice tidak punya jalur tulis sendiri — aksinya memakai keempat endpoint siklus hidup di atas.
GET /invitations/:id/guests?q=&page=1 -> {items,total,page,pageSize}. POST same {displayName,phone?,group?,quota?} -> guest. PUT /invitations/:id/guests/:guestId {displayName,revision,...} -> guest. Guest {id,displayName,token,revision,phone?,group?,quota,rsvp?}. DELETE same.
GET /invitations/:id/guests/template.xlsx -> XLSX template daftar tamu (dropdown kategorinya diisi kategori undangan itu). POST /invitations/:id/imports/preview {text,format:'tsv'|'csv'} or multipart file -> {id,rows:[{row,displayName,phone?,group?,quota?,guestFrom?,childCount?,invitationKind?,notes?,errors:string[],warnings:string[]}],validCount}. `row` = nomor baris **spreadsheet aslinya**; preamble/spanduk di atas header dilewati, kolom kiri yang kosong dibuang, dan baris kosong tidak dilaporkan sebagai galat. POST /invitations/:id/imports/:jobId/commit {idempotencyKey} -> {imported}. Sheets separate OAuth/Picker, backend receives selected spreadsheetId/range only.
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
