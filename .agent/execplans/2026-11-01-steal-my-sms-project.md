# Add Steal My SMS to the existing project listings

This ExecPlan is a living document governed by `.agent/PLANS.md`. Keep Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective current.

## Purpose / Big Picture

Visitors will find Steal My SMS first on the homepage and Projects listing. The Projects entry will show a real screenshot, the supplied description, year, live status, role, development approach, exact attribution, and an external Visit site link that opens a new tab.

## Progress

- [x] (2026-11-01 17:04Z) Inspected content, both listings, image conventions, tests, publishing instructions, and PR metadata contract. Captured the live site hero successfully.
- [x] (2026-11-01 17:05Z) Added the content, real AVIF screenshot, optional project details, and shared row component on both listings.
- [x] (2026-11-01 17:08Z) Passed lint, TypeScript, 122 tests, full artifact build, targeted browser checks, and desktop/mobile/light/dark visual review. Updated the four intentionally affected snapshots.
- [ ] Open a focused PR with validated metadata and read back its checks.

## Surprises & Discoveries

- Observation: Projects have no individual detail pages; both existing listings link to each project's destination.
  Evidence: `src/pages/projects.astro`, `src/pages/index.astro`, and `content/projects/*.md`.
- Observation: The checked-out repository is `clyons/ciaranlyons`, although the handoff names `clyons/ciaranlyons.com`.
  Evidence: `git remote -v` and `gh repo view` agree on the repository attached to this workspace.
- Observation: The public site is reachable in Chromium and its hero has the requested dark background and two SMS examples.
  Evidence: HTTP 200 and `.context/steal-my-sms-source.png`.

## Decision Log

- Decision: Retain the current branch and repository, add `order: 0`, and keep the canonical Projects page instead of inventing individual project pages.
  Rationale: This follows the workspace instructions and existing project routes; the sitemap already includes `/projects/`.
  Date/Author: 2026-11-01 / Codex
- Decision: Add optional Markdown details, image metadata, and attribution to project records and extract the duplicated row markup into a shared component.
  Rationale: The supplied details need a place in the existing listing while the homepage remains concise. The content-model extension warrants this ExecPlan.
  Date/Author: 2026-11-01 / Codex
- Decision: Use the untracked outbound URL `https://stealmysms.com/`.
  Rationale: Existing project links have no referral convention. Tracking was optional.
  Date/Author: 2026-11-01 / Codex

## Outcomes & Retrospective

Steal My SMS is first on both listings. The Projects entry includes the actual live hero, supplied first-person copy, role, development approach, year/status, and exact small-print attribution. A real browser click opens the public site in a new tab. The existing internal projects preserve their copy, ordering, destinations, and arrow treatment. No new page route was introduced because projects do not have detail pages. Production remains unchanged pending PR review and merge.

## Context and Orientation

`content/projects/*.md` supplies project frontmatter to `getProjects()` in `src/lib/content.ts`. Both `src/pages/index.astro` and `src/pages/projects.astro` render the same ordered `.project-row` anchors. Global row and prose typography lives in `src/styles/global.css`. Public images use descriptive alt text and AVIF derivatives up to 1200 pixels. `tests/ui/site.spec.ts` checks project ordering, homepage coverage, row treatment, and approved desktop/mobile snapshots. Astro's sitemap integration indexes existing routes automatically.

## Plan of Work

First add `content/projects/steal-my-sms.md` with the supplied copy and metadata, and a real 1200-pixel AVIF hero capture under `public/images/projects/`. Extend `ProjectEntry` and its loader with optional image/attribution and rendered body fields. Introduce `src/components/ProjectRow.astro`, preserving internal row markup and using the existing text-link treatment for external Visit site links. Use it on both listings; render full details only on Projects. Keep styling scoped to the component. Update affected UI assertions and only the intentionally changed home/projects snapshots after visual review.

## Concrete Steps

