# Import Feedly stars as a durable Links collection

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Create a first-class `Links` post type on CiaranLyons.com and backfill every article Ciaran has starred or saved in Feedly into it. A visitor should be able to browse the collection at `/links/`, open stable date-based Link permalinks, follow the original article, search the collection, and subscribe to a Links-only or combined RSS feed. The public date on a Link is the date Ciaran saved it, not the publisher's article date, when Feedly provides that information.

The import must turn a private Feedly action into public content deliberately and reviewably. It must not make site builds depend on Feedly, copy full third-party articles, expose a Feedly token, overwrite hand-edited Link posts, or post hundreds of historical items into Ciaran's Bluesky timeline.

The site remains canonical. Each local Link page may also be published as a verified `site.standard.document` record in Ciaran's ATproto repository, using the existing `site.standard.publication`. This makes the collection discoverable and portable in the ATmosphere without inventing a custom Lexicon or confusing public Link posts with Bluesky's private bookmark feature.

The completed result is observable by:

- running an authenticated, paginated Feedly sync that creates one Markdown file per unique saved URL;
- running the sync again and seeing no duplicate files or destructive rewrites;
- building the site and browsing paginated `/links/` and date archives, detail pages, feeds, and chunked static search results without loading the entire collection into one browser document;
- running an explicit Standard.site dry run for Links, then optionally publishing Link document records separately from the import;
- inspecting a built Link page for its canonical URL, outbound article URL, and, once published, `site.standard.document` and `site.standard.publication` link tags.

## Progress

- [x] (2026-09-07 20:57Z) Inspected the content loaders, TIL routes, feeds, search, UI tests, Bluesky Notes sync, Standard.site publisher, and current publishing plans.
- [x] (2026-09-07 20:57Z) Reviewed the current official Feedly stream/authentication documentation and current ATproto, Bluesky bookmark, and Standard.site behavior.
- [x] (2026-09-07 20:57Z) Completed the initial implementation plan and recorded the Feedly access proof as the first milestone.
- [x] (2026-09-07 22:10Z) Created and exercised an invented, redacted two-page Feedly stream fixture with three valid items, one duplicate normalized destination, one unsafe URL, a continuation, an alternate-URL fallback, and a missing-save-time fallback. A real account acquisition was intentionally not attempted because no Feedly credential or export was supplied.
- [x] (2026-09-07 22:18Z) Implemented and tested the local Link content model and idempotent API/file importer. The first fixture import wrote three mock entries; a repeat dry run planned zero writes, four skips, and one rejection.
- [x] (2026-09-07 22:38Z) Added Link index/detail/date archives, primary navigation, section and combined feeds, search, responsive editorial styling, and browser coverage.
- [x] (2026-09-07 22:44Z) Extended explicit Standard.site publishing to Writing, Links, or both; retained Writing as the default; preserved/uploaded publication icon metadata; and completed a credential-free Links dry run. No mock records were published.
- [x] (2026-09-07 22:50Z) Completed visual and interaction QA against the mock backfill at desktop and mobile widths. All 44 Playwright checks passed after intentional baseline updates.
- [x] (2026-09-07 23:13Z) Rebased onto the repository deployment architecture, ran the repository-owned Cloudflare Pages preview workflow successfully in 1m8s, and smoke-tested the stable branch URL at desktop and 390px.
- [x] (2026-09-07 23:23Z) Used Ciaran's explicitly authorized logged-in Chrome session for a one-time, local-only export through Feedly's paginated stream endpoint. The gitignored mode-0600 export contains 2,633 unique Feedly entries across 27 pages, terminates without another continuation, and contains no persisted browser token, cookie, or authorization header.
- [x] (2026-09-07 23:27Z) Dry-ran the real export. The importer planned 2,626 writes, skipped seven normalized-URL duplicates, rejected none, and revealed that the web stream response supplies save time as a top-level `actionTimestamp`; updated the parser and regression coverage accordingly.
- [x] (2026-09-08 03:52Z) Measured the real collection's static route shape: 2,626 detail pages, 1,059 day archives, 151 month archives, 14 year archives, and the root index would produce 3,851 Link HTML pages before pagination. Confirmed this remains below Cloudflare Pages' current 20,000-file free-plan limit, while the current all-rows DOM filter and monolithic `search.json` do not remain acceptable at this size.
- [x] (2026-09-08 04:03Z) Opened and validated checkpoint PR #41, merged the latest `origin/main` deployment and Found Quotes work into the feature branch, reran 56 unit tests plus lint and TypeScript, and pushed checkpoint merge `e4b7a93` without rewriting the shared branch.
- [x] (2026-09-08 04:47Z) Hardened the real archive locally: all root/year/month/day collections paginate at 50 rows, feeds cap Links at 50, Pagefind replaces the eager JSON index, search is URL-addressable and bounded to 12 rendered results, and the artifact validator enforces scale limits.
- [x] (2026-09-08 04:47Z) Added deterministic Standard.site `--missing-only --limit N` selection and proved a credential-free one-document dry run against Ciaran's existing publication. The live canary remains intentionally pending until its local URL is deployed.
- [x] (2026-09-08 04:47Z) Imported the reviewed history locally and removed all mocks. Eight saved Stratechery URLs contained an `access_token`; normalization now strips that key, revealing one additional duplicate. The final set is 2,625 public candidates, eight duplicates, zero rejects, and zero date fallbacks.
- [x] (2026-09-08 05:54Z) Completed local scale, privacy, interaction, and visual QA after merging the latest social-preview, Found Quote, and internal-link work from `main`. Clean builds on the final architecture completed in 9.93s to 11.22s; the artifact has 6,866 files/57,273,399 bytes, 2,625 Link detail pages, 1,363 Link archive pages, at most 50 rows per archive, and a 2,494,259-byte Pagefind bundle. All 69 unit and 66 Playwright checks pass, including search, social-image verification, desktop/mobile design, and no-JavaScript pagination.
- [x] (2026-09-08 06:19Z) Promoted the 2,625 reviewed Link metadata files in commit `6818e3c`, incorporated all current `origin/main` work through merge commit `320c192`, and deployed that application/content head through the repository-owned preview workflow. Run 34193980981 completed in 1m27s; the index, page two, Pagefind, and the shared Links social image returned HTTP 200. The prior live 390px check confirmed 50 rows, working next-page navigation, no horizontal overflow, valid social metadata, and bounded search results on the same Links implementation.
- [x] (2026-09-08 11:54Z) Reviewed the final design against current public link archives and WCAG 2.2/Apple target guidance. Added an explicit Search action; replaced the clipped prompt; expanded Links utility targets to 44×44px; refreshed desktop/mobile baselines; merged the latest `origin/main` breadcrumb work; and passed 69 unit, 76 browser, lint, TypeScript, and full-build checks on the combined result.
- [ ] ATproto follow-up: after the Link URLs are deployed and an app password is available, publish and verify one Standard.site canary, then use separately observed missing-only batches of at most 100. No Bluesky feed posts or bookmarks are in scope.

## Surprises & Discoveries

- Observation: Feedly's current official self-service API tokens are documented as an Enterprise-only feature, even though historical personal Feedly integrations used streams such as `user/<id>/tag/global.saved`.
  Evidence: The official Authorization page says self-service API tokens are only available to Enterprise clients. Therefore the implementation must prove access for Ciaran's actual account before assuming the historical `global.saved` stream is usable.

- Observation: Feedly's OPML export does not include Read Later articles or Boards.
  Evidence: Feedly's official export documentation explicitly limits OPML to feed subscriptions and recommends Dropbox or automation for saved-article backup. OPML cannot satisfy the requested historical backfill.

- Observation: Feedly's stream API pages through at most 100 articles per response with an opaque `continuation`; a complete backfill must follow continuations rather than use `newerThan`.
  Evidence: The official Collect Articles endpoint documents `count` from 1 through 100 and continuation pagination. It also limits `newerThan` to the last 31 days, which is unsuitable for all historical stars.

- Observation: Feedly article metadata distinguishes the canonical publisher URL from internal `originId`, and saved-board tag objects can carry an `actionTimestamp`.
  Evidence: The official Article JSON guide says to prefer `canonicalUrl`, then `alternate.href`, and not to assume `originId` is a URL. Its tag examples include `actionTimestamp`, which is the best available saved date.

