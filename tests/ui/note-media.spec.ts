import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
})

for (const name of ['portrait', 'landscape', 'square', 'gallery', 'three', 'many', 'unknown', 'extreme', 'video', 'hls', 'text', 'url', 'media']) {
  test(`home ${name} stays inside its column across breakpoints`, async ({ page }) => {
    await page.goto(`/home/${name}/`)
    for (const width of [320, 375, 390, 759, 760, 761, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const bounds = await page.locator('.latest-note').evaluate((note) => {
        const box = note.getBoundingClientRect()
        const intro = note.closest('.home-intro')!.getBoundingClientRect()
        const featured = document.querySelector('.featured-essay')!.getBoundingClientRect()
        const media = Array.from(note.querySelectorAll('img, video, .note-media, .latest-note-footer, a')).filter((el) => el.getClientRects().length > 0).map((el) => {
          const r = el.getBoundingClientRect()
          return { left: r.left, right: r.right, bottom: r.bottom, height: r.height }
        })
        return { left: box.left, right: box.right, bottom: box.bottom, introBottom: intro.bottom, featuredTop: featured.top, media, width: innerWidth }
      })
      expect(bounds.left).toBeGreaterThanOrEqual(0)
      expect(bounds.right).toBeLessThanOrEqual(width + 1)
      expect(bounds.featuredTop).toBeGreaterThanOrEqual(bounds.introBottom - 1)
      for (const item of bounds.media) {
        expect(item.left).toBeGreaterThanOrEqual(bounds.left - 1)
        expect(item.right).toBeLessThanOrEqual(bounds.right + 1)
        expect(item.bottom).toBeLessThanOrEqual(bounds.bottom + 1)
      }
      const image = page.locator('.note-media img').first()
      if (await image.count()) {
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
        expect((await image.boundingBox())!.height).toBeLessThanOrEqual(353)
      }
    }
    await page.locator('[data-theme-toggle]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('link', { name: 'Read note', exact: true })).toBeVisible()
  })
}

test('archive keeps each post, media, and date together on desktop and mobile', async ({ page }) => {
  await page.goto('/notes/')
  await expect(page.locator('.note-row')).toHaveCount(5)
  for (const width of [320, 390, 760, 761, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const rows = await page.locator('.note-row').evaluateAll((elements) => elements.map((row) => {
      const r = row.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, children: Array.from(row.querySelectorAll('img,video,time')).map((el) => {
        const c = el.getBoundingClientRect()
        return { left: c.left, right: c.right, top: c.top, bottom: c.bottom }
      }) }
    }))
    rows.forEach((row, index) => {
      expect(row.left).toBeGreaterThanOrEqual(0)
      expect(row.right).toBeLessThanOrEqual(width + 1)
      if (index) expect(row.top).toBeGreaterThanOrEqual(rows[index - 1].bottom - 1)
      for (const child of row.children) {
        expect(child.left).toBeGreaterThanOrEqual(row.left - 1)
        expect(child.right).toBeLessThanOrEqual(row.right + 1)
        expect(child.top).toBeGreaterThanOrEqual(row.top)
        expect(child.bottom).toBeLessThanOrEqual(row.bottom)
      }
    })
  }
})

for (const kind of ['video', 'hls']) {
  for (const surface of ['home', 'note']) {
    test(`${surface} ${kind} decodes frames after an explicit play action`, async ({ page }) => {
      await page.goto(`/${surface}/${kind}/`)
      const video = page.locator('.note-media video')
      await expect(video).toHaveAttribute('preload', 'none')
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused && !v.autoplay)).toBe(true)
      const play = page.getByRole('button', { name: /^Play video:/ })
      await play.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15000 }).toBeGreaterThan(0.2)
      expect(await video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(640)
      expect(await video.evaluate((v: HTMLVideoElement) => v.error)).toBeNull()
      await video.evaluate((v: HTMLVideoElement) => v.pause())
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
      await video.evaluate((v: HTMLVideoElement) => v.play())
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false)
      if (kind === 'hls') await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.textTracks.length)).toBeGreaterThan(0)
    })
  }
}

test('archive loads no video streams until requested and leaves sibling players idle', async ({ page }) => {
  const streams: string[] = []
  page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/media/') && /\.(?:m3u8|ts|mp4)$/.test(new URL(r.url()).pathname)) streams.push(r.url()) })
  await page.goto('/notes/')
  await page.waitForLoadState('networkidle')
  expect(streams).toEqual([])
  const videos = page.locator('video')
  await page.getByRole('button', { name: /^Play video:/ }).first().click()
  await expect.poll(() => videos.first().evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2)
  expect(await videos.nth(1).evaluate((v: HTMLVideoElement) => v.paused && v.currentTime === 0)).toBe(true)
  expect(streams.some((url) => url.endsWith('.m3u8'))).toBe(false)
})

test('a failed stream leaves a bounded explanation and original-post link', async ({ page }) => {
  await page.goto('/home/broken/')
  await page.getByRole('button', { name: /^Play video:/ }).click()
  await expect(page.locator('[data-note-video-status]')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('link', { name: 'On Bluesky' })).toHaveAttribute('href', 'https://bsky.app/profile/ciaranlyons.com')
})

test('no-JavaScript rendering retains images, file video controls, and stream source access', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/home/portrait/')
  await expect(page.locator('img')).toHaveAttribute('alt', 'portrait landscape illustration')
  await page.goto('/home/video/')
  await expect(page.locator('video')).toHaveAttribute('controls', '')
  await expect(page.locator('[data-note-play]')).toBeHidden()
  await page.goto('/home/hls/')
  await expect(page.getByRole('link', { name: 'On Bluesky' })).toBeVisible()
  await context.close()
})

test('homepage previews four images and links to the complete gallery', async ({ page }) => {
  await page.goto('/home/many/')
  await expect(page.locator('.note-media img')).toHaveCount(4)
  const all = page.getByRole('link', { name: 'View all 10 attachments' })
  await expect(all).toHaveAttribute('href', '/note/many/')
  await all.click()
  await expect(page.locator('.note-media img')).toHaveCount(10)
})

test('unsupported HLS capabilities offer the original post without trapping the player', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'MediaSource', { value: undefined, configurable: true })
    Object.defineProperty(window, 'ManagedMediaSource', { value: undefined, configurable: true })
    const original = HTMLMediaElement.prototype.canPlayType
    HTMLMediaElement.prototype.canPlayType = function (type: string) { return /mpegurl/.test(type) ? '' : original.call(this, type) }
  })
  await page.goto('/home/hls/')
  await page.getByRole('button', { name: /^Play video:/ }).click()
  await expect(page.locator('[data-note-video-status]')).toBeVisible()
  await expect(page.locator('[data-note-video-status] a')).toHaveAttribute('href', 'https://bsky.app/profile/ciaranlyons.com')
  await expect(page.locator('[data-note-play]')).toHaveCount(0)
})
