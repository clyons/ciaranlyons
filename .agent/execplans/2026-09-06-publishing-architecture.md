# Complete the publishing architecture

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Make CiaranLyons.com the durable canonical website for writing, notes, and TILs while adding the interoperable metadata and publishing tooling required by Standard.site and ATProto. Visitors will see a quieter site footer, an About-page Elsewhere section, correctly linked rich text in Notes, and canonical RSS/metadata. Authors will be able to publish an existing Markdown Writing entry as a Standard.site document without making Leaflet or another editor a dependency of the web site.

TIL public URLs remain the existing date-based scheme: `/til/YYYY/MM/DD/slug`. Topics continue to organize source files and browse pages, but are not part of the canonical TIL permalink.

## Progress

- [x] (2026-09-06 03:41Z) Audited current Astro pages, content model, feeds, sync script, deployment documentation, live site metadata, and the current Standard.site verification specification.
- [x] (2026-09-06 03:41Z) Confirmed the account DID and PDS, and confirmed that no `site.standard.publication` record currently exists on the PDS.
- [x] (2026-09-06 03:47Z) Implemented shared Standard.site metadata and an idempotent publication/document publishing command.
- [x] (2026-09-06 03:47Z) Preserved ATProto rich-text facets in synced Notes and rendered them safely on list and detail pages.
- [x] (2026-09-06 03:47Z) Refined identity presentation and confirmed canonical TIL/primary-route metadata and RSS links.
- [x] (2026-09-06 03:47Z) Built and inspected generated static output; ran dry-run sync/publish validation.

## Surprises & Discoveries

- Observation: The supplied architecture diagram described topic-based TIL URLs, but the repository's existing public URLs are date-based and the user explicitly corrected the requirement.
  Evidence: `src/lib/content.ts` generates `/til/${year}/${month}/${day}/${slug}`; topic-prefixed routes are legacy redirect pages.
- Observation: The current DID is `did:plc:bi2irbzgh2fzqvuuewkju2xf`, and its PDS has no `site.standard.publication` records.
  Evidence: `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=ciaranlyons.com` resolves the DID; `com.atproto.repo.listRecords` on `https://phellinus.us-west.host.bsky.network` returned `{"records":[]}` for `site.standard.publication`.
- Observation: Standard.site requires a domain `.well-known/site.standard.publication` response for the publication and a `link[rel=site.standard.document]` on each document page; it also supports a publication discovery link.
  Evidence: https://standard.site/docs/verification/

## Decision Log

- Decision: Preserve `/til/YYYY/MM/DD/slug` as each TIL's canonical public URL and retain topic-prefixed URLs only as redirects.
  Rationale: This is the deployed repository behavior and the user's explicit correction. Changing it would break established links without improving the architecture.
  Date/Author: 2026-09-06 / Codex
- Decision: Store original ATProto post text and facets in note front matter, then render it from facets rather than flattening entities into Markdown text during sync.
  Rationale: ATProto facet byte offsets are authoritative; preserving them prevents incorrect links/mentions in multi-byte text and permits faithful owned rendering.
  Date/Author: 2026-09-06 / Codex
- Decision: Add a standalone, explicit Standard.site publishing script rather than coupling static-site builds to PDS writes.
  Rationale: Builds must remain reproducible and safe. Publishing requires credentials and creates external records, so it should be intentional and idempotent.
  Date/Author: 2026-09-06 / Codex
- Decision: Render note facets inside a note-card article, with the date as its durable Note permalink, rather than wrapping the card in a permalink anchor.
  Rationale: Faceted links must remain interactive and nested anchors are invalid HTML.
  Date/Author: 2026-09-06 / Codex

## Outcomes & Retrospective

The site now has the required Standard.site discovery/verification plumbing and explicit, idempotent publishing support. The existing note retains its original ATProto text and facets, rendering its TIL link and mention faithfully. Footer social links were reduced to RSS and the primary ATProto identity; the full existing profile set, including GitHub, is consolidated under About → Elsewhere.

Production verification remains pending because the PDS has no publication record and the workspace has no ATProto app password. Running the documented publish command, setting its returned publication URI in the deployment environment, and deploying will complete the external portion without changing site URLs or introducing an editor/CMS dependency.

## Context and Orientation

The Astro static site is configured in `astro.config.mjs`, with shared metadata/footer markup in `src/layouts/BaseLayout.astro`. Markdown source is read and converted into `WritingEntry`, `TilEntry`, and `NoteEntry` objects in `src/lib/content.ts`. Writing and Notes render from `src/pages/writing/` and `src/pages/notes/`. TIL source lives under `content/til/<topic>/`, but `getTilEntries()` already derives date-based canonical public paths.

