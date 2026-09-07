export interface FeedItem {
  title: string
  description: string
  link: string
  pubDate?: string
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function renderFeed(title: string, description: string, siteUrl: string, items: FeedItem[]) {
  const channelItems = items
    .map((item) => {
      const link = new URL(item.link, siteUrl).toString()
      let pubDate = ''
      if (item.pubDate) {
        const parsed = new Date(item.pubDate)
        if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid feed publication date for ${link}`)
        pubDate = `<pubDate>${escapeXml(parsed.toUTCString())}</pubDate>`
      }
      return `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid>${pubDate}<description>${escapeXml(item.description)}</description></item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(title)}</title><link>${escapeXml(siteUrl)}</link><description>${escapeXml(description)}</description>${channelItems}</channel></rss>`
}

export function requireSiteUrl(site: URL | undefined): string {
  if (!site) throw new Error('Astro site must be configured to generate feeds')
  return site.toString()
}
