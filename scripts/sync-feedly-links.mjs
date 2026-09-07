import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import matter from 'gray-matter'
import sanitizeHtml from 'sanitize-html'

const apiRoot = 'https://api.feedly.com/v3'
const contentDir = path.join(process.cwd(), 'content', 'links')
const requestTimeoutMs = 10_000
const maxResponseBytes = 4 * 1024 * 1024
const maxPages = 1_000
const excerptLength = 320

function usage() {
  console.log('Usage: node scripts/sync-feedly-links.mjs [--dry-run] [--input FILE] [--stream-id ID] [--limit N] [--report FILE]')
}

export function parseFeedlyArgs(argv) {
  const options = { dryRun: false, input: undefined, streamId: process.env.FEEDLY_STREAM_ID?.trim() || undefined, limit: undefined, report: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--input') options.input = argv[++index]
    else if (arg === '--stream-id') options.streamId = argv[++index]
    else if (arg === '--limit') options.limit = Number(argv[++index])
    else if (arg === '--report') options.report = argv[++index]
    else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else throw new Error(`Unknown argument: ${arg}`)
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer')
  if (options.input === '') throw new Error('--input requires a file')
  if (options.report === '') throw new Error('--report requires a file')
  return options
}

export function normalizeTargetUrl(value) {
  const parsed = new URL(value)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('URL must use HTTP(S) without credentials')
  parsed.hash = ''
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(key.toLowerCase())) parsed.searchParams.delete(key)
  }
  return parsed.toString()
}

function httpUrl(value) {
  if (typeof value !== 'string') return undefined
  try {
    return normalizeTargetUrl(value)
  } catch {
    return undefined
  }
}

export function selectTargetUrl(item) {
  if (!item || typeof item !== 'object') return undefined
  const canonical = httpUrl(item.canonicalUrl)
  if (canonical) return canonical
  if (!Array.isArray(item.alternate)) return undefined
  for (const alternate of item.alternate) {
    if (alternate?.type !== 'text/html') continue
    const selected = httpUrl(alternate.href)
    if (selected) return selected
  }
  return undefined
}

function plainText(value) {
  if (typeof value !== 'string') return ''
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim()
}

function truncate(value, maximum = excerptLength) {
  if (value.length <= maximum) return value
  const candidate = value.slice(0, maximum - 1).replace(/\s+\S*$/, '').trimEnd()
  return `${candidate || value.slice(0, maximum - 1)}…`
}

function isoTimestamp(value) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return undefined
  const date = new Date(number)
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString()
}

function slugify(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-+$/g, '') || 'link'
}

export function stableLinkSlug(title, feedlyId) {
  const suffix = createHash('sha256').update(feedlyId).digest('hex').slice(0, 10)
  return `${slugify(title)}-${suffix}`
}

function savedTimestamp(item, streamId) {
  if (!Array.isArray(item.tags)) return undefined
  const tag = item.tags.find((candidate) => candidate?.id === streamId)
    ?? item.tags.find((candidate) => typeof candidate?.id === 'string' && candidate.id.endsWith('/tag/global.saved'))
  return isoTimestamp(tag?.actionTimestamp)
}

function safeOptionalUrl(value) {
  return httpUrl(value)
}

export function linkFromFeedlyItem(item, { streamId = '', importedAt = new Date().toISOString() } = {}) {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) return { rejected: 'missing-feedly-id' }
  const targetUrl = selectTargetUrl(item)
  if (!targetUrl) return { rejected: 'missing-http-target', feedlyId: item.id }

  const title = truncate(plainText(item.title) || new URL(targetUrl).hostname.replace(/^www\./, ''), 180)
  const savedAt = savedTimestamp(item, streamId)
  const publishedAt = isoTimestamp(item.published)
  const fallbackImportedAt = new Date(importedAt).toISOString()
  const effectiveDate = savedAt ?? publishedAt ?? fallbackImportedAt
  const dateSource = savedAt ? 'saved' : publishedAt ? 'published' : 'imported'
  const tags = Array.isArray(item.tags)
    ? [...new Set(item.tags.flatMap((tag) => typeof tag?.label === 'string' && tag.label.trim() ? [plainText(tag.label)] : []))]
    : []

  return {
    link: {
      slug: stableLinkSlug(title, item.id),
      title,
      description: truncate(plainText(item.summary?.content)),
      date: effectiveDate.slice(0, 10),
      savedAt,
      dateSource,
      publishedAt,
      targetUrl,
      sourceTitle: plainText(item.origin?.title) || undefined,
      author: plainText(item.author) || undefined,
      feedlyId: item.id,
      feedlyUrl: safeOptionalUrl(item.feedlyUrl),
      tags,
      mock: item.mock === true,
    },
    warnings: dateSource === 'saved' ? [] : [`date-fallback:${dateSource}`],
  }
}

