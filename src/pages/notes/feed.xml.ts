import type { APIRoute } from 'astro'
import { getNotes } from '../../lib/atproto'
import { noteTitle } from '../../lib/content'
import { renderFeed } from '../../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const notes = await getNotes(50)
  return new Response(renderFeed('Ciaran Lyons - Notes', 'Short notes from Ciaran Lyons.', site!.toString(), notes.map((item) => ({
    title: noteTitle(item),
    description: item.text,
    link: item.url,
    pubDate: item.date,
  }))), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