- Observation: Ciaran's authenticated `global.saved` stream returns a top-level `actionTimestamp` on every item rather than placing the timestamp on the matching tag object.
  Evidence: The complete 2,633-item browser-session export contained `actionTimestamp` on all 2,633 items; all saved tag objects contained only `id` and `label`. A dry run before adapting the parser therefore marked every eligible entry with `date-fallback:published`.

- Observation: The real collection does not exceed static hosting capacity, but it invalidates the mock-scale client behavior.
  Evidence: After duplicate normalization, the existing date/detail route scheme projects 3,851 Link HTML pages. Cloudflare Pages currently permits 20,000 files on the free plan, but `src/pages/links/index.astro` renders every Link row and filters the entire DOM per keystroke, while `src/pages/search.astro` fetches the complete `/search.json` payload before returning any result.

- Observation: This repository's GitHub Actions workflows perform a clean build and then Direct Upload to Cloudflare Pages; Cloudflare's native Pages-build timeout does not govern this deployment path.
  Evidence: `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-preview.yml` run `npm run build` before `wrangler pages deploy`. The relevant controls are therefore the repository's measured workflow duration and Cloudflare's uploaded file/asset limits. A clean full-data build must be treated as an acceptance measurement, not assumed from the three-record mock build.

- Observation: Pagefind preserves static hosting while moving full-text search to a generated, chunked index.
  Evidence: Pagefind runs after the static generator, stores its search bundle with the built site, and loads matching index/result chunks on demand. The final local build indexed 2,660 useful pages and 17,530 words into a 2,493,268-byte bundle, so the 2,625-Link collection does not require an application database.

- Observation: Eight Feedly destinations carried a subscriber `access_token` query parameter; stripping it exposed one additional duplicate URL.
  Evidence: A pre-promotion scan found the exact sensitive key on eight Stratechery destinations. The importer now removes that key alongside known tracking keys, regression coverage asserts the behavior, generated Link files and `dist/` contain no occurrence, and the final accounting changed from 2,626 candidates/seven duplicates to 2,625 candidates/eight duplicates.

- Observation: Reusing a fixed Playwright port can silently test another active Conductor workspace.
  Evidence: Port 4322 belonged to the `nairobi` workspace, so initial checks loaded its older site. `playwright.config.ts` now derives its default from Conductor's allocated port, permits an explicit `PLAYWRIGHT_PORT` override, and no longer opts into cross-workspace server reuse.

- Observation: Recent Found Quote additions made two pre-existing UI assertions depend on stale collection order and counts.
  Evidence: The merged `main` content contains 26 quotes, and the newest quote is no longer the 2026-09-07 Ben Thompson example. The type-study route now selects its long reading exemplar explicitly and the semantics test selects the intended quote by content rather than array position.

- Observation: `main` advanced again after the first full-data preview and introduced page-specific social images whose initial route inventory did not include Links.
  Evidence: A straight merge made the verifier correctly reject thousands of missing `/og/links/...png` references. Link pages now deliberately share one generated `/og/links.png` collection card through an explicit layout override. This preserves valid Open Graph/Twitter metadata while avoiding 2,625 redundant PNGs and keeping the artifact at 6,860 files.

- Observation: The repository already materializes remote Bluesky content into local Markdown with bounded responses, safe destination checks, atomic writes, dry-run behavior, and skip-on-rerun semantics.
  Evidence: `scripts/sync-bsky-notes.mjs` provides the local precedent. Feedly ingestion should share its safety properties without coupling the two sources.

- Observation: Bluesky bookmarks are private service records and currently accept only strong references to `app.bsky.feed.post` records.
  Evidence: The current official `app.bsky.bookmark.createBookmark` Lexicon describes a private bookmark procedure and rejects unsupported collections. It cannot represent an arbitrary publisher URL from Feedly and it would not create a public site post.

- Observation: Standard.site is already implemented for Writing, and Bluesky now indexes `site.standard.*` records to enhance shared-link embeds.
  Evidence: `scripts/publish-standard-site.mjs`, `BaseLayout.astro`, and the existing publishing ExecPlan implement publication/document records and verification links. Bluesky's May 2026 integration notes describe resolving verified Standard.site records for enhanced external embeds.

- Observation: Adding Links to the primary navigation adds a sixth control at mobile widths.
  Evidence: `tests/ui/site.spec.ts` currently asserts five controls fit on one row at 390px and 320px. The implementation must intentionally adjust and verify the small-screen navigation rather than silently overflow it.

- Observation: The final editorial layout was visually strong, but its dense archive controls relied on spacing rather than comfortable target dimensions.
  Evidence: Browser measurement at 1280px, 390px, and 320px found year, row-action, and pagination anchors only 14 CSS pixels high. The revised controls measure at least 44×44 CSS pixels at all three widths with no horizontal overflow; the search field's former long placeholder also clipped at desktop width and now has a concise prompt plus visible submit button.

- Observation: The production GitHub Pages repository has only its production `gh-pages` branch and no branch-preview workflow.
  Evidence: Repository and Pages configuration inspection showed `clyons/resume` serving `ciaranlyons.com` directly from `gh-pages`. Preview deployment must use an isolated provider/project rather than pushing a mock artifact to the production repository.

- Observation: The configured Cloudflare account connector returned authentication error 10000 while listing Pages projects.
  Evidence: The read-only Cloudflare Pages project query failed before any mutation. Per the user-wide workspace rule, this session did not initiate another login; the authenticated Vercel CLI is used for this one preview instead.

## Decision Log

- Decision: Add a dedicated `LinkEntry` and `/links/` section instead of storing imported links as TILs.
  Rationale: A TIL is an authored learning with a topic and Markdown body; a Feedly star is a curated outbound link with source attribution and possibly no commentary. Keeping the types distinct preserves meaning while reusing the TIL archive conventions.
  Date/Author: 2026-09-07 / Codex

- Decision: Keep Git-tracked Markdown under `content/links/` as the source of truth after import.
  Rationale: Local files make the collection reviewable, editable, portable, and buildable without Feedly or ATproto availability. This matches the existing Notes materialization architecture.
  Date/Author: 2026-09-07 / Codex

- Decision: Keep Links static for the real backfill; do not add D1 solely because the collection contains roughly 2,600 publishable items.
  Rationale: The projected artifact remains well below the current Pages file limit, static files retain the repository's portability and offline build guarantees, and no current reader interaction requires server-side state. Revisit D1 plus a narrowly scoped Pages Function only if online editing/private states or server-side facets become requirements, two representative clean builds exceed 10 minutes, or the artifact approaches 15,000 files. The performance target is under five minutes for the clean production-shaped build plus Pagefind, keeping CI feedback reasonable relative to the current 1m8s mock-preview baseline.
  Date/Author: 2026-09-08 / Codex

- Decision: Remove an exact `access_token` query key from imported destinations and deduplicate again after normalization.
  Rationale: A subscriber token is credential material, not a meaningful part of a public canonical URL. Removing it before duplicate comparison prevents publishing secrets and correctly collapses tokenized and non-tokenized versions of the same article. Other unknown query semantics remain preserved.
  Date/Author: 2026-09-08 / Codex

- Decision: Paginate rendered Link collections at 50 entries per page and replace both the Links DOM filter and whole-site `search.json` client search with Pagefind.
  Rationale: Page HTML should remain bounded and useful without JavaScript, while search should download only relevant static index chunks. The canonical archive routes remain stable: `/links/`, year, month, and day pages are page one; additional pages use explicit `/page/<N>/` suffixes. Day archives need pagination only when they exceed the same 50-entry limit.
  Date/Author: 2026-09-08 / Codex

- Decision: Treat D1 as an optional future read model, not the canonical store.
  Rationale: If dynamic query requirements emerge, D1 can index Link metadata and FTS5 can serve search, but Git-tracked Markdown must remain recoverable source material. A D1 migration would change data and deployment behavior and therefore requires its own ExecPlan, migration/backup path, and workflow-contract tests.
  Date/Author: 2026-09-08 / Codex

