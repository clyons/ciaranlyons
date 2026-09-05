# Syndicate Bluesky Posts as Notes

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Ciaran posts short notes on Bluesky as `@ciaranlyons.com`. Those posts should also appear on `ciaranlyons.com` as site notes, with durable local Markdown files, date-based note URLs, archive pages, search entries, and RSS feed entries.

After this change, running one sync command should fetch Ciaran's public Bluesky posts, write any new top-level posts into `content/notes/`, and let the existing Astro build publish them at URLs like `/notes/2026/09/05/<rkey>/`.

There is currently only one real Bluesky post to import, so the first milestone should handle a one-post backfill cleanly before broadening the script for repeated use.

## Progress

- [x] (2026-09-05 22:45Z) Created initial plan after inspecting existing notes and ATProto code.
- [x] (2026-09-05 22:49Z) Implemented the local sync script and note metadata format.
- [x] (2026-09-05 22:49Z) Backfilled the current Bluesky post as one local note.
- [x] (2026-09-05 22:49Z) Updated note rendering to preserve original post links and source metadata.
- [x] (2026-09-05 22:50Z) Validated build, search, RSS, generated note URLs, and placeholder note removal.

## Surprises & Discoveries

- Observation: The site already fetches public Bluesky posts during builds via `src/lib/atproto.ts`.
  Evidence: `getNotes()` calls `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed` with `actor`, `filter=posts_no_replies`, and `limit`.

- Observation: The current live fetch falls back to local Markdown notes only when the public API fetch returns no usable notes or throws.
  Evidence: `getNotes()` returns parsed public feed items when `notes.length > 0`, otherwise `getFallbackNotes()`.

- Observation: Existing local notes have very sparse frontmatter.
  Evidence: `content/notes/*.md` currently contain only `date`.

- Observation: Bluesky's `app.bsky.feed.getAuthorFeed` endpoint is public and does not require auth for reading author posts.
  Evidence: The official lexicon describes it as getting an actor's author feed and says it does not require auth. Source: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/getAuthorFeed.json

- Observation: Bluesky rich text facets preserve the full URL even when the post text contains a shortened display URL.
  Evidence: The imported note body now contains `https://ciaranlyons.com/til/2026/09/05/blender-logo-animation-coding-agent-macos/` after the sync script expands `app.bsky.richtext.facet#link` features.

## Decision Log

- Decision: Treat Bluesky posts as source material to sync into local Markdown, not as a live build-time dependency.
  Rationale: A local content file is reviewable, deployable, searchable, and stable even if the Bluesky API is slow, unavailable, or changes its response shape.
  Date/Author: 2026-09-05 / Codex

- Decision: Keep note URLs keyed by the Bluesky post record key (`rkey`).
  Rationale: The current route already uses `rkeyFromUri()` as the note id, and the rkey is compact, stable, and naturally maps back to the original AT URI.
  Date/Author: 2026-09-05 / Codex

- Decision: Import only Ciaran's original top-level posts by default.
  Rationale: Reposts, quotes, and replies are not automatically standalone notes on the owned site. The current `filter=posts_no_replies` and `!item.reason` behavior points in this direction already.
  Date/Author: 2026-09-05 / Codex

- Decision: Store original ATProto identity metadata in note frontmatter.
  Rationale: The site needs durable links back to the original post without having to reconstruct or refetch everything during build.
  Date/Author: 2026-09-05 / Codex

- Decision: Generate RSS and search note titles from the first non-empty line of the note body.
  Rationale: Using a fixed character slice of the whole body caused note titles to run into shortened or expanded URLs.
  Date/Author: 2026-09-05 / Codex

## Outcomes & Retrospective

Implemented a local Bluesky-to-notes sync workflow. `npm run notes:sync` imports top-level public posts from `@ciaranlyons.com` into durable Markdown files under `content/notes/`, keyed by the Bluesky record key.

Removed the existing placeholder local notes and imported the one real post as `content/notes/2026-09-05-3musjyx5omc2i.md`.

Validation evidence:

- `npm run notes:sync -- --dry-run` after import: `0 written, 1 skipped, 1 eligible`.
- `npm run build`: `astro check` returned 0 errors, 0 warnings, 0 hints; Astro built 33 pages including `/notes/2026/09/05/3musjyx5omc2i/`.
- `rg` verified the imported note text, expanded TIL URL, and original Bluesky URL in `dist/notes`, `dist/notes/feed.xml`, `dist/feed.xml`, and `dist/search.json`.
- `rg` verified deleted placeholder note slugs/titles are absent from `content/notes`, `dist/notes`, `dist/feed.xml`, and `dist/search.json`.

## Context and Orientation

This is an Astro static site.

Existing notes code:

- `src/lib/atproto.ts` fetches public Bluesky notes at build time and maps each post to `NoteEntry`.
- `src/lib/content.ts` reads local fallback notes from `content/notes/*.md`.
- `src/pages/notes/index.astro` lists notes.
- `src/pages/notes/[year]/[month]/[day]/[id].astro` renders an individual note.
- `src/pages/notes/[year]/[month]/[day]/index.astro`, `src/pages/notes/[year]/[month]/index.astro`, and `src/pages/notes/[year]/index.astro` render note archives.
- `src/pages/notes/feed.xml.ts` renders the notes RSS feed.
- `src/lib/search.ts` includes notes in generated `search.json`.

