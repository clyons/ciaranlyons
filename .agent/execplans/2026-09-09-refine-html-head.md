# Refine HTML head metadata and resource ordering

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Improve the HTML emitted for `ciaranlyons.com` after reviewing Declan Chidlow's [My HTML Boilerplate](https://vale.rocks/posts/html-boilerplate). Visitors and link-preview consumers should receive metadata that reflects the actual page type, browsers should learn the supported color schemes before CSS loads, the critical global stylesheet should be discoverable near the beginning of the document head, and the viewport declaration should use the modern minimal form.

The result is observable by viewing a built page's source: collection and utility pages retain `og:type=website`, content detail pages emit `og:type=article` and article metadata, social titles do not repeat the site name, `color-scheme` and the simplified viewport declaration appear near the start of `<head>`, and the global stylesheet link precedes non-critical social metadata. The rendered design and theme-toggle behavior remain unchanged.

## Progress

- [x] (2026-09-09 11:37Z) Read the repository ExecPlan contract, inspected the existing layout and generated HTML, and reviewed the motivating article and current platform guidance.
- [x] (2026-09-09 11:37Z) Initial planning completed.
- [x] (2026-09-09 11:42Z) Implemented the four HTML head improvements and focused browser assertions.
- [x] (2026-09-09 11:46Z) Completed unit, Astro, full static-build, generated-source, and desktop/mobile browser validation.

## Surprises & Discoveries

- Observation: Astro currently hoists the imported global stylesheet to the final position in `<head>`, after the inline theme initializer, Open Graph and Twitter metadata, and JSON-LD.
  Evidence: `npm run build` followed by inspection of `dist/index.html` showed `<link rel="stylesheet" href="/assets/BaseLayout...css">` immediately before `</head>`.
- Observation: The repository has no trace-capable Chrome DevTools MCP available in this session.
  Evidence: Tool discovery returned no `performance_start_trace`, `performance_analyze_insight`, `list_network_requests`, or related tools. Built-source ordering and existing Playwright behavior checks will be used instead.
- Observation: The experimental `text-scale` metadata discussed in the article is separate from the four requested improvements and requires large-text layout testing.
  Evidence: MDN marks it experimental and warns that sites must support roughly 200% to over 300% text scaling; it is intentionally out of scope for this plan.
- Observation: Importing `global.css?url` preserves Astro/Vite's hashed asset output while allowing deterministic placement in the authored head.
  Evidence: The build emitted `/assets/global.C1TeZc7H.css` directly after the inline theme initializer and before the description and Open Graph metadata; all visual snapshots passed unchanged.

## Decision Log

- Decision: Treat Writing, TIL, Note, and Found Quote permalinks as Open Graph articles; keep indexes, utility pages, and saved-link detail pages as websites.
  Rationale: These four routes publish first-party dated content. A saved-link page primarily describes and points to another publisher's resource, so representing it as Ciaran's article would be misleading.
  Date/Author: 2026-09-09 / Codex
- Decision: Use the raw page title for Open Graph and Twitter titles while retaining the site-qualified browser `<title>`.
  Rationale: `og:site_name` already communicates the site identity in embeds; repeating it in `og:title` adds noise while the browser title still benefits from site context.
  Date/Author: 2026-09-09 / Codex
- Decision: Import the global stylesheet as a Vite asset URL and render an explicit early `<link rel="stylesheet">`.
  Rationale: This retains hashing and bundling while controlling discovery order. It avoids copying generated assets or adding a dependency solely to rearrange the head.
  Date/Author: 2026-09-09 / Codex
- Decision: Do not add `text-scale`, a web app manifest, JSON Feed, OpenSearch, font preloads, or a new favicon format.
  Rationale: They are not among the four requested improvements. The site uses system fonts, is not currently presented as an installable app, and experimental text scaling needs a dedicated accessibility change.
  Date/Author: 2026-09-09 / Codex
- Decision: Emit `article:modified_time` only when the update date differs from the publication calendar date.
  Rationale: Several entries carry an `updated` value equal to their publication date. Publishing that as a distinct modification is redundant and, when publication has a timestamp but update has only a date, can imply that modification preceded publication.
  Date/Author: 2026-09-09 / Codex

## Outcomes & Retrospective

The four requested improvements are complete. The common layout now emits minimal viewport and early color-scheme metadata, keeps the no-flash theme initializer early, and explicitly discovers the hashed global stylesheet before descriptive and social metadata. Browser titles remain site-qualified while Open Graph and Twitter titles use the raw page title.

Writing, TIL, Note, and Found Quote permalinks now identify as articles and expose their publication time and section. Meaningful later update dates and available tags are included; collection pages and saved-link detail pages continue to identify as websites. The full build and both Playwright projects passed with no visual snapshot changes. The intentionally deferred experimental `text-scale` behavior remains the only related follow-up identified by the motivating article.

## Context and Orientation

`src/layouts/BaseLayout.astro` owns the common document shell and all current SEO/social metadata. It composes the browser title, initializes the saved light/dark theme, and imports `src/styles/global.css`. Astro turns that bare CSS import into a hashed stylesheet link during static builds.

The first-party dated detail routes are:

- `src/pages/writing/[year]/[month]/[day]/[slug].astro`
- `src/pages/til/[year]/[month]/[day]/[slug].astro`
- `src/pages/notes/[year]/[month]/[day]/[id].astro`
- `src/pages/found-quotes/[year]/[month]/[day]/[slug].astro`

