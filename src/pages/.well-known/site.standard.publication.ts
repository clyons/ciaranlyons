import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const uri = import.meta.env.STANDARD_SITE_PUBLICATION_AT_URI
  if (!uri) {
    return new Response('STANDARD_SITE_PUBLICATION_AT_URI is not configured.\n', { status: 404 })
  }

  return new Response(`${uri}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
