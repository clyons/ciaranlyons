// The emergent folksonomy: tag normalisation, the usage-count vocabulary computed from the
// Link files themselves, reviewed aliases, and near-duplicate suggestions. Nothing here
// merges tags on its own; merges happen only through an explicit, reviewed command.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const defaultTaxonomyFile = path.join('content', 'link-tags.json')

// Tags that say nothing about the resource. They may still appear on a Link (Feedly's
// "Saved For Later" is on every import) but they are never proposed or counted as topical.
const genericTags = new Set([
  'article', 'articles', 'blog', 'blog-post', 'post', 'posts', 'link', 'links', 'news', 'web',
  'website', 'internet', 'online', 'misc', 'miscellaneous', 'other', 'general', 'interesting',
  'read-later', 'reading', 'saved', 'saved-for-later', 'toread', 'to-read', 'stuff', 'resources',
  'technology', 'tech', 'opinion', 'video', 'videos',
])

// Abbreviations that are worth flagging as possible synonyms. Suggestions only.
const knownExpansions = {
  ai: 'artificial-intelligence',
  ar: 'augmented-reality',
  cx: 'customer-experience',
  ev: 'electric-vehicles',
  evs: 'electric-vehicles',
  ia: 'information-architecture',
  llm: 'large-language-models',
  llms: 'large-language-models',
  ml: 'machine-learning',
  nlp: 'natural-language-processing',
  oss: 'open-source',
  pm: 'product-management',
  seo: 'search-engine-optimization',
  saas: 'software-as-a-service',
  ui: 'user-interface',
  ux: 'user-experience',
  vr: 'virtual-reality',
}

export function normalizeTag(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+\+/g, 'pp')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
}

export async function loadTaxonomy(file = defaultTaxonomyFile) {
  let raw
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyTaxonomy()
    throw new Error(`${file}: ${error instanceof Error ? error.message : 'invalid JSON'}`)
  }
  return validateTaxonomy(raw, file)
}

export function emptyTaxonomy() {
  return { ignored: [], aliases: {}, distinct: [], interests: [] }
}

export function validateTaxonomy(raw, source = 'taxonomy') {
  const taxonomy = { ...emptyTaxonomy(), ...raw }
  if (!Array.isArray(taxonomy.ignored) || !taxonomy.ignored.every((tag) => typeof tag === 'string')) throw new Error(`${source}: ignored must be an array of tags`)
  if (!taxonomy.aliases || typeof taxonomy.aliases !== 'object' || Array.isArray(taxonomy.aliases)) throw new Error(`${source}: aliases must map a tag to its preferred tag`)
  for (const [from, to] of Object.entries(taxonomy.aliases)) {
    if (normalizeTag(from) !== from || normalizeTag(to) !== to || !to) throw new Error(`${source}: alias ${from} -> ${to} must use normalised tags`)
    if (taxonomy.aliases[to]) throw new Error(`${source}: alias target ${to} is itself an alias; point ${from} at the final tag`)
  }
  if (!Array.isArray(taxonomy.distinct) || !taxonomy.distinct.every((pair) => Array.isArray(pair) && pair.length === 2)) throw new Error(`${source}: distinct must be a list of [tag, tag] pairs`)
  if (!Array.isArray(taxonomy.interests) || !taxonomy.interests.every((item) => typeof item === 'string')) throw new Error(`${source}: interests must be a list of strings`)
  return taxonomy
}

export function isIgnoredTag(tag, taxonomy) {
  const normalized = normalizeTag(tag)
  return genericTags.has(normalized) || taxonomy.ignored.some((ignored) => normalizeTag(ignored) === normalized)
}

export function canonicalTag(tag, taxonomy) {
  const normalized = normalizeTag(tag)
  return taxonomy.aliases[normalized] ?? normalized
}

