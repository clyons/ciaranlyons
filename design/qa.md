# Found Quotes Design QA

Source of truth: `design/context.md`, `design/found-quotes-directions.md`, and `design/found-quotes-mock.html`.

## Final verdict

PREVIEW DEPLOYED — the selected Editorial Ledger direction is implemented across the archive, permalink, home page, and collection-Writing capability at `https://clyons-add-found-quotes-cont.ciaranlyons.pages.dev/found-quotes/`. The archive now contains Ciaran's 19 supplied quotations; the fictional records and mock Writing collection have been removed, and no `Preview content` labels remain.

## Direction match

- ✓ Full quotations, not generic cards, are the visual focus.
- ✓ The existing serif, mono metadata, orange accent, background, and hairline tokens are reused in both themes.
- ✓ Attribution and source remain secondary but readable; dates are distinct internal permalinks.
- ✓ The Writing collection capability preserves Ciaran's introduction first and expands canonical quotes afterward in authored order; no collection is published until Ciaran provides its framing.
- ✓ Found Quotes remain secondary in the site hierarchy: homepage module and footer link, with no fifth primary-navigation link.

## Responsive and accessibility checks

- ✓ Archive, detail, home, and collection Writing were visually inspected at 1280px and 390px.
- ✓ Archive was visually inspected in light and dark themes.
- ✓ Programmatic overflow checks at 320px, 390px, and 1024px reported `scrollWidth === clientWidth`.
- ✓ Every checked page has one H1; archive records use `<figure>`, `<blockquote>`, and `<figcaption>`.
- ✓ Attribution sits outside `<blockquote>` and the cited work—not the speaker—is inside `<cite>`.
- ✓ Source and permalink links are independently focusable; mobile primary navigation retains its five-control, single-row contract.

## Automated evidence

- `npm test`: 42 passed.
- `npm run check`: 0 errors, 0 warnings, 0 hints across 75 files.
- `npm run build`: 63 pages generated, including 19 quote permalinks, date archives, both feeds, search, and sitemap entries.
- `npm run test:ui:update`: 44 passed in desktop and mobile projects; archive, home, and Writing baselines were refreshed for the real content set and removal of the mock Writing entry.
- Generated `search.json`, `feed.xml`, `found-quotes/feed.xml`, archive HTML, and sitemap XML were inspected for the real quote records and absence of preview fixtures.
- All 19 source URLs were checked. Current publisher/author pages are used where available; retired Clay Shirky pages use successful Internet Archive captures, and the Frank Chimero record explicitly marks its exact original page as unidentified.
- GitHub Actions preview run `34173524953` succeeded in 1m6s; the immutable deployment and stable alias both returned HTTP 200 for the homepage, archive, Ben Thompson permalink, dedicated feed, search index, and Writing archive.

## Captures

Implementation review captures are kept in `.context/design/`: `found-quotes-writing-{desktop,mobile}.png`, `found-quote-detail-{desktop,mobile}.png`, and `found-quotes-dark-{desktop,mobile}.png`. Committed Playwright baselines cover the archive in both desktop and mobile projects.
