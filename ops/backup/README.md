# Backup dan restore

Dua aliran data pelanggan, dan keduanya tidak tergantikan:

| | Isi | Strategi |
|---|---|---|
| Postgres | akun, undangan, tamu, RSVP, pesanan | dump penuh `-Fc` harian |
| volume `media` | foto pernikahan yang diunggah pelanggan | inkremental, `copy` — tidak pernah `sync` |

Sebelum ini ada, volume `postgres` di satu VPS adalah satu-satunya salinan. Satu `docker volume rm`
salah ketik atau satu disk gagal, dan semuanya habis.

## Dua sifat yang membentuk semuanya

**1. Enkripsi asimetris.** Server hanya bisa *mengenkripsi*. Kunci privat tidak pernah ada di
sana, jadi penyerang yang menguasai VPS tidak bisa membaca satu pun backup lama.

**2. Kredensial tanpa izin hapus.** Hal pertama yang dilakukan ransomware adalah menghapus backup
sebelum mengenkripsi produksi. Backup off-site yang bisa dihapus dari mesin yang dicadangkannya
bukan backup off-site. Yang menghapus hanyalah lifecycle rule di sisi bucket.

`age`, bukan `gpg`: satu binary statis, satu flag, tanpa keyring, trustdb, atau agent yang punya
pendapat sendiri di sesi tanpa TTY. Backup adalah kode yang jalan jam 3 pagi tanpa penonton dan
baru dibaca saat keadaan sudah buruk.

---

## Langkah 1 — upacara kunci (di laptop, sekali seumur hidup)

```sh
age-keygen -o ~/.config/aruna/backup-key.txt      # kunci UTAMA
age-keygen -o /tmp/recovery-key.txt               # kunci PEMULIHAN
```

Tiap berkas memuat satu baris `# public key: age1...` dan satu baris kunci privat.

1. Salin **dua baris publik** ke `recipients.txt` di direktori ini, ganti dua placeholder.
2. Kunci privat **utama** → password manager, item sendiri.
3. Kunci privat **pemulihan** → cetak di kertas, simpan terpisah secara fisik, lalu
   `rm /tmp/recovery-key.txt`.

Kunci privat tidak pernah menyentuh VPS, git, atau GitHub Secrets. Dua penerima ada supaya
hilangnya akses ke password manager bukan berarti hilangnya seluruh riwayat backup.

`recipients.txt` **ikut git**, dan itu disengaja: ia bukan rahasia, tapi salah ketik satu karakter
di sana menghasilkan backup yang "berhasil" tiap malam dan tidak bisa dibuka siapa pun.
`install.sh` membandingkan yang di server dengan yang di repo supaya keduanya tidak menyimpang.

## Langkah 2 — bucket

Syarat yang mengikat, bukan preferensi:

- mendukung **lifecycle rule**
- bisa membuat kredensial **tanpa `DeleteObject`**
- idealnya versioning + object lock

Backblaze B2 dan Cloudflare R2 keduanya memenuhi dan murah untuk ukuran ini.

```sh
# di laptop, dengan kredensial ADMIN — bukan yang akan dipasang di server
aws s3api put-bucket-lifecycle-configuration --bucket <bucket> \
  --lifecycle-configuration file://ops/backup/lifecycle.json --endpoint-url <endpoint>
```

Lalu buat kredensial kedua, **hanya `PutObject` + `ListBucket`**, dan itu yang masuk ke
`/root/.config/rclone/rclone.conf` di server (mode 600).

## Langkah 3 — pasang di server

```sh
scp -r ops aruna:/tmp/                                   # atau git pull, kalau repo ada di server
ssh aruna
sudo install -m 600 /dev/null /srv/aruna/backup.env      # lalu isi dari backup.env.example
sudo /tmp/ops/backup/install.sh
```

`install.sh` idempoten dan menolak jalan kalau prasyaratnya belum ada: `age`, `rclone`, remote
rclone terkonfigurasi, `backup.env` mode 600 dengan `HC_URL` dan `REMOTE` terisi, dan
`recipients.txt` yang benar-benar memuat kunci.

Jalankan sekali manual sebelum mempercayai timernya:

```sh
sudo systemctl start aruna-backup.service
journalctl -u aruna-backup -n 60 --no-pager
systemctl list-timers aruna-backup
```

## Langkah 4 — drill, dan ini yang tidak boleh ditunda

**Sampai drill pertama lulus, yang kamu punya adalah berkas terenkripsi di bucket — bukan
backup.** Keduanya terlihat sama persis sampai hari kamu membutuhkannya.

