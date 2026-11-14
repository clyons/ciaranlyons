import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ProviderError } from './generate.mjs'
import { parseLinkMarkdown } from './persist.mjs'
import { collectionStatus, loadLinks, runEnrichment } from './pipeline.mjs'
import { fakeProvider } from './providers.mjs'
import { validateTaxonomy } from './vocabulary.mjs'
import { renameTagInLink, parseArgs } from '../enrich-links.mjs'

const taxonomy = validateTaxonomy({ ignored: ['Saved For Later'] })
const excerpt = 'The feed excerpt describes a long essay about maintenance work in open source communities, why it goes unrewarded, and how funding models could change who keeps critical infrastructure running…'

function linkFile(slug, { title, url, description = '', extra = [] }) {
  return [`${slug}.md`, `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ndate: 2020-01-01\ndateSource: saved\ntargetUrl: ${JSON.stringify(url)}\nfeedlyId: ${JSON.stringify(slug)}\n${extra.join('\n')}${extra.length ? '\n' : ''}tags: ["Saved For Later"]\n---\n`]
}

function articleHtml(title, words = 120, canonical) {
  const paragraphs = Array.from({ length: Math.ceil(words / 12) }, (_, index) => `<p>${title} paragraph ${index} explains a distinct idea about agents and software in plain words.</p>`).join('')
  return `<html><head><title>${title}</title>${canonical ? `<link rel="canonical" href="${canonical}">` : ''}<meta property="og:site_name" content="Example Journal"></head><body><article><h1>${title}</h1>${paragraphs}</article></body></html>`
}

function htmlResponse(body, url) {
  const response = new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
  Object.defineProperty(response, 'url', { value: url })
  return response
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'link-enrichment-'))
  const content = path.join(root, 'links')
  await import('node:fs/promises').then(({ mkdir }) => mkdir(content))
  const files = [
    linkFile('agents', { title: 'Agents choose software', url: 'https://a.example/agents' }),
    linkFile('owned', { title: 'Owner described page', url: 'https://a.example/owned', description: 'Ciaran described this page in his own words.' }),
    linkFile('gone', { title: 'Vanished page', url: 'https://gone.example/page' }),
    linkFile('gone-with-excerpt', { title: 'Maintenance essay', url: 'https://gone.example/essay', description: excerpt }),
    linkFile('slow', { title: 'Slow server page', url: 'https://slow.example/page' }),
    linkFile('homepage-redirect', { title: 'Specific vanished report on pelicans', url: 'https://c.example/report' }),
    linkFile('duplicate', { title: 'Agents choose software again', url: 'https://b.example/copy' }),
    linkFile('video', { title: 'Fun intro to shortcuts', url: 'https://video.example/watch?v=1' }),
  ]
  for (const [name, text] of files) await writeFile(path.join(content, name), text)
  return { root, content, cache: path.join(root, 'cache') }
}

function network({ slowWorks = false } = {}) {
  const requests = []
  const fetchImpl = async (url) => {
    requests.push(url)
    const host = new URL(url).hostname
    if (host === 'gone.example') return new Response('missing', { status: 404 })
    if (host === 'slow.example' && !slowWorks) throw Object.assign(new Error('timed out'), { name: 'TimeoutError' })
    if (host === 'video.example') return htmlResponse('<html><head><title>- Video Site</title><meta name="description" content="Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on our site."></head><body>Video Site</body></html>', url)
    if (host === 'c.example') return htmlResponse(articleHtml('Welcome to our home page of many unrelated things', 200), 'https://c.example/')
    if (url === 'https://b.example/copy') return htmlResponse(articleHtml('Agents choose software again', 120, 'https://a.example/agents/'), url)
    return htmlResponse(articleHtml(url.includes('owned') ? 'Owner described page' : url.includes('slow') ? 'Slow server page' : 'Agents choose software'), url)
  }
  return { fetchImpl, requests }
}

function countingProvider() {
  let calls = 0
  const provider = fakeProvider({
    respond: async (request) => {
      calls += 1
      const title = /\nTitle: (.*)\n/.exec(request.user)[1]
      return {
        output: { sufficientContent: true, description: `A plain account of ${title.toLowerCase()}, covering how agents compare software and what that means for vendors.`, tags: ['ai-agents', 'software-discovery'], contentType: 'article' },
        usage: { inputTokens: 100, outputTokens: 30 },
      }
    },
  })
  return { provider, calls: () => calls }
}