Their content objects already expose publication dates, optional update dates where applicable, and tags for TIL and Found Quote entries. `tests/ui/site.spec.ts` runs against the built static site and is therefore suitable for asserting both metadata values and DOM head order. `package.json` defines the repository's unit, Astro, build, and Playwright commands.

## Plan of Work

First, extend `BaseLayout.astro` with a small explicit interface for social page type and article fields. Separate the browser title from the social title. Render article-only metadata conditionally so website pages cannot accidentally emit article properties.

Second, modernize the critical head prefix. Change the viewport content to `width=device-width`, add `color-scheme` before style evaluation, load `global.css` through a hashed explicit link near the title, and retain the inline theme initializer early enough to prevent a theme flash.

Third, pass article metadata from the four first-party dated detail templates. Writing emits its publication and optional update dates with a `Writing` section. TIL emits its dates, `TIL` section, and tags. Notes emit their timestamp with a `Notes` section. Found Quotes emit their dates, `Found Quotes` section, and tags.

Finally, add Playwright assertions that cover website versus article metadata, unqualified social titles, color-scheme and viewport values, and stylesheet ordering. Build the whole static site, run all tests, and inspect representative generated HTML before completing this plan.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/hong-kong`:

1. Edit `src/layouts/BaseLayout.astro`, the four dated detail templates, and `tests/ui/site.spec.ts` as described above.
2. Run `npm test`. Expect every Node test to pass.
3. Run `npm run lint`. Expect Astro to report zero errors, warnings, and hints.
4. Run `npm run build`. Expect the static build, social-image verification, Pagefind indexing, and well-known file generation to complete successfully.
5. Inspect `dist/index.html` and representative Writing, TIL, Note, and Found Quote pages. Expect the exact metadata and stylesheet order defined in Validation and Acceptance.
6. Run `npm run test:ui`. Expect both desktop and mobile Playwright projects, including visual snapshots, to pass without snapshot updates.
7. Run `git diff --check` and review `git diff --stat origin/main...` and `git diff origin/main...` for scope and whitespace correctness.

## Validation and Acceptance

The change is accepted when all of the following are true:

- Every page begins with a standards-mode doctype, `lang="en"`, UTF-8 charset, `<meta name="viewport" content="width=device-width">`, and `<meta name="color-scheme" content="light dark">`.
- The emitted hashed global stylesheet link occurs before `og:title` in generated HTML.
- The browser `<title>` remains site-qualified on non-home pages, while `og:title` and `twitter:title` contain only the content title.
- Home and index pages emit `og:type=website` and no `article:*` properties.
- Writing, TIL, Note, and Found Quote permalinks emit `og:type=article`, `article:published_time`, and the correct `article:section`; meaningful later update times and available tags appear when data exists.
- Existing theme-toggle, responsive, accessibility, navigation, and visual-regression tests remain green.
- `npm test`, `npm run lint`, `npm run build`, `npm run test:ui`, and `git diff --check` all succeed.

## Idempotence and Recovery

All edits are deterministic source changes and all validation commands are safe to rerun. `npm run build` begins by cleaning the ignored `dist/` directory, so a partial build can be recovered by rerunning it. If the explicit CSS URL import does not produce a hashed usable stylesheet, revert only that import/link edit and restore the bare CSS import before trying an alternative; do not copy build output into `public/`. If metadata assertions fail, inspect the corresponding generated `dist/**/index.html` and correct the route props or conditional layout output.

## Artifacts and Notes

- Motivating review: [My HTML Boilerplate](https://vale.rocks/posts/html-boilerplate), published 2026-09-09.
- Current viewport reference: [MDN `<meta name="viewport">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport), which recommends `width=device-width` for responsive pages.
- Ordering reference: [Capo.js](https://github.com/rviscomi/capo.js), which evaluates server-rendered head ordering for perceived-performance implications.
- Baseline validation before edits: `npm run build` completed with 0 Astro diagnostics and built 4,067 pages; 68 page-specific social preview images were verified.
- Final `npm test`: 94 tests passed, 0 failed.
- Final `npm run lint`: 116 Astro files checked with 0 errors, 0 warnings, and 0 hints.
- Final `npm run build`: 4,067 pages built; 68 page-specific social images verified; Pagefind indexed 2,662 pages and 17,533 words.
- Final generated-source inspection: home emitted `og:type=website` without `article:*`; representative first-party permalinks emitted the expected article dates, sections, and tags; `/assets/global.C1TeZc7H.css` preceded `og:title`.
- Final `npm run test:ui`: 118 desktop/mobile tests passed, including every existing visual baseline and the new head metadata assertions.
- Final `git diff --check`: completed without errors.

## Interfaces and Dependencies

`BaseLayout.astro` will add optional props equivalent to:

    socialType?: 'website' | 'article'
    publishedTime?: string
    modifiedTime?: string
    articleSection?: string
    articleTags?: string[]

No runtime or development dependency changes are expected. Vite, through Astro, already supports URL asset imports. Existing content entry interfaces supply all values needed by the route templates.

## Change Log

- 2026-09-09: Created the plan from `.agent/execplans/TEMPLATE.md`, recorded the pre-change generated-head findings, and scoped the four requested improvements.
- 2026-09-09: Implemented the layout and route metadata contract, added focused Playwright coverage, suppressed redundant same-day modification metadata, and recorded complete validation evidence.
