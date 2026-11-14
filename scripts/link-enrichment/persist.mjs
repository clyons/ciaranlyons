// Stage 3: decide which fields may change, record field-level provenance, and rewrite a
// Link's front-matter surgically. Every rule that protects human judgment lives here.
//
// Provenance is a fingerprint of the value the enricher wrote. If the value in the file no
// longer matches, a person edited it, and the field is treated as human-authored from then
// on. Fields the enricher never touched are authoritative whenever they hold a value.
import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import { canonicalTag, isIgnoredTag, normalizeTag } from './vocabulary.mjs'

export const scalarFields = ['description', 'author', 'sourceTitle']
export const maximumTags = 5

export function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value ?? '')).digest('hex').slice(0, 12)
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseLinkMarkdown(markdown) {
  const parsed = matter(markdown, {})
  return { data: parsed.data, body: parsed.content }
}

export function readEnrichment(data) {
  const value = data?.enrichment
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return { ...value, fields: value.fields && typeof value.fields === 'object' ? value.fields : {} }
}

// The Feedly importer stores a 320-character excerpt cut at a word boundary and ended with
// an ellipsis. Such a value is the publisher's opening text, not anyone's description of
// the resource; it is replaced only with --replace-excerpts.
export function isImportedExcerpt(value) {
  const description = text(value)
  if (description.length < 120 || description.length > 340) return false
  return /(?:…|\[(?:…|\.\.\.)\])$/.test(description) || /…\s*(?:Read more|Continue reading)\W{0,4}$/i.test(description)
}

// 'empty'   no value and no record: fill freely
// 'machine' written by the enricher and unchanged since: may be regenerated
// 'human'   edited after enrichment, or marked human: never touched
// 'legacy'  a value that predates enrichment (imported or hand-written): never touched,
//           except imported excerpts under --replace-excerpts
export function fieldState(data, enrichment, field) {
  const record = enrichment?.fields?.[field]
  const current = text(data[field])
  if (record?.by === 'human') return 'human'
  if (record && (record.by === 'ai' || record.by === 'extracted')) {
    if (!current) return 'human' // a person cleared it deliberately
    return record.hash === fingerprint(current) ? 'machine' : 'human'
  }
  return current ? 'legacy' : 'empty'
}

function tagRecord(enrichment) {
  const record = enrichment?.fields?.tags
  return {
    added: Array.isArray(record?.added) ? record.added.map(normalizeTag) : [],
    rejected: Array.isArray(record?.rejected) ? record.rejected.map(normalizeTag) : [],
  }
}

// Split current tags into the enricher's (still present) and everyone else's. A generated
// tag that has disappeared was removed by a person and is remembered as rejected.
export function tagState(data, enrichment) {
  const current = Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === 'string') : []
  const record = tagRecord(enrichment)
  const currentNormalized = new Set(current.map(normalizeTag))
  const machine = record.added.filter((tag) => currentNormalized.has(tag))
  const rejected = [...new Set([...record.rejected, ...record.added.filter((tag) => !currentNormalized.has(tag))])]
  const machineSet = new Set(machine)
  const human = current.filter((tag) => !machineSet.has(normalizeTag(tag)))
  return { current, machine, human, rejected }
}

export function topicalCount(tags, taxonomy) {
  return tags.filter((tag) => !isIgnoredTag(tag, taxonomy)).length
}

// Which fields could this run change? Used to skip Links before any network request.
// A field left empty by a completed attempt (the page had no byline, say) is not retried on
// every run; only a failed attempt, --re-enrich, or --replace-excerpts reopens it.
export function fillableFields(data, enrichment, { taxonomy, reEnrich = false, fields, replaceExcerpts = false }) {
  const wanted = (field) => !fields || fields.includes(field)
  const open = !enrichment || enrichment.status === 'failed' || reEnrich
  const result = []
  for (const field of scalarFields) {
    if (!wanted(field)) continue
    const state = fieldState(data, enrichment, field)
    if ((state === 'empty' && open) || (state === 'machine' && reEnrich) || (field === 'description' && state === 'legacy' && replaceExcerpts && isImportedExcerpt(data.description))) result.push(field)
  }
  if (wanted('tags')) {
    const tags = tagState(data, enrichment)
    if (((tags.machine.length === 0 && open) || reEnrich) && topicalCount(tags.human, taxonomy) < maximumTags) result.push('tags')
  }
  return result
}

