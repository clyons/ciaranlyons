import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import matter from 'gray-matter'
import sanitizeHtml from 'sanitize-html'

const requestTimeoutMs = 12_000
const maximumResponseBytes = 2 * 1024 * 1024
const userAgent = 'Mozilla/5.0 (compatible; CiaranLyons-link-recovery/1.0; +https://ciaranlyons.com/links/)'

function usage() {
  console.log('Usage: node scripts/recover-feedproxy-links.mjs [--dry-run] [--apply] [--slug SLUG] [--limit N] [--report PATH]')
}

export function parseArgs(argv) {
  const options = { dryRun: true, slug: undefined, limit: undefined, report: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--apply') options.dryRun = false
    else if (argument === '--slug') options.slug = argv[++index]
    else if (argument === '--limit') options.limit = Number(argv[++index])
    else if (argument === '--report') options.report = argv[++index]
    else if (argument === '--help' || argument === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
  if (options.slug !== undefined && (!options.slug || options.slug.includes('/') || options.slug === '.' || options.slug === '..')) {
    throw new Error('--slug must be one safe filename segment')
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer')
  return options
}

export function feedburnerId(targetUrl) {
  let url
  try {
    url = new URL(targetUrl)
  } catch {
    return undefined
  }
  if (url.hostname.toLowerCase() !== 'feedproxy.google.com') return undefined
  const segments = url.pathname.split('/').filter(Boolean)
  const redirectMarker = segments.indexOf('~3')
  if (segments[0] !== '~r' || redirectMarker < 2) return undefined
  return segments[redirectMarker - 1] || undefined
}

export function feedproxyEntryId(targetUrl) {
  try {
    const segments = new URL(targetUrl).pathname.split('/').filter(Boolean)
    const redirectMarker = segments.indexOf('~3')
    return redirectMarker >= 0 && segments.length > redirectMarker + 2 ? segments.at(-1) || undefined : undefined
  } catch {
    return undefined
  }
}

export function directSourceCandidate(link, feedId) {
  const entryId = feedproxyEntryId(link.targetUrl)
  const date = /^\d{4}-\d{2}-\d{2}T/.test(link.publishedAt || '') ? new Date(link.publishedAt) : undefined
  const year = date && !Number.isNaN(date.valueOf()) ? date.getUTCFullYear() : undefined
  const month = date && String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = date && String(date.getUTCDate()).padStart(2, '0')
  const localSlug = String(link.slug || '').replace(/-[\da-f]{10}$/i, '')
  if (feedId === 'timoni' && /^\d+$/.test(entryId || '')) {
    return { targetUrl: `https://blog.timoni.org/post/${entryId}`, evidence: 'timoni-tumblr-post-id' }
  }
  if (feedId === 'sethsmainblog' && /^\d{4}-\d{2}-\d{2}T/.test(link.publishedAt || '')) {
    const slug = (entryId || '').replace(/^sethsblog~/i, '').replace(/\.html$/i, '')
    if (/^[a-z0-9-]+$/i.test(slug)) {
      const date = new Date(link.publishedAt)
      if (!Number.isNaN(date.valueOf())) {
        return { targetUrl: `https://seths.blog/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${slug}.html`, evidence: 'seths-blog-date-and-slug' }
      }
    }
  }
  const wondermarkNumber = plainText(link.title).match(/^#(\d+);/)?.[1]
  if (feedId === 'wondermark' && wondermarkNumber) {
    return { targetUrl: `https://wondermark.com/c/${wondermarkNumber}/`, evidence: 'wondermark-comic-number' }
  }
  if (feedId === 'wondermark' && titleSlug(link.title)) {
    return { targetUrl: `https://wondermark.com/${titleSlug(link.title)}/`, evidence: 'wondermark-wordpress-title-slug' }
  }
  if (feedId === 'beMH' && /^\d+-[a-z0-9-]+$/i.test(entryId || '')) {
    return { targetUrl: `https://signalvnoise.com/posts/${entryId}`, evidence: 'signal-v-noise-original-path' }
  }
  if (feedId === 'tRaA' && /^\d{4}-\d{2}-\d{2}T/.test(link.publishedAt || '') && /^[a-z0-9-]+\.html$/i.test(entryId || '')) {
    const date = new Date(link.publishedAt)
    return { targetUrl: `https://analytics.googleblog.com/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${entryId}`, evidence: 'google-analytics-date-and-slug' }
  }
  if (feedId === 'parislemon' && /^\d+$/.test(entryId || '')) {
    return { targetUrl: `https://parislemon.com/post/${entryId}`, evidence: 'parislemon-tumblr-post-id' }
  }
  if (feedId === 'random_dullneon' && /^\d{4}-\d{2}-\d{2}T/.test(link.publishedAt || '') && /^[a-z0-9-]+\.html$/i.test(entryId || '')) {
    return { targetUrl: `https://dullneon.com/randomnotes/${year}/${month}/${entryId}`, evidence: 'dullneon-date-and-slug' }
  }
  if (feedId === 'subtraction' && year && titleSlug(link.title)) {
    return { targetUrl: `https://www.subtraction.com/${year}/${month}/${day}/${titleSlug(link.title)}/`, evidence: 'subtraction-date-and-title-slug' }
  }
  if (feedId === 'amDG' && year && /^[a-z0-9-]+\.html$/i.test(entryId || '')) {
    return { targetUrl: `https://developers.google.com/search/blog/${year}/${month}/${entryId.replace(/\.html$/i, '')}?hl=en`, evidence: 'google-search-central-date-and-slug' }
  }
  if (feedId === 'main' && /^[a-z0-9-]+$/i.test(entryId || '')) {
    return { targetUrl: `https://alistapart.com/blog/post/${entryId}/`, evidence: 'a-list-apart-blog-slug' }
  }
  if (feedId === 'bufferapp' && /^[a-z0-9-]+$/i.test(entryId || '')) {
    return { targetUrl: `https://buffer.com/resources/${entryId}/`, evidence: 'buffer-resources-slug' }
  }
  if (feedId === 'odWX' && year && /^[a-z0-9-]+\.html$/i.test(entryId || '')) {
    return { targetUrl: `https://macwright.com/${year}/${month}/${day}/${entryId.replace(/\.html$/i, '')}`, evidence: 'tom-macwright-date-and-slug' }
  }
  if (feedId === 'Quicksprout' && year && titleSlug(link.title)) {
    return { targetUrl: `https://www.quicksprout.com/${year}/${month}/${day}/${titleSlug(link.title)}/`, evidence: 'quicksprout-date-and-title-slug' }
  }
  if (feedId === 'white_african' && year && titleSlug(link.title)) {
    return { targetUrl: `http://whiteafrican.com/${year}/${month}/${day}/${titleSlug(link.title)}/`, evidence: 'white-african-date-and-title-slug' }
  }
  if (feedId === 'WhatGamesAre' && year && localSlug) {
    return { targetUrl: `http://www.whatgamesare.com/${year}/${month}/${localSlug}.html`, evidence: 'what-games-are-date-and-local-slug' }
  }
  if (feedId === 'InsideFacebook' && year && titleSlug(link.title)) {
    return { targetUrl: `http://www.insidefacebook.com/${year}/${month}/${day}/${titleSlug(link.title)}/`, evidence: 'inside-facebook-date-and-title-slug' }
  }
  if (feedId === 'lessdoing' && year && titleSlug(link.title)) {
    return { targetUrl: `http://www.lessdoing.com/${year}/${month}/${day}/${titleSlug(link.title)}/`, evidence: 'less-doing-date-and-title-slug' }
  }
  const bloggerDomains = { aDYs: 'adcontrarian.blogspot.com', SbSV: 'maps.googleblog.com', MKuf: 'googleblog.blogspot.com' }
  if (bloggerDomains[feedId] && year && /^[a-z0-9-]+\.html$/i.test(entryId || '')) {
    return { targetUrl: `https://${bloggerDomains[feedId]}/${year}/${month}/${entryId}`, evidence: `${feedId}-publisher-blogger-date-and-slug` }
  }
  if (feedId === 'Asymco' && year && titleSlug(link.title)) {
    return { targetUrl: `https://asymco.com/${year}/${month}/${day}/${titleSlug(link.title)}/`, evidence: 'asymco-date-and-title-slug' }
  }
  if (feedId === 'DavidSimon' && titleSlug(link.title)) {
    return { targetUrl: `https://davidsimon.com/${titleSlug(link.title)}/`, evidence: 'david-simon-title-slug' }
  }
  return undefined
}

export function plainText(value) {
  let text = String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })
      .replace(/&amp;(?=(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, '&')
    if (decoded === text) break
    text = decoded
  }
  return text
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([\da-f]+);/gi, (_, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&(?:lt|#60);/gi, '<')
    .replace(/&(?:gt|#62);/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function xmlField(item, name) {
  const lower = item.toLowerCase()
  const start = lower.indexOf(`<${name}`)
  if (start < 0) return ''
  const open = item.indexOf('>', start)
  const end = lower.indexOf(`</${name}>`, open + 1)
  return open < 0 || end < 0 ? '' : item.slice(open + 1, end)
}

export function parseRssItems(xml) {
  const items = []
  const lower = xml.toLowerCase()
  let offset = 0
  while (offset < xml.length) {
    const start = lower.indexOf('<item', offset)
    if (start < 0) break
    const end = lower.indexOf('</item>', start)
    if (end < 0) break
    const item = xml.slice(start, end + '</item>'.length)
    items.push({ title: plainText(xmlField(item, 'title')), targetUrl: plainText(xmlField(item, 'link')) })
    offset = end + '</item>'.length
  }
  return items
}

export function parseHtmlAnchors(html, baseUrl) {
  const items = []
  const seen = new Set()
  for (const match of String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = plainText(match[4])
    let targetUrl
    try {
      targetUrl = safeHttpUrl(new URL(plainText(match[1] || match[2] || match[3]), baseUrl).href)
    } catch {
      targetUrl = undefined
    }
    const key = `${normalizedTitle(title)}\n${targetUrl}`
    if (!title || !targetUrl || seen.has(key)) continue
    seen.add(key)
    items.push({ title, targetUrl, evidence: 'publisher-native-archive-exact-title' })
  }
  return items
}

const nativeArchives = {
  FunctioningForm: 'https://www.lukew.com/ff/archive.asp?mobile=&tag=',
  IgnoreTheCode: 'https://ignorethecode.net/blog/browse/',
  kklifestream: 'https://kk.org/kk/archives/',
}

export async function fetchNativeArchive(feedId, { fetchImpl = fetch } = {}) {
  const archiveUrl = nativeArchives[feedId]
  if (!archiveUrl) return { feedId, status: 'not-configured', items: [] }
  try {
    const response = await fetchWithTimeout(archiveUrl, fetchImpl)
    const html = await readBoundedText(response)
    return { feedId, status: response.status, items: response.ok ? parseHtmlAnchors(html, archiveUrl) : [] }
  } catch (error) {
    return { feedId, status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network-error', items: [] }
  }
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined
    return url.href
  } catch {
    return undefined
  }
}

export function recordableHttpUrl(value) {
  const safe = safeHttpUrl(value)
  if (!safe) return undefined
  const url = new URL(safe)
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:access_token|authorization|auth|token|password|api[_-]?key)$/i.test(key)) url.searchParams.delete(key)
  }
  return url.href
}

function normalizedTitle(value) {
  return plainText(value).normalize('NFKC').toLocaleLowerCase('en-US')
}

export function titleSlug(value) {
  return plainText(value).normalize('NFKD').replace(/[’']/g, '').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function publisherSearchCandidate(link, feedId, fetchImpl) {
  if (feedId !== 'wondermark' || plainText(link.title).match(/^#\d+;/)) return undefined
  try {
    const endpoint = new URL('https://wondermark.com/wp-json/wp/v2/search')
    endpoint.searchParams.set('search', plainText(link.title))
    endpoint.searchParams.set('per_page', '20')
    const response = await fetchWithTimeout(endpoint, fetchImpl)
    if (!response.ok) return undefined
    const expected = normalizedTitle(link.title)
    const matches = (await response.json()).filter((item) => normalizedTitle(item.title) === expected && safeHttpUrl(item.url))
    if (matches.length !== 1) return undefined
    return { targetUrl: safeHttpUrl(matches[0].url), evidence: 'wondermark-wordpress-api-exact-title' }
  } catch {
    return undefined
  }
}

export function exactFeedCandidates(link, feedItems) {
  const expectedTitle = normalizedTitle(link.title)
  const seen = new Set()
  return feedItems.flatMap((item) => {
    const candidateUrl = safeHttpUrl(item.targetUrl)
    if (!candidateUrl || normalizedTitle(item.title) !== expectedTitle || seen.has(candidateUrl)) return []
    seen.add(candidateUrl)
    return [{ targetUrl: candidateUrl, evidence: item.evidence || 'feedburner-exact-title' }]
  })
}

function meaningfulTokens(value) {
  return [...new Set(plainText(value).normalize('NFKC').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) || [])]
    .filter((token) => token.length > 2)
}

export function semanticMatch(link, html) {
  const pageText = plainText(html)
  const pageNormalized = pageText.normalize('NFKC').toLocaleLowerCase('en-US')
  const titleNormalized = plainText(link.title).normalize('NFKC').toLocaleLowerCase('en-US').replace(/…|\.\.\.$/g, '').trim()
  const titleTokens = meaningfulTokens(link.title)
  const matchedTitleTokens = titleTokens.filter((token) => pageNormalized.includes(token))
  const titleCoverage = titleTokens.length ? matchedTitleTokens.length / titleTokens.length : 0
  const descriptionTokens = meaningfulTokens(link.description).slice(0, 30)
  const matchedDescriptionTokens = descriptionTokens.filter((token) => pageNormalized.includes(token))
  const descriptionCoverage = descriptionTokens.length ? matchedDescriptionTokens.length / descriptionTokens.length : 0
  const exactTitle = titleNormalized.length >= 8 && pageNormalized.includes(titleNormalized)
  const matched = exactTitle || titleCoverage >= 0.8 || (titleCoverage >= 0.55 && descriptionTokens.length >= 6 && descriptionCoverage >= 0.7)
  return { matched, exactTitle, titleCoverage, descriptionCoverage }
}

async function readBoundedText(response) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximumResponseBytes) throw new Error('response-too-large')
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximumResponseBytes) {
      await reader.cancel()
      throw new Error('response-too-large')
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))
}

async function fetchWithTimeout(url, fetchImpl, timeoutMs = requestTimeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': userAgent, accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8' },
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchFeed(feedId, { fetchImpl = fetch } = {}) {
  try {
    const response = await fetchWithTimeout(`https://feeds.feedburner.com/${encodeURIComponent(feedId)}`, fetchImpl)
    const xml = await response.text()
    return { feedId, status: response.status, items: response.ok ? parseRssItems(xml) : [] }
  } catch (error) {
    return { feedId, status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network-error', items: [] }
  }
}

export async function validateDestination(targetUrl, { fetchImpl = fetch, link, timeoutMs = requestTimeoutMs } = {}) {
  try {
    const response = await fetchWithTimeout(targetUrl, fetchImpl, timeoutMs)
    const finalUrl = recordableHttpUrl(response.url)
    const html = await readBoundedText(response)
    const semantic = link ? semanticMatch(link, html) : { matched: true, reason: 'not-requested' }
    return { status: response.status, finalUrl, semantic, usable: response.status >= 200 && response.status < 300 && Boolean(finalUrl) && semantic.matched }
  } catch (error) {
    const timedOut = error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)
    const detail = error?.cause?.code || error?.code || error?.cause?.message || (error instanceof Error ? error.message : undefined)
    return { status: timedOut ? 'timeout' : 'network-error', error: detail, finalUrl: undefined, usable: false }
  }
}

async function archivedCandidate(candidateUrl, link, fetchImpl) {
  try {
    const endpoint = new URL('https://archive.org/wayback/available')
    endpoint.searchParams.set('url', candidateUrl)
    if (link.publishedAt) endpoint.searchParams.set('timestamp', String(link.publishedAt).replace(/\D/g, '').slice(0, 8))
    const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': userAgent } })
    if (!response.ok) return undefined
    const closest = (await response.json())?.archived_snapshots?.closest
    if (!closest?.available || String(closest.status) !== '200') return undefined
    const snapshot = new URL(closest.url)
    if (!['web.archive.org', 'www.web.archive.org'].includes(snapshot.hostname)) return undefined
    snapshot.protocol = 'https:'
    const validation = await validateDestination(snapshot.href, { fetchImpl, link })
    return validation.usable ? { targetUrl: snapshot.href, validation } : undefined
  } catch {
    return undefined
  }
}

export async function recoveryPlan(links, { fetchImpl = fetch } = {}) {
  const feeds = new Map()
  const archives = new Map()
  const actions = []
  for (const link of links) {
    const feedId = feedburnerId(link.targetUrl)
    if (!feedId) {
      actions.push({ slug: link.slug, action: 'skip', reason: 'not-feedproxy' })
      continue
    }
    const directCandidate = await publisherSearchCandidate(link, feedId, fetchImpl) || directSourceCandidate(link, feedId)
    if (!directCandidate && !feeds.has(feedId)) feeds.set(feedId, await fetchFeed(feedId, { fetchImpl }))
    if (!directCandidate && !archives.has(feedId)) archives.set(feedId, await fetchNativeArchive(feedId, { fetchImpl }))
    const feed = feeds.get(feedId)
    const archive = archives.get(feedId)
    const candidates = directCandidate ? [directCandidate] : exactFeedCandidates(link, [...(feed.items || []), ...(archive.items || [])])
    if (candidates.length !== 1) {
      actions.push({ slug: link.slug, action: 'unresolved', reason: candidates.length > 1 ? 'ambiguous-exact-title' : 'no-exact-title-match', feedId, feedStatus: feed?.status, archiveStatus: archive?.status })
      continue
    }
    const candidate = candidates[0]
    const validation = await validateDestination(candidate.targetUrl, { fetchImpl, link })
    if (!validation.usable) {
      const archived = await archivedCandidate(candidate.targetUrl, link, fetchImpl)
      if (archived) {
        actions.push({ slug: link.slug, action: 'recover', feedId, feedStatus: feed?.status, oldTargetUrl: link.targetUrl, targetUrl: archived.targetUrl, evidence: `${candidate.evidence}-internet-archive`, validation: archived.validation })
        continue
      }
      actions.push({ slug: link.slug, action: 'unresolved', reason: 'candidate-unusable', feedId, feedStatus: feed?.status, candidateUrl: candidate.targetUrl, validation })
      continue
    }
    actions.push({ slug: link.slug, action: 'recover', feedId, feedStatus: feed?.status, oldTargetUrl: link.targetUrl, targetUrl: validation.finalUrl || candidate.targetUrl, evidence: candidate.evidence, validation })
  }
  return actions
}

export function rewriteTargetUrl(markdown, expectedTargetUrl, replacementUrl) {
  const parsed = matter(markdown)
  if (parsed.data.targetUrl !== expectedTargetUrl) throw new Error('targetUrl changed since recovery was planned')
  const replacement = `targetUrl: ${JSON.stringify(replacementUrl)}`
  const rewritten = markdown.replace(/^targetUrl:\s*.*$/m, replacement)
  if (rewritten === markdown) throw new Error('targetUrl frontmatter line is missing')
  return rewritten
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

async function loadLinks(contentDirectory, options) {
  const files = await fg('*.md', { cwd: contentDirectory, absolute: true })
  const entries = await Promise.all(files.map(async (file) => {
    const markdown = await readFile(file, 'utf8')
    const { data } = matter(markdown)
    return { file, slug: path.basename(file, '.md'), title: plainText(data.title), description: plainText(data.description), targetUrl: data.targetUrl, publishedAt: data.publishedAt }
  }))
  return entries
    .filter((entry) => feedburnerId(entry.targetUrl))
    .filter((entry) => !options.slug || entry.slug === options.slug)
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .slice(0, options.limit)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const contentDirectory = path.join(process.cwd(), 'content', 'links')
  const links = await loadLinks(contentDirectory, options)
  const actions = await recoveryPlan(links)
  const recoveries = actions.filter((action) => action.action === 'recover')
  if (!options.dryRun) {
    for (const action of recoveries) {
      const link = links.find((entry) => entry.slug === action.slug)
      const original = await readFile(link.file, 'utf8')
      await writeAtomically(link.file, rewriteTargetUrl(original, action.oldTargetUrl, action.targetUrl))
    }
  }
  const report = { dryRun: options.dryRun, selected: links.length, recovered: recoveries.length, unresolved: actions.filter((action) => action.action === 'unresolved').length, actions }
  if (options.report) await writeAtomically(path.resolve(options.report), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ dryRun: report.dryRun, selected: report.selected, recovered: report.recovered, unresolved: report.unresolved, report: options.report }, null, 2))
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Feedproxy recovery failed')
    process.exit(1)
  })
}
