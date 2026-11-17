// Stage 1b: turn a fetched HTML document into readable text plus the metadata the page
// declares about itself. No network access and no model; this module is pure so it can be
// swapped for a different extractor without touching fetching or generation.
import { createHash } from 'node:crypto'
import { Parser } from 'htmlparser2'

// Elements whose text is never part of the resource itself.
const skippedElements = new Set([
  'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'object', 'embed',
  'nav', 'header', 'footer', 'aside', 'form', 'button', 'select', 'option', 'label', 'dialog',
  'menu',
])

// Elements that start a new block of text.
const blockElements = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'td', 'th', 'dt', 'dd',
  'figcaption', 'div', 'section', 'article', 'main', 'br', 'tr', 'caption', 'summary',
])

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

// Class or id fragments that mark navigation, advertising, and other page furniture.
const boilerplatePattern = /(?:^|[\s_-])(?:nav|navbar|navigation|menu|breadcrumbs?|footer|masthead|site-header|sidebar|widget|comments?|disqus|share|sharing|social|advert|ads?|adslot|sponsor|promo|cookie|consent|gdpr|newsletter|subscribe|signup|related|recommended|popular|trending|outbrain|taboola|paywall-prompt|skip-link|pagination|author-bio|byline-share)(?:$|[\s_-])/i

const mainSelectors = new Set(['article', 'main'])

export const maximumExtractedCharacters = 24_000

function collapse(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function metaKey(attributes) {
  return (attributes.property || attributes.name || attributes.itemprop || '').trim().toLowerCase()
}

// Some publishers emit placeholder values ("None", "undefined") instead of omitting a tag.
const placeholderValues = new Set(['none', 'null', 'undefined', 'n/a', 'untitled', '-'])

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && collapse(value) && !placeholderValues.has(collapse(value).toLowerCase())) return collapse(value)
  }
  return undefined
}

function personName(value) {
  if (!value) return undefined
  if (typeof value === 'string') return collapse(value) || undefined
  if (Array.isArray(value)) {
    const names = value.map(personName).filter(Boolean)
    return names.length ? [...new Set(names)].join(', ') : undefined
  }
  if (typeof value === 'object') return firstString(value.name, value.alternateName)
  return undefined
}

function jsonLdNodes(value) {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(jsonLdNodes)
  const nodes = [value]
  if (Array.isArray(value['@graph'])) nodes.push(...value['@graph'].flatMap(jsonLdNodes))
  return nodes
}

function typeList(node) {
  const type = node?.['@type']
  return (Array.isArray(type) ? type : [type]).filter((item) => typeof item === 'string')
}

const creativeWorkTypes = /^(?:Article|NewsArticle|BlogPosting|TechArticle|ScholarlyArticle|Report|WebPage|AboutPage|VideoObject|PodcastEpisode|Book|SoftwareApplication|SoftwareSourceCode|CreativeWork|Review|HowTo|Recipe|Dataset)$/

export function structuredDataSummary(rawBlocks) {
  const summary = {}
  for (const raw of rawBlocks) {
    let parsed
    try {
      parsed = JSON.parse(raw.trim())
    } catch {
      continue
    }
    for (const node of jsonLdNodes(parsed)) {
      const types = typeList(node)
      if (!types.some((type) => creativeWorkTypes.test(type))) continue
      summary.type ??= types.find((type) => creativeWorkTypes.test(type))
      summary.headline ??= firstString(node.headline, node.name)
      summary.description ??= firstString(node.description)
      summary.author ??= personName(node.author ?? node.creator)
      summary.publisher ??= personName(node.publisher)
      summary.datePublished ??= firstString(node.datePublished, node.uploadDate, node.dateCreated)
    }
  }
  return summary
}

