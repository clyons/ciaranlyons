import type { APIRoute } from 'astro'
import { foundQuoteTitle, getFoundQuotes } from '../../lib/content'
import { renderFeed, requireSiteUrl } from '../../lib/feeds'

export const GET: APIRoute = async ({ site }) => {
  const quotes = await getFoundQuotes()
  return new Response(renderFeed('Ciaran Lyons - Found Quotes', 'Things other people said that Ciaran Lyons wants to remember.', requireSiteUrl(site), quotes.map((quote) => ({
    title: foundQuoteTitle(quote),
    description: `${quote.text} — ${quote.attribution}, ${quote.source}`,
    link: quote.url,
    pubDate: quote.date,
  }))), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
