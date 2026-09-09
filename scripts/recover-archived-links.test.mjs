import assert from 'node:assert/strict'
import test from 'node:test'
import { archiveSnapshot } from './recover-archived-links.mjs'

test('archive snapshots require an available 200 Wayback URL', () => {
  assert.equal(archiveSnapshot({ archived_snapshots: { closest: { available: true, status: '200', url: 'http://web.archive.org/web/20200101000000/https://example.com/post' } } }), 'https://web.archive.org/web/20200101000000/https://example.com/post')
  assert.equal(archiveSnapshot({ archived_snapshots: {} }), undefined)
  assert.equal(archiveSnapshot({ archived_snapshots: { closest: { available: true, status: '200', url: 'https://evil.example/post' } } }), undefined)
})
