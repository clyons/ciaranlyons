import type { NoteEntry, NoteMedia } from '../../../../src/lib/content'

const image = (name: string, width = 640, height = 800): NoteMedia => ({ type: 'image', src: `/media/${name}.png`, alt: `${name} landscape illustration`, width, height })
const video = (hls = false): NoteMedia => ({ type: 'video', src: hls ? '/media/stream.m3u8' : '/media/clip.mp4', mimeType: hls ? 'application/vnd.apple.mpegurl' : 'video/mp4', poster: '/media/poster.png', alt: 'Four-second animated color test pattern', width: 640, height: 360 })

function note(id: string, text: string, media: NoteMedia[], day = '18'): NoteEntry {
  return { id, text, media, date: `2026-10-${day}T12:00:00Z`, year: '2026', month: '10', day, source: 'bluesky', facets: [], originalUrl: 'https://bsky.app/profile/ciaranlyons.com', url: `/note/${id}/` }
}

export const cases: Record<string, NoteEntry> = {
  book: {
    ...note('book', 'The robots made me do it.', [{ type: 'image', src: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:bi2irbzgh2fzqvuuewkju2xf/bafkreih2ggq6xw3hj6yxfoo3iurejacw5pskolresu333tatmytmtjc6le', alt: 'Photo of a paperback of Susanna Clarke’s Piranesi', width: 2857, height: 4000 }]),
    originalUrl: 'https://bsky.app/profile/did:plc:bi2irbzgh2fzqvuuewkju2xf/post/3my6exyx7ak26',
  },
  dragon: {
    ...note('dragon', 'Experimenting with Three.js and Box3D.', [{ type: 'video', src: '/media/dragon.mp4', mimeType: 'video/mp4', poster: '/media/dragon-poster.jpg', alt: 'An articulated dragon in a Three.js and Box3D playground', width: 1080, height: 1350 }], '14'),
    originalUrl: 'https://bsky.app/profile/did:plc:bi2irbzgh2fzqvuuewkju2xf/post/3mvh2nuog47av',
  },
  portrait: note('portrait', 'The robots made me do it.', [image('portrait')]),
  landscape: note('landscape', 'A little space to think.', [image('landscape', 1200, 600)]),
  square: note('square', 'An experiment in perspective.', [image('square', 600, 600)]),
  gallery: note('gallery', 'A few different perspectives.\n\nSame idea, different light.', [image('portrait'), image('square', 600, 600), image('landscape', 1200, 600), image('portrait')]),
  three: note('three', 'Three frames from the same afternoon.', [image('portrait'), image('square', 600, 600), image('landscape', 1200, 600)]),
  many: note('many', 'Ten frames, in their original order.', Array.from({ length: 10 }, (_, i) => image(['portrait', 'square', 'landscape'][i % 3]))),
  video: note('video', 'Experimenting with motion.\n\nA small animation, made to be played.', [video()], '17'),
  hls: note('hls', 'An attached video, streamed on demand.', [video(true)], '16'),
  text: note('text', 'A note without an attachment still gets room to breathe.\n\nThe useful part is the thought.', []),
  url: note('url', 'https://example.com/a-long-link-that-needs-to-wrap-at-mobile-widths', []),
  media: note('media', '', [image('portrait')]),
  unknown: note('unknown', 'An attachment with no recorded dimensions.', [{ ...image('landscape'), width: undefined, height: undefined }]),
  extreme: note('extreme', 'A very tall attachment.', [image('tall', 80, 1600)]),
  broken: note('broken', 'The original post is still available if an attachment fails.', [{ ...video(true), src: '/media/missing.m3u8' }]),
  brokenImage: note('brokenImage', 'A missing image retains its description and source.', [{ ...image('portrait'), src: '/media/missing.png' }]),
}

export const archiveNotes = [cases.portrait, cases.video, cases.gallery, cases.hls, cases.text]
