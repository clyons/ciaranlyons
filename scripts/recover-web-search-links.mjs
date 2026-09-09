import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { plainText, rewriteTargetUrl, safeHttpUrl, validateDestination } from './recover-feedproxy-links.mjs'

function parseArgs(argv) {
  const options = { applyReviewed: undefined, concurrency: 2, input: undefined, limit: undefined, offset: 0, report: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--apply-reviewed') options.applyReviewed = argv[++index]
    else if (argument === '--input') options.input = argv[++index]
    else if (argument === '--report') options.report = argv[++index]
    else if (argument === '--limit') options.limit = Number(argv[++index])
    else if (argument === '--offset') options.offset = Number(argv[++index])
    else if (argument === '--concurrency') options.concurrency = Number(argv[++index])
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!options.applyReviewed && (!options.input || !options.report)) throw new Error('--input and --report are required')
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) throw new Error('--concurrency must be between 1 and 8')
  if (!Number.isInteger(options.offset) || options.offset < 0) throw new Error('--offset must be a non-negative integer')
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer')
  return options
}

export function duckDuckGoResults(html) {
  const results = []
  const seen = new Set()
  for (const match of String(html).matchAll(/<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const redirect = new URL(plainText(match[1]), 'https://duckduckgo.com/')
      const targetUrl = safeHttpUrl(redirect.searchParams.get('uddg') || redirect.href)
      if (!targetUrl || seen.has(targetUrl) || ['duckduckgo.com', 'html.duckduckgo.com'].includes(new URL(targetUrl).hostname)) continue
      seen.add(targetUrl)
      results.push({ targetUrl, resultTitle: plainText(match[2]) })
    } catch {}
  }
  return results
}

