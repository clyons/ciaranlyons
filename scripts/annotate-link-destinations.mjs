import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'

const destinationStatuses = new Set(['verified', 'broken', 'unavailable', 'semantic-mismatch', 'access-restricted'])

function parseArgs(argv) {
  const options = { apply: false, audit: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--apply') options.apply = true
    else if (argument === '--audit') options.audit = argv[++index]
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!options.audit) throw new Error('--audit is required')
  return options
}

function checkedTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error('The audit checkedAt value must be an RFC 3339 timestamp')
  }
  return value
}

export function rewriteDestinationAudit(markdown, expectedTargetUrl, status, checkedAt) {
  if (!destinationStatuses.has(status)) throw new Error(`Unknown destination status: ${status}`)
  const parsed = matter(markdown)
  if (parsed.data.targetUrl !== expectedTargetUrl) throw new Error('Destination changed since the audit')
  const frontmatterEnd = markdown.indexOf('\n---', 4)
  if (!markdown.startsWith('---\n') || frontmatterEnd < 0) throw new Error('Markdown frontmatter is missing')
  const frontmatter = markdown.slice(0, frontmatterEnd)
  const withoutOldMetadata = frontmatter
    .replace(/^destinationStatus:.*\n/gm, '')
    .replace(/^destinationLastCheckedAt:.*\n/gm, '')
  const targetLines = withoutOldMetadata.match(/^targetUrl:.*$/gm) || []
  if (targetLines.length !== 1) throw new Error('Expected exactly one targetUrl frontmatter line')
  const updatedFrontmatter = withoutOldMetadata.replace(
    targetLines[0],
    `${targetLines[0]}\ndestinationStatus: ${status}\ndestinationLastCheckedAt: ${JSON.stringify(checkedTimestamp(checkedAt))}`,
  )
  return updatedFrontmatter + markdown.slice(frontmatterEnd)
}

async function writeAtomically(destination, contents) {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents, 'utf8')
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    throw error
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const report = JSON.parse(await readFile(path.resolve(options.audit), 'utf8'))
  const checkedAt = checkedTimestamp(report.checkedAt)
  if (!Array.isArray(report.results)) throw new Error('Audit report results must be an array')
  const counts = {}
  let changed = 0
  let unchanged = 0
  for (const result of report.results) {
    if (!destinationStatuses.has(result.category)) throw new Error(`Unknown destination status for ${result.slug}`)
    const resultCheckedAt = checkedTimestamp(result.checkedAt || checkedAt)
    const file = path.join(process.cwd(), 'content', 'links', `${result.slug}.md`)
    const markdown = await readFile(file, 'utf8')
    const updated = rewriteDestinationAudit(markdown, result.targetUrl, result.category, resultCheckedAt)
    counts[result.category] = (counts[result.category] || 0) + 1
    if (updated === markdown) unchanged += 1
    else {
      changed += 1
      if (options.apply) await writeAtomically(file, updated)
    }
  }
  console.log(JSON.stringify({ apply: options.apply, selected: report.results.length, changed, unchanged, checkedAt, statuses: counts }, null, 2))
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Destination annotation failed')
    process.exit(1)
  })
}
