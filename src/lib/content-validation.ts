const safeSegmentPattern = /^[A-Za-z0-9](?:[A-Za-z0-9._~-]*[A-Za-z0-9])?$/

export function requiredString(value: unknown, source: string, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${source}: ${field} must be a non-empty string`)
  }
  return value.trim()
}

export function validateDate(value: unknown, source: string, field = 'date'): string {
  const raw = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : typeof value === 'string'
      ? value.trim()
      : ''
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
  if (!match || (raw.length > 10 && !Number.isFinite(Date.parse(raw)))) {
    throw new Error(`${source}: ${field} must be a valid YYYY-MM-DD date or RFC 3339 timestamp`)
  }
  const dateOnly = `${match[1]}-${match[2]}-${match[3]}`
  if (new Date(`${dateOnly}T00:00:00.000Z`).toISOString().slice(0, 10) !== dateOnly) {
    throw new Error(`${source}: ${field} is not a real calendar date`)
  }
  return raw
}

export function validateTimestamp(value: unknown, source: string, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${source}: ${field} must be a valid RFC 3339 timestamp`)
  }
  try {
    validateDate(value.slice(0, 10), source, field)
  } catch {
    throw new Error(`${source}: ${field} must be a valid RFC 3339 timestamp`)
  }
  return value
}

export function validateSegment(value: string, source: string, field: string): string {
  if (!safeSegmentPattern.test(value) || value === '.' || value === '..') {
    throw new Error(`${source}: ${field} contains characters that are unsafe in a URL path`)
  }
  return value
}

export function validateTopic(value: string, source: string): string {
  const topic = validateSegment(value, source, 'topic')
  if (/^\d{4}$/.test(topic)) throw new Error(`${source}: four-digit topic names are reserved for date archives`)
  return topic
}

export function optionalHttpUrl(value: unknown, source: string, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new Error(`${source}: ${field} must be an HTTP(S) URL`)
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('unsupported protocol')
    return parsed.toString()
  } catch {
    throw new Error(`${source}: ${field} must be an HTTP(S) URL`)
  }
}

export function optionalUniqueSubstring(value: unknown, text: string, source: string, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const substring = requiredString(value, source, field)
  const occurrences = text.split(substring).length - 1
  if (occurrences !== 1) {
    throw new Error(`${source}: ${field} must occur exactly once in the quote body`)
  }
  return substring
}

export function webUrl(value: unknown, source: string, field: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${source}: ${field} must be a site path or HTTP(S) URL`)
  if (value.startsWith('/') && !value.startsWith('//')) return value
  return optionalHttpUrl(value, source, field) as string
}

export function assertUnique<T>(items: T[], key: (item: T) => string, describe: (item: T) => string): void {
  const seen = new Map<string, T>()
  for (const item of items) {
    const identity = key(item)
    const previous = seen.get(identity)
    if (previous) throw new Error(`Duplicate content identity ${identity}: ${describe(previous)} and ${describe(item)}`)
    seen.set(identity, item)
  }
}