- Decision: Publish Standard.site Link documents through a canary followed by resumable missing-only batches of at most 100 records.
  Rationale: Deterministic record keys make individual writes idempotent, but a 2,625-record one-shot run is needlessly difficult to observe and recover. Each successful write records `standardUri` locally; subsequent batches select only entries without one. No batch creates `app.bsky.feed.post` or `app.bsky.bookmark` records.
  Date/Author: 2026-09-08 / Codex

- Decision: Separate acquisition from normalization by supporting both the Feedly API and a JSON-file input containing the same stream response shape.
  Rationale: Current official API access may not be available to a personal account. A file adapter lets the parser, content model, site, and tests remain useful if Feedly provides an account export or a supported backup produces article JSON. It also makes fixture-driven tests possible. For this account, Ciaran explicitly authorized a one-time local browser-session export against Feedly's stream endpoint after supported self-service options proved unavailable; the ephemeral web token remained in memory and the raw response remains gitignored rather than becoming a product dependency.
  Date/Author: 2026-09-07 / Codex

- Decision: Use the Feedly save action timestamp as `date` and `savedAt` when present; retain the publisher timestamp separately as `publishedAt`.
  Rationale: The collection records when Ciaran curated the link, while the original article's date remains useful attribution. Read the stream item's top-level `actionTimestamp` first, then the relevant saved tag's timestamp for documented API-shaped payloads. If neither exists, the importer must mark the date source and use a documented deterministic fallback rather than silently pretending the publisher date is the save date.
  Date/Author: 2026-09-07 / Codex

- Decision: Use a readable title slug with a short hash of Feedly's immutable entry ID in every generated filename and permalink.
  Rationale: Titles and canonical URLs may change, and two saved entries can share a title or day. Including an ID-derived suffix makes identities stable and collision-resistant on the first run and every rerun.
  Date/Author: 2026-09-07 / Codex

- Decision: Import only metadata and a short sanitized excerpt; do not import `fullContent` or Feedly's article HTML into Link bodies.
  Rationale: The post is a link and attribution page, not a republication of third-party work. Omitting full content reduces copyright, security, storage, and stale-content risk. Ciaran can add original commentary to the Markdown body later, and the importer must preserve it.
  Date/Author: 2026-09-07 / Codex

- Decision: Deduplicate primarily by Feedly entry ID and secondarily by normalized target URL, and never overwrite an existing file during the default sync.
  Rationale: Entry IDs make reruns idempotent; normalized URLs catch duplicate Feedly representations. Skip-by-default protects manual edits and previously written `standardUri` values.
  Date/Author: 2026-09-07 / Codex

- Decision: Represent public Link pages in ATproto with `site.standard.document`, not `app.bsky.bookmark`, `app.bsky.feed.post`, or a new custom Lexicon.
  Rationale: Standard.site already models verified public webpages and is already used by this site. Bluesky bookmarks are private and post-only; automatic feed posts would spam followers during backfill; and a custom Lexicon would add schema publication and indexing work without an MVP benefit.
  Date/Author: 2026-09-07 / Codex

- Decision: Keep Feedly import and ATproto publication as separate explicit commands.
  Rationale: Feedly reads and PDS writes have different credentials, side effects, and recovery paths. A successful import should be reviewable in Git before any public ATproto records are created.
  Date/Author: 2026-09-07 / Codex

- Decision: Preserve the current `standard:publish` default of Writing-only and add explicit `--type links` and `--type all` modes.
  Rationale: Existing operator expectations should not change so that a familiar command suddenly publishes a large historical collection.
  Date/Author: 2026-09-07 / Codex

- Decision: Present Links as an editorial ledger under the visual thesis “curated, not collected.”
  Rationale: A restrained chronological index, strong typographic hierarchy, local “Notes & details” action, and clearly separate publisher action communicate deliberate curation rather than an undifferentiated bookmark dump. Search is the only client-side interaction needed for the preview.
  Date/Author: 2026-09-07 / Codex

- Decision: Preserve the cardless ledger while making retrieval controls explicit and touch-comfortable.
  Rationale: Current linkblog/archive references support chronological browsing, visible search, attribution, RSS, and stable page URLs. A visible Search button removes an implicit keyboard-only cue, while 44×44px utility targets exceed WCAG 2.2's 24×24px AA minimum and align with the project's higher comfort bar without introducing bookmark-manager chrome.
  Date/Author: 2026-09-08 / Codex

- Decision: Mark the bundled entries with `mock: true` and show a prominent “Preview data · Mock Feedly stars” label.
  Rationale: The preview must be useful for design and behavior review without implying that invented publishers, authors, dates, or articles came from Ciaran's Feedly account.
  Date/Author: 2026-09-07 / Codex

- Decision: Do not perform live ATproto writes for mock Links.
  Rationale: Standard.site records are public repository records. Publishing invented preview content would create durable external state and undermine the separation between reviewed local import and explicit ATproto publication.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

The mock-preview scope is implemented. The provider-neutral fixture contains five Feedly-shaped items over two pages. The first real file import created three Git-tracked mock Links, skipped one duplicate normalized destination, and rejected one `javascript:` destination. One imported Link used a publisher timestamp because its save action timestamp was absent. A second dry run created nothing, skipped four items (the three existing identities plus the fixture duplicate), and rejected the same unsafe URL.

The site now exposes the collection through `/links/`, stable year/month/day/detail routes, `/links/feed.xml`, the combined feed, and search. The visual design uses an editorial ledger with a “curated, not collected” thesis, visible mock provenance, separate local/outbound actions, and a single search interaction. Desktop and mobile screenshots were reviewed; navigation remains one row at 320px and 390px.

The Standard.site publisher now supports `--type writing|links|all`, preserves Writing as its default, maps Links to their local canonical paths, and reuses or uploads the publication icon. A public, credential-free dry run resolved Ciaran's existing publication and planned three Link documents. No mock Standard.site record, Bluesky post, or Bluesky bookmark was created.

Real Feedly acquisition and local import are complete. The gitignored export contains 2,633 unique entries across 27 continuation pages. After stripping known tracking parameters and eight exact subscriber-token parameters, the final audit plans 2,625 public Link files, skips eight duplicate destinations, rejects none, and uses Feedly save time for every eligible item. All three mock files have been removed. The import is idempotent: a repeat dry run plans zero writes and accounts for all 2,633 source items as existing or duplicate.

The scale-hardening architecture is implemented and measured. Static generation remains the approved architecture: Pagefind provides chunked search; all Link collection pages are bounded at 50 rows with static previous/next navigation; search renders at most 12 results; feeds contain the latest 50 Links; and all Link pages share one generated collection social card. The final measured artifact has 6,866 files and is 57,273,399 bytes, with a largest asset of 3,049,958 bytes. Clean builds on the final architecture completed in 9.93s to 11.22s, dramatically below both build-time escalation thresholds. D1 remains an optional future read model rather than a dependency.

The UI keeps the “curated, not collected” editorial thesis at full scale. Desktop and mobile screenshots show the 2,625-Link count, 365 sources, searchable year navigation, and a calm first viewport rather than thousands of rows. All 66 Playwright checks pass, including Pagefind query/filter/history behavior, archive next/previous links, keyboard structure, one-row mobile navigation, and no-JavaScript paging.

The final design review retained that thesis and architecture. A current pattern scan covering Adactio, Daring Fireball, Kottke, Waxy, and Raindrop confirmed that chronological archives, source attribution, search, RSS, and stable page positions remain the useful conventions; Waxy's 2026 archive refresh was the closest modern comparison. The final polish adds a labelled visible Search action and 44×44px year, row-action, and pagination targets. The revised archive has no horizontal overflow at 1280px, 390px, or 320px. After incorporating the latest `main` breadcrumb work, final validation passes 69 unit tests, 76 Playwright tests, Astro lint across 102 files, TypeScript, and a 4,067-page build with 68 verified social previews and 2,662 Pagefind-indexed pages.

Standard.site publication is now operationally resumable. A public, credential-free dry run resolved the existing publication and selected exactly one deterministic missing Link. Live publication has not run: the required order is to approve and deploy the local public pages, then use one explicit canary followed by missing-only batches of at most 100. No Standard.site document, Bluesky post, or Bluesky bookmark was created in this phase.

