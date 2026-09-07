import assert from 'node:assert/strict'
import test from 'node:test'
import { renderFeed, requireSiteUrl } from './feeds.ts'

test('feeds omit missing dates and reject invalid dates deterministically', () => {
  const withoutDate = renderFeed('Title', 'Description', 'https://example.com', [{ title: 'Item', description: 'Body', link: '/item' }])
  assert.doesNotMatch(withoutDate, /<pubDate>/)
  assert.throws(() => renderFeed('Title', 'Description', 'https://example.com', [{ title: 'Item', description: 'Body', link: '/item', pubDate: 'bad' }]), /Invalid feed publication date/)
})

test('feeds remove forbidden XML control characters', () => {
  const xml = renderFeed('Title', 'Description', 'https://example.com', [{ title: 'Bad\u0001 title', description: 'Body', link: '/item' }])
  assert.doesNotMatch(xml, /\u0001/)
})

test('feed site URL must be configured', () => {
  assert.equal(requireSiteUrl(new URL('https://example.com')), 'https://example.com/')
  assert.throws(() => requireSiteUrl(undefined), /must be configured/)
})
