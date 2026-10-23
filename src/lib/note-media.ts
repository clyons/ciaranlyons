import type { NoteMedia } from './content'
import { webUrl } from './content-validation.ts'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

export function positiveDimension(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

/** Normalize AppView embeds, whose URLs differ from raw record blob references. */
export function parseNoteMedia(value: unknown): NoteMedia[] {
  const embed = record(value)
  if (embed.$type === 'app.bsky.embed.recordWithMedia#view') return parseNoteMedia(embed.media)

  if (embed.$type === 'app.bsky.embed.images#view' || embed.$type === 'app.bsky.embed.gallery#view') {
    const gallery = embed.$type === 'app.bsky.embed.gallery#view'
    const items = gallery ? embed.items : embed.images
    if (!Array.isArray(items)) return []
    return items.flatMap((candidate) => {
      const image = record(candidate)
      if (gallery && image.$type !== 'app.bsky.embed.gallery#viewImage') return []
      const src = httpUrl(image.fullsize) ?? httpUrl(gallery ? image.thumbnail : image.thumb)
      if (!src) return []
      const aspect = record(image.aspectRatio)
      return [{
        type: 'image', src, alt: typeof image.alt === 'string' ? image.alt : '',
        width: positiveDimension(aspect.width), height: positiveDimension(aspect.height),
      } satisfies NoteMedia]
    })
  }

  if (embed.$type === 'app.bsky.embed.video#view') {
    const src = httpUrl(embed.playlist)
    if (!src) return []
    const aspect = record(embed.aspectRatio)
    return [{
      type: 'video', src, mimeType: 'application/vnd.apple.mpegurl',
      poster: httpUrl(embed.thumbnail),
      alt: typeof embed.alt === 'string' ? embed.alt : '',
      presentation: typeof embed.presentation === 'string' ? embed.presentation : undefined,
      width: positiveDimension(aspect.width), height: positiveDimension(aspect.height),
    }]
  }
  return []
}

export function parseLocalNoteMedia(value: unknown, source: string): NoteMedia[] {
  if (!Array.isArray(value)) return []

  const parsed: NoteMedia[] = []
  for (const item of value) {
    const media = record(item)
    const type = media.type === 'video' ? 'video' : media.type === 'image' ? 'image' : undefined
    const src = typeof media.src === 'string' ? media.src : ''
    if (!type || !src) continue

    parsed.push({
      type,
      src: webUrl(src, source, 'media.src'),
      mimeType: typeof media.mimeType === 'string' ? media.mimeType : undefined,
      alt: typeof media.alt === 'string' ? media.alt : undefined,
      width: positiveDimension(media.width),
      height: positiveDimension(media.height),
      cid: typeof media.cid === 'string' ? media.cid : undefined,
      poster: media.poster ? webUrl(media.poster, source, 'media.poster') : undefined,
      presentation: typeof media.presentation === 'string' ? media.presentation : undefined,
    })
  }

  return parsed
}
