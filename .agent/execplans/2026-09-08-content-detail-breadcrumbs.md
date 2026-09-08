# Add archive breadcrumbs to content detail pages

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Readers who arrive on an individual TIL, Writing entry, Found Quote, Note, or Link should have an obvious, accessible route to that content type's main archive. After this change, each canonical content detail page displays one compact linked archive label above its page header without repeating the detail page's title or body text.

## Progress

- [x] (2026-09-08 05:19Z) Audited the site's archive and detail routes and completed the initial plan.
- [x] (2026-09-08 05:21Z) Added a reusable accessible breadcrumb component and shared styles.
- [x] (2026-09-08 05:21Z) Added archive breadcrumbs to canonical TIL, Writing, Found Quote, and Note detail pages.
- [x] (2026-09-08 05:24Z) Added behavior-level UI coverage and updated the affected desktop and mobile Note detail baselines.
- [x] (2026-09-08 11:43Z) Rebased onto current `origin/main` and reran repository checks, unit tests, the production build, focused browser validation, and the full UI regression audit.
- [x] (2026-09-08 12:07Z) Simplified the breadcrumb after review so it renders only the linked archive label, centralized archive metadata, and reran focused validation.
- [x] (2026-09-08 12:12Z) Rebased over the newly merged Links collection and applied the same non-repeating archive breadcrumb to its detail route.

## Surprises & Discoveries

- Observation: Notes are the only additional archive/detail content type beyond the three named in the request.
  Evidence: `src/pages/notes/index.astro` is an archive and `src/pages/notes/[year]/[month]/[day]/[id].astro` renders individual notes. Projects render in one archive page with links that may be in-page anchors or external URLs, while About and Search have no detail pages.
- Observation: The topic-prefixed TIL detail route is a compatibility redirect rather than a second rendered article.
  Evidence: `src/pages/til/[topic]/[year]/[month]/[day]/[slug].astro` emits an immediate meta refresh to the canonical date-only URL.
- Observation: Port 4322 was occupied by a dev server from another Conductor workspace, so the first snapshot update reached that stale server.
  Evidence: `lsof -nP -iTCP:4322 -sTCP:LISTEN` identified an Astro process whose current directory was the sibling `nairobi` workspace. Validation was rerun in isolation on port 4332 via a gitignored `.context` config, without stopping the sibling process.
- Observation: The complete UI suite currently has failures unrelated to this change because assertions and approved archive snapshots have drifted behind content already on `origin/main`.
  Evidence: `origin/main` contains 28 Found Quote files while `origin/main:tests/ui/site.spec.ts` still expects 19. The post-rebase full run passed 48 tests, including every breadcrumb and affected Note-snapshot case, and reported 14 unrelated failures across both browser projects from the Found Quote count/type-study expectations and existing archive snapshots.
- Observation: A Links archive/detail section merged after the original route audit and breadcrumb deployment.
  Evidence: After rebasing onto commit `e493464`, `src/pages/links/[year]/[month]/[day]/[slug].astro` presented individual saved Links and already included an inline archive link. The follow-up moved that link into the shared breadcrumb and retained the saved-date metadata without duplication.

## Decision Log

- Decision: Include Notes alongside TILs, Writing, and Found Quotes.
  Rationale: Notes use the same dated archive/detail information architecture and otherwise have the same navigation gap.
  Date/Author: 2026-09-08 / Codex
- Decision: Do not add breadcrumbs to redirects, date/topic archive pages, Projects, About, or Search.
  Rationale: The requested problem is movement from a content detail page to its main archive. Redirects do not present content, nested archives already expose their section identity, and the remaining routes do not form archive/detail pairs.
  Date/Author: 2026-09-08 / Codex
- Decision: Represent each breadcrumb as the linked content archive followed by a non-linked current-page label.
  Rationale: This gives readers the requested archive destination while preserving standard breadcrumb semantics through a labelled navigation landmark, an ordered list, and `aria-current="page"`.
  Date/Author: 2026-09-08 / Codex
- Decision: Supersede the two-item breadcrumb with one linked archive label and no current-page item.
  Rationale: The page already presents its own title or Note text immediately below the breadcrumb. Repeating that content adds noise, is especially excessive for generated Note titles, and makes the component API more generic than the site needs. `ArchiveBreadcrumb.astro` now owns the finite archive-label and URL mapping so callers pass only an archive key.
  Date/Author: 2026-09-08 / Codex

## Outcomes & Retrospective

Implemented one reusable archive breadcrumb for all five canonical content detail types. TILs, Writing entries, Found Quotes, Notes, and Links now show only a small link to their main archive; detail content is not repeated in the navigation. The component centrally maps each archive key to its label and URL. Projects, About, Search, redirects, and nested date/topic archive pages were intentionally left unchanged because they do not present the same archive/detail navigation gap. Type checks, unit tests, the production build, and all focused desktop/mobile browser checks passed. The unrelated pre-existing full-suite drift is documented under `Surprises & Discoveries` and was not folded into this focused change.

## Context and Orientation

