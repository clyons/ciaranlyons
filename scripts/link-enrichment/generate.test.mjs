import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRequest, descriptionProblems, generateMetadata, normalizeDescription, normalizeTags, outputSchema, ProviderError } from './generate.mjs'
import { anthropicProvider, chatCompletionsProvider, fakeProvider, parseModelSpec, resolveProvider } from './providers.mjs'
import { validateTaxonomy } from './vocabulary.mjs'

const taxonomy = validateTaxonomy({ ignored: ['Saved For Later'], aliases: { 'ai-agent': 'ai-agents', llm: 'large-language-models' }, distinct: [], interests: ['software distribution'] })
const good = 'An examination of how autonomous AI agents may change software discovery, purchasing decisions, and competitive advantage for vendors.'

test('descriptions are checked for length, framing, first person, and hype', () => {
  assert.deepEqual(descriptionProblems(good), [])
  assert.match(descriptionProblems('An interesting article about the future of artificial intelligence.').join(' '), /words|frame|praise/)
  assert.match(descriptionProblems('This article explains how agents choose software and why documentation that machines can read now matters to vendors.').join(' '), /frame/)
  assert.match(descriptionProblems('My favourite explanation of how agents choose software and why machine-readable documentation matters to every vendor.').join(' '), /first-person/)
  assert.equal(normalizeDescription('  “Quoted text without a full stop”  '), 'Quoted text without a full stop.')
})

test('proposed tags are normalised, aliased, deduplicated, filtered, and capped', () => {
  const tags = normalizeTags(['AI Agent', 'ai-agents', 'LLM', 'Technology', 'distribution', 'pricing', 'rejected-one', 'owner-tag', 'automation', 'extra'], {
    taxonomy,
    humanTags: ['Owner Tag'],
    rejected: ['rejected-one'],
    maximum: 4,
  })
  assert.deepEqual(tags, ['ai-agents', 'large-language-models', 'distribution', 'pricing'])
})

test('rejected tags block both spellings of a reviewed alias', () => {
  for (const rejected of [['ai-agent'], ['ai-agents']]) {
    assert.deepEqual(normalizeTags(['AI Agent', 'ai-agents', 'distribution'], { taxonomy, rejected }), ['distribution'])
  }
})

test('the request carries vocabulary, owner tags, metadata, and page text, and declares the schema', () => {
  const request = buildRequest({
    link: { title: 'Agents', targetUrl: 'https://example.com/a', sourceTitle: 'Feed', author: 'Ada', excerpt: 'Saved excerpt.' },
    content: { text: 'Body text', metadata: { publisher: 'Example Journal', schemaType: 'Article' } },
    vocabulary: new Map([['ai-agents', 3], ['distribution', 1]]),
    taxonomy,
    humanTags: ['owner-tag'],
    basis: 'page',
  })
  assert.match(request.user, /ai-agents \(3\), distribution \(1\)/)
  assert.match(request.user, /Tags already chosen by the owner .*owner-tag/)
  assert.match(request.user, /Publisher: Example Journal/)
  assert.match(request.user, /software distribution/)
  assert.match(request.user, /"""\nBody text\n"""/)
  assert.equal(request.schema, outputSchema)
  assert.match(request.system, /Do not infer dates/)
  const thin = buildRequest({ link: { title: 'T', targetUrl: 'https://e.com' }, content: { metadata: {} }, vocabulary: new Map(), taxonomy, basis: 'excerpt' })
  assert.doesNotMatch(thin.user, /Extracted page text/)
  assert.match(thin.user, /could not be read in full/)
})

