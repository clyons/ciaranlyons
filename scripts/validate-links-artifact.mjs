import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'

const artifactRoot = path.join(process.cwd(), 'dist')
const cloudflareAssetLimit = 25 * 1024 * 1024
const escalationFileCount = 15_000
const linksPerPage = 50
const linksPerFeed = 50

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes`
}

async function main() {
  const relativeFiles = await fg('**/*', { cwd: artifactRoot, onlyFiles: true, dot: true })
  if (relativeFiles.length === 0) throw new Error('dist contains no files; run npm run build first')

  const files = await Promise.all(relativeFiles.map(async (relative) => {
    const absolute = path.join(artifactRoot, relative)
    const stats = await lstat(absolute)
    return { relative, absolute, bytes: stats.size }
  }))
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  const largest = files.reduce((current, file) => file.bytes > current.bytes ? file : current, files[0])
  const pagefindFiles = files.filter((file) => file.relative.startsWith('pagefind/'))
  const pagefindBytes = pagefindFiles.reduce((sum, file) => sum + file.bytes, 0)
  const linkHtmlFiles = files.filter((file) => file.relative.startsWith('links/') && file.relative.endsWith('.html'))

  let linkDetailPages = 0
  let linkArchivePages = 0
  let maximumRows = 0
  let largestArchive = { relative: '', bytes: 0 }
  let largestDetail = { relative: '', bytes: 0 }
  for (const file of linkHtmlFiles) {
    const html = await readFile(file.absolute, 'utf8')
    const rows = countMatches(html, /data-link-row(?:[\s=>])/g)
    if (rows > 0 || file.relative === 'links/index.html') {
      linkArchivePages += 1
      maximumRows = Math.max(maximumRows, rows)
      if (file.bytes > largestArchive.bytes) largestArchive = file
    }
    if (/(?:content="Link"[^>]*data-pagefind-filter="type\[content\]"|data-pagefind-filter="type\[content\]"[^>]*content="Link")/.test(html)) {
      linkDetailPages += 1
      if (file.bytes > largestDetail.bytes) largestDetail = file
    }
  }

  const linksFeed = await readFile(path.join(artifactRoot, 'links', 'feed.xml'), 'utf8')
  const combinedFeed = await readFile(path.join(artifactRoot, 'feed.xml'), 'utf8')
  const linksFeedItems = countMatches(linksFeed, /<item>/g)
  const combinedFeedLinks = countMatches(combinedFeed, /<title>Link:/g)

  const report = {
    files: relativeFiles.length,
    totalBytes,
    largestAsset: { path: largest.relative, bytes: largest.bytes },
    pagefind: { files: pagefindFiles.length, bytes: pagefindBytes },
    links: {
      detailPages: linkDetailPages,
      archivePages: linkArchivePages,
      maximumRows,
      largestArchive: { path: largestArchive.relative, bytes: largestArchive.bytes },
      largestDetail: { path: largestDetail.relative, bytes: largestDetail.bytes },
      linksFeedItems,
      combinedFeedLinks,
    },
  }

  console.log(`Artifact: ${report.files.toLocaleString('en-US')} files, ${formatBytes(totalBytes)}`)
  console.log(`Largest asset: ${largest.relative} (${formatBytes(largest.bytes)})`)
  console.log(`Pagefind: ${pagefindFiles.length} files, ${formatBytes(pagefindBytes)}`)
  console.log(`Links: ${linkDetailPages} detail pages, ${linkArchivePages} archive pages, maximum ${maximumRows} rows`)
  console.log(`Page weights: ${largestArchive.relative || 'n/a'} (${formatBytes(largestArchive.bytes)}), ${largestDetail.relative || 'n/a'} (${formatBytes(largestDetail.bytes)})`)
  console.log(`Feeds: ${linksFeedItems} Links-only items, ${combinedFeedLinks} combined-feed Links`)

  const failures = []
  if (pagefindFiles.length === 0) failures.push('Pagefind assets are missing')
  if (maximumRows > linksPerPage) failures.push(`an archive contains ${maximumRows} Link rows (maximum ${linksPerPage})`)
  if (linksFeedItems > linksPerFeed) failures.push(`Links feed contains ${linksFeedItems} items (maximum ${linksPerFeed})`)
  if (combinedFeedLinks > linksPerFeed) failures.push(`combined feed contains ${combinedFeedLinks} Links (maximum ${linksPerFeed})`)
  if (relativeFiles.length >= escalationFileCount) failures.push(`artifact contains ${relativeFiles.length} files (escalation threshold ${escalationFileCount})`)
  if (largest.bytes >= cloudflareAssetLimit) failures.push(`${largest.relative} exceeds Cloudflare's 25 MiB single-asset limit`)
  if (failures.length > 0) throw new Error(failures.join('; '))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Artifact validation failed')
  process.exit(1)
})
