# Add a curated Found Quotes stream

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Add **Found Quotes** as a small, deliberately curated publishing stream for words by other people that Ciaran wants to remember. It is inspired by Kevin Kelly's practice of collecting sentences that made him think, but it must use this site's own static, Git-backed publishing model and restrained editorial design.

After this change, Ciaran can add one Markdown file for one quotation, with explicit attribution and source provenance. Visitors can browse the full quotations at `/found-quotes/`, open stable date-foldered permalinks such as `/found-quotes/2026/09/07/example-slug/`, encounter the newest quote on the home page, find quotes through site search, and subscribe through the main RSS feed or `/found-quotes/feed.xml`. A Writing entry can also compose an ordered collection of Found Quotes, adding Ciaran's title, description, and framing without copying the quotation records.

Found Quotes are curation, not Ciaran's authored Writing and not ephemeral Notes. The visual treatment must make that distinction unmistakable: the quotation is the focal content, its speaker and source sit outside the quoted text, and Ciaran is presented as the collector rather than the author.

## Progress

- [x] (2026-09-07 22:27Z) Audited the repository's content loaders, routes, URL conventions, home page, primary navigation, search, feeds, content validation, tests, visual baselines, publishing documentation, and prior architecture/design ExecPlans.
- [x] (2026-09-07 22:27Z) Reviewed Kevin Kelly's original and later Found Quotes collections and current semantic guidance for quotation markup.
- [x] (2026-09-07 22:27Z) Completed the initial content, URL, presentation, discovery, and publishing-workflow design in this ExecPlan.
- [x] (2026-09-07 22:38Z) Evaluated site-native Notes as the composition layer for ordered Found Quote collections.
- [x] (2026-09-07 22:45Z) Revised the design so Writing—not Notes—is the default composition layer for a published collection of Found Quotes.
- [x] (2026-09-07 23:36Z) Implemented and unit-tested the Found Quote content contract, Writing reference resolver, and Standard.site Writing expansion.
- [x] (2026-09-07 23:36Z) Implemented the archive, date archives, quote permalink, Writing collection, home-page treatment, footer discovery, search, feeds, and sitemap integration.
- [x] (2026-09-07 23:36Z) Added the authoring runbook and repository instructions, plus clearly labelled fictional preview fixtures requested for design review.
- [x] (2026-09-07 23:38Z) Completed automated checks and desktop/mobile visual QA in both light and dark themes.
- [x] (2026-09-07 23:45Z) Pushed `clyons/add-found-quotes-content` and completed GitHub Actions preview run `34170972375`; the branch and immutable previews passed live smoke checks.
- [x] (2026-09-08 00:27Z) Replaced all fictional preview fixtures with Ciaran's 19 real Found Quotes, researched missing provenance, removed the mock collection Writing, and refreshed automated and visual coverage with no preview labels remaining.

## Surprises & Discoveries

- Observation: The site has four different editorial roles already, even though they share one Markdown-centric implementation: Writing is authored long-form work, Notes are short posts syndicated from ATProto, TILs are practical knowledge organized by source topic, and Projects are compact site-native metadata.
  Evidence: `CLAUDE.md`, `src/lib/content.ts`, `src/lib/atproto.ts`, and the route trees under `src/pages/writing/`, `src/pages/notes/`, `src/pages/til/`, and `src/pages/projects.astro`.

- Observation: The primary header is intentionally constrained to four links plus the theme control, and a Playwright assertion verifies that exactly those five controls remain on one row at 320px and 390px widths.
  Evidence: `src/layouts/BaseLayout.astro`, the `@media (max-width: 760px)` navigation grid in `src/styles/global.css`, and `tests/ui/site.spec.ts`.

- Observation: Date-bearing content uses folder-addressable canonical URLs and explicit year, month, and day archive routes. TIL topics organize source files but do not appear in its canonical URL.
  Evidence: `datedPath()` and `dateParts()` in `src/lib/content.ts`, the route trees under `src/pages/writing/`, `src/pages/notes/`, and `src/pages/til/`, and `docs/operations/publish-til.md`.

