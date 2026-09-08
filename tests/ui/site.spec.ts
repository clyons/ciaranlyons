import { expect, test } from '@playwright/test'
import fg from 'fast-glob'

const foundQuoteCount = (await fg('content/found-quotes/*.md')).length

const coreRoutes = [
  ['home', '/'],
  ['about', '/about/'],
  ['writing', '/writing/'],
  ['notes', '/notes/'],
  ['links', '/links/'],
  ['projects', '/projects/'],
  ['til', '/til/'],
  ['found quotes', '/found-quotes/'],
] as const

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
})

test('About presents the PQ Program reach accurately and stays responsive', async ({ page }) => {
  await page.goto('/about/')

  const about = page.locator('.about-profile')
  await expect(about.getByRole('heading', { level: 1 })).toHaveText('I build things that last and grow.')
  await expect(about).not.toContainText('Operator · Builder · Systems thinker')
  await expect(about).toContainText('over 250,000 participants')
  await expect(about).not.toContainText(/(?:1M\+|one million|1 million) participants/i)
  await expect(about.locator('img[alt="Ciaran Lyons"]')).toBeVisible()

  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true)

    const evidenceHeading = await about.getByRole('heading', { level: 2, name: 'Built across operations, growth, and technology.' }).boundingBox()
    const experience = await about.locator('.about-profile__history').boundingBox()
    const caseStudies = await about.locator('.about-profile__cases').boundingBox()
    const contactHeading = await about.getByRole('heading', { level: 2, name: 'Email is best.' }).boundingBox()
    const email = await about.locator('.about-profile__email').boundingBox()
    expect(evidenceHeading).not.toBeNull()
    expect(experience).not.toBeNull()
    expect(caseStudies).not.toBeNull()
    expect(contactHeading).not.toBeNull()
    expect(email).not.toBeNull()
    expect(Math.abs(experience!.x - evidenceHeading!.x)).toBeLessThan(1)
    expect(caseStudies!.y).toBeGreaterThanOrEqual(experience!.y + experience!.height)
    expect(Math.abs(caseStudies!.x - evidenceHeading!.x)).toBeLessThan(1)
    expect(Math.abs(email!.x - contactHeading!.x)).toBeLessThan(1)
  }
})

test('Found Quotes are discoverable as a project without changing primary navigation', async ({ page }) => {
  await page.goto('/found-quotes/')

  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Found Quotes' })).toHaveCount(0)
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/found-quotes/feed.xml')
  await page.goto('/projects/')
  await expect(page.locator('.project-row').filter({ hasText: 'Found Quotes' })).toHaveAttribute('href', '/found-quotes/')
})

