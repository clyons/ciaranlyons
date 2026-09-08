import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalInternalUrl } from './internal-links.ts'

test('canonicalInternalUrl accepts only canonical site URLs', () => {
  assert.equal(canonicalInternalUrl('https://ciaranlyons.com/writing/2026/09/07/found-quotes-wagmi'), '/writing/2026/09/07/found-quotes-wagmi/')
  assert.equal(canonicalInternalUrl('/projects/#til'), '/projects/#til')
  assert.equal(canonicalInternalUrl('https://example.com/writing/'), undefined)
})