- Observation: Kevin Kelly's early Found Quotes posts collected several quotations in periodic blog posts, while a later collection describes the practice as saving sentences that provoke thought and ends by saying he records them as reminders. Across both forms, attribution and source links are integral rather than decorative.
  Evidence: `https://kk.org/thetechnium/found-quotes/`, `https://kk.org/thetechnium/found-quotes-10/`, and `https://kk.org/cooltools/come-from-away-pocket-radio-true-country-sizes/`.

- Observation: Correct semantic HTML keeps an extended quotation inside `<blockquote>`, puts the human-readable attribution outside it, uses `<cite>` for the title of the cited work rather than the person's name, and may put the source URL in the blockquote's `cite` attribute.
  Evidence: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/blockquote` and `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/cite`.

- Observation: The current baseline is healthy before feature work.
  Evidence: On 2026-09-07, `npm test` passed 34 tests and `npm run check` reported 0 errors, 0 warnings, and 0 hints across 66 files.

- Observation: Notes support both `bluesky` and `local` sources, but their primary role on this site is short observations backed by ATProto text, facets, and media. A Bluesky record cannot carry a repository-specific relationship to Found Quote records.
  Evidence: `NoteEntry` and `loadLocalNotes()` in `src/lib/content.ts`, remote construction and merging in `src/lib/atproto.ts`, and the Notes archive/detail routes.

- Observation: Writing already provides the editorial apparatus a quote collection needs: a title, description, authored Markdown framing, dated permalink, archive presence, feed entry, search result, and optional Standard.site document record.
  Evidence: `WritingEntry` and `getWriting()` in `src/lib/content.ts`, routes under `src/pages/writing/`, and `scripts/publish-standard-site.mjs`.

- Observation: Two incomplete attributions in the supplied material could be resolved from primary or first-party records: Daniel Ek credits the company-value line to Spotify co-founder Martin Lorentzon, and Letters of Note identifies the Aurora 7 letter's author as Marion Scott Carpenter. Several retired source URLs required current publisher pages, author mirrors, or archived copies of the original pages.
  Evidence: Spotify's Q1 2025 prepared remarks, Letters of Note's current letter page, and the `sourceUrl` values in `content/found-quotes/`.

## Decision Log

- Decision: Model one found quote per Git-backed Markdown file under `content/found-quotes/<slug>.md`.
  Rationale: Individual records make addition, correction, search, feed inclusion, and stable citation straightforward. They also fit the repository's ownership-oriented content model better than storing batches of quotes in a single essay-like post.
  Date/Author: 2026-09-07 / Codex

- Decision: Treat the Markdown body as the exact quotation text and reserve front matter for `attribution`, `source`, optional `sourceUrl`, optional `via`/`viaUrl`, `date`, optional `updated`, and optional `tags`.
  Rationale: The quote remains easy to read and edit in source control. Separating provenance from the text prevents attribution from being accidentally rendered as part of the quotation. The body will be rendered as escaped text, not arbitrary Markdown, so punctuation and line breaks remain faithful and quoted material cannot inject markup.
  Date/Author: 2026-09-07 / Codex

- Decision: Require non-empty quotation text, attribution, source label, and date; validate all supplied URLs as HTTP(S); and reject duplicate canonical identities.
  Rationale: A quote collection is only useful if provenance is first-class. `source` remains required even when the honest value is `Source unknown`; a URL is optional because books, talks, and offline conversations may not have an authoritative web address.
  Date/Author: 2026-09-07 / Codex

- Decision: Use `/found-quotes/YYYY/MM/DD/<slug>/` for canonical item URLs and provide `/found-quotes/`, year, month, and day archives.
  Rationale: The human name is preserved in the route, while the date-folder behavior matches every other dated stream on the site and keeps parent paths browseable.
  Date/Author: 2026-09-07 / Codex

- Decision: Render each quote as a semantic `<figure>` containing `<blockquote>` and `<figcaption>`, with attribution, cited work/source, optional discovery path (`via`), and a separate internal permalink/date.
  Rationale: The archive should let visitors read the quote without opening a generic title row. A non-linked container also permits both an external source link and internal permalink without nested anchors, following the same concern already handled for rich-text Notes.
  Date/Author: 2026-09-07 / Codex

- Decision: Keep the existing four-item primary navigation unchanged. Add site-wide access through a subdued latest-quote section on the home page, a `Found Quotes` footer link, search, the combined feed, and a dedicated feed.
  Rationale: A fifth text link would break the deliberately tested mobile header geometry and give a secondary curated stream more weight than TIL. The selected surfaces make the stream discoverable without disturbing the site's hierarchy.
  Date/Author: 2026-09-07 / Codex

- Decision: Keep standalone Found Quote records out of Standard.site document publishing and ATProto Notes sync.
  Rationale: Individual records are quotations collected by Ciaran, not original Writing documents or syndicated posts. A Writing entry that composes them still follows the normal Writing publication contract described below.
  Date/Author: 2026-09-07 / Codex

- Decision: Do not add topics, author pages, filters, a CMS, a database, or a quote-entry CLI in the first version.
  Rationale: The expected collection is initially small, global search already exists, and the repository's current manual Markdown workflow is sufficient. Optional tags preserve a migration path if the archive later needs facets.
  Date/Author: 2026-09-07 / Codex

- Decision (superseded): Let a local Note reference an ordered list of Found Quotes through `foundQuotes` front matter containing stable quote slugs.
  Rationale: This would preserve atomic quote records, but it gives a durable editorial collection to a content type whose main role is short, often Bluesky-backed observations.
  Date/Author: 2026-09-07 / Codex

- Decision: Use Writing as the default composition layer for a published collection of Found Quotes. Extend Writing front matter with an optional ordered `foundQuotes` list of stable quote slugs.
  Rationale: The selection, ordering, title, description, and connective prose are Ciaran's authored editorial work even though the quoted words are not. Writing already has the correct archive, permalink, metadata, feed, and interoperability behavior. References avoid duplication and leave each Found Quote as the single correction point for its text and provenance.
  Date/Author: 2026-09-07 / Codex

- Decision: Keep Notes unchanged. A Note may casually link to a Found Quote or react to one, but a named, ordered collection belongs in Writing.
  Rationale: This preserves the site's existing distinction: Notes are short observations; Writing is a deliberate published artifact. It also avoids site-only fields that cannot round-trip through the current ATProto Note source.
  Date/Author: 2026-09-07 / Codex

- Decision: Standalone Found Quote records remain outside Standard.site, but a Writing collection is published as a normal Standard.site document whose `textContent` includes its framing plus expanded quote text, attribution, and source.
  Rationale: The standalone records are curation rather than documents authored by Ciaran. The collection itself is an authored Writing entry, and its interoperable representation must not omit material visible on the canonical page.
  Date/Author: 2026-09-07 / Codex

- Decision: Do not commit a fabricated or borrowed starter quote merely to populate the layout.
  Rationale: The collection should begin with an intentional selection whose exact wording, attribution, and source Ciaran approves. Until then, the archive will have a quiet empty state and the conditional home-page module will remain absent.
  Date/Author: 2026-09-07 / Codex

- Decision (supersedes the no-fixture decision for this preview branch): Include three fictional Found Quotes and one collection Writing, all explicitly marked as preview content.
  Rationale: Ciaran explicitly asked to begin with a mock and carry it through a deployed preview. The `preview: true` marker makes the status visible in the UI, while the runbook and QA record make clear that these fixtures must be removed or replaced with approved real quotations before merge.
  Date/Author: 2026-09-07 / Codex

- Decision (supersedes the temporary fixture decision): Replace the three fictional records with all 19 supplied Found Quotes and remove the fictional collection Writing without creating a replacement collection.
  Rationale: The supplied quotations are the approved atomic content. A Writing collection needs Ciaran's own title, selection, order, and framing, none of which should be inferred from a raw source list. The Frank Chimero record explicitly says that its original page is unidentified rather than presenting uncertain provenance as fact.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

The complete feature is deployed to a branch preview. Found Quotes are a distinct but intentionally secondary editorial stream: durable and searchable like Writing and TIL, concise like Notes, and explicit that the words belong to someone else. Writing composes ordered groups of canonical quote records; its title, description, selection, and framing are Ciaran's contribution, while each Found Quote remains the single correction point for quoted text and provenance.

The implementation includes all date archives and permalinks, a conditional home module, footer navigation, dedicated and combined RSS, search and sitemap integration, semantic quote markup, Standard.site expansion for collection Writing, authoring documentation, automated coverage, and responsive visual baselines. The primary navigation and Notes/ATProto contracts remain unchanged. The preview now contains the 19 supplied real quotations and no fictional fixtures or preview labels. The collection capability remains available, but no Writing collection is published until Ciaran supplies its editorial framing.

## Context and Orientation

This is an Astro 7 static site. `astro.config.mjs` sets `output: 'static'`, `trailingSlash: 'always'`, the canonical site origin, and sitemap generation. Source content is owned in the root `content/` directory. `src/lib/content.ts` discovers Markdown with `fast-glob`, parses front matter with `gray-matter`, validates dates and path segments through `src/lib/content-validation.ts`, derives dated URL fields, and memoizes each collection for a build.

The shared shell in `src/layouts/BaseLayout.astro` owns metadata, the four-link primary navigation, theme control, footer, and global RSS discovery. `src/pages/index.astro` composes the newest Note, newest Writing entry, and selected Projects. `src/styles/global.css` implements a cardless editorial design using the existing serif, sans, mono, hairline, background, and accent tokens; it also contains the mobile navigation layout that must not regress.

Top-level archive and dynamic date routes live under `src/pages/`. Writing, Notes, and TIL each implement `index.astro`, year/month/day archives, and a final item route. The new `src/pages/found-quotes/` tree should follow that route convention while using quote-specific presentation rather than copying the generic Writing row.

`src/lib/search.ts` builds `/search.json`; `src/pages/search.astro` renders it in the browser. `src/lib/feeds.ts` provides safe RSS serialization; `src/pages/feed.xml.ts` combines dated streams, and stream-specific endpoints live below their route directories. `tests/ui/site.spec.ts` performs route, keyboard, mobile navigation, divider, and visual regression checks. Unit tests use Node's built-in test runner through `npm test`.

The canonical content shape is:

    ---
    attribution: "Person or organization credited with the words"
    source: "Work, event, post, or other human-readable source"
    sourceUrl: "https://authoritative.example/source"
    via: "Optional place or person through which Ciaran found it"
    viaUrl: "https://optional.example/discovery-path"
    date: 2026-09-07
    updated: 2026-09-07
    tags:
      - systems
      - work
    ---

    The exact quotation goes here. Do not prefix it with Markdown's `>` marker;
    the page component supplies the semantic blockquote.

`date` means the date the quote entered this collection, not the historical date on which it was first said or published. Historical detail belongs in `source`. `updated` changes only when the quote or provenance is corrected. `sourceUrl`, `via`, `viaUrl`, `updated`, and `tags` are optional; all other shown fields are required. If `viaUrl` is present, `via` must also be present.

A collection Writing entry keeps Ciaran's own prose in the Markdown body and references canonical quotes in display order:

    ---
    title: "Found Quotes: Stewardship"
    description: "A handful of ideas about caring for outcomes without controlling everything."
    date: 2026-09-07
    foundQuotes:
      - first-stable-quote-slug
      - second-stable-quote-slug
    ---

    An introduction or connective note from Ciaran explaining why these words belong together.

The Writing entry owns the framing and order; each Found Quote file remains the sole owner of its quoted text, attribution, source, and permalink. A Writing entry without `foundQuotes` behaves exactly as it does today.

## Plan of Work

### Milestone 1: Define and validate the content contract

Add a `FoundQuoteEntry` interface and `getFoundQuotes(): Promise<FoundQuoteEntry[]>` to `src/lib/content.ts`. The loader will discover `content/found-quotes/*.md`, validate the filename as `slug`, require trimmed body text plus the required front-matter strings, validate date and optional URLs, derive `year`, `month`, `day`, and `url`, assert unique URLs, and sort newest first. It should expose a small helper for the consistently derived UI/feed/search title and a plain-text meta-description excerpt without creating a fake editorial headline.

Add narrowly scoped validation helpers to `src/lib/content-validation.ts` rather than silently accepting missing required values through the existing `asString()` fallback. Extend `src/lib/content-validation.test.mjs` or add `src/lib/found-quotes.test.mjs` to prove required fields, calendar validation, safe URL handling, `viaUrl` pairing, sorting, and duplicate rejection. Keep the Writing, TIL, and Project contracts unchanged.

Extend `WritingEntry` with `foundQuoteSlugs: string[]`. `loadWriting()` reads the optional `foundQuotes` array, validates every value as a path-safe slug, and rejects duplicates within one Writing entry. Add a deterministic resolver that accepts a Writing entry's ordered slugs and the complete quote collection, returns records in the authored order, and fails the build with the Writing identity plus missing slug if a reference is broken. Add tests for order preservation, duplicate references, missing references, and unchanged behavior for ordinary Writing entries.

This milestone succeeds when valid fixture data becomes a typed, date-sorted `FoundQuoteEntry`, malformed provenance fails with the source filename in the error, an empty `content/found-quotes/` directory produces an empty collection rather than a build failure, and a Writing entry either resolves all referenced quote slugs in authored order or fails with an actionable error.

### Milestone 2: Add semantic archive and permalink pages

Create `src/components/FoundQuote.astro` as the single semantic renderer used by the archive, date archives, detail route, and home-page feature. It will output a `<figure>`, a `<blockquote cite="...">` only when `sourceUrl` exists, escaped quote text with intentional line breaks, and a `<figcaption>` containing an em dash attribution, a real `<cite>` for `source`, optional `via` provenance, and a separately labelled date/permalink. External provenance links and the internal permalink must be individually focusable.

Create these pages:

- `src/pages/found-quotes/index.astro`
- `src/pages/found-quotes/[year]/index.astro`
- `src/pages/found-quotes/[year]/[month]/index.astro`
- `src/pages/found-quotes/[year]/[month]/[day]/index.astro`
- `src/pages/found-quotes/[year]/[month]/[day]/[slug].astro`

The top-level page title is `Found Quotes` and its initial lede is `Things other people said that I want to remember.` The archive renders complete quotes newest first rather than title/excerpt cards. The date archives reuse the same quote renderer and familiar date headings. A detail document has one accessible H1 such as `Found quote from <attribution>` while keeping the visible quote—not the generic heading—as the dominant element. It sets a canonical URL and a quote-derived meta description. The empty archive says `No found quotes yet.` and still builds; it does not show a homepage placeholder.

Update the Writing detail route at `src/pages/writing/[year]/[month]/[day]/[slug].astro` to resolve `entry.foundQuoteSlugs` and render those records after the entry's authored framing using the same `FoundQuote.astro` component. Introduce the group with an accessible heading such as `Found quotes`. Writing archive rows continue to use the entry's normal title and description; they do not expand quote bodies or need a special content subtype label.

Add quote-specific styles to `src/styles/global.css` without new colors, fonts, card shadows, or runtime dependencies. Use generous serif quotation type, existing mono metadata, hairline separators, a readable measure, and responsive wrapping for long words and URLs. Check both themes, 1024px desktop, 390px mobile, and the 320px minimum.

This milestone succeeds when semantic inspection shows attribution outside the blockquote, source title inside `<cite>`, no unsafe HTML from quote text, no nested anchors, one H1 on each page, and no horizontal overflow at supported widths. A collection Writing page shows its authored framing once, then each referenced quote once in authored order, while its archive row remains the normal compact Writing representation.

### Milestone 3: Integrate discovery without flattening the hierarchy

Update `src/pages/index.astro` to fetch the newest Found Quote alongside existing content. When one exists, render a restrained `Latest found quote` section after the featured essay and before selected projects, using the shared component or an explicit compact variant. Include its attribution/source and links to its permalink and the full `/found-quotes/` archive. When there are no quote records, render nothing and leave the existing home layout intact. If the featured Writing entry already contains the newest quote, suppress the separate latest-quote module so the home page does not repeat it.

Add `Found Quotes` to the footer navigation in `src/layouts/BaseLayout.astro`; do not add it to `navItems`. Preserve the primary-navigation test's five-control contract. Update relevant site descriptions in `CLAUDE.md` and visible Search fallback copy so the stream is named where the site's contents are enumerated.

Extend `SearchItem['type']` and `getSearchItems()` in `src/lib/search.ts` with `Found Quote`. Search the quotation, attribution, source, optional discovery provenance, and tags. Display a derived title such as `Found quote from <attribution>` and a concise source-based description so results do not imply Ciaran wrote the words. Individual quote results remain canonical. A collection Writing result retains type `Writing`, title, and description, and its searchable content includes Ciaran's framing plus the expanded quotation, attribution, and source text.

Update `scripts/publish-standard-site.mjs` and `scripts/publish-standard-site.test.mjs` so a Writing entry with `foundQuotes` resolves the same records and includes their plain text, attribution, and sources in the Standard.site document's `textContent` after Ciaran's framing. Ordinary Writing entries must produce byte-for-byte equivalent record content to the current behavior. Missing or duplicate references fail before authentication or any external write.

Create `src/pages/found-quotes/feed.xml.ts` and include Found Quotes in `src/pages/feed.xml.ts`. A feed item title uses `Found quote from <attribution>`; its description contains the quote and attribution/source context; its link is the internal canonical permalink. Update the combined feed description. Use the existing `renderFeed()` serializer and do not create external records or change deployment behavior.

This milestone succeeds when a real or local preview quote appears in the archive, permalink, search JSON, dedicated feed, combined feed, and conditional home-page section; the footer exposes the archive site-wide; and the header still contains exactly the existing four text links plus theme control.

### Milestone 4: Make future additions safe and repeatable

Add `docs/operations/publish-found-quote.md` with the exact file template, field meanings, slug guidance, source-quality expectations, local validation, focused-diff review, PR requirements, and post-merge production verification. Explicitly distinguish attribution (who said or wrote it), source (the work or event where it appeared), and `via` (where Ciaran encountered it). Instruct authors to preserve the exact words, use an authoritative source URL when available, never silently “correct” a quote, and use `updated` for later provenance corrections. Include the collection Writing example, explain that list order controls presentation, and require existing quote slugs rather than copied quote bodies.

Add a concise `Found Quote Publishing` section to `AGENTS.md`: when Ciaran says `Found quote this` or asks to save a found quote, create exactly one file under `content/found-quotes/`, follow the runbook, do not invent missing attribution or provenance, and open a focused diff or PR. Update `CLAUDE.md` so the architecture summary identifies Found Quotes as repository-owned curation.

Do not change `docs/operations/deploy.md`, deployment workflows, secrets, or ATProto. Limit `scripts/publish-standard-site.mjs` changes to complete text expansion for Writing collections; do not create a new record type or publication path for standalone quotes. Ordinary Found Quote changes deploy through the existing source-PR-to-`main` workflow.

This milestone succeeds when a new contributor can add a quote or compose a Writing entry from existing quotes using only the runbook, and an agent receiving `Found quote this` has an unambiguous safe workflow.

### Milestone 5: Verify behavior and presentation

Extend `tests/ui/site.spec.ts` to include `/found-quotes/` in core route/accessibility coverage and assert the footer link. Keep the mobile primary-nav control count at five. When approved production quotes and a collection Writing entry are available in the branch, add archive, quote-detail, and collection-Writing semantic assertions plus desktop/mobile visual baselines; update the existing home baselines because the latest-quote section will change the page. If no approved content is available, use temporary local fixtures for manual visual QA, remove them before the final diff, and retain parser/resolver/empty-state tests as committed automated coverage.

Run all repository checks, inspect generated HTML/JSON/XML, and record exact results in `Progress`, `Artifacts and Notes`, and `Outcomes & Retrospective`.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/belgrade`:

    npm ci
    npm test
    npm run check
    npm run build
    npm run test:ui

Inspect generated artifacts after a populated local preview:

    rg -n "Found Quotes|Found quote from|<blockquote|<cite" dist/found-quotes dist/index.html dist/search.json dist/feed.xml
    rg -n "/found-quotes/[0-9]{4}/[0-9]{2}/[0-9]{2}/" dist/found-quotes/feed.xml dist/feed.xml dist/search.json

Run a local production-artifact server with `npm run test:ui` or `node scripts/serve-dist.mjs`, then inspect `/`, `/found-quotes/`, one year/month/day archive, one quote permalink, one collection Writing permalink and its normal archive row, `/search/?q=<attribution>`, `/found-quotes/feed.xml`, and `/feed.xml` at desktop and mobile widths in both themes.

Before requesting review:

    git status --short
    git diff --check
    git diff --stat origin/main...
    git log origin/main..HEAD --oneline

Expected result: only Found Quotes feature files and the living ExecPlan are changed; unit, Astro, build, and UI checks pass; generated pages use trailing-slash canonicals; and no temporary preview quote remains unless Ciaran explicitly approved it as the first real entry.

## Validation and Acceptance

- `content/found-quotes/<slug>.md` is the only production source needed to add a quote. Required missing or malformed fields fail the build with the exact source path and field name.
- The Markdown body is emitted as escaped quotation text. Authored `<script>`, Markdown links, or HTML in quoted material do not become executable page markup.
- `/found-quotes/` displays complete quotes newest first with the exact approved lede, a useful empty state, and no fake starter content.
- Every populated quote has one canonical `/found-quotes/YYYY/MM/DD/<slug>/` page, and each parent year/month/day URL is a working archive rather than a 404.
- Each rendered record has semantic blockquote/citation markup, visible attribution, visible source, an optional authoritative source link, optional `via` provenance, and a distinct internal permalink/date.
- A Writing entry can list existing quote slugs in `foundQuotes`; its permalink renders those records once in authored order after Ciaran's framing, while Writing archives retain their normal title/description treatment. Missing or duplicate references fail validation instead of disappearing silently.
- Notes and ATProto behavior remain unchanged. A Note can link to a quote, but it does not become the canonical container for an ordered Found Quote collection.
- Standard.site publication of a collection Writing entry contains the complete visible textual work: framing, quote text, attribution, and source. Standalone Found Quote records are not published as Standard.site documents.
- A populated quote is discoverable on the home page, through the footer, by searching its words/attribution/source/tags, in `/found-quotes/feed.xml`, in `/feed.xml`, and through the generated sitemap.
- The home treatment and quote archive remain cardless and editorial, use only existing design tokens, work in light and dark themes, and have no overlap or horizontal overflow at 1024px, 390px, or 320px widths.
- The primary header still has About, Writing, Notes, Projects, and the theme control on one mobile row; Found Quotes does not become a fifth header text link.
- `npm test`, `npm run check`, `npm run build`, and `npm run test:ui` all exit successfully.
- The publishing runbook defines exact authoring, correction, PR, deployment, and public-verification behavior, and `AGENTS.md` recognizes the `Found quote this` instruction.

## Idempotence and Recovery

All implementation steps are additive source changes and safe to rerun. Content loading, search generation, feed generation, sitemap generation, and builds are read-only with respect to `content/found-quotes/`. No external service writes occur.

If a quote fails validation, edit only that Markdown file and rerun `npm run check`; the error must identify the file and invalid field. If a build is interrupted, rerun `npm run build`; `scripts/clean-dist.mjs` already makes generated output repeatable. If a temporary visual-QA quote is used, verify its removal with `git status --short` and `rg --files content/found-quotes` before committing.

If a canonical quote URL has already been published, correct text or provenance in place and update `updated`; do not rename its file or change `date`, because either action changes the public permalink. If an attribution or source is disputed, prefer an explicit correction or honest uncertainty over silently deleting provenance. Any future URL migration requires redirects and a separate focused plan.

If the home-page composition becomes too dense, remove only the conditional home module while retaining archive, footer, search, and RSS discovery. Do not solve the issue by adding the stream to the constrained primary navigation.

## Artifacts and Notes

- Repository baseline on 2026-09-07: `npm test` passed 34/34 tests; `npm run check` reported 0 diagnostics across 66 files.
- Existing visual references inspected: `tests/ui/site.spec.ts-snapshots/home-desktop-darwin.png`, `notes-desktop-darwin.png`, and `writing-desktop-darwin.png`. They show the sparse, cardless, serif-led editorial system the quote pages must extend.
- Kevin Kelly reference, original collection: `https://kk.org/thetechnium/found-quotes/`.
- Kevin Kelly reference, later sourced collection: `https://kk.org/thetechnium/found-quotes-10/`.
- Kevin Kelly reference, current statement of the collecting practice: `https://kk.org/cooltools/come-from-away-pocket-radio-true-country-sizes/`.
- Semantic HTML references: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/blockquote` and `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/cite`.
- No initial quote text or provenance was supplied with this request. The implementation must be empty-safe and must not turn research examples into production content without explicit approval.
- Follow-up design discussion on 2026-09-07: a Note was considered as the collection container, then rejected in favor of Writing. The authored selection and framing fit Writing's editorial and interoperability role, while Notes remain short and ATProto-compatible.
- Mock and direction artifacts: `design/found-quotes-mock.html`, `design/found-quotes-directions.md`, and `design/context.md`.
- Implementation QA: `design/qa.md`; local review captures are stored under `.context/design/`, and committed archive baselines live under `tests/ui/site.spec.ts-snapshots/`.
- Post-implementation evidence before deployment: `npm test` passed 42 tests; `npm run check` reported 0 diagnostics across 75 files; `npm run build` generated 53 pages; `npm run test:ui:update` passed 46 desktop/mobile checks. Generated search, RSS, sitemap, and Writing HTML were inspected directly.
- Preview deployment: GitHub Actions run `34170972375` completed successfully in 60 seconds. Cloudflare reported immutable URL `https://14fa4e7b.ciaranlyons.pages.dev` and branch URL `https://clyons-add-found-quotes-cont.ciaranlyons.pages.dev`. Live smoke checks returned HTTP 200 for `/`, `/found-quotes/`, the sample quote permalink, the sample collection Writing, `/found-quotes/feed.xml`, and `/search.json`, with expected quote and collection text present.

## Interfaces and Dependencies

No new package, external API, database, CMS, credential, environment variable, deployment workflow, Standard.site record, or ATProto record is required.

Add this typed interface in `src/lib/content.ts` (exact optional-property syntax may follow repository formatting):

    export interface FoundQuoteEntry {
      slug: string
      year: string
      month: string
      day: string
      text: string
      attribution: string
      source: string
      sourceUrl?: string
      via?: string
      viaUrl?: string
      date: string
      updated?: string
      tags: string[]
      preview: boolean
      url: string
    }

Extend the existing Writing contract:

    export interface WritingEntry {
      // Existing fields remain unchanged.
      foundQuoteSlugs: string[]
    }

Add these public content helpers:

    export function getFoundQuotes(): Promise<FoundQuoteEntry[]>
    export function foundQuoteTitle(quote: Pick<FoundQuoteEntry, 'attribution'>): string
    export function foundQuoteDescription(quote: Pick<FoundQuoteEntry, 'text' | 'attribution'>): string
    export function resolveFoundQuotes(
      slugs: string[],
      quotes: FoundQuoteEntry[],
      ownerIdentity: string,
    ): FoundQuoteEntry[]

`getFoundQuotes()` must preserve the existing memoized-loader convention and return a complete newest-first collection for routes, search, and feeds. Presentation limits, such as selecting only `[0]` for the home page, belong at the caller.

`src/components/FoundQuote.astro` accepts a typed quote and minimal presentation options for home/archive/detail contexts; the component owns quotation semantics so those contexts cannot drift. Avoid an option surface that allows callers to omit attribution or source.

Extend `SearchItem['type']` with the literal `Found Quote`. Existing consumers already treat it as display text and require no new client-side control. Feed integration continues to use the existing `FeedItem` and `renderFeed()` contracts.

`scripts/publish-standard-site.mjs` must resolve Writing `foundQuotes` before any credential use or PDS request and expand them into `site.standard.document.textContent`. Its test suite is the contract that ordinary Writing publishing remains unchanged and collection publishing is complete.

## Change Log

- 2026-09-07: Created the ExecPlan after repository, design, content, route, publishing, and Kevin Kelly reference research. Recorded the one-file-per-quote contract, date-folder URL scheme, semantic rendering, discovery hierarchy, provenance rules, empty-state behavior, and validation plan.
- 2026-09-07: Added ordered Found Quote references on site-native Notes, detail-only collection rendering, compact archive indicators, broken-reference validation, and correct handling for local Notes without an original ATProto post.
- 2026-09-07: Superseded the Note-collection design with Writing collections after comparing both roles. Added complete Standard.site text expansion for collection Writing entries and restored Notes to unchanged scope.
- 2026-09-07: Implemented the selected Editorial Ledger mock through routes, composition, navigation, discovery, publishing documentation, interoperability, tests, and visual QA. Retained explicitly labelled fictional fixtures for the requested preview branch.
- 2026-09-07: Replaced the mock records with 19 supplied quotations, filled missing attribution and source details conservatively, removed the fictional Writing collection, and refreshed build and visual evidence for the real archive.
