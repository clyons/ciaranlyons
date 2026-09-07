import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePreviewRef } from './preview-ref.mjs'

test('normalizes a remote development ref and a feature ref', () => {
  assert.equal(normalizePreviewRef('origin/development'), 'development')
  assert.equal(normalizePreviewRef('refs/heads/feature/deploy-preview'), 'feature/deploy-preview')
})

test('rejects main and unsafe branch names', () => {
  for (const ref of ['', 'main', 'origin/main', '../main', 'feature//preview', 'feature preview', 'feature.lock']) {
    assert.throws(() => normalizePreviewRef(ref), /Preview (ref|deployments)/)
  }
})
