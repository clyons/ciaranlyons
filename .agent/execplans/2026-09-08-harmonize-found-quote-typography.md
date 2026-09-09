# Harmonize Found Quote typography by quotation length

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Found Quotes should preserve two complementary reading modes everywhere they appear. A quotation that fits within two lines should remain large and impactful. A quotation that runs longer should switch to a smaller, calmer reading scale, especially on narrow screens. In a Writing entry, that smaller scale must still remain visibly larger than Ciaran's surrounding body copy.

After this change, quotation typography will be selected automatically from the quotation text and paragraph structure. No route or content slug will special-case one quote. The same rule will apply on the Found Quotes archive and date archives, standalone permalinks, the home page, the type-study page, and Found Quotes embedded in Writing. Automated browser checks will fail if a quote assigned the display treatment exceeds two rendered lines at the supported reference widths.

## Progress

- [x] (2026-09-08 23:47Z) Reviewed the Found Quotes ExecPlan, design context, long-quote study, design QA, relevant merged PRs, current renderer, routes, CSS, content lengths, and visual tests.
- [x] (2026-09-08 23:47Z) Measured every current quotation at 1280px, 390px, and 320px in the archive, plus the home and WAGMI Writing contexts.
- [x] (2026-09-08 23:47Z) Completed the initial implementation proposal and acceptance criteria in this ExecPlan.
- [ ] Implement automatic typography tiers and remove explicit route-level scale selection.
- [ ] Harmonize the display and reading scales across archive, detail, home, and Writing contexts.
- [ ] Add unit, rendered-line, relative-size, overflow, and visual-regression coverage.
- [ ] Update the design records with final measured results and complete validation.

## Surprises & Discoveries

- Observation: PR #43 created a generally named `reading` treatment but applied it by hard-coded slug only to `great-silence-and-technological-efficiency` on its standalone permalink and the type-study page.
  Evidence: `src/pages/found-quotes/[year]/[month]/[day]/[slug].astro` and `src/pages/found-quotes/style-study.astro` compare the quote slug directly; `FoundQuote.astro` otherwise defaults `scale` to `display`.

- Observation: The top-level archive, date archives, home page, and Writing collections never request the reading treatment. Even the Great Silence quote is oversized on the archive because the exception exists only in two callers.
  Evidence: all other `<FoundQuote>` callers omit `scale`; live browser measurement found `reading: false` for all 28 archive records and all four WAGMI Writing records.

- Observation: At the current display size, exactly six archive quotes fit in no more than two lines at 1280px. They are single-paragraph quotes no longer than 85 characters. At 390px and 320px, exactly four fit in no more than two lines; they are single-paragraph quotes no longer than 39 characters.
  Evidence: Playwright `Range.getClientRects()` measurements against the rendered archive at 1280px, 390px, and 320px. The 85-character `this-i-saw-this-i-experienced` quote occupies two desktop lines; the 91-character `you-can-learn-anything` quote occupies three.

- Observation: Paragraph structure matters independently of character count. The 81-character `world-is-not-yet-done` quote occupies four desktop lines and six mobile lines because its authored paragraph breaks create distinct lines.
  Evidence: the same rendered-line measurement and the blank-line-preserving logic in `FoundQuote.astro`.

- Observation: Current oversized cases are substantial, not marginal. Archive quotations reach 17 display-sized lines at 1280px and 28 at 320px. The 492-character WAGMI quote reaches 12 display-sized lines at 1280px and 22 at 390px.
  Evidence: measured current production markup before implementation.

- Observation: PR #64 reduced the one reading tier to `clamp(1.35rem, 5.5vw, 1.6rem)` on mobile. At 390px that computes to 21.45px, while Writing body copy computes to 18.4px, a difference of only about 17 percent.
  Evidence: current `src/styles/global.css` and computed styles on the WAGMI Writing page.

- Observation: Only one ExecPlan governs the Found Quotes feature itself. The later breadcrumb ExecPlan touches the quote-detail shell but does not change quotation scale. Later typography changes were recorded in design documents and PR bodies rather than a dedicated ExecPlan.
  Evidence: `.agent/execplans/2026-09-07-found-quotes.md`, `.agent/execplans/2026-09-08-content-detail-breadcrumbs.md`, and merged PR metadata.

## Decision Log

