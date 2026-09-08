import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import sharp from 'sharp'

function metaContent(html, attribute, value) {
  const tag = html.match(new RegExp(`<meta[^>]+${attribute}="${value}"[^>]*>`, 'i'))?.[0]
  return tag?.match(/content="([^"]+)"/i)?.[1]
}

export async function verifyOgImages(distRoot = path.resolve('dist')) {
  const htmlFiles = await fg('**/*.html', { cwd: distRoot, absolute: true })
  const imageUrls = new Set()
  const errors = []

  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8')
    const ogImage = metaContent(html, 'property', 'og:image')
    if (!ogImage) continue

    const twitterImage = metaContent(html, 'name', 'twitter:image')
    const page = `/${path.relative(distRoot, htmlFile).replace(/\/index\.html$/, '/')}`

    if (twitterImage !== ogImage) {
      errors.push(`${page}: twitter:image does not match og:image`)
      continue
    }

    let imageUrl
    try {
      imageUrl = new URL(ogImage)
    } catch {
      errors.push(`${page}: og:image is not an absolute URL`)
      continue
    }

    if (imageUrl.hostname !== 'ciaranlyons.com' || !imageUrl.pathname.startsWith('/og/') || !imageUrl.pathname.endsWith('.png')) {
      errors.push(`${page}: og:image must use a generated ciaranlyons.com /og/*.png URL`)
      continue
    }

    imageUrls.add(imageUrl.pathname)
  }

  for (const imagePath of imageUrls) {
    const localPath = path.join(distRoot, imagePath.slice(1))
    try {
      await access(localPath)
      const metadata = await sharp(localPath).metadata()
      if (metadata.format !== 'png' || metadata.width !== 1200 || metadata.height !== 630) {
        errors.push(`${imagePath}: expected a 1200x630 PNG, got ${metadata.width}x${metadata.height} ${metadata.format ?? 'unknown format'}`)
      }
    } catch (error) {
      errors.push(`${imagePath}: ${error instanceof Error ? error.message : 'image is unavailable'}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Social preview verification failed:\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }

  return { pages: htmlFiles.length, images: imageUrls.size }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  verifyOgImages()
    .then(({ images }) => console.log(`Verified ${images} page-specific social preview images.`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
