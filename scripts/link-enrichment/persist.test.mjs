import assert from 'node:assert/strict'
import test from 'node:test'
import { fieldState, fillableFields, fingerprint, isImportedExcerpt, parseLinkMarkdown, planEnrichment, readEnrichment, rewriteLinkMarkdown, tagState } from './persist.mjs'
import { validateTaxonomy } from './vocabulary.mjs'

const taxonomy = validateTaxonomy({ ignored: ['Saved For Later'] })
const options = { taxonomy }
const description = 'An examination of how autonomous AI agents may change software discovery, purchasing decisions, and competitive advantage.'
const excerpt = `${'Opening words of the article that the feed supplied when the link was saved, '.repeat(3).trim()} and more…`
const attempt = { status: 'enriched', at: '2026-11-14T12:00:00.000Z', model: 'anthropic:claude-opus-5-5', promptVersion: 1, basis: 'page', contentHash: 'sha256:abc', fetchedAt: '2026-11-14T11:59:00.000Z', httpStatus: 200 }

const markdown = (fields, body = '') => `---\n${fields.join('\n')}\n---\n${body}`
const base = [
  'title: "Agents and discovery"',
  'description: ""',
  'date: 2025-03-04',
  'savedAt: "2025-03-04T10:00:00.000Z"',
  'dateSource: saved',
  'targetUrl: "https://example.com/agents"',
  'destinationStatus: verified',
  'destinationLastCheckedAt: "2026-09-09T05:08:28.279Z"',
  'feedlyId: "abc"',
  'tags: ["Saved For Later"]',
]

function apply(raw, generated, extracted = {}, extraOptions = {}, extraAttempt = {}) {
  const { data } = parseLinkMarkdown(raw)
  const plan = planEnrichment({ data, generated, extracted, attempt: { ...attempt, ...extraAttempt }, options: { ...options, ...extraOptions } })
  return { plan, next: rewriteLinkMarkdown(raw, plan.updates, plan.enrichment) }
}

test('empty fields are filled, existing tags kept, and provenance recorded per field', () => {
  const raw = markdown(base, 'Hand-written commentary stays.\n')
  const { plan, next } = apply(raw, { description, tags: ['ai-agents', 'software-discovery'], contentType: 'essay' }, { author: 'Ada Example', publisher: 'Example Journal' })
  const { data, body } = parseLinkMarkdown(next)
  assert.equal(data.description, description)
  assert.deepEqual(data.tags, ['Saved For Later', 'ai-agents', 'software-discovery'])
  assert.equal(data.author, 'Ada Example')
  assert.equal(data.sourceTitle, 'Example Journal')
  assert.equal(body, 'Hand-written commentary stays.\n')
  assert.deepEqual(data.enrichment.fields.description, { by: 'ai', hash: fingerprint(description) })
  assert.deepEqual(data.enrichment.fields.tags, { by: 'ai', added: ['ai-agents', 'software-discovery'] })
  assert.equal(data.enrichment.fields.author.by, 'extracted')
  assert.equal(data.enrichment.status, 'enriched')
  assert.equal(data.enrichment.contentType, 'essay')
  assert.equal(plan.changes.length, 4)
  // Untouched lines keep their exact original text.
  for (const line of base.filter((value) => !value.startsWith('description') && !value.startsWith('tags'))) assert.ok(next.includes(`${line}\n`), line)
})

test('human-authored and imported values are authoritative', () => {
  const raw = markdown(base.map((line) => line.startsWith('description') ? 'description: "Ciaran wrote this description himself."' : line).concat('author: "Original Author"'))
  const { plan, next } = apply(raw, { description, tags: ['ai-agents'] }, { author: 'Someone Else' })
  const { data } = parseLinkMarkdown(next)
  assert.equal(data.description, 'Ciaran wrote this description himself.')
  assert.equal(data.author, 'Original Author')
  assert.equal(data.enrichment.fields.description, undefined)
  assert.deepEqual(plan.changes.map((change) => change.field), ['tags'])
})

test('imported Feedly excerpts are replaced only when asked', () => {
  assert.equal(isImportedExcerpt(excerpt), true)
  assert.equal(isImportedExcerpt('A short note by the owner…'), false)
  assert.equal(isImportedExcerpt('MCP, which stands for Model Context Protocol, is an open standard that companies can use to integrate their external tools and data with compatible AI assistants. Imagine you’ve recently launched…Read more ›'), true)
  assert.equal(isImportedExcerpt(`${'A complete paragraph that a person wrote and finished properly with a full stop at the end. '.repeat(2)}`), false)
  const raw = markdown(base.map((line) => line.startsWith('description') ? `description: ${JSON.stringify(excerpt)}` : line))
  assert.equal(parseLinkMarkdown(apply(raw, { description, tags: [] }).next).data.description, excerpt)
  assert.equal(parseLinkMarkdown(apply(raw, { description, tags: [] }, {}, { replaceExcerpts: true }).next).data.description, description)
})

