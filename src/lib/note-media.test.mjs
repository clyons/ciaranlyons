import assert from 'node:assert/strict'
import test from 'node:test'
import { parseNoteMedia, parseLocalNoteMedia, positiveDimension } from './note-media.ts'

const image = { fullsize: 'https://example.com/photo.jpg', thumb: 'https://example.com/thumb.jpg', alt: 'A portrait', aspectRatio: { width: 600, height: 900 } }

test('remote images and galleries retain order and skip unsupported children', () => {
  const legacy = parseNoteMedia({ $type: 'app.bsky.embed.images#view', images: [image] })
  assert.deepEqual(legacy[0], { type: 'image', src: image.fullsize, alt: image.alt, width: 600, height: 900 })
  const gallery = parseNoteMedia({ $type: 'app.bsky.embed.gallery#view', items: [
    ...Array.from({ length: 6 }, (_, i) => ({ ...image, $type: 'app.bsky.embed.gallery#viewImage', fullsize: `https://example.com/${i}.jpg` })),
    { $type: 'app.bsky.embed.gallery#futureVideo', fullsize: 'https://example.com/unknown' },
    { ...image, $type: 'app.bsky.embed.gallery#viewImage', fullsize: 'javascript:alert(1)', thumbnail: 'https://example.com/safe.jpg' },
  ] })
  assert.equal(gallery.length, 7)
  assert.equal(gallery[5].src, 'https://example.com/5.jpg')
  assert.equal(gallery[6].src, 'https://example.com/safe.jpg')
})

test('recordWithMedia preserves HLS poster and presentation without converting a playlist to MP4', () => {
  const [media] = parseNoteMedia({ $type: 'app.bsky.embed.recordWithMedia#view', media: {
    $type: 'app.bsky.embed.video#view', playlist: 'https://example.com/video.m3u8', thumbnail: 'https://example.com/poster.jpg',
    alt: 'An animation', presentation: 'gif', aspectRatio: { width: -1, height: Infinity },
  } })
  assert.equal(media.type, 'video')
  assert.equal(media.mimeType, 'application/vnd.apple.mpegurl')
  assert.equal(media.poster, 'https://example.com/poster.jpg')
  assert.equal(media.presentation, 'gif')
  assert.equal(media.width, undefined)
  assert.equal(media.height, undefined)
})

test('malformed embeds, unsafe sources, and invalid dimensions cannot leak into markup', () => {
  for (const value of [null, [], {}, { $type: 'unknown' }, { $type: 'app.bsky.embed.video#view', playlist: 'data:video/mp4,unsafe' }, { $type: 'app.bsky.embed.images#view', images: [null, { fullsize: 'javascript:alert(1)' }] }]) {
    assert.deepEqual(parseNoteMedia(value), [])
  }
  for (const value of [0, -1, NaN, Infinity, '1200', undefined]) assert.equal(positiveDimension(value), undefined)
  assert.equal(positiveDimension(1200), 1200)
})

test('local frontmatter preserves existing file sources and optional poster/presentation', () => {
  const [media] = parseLocalNoteMedia([{ type: 'video', src: '/notes/clip.mp4', mimeType: 'video/mp4', width: 1920, height: 1080, poster: '/notes/poster.jpg', presentation: 'gif' }], 'note.md')
  assert.equal(media.src, '/notes/clip.mp4')
  assert.equal(media.poster, '/notes/poster.jpg')
  assert.equal(media.presentation, 'gif')
  assert.equal(media.width, 1920)
  assert.throws(() => parseLocalNoteMedia([{ ...media, poster: 'javascript:alert(1)' }], 'note.md'), /media.poster/)
})
