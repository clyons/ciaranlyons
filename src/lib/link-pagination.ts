export const LINKS_PER_PAGE = 50

export interface LinkPage<T> {
  items: T[]
  page: number
  totalItems: number
  totalPages: number
}

export function linkPageCount(totalItems: number, pageSize = LINKS_PER_PAGE): number {
  if (!Number.isInteger(totalItems) || totalItems < 0) throw new Error('totalItems must be a non-negative integer')
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive integer')
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function paginateLinks<T>(items: readonly T[], page: number, pageSize = LINKS_PER_PAGE): LinkPage<T> {
  const totalPages = linkPageCount(items.length, pageSize)
  if (!Number.isInteger(page) || page < 1 || page > totalPages) throw new Error(`page must be between 1 and ${totalPages}`)
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page, totalItems: items.length, totalPages }
}

export function linkArchivePageUrl(basePath: string, page: number): string {
  if (!Number.isInteger(page) || page < 1) throw new Error('page must be a positive integer')
  const normalized = `/${basePath.replace(/^\/+|\/+$/g, '')}/`
  return page === 1 ? normalized : `${normalized}page/${page}/`
}

export function extraLinkPageNumbers(totalItems: number, pageSize = LINKS_PER_PAGE): number[] {
  return Array.from({ length: Math.max(0, linkPageCount(totalItems, pageSize) - 1) }, (_, index) => index + 2)
}
