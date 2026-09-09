import assert from 'node:assert/strict'
import test from 'node:test'
import { acceptableSearchCandidate, bingResults, duckDuckGoResults } from './recover-web-search-links.mjs'

test('DuckDuckGo result parsing extracts and deduplicates destination URLs', () => {
  const html = '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpost&amp;rut=x">Saved &amp; useful title</a><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpost">duplicate</a>'
  assert.deepEqual(duckDuckGoResults(html), [{ targetUrl: 'https://example.com/post', resultTitle: 'Saved & useful title' }])
})

test('Bing result parsing decodes result redirect destinations', () => {
  const encoded = Buffer.from('https://example.com/saved-post').toString('base64url')
  const html = `<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?u=a1${encoded}">Saved post</a></h2></li>`
  assert.deepEqual(bingResults(html), [{ targetUrl: 'https://example.com/saved-post', resultTitle: 'Saved post' }])
})

test('search candidate acceptance requires result-title and page-content agreement', () => {
  const entry = { title: 'Saved useful title', description: 'A detailed original excerpt with enough distinctive words for evidence.' }
  const candidate = { resultTitle: 'Saved useful title' }
  assert.equal(acceptableSearchCandidate(entry, candidate, { usable: true, semantic: { matched: true, exactTitle: true, descriptionCoverage: 0.8 } }), true)
  assert.equal(acceptableSearchCandidate(entry, { resultTitle: 'Unrelated page' }, { usable: true, semantic: { matched: true, exactTitle: true, descriptionCoverage: 0.8 } }), false)
  assert.equal(acceptableSearchCandidate(entry, candidate, { usable: true, semantic: { matched: true, exactTitle: true, descriptionCoverage: 0.1 } }), false)
  assert.equal(acceptableSearchCandidate({ title: 'Glass', description: '' }, { resultTitle: 'Glass - Wikipedia' }, { usable: true, semantic: { matched: true, exactTitle: false, descriptionCoverage: 0 } }), false)
})
