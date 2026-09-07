import { expect, test } from '@playwright/test'

const coreRoutes = [
  ['home', '/'],
  ['about', '/about/'],
  ['writing', '/writing/'],
  ['notes', '/notes/'],
  ['links', '/links/'],
  ['projects', '/projects/'],
  ['til', '/til/'],
] as const

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
})

test.describe('site structure and keyboard access', () => {
  for (const [name, path] of coreRoutes) {
    test(`${name} exposes a labelled primary navigation and one main heading`, async ({ page }) => {
      await page.goto(path)

      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    })
  }

  test('skip link moves keyboard focus to main content', async ({ page }) => {
    await page.goto('/writing/')

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('theme toggle communicates and changes its pressed state', async ({ page }) => {
    await page.goto('/')

    const toggle = page.locator('[data-theme-toggle]')
    await expect(toggle).toHaveAccessibleName(/Switch to dark mode/i)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})

test('projects are ordered and use the approved site card copy', async ({ page }) => {
  await page.goto('/projects/')

  const projects = page.locator('.project-row')
  await expect(projects.nth(0).getByRole('heading')).toHaveText('TIL')
  await expect(projects.nth(1).getByRole('heading')).toHaveText('ciaranlyons.com')
  await expect(projects.nth(1)).toContainText('This site: writing, notes & various projects.')
})

test('primary navigation keeps every control on one visible row at mobile widths', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')

    const controls = page.locator('nav[aria-label="Primary navigation"] a, nav[aria-label="Primary navigation"] button')
    await expect(controls).toHaveCount(6)
    const layout = await controls.evaluateAll((elements) => ({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bounds: elements.map((element) => {
        const { top, bottom, left, right } = element.getBoundingClientRect()
        return { top, bottom, left, right }
      }),
    }))
    const rowTop = layout.bounds[0].top

    expect(layout.bounds.every(({ top, bottom, left, right }) => Math.abs(top - rowTop) < 2 && bottom <= layout.viewport.height && left >= 0 && right <= layout.viewport.width)).toBe(true)
  }
})

for (const path of ['/writing/', '/notes/', '/projects/', '/til/']) {
  test(`${path} uses one divider between its header and archive content`, async ({ page }) => {
    await page.goto(path)

    const firstArchiveRow = page.locator('.section + .section .archive-list > :first-child').first()
    await expect(firstArchiveRow).toHaveCSS('border-top-width', '0px')
  })
}

test('links use one divider between tools and the first result', async ({ page }) => {
  await page.goto('/links/')
  await expect(page.locator('.links-archive .link-row').first()).toHaveCSS('border-top-width', '0px')
})

test('links support local context, outbound reading, filtering, and canonical metadata', async ({ page }) => {
  await page.goto('/links/')

  const entry = page.getByRole('article').filter({ hasText: 'Design engineering in the age of AI' })
  await expect(entry.getByRole('link', { name: 'Notes & details' })).toHaveAttribute('href', /\/links\/2026\/08\/31\/design-engineering/)
  await expect(entry.getByRole('link', { name: /Read at example\.com/ })).toHaveAttribute('href', 'https://example.com/design-engineering')

  await page.getByRole('searchbox', { name: 'Search links' }).fill('ATproto')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('AT Protocol records are bigger than social posts')

  await page.goto('/links/2026/08/31/design-engineering-in-the-age-of-ai-950e894a5e/')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://ciaranlyons.com/links/2026/08/31/design-engineering-in-the-age-of-ai-950e894a5e/')
  await expect(page.getByRole('link', { name: /Read the original/ })).toHaveAttribute('href', 'https://example.com/design-engineering')
})

for (const [name, path] of [
  ['home', '/'],
  ['writing', '/writing/'],
  ['notes', '/notes/'],
  ['links', '/links/'],
  ['projects', '/projects/'],
] as const) {
  test(`${name} matches its approved visual baseline`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveScreenshot(`${name}.png`, {
      animations: 'disabled',
      fullPage: true,
      caret: 'hide',
    })
  })
}