const volatileKeys = new Set(['lastAttemptAt', 'generatedAt', 'lastFetchedAt', 'attempts'])

// True when a new record differs from the old one only in timestamps and counters, so a
// repeated run that learns nothing new leaves the file untouched.
export function sameOutcome(previous, next) {
  if (!previous || next.status === 'failed') return false
  const strip = (record) => JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key]) => !volatileKeys.has(key))))
  return strip(previous) === strip(next)
}

function plausibleName(value) {
  const name = text(value)
  return name && name.length <= 100 && !/^https?:\/\//i.test(name) && !/[<>{}]/.test(name) ? name : undefined
}

// Combine proposed values with the current file into the next front-matter values and the
// next enrichment record. Pure: no I/O, so every protection rule is unit-testable.
export function planEnrichment({ data, generated, extracted = {}, attempt, options }) {
  const { taxonomy, reEnrich = false, fields, replaceExcerpts = false } = options
  const previous = readEnrichment(data)
  const fillable = new Set(fillableFields(data, previous, { taxonomy, reEnrich, fields, replaceExcerpts }))
  const updates = {}
  const nextFields = { ...(previous?.fields ?? {}) }
  const changes = []

  for (const field of scalarFields) {
    const state = fieldState(data, previous, field)
    if (state === 'human') nextFields[field] = { by: 'human' }
  }

  const proposals = {
    description: generated?.description ? { value: generated.description, by: 'ai' } : undefined,
    author: plausibleName(extracted.author) ? { value: plausibleName(extracted.author), by: 'extracted' } : undefined,
    sourceTitle: plausibleName(extracted.publisher) ? { value: plausibleName(extracted.publisher), by: 'extracted' } : undefined,
  }
  for (const field of scalarFields) {
    const proposal = proposals[field]
    // Never replace a value with nothing, and never write a field this run may not own.
    if (!proposal || !fillable.has(field)) continue
    if (proposal.value !== text(data[field])) {
      updates[field] = proposal.value
      changes.push({ field, from: text(data[field]) || undefined, to: proposal.value })
    }
    nextFields[field] = { by: proposal.by, hash: fingerprint(proposal.value) }
  }

  const tags = tagState(data, previous)
  let nextTagRecord = previous?.fields?.tags ? { by: 'ai', added: tags.machine, ...(tags.rejected.length ? { rejected: tags.rejected } : {}) } : undefined
  const proposedTags = Array.isArray(generated?.tags) ? generated.tags : []
  if (fillable.has('tags') && proposedTags.length) {
    const room = Math.max(0, maximumTags - topicalCount(tags.human, taxonomy))
    const humanCanonical = new Set(tags.human.map((tag) => canonicalTag(tag, taxonomy)))
    const added = proposedTags.filter((tag) => !humanCanonical.has(tag) && !tags.rejected.includes(tag)).slice(0, room)
    if (added.length) {
      const nextTags = [...tags.human, ...added]
      const sameSet = nextTags.length === tags.current.length && nextTags.every((tag) => tags.current.includes(tag))
      if (!sameSet) {
        updates.tags = nextTags
        changes.push({ field: 'tags', from: tags.current, to: nextTags })
      }
      nextTagRecord = { by: 'ai', added, ...(tags.rejected.length ? { rejected: tags.rejected } : {}) }
    }
  }
  if (nextTagRecord) nextFields.tags = nextTagRecord
  else delete nextFields.tags

  const succeeded = attempt.status === 'enriched'
  const enrichment = pruneEmpty({
    status: attempt.status,
    // The basis of the metadata on file: this attempt's, or the earlier success it left in place.
    basis: attempt.basis ?? (previous?.status === 'enriched' && attempt.status === 'failed' ? previous.basis : undefined),
    model: succeeded ? attempt.model : previous?.model,
    servedModel: succeeded ? attempt.servedModel : previous?.servedModel,
    promptVersion: succeeded ? attempt.promptVersion : previous?.promptVersion,
    generatedAt: succeeded ? attempt.at : previous?.generatedAt,
    lastAttemptAt: attempt.at,
    attempts: succeeded ? undefined : (previous?.status === 'enriched' ? 1 : (previous?.attempts ?? 0) + 1),
    lastFetchedAt: attempt.fetchedAt ?? previous?.lastFetchedAt,
    httpStatus: attempt.httpStatus ?? previous?.httpStatus,
    fetchIssue: attempt.fetchIssue,
    // A page read in this attempt replaces what earlier attempts learned about its URLs.
    finalUrl: attempt.fetchedAt ? attempt.finalUrl : previous?.finalUrl,
    contentHash: attempt.contentHash ?? previous?.contentHash,
    contentType: generated?.contentType ?? previous?.contentType,
    mediaType: attempt.mediaType ?? previous?.mediaType,
    canonicalUrl: attempt.fetchedAt ? attempt.canonicalUrl : previous?.canonicalUrl,
    publisher: extracted.publisher ? plausibleName(extracted.publisher) : previous?.publisher,
    pagePublishedAt: extracted.publishedAt ?? previous?.pagePublishedAt,
    language: extracted.language ?? previous?.language,
    duplicateOf: attempt.duplicateOf,
    warnings: attempt.warnings?.length ? attempt.warnings : undefined,
    error: attempt.error,
    fields: Object.keys(nextFields).length ? nextFields : undefined,
  })
  return { updates, enrichment, changes }
}