- Decision: Replace the `scale` prop and slug checks with an automatic, server-rendered typography tier derived from normalized text length and paragraph count.
  Rationale: A content-derived tier applies to every present and future quote in every renderer. Browser-side line measurement would cause font-loading layout shifts and would make the static page depend on JavaScript; a manually maintained slug list would repeat the current failure.
  Date/Author: 2026-09-08 / Codex

- Decision: Use three stable tiers: `compact`, `responsive`, and `reading`. A single-paragraph quote of at most 40 Unicode characters is `compact` and keeps display type at every supported width. A single-paragraph quote of 41 through 85 characters is `responsive` and uses display type above the mobile breakpoint but reading type at 760px and below. Every other quote is `reading` at all widths.
  Rationale: These boundaries reproduce the observed two-line cutoff for all current content at 1280px, 390px, and 320px. Treating multi-paragraph material as reading prose respects authored structure that raw character count misses.
  Date/Author: 2026-09-08 / Codex

- Decision: Keep the current display scale and serif treatment for eligible quotes. Raise the mobile reading floor to `1.5rem` (24px), use a relaxed reading line height, and keep the desktop reading range clearly above article body text.
  Rationale: Short quotes retain their approved impact. A 24px minimum is about 30 percent larger than the current 18.4px Writing body copy at the narrowest reference widths, while remaining materially smaller than the 30.4–31.98px mobile display scale.
  Date/Author: 2026-09-08 / Codex

- Decision: Express context sizes and tier selection through Found Quote CSS custom properties rather than competing selector order.
  Rationale: The current `--writing`, `--reading`, Home, and mobile selectors can override one another by source order. Shared variables make the chosen tier explicit and let each context define display and reading tokens without specificity accidents.
  Date/Author: 2026-09-08 / Codex

- Decision: Keep automatic classification conservative and enforce the visual promise with browser tests that count actual rendered line boxes.
  Rationale: Character count is a stable build-time input but only an approximation of font metrics and word wrapping. Testing every display-tier quote against actual typography prevents future copy, font, width, or breakpoint changes from silently exceeding two lines.
  Date/Author: 2026-09-08 / Codex

## Outcomes & Retrospective

Planning outcome: the audit identified a generalization gap rather than a need for another isolated font-size adjustment. Implementation and final retrospective remain pending approval.

## Context and Orientation

`content/found-quotes/*.md` contains one quote per Markdown file. `src/lib/content.ts` loads those files into `FoundQuoteEntry` objects. `src/components/FoundQuote.astro` is the shared semantic renderer for all contexts and currently accepts an optional `scale` prop. It splits blank-line-separated content into paragraphs and emits a `<figure>`, `<blockquote>`, attribution `<figcaption>`, source, and permalink.

Found Quote archive routes live under `src/pages/found-quotes/`. The standalone detail route and `src/pages/found-quotes/style-study.astro` currently hard-code the Great Silence slug as the only reading-scale record. `src/pages/index.astro` renders the latest eligible quote with `context="home"`. `src/pages/writing/[year]/[month]/[day]/[slug].astro` resolves a Writing entry's ordered `foundQuotes` frontmatter and renders each with `context="writing"`.

The quotation styles are in `src/styles/global.css`. The default archive display scale is `clamp(2.35rem, 4.2vw, 4rem)`. Writing and Home provide smaller display overrides. `.found-quote--reading` currently supplies a reduced measure, size, line height, spacing, and wrapping treatment, but it is not selected automatically. Article body copy is `.prose` at `clamp(1.15rem, 0.9vw + 0.95rem, 1.3rem)`.

The historical sequence relevant to typography is:

- PR #42 introduced the large shared display scale and separate Home and Writing sizes.
- PR #43 prototyped and approved a reading scale, semantic paragraphs, elisions, emphasis, and compact permalinks, but left classification explicit and used one hard-coded slug.
- PRs #44, #46, #50, #52, and #57 corrected or added content, including many quotes longer than the one prototype exemplar. PR #52 also introduced the current WAGMI Writing collection.
- PRs #48, #51, #53, #59, #60, #61, and #62 changed discoverability, ordering, slugs, tests, or the surrounding detail shell without generalizing typography.
- PR #64 reduced the reading scale on desktop and mobile but retained the one-slug selection model.
- PRs #68 and #70 adjusted nearby home rhythm and Found Quote counts, not quotation scale.

