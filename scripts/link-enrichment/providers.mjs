// Model adapters. Each provider takes { system, user, schema, slug } and returns
// { output, usage, servedModel }. Choosing a provider is configuration, not code: set
// LINK_ENRICH_MODEL (or pass --model) to `<provider>:<model>`.
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ProviderError } from './generate.mjs'

export const defaultModelSpec = 'openai:gpt-6-astra'

// Approximate first-party prices in US dollars per million tokens, for the cost line in run
// summaries only. Check current pricing before budgeting a large run.
const anthropicPrices = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
}

export function parseModelSpec(spec) {
  const value = String(spec ?? '').trim()
  const separator = value.indexOf(':')
  if (separator <= 0 || separator === value.length - 1) throw new Error(`Model must look like <provider>:<model>, for example ${defaultModelSpec}; got "${value}"`)
  return { provider: value.slice(0, separator), model: value.slice(separator + 1) }
}

function parseJsonText(text, label) {
  const trimmed = String(text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new ProviderError(`${label} returned text that is not valid JSON`, { category: 'invalid-output', retryable: true })
  }
}

// Keep endpoint configuration and reviewed responses out of persisted cache key parts.
function cacheIdentity(settings) {
  return createHash('sha256').update(JSON.stringify(settings)).digest('hex')
}

// Server-side refusal fallback is available for these Anthropic models; the request opts in
// so a misplaced safety decline on an innocuous page is retried on Anthropic's recommended
// fallback model instead of failing the Link.
const serverFallbackModels = /^claude-(?:opus-5-5|opus-5|sonnet-5-5|fable-5-[12]|mythos-5-[12])$/
// Older models reject the effort parameter.
const effortUnsupported = /^claude-(?:haiku-4|sonnet-4-5|opus-4-[015]|3)/

export function anthropicProvider({ model, effort = 'low', maxTokens = 16_000, client } = {}) {
  let sdkPromise
  const loadSdk = () => (sdkPromise ??= import('@anthropic-ai/sdk').then((module) => module.default))
  let clientInstance = client

  const mapError = (error, Anthropic) => {
    if (error instanceof ProviderError) return error
    const status = typeof error?.status === 'number' ? error.status : undefined
    const label = Anthropic && error instanceof Anthropic.AuthenticationError ? 'Anthropic authentication failed; check ANTHROPIC_API_KEY'
      : Anthropic && error instanceof Anthropic.PermissionDeniedError ? 'Anthropic denied this request for the configured key'
        : Anthropic && error instanceof Anthropic.NotFoundError ? `Anthropic does not recognise model ${model}`
          : Anthropic && error instanceof Anthropic.RateLimitError ? 'Anthropic rate limit reached; rerun later and the batch resumes where it stopped'
            : Anthropic && error instanceof Anthropic.BadRequestError ? `Anthropic rejected the request: ${error.message}`
              : Anthropic && error instanceof Anthropic.APIConnectionError ? 'Could not reach the Anthropic API'
                : `Anthropic API error${status ? ` ${status}` : ''}: ${error?.message ?? 'unknown'}`
    // Every API-level failure stops the run: it is about the provider, not about one Link.
    return new ProviderError(label, { fatal: true, category: 'provider-error', cause: error })
  }

  return {
    id: `anthropic:${model}`,
    getCacheIdentity: () => cacheIdentity({ provider: 'anthropic', model, effort: !effortUnsupported.test(model) && effort !== 'none' ? effort : undefined, maxTokens, baseUrl: process.env.ANTHROPIC_BASE_URL }),
    prices: anthropicPrices[model],
    async generate({ system, user, schema }) {
      const Anthropic = client ? undefined : await loadSdk()
      try {
        clientInstance ??= new Anthropic()
      } catch (error) {
        throw new ProviderError('No Anthropic credentials found: set ANTHROPIC_API_KEY, or sign in with `ant auth login`', { fatal: true, cause: error })
      }
      const outputConfig = { format: { type: 'json_schema', schema } }
      if (effort && effort !== 'none' && !effortUnsupported.test(model)) outputConfig.effort = effort
      const params = {
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: outputConfig,
      }
      let response
      try {
        response = serverFallbackModels.test(model)
          ? await clientInstance.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
          : await clientInstance.messages.create(params)
      } catch (error) {
        throw mapError(error, Anthropic)
      }
      if (response.stop_reason === 'refusal') {
        throw new ProviderError(`Model declined this page${response.stop_details?.category ? ` (${response.stop_details.category})` : ''}`, { category: 'refusal' })
      }
      if (response.stop_reason === 'max_tokens') throw new ProviderError('Model output was cut off at max_tokens', { category: 'truncated', retryable: true })
      const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('')
      const usage = response.usage ?? {}
      return {
        output: parseJsonText(text, 'Anthropic'),
        servedModel: response.model,
        usage: {
          inputTokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
          outputTokens: usage.output_tokens ?? 0,
        },
      }
    },
  }
}

