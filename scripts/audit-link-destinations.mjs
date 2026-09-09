import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { plainText, validateDestination } from './recover-feedproxy-links.mjs'

function parseArgs(argv) {
  const options = { concurrency: 16, content: 'content/links', limit: undefined, report: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--concurrency') options.concurrency = Number(argv[++index])
    else if (argument === '--content') options.content = argv[++index]
    else if (argument === '--limit') options.limit = Number(argv[++index])
    else if (argument === '--report') options.report = argv[++index]
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 32) throw new Error('--concurrency must be an integer from 1 to 32')
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer')
  if (!options.report) throw new Error('--report is required')
  return options
}

export function auditCategory(result) {
  if (result.status >= 200 && result.status < 300) return result.semantic?.matched ? 'verified' : 'semantic-mismatch'
  if ([401, 403, 406, 429].includes(result.status)) return 'access-restricted'
  if ([404, 410].includes(result.status)) return 'broken'
  if (['ENOTFOUND', 'ENETUNREACH', 'ECONNREFUSED', 'ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'redirect count exceeded'].some((code) => String(result.error || '').includes(code))) return 'broken'
  return 'unavailable'
}

async function writeAtomically(destination, contents) {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents, 'utf8')
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    throw error
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const files = (await fg('*.md', { cwd: path.resolve(options.content), absolute: true })).sort().slice(0, options.limit)
  const entries = await Promise.all(files.map(async (file) => {
    const data = matter(await readFile(file, 'utf8')).data
    return { slug: path.basename(file, '.md'), title: plainText(data.title), description: plainText(data.description), targetUrl: data.targetUrl, sourceTitle: plainText(data.sourceTitle) }
  }))
  const results = []
  let cursor = 0
  await Promise.all(Array.from({ length: options.concurrency }, async () => {
    while (cursor < entries.length) {
      const entry = entries[cursor++]
      const validation = await validateDestination(entry.targetUrl, { link: entry })
      results.push({ ...entry, ...validation, category: auditCategory(validation) })
    }
  }))
  results.sort((a, b) => a.slug.localeCompare(b.slug))
  const categories = {}
  const statuses = {}
  for (const result of results) {
    categories[result.category] = (categories[result.category] || 0) + 1
    statuses[result.status] = (statuses[result.status] || 0) + 1
  }
  const report = { checkedAt: new Date().toISOString(), total: results.length, categories, statuses, results }
  await writeAtomically(path.resolve(options.report), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ total: report.total, categories, statuses, report: options.report }, null, 2))
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Link destination audit failed')
    process.exit(1)
  })
}
