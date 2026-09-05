import type { APIRoute } from 'astro'
import { getNotes } from '../lib/atproto'
import { getTilEntries, getWriting } from '../lib/content'
import { renderFeed } from '../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const [writing, notes, til] = await Promise.all([getWriting(), getNotes(20), getTilEntries()])
  const items = [
    ...writing.map((item) => ({ title: item.title, description: item.description, link: item.url, pubDate: item.date })),
    ...notes.map((item) => ({ title: item.text.slice(0, 72), description: item.text, link: item.url, pubDate: item.date })),
    ...til.map((item) => ({ title: `TIL: ${item.title}`, description: item.description, link: item.url, pubDate: item.date })),
  ].sort((a, b) => (b.pubDate ?? '').localeCompare(a.pubDate ?? ''))

  return new Response(renderFeed('Ciaran Lyons', 'Writing, notes, projects, and TILs from Ciaran Lyons.', site!.toString(), items), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