const quietPacer = async (_url, task) => task()

async function snapshot(directory) {
  const names = (await readdir(directory)).sort()
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readFile(path.join(directory, name), 'utf8')])))
}

test('a dry run changes nothing; the applied run reuses its generations and records every outcome', async () => {
  const dirs = await fixture()
  try {
    const { provider, calls } = countingProvider()
    const before = await snapshot(dirs.content)
    const options = { contentDirectory: dirs.content, cacheDirectory: dirs.cache, selection: 'missing', concurrency: 2 }
    const dry = await runEnrichment(options, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.deepEqual(await snapshot(dirs.content), before)
    assert.equal(dry.summary.written, 0)
    const generatedInDryRun = calls()
    assert.ok(generatedInDryRun >= 3)

    const net = network()
    const applied = await runEnrichment({ ...options, apply: true }, { provider, taxonomy, fetchImpl: net.fetchImpl, pacer: quietPacer })
    assert.equal(calls(), generatedInDryRun, 'cached generations are reused, not paid for twice')
    assert.ok(!net.requests.includes('https://a.example/agents'), 'cached page content is reused')
    const outcomes = Object.fromEntries(applied.results.map((result) => [result.slug, result.outcome]))
    assert.deepEqual(outcomes, {
      agents: 'enriched',
      owned: 'enriched',
      gone: 'failed',
      'gone-with-excerpt': 'enriched',
      slow: 'failed',
      'homepage-redirect': 'insufficient-content',
      duplicate: 'enriched',
      video: 'insufficient-content',
    })

    const links = Object.fromEntries((await loadLinks(dirs.content)).map((link) => [link.slug, link.data]))
    assert.match(links.agents.description, /^A plain account of agents choose software/)
    assert.deepEqual(links.agents.tags, ['Saved For Later', 'ai-agents', 'software-discovery'])
    assert.equal(links.agents.sourceTitle, 'Example Journal')
    assert.equal(links.owned.description, 'Ciaran described this page in his own words.', 'human description preserved')
    assert.equal(links.gone.enrichment.error.category, 'broken')
    assert.equal(links.gone.enrichment.error.retryable, false)
    assert.equal(links['gone-with-excerpt'].enrichment.basis, 'excerpt')
    assert.equal(links['gone-with-excerpt'].description, excerpt, 'imported excerpt kept by default')
    assert.equal(links['gone-with-excerpt'].enrichment.fetchIssue, 'broken')
    assert.equal(links.slow.enrichment.error.retryable, true)
    assert.equal(links['homepage-redirect'].enrichment.fetchIssue, 'semantic-mismatch')
    assert.equal(links['homepage-redirect'].description, '', 'a home page is never described as the saved report')
    assert.equal(links.duplicate.enrichment.duplicateOf, 'agents')
    assert.equal(links.video.description, '', 'generic site metadata is never used to describe a Link')
    assert.equal(links.video.sourceTitle, undefined)
    assert.ok(links.agents.title && links.agents.targetUrl === 'https://a.example/agents', 'links are never deleted or retargeted')

    const status = collectionStatus(await loadLinks(dirs.content), { taxonomy, providerId: provider.id })
    assert.equal(status.statuses.enriched, 4)
    assert.equal(status.possibleDuplicates.length, 1)
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('repeat runs are idempotent, retries pick up transient failures, and human edits survive re-enrichment', async () => {
  const dirs = await fixture()
  try {
    const { provider } = countingProvider()
    const options = { contentDirectory: dirs.content, cacheDirectory: dirs.cache, selection: 'missing', apply: true }
    await runEnrichment(options, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    const afterFirst = await snapshot(dirs.content)

    const again = await runEnrichment(options, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.equal(again.summary.selected, 0)
    assert.deepEqual(await snapshot(dirs.content), afterFirst)

    // Naming every Link explicitly is also safe: completed Links are left byte-for-byte alone
    // (several have an empty author the pages never supply); only failures record a retry.
    const named = await runEnrichment({ ...options, slugs: Object.keys(afterFirst).map((name) => name.slice(0, -3)) }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    const afterNamed = await snapshot(dirs.content)
    const changedFiles = Object.keys(afterFirst).filter((name) => afterFirst[name] !== afterNamed[name]).sort()
    assert.deepEqual(changedFiles, ['gone.md', 'slow.md'])
    assert.equal(named.results.filter((result) => result.outcome === 'skipped').length, 6)

    const retry = await runEnrichment({ ...options, selection: 'failed' }, { provider, taxonomy, fetchImpl: network({ slowWorks: true }).fetchImpl, pacer: quietPacer })
    assert.deepEqual(retry.results.map((result) => [result.slug, result.outcome]), [['slow', 'enriched']], 'permanent failures are not retried by default')
    const permanent = await runEnrichment({ ...options, selection: 'failed', includePermanent: true }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.deepEqual(permanent.results.map((result) => result.slug), ['gone'])
    const gone = (await loadLinks(dirs.content)).find((link) => link.slug === 'gone')
    assert.equal(gone.data.enrichment.attempts, 3, 'first run, the named rerun, and the --include-permanent retry')

    const file = path.join(dirs.content, 'agents.md')
    const enriched = await readFile(file, 'utf8')
    const generated = parseLinkMarkdown(enriched).data.description
    await writeFile(file, enriched.replace(JSON.stringify(generated), JSON.stringify('Ciaran rewrote this sentence by hand after reading the page closely.')))
    await runEnrichment({ ...options, slugs: ['agents'], reEnrich: true, regenerate: true }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    const data = parseLinkMarkdown(await readFile(file, 'utf8')).data
    assert.equal(data.description, 'Ciaran rewrote this sentence by hand after reading the page closely.')
    assert.deepEqual(data.enrichment.fields.description, { by: 'human' })
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('a provider outage stops the run without marking Links as failed', async () => {
  const dirs = await fixture()
  try {
    const provider = fakeProvider({ respond: async () => { throw new ProviderError('authentication failed', { fatal: true }) } })
    const before = await snapshot(dirs.content)
    const run = await runEnrichment({ contentDirectory: dirs.content, cacheDirectory: dirs.cache, selection: 'missing', apply: true, concurrency: 1 }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.match(run.summary.stoppedEarly, /authentication failed/)
    assert.deepEqual(await snapshot(dirs.content), before)
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('exported requests contain prompts without calling a model', async () => {
  const dirs = await fixture()
  try {
    const { provider, calls } = countingProvider()
    const run = await runEnrichment({ contentDirectory: dirs.content, cacheDirectory: dirs.cache, selection: 'missing', slugs: ['agents'], exportRequests: 'unused' }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.equal(calls(), 0)
    assert.equal(run.exported.length, 1)
    assert.match(run.exported[0].user, /Extracted page text/)
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('tag merges rename across Links and keep provenance consistent', () => {
  const raw = '---\ntitle: "T"\ntargetUrl: "https://e.com"\ntags: ["Saved For Later","ai-agent","owner-tag"]\nenrichment:\n  status: "enriched"\n  fields: {"tags":{"by":"ai","added":["ai-agent"]}}\n---\n'
  const { data } = parseLinkMarkdown(raw)
  const next = renameTagInLink({ raw, data, tags: data.tags }, 'ai-agent', 'ai-agents')
  const after = parseLinkMarkdown(next).data
  assert.deepEqual(after.tags, ['Saved For Later', 'ai-agents', 'owner-tag'])
  assert.deepEqual(after.enrichment.fields.tags.added, ['ai-agents'])
})

test('command-line options parse into a run configuration', () => {
  const options = parseArgs(['--slug', 'a', '--slug', 'b', '--failed', '--re-enrich', '--fields', 'description,tags', '--apply', '--limit', '5'])
  assert.equal(options.command, 'run')
  assert.deepEqual(options.slugs, ['a', 'b'])
  assert.equal(options.selection, 'failed')
  assert.deepEqual(options.fields, ['description', 'tags'])
  assert.equal(options.apply, true)
  assert.equal(options.limit, 5)
  assert.equal(parseArgs(['status']).command, 'status')
  assert.throws(() => parseArgs(['--fields', 'title']), /Unknown field/)
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/)
  assert.throws(() => parseArgs(['--export-requests', 'x.jsonl', '--apply']), /only writes prompts/)
})
