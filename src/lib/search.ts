import { getAllNotes } from './atproto'
import { foundQuoteTitle, getFoundQuotes, getProjects, getTilEntries, getWriting, noteTitle, resolveFoundQuotes } from './content'

export interface SearchItem {
  type: 'Writing' | 'Note' | 'Project' | 'TIL' | 'Found Quote'
  title: string
  description: string
  content?: string
  url: string
  date?: string
}

export async function getSearchItems(): Promise<SearchItem[]> {
  const [writing, notes, projects, til, foundQuotes] = await Promise.all([
    getWriting(),
    getAllNotes(),
    getProjects(),
    getTilEntries(),
    getFoundQuotes(),
  ])

  return [
    ...writing.map((item) => ({
      type: 'Writing' as const,
      title: item.title,
      description: item.description,
      content: [
        item.body,
        ...resolveFoundQuotes(item.foundQuoteSlugs, foundQuotes, `content/writing/${item.slug}.md`)
          .map((quote) => `${quote.text} ${quote.attribution} ${quote.source}`),
      ].join(' '),
      url: item.url,
      date: item.date,
    })),
    ...notes.map((item) => ({
      type: 'Note' as const,
      title: noteTitle(item),
      description: item.text,
      content: item.text,
      url: item.url,
      date: item.date,
    })),
    ...projects.map((item) => ({
      type: 'Project' as const,
      title: item.title,
      description: item.description,
      url: item.url,
    })),
    ...til.map((item) => ({
      type: 'TIL' as const,
      title: item.title,
      description: item.description,
      content: item.body,
      url: item.url,
      date: item.date,
    })),
    ...foundQuotes.map((quote) => ({
      type: 'Found Quote' as const,
      title: foundQuoteTitle(quote),
      description: `${quote.attribution} — ${quote.source}`,
      content: `${quote.text} ${quote.attribution} ${quote.source} ${quote.via ?? ''} ${quote.tags.join(' ')}`,
      url: quote.url,
      date: quote.date,
    })),
  ]
}
