import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const script = path.resolve('scripts/write-well-known.mjs')

test('production well-known generation requires and validates both identities', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'well-known-test-'))
  try {
    await assert.rejects(execFileAsync(process.execPath, [script], {
      cwd: directory,
      env: { ...process.env, REQUIRE_WELL_KNOWN: 'true', ATPROTO_DID: '', STANDARD_SITE_PUBLICATION_AT_URI: '' },
    }), /production build/)

    await execFileAsync(process.execPath, [script], {
      cwd: directory,
      env: {
        ...process.env,
        REQUIRE_WELL_KNOWN: 'true',
        ATPROTO_DID: 'did:plc:example',
        STANDARD_SITE_PUBLICATION_AT_URI: 'at://did:plc:example/site.standard.publication/site',
      },
    })
    assert.equal(await readFile(path.join(directory, 'dist/.well-known/atproto-did'), 'utf8'), 'did:plc:example\n')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
