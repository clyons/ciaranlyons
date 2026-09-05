import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const wellKnownDir = join(process.cwd(), 'dist', '.well-known')

const files = [
  ['ATPROTO_DID', 'atproto-did'],
  ['STANDARD_SITE_PUBLICATION_AT_URI', 'site.standard.publication'],
]

await mkdir(wellKnownDir, { recursive: true })

for (const [, filename] of files) {
  await rm(join(wellKnownDir, filename), { force: true })
}

for (const [envKey, filename] of files) {
  const value = process.env[envKey]?.trim()
  if (value) {
    await writeFile(join(wellKnownDir, filename), `${value}\n`, 'utf8')
  }
}
