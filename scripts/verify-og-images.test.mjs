import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { verifyOgImages } from './verify-og-images.mjs'

async function fixtureDist(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ciaran-og-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'writing', 'example'), { recursive: true })
  await mkdir(path.join(root, 'og', 'writing'), { recursive: true })
  return root
}

function pageHtml(ogImage, twitterImage = ogImage) {
  return `<!doctype html><meta property="og:image" content="${ogImage}"><meta name="twitter:image" content="${twitterImage}">`
}

test('verifies generated social preview targets and dimensions', async (t) => {
  const root = await fixtureDist(t)
  const imageUrl = 'https://ciaranlyons.com/og/writing/example.png'
  await writeFile(path.join(root, 'writing', 'example', 'index.html'), pageHtml(imageUrl))
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#f8f7f4' } })
    .png()
    .toFile(path.join(root, 'og', 'writing', 'example.png'))

  const result = await verifyOgImages(root)
  assert.equal(result.images, 1)
})

test('rejects missing and mismatched social preview targets', async (t) => {
  const root = await fixtureDist(t)
  await writeFile(
    path.join(root, 'writing', 'example', 'index.html'),
    pageHtml('https://ciaranlyons.com/og/writing/missing.png', 'https://ciaranlyons.com/og/writing/other.png'),
  )

  await assert.rejects(() => verifyOgImages(root), /twitter:image does not match og:image/)
})