test('Found Quote archive and permalink preserve quotation semantics', async ({ page }) => {
  await page.goto('/found-quotes/')

  await expect(page.locator('.found-quotes-list figure')).toHaveCount(foundQuoteCount)
  await expect(page.locator('.found-quotes-list blockquote')).toHaveCount(foundQuoteCount)
  await expect(page.locator('.preview-label')).toHaveCount(0)
  const liveQuote = page.locator('.found-quotes-list figure').filter({ hasText: '‘Live’ is the shortcut to FOMO.' })
  await expect(liveQuote).toHaveCount(1)
  await expect(page.getByText('The value of a company is the sum of all problems solved.')).toBeVisible()
  await expect(page.getByText('Martin Lorentzon', { exact: false })).toBeVisible()
  await expect(page.locator('.found-quotes-list time')).toHaveCount(0)
  const livePermalink = liveQuote.getByRole('link', { name: 'Permalink to found quote from Ben Thompson' })
  await expect(livePermalink).toHaveAttribute('href', '/found-quotes/2026/09/07/live-is-the-shortcut-to-fomo/')
  await expect(livePermalink).toHaveAttribute('rel', 'bookmark')
  await expect(livePermalink.locator('[aria-hidden="true"]')).toHaveText('#')

  await page.goto('/found-quotes/2026/09/07/live-is-the-shortcut-to-fomo/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Found quote from Ben Thompson')
  await expect(page.locator('article blockquote')).toHaveCount(1)
  await expect(page.locator('article figcaption')).toContainText('Ben Thompson')
  await expect(page.locator('article time')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Permalink to found quote from Ben Thompson' })).toHaveAttribute('rel', 'bookmark')
})

test('home gives the Found Quotes heading room before the first quote rule', async ({ page }) => {
  await page.goto('/')

  const heading = page.locator('.home-found-quotes .section-heading')
  expect(Number.parseFloat(await heading.evaluate((element) => getComputedStyle(element).marginBottom))).toBeGreaterThan(0)
  await expect(page.locator('.home-found-quotes')).toHaveCSS('border-bottom-width', '0px')
  await expect(heading.getByRole('link')).toHaveCount(0)
})

test('home foregrounds the pinned Writing entry', async ({ page }) => {
  await page.goto('/')

  const featuredWriting = page.locator('.featured-essay')
  await expect(featuredWriting.getByText('Featured writing', { exact: true })).toBeVisible()
  await expect(featuredWriting.getByRole('heading', { level: 2 })).toHaveText('On Ownership')
  await expect(featuredWriting.getByRole('link', { name: 'Read the essay' })).toHaveAttribute('href', '/writing/2026/08/08/on-ownership/')
})

test('Writing collections flow directly into their Found Quotes', async ({ page }) => {
  await page.goto('/writing/2026/09/07/found-quotes-wagmi/')

  await expect(page.locator('.writing-found-quotes')).toHaveCSS('border-top-width', '0px')
  await expect(page.locator('.writing-found-quotes')).toHaveCSS('padding-top', '0px')
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

for (const [name, path, archiveLabel, archivePath] of [
  ['TIL', '/til/2026/09/07/two-state-dark-mode-toggles/', 'TIL', '/til/'],
  ['Writing', '/writing/2026/09/07/found-quotes-wagmi/', 'Writing', '/writing/'],
  ['Found Quote', '/found-quotes/2026/09/07/live-is-the-shortcut-to-fomo/', 'Found Quotes', '/found-quotes/'],
  ['Note', '/notes/2026/09/07/3mux7jv5ze52c/', 'Notes', '/notes/'],
  ['Link', '/links/2026/08/05/markdown-now-has-a-uniform-type-identifer-uti-in-apple-s-version-8741ac4466/', 'Links', '/links/'],
] as const) {
  test(`${name} detail links back to its archive with a breadcrumb`, async ({ page }) => {
    await page.goto(path)

    const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumbs).toHaveCount(1)
    const archiveLink = breadcrumbs.getByRole('link', { name: archiveLabel, exact: true })
    await expect(archiveLink).toHaveAttribute('href', archivePath)
    await expect(breadcrumbs).toHaveText(archiveLabel)
    await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveCount(0)
    await archiveLink.click()
    expect(new URL(page.url()).pathname).toBe(archivePath)
  })
}

for (const [name, path] of [
  ['Found Quote', '/found-quotes/2026/09/07/live-is-the-shortcut-to-fomo/'],
  ['Note', '/notes/2026/09/07/3mux7jv5ze52c/'],
] as const) {
  test(`${name} detail does not repeat its archive label as a kicker`, async ({ page }) => {
    await page.goto(path)

    await expect(page.locator('article > .article-header')).toHaveCount(0)
    await expect(page.locator('article > .section-kicker')).toHaveCount(0)
  })
}

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

test('featured essay link remains legible on the orange panel in both themes', async ({ page }) => {
  await page.goto('/')

  const link = page.getByRole('link', { name: 'Read the essay' })
  const contrastAgainstPanel = (property = 'color') => link.evaluate((element, property) => {
    const parseRgb = (color: string) => color.match(/\d+(?:\.\d+)?/gu)!.slice(0, 3).map(Number)
    const luminance = (color: string) => {
      const [red, green, blue] = parseRgb(color).map((channel) => {
        const value = channel / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
    }
    const foreground = luminance(getComputedStyle(element).getPropertyValue(property))
    const background = luminance(getComputedStyle(element.closest('.featured-essay')!).backgroundColor)

    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  }, property)

  expect(await contrastAgainstPanel()).toBeGreaterThanOrEqual(4.5)
  await link.hover()
  expect(await contrastAgainstPanel()).toBeGreaterThanOrEqual(4.5)
  await link.focus()
  expect(await contrastAgainstPanel('outline-color')).toBeGreaterThanOrEqual(3)

  await page.locator('[data-theme-toggle]').click()
  expect(await contrastAgainstPanel()).toBeGreaterThanOrEqual(4.5)
  await link.hover()
  expect(await contrastAgainstPanel()).toBeGreaterThanOrEqual(4.5)
  await link.focus()
  expect(await contrastAgainstPanel('outline-color')).toBeGreaterThanOrEqual(3)
})

test('projects are ordered and use the approved site card copy', async ({ page }) => {
  await page.goto('/projects/')

  const projects = page.locator('.project-row')
  await expect(projects.nth(0).getByRole('heading')).toHaveText('TIL')
  await expect(projects.nth(1).getByRole('heading')).toHaveText('ciaranlyons.com')
  await expect(projects.nth(1)).toContainText('This site: writing, notes & various projects.')
  await expect(projects.nth(2).getByRole('heading')).toHaveText('Found Quotes')
  await expect(projects.nth(2)).toContainText('Things that smarter folks than I have said.')
})

test('home lists every project', async ({ page }) => {
  await page.goto('/projects/')
  const projectCount = await page.locator('.project-row').count()

  await page.goto('/')
  const projects = page.locator('.home-projects .project-row')
  await expect(projects).toHaveCount(projectCount)
  await expect(projects.filter({ hasText: 'Found Quotes' })).toHaveCount(1)
})

test('note permalinks render as native posts rather than quotations', async ({ page }) => {
  await page.goto('/notes/2026/09/07/3mux7jv5ze52c/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New TIL: two-state dark mode toggles.')
  await expect(page.locator('article blockquote')).toHaveCount(0)
  await expect(page.locator('.note-rich-text')).toContainText('I keep returning to @lea.verou.me’s argument')
  await expect(page.getByRole('link', { name: '@lea.verou.me' })).toHaveAttribute('href', 'https://bsky.app/profile/did:plc:eagnfcoqnbtzpkglrtej6ayg')
  await expect(page.getByRole('link', { name: /TIL Two-state dark mode toggles/ })).toHaveAttribute('href', '/til/2026/09/07/two-state-dark-mode-toggles/')
  await expect(page.locator('.note-rich-text')).toContainText('https://ciaranlyons.com/til/2026/09/07/two-state-dark-mode-toggles')
  await expect(page.locator('.note-post-footer time')).toHaveAttribute('datetime', '2026-09-07T19:10:39.594Z')
  const blueskySyndication = page.getByRole('link', { name: 'Also on Bluesky' })
  await expect(blueskySyndication).toHaveAttribute('href', 'https://bsky.app/profile/did:plc:bi2irbzgh2fzqvuuewkju2xf/post/3mux7jv5ze52c')
  await expect(blueskySyndication).toHaveAttribute('rel', 'syndication')

  await page.goto('/notes/2026/09/05/3musjyx5omc2i/')
  await expect(page.locator('article blockquote')).toHaveCount(0)
  const video = page.locator('.note-media video')
  const linkedTil = page.getByRole('link', { name: /TIL Animating a logo in Blender with a coding agent/ })
  await expect(linkedTil).toHaveAttribute('href', '/til/2026/09/05/blender-logo-animation-coding-agent-macos/')
  await expect(video).toBeVisible()
  expect(await video.evaluate((element) => element.compareDocumentPosition(document.querySelector('.note-content-references')!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy()

  await page.goto('/notes/2026/09/08/3muy7cork3c24/')
  const linkedWriting = page.getByRole('link', { name: /Writing Found Quotes: WAGMI/ })
  await expect(linkedWriting).toHaveAttribute('href', '/writing/2026/09/07/found-quotes-wagmi/')
  await expect(linkedWriting).toContainText('A handful of quotes about technology and making it better.')
  await expect(linkedWriting).toHaveCSS('border-bottom-width', '0px')
  await expect(page.locator('.note-post-footer')).toHaveCSS('border-top-width', '1px')
})

test('note detail matches its approved visual baseline', async ({ page }) => {
  await page.goto('/notes/2026/09/07/3mux7jv5ze52c/')
  await expect(page).toHaveScreenshot('note-detail.png', {
    animations: 'disabled',
    fullPage: true,
    caret: 'hide',
  })
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

  const linksHeader = page.getByRole('heading', { name: 'Links', exact: true }).locator('..')
  await expect(linksHeader).toHaveAttribute('data-link-count', /^[1-9]\d*$/)
  await expect(linksHeader).toHaveAttribute('data-source-count', /^[1-9]\d*$/)
  await expect(page.getByText('Curated, not collected', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/links · .*sources/i)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Recently saved' })).toHaveCount(0)
  await expect(page.locator('.links-archive .link-row').first()).toHaveCSS('border-top-width', '0px')

  const toolWidths = await page.locator('.links-tools > *').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width))
  expect(Math.abs(toolWidths[0] - toolWidths[1])).toBeLessThanOrEqual(1)
})

test('Links utility controls have explicit search and comfortable pointer targets', async ({ page }) => {
  await page.goto('/links/')

  const search = page.getByRole('search', { name: 'Search links' })
  await expect(search.getByRole('searchbox', { name: 'Search links' })).toHaveAttribute('placeholder', 'Search links')
  await expect(search.getByRole('button', { name: 'Search' })).toBeVisible()

  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    const targets = page.locator('.links-years a, .link-actions a, .archive-pagination__links a')
    const sizes = await targets.evaluateAll((elements) => elements.map((element) => {
      const { width, height } = element.getBoundingClientRect()
      return { width, height }
    }))

    expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true)
  }
})

test('TIL search submits a TIL-filtered site search', async ({ page }) => {
  await page.goto('/til/')

  const search = page.getByRole('search', { name: 'Search TILs' })
  await expect(search.getByRole('searchbox', { name: 'Search TILs' })).toHaveAttribute('placeholder', 'Search TILs')
  await expect(search.getByRole('button', { name: 'Search' })).toBeVisible()
  await search.getByRole('searchbox', { name: 'Search TILs' }).fill('two-state dark mode')
  await search.getByRole('button', { name: 'Search' }).click()

  await expect(page).toHaveURL(/\/search\/\?q=two-state(?:\+|%20)dark(?:\+|%20)mode&type=TIL/)
  await expect(page.locator('#search-status')).toContainText('TIL result')
  await expect(page.locator('#search-results .type-label').first()).toHaveText('TIL')
})

test('links keep bounded archive navigation and canonical outbound context', async ({ page }) => {
  await page.goto('/links/')

  await expect(page.getByRole('article')).toHaveCount(50)
  const entry = page.getByRole('article').filter({ hasText: 'Markdown Now Has a Uniform Type Identifer' })
  await expect(entry.getByRole('link', { name: 'Notes & details' })).toHaveAttribute('href', '/links/2026/08/05/markdown-now-has-a-uniform-type-identifer-uti-in-apple-s-version-8741ac4466/')
  await expect(entry.getByRole('link', { name: /Read at developer\.apple\.com/ })).toHaveAttribute('href', 'https://developer.apple.com/documentation/uniformtypeidentifiers/uttype-swift.struct/markdown')
  await expect(page.getByRole('link', { name: 'Next Links page, page 2' })).toHaveAttribute('href', '/links/page/2/')

  await page.getByRole('link', { name: 'Next Links page, page 2' }).click()
  await expect(page).toHaveURL(/\/links\/page\/2\/$/)
  await expect(page.getByRole('article')).toHaveCount(50)
  await expect(page.getByRole('link', { name: 'Previous Links page, page 1' })).toHaveAttribute('href', '/links/')

  await page.goto('/links/2026/08/05/markdown-now-has-a-uniform-type-identifer-uti-in-apple-s-version-8741ac4466/')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://ciaranlyons.com/links/2026/08/05/markdown-now-has-a-uniform-type-identifer-uti-in-apple-s-version-8741ac4466/')
  await expect(page.getByRole('link', { name: /Read the original/ })).toHaveAttribute('href', 'https://developer.apple.com/documentation/uniformtypeidentifiers/uttype-swift.struct/markdown')
})

test('Link-filtered Pagefind search preserves query state and returns bounded results', async ({ page }) => {
  await page.goto('/search/?type=Link&q=Markdown')
  const results = page.locator('#search-results .search-result')
  await expect(results.first()).toContainText('Markdown Now Has a Uniform Type Identifer')
  expect(await results.count()).toBeLessThanOrEqual(12)
  expect(await results.count()).toBeGreaterThan(0)
  await expect(page.locator('#search-status')).toContainText('Link result')

  await page.getByRole('searchbox', { name: 'Search the site' }).fill('Apple')
  await expect(page).toHaveURL(/type=Link.*q=Apple|q=Apple.*type=Link/)
  await expect(page.locator('#search-status')).toContainText('for “Apple”')
  await expect(results).toHaveCount(12)
  await expect(page.locator('#search-results .type-label').first()).toHaveText('Link')
})

test('Links archives remain navigable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/links/')
  await expect(page.getByRole('article')).toHaveCount(50)
  await page.getByRole('link', { name: 'Next Links page, page 2' }).click()
  await expect(page).toHaveURL(/\/links\/page\/2\/$/)
  await expect(page.getByRole('article')).toHaveCount(50)
  await context.close()
})

for (const [name, path] of [
  ['home', '/'],
  ['about', '/about/'],
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

test('links matches its approved first-viewport baseline', async ({ page }) => {
  await page.goto('/links/')
  await expect(page).toHaveScreenshot('links.png', {
    animations: 'disabled',
    fullPage: false,
    caret: 'hide',
  })
})
