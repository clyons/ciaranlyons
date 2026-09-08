import assert from 'node:assert/strict'
import test from 'node:test'
import { addStandardUri, deterministicRkey, expandedWritingText, publicationRecord, standardDocumentRecord } from './publish-standard-site.mjs'

test('Standard.site record keys are stable and path-specific', () => {
  assert.equal(
    deterministicRkey('document', '/writing/2026/09/06/example'),
    deterministicRkey('document', '/writing/2026/09/06/example'),
  )
  assert.notEqual(
    deterministicRkey('document', '/writing/2026/09/06/example'),
    deterministicRkey('document', '/writing/2026/09/06/other'),
  )
})

test('Standard.site URI front matter updates are idempotent', () => {
  const original = '---\ntitle: Example\n---\n\nBody\n'
  const once = addStandardUri(original, 'at://did:plc:test/site.standard.document/key')
  const twice = addStandardUri(once, 'at://did:plc:test/site.standard.document/key')
  assert.equal(once, twice)
  assert.equal((once.match(/^standardUri:/gm) ?? []).length, 1)
})

test('Link documents publish their local path and only local page text', () => {
  const record = standardDocumentRecord({
    path: '/links/2026/09/07/example-link-abc123',
    title: 'Example link',
    description: 'A short description.',
    body: 'My commentary.',
    date: '2026-09-07T12:00:00.000Z',
  }, 'at://did:plc:test/site.standard.publication/key')
  assert.equal(record.path, '/links/2026/09/07/example-link-abc123')
  assert.equal(record.textContent, 'A short description.\n\nMy commentary.')
})

test('Publication metadata preserves an uploaded icon reference', () => {
  const icon = { $type: 'blob', ref: { $link: 'bafytest' }, mimeType: 'image/jpeg', size: 123 }
  assert.deepEqual(publicationRecord(icon).icon, icon)
  assert.match(publicationRecord().description, /curated links/)
})

test('Standard.site Writing text expands Found Quotes in authored order', () => {
  const entry = {
    source: 'content/writing/collection.md',
    body: 'A short **introduction**.',
    foundQuoteSlugs: ['second', 'first'],
  }
  const quotes = [
    { slug: 'first', text: 'First thought.', attribution: 'First Person', source: 'First Work' },
    { slug: 'second', text: 'Second thought.', attribution: 'Second Person', source: 'Second Work' },
  ]

  assert.equal(
    expandedWritingText(entry, quotes),
    'A short introduction.\n\nFound quotes\n\nSecond thought.\n— Second Person, Second Work\n\nFirst thought.\n— First Person, First Work',
  )
})

test('ordinary Standard.site Writing text remains unchanged', () => {
  assert.equal(expandedWritingText({ source: 'content/writing/plain.md', body: 'Plain **Writing**.', foundQuoteSlugs: [] }, []), 'Plain Writing.')
})

test('Standard.site Writing expansion rejects missing Found Quotes', () => {
  assert.throws(
    () => expandedWritingText({ source: 'content/writing/broken.md', body: 'Intro.', foundQuoteSlugs: ['missing'] }, []),
    /content\/writing\/broken\.md: foundQuotes references missing quote slug missing/,
  )
})
