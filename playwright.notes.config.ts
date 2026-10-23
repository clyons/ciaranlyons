import { defineConfig, devices } from '@playwright/test'

const conductorPort = Number(process.env.CONDUCTOR_PORT)
const port = Number(process.env.NOTES_FIXTURE_PORT ?? (Number.isInteger(conductorPort) ? conductorPort + 2 : 4323))

export default defineConfig({
  testDir: './tests/ui',
  outputDir: '.context/note-media-test-results',
  testMatch: 'note-media.spec.ts',
  fullyParallel: true,
  workers: 3,
  use: { baseURL: `http://127.0.0.1:${port}`, colorScheme: 'light', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'node tests/fixtures/note-media/serve.mjs',
    env: { NOTES_MOCKUP_PORT: String(port) },
    url: `http://127.0.0.1:${port}/home/portrait/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
