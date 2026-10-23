import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { publicationOrigin, writingExpectation, verifyPublication } from './verify-publication.mjs'

const route = '/writing/2026/10/23/example/'
const origin = 'https://ciaranlyons.com'
const imagePath = `/og${route.slice(0, -1)}.png`
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const title = 'Systems & "ownership"'
const description = 'A description with <markup> & meaning.'
const meta = (key, value) => `<meta ${key.startsWith('twitter:') || key === 'description' ? 'name' : 'property'}="${key}" content="${escape(value)}">`
const head = `<title>${escape(title)} - Ciaran Lyons</title><link rel="canonical" href="${origin}${route}">` + Object.entries({
  description, 'og:description': description, 'twitter:description': description,
  'og:title': title, 'twitter:title': title, 'og:image': origin + imagePath,
  'twitter:image': origin + imagePath, 'og:image:alt': `${title} — Ciaran Lyons`,
  'twitter:image:alt': `${title} — Ciaran Lyons`, 'og:url': origin + route,
  'og:type': 'article', 'og:image:width': '1200', 'og:image:height': '630',
  'og:image:type': 'image/png', 'twitter:card': 'summary_large_image',
  'article:published_time': '2026-10-23', 'article:section': 'Writing',
}).map(([key, value]) => meta(key, value)).join('')

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'publication-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'content/writing'), { recursive: true })
  const file = 'content/writing/example.md'
  await writeFile(path.join(root, file), `---\ntitle: '${title}'\ndescription: '${description}'\ndate: 2026-10-23\nfeatured: true\n---\nDo not execute this: $(touch forbidden)\n`)
  const image = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#fff' } }).png().toBuffer()
  const archive = `<a class="row-link" href="${route}"><div><h2>${escape(title)}</h2><p>${escape(description)}</p></div><time>October 2026</time></a>`
  const responses = {
    [route]: `<html><head>${head}</head><body><h1>${escape(title)}</h1></body></html>`,
    '/': `<section class="featured-essay"><h2>${escape(title)}</h2><p class="featured-dek">${escape(description)}</p><a href="${route}">Read the essay</a></section>`,
    '/feed.xml': `<rss><channel><item><title>${escape(title)}</title><description>${escape(description)}</description><link>${origin}${route}</link></item></channel></rss>`,
    '/writing/': archive, '/writing/2026/': archive, '/writing/2026/10/': archive, '/writing/2026/10/23/': archive,
    [imagePath]: image,
  }
  const fetchImpl = async (url, options) => {
    assert.equal(url.origin, 'http://127.0.0.1:4377')
    assert.equal(options.redirect, 'manual')
    return new Response(responses[url.pathname] ?? 'Missing', { status: url.pathname in responses ? 200 : 404 })
  }
  return { root, file, origin: 'http://127.0.0.1:4377', fetchImpl, responses }
}

test('accepts production and local origins and rejects unsafe origins', () => {
  assert.equal(publicationOrigin(), origin)
  for (const local of ['http://127.0.0.1:4377', 'http://localhost:4377', 'http://[::1]:4377']) assert.equal(publicationOrigin(local), local)
  for (const unsafe of ['http://ciaranlyons.com', 'https://example.com', 'http://192.168.1.1', 'file:///tmp/a', `${origin}/path`, `${origin}?q=x`, `${origin}#x`, 'https://user:pass@ciaranlyons.com', 'http://localhost:4377/a']) assert.throws(() => publicationOrigin(unsafe))
})

test('verifies the whole publication, including escaped metadata and actual PNG bytes', async (t) => {
  const options = await fixture(t)
  assert.equal((await verifyPublication(options)).featured, route)
})

test('derives homepage fallback and rejects outside, nested, and symlinked sources', async (t) => {
  const { root, file } = await fixture(t)
  await writeFile(path.join(root, 'content/writing/newest.md'), '---\ntitle: Newest\ndate: 2026-10-24\n---\nBody')
  assert.equal((await writingExpectation(file, root)).featured.pathname, route)
  await writeFile(path.join(root, file), '---\ntitle: Earlier\ndate: 2026-10-23\n---\nBody')
  assert.equal((await writingExpectation(file, root)).featured.title, 'Newest')
  await writeFile(path.join(root, 'outside.md'), '---\ndate: 2026-10-23\n---\nOutside')
  await mkdir(path.join(root, 'content/writing/nested'))
  await writeFile(path.join(root, 'content/writing/nested/article.md'), 'nested')
  for (const unsafe of ['outside.md', 'content/writing/nested/article.md', 'content/writing/missing.md']) await assert.rejects(writingExpectation(unsafe, root))
  await symlink(path.join(root, 'outside.md'), path.join(root, 'content/writing/escape.md'))
  await assert.rejects(writingExpectation('content/writing/escape.md', root), /inside content\/writing/)
})

test('fails on wrong metadata, heading, canonical, archive, feed, feature, and social image', async (t) => {
  const cases = [
    [route, (html) => html.replace('content="A description', 'content="Wrong description'), /description/],
    [route, (html) => html.replace('<h1>', '<h1>wrong'), /heading/],
    [route, (html) => html.replace('rel="canonical" href="https:', 'rel="canonical" href="http:'), /canonical/],
    [route, (html) => html.replace('content="1200"', 'content="800"'), /width/],
    ['/writing/', () => '<a href="/other/">Other</a>', /missing article/],
    ['/feed.xml', () => '<rss><channel/></rss>', /feed item/],
    ['/', (html) => html.replace('<h2>', '<h2>Wrong'), /homepage selection/],
    [imagePath, () => undefined, /HTTP 200/],
    [imagePath, async () => sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).png().toBuffer(), /width/],
  ]
  for (const [target, mutate, error] of cases) {
    const options = await fixture(t)
    const value = await mutate(options.responses[target])
    if (value === undefined) delete options.responses[target]
    else options.responses[target] = value
    await assert.rejects(verifyPublication(options), error)
  }
})


test('never invokes executable frontmatter engines or Markdown instructions', async (t) => {
  const options = await fixture(t)
  await writeFile(path.join(options.root, options.file), '---javascript\n({ date: (() => {globalThis.publicationExecuted = true; return "2026-10-23"})() })\n---\nBody')
  await assert.rejects(writingExpectation(options.file, options.root), /plain YAML frontmatter/)
  assert.equal(globalThis.publicationExecuted, undefined)
})
