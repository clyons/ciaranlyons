# Make TIL URLs Date-Only

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

TIL entries should publish at date-only URLs such as `/til/2026/09/05/blender-logo-animation-coding-agent-macos/`. Topics may remain as metadata and optional listing pages, but they should not be part of individual TIL URLs.

Users should be able to open the new date-only URL, see the same TIL content and embedded video, and have old topic-based item URLs redirect to the new canonical page.

## Progress

- [x] (2026-09-05 21:58Z) Initial planning completed.
- [x] (2026-09-05 22:00Z) Implemented date-only canonical TIL routes, old topic-date redirect pages, and moved Blender media to the new public path.
- [x] (2026-09-05 22:00Z) Updated the Blender TIL attribution sentence and the TIL project card metadata.
- [x] (2026-09-05 22:00Z) Validation complete.

## Surprises & Discoveries

- Observation: Existing TIL source files live under `content/til/<topic>/<slug>.md`, and `src/lib/content.ts` uses the first path segment as topic metadata.
  Evidence: `getTilEntries()` splits the path under `content/til` into `topic` and `filename`.

- Observation: Inline TIL media is stored in URL-shaped directories under `public/til/<topic>/<year>/<month>/<day>/<slug>/`.
  Evidence: The first Blender TIL references relative image and video sources, so the public asset directory must match the page URL path.

## Decision Log

- Decision: Keep `content/til/<topic>/<slug>.md` as the source organization, but change each entry's public `url` to `/til/<year>/<month>/<day>/<slug>`.
  Rationale: This removes topics from public URLs without forcing a content migration.
  Date/Author: 2026-09-05 / Codex

- Decision: Keep topic index pages such as `/til/blender/`, but remove topic segments from item and date archive URLs.
  Rationale: The user allowed topics as metadata while asking that topics not be part of TIL URLs.
  Date/Author: 2026-09-05 / Codex

- Decision: Generate static HTML redirect pages for old topic-based item URLs.
  Rationale: This preserves the just-published URL while still making the new date-only URL canonical on static GitHub Pages hosting.
  Date/Author: 2026-09-05 / Codex

## Outcomes & Retrospective

The site now emits canonical TIL item URLs without topics. Topic index pages remain available for browsing, and old topic-based item/date archive paths generate static redirect pages to the matching date-only paths.

The first Blender TIL keeps its embedded autoplaying MP4 after the asset move because the media now lives beside the canonical generated page.

## Context and Orientation

This is an Astro static site.

- `src/lib/content.ts` loads Markdown from `content/til/**.md` and sets each TIL entry's `url`.
- `src/pages/til/index.astro` renders the TIL landing page and links to `entry.url`.
- `src/pages/til/[topic]/index.astro` renders optional topic listing pages.
- `src/pages/til/[topic]/[year]/[month]/[day]/[slug].astro` currently renders individual topic-based TIL pages.
- Public media for the first Blender TIL currently lives under `public/til/blender/2026/09/05/blender-logo-animation-coding-agent-macos/`.

## Plan of Work

Change `src/lib/content.ts` so individual TIL `url` values no longer include `topic`.

Add date-only Astro routes under `src/pages/til/[year]/...` for year, month, day, and item pages. These pages should list all TILs for that date scope regardless of topic.

Repurpose or replace old topic date/item routes so the old item URL redirects to the new date-only URL. Keep `src/pages/til/[topic]/index.astro` as an optional topic page whose entry links point to date-only URLs.

Move the Blender TIL media directory from `public/til/blender/2026/09/05/...` to `public/til/2026/09/05/...` so relative media references resolve from the new canonical page.

Update the TIL project card metadata in `content/projects/til.md` to match the current entry count without making topics part of the public URL model.

## Concrete Steps

From repository root:

    npm run build

Inspect generated output:

    test -f dist/til/2026/09/05/blender-logo-animation-coding-agent-macos/index.html
    rg "/til/blender/2026/09/05/blender-logo-animation-coding-agent-macos|/til/2026/09/05/blender-logo-animation-coding-agent-macos|positive-intelligence-logo-cinematic-v4.mp4" dist/til/2026/09/05/blender-logo-animation-coding-agent-macos/index.html dist/til/feed.xml dist/search.json

## Validation and Acceptance

- `npm run build` exits 0.
- The canonical Blender TIL page is generated at `dist/til/2026/09/05/blender-logo-animation-coding-agent-macos/index.html`.
- The old topic-based Blender TIL URL is generated as a redirect page.
- RSS and search output use the new date-only TIL URL.
- The embedded MP4 exists beside the generated canonical page.

## Idempotence and Recovery

Route and content edits are ordinary git changes and can be inspected with `git diff`. If the implementation fails, restore the changed route files and public media move from git, then rerun `npm run build`.

The public media move is safe to repeat if the source directory exists; otherwise verify the destination directory contains the PNG and MP4 assets.

## Artifacts and Notes

Validation run:

    npm run build

Result: 0 Astro check errors, 0 warnings, 58 static pages built.

Targeted output checks confirmed:

- `dist/til/2026/09/05/blender-logo-animation-coding-agent-macos/index.html` exists.
- `dist/til/2026/09/05/blender-logo-animation-coding-agent-macos/positive-intelligence-logo-cinematic-v4.mp4` exists.
- The canonical page contains the autoplaying `<video>` element and the sentence `Via Simon Willison and others`.
- `dist/til/blender/2026/09/05/blender-logo-animation-coding-agent-macos/index.html` redirects to `/til/2026/09/05/blender-logo-animation-coding-agent-macos/`.
- `dist/til/feed.xml`, `dist/feed.xml`, `dist/search.json`, and `dist/til/index.html` use `/til/2026/09/05/blender-logo-animation-coding-agent-macos`.

## Interfaces and Dependencies

- `TilEntry.url` in `src/lib/content.ts` is the shared canonical URL consumed by pages, feeds, and search.
- Astro `getStaticPaths()` route params define generated static paths.
- Static redirect pages must not require server runtime support.

## Change Log

- 2026-09-05: Created the plan from template.
- 2026-09-05: Completed implementation and validation.