The reviewed archive is now on PR #41 and on the branch-scoped Cloudflare preview. Final workflow run 34193980981 completed in 1m27s using the trusted workflow from `main` after the branch incorporated every current base commit. The stable branch preview and immutable deployment are recorded below. Public smoke checks returned HTTP 200 for the index, page two, the Pagefind runtime, and the shared Links social image. The preceding full smoke on the same Links implementation also covered a representative detail, both feeds, and a real 390px browser with 50 rows, no overflow, next-page navigation, correct social metadata, and bounded Link-filtered search. Production remains out of scope until review and merge.

During implementation, `main` gained repository-owned GitHub Actions deployments to Cloudflare Pages. The feature branch was rebased onto that deployment contract, and the final preview was requested through `.github/workflows/deploy-preview.yml` rather than an artifact-copy branch.

Stable branch preview:

    https://clyons-feedly-stars-to-til.ciaranlyons.pages.dev/links/

Latest immutable deployment:

    https://091e6650.ciaranlyons.pages.dev/links/

Latest workflow evidence:

    https://github.com/clyons/ciaranlyons/actions/runs/34193980981

The final full-data workflow completed in 1m27s after checkout, lint, 69 unit tests, a clean build with generated social previews, Pagefind indexing, and Cloudflare upload. Production was not deployed. Earlier mock and pre-merge full-data deployments remain useful baselines but are superseded by this application/content-head preview.

## Context and Orientation

This repository is an Astro 7 static site. It reads Markdown from `content/` during the build and generates date-based pages, feeds, and, currently, `search.json`.

The real Feedly export contains 2,633 unique entry IDs. Final URL normalization leaves 2,625 public candidates and eight duplicate destinations. The implemented pagination adds static page variants where a collection exceeds 50 entries; the current artifact contains 2,625 Link detail pages and 1,363 Link archive pages, with no archive above 50 rows. Pagefind replaces the former eager `search.json` payload and indexes detail content after Astro builds.

The closest content type is TIL:

- `src/lib/content.ts` defines `TilEntry`, reads `content/til/<topic>/*.md`, validates frontmatter, derives date parts, sorts entries, and generates `/til/YYYY/MM/DD/<slug>/` URLs.
- `src/pages/til/index.astro` renders the collection and client-side filtering.
- `src/pages/til/[year]/`, `[month]/`, `[day]/`, and `[slug].astro` create date archive and detail routes.
- `src/pages/til/feed.xml.ts` creates the section feed.

Cross-cutting content surfaces are:

- `src/lib/search.ts` and `src/pages/search.json.ts`, which create the search index;
- `src/pages/feed.xml.ts`, which creates the combined feed;
- `src/layouts/BaseLayout.astro`, which owns canonical, RSS, Standard.site, and primary-navigation markup;
- `src/styles/global.css`, which owns archive, article, and responsive navigation styling;
- `tests/ui/site.spec.ts`, which covers core route accessibility, small-screen navigation, and screenshots.

Existing remote-source and ATproto code is:

- `scripts/sync-bsky-notes.mjs` and its tests, the safety/idempotence precedent for a remote-to-Markdown sync;
- `src/lib/atproto.ts`, which reads Bluesky posts for Notes but is not a generic ATproto content store;
- `scripts/publish-standard-site.mjs` and its tests, which explicitly publish Writing as `site.standard.document` records;
- `src/layouts/BaseLayout.astro`, which emits `rel="site.standard.publication"` globally and accepts a `standardDocumentUri` for document pages;
- `public/images/ciaran-profile.jpeg`, an existing square JPEG under Standard.site's 1 MB icon limit that can be uploaded once for publication metadata.

The proposed Link source file shape is:

    ---
    title: "Example article"
    description: "A short, plain-text publisher excerpt."
    date: 2026-09-07
    savedAt: 2026-09-07T15:04:05.000Z
    dateSource: saved
    publishedAt: 2026-09-01T10:00:00.000Z
    targetUrl: "https://publisher.example/article"
    sourceTitle: "Publisher"
    author: "Author Name"
    feedlyId: "immutable Feedly entry id"
    feedlyUrl: "https://feedly.com/i/entry/..."
    tags:
      - design
    standardUri: "at://did:plc:.../site.standard.document/..."
    ---

    Optional commentary written by Ciaran after import.

`title`, `date`, `dateSource`, `targetUrl`, and `feedlyId` are required for imported files. `savedAt`, `publishedAt`, `description`, `sourceTitle`, `author`, `feedlyUrl`, `tags`, `standardUri`, and the body are optional. `dateSource` is `saved`, `published`, or `imported`, so fallback dates are always auditable. The loader computes the local `url`; `targetUrl` is always the external destination.

The initial route shape mirrors TIL but does not add a topic dimension:

    /links/
    /links/feed.xml
    /links/<YYYY>/
    /links/<YYYY>/<MM>/
    /links/<YYYY>/<MM>/<DD>/
    /links/<YYYY>/<MM>/<DD>/<title>-<id-hash>/

## Plan of Work

### Milestone 1: Prove complete, supported Feedly acquisition

The intended result is a redacted fixture representing Ciaran's actual saved stream and a known total or pagination path before production import code is treated as complete.

First check whether Ciaran can generate/use a current Feedly token without ever printing it. With `FEEDLY_ACCESS_TOKEN` set only in the local process environment, call the documented profile endpoint and then the documented Streams Contents endpoint. Prefer an explicitly supplied `FEEDLY_STREAM_ID`; only derive `user/<profile-id>/tag/global.saved` after the probe confirms that exact stream exists. Request `count=1`, `includeAiActions=false`, and `similar=false` for the proof. Record only status, response keys, redacted stream ID shape, tag IDs/labels, and whether a matching tag has `actionTimestamp`.

If the API returns 401 or 403 because the account lacks current API entitlement, first seek a supported saved-article JSON export/backup from Feedly and pass it through the file adapter planned below. OPML is explicitly rejected because it omits saved articles. For this account those supported paths were unavailable, so Ciaran explicitly authorized a one-time local browser-session export against Feedly's stream endpoint. That acquisition may be repeated only as a user-directed local operation: read the Feedly web token into process memory, send it only to Feedly over HTTPS, never print or persist it, store responses only under the gitignored `.context/` directory with mode `0600`, and never make the production site or CI depend on Chrome state. If no approved source contains the historical saves, update `Progress`, `Surprises & Discoveries`, and `Outcomes & Retrospective` with the blocker before claiming the full backfill is achievable.

Create redacted fixtures under `scripts/fixtures/feedly/` only after removing token, account ID, annotations, personally identifying metadata, and unrelated article content. Include at least two pages joined by `continuation`, duplicate target URLs, a missing canonical URL, a missing save timestamp, unsafe URL protocols, HTML in summary/title fields, and a repeated continuation error case. Fixtures may use invented values as long as their structure matches the verified response.

Acceptance for this milestone is a documented acquisition path and fixture shape, not a production data write.

### Milestone 2: Implement the Link model and safe importer

In `src/lib/content.ts`, add `LinkEntry` and `getLinks()`. Read `content/links/*.md`; validate safe slugs, real dates, optional RFC 3339 timestamps, only HTTP(S) `targetUrl`/`feedlyUrl`, allowed `dateSource`, and unique Feedly IDs, local permalink identities, and normalized target URLs. Compute `year`, `month`, `day`, rendered body HTML, and `/links/YYYY/MM/DD/<slug>/`. Sort by `savedAt` or `date` descending with a deterministic slug tie-breaker.

Extend `src/lib/content-validation.ts` only for reusable primitives that are missing, such as required HTTP(S) URLs, enums, and timestamps. Add focused tests to `src/lib/content-validation.test.mjs` or a new `src/lib/link-content.test.mjs`. Do not relax existing URL/path validation.

Add `scripts/sync-feedly-links.mjs` with exported pure transformation helpers and a small command wrapper. Support:

    node scripts/sync-feedly-links.mjs [--dry-run] [--input FILE] [--stream-id ID] [--limit N] [--report FILE] [--csv FILE]

When `--input` is absent, require `FEEDLY_ACCESS_TOKEN` and use `FEEDLY_STREAM_ID` or the verified saved-stream discovery path. Fetch `https://api.feedly.com/v3/streams/contents` with `count=100`, `includeAiActions=false`, `similar=false`, and each opaque continuation until exhaustion. Use a 10-second timeout per request, a bounded response size, a set of seen continuations, and a high explicit maximum page guard that fails rather than truncates. Handle 401, 403, and 429 with safe actionable errors and never include the bearer token in output.

