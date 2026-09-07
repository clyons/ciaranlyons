import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const wellKnownDir = join(process.cwd(), 'dist', '.well-known')

const files = [
  ['ATPROTO_DID', 'atproto-did'],
  ['STANDARD_SITE_PUBLICATION_AT_URI', 'site.standard.publication'],
]

const values = Object.fromEntries(files.map(([envKey]) => [envKey, process.env[envKey]?.trim()]))
const required = process.env.REQUIRE_WELL_KNOWN === 'true'

if (required && files.some(([envKey]) => !values[envKey])) {
  throw new Error('ATPROTO_DID and STANDARD_SITE_PUBLICATION_AT_URI are required for a production build')
}
if (values.ATPROTO_DID && !/^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(values.ATPROTO_DID)) {
  throw new Error('ATPROTO_DID is invalid')
}
if (values.STANDARD_SITE_PUBLICATION_AT_URI && !/^at:\/\/[^/]+\/site\.standard\.publication\/[^/]+$/.test(values.STANDARD_SITE_PUBLICATION_AT_URI)) {
  throw new Error('STANDARD_SITE_PUBLICATION_AT_URI is invalid')
}

await mkdir(wellKnownDir, { recursive: true })

for (const [, filename] of files) {
  await rm(join(wellKnownDir, filename), { force: true })
}

for (const [envKey, filename] of files) {
  const value = values[envKey]
  if (value) {
    await writeFile(join(wellKnownDir, filename), `${value}\n`, 'utf8')
  }
}