function resolveUrl(value, baseUrl) {
  if (!value || placeholderValues.has(String(value).trim().toLowerCase())) return undefined
  try {
    const url = new URL(value, baseUrl)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

export function contentHash(text) {
  return `sha256:${createHash('sha256').update(collapse(text)).digest('hex').slice(0, 16)}`
}

// Parse once, collecting two candidate texts: everything outside page furniture, and only
// what sits inside <article>/<main>/[role=main]. The narrower one wins when it is substantial.
export function extractHtml(html, baseUrl) {
  const meta = {}
  const jsonLd = []
  const allBlocks = []
  const mainBlocks = []
  let title = ''
  let canonical
  let language
  let current = []
  let currentMain = []
  const stack = []
  let skipDepth = 0
  let mainDepth = 0
  let inTitle = false
  let inJsonLd = false
  let jsonLdBuffer = ''

  const flush = () => {
    const text = collapse(current.join(''))
    if (text) allBlocks.push(text)
    const mainText = collapse(currentMain.join(''))
    if (mainText) mainBlocks.push(mainText)
    current = []
    currentMain = []
  }

  const parser = new Parser({
    onopentag(name, attributes) {
      const tag = name.toLowerCase()
      if (tag === 'html' && attributes.lang) language = attributes.lang.trim()
      if (tag === 'meta') {
        const key = metaKey(attributes)
        if (key && typeof attributes.content === 'string' && !(key in meta)) meta[key] = collapse(attributes.content)
        return
      }
      if (tag === 'link' && /(?:^|\s)canonical(?:\s|$)/i.test(attributes.rel || '')) {
        canonical ??= resolveUrl(attributes.href, baseUrl)
        return
      }
      if (tag === 'title' && !title) inTitle = true
      if (tag === 'script' && /ld\+json/i.test(attributes.type || '')) {
        inJsonLd = true
        jsonLdBuffer = ''
      }
      if (voidElements.has(tag)) {
        if (tag === 'br') current.push(' ')
        return
      }
      const marker = `${attributes.class || ''} ${attributes.id || ''} ${attributes.role || ''}`
      const hidden = attributes.hidden !== undefined || attributes['aria-hidden'] === 'true' || /display\s*:\s*none/i.test(attributes.style || '')
      const skip = skippedElements.has(tag) || hidden || /\b(?:navigation|banner|contentinfo|complementary)\b/i.test(attributes.role || '') || boilerplatePattern.test(marker)
      const main = mainSelectors.has(tag) || /\bmain\b/i.test(attributes.role || '') || /\barticle\b/i.test(attributes.itemprop || '')
      stack.push({ tag, skip, main })
      if (skip) skipDepth += 1
      if (main) mainDepth += 1
      if (blockElements.has(tag)) flush()
    },
    ontext(text) {
      if (inTitle) title += text
      if (inJsonLd) jsonLdBuffer += text
      if (skipDepth > 0) return
      current.push(text)
      if (mainDepth > 0) currentMain.push(text)
    },
    onclosetag(name) {
      const tag = name.toLowerCase()
      if (tag === 'title') inTitle = false
      if (tag === 'script' && inJsonLd) {
        inJsonLd = false
        jsonLd.push(jsonLdBuffer)
      }
      if (voidElements.has(tag)) return
      // Pop to the matching element; tolerate malformed nesting.
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tag !== tag) continue
        for (const entry of stack.splice(index)) {
          if (entry.skip) skipDepth -= 1
          if (entry.main) mainDepth -= 1
        }
        break
      }
      if (blockElements.has(tag)) flush()
    },
  }, { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true })
  parser.write(String(html ?? ''))
  parser.end()
  flush()

  const dedupe = (blocks) => {
    const seen = new Set()
    return blocks.filter((block) => {
      const key = block.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  const mainText = dedupe(mainBlocks).join('\n')
  const allText = dedupe(allBlocks).join('\n')
  const text = (mainText.length >= 500 ? mainText : allText).slice(0, maximumExtractedCharacters)
  const structured = structuredDataSummary(jsonLd)

  return {
    text,
    wordCount: text ? text.split(/\s+/).length : 0,
    contentHash: contentHash(text),
    metadata: pruneUndefined({
      title: firstString(meta['og:title'], meta['twitter:title'], structured.headline, title),
      description: firstString(meta['og:description'], meta.description, meta['twitter:description'], structured.description),
      author: firstString(meta.author, meta['article:author'] && !/^https?:/i.test(meta['article:author']) ? meta['article:author'] : undefined, structured.author, meta['parsely-author'], meta['sailthru.author'], meta['dc.creator']),
      publisher: firstString(meta['og:site_name'], structured.publisher, meta['application-name']),
      publishedAt: firstString(meta['article:published_time'], structured.datePublished, meta['parsely-pub-date'], meta['dc.date'], meta.date),
      canonicalUrl: canonical ?? resolveUrl(meta['og:url'], baseUrl),
      ogType: firstString(meta['og:type']),
      schemaType: structured.type,
      language: language || firstString(meta['og:locale']),
    }),
  }
}

export function extractPlainText(text) {
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maximumExtractedCharacters)
  return { text: normalized, wordCount: normalized ? normalized.split(/\s+/).length : 0, contentHash: contentHash(normalized), metadata: {} }
}

export function pruneUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}
