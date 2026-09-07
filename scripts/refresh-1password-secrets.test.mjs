import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { replaceEnvLine, routeOpFields, upsertEnvFile } from './refresh-1password-secrets.ts'

test('secret replacement data is kept out of process arguments and removed afterward', async () => {
  const secret = 'sentinel secret value'
  let privateScript = ''

  await replaceEnvLine('/tmp/example.env', 'TOKEN', `TOKEN="${secret}"`, async (file, args) => {
    assert.equal(file, 'sed')
    assert.equal(args.join(' ').includes(secret), false)
    privateScript = args[args.indexOf('-f') + 1]
    assert.ok(privateScript)
    assert.equal((await stat(privateScript)).mode & 0o777, 0o600)
    assert.match(await readFile(privateScript, 'utf8'), /sentinel secret value/)
  })

  await assert.rejects(access(privateScript))
})

test('env upserts replace existing keys and append missing keys', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ciaranlyons-env-test-'))
  const envFile = path.join(directory, '.env.local')

  try {
    await writeFile(envFile, 'EXISTING=old\nUNCHANGED=yes\n', 'utf8')
    const result = await upsertEnvFile(envFile, {
      EXISTING: 'new value',
      ADDED: 'new',
    })

    assert.deepEqual(result, { updated: ['EXISTING'], added: ['ADDED'] })
    assert.equal(await readFile(envFile, 'utf8'), 'EXISTING="new value"\nUNCHANGED=yes\nADDED=new\n')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('1Password routing ignores built-ins and rejects unsafe or duplicate managed labels', () => {
  assert.deepEqual(routeOpFields([
    { label: 'notesPlain', value: 'ignore' },
    { label: 'local.SAFE_KEY', value: 'one' },
    { label: 'cli.TOKEN', value: 'two' },
  ]), { local: { SAFE_KEY: 'one' }, cli: { TOKEN: 'two' } })
  assert.throws(() => routeOpFields([{ label: 'local.BAD-KEY', value: 'x' }]), /Invalid environment key/)
  assert.throws(() => routeOpFields([
    { label: 'local.SAME', value: 'x' },
    { label: 'local.SAME', value: 'y' },
  ]), /Duplicate/)
})
