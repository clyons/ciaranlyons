import { readFile, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import matter from 'gray-matter'
import { parseDocument, DomUtils } from 'htmlparser2'
import sharp from 'sharp'
import { tsImport } from 'tsx/esm/api'

const { validateDate, validateSegment, optionalBoolean } = await tsImport('../src/lib/content-validation.ts', import.meta.url)
const canonicalOrigin = 'https://ciaranlyons.com'

export function publicationOrigin(value = canonicalOrigin) {
  const url = new URL(value)
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if ((!local && url.origin !== canonicalOrigin) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Origin must be https://ciaranlyons.com or an explicit local HTTP origin, without credentials, path, query, or fragment.')
  }
  return url.origin
}

export async function writingExpectation(file, root = process.cwd()) {
  const directory = await realpath(path.join(root, 'content/writing'))
  const selected = await realpath(path.resolve(root, file))
  if (path.dirname(selected) !== directory || path.extname(selected) !== '.md') throw new Error('Source must be a Markdown file directly inside content/writing.')
  const entries = await Promise.all((await readdir(directory)).filter((name) => name.endsWith('.md')).sort().map(async (name) => {
    const source = path.join(directory, name)
    if (path.dirname(await realpath(source)) !== directory) throw new Error('Writing source symlinks must stay inside content/writing.')
    const raw = await readFile(source, 'utf8')
    // gray-matter also supports executable JavaScript engines; accept YAML only.
    if (!/^(?:\uFEFF)?---[ \t]*\r?\n/.test(raw)) throw new Error(`${source}: expected plain YAML frontmatter`)
    const { data } = matter(raw)
    const slug = validateSegment(path.basename(name, '.md'), source, 'slug')
    const date = validateDate(data.date, source)
    const string = (value, fallback = '') => value instanceof Date ? value.toISOString().slice(0, 10) : ['string', 'number'].includes(typeof value) ? String(value) : fallback
    return {
      source, title: string(data.title, slug), description: string(data.description), date,
      updated: data.updated ? validateDate(data.updated, source, 'updated') : undefined,
      featured: optionalBoolean(data.featured, source, 'featured') ?? false,
      pathname: `/writing/${date.slice(0, 10).replaceAll('-', '/')}/${slug}/`,
    }
  }))
  if (entries.filter((entry) => entry.featured).length > 1) throw new Error('Only one Writing entry can be featured.')
  entries.sort((a, b) => b.date.localeCompare(a.date))
  return { entry: entries.find((entry) => entry.source === selected), featured: entries.find((entry) => entry.featured) ?? entries[0] }
}

const elements = (node, tag) => DomUtils.getElementsByTagName(tag, node, true)
const text = (node) => DomUtils.textContent(node)
const classHas = (node, name) => (node.attribs?.class ?? '').split(/\s+/).includes(name)
function one(nodes, label) {
  if (nodes.length !== 1) throw new Error(`${label}: expected exactly one, got ${nodes.length}`)
  return nodes[0]
}
function equal(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
function meta(head, key) {
  return one(elements(head, 'meta').filter((tag) => (tag.attribs.property ?? tag.attribs.name) === key), key).attribs.content
}
function link(node, rel) {
  return one(elements(node, 'link').filter((tag) => tag.attribs.rel === rel), `${rel} link`).attribs.href
}
function assertArticleLink(node, entry, label) {
  const links = elements(node, 'a').filter((tag) => tag.attribs.href === entry.pathname || tag.attribs.href === canonicalOrigin + entry.pathname)
  if (!links.length) throw new Error(`${label}: missing article link ${entry.pathname}`)
  if (!links.some((tag) => text(tag) === entry.title || ['h2', 'h3'].some((heading) => elements(tag, heading).some((node) => text(node) === entry.title)))) throw new Error(`${label}: article link title differs from source`)
}

export async function verifyPublication({ file, origin, root, fetchImpl = fetch }) {
  const started = performance.now()
  const base = publicationOrigin(origin)
  const { entry, featured } = await writingExpectation(file, root)
  async function request(route) {
    const response = await fetchImpl(new URL(route, base), { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
    if (response.status !== 200) throw new Error(`${route}: expected HTTP 200, got ${response.status}`)
    return response
  }
  const archives = ['/writing/', ...[4, 7, 10].map((length) => `/writing/${entry.date.slice(0, length).replaceAll('-', '/')}/`)]
  const routes = [entry.pathname, '/', '/feed.xml', ...archives]
  const pages = await Promise.all(routes.map(async (route) => parseDocument(await (await request(route)).text(), { xmlMode: route.endsWith('.xml') })))
  const [article, home, feed, ...archivePages] = pages
  const head = one(elements(article, 'head'), 'article head')
  const canonical = canonicalOrigin + entry.pathname
  const imagePath = `/og${entry.pathname.slice(0, -1)}.png`
  equal(text(one(elements(head, 'title'), 'document title')), entry.title === 'Ciaran Lyons' ? entry.title : `${entry.title} - Ciaran Lyons`, 'title')
  equal(text(one(elements(article, 'h1'), 'article heading')), entry.title, 'article heading')
  equal(link(head, 'canonical'), canonical, 'canonical URL')
  for (const key of ['description', 'og:description', 'twitter:description']) equal(meta(head, key), entry.description, key)
  for (const key of ['og:title', 'twitter:title']) equal(meta(head, key), entry.title, key)
  for (const key of ['og:image', 'twitter:image']) equal(meta(head, key), canonicalOrigin + imagePath, key)
  for (const key of ['og:image:alt', 'twitter:image:alt']) equal(meta(head, key), entry.title === 'Ciaran Lyons' ? 'Ciaran Lyons — I build things that last and grow.' : `${entry.title} — Ciaran Lyons`, key)
  for (const [key, value] of Object.entries({ 'og:url': canonical, 'og:type': 'article', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:type': 'image/png', 'twitter:card': 'summary_large_image', 'article:published_time': entry.date, 'article:section': 'Writing' })) equal(meta(head, key), value, key)
  const modified = elements(head, 'meta').filter((tag) => tag.attribs.property === 'article:modified_time')
  const expectedModified = entry.updated && entry.updated !== entry.date.slice(0, 10) ? entry.updated : undefined
  equal(modified.length, expectedModified ? 1 : 0, 'modified time count')
  if (expectedModified) equal(modified[0].attribs.content, expectedModified, 'modified time')
  for (let index = 0; index < archives.length; index++) assertArticleLink(archivePages[index], entry, archives[index])
  const item = one(elements(feed, 'item').filter((node) => elements(node, 'link').some((tag) => text(tag) === canonical)), 'feed item')
  equal(text(one(elements(item, 'title'), 'feed title')), entry.title, 'feed title')
  equal(text(one(elements(item, 'description'), 'feed description')), entry.description, 'feed description')
  const feature = one(elements(home, 'section').filter((node) => classHas(node, 'featured-essay')), 'homepage feature')
  equal(text(one(elements(feature, 'h2'), 'featured title')), featured.title, 'homepage selection')
  equal(text(one(elements(feature, 'p').filter((node) => classHas(node, 'featured-dek')), 'featured description')), featured.description, 'homepage featured description')
  equal(one(elements(feature, 'a'), 'featured link').attribs.href, featured.pathname, 'homepage featured link')
  const image = await request(imagePath)
  const dimensions = await sharp(Buffer.from(await image.arrayBuffer())).metadata()
  equal(dimensions.format, 'png', 'social image format')
  equal(dimensions.width, 1200, 'social image width')
  equal(dimensions.height, 630, 'social image height')
  return { url: base + entry.pathname, image: base + imagePath, featured: featured.pathname, elapsedMs: Math.round(performance.now() - started) }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const { values } = parseArgs({ options: { file: { type: 'string' }, origin: { type: 'string' } } })
    if (!values.file) throw new Error('Usage: node scripts/verify-publication.mjs --file content/writing/<slug>.md [--origin http://127.0.0.1:4377]')
    const result = await verifyPublication(values)
    console.log(`Verified ${result.url}\nTitle, metadata, canonical/social image (1200x630 PNG), archives, feed, and homepage selection agree with source.\nSocial preview: ${result.image}\nElapsed: ${result.elapsedMs}ms`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
