import { getAllNotes } from './atproto'
import { getLinks, getProjects, getTilEntries, getWriting, noteTitle } from './content'

export interface SearchItem {
  type: 'Writing' | 'Note' | 'Link' | 'Project' | 'TIL'
  title: string
  description: string
  content?: string
  url: string
  date?: string
}

export async function getSearchItems(): Promise<SearchItem[]> {
  const [writing, notes, links, projects, til] = await Promise.all([
    getWriting(),
    getAllNotes(),
    getLinks(),
    getProjects(),
    getTilEntries(),
  ])

  return [
    ...writing.map((item) => ({
      type: 'Writing' as const,
      title: item.title,
      description: item.description,
      content: item.body,
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
    ...links.map((item) => ({
      type: 'Link' as const,
      title: item.title,
      description: item.description,
      content: [item.sourceTitle, item.author, item.tags.join(' '), new URL(item.targetUrl).hostname, item.body].filter(Boolean).join(' '),
      url: item.url,
      date: item.savedAt ?? item.date,
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
  ]
}
