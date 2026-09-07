import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { noteFromFeedItem, noteMarkdown, readBoundedBody, safeDestination, verifyCid } from './sync-bsky-notes.mjs'

function feedItem(overrides = {}) {
  return {
    post: {
      uri: 'at://did:plc:example/app.bsky.feed.post/3example',
      cid: 'bafyreiexample',
      record: {
        text: 'A safe note',
        createdAt: '2026-09-06T12:34:56.000Z',
      },
    },
    ...overrides,
  }
}

test('safeDestination refuses traversal outside its root', () => {
  const root = path.resolve('/tmp/ciaranlyons-safe-root')
  assert.equal(safeDestination(root, 'notes', 'item.md'), path.join(root, 'notes', 'item.md'))
  assert.throws(() => safeDestination(root, '..', 'escape.md'), /outside the intended directory/)
})

test('note ingestion rejects unsafe remote path fields and impossible dates', () => {
  assert.equal(noteFromFeedItem(feedItem({
    post: {
      ...feedItem().post,
      uri: 'at://did:plc:example/app.bsky.feed.post/../../escape',
    },
  })), null)

  assert.equal(noteFromFeedItem(feedItem({
    post: {
      ...feedItem().post,
      uri: 'at://did:plc:example/app.bsky.feed.post/..',
    },
  })), null)

  assert.equal(noteFromFeedItem(feedItem({
    post: {
      ...feedItem().post,
      record: { ...feedItem().post.record, createdAt: '2026-02-30T12:34:56.000Z' },
    },
  })), null)
})

test('note ingestion drops media with unsafe CIDs', () => {
  const item = feedItem()
  item.post.record.embed = {
    $type: 'app.bsky.embed.images',
    images: [{ image: { ref: { $link: '../escape' }, mimeType: 'image/png' }, alt: '' }],
  }

  const note = noteFromFeedItem(item)
  assert.ok(note)
  assert.deepEqual(note.media, [])
  assert.match(note.file, /content\/notes\/2026-09-06-3example\.md$/)
})

test('download integrity validation rejects bytes that do not match the advertised CID', async () => {
  const expectedBytes = new TextEncoder().encode('expected')
  const digest = await sha256.digest(expectedBytes)
  const cid = CID.createV1(0x55, digest).toString()

  await verifyCid(expectedBytes, cid)
  await assert.rejects(verifyCid(new TextEncoder().encode('tampered'), cid), /CID mismatch/)
})

test('persisted post text preserves facet byte offsets at its edges', () => {
  const markdown = noteMarkdown({
    id: 'one', date: '2026-09-06T00:00:00Z', uri: 'at://did:plc:test/app.bsky.feed.post/one',
    cid: 'bafytest', originalUrl: 'https://bsky.app/', facets: [], media: [], text: '  exact text  ',
  })
  assert.match(markdown, /\n\n  exact text  \n$/)
})

test('bounded network reads reject both declared and streamed oversized bodies', async () => {
  await assert.rejects(readBoundedBody(new Response('small', {
    headers: { 'content-length': '100' },
  }), 10), /exceeds/)
  await assert.rejects(readBoundedBody(new Response('this body is too large'), 5), /exceeds/)
})
