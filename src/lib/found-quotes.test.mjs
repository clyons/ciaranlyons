import assert from 'node:assert/strict'
import test from 'node:test'
import { foundQuoteDescription, foundQuoteTitle, foundQuoteTypographyTier, resolveFoundQuotes, sortFoundQuotesByPublicationAndSourceDate } from './found-quotes.ts'

const quotes = [
  {
    slug: 'first',
    text: 'First quoted thought.',
    attribution: 'First Person',
    source: 'First Source',
    date: '2026-09-07',
    year: '2026',
    month: '09',
    day: '07',
    tags: [],
    preview: false,
    url: '/found-quotes/2026/09/07/first/',
  },
  {
    slug: 'second',
    text: 'Second quoted thought.',
    attribution: 'Second Person',
    source: 'Second Source',
    date: '2026-09-06',
    year: '2026',
    month: '09',
    day: '06',
    tags: [],
    preview: false,
    url: '/found-quotes/2026/09/06/second/',
  },
]

test('Found Quote titles and descriptions identify the attributed speaker', () => {
  assert.equal(foundQuoteTitle(quotes[0]), 'Found quote from First Person')
  assert.equal(foundQuoteDescription(quotes[0]), 'First quoted thought. — First Person')
})

test('Found Quote descriptions normalize whitespace and stay within meta length', () => {
  const description = foundQuoteDescription({
    text: `A long quotation\n\n${'with many words '.repeat(20)}`,
    attribution: 'A Person',
  })
  assert.ok(description.length <= 160)
  assert.doesNotMatch(description, /\n/)
  assert.match(description, /… — A Person$/)

  const longAttribution = foundQuoteDescription({ text: 'A thought.', attribution: 'A very long attribution '.repeat(20) })
  assert.ok(longAttribution.length <= 160)
})

test('Found Quote typography tiers follow normalized text length and paragraph structure', () => {
  assert.equal(foundQuoteTypographyTier('x'.repeat(40)), 'compact')
  assert.equal(foundQuoteTypographyTier('x'.repeat(41)), 'responsive')
  assert.equal(foundQuoteTypographyTier('x'.repeat(85)), 'responsive')
  assert.equal(foundQuoteTypographyTier('x'.repeat(86)), 'reading')
  assert.equal(foundQuoteTypographyTier(`  ${'x '.repeat(20)} `), 'compact')
  assert.equal(foundQuoteTypographyTier('😀'.repeat(40)), 'compact')
  assert.equal(foundQuoteTypographyTier('First paragraph.\r\n\r\nSecond paragraph.'), 'reading')
})

test('Writing collections resolve Found Quotes in authored order', () => {
  assert.deepEqual(resolveFoundQuotes(['second', 'first'], quotes, 'writing/example.md'), [quotes[1], quotes[0]])
})

test('Found Quotes sort by collection date, then source date', () => {
  const sorted = sortFoundQuotesByPublicationAndSourceDate([
    { slug: 'undated-source', date: '2026-09-07', sourceDate: undefined },
    { slug: 'older-source', date: '2026-09-07', sourceDate: '2012-05-11' },
    { slug: 'newer-source', date: '2026-09-07', sourceDate: '2019-03-25' },
    { slug: 'later-collection', date: '2026-09-08', sourceDate: '2000-01-01' },
    { slug: 'same-source-date-a', date: '2026-09-07', sourceDate: '2012-05-11' },
  ])

  assert.deepEqual(sorted.map(({ slug }) => slug), [
    'later-collection',
    'newer-source',
    'older-source',
    'same-source-date-a',
    'undated-source',
  ])
})

test('Writing collections reject duplicate and missing quote references', () => {
  assert.throws(
    () => resolveFoundQuotes(['first', 'first'], quotes, 'writing/example.md'),
    /writing\/example\.md: foundQuotes contains duplicate quote slug first/,
  )
  assert.throws(
    () => resolveFoundQuotes(['missing'], quotes, 'writing/example.md'),
    /writing\/example\.md: foundQuotes references missing quote slug missing/,
  )
})
