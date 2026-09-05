import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const publicApi = 'https://public.api.bsky.app/xrpc'
const contentDir = path.join(process.cwd(), 'content', 'notes')

function usage() {
  console.log(`Usage: node scripts/sync-bsky-notes.mjs [--dry-run] [--overwrite] [--limit N] [--actor HANDLE]`)
}

function parseArgs(argv) {
  const options = {
    actor: process.env.ATPROTO_HANDLE || 'ciaranlyons.com',
    dryRun: false,
    overwrite: false,
    limit: 50,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--overwrite') options.overwrite = true
    else if (arg === '--actor') options.actor = argv[++i] ?? ''
    else if (arg === '--limit') options.limit = Number(argv[++i] ?? options.limit)
    else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!options.actor) throw new Error('Missing actor')
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) {
    throw new Error('--limit must be an integer from 1 to 100')
  }

  return options
}

function rkeyFromUri(uri) {
  return uri.split('/').pop() || ''
}

function postUrl(uri) {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/)
  return match ? `https://bsky.app/profile/${match[1]}/post/${match[2]}` : ''
}

function sliceUtf8(text, start, end) {
  return Buffer.from(text, 'utf8').subarray(start, end).toString('utf8')
}

function textWithExpandedLinks(record) {
  const text = record.text ?? ''
  const facets = [...(record.facets ?? [])].sort((a, b) => (a.index?.byteStart ?? 0) - (b.index?.byteStart ?? 0))
  let cursor = 0
  let output = ''

  for (const facet of facets) {
    const start = facet.index?.byteStart
    const end = facet.index?.byteEnd
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < cursor || end < start) continue

    const link = facet.features?.find((feature) => feature?.$type === 'app.bsky.richtext.facet#link')
    output += sliceUtf8(text, cursor, start)
    output += link?.uri ?? sliceUtf8(text, start, end)
    cursor = end
  }

  output += sliceUtf8(text, cursor, Buffer.byteLength(text, 'utf8'))
  return output
}

function quoteYaml(value) {
  return JSON.stringify(String(value ?? ''))
}

async function existingNoteIds() {
  await mkdir(contentDir, { recursive: true })
  const files = await readdir(contentDir)
  const ids = new Set()

  await Promise.all(files.filter((file) => file.endsWith('.md')).map(async (file) => {
    const raw = await readFile(path.join(contentDir, file), 'utf8')
    const idMatch = raw.match(/^id:\s*["']?([^"'\n]+)["']?\s*$/m)
    ids.add(idMatch?.[1] ?? path.basename(file, '.md'))
  }))

  return ids
}

function noteFromFeedItem(item) {
  if (item.reason || !item.post) return null

  const { post } = item
  const record = post.record ?? {}
  if (record.reply) return null
  if (!post.uri || !post.cid || !record.text || !record.createdAt) return null

  const id = rkeyFromUri(post.uri)
  const date = record.createdAt
  const fileDate = date.slice(0, 10)
  const file = path.join(contentDir, `${fileDate}-${id}.md`)

  return {
    id,
    date,
    uri: post.uri,
    cid: post.cid,
    originalUrl: postUrl(post.uri),
    text: textWithExpandedLinks(record),
    file,
  }
}

function noteMarkdown(note) {
  return `---\nid: ${quoteYaml(note.id)}\ndate: ${quoteYaml(note.date)}\nsource: bluesky\nuri: ${quoteYaml(note.uri)}\ncid: ${quoteYaml(note.cid)}\noriginalUrl: ${quoteYaml(note.originalUrl)}\n---\n\n${note.text.trim()}\n`
}

async function fetchFeed({ actor, limit }) {
  const url = new URL(`${publicApi}/app.bsky.feed.getAuthorFeed`)
  url.searchParams.set('actor', actor)
  url.searchParams.set('filter', 'posts_no_replies')
  url.searchParams.set('includePins', 'false')
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url)
  if (!response.ok) throw new Error(`ATProto feed request failed: ${response.status}`)

  const data = await response.json()
  return data.feed ?? []
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const feed = await fetchFeed(options)
  const notes = feed.map(noteFromFeedItem).filter(Boolean)
  const existing = await existingNoteIds()

  let written = 0
  let skipped = 0

  for (const note of notes) {
    const exists = existing.has(note.id)
    const action = exists && !options.overwrite ? 'skip' : options.dryRun ? 'would-write' : 'write'

    console.log(`${action} ${note.date} ${note.id} ${path.relative(process.cwd(), note.file)}`)

    if (exists && !options.overwrite) {
      skipped += 1
      continue
    }

    if (!options.dryRun) {
      await writeFile(note.file, noteMarkdown(note), 'utf8')
      written += 1
    }
  }

  console.log(`${options.dryRun ? 'dry-run' : 'done'}: ${written} written, ${skipped} skipped, ${notes.length} eligible`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