test('generation retries once with feedback when a description breaks the rules', async () => {
  const prompts = []
  const answers = [
    { sufficientContent: true, description: 'This article is a must-read.', tags: ['AI Agent'], contentType: 'article' },
    { sufficientContent: true, description: good, tags: ['AI Agent', 'distribution'], contentType: 'essay' },
  ]
  const provider = fakeProvider({ respond: async (request) => { prompts.push(request.user); return { output: answers.shift(), usage: { inputTokens: 10, outputTokens: 5 } } } })
  const result = await generateMetadata(provider, { system: 's', user: 'u', schema: outputSchema }, { tagOptions: { taxonomy } })
  assert.equal(prompts.length, 2)
  assert.match(prompts[1], /previous answer needs revision/)
  assert.equal(result.description, good)
  assert.deepEqual(result.tags, ['ai-agents', 'distribution'])
  assert.equal(result.contentType, 'essay')
  assert.deepEqual(result.usage, { inputTokens: 20, outputTokens: 10, calls: 2 })
})

test('an honest "not enough content" answer produces no description or tags', async () => {
  const provider = fakeProvider({ respond: async () => ({ output: { sufficientContent: false, description: 'Guess', tags: ['guess'], contentType: 'other' } }) })
  const result = await generateMetadata(provider, { system: 's', user: 'u', schema: outputSchema }, { tagOptions: { taxonomy } })
  assert.equal(result.sufficientContent, false)
  assert.equal(result.description, '')
  assert.deepEqual(result.tags, [])
})

test('malformed model output fails with a retryable per-Link error', async () => {
  const valid = { sufficientContent: true, description: good, tags: ['ai-agents'], contentType: 'article' }
  const malformed = [
    null, [], {}, 'plain text',
    ...Object.keys(valid).map((missing) => Object.fromEntries(Object.entries(valid).filter(([key]) => key !== missing))),
    { ...valid, sufficientContent: 'true' },
    { ...valid, description: 42 },
    { ...valid, tags: 'ai-agents' },
    { ...valid, tags: ['ai-agents', 42] },
    { ...valid, contentType: 'made-up-type' },
    { ...valid, unexpected: true },
  ]
  for (const output of malformed) {
    const provider = fakeProvider({ respond: async () => ({ output }) })
    await assert.rejects(
      generateMetadata(provider, { system: 's', user: 'u', schema: outputSchema }, { tagOptions: { taxonomy } }),
      (error) => error instanceof ProviderError && error.category === 'invalid-output' && error.retryable && !error.fatal,
      JSON.stringify(output),
    )
  }
})

test('model specs name a provider and a model, including models that contain colons', () => {
  assert.deepEqual(parseModelSpec('anthropic:claude-opus-5-5'), { provider: 'anthropic', model: 'claude-opus-5-5' })
  assert.deepEqual(parseModelSpec('ollama:llama3.1:8b'), { provider: 'ollama', model: 'llama3.1:8b' })
  assert.throws(() => parseModelSpec('claude-opus-5-5'), /<provider>:<model>/)
  assert.equal(resolveProvider('openai-compatible:some-model', { env: { LINK_ENRICH_BASE_URL: 'https://router.example/v1' } }).id, 'openai-compatible:some-model')
  assert.throws(() => resolveProvider('mystery:x'), /Unknown provider/)
})

