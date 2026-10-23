# Format Bluesky media on the homepage and Notes archive

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Show the most recent Bluesky post's attached images or video alongside its text on the homepage, and give every post on `/notes/` the same media support. A portrait image, multiple images, or an attached video must fit its available column without stretching the homepage introduction, overlapping dates or links, or overflowing a narrow screen. Keep the site's existing typography, rules, colors, and relationship between the introduction and featured writing.

Use shared rendering on the homepage, Notes archive, and existing note detail pages so future media support does not require three implementations. Test representative post shapes with stable fixtures, including actual video playback, rather than relying on whichever post happens to be newest during a test run.

The initial deliverable was this plan. Ciaran subsequently authorized implementation and local mockups, approved the icon-only video treatment, and then requested “Ok, ship it.” Release through a validated source PR and the repository's automatic production deployment.

## Progress

- [x] (2026-10-23 13:21Z) Read repository instructions, the ExecPlan contract and template, and inspected the homepage, Notes archive/detail templates, media loaders, sync script, styles, and existing tests.
- [x] (2026-10-23 13:24Z) Included the user's additional requirement for `/notes/`; inspected the latest public image/video posts and researched HLS playback and Bluesky's gallery embed evolution.
- [x] (2026-10-23 13:24Z) Ran the existing focused ingestion, rich-text, and note-merge tests: 11 passed, 0 failed.
- [x] (2026-10-23 13:25Z) Wrote the implementation milestones, shared interfaces, fixture strategy, and acceptance matrix below.
- [x] (2026-10-23 13:38Z) Milestone 1: normalized legacy/gallery/wrapped image and video inputs, preserved local metadata, accepted media-only posts, and built the isolated fixture server with generated MP4/HLS/caption assets.
- [x] (2026-10-23 13:38Z) Milestone 2: integrated shared components into the homepage, archive, and details; verified bounded portrait/gallery layout and actual MP4/HLS playback in Chromium, WebKit, and Firefox.
- [x] (2026-10-23 13:40Z) Added source/preview tests; 108 unit tests, Astro checks, TypeScript, and production build pass. Captured local mockups of real posts and synthetic gallery/video cases.
- [x] (2026-10-23 13:45Z) Completed 69 isolated Chromium/WebKit/Firefox checks, including decoded MP4/HLS frames, captions, gallery access, breakpoints, delayed loading, unsupported capabilities, and failure/no-JavaScript fallbacks.
- [x] (2026-10-23 13:45Z) Reviewed and refreshed only the four homepage/Notes snapshots. All 118 other site checks pass; the two existing TIL content-drift snapshots remain excluded and unchanged.
- [x] (2026-10-23 13:45Z) Final validation: 109 unit tests, Astro checks (137 files; zero diagnostics), TypeScript, and production build pass. Verified both a real remote Bluesky stream and the existing portrait dragon MP4 play. Captured local review screenshots and left the mockup server running.
- [x] (2026-10-23 13:50Z) Applied Ciaran's visual feedback: removed the visible Play video label and poster shading, leaving a transparent circular play button. Hide native idle controls until play to avoid their gradient. Build/type checks, 15 focused cross-browser playback/no-JavaScript checks, and two refreshed Notes snapshots pass.
- [x] (2026-10-23 14:08Z) Began release after Ciaran's shipping authorization. Fast-forwarded to current main (three intervening content commits), retained the updated featured-writing logic, and repeated build, all 109 unit tests, and TypeScript successfully; Pagefind indexed 2678 pages. Refreshing the two homepage snapshots resolves their binary conflict with the intervening content update.
- [x] (2026-10-23 14:09Z) Final review found no bugs or repository-instruction violations. Repeated all 69 media browser tests successfully and reviewed/refreshed the two homepage screenshots against current main. Ordinary site suite: 116 passed; two Writing snapshots now predate main's new On Alignment entry, in addition to the two previously confirmed TIL snapshot mismatches. These unrelated baselines remain unchanged.
- [ ] Open the source PR with validated metadata, pass CI, and merge the intended feature commits.
- [ ] Verify the automatic production deployment and public media playback.

## Surprises & Discoveries

- Observation: The homepage and archive already receive a `NoteEntry.media` array but never render it. Media currently appears only on detail pages.
  Evidence: `src/pages/index.astro` renders `latestNotePreview`; `src/pages/notes/index.astro` renders each note's text/date; `src/pages/notes/[year]/[month]/[day]/[id].astro` maps `note.media` into images/videos.
