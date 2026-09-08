import { getAllNotes } from './atproto'
import { getFoundQuotes, getTilEntries, getTilTopics, getWriting, noteTitle } from './content'
import { formatDate } from './dates'
import type { OgImageKind, OgImageSpec } from './og-image'

interface DatedEntry {
  year: string
  month: string
  day: string
}

function archiveSpecs(section: string, label: string, description: string, kind: OgImageKind, entries: DatedEntry[]): OgImageSpec[] {
  const specs: OgImageSpec[] = [{ path: section, kind, title: label, description, label }]
  const dates = new Set<string>()

  for (const entry of entries) {
    dates.add(entry.year)
    dates.add(`${entry.year}/${entry.month}`)
    dates.add(`${entry.year}/${entry.month}/${entry.day}`)
  }

  for (const date of dates) {
    const [year, month, day] = date.split('/')
    const value = day
      ? formatDate(`${year}-${month}-${day}`, { month: 'long', day: 'numeric', year: 'numeric' })
      : month
        ? formatDate(`${year}-${month}-01`, { month: 'long', year: 'numeric' })
        : year
    specs.push({
      path: `${section}/${date}`,
      kind,
      label,
      title: value,
      description: `${label} from ${value}.`,
    })
  }

  return specs
}

export async function getOgImageSpecs(): Promise<OgImageSpec[]> {
  const [writing, notes, tilEntries, quotes] = await Promise.all([
    getWriting(),
    getAllNotes(),
    getTilEntries(),
    getFoundQuotes(),
  ])

  const specs: OgImageSpec[] = [
    {
      path: 'home',
      kind: 'home',
      title: 'I build things that last and grow.',
    },
    {
      path: 'about',
      kind: 'page',
      label: 'About',
      title: 'About Ciaran',
      description: 'Operator, builder, and student of systems that compound.',
    },
    {
      path: 'projects',
      kind: 'page',
      label: 'Projects',
      title: 'Work, tools, and small systems worth keeping around.',
    },
    {
      path: 'search',
      kind: 'page',
      label: 'Search',
      title: 'Search CiaranLyons.com',
      description: 'Writing, notes, projects, TIL entries, and Found Quotes.',
    },
    {
      path: 'found-quotes/style-study',
      kind: 'quote',
      title: 'Found Quotes type study',
      description: 'Display and reading treatments for short and long quotations.',
    },
    ...archiveSpecs('writing', 'Writing', 'Longer pieces on work, systems, and ownership.', 'writing', writing),
    ...archiveSpecs('notes', 'Notes', 'Short notes and observations.', 'note', notes),
    ...archiveSpecs('til', 'TIL', 'I’m writing it down to remember it now.', 'til', tilEntries),
    ...archiveSpecs('found-quotes', 'Found Quotes', 'Things that smarter folks than I have said.', 'quote', quotes),
  ]

  for (const entry of writing) {
    specs.push({
      path: entry.url.replace(/^\/+|\/+$/g, ''),
      kind: 'writing',
      label: 'Writing',
      title: entry.title,
      description: entry.description,
      meta: formatDate(entry.date, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
    })
  }

  for (const note of notes) {
    specs.push({
      path: note.url.replace(/^\/+|\/+$/g, ''),
      kind: 'note',
      title: noteTitle(note),
      meta: formatDate(note.date, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
    })
  }

  for (const entry of tilEntries) {
    specs.push({
      path: entry.url.replace(/^\/+|\/+$/g, ''),
      kind: 'til',
      label: entry.topic,
      title: entry.title,
      description: entry.description,
      meta: formatDate(entry.date, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
    })
  }

  for (const topic of getTilTopics(tilEntries)) {
    specs.push({
      path: `til/${topic.topic}`,
      kind: 'til',
      label: 'TIL Topic',
      title: topic.topic,
      description: `${topic.count} practical ${topic.count === 1 ? 'note' : 'notes'} about ${topic.topic}.`,
    })
  }

  for (const quote of quotes) {
    specs.push({
      path: quote.url.replace(/^\/+|\/+$/g, ''),
      kind: 'quote',
      title: quote.text,
      description: `— ${quote.attribution}, ${quote.source}`,
    })
  }

  const unique = new Map<string, OgImageSpec>()
  for (const spec of specs) unique.set(spec.path, spec)
  return [...unique.values()]
}
