// Orchestration: load Links, choose which to process, and run each through
// fetch -> generate -> persist. The stages stay independent; this file only wires them.
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { semanticMatch } from '../recover-feedproxy-links.mjs'
import { createCache } from './cache.mjs'
import { contentHash } from './extract.mjs'
import { createHostPacer, fetchDestination } from './fetch.mjs'
import { ProviderError, buildRequest, generateMetadata, normalizeTags, promptVersion, wordCount } from './generate.mjs'
import { fieldState, fillableFields, maximumTags, parseLinkMarkdown, planEnrichment, readEnrichment, rewriteLinkMarkdown, sameOutcome, tagState, topicalCount } from './persist.mjs'
import { estimateCost } from './providers.mjs'
import { comparableUrl, canonicalizeUrl } from './url.mjs'
import { addToVocabulary, buildVocabulary, isIgnoredTag, normalizeTag } from './vocabulary.mjs'

export const defaultContentDirectory = path.join('content', 'links')
const minimumPageWords = 80
const minimumFallbackWords = 20

export async function loadLinks(directory = defaultContentDirectory) {
  const files = (await readdir(directory)).filter((name) => name.endsWith('.md')).sort()
  return Promise.all(files.map(async (name) => {
    const file = path.join(directory, name)
    const raw = await readFile(file, 'utf8')
    const { data } = parseLinkMarkdown(raw)
    return { slug: name.slice(0, -3), file, raw, data, enrichment: readEnrichment(data), tags: Array.isArray(data.tags) ? data.tags : [] }
  }))
}

function stale(link, providerId) {
  return link.enrichment?.status === 'enriched' && (link.enrichment.model !== providerId || (link.enrichment.promptVersion ?? 0) < promptVersion)
}

// Returns the Links a run should look at, plus whether existing machine-written fields may
// be regenerated. Explicit slugs and URLs always win over the selection flags.
export function selectLinks(links, options, providerId) {
  let selected
  if (options.slugs?.length || options.urls?.length) {
    const bySlug = new Map(links.map((link) => [link.slug, link]))
    const byUrl = new Map(links.map((link) => [comparableUrl(link.data.targetUrl), link]))
    selected = []
    for (const slug of options.slugs ?? []) {
      const link = bySlug.get(slug)
      if (!link) throw new Error(`No Link with slug ${slug}`)
      selected.push(link)
    }
    for (const url of options.urls ?? []) {
      const link = byUrl.get(comparableUrl(url))
      if (!link) throw new Error(`No Link with target URL ${url}`)
      selected.push(link)
    }
    selected = [...new Set(selected)]
  } else if (options.selection === 'all') selected = links
  else if (options.selection === 'failed') selected = links.filter((link) => link.enrichment?.status === 'failed' && (options.includePermanent || link.enrichment.error?.retryable !== false))
  else if (options.selection === 'stale') selected = links.filter((link) => stale(link, providerId))
  else if (options.selection === 'changed') selected = links.filter((link) => link.enrichment?.status === 'enriched')
  else selected = links.filter((link) => !link.enrichment)
  const offset = options.offset ?? 0
  return selected.slice(offset, options.limit ? offset + options.limit : undefined)
}

function urlIndex(links) {
  const index = new Map()
  for (const link of links) {
    for (const value of [link.data.targetUrl, link.enrichment?.canonicalUrl, link.enrichment?.finalUrl]) {
      const key = value && comparableUrl(value)
      if (key && !index.has(key)) index.set(key, link.slug)
    }
  }
  return index
}

// A description the enricher did not write can still inform the prompt: it is usually the
// feed excerpt saved at import time.
function savedText(link) {
  const state = fieldState(link.data, link.enrichment, 'description')
  return state === 'legacy' || state === 'human' ? String(link.data.description ?? '').trim() : ''
}

async function writeFileAtomically(destination, contents) {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents, 'utf8')
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    throw error
  }
}

