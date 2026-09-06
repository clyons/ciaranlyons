import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://ciaranlyons.com',
  output: 'static',
  build: {
    assets: 'assets',
  },
})
