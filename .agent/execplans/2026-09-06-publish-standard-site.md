# Publish and verify the Standard.site records

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Create CiaranLyons.com's real `site.standard.publication` record and the matching document record for the existing Writing entry. Once the follow-up metadata change is merged and deployed, the public domain will return the exact publication AT URI at `/.well-known/site.standard.publication`, and the Writing page will identify its matching document record.

## Progress

- [x] (2026-09-06 03:57Z) Created a fresh `clyons/publish-standard-site` worktree from merged `origin/main`.
- [x] (2026-09-06 03:57Z) Confirmed that the local environment provides `BSKY_HANDLE` and `BSKY_APP_PASSWORD` by name only; no secret values were read or logged.
- [x] (2026-09-06 03:59Z) Added compatibility for the existing BSKY environment variable names.
- [x] (2026-09-06 03:59Z) Published the Standard.site publication and Writing document using the local app password.
- [x] (2026-09-06 04:04Z) Merged PR #20, deployed the site with the public publication URI, and verified the live endpoints.

## Surprises & Discoveries

- Observation: The local credentials use `BSKY_HANDLE` and `BSKY_APP_PASSWORD`, rather than the `ATPROTO_*` names originally documented by the publishing command.
  Evidence: Variable-name-only inspection of the existing `.env.local`.

## Decision Log

- Decision: Support both `ATPROTO_*` and existing `BSKY_*` environment variable names, preferring the former when both are present.
  Rationale: It permits safe use of the existing local secret without duplicating it, while retaining the documented generic ATProto interface.
  Date/Author: 2026-09-06 / Codex
- Decision: Keep the returned publication URI in deployment environment only and the returned document URI in the associated Writing front matter.
  Rationale: The publication URI is public deployment configuration; document front matter is the durable source needed to emit page-specific Standard.site metadata.
  Date/Author: 2026-09-06 / Codex

## Outcomes & Retrospective

The real publication and document records now exist on Ciaran's PDS. PR #20 added the document URI to Markdown and the existing credential-name compatibility. The merged build was deployed to `clyons/resume` `gh-pages` as `c59a022`; the live domain now verifies both the publication and document relationships.

## Context and Orientation

`scripts/publish-standard-site.mjs` creates or updates PDS records and writes a `standardUri` front-matter field to Writing Markdown source. `scripts/write-well-known.mjs` creates the static verification endpoint when `STANDARD_SITE_PUBLICATION_AT_URI` is supplied during the build. `src/layouts/BaseLayout.astro` emits publication/document discovery links from those values.

The previous publishing-architecture work is merged as PR #19. This follow-up must use a new branch and must not modify the retired `clyons/preserve-til-topic-urls` branch.

## Plan of Work

1. Update the publish script to recognize the existing BSKY-prefixed environment variable names.
2. Run the publishing command with Node's `--env-file` support so no secret is printed or copied.
3. Inspect the exact resulting source diff, verify the public PDS records, and run the project checks.
4. Create, validate, and merge a focused PR containing the document URI and compatibility change.
5. Build the merged site with public DID and publication URI values, deploy to the documented `clyons/resume` `gh-pages` branch, and verify the live domain.

## Concrete Steps

From the fresh follow-up worktree:

    npm ci
    node --env-file=/Users/ciaran/conductor/workspaces/ciaranlyons/maseru/.env.local scripts/publish-standard-site.mjs
    npm run lint
    npx tsc --noEmit
    ATPROTO_DID=did:plc:bi2irbzgh2fzqvuuewkju2xf STANDARD_SITE_PUBLICATION_AT_URI=<returned-uri> npm run build

Do not print, commit, or copy the app password. After publishing, verify the public PDS records via `com.atproto.repo.getRecord`, merge the PR, deploy the generated `dist/` contents to `clyons/resume`'s `gh-pages` branch, and verify the two live links described above.

## Validation and Acceptance

- The publish command reports one real publication URI and one real document URI without secret output.
- `content/writing/on-ownership.md` has the matching `standardUri`.
- The PDS record's `url` is `https://ciaranlyons.com`, and its document record references that publication and `/writing/2026/08/08/on-ownership`.
- `npm run lint`, `npx tsc --noEmit`, and the build pass.
- Production `/.well-known/site.standard.publication` equals the returned publication URI.
- Production Writing HTML contains matching `site.standard.publication` and `site.standard.document` links.

## Idempotence and Recovery

The publishing script creates the publication only when none exists for `https://ciaranlyons.com`, and updates a document when its `standardUri` exists. Re-running it is safe. If publishing succeeds but the PR/deploy does not, retain the returned document URI in the new branch, complete the PR, then rebuild and redeploy with the same public publication URI. Never write secret values into source or `.env.local`.

## Artifacts and Notes

Publication URI: `at://did:plc:bi2irbzgh2fzqvuuewkju2xf/site.standard.publication/3mut4aq2cxz2i`

Document URI: `at://did:plc:bi2irbzgh2fzqvuuewkju2xf/site.standard.document/3mut4aq5csu2e`

2026-09-06 00:01Z validation:

- `npm run lint` and `npx tsc --noEmit` completed with 0 diagnostics.
- The static build completed with 31 pages and emitted the exact publication endpoint plus matching publication/document links in the Writing page.
- Public PDS reads confirmed the publication URL is `https://ciaranlyons.com` and the document path is `/writing/2026/08/08/on-ownership`, referencing the publication URI above.

2026-09-06 04:04Z live verification:

- PR #20 merged as `b5a4ca2e19e927df61c30505fc53bd26c9c4e064` after all required checks passed.
- `c59a022 Publish Standard.site verification` deployed the generated build to `clyons/resume` `gh-pages`.
- `https://ciaranlyons.com/.well-known/site.standard.publication` returns the exact publication URI above.
- `https://ciaranlyons.com/writing/2026/08/08/on-ownership` contains exact `site.standard.publication` and `site.standard.document` links for the URIs above.

Do not include the app password.

## Interfaces and Dependencies

- `scripts/publish-standard-site.mjs` accepts `ATPROTO_HANDLE`/`ATPROTO_APP_PASSWORD` and will additionally accept `BSKY_HANDLE`/`BSKY_APP_PASSWORD`.
- The current identity DID is `did:plc:bi2irbzgh2fzqvuuewkju2xf`.
- Standard.site requires `site.standard.publication` records to be verified through `/.well-known/site.standard.publication`, and document pages to expose a `site.standard.document` link.

## Change Log

- 2026-09-06: Created continuation ExecPlan for live Standard.site publication and deployment.
- 2026-09-06: Published the real Standard.site publication and the `on-ownership` document record.
- 2026-09-06: Merged PR #20 and deployed/verified Standard.site production metadata.
