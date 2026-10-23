import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  site: 'http://127.0.0.1',
  publicDir: fileURLToPath(new URL('../../../.context/note-media-fixtures/public', import.meta.url)),
  outDir: fileURLToPath(new URL('../../../.context/note-media-fixtures/dist', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../../../.context/note-media-fixtures/cache', import.meta.url)),
  vite: {
    cacheDir: fileURLToPath(new URL('../../../.context/note-media-fixtures/vite', import.meta.url)),
    server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } },
  },
})
