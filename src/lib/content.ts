import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { assertUnique, optionalBoolean, optionalHttpUrl, optionalUniqueSubstring, requiredString, validateDate, validateSegment, validateTimestamp, validateTopic, webUrl } from './content-validation'
import { renderMarkdown } from './markdown'
import { sortFoundQuotesByPublicationAndSourceDate } from './found-quotes'
import type { RichTextFacet, RichTextFacetFeature } from './rich-text'

export { foundQuoteDescription, foundQuoteTitle, resolveFoundQuotes, sortFoundQuotesByPublicationAndSourceDate } from './found-quotes'

const contentRoot = path.join(process.cwd(), 'content')

export interface WritingEntry {
  slug: string
  year: string
  month: string
  day: string
  title: string
  description: string
  date: string
  updated?: string
  featured: boolean
  standardUri?: string
  foundQuoteSlugs: string[]
  body: string
  html: string
  url: string
}

export interface FoundQuoteEntry {
  slug: string
  year: string
  month: string
  day: string
  text: string
  attribution: string
  source: string
  sourceDate?: string
  emphasis?: string
  sourceUrl?: string
  via?: string
  viaUrl?: string
  date: string
  updated?: string
  tags: string[]
  preview: boolean
  url: string
}

export interface TilEntry {
  topic: string
  slug: string
  year: string
  month: string
  day: string
  title: string
  description: string
  date: string
  updated?: string
  tags: string[]
  body: string
  html: string
  url: string
}

export interface LinkEntry {
  slug: string
  title: string
  description: string
  date: string
  savedAt?: string
  dateSource: 'saved' | 'published' | 'imported'
  publishedAt?: string
  targetUrl: string
  sourceTitle?: string
  author?: string
  feedlyId: string
  feedlyUrl?: string
  tags: string[]
  mock: boolean
  standardUri?: string
  body: string
  html: string
  year: string
  month: string
  day: string
  url: string
}

export interface NoteEntry {
  id: string
  text: string
  date: string
  year: string
  month: string
  day: string
  cid?: string
  uri?: string
  source?: 'bluesky' | 'local'
  originalUrl?: string
  facets: RichTextFacet[]
  media: NoteMedia[]
  url: string
}

export interface NoteMedia {
  type: 'image' | 'video'
  src: string
  mimeType?: string
  alt?: string
  width?: number
  height?: number
  cid?: string
}

export interface ProjectEntry {
  slug: string
  title: string
  description: string
  emphasis?: string
  url: string
  meta?: string
  order?: number
}

function asString(value: unknown, fallback = ''): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function asUniqueSegments(value: unknown, source: string, field: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`${source}: ${field} must be an array of quote slugs`)

  const segments = value.map((item, index) => validateSegment(requiredString(item, source, `${field}[${index}]`), source, `${field}[${index}]`))
  const duplicate = segments.find((segment, index) => segments.indexOf(segment) !== index)
  if (duplicate) throw new Error(`${source}: ${field} contains duplicate quote slug ${duplicate}`)
  return segments
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asNoteMedia(value: unknown, source: string): NoteMedia[] {
  if (!Array.isArray(value)) return []

  const parsed: NoteMedia[] = []
  for (const item of value) {
    const media = asRecord(item)
    const type = media.type === 'video' ? 'video' : media.type === 'image' ? 'image' : undefined
    const src = asString(media.src)
    if (!type || !src) continue

    parsed.push({
      type,
      src: webUrl(src, source, 'media.src'),
      mimeType: asString(media.mimeType) || undefined,
      alt: asString(media.alt) || undefined,
      width: asNumber(media.width),
      height: asNumber(media.height),
      cid: asString(media.cid) || undefined,
    })
  }

  return parsed
}

function asRichTextFeature(value: unknown): RichTextFacetFeature | undefined {
  const feature = asRecord(value)
  const type = asString(feature.$type)
  if (!type) return undefined

  return {
    $type: type,
    uri: asString(feature.uri) || undefined,
    did: asString(feature.did) || undefined,
    tag: asString(feature.tag) || undefined,
  }
}