Normalize each item as follows:

1. Require Feedly's immutable string `id`.
2. Select `canonicalUrl` when it is HTTP(S), otherwise the first HTTP(S) `alternate` with `type: text/html`; never treat `originId` as a guaranteed URL.
3. Remove URL fragments, lowercase only the scheme and host, remove default ports, preserve path/query semantics, and use the result for duplicate comparison. Do not follow redirects or fetch target pages during import.
4. Read the stream item's top-level `actionTimestamp` as `savedAt`; if absent, read the matching saved-stream tag's `actionTimestamp`. If both are absent, use `published`, then the current import date as the final fallback, and write `dateSource: published` or `dateSource: imported`; report every fallback.
5. Preserve `published` independently as `publishedAt` when valid.
6. Convert the title to plain text and fall back to the target host if empty. Build a bounded readable slug plus the first 10 lowercase hex characters of SHA-256 over the Feedly ID.
7. Convert `summary.content` to plain text with the existing `sanitize-html` dependency configured with no allowed tags, normalize whitespace, and truncate at a documented character boundary. Never persist `fullContent`, `content.content`, `linked`, or AI-action bodies.
8. Preserve safe source title, author, Feedly web URL, and non-system board labels as metadata. Do not import Feedly annotations in the first implementation; that avoids accidentally publishing private comments/highlights without review.

Before writing, index existing files by `feedlyId` and normalized `targetUrl`. The default action for either match is `skip`, with a report that explains the identity. Write only missing files using safe destination checks and same-directory atomic rename. Do not implement blanket overwrite. A future metadata-refresh mode must update only generated frontmatter fields while preserving `standardUri` and body, but is not required for this milestone.

`--dry-run` writes no content. `--report FILE` is an explicit exception that writes a machine-readable audit report, preferably under `.context/`, with counts and public metadata but no token or full article content. `--csv FILE` writes a review-oriented CSV with one row per source item and the columns `status`, `status_detail`, `saved_at`, `published_at`, `title`, `description`, `target_url`, `source_title`, `author`, `tags`, `feedly_id`, `feedly_url`, and `local_slug`; it must omit article HTML and credentials, quote fields according to RFC 4180, and neutralize text beginning with `=`, `+`, `-`, or `@` so spreadsheet applications cannot interpret imported text as formulas. Add `"links:sync": "node scripts/sync-feedly-links.mjs"` to `package.json`.

Add `scripts/sync-feedly-links.test.mjs` covering URL selection/validation, save-date and fallback rules, stable slugs, frontmatter escaping, sanitization/truncation, multi-page continuation, repeated cursors, response limits, duplicate ID/URL handling, existing-file preservation, dry run, atomic failure behavior, and redacted auth errors.

Acceptance for this milestone is that fixture import produces the expected deterministic Markdown, a second import writes nothing, and malformed or duplicate items produce an explicit report without corrupting existing content.

### Milestone 3: Add Links to the generated site

Create the following routes by adapting the TIL archive structure while keeping Link-specific semantics:

- `src/pages/links/index.astro`
- `src/pages/links/feed.xml.ts`
- `src/pages/links/[year]/index.astro`
- `src/pages/links/[year]/[month]/index.astro`
- `src/pages/links/[year]/[month]/[day]/index.astro`
- `src/pages/links/[year]/[month]/[day]/[slug].astro`

The index and archives should link to local Link detail pages, show publisher/author and saved date when available, and make the external destination apparent. The detail page should use its local permalink as canonical, pass `standardUri` to `BaseLayout`, show the short excerpt and optional original commentary, and offer one unambiguous outbound link to `targetUrl`. Astro must escape all metadata by default; only the site's sanitized Markdown renderer may use `set:html`. Do not render imported third-party HTML.

Add Links to `src/layouts/BaseLayout.astro` primary navigation and add a Links-specific RSS alternate on Links pages if the layout interface is extended for section feeds. Update `src/styles/global.css` with the smallest necessary Link metadata/CTA styles and responsive navigation adjustment. Preserve the one-row 320px navigation expectation unless a deliberate, accessible alternate mobile navigation is chosen and documented.

Update `src/lib/search.ts` so `SearchItem['type']` includes `Link`; index title, description, source, author, tags, target host, and Ciaran's body, but make the search result URL the local Link page. The mock milestone may continue emitting `/search.json`; Milestone 5 replaces that eager payload with Pagefind before real-data promotion. Update `src/pages/search.astro` copy and no-script message. Update `src/pages/feed.xml.ts` to include Links and its channel description. The Links-only feed should link each item to the local canonical Link page and include the external target in the description; it should not use the publisher URL as the RSS GUID.

Add `links` to `tests/ui/site.spec.ts` core routes and divider tests, assert the outbound link and source attribution on one fixture-backed detail page, assert correct canonical/Standard link markup, update the mobile navigation control count, and add visual snapshots only if Links introduces a genuinely new approved page baseline. Unit-test combined and Links-only feed inclusion with distinctive fixture content.

Acceptance for this milestone is a network-independent static build in which the fixture Link appears once in `/links/`, the correct date archives, `/links/feed.xml`, `/feed.xml`, and `/search.json`, and in which all internal links use the local canonical URL while the CTA uses the external target.

### Milestone 4: Publish Link metadata through ATproto

Generalize `scripts/publish-standard-site.mjs` around a common internal document shape instead of duplicating PDS code. The common shape must contain `kind`, source file, stable slug/identity, title, description, published date, updated date, local path, plain-text content, and optional `standardUri`. Keep the default invocation Writing-only. Add:

    npm run standard:publish -- --type writing
    npm run standard:publish -- --type links
    npm run standard:publish -- --type all

For a Link, the Standard.site document `path` is its local `/links/YYYY/MM/DD/<slug>` path. Its `title` and `description` describe Ciaran's Link page. Its `textContent` contains only Ciaran's body plus minimal page text, never Feedly full content. The original publisher URL remains site-page metadata; it is not substituted for the verified document path. Use the existing deterministic record-key helper and `standardUri` frontmatter update so retries update rather than duplicate records.

Broaden the `site.standard.publication` description from Writing-only to the actual published collection. While touching publication publishing, fetch and preserve the existing publication value and add the existing square `public/images/ciaran-profile.jpeg` as the publication icon if no icon is present. Upload it once with `com.atproto.repo.uploadBlob`; preserve the returned blob reference on subsequent updates. This improves Standard.site presentation in Bluesky's enhanced link cards without making icon upload a build-time action.

Do not call `app.bsky.bookmark.*`. Do not create `app.bsky.feed.post` records during import or Standard.site publication. If future forward syndication is desired, design a separate opt-in command that posts one newly reviewed Link with an `app.bsky.embed.external` and the document/publication `associatedRefs`; historical backfill is explicitly excluded.

Extend `scripts/publish-standard-site.test.mjs` for type selection, Link paths, deterministic rkeys, Link `standardUri` writes, preservation of body/other frontmatter, publication icon reuse, and the absence of any Bluesky post/bookmark call. The dry run must require no app password and make no PDS writes. Live mode continues to require a revocable app password and exact `ATPROTO_DID` match.

Acceptance for this milestone is a Links-only dry run that reports the exact Link documents it would create/update without touching Writing or a Bluesky timeline. After an intentional live test on one Link, the local page contains both Standard.site verification links and its AT URI resolves from Ciaran's PDS.

Before the historical publication run, add an explicit missing-only batch mode such as:

    npm run standard:publish -- --type links --missing-only --limit 100

`--missing-only` selects only Link files without `standardUri`; `--limit` must be a positive integer and defaults to no cap for backward compatibility. Sort candidates deterministically by local path so repeated invocations select a stable next batch. Write each successful record URI atomically before advancing. Begin with the existing single-slug canary, verify its public record and page metadata, then use batches of at most 100. A failure may leave a partial successful batch, but rerunning `--missing-only` must continue from the remaining files without duplicating records.

### Milestone 5: Harden the static archive for the real collection

Keep Astro and Cloudflare Pages as the serving architecture. Do not add a runtime database in this milestone.

