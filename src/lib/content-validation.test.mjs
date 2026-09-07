import assert from 'node:assert/strict'
import test from 'node:test'
import { assertUnique, optionalHttpUrl, validateDate, validateSegment, validateTimestamp, validateTopic, webUrl } from './content-validation.ts'

test('dates require real calendar values', () => {
  assert.equal(validateDate('2024-02-29', 'entry.md'), '2024-02-29')
  assert.throws(() => validateDate('2024-02-30', 'entry.md'), /real calendar date/)
  assert.throws(() => validateDate('', 'entry.md'), /valid YYYY-MM-DD/)
})

test('timestamps require an ISO-like date-time with a valid value', () => {
  assert.equal(validateTimestamp('2026-09-07T12:30:00.000Z', 'entry.md', 'savedAt'), '2026-09-07T12:30:00.000Z')
  assert.throws(() => validateTimestamp('2026-09-07', 'entry.md', 'savedAt'), /RFC 3339/)
  assert.throws(() => validateTimestamp('2026-02-30T12:00:00Z', 'entry.md', 'savedAt'), /RFC 3339/)
})

test('route segments and topics reject reserved or unsafe values', () => {
  assert.equal(validateSegment('safe-slug', 'entry.md', 'slug'), 'safe-slug')
  assert.throws(() => validateSegment('../escape', 'entry.md', 'slug'), /unsafe/)
  assert.throws(() => validateTopic('2026', 'entry.md'), /reserved/)
})

test('outbound URLs allow only HTTP and HTTPS', () => {
  assert.equal(optionalHttpUrl('https://bsky.app/profile/test', 'entry.md', 'originalUrl'), 'https://bsky.app/profile/test')
  assert.throws(() => optionalHttpUrl('javascript:alert(1)', 'entry.md', 'originalUrl'), /HTTP\(S\)/)
})

test('site links permit rooted paths but reject protocol-relative URLs', () => {
  assert.equal(webUrl('/projects/#one', 'fixture', 'url'), '/projects/#one')
  assert.throws(() => webUrl('//evil.example/path', 'fixture', 'url'), /site path or HTTP\(S\) URL|HTTP\(S\) URL/)
})

test('duplicate identities report both sources', () => {
  const items = [{ id: 'same', file: 'a.md' }, { id: 'same', file: 'b.md' }]
  assert.throws(() => assertUnique(items, (item) => item.id, (item) => item.file), /a\.md and b\.md/)
})
