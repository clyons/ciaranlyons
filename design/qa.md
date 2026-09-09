# Found Quotes Design QA

Source of truth: `design/context.md`, `design/found-quotes-directions.md`, and `design/found-quotes-mock.html`.

## Final verdict

PREVIEW DEPLOYED — the selected Editorial Ledger direction is implemented across the archive, permalink, home page, and collection-Writing capability at `https://clyons-add-found-quotes-cont.ciaranlyons.pages.dev/found-quotes/`. The archive now contains Ciaran's 19 supplied quotations; the fictional records and mock Writing collection have been removed, and no `Preview content` labels remain.

## Direction match

- ✓ Full quotations, not generic cards, are the visual focus.
- ✓ The existing serif, mono metadata, orange accent, background, and hairline tokens are reused in both themes.
- ✓ Attribution and source remain secondary but readable; a quiet `#` marker provides each internal permalink without elevating the collection date.
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

## Long-quote follow-up study — 2026-09-08

Most external links returned HTTP 200. LinkedIn returned 999 and General Assembly/Positive Intelligence returned 403 to automated requests; those services commonly block automated clients, so this is not treated as a broken visitor-facing link.

## Feedly Links preview — 2026-09-07

Prototype: local static build on the `clyons/feedly-stars-to-til` branch

Source of truth: `.agent/execplans/2026-09-07-feedly-starred-links.md` plus the recorded visual/content/interaction theses.

### Verdict

READY FOR PREVIEW — the collection is intentionally populated with three clearly labeled mock Feedly stars. No real Feedly or ATproto write has occurred.

### Visual conformance

- ✓ The collection uses the site's existing serif/mono editorial system, orange accent, flat rules, and cardless layout.
- ✓ Desktop uses a two-column date/content ledger; mobile collapses cleanly into a single reading column.
- ✓ The Links introduction has one typographic focal point and restrained source/count context.
- ✓ Source attribution, local context, and outbound reading actions are visually distinct without competing card chrome.
- ✓ Dark mode inherits the existing color tokens; motion is limited to established link transitions and a two-pixel outbound-callout lift.

### Behavior and requirements

- ✓ Links is present and active in primary navigation; all six controls remain on one visible row at 320px and 390px.
- ✓ Title and “Notes & details” open the durable local permalink; “Read at…” opens the original target.
- ✓ Search filters title, source, author, and tags and exposes an explicit empty state.
- ✓ Year/month/day archives, Links RSS, combined RSS, and site search use local permalinks.
- ✓ Mock content is labeled on the index and detail pages so reviewers cannot mistake it for a real import.

### Accessibility sanity

- ✓ Each page has one `h1`, labelled primary navigation, a keyboard-focusable skip link, and visible global focus styles.
- ✓ Search has an accessible label and result count; Link rows remain semantic articles with ordinary anchors.
- ✓ Reduced-motion preferences collapse transitions through the existing global rule.
- ✓ The live filter-result count uses a polite status region for screen-reader feedback.
- Manual follow-up: automated checks do not replace a full screen-reader pass before production launch.

## Found Quotes long-quote study

Prototype: `/found-quotes/style-study/`

Source of truth: the follow-up criteria in `design/context.md` and `design/found-quotes-long-style.md`.

Visual:

- ✓ The first three quotes retain the existing display size: 53.76px desktop and approximately 32px mobile.
- ✓ The Great Silence exemplar shifts to a 35.84px/1.20 reading scale on desktop and 23.4px/1.24 on 390px mobile.
- ✓ The smaller size still uses the existing serif, orange opening mark, hairlines, attribution treatment, and page shell.
- ✓ The desktop permalink falls from 17 lines in production to 11 in the study; the 390px treatment falls from 23 to 17.
- ✓ Reading-tier vertical padding is reduced, and blank-line-separated passages use a compact `0.48em` paragraph gap instead of an empty text line.

Behavior and requirements:

- ✓ The study contains exactly the first four current quotes.
- ✓ The Great Silence `#` link opens its existing dated permalink, where the same reading treatment appears.
- ✓ Visible collection dates are removed from quote captions. A compact `#` link with `rel="bookmark"`, a tooltip, and an explicit accessible name preserves the permalink at the right edge.
- ✓ The Jony Ive quotation's blank-line-separated passage renders as two paragraph elements; the opening quotation mark remains attached only to the first.
- ✓ The Clay Shirky quotation replaces an ambiguous standalone `...` with editorial `[…]`, rendered compactly and announced to assistive technology as “Quoted passage omitted.”
- ✓ `waste products` renders as a real `<em>` element, backed by an exact, unique frontmatter substring that fails validation if it drifts from the quote text.
- ✓ Source and permalink links remain independent and keyboard reachable.
- ✓ Programmatic overflow checks report zero extra horizontal width at 1280px, 390px, and 320px on both the study and detail pages.

Accessibility sanity:

- ✓ Semantic figure, blockquote, cite, time, and heading structure is retained, with paragraph and emphasis semantics added to the quotation body.
- ✓ No color or contrast token changes were introduced.
- Manual screen-reader testing remains outside this visual type study.

Automated evidence:

