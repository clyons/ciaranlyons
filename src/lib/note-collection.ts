import type { NoteEntry } from './content'

export function mergeNoteSources(localNotes: NoteEntry[], remoteNotes: NoteEntry[]): NoteEntry[] {
  const seenIds = new Set<string>()
  const seenUris = new Set<string>()
  const merged: NoteEntry[] = []
  for (const note of [...localNotes, ...remoteNotes]) {
    if (seenIds.has(note.id) || (note.uri && seenUris.has(note.uri))) continue
    seenIds.add(note.id)
    if (note.uri) seenUris.add(note.uri)
    merged.push(note)
  }

  return merged.sort((a, b) => b.date.localeCompare(a.date))
}

export function limitNotes(notes: NoteEntry[], limit: number): NoteEntry[] {
  if (!Number.isInteger(limit) || limit < 0) throw new Error('Note limit must be a non-negative integer')
  return notes.slice(0, limit)
}
