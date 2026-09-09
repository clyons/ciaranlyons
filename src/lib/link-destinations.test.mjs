import assert from 'node:assert/strict'
import test from 'node:test'
import { destinationAuditMetadata, destinationLinkRel } from './link-destinations.ts'

test('destination audit metadata requires a known status and checked timestamp together', () => {
  assert.deepEqual(destinationAuditMetadata(undefined, undefined, 'link.md'), {})
  assert.deepEqual(
    destinationAuditMetadata('semantic-mismatch', '2026-09-09T05:08:28.279Z', 'link.md'),
    { destinationStatus: 'semantic-mismatch', destinationLastCheckedAt: '2026-09-09T05:08:28.279Z' },
  )
  assert.throws(() => destinationAuditMetadata('mystery', '2026-09-09T05:08:28.279Z', 'link.md'), /destinationStatus/)
  assert.throws(() => destinationAuditMetadata('broken', undefined, 'link.md'), /destinationLastCheckedAt is required/)
})

test('only verified destinations receive an ordinary external link relationship', () => {
  assert.equal(destinationLinkRel('verified'), 'external')
  assert.equal(destinationLinkRel('broken'), 'external nofollow')
  assert.equal(destinationLinkRel('semantic-mismatch'), 'external nofollow')
  assert.equal(destinationLinkRel(undefined), 'external nofollow')
})
