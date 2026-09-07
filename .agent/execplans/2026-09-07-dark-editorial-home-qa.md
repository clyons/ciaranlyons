# Complete dark editorial homepage QA

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Finish the already implemented dark editorial redesign on `codex/dark-editorial-home`. Visitors should see the approved bottle-green, parchment, and celadon visual system on the homepage and coherent supporting pages, while the existing Astro content loaders, publication integrations, URLs, and feeds remain intact. The change is observable through full-page Chromium screenshots at desktop and mobile widths and successful static builds.

## Progress

- [x] (2026-09-07 16:05Z) Created the dedicated PR-branch worktree and inspected the approved homepage mock plus the redesign diff.
- [x] (2026-09-07 16:13Z) Rendered all required routes in production-preview Chromium and generated the six PNGs plus desktop contact sheet.
- [x] (2026-09-07 16:14Z) Corrected all P0-P2 homepage visual differences found in the mock comparison.
- [x] (2026-09-07 16:14Z) Re-rendered, tested the required navigation and states, and completed dependency, type, and 31-route build validation.
- [ ] Commit the focused changes and update PR #23 with this plan and validation evidence.

## Surprises & Discoveries

- Observation: The supplied workspace is on `clyons/review-pasted-attachments` with a user-owned `package-lock.json` change, whereas the requested PR is `origin/codex/dark-editorial-home`.
  Evidence: `git status --short` and `git branch --show-current` in the supplied workspace.
- Observation: The in-app browser connection cannot initialize because the tool host omitted required sandbox metadata.
  Evidence: Its setup call returned `codex/sandbox-state-meta: missing field sandboxPolicy`; local Playwright will therefore provide the specified Chromium evidence.
- Observation: Astro’s development toolbar is captured in development-server screenshots, but it is not present in the production preview.
  Evidence: The toolbar appeared as an `ASTRO-DEV-TOOLBAR` body child at its screen position; the final captures from `astro preview` contain no overlay.

## Decision Log

- Decision: Use a separate worktree at `/Users/ciaran/conductor/workspaces/ciaranlyons/dark-editorial-home` attached to the requested PR branch.
  Rationale: It avoids changing the supplied Conductor workspace branch or altering its pre-existing lockfile modification while making all requested fixes directly on the PR branch.
  Date/Author: 2026-09-07 / Codex
- Decision: Use local Playwright against a local Astro server for screenshots and interaction checks.
  Rationale: The task explicitly requires Chromium through Playwright; the preferred in-app Browser cannot connect in this session.
  Date/Author: 2026-09-07 / Codex
- Decision: Use the first sentence of the featured writing’s second paragraph as the homepage pull quote, not the entire paragraph.
  Rationale: It matches the approved panel’s concise editorial excerpt and restores its intended height without changing the writing source or content loader.
  Date/Author: 2026-09-07 / Codex
- Decision: Rebalance the home grid, featured panel, and project-row spacing while preserving the shared site architecture.
  Rationale: Chromium comparison showed an extra headline line, an oversized featured panel, and project-row controls that did not match the approved hierarchy.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

Design verdict: pass. The completed homepage matches the approved dark editorial hierarchy, including a two-line desktop proposition, compact latest-note column, parchment panel, two arrow-led project rows, and footer rhythm. Supporting pages render consistently, the About portrait loads, and no P0-P2 visual or functional defects remain.

P3 observations: no changes deferred. Type rendering will vary slightly by platform because the system serif/sans fallbacks are intentionally used.

## Context and Orientation

`src/layouts/BaseLayout.astro` contains the shared metadata, skip link, global navigation, and footer. `src/pages/index.astro` composes the home proposition, newest syndicated note, featured writing, and two project rows by calling the pre-existing content APIs. `src/styles/global.css` defines the complete visual system used by the home and supporting routes. `src/pages/about.astro`, `src/pages/writing/index.astro`, `src/pages/notes/index.astro`, and `src/pages/projects.astro` are the required supporting-page routes. Content data and canonical/feed behavior must not be changed.

## Plan of Work

First install locked dependencies, start the Astro site, and collect screenshots for `/`, `/about`, `/writing`, `/notes`, and `/projects` at a 1024px viewport plus `/` at 390px. Compare the homepage directly to the attached approved mock, inspect all supporting pages for visual consistency and broken media, and capture browser console output. Repair only concrete P0-P2 issues in the layout/page markup/styles. Re-run the same renders and interaction checks after changes, then run `npm run check` and `npm run build`. Commit only the QA changes and use GitHub CLI to record the plan and validation on PR #23, marking it ready if its state permits.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/dark-editorial-home`:

    npm ci
    npm run dev -- --host 127.0.0.1
    node scripts/capture-site-qa.mjs
    npm run check
    npm run build

The capture script will use Playwright’s Chromium browser with 1024px and 390px viewports, save six PNGs and one contact sheet below `.context/site-qa/`, assert no horizontal overflow or browser errors, and exercise the required links. The expected build result is Astro reporting all 31 routes built.

## Validation and Acceptance

- The homepage screenshot has the approved hierarchy: compact header; proposition and note in two columns; a parchment essay panel; exactly two project rows; and footer.
- No permanent orange text exists; hover and keyboard focus use orange, current navigation is celadon, and the skip link appears when focused.
- Desktop screenshots exist for `/`, `/about`, `/writing`, `/notes`, and `/projects` at 1024px wide. A mobile screenshot exists for `/` at 390px wide, along with a labeled desktop contact sheet.
- All tested route, essay, note, RSS, and project navigations return successful pages. The portrait loads and no test detects horizontal overflow or console errors.
- `npm run check` passes and `npm run build` passes with 31 routes.

## Idempotence and Recovery

`npm ci`, the dev server, screenshot generation, static checks, and builds are repeatable. Screenshots are generated below gitignored `.context/site-qa/` and may be replaced on each run. If a page test fails due to unavailable remote note data, preserve the generated local test evidence and isolate the network/data condition before editing templates. To recover from a CSS regression, compare the focused files with `origin/codex/dark-editorial-home` and revert only the identified later hunk rather than resetting the worktree.

## Artifacts and Notes

- Approved visual reference: `/Users/ciaran/conductor/workspaces/ciaranlyons/ankara/.context/attachments/MSGipY/image.png`.
- Final Chromium captures: `.context/site-qa/home-1024.png`, `.context/site-qa/about-1024.png`, `.context/site-qa/writing-1024.png`, `.context/site-qa/notes-1024.png`, `.context/site-qa/projects-1024.png`, `.context/site-qa/home-390.png`, and `.context/site-qa/desktop-contact-sheet.png`.
- `npm ci`: completed with 0 vulnerabilities reported.
- `npm run check`: 0 errors, 0 warnings, 0 hints.
- `npm run build`: completed successfully with 31 pages built.
- Production-preview Playwright QA: verified route responses, no horizontal overflow, no browser console errors, desktop/mobile nav, hover/focus/skip-link behavior, featured essay, latest note, RSS, and both project targets.

## Interfaces and Dependencies

- Astro 7 renders page `.astro` files using `BaseLayout` and `global.css`.
- `getWriting`, `getProjects`, and `getNotes` supply the home and archive content and must keep their current contracts.
- Playwright is used only for local Chromium QA; it is not shipped to site visitors.

## Change Log

- 2026-09-07: Created the QA ExecPlan and documented the worktree/browser constraints.
- 2026-09-07: Adjusted the homepage excerpt, project controls, and responsive editorial geometry; captured and verified the final production-preview site.
