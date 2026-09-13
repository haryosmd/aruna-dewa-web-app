import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Development fallback when Docker is unavailable; never used in production.
const databaseDir = resolve('.data/postgres')
const pg = new EmbeddedPostgres({ databaseDir, user: 'aruna', password: 'aruna-local-only', port: 54329, persistent: true })
if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await pg.initialise()
await pg.start()
const client = pg.getPgClient()
await client.connect()
const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'aruna'")
await client.end()
if (!result.rowCount) await pg.createDatabase('aruna')
console.log('Development PostgreSQL listening at 127.0.0.1:54329. Press Ctrl+C to stop.')
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await pg.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
setInterval(() => {}, 60_000)
