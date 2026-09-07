import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { renderMarkdown } from './markdown'
import type { RichTextFacet, RichTextFacetFeature } from './rich-text'

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
  standardUri?: string
  body: string
  html: string
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

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asNoteMedia(value: unknown): NoteMedia[] {
  if (!Array.isArray(value)) return []

  const parsed: NoteMedia[] = []
  for (const item of value) {
    const media = asRecord(item)
    const type = media.type === 'video' ? 'video' : media.type === 'image' ? 'image' : undefined
    const src = asString(media.src)
    if (!type || !src) continue

    parsed.push({
      type,
      src,
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
  return `${base}/${year}/${month}/${day}/${slug}`
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

export async function getWriting(): Promise<WritingEntry[]> {
  const files = await fg('writing/*.md', { cwd: contentRoot, absolute: true })
  const entries = await Promise.all(
    files.map(async (file) => {
      const { data, body, html } = await readMarkdownFile(file)
      const slug = path.basename(file, '.md')
      const date = asString(data.date)
      const { year, month, day } = dateParts(date)
      return {
        slug,
        year,
        month,
        day,
        title: asString(data.title, slug),
        description: asString(data.description),
        date,
        updated: asString(data.updated) || undefined,
        standardUri: asString(data.standardUri) || undefined,
        body,
        html,
        url: datedPath('/writing', date, slug),
      }
    }),
  )
  return sortByDateDesc(entries)
}

export async function getTilEntries(): Promise<TilEntry[]> {
  const files = await fg('til/**/*.md', { cwd: contentRoot, absolute: true })
  const entries = await Promise.all(
    files.map(async (file) => {
      const relative = path.relative(path.join(contentRoot, 'til'), file)
      const [topic, filename] = relative.split(path.sep)
      const { data, body, html } = await readMarkdownFile(file)
      const slug = path.basename(filename, '.md')
      const date = asString(data.date)
      const { year, month, day } = dateParts(date)
      return {
        topic,
        slug,
        year,
        month,
        day,
        title: asString(data.title, slug),
        description: asString(data.description),
        date,
        updated: asString(data.updated) || undefined,
        tags: asArray(data.tags),
        body,
        html,
        url: `/til/${year}/${month}/${day}/${slug}`,
      }
    }),
  )
  return sortByDateDesc(entries)
}

export async function getProjects(): Promise<ProjectEntry[]> {
  const files = await fg('projects/*.md', { cwd: contentRoot, absolute: true })
  const entries = await Promise.all(
    files.map(async (file) => {
      const { data } = await readMarkdownFile(file)
      const slug = path.basename(file, '.md')
      return {
        slug,
        title: asString(data.title, slug),
        description: asString(data.description),
        emphasis: asString(data.emphasis) || undefined,
        url: asString(data.url, `/projects#${slug}`),
        meta: asString(data.meta) || undefined,
      }
    }),
  )
  return entries.sort((a, b) => a.title.localeCompare(b.title))
}

export async function getAbout() {
  return readMarkdownFile(path.join(contentRoot, 'about.md'))
}

export async function getLocalNotes(): Promise<NoteEntry[]> {
  const files = await fg('notes/*.md', { cwd: contentRoot, absolute: true })
  const entries = await Promise.all(
    files.map(async (file) => {
      const { data, body } = await readMarkdownFile(file)
      const id = asString(data.id, path.basename(file, '.md'))
      const date = asString(data.date)
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
        originalUrl: asString(data.originalUrl) || undefined,
        facets: asRichTextFacets(data.facets),
        media: asNoteMedia(data.media),
        url: datedPath('/notes', date, id),
      }
    }),
  )
  return sortByDateDesc(entries)
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
