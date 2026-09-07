import type { APIRoute } from 'astro'
import { getLinks } from '../../lib/content'
import { renderFeed, requireSiteUrl } from '../../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const links = await getLinks()
  return new Response(renderFeed(
    'Ciaran Lyons — Links',
    'Articles, ideas, and references saved by Ciaran Lyons.',
    requireSiteUrl(site),
    links.map((item) => ({
      title: item.title,
      description: `${item.description}${item.description ? ' ' : ''}Original: ${item.targetUrl}`,
      link: item.url,
      pubDate: item.savedAt ?? item.date,
    })),
  ), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
