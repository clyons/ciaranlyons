import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import matter from 'gray-matter'

const publicApi = 'https://public.api.bsky.app/xrpc'
const publicationCollection = 'site.standard.publication'
const documentCollection = 'site.standard.document'
const siteUrl = 'https://ciaranlyons.com'

function usage() {
  console.log('Usage: node scripts/publish-standard-site.mjs [--dry-run] [--slug SLUG] [--publication-uri AT_URI]')
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    slug: undefined,
    publicationUri: process.env.STANDARD_SITE_PUBLICATION_AT_URI?.trim() || undefined,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--slug') options.slug = argv[++index]
    else if (arg === '--publication-uri') options.publicationUri = argv[++index]
    else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

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

function documentPath(entry) {
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

function atUriParts(uri, collection) {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/)
  if (!match || match[2] !== collection) return undefined
  return { repo: match[1], collection: match[2], rkey: match[3] }
}

async function fetchJson(url, init) {
  const response = await fetch(url, init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${text}`)
  }
  return response.json()
}

async function resolveIdentity(handle) {
  const identity = await fetchJson(`${publicApi}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`)
  const did = identity.did
  if (!did) throw new Error(`Could not resolve a DID for ${handle}`)

  const didDocument = await fetchJson(`https://plc.directory/${encodeURIComponent(did)}`)
  const pds = didDocument.service?.find((service) => service.id === '#atproto_pds')?.serviceEndpoint
  if (typeof pds !== 'string') throw new Error(`Could not resolve a PDS for ${did}`)
  return { did, pds: pds.replace(/\/$/, '') }
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

async function createRecord(pds, token, repo, collection, record) {
  return fetchJson(`${pds}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ repo, collection, record }),
  })
}

async function putRecord(pds, token, repo, collection, rkey, record) {
  return fetchJson(`${pds}/xrpc/com.atproto.repo.putRecord`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ repo, collection, rkey, record }),
  })
}

function addStandardUri(raw, uri) {
  const field = `standardUri: ${JSON.stringify(uri)}`
  if (/^standardUri:\s*.*$/m.test(raw)) return raw.replace(/^standardUri:\s*.*$/m, field)
  if (!raw.startsWith('---\n')) throw new Error('Writing entries must have YAML front matter')
  return raw.replace(/^---\n/, `---\n${field}\n`)
}

async function loadWriting(slug) {
  const files = await fg('content/writing/*.md', { cwd: process.cwd(), absolute: true })
  const entries = await Promise.all(files.map(async (file) => {
    const raw = await readFile(file, 'utf8')
    const parsed = matter(raw)
    const entrySlug = path.basename(file, '.md')
    const date = asString(parsed.data.date)
    if (!date) throw new Error(`Missing date in ${path.relative(process.cwd(), file)}`)
    return {
      file,
      raw,
      slug: entrySlug,
      title: asString(parsed.data.title, entrySlug),
      description: asString(parsed.data.description),
      date: dateTime(date),
      updated: parsed.data.updated ? dateTime(asString(parsed.data.updated)) : undefined,
      standardUri: asString(parsed.data.standardUri) || undefined,
      body: parsed.content.trim(),
    }
  }))

  const selected = slug ? entries.filter((entry) => entry.slug === slug) : entries
  if (selected.length === 0) throw new Error(slug ? `No Writing entry with slug "${slug}"` : 'No Writing entries found')
  return selected
}

function publicationRecord() {
  return {
    $type: publicationCollection,
    url: siteUrl,
    name: 'Ciaran Lyons',
    description: 'Writing by Ciaran Lyons.',
    preferences: { showInDiscover: true },
  }
}

function standardDocumentRecord(entry, publicationUri) {
  return {
    $type: documentCollection,
    site: publicationUri,
    path: documentPath(entry),
    title: entry.title,
    description: entry.description,
    textContent: plainText(entry.body),
    publishedAt: entry.date,
    ...(entry.updated ? { updatedAt: entry.updated } : {}),
  }
}

async function findPublicationUri(pds, did) {
  const records = await listRecords(pds, did, publicationCollection)
  return records.records?.find((item) => item.value?.url?.replace(/\/$/, '') === siteUrl)?.uri
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const handle = process.env.ATPROTO_HANDLE?.trim() || 'ciaranlyons.com'
  const entries = await loadWriting(options.slug)
  const { did, pds } = await resolveIdentity(handle)
  let publicationUri = options.publicationUri || await findPublicationUri(pds, did)

  if (options.dryRun) {
    console.log(`${publicationUri ? 'would-use' : 'would-create'} publication ${publicationUri ?? siteUrl}`)
    for (const entry of entries) console.log(`${entry.standardUri ? 'would-update' : 'would-create'} document ${documentPath(entry)}`)
    return
  }

  const password = process.env.ATPROTO_APP_PASSWORD
  if (!password) throw new Error('Missing ATPROTO_APP_PASSWORD (use a revocable ATProto app password)')
  const session = await createSession(pds, handle, password)
  if (!session.accessJwt) throw new Error('PDS session did not return an access token')

  if (!publicationUri) {
    const result = await createRecord(pds, session.accessJwt, did, publicationCollection, publicationRecord())
    publicationUri = result.uri
    console.log(`created publication ${publicationUri}`)
    console.log(`Set STANDARD_SITE_PUBLICATION_AT_URI=${publicationUri} in the deployment environment before deploying.`)
  } else {
    const parts = atUriParts(publicationUri, publicationCollection)
    if (!parts || parts.repo !== did) throw new Error(`Invalid publication URI: ${publicationUri}`)
    await putRecord(pds, session.accessJwt, did, publicationCollection, parts.rkey, publicationRecord())
    console.log(`updated publication ${publicationUri}`)
  }

  for (const entry of entries) {
    const record = standardDocumentRecord(entry, publicationUri)
    const parts = entry.standardUri ? atUriParts(entry.standardUri, documentCollection) : undefined
    let documentUri = entry.standardUri

    if (parts) {
      if (parts.repo !== did) throw new Error(`Document URI belongs to another repository: ${entry.standardUri}`)
      await putRecord(pds, session.accessJwt, did, documentCollection, parts.rkey, record)
      console.log(`updated document ${entry.standardUri} (${entry.slug})`)
    } else {
      const result = await createRecord(pds, session.accessJwt, did, documentCollection, record)
      documentUri = result.uri
      await writeFile(entry.file, addStandardUri(entry.raw, documentUri), 'utf8')
      console.log(`created document ${documentUri} (${entry.slug})`)
    }
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
