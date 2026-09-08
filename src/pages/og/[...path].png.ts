import type { APIRoute, GetStaticPaths } from 'astro'
import { buildOgPng, type OgImageSpec } from '../../lib/og-image'
import { getOgImageSpecs } from '../../lib/og-specs'

export const getStaticPaths = (async () => {
  const specs = await getOgImageSpecs()
  return specs.map((spec) => ({ params: { path: spec.path }, props: { spec } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = async ({ props }) => {
  const { spec } = props as { spec: OgImageSpec }
  const png = await buildOgPng(spec)

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