test('an edit after enrichment is detected and never overwritten, even on re-enrichment', () => {
  const first = apply(markdown(base), { description, tags: ['ai-agents', 'pricing'] }).next
  const edited = first.replace(`description: ${JSON.stringify(description)}`, 'description: "A sharper description Ciaran edited by hand after enrichment."')
  const { data } = parseLinkMarkdown(edited)
  assert.equal(fieldState(data, readEnrichment(data), 'description'), 'human')
  const second = apply(edited, { description: 'A newer model wrote a different sentence describing the very same page about agents.', tags: ['ai-agents', 'pricing'] }, {}, { reEnrich: true }).next
  const after = parseLinkMarkdown(second).data
  assert.equal(after.description, 'A sharper description Ciaran edited by hand after enrichment.')
  assert.deepEqual(after.enrichment.fields.description, { by: 'human' })
})

test('machine-written fields regenerate on re-enrichment only', () => {
  const first = apply(markdown(base), { description, tags: ['ai-agents'] }).next
  const newer = 'A newer model wrote a different sentence describing the very same page about agents and vendors.'
  const fill = parseLinkMarkdown(apply(first, { description: newer, tags: ['other'] }).next).data
  assert.equal(fill.description, description)
  assert.deepEqual(fill.tags, ['Saved For Later', 'ai-agents'])
  const refreshed = parseLinkMarkdown(apply(first, { description: newer, tags: ['other'] }, {}, { reEnrich: true }).next).data
  assert.equal(refreshed.description, newer)
  assert.deepEqual(refreshed.tags, ['Saved For Later', 'other'])
})

test('tags a person removes are remembered as rejected; tags a person adds are kept', () => {
  const first = apply(markdown(base), { description, tags: ['ai-agents', 'pricing'] }).next
  const edited = first.replace('tags: ["Saved For Later","ai-agents","pricing"]', 'tags: ["Saved For Later","ai-agents","Owner Pick"]')
  const state = tagState(parseLinkMarkdown(edited).data, readEnrichment(parseLinkMarkdown(edited).data))
  assert.deepEqual(state.rejected, ['pricing'])
  assert.deepEqual(state.human, ['Saved For Later', 'Owner Pick'])
  const again = parseLinkMarkdown(apply(edited, { description, tags: ['pricing', 'distribution'] }, {}, { reEnrich: true }).next).data
  assert.deepEqual(again.tags, ['Saved For Later', 'Owner Pick', 'distribution'])
  assert.deepEqual(again.enrichment.fields.tags, { by: 'ai', added: ['distribution'], rejected: ['pricing'] })
  const unchanged = apply(edited, { description, tags: ['ai-agents'] }, {}, { reEnrich: true })
  assert.equal(unchanged.plan.updates.tags, undefined, 'the same tag set in a new order is not a change')
})

test('populated fields are never replaced with empty values, and failures keep earlier provenance', () => {
  const first = apply(markdown(base), { description, tags: ['ai-agents'] }).next
  const failed = apply(first, undefined, {}, { reEnrich: true }, { status: 'failed', error: { category: 'timeout', retryable: true }, basis: undefined, contentHash: undefined, httpStatus: undefined, fetchedAt: undefined })
  const data = parseLinkMarkdown(failed.next).data
  assert.equal(data.description, description)
  assert.deepEqual(data.tags, ['Saved For Later', 'ai-agents'])
  assert.equal(data.enrichment.status, 'failed')
  assert.equal(data.enrichment.attempts, 1)
  assert.equal(data.enrichment.generatedAt, attempt.at)
  assert.deepEqual(data.enrichment.fields.tags.added, ['ai-agents'])
  assert.deepEqual(failed.plan.updates, {})
})

test('rewriting is idempotent and refuses changes to anything else', () => {
  const once = apply(markdown(base), { description, tags: ['ai-agents'] })
  const twice = rewriteLinkMarkdown(once.next, {}, parseLinkMarkdown(once.next).data.enrichment)
  assert.equal(twice, once.next)
  assert.throws(() => rewriteLinkMarkdown('no front-matter', {}, undefined), /front-matter/)
})

test('fillable fields reflect state, so complete Links are skipped before any request', () => {
  const first = apply(markdown(base.concat('author: "A"', 'sourceTitle: "S"')), { description, tags: ['ai-agents'] }).next
  const { data } = parseLinkMarkdown(first)
  assert.deepEqual(fillableFields(data, readEnrichment(data), { taxonomy }), [])
  assert.deepEqual(fillableFields(data, readEnrichment(data), { taxonomy, reEnrich: true }), ['description', 'tags'])
})
