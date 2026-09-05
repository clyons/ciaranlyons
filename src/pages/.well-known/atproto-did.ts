import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const did = import.meta.env.ATPROTO_DID
  if (!did) {
    return new Response('ATPROTO_DID is not configured.\n', { status: 404 })
  }

  return new Response(`${did}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
