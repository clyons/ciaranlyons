import assert from 'node:assert/strict'
import { access, readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
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

const prPath = new URL('../.github/workflows/pr-quality.yml', import.meta.url)
const packagePath = new URL('../package.json', import.meta.url)

function assertValidationOrder(workflow, deployment = false) {
  // Within the one artifact-producing job, ordinary failing steps must stop the job.
  const job = workflow.includes('  quality-checks:') ? workflow.slice(workflow.indexOf('  quality-checks:')) : workflow
  const commands = ['run: npm ci --ignore-scripts', 'run: npm run lint', 'run: npm test', 'run: npm run build:artifact']
  if (deployment) commands.push('command: pages deploy dist')
  let previous = -1
  for (const command of commands) {
    const index = job.indexOf(command)
    assert.ok(index > previous, `missing or unordered validation gate: ${command}`)
    previous = index
  }
  for (const step of job.split(/\n      - /).filter((step) => /run: npm (?:ci|test|run (?:lint|build:artifact))|command: pages deploy/.test(step))) {
    assert.doesNotMatch(step, /continue-on-error:|if: (?!steps\.node-project\.outputs\.present == 'true')|\|\|/)
  }
  const validation = job.slice(job.indexOf('run: npm ci'), previous)
  assert.doesNotMatch(validation, /uses: actions\/checkout@|npm (?:install|i)\b|git (?:checkout|reset|pull)/)
  assert.doesNotMatch(job, /run: npm run build\s*\n/)
}

test('every artifact job uses locked dependencies and lint/test gates before rendering or upload', async () => {
  for (const [file, deployment] of [[prPath, false], [productionPath, true], [previewPath, true]]) {
    const workflow = await text(file)
    assertValidationOrder(workflow, deployment)
    assert.match(workflow, /node-version: "22"\n\s+cache: npm/)
    assert.doesNotMatch(workflow, /actions\/cache|cache-dependency-path:.*(?:dist|\.env)/)
  }
  const pr = await text(prPath)
  assert.match(pr, /needs: pr-metadata/)
  assert.match(pr, /types: \[opened, synchronize, reopened, edited\]/)
  assert.match(pr, /run: npx tsc --noEmit/)
  assert.match(pr, /node scripts\/validate-pr-body\.mjs --body-file "\$RUNNER_TEMP\/pr-body.md"/)
  assert.doesNotMatch(pr, /has_execplan|has_na_reason|VALIDATION_TEXT/)
  assert.match(await text(productionPath), /group: pages-production\n\s+cancel-in-progress: false/)
})

test('contract rejects missing, reordered, or bypassed validation', async () => {
  const workflow = await text(productionPath)
  for (const broken of [
    workflow.replace('run: npm run lint', 'run: echo skipped'),
    workflow.replace('run: npm test', 'if: always()\n        run: npm test'),
    workflow.replace('run: npm run build:artifact', 'continue-on-error: true\n        run: npm run build:artifact'),
    workflow.replace('run: npm run lint', 'run: npm run lint || true'),
    workflow.replace('run: npm test', 'run: npm run build:artifact').replace('run: npm run build:artifact\n\n      - name: Verify locked', 'run: npm test\n\n      - name: Verify locked'),
  ]) assert.throws(() => assertValidationOrder(broken, true))
})

test('standalone build retains lint and the complete clean/render/verify/index/identity sequence', async () => {
  const { scripts } = JSON.parse(await text(packagePath))
  assert.equal(scripts.build, 'npm run lint && npm run build:artifact')
  assert.equal(scripts.lint, 'astro check')
  assert.equal(scripts['build:artifact'], 'node scripts/clean-dist.mjs && astro build && node scripts/verify-og-images.mjs && pagefind --site dist && node scripts/write-well-known.mjs')
})

test('deployment action is SHA-pinned and reuses the exact installed CLI without mutating dependencies', async () => {
  const pkg = JSON.parse(await text(packagePath))
  const lock = JSON.parse(await text(new URL('../package-lock.json', import.meta.url)))
  const version = pkg.devDependencies.wrangler
  assert.match(version, /^\d+\.\d+\.\d+$/)
  assert.equal(lock.packages['node_modules/wrangler'].version, version)
  for (const file of [productionPath, previewPath]) {
    const workflow = await text(file)
    assert.match(workflow, /uses: cloudflare\/wrangler-action@[a-f0-9]{40} # v4/)
    assert.ok(workflow.includes(`wranglerVersion: "${version}"`))
    assert.match(workflow, /actual="\$\(node_modules\/\.bin\/wrangler --version\)"\n\s+test "\$actual" = "\$expected"/)
    assert.ok(workflow.indexOf('Verify locked deployment tooling') < workflow.indexOf('command: pages deploy dist'))
    assert.match(workflow, /Verify deployment left dependencies unchanged\n\s+if: always\(\)\n\s+run: git diff --exit-code -- package.json package-lock.json/)
  }
})


test('failed lint, tests, and artifact commands stop before upload; public build stops before rendering on lint failure', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'deploy-gates-'))
  const execute = promisify(execFile)
  const { scripts } = JSON.parse(await text(packagePath))
  try {
    const bin = path.join(directory, 'bin')
    await mkdir(bin)
    const runner = `#!/bin/sh
if [ "$1" = run ]; then
  case "$2" in
    lint) exec /bin/sh -ec "$TASK_LINT" ;;
    build:artifact) exec /bin/sh -ec "$TASK_ARTIFACT" ;;
  esac
fi
name="$(basename "$0"):$*"
printf '%s\\n' "$name" >> "$TASK_TRACE"
if [ "$name" = "$TASK_FAIL" ]; then exit 1; fi
`
    for (const name of ['npm', 'node', 'astro', 'pagefind', 'wrangler']) await writeFile(path.join(bin, name), runner, { mode: 0o755 })
    const base = { ...process.env, PATH: `${bin}:/usr/bin:/bin`, TASK_LINT: scripts.lint, TASK_ARTIFACT: scripts['build:artifact'], TASK_TRACE: path.join(directory, 'trace') }
    const pipeline = 'npm run lint\n' + 'npm test\n' + 'npm run build:artifact\n' + 'wrangler pages deploy dist'
    for (const failure of ['astro:check', 'npm:test', 'node:scripts/clean-dist.mjs', 'astro:build', 'node:scripts/verify-og-images.mjs', 'pagefind:--site dist', 'node:scripts/write-well-known.mjs']) {
      await writeFile(base.TASK_TRACE, '')
      await assert.rejects(execute('/bin/sh', ['-ec', pipeline], { env: { ...base, TASK_FAIL: failure } }))
      const trace = await readFile(base.TASK_TRACE, 'utf8')
      assert.ok(trace.includes(failure))
      assert.doesNotMatch(trace, /wrangler:/)
      if (failure === 'astro:check') assert.doesNotMatch(trace, /clean-dist|astro:build/)
    }
    await writeFile(base.TASK_TRACE, '')
    await assert.rejects(execute('/bin/sh', ['-ec', scripts.build], { env: { ...base, TASK_FAIL: 'astro:check' } }))
    assert.doesNotMatch(await readFile(base.TASK_TRACE, 'utf8'), /clean-dist|astro:build/)
    await writeFile(base.TASK_TRACE, '')
    await execute('/bin/sh', ['-ec', pipeline], { env: { ...base, TASK_FAIL: '' } })
    assert.match(await readFile(base.TASK_TRACE, 'utf8'), /wrangler:pages deploy dist/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