function differentUrl(value, targetUrl) {
  return value && comparableUrl(value) !== comparableUrl(targetUrl) ? canonicalizeUrl(value) : undefined
}

export async function enrichLink(link, context) {
  const { options, provider, cache, pacer, vocabulary, taxonomy, index, fetchImpl, now } = context
  const previous = link.enrichment
  const fillOptions = { taxonomy, reEnrich: options.reEnrich, fields: options.fields, replaceExcerpts: options.replaceExcerpts }
  const fillable = fillableFields(link.data, previous, fillOptions)
  if (!fillable.length && options.selection !== 'changed') {
    return { slug: link.slug, outcome: 'skipped', reason: previous ? 'nothing to fill; use --re-enrich to regenerate machine-written fields' : 'every field already has a value' }
  }

  const targetUrl = link.data.targetUrl
  let content = options.refetch || options.selection === 'changed' ? undefined : await cache.getContent(targetUrl, { maximumAgeDays: options.maximumAgeDays })
  const fromCache = Boolean(content)
  if (!content) {
    content = await pacer(targetUrl, () => fetchDestination(targetUrl, { fetchImpl }))
    if (content.ok) await cache.putContent(targetUrl, content)
  }
  if (options.selection === 'changed' && content.ok && previous?.contentHash === content.contentHash) {
    return { slug: link.slug, outcome: 'unchanged', reason: 'content hash matches the last enrichment' }
  }

  const metadata = content.metadata ?? {}
  const saved = savedText(link)
  let pageUsable = content.ok && content.wordCount >= minimumPageWords
  let fetchIssue = content.ok ? undefined : content.category
  if (pageUsable && !semanticMatch({ title: link.data.title, description: saved }, `${metadata.title ?? ''} ${content.text}`).matched) {
    // A redirect to a home page or an error page that returns 200 must not be described
    // as if it were the saved resource.
    pageUsable = false
    fetchIssue = 'semantic-mismatch'
  } else if (content.ok && !pageUsable) fetchIssue = 'limited-content'
  // Thin pages often carry only site-wide metadata ("Enjoy the videos and music you love…").
  // Use the page's description only when its title is recognisably this Link's.
  const metadataMatches = Boolean(metadata.title) && semanticMatch({ title: link.data.title, description: '' }, metadata.title).matched
  const fallbackText = [fetchIssue === 'semantic-mismatch' || (!pageUsable && !metadataMatches) ? '' : metadata.description, saved].filter(Boolean).join(' ')
  const basis = pageUsable ? 'page' : wordCount(fallbackText) >= minimumFallbackWords ? (content.ok ? 'metadata' : 'excerpt') : undefined

  // URLs from a page that is not this Link's resource would only mislead duplicate checks.
  const trustworthyPage = fetchIssue !== 'semantic-mismatch' && (pageUsable || metadataMatches)
  const canonicalUrl = trustworthyPage ? differentUrl(metadata.canonicalUrl, targetUrl) : undefined
  const finalUrl = differentUrl(content.finalUrl, targetUrl)
  const duplicateOf = [canonicalUrl, finalUrl].map((value) => value && index.get(comparableUrl(value))).find((slug) => slug && slug !== link.slug)
  const attempt = {
    at: now().toISOString(),
    fetchedAt: content.ok ? content.fetchedAt : undefined,
    httpStatus: typeof content.status === 'number' ? content.status : undefined,
    fetchIssue,
    finalUrl,
    canonicalUrl,
    duplicateOf,
    mediaType: content.contentType && content.contentType !== 'text/html' ? content.contentType : undefined,
    contentHash: basis === 'page' ? content.contentHash : basis ? contentHash(fallbackText) : undefined,
    basis,
  }
  const extracted = fetchIssue === 'semantic-mismatch' || (!pageUsable && !metadataMatches) ? {} : metadata
  const tags = tagState(link.data, previous)
  const humanTopical = tags.human.filter((tag) => !isIgnoredTag(tag, taxonomy))

  let generated
  let usage
  if (!basis) {
    attempt.status = content.ok ? 'insufficient-content' : 'failed'
    if (!content.ok) attempt.error = { category: content.category, retryable: content.retryable, ...(content.detail ? { detail: String(content.detail).slice(0, 200) } : {}), ...(content.retryAfterSeconds !== undefined ? { retryAfterSeconds: content.retryAfterSeconds } : {}) }
  } else {
    const request = buildRequest({
      link: { ...link.data, excerpt: saved },
      content: basis === 'page' ? content : { metadata: extracted },
      vocabulary,
      taxonomy,
      humanTags: humanTopical,
      basis,
    })
    if (options.exportRequests) {
      context.exported.push({ slug: link.slug, targetUrl, basis, ...request })
      return { slug: link.slug, outcome: 'exported', basis }
    }
    const room = Math.max(0, maximumTags - topicalCount(tags.human, taxonomy))
    const tagOptions = { taxonomy, humanTags: tags.human, rejected: tags.rejected, maximum: room }
    const cacheKey = [provider.id, String(promptVersion), attempt.contentHash, link.slug, basis, humanTopical.map(normalizeTag).join(',')]
    generated = options.regenerate ? undefined : await cache.getGeneration(cacheKey)
    if (generated) generated = { ...generated, tags: normalizeTags(generated.tags, tagOptions), usage: { inputTokens: 0, outputTokens: 0, calls: 0 }, fromCache: true }
    else {
      try {
        generated = await generateMetadata(provider, { ...request, slug: link.slug }, { tagOptions })
        await cache.putGeneration(cacheKey, generated)
      } catch (error) {
        if (!(error instanceof ProviderError) || error.fatal) throw error
        attempt.status = 'failed'
        attempt.error = { category: error.category, retryable: error.retryable, detail: error.message.slice(0, 200) }
      }
    }
    usage = generated?.usage
    if (generated) {
      attempt.status = generated.sufficientContent ? 'enriched' : 'insufficient-content'
      attempt.model = provider.id
      attempt.servedModel = generated.servedModel && !provider.id.endsWith(`:${generated.servedModel}`) && generated.servedModel !== 'fake' ? generated.servedModel : undefined
      attempt.promptVersion = promptVersion
      attempt.warnings = generated.warnings
    }
  }

  const plan = planEnrichment({ data: link.data, generated: attempt.status === 'enriched' ? generated : undefined, extracted: attempt.status === 'enriched' ? extracted : {}, attempt, options: fillOptions })
  const unchangedOutcome = !Object.keys(plan.updates).length && sameOutcome(link.data.enrichment, plan.enrichment)
  const next = unchangedOutcome ? link.raw : rewriteLinkMarkdown(link.raw, plan.updates, plan.enrichment)
  const changed = next !== link.raw
  if (changed && options.apply) {
    const onDisk = await readFile(link.file, 'utf8')
    if (onDisk !== link.raw) return { slug: link.slug, outcome: 'conflict', reason: 'file changed on disk during the run; rerun to pick it up' }
    await writeFileAtomically(link.file, next)
  }
  if (plan.updates.tags) {
    const before = new Set(link.tags.map(normalizeTag))
    const after = new Set(plan.updates.tags.map(normalizeTag))
    addToVocabulary(vocabulary, [...after].filter((tag) => !before.has(tag) && !isIgnoredTag(tag, taxonomy)), [...before].filter((tag) => !after.has(tag) && !isIgnoredTag(tag, taxonomy)))
  }
  return {
    slug: link.slug,
    outcome: attempt.status,
    written: changed && Boolean(options.apply),
    basis,
    fromCache,
    changes: plan.changes,
    contentType: plan.enrichment.contentType,
    warnings: attempt.warnings,
    error: attempt.error,
    fetchIssue,
    duplicateOf,
    usage,
  }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0
  let failure
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length && !failure) {
      const index = cursor++
      try {
        results[index] = await worker(items[index], index)
      } catch (error) {
        failure ??= error
      }
    }
  }))
  return { results: results.filter(Boolean), failure }
}

