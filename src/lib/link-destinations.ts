import { validateTimestamp } from './content-validation.ts'

export const linkDestinationStatuses = [
  'verified',
  'broken',
  'unavailable',
  'semantic-mismatch',
  'access-restricted',
] as const

export type LinkDestinationStatus = typeof linkDestinationStatuses[number]

export function destinationAuditMetadata(
  statusValue: unknown,
  checkedAtValue: unknown,
  source: string,
): { destinationStatus?: LinkDestinationStatus; destinationLastCheckedAt?: string } {
  if (statusValue === undefined && checkedAtValue === undefined) return {}
  if (!linkDestinationStatuses.includes(statusValue as LinkDestinationStatus)) {
    throw new Error(`${source}: destinationStatus must be ${linkDestinationStatuses.join(', ')}`)
  }
  if (checkedAtValue === undefined) {
    throw new Error(`${source}: destinationLastCheckedAt is required when destinationStatus is present`)
  }
  if (typeof checkedAtValue !== 'string') {
    throw new Error(`${source}: destinationLastCheckedAt must be an RFC 3339 timestamp`)
  }
  return {
    destinationStatus: statusValue as LinkDestinationStatus,
    destinationLastCheckedAt: validateTimestamp(checkedAtValue, source, 'destinationLastCheckedAt'),
  }
}

export function destinationLinkRel(status?: LinkDestinationStatus): string {
  return status === 'verified' ? 'external' : 'external nofollow'
}
