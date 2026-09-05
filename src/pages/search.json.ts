import type { APIRoute } from 'astro'
import { getSearchItems } from '../lib/search'

export const GET: APIRoute = async () => {
  const items = await getSearchItems()
  return new Response(JSON.stringify(items), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
