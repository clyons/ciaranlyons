import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ProviderError, promptVersion } from './generate.mjs'
import { fillableFields, parseLinkMarkdown, planEnrichment, rewriteLinkMarkdown } from './persist.mjs'
import { collectionStatus, loadLinks, runEnrichment } from './pipeline.mjs'
import { fakeProvider, fileProvider } from './providers.mjs'
import { canonicalTag, loadTaxonomy, validateTaxonomy } from './vocabulary.mjs'
import { main, renameTagInLink, parseArgs } from '../enrich-links.mjs'

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

test('a failed model upgrade retries machine values and preserves human edits', async () => {
  const dirs = await fixture()
  try {
    const options = { contentDirectory: dirs.content, noCache: true, apply: true }
    const { provider: old } = countingProvider()
    old.id = 'test:old'
    await runEnrichment({ ...options, slugs: ['agents', 'owned'] }, { provider: old, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    const ownedFile = path.join(dirs.content, 'owned.md')
    const owned = await readFile(ownedFile, 'utf8')
    await writeFile(ownedFile, owned
      .replace('sourceTitle: "Example Journal"', 'sourceTitle: "Ciaran chose this publisher"')
      .replace('tags: ["Saved For Later","ai-agents","software-discovery"]', 'tags: ["Saved For Later","ai-agents","Owner Pick"]'))
    const beforeUpgrade = await snapshot(dirs.content)
    const failing = { id: 'test:new', generate: async () => { throw new ProviderError('No usable response', { category: 'no-response', retryable: true }) } }
    const failed = await runEnrichment({ ...options, selection: 'stale' }, { provider: failing, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.deepEqual(failed.summary.outcomes, { failed: 2 })
    for (const slug of ['agents', 'owned']) {
      const data = parseLinkMarkdown(await readFile(path.join(dirs.content, `${slug}.md`), 'utf8')).data
      const before = parseLinkMarkdown(beforeUpgrade[`${slug}.md`]).data
      assert.equal(data.enrichment.model, 'test:old')
      assert.equal(data.description, before.description)
      assert.deepEqual(data.tags, before.tags)
    }

    const description = 'Software vendors adapt their discovery and pricing strategies as autonomous agents increasingly choose which products to buy.'
    const newer = { id: 'test:new', generate: async () => ({ output: { sufficientContent: true, description, tags: ['distribution', 'software-discovery'], contentType: 'article' } }) }
    const fetchImpl = async (url) => {
      const response = await network().fetchImpl(url)
      return htmlResponse((await response.text()).replace('Example Journal', 'New Journal'), url)
    }
    const retry = await runEnrichment({ ...options, selection: 'failed' }, { provider: newer, taxonomy, fetchImpl, pacer: quietPacer })
    assert.deepEqual(retry.summary.outcomes, { enriched: 2 })
    const links = Object.fromEntries((await loadLinks(dirs.content)).map((link) => [link.slug, link.data]))
    assert.equal(links.agents.description, description)
    assert.deepEqual(links.agents.tags, ['Saved For Later', 'distribution', 'software-discovery'])
    assert.equal(links.agents.sourceTitle, 'New Journal')
    assert.equal(links.owned.description, 'Ciaran described this page in his own words.')
    assert.equal(links.owned.sourceTitle, 'Ciaran chose this publisher')
    assert.deepEqual(links.owned.tags, ['Saved For Later', 'Owner Pick', 'distribution'])
    assert.deepEqual(links.owned.enrichment.fields.tags.rejected, ['software-discovery'])
    assert.equal(links.agents.enrichment.model, 'test:new')
    const stale = await runEnrichment({ ...options, selection: 'stale' }, { provider: newer, taxonomy, fetchImpl, pacer: quietPacer })
    assert.equal(stale.summary.selected, 0)
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

for (const legacy of [false, true]) {
  for (const firstField of ['description', 'tags']) {
    test(`partial model upgrades retain ${legacy ? 'legacy' : 'per-field'} provenance after updating ${firstField}`, async () => {
      const dirs = await fixture()
      try {
        const options = { contentDirectory: dirs.content, noCache: true, apply: true }
        const context = { taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer }
        const { provider: old } = countingProvider()
        old.id = 'test:old'
        await runEnrichment({ ...options, slugs: ['agents'] }, { ...context, provider: old })
        const file = path.join(dirs.content, 'agents.md')
        let before = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents')
        if (legacy) {
          const { generations: _generations, ...enrichment } = before.enrichment
          await writeFile(file, rewriteLinkMarkdown(before.raw, {}, enrichment))
          before = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents')
        }
        const description = 'Software vendors adapt their discovery and pricing strategies as autonomous agents increasingly choose which products to buy.'
        const newer = { id: 'test:new', generate: async () => ({ output: { sufficientContent: true, description, tags: ['distribution'], contentType: 'article' } }) }
        const run = (fields) => runEnrichment({ ...options, selection: 'stale', fields }, { ...context, provider: newer })
        await run([firstField])
        const secondField = firstField === 'tags' ? 'description' : 'tags'
        const partial = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents')
        assert.deepEqual(partial.data[secondField], before.data[secondField])
        assert.equal(collectionStatus([partial], { taxonomy, providerId: newer.id }).staleForCurrentModel, 1)
        assert.equal(partial.enrichment.generations[secondField].model, old.id)
        assert.equal(partial.enrichment.generations[firstField].model, newer.id)
        assert.equal((await run([firstField])).summary.selected, 0, 'the already-upgraded field must not repeat')
        assert.equal((await run([secondField])).summary.selected, 1, 'the excluded field must remain stale')
        const completed = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents')
        assert.equal(completed.data.description, description)
        assert.deepEqual(completed.tags, ['Saved For Later', 'distribution'])
        assert.equal(collectionStatus([completed], { taxonomy, providerId: newer.id }).staleForCurrentModel, 0)
        assert.equal((await run()).summary.selected, 0)
        assert.equal((await loadLinks(dirs.content)).find((link) => link.slug === 'agents').raw, completed.raw)
      } finally {
        await rm(dirs.root, { recursive: true, force: true })
      }
    })
  }
}

test('a partial prompt upgrade preserves the excluded generation and ignores human-owned fields', async () => {
  const dirs = await fixture()
  try {
    const { provider } = countingProvider()
    const options = { contentDirectory: dirs.content, noCache: true, apply: true }
    const context = { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer }
    await runEnrichment({ ...options, slugs: ['agents', 'owned'] }, context)
    for (const link of (await loadLinks(dirs.content)).filter(({ slug }) => ['agents', 'owned'].includes(slug))) {
      const { generations: _generations, ...previous } = link.enrichment
      await writeFile(link.file, rewriteLinkMarkdown(link.raw, {}, { ...previous, promptVersion: promptVersion - 1 }))
    }
    await runEnrichment({ ...options, selection: 'stale', fields: ['tags'] }, context)
    const partial = (await loadLinks(dirs.content)).find(({ slug }) => slug === 'agents')
    assert.equal(partial.enrichment.generations.description.promptVersion, promptVersion - 1)
    assert.equal(partial.enrichment.generations.tags.promptVersion, promptVersion)
    assert.equal(collectionStatus(await loadLinks(dirs.content), { taxonomy, providerId: provider.id }).staleForCurrentModel, 1)
    const descriptions = await runEnrichment({ ...options, selection: 'stale', fields: ['description'] }, context)
    assert.deepEqual(descriptions.results.map(({ slug }) => slug), ['agents'])
    assert.equal(collectionStatus(await loadLinks(dirs.content), { taxonomy, providerId: provider.id }).staleForCurrentModel, 0)
    assert.equal((await loadLinks(dirs.content)).find(({ slug }) => slug === 'owned').data.description, 'Ciaran described this page in his own words.')
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('partial runs leave unattempted fields fillable and completed fields idempotent', async () => {
  const dirs = await fixture()
  try {
    const { provider, calls } = countingProvider()
    const context = { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer }
    const options = { contentDirectory: dirs.content, noCache: true, apply: true }
    await runEnrichment({ ...options, slugs: ['agents'], fields: ['tags'] }, context)
    const tagsOnly = parseLinkMarkdown(await readFile(path.join(dirs.content, 'agents.md'), 'utf8')).data
    assert.equal(tagsOnly.description, '')
    const descriptionRun = await runEnrichment({ ...options, slugs: ['agents'], fields: ['description'] }, context)
    assert.equal(descriptionRun.results[0].outcome, 'enriched')
    const all = await runEnrichment({ ...options, selection: 'all', fields: ['author', 'sourceTitle'] }, context)
    assert.equal(all.results.find((result) => result.slug === 'agents').outcome, 'enriched')
    const completed = parseLinkMarkdown(await readFile(path.join(dirs.content, 'agents.md'), 'utf8')).data
    assert.match(completed.description, /^A plain account of agents choose software/)
    assert.deepEqual(completed.tags, tagsOnly.tags)
    assert.equal(completed.sourceTitle, 'Example Journal')
    assert.equal(completed.author, undefined, 'a completed attempt may leave a field empty')
    assert.deepEqual(new Set(completed.enrichment.attemptedFields), new Set(['description', 'tags', 'author', 'sourceTitle']))
    const callsBeforeRepeat = calls()
    const repeat = await runEnrichment({ ...options, slugs: ['agents'] }, context)
    assert.equal(repeat.results[0].outcome, 'skipped')
    assert.equal(calls(), callsBeforeRepeat)
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

test('rejected redirects cannot match saved homepages or contaminate stored URL aliases', async () => {
  const dirs = await fixture()
  try {
    const [name, raw] = linkFile('publisher-home', { title: 'Publisher homepage', url: 'https://c.example/' })
    await writeFile(path.join(dirs.content, name), raw)
    const { provider } = countingProvider()
    const options = { contentDirectory: dirs.content, noCache: true, apply: true }
    const run = await runEnrichment({ ...options, slugs: ['homepage-redirect'] }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.equal(run.results[0].fetchIssue, 'semantic-mismatch')
    assert.equal(run.results[0].duplicateOf, undefined)
    const rejected = (await loadLinks(dirs.content)).find((link) => link.slug === 'homepage-redirect')
    assert.equal(rejected.enrichment.finalUrl, undefined)

    // An older rejected record may sort before the real homepage and steal its URL.
    const [oldName, oldRaw] = linkFile('aaa-old-redirect', { title: 'Vanished story', url: 'https://old.example/story', extra: ['enrichment: {status: insufficient-content, fetchIssue: semantic-mismatch, finalUrl: "https://c.example/", canonicalUrl: "https://c.example/"}'] })
    await writeFile(path.join(dirs.content, oldName), oldRaw)
    const fetchImpl = async (url) => htmlResponse(articleHtml(url.includes('copy') ? 'Agents choose software again' : 'Agents choose software'), 'https://c.example/')
    const valid = await runEnrichment({ ...options, slugs: ['agents'] }, { provider, taxonomy, fetchImpl, pacer: quietPacer })
    assert.equal(valid.results[0].duplicateOf, 'publisher-home', 'a trusted redirect matches the saved target, never a rejected alias')
    await rm(path.join(dirs.content, name))
    const withoutHomepage = await runEnrichment({ ...options, slugs: ['duplicate'] }, { provider, taxonomy, fetchImpl, pacer: quietPacer })
    assert.equal(withoutHomepage.results[0].duplicateOf, 'agents', 'the trusted redirect alias remains usable')
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

for (const thin of [false, true]) {
  test(`author/source-only runs save ${thin ? 'thin-page' : 'article'} metadata without calling a model`, async () => {
    const dirs = await fixture()
    try {
      let calls = 0
      const provider = { id: 'test:unavailable', generate: async () => { calls += 1; throw new ProviderError('No credentials', { fatal: true }) } }
      const html = thin
        ? '<html><head><title>Agents choose software</title><meta name="author" content="Ada Writer"><meta property="og:site_name" content="Example Journal"></head><body>Brief page</body></html>'
        : articleHtml('Agents choose software').replace('</head>', '<meta name="author" content="Ada Writer"></head>')
      const options = { contentDirectory: dirs.content, noCache: true, slugs: ['agents'], fields: ['author', 'sourceTitle'], apply: true }
      const context = { provider, taxonomy, fetchImpl: async (url) => htmlResponse(html, url), pacer: quietPacer }
      const run = await runEnrichment(options, context)
      assert.equal(calls, 0)
      assert.equal(run.failure, undefined)
      assert.equal(run.results[0].outcome, 'enriched')
      const data = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents').data
      assert.equal(data.author, 'Ada Writer')
      assert.equal(data.sourceTitle, 'Example Journal')
      assert.equal(data.description, '')
      assert.deepEqual(data.tags, ['Saved For Later'])
      assert.deepEqual(data.enrichment.attemptedFields, ['author', 'sourceTitle'])
      assert.equal(data.enrichment.model, undefined)
      assert.equal(data.enrichment.generatedAt, undefined)
      const repeat = await runEnrichment(options, context)
      assert.equal(repeat.results[0].outcome, 'skipped')
    } finally {
      await rm(dirs.root, { recursive: true, force: true })
    }
  })
}

test('extraction-only success preserves the provenance of earlier model output', async () => {
  const dirs = await fixture()
  try {
    const options = { contentDirectory: dirs.content, noCache: true, slugs: ['agents'], apply: true }
    const { provider } = countingProvider()
    const generate = provider.generate
    provider.generate = async (request) => ({ ...await generate(request), servedModel: 'test:fallback' })
    const context = { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer, now: () => new Date('2026-11-14T12:00:00Z') }
    await runEnrichment({ ...options, fields: ['description', 'tags'] }, context)
    const before = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents').data
    const run = await runEnrichment({ ...options, fields: ['author', 'sourceTitle'] }, { ...context, provider: { id: 'test:other', generate: async () => { throw new Error('Must not generate') } }, now: () => new Date('2026-11-16T12:00:00Z') })
    assert.equal(run.failure, undefined)
    const after = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents').data
    assert.equal(after.enrichment.model, before.enrichment.model)
    assert.equal(after.enrichment.servedModel, 'test:fallback')
    assert.equal(after.enrichment.promptVersion, before.enrichment.promptVersion)
    assert.equal(after.enrichment.generatedAt, before.enrichment.generatedAt)
    assert.deepEqual(after.enrichment.fields.description, before.enrichment.fields.description)
    assert.equal(after.sourceTitle, 'Example Journal')
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('author/source-only runs reject unrelated metadata without generating from saved excerpts', async () => {
  const dirs = await fixture()
  try {
    const [name, raw] = linkFile('unrelated', { title: 'Specific vanished report on pelicans', url: 'https://c.example/report', description: excerpt })
    await writeFile(path.join(dirs.content, name), raw)
    let calls = 0
    const provider = { id: 'test:unused', generate: async () => { calls += 1; throw new Error('Must not generate') } }
    const run = await runEnrichment({ contentDirectory: dirs.content, noCache: true, slugs: ['unrelated'], fields: ['author', 'sourceTitle'], apply: true }, { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer })
    assert.equal(calls, 0)
    assert.equal(run.results[0].outcome, 'insufficient-content')
    const data = (await loadLinks(dirs.content)).find((link) => link.slug === 'unrelated').data
    assert.equal(data.author, undefined)
    assert.equal(data.sourceTitle, undefined)
    assert.equal(data.description, excerpt)
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

for (const outcome of ['failed', 'insufficient-content']) {
  test(`trusted extracted metadata survives ${outcome} generation`, async () => {
    const dirs = await fixture()
    try {
      const provider = { id: 'test:thin', generate: async () => {
        if (outcome === 'failed') throw new ProviderError('No reviewed response', { category: 'no-response', retryable: true })
        return { output: { sufficientContent: false, description: '', tags: [], contentType: 'other' } }
      } }
      const html = articleHtml('Agents choose software').replace('</head>', '<meta name="author" content="Ada Writer"></head>')
      const run = await runEnrichment({ contentDirectory: dirs.content, noCache: true, slugs: ['agents'], apply: true }, { provider, taxonomy, fetchImpl: async (url) => htmlResponse(html, url), pacer: quietPacer })
      assert.equal(run.results[0].outcome, outcome)
      const data = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents').data
      assert.equal(data.author, 'Ada Writer')
      assert.equal(data.sourceTitle, 'Example Journal')
      assert.equal(data.enrichment.fields.author.by, 'extracted')
      assert.equal(data.description, '')
      assert.deepEqual(data.tags, ['Saved For Later'])
    } finally {
      await rm(dirs.root, { recursive: true, force: true })
    }
  })
}

test('reviewed response cache distinguishes file paths and changed contents while reusing identical files', async () => {
  const dirs = await fixture()
  try {
    const firstFile = path.join(dirs.root, 'first', 'responses.json')
    const secondFile = path.join(dirs.root, 'second', 'responses.json')
    await mkdir(path.dirname(firstFile))
    await mkdir(path.dirname(secondFile))
    const descriptions = [
      'Autonomous agents compare software products by reading documentation, testing capabilities, and evaluating how well each option serves their users.',
      'Software vendors adapt their discovery and pricing strategies as autonomous agents increasingly choose which products to buy.',
      'Machine readable documentation helps autonomous agents evaluate software capabilities and select products that satisfy specific user requirements.',
    ]
    const answer = (description) => JSON.stringify({ agents: { sufficientContent: true, description, tags: ['ai-agents', 'software-discovery'], contentType: 'article' } })
    await writeFile(firstFile, answer(descriptions[0]))
    await writeFile(secondFile, answer(descriptions[1]))
    const options = { contentDirectory: dirs.content, cacheDirectory: dirs.cache, slugs: ['agents'] }
    const context = { taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer }
    await runEnrichment(options, { ...context, provider: fileProvider({ file: firstFile }) })
    const reused = await runEnrichment(options, { ...context, provider: fileProvider({ file: firstFile }) })
    assert.equal(reused.summary.usage.calls, 0)
    await runEnrichment({ ...options, apply: true }, { ...context, provider: fileProvider({ file: secondFile }) })
    let data = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents').data
    assert.equal(data.description, descriptions[1])
    await writeFile(secondFile, answer(descriptions[2]))
    await runEnrichment({ ...options, apply: true, reEnrich: true }, { ...context, provider: fileProvider({ file: secondFile }) })
    data = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents').data
    assert.equal(data.description, descriptions[2])
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('refetched page metadata invalidates generations even when body text is unchanged', async () => {
  const dirs = await fixture()
  try {
    let pageDescription = 'Original metadata'
    let calls = 0
    const provider = { id: 'test:metadata', generate: async ({ user }) => {
      calls += 1
      const metadata = /\nPage description: (.*)\n/.exec(user)[1]
      return { output: { sufficientContent: true, description: `${metadata} explains how autonomous agents evaluate software products and how vendors adapt their documentation and distribution.`, tags: ['ai-agents'], contentType: 'article' } }
    } }
    const fetchImpl = async (url) => htmlResponse(articleHtml('Agents choose software').replace('</head>', `<meta name="description" content="${pageDescription}"></head>`), url)
    const options = { contentDirectory: dirs.content, cacheDirectory: dirs.cache, slugs: ['agents'], fields: ['description', 'tags'] }
    const context = { provider, taxonomy, fetchImpl, pacer: quietPacer }
    await runEnrichment(options, context)
    await runEnrichment({ ...options, apply: true }, context)
    assert.equal(calls, 1, 'unchanged prompt reuses the dry-run answer')
    const first = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents')
    pageDescription = 'Updated metadata'
    await runEnrichment({ ...options, refetch: true, reEnrich: true, apply: true }, context)
    const updated = (await loadLinks(dirs.content)).find((link) => link.slug === 'agents')
    assert.equal(updated.enrichment.contentHash, first.enrichment.contentHash, 'article body did not change')
    assert.equal(calls, 2, 'changed page metadata requires another answer')
    assert.match(updated.data.description, /^Updated metadata/)
    await runEnrichment({ ...options, refetch: true, reEnrich: true }, context)
    assert.equal(calls, 2, 'identical context still reuses the answer')
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('saved prompt context and owner interests invalidate generations', async () => {
  const dirs = await fixture()
  try {
    const { provider, calls } = countingProvider()
    const options = { contentDirectory: dirs.content, cacheDirectory: dirs.cache, slugs: ['agents'] }
    const context = { provider, taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer }
    await runEnrichment(options, context)
    await runEnrichment(options, context)
    assert.equal(calls(), 1)
    const changes = {
      title: 'Agents choose software in plain words',
      targetUrl: 'https://a.example/agents?edition=2',
      author: 'Ada Writer',
      sourceTitle: 'Saved Journal',
      publishedAt: '2026-01-02',
      description: 'A saved excerpt about how autonomous agents evaluate software and how vendors distribute their products.',
      tags: ['Saved For Later', 'owner-pick'],
    }
    let expected = 1
    for (const [field, value] of Object.entries(changes)) {
      const link = (await loadLinks(dirs.content)).find((item) => item.slug === 'agents')
      await writeFile(link.file, rewriteLinkMarkdown(link.raw, { [field]: value }, link.enrichment))
      await runEnrichment(options, context)
      assert.equal(calls(), ++expected, `${field} changes the request`)
    }
    await runEnrichment(options, { ...context, taxonomy: validateTaxonomy({ interests: ['software distribution'] }) })
    assert.equal(calls(), ++expected, 'owner interests change the request')
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('malformed reviewed responses stay open and succeed on a corrected --failed retry', async () => {
  const dirs = await fixture()
  try {
    const file = path.join(dirs.root, 'responses.json')
    await writeFile(file, JSON.stringify({ agents: {} }))
    const options = { contentDirectory: dirs.content, cacheDirectory: dirs.cache, slugs: ['agents'], apply: true }
    const context = { taxonomy, fetchImpl: network().fetchImpl, pacer: quietPacer }
    const failed = await runEnrichment(options, { ...context, provider: fileProvider({ file }) })
    assert.equal(failed.results[0].outcome, 'failed')
    assert.equal(failed.results[0].error.category, 'invalid-output')
    assert.equal(failed.results[0].error.retryable, true)
    const link = (await loadLinks(dirs.content)).find((item) => item.slug === 'agents')
    assert.deepEqual(link.enrichment.attemptedFields, [])
    assert.deepEqual(fillableFields(link.data, link.enrichment, { taxonomy }), ['description', 'author', 'tags'])
    assert.equal(link.data.description, '')
    assert.deepEqual(link.data.tags, ['Saved For Later'])
    const description = 'Software vendors adapt their discovery and pricing strategies as autonomous agents increasingly choose which products to buy.'
    await writeFile(file, JSON.stringify({ agents: { sufficientContent: true, description, tags: ['ai-agents'], contentType: 'article' } }))
    const retry = await runEnrichment({ ...options, slugs: undefined, selection: 'failed' }, { ...context, provider: fileProvider({ file }) })
    assert.deepEqual(retry.results.map(({ slug, outcome }) => [slug, outcome]), [['agents', 'enriched']])
    assert.equal(retry.summary.usage.calls, 1)
    const updated = (await loadLinks(dirs.content)).find((item) => item.slug === 'agents')
    assert.equal(updated.data.description, description)
    assert.deepEqual(updated.data.tags, ['Saved For Later', 'ai-agents'])
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('tag merges preserve removals that exist only in provenance', () => {
  const aliased = validateTaxonomy({ aliases: { 'ai-agent': 'ai-agents' } })
  for (const record of [
    { by: 'ai', added: ['ai-agent'] },
    { by: 'ai', added: ['ai-agent'], rejected: ['ai-agents'] },
    { by: 'ai', added: [], rejected: ['ai-agent'] },
  ]) {
    const raw = `---\ntitle: "T"\ntags: [ 'owner-tag' ]\nenrichment:\n  status: "enriched"\n  fields: ${JSON.stringify({ tags: record })}\n---\n`
    const { data } = parseLinkMarkdown(raw)
    const next = renameTagInLink({ raw, data, tags: data.tags }, 'ai-agent', 'ai-agents')
    assert.ok(next, 'provenance-only matches must be rewritten')
    assert.match(next, /tags: \[ 'owner-tag' \]/, 'current tags remain byte-for-byte untouched')
    const merged = parseLinkMarkdown(next).data
    assert.deepEqual(merged.enrichment.fields.tags, { by: 'ai', added: [], rejected: ['ai-agents'] })
    const plan = planEnrichment({
      data: merged,
      generated: { tags: ['ai-agent', 'ai-agents', 'distribution'] },
      attempt: { status: 'enriched', at: '2026-11-16T12:00:00.000Z' },
      options: { taxonomy: aliased, reEnrich: true },
    })
    assert.deepEqual(plan.updates.tags, ['owner-tag', 'distribution'])
    assert.equal(renameTagInLink({ raw: next, data: merged, tags: merged.tags }, 'ai-agent', 'ai-agents'), undefined)
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

test('tag merges preserve human ownership in either direction through re-enrichment', () => {
  for (const added of [['ai-agent'], ['ai-agents']]) {
    const raw = `---\ntitle: "T"\ntargetUrl: "https://e.com"\ntags: ["Saved For Later","ai-agents","ai-agent"]\nenrichment:\n  status: "enriched"\n  fields: ${JSON.stringify({ tags: { by: 'ai', added } })}\n---\n`
    const { data } = parseLinkMarkdown(raw)
    const mergedRaw = renameTagInLink({ raw, data, tags: data.tags }, 'ai-agent', 'ai-agents')
    const merged = parseLinkMarkdown(mergedRaw).data
    assert.deepEqual(merged.tags, ['Saved For Later', 'ai-agents'])
    assert.deepEqual(merged.enrichment.fields.tags.added, [], `human ownership wins over ${added[0]}`)
    const plan = planEnrichment({
      data: merged,
      generated: { description: 'An explanation of how agents choose software products and how vendors adapt their distribution strategies.', tags: ['software-discovery', 'distribution'] },
      attempt: { status: 'enriched', at: '2026-11-16T12:00:00.000Z', model: 'test:new', promptVersion: 1 },
      options: { taxonomy, reEnrich: true },
    })
    const refreshed = parseLinkMarkdown(rewriteLinkMarkdown(mergedRaw, plan.updates, plan.enrichment)).data
    assert.deepEqual(refreshed.tags, ['Saved For Later', 'ai-agents', 'software-discovery', 'distribution'])
  }
})

test('merging two machine tags keeps the resulting tag machine-owned', () => {
  const raw = '---\ntitle: "T"\ntags: ["ai-agent","ai-agents"]\nenrichment:\n  status: "enriched"\n  fields: {"tags":{"by":"ai","added":["ai-agent","ai-agents"],"rejected":["old-agent"]}}\n---\n'
  const { data } = parseLinkMarkdown(raw)
  const merged = parseLinkMarkdown(renameTagInLink({ raw, data, tags: data.tags }, 'ai-agent', 'ai-agents')).data
  assert.deepEqual(merged.tags, ['ai-agents'])
  assert.deepEqual(merged.enrichment.fields.tags, { by: 'ai', added: ['ai-agents'], rejected: ['old-agent'] })
})

test('merging into an existing alias preserves its canonical target and earlier aliases', async () => {
  const dirs = await fixture()
  try {
    const file = path.join(dirs.root, 'taxonomy.json')
    await writeFile(file, JSON.stringify({ aliases: { ux: 'user-experience', 'usability-design': 'usability' } }))
    const raw = '---\ntitle: "T"\ntags: ["user-experience","usability"]\nenrichment:\n  status: "enriched"\n  fields: {"tags":{"by":"ai","added":["usability"]}}\n---\n'
    await writeFile(path.join(dirs.content, 'agents.md'), raw)
    const before = await snapshot(dirs.content)
    const oldTaxonomy = await readFile(file, 'utf8')
    const args = ['merge-tags', '--from', 'usability', '--to', 'ux', '--taxonomy', file, '--content', dirs.content]
    await main(args)
    assert.deepEqual(await snapshot(dirs.content), before, 'dry runs leave Links unchanged')
    assert.equal(await readFile(file, 'utf8'), oldTaxonomy)
    await main([...args, '--apply'])
    const merged = (await loadLinks(dirs.content)).find(({ slug }) => slug === 'agents')
    assert.deepEqual(merged.tags, ['user-experience'])
    assert.deepEqual(merged.enrichment.fields.tags.added, [], 'the canonical human tag keeps its ownership')
    const updated = await loadTaxonomy(file)
    assert.deepEqual(updated.aliases, { usability: 'user-experience', 'usability-design': 'user-experience', ux: 'user-experience' })
    assert.equal(canonicalTag('ux', updated), 'user-experience')
    const applied = await snapshot(dirs.content)
    const appliedTaxonomy = await readFile(file, 'utf8')
    await main([...args, '--apply'])
    await main(['merge-tags', '--from', 'user-experience', '--to', 'ux', '--taxonomy', file, '--content', dirs.content, '--apply'])
    assert.deepEqual(await snapshot(dirs.content), applied, 'repeated and canonical self-merges are no-ops')
    assert.equal(await readFile(file, 'utf8'), appliedTaxonomy)
  } finally {
    await rm(dirs.root, { recursive: true, force: true })
  }
})

test('keep-distinct previews without writing and saves a normalized pair only with --apply', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'link-taxonomy-'))
  try {
    const file = path.join(root, 'tags.json')
    const original = '{ "distinct": [["ai", "artificial-intelligence"]], "interests": ["design"] }\n'
    await writeFile(file, original)
    const args = ['keep-distinct', 'UX', 'user experience', '--taxonomy', file]
    await main(args)
    assert.equal(await readFile(file, 'utf8'), original)
    await main([...args, '--apply'])
    const applied = await readFile(file, 'utf8')
    assert.deepEqual(JSON.parse(applied).distinct, [['ai', 'artificial-intelligence'], ['user-experience', 'ux']])
    assert.deepEqual(JSON.parse(applied).interests, ['design'])
    await main(['keep-distinct', 'user-experience', 'ux', '--taxonomy', file, '--apply'])
    assert.equal(await readFile(file, 'utf8'), applied, 'reversed or repeated pairs are not duplicated')
    const absent = path.join(root, 'absent.json')
    await main(['keep-distinct', 'ux', 'user-experience', '--taxonomy', absent])
    await assert.rejects(readFile(absent), { code: 'ENOENT' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
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