The Astro site stores reusable UI under `src/components/`, page routes under `src/pages/`, and shared visual rules in `src/styles/global.css`. Canonical content details are rendered by:

- `src/pages/til/[year]/[month]/[day]/[slug].astro`
- `src/pages/writing/[year]/[month]/[day]/[slug].astro`
- `src/pages/found-quotes/[year]/[month]/[day]/[slug].astro`
- `src/pages/notes/[year]/[month]/[day]/[id].astro`
- `src/pages/links/[year]/[month]/[day]/[slug].astro`

Their main archives are `/til/`, `/writing/`, `/found-quotes/`, `/notes/`, and `/links/`. Browser-level behavior and screenshots are tested in `tests/ui/site.spec.ts`; the existing Note detail screenshot changes when navigation is added.

## Plan of Work

Create `src/components/ArchiveBreadcrumb.astro` with a typed archive key and a central mapping to each archive's label and URL. Add restrained breadcrumb styles to `src/styles/global.css`. Import and render the component at the top of each canonical content detail article, passing only its archive key. Extend `tests/ui/site.spec.ts` with assertions that all four routes render exactly the archive label, contain no current-page recapitulation, and navigate to the archive. Regenerate only the affected Note detail snapshots. Finally, run checks, tests, a production build, and the focused Playwright suite.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/bujumbura`:

    npm run lint
    npm test
    npm run build
    npx playwright test tests/ui/site.spec.ts

The first three commands must exit successfully with no Astro or test errors. The Playwright breadcrumb and Note-detail cases must pass in both desktop and mobile projects. If the expected Note detail image differs only because the new breadcrumb is present, regenerate that named baseline with:

    npx playwright test tests/ui/site.spec.ts --grep "note detail matches" --update-snapshots

Then rerun the focused cases without `--update-snapshots`. Run the full UI file as a regression audit and distinguish failures caused by the task from baseline failures already present on `origin/main`.

## Validation and Acceptance

Acceptance requires all of the following:

- A TIL detail exposes a `Breadcrumb` navigation landmark containing only a `TIL` link to `/til/`.
- A Writing detail exposes the same structure containing only a `Writing` link to `/writing/`.
- A Found Quote detail exposes the same structure containing only a `Found Quotes` link to `/found-quotes/`.
- A Note detail exposes the same structure containing only a `Notes` link to `/notes/`.
- A Link detail exposes the same structure containing only a `Links` link to `/links/`.
- The legacy topic-prefixed TIL URL continues to redirect to the canonical detail URL.
- The breadcrumb remains readable at desktop and mobile widths and uses existing color and typography tokens in both themes.
- `npm run lint`, `npm test`, and `npm run build` pass; the focused breadcrumb and affected visual cases pass in both browser projects. Any unrelated failures found by the complete Playwright regression audit are proven against `origin/main` and documented rather than silently absorbed into this change.

## Idempotence and Recovery

The source edits and test commands are safe to repeat. Snapshot regeneration is limited to the existing Note detail baselines. If implementation fails partway through, inspect `git diff` and finish or revert only the files named in this plan; no data, remote state, credentials, or deployment configuration are involved.

## Artifacts and Notes

- Initial route audit: four canonical archive/detail pairs (`til`, `writing`, `found-quotes`, and `notes`).
- `npm run lint`: passed after rebasing onto current `origin/main`; Astro checked 85 files with 0 errors, warnings, or hints.
- `npx tsc --noEmit`: passed with no diagnostics.
- `npm test`: passed; 51 tests passed, 0 failed.
- `npm run build`: passed; 79 pages built and 67 page-specific social preview images verified.
- `npx playwright test --config .context/playwright.breadcrumbs.config.ts tests/ui/site.spec.ts --grep "breadcrumb|note detail matches"`: passed; 10 tests passed across desktop and mobile.
- Full UI regression audit: 48 passed and 14 unrelated cases failed because of Found Quote count/type-study expectations and archive snapshot drift already present on `origin/main`; every task-specific case passed.
- Visual review: inspected both regenerated Note detail baselines and confirmed the breadcrumb is a single small `Notes` link with no repeated Note text at 1280px and 390px widths.
- Follow-up validation after rebasing over the Links collection: `npm run lint` checked 102 files with no diagnostics, `npx tsc --noEmit` passed, and all 69 unit tests passed.
- Follow-up production build: 4,067 pages built, 68 social preview images verified, and Pagefind indexed 2,662 pages.
- Follow-up focused Playwright run: all 12 archive-breadcrumb and Note-detail snapshot cases passed across desktop and mobile, including the newly discovered Link detail route.

## Interfaces and Dependencies

`src/components/ArchiveBreadcrumb.astro` accepts `archive: 'til' | 'writing' | 'found-quotes' | 'notes' | 'links'`. The component's internal mapping supplies the display label and archive URL. No runtime dependency or content schema changes are required.

## Change Log

- 2026-09-08: Created the plan from the repository template after auditing all page routes.
- 2026-09-08: Recorded implementation completion, validation evidence, visual review, and pre-existing UI-suite drift.
- 2026-09-08: Updated the final design after review to remove repeated current-page content and centralize archive metadata.
