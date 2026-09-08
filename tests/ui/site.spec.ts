import { expect, test } from '@playwright/test'

const coreRoutes = [
  ['home', '/'],
  ['about', '/about/'],
  ['writing', '/writing/'],
  ['notes', '/notes/'],
  ['projects', '/projects/'],
  ['til', '/til/'],
  ['found quotes', '/found-quotes/'],
] as const

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
})

test('Found Quotes are discoverable without changing primary navigation', async ({ page }) => {
  await page.goto('/found-quotes/')

  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Found Quotes' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Found Quotes' })).toHaveAttribute('href', '/found-quotes/')
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/found-quotes/feed.xml')
})

test('Found Quote archive and permalink preserve quotation semantics', async ({ page }) => {
  await page.goto('/found-quotes/')

  await expect(page.locator('.found-quotes-list figure')).toHaveCount(19)
  await expect(page.locator('.found-quotes-list blockquote')).toHaveCount(19)
  await expect(page.locator('.preview-label')).toHaveCount(0)
  await expect(page.locator('.found-quotes-list blockquote').first()).toContainText('Live is the shortcut to FOMO.')
  await expect(page.getByText('The value of a company is the sum of all problems solved.')).toBeVisible()
  await expect(page.getByText('Martin Lorentzon', { exact: false })).toBeVisible()

  await page.goto('/found-quotes/2026/09/07/live-is-the-shortcut-to-fomo/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Found quote from Ben Thompson')
  await expect(page.locator('article blockquote')).toHaveCount(1)
  await expect(page.locator('article figcaption')).toContainText('Ben Thompson')
})

test('Found Quote type study gives the long exemplar a reading scale', async ({ page }) => {
  await page.goto('/found-quotes/style-study/')

  const quotes = page.locator('.found-quotes-list figure')
  await expect(quotes).toHaveCount(4)
  await expect(page.locator('.found-quotes-list .found-quote--reading')).toHaveCount(1)
  for (let index = 0; index < 3; index += 1) {
    await expect(quotes.nth(index)).not.toHaveClass(/found-quote--reading/)
  }
  await expect(quotes.nth(3)).toHaveClass(/found-quote--reading/)
  await expect(quotes.nth(3)).toContainText('In the Great Silence')

  await page.goto('/found-quotes/2026/09/07/great-silence-and-technological-efficiency/')
  await expect(page.locator('article .found-quote--reading')).toHaveCount(1)
  await expect(page.locator('article blockquote em')).toHaveText('waste products')

  await page.goto('/found-quotes/2026/09/07/two-products-at-the-end-of-a-programme/')
  await expect(page.locator('article blockquote p')).toHaveCount(2)

  await page.goto('/found-quotes/2026/09/07/higher-education-rarities-discussed-as-norms/')
  await expect(page.locator('article blockquote p')).toHaveCount(3)
  const elision = page.locator('article blockquote .found-quote-elision')
  await expect(elision).toHaveCount(1)
  await expect(elision.locator('[aria-hidden="true"]')).toHaveText('[…]')
  await expect(elision.locator('.visually-hidden')).toHaveText('Quoted passage omitted.')
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
    await expect(controls).toHaveCount(5)
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

for (const [name, path] of [
  ['home', '/'],
  ['writing', '/writing/'],
  ['notes', '/notes/'],
  ['projects', '/projects/'],
  ['found-quotes', '/found-quotes/'],
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
