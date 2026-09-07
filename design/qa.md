# Found Quotes Design QA

Source of truth: `design/context.md`, `design/found-quotes-directions.md`, and `design/found-quotes-mock.html`.

## Final verdict

READY FOR PREVIEW — the selected Editorial Ledger direction is implemented across the archive, permalink, home page, and collection Writing. The branch intentionally contains fictional records labelled `Preview content`; those records are not approved production content and must be removed or replaced before merge.

## Direction match

- ✓ Full quotations, not generic cards, are the visual focus.
- ✓ The existing serif, mono metadata, orange accent, background, and hairline tokens are reused in both themes.
- ✓ Attribution and source remain secondary but readable; dates are distinct internal permalinks.
- ✓ The Writing collection preserves Ciaran's introduction first and expands canonical quotes afterward in authored order.
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
- `npm run build`: 53 pages generated, including archive/date/detail routes, both feeds, search, and sitemap entries.
- `npm run test:ui:update`: 46 passed in desktop and mobile projects; Found Quotes baselines were added and existing baselines updated for the new footer/home content.
- Generated `search.json`, `feed.xml`, `found-quotes/feed.xml`, Writing HTML, and sitemap XML were inspected for the mock quote records and collection expansion.

## Captures

Implementation review captures are kept in `.context/design/`: `found-quotes-writing-{desktop,mobile}.png`, `found-quote-detail-{desktop,mobile}.png`, and `found-quotes-dark-{desktop,mobile}.png`. Committed Playwright baselines cover the archive in both desktop and mobile projects.