export async function runEnrichment(options, { provider, taxonomy, fetchImpl = fetch, now = () => new Date(), log = () => {}, pacer = createHostPacer() } = {}) {
  const started = Date.now()
  const links = await loadLinks(options.contentDirectory ?? defaultContentDirectory)
  const vocabulary = buildVocabulary(links, taxonomy)
  const selected = selectLinks(links, options, provider.id)
  const context = {
    options: { ...options, reEnrich: options.reEnrich || ['stale', 'changed'].includes(options.selection) },
    provider,
    cache: createCache(options.cacheDirectory, { disabled: options.noCache }),
    pacer,
    vocabulary,
    taxonomy,
    index: urlIndex(links),
    fetchImpl,
    now,
    exported: [],
  }
  const { results, failure } = await runPool(selected, options.concurrency ?? 4, async (link, index) => {
    const result = await enrichLink(link, context)
    log(result, index, selected.length)
    return result
  })
  const usage = results.reduce((total, result) => ({
    inputTokens: total.inputTokens + (result.usage?.inputTokens ?? 0),
    outputTokens: total.outputTokens + (result.usage?.outputTokens ?? 0),
    calls: total.calls + (result.usage?.calls ?? 0),
  }), { inputTokens: 0, outputTokens: 0, calls: 0 })
  const outcomes = {}
  for (const result of results) outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1
  return {
    summary: {
      apply: Boolean(options.apply),
      model: provider.id,
      selected: selected.length,
      processed: results.length,
      written: results.filter((result) => result.written).length,
      outcomes,
      usage,
      estimatedCostUsd: estimateCost(provider, usage),
      seconds: Math.round((Date.now() - started) / 100) / 10,
      stoppedEarly: failure ? (failure instanceof Error ? failure.message : String(failure)) : undefined,
    },
    results,
    exported: context.exported,
    failure,
  }
}