`scripts/sync-bsky-notes.mjs` currently fetches original non-reply Bluesky posts and writes local Markdown records. It expands link facets into plain text, which loses facets for client-side rendering. `scripts/write-well-known.mjs` writes static verification endpoints only when build environment variables are present. The deployed GitHub Pages process is documented in `docs/operations/deploy.md`.

## Plan of Work

1. Extend the base layout to expose a Standard.site publication discovery link, safe canonical/OG metadata, and the restrained identity footer. Keep social profile data in `src/lib/socials.ts` for the existing About Elsewhere section only.
2. Add a small Standard.site publishing helper/script that authenticates with an ATProto app password, creates or updates one publication record and one document record per Writing Markdown file, and records the returned document URI in the front matter. It will use canonical `/writing/YYYY/MM/DD/slug` paths.
3. Change note ingestion to persist raw `text` plus ATProto `facets`. Add a renderer that uses UTF-8 byte positions and escaped output to create safe link, mention, and tag anchors. Render that result on Notes lists and pages, never reconstructing entities from regex.
4. Adjust visitor copy and RSS discoverability: Notes use neutral language, RSS alternate links are page-specific, and primary routes retain self canonicals. Document the date-based TIL permalink rule.
5. Validate static output, the facet renderer, and dry-run commands. Record outputs here.

## Concrete Steps

From repository root:

    npm ci
    npm run check
    npm run build
    npm run notes:sync -- --dry-run
    npm run standard:publish -- --dry-run

The publishing command additionally requires `ATPROTO_HANDLE` (defaults to `ciaranlyons.com`) and an `ATPROTO_APP_PASSWORD`. The command must report the publication/document AT URIs without printing credentials. After a live publish and deployment, validate:

    curl -fsSL https://ciaranlyons.com/.well-known/site.standard.publication
    curl -fsSL https://ciaranlyons.com/writing/2026/08/08/on-ownership | rg 'site.standard.(publication|document)'

## Validation and Acceptance

- `npm run check` and `npm run build` exit successfully.
- Built Writing pages include the publication discovery link and, after publishing, an exact `site.standard.document` URI.
- The built `.well-known/site.standard.publication` exists when `STANDARD_SITE_PUBLICATION_AT_URI` is set.
- The note that contains `@simonwillison.net` and the TIL URL renders both as anchors, with no untrusted HTML inserted from post text.
- `/til/2026/09/05/blender-logo-animation-coding-agent-macos` remains the canonical TIL URL; topic-prefixed legacy paths point to it.
- `/feed.xml`, `/writing/feed.xml`, `/notes/feed.xml`, and `/til/feed.xml` contain `https://ciaranlyons.com` links.

## Idempotence and Recovery

Static checks and builds can be rerun safely. `notes:sync -- --dry-run` writes nothing. The publishing script reuses existing URI front matter and a stable publication record key, so rerunning it updates records instead of duplicating them. If an external publish partially succeeds, rerun the command: it will reuse the created publication URI and reconcile document records. Remove only intentionally-added front matter fields to return source Markdown to its prior state; never overwrite `.env.local`.

## Artifacts and Notes

- Standard.site verification specification: https://standard.site/docs/verification/
- Live audit at 2026-09-06 03:40Z: `https://ciaranlyons.com/.well-known/site.standard.publication` returned HTTP 404 and the PDS list query returned an empty records list.
- 2026-09-06 03:48Z: `npm run lint`, `npx tsc --noEmit`, and `npm run build` completed successfully (31 static pages). Generated note HTML contained an anchor for the original ATProto link and an anchor for `@simonwillison.net`, with the Note permalink as a separate date anchor; generated TIL and project pages used `https://ciaranlyons.com` canonical URLs.
- 2026-09-06 03:47Z: `npm run standard:publish -- --dry-run` reported one publication and one Writing document would be created. `npm run notes:sync -- --dry-run` reported the existing post would be skipped. A build with temporary non-secret publication/DID values emitted both `.well-known` files and the publication discovery link.

## Interfaces and Dependencies

- `BaseLayout` accepts `standardDocumentUri`; it will also consume `STANDARD_SITE_PUBLICATION_AT_URI` as a discovery hint.
- `NoteEntry` gains preserved `facets` and an HTML-rich-text rendering helper returns escaped HTML generated only from ATProto facet features.
- `scripts/publish-standard-site.mjs` calls ATProto `com.atproto.server.createSession` and `com.atproto.repo.putRecord`; it requires an app password and has no build-time side effects.
- Writing front matter supports `standardUri`, the AT URI of the associated `site.standard.document` record.

## Change Log

- 2026-09-06: Created the plan and recorded initial architecture/live-service audit.
- 2026-09-06: Implemented Standard.site publishing, rich-text facets, and identity/footer refinement.
