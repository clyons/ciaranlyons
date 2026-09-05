import type { APIRoute } from 'astro'
import { getTilEntries } from '../../lib/content'
import { renderFeed } from '../../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const til = await getTilEntries()
  return new Response(renderFeed('Ciaran Lyons - TIL', 'Things Ciaran Lyons figured out and does not want to figure out twice.', site!.toString(), til.map((item) => ({
    title: item.title,
    description: item.description,
    link: item.url,
    pubDate: item.date,
  }))), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
