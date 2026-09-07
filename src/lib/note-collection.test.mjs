import assert from 'node:assert/strict'
import test from 'node:test'
import { limitNotes, mergeNoteSources } from './note-collection.ts'

function note(id, date, extras = {}) {
  const [year, month, day] = date.split('-')
  return {
    id,
    text: `Note ${id}`,
    date,
    year,
    month,
    day,
    facets: [],
    media: [],
    url: `/notes/${year}/${month}/${day}/${id}`,
    ...extras,
  }
}

test('local and remote notes merge completely with local records winning duplicates', () => {
  const remote = Array.from({ length: 60 }, (_, index) => note(
    `note-${index}`,
    `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
    { uri: `at://did:plc:example/app.bsky.feed.post/note-${index}`, source: 'bluesky' },
  ))
  const local = [note('note-0', '2026-09-06', {
    uri: remote[0].uri,
    source: 'bluesky',
    facets: [{ index: { byteStart: 0, byteEnd: 4 }, features: [] }],
  })]

  const complete = mergeNoteSources(local, remote)
  assert.equal(complete.length, 60)
  assert.equal(complete[0], local[0])
  assert.equal(limitNotes(complete, 50).length, 50)
  assert.equal(complete.length, 60)
})

test('note limits reject invalid values', () => {
  assert.throws(() => limitNotes([], -1), /non-negative integer/)
  assert.throws(() => limitNotes([], 1.5), /non-negative integer/)
})
