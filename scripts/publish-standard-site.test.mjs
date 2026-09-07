import assert from 'node:assert/strict'
import test from 'node:test'
import { addStandardUri, deterministicRkey, publicationRecord, standardDocumentRecord } from './publish-standard-site.mjs'

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
