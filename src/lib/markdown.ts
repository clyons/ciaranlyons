import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

marked.setOptions({
  gfm: true,
  breaks: false,
})

export function renderMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown, { async: false }) as string
  return sanitizeHtml(rendered, {
    allowedTags: [
      'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
      'h5', 'h6', 'hr', 'img', 'li', 'ol', 'p', 'pre', 'strong', 'table',
      'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'video',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      code: ['class'],
      img: ['src', 'alt', 'title'],
      video: ['src', 'poster', 'controls', 'playsinline', 'preload', 'width', 'height', 'aria-label'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  })
}
