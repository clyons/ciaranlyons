# New CiaranLyons.com

## Purpose

Build and deploy the v1 CiaranLyons.com site from the supplied architecture spec.

## Current State

The repository contains the agent starter kit and no application runtime. The new site will be an Astro static-first project with Markdown content and resilient protocol adapters.

## Desired State

- Public routes exist for `/`, `/about`, `/writing`, `/notes`, `/projects`, `/til`, topic pages, item pages, search, RSS feeds, and well-known verification files when configured.
- Git-backed Markdown powers site-native About, Projects, and TIL content.
- Writing pages support Standard.site document metadata.
- Notes fetch from ATProto when `@ciaranlyons.com` is resolvable and fall back to local Markdown notes while identity setup is incomplete.
- The site builds, previews locally, passes browser smoke checks, ships through a PR, and is deployed.

## Progress

- [x] Read the supplied product and publishing architecture spec.
- [x] Created a fresh feature branch from `origin/main`.
- [x] Added Astro, content loaders, routes, feeds, search, protocol endpoints, and starter Markdown content.
- [x] Changed date-bearing canonical URLs to folder-addressable paths.
- [x] Run local validation and browser QA.
- [x] Push, open PR, wait for checks, merge.
- [x] Deploy the merged site.

## Surprises & Discoveries

- `ciaranlyons.com` does not currently resolve through the public ATProto handle resolver, so DID and Standard.site publication verification are environment-backed instead of hard-coded.
- The starter-kit PR quality workflow used Node 20, but Astro 7 requires Node `>=22.12.0`; CI now uses Node 22 and `package.json` declares that engine floor.

## Decision Log

- Use root-level `content/` rather than Astro's default `src/content/` to match the spec's ownership-oriented repository structure.
- Keep `/notes` build-time static with ATProto fetch plus local fallback. This makes the first deploy reliable while leaving room for trigger-based rebuilds.
- Generate feeds and search index at build time; no database or CMS for v1.
- Deploy built output to `clyons/clyons.github.io`, which is the active GitHub Pages user-site backing the current live domain.
- The actual custom-domain owner is `clyons/resume` on `gh-pages`; the deployment artifact was pushed there.
- Generate `.well-known` files after build only when `ATPROTO_DID` and `STANDARD_SITE_PUBLICATION_AT_URI` are configured, because static GitHub Pages cannot preserve Astro endpoint 404 status codes.

## Validation Evidence

- `npm run build`
- `npm audit --audit-level=low`
- Browser smoke tests against `/`, `/til`, `/writing/2026/08/08/on-ownership`, `/writing/2026/08/08`, `/notes/2026/09/05/2026-09-05-owned-web`, `/til/atproto/2026/09/05/custom-domain-handle`, `/til/atproto/2026/09`, and `/search`
- Live deployment smoke tests against `https://ciaranlyons.com/`, dated writing, dated note, dated TIL, date-folder archive, `/feed.xml`, and `/search.json`.

## Outcomes & Retrospective

The new Astro site was merged through PR #2 and deployed to the active GitHub Pages custom-domain repository.