Define one shared `LINKS_PER_PAGE` value of 50. Keep the existing `/links/`, `/links/<YYYY>/`, `/links/<YYYY>/<MM>/`, and `/links/<YYYY>/<MM>/<DD>/` URLs as the first page of each collection. Add static page routes under explicit `/page/<N>/` suffixes for every collection that exceeds 50 entries. Each page must contain previous/next links with accessible labels, retain newest-first ordering, expose the total result count, use a canonical URL for that exact page, and render no more than 50 Link rows. Do not generate `/page/1/`; redirecting it is unnecessary when it is never linked.

Replace the Links-page DOM filter and the eager `/search.json` implementation with Pagefind, run after the Astro build. Mark only useful page content and metadata for indexing; exclude repeated navigation/footer text and exclude date-archive pages when their results would duplicate detail pages. Add `type`, year, source, and tags as Pagefind metadata/filters where the generated HTML has those values. Preserve the existing `/search/?q=` URL behavior and accessible live status, but request result data in bounded pages rather than materializing every result. The `/links/` search control should use the same Pagefind index pre-filtered to `type=Link`, or link to the global search with that filter; it must not keep thousands of hidden DOM rows.

Cap both `/links/feed.xml` and the Link contribution to `/feed.xml` at the latest 50 entries. RSS is a change feed, not a complete archive. Keep stable local Link permalinks as item identity.

Add unit tests for page slicing, canonical page URLs, boundary cases at 0/1/50/51 entries, deterministic ordering, and feed caps. Update Playwright coverage for next/previous navigation, filtered search, browser history/query behavior, keyboard operation, no-JavaScript archive navigation, and 320px/390px layout. Tests must assert that a generated archive document contains at most 50 result rows.

After the reviewed real import exists locally but before it is committed or deployed, run two clean production-shaped builds including Pagefind. Record elapsed build/index time, `dist/` file count, total artifact size, Pagefind bundle size, the largest asset, and representative desktop/mobile page weights. The target is under five minutes; two builds at or above ten minutes, or an artifact at or above 15,000 files, pauses promotion and triggers a new D1/Pages Functions ExecPlan rather than an improvised migration inside this one. Verify the generated artifact remains below Cloudflare's current 20,000-file free-plan and 25 MiB single-asset limits.

Acceptance for this milestone is a network-independent static artifact in which no archive page contains more than 50 Links, search works without downloading the complete collection, feeds contain at most 50 Links, two representative clean builds remain below the escalation thresholds, and the manually dispatched Cloudflare preview passes desktop/mobile navigation and search checks with the real-data page shape.

### Milestone 6: Review and perform the historical backfill

Run a complete dry run against the proven Feedly source and write the audit report under `.context/`. Review counts, invalid URLs, duplicates, date fallbacks, titles, private-looking annotations/parameters, and unexpectedly sensitive destinations before creating public files. Query strings may contain tracking or secrets; flag common tracking parameters in the report and remove only a conservative documented allowlist of known tracking parameters rather than deleting arbitrary query strings.

After review, run the real import once. Inspect a representative spread of old/new entries and every warning class. Commit only the generated metadata necessary for public Link posts; do not commit the audit report, token, raw Feedly responses, cookies, or full third-party content.

Run all validation and build output checks, including the scale measurements from Milestone 5. Publish Standard.site documents only after the Git diff is approved and the local Link URLs are deployed: first with `--type links --slug <one-slug>`, then with repeated `--type links --missing-only --limit 100` batches. Verify and record the canary plus each batch's counts; do not create one unbounded 2,625-record operation. Update `docs/operations/import-feedly-links.md` with local browser-session/export handling, CSV review, dry-run/review/import, rerun behavior, file input, pagination/Pagefind behavior, batched Standard.site publication, and recovery. Update the main publishing documentation only where it must mention Links.

## Concrete Steps

Run all commands from `/Users/ciaran/conductor/workspaces/ciaranlyons/cambridge`.

Confirm branch scope before implementation:

    git status --short --branch
    git log origin/main..HEAD --oneline

Expected result: the branch is `clyons/feedly-stars-to-til`, and every commit/change shown is related to this feature. Do not rename the branch.

Install the locked dependencies:

    npm ci

Probe Feedly only with the token already supplied in the process environment. Never place the token on the command line because shell history and process listings may expose it:

    test -n "$FEEDLY_ACCESS_TOKEN"
    npm run links:sync -- --dry-run --limit 1 --report .context/feedly-links-probe.json

Expected result after Milestone 2: one eligible item is parsed or the command reports a specific 401/403 entitlement problem without printing the token. If the stream cannot be safely derived, set `FEEDLY_STREAM_ID` in the environment or pass its non-secret value with `--stream-id`.

Run fixture tests and a fixture dry run:

    npm test
    npm run links:sync -- --dry-run --input scripts/fixtures/feedly/two-pages.json --report .context/feedly-links-fixture-report.json

Expected result: tests exit 0; the dry run reports deterministic would-write/skip/reject counts and writes no `content/links/*.md` files.

Before the live backfill:

    npm run links:sync -- --dry-run \
      --input .context/feedly-saved-browser-export.json \
      --stream-id "$FEEDLY_STREAM_ID" \
      --report .context/feedly-links-backfill.json \
      --csv .context/feedly-saved-articles.csv
    chmod 600 .context/feedly-saved-browser-export.json \
      .context/feedly-links-backfill.json \
      .context/feedly-saved-articles.csv
    wc -l .context/feedly-saved-articles.csv

Expected result: the report and CSV account for 2,633 source items as 2,625 eligible, eight duplicate destinations, and zero rejected; all eligible rows use `dateSource: saved`; the CSV contains one RFC 4180 record per source item plus its header (quoted fields may legitimately contain physical newlines); continuation ends naturally; all three artifacts are mode `0600`; no content file changes. The audit must contain no credential-bearing destination URL.

After reviewing `.context/feedly-links-backfill.json`, perform the local import:

    npm run links:sync -- \
      --input .context/feedly-saved-browser-export.json \
      --stream-id "$FEEDLY_STREAM_ID"
    npm run links:sync -- --dry-run \
      --input .context/feedly-saved-browser-export.json \
      --stream-id "$FEEDLY_STREAM_ID"

Expected result: the first command creates the reviewed Link files atomically; the second reports zero new writes and the same duplicate/rejection accounting.

Run repository validation:

    npm run test
    npm run lint
    npx tsc --noEmit
    npm run build
    npm run test:ui

Expected result: all commands exit 0; Astro reports no errors; Playwright verifies Links at desktop and 320px/390px layouts.

Run and record two clean full-data scale checks after Pagefind is part of `npm run build`:

    /usr/bin/time -p npm run build 2> .context/feedly-links-build-1.time
    npm run links:validate-artifact | tee .context/feedly-links-artifact-1.txt
    /usr/bin/time -p npm run build 2> .context/feedly-links-build-2.time
    npm run links:validate-artifact | tee .context/feedly-links-artifact-2.txt

Implement `scripts/validate-links-artifact.mjs` and `links:validate-artifact` so this check reports total files and bytes, largest asset, Link detail/archive page counts, maximum Link rows on any archive page, Pagefind bundle bytes, and Link counts in both feeds. Expected result: each archive has at most 50 rows, both feeds have at most 50 Links, Pagefind assets exist, both builds finish under five minutes when practical and below the ten-minute escalation threshold, the artifact contains fewer than 15,000 files, and no asset approaches Cloudflare Pages' 25 MiB limit.

Inspect representative generated output:

    rg -n 'Example distinctive imported title' dist/links dist/links/feed.xml dist/feed.xml
    test -d dist/pagefind
    rg -n 'rel="canonical"|site.standard.document|site.standard.publication' dist/links
    rg -n 'fullContent|FEEDLY_ACCESS_TOKEN|Authorization: Bearer' content/links dist .agent/execplans/2026-09-07-feedly-starred-links.md

Replace the example title with a real distinctive imported title. Expected result: the title appears on the local Link surfaces; canonical URLs point to `ciaranlyons.com/links/...`; no full article field or credential appears. The plan contains the environment variable name but never its value.

Exercise explicit ATproto behavior:

    npm run standard:publish -- --dry-run --type links
    npm run standard:publish -- --dry-run --type writing

