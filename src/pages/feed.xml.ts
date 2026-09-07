import type { APIRoute } from 'astro'
import { getNotes } from '../lib/atproto'
import { getLinks, getTilEntries, getWriting, noteTitle } from '../lib/content'
import { renderFeed, requireSiteUrl } from '../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const [writing, notes, links, til] = await Promise.all([getWriting(), getNotes(20), getLinks(), getTilEntries()])
  const items = [
    ...writing.map((item) => ({ title: item.title, description: item.description, link: item.url, pubDate: item.date })),
    ...notes.map((item) => ({ title: noteTitle(item), description: item.text, link: item.url, pubDate: item.date })),
    ...links.map((item) => ({ title: `Link: ${item.title}`, description: `${item.description}${item.description ? ' ' : ''}Original: ${item.targetUrl}`, link: item.url, pubDate: item.savedAt ?? item.date })),
    ...til.map((item) => ({ title: `TIL: ${item.title}`, description: item.description, link: item.url, pubDate: item.date })),
  ].sort((a, b) => (b.pubDate ?? '').localeCompare(a.pubDate ?? ''))

  return new Response(renderFeed('Ciaran Lyons', 'Writing, notes, links, and TILs from Ciaran Lyons.', requireSiteUrl(site), items), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
