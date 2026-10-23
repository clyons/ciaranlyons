import type { NoteEntry } from './content'
import type { RichTextFacet, RichTextFacetFeature } from './rich-text'
import { validateDate, validateSegment } from './content-validation.ts'
import { parseNoteMedia } from './note-media.ts'

export interface FeedItem {
  post?: {
    uri?: string
    author?: { handle?: string; did?: string }
    record?: {
      text?: string
      createdAt?: string
      reply?: unknown
      facets?: unknown
    }
    embed?: unknown
  }
  reason?: unknown
}

function rkeyFromUri(uri: string): string {
  return uri.split('/').pop() ?? encodeURIComponent(uri)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function safeRemoteUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function parseFacets(value: unknown): RichTextFacet[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    const facet = asRecord(candidate)
    const index = asRecord(facet.index)
    const byteStart = asNumber(index.byteStart)
    const byteEnd = asNumber(index.byteEnd)
    if (!Number.isInteger(byteStart) || !Number.isInteger(byteEnd)) return []
    const features = Array.isArray(facet.features)
      ? facet.features.flatMap((rawFeature) => {
          const feature = asRecord(rawFeature)
          const type = asString(feature.$type)
          if (!type) return []
          return [{
            $type: type,
            uri: safeRemoteUrl(feature.uri),
            did: asString(feature.did) || undefined,
            tag: asString(feature.tag) || undefined,
          } satisfies RichTextFacetFeature]
        })
      : []
    return [{ index: { byteStart, byteEnd }, features }]
  })
}

export function noteFromFeedItem(item: FeedItem): NoteEntry | undefined {
  if (!item || item.reason || item.post?.record?.reply || typeof item.post?.record?.text !== 'string') return undefined
  const uri = asString(item.post?.uri)
  const text = item.post?.record?.text ?? ''
  const date = asString(item.post?.record?.createdAt)
  const id = rkeyFromUri(uri)
  const media = parseNoteMedia(item.post?.embed)
  const hasEmbed = asString(asRecord(item.post?.embed).$type).startsWith('app.bsky.embed.')
  if (!id || !uri || (!text.trim() && media.length === 0 && !hasEmbed) || !date) return undefined
  if (!/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/[^/]+$/.test(uri)) return undefined
  try {
    validateSegment(id, uri, 'id')
    validateDate(date, uri)
  } catch {
    return undefined
  }
  const [year, month, day] = date.slice(0, 10).split('-')
  return {
    id,
    text,
    date,
    year,
    month,
    day,
    uri,
    source: 'bluesky',
    facets: parseFacets(item.post?.record?.facets),
    media,
    url: `/notes/${year}/${month}/${day}/${id}/`,
  }
}
