import assert from 'node:assert/strict'
import test from 'node:test'
import { noteFromFeedItem } from './note-feed.ts'
import { mergeNoteSources } from './note-collection.ts'

const item = () => ({ post: {
  uri: 'at://did:plc:example/app.bsky.feed.post/media-only',
  record: { text: '', createdAt: '2026-10-18T12:00:00Z' },
  embed: { $type: 'app.bsky.embed.images#view', images: [{ fullsize: 'https://example.com/photo.jpg', alt: 'A photograph' }] },
} })

test('valid media-only posts have permalinks without fabricated text', () => {
  const note = noteFromFeedItem(item())
  assert.ok(note)
  assert.equal(note.text, '')
  assert.equal(note.url, '/notes/2026/10/18/media-only/')
  assert.equal(note.media.length, 1)
})

test('media does not admit replies, reposts, malformed records or empty posts', () => {
  const reply = item(); reply.post.record.reply = {}
  const repost = item(); repost.reason = { $type: 'repost' }
  const empty = item(); delete empty.post.embed
  const malformed = item(); delete malformed.post.record.text
  const invalidDate = item(); invalidDate.post.record.createdAt = '2026-02-30T12:00:00Z'
  const invalidUri = item(); invalidUri.post.uri = 42
  for (const input of [null, reply, repost, empty, malformed, invalidDate, invalidUri]) assert.equal(noteFromFeedItem(input), undefined)
})

test('quote-only and unknown embeds retain a permalink and source fallback', () => {
  const quote = item()
  quote.post.embed = { $type: 'app.bsky.embed.record#view' }
  const note = noteFromFeedItem(quote)
  assert.ok(note)
  assert.deepEqual(note.media, [])
  assert.equal(note.source, 'bluesky')
  assert.equal(note.url, '/notes/2026/10/18/media-only/')
})

test('local media still wins when the same post appears in the remote feed', () => {
  const remote = noteFromFeedItem(item())
  const local = { ...remote, media: [{ ...remote.media[0], src: '/notes/local.jpg' }] }
  assert.equal(mergeNoteSources([local], [remote])[0].media[0].src, '/notes/local.jpg')
})
