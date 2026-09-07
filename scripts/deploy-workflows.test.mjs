import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const productionPath = new URL('../.github/workflows/deploy-production.yml', import.meta.url)
const previewPath = new URL('../.github/workflows/deploy-preview.yml', import.meta.url)
const deployDocPath = new URL('../docs/operations/deploy.md', import.meta.url)
const tilDocPath = new URL('../docs/operations/publish-til.md', import.meta.url)
const legacyPagesFiles = [
  new URL('../public/CNAME', import.meta.url),
  new URL('../public/.nojekyll', import.meta.url),
]

async function text(url) {
  return readFile(url, 'utf8')
}

test('production workflow deploys every main push only after validation', async () => {
  const workflow = await text(productionPath)
  assert.match(workflow, /push:\n\s+branches: \[main\]/)
  assert.doesNotMatch(workflow, /workflow_dispatch/)
  assert.match(workflow, /environment:\n\s+name: production/)
  assert.match(workflow, /REQUIRE_WELL_KNOWN: "true"/)
  assert.match(workflow, /ATPROTO_DID: \$\{\{ secrets\.ATPROTO_DID \}\}/)
  assert.match(workflow, /STANDARD_SITE_PUBLICATION_AT_URI: \$\{\{ secrets\.STANDARD_SITE_PUBLICATION_AT_URI \}\}/)
  assert.match(workflow, /command: pages deploy dist --project-name=ciaranlyons\n/)
  assert.doesNotMatch(workflow, /--branch=/)
  assert.ok(workflow.indexOf('run: npm test') < workflow.indexOf('pages deploy dist'))
  assert.match(workflow, /run: npm run smoke:production/)
  assert.match(workflow, /Start deployment timer/)
  assert.match(workflow, /Record production deployment duration/)
})

test('preview workflow is manual, branch-specific, and keeps production identity values out', async () => {
  const workflow = await text(previewPath)
  assert.match(workflow, /workflow_dispatch:\n\s+inputs:\n\s+ref:/)
  assert.doesNotMatch(workflow, /\n\s+push:/)
  assert.match(workflow, /ref: main/)
  assert.match(workflow, /node scripts\/preview-ref\.mjs "\$PREVIEW_REF"/)
  assert.match(workflow, /ref: \$\{\{ steps\.preview-ref\.outputs\.branch \}\}/)
  assert.match(workflow, /REQUIRE_WELL_KNOWN: "false"/)
  assert.doesNotMatch(workflow, /ATPROTO_DID|STANDARD_SITE_PUBLICATION_AT_URI/)
  assert.match(workflow, /command: pages deploy dist --project-name=ciaranlyons --branch=\$\{\{ steps\.preview-ref\.outputs\.branch \}\}/)
  assert.ok(workflow.indexOf('run: npm test') < workflow.indexOf('pages deploy dist'))
  assert.match(workflow, /Start deployment timer/)
  assert.match(workflow, /Record preview deployment duration/)
})

test('repository deployment documentation no longer instructs use of the former artifact repository', async () => {
  const [deployDoc, tilDoc] = await Promise.all([text(deployDocPath), text(tilDocPath)])
  assert.doesNotMatch(deployDoc, /clyons\/resume/)
  assert.doesNotMatch(tilDoc, /clyons\/resume/)
})

test('legacy GitHub Pages marker files are absent from the Cloudflare artifact', async () => {
  for (const file of legacyPagesFiles) {
    await assert.rejects(access(file))
  }
})