function bingTarget(href) {
  try {
    const redirect = new URL(plainText(href), 'https://www.bing.com/')
    if (!redirect.hostname.endsWith('bing.com')) return safeHttpUrl(redirect.href)
    const encoded = redirect.searchParams.get('u')
    if (!encoded?.startsWith('a1')) return undefined
    return safeHttpUrl(Buffer.from(encoded.slice(2), 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
}

export function bingResults(html) {
  const results = []
  const seen = new Set()
  for (const match of String(html).matchAll(/<li\b[^>]*class=["'][^"']*b_algo[^"']*["'][\s\S]*?<h2\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const targetUrl = bingTarget(match[1])
    if (!targetUrl || seen.has(targetUrl)) continue
    seen.add(targetUrl)
    results.push({ targetUrl, resultTitle: plainText(match[2]) })
  }
  return results
}

function normalized(value) {
  return plainText(value).normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function acceptableSearchCandidate(entry, candidate, validation) {
  if (!validation.usable || !validation.semantic?.matched) return false
  const resultTitle = normalized(candidate.resultTitle)
  const savedTitle = normalized(entry.title)
  const titleAgreement = resultTitle === savedTitle || resultTitle.includes(savedTitle)
  const descriptionTokens = [...new Set(normalized(entry.description).split(' ').filter((token) => token.length > 2))]
  const bodyAgreement = descriptionTokens.length < 6 ? validation.semantic.exactTitle : validation.semantic.descriptionCoverage >= 0.45
  return titleAgreement && bodyAgreement
}

async function search(entry, fetchImpl = fetch) {
  const query = `"${plainText(entry.title).replaceAll('"', '')}" ${plainText(entry.sourceTitle)}`.trim()
  const endpoint = new URL('https://html.duckduckgo.com/html/')
  endpoint.searchParams.set('q', query)
  let response
  let provider = 'duckduckgo'
  try {
    response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(5_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; CiaranLyons-link-recovery/1.0; +https://ciaranlyons.com/links/)' } })
  } catch (error) {
    response = undefined
  }
  let candidates = response?.ok ? duckDuckGoResults(await response.text()) : []
  if (!candidates.length) {
    provider = 'bing'
    const bing = new URL('https://www.bing.com/search')
    bing.searchParams.set('q', query)
    bing.searchParams.set('ensearch', '1')
    bing.searchParams.set('cc', 'us')
    try {
      response = await fetchImpl(bing, { signal: AbortSignal.timeout(5_000), headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' } })
    } catch (error) {
      return { action: 'unresolved', reason: error instanceof Error ? `search-${error.name}` : 'search-error', provider }
    }
    if (!response.ok) return { action: 'unresolved', reason: `search-http-${response.status}`, provider }
    candidates = bingResults(await response.text())
  }
  candidates = candidates.filter((candidate) => {
    const resultTitle = normalized(candidate.resultTitle)
    const savedTitle = normalized(entry.title)
    return resultTitle === savedTitle || resultTitle.includes(savedTitle)
  }).slice(0, 1)
  const accepted = []
  for (const candidate of candidates) {
    if (candidate.targetUrl === entry.targetUrl) continue
    const validation = await validateDestination(candidate.targetUrl, { fetchImpl, link: entry, timeoutMs: 4_000 })
    if (acceptableSearchCandidate(entry, candidate, validation)) accepted.push({ ...candidate, validation, finalUrl: validation.finalUrl || candidate.targetUrl })
  }
  const unique = [...new Map(accepted.map((item) => [item.finalUrl, item])).values()]
  if (unique.length !== 1) return { action: 'unresolved', reason: unique.length ? 'ambiguous-semantic-search-results' : 'no-semantic-search-result', provider, candidatesChecked: candidates.length, accepted: unique }
  return { action: 'recover', targetUrl: unique[0].finalUrl, evidence: `${provider}-exact-title-and-content`, provider, resultTitle: unique[0].resultTitle, validation: unique[0].validation }
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

async function applyReviewed(reportPath) {
  const reviewed = JSON.parse(await readFile(path.resolve(reportPath), 'utf8'))
  let applied = 0
  let skipped = 0
  for (const action of reviewed.actions.filter((item) => item.action === 'recover')) {
    const file = path.join(process.cwd(), 'content', 'links', `${action.slug}.md`)
    const markdown = await readFile(file, 'utf8')
    if (matter(markdown).data.targetUrl !== action.oldTargetUrl) { skipped += 1; continue }
    await writeAtomically(file, rewriteTargetUrl(markdown, action.oldTargetUrl, action.targetUrl))
    applied += 1
  }
  console.log(JSON.stringify({ reviewed: reviewed.actions.filter((item) => item.action === 'recover').length, applied, skipped, source: reportPath }, null, 2))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.applyReviewed) return applyReviewed(options.applyReviewed)
  const input = JSON.parse(await readFile(path.resolve(options.input), 'utf8'))
  const queue = input.actions.filter((item) => item.action === 'unresolved').slice(options.offset, options.limit ? options.offset + options.limit : undefined)
  const actions = []
  let cursor = 0
  await Promise.all(Array.from({ length: options.concurrency }, async () => {
    while (cursor < queue.length) {
      const queued = queue[cursor++]
      const file = path.join(process.cwd(), 'content', 'links', `${queued.slug}.md`)
      const markdown = await readFile(file, 'utf8')
      const data = matter(markdown).data
      if (data.targetUrl !== queued.oldTargetUrl) { actions.push({ slug: queued.slug, action: 'skip', reason: 'target-changed' }); continue }
      const entry = { slug: queued.slug, targetUrl: data.targetUrl, title: plainText(data.title), description: plainText(data.description), sourceTitle: plainText(data.sourceTitle) }
      actions.push({ slug: queued.slug, oldTargetUrl: queued.oldTargetUrl, ...await search(entry) })
    }
  }))
  actions.sort((a, b) => a.slug.localeCompare(b.slug))
  const report = { selected: queue.length, recovered: actions.filter((item) => item.action === 'recover').length, unresolved: actions.filter((item) => item.action === 'unresolved').length, skipped: actions.filter((item) => item.action === 'skip').length, actions }
  await writeAtomically(path.resolve(options.report), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ selected: report.selected, recovered: report.recovered, unresolved: report.unresolved, skipped: report.skipped, report: options.report }, null, 2))
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) main().catch((error) => { console.error(error instanceof Error ? error.message : 'Web-search recovery failed'); process.exit(1) })
