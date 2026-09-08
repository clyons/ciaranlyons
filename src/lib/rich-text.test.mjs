import assert from 'node:assert/strict'
import test from 'node:test'
import { renderRichText } from './rich-text.ts'

test('rich text skips facets that split UTF-8 code points', () => {
  const text = 'A😀B'
  const html = renderRichText(text, [{
    index: { byteStart: 2, byteEnd: 5 },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' }],
  }])
  assert.equal(html, text)
  assert.doesNotMatch(html, /�|<a/)
})

test('rich text renders facets aligned to UTF-8 boundaries', () => {
  const html = renderRichText('A😀B', [{
    index: { byteStart: 1, byteEnd: 5 },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' }],
  }])
  assert.match(html, /<a[^>]+>😀<\/a>/)
})

test('rich text renders Bluesky mentions with a literal DID profile identifier', () => {
  const text = '@lea.verou.me'
  const html = renderRichText(text, [{
    index: { byteStart: 0, byteEnd: Buffer.byteLength(text) },
    features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:eagnfcoqnbtzpkglrtej6ayg' }],
  }])

  assert.match(html, /href="https:\/\/bsky\.app\/profile\/did:plc:eagnfcoqnbtzpkglrtej6ayg"/)
  assert.doesNotMatch(html, /did%3Aplc%3A/)
})
