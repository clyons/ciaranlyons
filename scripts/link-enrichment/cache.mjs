// Local cache for fetched content and model responses. It lives under the gitignored
// `.context/` directory: third-party page text is never committed, and losing the cache only
// costs a refetch. Front-matter, not this cache, is the durable record of what happened.
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const defaultCacheDirectory = path.join('.context', 'link-enrichment')

function key(...parts) {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32)
}

async function writeJsonAtomically(destination, value) {
  await mkdir(path.dirname(destination), { recursive: true })
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    throw error
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

export function createCache(directory = defaultCacheDirectory, { disabled = false } = {}) {
  const contentFile = (url) => path.join(directory, 'content', `${key(url)}.json`)
  const generationFile = (parts) => path.join(directory, 'generations', `${key(...parts)}.json`)
  return {
    directory,
    async getContent(url, { maximumAgeDays } = {}) {
      if (disabled) return undefined
      const entry = await readJson(contentFile(url))
      if (!entry || entry.url !== url) return undefined
      if (maximumAgeDays !== undefined && Date.now() - Date.parse(entry.fetchedAt) > maximumAgeDays * 86_400_000) return undefined
      return entry
    },
    async putContent(url, result) {
      if (disabled) return
      await writeJsonAtomically(contentFile(url), { url, ...result })
    },
    // Keyed by everything that determines the prompt except the evolving vocabulary, so a
    // dry run followed by `--apply` pays for each generation once.
    async getGeneration(parts) {
      if (disabled) return undefined
      const entry = await readJson(generationFile(parts))
      return entry?.parts?.join('\u0000') === parts.join('\u0000') ? entry.result : undefined
    },
    async putGeneration(parts, result) {
      if (disabled) return
      await writeJsonAtomically(generationFile(parts), { parts, savedAt: new Date().toISOString(), result })
    },
  }
}
