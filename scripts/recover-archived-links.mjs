import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { plainText, rewriteTargetUrl, validateDestination } from './recover-feedproxy-links.mjs'

function parseArgs(argv) {
  const options = { apply: false, applyReviewed: undefined, concurrency: 4, audit: undefined, report: undefined, limit: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--apply') options.apply = true
    else if (argument === '--apply-reviewed') options.applyReviewed = argv[++index]
    else if (argument === '--audit') options.audit = argv[++index]
    else if (argument === '--report') options.report = argv[++index]
    else if (argument === '--limit') options.limit = Number(argv[++index])
    else if (argument === '--concurrency') options.concurrency = Number(argv[++index])
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!options.applyReviewed && (!options.audit || !options.report)) throw new Error('--audit and --report are required')
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) throw new Error('--concurrency must be between 1 and 8')
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer')
  return options
}

export function archiveSnapshot(payload) {
  const closest = payload?.archived_snapshots?.closest
  if (!closest?.available || String(closest.status) !== '200') return undefined
  try {
    const url = new URL(closest.url)
    if (!['web.archive.org', 'www.web.archive.org'].includes(url.hostname)) return undefined
    url.protocol = 'https:'
    return url.href
  } catch {
    return undefined
  }
}

async function archiveLookup(entry, fetchImpl = fetch) {
  const endpoint = new URL('https://archive.org/wayback/available')
  endpoint.searchParams.set('url', entry.targetUrl)
  if (entry.publishedAt) endpoint.searchParams.set('timestamp', String(entry.publishedAt).replace(/\D/g, '').slice(0, 8))
  try {
    const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'CiaranLyons-link-recovery/1.0 (+https://ciaranlyons.com/links/)' } })
    if (!response.ok) return { action: 'unresolved', reason: `archive-http-${response.status}` }
    const snapshotUrl = archiveSnapshot(await response.json())
    if (!snapshotUrl) return { action: 'unresolved', reason: 'no-archive-snapshot' }
    const validation = await validateDestination(snapshotUrl, { fetchImpl, link: entry })
    if (!validation.usable) return { action: 'unresolved', reason: 'archive-semantic-mismatch', snapshotUrl, validation }
    return { action: 'recover', targetUrl: snapshotUrl, evidence: 'internet-archive-semantic-match', validation }
  } catch (error) {
    return { action: 'unresolved', reason: error instanceof Error ? error.name : 'archive-error' }
  }
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
  if (options.applyReviewed) {
    const reviewed = JSON.parse(await readFile(path.resolve(options.applyReviewed), 'utf8'))
    const recoveries = reviewed.actions.filter((item) => item.action === 'recover')
    let applied = 0
    let skipped = 0
    for (const action of recoveries) {
      const file = path.join(process.cwd(), 'content', 'links', `${action.slug}.md`)
      const markdown = await readFile(file, 'utf8')
      if (matter(markdown).data.targetUrl !== action.oldTargetUrl) {
        skipped += 1
        continue
      }
      await writeAtomically(file, rewriteTargetUrl(markdown, action.oldTargetUrl, action.targetUrl))
      applied += 1
    }
    console.log(JSON.stringify({ reviewed: recoveries.length, applied, skipped, source: options.applyReviewed }, null, 2))
    return
  }
  const audit = JSON.parse(await readFile(path.resolve(options.audit), 'utf8'))
  const queue = audit.results.filter((item) => ['broken', 'unavailable'].includes(item.category)).slice(0, options.limit)
  const actions = []
  let cursor = 0
  await Promise.all(Array.from({ length: options.concurrency }, async () => {
    while (cursor < queue.length) {
      const audited = queue[cursor++]
      const file = path.join(process.cwd(), 'content', 'links', `${audited.slug}.md`)
      const markdown = await readFile(file, 'utf8')
      const data = matter(markdown).data
      if (data.targetUrl !== audited.targetUrl) {
        actions.push({ slug: audited.slug, action: 'skip', reason: 'target-changed' })
        continue
      }
      const entry = { ...audited, title: plainText(data.title), description: plainText(data.description), publishedAt: data.publishedAt }
      actions.push({ slug: audited.slug, oldTargetUrl: audited.targetUrl, ...await archiveLookup(entry) })
    }
  }))
  actions.sort((a, b) => a.slug.localeCompare(b.slug))
  const recoveries = actions.filter((item) => item.action === 'recover')
  if (options.apply) {
    for (const action of recoveries) {
      const file = path.join(process.cwd(), 'content', 'links', `${action.slug}.md`)
      const markdown = await readFile(file, 'utf8')
      await writeAtomically(file, rewriteTargetUrl(markdown, action.oldTargetUrl, action.targetUrl))
    }
  }
  const report = { apply: options.apply, selected: queue.length, recovered: recoveries.length, unresolved: actions.filter((item) => item.action === 'unresolved').length, skipped: actions.filter((item) => item.action === 'skip').length, actions }
  await writeAtomically(path.resolve(options.report), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ apply: report.apply, selected: report.selected, recovered: report.recovered, unresolved: report.unresolved, skipped: report.skipped, report: options.report }, null, 2))
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) main().catch((error) => { console.error(error instanceof Error ? error.message : 'Archive recovery failed'); process.exit(1) })