Expected result: the first lists only Link paths and the second only Writing paths; neither requires credentials or writes local/external state.

For a deliberately selected live canary, with `ATPROTO_DID`, `ATPROTO_HANDLE`, and `ATPROTO_APP_PASSWORD` supplied securely:

    npm run standard:publish -- --type links --slug <reviewed-link-slug>
    npm run build

Expected result: one Link gains a valid `standardUri`; its built page includes the matching `site.standard.document` link and the shared publication link. Verify the record through the account's resolved PDS using a credential-free `com.atproto.repo.getRecord` query, then publish the remainder only after the canary succeeds:

    npm run standard:publish -- --type links --missing-only --limit 100

Repeat only after verifying the previous batch count and representative records. Expected result: each invocation publishes at most 100 deterministic records, records each successful `standardUri`, and eventually reports zero missing Link documents. A rerun after interruption continues with unrecorded files rather than duplicating completed records.

Before requesting merge:

    git diff --check
    git status --short
    git log origin/main..HEAD --oneline

Expected result: no whitespace errors, no raw exports/reports/secrets, and only feature-related work. The PR must cite `.agent/execplans/2026-09-07-feedly-starred-links.md`, summarize the import counts and ATproto choices, and include validation evidence.

## Validation and Acceptance

The implementation is accepted only when all of the following are true:

- The complete available saved stream is paginated to exhaustion; it is not capped at the first 20/100 items or last 31 days.
- Every fetched item is accounted for as imported, duplicate, or rejected with a reason.
- Imported entries prefer `canonicalUrl`, safely fall back to HTML `alternate.href`, and never publish non-HTTP(S) destinations.
- Link dates reflect the Feedly save action when present; every fallback is recorded and visible through `dateSource`.
- A second identical sync creates no files and changes no manually edited Markdown.
- Duplicate Feedly IDs and normalized target URLs do not create duplicate public posts.
- No raw Feedly token, authorization header, browser cookie, raw account export, full article body, or AI-action content is committed or emitted in `dist/`.
- `/links/` and year/month/day archives contain the expected entries and stable permalinks; page-one URLs remain canonical and additional pages use `/page/<N>/`.
- No generated Link collection page renders more than 50 result rows; previous/next navigation remains usable without JavaScript and at 320px/390px widths.
- Each Link detail page has one local canonical URL, clear publisher attribution, and a valid outbound original-article link.
- `/links/feed.xml` and `/feed.xml` contain at most the latest 50 Links with the local permalink as identity.
- Pagefind indexes Link title, description, source, author, tags, target host, and Ciaran's commentary while excluding duplicate archive/navigation text; global and Link-filtered search work without downloading a complete JSON collection.
- Primary navigation remains usable and non-overflowing at 320px and 390px, and Link routes meet the existing heading/navigation/keyboard conventions.
- Builds and all tests run without Feedly or ATproto network availability because remote data has already been materialized.
- Two full-data clean builds plus Pagefind complete below the ten-minute escalation threshold, the artifact remains below 15,000 files, and `scripts/validate-links-artifact.mjs` reports no archive/feed/page-weight violation.
- `standard:publish` remains Writing-only by default; `--type links` is explicit and idempotent.
- Link publication supports a one-record canary and deterministic `--missing-only --limit 100` batches that resume after partial success.
- A published Link's Standard.site record points to its local Link path and its page points back to the exact AT URI.
- No historical import creates Bluesky bookmarks or timeline posts.
- `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run test:ui` all exit 0.

## Idempotence and Recovery

Feedly dry runs and fixture runs are safe to repeat. Live imports are additive: existing `feedlyId` or normalized target URL identities are skipped. Atomic same-directory writes prevent a failed process from leaving partial Markdown. A repeated continuation or excessive page count fails loudly rather than looping or silently truncating the collection.

Pagination and Pagefind are derived artifacts. Re-running the build replaces `dist/` from source and regenerates the same page slices and search records in deterministic order. There is no runtime database to migrate or repair in this plan. If a scale threshold triggers the D1 option, stop and create a separate ExecPlan; do not partially introduce D1 while retaining two writable sources of truth.

If the API fails partway through pagination, write no content until all requested pages have been fetched, normalized, and audited in memory or a temporary file. If collection size makes this unreasonable, persist only a gitignored checkpoint under `.context/` and promote content files after the final page validates. Rerunning from scratch is preferred for the expected personal collection size.

If a generated Link is wrong before merge, remove only that explicit `content/links/<slug>.md` file and correct the transformation or fixture; do not bulk-delete `content/links/`. If a Link has been manually edited, the default importer skips it. Recovery never overwrites `.env.local`; repository rules require targeted `sed -i` or append operations only, though this feature should not need to modify `.env.local` at all.

Standard.site dry runs have no side effects. Live document writes use deterministic record keys and `putRecord`, so reruns converge. Missing-only batches inspect `standardUri` and select at most 100 deterministic candidates. If the PDS write succeeds but the frontmatter write fails, rerun the same command: it derives the same rkey, updates the same record, and then records its URI locally. If a Link should be withdrawn from ATproto, add a deliberate documented delete operation or use the PDS API for that exact AT URI; deleting a local file alone does not delete a remote record.

If a future Feedly refresh lacks a supported complete export path, do not substitute OPML or a partial public Board and call the task complete. A browser-session export is permitted only after Ciaran explicitly authorizes that local acquisition and only with the in-memory-token, Feedly-only network destination, gitignored mode-`0600` output, and no-CI-dependency boundaries documented in Milestone 1. Otherwise mark acquisition blocked with the exact options tried. The local Link type and file adapter remain independently testable and can accept a later export without redesign.

## Artifacts and Notes

Repository files inspected while writing this plan:

- `.agent/PLANS.md`
- `.agent/execplans/TEMPLATE.md`
- `.agent/execplans/2026-09-05-syndicate-skeets-as-notes.md`
- `.agent/execplans/2026-09-06-publishing-architecture.md`
- `src/lib/content.ts`
- `src/lib/content-validation.ts`
- `src/lib/search.ts`
- `src/lib/feeds.ts`
- `src/lib/atproto.ts`
- `scripts/sync-bsky-notes.mjs`
- `scripts/publish-standard-site.mjs`
- `src/pages/til/`
- `src/pages/feed.xml.ts`
- `src/layouts/BaseLayout.astro`
- `tests/ui/site.spec.ts`
- `docs/operations/publish-til.md`

Primary/current references reviewed:

- Feedly Authorization: https://developers.feedly.com/reference/authorization
- Feedly Collect Articles: https://developers.feedly.com/reference/collect-articles
- Feedly pagination: https://developers.feedly.com/docs/understanding-continuation
- Feedly Article JSON: https://developers.feedly.com/reference/articlejson
- Feedly OPML/export limits: https://docs.feedly.com/article/52-how-can-i-export-my-sources-and-feeds-through-opml
- Feedly Read Later ordering/privacy: https://docs.feedly.com/article/338-saving-an-article-to-your-read-later-section
- ATproto Lexicon specification: https://atproto.com/specs/lexicon
- ATproto record keys: https://atproto.com/specs/record-key
- Bluesky bookmark Lexicons: https://github.com/bluesky-social/atproto/tree/main/lexicons/app/bsky/bookmark
- Standard.site definitions and verification: https://standard.site/
- Bluesky Standard.site integration notes: https://github.com/bluesky-social/atproto/discussions/4978
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 SQL/FTS5 support: https://developers.cloudflare.com/d1/sql-api/sql-statements/
- Pagefind overview: https://pagefind.app/
- Pagefind browser API: https://pagefind.app/docs/api/

Store transient probe responses and backfill audit reports only in `.context/`, which is gitignored. Commit small redacted structural fixtures under `scripts/fixtures/feedly/`. Never paste real tokens, cookies, raw private annotations, or full Feedly exports into this plan.

Final mock-preview validation evidence:

