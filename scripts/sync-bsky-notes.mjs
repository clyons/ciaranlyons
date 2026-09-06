import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const publicApi = 'https://public.api.bsky.app/xrpc'
const blobApi = 'https://bsky.social/xrpc/com.atproto.sync.getBlob'
const contentDir = path.join(process.cwd(), 'content', 'notes')
const publicDir = path.join(process.cwd(), 'public')

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

function didFromUri(uri) {
  return uri.match(/^at:\/\/([^/]+)\//)?.[1] ?? ''
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

function blobCid(blob) {
  return blob?.ref?.$link ?? blob?.ref?.link ?? blob?.cid ?? ''
}

function mediaFromEmbed(embed) {
  if (!embed) return []
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
    }]
  }

  if (embed.$type === 'app.bsky.embed.images') {
    return (embed.images ?? []).map((image) => {
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

async function downloadBlob({ did, cid, destination, dryRun }) {
  if (dryRun) return

  const url = new URL(blobApi)
  url.searchParams.set('did', did)
  url.searchParams.set('cid', cid)

  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Blob download failed for ${cid}: ${response.status}`)

  const bytes = Buffer.from(await response.arrayBuffer())
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, bytes)
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
  const { year, month, day } = {
    year: fileDate.slice(0, 4),
    month: fileDate.slice(5, 7),
    day: fileDate.slice(8, 10),
  }
  const file = path.join(contentDir, `${fileDate}-${id}.md`)
  const mediaDir = path.join(publicDir, 'notes', year, month, day, id)
  const media = mediaFromEmbed(record.embed).map((item, index) => {
    const extension = mediaExtension(item.mimeType)
    const filename = `${item.type}-${index + 1}-${item.cid}.${extension}`
    return {
      ...item,
      src: `/notes/${year}/${month}/${day}/${id}/${filename}`,
      file: path.join(mediaDir, filename),
    }
  })

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

function noteMarkdown(note) {
  const media = note.media.map(({ file, ...item }) => item)
  const mediaFrontmatter = media.length > 0 ? `\nmedia: ${JSON.stringify(media)}` : ''
  return `---\nid: ${quoteYaml(note.id)}\ndate: ${quoteYaml(note.date)}\nsource: bluesky\nuri: ${quoteYaml(note.uri)}\ncid: ${quoteYaml(note.cid)}\noriginalUrl: ${quoteYaml(note.originalUrl)}\nfacets: ${JSON.stringify(note.facets)}${mediaFrontmatter}\n---\n\n${note.text.trim()}\n`
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
      await Promise.all(note.media.map((item) => downloadBlob({
        did: note.did,
        cid: item.cid,
        destination: item.file,
        dryRun: options.dryRun,
      })))
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
