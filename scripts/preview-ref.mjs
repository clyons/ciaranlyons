import { appendFile } from 'node:fs/promises'

export function normalizePreviewRef(value) {
  if (typeof value !== 'string') throw new Error('Preview ref is required')

  const branch = value.trim().replace(/^refs\/heads\//, '').replace(/^origin\//, '')
  if (!branch) throw new Error('Preview ref is required')
  if (branch === 'main') throw new Error('Preview deployments must target a non-main branch')
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)
    || branch.includes('..')
    || branch.includes('//')
    || branch.endsWith('.')
    || branch.endsWith('.lock')
  ) {
    throw new Error(`Preview ref is not a supported branch name: ${value}`)
  }

  return branch
}

async function main() {
  const branch = normalizePreviewRef(process.argv[2])
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `branch=${branch}\n`)
  console.log(branch)
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Preview ref validation failed')
    process.exitCode = 1
  })
}
