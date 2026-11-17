// Link metadata enrichment: descriptions, folksonomy tags, and page metadata for
// content/links. See docs/operations/enrich-links.md for the operating guide.
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { defaultContentDirectory, collectionStatus, loadLinks, runEnrichment } from './link-enrichment/pipeline.mjs'
import { fieldState, readEnrichment, rewriteLinkMarkdown, tagState } from './link-enrichment/persist.mjs'
import { defaultModelSpec, resolveProvider } from './link-enrichment/providers.mjs'
import { buildVocabulary, canonicalTag, defaultTaxonomyFile, isIgnoredTag, loadTaxonomy, normalizeTag, suggestDuplicateTags, validateTaxonomy, vocabularyEntries } from './link-enrichment/vocabulary.mjs'

const usage = `Usage: node scripts/enrich-links.mjs <command> [options]

Commands
  run (default)    Enrich Links. Dry run unless --apply.
  status           Summarise enrichment state across the collection.
  show <slug>      Show one Link's metadata and field provenance.
  failures         List failed enrichments with their error category.
  tags             Show the tag vocabulary and possible duplicate tags.
  merge-tags       Rename a tag across every Link (--from A --to B), dry run unless --apply.
  keep-distinct    Record two tags as reviewed and not duplicates (A B), dry run unless --apply.

Selecting Links for run (default: --missing, Links never enriched)
  --slug SLUG        One Link by file slug; repeatable.
  --url URL          One Link by target URL; repeatable.
  --slugs-file FILE  Slugs, one per line.
  --missing | --failed | --stale | --changed | --all
  --include-permanent  With --failed, also retry broken or restricted destinations.
  --limit N  --offset N

Behaviour
  --apply            Write changes. Without it nothing in content/ changes.
  --re-enrich        Regenerate fields the enricher wrote that nobody has edited since.
  --fields a,b       Limit to description, tags, author, sourceTitle.
  --replace-excerpts Treat imported Feedly excerpts (ending in "…") as replaceable.
  --model P:M        Provider and model (default $LINK_ENRICH_MODEL or ${defaultModelSpec}).
  --effort LEVEL     Reasoning effort for OpenAI or Anthropic (default low for the default model).
  --refetch          Ignore cached page content.  --regenerate  Ignore cached model output.
  --concurrency N    Links in flight (default 4; one request per host at a time).
  --report FILE      Write a JSON report (keep it under .context/).
  --export-requests FILE  Write prompts as JSON Lines instead of calling a model.
  --allow-fake       Permit --apply with the fake provider (tests only).
`

