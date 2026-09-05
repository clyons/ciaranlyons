import { getNotes } from './atproto'
import { getProjects, getTilEntries, getWriting, noteTitle } from './content'

export interface SearchItem {
  type: 'Writing' | 'Note' | 'Project' | 'TIL'
  title: string
  description: string
  url: string
  date?: string
}

export async function getSearchItems(): Promise<SearchItem[]> {
  const [writing, notes, projects, til] = await Promise.all([
    getWriting(),
    getNotes(50),
    getProjects(),
    getTilEntries(),
  ])

  return [
    ...writing.map((item) => ({
      type: 'Writing' as const,
      title: item.title,
      description: item.description,
      url: item.url,
      date: item.date,
    })),
    ...notes.map((item) => ({
      type: 'Note' as const,
      title: noteTitle(item),
      description: item.text,
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
      url: item.url,
      date: item.date,
    })),
  ]
}
