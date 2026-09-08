const siteOrigin = 'https://ciaranlyons.com'

export function canonicalInternalUrl(href: string): string | undefined {
  try {
    const url = new URL(href, siteOrigin)
    if (url.hostname !== 'ciaranlyons.com') return undefined
    return `${url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
