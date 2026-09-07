export interface RichTextFacetFeature {
  $type?: string
  uri?: string
  did?: string
  tag?: string
}

export interface RichTextFacet {
  index?: {
    byteStart?: number
    byteEnd?: number
  }
  features?: RichTextFacetFeature[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function externalAnchor(href: string, text: string): string {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`
}

function renderFacet(text: string, facet: RichTextFacet): string {
  const feature = facet.features?.find((candidate) => candidate.$type === 'app.bsky.richtext.facet#link')
  const mention = facet.features?.find((candidate) => candidate.$type === 'app.bsky.richtext.facet#mention')
  const tag = facet.features?.find((candidate) => candidate.$type === 'app.bsky.richtext.facet#tag')

  const linkUrl = safeHttpUrl(feature?.uri)
  if (linkUrl) return externalAnchor(linkUrl, text)

  if (mention?.did?.startsWith('did:')) {
    return externalAnchor(`https://bsky.app/profile/${encodeURIComponent(mention.did)}`, text)
  }

  if (tag?.tag) {
    return externalAnchor(`https://bsky.app/hashtag/${encodeURIComponent(tag.tag)}`, text)
  }

  return escapeHtml(text)
}

function isUtf8Boundary(bytes: Buffer, index: number): boolean {
  return index === 0 || index === bytes.length || (bytes[index] & 0b1100_0000) !== 0b1000_0000
}

/**
 * Renders ATProto rich text from the record's UTF-8 byte ranges. Facet ranges
 * are deliberately not inferred from post text: the record is authoritative.
 */
export function renderRichText(text: string, facets: RichTextFacet[] = []): string {
  const bytes = Buffer.from(text, 'utf8')
  const ordered = [...facets].sort((left, right) => (left.index?.byteStart ?? 0) - (right.index?.byteStart ?? 0))
  const parts: string[] = []
  let cursor = 0

  for (const facet of ordered) {
    const start = facet.index?.byteStart
    const end = facet.index?.byteEnd
    if (
      typeof start !== 'number'
      || typeof end !== 'number'
      || !Number.isInteger(start)
      || !Number.isInteger(end)
      || start < cursor
      || end < start
      || end > bytes.length
      || !isUtf8Boundary(bytes, start)
      || !isUtf8Boundary(bytes, end)
    ) continue

    parts.push(escapeHtml(bytes.subarray(cursor, start).toString('utf8')))
    parts.push(renderFacet(bytes.subarray(start, end).toString('utf8'), facet))
    cursor = end
  }

  parts.push(escapeHtml(bytes.subarray(cursor).toString('utf8')))
  return parts.join('').replace(/\r?\n/g, '<br />')
}
