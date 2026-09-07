import { rm } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const destination = path.resolve(root, 'dist')
if (path.dirname(destination) !== root || path.basename(destination) !== 'dist') {
  throw new Error('Refusing to clean an unexpected build directory')
}
await rm(destination, { recursive: true, force: true })
