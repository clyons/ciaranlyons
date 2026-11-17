// Stage 2: turn extracted content into proposed metadata. This module builds the prompt,
// owns the output schema, and validates whatever a provider returns. It knows nothing
// about HTTP fetching or Markdown files, and nothing about any one model vendor.
import { canonicalTag, isIgnoredTag, vocabularyEntries } from './vocabulary.mjs'

// Bump when the prompt or validation rules change in a way that should make earlier
// generations eligible for `--stale` re-enrichment.
export const promptVersion = 2

export const contentTypes = [
  'article', 'essay', 'news', 'blog-post', 'interview', 'tutorial', 'documentation', 'reference',
  'research-paper', 'report', 'book', 'tool', 'product', 'repository', 'dataset', 'video',
  'podcast', 'talk', 'presentation', 'comic', 'image', 'social-post', 'thread', 'newsletter',
  'announcement', 'other',
]

export const outputSchema = {
  type: 'object',
  properties: {
    sufficientContent: {
      type: 'boolean',
      description: 'False when the supplied material is too thin, off-topic, or generic (for example a login wall, an error page, or only a title) to describe the resource without guessing.',
    },
    description: {
      type: 'string',
      description: 'One sentence of about 15 to 30 words describing the substance of the resource. Empty when sufficientContent is false.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Two to five lowercase hyphenated tags. Reuse vocabulary tags where they fit. Empty when sufficientContent is false.',
    },
    contentType: { type: 'string', enum: contentTypes },
  },
  required: ['sufficientContent', 'description', 'tags', 'contentType'],
  additionalProperties: false,
}

export const systemPrompt = `You write metadata for a personal archive of saved web links. Each request contains what was extracted from one saved page, plus the archive's existing tag vocabulary. Respond only through the JSON schema.

Description
- One sentence of roughly 15 to 30 words.
- State the substance: what the resource argues, explains, shows, or offers, and what makes it useful or distinctive.
- Neutral and specific. No marketing language, praise, or hype ("must-read", "fascinating", "great", "game-changing").
- Start with the substance, not a frame. Avoid openers such as "This article", "In this post", "The author discusses", "A look at".
- No first-person commentary and no address to the reader.
- Use only facts present in the supplied material. Do not infer dates, results, names, or claims that the material does not state.

Tags
- Two to five lowercase, hyphenated tags (for example ai-agents, software-discovery, distribution).
- Prefer an existing vocabulary tag whenever it fits, including close variants: use the vocabulary's spelling rather than a synonym, plural, or abbreviation of it.
- Add a new tag only when it marks a meaningful distinction the vocabulary lacks.
- Cover the subject and, where it is genuinely present, a recurring conceptual theme. Concepts may be named even when the source uses different words.
- Avoid generic categories (technology, article, news, blog, interesting) and avoid near-duplicates within one entry.

If the material is too thin to describe the resource without guessing, set sufficientContent to false and leave description and tags empty. A truthful empty answer is better than an invented one.`

const maximumPromptContentCharacters = 9_000
const maximumVocabularyTags = 200

function line(label, value) {
  return value ? `${label}: ${value}\n` : ''
}

// The material handed to the model. Ordered so the stable parts come first.
export function buildRequest({ link, content, vocabulary, taxonomy, humanTags = [], basis }) {
  const entries = vocabularyEntries(vocabulary, maximumVocabularyTags)
  const vocabularyText = entries.length
    ? entries.map(({ tag, count }) => `${tag} (${count})`).join(', ')
    : '(empty: this is one of the first entries, so choose clear, reusable tags)'
  const interests = taxonomy.interests?.length ? `Recurring interests of the archive's owner, for context only: ${taxonomy.interests.join('; ')}\n\n` : ''
  const metadata = content?.metadata ?? {}
  const text = String(content?.text ?? '').slice(0, maximumPromptContentCharacters)
  const user = [
    `Tag vocabulary with usage counts: ${vocabularyText}\n`,
    interests,
    'Saved link\n',
    line('Title', link.title),
    line('URL', link.targetUrl),
    line('Found via', link.sourceTitle),
    line('Author (as saved)', link.author),
    line('Originally published', link.publishedAt?.slice(0, 10)),
    humanTags.length ? line('Tags already chosen by the owner (keep, do not repeat)', humanTags.join(', ')) : '',
    '\nPage metadata\n',
    line('Page title', metadata.title),
    line('Page description', metadata.description),
    line('Publisher', metadata.publisher),
    line('Byline', metadata.author),
    line('Declared type', [metadata.schemaType, metadata.ogType].filter(Boolean).join(', ')),
    link.excerpt ? line('\nExcerpt saved from the feed', link.excerpt) : '',
    basis === 'page'
      ? `\nExtracted page text (navigation and boilerplate removed, may be truncated)\n"""\n${text}\n"""\n`
      : '\nThe page itself could not be read in full; only the metadata and excerpt above are available. Describe only what they support.\n',
  ].join('')
  return { system: systemPrompt, user, schema: outputSchema }
}