function asRichTextFacets(value: unknown): RichTextFacet[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    const facet = asRecord(item)
    const index = asRecord(facet.index)
    const byteStart = asNumber(index.byteStart)
    const byteEnd = asNumber(index.byteEnd)
    if (byteStart === undefined || byteEnd === undefined) return []

    return [{
      index: { byteStart, byteEnd },
      features: Array.isArray(facet.features)
        ? facet.features.map(asRichTextFeature).filter((feature): feature is RichTextFacetFeature => Boolean(feature))
        : [],
    }]
  })
}

function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return items.sort((a, b) => b.date.localeCompare(a.date))
}

export function dateParts(date: string) {
  const [year = 'undated', month = '00', day = '00'] = date.slice(0, 10).split('-')
  return { year, month, day }
}

function datedPath(base: string, date: string, slug: string) {
  const { year, month, day } = dateParts(date)
  return `${base}/${year}/${month}/${day}/${slug}/`
}

async function readMarkdownFile(file: string) {
  const raw = await readFile(file, 'utf8')
  const parsed = matter(raw)
  return {
    data: parsed.data,
    body: parsed.content.trim(),
    html: renderMarkdown(parsed.content),
  }
}

async function loadWriting(): Promise<WritingEntry[]> {
  const files = await fg('writing/*.md', { cwd: contentRoot, absolute: true })
  const loaded = await Promise.all(
    files.map(async (file) => {
      const { data, body, html } = await readMarkdownFile(file)
      const source = path.relative(process.cwd(), file)
      const slug = validateSegment(path.basename(file, '.md'), source, 'slug')
      const date = validateDate(data.date, source)
      const updated = data.updated ? validateDate(data.updated, source, 'updated') : undefined
      const { year, month, day } = dateParts(date)
      return {
        entry: {
          slug,
          year,
          month,
          day,
          title: asString(data.title, slug),
          description: asString(data.description),
          date,
          updated,
          featured: optionalBoolean(data.featured, source, 'featured') ?? false,
          standardUri: asString(data.standardUri) || undefined,
          foundQuoteSlugs: asUniqueSegments(data.foundQuotes, source, 'foundQuotes'),
          body,
          html,
          url: datedPath('/writing', date, slug),
        } satisfies WritingEntry,
        source,
      }
    }),
  )
  const featured = loaded.filter(({ entry }) => entry.featured)
  if (featured.length > 1) {
    throw new Error(`Only one Writing entry can be featured: ${featured.map(({ source }) => source).join(', ')}`)
  }
  return sortByDateDesc(loaded.map(({ entry }) => entry))
}

let writingPromise: Promise<WritingEntry[]> | undefined

export function getWriting(): Promise<WritingEntry[]> {
  writingPromise ??= loadWriting()
  return writingPromise
}

async function loadFoundQuotes(): Promise<FoundQuoteEntry[]> {
  const files = await fg('found-quotes/*.md', { cwd: contentRoot, absolute: true })
  const loaded = await Promise.all(
    files.map(async (file) => {
      const { data, body } = await readMarkdownFile(file)
      const sourceFile = path.relative(process.cwd(), file)
      const slug = validateSegment(path.basename(file, '.md'), sourceFile, 'slug')
      const date = validateDate(data.date, sourceFile)
      const updated = data.updated ? validateDate(data.updated, sourceFile, 'updated') : undefined
      const attribution = requiredString(data.attribution, sourceFile, 'attribution')
      const source = requiredString(data.source, sourceFile, 'source')
      const sourceDate = data.sourceDate ? validateDate(data.sourceDate, sourceFile, 'sourceDate') : undefined
      const text = requiredString(body, sourceFile, 'quote body')
      const emphasis = optionalUniqueSubstring(data.emphasis, text, sourceFile, 'emphasis')
      const sourceUrl = optionalHttpUrl(data.sourceUrl, sourceFile, 'sourceUrl')
      const via = asString(data.via).trim() || undefined
      const viaUrl = optionalHttpUrl(data.viaUrl, sourceFile, 'viaUrl')
      if (viaUrl && !via) throw new Error(`${sourceFile}: via is required when viaUrl is present`)
      const { year, month, day } = dateParts(date)

      return {
        entry: {
          slug,
          year,
          month,
          day,
          text,
          attribution,
          source,
          sourceDate,
          emphasis,
          sourceUrl,
          via,
          viaUrl,
          date,
          updated,
          tags: asArray(data.tags),
          preview: data.preview === true,
          url: datedPath('/found-quotes', date, slug),
        },
        sourceFile,
      }
    }),
  )

  assertUnique(loaded, ({ entry }) => entry.url, ({ sourceFile }) => sourceFile)
  return sortFoundQuotesByPublicationAndSourceDate(loaded.map(({ entry }) => entry))
}

