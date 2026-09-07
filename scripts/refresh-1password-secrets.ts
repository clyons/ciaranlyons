#!/usr/bin/env npx tsx
/**
 * Refresh local env files from 1Password.
 *
 * Reads `dev:ciaranlyons` from 1Password and upserts keys into .env.local
 * and .env.cli based on field label prefixes:
 *   local.KEY  →  .env.local  (strip prefix)
 *   cli.KEY    →  .env.cli    (strip prefix)
 *   KEY        →  .env.local  (no prefix — fallback)
 *
 * Usage:
 *   npx tsx scripts/refresh-1password-secrets.ts
 *   npx tsx scripts/refresh-1password-secrets.ts --dry-run
 *   npx tsx scripts/refresh-1password-secrets.ts --item dev:my-app
 */

import { execFile } from 'node:child_process'
import { access, appendFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

type CommandRunner = (file: string, args: string[]) => Promise<void>

const runCommand: CommandRunner = async (file, args) => {
  await execFileAsync(file, args)
}

interface Args {
  item: string
  dryRun: boolean
  output?: string
}

interface Summary {
  generatedAt: string
  item: string
  dryRun: boolean
  targets: Array<{
    file: string
    updated: string[]
    added: string[]
  }>
}

function parseArgs(argv: string[]): Args {
  let item = 'dev:ciaranlyons'
  let dryRun = false
  let output: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--item') {
      item = argv[i + 1]
      i++
    } else if (arg.startsWith('--item=')) {
      item = arg.slice('--item='.length)
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--output') {
      output = argv[i + 1]
      i++
    } else if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!item) throw new Error('--item requires a non-empty value')
  if (output === '') throw new Error('--output requires a non-empty value')
  return { item, dryRun, output }
}

function formatEnvValue(value: string): string {
  if (value === '') return '""'
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value
  const escaped = value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"')
  return `"${escaped}"`
}

async function resolveEnvPath(relativePath: string): Promise<string> {
  const workspacePath = resolve(process.cwd(), relativePath)
  try {
    return await realpath(workspacePath)
  } catch {
    return workspacePath
  }
}

async function readOpItem(item: string): Promise<{ local: Record<string, string>; cli: Record<string, string> }> {
  const { stdout } = await execFileAsync('op', ['item', 'get', item, '--format', 'json'], {
    maxBuffer: 10 * 1024 * 1024,
  })

  const parsed = JSON.parse(stdout) as {
    fields?: Array<{ label?: string; value?: string }>
  }

  return routeOpFields(parsed.fields ?? [])
}

export function routeOpFields(fields: Array<{ label?: string; value?: string }>): { local: Record<string, string>; cli: Record<string, string> } {
  const local: Record<string, string> = {}
  const cli: Record<string, string> = {}
  const seenLabels = new Set<string>()

  for (const field of fields) {
    if (!field.label || typeof field.value !== 'string') continue
    if (!field.label.startsWith('local.') && !field.label.startsWith('cli.')) continue
    if (seenLabels.has(field.label)) throw new Error(`Duplicate 1Password field label: ${field.label}`)
    seenLabels.add(field.label)
    const key = field.label.startsWith('local.')
      ? field.label.slice('local.'.length)
      : field.label.slice('cli.'.length)
    if (!ENV_KEY_PATTERN.test(key)) throw new Error(`Invalid environment key in 1Password field: ${field.label}`)
    if (field.label.startsWith('local.')) {
      local[key] = field.value
    } else if (field.label.startsWith('cli.')) {
      cli[key] = field.value
    }
  }

  return { local, cli }
}

async function ensureFileExists(path: string): Promise<void> {
  try {
    await access(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, '', 'utf8')
  }
}

async function readEnvFileIfPresent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return ''
  }
}

function escapeForSedReplacement(s: string): string {
  // Order matters: escape \ first, then the | delimiter and & (matched-text reference)
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/&/g, '\\&')
}

export async function replaceEnvLine(
  path: string,
  key: string,
  formatted: string,
  runner: CommandRunner = runCommand,
): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ciaranlyons-env-sed-'))
  const scriptPath = join(temporaryDirectory, 'replace.sed')
  const script = `s|^${key}=.*|${escapeForSedReplacement(formatted)}|\n`

  try {
    await writeFile(scriptPath, script, { encoding: 'utf8', mode: 0o600 })
    const sedArgs = process.platform === 'darwin'
      ? ['-i', '', '-f', scriptPath, path]
      : ['-i', '-f', scriptPath, path]
    await runner('sed', sedArgs)
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

export async function upsertEnvFile(
  path: string,
  updates: Record<string, string>,
): Promise<{ updated: string[]; added: string[] }> {
  for (const key of Object.keys(updates)) {
    if (!ENV_KEY_PATTERN.test(key)) throw new Error(`Invalid environment key: ${key}`)
  }
  await ensureFileExists(path)
  const original = await readFile(path, 'utf8')
  const lines = original === '' ? [] : original.split('\n')
  const presentKeys = new Set(
    lines
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
      .filter((v): v is string => Boolean(v)),
  )

  const updated: string[] = []
  const added: string[] = []
  let appendedBefore = false

  for (const [key, value] of Object.entries(updates)) {
    const formatted = `${key}=${formatEnvValue(value)}`
    if (presentKeys.has(key)) {
      await replaceEnvLine(path, key, formatted)
      updated.push(key)
    } else {
      // Ensure we don't merge onto the last line if the file lacks a trailing newline
      const prefix = !appendedBefore && original !== '' && !original.endsWith('\n') ? '\n' : ''
      await appendFile(path, `${prefix}${formatted}\n`)
      appendedBefore = true
      added.push(key)
    }
  }

  return { updated: updated.sort(), added: added.sort() }
}

async function writeJson(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { local: localValues, cli: cliValues } = await readOpItem(args.item)

  const appPath = await resolveEnvPath('.env.local')
  const cliPath = await resolveEnvPath('.env.cli')

  const summary: Summary = {
    generatedAt: new Date().toISOString(),
    item: args.item,
    dryRun: args.dryRun,
    targets: [],
  }

  for (const [path, updates] of [
    [appPath, localValues],
    [cliPath, cliValues],
  ] as const) {
    const existing = await readEnvFileIfPresent(path)
    const lines = existing === '' ? [] : existing.split('\n')
    const presentKeys = new Set(
      lines
        .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
        .filter((v): v is string => Boolean(v)),
    )

    const updatedKeys = Object.keys(updates).filter((k) => presentKeys.has(k)).sort()
    const addedKeys = Object.keys(updates).filter((k) => !presentKeys.has(k)).sort()

    summary.targets.push({ file: path, updated: updatedKeys, added: addedKeys })

    if (!args.dryRun && Object.keys(updates).length > 0) {
      await upsertEnvFile(path, updates)
    }
  }

  if (args.output) await writeJson(args.output, summary)

  console.log(`Item: ${args.item}`)
  console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`)
  for (const target of summary.targets) {
    console.log(`${target.file}`)
    console.log(`  updated: ${target.updated.join(', ') || '(none)'}`)
    console.log(`  added:   ${target.added.join(', ') || '(none)'}`)
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''

if (import.meta.url === entrypoint) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Secret refresh failed: ${message}`)
    process.exit(1)
  })
}
