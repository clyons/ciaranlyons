import assert from 'node:assert/strict'
import test from 'node:test'
import { renderMarkdown } from './markdown.ts'

test('Markdown rendering removes executable HTML and unsafe protocols', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n[x](javascript:alert(1))\n<img src="data:text/html,bad" onerror="alert(1)">')
  assert.doesNotMatch(html, /<script|onerror|javascript:|data:text/i)
  assert.match(html, />x<|<p>x/)
})

test('Markdown rendering preserves ordinary prose and HTTPS links', () => {
  const html = renderMarkdown('## Heading\n\n[Safe](https://example.com)')
  assert.match(html, /<h2>Heading<\/h2>/)
  assert.match(html, /href="https:\/\/example\.com"/)
})


test('Markdown video keeps accessible playback and rejects executable attributes', () => {
  const html = renderMarkdown('<video src="https://example.com/demo.mp4" poster="https://example.com/poster.jpg" controls playsinline preload="metadata" width="540" height="675" aria-label="Dragon demo" onerror="alert(1)" style="position:fixed"><a href="https://example.com">Watch demo</a></video>')
  assert.match(html, /<video[^>]*src="https:\/\/example.com\/demo.mp4"/)
  assert.match(html, /controls/)
  assert.match(html, /aria-label="Dragon demo"/)
  assert.match(html, /Watch demo/)
  assert.doesNotMatch(html, /onerror|style=/)
  const unsafe = renderMarkdown('<video src="javascript:alert(1)" poster="data:text/html,bad" onplay="alert(1)"></video>')
  assert.doesNotMatch(unsafe, /javascript:|data:|onplay/)
})