export function parseArgs(argv) {
  const options = { command: 'run', positional: [], slugs: [], urls: [], selection: 'missing', apply: false, concurrency: 4 }
  const args = [...argv]
  if (args[0] && !args[0].startsWith('-')) options.command = args.shift()
  const value = (flag) => {
    const next = args.shift()
    if (next === undefined || next.startsWith('--')) throw new Error(`${flag} needs a value`)
    return next
  }
  const integer = (flag, minimum = 0) => {
    const number = Number(value(flag))
    if (!Number.isInteger(number) || number < minimum) throw new Error(`${flag} must be an integer of at least ${minimum}`)
    return number
  }
  while (args.length) {
    const arg = args.shift()
    if (arg === '--apply') options.apply = true
    else if (arg === '--slug') options.slugs.push(value(arg))
    else if (arg === '--url') options.urls.push(value(arg))
    else if (arg === '--slugs-file') options.slugsFile = value(arg)
    else if (['--missing', '--failed', '--stale', '--changed', '--all'].includes(arg)) options.selection = arg.slice(2)
    else if (arg === '--include-permanent') options.includePermanent = true
    else if (arg === '--limit') options.limit = integer(arg, 1)
    else if (arg === '--offset') options.offset = integer(arg)
    else if (arg === '--re-enrich') options.reEnrich = true
    else if (arg === '--fields') {
      options.fields = value(arg).split(',').map((field) => field.trim()).filter(Boolean)
      const unknown = options.fields.filter((field) => !['description', 'tags', 'author', 'sourceTitle'].includes(field))
      if (unknown.length) throw new Error(`Unknown field: ${unknown.join(', ')}`)
    } else if (arg === '--replace-excerpts') options.replaceExcerpts = true
    else if (arg === '--model') options.model = value(arg)
    else if (arg === '--effort') options.effort = value(arg)
    else if (arg === '--refetch') options.refetch = true
    else if (arg === '--regenerate') options.regenerate = true
    else if (arg === '--no-cache') options.noCache = true
    else if (arg === '--max-age-days') options.maximumAgeDays = integer(arg, 1)
    else if (arg === '--concurrency') options.concurrency = integer(arg, 1)
    else if (arg === '--report') options.report = value(arg)
    else if (arg === '--export-requests') options.exportRequests = value(arg)
    else if (arg === '--allow-fake') options.allowFake = true
    else if (arg === '--json') options.json = true
    else if (arg === '--from') options.from = value(arg)
    else if (arg === '--to') options.to = value(arg)
    else if (arg === '--content') options.contentDirectory = value(arg)
    else if (arg === '--taxonomy') options.taxonomyFile = value(arg)
    else if (arg === '--cache') options.cacheDirectory = value(arg)
    else if (arg === '--help' || arg === '-h') options.command = 'help'
    else if (!arg.startsWith('-')) options.positional.push(arg)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (options.concurrency > 16) throw new Error('--concurrency must be 16 or less')
  if (options.exportRequests && options.apply) throw new Error('--export-requests only writes prompts; run again with the file provider to --apply')
  return options
}

async function writeAtomically(destination, contents) {
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

function describeResult(result, apply) {
  const verb = result.written ? 'wrote' : apply ? 'kept' : 'would write'
  const lines = [`${result.outcome.padEnd(20)} ${result.slug}${result.basis ? ` [${result.basis}${result.fromCache ? ', cached page' : ''}]` : ''}`]
  for (const change of result.changes ?? []) {
    if (!result.written && apply) continue
    const to = Array.isArray(change.to) ? change.to.join(', ') : change.to
    lines.push(`    ${verb} ${change.field}: ${to}`)
  }
  if (result.fetchIssue) lines.push(`    fetch: ${result.fetchIssue}`)
  if (result.duplicateOf) lines.push(`    possible duplicate of ${result.duplicateOf}`)
  if (result.error) lines.push(`    error: ${result.error.category}${result.error.retryable ? ' (retryable)' : ''}${result.error.detail ? `: ${result.error.detail}` : ''}`)
  for (const warning of result.warnings ?? []) lines.push(`    warning: ${warning}`)
  if (result.reason) lines.push(`    ${result.reason}`)
  return lines.join('\n')
}

async function commandRun(options) {
  const taxonomy = await loadTaxonomy(options.taxonomyFile)
  const spec = options.model ?? process.env.LINK_ENRICH_MODEL ?? defaultModelSpec
  const provider = resolveProvider(spec, { effort: options.effort })
  if (provider.fake && options.apply && !options.allowFake) throw new Error('The fake provider writes filler; it can only --apply with --allow-fake')
  if (options.slugsFile) options.slugs.push(...(await readFile(options.slugsFile, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
  console.log(`${options.apply ? 'Enriching' : 'Dry run (no files change)'} with ${provider.id}`)
  const run = await runEnrichment(options, {
    provider,
    taxonomy,
    log: (result, index, total) => console.log(`[${index + 1}/${total}] ${describeResult(result, options.apply)}`),
  })
  if (options.exportRequests) {
    await writeAtomically(path.resolve(options.exportRequests), run.exported.map((entry) => JSON.stringify(entry)).join('\n') + (run.exported.length ? '\n' : ''))
    console.log(`Exported ${run.exported.length} requests to ${options.exportRequests}`)
  }
  if (options.report) await writeAtomically(path.resolve(options.report), `${JSON.stringify({ summary: run.summary, results: run.results }, null, 2)}\n`)
  console.log(JSON.stringify(run.summary, null, 2))
  if (run.failure) throw run.failure
}

async function commandStatus(options) {
  const taxonomy = await loadTaxonomy(options.taxonomyFile)
  const links = await loadLinks(options.contentDirectory ?? defaultContentDirectory)
  const spec = options.model ?? process.env.LINK_ENRICH_MODEL ?? defaultModelSpec
  console.log(JSON.stringify({ model: spec, ...collectionStatus(links, { taxonomy, providerId: spec }) }, null, 2))
}

async function commandShow(options) {
  const slug = options.positional[0] ?? options.slugs[0]
  if (!slug) throw new Error('show needs a slug')
  const links = await loadLinks(options.contentDirectory ?? defaultContentDirectory)
  const link = links.find((candidate) => candidate.slug === slug)
  if (!link) throw new Error(`No Link with slug ${slug}`)
  const enrichment = readEnrichment(link.data)
  const tags = tagState(link.data, enrichment)
  console.log(JSON.stringify({
    slug,
    title: link.data.title,
    targetUrl: link.data.targetUrl,
    fields: Object.fromEntries(['description', 'author', 'sourceTitle'].map((field) => [field, { value: link.data[field] || undefined, provenance: fieldState(link.data, enrichment, field) }])),
    tags: { all: tags.current, byEnricher: tags.machine, byOthers: tags.human, rejected: tags.rejected },
    enrichment,
  }, null, 2))
}

async function commandFailures(options) {
  const links = await loadLinks(options.contentDirectory ?? defaultContentDirectory)
  const failed = links.filter((link) => ['failed', 'insufficient-content'].includes(link.enrichment?.status))
  for (const link of failed.slice(0, options.limit ?? failed.length)) {
    const error = link.enrichment.error
    console.log(`${link.enrichment.status.padEnd(21)} ${link.slug}\n    ${link.data.targetUrl}\n    ${error ? `${error.category}${error.retryable ? ' (retryable)' : ''}${error.detail ? `: ${error.detail}` : ''}` : link.enrichment.fetchIssue ?? 'not enough content to describe without guessing'} · attempts ${link.enrichment.attempts ?? 1} · last ${link.enrichment.lastAttemptAt}`)
  }
  console.log(`${failed.length} Links failed or had too little content. Retry transient failures with: npm run links:enrich -- --failed --apply`)
}

async function commandTags(options) {
  const taxonomy = await loadTaxonomy(options.taxonomyFile)
  const links = await loadLinks(options.contentDirectory ?? defaultContentDirectory)
  const vocabulary = buildVocabulary(links, taxonomy)
  const suggestions = suggestDuplicateTags(vocabulary, taxonomy)
  if (options.json) {
    console.log(JSON.stringify({ vocabulary: vocabularyEntries(vocabulary), suggestions, aliases: taxonomy.aliases }, null, 2))
    return
  }
  console.log(`${vocabulary.size} topical tags across ${links.length} Links`)
  for (const { tag, count } of vocabularyEntries(vocabulary, options.limit ?? 100)) console.log(`${String(count).padStart(5)}  ${tag}`)
  console.log(suggestions.length ? '\nPossible duplicates (review, then merge or keep distinct):' : '\nNo likely duplicate tags.')
  for (const suggestion of suggestions) {
    console.log(`  ${suggestion.from} (${suggestion.counts[suggestion.from]}) -> ${suggestion.to} (${suggestion.counts[suggestion.to]})  [${suggestion.reason}]`)
    console.log(`      npm run links:enrich -- merge-tags --from ${suggestion.from} --to ${suggestion.to} --apply   |   npm run links:enrich -- keep-distinct ${suggestion.from} ${suggestion.to} --apply`)
  }
}

export function renameTagInLink(link, from, to) {
  const enrichment = readEnrichment(link.data)
  const state = tagState(link.data, enrichment)
  const tags = state.current
  const hasCurrent = tags.some((tag) => normalizeTag(tag) === from)
  if (!hasCurrent && ![...state.machine, ...state.rejected].includes(from)) return undefined
  const next = []
  for (const tag of tags) {
    const replacement = normalizeTag(tag) === from ? to : tag
    if (!next.some((existing) => normalizeTag(existing) === normalizeTag(replacement))) next.push(replacement)
  }
  let nextEnrichment = link.data.enrichment
  if (enrichment?.fields?.tags) {
    const record = enrichment.fields.tags
    const rename = (list) => Array.isArray(list) ? [...new Set(list.map((tag) => (normalizeTag(tag) === from ? to : tag)))] : list
    // Resolve ownership before deduplication: a merged human tag stays human even
    // when its synonym was generated (regardless of which direction the merge goes).
    const human = new Set(rename(state.human).map(normalizeTag))
    const added = rename(state.machine).filter((tag) => !human.has(normalizeTag(tag)))
    // Capture inferred removals before renaming so an old generated spelling can
    // never become a fresh proposal after the taxonomy alias is recorded.
    const rejected = rename(state.rejected)
    nextEnrichment = { ...link.data.enrichment, fields: { ...enrichment.fields, tags: { ...record, added, ...(rejected.length ? { rejected } : {}) } } }
  }
  return rewriteLinkMarkdown(link.raw, hasCurrent ? { tags: next } : {}, nextEnrichment)
}

async function writeTaxonomy(file, taxonomy) {
  validateTaxonomy(taxonomy, file)
  await writeAtomically(path.resolve(file), `${JSON.stringify(taxonomy, null, 2)}\n`)
}

async function commandMergeTags(options) {
  const from = normalizeTag(options.from)
  const requestedTo = normalizeTag(options.to)
  if (!from || !requestedTo || from === requestedTo) throw new Error('merge-tags needs --from and --to naming two different tags')
  const taxonomyFile = options.taxonomyFile ?? defaultTaxonomyFile
  const taxonomy = await loadTaxonomy(taxonomyFile)
  const to = canonicalTag(requestedTo, taxonomy)
  if (from === to) {
    console.log(`${requestedTo} already resolves to ${from}; no changes needed`)
    return
  }
  if (isIgnoredTag(to, taxonomy)) throw new Error(`${to} is an ignored tag and cannot be a merge target`)
  // Resolve and validate the final mappings before rewriting any Link.
  const aliases = Object.fromEntries(Object.entries(taxonomy.aliases).map(([alias, target]) => [alias, target === from ? to : target]))
  aliases[from] = to
  const nextTaxonomy = validateTaxonomy({ ...taxonomy, aliases: Object.fromEntries(Object.entries(aliases).sort()) }, taxonomyFile)
  const links = await loadLinks(options.contentDirectory ?? defaultContentDirectory)
  let changed = 0
  for (const link of links) {
    const next = renameTagInLink(link, from, to)
    if (!next || next === link.raw) continue
    changed += 1
    console.log(`${options.apply ? 'rewrite' : 'would rewrite'} ${link.slug}`)
    if (options.apply) await writeAtomically(link.file, next)
  }
  // Future generations normalise the merged tag automatically.
  if (options.apply) await writeTaxonomy(taxonomyFile, nextTaxonomy)
  console.log(`${options.apply ? 'Merged' : 'Dry run: would merge'} ${from} into ${to} on ${changed} Links${options.apply ? ` and recorded the alias in ${taxonomyFile}` : '; add --apply to write'}`)
}

async function commandKeepDistinct(options) {
  const [a, b] = options.positional.map(normalizeTag)
  if (!a || !b || a === b) throw new Error('keep-distinct needs two different tags')
  const taxonomyFile = options.taxonomyFile ?? defaultTaxonomyFile
  const taxonomy = await loadTaxonomy(taxonomyFile)
  const pair = [a, b].sort()
  if (!taxonomy.distinct.some((existing) => existing.map(normalizeTag).sort().join('|') === pair.join('|'))) taxonomy.distinct.push(pair)
  if (options.apply) await writeTaxonomy(taxonomyFile, taxonomy)
  console.log(`${options.apply ? 'Recorded' : 'Dry run: would record'} ${pair.join(' and ')} as distinct in ${taxonomyFile}${options.apply ? '' : '; add --apply to write'}`)
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.command === 'help') return console.log(usage)
  if (options.command === 'run') return commandRun(options)
  if (options.command === 'status') return commandStatus(options)
  if (options.command === 'show') return commandShow(options)
  if (options.command === 'failures') return commandFailures(options)
  if (options.command === 'tags') return commandTags(options)
  if (options.command === 'merge-tags') return commandMergeTags(options)
  if (options.command === 'keep-distinct') return commandKeepDistinct(options)
  throw new Error(`Unknown command: ${options.command}\n\n${usage}`)
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Link enrichment failed')
    process.exit(1)
  })
}