function quoteYaml(value) {
  return JSON.stringify(String(value))
}

export function linkMarkdown(link) {
  const fields = [
    `title: ${quoteYaml(link.title)}`,
    `description: ${quoteYaml(link.description)}`,
    `date: ${link.date}`,
    ...(link.savedAt ? [`savedAt: ${quoteYaml(link.savedAt)}`] : []),
    `dateSource: ${link.dateSource}`,
    ...(link.publishedAt ? [`publishedAt: ${quoteYaml(link.publishedAt)}`] : []),
    `targetUrl: ${quoteYaml(link.targetUrl)}`,
    ...(link.sourceTitle ? [`sourceTitle: ${quoteYaml(link.sourceTitle)}`] : []),
    ...(link.author ? [`author: ${quoteYaml(link.author)}`] : []),
    `feedlyId: ${quoteYaml(link.feedlyId)}`,
    ...(link.feedlyUrl ? [`feedlyUrl: ${quoteYaml(link.feedlyUrl)}`] : []),
    `tags: ${JSON.stringify(link.tags)}`,
    ...(link.mock ? ['mock: true'] : []),
  ]
  return `---\n${fields.join('\n')}\n---\n`
}

async function readBoundedBody(response, maximumBytes) {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw new Error(`Feedly response exceeds ${maximumBytes} bytes`)
  if (!response.body) throw new Error('Feedly response body is missing')
  const chunks = []
  let total = 0
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk)
    total += bytes.byteLength
    if (total > maximumBytes) throw new Error(`Feedly response exceeds ${maximumBytes} bytes`)
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, total).toString('utf8')
}

async function feedlyJson(url, token, fetchImpl) {
  const response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(requestTimeoutMs) })
  const text = await readBoundedBody(response, maxResponseBytes)
  if (!response.ok) {
    if (response.status === 401) throw new Error('Feedly authentication failed (401); check API token access')
    if (response.status === 403) throw new Error('Feedly denied this stream (403); the account may not have API entitlement')
    if (response.status === 429) throw new Error('Feedly rate limit reached (429); retry after the reset window')
    throw new Error(`Feedly request failed (${response.status})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Feedly returned invalid JSON')
  }
}

export async function collectFeedlyStream({ token, streamId, limit, fetchImpl = fetch }) {
  if (!token) throw new Error('Missing FEEDLY_ACCESS_TOKEN')
  let resolvedStreamId = streamId
  if (!resolvedStreamId) {
    const profile = await feedlyJson(`${apiRoot}/profile`, token, fetchImpl)
    if (typeof profile.id !== 'string' || !profile.id) throw new Error('Feedly profile did not include an id; set FEEDLY_STREAM_ID')
    resolvedStreamId = `${profile.id}/tag/global.saved`
  }

  const items = []
  const seenContinuations = new Set()
  let continuation
  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${apiRoot}/streams/contents`)
    url.searchParams.set('streamId', resolvedStreamId)
    url.searchParams.set('count', '100')
    url.searchParams.set('includeAiActions', 'false')
    url.searchParams.set('similar', 'false')
    if (continuation) url.searchParams.set('continuation', continuation)
    const payload = await feedlyJson(url, token, fetchImpl)
    if (!Array.isArray(payload.items)) throw new Error('Feedly stream response did not include an items array')
    items.push(...payload.items)
    if (limit && items.length >= limit) return { items: items.slice(0, limit), streamId: resolvedStreamId }
    const next = typeof payload.continuation === 'string' && payload.continuation ? payload.continuation : undefined
    if (!next) return { items, streamId: resolvedStreamId }
    if (seenContinuations.has(next)) throw new Error('Feedly returned a repeated continuation')
    seenContinuations.add(next)
    continuation = next
  }
  throw new Error(`Feedly pagination exceeded ${maxPages} pages`)
}

