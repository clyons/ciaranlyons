import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { validatePrBody } from './validate-pr-body.mjs'

const valid = `## Summary
Make publishing repeatable.
## ExecPlan
N/A reason: This changes only a small documentation example.
## Validation Evidence
- [x] npm run lint
npm run lint: 0 errors, 0 warnings. npm test: all tests passed.
## Risks / Follow-ups
No additional follow-up required.
`

test('accepts populated N/A and exact headings with substantive evidence', async () => {
  await validatePrBody(valid)
})

test('rejects malformed, placeholder, and empty-checklist bodies', async () => {
  for (const body of [
    '', valid.replace('## Validation Evidence', '## Validation evidence'),
    valid.replace('N/A reason: This changes only a small documentation example.', 'N/A reason: tiny'),
    valid.replace('all tests passed.', '<command output excerpts>'),
    valid.replace('npm run lint: 0 errors, 0 warnings. npm test: all tests passed.', '- [ ] `npx tsc --noEmit` (or explain N/A)'),
    valid.replace('No additional follow-up required.', '`.agent/execplans/YYYY-MM-DD-<slug>.md`'),
  ]) await assert.rejects(validatePrBody(body))
})

test('checks referenced plans even when a valid N/A reason is also present', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pr-body-'))
  const plan = '.agent/execplans/2026-10-23-publishing.md'
  try {
    await mkdir(path.join(root, '.agent/execplans'), { recursive: true })
    const body = valid.replace('N/A reason:', `${plan}\nN/A reason:`)
    await assert.rejects(validatePrBody(body, root), /does not exist/)
    await writeFile(path.join(root, plan), '# Publishing')
    await validatePrBody(body, root)
    await assert.rejects(validatePrBody(body + '\n.agent/execplans/2026-10-23-missing.md', root), /does not exist/)
    await writeFile(path.join(root, 'outside.md'), '# Not in plan directory')
    await symlink(path.join(root, 'outside.md'), path.join(root, '.agent/execplans/2026-10-23-outside.md'))
    await assert.rejects(validatePrBody(body.replace(plan, '.agent/execplans/2026-10-23-outside.md'), root), /does not exist/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