test('the Anthropic adapter requests structured output, opts into fallback, and parses the reply', async () => {
  const calls = []
  const reply = { stop_reason: 'end_turn', model: 'claude-opus-5-5', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify({ sufficientContent: true, description: good, tags: ['a'], contentType: 'essay' }) }], usage: { input_tokens: 100, cache_read_input_tokens: 50, output_tokens: 20 } }
  const client = {
    messages: { create: async (params) => { calls.push(['plain', params]); return reply } },
    beta: { messages: { create: async (params) => { calls.push(['beta', params]); return reply } } },
  }
  const opus = anthropicProvider({ model: 'claude-opus-5-5', client })
  const result = await opus.generate({ system: 'sys', user: 'usr', schema: outputSchema })
  assert.equal(calls[0][0], 'beta')
  assert.deepEqual(calls[0][1].betas, ['server-side-fallback-2026-07-01'])
  assert.equal(calls[0][1].fallbacks, 'default')
  assert.deepEqual(calls[0][1].output_config, { format: { type: 'json_schema', schema: outputSchema }, effort: 'low' })
  assert.equal(calls[0][1].system, 'sys')
  assert.equal(result.output.description, good)
  assert.deepEqual(result.usage, { inputTokens: 150, outputTokens: 20 })

  await anthropicProvider({ model: 'claude-haiku-5-5', client }).generate({ system: 's', user: 'u', schema: outputSchema })
  assert.equal(calls[1][0], 'plain')
  assert.equal(calls[1][1].fallbacks, undefined)

  const refusing = anthropicProvider({ model: 'claude-haiku-5-5', client: { messages: { create: async () => ({ ...reply, stop_reason: 'refusal', stop_details: { category: 'cyber' } }) } } })
  await assert.rejects(refusing.generate({ system: 's', user: 'u', schema: outputSchema }), (error) => error instanceof ProviderError && error.category === 'refusal' && !error.fatal)
  const failing = anthropicProvider({ model: 'claude-haiku-5-5', client: { messages: { create: async () => { throw Object.assign(new Error('bad key'), { status: 401 }) } } } })
  await assert.rejects(failing.generate({ system: 's', user: 'u', schema: outputSchema }), (error) => error instanceof ProviderError && error.fatal)
})

test('the Chat Completions adapter sends a JSON-schema response format and stops on HTTP errors', async () => {
  const requests = []
  const provider = chatCompletionsProvider({
    id: 'openai-compatible:m',
    model: 'm',
    baseUrl: 'https://router.example/v1/',
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization })
      return Response.json({ model: 'm', choices: [{ message: { content: JSON.stringify({ sufficientContent: true, description: good, tags: [], contentType: 'article' }) }, finish_reason: 'stop' }], usage: { prompt_tokens: 9, completion_tokens: 3 } })
    },
  })
  const result = await provider.generate({ system: 's', user: 'u', schema: outputSchema })
  assert.equal(requests[0].url, 'https://router.example/v1/chat/completions')
  assert.equal(requests[0].body.response_format.type, 'json_schema')
  assert.equal(requests[0].auth, 'Bearer test-key')
  assert.equal(result.output.description, good)
  const failing = chatCompletionsProvider({ id: 'x:m', model: 'm', baseUrl: 'https://router.example/v1', fetchImpl: async () => Response.json({ error: { message: 'nope' } }, { status: 401 }) })
  await assert.rejects(failing.generate({ system: 's', user: 'u', schema: outputSchema }), (error) => error.fatal && /401/.test(error.message))
})

test('provider cache identities include generation settings without exposing endpoint credentials', () => {
  const low = anthropicProvider({ model: 'claude-opus-5-5', effort: 'low' })
  const high = anthropicProvider({ model: 'claude-opus-5-5', effort: 'high' })
  const short = anthropicProvider({ model: 'claude-opus-5-5', maxTokens: 1000 })
  assert.notEqual(low.getCacheIdentity(), high.getCacheIdentity())
  assert.notEqual(low.getCacheIdentity(), short.getCacheIdentity())
  assert.equal(low.getCacheIdentity(), anthropicProvider({ model: 'claude-opus-5-5' }).getCacheIdentity())
  const settings = { id: 'compatible:m', model: 'm', baseUrl: 'https://router.example/v1', apiKey: 'secret-key' }
  const first = chatCompletionsProvider(settings)
  const equivalent = chatCompletionsProvider({ ...settings, baseUrl: `${settings.baseUrl}/` })
  const second = chatCompletionsProvider({ ...settings, baseUrl: 'https://other.example/v1?token=private-value' })
  assert.equal(first.getCacheIdentity(), equivalent.getCacheIdentity())
  assert.notEqual(first.getCacheIdentity(), second.getCacheIdentity())
  assert.doesNotMatch(first.getCacheIdentity(), /secret-key|router\.example/)
  assert.doesNotMatch(second.getCacheIdentity(), /private-value|other\.example/)
})
