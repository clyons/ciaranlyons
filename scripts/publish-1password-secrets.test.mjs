import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeFieldsIntoTemplate, readItem } from './publish-1password-secrets.ts'

test('1Password item lookup treats only a genuine absence as missing', async () => {
  const missing = await readItem('missing', async () => {
    throw Object.assign(new Error('command failed'), { stderr: `"missing" isn't an item in this vault` })
  })
  assert.equal(missing, undefined)

  await assert.rejects(
    readItem('private', async () => {
      throw Object.assign(new Error('command failed'), { stderr: 'authentication required' })
    }),
    /command failed/,
  )
})

test('managed field pruning preserves unrelated 1Password fields', () => {
  const merged = mergeFieldsIntoTemplate({
    title: 'dev:test',
    fields: [
      { label: 'local.OLD', value: 'remove' },
      { label: 'cli.KEEP', value: 'before' },
      { label: 'notesPlain', value: 'preserve' },
    ],
  }, { 'cli.KEEP': 'after' }, true)

  assert.deepEqual(merged.fields?.map(({ label, value }) => ({ label, value })), [
    { label: 'cli.KEEP', value: 'after' },
    { label: 'notesPlain', value: 'preserve' },
  ])
})