async function readInput(file, limit) {
  const payload = JSON.parse(await readFile(path.resolve(file), 'utf8'))
  const pages = Array.isArray(payload.pages) ? payload.pages : [payload]
  const items = pages.flatMap((page) => Array.isArray(page.items) ? page.items : [])
  const streamId = typeof payload.streamId === 'string' ? payload.streamId : typeof pages[0]?.id === 'string' ? pages[0].id : ''
  return { items: limit ? items.slice(0, limit) : items, streamId }
}

async function existingLinks(directory) {
  await mkdir(directory, { recursive: true })
  const byId = new Map()
  const byUrl = new Map()
  for (const file of (await readdir(directory)).filter((name) => name.endsWith('.md'))) {
    const raw = await readFile(path.join(directory, file), 'utf8')
    const data = matter(raw).data
    if (typeof data.feedlyId === 'string') byId.set(data.feedlyId, file)
    const targetUrl = httpUrl(data.targetUrl)
    if (targetUrl) byUrl.set(targetUrl, file)
  }
  return { byId, byUrl }
}

export function planLinkWrites(items, context, existing = { byId: new Map(), byUrl: new Map() }) {
  const seenIds = new Map(existing.byId)
  const seenUrls = new Map(existing.byUrl)
  const actions = []
  for (const item of items) {
    const result = linkFromFeedlyItem(item, context)
    if (!result.link) {
      actions.push({ action: 'reject', feedlyId: result.feedlyId, reason: result.rejected })
      continue
    }
    const link = result.link
    const duplicate = seenIds.get(link.feedlyId) ?? seenUrls.get(link.targetUrl)
    if (duplicate) {
      actions.push({ action: 'skip', feedlyId: link.feedlyId, targetUrl: link.targetUrl, reason: `duplicate:${duplicate}` })
      continue
    }
    seenIds.set(link.feedlyId, link.slug)
    seenUrls.set(link.targetUrl, link.slug)
    actions.push({ action: 'write', link, warnings: result.warnings })
  }
  return actions
}

async function writeFileAtomically(destination, contents) {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function writeReport(file, report) {
  const destination = path.resolve(file)
  await writeFileAtomically(destination, `${JSON.stringify(report, null, 2)}\n`)
}

async function main() {
  const options = parseFeedlyArgs(process.argv.slice(2))
  const source = options.input
    ? await readInput(options.input, options.limit)
    : await collectFeedlyStream({ token: process.env.FEEDLY_ACCESS_TOKEN, streamId: options.streamId, limit: options.limit })
  const existing = await existingLinks(contentDir)
  const importedAt = new Date().toISOString()
  const actions = planLinkWrites(source.items, { streamId: source.streamId, importedAt }, existing)

  for (const item of actions) {
    if (item.action === 'write') {
      const destination = path.join(contentDir, `${item.link.slug}.md`)
      console.log(`${options.dryRun ? 'would-write' : 'write'} ${item.link.date} ${path.relative(process.cwd(), destination)}${item.warnings.length ? ` (${item.warnings.join(', ')})` : ''}`)
      if (!options.dryRun) await writeFileAtomically(destination, linkMarkdown(item.link))
    } else console.log(`${item.action} ${item.feedlyId ?? 'unknown'} ${item.reason}`)
  }

  const summary = {
    source: options.input ? 'file' : 'feedly-api',
    streamId: source.streamId.replace(/^(user|enterprise)\/[^/]+\//, '$1/redacted/'),
    total: source.items.length,
    writes: actions.filter((item) => item.action === 'write').length,
    skips: actions.filter((item) => item.action === 'skip').length,
    rejects: actions.filter((item) => item.action === 'reject').length,
    actions: actions.map((item) => item.action === 'write'
      ? { action: options.dryRun ? 'would-write' : 'write', slug: item.link.slug, targetUrl: item.link.targetUrl, dateSource: item.link.dateSource, warnings: item.warnings }
      : item),
  }
  if (options.report) await writeReport(options.report, summary)
  console.log(`${options.dryRun ? 'dry-run' : 'done'}: ${summary.writes} ${options.dryRun ? 'would write' : 'written'}, ${summary.skips} skipped, ${summary.rejects} rejected, ${summary.total} total`)
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === entrypoint) main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Feedly link sync failed')
  process.exit(1)
})
