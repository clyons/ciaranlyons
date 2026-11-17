import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVocabulary, canonicalTag, emptyTaxonomy, isIgnoredTag, normalizeTag, suggestDuplicateTags, validateTaxonomy, vocabularyEntries } from './vocabulary.mjs'

const taxonomy = validateTaxonomy({ ignored: ['Saved For Later'], aliases: { 'ai-agent': 'ai-agents' }, distinct: [['design', 'designs']], interests: [] })

test('tags normalise to lowercase hyphenated slugs', () => {
  assert.equal(normalizeTag('  User Experience '), 'user-experience')
  assert.equal(normalizeTag('C++ & Rust'), 'cpp-and-rust')
  assert.equal(normalizeTag('Café’s'), 'cafes')
  assert.equal(normalizeTag('C#'), 'csharp')
})

test('reviewed aliases and ignored tags shape canonical tags', () => {
  assert.equal(canonicalTag('AI Agent', taxonomy), 'ai-agents')
  assert.equal(isIgnoredTag('Saved For Later', taxonomy), true)
  assert.equal(isIgnoredTag('technology', emptyTaxonomy()), true)
  assert.equal(isIgnoredTag('distribution', taxonomy), false)
})

test('the vocabulary counts topical tags once per Link and sorts by use', () => {
  const vocabulary = buildVocabulary([
    { tags: ['Saved For Later', 'ai-agents', 'AI Agents'] },
    { tags: ['ai-agents', 'distribution'] },
    { tags: ['distribution', 'automation'] },
    { tags: ['ai-agents'] },
  ], taxonomy)
  assert.deepEqual(vocabularyEntries(vocabulary), [
    { tag: 'ai-agents', count: 3 },
    { tag: 'distribution', count: 2 },
    { tag: 'automation', count: 1 },
  ])
})

test('near-duplicate suggestions cover plurals, acronyms, abbreviations, hyphenation, and spelling', () => {
  const counts = new Map([
    ['ai-agent', 1], ['ai-agents', 6],
    ['llm', 2], ['large-language-models', 5],
    ['ux', 3], ['user-experience', 3],
    ['open-source', 4], ['opensource', 1],
    ['typography', 4], ['typograpy', 1],
    ['design', 2], ['designs', 1],
    ['distribution', 3],
  ])
  const suggestions = suggestDuplicateTags(counts, taxonomy)
  const pairs = suggestions.map(({ from, to, reason }) => `${from}->${to}:${reason}`)
  assert.ok(pairs.includes('ai-agent->ai-agents:singular/plural'))
  assert.ok(pairs.includes('llm->large-language-models:acronym'))
  assert.ok(pairs.includes('ux->user-experience:abbreviation'))
  assert.ok(pairs.includes('opensource->open-source:hyphenation'))
  assert.ok(pairs.includes('typograpy->typography:spelling'))
  assert.ok(!pairs.some((pair) => pair.includes('designs')), 'pairs reviewed as distinct are not suggested again')
  assert.ok(!pairs.some((pair) => pair.includes('distribution')))
})

test('taxonomy validation rejects unnormalised or chained aliases', () => {
  assert.throws(() => validateTaxonomy({ aliases: { 'AI Agent': 'ai-agents' } }), /normalised/)
  assert.throws(() => validateTaxonomy({ aliases: { a: 'b', b: 'c' } }), /itself an alias/)
})