const firstPersonPattern = { test: (value) => /\b(?:i'm|i've|i'd|my|mine|we|we're|we've|our|ours)\b/i.test(value) || /\b(?:me|us)\b/.test(value) || /(?:^|[.,;:]\s*)I\b/.test(value) }
const framingPattern = /^(?:this|the|in this|a look at|an? (?:interesting|great|fascinating))\s*(?:article|post|piece|blog post|essay|page|video|episode|story|write-?up|thread|site)\b/i
const hypePattern = /\b(?:must[- ]read|game[- ]chang\w*|amazing|awesome|fascinating|incredible|interesting|great read|brilliant|revolutionary|ultimate|essential reading|you(?:'ll)? (?:need|want))\b/i

export function wordCount(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length
}

export function normalizeDescription(text) {
  let value = String(text ?? '').replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '')
  if (value && !/[.!?…]$/.test(value)) value = `${value}.`
  return value
}

// Problems that are worth one corrective retry. Returned as plain sentences so they can be
// fed back to the model.
export function descriptionProblems(description) {
  const problems = []
  const words = wordCount(description)
  if (words < 10) problems.push(`The description has ${words} words; write about 15 to 30.`)
  if (words > 40) problems.push(`The description has ${words} words; keep it to about 15 to 30 in one sentence.`)
  if ((description.match(/[.!?](?:\s|$)/g) ?? []).length > 1 && words > 12) problems.push('Use a single sentence.')
  if (firstPersonPattern.test(description)) problems.push('Remove first-person words and address to the reader.')
  if (framingPattern.test(description)) problems.push('Start with the substance rather than a frame such as "This article".')
  if (hypePattern.test(description)) problems.push('Remove praise or marketing language.')
  return problems
}

// Apply the folksonomy rules to proposed tags: normalise, apply reviewed aliases, drop
// generic or rejected tags and ones the owner already applied, and cap the count.
export function normalizeTags(proposed, { taxonomy, humanTags = [], rejected = [], maximum = 5 }) {
  const taken = new Set(humanTags.map((tag) => canonicalTag(tag, taxonomy)))
  const blocked = new Set(rejected.map((tag) => canonicalTag(tag, taxonomy)))
  const result = []
  for (const raw of Array.isArray(proposed) ? proposed : []) {
    const tag = canonicalTag(raw, taxonomy)
    if (!tag || tag.length < 2 || isIgnoredTag(tag, taxonomy) || taken.has(tag) || blocked.has(tag) || result.includes(tag)) continue
    result.push(tag)
  }
  return result.slice(0, Math.max(0, maximum))
}

export class ProviderError extends Error {
  // `fatal` stops the run (bad credentials, bad configuration, exhausted rate limit) so a
  // provider problem is never written into hundreds of Links as if each had failed.
  constructor(message, { fatal = false, retryable = false, category = 'provider-error', cause } = {}) {
    super(message, { cause })
    this.name = 'ProviderError'
    this.fatal = fatal
    this.retryable = retryable
    this.category = category
  }
}

function validateOutput(raw) {
  const invalid = (message) => { throw new ProviderError(message, { category: 'invalid-output', retryable: true }) }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid('Model returned no JSON object')
  for (const field of outputSchema.required) {
    if (!Object.hasOwn(raw, field)) invalid(`Model output is missing ${field}`)
  }
  if (Object.keys(raw).some((field) => !Object.hasOwn(outputSchema.properties, field))) invalid('Model output contains unexpected properties')
  if (typeof raw.sufficientContent !== 'boolean') invalid('Model output sufficientContent must be a boolean')
  if (typeof raw.description !== 'string') invalid('Model output description must be a string')
  if (!Array.isArray(raw.tags) || !raw.tags.every((tag) => typeof tag === 'string')) invalid('Model output tags must be an array of strings')
  if (!contentTypes.includes(raw.contentType)) invalid('Model output contentType must be a supported type')
  return raw
}

// Calls the provider, validates, and retries once with specific feedback when the
// description breaks a rule. A second failure keeps the better attempt and records why.
export async function generateMetadata(provider, request, { tagOptions }) {
  const usage = { inputTokens: 0, outputTokens: 0, calls: 0 }
  const attempt = async (feedback) => {
    const response = await provider.generate({ ...request, user: feedback ? `${request.user}\n\nYour previous answer needs revision: ${feedback}` : request.user })
    usage.calls += 1
    usage.inputTokens += response.usage?.inputTokens ?? 0
    usage.outputTokens += response.usage?.outputTokens ?? 0
    return { output: validateOutput(response.output), servedModel: response.servedModel }
  }

  let { output, servedModel } = await attempt()
  let problems = output.sufficientContent ? descriptionProblems(normalizeDescription(output.description)) : []
  if (problems.length) {
    const retry = await attempt(problems.join(' '))
    const retryProblems = retry.output.sufficientContent ? descriptionProblems(normalizeDescription(retry.output.description)) : []
    if (retryProblems.length <= problems.length) {
      output = retry.output
      servedModel = retry.servedModel ?? servedModel
      problems = retryProblems
    }
  }

  if (!output.sufficientContent) {
    return { sufficientContent: false, description: '', tags: [], contentType: output.contentType, warnings: [], usage, servedModel }
  }
  const description = normalizeDescription(output.description)
  const tags = normalizeTags(output.tags, tagOptions)
  const warnings = [...problems]
  if (!tags.length) warnings.push('No usable tags after normalisation.')
  // A description that still breaks hard limits is not written; tags may still be useful.
  const usable = wordCount(description) >= 8 && wordCount(description) <= 45
  return { sufficientContent: true, description: usable ? description : '', tags, contentType: output.contentType, warnings, usage, servedModel }
}
