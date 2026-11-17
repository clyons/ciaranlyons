// Stage 1: retrieve a Link destination and reduce it to extracted content. Network policy
// (timeouts, size limits, per-host pacing, failure categories) lives here; the HTML
// extractor and the content cache are separate modules.
import { recordableHttpUrl } from '../recover-feedproxy-links.mjs'
import { extractHtml, extractPlainText } from './extract.mjs'

export const userAgent = 'Mozilla/5.0 (compatible; CiaranLyons-link-enrichment/1.0; +https://ciaranlyons.com/links/)'
export const defaultFetchOptions = { timeoutMs: 15_000, maximumBytes: 3 * 1024 * 1024, perHostIntervalMs: 1_500 }

// A failure is "retryable" when the same request may plausibly succeed later without any
// change to the Link: timeouts, rate limits, and server errors. Broken or restricted
// destinations are recorded but not retried by `--failed` unless asked.
export function classifyHttpFailure(status) {
  if (status === 404 || status === 410) return { category: 'broken', retryable: false }
  if (status === 401 || status === 407) return { category: 'authentication-required', retryable: false }
  if (status === 402) return { category: 'paywalled', retryable: false }
  if (status === 403 || status === 451) return { category: 'access-restricted', retryable: false }
  if (status === 429) return { category: 'rate-limited', retryable: true }
  if (status === 408 || status >= 500) return { category: 'server-error', retryable: true }
  return { category: 'http-error', retryable: false }
}

export function classifyNetworkError(error) {
  const detail = String(error?.cause?.code || error?.code || error?.cause?.message || error?.message || 'network-error')
  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) return { category: 'timeout', retryable: true, detail: 'timeout' }
  if (/ENOTFOUND|EAI_NONAME|ERR_TLS_CERT|CERT_|SSL|DEPTH_ZERO|ECONNREFUSED|ENETUNREACH|redirect count exceeded/i.test(detail)) return { category: 'unreachable', retryable: false, detail }
  if (detail === 'response-too-large') return { category: 'too-large', retryable: false, detail }
  return { category: 'network-error', retryable: true, detail }
}

function retryAfterSeconds(response) {
  const value = response.headers.get('retry-after')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds))
  const at = Date.parse(value)
  return Number.isFinite(at) ? Math.max(0, Math.round((at - Date.now()) / 1000)) : undefined
}

async function readBoundedBytes(response, maximumBytes) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error('response-too-large')
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maximumBytes) {
      await reader.cancel().catch(() => {})
      throw new Error('response-too-large')
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks, size)
}

function charsetOf(contentType) {
  const match = /charset\s*=\s*"?([\w-]+)/i.exec(contentType || '')
  try {
    return match ? new TextDecoder(match[1].toLowerCase()).encoding : 'utf-8'
  } catch {
    return 'utf-8'
  }
}

export function mediaType(contentType) {
  return String(contentType || '').split(';')[0].trim().toLowerCase()
}

// Serialises requests to the same host and spaces them out, so a batch over many Links from
// one publisher (Wondermark has dozens) never looks like a burst.
export function createHostPacer({ intervalMs = defaultFetchOptions.perHostIntervalMs, now = () => Date.now(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const queues = new Map()
  return async function paced(url, task) {
    const host = new URL(url).hostname.toLowerCase()
    const previous = queues.get(host) ?? Promise.resolve(0)
    let release
    const next = new Promise((resolve) => { release = resolve })
    queues.set(host, previous.then(() => next))
    const lastFinishedAt = await previous
    const wait = lastFinishedAt + intervalMs - now()
    if (lastFinishedAt && wait > 0) await sleep(wait)
    try {
      return await task()
    } finally {
      release(now())
    }
  }
}

// Returns a plain, serialisable record. Never throws for destination problems; those become
// `ok: false` with a category so the caller can persist the failure and move on.
export async function fetchDestination(targetUrl, { fetchImpl = fetch, timeoutMs = defaultFetchOptions.timeoutMs, maximumBytes = defaultFetchOptions.maximumBytes, now = () => new Date() } = {}) {
  const fetchedAt = now().toISOString()
  let response
  try {
    response = await fetchImpl(targetUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,application/pdf;q=0.5,*/*;q=0.3',
        'accept-language': 'en;q=0.9,*;q=0.5',
      },
    })
  } catch (error) {
    const failure = classifyNetworkError(error)
    return { ok: false, fetchedAt, status: failure.category, ...failure }
  }

  const finalUrl = recordableHttpUrl(response.url) || recordableHttpUrl(targetUrl)
  const type = mediaType(response.headers.get('content-type'))
  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    const failure = classifyHttpFailure(response.status)
    return { ok: false, fetchedAt, status: response.status, finalUrl, contentType: type || undefined, ...failure, retryAfterSeconds: retryAfterSeconds(response) }
  }

  if (type === 'application/pdf') {
    await response.body?.cancel().catch(() => {})
    return { ok: false, fetchedAt, status: response.status, finalUrl, contentType: type, category: 'unsupported-pdf', retryable: false }
  }
  const textual = !type || type === 'text/html' || type === 'application/xhtml+xml' || type === 'text/plain' || type.endsWith('+xml')
  if (!textual) {
    await response.body?.cancel().catch(() => {})
    return { ok: false, fetchedAt, status: response.status, finalUrl, contentType: type, category: 'unsupported-content-type', retryable: false }
  }

  let body
  try {
    body = new TextDecoder(charsetOf(response.headers.get('content-type'))).decode(await readBoundedBytes(response, maximumBytes))
  } catch (error) {
    const failure = classifyNetworkError(error)
    return { ok: false, fetchedAt, status: response.status, finalUrl, contentType: type, ...failure }
  }
  const extracted = type === 'text/plain' ? extractPlainText(body) : extractHtml(body, finalUrl || targetUrl)
  return {
    ok: true,
    fetchedAt,
    status: response.status,
    finalUrl,
    contentType: type || 'text/html',
    text: extracted.text,
    wordCount: extracted.wordCount,
    contentHash: extracted.contentHash,
    metadata: extracted.metadata,
  }
}