- `npm test`: 43 passed.
- `npm run check`: 0 errors, warnings, or hints across 76 files.
- `npm run build`: 64 pages generated, including the isolated study route.
- `npm run test:ui:update`: 46 passed across desktop and mobile; the two Found Quotes baselines were refreshed for the intended paragraph, elision, and emphasis treatment.
- `npm run test:ui`: 46 passed again against the refreshed baselines.

Verdict: READY FOR REVIEW — no high-severity drift or functional blockers found. Classification remains explicit in the mock; approve the visual direction before choosing the production content-tier rule.

## Found Quotes automatic typography production QA — 2026-09-09

Prototype: local production build across `/found-quotes/`, `/found-quotes/style-study/`, compact and reading permalinks, Home, and `/writing/2026/09/07/found-quotes-wagmi/`

Source of truth: `.agent/execplans/2026-09-08-harmonize-found-quote-typography.md` and the approved three-length mockup.

### Verdict

READY TO MERGE — the approved compact, responsive, and reading treatments now come from one automatic rule used by every Found Quote renderer. There are no slug exceptions or client-side line measurements.

### Visual conformance

- ✓ The current collection resolves to 4 compact, 4 responsive, and 20 reading quotes.
- ✓ Compact quotes retain the original display scale: 53.76px at 1280px, 31.98px at 390px, and 30.4px at 320px.
- ✓ Responsive quotes match display type on desktop and the reading scale on mobile.
- ✓ Reading quotes use 32px at 1280px, 24.18px at 390px, and the 24px floor at 320px, with a 48rem measure and relaxed `1.2`/`1.26` line height.
- ✓ Home, archive, compact permalink, reading permalink, and WAGMI Writing baselines match the approved hierarchy. The latest 91-character Home quote intentionally uses three-line display type on desktop and reading type on mobile.
- ✓ Light desktop/mobile and dark mobile renders were inspected. The serif, opening mark, hairlines, attribution, and permalink treatments remain coherent.

### Behavior and requirements

- ✓ A pure server-side helper normalizes whitespace, counts Unicode code points, and treats multiple paragraphs as reading prose.
- ✓ Every display-sized quote stays within three actual rendered lines at 1280px and two at 390px and 320px across the complete collection.
- ✓ Every WAGMI Found Quote remains at least 1.25 times the surrounding Writing body size at all three reference widths.
- ✓ All checked archive, Home, Writing, and permalink pages have no horizontal overflow.
- ✓ Semantic paragraphs, editorial elision, emphasis, source links, and bookmark permalinks are unchanged.

### Accessibility sanity

- ✓ The existing figure, blockquote, figcaption, cite, link, heading, and focus behavior remains intact.
- ✓ Dark mobile reading text measures 16.25:1 against the page background; no color token changed.
- Manual follow-up: automated semantics and contrast checks do not replace a full screen-reader pass.

### Evidence

- `npm test`: 71 passed.
- `npm run lint`: 0 errors, 0 warnings, 0 hints across 104 files.
- `npx tsc --noEmit`: passed.
- `npm run build`: 4,067 pages generated and 68 page-specific social previews verified.
- `npx playwright test tests/ui/site.spec.ts`: 116 passed across desktop and mobile; affected Home and Found Quotes desktop baselines were refreshed and reviewed.
- Reviewed baselines: `found-quotes`, `home`, `writing-found-quotes`, `found-quote-compact`, and `found-quote-reading`, each at desktop and mobile sizes.
- Dark mobile capture: `.context/design/found-quotes-typography-production-dark-mobile.png`.

## Links production-readiness review — 2026-09-08

Prototype: local static build on `clyons/feedly-stars-to-til`

Source of truth: `.agent/execplans/2026-09-07-feedly-starred-links.md`, `design/research.md`, and `design/audit.md`.

### Verdict

READY TO MERGE — the archive retains the approved editorial-ledger direction, and the two final usability findings are fixed with no high-severity drift remaining.

### Visual and behavioral conformance

- ✓ The Links title, count/source context, cardless chronology, source attribution, and split local/outbound actions remain intact.
- ✓ Search is now a labelled landmark with a concise visible field prompt and explicit submit button. It remains a GET form that works without JavaScript and preserves the Link type filter.
- ✓ Year navigation wraps deliberately around the visible Search action rather than compressing or clipping it.
- ✓ Static previous/next navigation, 50-row archive bounds, 12-result Pagefind rendering, canonical URLs, RSS, and date archives remain unchanged.

### Responsive and accessibility sanity

- ✓ Year, Link-row action, and archive-pagination targets measure at least 44×44 CSS pixels at 1280px, 390px, and 320px.
- ✓ All three measured widths report `scrollWidth === clientWidth`.
- ✓ Visible focus, semantic search/navigation landmarks, keyboard access, reduced-motion handling, and light/dark theme behavior remain covered.
- Manual follow-up: automated checks and visual inspection do not replace a full screen-reader pass.

### Evidence

- `npm test`: 69 passed.
- `npm run lint`: 0 errors, 0 warnings, 0 hints across 102 files after the latest `main` merge.
- `npx tsc --noEmit`: passed.
- `npm run build`: 4,067 pages; 68 verified social previews; 2,662 Pagefind-indexed pages.
- `npm run test:ui`: 76 passed across desktop and mobile after intentional Links and merged-breadcrumb baseline updates.
- Final captures: committed `links-{desktop,mobile}-darwin.png` baselines plus gitignored 320px review capture under `.context/design/`.
