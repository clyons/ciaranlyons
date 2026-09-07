import { getLocalNotes, type NoteEntry, type NoteMedia } from './content'
import { dateParts } from './content'
import { validateDate, validateSegment } from './content-validation'
import { limitNotes, mergeNoteSources } from './note-collection'
import type { RichTextFacet, RichTextFacetFeature } from './rich-text'

const publicApi = 'https://public.api.bsky.app/xrpc'

interface FeedItem {
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

interface FeedResponse {
  feed?: FeedItem[]
  cursor?: string
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

function parseMedia(value: unknown): NoteMedia[] {
  const embed = asRecord(value)
  const type = asString(embed.$type)
  if (type === 'app.bsky.embed.recordWithMedia#view') return parseMedia(embed.media)
  if (type === 'app.bsky.embed.images#view' && Array.isArray(embed.images)) {
    return embed.images.flatMap((candidate) => {
      const image = asRecord(candidate)
      const src = safeRemoteUrl(image.fullsize) ?? safeRemoteUrl(image.thumb)
      if (!src) return []
      const aspect = asRecord(image.aspectRatio)
      return [{ type: 'image', src, alt: asString(image.alt), width: asNumber(aspect.width), height: asNumber(aspect.height) } satisfies NoteMedia]
    })
  }
  if (type === 'app.bsky.embed.video#view') {
    const src = safeRemoteUrl(embed.playlist)
    if (!src) return []
    const aspect = asRecord(embed.aspectRatio)
    return [{ type: 'video', src, mimeType: 'application/vnd.apple.mpegurl', alt: asString(embed.alt), width: asNumber(aspect.width), height: asNumber(aspect.height) }]
  }
  return []
}

function noteFromFeedItem(item: FeedItem): NoteEntry | undefined {
  if (item.reason) return undefined
  const uri = item.post?.uri ?? ''
  const text = item.post?.record?.text ?? ''
  const date = item.post?.record?.createdAt ?? ''
  const id = rkeyFromUri(uri)
  if (!id || !uri || !text || !date) return undefined
  if (!/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/[^/]+$/.test(uri)) return undefined
  try {
    validateSegment(id, uri, 'id')
    validateDate(date, uri)
  } catch {
    return undefined
  }
  const { year, month, day } = dateParts(date)
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
    media: parseMedia(item.post?.embed),
    url: `/notes/${year}/${month}/${day}/${id}/`,
  }
}

async function getRemoteNotes(): Promise<NoteEntry[]> {
  const handle = import.meta.env.ATPROTO_HANDLE || 'ciaranlyons.com'
  const notes: NoteEntry[] = []
  const seenCursors = new Set<string>()
  let cursor: string | undefined

  do {
    const url = new URL(`${publicApi}/app.bsky.feed.getAuthorFeed`)
    url.searchParams.set('actor', handle)
    url.searchParams.set('filter', 'posts_no_replies')
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`ATProto feed request failed: ${response.status}`)
    const rawData: unknown = await response.json()
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) throw new Error('ATProto feed returned an invalid payload')
    const data = rawData as FeedResponse
    const page = Array.isArray(data.feed) ? data.feed : []
    notes.push(...page.map(noteFromFeedItem).filter((note): note is NoteEntry => Boolean(note)))

    const nextCursor = typeof data.cursor === 'string' && data.cursor ? data.cursor : undefined
    if (!nextCursor || seenCursors.has(nextCursor)) break
    seenCursors.add(nextCursor)
    cursor = nextCursor
  } while (cursor)

  return notes
}

let allNotesPromise: Promise<NoteEntry[]> | undefined

async function loadAllNotes(): Promise<NoteEntry[]> {
  const localNotes = await getLocalNotes()
  try {
    const remoteNotes = await getRemoteNotes()
    return mergeNoteSources(localNotes, remoteNotes)
  } catch (error) {
    console.warn(`ATProto notes unavailable; using local notes: ${error instanceof Error ? error.message : 'unknown error'}`)
    return localNotes
  }
}

export function getAllNotes(): Promise<NoteEntry[]> {
  allNotesPromise ??= loadAllNotes()
  return allNotesPromise
}

export async function getNotes(limit = 30): Promise<NoteEntry[]> {
  return limitNotes(await getAllNotes(), limit)
}

export function originalPostUrl(note: NoteEntry): string {
  if (note.originalUrl) return note.originalUrl
  if (!note.uri) return 'https://bsky.app/profile/ciaranlyons.com'
  const [, did, rkey] = note.uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/) ?? []
  return did && rkey ? `https://bsky.app/profile/${did}/post/${rkey}` : 'https://bsky.app/profile/ciaranlyons.com'
}