- Observation: The latest public eligible post at planning time is newer than every checked-in note and has a tall image.
  Evidence: A read-only `getAuthorFeed` request on 2026-10-23 returned `3my6exyx7ak26`, dated 2026-10-18, with text “The robots made me do it.” and a 2857×4000 image of *Piranesi*. The preceding eligible post, `3mxcwuici5c24` dated 2026-10-07, contains a 1920×1080 video, a thumbnail, and an HLS playlist. These are observations, not permanent test expectations.
- Observation: Remote videos and checked-in videos use different transports.
  Evidence: `src/lib/atproto.ts` maps `app.bsky.embed.video#view.playlist` to `application/vnd.apple.mpegurl` and currently discards `thumbnail`. Local note frontmatter contains MP4 paths under `public/notes/`. The detail template feeds both into a plain `<video>` with no HLS enhancement.
- Observation: The homepage transforms raw post text before applying its original link/mention positions.
  Evidence: `index.astro` calls `trim()`, splits/rejoins paragraphs, and removes a final URL before `renderRichText()`. Facets are positions measured in UTF-8 bytes in the original text, so whitespace changes can misalign them. Existing sync tests deliberately preserve edge whitespace.
- Observation: Local notes take precedence over matching remote posts, including their media fields.
  Evidence: `mergeNoteSources()` in `src/lib/note-collection.ts` keeps local records first and then sorts by date. New optional metadata must therefore round-trip through local parsing and sync, not only remote parsing.
- Observation: Remote ingestion currently drops media-only posts with empty text.
  Evidence: Both `noteFromFeedItem()` implementations reject empty `record.text` before considering media. The local loader already represents an empty string, so include valid media-only posts when correcting this boundary.
- Observation: Bluesky has introduced `app.bsky.embed.gallery` to grow beyond the older image array. Its announcement also describes future mixed-media possibilities.
  Evidence: Bluesky's [gallery announcement](https://github.com/bluesky-social/atproto/discussions/5032) and [merged implementation PR #4827](https://github.com/bluesky-social/atproto/pull/4827). Confirm the current record/view definitions during implementation; do not infer fields or mixed-video support from the announcement.
- Observation: Existing browser tests use Chromium for both desktop and mobile, and a post-build static server.
  Evidence: `playwright.config.ts` starts `npm run build && node scripts/serve-dist.mjs`; mobile is Chromium at 390×844. Browser request interception happens too late to replace the feed fetched during an Astro build.
- Observation: Native HLS in the installed Chromium build played the generated stream but exposed no subtitle track, while HLS.js exposed the supplied captions.
  Evidence: Native Chromium advanced `currentTime` with `textTracks.length === 0`; the HLS.js path passed the caption and playback assertions in all three browser engines. Prefer the full HLS.js build where MediaSource is supported and retain native HLS as fallback.
- Observation: Parallel Playwright suites and Astro applications need separate artifact and Vite cache directories.
  Evidence: The first concurrent suite run deleted the other suite's traces, and fixture optimization invalidated the main dev server's HLS dependency URL. The fixture suite now uses `.context/note-media-test-results/` and `.context/note-media-fixtures/vite/`; its server uses Astro's programmatic API to avoid the CLI's agent-mode background-server lock.
- Observation: The ordinary TIL visual baseline predates existing repository content.
  Evidence: Its expected screenshot contains three entries, while the current page contains four, including the existing September 13 dragon TIL. This task changes no TIL content or styling; do not refresh those unrelated snapshots as part of the media work.
- Observation: The Writing visual baseline also predates the three main commits pulled during release.
  Evidence: The expected archive contains Found Quotes: WAGMI and On Ownership; the current archive additionally contains On Alignment from main. The final ordinary run excluded the two known TIL snapshots and returned 116 passes plus the two Writing snapshot mismatches. Homepage and Notes snapshots pass; leave unrelated Writing baselines unchanged.

## Decision Log

- Decision: Cover `/`, `/notes/`, and the existing detail renderer with shared media components; retain each surface's own surrounding layout.
  Rationale: The user explicitly added `/notes/`, and sharing the renderer with details prevents inconsistent behavior and duplicate player code.
  Date/Author: 2026-10-23 / Codex, following Ciaran's request.
- Decision: Keep `NoteMedia[]` as the presentation boundary, adding optional fields only where needed. Normalize Bluesky embed variants before rendering.
  Rationale: Templates should handle images/videos without knowing whether they came from a local blob, legacy image embed, gallery, or `recordWithMedia` wrapper.
  Date/Author: 2026-10-23 / Codex.
