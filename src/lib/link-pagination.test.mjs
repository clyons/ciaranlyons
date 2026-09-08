import assert from 'node:assert/strict'
import test from 'node:test'
import { extraLinkPageNumbers, linkArchivePageUrl, linkPageCount, LINKS_PER_PAGE, paginateLinks } from './link-pagination.ts'

test('Link pagination keeps archive documents bounded at 50 rows', () => {
  const items = Array.from({ length: 51 }, (_, index) => index)
  assert.equal(LINKS_PER_PAGE, 50)
  assert.deepEqual(paginateLinks(items, 1).items, items.slice(0, 50))
  assert.deepEqual(paginateLinks(items, 2).items, [50])
  assert.deepEqual(extraLinkPageNumbers(items.length), [2])
})

test('Link pagination handles empty and exact-boundary collections', () => {
  assert.equal(linkPageCount(0), 1)
  assert.equal(linkPageCount(1), 1)
  assert.equal(linkPageCount(50), 1)
  assert.equal(linkPageCount(51), 2)
  assert.deepEqual(paginateLinks([], 1).items, [])
  assert.throws(() => paginateLinks([], 2), /between 1 and 1/)
})

test('Link archive URLs preserve page one and add explicit later pages', () => {
  assert.equal(linkArchivePageUrl('/links/2026/', 1), '/links/2026/')
  assert.equal(linkArchivePageUrl('links/2026', 2), '/links/2026/page/2/')
  assert.throws(() => linkArchivePageUrl('/links/', 0), /positive integer/)
})
