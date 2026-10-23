import assert from 'node:assert/strict'
import test from 'node:test'
import { noteParagraphs } from './note-preview.ts'

test('preview preserves original UTF-8 offsets before changing paragraph layout', () => {
  const text = '  🐉 Hello @example.com\r\n\r\n\r\nRead this.\r\n\r\nhttps://example.com/post'
  const start = Buffer.byteLength(text.slice(0, text.indexOf('@')))
  const facets = [{ index: { byteStart: start, byteEnd: start + Buffer.byteLength('@example.com') }, features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:example' }] }]
  const paragraphs = noteParagraphs(text, facets, true)
  assert.equal(paragraphs.length, 2)
  assert.match(paragraphs[0], /^  🐉 Hello <a href="https:\/\/bsky.app\/profile\/did:plc:example"/)
  assert.match(paragraphs[0], />@example.com<\/a>$/)
  assert.equal(paragraphs[1], 'Read this.')
  assert.equal(noteParagraphs(text, facets).length, 3)
})

test('URL-only and media-only notes do not become empty previews or empty paragraphs', () => {
  assert.deepEqual(noteParagraphs('https://example.com/post', [], true), ['https://example.com/post'])
  assert.deepEqual(noteParagraphs(' \n\n ', [], true), [])
  assert.deepEqual(noteParagraphs('Text\nwithin a paragraph\n\nMore.', [], true), ['Text<br />within a paragraph', 'More.'])
})
