import assert from 'node:assert/strict'
import test from 'node:test'
import { collectFeedlyStream, feedlyReviewCsv, linkFromFeedlyItem, linkMarkdown, normalizeTargetUrl, planLinkWrites, selectTargetUrl, stableLinkSlug } from './sync-feedly-links.mjs'

test('target URLs prefer canonical, remove tracking and fragments, and reject unsafe protocols', () => {
  assert.equal(selectTargetUrl({ canonicalUrl: 'https://EXAMPLE.com:443/post?utm_source=x&access_token=private&keep=1#part' }), 'https://example.com/post?keep=1')
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

test('Feedly text decoding handles nested HTML entities', () => {
  const result = linkFromFeedlyItem({
    id: 'nested-entities',
    title: 'Apple&amp;#39;s update',
    canonicalUrl: 'https://example.com/nested',
    summary: { content: 'It&amp;rsquo;s readable.' },
  }, { importedAt: '2026-09-07T10:00:00Z' })

  assert.equal(result.link.title, "Apple's update")
  assert.equal(result.link.description, 'It’s readable.')
})

test('authenticated saved-stream items use their top-level action timestamp', () => {
  const result = linkFromFeedlyItem({
    id: 'web-session-entry',
    title: 'Saved in the web app',
    canonicalUrl: 'https://example.com/web-session',
    actionTimestamp: Date.parse('2026-09-06T14:30:00Z'),
    published: Date.parse('2025-01-01T00:00:00Z'),
    tags: [{ id: 'user/test/tag/global.saved', label: 'Read later' }],
  }, { streamId: 'user/test/tag/global.saved' })

  assert.equal(result.link.savedAt, '2026-09-06T14:30:00.000Z')
  assert.equal(result.link.date, '2026-09-06')
  assert.equal(result.link.dateSource, 'saved')
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

test('review CSV is one RFC 4180 row per item and neutralizes spreadsheet formulas', () => {
  const items = [
    { id: '=unsafe-id', title: '+Formula, "title"', canonicalUrl: 'https://example.com/one', author: '@author' },
    { id: 'bad', title: 'Bad', canonicalUrl: 'javascript:bad' },
  ]
  const context = { importedAt: '2026-09-07T10:00:00Z' }
  const actions = planLinkWrites(items, context)
  const csv = feedlyReviewCsv(items, actions, context)
  assert.equal(csv.trimEnd().split('\r\n').length, 3)
  assert.match(csv, /"'\+Formula, ""title"""/)
  assert.match(csv, /"'@author"/)
  assert.match(csv, /"'=unsafe-id"/)
  assert.doesNotMatch(csv, /javascript:bad/)
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

test('new Links are enriched in a separate process after import, unless --no-enrich', async () => {
  const { enrichNewLinks, parseFeedlyArgs } = await import('./sync-feedly-links.mjs')
  assert.equal(parseFeedlyArgs([]).enrich, true)
  assert.equal(parseFeedlyArgs(['--no-enrich']).enrich, false)
  const lists = []
  const spawns = []
  const log = console.log
  const warn = console.warn
  console.log = () => {}
  console.warn = () => {}
  try {
    const ran = enrichNewLinks(['one', 'two'], { enrich: true }, { spawn: (...args) => { spawns.push(args); return { status: 1 } }, writeList: (file, text) => lists.push([file, text]) })
    assert.deepEqual(ran, { ran: true, status: 1 })
    assert.deepEqual(spawns[0][1].slice(0, 2), ['scripts/enrich-links.mjs', 'run'])
    assert.ok(spawns[0][1].includes('--apply'))
    assert.equal(lists[0][1], 'one\ntwo\n')
    assert.deepEqual(enrichNewLinks(['three'], { enrich: false }, { spawn: () => assert.fail('must not spawn'), writeList: (file, text) => lists.push([file, text]) }), { ran: false })
  } finally {
    console.log = log
    console.warn = warn
  }
})
