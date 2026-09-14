import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { buildOgPng, buildOgSvg, ogImagePath, wrapText } from './og-image.ts'

test('ogImagePath maps canonical paths to static PNG routes', () => {
  assert.equal(ogImagePath('/'), '/og/home.png')
  assert.equal(ogImagePath('/writing/2026/08/08/on-ownership/'), '/og/writing/2026/08/08/on-ownership.png')
})

test('Link routes can share the bounded collection social image', () => {
  assert.equal(ogImagePath('/links/'), '/og/links.png')
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

test('Dragon TIL text stays clear of the accent sidebar', async () => {
  const spec = {
    path: 'til/2026/09/13/teaching-a-printed-dragon-to-fly',
    kind: 'til',
    title: 'Teaching a printed dragon to fly',
    description: 'A 3D print becomes a Three.js flight playground, with Box3D joints and a little help from GPT-6 Astra.',
  }
  const svg = buildOgSvg(spec)
  const title = [...svg.matchAll(/class="serif title">([^<]+)<\/text>/g)].map(match => match[1]).join(' ')
  assert.equal(title, spec.title, 'The full title remains visible without truncation')
  const png = await buildOgPng(spec)
  const { data, info } = await sharp(png).extract({ left: 940, top: 150, width: 260, height: 380 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let darkPixels = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60) darkPixels++
  }
  assert.equal(darkPixels, 0, 'Black title/description pixels must not enter the orange sidebar')
})

test('Dragon announcement title stays within the Note card margin', async () => {
  const spec = {
    path: 'notes/2026/09/14/3mvh3jefg3jbu',
    kind: 'note',
    title: 'New TIL: Teaching a printed dragon to fly',
  }
  const svg = buildOgSvg(spec)
  const title = [...svg.matchAll(/class="serif title light-title">([^<]+)<\/text>/g)].map(match => match[1]).join(' ')
  assert.equal(title, spec.title)
  const png = await buildOgPng(spec)
  const { data, info } = await sharp(png).extract({ left: 1128, top: 150, width: 72, height: 330 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let lightPixels = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) lightPixels++
  }
  assert.equal(lightPixels, 0, 'Title pixels must not enter the right margin')
})