Relevant ATProto pieces:

- Public read endpoint: `app.bsky.feed.getAuthorFeed`.
- Current actor: `ciaranlyons.com`.
- Existing public DID in deploy flow: `did:plc:bi2irbzgh2fzqvuuewkju2xf`.
- AT URI shape for posts: `at://<did>/app.bsky.feed.post/<rkey>`.
- Bluesky web URL shape for original posts: `https://bsky.app/profile/<did-or-handle>/post/<rkey>`.

## Plan of Work

First, make local notes rich enough to represent syndicated Bluesky posts. Update the local note reader in `src/lib/content.ts` so `NoteEntry` can carry `uri`, `cid`, `source`, and optional `originalUrl` from frontmatter while preserving the existing `text`, `date`, and `url` fields.

Second, change `src/lib/atproto.ts` so `getNotes()` prefers local synced notes for builds. The public API fetch can remain useful as an explicit sync helper, but normal site rendering should not depend on live network access when local notes exist.

Third, add a script such as `scripts/sync-bsky-notes.mjs` or `scripts/sync-bsky-notes.ts`. The script should:

- Read `ATPROTO_HANDLE` or default to `ciaranlyons.com`.
- Call `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`.
- Request `filter=posts_no_replies`, `includePins=false`, and a limit that is safe for the small current account.
- Ignore feed items with `reason` so reposts are not imported as notes.
- Ignore replies unless explicitly opted in later.
- Convert each post record into a local file at `content/notes/<YYYY-MM-DD>-<rkey>.md`.
- Skip files that already exist unless run with an explicit overwrite flag.
- Write frontmatter with `date`, `uri`, `cid`, `source: bluesky`, and `originalUrl`.
- Write the post text as Markdown body.

Fourth, run the script once to import the single current Bluesky post. Verify that the resulting note appears in `/notes`, `/notes/feed.xml`, `/feed.xml`, and `search.json`.

Fifth, update docs or package scripts so the workflow is obvious. Add a package script such as:

    "notes:sync": "node scripts/sync-bsky-notes.mjs"

If TypeScript is used for the script instead, add the minimal runtime dependency or use the repository's existing toolchain without adding unnecessary packages.

## Concrete Steps

From repository root:

    git checkout -b clyons/syndicate-skeets-as-notes origin/main

Inspect current public Bluesky feed:

    node scripts/sync-bsky-notes.mjs --dry-run

Expected result: output lists the one current post that would be imported, including its AT URI, created date, and destination Markdown path.

Run the import:

    node scripts/sync-bsky-notes.mjs

Expected result: one new Markdown file appears under `content/notes/` for the current Bluesky post.

Build the site:

    npm run build

Expected result: `astro check` exits with 0 errors and the build emits the note page, notes archive pages, `notes/feed.xml`, `feed.xml`, and `search.json`.

Targeted verification:

    rg "at://did:plc:bi2irbzgh2fzqvuuewkju2xf/app.bsky.feed.post/" content/notes dist/notes
    rg "bsky.app/profile/(did:plc:bi2irbzgh2fzqvuuewkju2xf|ciaranlyons.com)/post/" dist/notes
    rg "<current post text>" dist/notes dist/notes/feed.xml dist/feed.xml dist/search.json

Replace `<current post text>` with a distinctive phrase from the imported post.

## Validation and Acceptance

- `npm run build` exits 0.
- The one current Bluesky post is represented by one local Markdown file in `content/notes/`.
- Running the sync script a second time does not duplicate the note.
- `/notes` lists the imported post.
- The individual note page links to the original Bluesky post.
- `dist/notes/feed.xml`, `dist/feed.xml`, and `dist/search.json` include the imported note.
- Normal builds work without requiring a successful live fetch from Bluesky when local notes exist.
- Reposts and replies are not imported by default.

## Idempotence and Recovery

The sync script must be safe to rerun. Existing destination files should be skipped unless an explicit overwrite flag is provided.

If a bad note is imported, delete its Markdown file from `content/notes/` and rerun `npm run build`.

If the public feed API is unavailable, the sync script should fail with a clear nonzero exit code and leave existing note files untouched.

The implementation should not require `BSKY_APP_PASSWORD` because reading Ciaran's public posts uses the public API. Posting new skeets remains a separate authenticated workflow.

## Artifacts and Notes

Official source for `app.bsky.feed.getAuthorFeed`:

- https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/getAuthorFeed.json

Existing site files inspected while writing this plan:

- `src/lib/atproto.ts`
- `src/lib/content.ts`
- `src/pages/notes/index.astro`
- `src/pages/notes/[year]/[month]/[day]/[id].astro`
- `src/pages/notes/feed.xml.ts`
- `content/notes/*.md`

Generated local note:

- `content/notes/2026-09-05-3musjyx5omc2i.md`

## Interfaces and Dependencies

`NoteEntry` should continue to expose:

- `id: string`
- `text: string`
- `date: string`
- `year: string`
- `month: string`
- `day: string`
- `uri?: string`
- `url: string`

Additional optional fields may be added:

- `cid?: string`
- `source?: 'bluesky' | 'local'`
- `originalUrl?: string`

The sync script should not add a new dependency unless the plain Node `fetch`, `node:fs/promises`, and `gray-matter` stack is insufficient.

## Change Log

- 2026-09-05: Created the plan from template after inspecting current notes and ATProto code.
