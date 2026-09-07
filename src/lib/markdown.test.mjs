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
