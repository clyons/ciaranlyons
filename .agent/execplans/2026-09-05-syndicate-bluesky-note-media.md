# Syndicate Bluesky Note Media

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Ciaran's Bluesky posts can include uploaded images and videos. When those posts are syndicated into `content/notes/`, the media should also appear on `ciaranlyons.com` instead of only the text and original post link.

After this change, `npm run notes:sync -- --overwrite` should import the existing video post, download its uploaded MP4 into `public/notes/`, write media metadata into the local note frontmatter, and the generated note page should render the video inline with autoplay-friendly attributes.

## Progress

- [x] (2026-09-05 22:55Z) Confirmed the current Bluesky feed exposes video embed metadata for the imported post.
- [x] (2026-09-05 22:58Z) Extended the sync script to download image and video blobs.
- [x] (2026-09-05 22:58Z) Extended local note metadata and page rendering for media.
- [x] (2026-09-05 22:59Z) Re-imported the existing post and validated the generated page.

## Surprises & Discoveries

- Observation: The existing post has an `app.bsky.embed.video#view` embed with a playlist and thumbnail, plus an original record blob CID.
  Evidence: Public author feed returned video CID `bafkreic42yyoueaygjxqqdun7u5hyfuysc5j7hdzkkiejw2jtw2g6yhtt4`, MIME `video/mp4`, alt text, and aspect ratio `1920x804`.

- Observation: The public blob endpoint can locate the original uploaded media.
  Evidence: `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=did:plc:bi2irbzgh2fzqvuuewkju2xf&cid=<cid>` returned a 302 to the post author's PDS.

## Decision Log

- Decision: Download post media into this site's `public/notes/` tree during sync.
  Rationale: Local files render consistently in generated static pages and remain reviewable/deployable with the note content.
  Date/Author: 2026-09-05 / Codex

- Decision: Support Bluesky image and video embeds first, including media inside `app.bsky.embed.recordWithMedia`.
  Rationale: These are the common uploaded media cases and cover the current video note without adding quote-post rendering scope.
  Date/Author: 2026-09-05 / Codex

## Outcomes & Retrospective

Implemented Bluesky media syndication for local notes. The sync script now downloads uploaded image/video blobs into `public/notes/<YYYY>/<MM>/<DD>/<rkey>/`, stores a `media` array in note frontmatter, and the individual note page renders that media inline.

Validation evidence:

- `npm run notes:sync -- --overwrite`: rewrote the existing note and downloaded one MP4.
- `npm run notes:sync -- --dry-run`: `0 written, 1 skipped, 1 eligible`.
- `npm run build`: `astro check` returned 0 errors, 0 warnings, 0 hints; Astro built 33 pages.
- `rg` verified the generated note page contains `<video controls muted playsinline autoplay loop preload="metadata">`, the local MP4 source, `video/mp4`, and the video aria label.
- `file` verified the copied asset in `dist/notes/2026/09/05/3musjyx5omc2i/` is an MP4.

## Context and Orientation

This is an Astro static site.

Relevant files:

- `scripts/sync-bsky-notes.mjs` imports public Bluesky posts into `content/notes/`.
- `src/lib/content.ts` reads local notes and defines `NoteEntry`.
- `src/pages/notes/[year]/[month]/[day]/[id].astro` renders an individual note.
- `src/styles/global.css` contains prose and media styles.
- `public/` contains static assets copied directly into the final build.

The current note renderer only outputs `note.text` in a blockquote and a link to the original ATProto post. Media metadata needs to become part of `NoteEntry` and be rendered on individual note pages.

## Plan of Work

First, extend the sync script with media extraction. It should inspect `post.record.embed`, and when necessary `post.record.embed.media`, for `app.bsky.embed.images` and `app.bsky.embed.video` records. For each blob, download it through `com.atproto.sync.getBlob`, save it under `public/notes/<YYYY>/<MM>/<DD>/<rkey>/`, and record type, source path, MIME type, alt text, dimensions, and CID in note frontmatter.

Second, extend `src/lib/content.ts` with a `NoteMedia` type and parse `media` frontmatter into typed `NoteEntry.media`.

Third, update the individual note Astro page to render image and video media below the note text. Video should use `controls`, `muted`, `playsinline`, `autoplay`, `loop`, and `preload="metadata"` so uploaded videos behave like the original Bluesky post where possible.

Fourth, rerun the sync for the current post with `--overwrite`, build, and verify that the generated note HTML references the local MP4 and that `dist` contains the copied media asset.

## Concrete Steps

From repository root:

    npm run notes:sync -- --overwrite
    npm run notes:sync -- --dry-run
    npm run build
    rg "positive-intelligence-logo-cinematic-v4|notes/2026/09/05/3musjyx5omc2i|video/mp4" content/notes public/notes dist/notes

Expected result: one existing post is overwritten without duplication, the media asset exists under `public/notes/`, and the generated note page contains a local `<video>` source.

## Validation and Acceptance

- `npm run notes:sync -- --overwrite` writes the existing Bluesky post and downloads its video.
- `npm run notes:sync -- --dry-run` reports the existing note as skipped.
- `npm run build` exits 0.
- The generated note page contains a local MP4 reference, video alt/label text, and autoplay-friendly video attributes.
- Uploaded images are represented as local `<img>` elements when future posts include image embeds.
- Existing text-only notes still render without media.

## Idempotence and Recovery

The sync script remains safe to rerun. Existing note files are skipped unless `--overwrite` is passed. Media files are written deterministically by CID and extension, so overwriting an already-downloaded asset should not duplicate files.

If a media download fails, the script should fail with a clear nonzero exit code before writing a partial note. Existing committed notes and media can be restored through Git.

## Artifacts and Notes

Official lexicon references:

- `app.bsky.embed.video`: https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/app/bsky/embed/video.json
- `app.bsky.embed.images`: https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/app/bsky/embed/images.json
- `app.bsky.embed.recordWithMedia`: https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/app/bsky/embed/recordWithMedia.json

Generated media asset:

- `public/notes/2026/09/05/3musjyx5omc2i/video-1-bafkreic42yyoueaygjxqqdun7u5hyfuysc5j7hdzkkiejw2jtw2g6yhtt4.mp4`

## Interfaces and Dependencies

`NoteEntry` gains:

- `media?: NoteMedia[]`

`NoteMedia` should include:

- `type: 'image' | 'video'`
- `src: string`
- `mimeType?: string`
- `alt?: string`
- `width?: number`
- `height?: number`
- `cid?: string`

No new npm dependency should be needed.

## Change Log

- 2026-09-05: Created the plan from template after confirming the current post's video embed.