// Usage counts of topical tags across all Links, case-insensitively folded to the
// normalised form. Ignored tags are excluded so they never shape new suggestions.
export function buildVocabulary(links, taxonomy) {
  const counts = new Map()
  for (const link of links) {
    for (const tag of new Set((link.tags ?? []).map(normalizeTag))) {
      if (!tag || isIgnoredTag(tag, taxonomy)) continue
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return counts
}

export function vocabularyEntries(counts, limit = Infinity) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}

export function addToVocabulary(counts, added = [], removed = []) {
  for (const tag of removed) {
    const next = (counts.get(tag) ?? 0) - 1
    if (next > 0) counts.set(tag, next)
    else counts.delete(tag)
  }
  for (const tag of added) counts.set(tag, (counts.get(tag) ?? 0) + 1)
}

function singular(tag) {
  return tag.split('-').map((part) => {
    if (part.length > 4 && part.endsWith('ies')) return `${part.slice(0, -3)}y`
    if (part.length > 4 && /(?:ches|shes|sses|xes)$/.test(part)) return part.slice(0, -2)
    if (part.length > 3 && part.endsWith('s') && !part.endsWith('ss') && !part.endsWith('us') && !part.endsWith('is')) return part.slice(0, -1)
    return part
  }).join('-')
}

function initials(tag) {
  const parts = tag.split('-').filter(Boolean)
  return parts.length > 1 ? parts.map((part) => part[0]).join('') : undefined
}

function editDistance(a, b, ceiling = 3) {
  if (Math.abs(a.length - b.length) > ceiling) return ceiling + 1
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]
}

function preferred(a, b, counts) {
  const countA = counts.get(a) ?? 0
  const countB = counts.get(b) ?? 0
  if (countA !== countB) return countA > countB ? [a, b] : [b, a]
  // Equal use: prefer the expanded or plural form, which reads better in a tag list.
  if (a.length !== b.length) return a.length > b.length ? [a, b] : [b, a]
  return a < b ? [a, b] : [b, a]
}

// Pairs of existing tags that may mean the same thing, with the suggested direction of a
// merge (`from` into `to`) and why. Pairs already reviewed as distinct are left out.
export function suggestDuplicateTags(counts, taxonomy = emptyTaxonomy()) {
  const tags = [...counts.keys()].sort()
  const distinct = new Set(taxonomy.distinct.map((pair) => pair.map(normalizeTag).sort().join('|')))
  const suggestions = []
  const seen = new Set()
  const consider = (a, b, reason) => {
    if (a === b) return
    const pairKey = [a, b].sort().join('|')
    if (seen.has(pairKey) || distinct.has(pairKey)) return
    seen.add(pairKey)
    const [to, from] = preferred(a, b, counts)
    suggestions.push({ from, to, reason, counts: { [from]: counts.get(from) ?? 0, [to]: counts.get(to) ?? 0 } })
  }
  const bySingular = new Map()
  const compact = new Map()
  for (const tag of tags) {
    const key = singular(tag)
    if (bySingular.has(key)) consider(bySingular.get(key), tag, 'singular/plural')
    else bySingular.set(key, tag)
    const joined = tag.replace(/-/g, '')
    if (compact.has(joined)) consider(compact.get(joined), tag, 'hyphenation')
    else compact.set(joined, tag)
  }
  for (const tag of tags) {
    const expansion = knownExpansions[tag]
    if (expansion && counts.has(expansion)) consider(tag, expansion, 'abbreviation')
    const tagInitials = initials(tag)
    if (tagInitials && tagInitials.length >= 2 && counts.has(tagInitials)) consider(tagInitials, tag, 'acronym')
  }
  for (let i = 0; i < tags.length; i += 1) {
    for (let j = i + 1; j < tags.length; j += 1) {
      const a = tags[i]
      const b = tags[j]
      if (Math.min(a.length, b.length) < 6) continue
      const limit = Math.min(a.length, b.length) >= 10 ? 2 : 1
      if (editDistance(a, b, limit) <= limit) consider(a, b, 'spelling')
    }
  }
  return suggestions.sort((x, y) => x.to.localeCompare(y.to) || x.from.localeCompare(y.from))
}

// Pre-existing aliases also count as reviewed consolidation targets for generation: a model
// proposing `ai-agent` is quietly given `ai-agents`.
export function aliasTargets(taxonomy) {
  return Object.entries(taxonomy.aliases).map(([from, to]) => ({ from, to }))
}