```sh
export REMOTE=<remote>:<bucket>
export AGE_KEY=~/.config/aruna/backup-key.txt
export HC_DRILL_URL=https://hc-ping.com/<uuid-drill>
ops/backup/drill.sh
```

Yang dibuktikan, dan kenapa masing-masing ada:

| | Assertion | Menangkap |
|---|---|---|
| 0 | umur dump < 3 hari | drill atas arsip lama yang menyimpulkan backup sehat padahal harian sudah berhenti |
| a | `User`/`Invitation`/`Guest`/`Order`/`Package` tidak kosong | dump dari database yang salah |
| b | ada `Package` aktif | restore yang halaman `/order`-nya tidak punya apa pun untuk dijual |
| c | `prisma migrate status` bersih | skema tertinggal — aplikasi tidak bisa boot di atasnya |
| d | 20 kunci `MediaAsset` acak ada di bucket | dump sempurna yang separuh fotonya tidak pernah terunggah |
| e | image produksi menyala di atasnya, `/ready` 200 | "datanya kembali" vs "aplikasinya jalan di atas data yang kembali" |

Umur baris terbaru dilaporkan tapi **tidak** menggagalkan drill: bisnis undangan bisa sepi
berhari-hari dengan sangat wajar, dan ambang keras di sana akan berbunyi palsu lebih sering
daripada benar. Yang menangkap "backup berhenti berjalan" adalah dead man's switch harian.

## Dua check healthchecks.io

| Check | Period | Grace | Di-ping oleh |
|---|---|---|---|
| `aruna-backup` | 1 hari | 6 jam | `backup.sh`, hanya setelah seluruh verifikasi lolos |
| `aruna-restore-drill` | 35 hari | 7 hari | `drill.sh`, hanya setelah seluruh assertion lulus |

Period + grace itu yang mengubahnya dari sekadar notifikasi kegagalan menjadi dead man's switch:
timer yang mati, VPS yang mati, atau `backup.env` yang terhapus berbunyi sama kerasnya, **tanpa
ada satu baris kode pun yang jalan**.

Check kedua menjawab masalah yang sudah pasti terjadi: drill yang dijadwalkan manusia berhenti
terjadi di bulan ketiga. Yang ini menghubungi kamu sendiri.

## Restore produksi

Sengaja **tidak** ada flag untuk ini di `restore.sh` — target `prod` ditolak. Restore produksi
menghapus data yang ada sekarang, dan itu keputusan sadar, bukan sesuatu yang bisa terketik saat
panik jam 2 pagi.

1. Hentikan yang menulis, biarkan Postgres hidup:
   `docker compose -f compose.prod.yaml --env-file .env --env-file .image.env stop api worker web`
2. Drill dulu ke container sekali pakai di laptop. Pastikan yang mau dipulihkan memang benar.
3. Ambil salinan keadaan sekarang sebelum menimpanya — `systemctl start aruna-backup.service`.
   Restore yang salah pilih tanpa langkah ini kehilangan dua keadaan sekaligus.
4. Pulihkan dengan `pg_restore --clean --if-exists` ke database produksi, lalu jalankan
   `prisma migrate status` dan pastikan bersih.
5. Nyalakan lagi, dan tunggu `/ready` menjawab 200 sebelum menyatakan selesai.

Media dipulihkan terpisah: `rclone copy` dari `media/` lalu `age -d` tiap berkas ke volume
`media`. Karena kuncinya immutable dan tidak pernah ditimpa, menyalin ulang seluruhnya aman.

## Yang ada di sini vs yang hanya di server

| Repo | Server |
|---|---|
| `backup.sh`, `restore.sh`, `drill.sh`, `install.sh`, `rollback.sh` | `/srv/aruna/backup.env` (0600) |
| unit systemd — `OnCalendar` dan `TimeoutStartSec` adalah nilai yang menentukan | `/root/.config/rclone/rclone.conf` (0600, tanpa Delete) |
| `recipients.txt` — kunci publik, bukan rahasia | `/etc/aruna/backup-recipients.txt` (dari repo) |
| `lifecycle.json` — retensi yang hanya hidup di konsol provider tidak diketahui siapa pun | `/var/backups/aruna/` (2 dump terakhir) |

`POSTGRES_PASSWORD` **tidak** diduplikasi ke `backup.env`; `backup.sh` menyumbernya dari
`/srv/aruna/.env` yang sudah ada. Rahasia yang sama di dua tempat adalah rahasia yang akan
menyimpang.

Di luar keduanya: kunci privat age (password manager + cetak) dan kredensial admin bucket.
