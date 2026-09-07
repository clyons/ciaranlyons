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
