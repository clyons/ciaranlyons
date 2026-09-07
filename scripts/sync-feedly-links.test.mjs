import assert from 'node:assert/strict'
import test from 'node:test'
import { collectFeedlyStream, linkFromFeedlyItem, linkMarkdown, normalizeTargetUrl, planLinkWrites, selectTargetUrl, stableLinkSlug } from './sync-feedly-links.mjs'

test('target URLs prefer canonical, remove tracking and fragments, and reject unsafe protocols', () => {
  assert.equal(selectTargetUrl({ canonicalUrl: 'https://EXAMPLE.com:443/post?utm_source=x&keep=1#part' }), 'https://example.com/post?keep=1')
  assert.equal(selectTargetUrl({ canonicalUrl: 'javascript:alert(1)', alternate: [{ type: 'text/html', href: 'https://example.org/fallback' }] }), 'https://example.org/fallback')
  assert.equal(selectTargetUrl({ alternate: [{ type: 'application/json', href: 'https://example.org/nope' }] }), undefined)
  assert.throws(() => normalizeTargetUrl('https://user:pass@example.com'), /without credentials/)
})

test('Feedly items map save dates, metadata, sanitized excerpts, and stable slugs', () => {
  const item = {
    id: 'entry-one',
    title: '<em>A useful link</em>',
    canonicalUrl: 'https://example.com/useful',
    published: Date.parse('2026-08-01T10:00:00Z'),
    summary: { content: '<p>Hello <script>bad()</script><strong>world</strong>.</p>' },
    origin: { title: 'Example' },
    tags: [{ id: 'user/test/tag/global.saved', actionTimestamp: Date.parse('2026-09-01T12:00:00Z') }, { id: 'user/test/tag/design', label: 'Design' }],
  }
  const first = linkFromFeedlyItem(item, { streamId: 'user/test/tag/global.saved' })
  const second = linkFromFeedlyItem(item, { streamId: 'user/test/tag/global.saved' })
  assert.equal(first.link.date, '2026-09-01')
  assert.equal(first.link.dateSource, 'saved')
  assert.equal(first.link.description, 'Hello world.')
  assert.deepEqual(first.link.tags, ['Design'])
  assert.equal(first.link.slug, second.link.slug)
  assert.equal(first.link.slug, stableLinkSlug('A useful link', 'entry-one'))
})

test('missing save timestamps use an explicit deterministic fallback', () => {
  const fromPublished = linkFromFeedlyItem({ id: 'published', title: 'Published', canonicalUrl: 'https://example.com/p', published: Date.parse('2026-08-02T00:00:00Z') })
  assert.equal(fromPublished.link.dateSource, 'published')
  assert.equal(fromPublished.link.date, '2026-08-02')
  const fromImport = linkFromFeedlyItem({ id: 'imported', title: 'Imported', canonicalUrl: 'https://example.com/i' }, { importedAt: '2026-09-07T10:00:00Z' })
  assert.equal(fromImport.link.dateSource, 'imported')
  assert.equal(fromImport.link.date, '2026-09-07')
})

test('generated frontmatter safely quotes scalar values and omits article content', () => {
  const result = linkFromFeedlyItem({ id: 'quoted', title: 'A: "quoted" title', canonicalUrl: 'https://example.com/q', summary: { content: 'Short.' }, fullContent: 'SECRET FULL BODY' }, { importedAt: '2026-09-07T10:00:00Z' })
  const markdown = linkMarkdown(result.link)
  assert.match(markdown, /^title: "A: \\"quoted\\" title"$/m)
  assert.doesNotMatch(markdown, /SECRET FULL BODY/)
})

test('write planning rejects invalid items and deduplicates IDs and normalized URLs', () => {
  const actions = planLinkWrites([
    { id: 'one', title: 'One', canonicalUrl: 'https://example.com/post?utm_source=x' },
    { id: 'two', title: 'Two', canonicalUrl: 'https://example.com/post' },
    { id: 'three', title: 'Three', canonicalUrl: 'javascript:bad' },
  ], { importedAt: '2026-09-07T10:00:00Z' })
  assert.deepEqual(actions.map((item) => item.action), ['write', 'skip', 'reject'])
})

test('Feedly collection follows continuations and reports repeated cursors', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(String(url))
    const pageTwo = String(url).includes('continuation=next')
    return new Response(JSON.stringify(pageTwo ? { items: [{ id: 'two' }] } : { items: [{ id: 'one' }], continuation: 'next' }), { status: 200 })
  }
  const result = await collectFeedlyStream({ token: 'secret', streamId: 'user/test/tag/global.saved', fetchImpl })
  assert.deepEqual(result.items.map((item) => item.id), ['one', 'two'])
  assert.equal(calls.length, 2)
  assert.match(calls[1], /continuation=next/)

  const repeated = async () => new Response(JSON.stringify({ items: [], continuation: 'same' }), { status: 200 })
  await assert.rejects(() => collectFeedlyStream({ token: 'secret', streamId: 'user/test/tag/global.saved', fetchImpl: repeated }), /repeated continuation/)
})

test('Feedly auth errors do not include credentials', async () => {
  const fetchImpl = async () => new Response('denied token=secret', { status: 403 })
  await assert.rejects(() => collectFeedlyStream({ token: 'top-secret', streamId: 'user/test/tag/global.saved', fetchImpl }), (error) => {
    assert.match(error.message, /403/)
    assert.doesNotMatch(error.message, /top-secret|denied token/)
    return true
  })
})
