import { createHash, randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import fg from 'fast-glob'
import matter from 'gray-matter'

const publicApi = 'https://public.api.bsky.app/xrpc'
const publicationCollection = 'site.standard.publication'
const documentCollection = 'site.standard.document'
const siteUrl = 'https://ciaranlyons.com'
const requestTimeoutMs = 10_000
const maxJsonBytes = 2 * 1024 * 1024

function usage() {
  console.log('Usage: node scripts/publish-standard-site.mjs [--dry-run] [--type writing|links|all] [--slug SLUG] [--publication-uri AT_URI]')
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    type: 'writing',
    slug: undefined,
    publicationUri: process.env.STANDARD_SITE_PUBLICATION_AT_URI?.trim() || undefined,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--type') options.type = argv[++index]
    else if (arg === '--slug') options.slug = argv[++index]
    else if (arg === '--publication-uri') options.publicationUri = argv[++index]
    else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!['writing', 'links', 'all'].includes(options.type)) throw new Error('--type must be writing, links, or all')

  return options
}

function asString(value, fallback = '') {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return fallback
}

function dateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid date: ${value}`)
  return date.toISOString()
}

function writingPath(entry) {
  return `/writing/${entry.date.slice(0, 4)}/${entry.date.slice(5, 7)}/${entry.date.slice(8, 10)}/${entry.slug}`
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!?(?:\[([^\]]*)\]\([^)]*\))/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function foundQuoteSlugs(value, source) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`${source}: foundQuotes must be an array of quote slugs`)

  const slugs = value.map((item, index) => {
    if (typeof item !== 'string' || !item.trim()) throw new Error(`${source}: foundQuotes[${index}] must be a non-empty string`)
    const slug = item.trim()
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9._~-]*[A-Za-z0-9])?$/.test(slug) || slug === '.' || slug === '..') {
      throw new Error(`${source}: foundQuotes[${index}] contains characters that are unsafe in a URL path`)
    }
    return slug
  })

  const duplicate = slugs.find((slug, index) => slugs.indexOf(slug) !== index)
  if (duplicate) throw new Error(`${source}: foundQuotes contains duplicate quote slug ${duplicate}`)
  return slugs
}

export function expandedWritingText(entry, quotes) {
  const framing = plainText(entry.body)
  if (entry.foundQuoteSlugs.length === 0) return framing

  const quotesBySlug = new Map(quotes.map((quote) => [quote.slug, quote]))
  const expanded = entry.foundQuoteSlugs.map((slug) => {
    const quote = quotesBySlug.get(slug)
    if (!quote) throw new Error(`${entry.source}: foundQuotes references missing quote slug ${slug}`)
    return `${quote.text}\n— ${quote.attribution}, ${quote.source}`
  })

  return [framing, 'Found quotes', ...expanded].filter(Boolean).join('\n\n')
}

function atUriParts(uri, collection) {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/)
  if (!match || match[2] !== collection) return undefined
  return { repo: match[1], collection: match[2], rkey: match[3] }
}

async function readBoundedText(response, maximumBytes) {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw new Error(`Response exceeds ${maximumBytes} bytes`)
  if (!response.body) throw new Error('Response body is missing')
  const chunks = []
  let total = 0
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk)
    total += bytes.byteLength
    if (total > maximumBytes) throw new Error(`Response exceeds ${maximumBytes} bytes`)
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, total).toString('utf8')
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) })
  const text = await readBoundedText(response, maxJsonBytes)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON response from ${new URL(url).origin}`)
  }
}

async function resolveIdentity(handle) {
  const identity = await fetchJson(`${publicApi}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`)
  const did = identity.did
  if (typeof did !== 'string' || !/^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(did)) throw new Error(`Could not resolve a valid DID for ${handle}`)

  const didDocument = await fetchJson(`https://plc.directory/${encodeURIComponent(did)}`)
  const pds = didDocument.service?.find((service) => service.id === '#atproto_pds')?.serviceEndpoint
  if (typeof pds !== 'string') throw new Error(`Could not resolve a PDS for ${did}`)
  const pdsUrl = new URL(pds)
  if (pdsUrl.protocol !== 'https:' || pdsUrl.username || pdsUrl.password) throw new Error(`PDS for ${did} must be an HTTPS origin`)
  return { did, pds: pdsUrl.origin }
}

async function createSession(pds, handle, password) {
  return fetchJson(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password }),
  })
}

async function listRecords(pds, did, collection) {
  const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`)
  url.searchParams.set('repo', did)
  url.searchParams.set('collection', collection)
  url.searchParams.set('limit', '100')
  return fetchJson(url)
}

async function putRecord(pds, token, repo, collection, rkey, record) {
  return fetchJson(`${pds}/xrpc/com.atproto.repo.putRecord`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ repo, collection, rkey, record }),
  })
}

async function uploadBlob(pds, token, file) {
  const bytes = await readFile(file)
  return fetchJson(`${pds}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'image/jpeg' },
    body: bytes,
  })
}

