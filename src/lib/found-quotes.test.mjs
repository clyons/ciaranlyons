import assert from 'node:assert/strict'
import test from 'node:test'
import { foundQuoteDescription, foundQuoteTitle, resolveFoundQuotes } from './found-quotes.ts'

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

test('Writing collections resolve Found Quotes in authored order', () => {
  assert.deepEqual(resolveFoundQuotes(['second', 'first'], quotes, 'writing/example.md'), [quotes[1], quotes[0]])
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
