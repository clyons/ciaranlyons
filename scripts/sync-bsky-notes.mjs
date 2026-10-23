import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

const publicApi = 'https://public.api.bsky.app/xrpc'
const blobApi = 'https://bsky.social/xrpc/com.atproto.sync.getBlob'
const contentDir = path.join(process.cwd(), 'content', 'notes')
const publicDir = path.join(process.cwd(), 'public')
const publicNotesDir = path.join(publicDir, 'notes')
const requestTimeoutMs = 10_000
const maxBlobBytes = 25 * 1024 * 1024
const allowedMimeTypes = new Set(['video/mp4', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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

const safePathSegmentPattern = /^[A-Za-z0-9._~:-]+$/
const cidPattern = /^[A-Za-z0-9]+$/

function isSafePathSegment(value) {
  return value !== '.' && value !== '..' && safePathSegmentPattern.test(value)
}

function parsePostUri(uri) {
  if (typeof uri !== 'string') return null
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/)
  if (!match) return null
  const [, did, rkey] = match
  if (!did.startsWith('did:') || !isSafePathSegment(did) || !isSafePathSegment(rkey)) return null
  return { did, rkey }
}

function postUrl(uri) {
  const parsed = parsePostUri(uri)
  return parsed ? `https://bsky.app/profile/${parsed.did}/post/${parsed.rkey}` : ''
}

function didFromUri(uri) {
  return parsePostUri(uri)?.did ?? ''
}

function datePathParts(value) {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T/)
  if (!match || !Number.isFinite(Date.parse(value))) return null
  const [, year, month, day] = match
  const canonicalDate = `${year}-${month}-${day}`
  if (new Date(`${canonicalDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== canonicalDate) return null
  return { fileDate: canonicalDate, year, month, day }
}

export function safeDestination(root, ...segments) {
  const resolvedRoot = path.resolve(root)
  const destination = path.resolve(resolvedRoot, ...segments)
  const relative = path.relative(resolvedRoot, destination)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Refusing to write outside the intended directory')
  }
  return destination
}

async function writeFileAtomically(destination, contents) {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents)
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

function quoteYaml(value) {
  return JSON.stringify(String(value ?? ''))
}

function mediaExtension(mimeType) {
  if (mimeType === 'video/mp4') return 'mp4'
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return mimeType?.split('/').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
}

export async function readBoundedBody(response, maximumBytes) {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(`Response exceeds ${maximumBytes} bytes`)
  }
  if (!response.body) throw new Error('Response body is missing')

  const chunks = []
  let total = 0
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk)
    total += bytes.byteLength
    if (total > maximumBytes) throw new Error(`Response exceeds ${maximumBytes} bytes`)
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, total)
}

export async function verifyCid(bytes, encodedCid) {
  const expected = CID.parse(encodedCid)
  if (expected.multihash.code !== sha256.code) throw new Error(`Unsupported CID hash for ${encodedCid}`)
  const digest = await sha256.digest(bytes)
  const actual = CID.create(expected.version, expected.code, digest)
  if (!actual.equals(expected)) throw new Error(`CID mismatch for ${encodedCid}`)
}

function blobCid(blob) {
  return blob?.ref?.$link ?? blob?.ref?.link ?? blob?.cid ?? ''
}

function mediaFromEmbed(embed) {
  if (!embed || typeof embed !== 'object') return []
  if (embed.$type === 'app.bsky.embed.recordWithMedia') return mediaFromEmbed(embed.media)

  if (embed.$type === 'app.bsky.embed.video') {
    const cid = blobCid(embed.video)
    if (!cid) return []
    return [{
      type: 'video',
      cid,
      mimeType: embed.video?.mimeType ?? 'video/mp4',
      alt: embed.alt ?? '',
      width: embed.aspectRatio?.width,
      height: embed.aspectRatio?.height,
      presentation: typeof embed.presentation === 'string' ? embed.presentation : undefined,
    }]
  }

  if (embed.$type === 'app.bsky.embed.images' || embed.$type === 'app.bsky.embed.gallery') {
    const gallery = embed.$type === 'app.bsky.embed.gallery'
    const images = gallery ? embed.items : embed.images
    if (!Array.isArray(images)) return []
    return images.map((image) => {
      if (!image || (gallery && image.$type !== 'app.bsky.embed.gallery#image')) return null
      const cid = blobCid(image.image)
      if (!cid) return null
      return {
        type: 'image',
        cid,
        mimeType: image.image?.mimeType ?? 'image/jpeg',
        alt: image.alt ?? '',
        width: image.aspectRatio?.width,
        height: image.aspectRatio?.height,
      }
    }).filter(Boolean)
  }

  return []
}

async function downloadBlob({ did, cid, mimeType, destination, dryRun }) {
  if (dryRun) return

  const url = new URL(blobApi)
  url.searchParams.set('did', did)
  url.searchParams.set('cid', cid)

  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(requestTimeoutMs) })
  if (!response.ok) throw new Error(`Blob download failed for ${cid}: ${response.status}`)

  const responseMimeType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (!responseMimeType || !allowedMimeTypes.has(responseMimeType) || responseMimeType !== mimeType) {
    throw new Error(`Unexpected blob MIME type for ${cid}: ${responseMimeType ?? 'missing'}`)
  }
  const bytes = await readBoundedBody(response, maxBlobBytes)
  await verifyCid(bytes, cid)
  await writeFileAtomically(destination, bytes)
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

export function noteFromFeedItem(item) {
  if (!item || item.reason || !item.post) return null

  const { post } = item
  const record = post.record ?? {}
  if (record.reply) return null
  if (typeof post.cid !== 'string' || !cidPattern.test(post.cid) || typeof record.text !== 'string') return null

  const parsedUri = parsePostUri(post.uri)
  const parsedDate = datePathParts(record.createdAt)
  if (!parsedUri || !parsedDate) return null

  const id = parsedUri.rkey
  const date = record.createdAt
  const { fileDate, year, month, day } = parsedDate
  const file = safeDestination(contentDir, `${fileDate}-${id}.md`)
  const mediaDir = safeDestination(publicNotesDir, year, month, day, id)
  const media = mediaFromEmbed(record.embed).map((item, index) => {
    if (!cidPattern.test(item.cid)) return null
    if (!allowedMimeTypes.has(item.mimeType)) return null
    const extension = mediaExtension(item.mimeType)
    const filename = `${item.type}-${index + 1}-${item.cid}.${extension}`
    return {
      ...item,
      src: `/notes/${year}/${month}/${day}/${id}/${filename}`,
      file: safeDestination(mediaDir, filename),
    }
  }).filter(Boolean)
  const hasEmbed = typeof record.embed?.$type === 'string' && record.embed.$type.startsWith('app.bsky.embed.')
  if (!record.text.trim() && media.length === 0 && !hasEmbed) return null

  return {
    id,
    date,
    did: didFromUri(post.uri),
    uri: post.uri,
    cid: post.cid,
    originalUrl: postUrl(post.uri),
    text: record.text,
    facets: record.facets ?? [],
    media,
    file,
  }
}

export function noteMarkdown(note) {
  const media = note.media.map(({ file, ...item }) => item)
  const mediaFrontmatter = media.length > 0 ? `\nmedia: ${JSON.stringify(media)}` : ''
  const text = note.text.endsWith('\n') ? note.text : `${note.text}\n`
  return `---\nid: ${quoteYaml(note.id)}\ndate: ${quoteYaml(note.date)}\nsource: bluesky\nuri: ${quoteYaml(note.uri)}\ncid: ${quoteYaml(note.cid)}\noriginalUrl: ${quoteYaml(note.originalUrl)}\nfacets: ${JSON.stringify(note.facets)}${mediaFrontmatter}\n---\n\n${text}`
}

async function fetchFeed({ actor, limit }) {
  const url = new URL(`${publicApi}/app.bsky.feed.getAuthorFeed`)
  url.searchParams.set('actor', actor)
  url.searchParams.set('filter', 'posts_no_replies')
  url.searchParams.set('includePins', 'false')
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) })
  if (!response.ok) throw new Error(`ATProto feed request failed: ${response.status}`)

  const bytes = await readBoundedBody(response, 2 * 1024 * 1024)
  const data = JSON.parse(bytes.toString('utf8'))
  if (!data || typeof data !== 'object' || !Array.isArray(data.feed)) {
    throw new Error('ATProto feed returned an invalid payload')
  }
  return data.feed
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
      await Promise.all(note.media.map((item) => downloadBlob({
        did: note.did,
        cid: item.cid,
        mimeType: item.mimeType,
        destination: item.file,
        dryRun: options.dryRun,
      })))
      await writeFileAtomically(note.file, noteMarkdown(note))
      written += 1
    }
  }

  console.log(`${options.dryRun ? 'dry-run' : 'done'}: ${written} written, ${skipped} skipped, ${notes.length} eligible`)
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''

if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Note sync failed')
    process.exit(1)
  })
}