export function deterministicRkey(prefix, identity) {
  return `${prefix}-${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`
}

async function writeFileAtomically(destination, contents) {
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

export function addStandardUri(raw, uri) {
  const field = `standardUri: ${JSON.stringify(uri)}`
  if (/^standardUri:\s*.*$/m.test(raw)) return raw.replace(/^standardUri:\s*.*$/m, field)
  if (!raw.startsWith('---\n')) throw new Error('Documents must have YAML front matter')
  return raw.replace(/^---\n/, `---\n${field}\n`)
}

async function loadWriting(slug, allowEmpty = false) {
  const files = await fg('content/writing/*.md', { cwd: process.cwd(), absolute: true })
  const entries = await Promise.all(files.map(async (file) => {
    const raw = await readFile(file, 'utf8')
    const parsed = matter(raw)
    const entrySlug = path.basename(file, '.md')
    const source = path.relative(process.cwd(), file)
    const date = asString(parsed.data.date)
    if (!date) throw new Error(`Missing date in ${source}`)
    return {
      file,
      raw,
      source,
      slug: entrySlug,
      title: asString(parsed.data.title, entrySlug),
      description: asString(parsed.data.description),
      date: dateTime(date),
      updated: parsed.data.updated ? dateTime(asString(parsed.data.updated)) : undefined,
      standardUri: asString(parsed.data.standardUri) || undefined,
      foundQuoteSlugs: foundQuoteSlugs(parsed.data.foundQuotes, source),
      body: parsed.content.trim(),
      kind: 'writing',
      path: writingPath({ date, slug: entrySlug }),
    }
  }))

  const selected = slug ? entries.filter((entry) => entry.slug === slug) : entries
  if (selected.length === 0 && !allowEmpty) throw new Error(slug ? `No Writing entry with slug "${slug}"` : 'No Writing entries found')
  return selected
}

async function loadLinks(slug, allowEmpty = false) {
  const files = await fg('content/links/*.md', { cwd: process.cwd(), absolute: true })
  const entries = await Promise.all(files.map(async (file) => {
    const raw = await readFile(file, 'utf8')
    const parsed = matter(raw)
    const entrySlug = path.basename(file, '.md')
    const date = asString(parsed.data.savedAt) || asString(parsed.data.date)
    if (!date) throw new Error(`Missing date in ${path.relative(process.cwd(), file)}`)
    const publishedAt = dateTime(date)
    return {
      file,
      raw,
      slug: entrySlug,
      title: asString(parsed.data.title, entrySlug),
      description: asString(parsed.data.description),
      date: publishedAt,
      updated: parsed.data.updated ? dateTime(asString(parsed.data.updated)) : undefined,
      standardUri: asString(parsed.data.standardUri) || undefined,
      body: parsed.content.trim(),
      kind: 'links',
      path: `/links/${publishedAt.slice(0, 4)}/${publishedAt.slice(5, 7)}/${publishedAt.slice(8, 10)}/${entrySlug}`,
    }
  }))
  const selected = slug ? entries.filter((entry) => entry.slug === slug) : entries
  if (selected.length === 0 && !allowEmpty) throw new Error(slug ? `No Link entry with slug "${slug}"` : 'No Link entries found')
  return selected
}

async function loadDocuments(type, slug) {
  const groups = []
  const allowEmpty = type === 'all'
  if (type === 'writing' || type === 'all') groups.push(await loadWriting(slug, allowEmpty))
  if (type === 'links' || type === 'all') groups.push(await loadLinks(slug, allowEmpty))
  const entries = groups.flat()
  if (entries.length === 0) throw new Error(`No ${type} documents found`)
  return entries
}

async function loadFoundQuotes() {
  const files = await fg('content/found-quotes/*.md', { cwd: process.cwd(), absolute: true })
  return Promise.all(files.map(async (file) => {
    const raw = await readFile(file, 'utf8')
    const parsed = matter(raw)
    const source = path.relative(process.cwd(), file)
    const text = parsed.content.trim()
    const attribution = asString(parsed.data.attribution).trim()
    const citedSource = asString(parsed.data.source).trim()
    if (!text) throw new Error(`${source}: quote body must be a non-empty string`)
    if (!attribution) throw new Error(`${source}: attribution must be a non-empty string`)
    if (!citedSource) throw new Error(`${source}: source must be a non-empty string`)
    return { slug: path.basename(file, '.md'), text, attribution, source: citedSource }
  }))
}

export function publicationRecord(icon) {
  return {
    $type: publicationCollection,
    url: siteUrl,
    name: 'Ciaran Lyons',
    description: 'Writing, notes, and curated links by Ciaran Lyons.',
    ...(icon ? { icon } : {}),
    preferences: { showInDiscover: true },
  }
}

export function standardDocumentRecord(entry, publicationUri, quotes = []) {
  return {
    $type: documentCollection,
    site: publicationUri,
    path: entry.path ?? writingPath(entry),
    title: entry.title,
    description: entry.description,
    textContent: entry.kind === 'writing'
      ? expandedWritingText(entry, quotes)
      : plainText([entry.description, entry.body].filter(Boolean).join('\n\n')),
    publishedAt: entry.date,
    ...(entry.updated ? { updatedAt: entry.updated } : {}),
  }
}

async function findPublication(pds, did) {
  const records = await listRecords(pds, did, publicationCollection)
  return records.records?.find((item) => item.value?.url?.replace(/\/$/, '') === siteUrl)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const handle = process.env.ATPROTO_HANDLE?.trim() || process.env.BSKY_HANDLE?.trim() || 'ciaranlyons.com'
  const [entries, quotes] = await Promise.all([loadDocuments(options.type, options.slug), loadFoundQuotes()])
  for (const entry of entries) {
    if (entry.kind === 'writing') expandedWritingText(entry, quotes)
  }
  const { did, pds } = await resolveIdentity(handle)
  const expectedDid = process.env.ATPROTO_DID?.trim()
  if (!options.dryRun && !expectedDid) throw new Error('Missing ATPROTO_DID; refusing to submit credentials without an expected identity')
  if (expectedDid && expectedDid !== did) throw new Error(`Resolved DID does not match ATPROTO_DID for ${handle}`)
  const existingPublication = await findPublication(pds, did)
  let publicationUri = options.publicationUri || existingPublication?.uri

  if (publicationUri) {
    const parts = atUriParts(publicationUri, publicationCollection)
    if (!parts || parts.repo !== did) throw new Error(`Invalid publication URI: ${publicationUri}`)
  }

  if (options.dryRun) {
    console.log(`${publicationUri ? 'would-use' : 'would-create'} publication ${publicationUri ?? siteUrl}`)
    for (const entry of entries) console.log(`${entry.standardUri ? 'would-update' : 'would-create'} ${entry.kind} document ${entry.path}`)
    return
  }

  const password = process.env.ATPROTO_APP_PASSWORD || process.env.BSKY_APP_PASSWORD
  if (!password) throw new Error('Missing ATPROTO_APP_PASSWORD (use a revocable ATProto app password)')
  const session = await createSession(pds, handle, password)
  if (!session.accessJwt) throw new Error('PDS session did not return an access token')
  if (session.did !== did) throw new Error('Authenticated session DID does not match the validated identity')

  let publicationIcon = existingPublication?.value?.icon
  if (!publicationIcon) {
    const uploaded = await uploadBlob(pds, session.accessJwt, path.join(process.cwd(), 'public', 'images', 'ciaran-profile.jpeg'))
    if (!uploaded.blob) throw new Error('PDS did not return a publication icon blob reference')
    publicationIcon = uploaded.blob
    console.log('uploaded publication icon')
  }

  if (!publicationUri) {
    const rkey = deterministicRkey('publication', siteUrl)
    const result = await putRecord(pds, session.accessJwt, did, publicationCollection, rkey, publicationRecord(publicationIcon))
    publicationUri = result.uri ?? `at://${did}/${publicationCollection}/${rkey}`
    console.log(`created publication ${publicationUri}`)
    console.log(`Set STANDARD_SITE_PUBLICATION_AT_URI=${publicationUri} in the deployment environment before deploying.`)
  } else {
    const parts = atUriParts(publicationUri, publicationCollection)
    if (!parts || parts.repo !== did) throw new Error(`Invalid publication URI: ${publicationUri}`)
    await putRecord(pds, session.accessJwt, did, publicationCollection, parts.rkey, publicationRecord(publicationIcon))
    console.log(`updated publication ${publicationUri}`)
  }

  for (const entry of entries) {
    const record = standardDocumentRecord(entry, publicationUri, quotes)
    const parts = entry.standardUri ? atUriParts(entry.standardUri, documentCollection) : undefined
    let documentUri = entry.standardUri

    if (parts) {
      if (parts.repo !== did) throw new Error(`Document URI belongs to another repository: ${entry.standardUri}`)
      await putRecord(pds, session.accessJwt, did, documentCollection, parts.rkey, record)
      console.log(`updated ${entry.kind} document ${entry.standardUri} (${entry.slug})`)
    } else {
      const rkey = deterministicRkey('document', entry.path)
      const result = await putRecord(pds, session.accessJwt, did, documentCollection, rkey, record)
      documentUri = result.uri ?? `at://${did}/${documentCollection}/${rkey}`
      await writeFileAtomically(entry.file, addStandardUri(entry.raw, documentUri))
      console.log(`created ${entry.kind} document ${documentUri} (${entry.slug})`)
    }
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''

if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Standard.site publication failed')
    process.exit(1)
  })
}
