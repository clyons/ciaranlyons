import type { APIRoute } from 'astro'
import { getWriting } from '../../lib/content'
import { renderFeed, requireSiteUrl } from '../../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const writing = await getWriting()
  return new Response(renderFeed('Ciaran Lyons - Writing', 'Long-form writing by Ciaran Lyons.', requireSiteUrl(site), writing.map((item) => ({
    title: item.title,
    description: item.description,
    link: item.url,
    pubDate: item.date,
  }))), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