The original `.agent/execplans/2026-09-07-found-quotes.md` requires generous serif quotation type, readable measure, responsive handling, and verification at 390px and 320px. `design/found-quotes-long-style.md` explicitly says production should use a stable editorial field or documented length tier instead of browser-side line measurement. This plan fulfills that deferred requirement with an automatic documented tier.

## Plan of Work

### Milestone 1: Centralize automatic tier classification

Add a named tier type and pure helper to `src/lib/found-quotes.ts`. Normalize whitespace for character counting, preserve blank-line paragraph boundaries, count Unicode code points rather than UTF-16 code units, and return `compact`, `responsive`, or `reading` using the approved boundaries. Add boundary, whitespace, Unicode, and multi-paragraph cases to `src/lib/found-quotes.test.mjs`.

Update `src/components/FoundQuote.astro` to calculate the tier itself, emit a stable class and `data-quote-tier`, and remove the public `scale` prop. Update the standalone quote route and type-study route to remove the Great Silence slug checks. Make the type study choose representative current quotes through the tier helper, so it remains a useful diagnostic without becoming another exception list.

This milestone succeeds when `rg -n "great-silence-and-technological-efficiency|scale=" src/pages/found-quotes src/components/FoundQuote.astro` finds no presentation exception and every `<FoundQuote>` caller gets the same automatic behavior.

### Milestone 2: Harmonize responsive typography tokens

Refactor the Found Quote portion of `src/styles/global.css` around custom properties for display size, reading size, measure, line height, letter spacing, padding, and paragraph gap. Use the display tokens for `compact` everywhere and for `responsive` above 760px. At 760px and below, switch `responsive` to the reading tokens. Use reading tokens for `reading` everywhere.

Retain the current large display treatment for eligible archive/detail quotes and the existing distinct Home and Writing display maxima. Raise the narrow-screen reading floor to 24px and ensure the Writing reading size remains at least 25 percent larger than computed `.prose` body copy at 1280px, 390px, and 320px. Preserve the orange opening mark, serif family, attribution, source, permalink, semantic paragraphs, and elision treatment.

This milestone succeeds when short quotes remain visually forceful, medium quotes change scale only on mobile, long quotes read as prose at all widths, and CSS source order cannot cause a Writing context to overwrite the selected reading tier.

### Milestone 3: Protect the visual rule and update records

Replace the one-exemplar assertion in `tests/ui/site.spec.ts` with tier-wide checks. At 1280px, 390px, and 320px, count rendered line boxes for every quote receiving display typography and require no more than two lines. Verify long quotes compute smaller than the display reference, retain semantic paragraph and emphasis behavior, and have no horizontal overflow.

On the WAGMI Writing page, compare each Found Quote's computed font size with `.prose` and require a ratio of at least 1.25. Add desktop and mobile visual baselines for the WAGMI Writing detail and representative short and long Found Quote permalinks. Refresh the existing Home and Found Quotes archive baselines. Inspect light mode at both standard Playwright viewports and add focused dark-mode computed-style/contrast checks if existing theme coverage does not already exercise the changed tokens.

Update `design/context.md`, `design/found-quotes-long-style.md`, `design/qa.md`, and `design/audit.md` with the generalized rule, final measurements, and validation evidence. Add a concise note to `docs/operations/publish-found-quote.md` explaining that typography is automatic and authors must not add presentation metadata or manual line breaks merely to force a tier.