- Decision: Make standard videos user-initiated, with native controls and inline playback, on all three surfaces. Preserve GIF-style presentation metadata, but require an explicit play action initially as well.
  Rationale: An archive can contain many videos, including long clips with sound. Loading or playing all of them automatically is unsuitable for this layout. A poster and play control are predictable under reduced-motion preferences and browser autoplay policies.
  Date/Author: 2026-10-23 / Codex.
- Decision: Prefer native HLS support; otherwise dynamically import `hls.js` for an explicitly started HLS player when supported. Keep an ordinary original-post link available if playback cannot work.
  Rationale: Local MP4 tests alone cannot prove that remote Bluesky video plays. The [HLS.js documentation](https://github.com/video-dev/hls.js#compatibility) describes playback through browser media APIs and runtime capability checks. Load the library and stream only when needed.
  Date/Author: 2026-10-23 / Codex.
- Decision: Support image/video attachments and gallery images in this change. Treat external cards, quoted records, unavailable records, and unknown embed types as explicit fallback cases with a source link.
  Rationale: A compact homepage preview does not need a complete Bluesky client. Media inside `recordWithMedia` still renders; full external/quote cards can be added later at the normalization boundary without redesigning the layout.
  Date/Author: 2026-10-23 / Codex.
- Decision: Preserve original rich-text offsets; apply compact presentation after rendering or through offset-aware paragraph ranges.
  Rationale: Post text, mentions, Unicode, and links must remain accurate. Keep URL-only posts meaningful rather than removing their entire visible body.
  Date/Author: 2026-10-23 / Codex.
- Decision: Supersede native-first HLS with full HLS.js on supported MediaSource browsers and native playback as fallback. Keep import and stream initialization behind the play action.
  Rationale: Actual playback tests uncovered Chromium's native subtitle limitation; the full player preserves HLS caption tracks across the tested engines.
  Date/Author: 2026-10-23 / Codex.
- Decision: Preview up to four attachments on the homepage, with an explicit `View all N attachments` permalink for larger galleries; show every supported attachment on archive/detail pages.
  Rationale: The ten-image fixture otherwise dominated the homepage and pushed featured writing far down the page. The explicit link preserves access to the complete post without silent truncation. Homepage grid tiles are capped at 10rem; single attachments retain the 22rem/50svh compact cap.
  Date/Author: 2026-10-23 / Codex.
- Decision: Use an icon-only transparent play button with no shading over the poster, including on hover. Show native controls after activation; retain native controls when JavaScript is disabled.
  Rationale: Ciaran explicitly requested just a play button and no darkened cover. The original native idle controls also introduced a bottom gradient, so they are hidden while the enhanced play button is showing. Accessible labels and loading state remain available to assistive technology.
  Date/Author: 2026-10-23 / Ciaran's feedback, implemented by Codex.

## Outcomes & Retrospective

Shared media rendering is implemented and validated locally across all three surfaces. Portrait photos fit the available column; the homepage previews up to four gallery images with a full-post link; archives/details show all supported attachments; file and streamed videos play on request with available captions. The build, 109 unit tests, type checks, 69 dedicated media browser tests, and 118 ordinary site checks pass. The two existing TIL screenshot baselines predate the September 13 entry and remain unchanged; they were excluded from the final ordinary-suite run after the initial full run identified them. Four affected homepage/Notes baselines were reviewed and updated.

A new text-only post appeared in the live feed during implementation, so supplemental local examples preserve the previously observed book-image post and repository-owned dragon video for media review. Screenshots include a combined homepage/archive sheet and a mobile portrait view. No content sync, deployment, or remote account write has been performed. Future external/quoted-record cards still use the original-post fallback, as scoped in the Decision Log.

Release was subsequently authorized. The final current-main build passes with 137 checked files, zero diagnostics, 96 verified social preview images, and 2678 indexed pages. All 109 unit tests, TypeScript, and all 69 dedicated browser checks pass. The site suite returns 116 passes plus the two unrelated Writing baseline mismatches described above, with the two known TIL baselines excluded. Follow the normal source PR and automatic production workflow; record the merged commit, workflow result, and public playback checks in the PR release receipt rather than pushing to the branch after merge.

## Context and Orientation

The site is a static Astro application. Work from `/Users/ciaran/conductor/workspaces/ciaranlyons/colombo` on the existing branch; do not rename it. `package.json` requires Node ≥22.12.0; planning checks used Node 24.14.0.

- `src/pages/index.astro` calls `getNotes(1)` and puts the latest note in an aside next to the homepage proposition. `.latest-note-copy` is currently clamped to six lines.
- `src/pages/notes/index.astro` calls `getAllNotes()` and produces `.note-row` entries in `.archive-list`. Desktop rows have text and date columns; mobile rows stack.
- `src/pages/notes/[year]/[month]/[day]/[id].astro` builds every note permalink, renders rich text/media, then linked site content and the date/Bluesky footer.
- `src/styles/global.css` owns `.home-intro`, `.latest-note*`, `.note-row*`, `.note-rich-text`, and `.note-media*`. Existing detail media uses full width; videos are capped at `78svh`, which is too tall as a compact preview policy.
- `src/lib/content.ts` defines `NoteEntry`, `NoteMedia`, and `asNoteMedia()` for Markdown frontmatter. Existing `NoteMedia` fields are `type`, `src`, optional `mimeType`, `alt`, `width`, `height`, and `cid`.
- `src/lib/atproto.ts` fetches public feed views at build time, parses media and facets, caches the combined note collection, and falls back to local notes on failure. `src/lib/note-collection.ts` owns local precedence and ordering.
- `scripts/sync-bsky-notes.mjs` reads raw post records, downloads validated image/video blobs, and writes Markdown plus local assets. Record embeds contain blob references; feed-view embeds contain ready-to-use URLs. Keep those inputs distinct.
- `src/lib/rich-text.ts` escapes text and renders link, mention, and hashtag facets. `scripts/sync-bsky-notes.test.mjs`, `src/lib/rich-text.test.mjs`, and `src/lib/note-collection.test.mjs` are the nearest unit tests.
- `tests/ui/site.spec.ts` covers navigation, homepage content, note details, and screenshots. Approved `home`, `notes`, and `note-detail` snapshots live beside it. `playwright.config.ts` is the ordinary site suite; keep a new isolated fixture suite separate.

HLS means HTTP Live Streaming: a playlist plus media segments, rather than a single MP4 file. A poster is the still image displayed before video playback. A facet is Bluesky's byte-range annotation for a link, mention, or hashtag.

## Plan of Work

### Milestone 1 — Normalize media and prove the test/playback approach

Scope and result: make image/video data consistent across local notes and public feed views, and establish deterministic browser inputs before styling.

Extract pure remote media normalization into `src/lib/note-media.ts` with `src/lib/note-media.test.mjs`; have `atproto.ts` delegate to it. Preserve source order for legacy image arrays, gallery items, videos, and media nested in `recordWithMedia`. Read the current gallery record/view definitions from authoritative source before writing fixtures. Handle only supported item types, and skip unknown items independently so one unsupported attachment cannot discard valid siblings. Do not impose the old four-image limit on the shared renderer.

Update the remote loader and sync script's eligibility checks to accept a valid post with empty text and supported attachments, while continuing to reject malformed records and exclude replies/reposts according to the existing policy. Derive a usable accessible label from existing alt text or the neutral `Note` fallback when there is no text; do not fabricate a caption. Test this through normalization, sync serialization, and the UI.

Extend `NoteMedia` and `asNoteMedia()` for a validated optional `poster` URL and `presentation` hint. Keep older frontmatter valid. Width/height must be positive finite numbers before they become CSS ratios or HTML dimensions; treat missing/invalid dimensions as unknown. Retain the existing local-path and HTTP(S) URL rules and escaping. Extend `scripts/sync-bsky-notes.mjs` and its tests for gallery record extraction and metadata it can actually preserve. Do not store an HLS playlist as a local MP4, or treat a raw thumbnail blob as a URL. Preserve captions exposed by an HLS stream; if separately supplied caption tracks are available, record their shape and add validated support without inventing tracks from alt text.

Create an isolated Astro fixture application under `tests/fixtures/note-media/` with its own `astro.config.mjs`, fixture data/assets, and pages. It will import the production note components and `BaseLayout.astro`/global styles. Use per-case homepage, archive, and detail compositions, not copies of media markup or CSS. Wire it through `playwright.notes.config.ts` and `tests/ui/note-media.spec.ts`, with output under `.context/note-media-fixtures/` and a dedicated Conductor-derived port. Exclude this spec from the ordinary `playwright.config.ts` suite. Fixture pages must never appear in production `src/pages/`, sitemap, search, or feeds.

Include small original/generated raster images, a short playable MP4, a local HLS playlist/segments, a poster, and a caption sample; document asset provenance and a reproducible generation command. A checked-in local MP4 can be a supplemental real-content check, but do not use a large existing clip as the only fixture. Use Astro's fixture server or a test server with the correct playlist/segment MIME types. Do not depend on external media hosts for deterministic playback tests.

Prototype native-HLS detection plus dynamic `hls.js` loading in Chromium and WebKit before finalizing the video component. Add a locked dependency only if necessary for the non-native path. Do not substitute a mock `play()` call for decoded video frames. If the local browser build cannot decode the chosen fixture, fix the codec/browser setup and record the limitation; a visible player element is not passing playback evidence.

Commands: run the focused unit command in Concrete Steps; once the fixture harness exists, run its Chromium/WebKit projects. Acceptance: pure parsing tests pass, gallery cases retain supported attachments in order, old local MP4 records still load, and a user action advances a real video frame in the prototype. Record verified schema URLs/revisions and player results here.

### Milestone 2 — Integrate shared media without changing page hierarchy

Scope and files: add `src/components/NoteMedia.astro`, `src/components/NoteVideo.astro`, `src/components/LatestNote.astro`, and `src/components/NoteRow.astro`; integrate them into the three page templates and update `src/styles/global.css`. Keep media presentation in the first two components; the latter two own the production containers so fixture pages can exercise the real homepage/archive structure.

`LatestNote` retains the aside label, body, media, Read note link, and date in that order. Place media outside the clamped text container, with no line clamp or clipping on interactive media. Fix preview rich text via a small pure helper in `src/lib/note-preview.ts` with `src/lib/note-preview.test.mjs`: render original byte offsets and preserve paragraphs; omit a redundant final URL only when other body content remains and the destination remains accessible. Use actual paragraphs rather than relying on `<br>` sequences for spacing. Preserve links and mentions around emoji, CRLFs, repeated blank lines, and leading whitespace.

`NoteRow` uses an article containing a main body/media column and the existing permalink/date column. Keep the full note text on `/notes/`, render media below it, and keep each date associated with its own post. Do not wrap the entire row in an anchor: image links, inline links, and player controls must remain independently operable. Include a compact original-post link for Bluesky notes on the homepage/archive so unsupported embeds always have source access, even when normalization produces no media. Use `originalPostUrl(note)` rather than rebuilding URLs in components; do not add a Bluesky source link to genuinely local notes. Detail pages use the same media renderer while retaining their existing linked-content references and footer.

Apply an explicit compact media policy for home/archive and the roomier existing policy for details. Use a maximum single compact media height of `min(22rem, 50svh)`. Single images/videos use `object-fit: contain`, automatic height, reserved ratio when known, and `max-width: 100%`; show the whole portrait rather than cropping it. Multiple images use a simple ordered grid with at most two columns. Homepage tiles are capped at 10rem, with up to four previews and an explicit full-post link for larger sets. Archive/detail galleries show all supported items and may grow vertically. Every displayed image remains reachable at full size through a normal link. Do not silently drop attachments or force an inaccessible carousel. Reset figure margins and give relevant grid children `min-width: 0`.

Keep media and its original background inside its column. Reserve a neutral fallback box for unknown aspect ratios and keep its outer size stable after metadata arrives. The latest note must not overlap or push the proposition horizontally; featured writing follows the actual intro height in normal flow. Text-only notes should not gain empty media padding. Wrap footer controls naturally at narrow widths. Avoid hiding horizontal overflow on the page as a substitute for fixing the overflowing element.

`NoteVideo` renders accessible native controls, `playsinline`, a poster when available, and no autoplay/forced looping. Compact videos use `preload="none"`; delay HLS import, manifest/segment loading, and player creation until the visitor starts that video. MP4 uses the native source directly. Use `Hls.isSupported()` for the caption-capable enhancement, with native HLS capability detection as fallback. Scope instances to individual players and dispose them on Astro navigation. Keep controls usable under reduced motion, with keyboard focus and a bounded fallback link if media fails or JavaScript is disabled. A failed image retains its alt text/source access and cannot collapse the post into unreadability.

Commands: `npm run lint`, `npx tsc --noEmit`, focused unit tests, and the fixture suite. Acceptance: every supported fixture renders in its real production wrapper; a portrait, two/four-image grid, and video stay within their column; the homepage and archive share media behavior with details; existing facet and note-detail assertions still pass. Record the final compact size and the reason for any deviation from the starting value.

### Milestone 3 — Prove responsiveness, playback, and integration

Add fixture tests and screenshots in `tests/ui/note-media.spec.ts`, and real-route assertions in `tests/ui/site.spec.ts`. Test the matrix below, using stable local assets and fixtures for coverage and a normal site build for integration. Unit tests should cover normalization, offsets, and source precedence; browser tests should cover layout, loading policy, and interaction.

Run layout checks at 320, 375, 390, 760, 1024, and 1440 CSS pixels. At the existing 760px breakpoint also check 759px/761px. Exercise light/dark themes and reduced motion. Check element bounds, post/date association, keyboard operation, and absence of overlap as well as document width. Record screenshots under `.context/` for review. Save focused media snapshots with fixed poster states; do not compare moving video frames. Wait for images/fonts and verify nonzero image dimensions before snapshots.

Use Chromium and WebKit projects for real MP4/HLS playback and a Firefox smoke project if available; add these to the isolated config without multiplying all existing site screenshots. Assert successful metadata loading, a user-triggered play event, advancing `currentTime`/decoded frames, pause/resume, and no terminal player error. Verify captions when supplied. Simulate unsupported capabilities and failed playlists to exercise fallback independently of the successful playback cases.

After fixture validation, build the ordinary site and inspect `/`, `/notes/`, and both existing local-video note detail routes. Check that the current live image/video render if the public feed is available. Separately test feed-unavailable fallback and local-over-remote precedence with injected loader dependencies/unit tests, without changing the production fetch policy. Check that all note permalinks remain generated.

Review and intentionally update only affected `home`, `notes`, and necessary detail snapshots. Because the real feed is mutable at build time, do not make new fixture tests or snapshots depend on its current text/media. Capture before/after evidence and explain any existing content-driven baseline mismatch rather than accepting unrelated snapshots wholesale.

Commands: execute the full validation sequence below. Acceptance: all automatic checks pass, all matrix rows have evidence, and screenshots confirm the site's established hierarchy on `/` and `/notes/`. If a codec/platform check cannot be run, record it explicitly as incomplete rather than claiming full video acceptance.

## Concrete Steps

All commands run from the repository root named in Context and Orientation. Install with `npm ci` only if dependencies are missing; use `npm install hls.js` and commit its lockfile when implementing the selected HLS enhancement. Browser setup for the isolated suite is `npx playwright install chromium webkit firefox` when needed.

Existing focused baseline (already run):

    node --experimental-strip-types --test scripts/sync-bsky-notes.test.mjs src/lib/rich-text.test.mjs src/lib/note-collection.test.mjs

Expected: 11 tests pass on the planning baseline. Extend the targeted command during implementation:

    node --experimental-strip-types --test src/lib/note-media.test.mjs src/lib/note-preview.test.mjs src/lib/rich-text.test.mjs src/lib/note-collection.test.mjs scripts/sync-bsky-notes.test.mjs

Add this package script when creating the isolated fixture config:

    "test:ui:notes": "playwright test --config playwright.notes.config.ts"

Then run:

    npm run lint
    npx tsc --noEmit
    npm test
    npm run build
    npm run test:ui:notes
    npm run test:ui -- tests/ui/site.spec.ts --grep 'home|notes|note permalinks|note detail|primary navigation'

Expected: zero type/check/build errors, all unit and selected UI tests pass, and MP4/HLS cases meet the playback assertions. `npm run build` also verifies generated social images and builds the search index. Finally run `npm run test:ui` for shared-CSS regressions. Snapshot updates require inspecting the resulting images/diffs; they are not a way to make a failing assertion pass without review.

For manual real-site checks, run `npm run dev -- --host 127.0.0.1` on the workspace's assigned port. Keep screenshots in `.context/`; do not request a deployed preview for this task. The existing deployment process is unchanged. If a preview or later release is requested, first read `docs/operations/deploy.md` and follow its GitHub Actions workflow.

## Validation and Acceptance

| Input / condition | Observable passing behavior |
| --- | --- |
| Latest post with one tall image, matching the observed *Piranesi* shape | Image appears below text on `/`; whole image fits the compact bound; date and Read note remain visible and do not overlap. |
| Text-only post; empty collection | No empty media wrapper/gap; text-only post remains readable; homepage omits its note aside when there is no note. |
| Media-only image/video post with empty text | Eligible post appears in the correct date position, media remains visible, an accessible label exists, and no empty body block adds spacing. |
| Two, three, four legacy images; gallery with more than four images | Ordered images render on `/notes/` and shared fixtures; grid stays inside its column at all tested widths; every item has full-size access. |
| Portrait, landscape, square, unusually tall/wide, missing/invalid dimensions | Valid ratios reserve space; malformed dimensions cannot become CSS; full image/control remains usable; metadata arrival does not overlap neighboring content. |
| Local MP4 plus remote-shaped HLS, with and without poster | Both actually play after a user action in supported Chromium/WebKit configurations; pause/resume work; no autoplay or audio before interaction. |
| Multiple archive videos, including offscreen items | Idle/offscreen players do not fetch manifests/segments or initialize one HLS instance per post; starting one player does not start siblings. |
| Caption-bearing video and GIF-style presentation | Supplied captions are available; presentation hint survives normalization; playback is explicit and reduced motion is respected. |
| `recordWithMedia`, external card, quote-only, unavailable/unknown embed, unknown gallery child | Supported own attachments survive wrappers/unknown siblings; unsupported content has original-post access; text and layout remain intact. |
| Failed image, failed HLS/MP4 request, unsupported HLS, JavaScript disabled | Bounded fallback remains usable, with alt text or source link; no trapped spinner, inaccessible controls, or disappearing text/date. |
| Emoji/mentions/hashtags, CRLF, leading whitespace, multiple paragraphs, URL-only post | Facet destinations and text stay accurate; paragraphs remain readable; a URL-only post is never reduced to an empty body. |
| Local/remote duplicate and API outage | Local record wins as today; local media renders when the feed is unavailable; valid note routes remain generated. |
| Light/dark, 200% zoom, keyboard, 320–1440px and breakpoint edges | No horizontal scrolling, overlapping posts, or clipped controls; visible focus; source/permalink targets work independently of video controls. |

Success requires behavior assertions and visual review. `toBeVisible()` on a video element, successful HTML generation, or a screenshot alone does not demonstrate video playback.

## Idempotence and Recovery

Application changes are additive/refactorable and do not require rewriting existing note Markdown or redownloading media. Keep existing local media URLs and note permalinks. Use pure fixtures rather than running `notes:sync --overwrite` to populate test cases. Test fixture pages/assets and generated media must stay outside production content and output; clear only the dedicated `.context/note-media-fixtures/` output on retries.

No `.env.local` changes are needed. Do not alter deployment triggers, credentials, publishing scripts, or unrelated content. Keep a clean separation between the ordinary built site and isolated fixture output so a fixture build cannot replace production `dist/` or a running site's files. Configure the fixture server with `reuseExistingServer: false` to avoid accidentally testing a stale process.

If HLS enhancement fails, retain the native player and original-post link while correcting the enhancement; do not label fallback-only behavior as complete video support. Revert a mistaken snapshot by restoring only that test artifact, then rerun the relevant case. Record implementation changes to this plan before continuing if protocol discoveries require changing its supported-media contract.

## Artifacts and Notes

Planning evidence:

    Node: v24.14.0
    focused tests: 11 passed, 0 failed
    plan validation: all 13 required sections match template order; UTC progress timestamps and whitespace checks passed
    implementation unit tests: 109 passed, 0 failed
    implementation checks: npm run lint and npx tsc --noEmit passed
    implementation build: passed; Pagefind indexed 2677 pages
    npm run test:ui:notes: 69 passed across Chromium, WebKit, and Firefox
    targeted homepage/Notes snapshot refresh plus archive controls: 6 passed
    ordinary site suite excluding two pre-existing TIL snapshot mismatches: 118 passed
    real remote HLS smoke: currentTime 0.214172, decoded 640x360 frames, error null

Local review URLs use the workspace port 55310 for `/` and `/notes/`. `npm run mockups:notes` uses the workspace port plus three (55313 here), with `/home/book/`, `/home/dragon/`, `/home/gallery/`, `/home/hls/`, `/home/many/`, `/examples/notes/`, and `/notes/` as examples. The book sample alone uses a public CDN image; deterministic tests use generated assets. Final screenshots are `.context/note-media-mockups.png`, `.context/mockup-home-book-desktop.png`, `.context/mockup-home-book-mobile.png`, `.context/mockup-notes-desktop.png`, and `.context/home-gallery-desktop.png`.

Detailed logs are `.context/note-media-unit.log`, `.context/note-media-ui.log`, `.context/build-note-media.log`, `.context/site-ui.log` (initial full run), `.context/note-media-snapshots.log`, and `.context/site-ui-final.log`. TIL expected/actual screenshots confirming the existing content drift are `.context/til-expected.png` and `.context/til-actual.png`.

Live examples for supplemental checks:

- [Portrait-image post, 2026-10-18](https://bsky.app/profile/did:plc:bi2irbzgh2fzqvuuewkju2xf/post/3my6exyx7ak26).
- [Video post, 2026-10-07](https://bsky.app/profile/did:plc:bi2irbzgh2fzqvuuewkju2xf/post/3mxcwuici5c24).
- Existing local MP4 routes: `/notes/2026/09/05/3musjyx5omc2i/` and `/notes/2026/09/14/3mvh2nuog47av/`.

Primary references: [Bluesky's gallery announcement](https://github.com/bluesky-social/atproto/discussions/5032), [gallery implementation PR](https://github.com/bluesky-social/atproto/pull/4827), and [HLS.js documentation](https://github.com/video-dev/hls.js). The older raw `main/lexicons/app/bsky/embed/*.json` URLs failed direct retrieval during planning; resolve current authoritative schema locations rather than treating cached search excerpts as the implementation contract.

Append exact test counts, browser/codec versions, compact sizing decisions, reviewed screenshot paths, and any final limitations during implementation. If a PR is requested later, read `.github/pull_request_template.md` and the current metadata workflow, populate their exact headings/sentinels, validate the body locally, and read it back after creation. This plan alone does not require opening a PR.

## Interfaces and Dependencies

Preserve the public `getAllNotes()`, `getNotes(limit)`, `originalPostUrl(note)`, and `renderRichText(text, facets)` contracts. Proposed additions:

    // src/lib/note-media.ts — pure normalization, no network calls
    parseNoteMedia(embed: unknown): NoteMedia[]
    parseLocalNoteMedia(value: unknown, source: string): NoteMedia[]

    // src/lib/note-feed.ts — pure feed parsing, isolated from live fetches
    noteFromFeedItem(item: FeedItem): NoteEntry | undefined

    // src/lib/content.ts — backward-compatible additions
    interface NoteMedia {
      type: 'image' | 'video'
      src: string
      mimeType?: string
      alt?: string
      width?: number
      height?: number
      cid?: string
      poster?: string
      presentation?: string
    }

    // Shared media rendering boundary
    NoteMedia.astro: { media: NoteMedia[]; context: 'compact' | 'detail'; originalUrl: string; limit?: number; allMediaUrl?: string }
    NoteVideo.astro: { media: NoteMedia; context: 'compact' | 'detail'; originalUrl: string }
    LatestNote.astro: { note: NoteEntry }
    NoteRow.astro: { note: NoteEntry }

Add a small browser module under `src/scripts/note-video.ts` if player lifecycle handling is clearer there than inside `NoteVideo.astro`. Use one bundled initializer and a dynamic HLS import; do not emit duplicate inline player scripts for every archive row. Caption-track fields, if needed after schema inspection, must be optional, validated, and covered by local/remote tests.

Dependencies remain Astro, existing TypeScript/Node tests, and Playwright, plus the locked `hls.js` 1.7.3 release. Use the full HLS build to preserve subtitles. The fixture generator uses ffmpeg already available locally; it creates test assets under `.context/` and copies the existing dragon video for supplemental review. No Bluesky credentials, third-party iframe embed script, database, backend service, or deployment integration is needed.

## Change Log

- 2026-10-23: Created from `.agent/execplans/TEMPLATE.md` after repository inspection and focused baseline tests. Included the user's `/notes/` extension, shared detail rendering, responsive images/galleries, MP4/HLS playback, facet preservation, and deterministic browser validation. Implementation has not started.
- 2026-10-23: Started implementation after Ciaran requested local mockups. Added shared renderers, pure local/remote normalization and preview helpers, gallery ingestion, media-only posts, delayed HLS.js playback, and a generated-media fixture application. Bounded homepage galleries to four previews plus an explicit full-post link after visual review. Recorded caption-driven HLS preference, isolated test/cache directories, and the unrelated existing TIL snapshot drift.
- 2026-10-23: Finished local implementation and validation. Recorded 109 passing unit tests, 69 passing media browser tests, 118 passing ordinary site checks with two unrelated TIL baselines excluded, four reviewed media snapshot updates, real-stream/portrait-video playback evidence, and local mockup URLs/screenshots. No publication requested or performed.
- 2026-10-23: Refined video presentation following Ciaran's feedback: icon-only play, transparent poster treatment, and native controls after activation. Verified 15 focused browser checks and two refreshed Notes snapshots plus build/type checks. Updated screenshot: `.context/video-button-no-shading.png`; logs: `.context/note-video-button-ui.log`, `.context/note-video-button-snapshots.log`, and `.context/build-note-media-button.log`.
- 2026-10-23: Ciaran authorized shipping. Integrated current main without changing branch name, completed final review, regenerated homepage baselines for current content, and repeated build/unit/type/media-browser checks. Recorded additional unrelated Writing snapshot drift. Release logs: `.context/ship-build.log`, `.context/ship-unit.log`, `.context/ship-tsc.log`, `.context/ship-media-ui.log`, `.context/ship-home-snapshots.log`, and `.context/ship-site-ui.log`.