function pruneEmpty(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

function splitBlocks(frontmatter) {
  const lines = frontmatter.split('\n')
  const blocks = []
  for (const line of lines) {
    const key = /^([A-Za-z_][\w-]*):(?:\s|$)/.exec(line)?.[1]
    if (key || !blocks.length) blocks.push({ key, lines: [line] })
    else blocks.at(-1).lines.push(line)
  }
  return blocks
}

// Where a missing field is inserted, so files keep the importer's familiar order.
const insertAfter = { author: ['sourceTitle', 'targetUrl'], sourceTitle: ['destinationLastCheckedAt', 'destinationStatus', 'targetUrl'], description: ['title'], tags: ['feedlyUrl', 'feedlyId'] }

function yamlValue(value) {
  return JSON.stringify(value)
}

// Rewrite only the named keys; every other byte of the front-matter and the whole body stay
// exactly as they were. The result is parsed back and compared before it is returned.
export function rewriteLinkMarkdown(markdown, updates, enrichment) {
  const match = frontmatterPattern.exec(markdown)
  if (!match) throw new Error('Markdown front-matter is missing')
  const before = parseLinkMarkdown(markdown)
  const blocks = splitBlocks(match[1])
  for (const [key, value] of Object.entries(updates)) {
    const replacement = { key, lines: [`${key}: ${yamlValue(value)}`] }
    const index = blocks.findIndex((block) => block.key === key)
    if (index >= 0) blocks[index] = replacement
    else {
      const anchors = insertAfter[key] ?? []
      const anchorIndex = anchors.map((anchor) => blocks.findIndex((block) => block.key === anchor)).find((found) => found >= 0)
      blocks.splice(anchorIndex === undefined ? blocks.length : anchorIndex + 1, 0, replacement)
    }
  }
  const withoutEnrichment = blocks.filter((block) => block.key !== 'enrichment')
  if (enrichment) {
    withoutEnrichment.push({ key: 'enrichment', lines: ['enrichment:', ...Object.entries(enrichment).map(([key, value]) => `  ${key}: ${yamlValue(value)}`)] })
  }
  const frontmatter = withoutEnrichment.flatMap((block) => block.lines).join('\n')
  const result = `---\n${frontmatter}\n---\n${markdown.slice(match[0].length)}`

  const after = parseLinkMarkdown(result)
  if (after.body !== before.body) throw new Error('Rewrite would change the Link body')
  const changedKeys = new Set([...Object.keys(updates), 'enrichment'])
  for (const key of new Set([...Object.keys(before.data), ...Object.keys(after.data)])) {
    if (changedKeys.has(key)) continue
    if (JSON.stringify(before.data[key]) !== JSON.stringify(after.data[key])) throw new Error(`Rewrite would change ${key}`)
  }
  for (const [key, value] of Object.entries(updates)) {
    if (JSON.stringify(after.data[key]) !== JSON.stringify(value)) throw new Error(`Rewrite did not round-trip ${key}`)
  }
  if (enrichment && JSON.stringify(after.data.enrichment) !== JSON.stringify(enrichment)) throw new Error('Rewrite did not round-trip enrichment')
  return result
}
