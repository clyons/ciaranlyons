import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { buildOgPng, buildOgSvg, ogImagePath, wrapText } from './og-image.ts'

test('ogImagePath maps canonical paths to static PNG routes', () => {
  assert.equal(ogImagePath('/'), '/og/home.png')
  assert.equal(ogImagePath('/writing/2026/08/08/on-ownership/'), '/og/writing/2026/08/08/on-ownership.png')
})

test('wrapText clamps long copy and adds an ellipsis', () => {
  const lines = wrapText('one two three four five six seven eight nine ten eleven twelve', 150, 30, 2)
  assert.equal(lines.length, 2)
  assert.match(lines[1], /…$/)
})

test('OG SVG escapes content and renders as a 1200 by 630 PNG', async () => {
  const spec = {
    path: 'writing/example',
    kind: 'writing',
    title: 'Systems & <stewardship>',
    description: 'Own the outcome, not the “method”.',
  }
  const svg = buildOgSvg(spec)
  assert.match(svg, /Systems &amp; &lt;stewardship&gt;/)
  assert.doesNotMatch(svg, /Systems & <stewardship>/)

  const png = await buildOgPng(spec)
  const metadata = await sharp(png).metadata()
  assert.equal(metadata.format, 'png')
  assert.equal(metadata.width, 1200)
  assert.equal(metadata.height, 630)
})
