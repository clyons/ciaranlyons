import { getLocalNotes, type NoteEntry } from './content'
import { limitNotes, mergeNoteSources } from './note-collection'
import { noteFromFeedItem, type FeedItem } from './note-feed'

const publicApi = 'https://public.api.bsky.app/xrpc'

interface FeedResponse {
  feed?: FeedItem[]
  cursor?: string
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