- `npm test`: 44 passed after rebasing onto the repository deployment-contract tests.
- `npm run lint`: 75 Astro files, 0 errors, 0 warnings, 0 hints.
- `npx tsc --noEmit`: exited 0.
- production-shaped `npm run build` with required public ATproto identity values: 49 pages, including all Link routes and feeds.
- `npm run test:ui`: 44 passed across desktop and mobile projects.
- `npm run standard:publish -- --dry-run --type all --slug design-engineering-in-the-age-of-ai-950e894a5e`: resolved the existing publication and planned exactly one Link document.
- Cloudflare Pages preview smoke: Link index, stylesheet, representative detail page, and Links feed returned HTTP 200. At 390px the search filtered 3 results to 1, six primary-navigation controls fit, the mock provenance was visible, local detail links remained local, and document width remained 390px with no horizontal overflow.

Real-data pre-promotion evidence:

- local browser-session export: 2,633 unique Feedly IDs over 27 continuation pages; final page has no continuation; raw JSON is mode `0600` under `.context/`;
- review CSV: one record for each of 2,633 source items plus one header, 13 metadata-only columns, mode `0600`, no credential markers, and no malformed record shapes;
- final importer audit: 2,625 eligible, eight duplicate destinations skipped, zero rejected, all eligible items use `dateSource: saved`, and zero warnings;
- local import: 2,625 real Markdown files, zero mock entries, and a repeat run with zero writes; generated source and `dist/` contain no `access_token`, authorization header, Feedly credential variable, or `fullContent` field;
- pagination/Pagefind artifact: 2,625 Link details + 1,363 Link archive pages, 50 maximum rows per archive, 50 Links in each feed, 2,711 Pagefind files/2,494,259 bytes, and 6,866 total files/57,273,399 bytes;
- clean builds on the final architecture: 9.93s, 10.29s, and 11.22s wall time, each below the five-minute target and ten-minute escalation threshold; largest asset 3,049,958 bytes;
- regression validation: `npm test` passed 69 tests, `npm run lint` checked 101 Astro files with zero diagnostics, `npx tsc --noEmit` exited 0, and `npm run test:ui` passed 66 checks after reviewed desktop/mobile snapshot updates;
- Standard.site dry run: `--type links --missing-only --limit 1` resolved the existing publication and selected exactly one deterministic Link path without credentials or writes.
- Cloudflare preview: final workflow run 34193980981 succeeded in 1m27s after all current base commits were incorporated; the stable and immutable deployments served the Links index, pagination, Pagefind, and shared social image with HTTP 200. The prior comprehensive smoke on the same Links implementation covered its detail, feeds, and live 390px navigation/search/social-metadata behavior without overflow.

## Interfaces and Dependencies

Add this content interface in `src/lib/content.ts` (exact optionality may be refined by fixture evidence without changing its meaning):

    export interface LinkEntry {
      slug: string
      title: string
      description: string
      date: string
      savedAt?: string
      dateSource: 'saved' | 'published' | 'imported'
      publishedAt?: string
      targetUrl: string
      sourceTitle?: string
      author?: string
      feedlyId: string
      feedlyUrl?: string
      tags: string[]
      standardUri?: string
      body: string
      html: string
      year: string
      month: string
      day: string
      url: string
    }

Expose:

    export function getLinks(): Promise<LinkEntry[]>

The Feedly importer should export pure functions for tests, conceptually:

    parseFeedlyArgs(argv: string[]): SyncOptions
    selectTargetUrl(item: unknown): string | undefined
    normalizeTargetUrl(url: string): string
    linkFromFeedlyItem(item: unknown, context: ImportContext): ImportedLink | Rejection
    linkMarkdown(link: ImportedLink): string
    collectFeedlyStream(options: FetchOptions): Promise<unknown[]>
    planLinkWrites(items: unknown[], existing: ExistingLinkIndex): ImportPlan
    writeFeedlyReviewCsv(actions: ImportPlan, destination: string): Promise<void>

Do not add a Feedly SDK. Node 22 provides `fetch`, `AbortSignal.timeout`, crypto, and filesystem APIs, and the repository already has `gray-matter` and `sanitize-html`. Reuse those dependencies unless fixture evidence proves an SDK is necessary.

Define `LINKS_PER_PAGE = 50` in one shared module and expose a pure page-slicing helper used by root/year/month/day routes and unit tests. Additional static pages use `/page/<N>/` with `N >= 2`; page one retains each collection's existing URL. Add Pagefind as a pinned development dependency and run it after `astro build`. The generated `dist/pagefind/` directory is an artifact, not committed source. Add `scripts/validate-links-artifact.mjs` and `npm run links:validate-artifact` for bounded row/feed/file/page-weight assertions.

Generalize Standard.site publishing around an internal interface such as:

    interface StandardDocumentSource {
      kind: 'writing' | 'links'
      file: string
      slug: string
      path: string
      title: string
      description: string
      publishedAt: string
      updatedAt?: string
      textContent?: string
      standardUri?: string
      raw: string
    }

The published ATproto interfaces remain:

- `site.standard.publication` for `https://ciaranlyons.com`;
- `site.standard.document` for each local Writing or Link page;
- `com.atproto.server.createSession` for the current explicit app-password workflow;
- `com.atproto.repo.uploadBlob` for the optional missing publication icon;
- `com.atproto.repo.putRecord` for idempotent publication/document writes.

Feedly and ATproto credentials are runtime-only:

- `FEEDLY_ACCESS_TOKEN` for API reads;
- `FEEDLY_STREAM_ID` when the saved stream cannot be safely discovered;
- `ATPROTO_HANDLE`, `ATPROTO_DID`, and `ATPROTO_APP_PASSWORD` for explicit PDS writes;
- `STANDARD_SITE_PUBLICATION_AT_URI` for site verification/build metadata.

No credential is required for a normal static build, local content read, fixture test, Feedly `--input` import, or Standard.site dry run.

## Change Log

- 2026-09-07: Created the plan after repository inspection and current Feedly/ATproto research. Chose a dedicated local Links type, a supported-API/file acquisition boundary, save-date semantics, non-destructive import, Standard.site document publication, and no automatic Bluesky bookmark/feed writes.
- 2026-09-07: Implemented the fixture-driven importer, three visibly mocked Link records, full site surfaces, editorial design and responsive navigation, Standard.site Link publication support, tests, screenshots, and operator documentation. Recorded that real Feedly/ATproto writes remain a production follow-up rather than part of the mock preview.
- 2026-09-07: Built and smoke-tested an interim branch-backed preview after Cloudflare connector authentication and employer-scoped Vercel credentials ruled out those direct hosts. While implementation was in progress, `main` gained a repository-owned Cloudflare Pages workflow; rebased the feature onto that contract so the final preview can use the sole approved deploy controller.
- 2026-09-07: Dispatched the repository-owned preview workflow for `clyons/feedly-stars-to-til`; it completed successfully in 1m8s and published stable and immutable Cloudflare Pages URLs. Verified index, assets, detail, feed, mock labeling, search, navigation, and mobile overflow on the public deployment.
- 2026-09-08: Recorded the complete 2,633-item acquisition and corrected top-level save timestamps. Reassessed the 2,626 publishable Links as a projected 3,851-page static workload. Kept Astro/Cloudflare Pages and Git-tracked Markdown, added a required pagination/Pagefind/feed-cap/full-build milestone before promotion, defined objective D1 escalation thresholds, added CSV-first review, and changed Standard.site backfill to a canary followed by resumable missing-only batches of at most 100.
- 2026-09-08: Merged the latest `origin/main` into the checkpoint branch and pushed merge commit `e4b7a93`. Implemented 50-row static pagination, Pagefind search, feed caps, artifact validation, Standard.site missing-only batches, and Conductor-aware Playwright ports. Imported and locally validated 2,625 real Links after stripping eight subscriber-token parameters and collapsing the resulting extra duplicate. Recorded build, artifact, privacy, unit, TypeScript, visual, interaction, and ATproto dry-run evidence. Left public promotion, preview deployment, and live ATproto publication behind their explicit review/deployment boundaries.
- 2026-09-08: Pushed reviewed real Link metadata in `6818e3c`, incorporated all current base work through `320c192`, and shared one collection social card across Link routes to preserve the archive's scale. Final manual preview run 34193980981 succeeded in 1m27s and published immutable deployment `091e6650`; HTTP smoke passed, and the preceding comprehensive live mobile check covered the same Links code. Live Standard.site publication remains deferred until the deployed page is reviewed and a revocable app password is supplied.
