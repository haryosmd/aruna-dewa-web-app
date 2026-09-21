import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { PrismaClient } from '../packages/database/src/index'
import { catalog } from '../packages/contracts/src/index'

/** Dibaca dari katalog, bukan diketik ulang: harga berubah dan angka hardcode akan basi diam-diam. */
const mulaPrice = catalog.packages.find(item => item.id === 'mula')!.price

const base = process.env.ARUNA_API_BASE ?? 'http://127.0.0.1:3001/v1'
const origin = 'http://127.0.0.1:3000'
const prisma = new PrismaClient()
class Client {
  cookies = new Map<string, string>()
  async call(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(base + path, {
      method, headers: { origin, 'content-type': 'application/json', cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    for (const header of response.headers.getSetCookie()) {
      const cookie = header.split(';')[0]!; const index = cookie.indexOf('=')
      this.cookies.set(cookie.slice(0, index), cookie.slice(index + 1))
    }
    const data = response.status === 204 ? null : await response.json()
    return { status: response.status, data, headers: response.headers }
  }
}
const results: string[] = []
function check(condition: unknown, label: string) { assert.ok(condition, label); results.push(label); console.log(`PASS ${label}`) }
const run = randomUUID().slice(0, 8), password = `Aruna-${randomUUID()}!`
const owner = new Client(), stranger = new Client()
try {
  for (const [client, name] of [[owner, 'owner'], [stranger, 'stranger']] as const) {
    const email = `qa-${name}-${run}@example.test`
    let response = await client.call('/auth/register', 'POST', { email, password, name: `QA ${name}` })
    check(response.status === 201, `${name} registration writes real database and local email`)
    response = await client.call('/auth/login', 'POST', { email, password })
    check(response.status < 300, `${name} login`)
  }
  const created = await owner.call('/invitations', 'POST', { title: 'QA Aruna & Dewa', partner1: 'Aruna', partner2: 'Dewa', slug: `qa-${run}`, date: '2027-10-18', venue: 'Taman Aruna', address: 'Jakarta' })
  check(created.status === 201, 'create invitation')
  const id = created.data.id, slug = created.data.slug
  /*
   * Undangan kedua, milik akun biasa yang **tidak pernah** dinaikkan jadi `OPERATOR`.
   *
   * `canEditDesign()` bernilai `isOperator || features.includes('design')`, dan pemilik fixture
   * utama dinaikkan jadi operator beberapa baris di bawah supaya bisa mengaktifkan tanpa bayar.
   * Akibatnya keadaan terkunci tidak pernah bisa terjadi di undangan itu, dan tes e2e yang
   * mengujinya dulu melewati dirinya sendiri di keempat project — lulus tanpa pernah berjalan.
   * Undangan inilah yang membuat keadaan itu benar-benar ada untuk diuji.
   */
  const terkunci = await stranger.call('/invitations', 'POST', { title: 'QA Terkunci', partner1: 'Sekar', partner2: 'Jagad', slug: `qa-terkunci-${run}`, date: '2027-11-20', venue: 'Pendopo', address: 'Yogyakarta' })
  check(terkunci.status === 201, 'akun biasa boleh membuat undangan')
  const terkunciId = terkunci.data.id
  check(!(await stranger.call(`/invitations/${terkunciId}`)).data.features?.includes('design'), 'undangan akun biasa tidak punya entitlement design')

  check((await stranger.call(`/invitations/${id}`)).status === 403, 'account isolation on invitation read')
  check((await stranger.call(`/invitations/${id}/guests`)).status === 403, 'account isolation on guest list')
  check((await owner.call(`/public/${slug}`)).status === 404, 'unpublished draft is not public')
  const unpaid = await owner.call(`/invitations/${id}/publish`, 'POST')
  check(unpaid.status >= 400, 'unpaid account cannot publish')
  const order = await owner.call(`/invitations/${id}/orders`, 'POST', { packageId: 'mula', addonIds: [], total: 1 })
  check(order.status < 300 && order.data.total === mulaPrice, 'server ignores tampered price')
  const deniedActivation = await owner.call(`/invitations/${id}/activate`, 'POST')
  check([400, 403].includes(deniedActivation.status), 'regular account cannot bypass payment')
  await prisma.user.update({ where: { email: `qa-owner-${run}@example.test` }, data: { role: 'OPERATOR' } })
  await owner.call('/auth/login', 'POST', { email: `qa-owner-${run}@example.test`, password })
  check((await owner.call('/auth/me')).data.user.role === 'r_7c91', 'operator role represented by configured internal code')
  check((await owner.call(`/invitations/${id}/activate`, 'POST')).status < 300, 'operator activation without payment')
  const draft = (await owner.call(`/invitations/${id}`)).data
  // Dokumen v2 lahir dengan bagian hadiah menyala tapi rekening kosong; publish menuntut nomornya.
  draft.document.sections.find((section: { type: string }) => section.type === 'gift').data.account1 = '1234567890'
  const saved = await owner.call(`/invitations/${id}/draft`, 'PUT', { document: draft.document, revision: draft.revision })
  check(saved.status < 300, 'draft save')
  check((await owner.call(`/invitations/${id}/draft`, 'PUT', { document: draft.document, revision: draft.revision })).status === 409, 'stale draft revision rejected')
  const published = await owner.call(`/invitations/${id}/publish`, 'POST')
  check(published.status < 300, 'publish snapshot')
  check((await owner.call(`/invitations/${id}/publish`, 'POST')).status < 300, 'repeat publish idempotent')
  const publicBefore = (await owner.call(`/public/${slug}`)).data
  const document = structuredClone(saved.data.document)
  // Dokumen v2 (fase 72): judul amplop pembuka, bukan `cover`.
  document.sections.find((section: { type: string }) => section.type === 'opening-envelope').data.title = 'Unpublished change'
  await owner.call(`/invitations/${id}/draft`, 'PUT', { document, revision: saved.data.revision })
  check(JSON.stringify((await owner.call(`/public/${slug}`)).data.document) === JSON.stringify(publicBefore.document), 'editing draft preserves published snapshot')
  const guestA = await owner.call(`/invitations/${id}/guests`, 'POST', { displayName: 'dr. Yosi Susanti, Sp.OG', quota: 2 })
  const guestB = await owner.call(`/invitations/${id}/guests`, 'POST', { displayName: 'dr. Yosi Susanti, Sp.OG', quota: 1 })
  check(guestA.status < 300 && guestB.status < 300 && guestA.data.id !== guestB.data.id, 'duplicate names remain separate guests')
  const token = guestA.data.token
  check(typeof token === 'string' && token.length >= 22, 'opaque guest link returned to owner')
  const personal = await owner.call(`/public/${slug}/guest?g=${encodeURIComponent(token)}`)
  check(personal.status === 200 && personal.headers.get('cache-control')?.includes('no-store'), 'personal guest response never cached')
  check((await prisma.guest.findUnique({ where: { id: guestA.data.id } }))?.openedAt === null, 'guest GET does not falsely record an open')
  check((await owner.call(`/public/${slug}/opened`, 'POST', { token })).status < 300, 'explicit guest open accepted')
  check((await prisma.guest.findUnique({ where: { id: guestA.data.id } }))?.openedAt !== null, 'explicit guest open persisted')
  const mediaForm = new FormData()
  mediaForm.append('file', new Blob([await readFile('apps/web/public/images/rings.webp')], { type: 'image/webp' }), 'rings.webp')
  const upload = await fetch(`${base}/invitations/${id}/media`, { method: 'POST', headers: { origin, cookie: [...owner.cookies].map(([k, v]) => `${k}=${v}`).join('; ') }, body: mediaForm })
  const media = await upload.json() as { publicUrl: string }
  check(upload.ok && typeof media.publicUrl === 'string', 'multipart media persisted')
  const privatePreview = await fetch(media.publicUrl, { headers: { cookie: [...owner.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } })
  check(privatePreview.ok && privatePreview.headers.get('cache-control')?.includes('no-store'), 'unpublished media preview is never publicly cached')
  check([400, 403, 404].includes((await fetch(media.publicUrl)).status), 'unpublished media inaccessible without session')
  check((await owner.call(`/public/${slug}/rsvp`, 'POST', { token, attendance: 'yes', count: 3 })).status >= 400, 'RSVP quota enforced')
  check((await owner.call(`/public/${slug}/rsvp`, 'POST', { token, attendance: 'yes', count: 2, message: 'Selamat untuk kalian.' })).status < 300, 'personal RSVP accepted within quota')
  check((await owner.call(`/public/${slug}/rsvp`, 'POST', { token: 'invalid', attendance: 'yes', count: 1 })).status >= 400, 'invalid guest token cannot RSVP')
  /*
   * Ucapan punya endpointnya sendiri. Web sempat menembak `/rsvp`, yang membuat setiap
   * ucapan menimpa konfirmasi kehadiran tamu dan tidak pernah membuat baris Wish.
   */
  const rsvpBeforeWish = await prisma.rSVP.findFirst({ where: { guestId: guestA.data.id } })
  const wish = await owner.call(`/public/${slug}/wishes`, 'POST', { token, message: 'Bahagia selalu untuk kalian berdua.' })
  check(wish.status < 300 && typeof wish.data.id === 'string', 'wish accepted through its own endpoint')
  check(wish.data.approved === false && wish.data.authorName === guestA.data.displayName, 'wish returns the pending row so its author can see it')
  check((await prisma.wish.count({ where: { guestId: guestA.data.id } })) === 1, 'wish row persisted')
  const rsvpAfterWish = await prisma.rSVP.findFirst({ where: { guestId: guestA.data.id } })
  check(rsvpAfterWish?.count === rsvpBeforeWish?.count && rsvpAfterWish?.message === rsvpBeforeWish?.message, 'posting a wish never touches the guest RSVP')
  check(!((await owner.call(`/public/${slug}/wishes`)).data as { id: string }[]).some(item => item.id === wish.data.id), 'unapproved wish stays out of the public wall')
  check((await owner.call(`/public/${slug}/wishes`, 'POST', { token: 'invalid', message: 'halo' })).status >= 400, 'invalid guest token cannot post a wish')
  const preview = await owner.call(`/invitations/${id}/imports/preview`, 'POST', { text: 'Nama\tTelepon\nÉlodie\t0812345\nAnne-Marie & Budi\t0819999', format: 'tsv' })
  check(preview.status < 300 && preview.data.validCount === 2, 'spreadsheet import preview preserves Unicode')
  const beforeCommit = (await owner.call(`/invitations/${id}/guests`)).data.total
  check(beforeCommit === 2, 'preview has no guest writes')
  const jobPath = `/invitations/${id}/imports/${preview.data.id}/commit`
  const idempotencyKey = randomUUID()
  check((await owner.call(jobPath, 'POST', { idempotencyKey })).status < 300, 'import commit')
  check((await owner.call(jobPath, 'POST', { idempotencyKey })).status < 300, 'import commit retry succeeds')
  check((await owner.call(`/invitations/${id}/guests`)).data.total === 4, 'import retry does not duplicate guests')
  // Rotasi refresh token, dan tenggangnya. Asersi di sini pernah menuntut replay ditolak
  // SEKETIKA, dan itu perilaku versi pra-git: `session-rotation.ts` sejak pengerasan Fase 13
  // sengaja melayani token yang baru digantikan selama 30 detik / 5 pemakaian, supaya dua tab
  // yang menyegarkan berbarengan tidak saling menendang. Yang basi asersinya, bukan kodenya --
  // dan tidak ada yang tahu selama berkas ini tidak pernah dijalankan CI.
  const oldCookies = new Map(owner.cookies)
  check((await owner.call('/auth/refresh', 'POST')).status < 300, 'refresh rotates session')
  const rotatedCookies = new Map(owner.cookies)

  // Sisi pertama desain: replay dalam tenggang DILAYANI, tapi tiap pemakaian wajib menerbitkan
  // token baru. Menyajikan ulang token lama akan membuat yang bocor hidup selamanya.
  owner.cookies = new Map(oldCookies)
  const graced = await owner.call('/auth/refresh', 'POST')
  check(graced.status < 300, 'replay dalam tenggang dilayani')
  check(owner.cookies.get('aruna_refresh') !== oldCookies.get('aruna_refresh'), 'pemakaian tenggang menerbitkan token baru')

  // Sisi kedua, yang membuat tenggang bukan lubang tanpa dasar: kuotanya habis. Dikuras di sini
  // (GRACE_MAX_USES = 5) supaya batasnya teruji tanpa menunggu 30 detik sungguhan. Batas 8 cuma
  // penjaga supaya kegagalan muncul sebagai asersi, bukan sebagai gelung tak berujung.
  let replayed = graced
  for (let attempt = 0; attempt < 8 && replayed.status < 300; attempt += 1) {
    owner.cookies = new Map(oldCookies)
    replayed = await owner.call('/auth/refresh', 'POST')
  }
  check(replayed.status === 401, 'replay ditolak begitu kuota tenggang habis')
  owner.cookies = rotatedCookies
  check((await owner.call('/auth/me')).status === 401, 'pencurian terdeteksi mencabut sesi pengganti')
  await owner.call('/auth/login', 'POST', { email: `qa-owner-${run}@example.test`, password })
  const beforeLogout = new Map(owner.cookies)
  await owner.call('/auth/logout', 'POST')
  owner.cookies = beforeLogout
  check((await owner.call('/auth/me')).status === 401, 'logout revokes prior access JWT')
  await mkdir('.data', { recursive: true })
  await writeFile('.data/qa-account.json', JSON.stringify({ email: `qa-owner-${run}@example.test`, password, invitationId: id, slug, locked: { email: `qa-stranger-${run}@example.test`, password, invitationId: terkunciId } }), { mode: 0o600 })
  await mkdir('docs/features/operations/verification', { recursive: true })
  // Versi dibaca dari database yang benar-benar dipakai, bukan diketik. Literal 'PostgreSQL 18.4
  // local' salah di CI (postgres:17-alpine) — dan satu-satunya guna berkas ini adalah jadi bukti.
  const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`
  await writeFile('docs/features/operations/verification/api-smoke.json', JSON.stringify({ date: new Date().toISOString(), database: version, checks: results }, null, 2))
  console.log(`Completed ${results.length} integration checks. Test account saved in ignored .data/qa-account.json.`)
} finally { await prisma.$disconnect() }
