import assert from 'node:assert/strict'
import test from 'node:test'
import { addStandardUri, deterministicRkey } from './publish-standard-site.mjs'

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
