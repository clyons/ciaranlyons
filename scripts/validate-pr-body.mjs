import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

// This is the metadata gate for both local preparation and PR Quality Gates.
export async function validatePrBody(body, root = process.cwd()) {
  const errors = []
  const sections = new Map()
  let section
  let fenced = false
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fenced = !fenced
    if (!fenced && /^## /.test(line)) {
      section = line
      if (sections.has(section)) errors.push(`Duplicate heading: ${section}`)
      sections.set(section, [])
    } else if (section) sections.get(section).push(line)
  }
  for (const heading of ['## Summary', '## ExecPlan', '## Validation Evidence', '## Risks / Follow-ups']) {
    if (!sections.has(heading)) errors.push(`Missing exact heading: ${heading}`)
  }
  if (/<command output excerpts>|\.agent\/execplans\/YYYY-MM-DD|<slug>|N\/A reason:\s*<text>|Describe what changed and why\.|List known risks, deferred items, or migration considerations\./.test(body)) {
    errors.push('Replace template placeholders with substantive evidence.')
  }
  const plans = [...new Set(body.match(/\.agent\/execplans\/\d{4}-\d{2}-\d{2}-[a-z0-9._-]+\.md/g) ?? [])]
  for (const plan of plans) {
    try {
      const target = await realpath(path.resolve(root, plan))
      const planRoot = await realpath(path.resolve(root, '.agent/execplans'))
      if (path.dirname(target) !== planRoot || !(await stat(target)).isFile()) throw new Error('not a plan file')
    } catch {
      errors.push(`Referenced ExecPlan does not exist in this PR: ${plan}`)
    }
  }
  const execSection = (sections.get('## ExecPlan') ?? []).join('\n')
  const hasPlan = plans.some((plan) => execSection.includes(plan))
  const hasReason = /N\/A reason:[ \t]*[\p{L}\p{N}][^\r\n<>]{14,}/u.test(execSection)
  if (!hasPlan && !hasReason) errors.push("ExecPlan must contain an existing plan path or a populated 'N/A reason: <text>' line (at least 15 characters).")
  const validation = (sections.get('## Validation Evidence') ?? []).join('\n')
  const evidence = validation.split('\n').filter((line) => !/^\s*- \[[ x]\]/i.test(line)).join('').replace(/[`<>\s]/g, '')
  if (evidence.length < 20) errors.push('Validation Evidence must contain substantive command results or an explicit N/A explanation.')
  if (errors.length) throw new Error(errors.join('\n'))
  return { plans }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const { values } = parseArgs({ options: { 'body-file': { type: 'string' } } })
    if (!values['body-file']) throw new Error('Usage: node scripts/validate-pr-body.mjs --body-file <path>')
    await validatePrBody(await readFile(values['body-file'], 'utf8'))
    console.log('PR metadata valid: ExecPlan and Validation Evidence populated.')
  } catch (error) {
    console.error(error.message)
    console.error('PR Quality Gates re-runs automatically when the PR body is edited; read back the saved body and check the new run.')
    process.exitCode = 1
  }
}
