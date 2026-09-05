export interface FeedItem {
  title: string
  description: string
  link: string
  pubDate?: string
}

function escapeXml(value: string): string {
  return value
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
      const pubDate = item.pubDate ? new Date(item.pubDate).toUTCString() : new Date().toUTCString()
      return `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid><pubDate>${escapeXml(pubDate)}</pubDate><description>${escapeXml(item.description)}</description></item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(title)}</title><link>${escapeXml(siteUrl)}</link><description>${escapeXml(description)}</description>${channelItems}</channel></rss>`
}
