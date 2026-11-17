import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyHttpFailure, createHostPacer, fetchDestination } from './fetch.mjs'

function response(body, { status = 200, type = 'text/html; charset=utf-8', url = 'https://example.com/final', headers = {} } = {}) {
  const value = new Response(body, { status, headers: { 'content-type': type, ...headers } })
  Object.defineProperty(value, 'url', { value: url })
  return value
}

const page = `<html><head><title>T</title></head><body><article>${Array.from({ length: 30 }, (_, index) => `<p>Readable sentence number ${index} about the topic.</p>`).join('')}</article></body></html>`

test('a readable page becomes extracted text with the final URL recorded', async () => {
  const result = await fetchDestination('https://example.com/start', { fetchImpl: async () => response(page, { url: 'https://example.com/final?access_token=secret' }) })
  assert.equal(result.ok, true)
  assert.equal(result.status, 200)
  assert.equal(result.finalUrl, 'https://example.com/final')
  assert.match(result.text, /Readable sentence/)
  assert.ok(result.wordCount > 80)
})

test('HTTP failures are classified as permanent or retryable', async () => {
  assert.deepEqual(classifyHttpFailure(404), { category: 'broken', retryable: false })
  assert.deepEqual(classifyHttpFailure(403), { category: 'access-restricted', retryable: false })
  assert.deepEqual(classifyHttpFailure(402), { category: 'paywalled', retryable: false })
  assert.deepEqual(classifyHttpFailure(503), { category: 'server-error', retryable: true })
  const limited = await fetchDestination('https://example.com/', { fetchImpl: async () => response('slow down', { status: 429, headers: { 'retry-after': '120' } }) })
  assert.equal(limited.ok, false)
  assert.equal(limited.category, 'rate-limited')
  assert.equal(limited.retryable, true)
  assert.equal(limited.retryAfterSeconds, 120)
})

test('timeouts, DNS failures, PDFs, and other media are reported without throwing', async () => {
  const timeout = await fetchDestination('https://example.com/', { fetchImpl: async () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }) } })
  assert.equal(timeout.category, 'timeout')
  assert.equal(timeout.retryable, true)
  const dns = await fetchDestination('https://gone.example/', { fetchImpl: async () => { throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }) } })
  assert.equal(dns.category, 'unreachable')
  assert.equal(dns.retryable, false)
  const pdf = await fetchDestination('https://example.com/paper.pdf', { fetchImpl: async () => response('%PDF-1.7', { type: 'application/pdf' }) })
  assert.equal(pdf.category, 'unsupported-pdf')
  const image = await fetchDestination('https://example.com/a.png', { fetchImpl: async () => response('png', { type: 'image/png' }) })
  assert.equal(image.category, 'unsupported-content-type')
})

test('oversized responses are refused', async () => {
  const result = await fetchDestination('https://example.com/', { maximumBytes: 10, fetchImpl: async () => response('x'.repeat(100)) })
  assert.equal(result.ok, false)
  assert.equal(result.category, 'too-large')
})

test('requests to one host are serialised and spaced; other hosts are not delayed', async () => {
  let clock = 1_000
  const sleeps = []
  const pacer = createHostPacer({ intervalMs: 500, now: () => clock, sleep: async (ms) => { sleeps.push(ms); clock += ms } })
  const order = []
  await Promise.all([
    pacer('https://a.example/1', async () => { order.push('a1'); clock += 100 }),
    pacer('https://a.example/2', async () => { order.push('a2') }),
    pacer('https://b.example/1', async () => { order.push('b1') }),
  ])
  assert.deepEqual(order.filter((item) => item.startsWith('a')), ['a1', 'a2'])
  assert.deepEqual(sleeps, [500])
})
