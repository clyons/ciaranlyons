import { getLocalNotes, type NoteEntry } from './content'
import { dateParts } from './content'

const publicApi = 'https://public.api.bsky.app/xrpc'

interface FeedItem {
  post?: {
    uri?: string
    author?: { handle?: string; did?: string }
    record?: {
      text?: string
      createdAt?: string
      reply?: unknown
    }
  }
  reason?: unknown
}

function rkeyFromUri(uri: string): string {
  return uri.split('/').pop() ?? encodeURIComponent(uri)
}

export async function getNotes(limit = 30): Promise<NoteEntry[]> {
  const localNotes = await getLocalNotes()
  if (localNotes.length > 0) return localNotes.slice(0, limit)

  const handle = import.meta.env.ATPROTO_HANDLE || 'ciaranlyons.com'
  const url = new URL(`${publicApi}/app.bsky.feed.getAuthorFeed`)
  url.searchParams.set('actor', handle)
  url.searchParams.set('filter', 'posts_no_replies')
  url.searchParams.set('limit', String(limit))

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`ATProto feed request failed: ${response.status}`)
    const data = (await response.json()) as { feed?: FeedItem[] }
    const notes = (data.feed ?? [])
      .filter((item) => !item.reason)
      .map((item) => {
        const uri = item.post?.uri ?? ''
        const text = item.post?.record?.text ?? ''
        const date = item.post?.record?.createdAt ?? ''
        const id = rkeyFromUri(uri)
        const { year, month, day } = dateParts(date)
        return { id, text, date, year, month, day, uri, facets: [], media: [], url: `/notes/${year}/${month}/${day}/${id}` }
      })
      .filter((note) => note.id && note.text && note.date)

    return notes
  } catch {
    return []
  }
}

export function originalPostUrl(note: NoteEntry): string {
  if (note.originalUrl) return note.originalUrl
  if (!note.uri) return 'https://bsky.app/profile/ciaranlyons.com'
  const [, did, rkey] = note.uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/) ?? []
  return did && rkey ? `https://bsky.app/profile/${did}/post/${rkey}` : 'https://bsky.app/profile/ciaranlyons.com'
}