let foundQuotesPromise: Promise<FoundQuoteEntry[]> | undefined

export function getFoundQuotes(): Promise<FoundQuoteEntry[]> {
  foundQuotesPromise ??= loadFoundQuotes()
  return foundQuotesPromise
}

async function loadTilEntries(): Promise<TilEntry[]> {
  const files = await fg('til/*/*.md', { cwd: contentRoot, absolute: true })
  const loaded = await Promise.all(
    files.map(async (file) => {
      const relative = path.relative(path.join(contentRoot, 'til'), file)
      const [topic, filename] = relative.split(path.sep)
      const source = path.relative(process.cwd(), file)
      const { data, body, html } = await readMarkdownFile(file)
      const safeTopic = validateTopic(topic, source)
      const slug = validateSegment(path.basename(filename, '.md'), source, 'slug')
      const date = validateDate(data.date, source)
      const updated = data.updated ? validateDate(data.updated, source, 'updated') : undefined
      const { year, month, day } = dateParts(date)
      const entry = {
        topic: safeTopic,
        slug,
        year,
        month,
        day,
        title: asString(data.title, slug),
        description: asString(data.description),
        date,
        updated,
        tags: asArray(data.tags),
        body,
        html,
        url: `/til/${year}/${month}/${day}/${slug}/`,
      }
      return { entry, source }
    }),
  )
  assertUnique(loaded, ({ entry }) => `${entry.date.slice(0, 10)}/${entry.slug}`, ({ source }) => source)
  return sortByDateDesc(loaded.map(({ entry }) => entry))
}

let tilPromise: Promise<TilEntry[]> | undefined

export function getTilEntries(): Promise<TilEntry[]> {
  tilPromise ??= loadTilEntries()
  return tilPromise
}

async function loadLinks(): Promise<LinkEntry[]> {
  const files = await fg('links/*.md', { cwd: contentRoot, absolute: true })
  const loaded = await Promise.all(files.map(async (file) => {
    const { data, body, html } = await readMarkdownFile(file)
    const source = path.relative(process.cwd(), file)
    const slug = validateSegment(path.basename(file, '.md'), source, 'slug')
    const date = validateDate(data.date, source)
    const savedAt = data.savedAt ? validateTimestamp(asString(data.savedAt), source, 'savedAt') : undefined
    const publishedAt = data.publishedAt ? validateTimestamp(asString(data.publishedAt), source, 'publishedAt') : undefined
    const rawDateSource = asString(data.dateSource)
    if (!['saved', 'published', 'imported'].includes(rawDateSource)) {
      throw new Error(`${source}: dateSource must be saved, published, or imported`)
    }
    const feedlyId = asString(data.feedlyId)
    if (!feedlyId) throw new Error(`${source}: feedlyId is required`)
    const targetUrl = optionalHttpUrl(data.targetUrl, source, 'targetUrl')
    if (!targetUrl) throw new Error(`${source}: targetUrl is required`)
    const { year, month, day } = dateParts(date)
    return {
      entry: {
        slug,
        title: asString(data.title, slug),
        description: asString(data.description),
        date,
        savedAt,
        dateSource: rawDateSource as LinkEntry['dateSource'],
        publishedAt,
        targetUrl,
        sourceTitle: asString(data.sourceTitle) || undefined,
        author: asString(data.author) || undefined,
        feedlyId,
        feedlyUrl: optionalHttpUrl(data.feedlyUrl, source, 'feedlyUrl'),
        tags: asArray(data.tags),
        mock: data.mock === true,
        standardUri: asString(data.standardUri) || undefined,
        body,
        html,
        year,
        month,
        day,
        url: datedPath('/links', date, slug),
      } satisfies LinkEntry,
      source,
    }
  }))

  assertUnique(loaded, ({ entry }) => entry.feedlyId, ({ source }) => source)
  assertUnique(loaded, ({ entry }) => entry.url, ({ source }) => source)
  assertUnique(loaded, ({ entry }) => entry.targetUrl, ({ source }) => source)
  return loaded.map(({ entry }) => entry).sort((a, b) => {
    const byDate = (b.savedAt ?? b.date).localeCompare(a.savedAt ?? a.date)
    return byDate || a.slug.localeCompare(b.slug)
  })
}

