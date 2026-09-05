export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const normalized = value.length === 10 ? `${value}T00:00:00Z` : value
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    ...options,
  }).format(new Date(normalized))
}