// A snapshot of the collection's enrichment state, for `status`.
export function collectionStatus(links, { taxonomy, providerId }) {
  const count = (predicate) => links.filter(predicate).length
  const statuses = {}
  const bases = {}
  const failures = {}
  for (const link of links) {
    const status = link.enrichment?.status ?? 'not-attempted'
    statuses[status] = (statuses[status] ?? 0) + 1
    if (link.enrichment?.basis) bases[link.enrichment.basis] = (bases[link.enrichment.basis] ?? 0) + 1
    if (status === 'failed') {
      const key = `${link.enrichment.error?.category ?? 'unknown'}${link.enrichment.error?.retryable ? ' (retryable)' : ''}`
      failures[key] = (failures[key] ?? 0) + 1
    }
  }
  const humanFields = {}
  for (const link of links) {
    for (const [field, record] of Object.entries(link.enrichment?.fields ?? {})) {
      if (field !== 'tags' && fieldState(link.data, link.enrichment, field) === 'human') humanFields[field] = (humanFields[field] ?? 0) + 1
      else if (field === 'tags' && Array.isArray(record.rejected) && record.rejected.length) humanFields['tags (some rejected)'] = (humanFields['tags (some rejected)'] ?? 0) + 1
    }
  }
  return {
    links: links.length,
    statuses,
    bases,
    failures,
    missingDescription: count((link) => !String(link.data.description ?? '').trim()),
    withoutTopicalTags: count((link) => topicalCount(link.tags, taxonomy) === 0),
    staleForCurrentModel: providerId ? count((link) => stale(link, providerId)) : undefined,
    humanEditedFields: humanFields,
    possibleDuplicates: links.filter((link) => link.enrichment?.duplicateOf).map((link) => ({ slug: link.slug, duplicateOf: link.enrichment.duplicateOf })),
    topicalTags: buildVocabulary(links, taxonomy).size,
  }
}