Run from `/Users/ciaran/conductor/workspaces/ciaranlyons/sucre`:

    npm ci --ignore-scripts
    npm run lint
    npx tsc --noEmit
    npm test
    npm run build:artifact
    git diff --check
    PORT=4377 node scripts/serve-dist.mjs
    PLAYWRIGHT_PORT=4377 npm run test:ui -- --grep 'project|internal archive row arrows|document heads'

Capture screenshots in `.context/`, inspect home and Projects at desktop and mobile widths, check dark mode and image loading, and verify the external destination in a new tab. Record source identity, logs, and artifact hashes. Compose `.context/content-pr.md` from the repository template, run `npm run pr:validate -- --body-file .context/content-pr.md`, create the PR against `main`, read back its saved body, validate it again, and inspect PR Quality Gates.

## Validation and Acceptance

All source gates above must pass. Steal My SMS must be first on both listings; prior projects must retain their copy, internal URLs, order relative to one another, and arrow styling. The Projects entry must show the actual hero, all supplied details, and exact attribution in small print. Visit site must open `https://stealmysms.com/` in a new tab with `noopener noreferrer`. Both pages must have no horizontal overflow at 320, 390, and 1440 pixels. `/projects/` remains in the sitemap; no extra project route is required. Review exact `dist/og/projects.png` and the homepage social preview as required by the runbook.

## Idempotence and Recovery

All edits are additive or scoped and can be reverted individually. Capture the external website read-only; never submit its forms or change its files. Reuse the captured image and local build for review. Do not write environment files or deploy artifacts. Before any push, confirm the current branch is unmerged. If a check fails, fix the cause and rerun affected checks before opening the PR.

## Artifacts and Notes

- Original live capture: `.context/steal-my-sms-source.png` (ignored).
- Final screenshots, build identity, and validation logs: `.context/` (ignored).
- PR evidence will include the plan path and concrete command results.
- Local validation ran from 2026-11-01 17:06:13Z to 17:06:46Z against HEAD `441dc39a33a93c243d056bd93f3ed3d315dc6766` plus uncommitted source; `.context/steal-my-sms-source-identity.json` records the diff digest and each untracked source digest. Subsequent edits affect only this plan and reviewed snapshots.
- `npm run lint`: 142 files; zero errors, warnings, or hints. `npx tsc --noEmit`: exit 0. `npm test`: 122 passed, zero failed. `npm run build:artifact`: success, 103 page-specific social previews verified. `git diff --check`: clean.
- Targeted functional UI checks: 16 passed across desktop and mobile. Four home/projects snapshots regenerated after visual review; the final ordinary comparison run passed all 20 affected UI cases (including all four screenshot comparisons).
- Original hero capture was cropped to the real header/hero (1440 × 833) and converted with installed Sharp to `public/images/projects/steal-my-sms-1200.avif` (1200 × 694, 28,891 bytes). No image was generated.
- Visually inspected `.context/steal-my-sms-projects-{desktop,mobile}.png`, `.context/steal-my-sms-home-{desktop,mobile}.png`, `.context/steal-my-sms-projects-dark.png`, and exact generated `dist/og/projects.png` and `dist/og/home.png`.
- `.context/steal-my-sms-browser-qa.json` records no overflow at 320/390/1440 pixels, the actual external popup destination/title, and `/projects/` as the sole project sitemap route. The complete artifact manifest contains 6,969 hashes in `.context/steal-my-sms-artifact.sha256`.

## Interfaces and Dependencies

`ProjectEntry` gains rendered Markdown and optional image/attribution fields. The shared Astro row accepts a project, a heading level, and a flag for full details. Existing `renderMarkdown`, URL validation, and site typography are reused. Playwright captures the real website; installed Sharp converts it to AVIF. No dependencies are added.

## Change Log

- 2026-11-01: Created the plan from `.agent/execplans/TEMPLATE.md` after inspecting repository patterns.
- 2026-11-01: Completed implementation and local validation; recorded screenshot provenance and browser evidence.