This milestone succeeds when visual snapshots show the intended hierarchy in archive, detail, Home, and Writing contexts and the browser assertions prevent any display-tier quote from exceeding two lines at supported reference widths.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/helsinki`:

    git status --short
    npm test
    npm run lint
    npx tsc --noEmit
    npm run build
    npx playwright test tests/ui/site.spec.ts --update-snapshots
    npx playwright test tests/ui/site.spec.ts
    git diff --check
    rg -n "great-silence-and-technological-efficiency|scale=" src/pages/found-quotes src/components/FoundQuote.astro

Expected results: all unit and Playwright tests pass; Astro reports zero errors, warnings, and hints; the production build completes with all pages and social previews; the final `rg` command returns no presentation-specific slug or scale prop; and only files named in this plan plus intended snapshot images are changed.

Before committing or opening a PR, keep the user's unrelated changes to `content/projects/ciaranlyons-com.md` and `content/projects/found-quotes.md` unstaged. Validate the PR body against `.github/pull_request_template.md` and `.github/workflows/pr-quality.yml` as required by `AGENTS.md`.

## Validation and Acceptance

- A single-paragraph quote of 40 characters or fewer uses display typography at 1280px, 390px, and 320px.
- A single-paragraph quote of 41–85 characters uses display typography at 1280px and reading typography at 390px and 320px.
- A quote over 85 characters or containing multiple authored paragraphs uses reading typography at every supported width.
- Every quote receiving display typography renders in no more than two actual line boxes at 1280px, 390px, and 320px. The test evaluates the complete current collection rather than named fixtures only.
- Current short examples such as `live-is-the-shortcut-to-fomo` retain the existing large, impactful treatment.
- Current long examples such as `great-silence-and-technological-efficiency`, `you-are-not-late`, and `right-to-ignore-you` use reading typography on archives, permalinks, and Writing collections without caller configuration.
- The latest Home quote follows the same automatic rule; context changes size tokens but not classification logic.
- Every Found Quote inside a Writing entry computes to at least 1.25 times the surrounding `.prose` font size at 1280px, 390px, and 320px.
- Semantic `<figure>`, `<blockquote>`, paragraph, `<figcaption>`, `<cite>`, emphasis, elision, and permalink behavior is unchanged.
- Archive, permalink, Home, and Writing pages have no horizontal overflow at 1280px, 390px, or 320px.
- Existing and new desktop/mobile visual baselines pass after intentional refreshes.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npx playwright test tests/ui/site.spec.ts` all exit successfully.

## Idempotence and Recovery

The tier helper, component classes, CSS refactor, documentation, and tests are deterministic source edits and safe to rerun. Snapshot generation overwrites only named Playwright baselines and must be reviewed visually before staging.

If a threshold causes a display-tier quote to exceed two rendered lines, first confirm fonts and viewport match the test configuration. Then lower the relevant global boundary in the pure helper and update its unit tests; do not add a slug exception. If the reading tier approaches Writing body size, adjust the shared reading token and keep the ratio assertion. If implementation is interrupted, restore only files named in this plan or continue from the checked Progress section. Never restore or stage the user's unrelated project-order files.

## Artifacts and Notes

- Historical PRs reviewed: #42, #43, #44, #46, #48, #50, #51, #52, #53, #57, #59, #60, #61, #62, #64, #68, and #70.
- Relevant ExecPlans reviewed: `.agent/execplans/2026-09-07-found-quotes.md` and `.agent/execplans/2026-09-08-content-detail-breadcrumbs.md`. The latter affects only the detail-page shell and breadcrumb.
- Relevant design records reviewed: `design/context.md`, `design/found-quotes-directions.md`, `design/found-quotes-long-style.md`, and the Found Quotes sections of `design/qa.md` and `design/audit.md`.
- Current collection: 28 Found Quote Markdown records, ranging from 31 to 564 normalized characters.
- Current archive display-scale line range: 1–17 lines at 1280px, 2–24 lines at 390px, and 2–28 lines at 320px. The Great Silence record itself is 13, 23, and 26 archive lines respectively because archive callers never select its reading scale.
- Current WAGMI display-scale line range: 3–12 lines at 1280px and 5–22 lines at 390px.
- Current Home latest quote: 91 characters and 3 lines at 1280px, 5 lines at 390px, and 5 lines at 320px.
- Current Great Silence detail reading size: 32px at 1280px, 21.45px at 390px, and 21.6px at 320px.

## Interfaces and Dependencies

Add to `src/lib/found-quotes.ts`:

    export type FoundQuoteTypographyTier = 'compact' | 'responsive' | 'reading'

    export function foundQuoteTypographyTier(text: string): FoundQuoteTypographyTier

`FoundQuote.astro` will continue accepting `quote: FoundQuoteEntry` and optional `context: 'archive' | 'detail' | 'home' | 'writing'`, but will remove `scale?: 'display' | 'reading'`. The rendered `<figure>` will expose `found-quote--compact`, `found-quote--responsive`, or `found-quote--reading` plus `data-quote-tier` for stable styling and testing.

No new npm package, browser runtime, content field, database, external service, credential, or deployment change is required.

## Change Log

- 2026-09-08: Created the plan after reviewing Found Quote history and measuring every current quote across archive, detail, Home, and Writing contexts.