export function openaiProvider({ model, baseUrl = 'https://api.openai.com/v1', apiKey, effort, maxTokens = 16_000, fetchImpl = fetch, timeoutMs = 120_000 }) {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/responses`
  return {
    id: `openai:${model}`,
    getCacheIdentity: () => cacheIdentity({ provider: 'openai-responses', model, endpoint, effort, maxTokens }),
    async generate({ system, user, schema }) {
      let response
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
          body: JSON.stringify({
            model,
            instructions: system,
            input: user,
            store: false,
            max_output_tokens: maxTokens,
            ...(effort ? { reasoning: { effort } } : {}),
            text: { format: { type: 'json_schema', name: 'link_metadata', strict: true, schema } },
          }),
        })
      } catch (error) {
        throw new ProviderError(`Could not reach ${new URL(endpoint).host}`, { fatal: true, cause: error })
      }
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.status === 'failed' || body.error) {
        const message = typeof body.error?.message === 'string' ? body.error.message : ''
        const detail = apiKey ? message.split(apiKey).join('[redacted]') : message
        throw new ProviderError(`OpenAI request failed (${response.status})${detail ? `: ${detail}` : ''}`, { fatal: true })
      }
      const content = (Array.isArray(body.output) ? body.output : []).flatMap((item) => item.type === 'message' && Array.isArray(item.content) ? item.content : [])
      if (content.some((item) => item.type === 'refusal')) throw new ProviderError('OpenAI declined this page', { category: 'refusal' })
      if (body.status === 'incomplete' && body.incomplete_details?.reason === 'max_output_tokens') {
        throw new ProviderError('OpenAI output was cut off at max_output_tokens', { category: 'truncated', retryable: true })
      }
      if (body.status !== 'completed') throw new ProviderError('OpenAI returned an unfinished response', { category: 'invalid-output', retryable: true })
      const text = content.filter((item) => item.type === 'output_text').map((item) => item.text).join('')
      return {
        output: parseJsonText(text, 'OpenAI'),
        servedModel: body.model,
        usage: { inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 },
      }
    },
  }
}

// Servers that speak Chat Completions, including OpenRouter, Ollama, LM Studio, and vLLM.
export function chatCompletionsProvider({ id, model, baseUrl, apiKey, fetchImpl = fetch, timeoutMs = 120_000 }) {
  if (!baseUrl) throw new Error(`${id} needs a base URL; set LINK_ENRICH_BASE_URL`)
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  return {
    id,
    getCacheIdentity: () => cacheIdentity({ id, model, endpoint }),
    async generate({ system, user, schema }) {
      let response
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            response_format: { type: 'json_schema', json_schema: { name: 'link_metadata', strict: true, schema } },
          }),
        })
      } catch (error) {
        throw new ProviderError(`Could not reach ${new URL(endpoint).host}`, { fatal: true, cause: error })
      }
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = body?.error?.message ? `: ${body.error.message}` : ''
        throw new ProviderError(`${id} request failed (${response.status})${detail}`, { fatal: true })
      }
      const message = body?.choices?.[0]?.message
      if (message?.refusal) throw new ProviderError(`Model declined this page: ${message.refusal}`, { category: 'refusal' })
      if (body?.choices?.[0]?.finish_reason === 'length') throw new ProviderError('Model output was cut off', { category: 'truncated', retryable: true })
      return {
        output: parseJsonText(message?.content, id),
        servedModel: body?.model,
        usage: { inputTokens: body?.usage?.prompt_tokens ?? 0, outputTokens: body?.usage?.completion_tokens ?? 0 },
      }
    },
  }
}

// Reads reviewed responses from a JSON file keyed by Link slug, for metadata produced
// outside this process (another tool, a batch job, or a person). Pairs with
// `--export-requests`, which writes the matching prompts.
export function fileProvider({ file }) {
  const resolvedFile = path.resolve(file)
  let snapshot
  const load = () => (snapshot ??= readFile(resolvedFile, 'utf8').then((contents) => ({
    responses: JSON.parse(contents),
    identity: cacheIdentity({ provider: 'file', file: resolvedFile, contents }),
  })))
  return {
    id: `file:${path.basename(file)}`,
    getCacheIdentity: async () => (await load()).identity,
    async generate({ slug }) {
      const { responses } = await load()
      const entry = responses?.[slug]
      if (!entry) throw new ProviderError(`No response for ${slug} in ${file}`, { category: 'no-response', retryable: true })
      return { output: entry, servedModel: undefined, usage: {} }
    },
  }
}

// Deterministic stand-in for tests and offline smoke runs. It never writes to the real
// collection unless --allow-fake is passed, so a configuration slip cannot publish filler.
export function fakeProvider({ respond } = {}) {
  return {
    id: 'fake:deterministic',
    fake: true,
    async generate(request) {
      if (respond) return respond(request)
      const title = /\nTitle: (.*)\n/.exec(request.user)?.[1] ?? 'the saved page'
      const hasText = /Extracted page text/.test(request.user)
      return {
        output: {
          sufficientContent: hasText,
          description: hasText ? `Deterministic fixture summary of ${title.replace(/[.!?]+$/, '')} used to exercise the enrichment pipeline without calling a model.` : '',
          tags: hasText ? ['pipeline-fixture', 'offline-testing'] : [],
          contentType: 'article',
        },
        servedModel: 'fake',
        usage: { inputTokens: Math.ceil(request.user.length / 4), outputTokens: 40 },
      }
    },
  }
}

export function resolveProvider(spec = defaultModelSpec, { env = process.env, effort, fetchImpl } = {}) {
  const { provider, model } = parseModelSpec(spec)
  if (provider === 'anthropic') return anthropicProvider({ model, effort: effort ?? env.LINK_ENRICH_EFFORT ?? 'low' })
  if (provider === 'openai') {
    const baseUrl = env.LINK_ENRICH_BASE_URL || env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    // Conductor supplies a session credential for its own proxy, never for another host.
    const apiKey = env.OPENAI_API_KEY || (new URL(baseUrl).origin === 'https://api.conductor.build' ? env.CONDUCTOR_INTERNAL_CODEX_CHATGPT_PROXY_TOKEN : undefined)
    return openaiProvider({ model, baseUrl, apiKey, effort: effort ?? env.LINK_ENRICH_EFFORT ?? (model === 'gpt-6-astra' ? 'low' : undefined), fetchImpl })
  }
  if (provider === 'ollama') return chatCompletionsProvider({ id: `ollama:${model}`, model, baseUrl: env.LINK_ENRICH_BASE_URL || 'http://localhost:11434/v1', apiKey: undefined })
  if (provider === 'openai-compatible') return chatCompletionsProvider({ id: `openai-compatible:${model}`, model, baseUrl: env.LINK_ENRICH_BASE_URL, apiKey: env.LINK_ENRICH_API_KEY })
  if (provider === 'file') return fileProvider({ file: model })
  if (provider === 'fake') return fakeProvider()
  throw new Error(`Unknown provider "${provider}"; use anthropic, openai, ollama, openai-compatible, file, or fake`)
}

export function estimateCost(provider, usage) {
  if (!provider.prices) return undefined
  const [input, output] = provider.prices
  return (usage.inputTokens * input + usage.outputTokens * output) / 1_000_000
}
