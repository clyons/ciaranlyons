export interface FoundQuoteReference {
  slug: string
  text: string
  attribution: string
}

export function foundQuoteTitle(quote: Pick<FoundQuoteReference, 'attribution'>): string {
  return `Found quote from ${quote.attribution}`
}

export function foundQuoteDescription(quote: Pick<FoundQuoteReference, 'text' | 'attribution'>): string {
  const normalized = quote.text.replace(/\s+/g, ' ').trim()
  const normalizedAttribution = quote.attribution.replace(/\s+/g, ' ').trim()
  const attribution = normalizedAttribution.length > 64 ? `${normalizedAttribution.slice(0, 63).trimEnd()}…` : normalizedAttribution
  const suffix = ` — ${attribution}`
  const available = Math.max(0, 160 - suffix.length)
  const excerpt = normalized.length > available ? `${normalized.slice(0, Math.max(0, available - 1)).trimEnd()}…` : normalized
  return `${excerpt}${suffix}`
}

export function resolveFoundQuotes<T extends FoundQuoteReference>(slugs: string[], quotes: T[], ownerIdentity: string): T[] {
  const bySlug = new Map(quotes.map((quote) => [quote.slug, quote]))
  const seen = new Set<string>()

  return slugs.map((slug) => {
    if (seen.has(slug)) throw new Error(`${ownerIdentity}: foundQuotes contains duplicate quote slug ${slug}`)
    seen.add(slug)
    const quote = bySlug.get(slug)
    if (!quote) throw new Error(`${ownerIdentity}: foundQuotes references missing quote slug ${slug}`)
    return quote
  })
}
