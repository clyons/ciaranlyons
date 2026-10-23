import { renderRichText, type RichTextFacet } from './rich-text.ts'

const standaloneUrl = /^(?:https?:\/\/)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?:\/\S*)?$/iu

/** Render original byte offsets before doing any presentation-only shortening. */
export function noteParagraphs(text: string, facets: RichTextFacet[] = [], compact = false): string[] {
  const paragraphs = renderRichText(text, facets)
    .split(/(?:<br \/>[\t ]*){2,}/)
    .filter((html) => html.replace(/<[^>]+>/g, '').trim())
  if (compact && paragraphs.length > 1) {
    const last = paragraphs.at(-1)!.replace(/<[^>]+>/g, '').trim()
    if (standaloneUrl.test(last)) paragraphs.pop()
  }
  return paragraphs
}
