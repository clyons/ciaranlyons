import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dev } from 'astro'

execFileSync(process.execPath, ['tests/fixtures/note-media/generate-assets.mjs'], { stdio: 'inherit' })
const assigned = Number(process.env.CONDUCTOR_PORT)
const port = process.env.NOTES_MOCKUP_PORT ?? String(Number.isInteger(assigned) ? assigned + 3 : 4324)
const server = await dev({ root: fileURLToPath(new URL('.', import.meta.url)), server: { host: '127.0.0.1', port: Number(port) }, devToolbar: { enabled: false } })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.stop(); process.exit(0) })