let linksPromise: Promise<LinkEntry[]> | undefined

export function getLinks(): Promise<LinkEntry[]> {
  linksPromise ??= loadLinks()
  return linksPromise
}

async function loadProjects(): Promise<ProjectEntry[]> {
  const [files, foundQuotes, tilEntries] = await Promise.all([
    fg('projects/*.md', { cwd: contentRoot, absolute: true }),
    getFoundQuotes(),
    getTilEntries(),
  ])
  const entries = await Promise.all(
    files.map(async (file) => {
      const { data } = await readMarkdownFile(file)
      const source = path.relative(process.cwd(), file)
      const slug = validateSegment(path.basename(file, '.md'), source, 'slug')
      const rawUrl = asString(data.url, `/projects/#${slug}`)
      const metaCount = asString(data.metaCount)
      if (metaCount && metaCount !== 'found-quotes' && metaCount !== 'til') {
        throw new Error(`${source}: metaCount must be found-quotes or til`)
      }
      const collectionMeta = metaCount === 'found-quotes'
        ? { count: foundQuotes.length, singular: 'quotation', plural: 'quotations' }
        : metaCount === 'til'
          ? { count: tilEntries.length, singular: 'entry', plural: 'entries' }
          : undefined
      return {
        slug,
        title: asString(data.title, slug),
        description: asString(data.description),
        emphasis: asString(data.emphasis) || undefined,
        url: webUrl(rawUrl, source, 'url'),
        meta: collectionMeta
          ? `${collectionMeta.count} ${collectionMeta.count === 1 ? collectionMeta.singular : collectionMeta.plural}`
          : asString(data.meta) || undefined,
        order: asNumber(data.order),
      }
    }),
  )
  return entries.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title))
}

let projectsPromise: Promise<ProjectEntry[]> | undefined

export function getProjects(): Promise<ProjectEntry[]> {
  projectsPromise ??= loadProjects()
  return projectsPromise
}

let aboutPromise: ReturnType<typeof readMarkdownFile> | undefined

export function getAbout() {
  aboutPromise ??= readMarkdownFile(path.join(contentRoot, 'about.md'))
  return aboutPromise
}

async function loadLocalNotes(): Promise<NoteEntry[]> {
  const files = await fg('notes/*.md', { cwd: contentRoot, absolute: true })
  const entries = await Promise.all(
    files.map(async (file) => {
      const { data, body } = await readMarkdownFile(file)
      const sourceFile = path.relative(process.cwd(), file)
      const id = validateSegment(asString(data.id, path.basename(file, '.md')), sourceFile, 'id')
      const date = validateDate(data.date, sourceFile)
      const { year, month, day } = dateParts(date)
      const source: NoteEntry['source'] = asString(data.source) === 'bluesky' ? 'bluesky' : 'local'
      return {
        id,
        text: body,
        date,
        year,
        month,
        day,
        cid: asString(data.cid) || undefined,
        uri: asString(data.uri) || undefined,
        source,
        originalUrl: optionalHttpUrl(data.originalUrl, sourceFile, 'originalUrl'),
        facets: asRichTextFacets(data.facets),
        media: asNoteMedia(data.media, sourceFile),
        url: datedPath('/notes', date, id),
      }
    }),
  )
  return sortByDateDesc(entries)
}

let localNotesPromise: Promise<NoteEntry[]> | undefined

export function getLocalNotes(): Promise<NoteEntry[]> {
  localNotesPromise ??= loadLocalNotes()
  return localNotesPromise
}

export const getFallbackNotes = getLocalNotes

export function noteTitle(note: Pick<NoteEntry, 'text'>): string {
  const firstLine = note.text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? 'Note'
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine
}

export function getTilTopics(entries: TilEntry[]) {
  const topics = new Map<string, { topic: string; count: number; latest: string }>()
  for (const entry of entries) {
    const current = topics.get(entry.topic)
    if (current) {
      current.count += 1
      if (entry.date > current.latest) current.latest = entry.date
    } else {
      topics.set(entry.topic, { topic: entry.topic, count: 1, latest: entry.date })
    }
  }
  return [...topics.values()].sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
}
